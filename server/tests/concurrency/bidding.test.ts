import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { getRedisClient, disconnectRedis } from '../../src/config/redis.js';
import { User, type UserDocument } from '../../src/modules/users/user.model.js';
import { Auction, type AuctionDocument } from '../../src/modules/auctions/auction.model.js';
import { Bid } from '../../src/modules/bids/bid.model.js';
import { Notification } from '../../src/modules/notifications/notification.model.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Phase 3 — Bidding Engine Suite (T1–T10)', () => {
  const app = createApp();

  let seller: UserDocument;
  let sellerToken: string;
  let buyer1: UserDocument;
  let buyer1Token: string;
  let buyer2: UserDocument;
  let buyer2Token: string;

  beforeAll(async () => {
    await connectDB();
    getRedisClient();

    // Create primary test users
    seller = (await User.create({
      name: 'Engine Seller',
      email: 'engine.seller@bidding.test.nilami.local',
      passwordHash: 'dummy',
      roles: ['seller', 'buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as UserDocument;

    buyer1 = (await User.create({
      name: 'Engine Bidder One',
      email: 'bidder1@bidding.test.nilami.local',
      passwordHash: 'dummy',
      roles: ['buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as UserDocument;

    buyer2 = (await User.create({
      name: 'Engine Bidder Two',
      email: 'bidder2@bidding.test.nilami.local',
      passwordHash: 'dummy',
      roles: ['buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as UserDocument;

    sellerToken = generateAccessToken(seller);
    buyer1Token = generateAccessToken(buyer1);
    buyer2Token = generateAccessToken(buyer2);
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@bidding\.test\.nilami\.local$/ });
    await Auction.deleteMany({ title: /^Engine Lot/ });
    await Bid.deleteMany({});
    await Notification.deleteMany({});
    await disconnectRedis();
    await disconnectDB();
  });

  // Helper to create an active auction quickly
  async function createActiveAuction(overrides: Partial<import('../../src/modules/auctions/auction.model.js').IAuction> = {}) {
    const now = Date.now();
    return (await Auction.create({
      sellerId: seller._id,
      title: `Engine Lot — ${crypto.randomUUID()}`,
      description: 'Test auction lot for bidding concurrency and validation',
      category: 'electronics',
      condition: 'new',
      images: [{ url: '/uploads/test.webp' }],
      currency: 'INR',
      startingPrice: 1000000, // ₹10,000
      minIncrement: 10000, // ₹100
      currentPrice: 1000000,
      minNextBid: 1000000,
      bidCount: 0,
      startsAt: new Date(now - 10000),
      endsAt: new Date(now + 3600 * 1000),
      originalEndsAt: new Date(now + 3600 * 1000),
      status: 'active',
      antiSnipe: {
        enabled: true,
        windowMs: 10000,
        extendMs: 30000,
        maxExtensions: 20,
      },
      ...overrides,
    })) as AuctionDocument;
  }

  it('T1: 2 users bid simultaneously (₹90k and ₹95k)', async () => {
    const auction = await createActiveAuction({
      startingPrice: 8000000, // ₹80,000
      minIncrement: 100000, // ₹1,000
      currentPrice: 8000000,
      minNextBid: 8000000,
    });

    // Fire simultaneous bids
    await Promise.all([
      request(app)
        .post(`/api/auctions/${auction._id}/bid`)
        .set('Authorization', `Bearer ${buyer1Token}`)
        .send({ amount: 9000000, idempotencyKey: crypto.randomUUID() }),
      request(app)
        .post(`/api/auctions/${auction._id}/bid`)
        .set('Authorization', `Bearer ${buyer2Token}`)
        .send({ amount: 9500000, idempotencyKey: crypto.randomUUID() }),
    ]);

    // Either res1 passes then res2 passes (or vice versa with outbid)
    const bids = await Bid.find({ auctionId: auction._id }).sort({ amount: 1 });
    const updatedAuction = await Auction.findById(auction._id);

    expect(updatedAuction?.currentPrice).toBe(Math.max(...bids.map((b) => b.amount)));
    expect(updatedAuction?.bidCount).toBe(bids.length);

    // Bids must be strictly increasing
    for (let i = 1; i < bids.length; i++) {
      expect(bids[i]!.amount).toBeGreaterThan(bids[i - 1]!.amount);
    }
  });

  it('T2: 50 parallel bids keep all invariants intact', async () => {
    const auction = await createActiveAuction({
      startingPrice: 1000000, // ₹10,000
      minIncrement: 10000, // ₹100
      currentPrice: 1000000,
      minNextBid: 1000000,
    });

    // Seed 50 distinct verified bidders
    const bidderCount = 50;
    const bidders: Array<{ user: UserDocument; token: string }> = [];

    const userDocs = await User.insertMany(
      Array.from({ length: bidderCount }, (_, i) => ({
        name: `Bidder Concurrency ${i}`,
        email: `concurrency_bidder_${i}_${crypto.randomUUID()}@bidding.test.nilami.local`,
        passwordHash: 'dummy',
        roles: ['buyer'],
        status: 'active',
        emailVerifiedAt: new Date(),
      })),
    );

    for (const u of userDocs) {
      bidders.push({
        user: u as UserDocument,
        token: generateAccessToken(u as UserDocument),
      });
    }

    // Amounts strictly separated by increment
    const amounts = bidders.map((_, i) => 1000000 + (i + 1) * 10000);

    // Fire all 50 bids concurrently
    await Promise.allSettled(
      bidders.map((b, i) =>
        request(app)
          .post(`/api/auctions/${auction._id}/bid`)
          .set('Authorization', `Bearer ${b.token}`)
          .send({ amount: amounts[i], idempotencyKey: crypto.randomUUID() }),
      ),
    );

    const bids = await Bid.find({ auctionId: auction._id }).sort({ createdAt: 1 });
    const finalAuction = await Auction.findById(auction._id);

    expect(bids.length).toBeGreaterThan(0);
    expect(finalAuction?.currentPrice).toBe(Math.max(...bids.map((b) => b.amount)));
    expect(finalAuction?.bidCount).toBe(bids.length);

    // Invariant: no duplicate amounts in bids
    const uniqueAmounts = new Set(bids.map((b) => b.amount));
    expect(uniqueAmounts.size).toBe(bids.length);

    // Invariant: strictly increasing in amount sequence
    const bidsByAmount = await Bid.find({ auctionId: auction._id }).sort({ amount: 1 });
    for (let i = 1; i < bidsByAmount.length; i++) {
      expect(bidsByAmount[i]!.amount).toBeGreaterThan(bidsByAmount[i - 1]!.amount);
    }
  }, 30000);

  it('T3: Bid below current / minimum is rejected with 409 BID_TOO_LOW', async () => {
    const auction = await createActiveAuction({
      currentPrice: 5000000,
      minNextBid: 5100000,
    });

    const res = await request(app)
      .post(`/api/auctions/${auction._id}/bid`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ amount: 4900000, idempotencyKey: crypto.randomUUID() });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BID_TOO_LOW');
    expect(res.body.error.details.minNextBid).toBe(5100000);
  });

  it('T4: Bid below minimum increment is rejected with 409 BID_TOO_LOW', async () => {
    const auction = await createActiveAuction({
      currentPrice: 5000000,
      minIncrement: 200000,
      minNextBid: 5200000,
    });

    const res = await request(app)
      .post(`/api/auctions/${auction._id}/bid`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ amount: 5100000, idempotencyKey: crypto.randomUUID() });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BID_TOO_LOW');
    expect(res.body.error.details.minNextBid).toBe(5200000);
  });

  it('T5: Bid after endsAt (DB clock) is rejected with 409 AUCTION_ENDED', async () => {
    const now = Date.now();
    const auction = await createActiveAuction({
      startsAt: new Date(now - 100000),
      endsAt: new Date(now - 1000), // Ended 1 second ago in DB
    });

    const res = await request(app)
      .post(`/api/auctions/${auction._id}/bid`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ amount: 2000000, idempotencyKey: crypto.randomUUID() });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('AUCTION_ENDED');
  });

  it('T6: Bid before startsAt is rejected with 409 AUCTION_NOT_STARTED', async () => {
    const now = Date.now();
    const auction = await createActiveAuction({
      startsAt: new Date(now + 100000), // Starts in future
      endsAt: new Date(now + 200000),
      status: 'scheduled',
    });

    const res = await request(app)
      .post(`/api/auctions/${auction._id}/bid`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ amount: 2000000, idempotencyKey: crypto.randomUUID() });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('AUCTION_NOT_STARTED');
  });

  it('T7: Seller bids on own auction is rejected with 403 SELLER_CANNOT_BID', async () => {
    const auction = await createActiveAuction();

    const res = await request(app)
      .post(`/api/auctions/${auction._id}/bid`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ amount: 2000000, idempotencyKey: crypto.randomUUID() });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SELLER_CANNOT_BID');
  });

  it('T8: Highest bidder re-bids is rejected with 409 ALREADY_HIGHEST_BIDDER', async () => {
    const auction = await createActiveAuction({
      startingPrice: 1000000,
      minIncrement: 10000,
      currentPrice: 1000000,
      minNextBid: 1000000,
    });

    // 1st bid by buyer1 succeeds
    const res1 = await request(app)
      .post(`/api/auctions/${auction._id}/bid`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ amount: 1000000, idempotencyKey: crypto.randomUUID() });
    expect(res1.status).toBe(201);

    // 2nd bid by buyer1 (same bidder while still highest) -> Rejected
    const res2 = await request(app)
      .post(`/api/auctions/${auction._id}/bid`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ amount: 1050000, idempotencyKey: crypto.randomUUID() });

    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('ALREADY_HIGHEST_BIDDER');
  });

  it('T9: Same idempotencyKey sent 5x concurrently produces one bid row and identical responses', async () => {
    const auction = await createActiveAuction({
      startingPrice: 2000000,
      minIncrement: 100000,
      currentPrice: 2000000,
      minNextBid: 2000000,
    });

    const sharedKey = crypto.randomUUID();

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app)
          .post(`/api/auctions/${auction._id}/bid`)
          .set('Authorization', `Bearer ${buyer1Token}`)
          .send({ amount: 2000000, idempotencyKey: sharedKey }),
      ),
    );

    // All 5 responses return HTTP 201
    for (const res of responses) {
      expect(res.status).toBe(201);
      expect(res.body.bid.amount).toBe(2000000);
    }

    // All returned bid IDs are identical
    const returnedBidIds = new Set(responses.map((r) => r.body.bid.id));
    expect(returnedBidIds.size).toBe(1);

    // Only one row exists in the database
    const bidRows = await Bid.find({ auctionId: auction._id, idempotencyKey: sharedKey });
    expect(bidRows.length).toBe(1);
  });

  it('T10: Bid in last 10s extends endsAt by 30s; 21st extension does not extend', async () => {
    const now = Date.now();
    // Auction ends in 6 seconds (inside 10-second anti-snipe window)
    const originalEndsAt = new Date(now + 6000);

    const auction = await createActiveAuction({
      startsAt: new Date(now - 60000),
      endsAt: originalEndsAt,
      originalEndsAt,
      extensionCount: 0,
      antiSnipe: {
        enabled: true,
        windowMs: 10000,
        extendMs: 30000,
        maxExtensions: 20,
      },
    });

    // Bid within anti-snipe window
    const res = await request(app)
      .post(`/api/auctions/${auction._id}/bid`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ amount: 1000000, idempotencyKey: crypto.randomUUID() });

    expect(res.status).toBe(201);
    expect(res.body.auction.extensionCount).toBe(1);

    // Extended time must be originalEndsAt + 30,000 ms
    const extendedEndsAt = new Date(res.body.auction.endsAt).getTime();
    expect(extendedEndsAt).toBe(originalEndsAt.getTime() + 30000);

    // Test 21st extension cap: set extensionCount = 20
    await Auction.findByIdAndUpdate(auction._id, {
      extensionCount: 20,
      endsAt: new Date(Date.now() + 5000), // inside window
      highestBidderId: null,
      currentPrice: 1000000,
      minNextBid: 1100000,
    });

    const resCapped = await request(app)
      .post(`/api/auctions/${auction._id}/bid`)
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({ amount: 1100000, idempotencyKey: crypto.randomUUID() });

    expect(resCapped.status).toBe(201);
    // extensionCount stays 20, endsAt is NOT extended further
    expect(resCapped.body.auction.extensionCount).toBe(20);
  });
});
