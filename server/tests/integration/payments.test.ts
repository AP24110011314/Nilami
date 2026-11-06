import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { getRedisClient, disconnectRedis } from '../../src/config/redis.js';
import { getStripe } from '../../src/config/stripe.js';
import { env } from '../../src/config/env.js';
import { User, type UserDocument } from '../../src/modules/users/user.model.js';
import { Auction, type AuctionDocument } from '../../src/modules/auctions/auction.model.js';
import { Payment, type PaymentDocument } from '../../src/modules/payments/payment.model.js';
import { Notification } from '../../src/modules/notifications/notification.model.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';
import { closeAllQueues } from '../../src/queues/queues.js';
import { runReconciliation } from '../../src/queues/reconciliation.service.js';

describe('Phase 6 — Payments Integration Suite (T16–T21)', () => {
  const app = createApp();
  const stripe = getStripe();

  let seller: UserDocument;
  let buyer1: UserDocument;
  let buyer1Token: string;
  let buyer2: UserDocument;
  let buyer2Token: string;

  beforeAll(async () => {
    await connectDB();
    getRedisClient();

    seller = (await User.create({
      name: 'Payments Seller',
      email: `seller_${crypto.randomUUID()}@payments.test.nilami.local`,
      passwordHash: 'dummy',
      roles: ['seller', 'buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as UserDocument;

    buyer1 = (await User.create({
      name: 'Payments Winner',
      email: `winner_${crypto.randomUUID()}@payments.test.nilami.local`,
      passwordHash: 'dummy',
      roles: ['buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as UserDocument;
    buyer1Token = generateAccessToken(buyer1);

    buyer2 = (await User.create({
      name: 'Payments Other Buyer',
      email: `other_${crypto.randomUUID()}@payments.test.nilami.local`,
      passwordHash: 'dummy',
      roles: ['buyer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    })) as UserDocument;
    buyer2Token = generateAccessToken(buyer2);
  });

  afterAll(async () => {
    await closeAllQueues();
    await User.deleteMany({ email: /@payments\.test\.nilami\.local$/ });
    await disconnectRedis();
    await disconnectDB();
  });

  async function createWonAuction(amount = 250000): Promise<{
    auction: AuctionDocument;
    payment: PaymentDocument;
  }> {
    const now = new Date();
    const auction = (await Auction.create({
      sellerId: seller._id,
      title: 'Payments Won Lot',
      description: 'Auction ready for payment testing',
      category: 'electronics',
      condition: 'new',
      images: [{ url: 'https://example.com/item.webp' }],
      currency: 'INR',
      startingPrice: 100000,
      reservePrice: 100000,
      minIncrement: 10000,
      currentPrice: amount,
      minNextBid: amount + 10000,
      highestBidderId: buyer1._id,
      winnerId: buyer1._id,
      finalPrice: amount,
      bidCount: 1,
      startsAt: new Date(now.getTime() - 3600000),
      endsAt: new Date(now.getTime() - 60000),
      originalEndsAt: new Date(now.getTime() - 60000),
      status: 'payment_pending',
      paymentDueAt: new Date(now.getTime() + 24 * 3600000),
      closedAt: now,
    })) as AuctionDocument;

    const payment = (await Payment.create({
      auctionId: auction._id,
      buyerId: buyer1._id,
      sellerId: seller._id,
      amount,
      currency: 'INR',
      status: 'pending',
      dueAt: auction.paymentDueAt!,
    })) as PaymentDocument;

    return { auction, payment };
  }

  function signPayload(payloadStr: string): string {
    return stripe.webhooks.generateTestHeaderString({
      payload: payloadStr,
      secret: env.STRIPE_WEBHOOK_SECRET,
    });
  }

  it('T16: duplicate Stripe webhook processed idempotently', async () => {
    const { auction, payment } = await createWonAuction(200000);
    const eventId = `evt_${crypto.randomUUID()}`;

    const payload = {
      id: eventId,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_test_${crypto.randomUUID()}`,
          mode: 'payment',
          payment_status: 'paid',
          amount_total: 200000,
          currency: 'inr',
          payment_intent: `pi_test_${crypto.randomUUID()}`,
          metadata: {
            auctionId: auction._id.toString(),
            paymentId: payment._id.toString(),
          },
        },
      },
    };

    const payloadStr = JSON.stringify(payload);
    const sig = signPayload(payloadStr);

    // First webhook call: must succeed
    const res1 = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', sig)
      .set('Content-Type', 'application/json')
      .send(payloadStr);

    expect(res1.status).toBe(200);

    const updatedPayment = await Payment.findById(payment._id);
    expect(updatedPayment?.status).toBe('succeeded');
    expect(updatedPayment?.paidAt).toBeDefined();

    const updatedAuction = await Auction.findById(auction._id);
    expect(updatedAuction?.status).toBe('completed');

    // Second webhook call with duplicate eventId: must return 200 and change nothing
    const res2 = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', sig)
      .set('Content-Type', 'application/json')
      .send(payloadStr);

    expect(res2.status).toBe(200);
    expect(res2.body.duplicate).toBe(true);

    // Verify still succeeded without corrupting state
    const postPayment = await Payment.findById(payment._id);
    expect(postPayment?.status).toBe('succeeded');
  });

  it('T17: webhook with bad signature returns 400 and causes no DB change', async () => {
    const { payment } = await createWonAuction(150000);
    const payloadStr = JSON.stringify({
      id: `evt_${crypto.randomUUID()}`,
      type: 'checkout.session.completed',
    });

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 't=12345,v1=invalid_signature_hash')
      .set('Content-Type', 'application/json')
      .send(payloadStr);

    expect(res.status).toBe(400);

    const unchanged = await Payment.findById(payment._id);
    expect(unchanged?.status).toBe('pending');
  });

  it('T18: payment_failed after succeeded (out of order) remains succeeded', async () => {
    const { payment } = await createWonAuction(180000);

    // Mark payment succeeded first
    payment.status = 'succeeded';
    payment.paidAt = new Date();
    await payment.save();

    const eventId = `evt_${crypto.randomUUID()}`;
    const payload = {
      id: eventId,
      object: 'event',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: `pi_test_${crypto.randomUUID()}`,
          metadata: {
            paymentId: payment._id.toString(),
          },
          last_payment_error: { code: 'card_declined' },
        },
      },
    };

    const payloadStr = JSON.stringify(payload);
    const sig = signPayload(payloadStr);

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', sig)
      .set('Content-Type', 'application/json')
      .send(payloadStr);

    expect(res.status).toBe(200);

    // Payment must remain succeeded
    const finalPayment = await Payment.findById(payment._id);
    expect(finalPayment?.status).toBe('succeeded');
  });

  it('T19: webhook amount mismatch is rejected and does not mark paid', async () => {
    const { payment } = await createWonAuction(200000); // Expects 200000 paise

    const eventId = `evt_${crypto.randomUUID()}`;
    const payload = {
      id: eventId,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_test_${crypto.randomUUID()}`,
          mode: 'payment',
          payment_status: 'paid',
          amount_total: 100000, // Mismatch: ₹1,000 instead of ₹2,000
          currency: 'inr',
          metadata: {
            paymentId: payment._id.toString(),
          },
        },
      },
    };

    const payloadStr = JSON.stringify(payload);
    const sig = signPayload(payloadStr);

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', sig)
      .set('Content-Type', 'application/json')
      .send(payloadStr);

    // Webhook should fail with 500 so Stripe retries or alerts
    expect(res.status).toBe(500);

    const fresh = await Payment.findById(payment._id);
    expect(fresh?.status).toBe('pending'); // Not marked paid
  });

  it('T20: auto-charge / checkout failure creates fallback PAYMENT_FAILED notification', async () => {
    const { auction, payment } = await createWonAuction(300000);

    const eventId = `evt_${crypto.randomUUID()}`;
    const payload = {
      id: eventId,
      object: 'event',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: `pi_test_${crypto.randomUUID()}`,
          metadata: {
            paymentId: payment._id.toString(),
          },
          last_payment_error: { code: 'authentication_required' },
        },
      },
    };

    const payloadStr = JSON.stringify(payload);
    const sig = signPayload(payloadStr);

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', sig)
      .set('Content-Type', 'application/json')
      .send(payloadStr);

    expect(res.status).toBe(200);

    const updatedPayment = await Payment.findById(payment._id);
    expect(updatedPayment?.status).toBe('failed');

    // Fallback notification created
    const notif = await Notification.findOne({
      userId: buyer1._id,
      type: 'PAYMENT_FAILED',
      'data.auctionId': auction._id,
    });
    expect(notif).toBeDefined();
  });

  it('T21: payment window expires: payment marked expired and auction payment_failed', async () => {
    const { auction, payment } = await createWonAuction(400000);

    // Backdate dueAt to simulate expiry
    const past = new Date(Date.now() - 3600000);
    auction.paymentDueAt = past;
    await auction.save();

    payment.dueAt = past;
    await payment.save();

    // Run reconciliation cycle
    const stats = await runReconciliation();
    expect(stats.expiredPaymentsCount).toBeGreaterThanOrEqual(1);

    const freshPayment = await Payment.findById(payment._id);
    expect(freshPayment?.status).toBe('expired');

    const freshAuction = await Auction.findById(auction._id);
    expect(freshAuction?.status).toBe('payment_failed');
  });

  it('Winner can initiate checkout session; non-winner gets 403', async () => {
    const { auction } = await createWonAuction(500000);
    const auctionId = auction._id.toString();

    // Non-winner (buyer2) attempts to checkout -> 403
    const forbiddenRes = await request(app)
      .post(`/api/payments/checkout/${auctionId}`)
      .set('Authorization', `Bearer ${buyer2Token}`);

    expect(forbiddenRes.status).toBe(403);

    // Spy on Stripe SDK to verify exact parameters passed to Stripe
    const sessionId = `cs_test_${crypto.randomUUID()}`;
    const listSpy = vi.spyOn(stripe.customers, 'list').mockResolvedValue({
      data: [{ id: 'cus_test123' }],
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    const createSessionSpy = vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({
      id: sessionId,
      url: `https://checkout.stripe.com/pay/${sessionId}`,
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    // Winner (buyer1) creates checkout session -> 200 with checkoutUrl
    const okRes = await request(app)
      .post(`/api/payments/checkout/${auctionId}`)
      .set('Authorization', `Bearer ${buyer1Token}`);

    expect(okRes.status).toBe(200);
    expect(okRes.body.checkoutUrl).toBe(`https://checkout.stripe.com/pay/${sessionId}`);
    expect(okRes.body.sessionId).toBe(sessionId);

    // Assert exact parameters passed to Stripe: integer paise, INR, metadata
    expect(createSessionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        customer: 'cus_test123',
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'inr',
              unit_amount: 500000, // strictly integer paise
            }),
          }),
        ],
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(/^checkout_/),
      }),
    );

    listSpy.mockRestore();
    createSessionSpy.mockRestore();
  });
});

