import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getRedisClient } from '../../config/redis.js';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  let mongoStatus = 'down';
  let redisStatus = 'down';

  try {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      mongoStatus = 'ok';
    }
  } catch {
    mongoStatus = 'down';
  }

  try {
    const redis = getRedisClient();
    const pong = await redis.ping();
    if (pong === 'PONG') {
      redisStatus = 'ok';
    }
  } catch {
    redisStatus = 'down';
  }

  const isHealthy = mongoStatus === 'ok' && redisStatus === 'ok';
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    ok: isHealthy,
    mongo: mongoStatus,
    redis: redisStatus,
    uptime: process.uptime(),
    serverTime: new Date().toISOString(),
  });
}
