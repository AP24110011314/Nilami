import mongoose from 'mongoose';
import { Auction } from '../auctions/auction.model.js';
import { Bid } from '../bids/bid.model.js';
import { Payment } from '../payments/payment.model.js';
import { FraudFlag } from '../fraud/fraud.model.js';
import { getRedisClient } from '../../config/redis.js';
import { NotFoundError } from '../../lib/errors.js';
import { logger } from '../../config/logger.js';

export class AnalyticsService {
  /**
   * Public/Owner: Price progression and bid frequency for a lot
   */
  public static async getAuctionAnalytics(auctionId: string): Promise<{
    auctionId: string;
    currentPrice: number;
    extensionCount: number;
    uniqueBidders: number;
    priceProgression: Array<{ t: string; amount: number; bidderMasked?: string }>;
    bidFrequency: Array<{ bucket: string; count: number }>;
  }> {
    const cacheKey = `analytics:auction:${auctionId}`;
    const redis = getRedisClient();

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      logger.warn({ err }, 'Redis cache read error');
    }

    const auctionObjectId = new mongoose.Types.ObjectId(auctionId);
    const auction = await Auction.findById(auctionObjectId).lean();
    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    // 1. Price progression
    const bids = await Bid.find({ auctionId: auctionObjectId })
      .sort({ createdAt: 1 })
      .populate('bidderId', 'name')
      .lean();

    const priceProgression: Array<{ t: string; amount: number; bidderMasked?: string }> = [
      {
        t: auction.startsAt.toISOString(),
        amount: auction.startingPrice,
      },
    ];

    bids.forEach((b) => {
      priceProgression.push({
        t: b.createdAt.toISOString(),
        amount: b.amount,
      });
    });

    // 2. Unique bidders
    const uniqueBiddersCount = new Set(bids.map((b) => b.bidderId.toString())).size;

