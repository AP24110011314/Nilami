import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js';
import { getRedisClient, disconnectRedis } from './config/redis.js';
import { initSocketServer, closeSocketServer } from './realtime/socket.js';

let server: http.Server | null = null;
let isShuttingDown = false;

async function startServer(): Promise<void> {
  try {
    // Connect database and cache
    await connectDB();
    getRedisClient();

    const app = createApp();
    server = http.createServer(app);
    initSocketServer(server);

    server.listen(env.PORT, () => {
      logger.info(
        { port: env.PORT, env: env.NODE_ENV, clientUrl: env.CLIENT_URL },
        `Nilami API server listening on http://localhost:${env.PORT}`,
      );
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start Nilami API server');
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, `Received ${signal}, commencing graceful shutdown`);

  // Close socket server and stop accepting incoming connections
  try {
    await closeSocketServer();
  } catch (err) {
    logger.error({ err }, 'Error closing socket server');
  }

  if (server) {
    await new Promise<void>((resolve) => {
      server?.close((err) => {
        if (err) {
          logger.error({ err }, 'Error closing HTTP server');
        } else {
          logger.info('HTTP server closed');
        }
        resolve();
      });
    });
  }

  try {
    await disconnectRedis();
    await disconnectDB();
    logger.info('All connections closed cleanly. Exiting.');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during graceful shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled Promise Rejection');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught Exception');
  process.exit(1);
});

void startServer();

