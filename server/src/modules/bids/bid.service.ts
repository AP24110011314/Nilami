import mongoose from 'mongoose';
import { Bid, type BidDocument } from './bid.model.js';
import { Auction, type AuctionDocument } from '../auctions/auction.model.js';
import { Notification } from '../notifications/notification.model.js';
import { sanitizeAuction, type SanitizedAuction } from '../auctions/auction.service.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  AppError,
} from '../../lib/errors.js';
import { formatINR } from '../../lib/money.js';
import { logger } from '../../config/logger.js';

export interface PlaceBidParams {
  auctionId: string;
  bidderId: string;
  amount: number;
  idempotencyKey: string;
  ip: string;
  userAgentHash: string;
}

export interface PlaceBidResult {
  replayed: boolean;
  bid: {
    id: string;
    amount: number;
    at: string;
  };
  auction: SanitizedAuction;
  serverTime: string;
}

export function maskBidderName(name: string): string {
  if (!name || name.length <= 1) return '***';
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}***${name[name.length - 1]}`;
}

export class BidService {
  public static async placeBid(p: PlaceBidParams): Promise<PlaceBidResult> {
    if (!Number.isSafeInteger(p.amount) || p.amount <= 0) {
      throw new ConflictError('Bid amount must be a positive safe integer', 'INVALID_AMOUNT');
    }

    const auctionObjectId = new mongoose.Types.ObjectId(p.auctionId);
    const bidderObjectId = new mongoose.Types.ObjectId(p.bidderId);

    // 0. Idempotent replay: Check if this user already placed a bid with this idempotency key
    const prior = await Bid.findOne({
      bidderId: bidderObjectId,
      idempotencyKey: p.idempotencyKey,
    }).lean();

    if (prior) {
      const currentAuction = await Auction.findById(auctionObjectId).populate('sellerId', 'name ratingAvg ratingCount');
      if (currentAuction) {
        return {
          replayed: true,
          bid: {
            id: prior._id.toString(),
            amount: prior.amount,
            at: prior.createdAt.toISOString(),
          },
          auction: sanitizeAuction(currentAuction),
          serverTime: new Date().toISOString(),
        };
      }
    }

    const session = await mongoose.startSession();
    try {
      let committed: { auction: AuctionDocument; bid: BidDocument; extended: boolean } | null = null;

      await session.withTransaction(
        async () => {
          committed = null; // withTransaction may retry on write conflicts

          // Read pre-state within transaction to know previous extension count
          const preAuction = await Auction.findById(auctionObjectId)
            .select('extensionCount antiSnipe')
            .session(session)
            .lean();

          const preExtensionCount = preAuction?.extensionCount || 0;

          // 1. Atomic conditional update via aggregation pipeline with $$NOW (MongoDB authoritative clock)
          const updatedAuction = await Auction.findOneAndUpdate(
            {
              _id: auctionObjectId,
              status: { $in: ['scheduled', 'active'] },
              sellerId: { $ne: bidderObjectId },
              highestBidderId: { $ne: bidderObjectId },
              $expr: {
                $and: [
                  { $lte: ['$startsAt', '$$NOW'] },
                  { $gt: ['$endsAt', '$$NOW'] },
                  { $lte: ['$minNextBid', p.amount] },
                ],
              },
            },
            [
              {
                $set: {
                  outbidUserId: '$highestBidderId',
                  _snipe: {
                    $and: [
                      '$antiSnipe.enabled',
                      { $lte: [{ $subtract: ['$endsAt', '$$NOW'] }, '$antiSnipe.windowMs'] },
                      { $lt: ['$extensionCount', '$antiSnipe.maxExtensions'] },
                    ],
                  },
                },
              },
              {
                $set: {
                  endsAt: {
                    $cond: ['$_snipe', { $add: ['$endsAt', '$antiSnipe.extendMs'] }, '$endsAt'],
                  },
                  extensionCount: {
                    $cond: ['$_snipe', { $add: ['$extensionCount', 1] }, '$extensionCount'],
                  },
                  currentPrice: p.amount,
                  minNextBid: { $add: [p.amount, '$minIncrement'] },
                  highestBidderId: bidderObjectId,
                  bidCount: { $add: ['$bidCount', 1] },
                  version: { $add: ['$version', 1] },
                  status: 'active',
                  updatedAt: '$$NOW',
                },
              },
              { $unset: '_snipe' },
            ],
            { new: true, session },
          );

          if (!updatedAuction) {
            return; // Rejected; will diagnose outside the transaction
          }

          const extended = updatedAuction.extensionCount > preExtensionCount;

          // 2. Insert bid record
          const [bid] = await Bid.create(
            [
              {
                auctionId: auctionObjectId,
                bidderId: bidderObjectId,
                amount: p.amount,
                idempotencyKey: p.idempotencyKey,
                extended,
                ip: p.ip,
                userAgentHash: p.userAgentHash,
                createdAt: new Date(),
              },
            ],
            { session },
          );

          if (!bid) {
            throw new Error('Failed to record bid document');
          }

          // 3. Persist outbid notification for previous leader
          if (updatedAuction.outbidUserId) {
            await Notification.create(
              [
                {
                  userId: updatedAuction.outbidUserId,
                  type: 'OUTBID',
                  title: 'You have been outbid',
                  body: `A higher bid of ${formatINR(p.amount)} was placed on "${updatedAuction.title}"`,
                  data: { auctionId: auctionObjectId, bidId: bid._id },
                  dedupeKey: `outbid_${bid._id}`,
                },
              ],
              { session },
            );
          }

          committed = { auction: updatedAuction, bid, extended };
        },
        {
          maxCommitTimeMS: 2000,
        },
      );

      if (!committed) {
        // Re-check for idempotent replay in case a concurrent request with the same key just committed
        const concurrentPrior = await Bid.findOne({
          bidderId: bidderObjectId,
          idempotencyKey: p.idempotencyKey,
        }).lean();

        if (concurrentPrior) {
          const currentAuction = await Auction.findById(auctionObjectId).populate(
            'sellerId',
            'name ratingAvg ratingCount',
          );
          if (currentAuction) {
            return {
              replayed: true,
              bid: {
                id: concurrentPrior._id.toString(),
                amount: concurrentPrior.amount,
                at: concurrentPrior.createdAt.toISOString(),
              },
              auction: sanitizeAuction(currentAuction),
              serverTime: new Date().toISOString(),
            };
          }
        }

        throw await this.diagnoseRejection(auctionObjectId, bidderObjectId, p.amount);
      }

      const resAuction = (committed as { auction: AuctionDocument; bid: BidDocument }).auction;
      const resBid = (committed as { auction: AuctionDocument; bid: BidDocument }).bid;

      logger.info(
        {
          auctionId: p.auctionId,
          bidderId: p.bidderId,
          amount: p.amount,
          bidCount: resAuction.bidCount,
        },
        'Bid accepted successfully',
      );

      return {
        replayed: false,
        bid: {
          id: resBid._id.toString(),
          amount: resBid.amount,
          at: resBid.createdAt.toISOString(),
        },
        auction: sanitizeAuction(resAuction),
        serverTime: new Date().toISOString(),
      };
    } catch (err) {
      if (err instanceof AppError) throw err;

      // Handle duplicate key error from Mongo
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        const errorMsg = String((err as { message?: string }).message || '');
        if (errorMsg.includes('idempotencyKey')) {
          // Replay prior bid
          const existing = await Bid.findOne({
            bidderId: bidderObjectId,
            idempotencyKey: p.idempotencyKey,
          });
          if (existing) {
            const currentAuction = await Auction.findById(auctionObjectId);
            if (currentAuction) {
              return {
                replayed: true,
                bid: {
                  id: existing._id.toString(),
                  amount: existing.amount,
                  at: existing.createdAt.toISOString(),
                },
                auction: sanitizeAuction(currentAuction),
                serverTime: new Date().toISOString(),
              };
            }
          }
        }
        if (errorMsg.includes('amount')) {
          throw new ConflictError('A bid with this amount already exists', 'BID_TOO_LOW');
        }
      }

      throw err;
    } finally {
      await session.endSession();
    }
  }

  // Reference rejection diagnosis from docs/BIDDING_ENGINE.md §4
  private static async diagnoseRejection(
    auctionId: mongoose.Types.ObjectId,
    bidderId: mongoose.Types.ObjectId,
    amount: number,
  ): Promise<AppError> {
    const a = await Auction.findById(auctionId).lean();
    const now = new Date();

    if (!a) {
      return new NotFoundError('Auction not found', 'AUCTION_NOT_FOUND');
    }

    if (['cancelled', 'unsold', 'completed', 'payment_pending', 'payment_failed'].includes(a.status) || a.endsAt <= now) {
      return new ConflictError('Auction has ended', 'AUCTION_ENDED');
    }

    if (a.startsAt > now) {
      return new ConflictError('Auction has not started yet', 'AUCTION_NOT_STARTED');
    }

    if (a.sellerId.equals(bidderId)) {
      return new ForbiddenError('Sellers cannot bid on their own auctions', 'SELLER_CANNOT_BID');
    }

    if (a.highestBidderId && a.highestBidderId.equals(bidderId)) {
      return new ConflictError('You are already the highest bidder', 'ALREADY_HIGHEST_BIDDER');
    }

    if (amount < a.minNextBid) {
      return new ConflictError(
        `Bid must be at least ${formatINR(a.minNextBid)}`,
        'BID_TOO_LOW',
        { currentPrice: a.currentPrice, minNextBid: a.minNextBid },
      );
    }

    return new ConflictError('Outbid during request processing. Please review current price and retry.', 'OUTBID_DURING_REQUEST', {
      currentPrice: a.currentPrice,
      minNextBid: a.minNextBid,
    });
  }

  public static async getAuctionBids(auctionId: string, page = 1, limit = 20): Promise<{
    items: Array<{
      id: string;
      amount: number;
      bidderMasked: string;
      createdAt: string;
      extended: boolean;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    if (!mongoose.Types.ObjectId.isValid(auctionId)) {
      throw new NotFoundError('Auction not found');
    }

    const skip = (page - 1) * limit;

    const [bids, total] = await Promise.all([
      Bid.find({ auctionId: new mongoose.Types.ObjectId(auctionId) })
        .sort({ amount: -1 })
        .skip(skip)
        .limit(limit)
        .populate('bidderId', 'name')
        .lean(),
      Bid.countDocuments({ auctionId: new mongoose.Types.ObjectId(auctionId) }),
    ]);

    const items = bids.map((b) => {
      const bidder = b.bidderId as unknown as { name?: string } | undefined;
      const bidderName = bidder?.name || 'Bidder';
      return {
        id: b._id.toString(),
        amount: b.amount,
        bidderMasked: maskBidderName(bidderName),
        createdAt: b.createdAt.toISOString(),
        extended: b.extended,
      };
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  public static async getMyBids(userId: string): Promise<Array<{
    auction: SanitizedAuction;
    myHighestBid: number;
    leading: boolean;
  }>> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const bids = await Bid.aggregate([
      { $match: { bidderId: userObjectId } },
      { $sort: { amount: -1 } },
      {
        $group: {
          _id: '$auctionId',
          myHighestBid: { $first: '$amount' },
        },
      },
    ]);

    if (bids.length === 0) return [];

    const auctionIds = bids.map((b) => b._id);
    const auctions = await Auction.find({ _id: { $in: auctionIds } })
      .populate('sellerId', 'name ratingAvg ratingCount')
      .lean();

    return bids
      .map((b) => {
        const auction = auctions.find((a) => a._id.toString() === b._id.toString());
        if (!auction) return null;
        const leading = auction.highestBidderId?.toString() === userId;
        return {
          auction: sanitizeAuction(auction),
          myHighestBid: b.myHighestBid,
          leading,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  public static async getMyWins(userId: string): Promise<Array<{
    auction: SanitizedAuction;
    finalPrice: number;
  }>> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const wonAuctions = await Auction.find({
      winnerId: userObjectId,
      status: { $in: ['payment_pending', 'completed'] },
    })
      .populate('sellerId', 'name ratingAvg ratingCount')
      .sort({ closedAt: -1 })
      .lean();

    return wonAuctions.map((a) => ({
      auction: sanitizeAuction(a),
      finalPrice: a.finalPrice || a.currentPrice,
    }));
  }
}
