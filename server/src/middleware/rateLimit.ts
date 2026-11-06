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
