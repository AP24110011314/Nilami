import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { getRedisClient, disconnectRedis } from '../../src/config/redis.js';
import { User, type UserDocument } from '../../src/modules/users/user.model.js';
import { Auction, type AuctionDocument } from '../../src/modules/auctions/auction.model.js';
import { Bid } from '../../src/modules/bids/bid.model.js';
import { Payment } from '../../src/modules/payments/payment.model.js';
import { Outbox } from '../../src/modules/outbox/outbox.model.js';
import { Notification } from '../../src/modules/notifications/notification.model.js';
import { closeAuction, closeAllQueues } from '../../src/queues/queues.js';
import { runReconciliation } from '../../src/queues/reconciliation.service.js';
import { processOutboxBatch } from '../../src/queues/outbox.dispatcher.js';

describe('Phase 5 — Background Processing Suite (T11–T15)', () => {
  let seller: UserDocument;
  let buyer1: UserDocument;
  let buyer2: UserDocument;

  beforeAll(async () => {
    await connectDB();
    getRedisClient();

    seller = (await User.create({
      name: 'Jobs Seller',
      email: `seller_${crypto.randomUUID()}@jobs.test.nilami.local`,
      passwordHash: 'dummy',
      roles: ['seller', 'buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as UserDocument;

    buyer1 = (await User.create({
      name: 'Jobs Buyer One',
      email: `buyer1_${crypto.randomUUID()}@jobs.test.nilami.local`,
      passwordHash: 'dummy',
      roles: ['buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as UserDocument;

    buyer2 = (await User.create({
      name: 'Jobs Buyer Two',
      email: `buyer2_${crypto.randomUUID()}@jobs.test.nilami.local`,
      passwordHash: 'dummy',
      roles: ['buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as UserDocument;
  });

  afterAll(async () => {
    await closeAllQueues();
    if (seller?._id) {
      const auctionIds = (await Auction.find({ sellerId: seller._id }).select('_id')).map(
        (doc) => doc._id,
      );
      if (auctionIds.length > 0) {
        await Bid.deleteMany({ auctionId: { $in: auctionIds } });
        await Payment.deleteMany({ auctionId: { $in: auctionIds } });
        await Outbox.deleteMany({ 'payload.auctionId': { $in: auctionIds.map(String) } });
        await Auction.deleteMany({ _id: { $in: auctionIds } });
      }
      await Notification.deleteMany({
        userId: { $in: [seller._id, buyer1._id, buyer2._id].filter(Boolean) },
      });
    }
    await User.deleteMany({ email: /@jobs\.test\.nilami\.local$/ });
    await disconnectRedis();
    await disconnectDB();
  });

  async function createAuctionWithBids(options: {
    startingPrice?: number;
    reservePrice?: number;
    currentPrice?: number;
    highestBidderId?: mongoose.Types.ObjectId;
    bidCount?: number;
    endsAtOffsetMs?: number;
    startsAtOffsetMs?: number;
    status?: 'scheduled' | 'active';
  } = {}): Promise<AuctionDocument> {
    const now = new Date();
    const startsAt = new Date(now.getTime() + (options.startsAtOffsetMs ?? -60000));
    const endsAt = new Date(now.getTime() + (options.endsAtOffsetMs ?? -1000)); // expired by default for closing

    const startingPrice = options.startingPrice ?? 100000;
    const currentPrice = options.currentPrice ?? startingPrice;

    const auction = (await Auction.create({
      sellerId: seller._id,
      title: 'Jobs Auction Lot',
      description: 'Testing background jobs and closing semantics',
      category: 'electronics',
      condition: 'new',
      images: [{ url: 'https://example.com/lot.webp' }],
      currency: 'INR',
      startingPrice,
      reservePrice: options.reservePrice ?? 100000,
      minIncrement: 10000,
      currentPrice,
      minNextBid: currentPrice + 10000,
      highestBidderId: options.highestBidderId,
      bidCount: options.bidCount ?? (options.highestBidderId ? 1 : 0),
      startsAt,
      endsAt,
      originalEndsAt: endsAt,
      status: options.status ?? 'active',
      antiSnipe: {
        enabled: true,
        windowMs: 10000,
        extendMs: 30000,
        maxExtensions: 20,
      },
    })) as AuctionDocument;

    if (options.highestBidderId) {
      await Bid.create({
        auctionId: auction._id,
        bidderId: options.highestBidderId,
        amount: currentPrice,
        idempotencyKey: crypto.randomUUID(),
        extended: false,
        ip: '127.0.0.1',
        userAgentHash: 'dummy',
        createdAt: new Date(now.getTime() - 2000),
      });
    }

    return auction;
  }

  it('T11: closeAuction runs twice concurrently: exactly one winner, one payment row, one outbox event', async () => {
    const auction = await createAuctionWithBids({
      startingPrice: 100000, // ₹1,000
      reservePrice: 150000, // ₹1,500
      currentPrice: 200000, // ₹2,000 (reserve met)
      highestBidderId: buyer1._id,
      bidCount: 2,
    });

    const auctionId = auction._id.toString();

    // Fire 2 concurrent close calls
    const [res1, res2] = await Promise.all([
      closeAuction(auctionId),
      closeAuction(auctionId),
    ]);

    // One must have closed, the other must have returned 'noop'
    const results = [res1, res2];
    expect(results).toContain('closed');
    expect(results).toContain('noop');

    // Assert database state invariants
    const updatedAuction = await Auction.findById(auctionId);
    expect(updatedAuction?.status).toBe('payment_pending');
    expect(updatedAuction?.winnerId?.toString()).toBe(buyer1._id.toString());
    expect(updatedAuction?.finalPrice).toBe(200000);
    expect(updatedAuction?.closedAt).toBeDefined();

    // Invariant: At most one payments row per auction
    const payments = await Payment.find({ auctionId: auction._id });
    expect(payments.length).toBe(1);
    expect(payments[0]!.amount).toBe(200000);
    expect(payments[0]!.buyerId.toString()).toBe(buyer1._id.toString());
    expect(payments[0]!.sellerId.toString()).toBe(seller._id.toString());
    expect(payments[0]!.status).toBe('pending');

    // Invariant: Exactly one outbox event
    const outboxEvents = await Outbox.find({ 'payload.auctionId': auctionId });
    expect(outboxEvents.length).toBe(1);
    expect(outboxEvents[0]!.type).toBe('auction.won');
  });

  it('T12: close job fires before extended endsAt: re-delays and auction stays active', async () => {
    // Auction whose endsAt is 15 seconds in the future
    const auction = await createAuctionWithBids({
      endsAtOffsetMs: 15000, // future endsAt
      highestBidderId: buyer1._id,
    });

    const auctionId = auction._id.toString();
    const res = await closeAuction(auctionId);

    // Should return reschedule object with remaining milliseconds
    expect(typeof res).toBe('object');
    expect(res).not.toBeNull();
    if (typeof res === 'object' && res !== null) {
      expect('reschedule' in res).toBe(true);
      expect(res.reschedule).toBeGreaterThan(0);
    }

    // Auction must remain active and unclosed
    const fresh = await Auction.findById(auctionId);
    expect(fresh?.status).toBe('active');
    expect(fresh?.closedAt).toBeFalsy();

    // No payments or outbox events created
    const payments = await Payment.find({ auctionId: auction._id });
    expect(payments.length).toBe(0);
  });

  it('T13: kill worker before endsAt, reconciler closes expired auction on recovery', async () => {
    // Auction expired 5 seconds ago
    const auction = await createAuctionWithBids({
      endsAtOffsetMs: -5000,
      currentPrice: 300000,
      reservePrice: 200000,
      highestBidderId: buyer2._id,
      bidCount: 1,
    });

    // Run reconciliation cycle (simulates worker startup recovery or 30s cron)
    const stats = await runReconciliation();
    expect(stats.closedCount).toBeGreaterThanOrEqual(1);

    const fresh = await Auction.findById(auction._id);
    expect(fresh?.status).toBe('payment_pending');
    expect(fresh?.winnerId?.toString()).toBe(buyer2._id.toString());
    expect(fresh?.finalPrice).toBe(300000);
  });

  it('T14: reserve price not met: auction closes as unsold with no payment row', async () => {
    const auction = await createAuctionWithBids({
      startingPrice: 100000,
      reservePrice: 500000, // ₹5,000 reserve
      currentPrice: 200000, // ₹2,000 current price (reserve not met)
      highestBidderId: buyer1._id,
      bidCount: 1,
    });

    const res = await closeAuction(auction._id.toString());
    expect(res).toBe('closed');

    const fresh = await Auction.findById(auction._id);
    expect(fresh?.status).toBe('unsold');
    expect(fresh?.winnerId).toBeFalsy();
    expect(fresh?.closedAt).toBeDefined();

    // Invariant: No payment row created for unsold auction
    const payments = await Payment.find({ auctionId: auction._id });
    expect(payments.length).toBe(0);

    // Outbox event must be auction.unsold
    const outboxEvents = await Outbox.find({ 'payload.auctionId': auction._id.toString() });
    expect(outboxEvents.length).toBe(1);
    expect(outboxEvents[0]!.type).toBe('auction.unsold');
  });

  it('T15: zero bids: auction closes as unsold with no payment row', async () => {
    const auction = await createAuctionWithBids({
      startingPrice: 100000,
      reservePrice: 100000,
      currentPrice: 100000,
      bidCount: 0,
      highestBidderId: undefined, // no bids
    });

    const res = await closeAuction(auction._id.toString());
    expect(res).toBe('closed');

    const fresh = await Auction.findById(auction._id);
    expect(fresh?.status).toBe('unsold');
    expect(fresh?.winnerId).toBeFalsy();

    const payments = await Payment.find({ auctionId: auction._id });
    expect(payments.length).toBe(0);

    const outboxEvents = await Outbox.find({ 'payload.auctionId': auction._id.toString() });
    expect(outboxEvents.length).toBe(1);
    expect(outboxEvents[0]!.type).toBe('auction.unsold');
  });

  it('Outbox dispatcher delivers auction.won events and creates notifications idempotently', async () => {
    // Drain earlier outbox events so batchSize=10 claims this auction's event deterministically
    while ((await processOutboxBatch(50)) > 0) {
      // flush backlog from earlier tests in suite
    }

    const auction = await createAuctionWithBids({
      currentPrice: 250000,
      reservePrice: 200000,
      highestBidderId: buyer1._id,
      bidCount: 1,
    });

    await closeAuction(auction._id.toString());

    // Dispatch outbox
    const processed = await processOutboxBatch(10);
    expect(processed).toBeGreaterThanOrEqual(1);

    // Check notifications created for buyer (WON) and seller (SOLD)
    const wonNotif = await Notification.findOne({
      userId: buyer1._id,
      dedupeKey: `won_${auction._id.toString()}`,
    });
    expect(wonNotif).toBeDefined();
    expect(wonNotif?.type).toBe('WON');

    const soldNotif = await Notification.findOne({
      userId: seller._id,
      dedupeKey: `sold_${auction._id.toString()}`,
    });
    expect(soldNotif).toBeDefined();
    expect(soldNotif?.type).toBe('SOLD');

    // Running dispatcher again changes nothing (idempotent)
    const secondPass = await processOutboxBatch(10);
    expect(secondPass).toBe(0);
  });
});
