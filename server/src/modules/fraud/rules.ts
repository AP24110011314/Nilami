import mongoose from 'mongoose';
import { Bid } from '../bids/bid.model.js';
import { Auction } from '../auctions/auction.model.js';
import { User } from '../users/user.model.js';
import { Payment } from '../payments/payment.model.js';
import type { FraudRuleType } from './fraud.model.js';

export interface RuleEvaluationResult {
  triggered: boolean;
  type: FraudRuleType;
  score: number;
  evidence: Record<string, unknown>;
  bidIds: mongoose.Types.ObjectId[];
}

export class FraudRules {
  /**
   * Rule: SELLER_LINKED_BIDDER (Score 60)
   * Signal: Bidder shares IP or userAgentHash with the seller within 30 days
   */
  public static async checkSellerLinkedBidder(
    auctionId: mongoose.Types.ObjectId,
    bidderId: mongoose.Types.ObjectId,
    currentBidId: mongoose.Types.ObjectId,
    ip?: string,
    userAgentHash?: string,
  ): Promise<RuleEvaluationResult | null> {
    const auction = await Auction.findById(auctionId).lean();
    if (!auction) return null;

    const sellerId = auction.sellerId;
    if (sellerId.equals(bidderId)) {
      return {
        triggered: true,
        type: 'SELLER_LINKED_BIDDER',
        score: 60,
        evidence: { reason: 'Direct match: Bidder is the seller', sellerId, bidderId },
        bidIds: [currentBidId],
      };
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Check if seller placed any bids or listed auctions with the same IP or userAgentHash
    const matchConditions: Record<string, unknown>[] = [];
    if (ip) matchConditions.push({ ip });
    if (userAgentHash) matchConditions.push({ userAgentHash });

    if (matchConditions.length === 0) return null;

    const sellerActivity = await Bid.findOne({
      bidderId: sellerId,
      createdAt: { $gte: thirtyDaysAgo },
      $or: matchConditions,
    }).lean();

    if (sellerActivity) {
      return {
        triggered: true,
        type: 'SELLER_LINKED_BIDDER',
        score: 60,
        evidence: {
          matchedOn: sellerActivity.ip === ip ? 'ip' : 'userAgentHash',
          sellerId,
          bidderId,
          sharedValue: sellerActivity.ip === ip ? ip : userAgentHash,
        },
        bidIds: [currentBidId, sellerActivity._id],
      };
    }

    return null;
  }

  /**
   * Rule: BID_BURST (Score 40)
   * Signal: >10 bids by one user on one auction in 60s
   */
  public static async checkBidBurst(
    auctionId: mongoose.Types.ObjectId,
    bidderId: mongoose.Types.ObjectId,
    _currentBidId: mongoose.Types.ObjectId,
  ): Promise<RuleEvaluationResult | null> {
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);

    const recentBids = await Bid.find({
      auctionId,
      bidderId,
      createdAt: { $gte: sixtySecondsAgo },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (recentBids.length > 10) {
      return {
        triggered: true,
        type: 'BID_BURST',
        score: 40,
        evidence: {
          bidCountLast60s: recentBids.length,
          timeWindowSeconds: 60,
        },
        bidIds: recentBids.slice(0, 10).map((b) => b._id),
      };
    }

    return null;
  }

  /**
   * Rule: PING_PONG (Score 65)
   * Signal: Two accounts alternate >=6 consecutive bids
   */
  public static async checkPingPong(
    auctionId: mongoose.Types.ObjectId,
    _currentBidId: mongoose.Types.ObjectId,
  ): Promise<RuleEvaluationResult | null> {
    const recentBids = await Bid.find({ auctionId })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    if (recentBids.length < 6) return null;

    const b0 = recentBids[0];
    const b1 = recentBids[1];
    const b2 = recentBids[2];
    const b3 = recentBids[3];
    const b4 = recentBids[4];
    const b5 = recentBids[5];

    if (!b0 || !b1 || !b2 || !b3 || !b4 || !b5) return null;

    const bidderA = b0.bidderId.toString();
    const bidderB = b1.bidderId.toString();

    if (bidderA === bidderB) return null;

    // Check alternation: A, B, A, B, A, B
    const isAlternating =
      b2.bidderId.toString() === bidderA &&
      b3.bidderId.toString() === bidderB &&
      b4.bidderId.toString() === bidderA &&
      b5.bidderId.toString() === bidderB;

    if (isAlternating) {
      return {
        triggered: true,
        type: 'PING_PONG',
        score: 65,
        evidence: {
          bidderA,
          bidderB,
          consecutiveAlternations: 6,
        },
        bidIds: recentBids.map((b) => b._id),
      };
    }

    return null;
  }

  /**
   * Rule: PAYMENT_ABANDONER (Score 50)
   * Signal: >=2 payment_failed as winner in 30 days
   */
  public static async checkPaymentAbandoner(
    bidderId: mongoose.Types.ObjectId,
    currentBidId: mongoose.Types.ObjectId,
  ): Promise<RuleEvaluationResult | null> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const failedPayments = await Payment.countDocuments({
      buyerId: bidderId,
      status: { $in: ['failed', 'expired'] },
      createdAt: { $gte: thirtyDaysAgo },
    });

    if (failedPayments >= 2) {
      return {
        triggered: true,
        type: 'PAYMENT_ABANDONER',
        score: 50,
        evidence: {
          failedPaymentsLast30d: failedPayments,
        },
        bidIds: [currentBidId],
      };
    }

    return null;
  }

  /**
   * Rule: NEW_ACCOUNT_HIGH_BID (Score 30)
   * Signal: Account <1 hour old bids > ₹50,000 (5,000,000 paise)
   */
  public static async checkNewAccountHighBid(
    bidderId: mongoose.Types.ObjectId,
    bidAmount: number,
    currentBidId: mongoose.Types.ObjectId,
  ): Promise<RuleEvaluationResult | null> {
    const user = await User.findById(bidderId).lean();
    if (!user) return null;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isNew = user.createdAt > oneHourAgo;

    if (isNew && bidAmount > 5000000) {
      return {
        triggered: true,
        type: 'NEW_ACCOUNT_HIGH_BID',
        score: 30,
        evidence: {
          accountAgeMinutes: Math.round((Date.now() - user.createdAt.getTime()) / 60000),
          bidAmountPaise: bidAmount,
          thresholdPaise: 5000000,
        },
        bidIds: [currentBidId],
      };
    }

    return null;
  }

  /**
   * Rule: MULTI_ACCOUNT_IP (Score 55)
   * Signal: >=3 accounts from one IP bidding on the same auction
   */
  public static async checkMultiAccountIp(
    auctionId: mongoose.Types.ObjectId,
    currentBidId: mongoose.Types.ObjectId,
    ip?: string,
  ): Promise<RuleEvaluationResult | null> {
    if (!ip) return null;

    const distinctBidders = await Bid.distinct('bidderId', {
      auctionId,
      ip,
    });

    if (distinctBidders.length >= 3) {
      return {
        triggered: true,
        type: 'MULTI_ACCOUNT_IP',
        score: 55,
        evidence: {
          ip,
          uniqueAccountsCount: distinctBidders.length,
          accountIds: distinctBidders,
        },
        bidIds: [currentBidId],
      };
    }

    return null;
  }
}
