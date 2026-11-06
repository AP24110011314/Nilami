import mongoose from 'mongoose';
import { Watchlist } from './watchlist.model.js';
import { Auction } from '../auctions/auction.model.js';
import { Notification } from '../notifications/notification.model.js';
import { User } from '../users/user.model.js';
import { auctionQueue, notificationsQueue } from '../../queues/queues.js';
import { sanitizeAuction, type SanitizedAuction } from '../auctions/auction.service.js';
import { emitNotification } from '../../realtime/events.js';
import { NotFoundError } from '../../lib/errors.js';
import { logger } from '../../config/logger.js';

export class WatchlistService {
  public static async watchAuction(
    userId: string,
    auctionId: string,
    remindMinutesBefore = 15,
  ): Promise<{ watching: boolean; remindMinutesBefore: number }> {
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const res = await Watchlist.updateOne(
          { userId: new mongoose.Types.ObjectId(userId), auctionId: auction._id },
          {
            $setOnInsert: {
              userId: new mongoose.Types.ObjectId(userId),
              auctionId: auction._id,
              remindMinutesBefore,
            },
          },
          { upsert: true, session },
        );

        if (res.upsertedCount === 1) {
          await Auction.updateOne(
            { _id: auction._id },
            { $inc: { watchCount: 1 } },
            { session },
          );
        }
      });
    } finally {
      await session.endSession();
    }

    // Schedule reminder job (Job ID without colons!)
    const targetTimeMs = auction.endsAt.getTime() - remindMinutesBefore * 60 * 1000;
    const delay = Math.max(0, targetTimeMs - Date.now());

    try {
      await auctionQueue.add(
        'watch-reminder',
        { auctionId: auction._id.toString(), userId, remindMinutesBefore },
        { jobId: `remind_${auction._id.toString()}_${userId}`, delay },
      );
    } catch (err) {
      logger.error({ err, auctionId, userId }, 'Failed to schedule watch reminder job');
    }

    return { watching: true, remindMinutesBefore };
  }

  public static async unwatchAuction(
    userId: string,
    auctionId: string,
  ): Promise<{ watching: boolean }> {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const deleted = await Watchlist.findOneAndDelete(
          {
            userId: new mongoose.Types.ObjectId(userId),
            auctionId: new mongoose.Types.ObjectId(auctionId),
          },
          { session },
        );

        if (deleted) {
          await Auction.updateOne(
            { _id: new mongoose.Types.ObjectId(auctionId) },
            { $inc: { watchCount: -1 } },
            { session },
          );
        }
      });
    } finally {
      await session.endSession();
    }

    try {
      const jobId = `remind_${auctionId}_${userId}`;
      const job = await auctionQueue.getJob(jobId);
      if (job) {
        await job.remove();
      }
    } catch {
      // ignore
    }

    return { watching: false };
  }

  public static async isWatching(
    userId: string,
    auctionId: string,
  ): Promise<{ watching: boolean; remindMinutesBefore: number }> {
    const item = await Watchlist.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      auctionId: new mongoose.Types.ObjectId(auctionId),
    }).lean();

    return {
      watching: Boolean(item),
      remindMinutesBefore: item?.remindMinutesBefore || 15,
    };
  }

  public static async getMyWatchlist(userId: string): Promise<Array<{
    watchlistId: string;
    remindMinutesBefore: number;
    auction: SanitizedAuction;
  }>> {
    const items = await Watchlist.find({ userId: new mongoose.Types.ObjectId(userId) })
      .populate('auctionId')
      .sort({ createdAt: -1 })
      .lean();

    const results = [];
    for (const item of items) {
      if (item.auctionId && typeof item.auctionId === 'object' && '_id' in item.auctionId) {
        results.push({
          watchlistId: item._id.toString(),
          remindMinutesBefore: item.remindMinutesBefore,
          auction: sanitizeAuction(item.auctionId as unknown as Parameters<typeof sanitizeAuction>[0]),
        });
      }
    }

    return results;
  }

  public static async handleWatchReminder(
    auctionId: string,
    userId: string,
    remindMinutesBefore: number,
  ): Promise<{ status: string; newDelay?: number }> {
    const watchEntry = await Watchlist.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      auctionId: new mongoose.Types.ObjectId(auctionId),
    });

    if (!watchEntry) {
      return { status: 'unwatched' };
    }

    const doc = await Auction.findById(auctionId);
    if (!doc || doc.status !== 'active') {
      return { status: 'noop' };
    }

    // Check DB clock
    const agg = await Auction.aggregate<{ now: Date }>([
      { $match: { _id: doc._id } },
      { $project: { now: '$$NOW' } },
    ]);
    const dbNow = agg[0]?.now || new Date();

    const remainingMs = doc.endsAt.getTime() - dbNow.getTime();
    const triggerThresholdMs = remindMinutesBefore * 60 * 1000;

    // T29 Requirement: If auction was extended (anti-sniping), re-delay reminder!
    if (remainingMs > triggerThresholdMs + 5000) {
      const newDelay = Math.max(0, doc.endsAt.getTime() - triggerThresholdMs - Date.now());
      await auctionQueue.add(
        'watch-reminder',
        { auctionId, userId, remindMinutesBefore },
        { jobId: `remind_${auctionId}_${userId}_r${Date.now()}`, delay: newDelay },
      );
      logger.info({ auctionId, userId, newDelay }, 'Watch reminder re-delayed due to auction extension');
      return { status: 'rescheduled', newDelay };
    }

    // Send reminder notification
    const dedupeKey = `remind_${auctionId}_${userId}`;
    const notif = await Notification.findOneAndUpdate(
      { dedupeKey },
      {
        $setOnInsert: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'WATCH_REMINDER',
          title: `Auction ending soon: "${doc.title}"`,
          body: `The auction lot you are watching is scheduled to close in approximately ${remindMinutesBefore} minutes. Current bid: ₹${(doc.currentPrice / 100).toLocaleString('en-IN')}.`,
          data: { auctionId: doc._id },
          dedupeKey,
        },
      },
      { upsert: true, new: true },
    );

    await Watchlist.updateOne(
      { _id: watchEntry._id },
      { $set: { remindedAt: dbNow } },
    );

    if (notif) {
      emitNotification(userId, {
        _id: notif._id.toString(),
        userId,
        type: notif.type,
        title: notif.title,
        message: notif.body,
        data: notif.data as Record<string, unknown>,
        read: false,
        createdAt: notif.createdAt.toISOString(),
      });
    }

    // Queue email dispatch
    const user = await User.findById(userId).select('email name');
    if (user) {
      await notificationsQueue.add(
        'email',
        {
          to: user.email,
          type: 'WATCH_REMINDER',
          title: notif?.title,
          body: notif?.body,
          auctionId,
        },
        { jobId: `email_${dedupeKey}` },
      );
    }

    return { status: 'reminded' };
  }
}

