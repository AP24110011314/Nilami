import mongoose from 'mongoose';
import type Stripe from 'stripe';
import { Payment, type PaymentDocument } from './payment.model.js';
import { Auction } from '../auctions/auction.model.js';
import { User } from '../users/user.model.js';
import { Outbox } from '../outbox/outbox.model.js';
import { Notification } from '../notifications/notification.model.js';
import { StripePaymentProvider } from './providers/stripe.provider.js';
import { MockPaymentProvider } from './providers/mock.provider.js';
import type { IPaymentProvider } from './providers/payment-provider.interface.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '../../lib/errors.js';
import { emitPaymentSuccess } from '../../realtime/events.js';

function getPaymentProvider(): IPaymentProvider {
  return env.PAYMENT_PROVIDER === 'stripe' ? new StripePaymentProvider() : new MockPaymentProvider();
}

export class PaymentService {
  public static async createCheckoutSession(
    userId: string,
    auctionId: string,
  ): Promise<{ checkoutUrl: string; sessionId: string }> {
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    if (auction.status !== 'payment_pending') {
      throw new ConflictError('Auction is not in payment pending state');
    }

    if (!auction.winnerId || auction.winnerId.toString() !== userId) {
      throw new ForbiddenError('Only the winning bidder can checkout for this auction');
    }

    const payment = await Payment.findOne({ auctionId: auction._id });
    if (!payment) {
      throw new NotFoundError('Payment order not found for this auction');
    }

    if (payment.status === 'succeeded') {
      throw new ConflictError('Payment for this auction has already succeeded');
    }

    const buyer = await User.findById(userId);
    if (!buyer) {
      throw new NotFoundError('Buyer user not found');
    }

    const provider = getPaymentProvider();
    const result = await provider.createCheckoutSession({
      auctionId: auction._id.toString(),
      paymentId: payment._id.toString(),
      title: auction.title,
      amount: payment.amount,
      buyerId: buyer._id.toString(),
      buyerEmail: buyer.email,
      buyerName: buyer.name,
      attemptsCount: payment.attempts.length,
    });

    // Record checkout initiation attempt and session ID
    await Payment.updateOne(
      { _id: payment._id },
      {
        $set: {
          stripeCheckoutSessionId: result.sessionId,
        },
        $push: {
          attempts: {
            at: new Date(),
            method: 'checkout',
            outcome: 'requires_action',
          },
        },
      },
    );

    return result;
  }

  public static async getPaymentStatus(
    auctionId: string,
    userId: string,
  ): Promise<{
    status: string;
    amount: number;
    paidAt?: Date | null;
    auctionStatus: string;
    isWinner: boolean;
  }> {
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    const payment = await Payment.findOne({ auctionId: auction._id });
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    const isWinner = Boolean(auction.winnerId && auction.winnerId.toString() === userId);

    return {
      status: payment.status,
      amount: payment.amount,
      paidAt: payment.paidAt,
      auctionStatus: auction.status,
      isWinner,
    };
  }

  public static async mockCompletePayment(
    auctionId: string,
    userId: string,
  ): Promise<{ ok: boolean; message: string }> {
    const auction = await Auction.findById(auctionId);
    if (!auction) throw new NotFoundError('Auction not found');

    if (!auction.winnerId || auction.winnerId.toString() !== userId) {
      throw new ForbiddenError('Only the winning bidder can complete payment');
    }

    const payment = await Payment.findOne({ auctionId: auction._id });
    if (!payment) throw new NotFoundError('Payment row not found');

    await this.markPaymentSucceeded(payment._id.toString(), {
      stripeCheckoutSessionId: `mock_cs_${Date.now()}`,
    });

    return { ok: true, message: 'Payment completed successfully (mock mode)' };
  }

