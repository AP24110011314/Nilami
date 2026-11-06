import { Worker, type Job } from 'bullmq';
import { logger } from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js';
import { getRedisClient, disconnectRedis } from './config/redis.js';

let isShuttingDown = false;
const activeWorkers: Worker[] = [];

async function startWorker(): Promise<void> {
  try {
    await connectDB();
    const redis = getRedisClient();

    logger.info('Initializing BullMQ workers...');

    // Phase 0 Worker skeleton (queues will be expanded in Phase 5)
    // BullMQ requires maxRetriesPerRequest: null, which is configured in redis.ts
    const maintenanceWorker = new Worker(
      'nilami-maintenance',
      async (job: Job) => {
        logger.info({ jobId: job.id, name: job.name }, 'Processing maintenance job');
        return { status: 'completed' };
      },
      {
        connection: redis,
        concurrency: 1,
      },
    );

    maintenanceWorker.on('completed', (job) => {
      logger.debug({ jobId: job.id }, 'Job completed');
    });

    maintenanceWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, 'Job failed');
    });

    maintenanceWorker.on('error', (err) => {
      logger.error({ err }, 'Worker error occurred');
    });

    activeWorkers.push(maintenanceWorker);

    logger.info('BullMQ worker process started and waiting for jobs');
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
    logger.info('All BullMQ workers stopped');

    await disconnectRedis();
    await disconnectDB();
    logger.info('Worker process exited cleanly');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during worker shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Worker unhandled rejection');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Worker uncaught exception');
  process.exit(1);
});

void startWorker();
