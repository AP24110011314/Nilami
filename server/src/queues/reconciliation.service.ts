import { Auction } from '../modules/auctions/auction.model.js';
import { Payment } from '../modules/payments/payment.model.js';
import { Outbox } from '../modules/outbox/outbox.model.js';
import { auctionQueue, closeAuction } from './queues.js';
import { processOutboxBatch } from './outbox.dispatcher.js';
import { logger } from '../config/logger.js';

export interface ReconcileResult {
  closedCount: number;
  activatedCount: number;
  expiredPaymentsCount: number;
  missingJobsAddedCount: number;
  stuckOutboxResetCount: number;
  outboxProcessedCount: number;
}

export async function runReconciliation(): Promise<ReconcileResult> {
  const result: ReconcileResult = {
    closedCount: 0,
    activatedCount: 0,
    expiredPaymentsCount: 0,
    missingJobsAddedCount: 0,
    stuckOutboxResetCount: 0,
    outboxProcessedCount: 0,
  };

  const now = new Date();

  try {
    // 1. Expired but open auctions: close immediately
    const expiredAuctions = await Auction.find({
      status: { $in: ['scheduled', 'active'] },
      $expr: {
        $lte: ['$endsAt', { $subtract: ['$$NOW', 2000] }],
      },
    }).limit(100);

    for (const a of expiredAuctions) {
      try {
        const res = await closeAuction(a._id.toString());
        if (res === 'closed') {
          result.closedCount++;
        }
      } catch (err) {
        logger.error({ err, auctionId: a._id }, 'Error closing expired auction in reconciler');
      }
    }

    // 2. Not yet activated auctions: flip scheduled -> active
    const activationResult = await Auction.updateMany(
      {
        status: 'scheduled',
        $expr: { $lte: ['$startsAt', '$$NOW'] },
      },
      {
        $set: { status: 'active' },
        $inc: { version: 1 },
      },
    );
    result.activatedCount = activationResult.modifiedCount;

    // 3. Overdue payments: mark expired & payment_failed
    const overdueAuctions = await Auction.find({
      status: 'payment_pending',
      $expr: { $lte: ['$paymentDueAt', '$$NOW'] },
    }).limit(50);

    for (const a of overdueAuctions) {
      const payment = await Payment.findOne({ auctionId: a._id });
      if (payment && !['succeeded', 'processing'].includes(payment.status)) {
        await Payment.updateOne(
          { _id: payment._id },
          { $set: { status: 'expired' } },
        );

        await Auction.updateOne(
          { _id: a._id, status: 'payment_pending' },
          { $set: { status: 'payment_failed' }, $inc: { version: 1 } },
        );

        result.expiredPaymentsCount++;
      }
    }

    // 4. Missing close jobs for auctions ending in the next 10 minutes
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    const endingSoonAuctions = await Auction.find({
      status: 'active',
      endsAt: { $gt: now, $lte: tenMinutesFromNow },
    });

    for (const a of endingSoonAuctions) {
      const jobId = `close_${a._id.toString()}`;
      const existingJob = await auctionQueue.getJob(jobId);
      if (!existingJob) {
        const delay = Math.max(0, a.endsAt.getTime() - Date.now());
        await auctionQueue.add('close', { auctionId: a._id.toString() }, { jobId, delay });
        result.missingJobsAddedCount++;
      }
    }

    // 5. Reset stuck outbox events
    const stuckResult = await Outbox.updateMany(
      {
        status: 'processing',
        lockedUntil: { $lte: now },
      },
      {
        $set: { status: 'pending', lockedUntil: null },
      },
    );
    result.stuckOutboxResetCount = stuckResult.modifiedCount;

    // 6. Deliver pending outbox items
    result.outboxProcessedCount = await processOutboxBatch(20);

    logger.debug({ result }, 'Reconciliation cycle completed');
  } catch (error) {
    logger.error({ error }, 'Reconciliation cycle encountered error');
  }

  return result;
}

