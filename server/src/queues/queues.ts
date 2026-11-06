import { Queue, type DefaultJobOptions } from 'bullmq';
import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { Auction } from '../modules/auctions/auction.model.js';
import { Payment } from '../modules/payments/payment.model.js';
import { Outbox } from '../modules/outbox/outbox.model.js';

export const QUEUE_PREFIX = 'nilami';

const defaultJobOptions: DefaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: {
    age: 3600, // keep for 1 hour
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // keep for 7 days for debugging
  },
};

// BullMQ Queues (Custom job IDs MUST NEVER contain ':')
export const auctionQueue = new Queue('auction', {
  connection: getRedisClient(),
  prefix: QUEUE_PREFIX,
  defaultJobOptions,
});

export const maintenanceQueue = new Queue('maintenance', {
  connection: getRedisClient(),
  prefix: QUEUE_PREFIX,
  defaultJobOptions,
});

export const paymentsQueue = new Queue('payments', {
  connection: getRedisClient(),
  prefix: QUEUE_PREFIX,
  defaultJobOptions,
});

export const notificationsQueue = new Queue('notifications', {
  connection: getRedisClient(),
  prefix: QUEUE_PREFIX,
  defaultJobOptions,
});

export const fraudQueue = new Queue('fraud', {
  connection: getRedisClient(),
  prefix: QUEUE_PREFIX,
  defaultJobOptions,
});

export async function scheduleAuctionJobs(
  auctionId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<void> {
  const now = Date.now();
  const startDelay = Math.max(0, startsAt.getTime() - now);
  const endDelay = Math.max(0, endsAt.getTime() - now);
  const endingSoonDelay = Math.max(0, endsAt.getTime() - 60000 - now);

  try {
    // Custom job IDs without colons
    await auctionQueue.add(
      'activate',
      { auctionId },
      { jobId: `activate_${auctionId}`, delay: startDelay },
    );

    await auctionQueue.add(
      'ending-soon',
      { auctionId },
      { jobId: `ending_${auctionId}`, delay: endingSoonDelay },
    );

    await auctionQueue.add(
      'close',
      { auctionId },
      { jobId: `close_${auctionId}`, delay: endDelay },
    );

    logger.info({ auctionId, startDelay, endDelay }, 'Auction lifecycle jobs scheduled');
  } catch (err) {
    logger.error({ err, auctionId }, 'Failed to schedule auction lifecycle jobs (reconciler will catch)');
  }
}

export type CloseAuctionResult = 'closed' | 'noop' | { reschedule: number };

export async function closeAuction(auctionId: string): Promise<CloseAuctionResult> {
  const session = await mongoose.startSession();
  try {
    let result: CloseAuctionResult = 'noop';

    await session.withTransaction(async () => {
      // 1. Fetch DB clock + current auction via aggregation
      const doc = await Auction.findById(auctionId).session(session);
      if (!doc || !['scheduled', 'active'].includes(doc.status)) {
        result = 'noop';
        return;
      }

      const agg = await Auction.aggregate<{ now: Date }>(
        [
          { $match: { _id: doc._id } },
          { $project: { now: '$$NOW' } },
        ],
        { session },
      );

      const dbNow = agg[0]?.now || new Date();

      // 2. Anti-sniping check: if endsAt > dbNow, auction was extended!
      if (doc.endsAt > dbNow) {
        result = { reschedule: doc.endsAt.getTime() - dbNow.getTime() };
        return;
      }

      // 3. Determine if lot was sold
      const hasBids = doc.bidCount > 0;
      const reserve = doc.reservePrice ?? 0;
      const reserveMet = hasBids && doc.currentPrice >= reserve;
      const sold = hasBids && reserveMet && Boolean(doc.highestBidderId);

      const paymentDueAt = new Date(dbNow.getTime() + env.PAYMENT_WINDOW_MINUTES * 60_000);

      // 4. Update auction atomically with version guard
      const upd = await Auction.updateOne(
        {
          _id: doc._id,
          status: { $in: ['scheduled', 'active'] },
          version: doc.version,
        },
        {
          $set: sold
            ? {
                status: 'payment_pending',
                winnerId: doc.highestBidderId,
                finalPrice: doc.currentPrice,
                paymentDueAt,
                closedAt: dbNow,
              }
            : {
                status: 'unsold',
                closedAt: dbNow,
              },
          $inc: { version: 1 },
        },
        { session },
      );

      if (upd.modifiedCount !== 1) {
        throw new Error('Concurrent modification detected during closeAuction; retrying transaction');
      }

      // 5. If sold, create Payment document (unique auctionId guarantees at most one)
      if (sold && doc.highestBidderId) {
        await Payment.create(
          [
            {
              auctionId: doc._id,
              buyerId: doc.highestBidderId,
              sellerId: doc.sellerId,
              amount: doc.currentPrice,
              currency: 'INR',
              status: 'pending',
              dueAt: paymentDueAt,
            },
          ],
          { session },
        );
      }

      // 6. Create Outbox event in same transaction
      await Outbox.create(
        [
          {
            type: sold ? 'auction.won' : 'auction.unsold',
            payload: { auctionId: doc._id.toString() },
            status: 'pending',
            availableAt: dbNow,
          },
        ],
        { session },
      );

      result = 'closed';
    });

    // If auction was extended, re-enqueue close job with remaining delay
    if (typeof result === 'object' && result !== null && 'reschedule' in result) {
      const rescheduleMs = (result as { reschedule: number }).reschedule;
      await auctionQueue.add(
        'close',
        { auctionId },
        {
          jobId: `close_${auctionId}_r${Date.now()}`,
          delay: Math.max(0, rescheduleMs + 250),
        },
      );
      logger.info({ auctionId, reschedule: rescheduleMs }, 'Close job rescheduled due to anti-snipe');
    }

    return result;
  } finally {
    await session.endSession();
  }
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all([
    auctionQueue.close(),
    maintenanceQueue.close(),
    paymentsQueue.close(),
    notificationsQueue.close(),
    fraudQueue.close(),
  ]);
}
