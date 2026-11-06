import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { getRedisClient, disconnectRedis } from '../../src/config/redis.js';
import { User, type UserDocument } from '../../src/modules/users/user.model.js';
import { Auction, type AuctionDocument } from '../../src/modules/auctions/auction.model.js';
import { Bid } from '../../src/modules/bids/bid.model.js';
import { Payment } from '../../src/modules/payments/payment.model.js';
import { FraudFlag } from '../../src/modules/fraud/fraud.model.js';
import { AuditLog } from '../../src/modules/admin/audit-log.model.js';
import { FraudService } from '../../src/modules/fraud/fraud.service.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';
import { closeAllQueues } from '../../src/queues/queues.js';

describe('Phase 8 — Advanced: Fraud, Reviews, Analytics & Admin Suite (T28)', () => {
  const app = createApp();

  let adminUser: UserDocument;
  let sellerUser: UserDocument;
  let buyerUser: UserDocument;
  let adminToken: string;
  let sellerToken: string;
  let buyerToken: string;

  beforeAll(async () => {
    await connectDB();
    getRedisClient();

    // 1. Seed users
    adminUser = (await User.create({
      name: 'Admin Boss',
      email: `admin_${crypto.randomUUID()}@nilami.local`,
      passwordHash: 'dummyhash',
      roles: ['admin', 'buyer'],
      emailVerifiedAt: new Date(),
      status: 'active',
    })) as UserDocument;
    adminToken = generateAccessToken(adminUser);

    sellerUser = (await User.create({
      name: 'Vintage Watchmaker',
      email: `seller_${crypto.randomUUID()}@nilami.local`,
      passwordHash: 'dummyhash',
      roles: ['seller', 'buyer'],
      emailVerifiedAt: new Date(),
      status: 'active',
      ratingAvg: 0,
      ratingCount: 0,
    })) as UserDocument;
    sellerToken = generateAccessToken(sellerUser);

    buyerUser = (await User.create({
      name: 'Eager Bidder',
      email: `buyer_${crypto.randomUUID()}@nilami.local`,
      passwordHash: 'dummyhash',
      roles: ['buyer'],
      emailVerifiedAt: new Date(),
      status: 'active',
    })) as UserDocument;
    buyerToken = generateAccessToken(buyerUser);
  });

  afterAll(async () => {
    await closeAllQueues();
    await disconnectRedis();
    await disconnectDB();
  });

  async function createTestAuction(endsAtOffsetMs = 600000): Promise<AuctionDocument> {
    const now = new Date();
    return (await Auction.create({
      sellerId: sellerUser._id,
      title: 'HMT Pilot Mechanical Watch',
      description: 'Vintage authentic 17 jewels mechanical hand-winding watch.',
      category: 'collectibles',
      condition: 'used_good',
      images: [{ url: 'https://example.com/hmt.webp' }],
      currency: 'INR',
      startingPrice: 100000,
      reservePrice: 100000,
      minIncrement: 10000,
      currentPrice: 100000,
      minNextBid: 110000,
      startsAt: new Date(now.getTime() - 60000),
      endsAt: new Date(now.getTime() + endsAtOffsetMs),
      originalEndsAt: new Date(now.getTime() + endsAtOffsetMs),
      status: 'active',
      watchCount: 5,
      antiSnipe: {
        enabled: true,
        windowMs: 10000,
        extendMs: 30000,
        maxExtensions: 20,
      },
    })) as AuctionDocument;
  }

  it('T28: Fraud rule: seller-linked bidder triggers flag with score >= 60', async () => {
    const auction = await createTestAuction();
    const sharedIp = '203.0.113.88';

    // 1. Simulate prior activity from seller on shared IP
    const priorSellerBid = await Bid.create({
      auctionId: auction._id,
      bidderId: sellerUser._id,
      amount: 100000,
      idempotencyKey: crypto.randomUUID(),
      ip: sharedIp,
      userAgentHash: 'agent-seller-hash',
    });

    // 2. Buyer bids on seller auction sharing the same IP
    const buyerBid = await Bid.create({
      auctionId: auction._id,
      bidderId: buyerUser._id,
      amount: 110000,
      idempotencyKey: crypto.randomUUID(),
      ip: sharedIp,
      userAgentHash: 'agent-buyer-hash',
    });

    // 3. Evaluate fraud rules for buyer's bid
    const evalRes = await FraudService.evaluateBid({
      auctionId: auction._id.toString(),
      bidderId: buyerUser._id.toString(),
      bidId: buyerBid._id.toString(),
      amount: buyerBid.amount,
      ip: sharedIp,
      userAgentHash: 'agent-buyer-hash',
    });

    expect(evalRes.flagged).toBe(true);
    expect(evalRes.cumulativeScore).toBeGreaterThanOrEqual(60);

    // 4. Assert FraudFlag persisted with correct details
    const flag = await FraudFlag.findOne({
      type: 'SELLER_LINKED_BIDDER',
      subjectUserId: buyerUser._id,
      auctionId: auction._id,
    });

    expect(flag).not.toBeNull();
    expect(flag?.score).toBe(60);
    expect(flag?.status).toBe('open');
    expect(flag?.bidIds).toContainEqual(buyerBid._id);
    expect(flag?.bidIds).toContainEqual(priorSellerBid._id);
  });

  it('Fraud score >= 70 blocks subsequent bids with 403 FRAUD_BID_BLOCK', async () => {
    const auction = await createTestAuction();

    // Create an additional open flag to raise cumulative score >= 70 (60 + 40 = 100)
    await FraudFlag.create({
      type: 'BID_BURST',
      score: 40,
      subjectUserId: buyerUser._id,
      auctionId: auction._id,
      bidIds: [],
      evidence: { burst: true },
      status: 'open',
    });

    const isBlocked = await FraudService.isUserBlocked(buyerUser._id.toString());
    expect(isBlocked).toBe(true);

    // Attempt to bid via REST API
    const bidRes = await request(app)
      .post(`/api/auctions/${auction._id}/bid`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        amount: 120000,
        idempotencyKey: crypto.randomUUID(),
      });

    expect(bidRes.status).toBe(403);
    expect(bidRes.body.error.code).toBe('FRAUD_BID_BLOCK');

    // Clean up flags for subsequent tests
    await FraudFlag.deleteMany({ subjectUserId: buyerUser._id });
  });

  it('Admin Fraud Review: lists flags, confirms flag, suspends user, and logs audit', async () => {
    const auction = await createTestAuction();

    const flag = await FraudFlag.create({
      type: 'SHILL_PATTERN',
      score: 70,
      subjectUserId: buyerUser._id,
      auctionId: auction._id,
      bidIds: [],
      evidence: { suspicious: true },
      status: 'open',
    });

    // 1. Non-admin cannot access admin fraud flags
    const forbiddenRes = await request(app)
      .get('/api/admin/fraud-flags')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(forbiddenRes.status).toBe(403);

    // 2. Admin fetches fraud flags
    const listRes = await request(app)
      .get('/api/admin/fraud-flags?status=open')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.flags.length).toBeGreaterThanOrEqual(1);

    // 3. Admin confirms the flag
    const reviewRes = await request(app)
      .patch(`/api/admin/fraud-flags/${flag._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'confirmed',
        appealNote: 'Confirmed shill bidding activity',
      });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.flag.status).toBe('confirmed');

    // 4. Assert AuditLog entry was recorded
    const audit = await AuditLog.findOne({
      action: 'REVIEW_FRAUD_FLAG',
      targetId: flag._id,
    });
    expect(audit).not.toBeNull();
    expect(audit?.adminId.toString()).toBe(adminUser._id.toString());

    // Restore buyer status
    await User.updateOne({ _id: buyerUser._id }, { $set: { status: 'active' } });
  });

  it('Reviews & Seller Reputation: winner submits review and updates rating aggregates', async () => {
    const auction = await createTestAuction();
    const auctionId = auction._id.toString();

    // Mark auction completed with buyer as winner
    await Auction.updateOne(
      { _id: auction._id },
      {
        $set: {
          status: 'completed',
          winnerId: buyerUser._id,
          finalPrice: 150000,
        },
      },
    );

    // Create succeeded payment
    await Payment.create({
      auctionId: auction._id,
      buyerId: buyerUser._id,
      sellerId: sellerUser._id,
      amount: 150000,
      currency: 'INR',
      status: 'succeeded',
      method: 'checkout',
      dueAt: new Date(Date.now() + 86400000),
      paidAt: new Date(),
    });

    // 1. Winner submits 5-star review
    const reviewRes = await request(app)
      .post(`/api/auctions/${auctionId}/review`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        rating: 5,
        comment: 'Super fast delivery and pristine condition!',
      });

    expect(reviewRes.status).toBe(201);
    expect(reviewRes.body.review.rating).toBe(5);

    // 2. Seller aggregate updated
    const updatedSeller = await User.findById(sellerUser._id);
    expect(updatedSeller?.ratingAvg).toBe(5);
    expect(updatedSeller?.ratingCount).toBe(1);

    // 3. Duplicate review fails
    const dupRes = await request(app)
      .post(`/api/auctions/${auctionId}/review`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ rating: 4 });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('ALREADY_REVIEWED');

    // 4. Seller reputation tier
    const repRes = await request(app).get(`/api/users/${sellerUser._id}/reputation`);
    expect(repRes.status).toBe(200);
    expect(repRes.body.ratingAvg).toBe(5);
    expect(repRes.body.ratingCount).toBe(1);
    expect(repRes.body.isVerifiedSeller).toBe(true);
  });

  it('Analytics endpoints return accurate aggregations for lots, sellers, and admin', async () => {
    const auction = await createTestAuction();

    // 1. Auction Analytics
    const lotRes = await request(app).get(`/api/auctions/${auction._id}/analytics`);
    expect(lotRes.status).toBe(200);
    expect(lotRes.body.auctionId).toBe(auction._id.toString());
    expect(Array.isArray(lotRes.body.priceProgression)).toBe(true);

    // 2. Seller Overview Analytics
    const sellerRes = await request(app)
      .get('/api/analytics/seller/overview')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(sellerRes.status).toBe(200);
    expect(sellerRes.body.sellerId).toBe(sellerUser._id.toString());
    expect(typeof sellerRes.body.totalRevenue).toBe('number');
    expect(typeof sellerRes.body.sellThroughRate).toBe('number');

    // 3. Admin Overview Analytics
    const adminRes = await request(app)
      .get('/api/analytics/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(typeof adminRes.body.gmv).toBe('number');
    expect(typeof adminRes.body.activeAuctionsCount).toBe('number');
  });
});

