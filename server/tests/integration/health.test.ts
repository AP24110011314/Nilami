import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { getRedisClient, disconnectRedis } from '../../src/config/redis.js';

describe('Health Check API', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDB();
    getRedisClient();
  });

  afterAll(async () => {
    await disconnectRedis();
    await disconnectDB();
  });

  it('GET /api/health returns 200 with mongo and redis status as ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.mongo).toBe('ok');
    expect(res.body.redis).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.serverTime).toBe('string');
    expect(new Date(res.body.serverTime).toString()).not.toBe('Invalid Date');
  });

  it('GET /health alias also returns 200', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

