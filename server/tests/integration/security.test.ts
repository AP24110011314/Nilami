import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { getRedisClient, disconnectRedis } from '../../src/config/redis.js';
import { User, type UserDocument } from '../../src/modules/users/user.model.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';
import { closeAllQueues } from '../../src/queues/queues.js';

describe('Phase 9 — Security Checklist & Hardening Suite', () => {
  const app = createApp();

  let seller: UserDocument;
  let buyer: UserDocument;
  let sellerToken: string;
  let buyerToken: string;

  beforeAll(async () => {
    await connectDB();
    getRedisClient();

    seller = (await User.create({
      name: 'Verified Seller',
      email: `seller_${crypto.randomUUID()}@nilami.local`,
      passwordHash: 'dummy',
      roles: ['seller', 'buyer'],
      emailVerifiedAt: new Date(),
      status: 'active',
    })) as UserDocument;
    sellerToken = generateAccessToken(seller);

    buyer = (await User.create({
      name: 'Legit Buyer',
      email: `buyer_${crypto.randomUUID()}@nilami.local`,
      passwordHash: 'dummy',
      roles: ['buyer'],
      emailVerifiedAt: new Date(),
      status: 'active',
    })) as UserDocument;
    buyerToken = generateAccessToken(buyer);
  });

  afterAll(async () => {
    await closeAllQueues();
    await disconnectRedis();
    await disconnectDB();
  });

  it('Rejects non-image script file masquerading as PNG', async () => {
    const maliciousPayload = Buffer.from('<script>alert("hacked")</script>');

    const res = await request(app)
      .post('/api/uploads/images')
      .set('Authorization', `Bearer ${sellerToken}`)
      .attach('images', maliciousPayload, 'exploit.png');

    // sharp fails to decode non-image content and returns 400 or 500 error
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('Enforces Authentication: Protected endpoints reject requests without token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('Enforces Authentication: Invalid token signature rejected', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid.jwt.token');
    expect(res.status).toBe(401);
  });

  it('Suspended user is forbidden from performing sensitive actions', async () => {
    const suspendedUser = (await User.create({
      name: 'Suspended Bad Actor',
      email: `bad_${crypto.randomUUID()}@nilami.local`,
      passwordHash: 'dummy',
      roles: ['buyer'],
      emailVerifiedAt: new Date(),
      status: 'suspended',
    })) as UserDocument;
    const suspendedToken = generateAccessToken(suspendedUser);

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${suspendedToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('Prevents NoSQL injection in search queries', async () => {
    const injectionQuery = { $gt: '' };

    const res = await request(app)
      .get('/api/auctions')
      .query({ q: injectionQuery });

    // Should handle safely without server crash or bypass
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.items)).toBe(true);
    }
  });

  it('Role isolation: Non-seller buyer cannot access auction creation', async () => {
    const res = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        title: 'Unauthorized Auction Attempt',
        description: 'Should be rejected',
        startingPrice: 100000,
      });

    expect(res.status).toBe(403);
  });
});
