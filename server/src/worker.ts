import { Worker, type Job } from 'bullmq';
import { logger } from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js';
import { getRedisClient, disconnectRedis } from './config/redis.js';
import {
  QUEUE_PREFIX,
  maintenanceQueue,
  closeAuction,
  closeAllQueues,
} from './queues/queues.js';
import { runReconciliation } from './queues/reconciliation.service.js';
import { processOutboxBatch } from './queues/outbox.dispatcher.js';
import { Auction } from './modules/auctions/auction.model.js';
import { Payment } from './modules/payments/payment.model.js';
import { WatchlistService } from './modules/watchlist/watchlist.service.js';
import { sendEmail } from './config/mailer.js';
import { renderEmailTemplate } from './queues/email.templates.js';
import type { NotificationType } from './modules/notifications/notification.model.js';
import { emitAuctionEnding } from './realtime/events.js';

let isShuttingDown = false;
const activeWorkers: Worker[] = [];

async function startWorker(): Promise<void> {
  try {
    await connectDB();
    const redis = getRedisClient();

    logger.info('Initializing Nilami BullMQ background workers...');

    // 1. Run recovery reconciliation once immediately on boot
    logger.info('Running boot-time recovery reconciliation...');
    const bootStats = await runReconciliation();
    logger.info({ bootStats }, 'Boot-time recovery reconciliation complete');

    // 2. Setup periodic schedulers
    await maintenanceQueue.upsertJobScheduler(
      'reconcile-scheduler',
      { every: 30000 },
      { name: 'reconcile', data: {} },
    );

    await maintenanceQueue.upsertJobScheduler(
      'outbox-scheduler',
      { every: 5000 },
      { name: 'outbox-dispatch', data: {} },
    );

    // 3. Auction Worker: processes activate, ending-soon, close
    const auctionWorker = new Worker(
      'auction',
      async (job: Job) => {
        const { auctionId } = job.data as { auctionId: string };
        logger.debug({ jobId: job.id, name: job.name, auctionId }, 'Processing auction job');

        switch (job.name) {
          case 'activate': {
            await Auction.updateOne(
              { _id: auctionId, status: 'scheduled' },
              { $set: { status: 'active' }, $inc: { version: 1 } },
            );
            return { status: 'activated' };
          }

          case 'ending-soon': {
            const auction = await Auction.findById(auctionId);
            if (!auction || auction.status !== 'active') return { status: 'noop' };

            const now = Date.now();
            const endsAtMs = auction.endsAt.getTime();
            const secondsLeft = Math.round((endsAtMs - now) / 1000);

            if (secondsLeft <= 65 && secondsLeft > 0) {
              emitAuctionEnding({
                auctionId,
                endsAt: auction.endsAt.toISOString(),
                secondsLeft,
                serverTime: new Date().toISOString(),
              });
            }
            return { status: 'broadcasted', secondsLeft };
          }

          case 'close': {
            const res = await closeAuction(auctionId);
            return { status: 'closed', result: res };
          }

          case 'watch-reminder': {
            const { auctionId: aid, userId, remindMinutesBefore } = job.data as {
              auctionId: string;
              userId: string;
              remindMinutesBefore: number;
            };
            return await WatchlistService.handleWatchReminder(aid, userId, remindMinutesBefore);
          }

          default:
            logger.warn({ jobName: job.name }, 'Unknown auction job name');
            return { status: 'ignored' };
        }
      },
      {
        connection: redis,
        prefix: QUEUE_PREFIX,
        concurrency: 10,
      },
    );

    // 4. Maintenance Worker: processes reconcile & outbox dispatch
    const maintenanceWorker = new Worker(
      'maintenance',
      async (job: Job) => {
        logger.debug({ jobId: job.id, name: job.name }, 'Processing maintenance job');
        if (job.name === 'reconcile') {
          const stats = await runReconciliation();
          return { status: 'reconciled', stats };
        }
        if (job.name === 'outbox-dispatch') {
          const count = await processOutboxBatch(20);
          return { status: 'outbox_dispatched', count };
        }
        return { status: 'noop' };
      },
      {
        connection: redis,
        prefix: QUEUE_PREFIX,
        concurrency: 1,
      },
    );

    // 5. Payments Worker: processes payment-expiry
    const paymentsWorker = new Worker(
      'payments',
      async (job: Job) => {
        const { auctionId } = job.data as { auctionId: string };
        logger.debug({ jobId: job.id, name: job.name, auctionId }, 'Processing payments job');

        if (job.name === 'payment-expiry') {
          const payment = await Payment.findOne({ auctionId });
          if (payment && !['succeeded', 'processing'].includes(payment.status)) {
            await Payment.updateOne(
              { _id: payment._id },
              { $set: { status: 'expired' } },
            );
            await Auction.updateOne(
              { _id: auctionId, status: 'payment_pending' },
              { $set: { status: 'payment_failed' }, $inc: { version: 1 } },
            );
            return { status: 'expired' };
          }
        }
        return { status: 'noop' };
      },
      {
        connection: redis,
        prefix: QUEUE_PREFIX,
        concurrency: 5,
      },
    );

    // 6. Notifications Worker: processes email dispatch
    const notificationsWorker = new Worker(
      'notifications',
      async (job: Job) => {
        const { to, type, title, body, name, auctionId } = job.data as {
          to: string;
          type: NotificationType;
          title: string;
          body: string;
          name?: string;
          auctionId?: string;
        };
        logger.debug({ jobId: job.id, to, type }, 'Processing email notification job');

        const template = renderEmailTemplate({ type, title, body, name, auctionId });
        await sendEmail({
          to,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });

        return { status: 'sent', to, type };
      },
      {
        connection: redis,
        prefix: QUEUE_PREFIX,
        concurrency: 5,
      },
    );

    activeWorkers.push(auctionWorker, maintenanceWorker, paymentsWorker, notificationsWorker);

    for (const worker of activeWorkers) {
      worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, name: job?.name, err }, 'Worker job failed');
      });
      worker.on('error', (err) => {
        logger.error({ err }, 'Worker system error');
      });
    }

    logger.info('Nilami BullMQ workers started and actively processing queues');
  } catch (error) {
    logger.fatal({ error }, 'Failed to start BullMQ worker process');
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, `Received ${signal}, shutting down BullMQ workers gracefully`);

  try {
    for (const worker of activeWorkers) {
      await worker.close();
    }
    await closeAllQueues();
    logger.info('All BullMQ workers and queues stopped');
    await disconnectRedis();
    await disconnectDB();
    logger.info('Worker connections closed cleanly. Exiting.');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during graceful shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Worker Unhandled Promise Rejection');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Worker Uncaught Exception');
  process.exit(1);
});

void startWorker();
