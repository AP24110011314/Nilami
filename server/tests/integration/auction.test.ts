import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { getRedisClient, disconnectRedis } from '../../src/config/redis.js';
import { User } from '../../src/modules/users/user.model.js';
import { Auction } from '../../src/modules/auctions/auction.model.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Phase 2 — Auction Management Integration Suite', () => {
  const app = createApp();
  let sellerToken: string;
  let buyerToken: string;
  let sellerUser: import('../../src/modules/users/user.model.js').UserDocument;
  let buyerUser: import('../../src/modules/users/user.model.js').UserDocument;

  beforeAll(async () => {
    await connectDB();
    getRedisClient();

    // Setup dedicated test seller and buyer
    sellerUser = (await User.create({
      name: 'Auction Test Seller',
      email: 'auctionseller@test.nilami.local',
      passwordHash: 'dummy',
      roles: ['seller', 'buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as import('../../src/modules/users/user.model.js').UserDocument;

    buyerUser = (await User.create({
      name: 'Auction Test Buyer',
      email: 'auctionbuyer@test.nilami.local',
      passwordHash: 'dummy',
      roles: ['buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as import('../../src/modules/users/user.model.js').UserDocument;

    sellerToken = generateAccessToken(sellerUser);
    buyerToken = generateAccessToken(buyerUser);
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test\.nilami\.local$/ });
    await Auction.deleteMany({ title: /^Test Auction/ });
    await disconnectRedis();
    await disconnectDB();
  });

  let createdAuctionId: string;

  it('Gate: image upload endpoint processes and re-encodes images with sharp', async () => {
    // Generate a small 100x100 PNG buffer
    const testImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 79, g: 70, b: 229, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const res = await request(app)
      .post('/api/uploads/images')
      .set('Authorization', `Bearer ${sellerToken}`)
      .attach('images', testImageBuffer, 'sample.png');

    expect(res.status).toBe(201);
    expect(res.body.images).toBeDefined();
    expect(res.body.images.length).toBe(1);
    expect(res.body.images[0].url).toMatch(/^\/uploads\/.*\.webp$/);
  });

  it('Gate: seller creates an auction with images and reserve price', async () => {
    const startsAt = new Date(Date.now() + 5000).toISOString();
    const endsAt = new Date(Date.now() + 2 * 3600 * 1000).toISOString();

    const payload = {
      title: 'Test Auction — Vintage Leica M3 Rangefinder',
      description: 'Classic 35mm rangefinder camera in mint condition with dual-stroke advance.',
      category: 'collectibles',
      condition: 'like_new',
      images: [
        { url: '/uploads/leica-m3-front.webp' },
        { url: '/uploads/leica-m3-top.webp' },
      ],
      startingPrice: 15000000, // ₹1,50,000 (paise)
      reservePrice: 18000000, // ₹1,80,000 (hidden reserve)
      minIncrement: 200000, // ₹2,000 (paise)
      startsAt,
      endsAt,
    };

    const res = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.auction).toBeDefined();
    expect(res.body.auction.title).toBe(payload.title);
    expect(res.body.auction.currentPrice).toBe(payload.startingPrice);
    expect(res.body.auction.reserveMet).toBe(false); // current 15000000 < reserve 18000000
    // CRITICAL: Reserve price MUST NEVER leak
    expect(res.body.auction.reservePrice).toBeUndefined();

    createdAuctionId = res.body.auction.id;
  });

  it('Gate: detail endpoint returns serverTime and NEVER exposes reservePrice', async () => {
    const res = await request(app)
      .get(`/api/auctions/${createdAuctionId}`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.auction).toBeDefined();
    expect(res.body.auction.id).toBe(createdAuctionId);
    expect(res.body.serverTime).toBeDefined();
    expect(typeof res.body.serverTime).toBe('string');
    expect(new Date(res.body.serverTime).toString()).not.toBe('Invalid Date');

    // Invariant check: reserveMet is present as a boolean, reservePrice is undefined
    expect(typeof res.body.auction.reserveMet).toBe('boolean');
    expect(res.body.auction.reservePrice).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('reservePrice');
  });

  it('Gate: buyers browse, search, and filter auctions without reservePrice leaking', async () => {
    const res = await request(app).get('/api/auctions').query({
      category: 'collectibles',
      sort: 'endingSoon',
      page: 1,
      limit: 10,
    });

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.serverTime).toBeDefined();

    for (const item of res.body.items) {
      expect(item.reservePrice).toBeUndefined();
      expect(typeof item.reserveMet).toBe('boolean');
      expect(JSON.stringify(item)).not.toContain('reservePrice');
    }
  });

  it('FR-B2: seller can edit auction before first bid', async () => {
    const updatedTitle = 'Test Auction — Vintage Leica M3 Rangefinder (Mint+)';
    const res = await request(app)
      .patch(`/api/auctions/${createdAuctionId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ title: updatedTitle });

    expect(res.status).toBe(200);
    expect(res.body.auction.title).toBe(updatedTitle);
  });

  it('FR-B2: non-owner cannot edit or cancel auction', async () => {
    const res = await request(app)
      .patch(`/api/auctions/${createdAuctionId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ title: 'Hacked Title' });

    expect(res.status).toBe(403);
  });

  it('FR-B2: auction with bids cannot be edited or cancelled by seller', async () => {
    // Simulate a bid placed on the auction
    await Auction.findByIdAndUpdate(createdAuctionId, {
      bidCount: 1,
      currentPrice: 16000000,
    });

    const editRes = await request(app)
      .patch(`/api/auctions/${createdAuctionId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ title: 'Attempted Edit With Bids' });

    expect(editRes.status).toBe(409);
    expect(editRes.body.error.code).toBe('AUCTION_HAS_BIDS');

    const cancelRes = await request(app)
      .post(`/api/auctions/${createdAuctionId}/cancel`)
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(cancelRes.status).toBe(409);
    expect(cancelRes.body.error.code).toBe('AUCTION_HAS_BIDS');
  });
});
