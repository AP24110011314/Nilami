import path from 'node:path';
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/error.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { auctionRouter } from './modules/auctions/auction.routes.js';
import { uploadRouter } from './modules/uploads/upload.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { paymentRouter, PaymentController } from './modules/payments/payment.routes.js';
import { watchlistRouter } from './modules/watchlist/watchlist.routes.js';
import { notificationRouter } from './modules/notifications/notification.routes.js';
import { reviewRouter } from './modules/reviews/review.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';
import { NotFoundError } from './lib/errors.js';

export function createApp(): Express {
  const app = express();

  // Trust reverse proxy (Render, Fly, Nginx) in production
  app.set('trust proxy', 1);

  // Security headers (allow loading uploaded images locally)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS - CLIENT_URL only
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }),
  );

  // Request logger
  app.use(
    pinoHttp({
      logger,
      autoLogging: env.NODE_ENV !== 'test',
    }),
  );

  // Cookie parser
  app.use(cookieParser());

  // Stripe webhook with raw body MUST be mounted before express.json()
  app.post(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' }),
    PaymentController.handleWebhook,
  );

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static uploads directory
  app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR)));

  // Routes
  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/auctions', auctionRouter);
  app.use('/api/uploads', uploadRouter);
  app.use('/api/payments', paymentRouter);
  app.use('/api/watchlist', watchlistRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api', reviewRouter);
  app.use('/api', analyticsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/', healthRouter);

  // Catch-all for undefined routes
  app.use((req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Central error middleware
  app.use(errorHandler);

  return app;
}