  public static async markPaymentSucceeded(
    paymentId: string,
    metadata: {
      stripeCheckoutSessionId?: string;
      stripePaymentIntentId?: string;
    } = {},
  ): Promise<void> {
    const session = await mongoose.startSession();
    let paymentDoc: PaymentDocument | null = null;

    try {
      await session.withTransaction(async () => {
        const payment = await Payment.findById(paymentId).session(session);
        if (!payment) return;

        // Idempotency guard: if already succeeded, do nothing
        if (payment.status === 'succeeded') {
          paymentDoc = payment;
          return;
        }

        const now = new Date();

        const updateData: Record<string, unknown> = {
          status: 'succeeded',
          paidAt: now,
        };

        if (metadata.stripeCheckoutSessionId) {
          updateData.stripeCheckoutSessionId = metadata.stripeCheckoutSessionId;
        }
        if (metadata.stripePaymentIntentId) {
          updateData.stripePaymentIntentId = metadata.stripePaymentIntentId;
        }

        const upd = await Payment.updateOne(
          { _id: payment._id, status: { $ne: 'succeeded' } },
          {
            $set: updateData,
            $push: {
              attempts: {
                at: now,
                method: 'checkout',
                outcome: 'succeeded',
              },
            },
          },
          { session },
        );

        if (upd.modifiedCount === 1) {
          // Transition auction state
          await Auction.updateOne(
            { _id: payment.auctionId, status: 'payment_pending' },
            { $set: { status: 'completed' }, $inc: { version: 1 } },
            { session },
          );

          // Update buyer and seller statistics
          await User.updateOne(
            { _id: payment.buyerId },
            { $inc: { 'stats.auctionsWon': 1 } },
            { session },
          );

          await User.updateOne(
            { _id: payment.sellerId },
            { $inc: { 'stats.auctionsSold': 1 } },
            { session },
          );

          // Outbox event
          await Outbox.create(
            [
              {
                type: 'payment.succeeded',
                payload: {
                  paymentId: payment._id.toString(),
                  auctionId: payment.auctionId.toString(),
                },
                status: 'pending',
                availableAt: now,
              },
            ],
            { session },
          );

          paymentDoc = payment;
        }
      });
    } finally {
      await session.endSession();
    }

    if (paymentDoc) {
      const p = paymentDoc as PaymentDocument;
      emitPaymentSuccess(p.buyerId.toString(), {
        auctionId: p.auctionId.toString(),
        paymentId: p._id.toString(),
        serverTime: new Date().toISOString(),
      });
      emitPaymentSuccess(p.sellerId.toString(), {
        auctionId: p.auctionId.toString(),
        paymentId: p._id.toString(),
        serverTime: new Date().toISOString(),
      });
    }
  }

  public static async markPaymentFailed(
    paymentId: string,
    errorCode = 'PAYMENT_FAILED',
  ): Promise<void> {
    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status === 'succeeded') {
      return; // Do not downgrade if already succeeded
    }

    await Payment.updateOne(
      { _id: payment._id, status: { $ne: 'succeeded' } },
      {
        $set: { status: 'failed' },
        $push: {
          attempts: {
            at: new Date(),
            method: 'checkout',
            outcome: 'failed',
            errorCode,
          },
        },
      },
    );

    // Fallback notification to winner
    await Notification.create({
      userId: payment.buyerId,
      type: 'PAYMENT_FAILED',
      title: 'Payment failed — action required',
      body: 'Your payment attempt was declined. Please try again with another card.',
      data: { auctionId: payment.auctionId, paymentId: payment._id },
      dedupeKey: `payfail_${payment._id}_${payment.attempts.length}`,
    });
  }

  public static async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    logger.info({ eventId: event.id, type: event.type }, 'Handling Stripe webhook event');

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'payment') {
          if (session.payment_status === 'paid') {
            const paymentId = session.metadata?.paymentId;
            if (!paymentId) {
              logger.warn({ session: session.id }, 'Checkout session completed without paymentId metadata');
              return;
            }

            const payment = await Payment.findById(paymentId);
            if (!payment) {
              logger.error({ paymentId }, 'Payment referenced in webhook metadata not found');
              return;
            }

            // Verify amount
            if (session.amount_total !== null && session.amount_total !== payment.amount) {
              logger.error(
                { expected: payment.amount, received: session.amount_total },
                'SECURITY ALERT: Webhook amount mismatch',
              );
              throw new BadRequestError('Payment amount mismatch');
            }

            await this.markPaymentSucceeded(paymentId, {
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId:
                typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
            });
          }
        }
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentId = session.metadata?.paymentId;
        if (paymentId) {
          await this.markPaymentSucceeded(paymentId, {
            stripeCheckoutSessionId: session.id,
          });
        }
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentId = session.metadata?.paymentId;
        if (paymentId) {
          await this.markPaymentFailed(paymentId, 'ASYNC_PAYMENT_FAILED');
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const paymentId = pi.metadata?.paymentId;
        if (paymentId) {
          const payment = await Payment.findById(paymentId);
          if (payment) {
            // Verify amount & currency
            if (pi.amount_received !== payment.amount || pi.currency.toLowerCase() !== 'inr') {
              logger.error(
                { expected: payment.amount, received: pi.amount_received, currency: pi.currency },
                'SECURITY ALERT: PaymentIntent amount or currency mismatch',
              );
              throw new BadRequestError('PaymentIntent amount/currency mismatch');
            }

            await this.markPaymentSucceeded(paymentId, {
              stripePaymentIntentId: pi.id,
            });
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const paymentId = pi.metadata?.paymentId;
        if (paymentId) {
          await this.markPaymentFailed(paymentId, pi.last_payment_error?.code || 'CARD_DECLINED');
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : undefined;
        if (paymentIntentId) {
          await Payment.updateOne(
            { stripePaymentIntentId: paymentIntentId },
            {
              $set: {
                status: 'refunded',
                refundedAmount: charge.amount_refunded,
              },
            },
          );
        }
        break;
      }

      default:
        logger.debug({ type: event.type }, 'Unhandled Stripe event type');
    }
  }
}
