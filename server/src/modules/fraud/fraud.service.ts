import mongoose from 'mongoose';
import { FraudFlag, type IFraudFlag, type FraudFlagStatus } from './fraud.model.js';
import { FraudRules } from './rules.js';
import { User } from '../users/user.model.js';
import { Auction } from '../auctions/auction.model.js';
import { emitFraudAlert } from '../../realtime/events.js';
import { logger } from '../../config/logger.js';
import { NotFoundError } from '../../lib/errors.js';

export interface EvaluateBidParams {
  auctionId: string;
  bidderId: string;
  bidId: string;
  amount: number;
  ip?: string;
  userAgentHash?: string;
}

export class FraudService {
  /**
   * Evaluates all fraud detection rules for an accepted bid
   */
  public static async evaluateBid(params: EvaluateBidParams): Promise<{
    flagged: boolean;
    cumulativeScore: number;
    flagsCreated: number;
  }> {
    const { auctionId, bidderId, bidId, amount, ip, userAgentHash } = params;
    const auctionObjectId = new mongoose.Types.ObjectId(auctionId);
    const bidderObjectId = new mongoose.Types.ObjectId(bidderId);
    const bidObjectId = new mongoose.Types.ObjectId(bidId);

    // 1. Run all rule evaluations in parallel
    const evaluations = await Promise.all([
      FraudRules.checkSellerLinkedBidder(auctionObjectId, bidderObjectId, bidObjectId, ip, userAgentHash),
      FraudRules.checkBidBurst(auctionObjectId, bidderObjectId, bidObjectId),
      FraudRules.checkPingPong(auctionObjectId, bidObjectId),
      FraudRules.checkPaymentAbandoner(bidderObjectId, bidObjectId),
      FraudRules.checkNewAccountHighBid(bidderObjectId, amount, bidObjectId),
      FraudRules.checkMultiAccountIp(auctionObjectId, bidObjectId, ip),
    ]);

    let flagsCreated = 0;

    for (const result of evaluations) {
      if (!result || !result.triggered) continue;

      // Check if duplicate open flag exists
      const existing = await FraudFlag.findOne({
        type: result.type,
        subjectUserId: bidderObjectId,
        auctionId: auctionObjectId,
        status: 'open',
      });

      if (!existing) {
        await FraudFlag.create({
          type: result.type,
          score: result.score,
          subjectUserId: bidderObjectId,
          auctionId: auctionObjectId,
          bidIds: result.bidIds,
          evidence: result.evidence,
          status: 'open',
        });
        flagsCreated++;
      }
    }

    // 2. Compute cumulative score for this user & auction
    const openFlags = await FraudFlag.find({
      subjectUserId: bidderObjectId,
      status: 'open',
      $or: [{ auctionId: auctionObjectId }, { auctionId: null }],
    });

    const cumulativeScore = openFlags.reduce((sum, f) => sum + f.score, 0);

    // 3. Trigger actions based on thresholds:
    // < 40: log only
    // 40–69: open flag + admin alert ('fraud-alert' socket)
    // >= 70: flag + temporary bid block
    if (cumulativeScore >= 40) {
      try {
        emitFraudAlert({
          rule: openFlags[0]?.type || 'FRAUD_RULE',
          auctionId,
          userId: bidderId,
          score: cumulativeScore,
          details: `Cumulative fraud score ${cumulativeScore} exceeded threshold (isBlocked: ${cumulativeScore >= 70})`,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to emit fraud-alert via socket emitter');
      }
    }

    return {
      flagged: flagsCreated > 0,
      cumulativeScore,
      flagsCreated,
    };
  }

  /**
   * Checks whether a user is currently blocked from bidding due to fraud flags or suspension
   */
  public static async isUserBlocked(userId: string): Promise<boolean> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1. Account suspended
    const user = await User.findById(userObjectId).lean();
    if (!user || user.status === 'suspended') {
      return true;
    }

    // 2. Open fraud flags with cumulative score >= 70
    const openFlags = await FraudFlag.find({
      subjectUserId: userObjectId,
      status: 'open',
    }).lean();

    const totalScore = openFlags.reduce((sum, f) => sum + f.score, 0);
    return totalScore >= 70;
  }

  /**
   * Fetches paginated fraud flags with optional filters
   */
  public static async getFraudFlags(params: {
    status?: FraudFlagStatus;
    minScore?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    flags: Array<IFraudFlag & { _id: mongoose.Types.ObjectId }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { status, minScore, page = 1, limit = 20 } = params;
    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;
    if (minScore !== undefined) filter.score = { $gte: minScore };

    const skip = (page - 1) * limit;

    const [flags, total] = await Promise.all([
      FraudFlag.find(filter)
        .populate('subjectUserId', 'name email status ratingAvg')
        .populate('auctionId', 'title currentPrice status')
        .sort({ score: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FraudFlag.countDocuments(filter),
    ]);

    return {
      flags: flags as unknown as Array<IFraudFlag & { _id: mongoose.Types.ObjectId }>,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Reviews a fraud flag (Confirm or Dismiss)
   */
  public static async reviewFlag(
    flagId: string,
    adminId: string,
    status: 'confirmed' | 'dismissed',
    appealNote?: string,
  ): Promise<IFraudFlag & { _id: mongoose.Types.ObjectId }> {
    const flag = await FraudFlag.findById(flagId);
    if (!flag) {
      throw new NotFoundError('Fraud flag not found');
    }

    flag.status = status;
    flag.reviewedBy = new mongoose.Types.ObjectId(adminId);
    flag.reviewedAt = new Date();
    if (appealNote) flag.appealNote = appealNote;

    await flag.save();

    // If confirmed and high score: suspend user
    if (status === 'confirmed' && flag.score >= 60) {
      await User.updateOne(
        { _id: flag.subjectUserId },
        { $set: { status: 'suspended' } },
      );

      // If tied to active auction, flag or cancel
      if (flag.auctionId) {
        await Auction.updateOne(
          { _id: flag.auctionId, status: 'active' },
          { $set: { status: 'cancelled' }, $inc: { version: 1 } },
        );
      }
    }

    return flag.toObject() as IFraudFlag & { _id: mongoose.Types.ObjectId };
  }
}
