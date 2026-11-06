import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../config/redis.js';
import { env } from '../config/env.js';

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.NODE_ENV === 'test' ? 1000 : 10, // 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again after a minute',
    },
  },
  store:
    env.NODE_ENV === 'test'
      ? undefined
      : new RedisStore({
          // @ts-expect-error - rate-limit-redis expects ioredis client
          sendCommand: (...args: string[]) => getRedisClient().call(...args),
          prefix: 'rl:auth:',
        }),
});

export async function bidRateLimiter(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction): Promise<void> {
  if (env.NODE_ENV === 'test') {
    return next();
  }

  const userId = req.user?.id;
  const rawAuctionId = req.params.id;
  const auctionId = Array.isArray(rawAuctionId) ? rawAuctionId[0] : rawAuctionId;

  if (!userId || !auctionId) {
    return next();
  }

  const redis = getRedisClient();
  const key = `rl:bid:${userId}:${auctionId}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 10); // 10-second window
    }

    if (count > 5) {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Bid rate limit exceeded (maximum 5 bids per 10 seconds)',
        },
      });
      return;
    }

    next();
  } catch {
    // If Redis encounters issues, allow bid through
    next();
  }
}