    // 3. Bid frequency aggregation: group bids into hourly or 5-minute buckets
    const bidFrequencyAgg = await Bid.aggregate([
      { $match: { auctionId: auctionObjectId } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d %H:%M',
              date: '$createdAt',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    const bidFrequency = bidFrequencyAgg.map((item) => ({
      bucket: item._id as string,
      count: item.count as number,
    }));

    const result = {
      auctionId,
      currentPrice: auction.currentPrice,
      extensionCount: auction.extensionCount,
      uniqueBidders: uniqueBiddersCount,
      priceProgression,
      bidFrequency,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 15);
    } catch (err) {
      logger.warn({ err }, 'Redis cache write error');
    }

    return result;
  }

  /**
   * Seller: Revenue, sell-through rate, avg bids, ratio
   */
  public static async getSellerOverview(sellerId: string): Promise<{
    sellerId: string;
    totalRevenue: number;
    closedCount: number;
    soldCount: number;
    sellThroughRate: number;
    avgFinalStartingRatio: number;
    avgBidsPerAuction: number;
    dailyRevenue: Array<{ date: string; amount: number }>;
  }> {
    const cacheKey = `analytics:seller:${sellerId}`;
    const redis = getRedisClient();

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // cache miss / redis soft error
    }

    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    // 1. Succeeded payments
    const payments = await Payment.aggregate([
      {
        $match: {
          sellerId: sellerObjectId,
          status: 'succeeded',
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
        },
      },
    ]);

    const totalRevenue = payments[0]?.totalRevenue || 0;

    // 2. Auctions statistics
    const sellerAuctions = await Auction.find({ sellerId: sellerObjectId }).lean();
    const closedAuctions = sellerAuctions.filter((a) =>
      ['completed', 'payment_pending', 'payment_failed', 'unsold'].includes(a.status),
    );
    const soldAuctions = sellerAuctions.filter((a) =>
      ['completed', 'payment_pending'].includes(a.status),
    );

    const closedCount = closedAuctions.length;
    const soldCount = soldAuctions.length;
    const sellThroughRate = closedCount > 0 ? Math.round((soldCount / closedCount) * 100) : 0;

    // Avg final / starting ratio
    let totalRatio = 0;
    let ratioCount = 0;
    soldAuctions.forEach((a) => {
      if (a.finalPrice && a.startingPrice > 0) {
        totalRatio += a.finalPrice / a.startingPrice;
        ratioCount++;
      }
    });
    const avgFinalStartingRatio =
      ratioCount > 0 ? Math.round((totalRatio / ratioCount) * 100) / 100 : 1.0;

    // Avg bids per auction
    const totalBids = sellerAuctions.reduce((sum, a) => sum + a.bidCount, 0);
    const avgBidsPerAuction =
      sellerAuctions.length > 0 ? Math.round((totalBids / sellerAuctions.length) * 10) / 10 : 0;

    // 3. Daily revenue for last 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const dailyAgg = await Payment.aggregate([
      {
        $match: {
          sellerId: sellerObjectId,
          status: 'succeeded',
          paidAt: { $gte: fourteenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$paidAt' },
          },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyRevenue = dailyAgg.map((item) => ({
      date: item._id as string,
      amount: item.amount as number,
    }));

    const result = {
      sellerId,
      totalRevenue,
      closedCount,
      soldCount,
      sellThroughRate,
      avgFinalStartingRatio,
      avgBidsPerAuction,
      dailyRevenue,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 20);
    } catch {
      // ignore
    }

    return result;
  }

  /**
   * Public: Trending popular auctions
   */
  public static async getTrendingAuctions(limit = 6): Promise<Array<unknown>> {
    const cacheKey = `analytics:trending:${limit}`;
    const redis = getRedisClient();

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }

    // Trending score = bidsLast24h*3 + watchCount*2
    // We compute this using active auctions sorted by bidCount and watchCount
    const auctions = await Auction.find({ status: 'active' })
      .populate('sellerId', 'name ratingAvg ratingCount')
      .sort({ bidCount: -1, watchCount: -1 })
      .limit(limit)
      .lean();

    const formatted = auctions.map((a) => {
      const seller = a.sellerId as unknown as { name?: string; ratingAvg?: number; ratingCount?: number } | null;
      return {
        id: a._id.toString(),
        title: a.title,
        category: a.category,
        currentPrice: a.currentPrice,
        minNextBid: a.minNextBid,
        bidCount: a.bidCount,
        watchCount: a.watchCount,
        endsAt: a.endsAt.toISOString(),
        images: a.images,
        seller: seller
          ? {
              name: seller.name,
              ratingAvg: seller.ratingAvg || 0,
              ratingCount: seller.ratingCount || 0,
            }
          : undefined,
      };
    });

    try {
      await redis.set(cacheKey, JSON.stringify(formatted), 'EX', 30);
    } catch {
      // ignore
    }

    return formatted;
  }

  /**
   * Admin: Overview metrics
   */
  public static async getAdminOverview(): Promise<{
    gmv: number;
    activeAuctionsCount: number;
    totalBidsCount: number;
    openFraudFlagsCount: number;
    paymentFailureRate: number;
  }> {
    const cacheKey = 'analytics:admin:overview';
    const redis = getRedisClient();

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }

    const [gmvRes, activeAuctionsCount, totalBidsCount, openFraudFlagsCount, paymentsStats] =
      await Promise.all([
        Payment.aggregate([
          { $match: { status: 'succeeded' } },
          { $group: { _id: null, gmv: { $sum: '$amount' } } },
        ]),
        Auction.countDocuments({ status: 'active' }),
        Bid.countDocuments(),
        FraudFlag.countDocuments({ status: 'open' }),
        Payment.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    const gmv = gmvRes[0]?.gmv || 0;

    let succeededPayments = 0;
    let failedPayments = 0;
    paymentsStats.forEach((stat) => {
      if (stat._id === 'succeeded') succeededPayments = stat.count;
      if (['failed', 'expired'].includes(stat._id)) failedPayments += stat.count;
    });

    const totalResolvedPayments = succeededPayments + failedPayments;
    const paymentFailureRate =
      totalResolvedPayments > 0 ? Math.round((failedPayments / totalResolvedPayments) * 100) : 0;

    const result = {
      gmv,
      activeAuctionsCount,
      totalBidsCount,
      openFraudFlagsCount,
      paymentFailureRate,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 15);
    } catch {
      // ignore
    }

    return result;
  }
}
