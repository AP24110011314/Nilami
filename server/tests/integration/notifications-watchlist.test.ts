import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { getRedisClient, disconnectRedis } from '../../src/config/redis.js';
import { User, type UserDocument } from '../../src/modules/users/user.model.js';
import { Auction, type AuctionDocument } from '../../src/modules/auctions/auction.model.js';
import { Watchlist } from '../../src/modules/watchlist/watchlist.model.js';
import { Notification, type NotificationType } from '../../src/modules/notifications/notification.model.js';
import { WatchlistService } from '../../src/modules/watchlist/watchlist.service.js';
import { renderEmailTemplate } from '../../src/queues/email.templates.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';
import { closeAllQueues } from '../../src/queues/queues.js';

describe('Phase 7 — Notifications & Watchlist Suite (T29)', () => {
  const app = createApp();

  let seller: UserDocument;
  let buyer: UserDocument;
  let buyerToken: string;

  beforeAll(async () => {
    await connectDB();
    getRedisClient();

    seller = (await User.create({
      name: 'Watchlist Seller',
      email: `seller_${crypto.randomUUID()}@notif.test.nilami.local`,
      passwordHash: 'dummy',
      roles: ['seller', 'buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as UserDocument;

    buyer = (await User.create({
      name: 'Watchlist Buyer',
      email: `buyer_${crypto.randomUUID()}@notif.test.nilami.local`,
      passwordHash: 'dummy',
      roles: ['buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as UserDocument;
    buyerToken = generateAccessToken(buyer);
  });

  afterAll(async () => {
    await closeAllQueues();
    await User.deleteMany({ email: /@notif\.test\.nilami\.local$/ });
    await disconnectRedis();
    await disconnectDB();
  });

  async function createTestAuction(endsAtOffsetMs = 3600000): Promise<AuctionDocument> {
    const now = new Date();
    return (await Auction.create({
      sellerId: seller._id,
      title: 'Watchlist Vintage Lot',
      description: 'Testing watchlist and notification triggers',
      category: 'collectibles',
      condition: 'used_good',
      images: [{ url: 'https://example.com/item.webp' }],
      currency: 'INR',
      startingPrice: 500000,
      reservePrice: 500000,
      minIncrement: 20000,
      currentPrice: 500000,
      minNextBid: 520000,
      startsAt: new Date(now.getTime() - 60000),
      endsAt: new Date(now.getTime() + endsAtOffsetMs),
      originalEndsAt: new Date(now.getTime() + endsAtOffsetMs),
      status: 'active',
      watchCount: 0,
      antiSnipe: {
        enabled: true,
        windowMs: 10000,
        extendMs: 30000,
        maxExtensions: 20,
      },
    })) as AuctionDocument;
  }

  it('Watch and unwatch toggles update auction watchCount transactionally', async () => {
    const auction = await createTestAuction();
    const auctionId = auction._id.toString();

    // 1. Watch
    const watchRes = await request(app)
      .post(`/api/watchlist/${auctionId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ remindMinutesBefore: 15 });

    expect(watchRes.status).toBe(200);
    expect(watchRes.body.watching).toBe(true);

    const docBefore = await Watchlist.findOne({ userId: buyer._id, auctionId: auction._id });
    expect(docBefore).not.toBeNull();

    const watchedAuction = await Auction.findById(auctionId);
    expect(watchedAuction?.watchCount).toBe(1);

    // Check status
    const statusRes = await request(app)
      .get(`/api/watchlist/${auctionId}/status`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.watching).toBe(true);

    // Check my-watchlist
    const listRes = await request(app)
      .get('/api/watchlist')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.items.length).toBeGreaterThanOrEqual(1);

    // 2. Unwatch
    const unwatchRes = await request(app)
      .delete(`/api/watchlist/${auctionId}`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(unwatchRes.status).toBe(200);
    expect(unwatchRes.body.watching).toBe(false);

    const unwatchedAuction = await Auction.findById(auctionId);
    expect(unwatchedAuction?.watchCount).toBe(0);
  });

  it('T29: watch reminder after extension is re-delayed and sent at correct time', async () => {
    // Auction configured to end in 10 minutes, reminder set for 15 minutes before
    const auction = await createTestAuction(10 * 60 * 1000);
    const auctionId = auction._id.toString();
    const userId = buyer._id.toString();

    // User watches with 15 minute reminder
    await WatchlistService.watchAuction(userId, auctionId, 15);

    // Simulate anti-sniping extension: endsAt extended by 20 minutes (now ending in 30 minutes)
    auction.endsAt = new Date(Date.now() + 30 * 60 * 1000);
    await auction.save();

    // Execute reminder handler (simulating scheduled job firing at original target)
    const result = await WatchlistService.handleWatchReminder(auctionId, userId, 15);

    // Result must be 'rescheduled' because remaining time (30m) > threshold (15m)
    expect(result.status).toBe('rescheduled');
    expect(result.newDelay).toBeGreaterThan(0);

    // No notification sent yet
    const notifBefore = await Notification.findOne({
      userId: buyer._id,
      dedupeKey: `remind_${auctionId}_${userId}`,
    });
    expect(notifBefore).toBeNull();

    // Now advance auction time so remaining is 10 minutes (<= 15 minutes)
    auction.endsAt = new Date(Date.now() + 10 * 60 * 1000);
    await auction.save();

    // Execute reminder handler again at rescheduled time
    const result2 = await WatchlistService.handleWatchReminder(auctionId, userId, 15);
    expect(result2.status).toBe('reminded');

    // Notification created
    const notifAfter = await Notification.findOne({
      userId: buyer._id,
      dedupeKey: `remind_${auctionId}_${userId}`,
    });
    expect(notifAfter).toBeDefined();
    expect(notifAfter?.type).toBe('WATCH_REMINDER');
  });

  it('Notifications API: fetch paginated, mark single read, mark all read', async () => {
    const userId = buyer._id;

    // Seed 3 unread notifications
    await Notification.create([
      {
        userId,
        type: 'OUTBID',
        title: 'You were outbid',
        body: 'Outbid on lot A',
        dedupeKey: `notif_${crypto.randomUUID()}`,
      },
      {
        userId,
        type: 'WON',
        title: 'You won lot B',
        body: 'Won lot B',
        dedupeKey: `notif_${crypto.randomUUID()}`,
      },
      {
        userId,
        type: 'PAYMENT_DUE',
        title: 'Payment required',
        body: 'Please complete payment',
        dedupeKey: `notif_${crypto.randomUUID()}`,
      },
    ]);

    // 1. Get notifications
    const getRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.items.length).toBeGreaterThanOrEqual(3);
    expect(getRes.body.unreadCount).toBeGreaterThanOrEqual(3);

    const firstId = getRes.body.items[0].id;

    // 2. Mark single read
    const readOneRes = await request(app)
      .patch(`/api/notifications/${firstId}/read`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(readOneRes.status).toBe(200);

    // 3. Mark all read
    const readAllRes = await request(app)
      .post('/api/notifications/mark-all-read')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(readAllRes.status).toBe(200);

    const freshGet = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(freshGet.body.unreadCount).toBe(0);
  });

  it('Acceptance Gate: every notification type in DATABASE.md has a valid email template', () => {
    const allTypes: NotificationType[] = [
      'OUTBID',
      'WON',
      'LOST',
      'PAYMENT_DUE',
      'PAYMENT_SUCCEEDED',
      'PAYMENT_FAILED',
      'AUCTION_ENDING',
      'AUCTION_EXTENDED',
      'SOLD',
      'UNSOLD',
      'WATCH_REMINDER',
      'FRAUD_ALERT',
      'REVIEW_RECEIVED',
    ];

    for (const type of allTypes) {
      const template = renderEmailTemplate({
        type,
        title: `Test Title for ${type}`,
        body: `Test Body Description for ${type}`,
        name: 'Aditi Sharma',
      });

      expect(template.subject).toBeDefined();
      expect(template.subject.length).toBeGreaterThan(0);
      expect(template.html).toContain('Nilami');
      expect(template.html).toContain('Aditi Sharma');
      expect(template.text).toContain('Aditi Sharma');
    }
  });
});
