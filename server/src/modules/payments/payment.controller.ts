import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PaymentService } from './payment.service.js';
import { Payment } from './payment.model.js';
import { StripeEvent } from './stripe-event.model.js';
import { getStripe } from '../../config/stripe.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { BadRequestError, NotFoundError } from '../../lib/errors.js';
import {
  getRazorpayCredentials,
  verifyRazorpaySignature,
} from './providers/razorpay.provider.js';

const razorpayVerifySchema = z.object({
  paymentId: z.string().min(1).optional(),
  razorpay_payment_id: z.string().min(1),
  razorpay_payment_link_id: z.string().min(1).optional(),
  razorpay_payment_link_reference_id: z.string().optional(),
  razorpay_payment_link_status: z.string().optional(),
  razorpay_order_id: z.string().min(1).optional(),
  razorpay_signature: z.string().min(1),
});

export class PaymentController {
  public static async createCheckoutSession(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const auctionId = String(req.params.auctionId);
      const userId = req.user!.id;

      if (!auctionId || auctionId === 'undefined') {
        throw new BadRequestError('Auction ID is required');
      }

      const result = await PaymentService.createCheckoutSession(userId, auctionId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getPaymentStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const auctionId = String(req.params.auctionId);
      const userId = req.user?.id || '';

      if (!auctionId || auctionId === 'undefined') {
        throw new BadRequestError('Auction ID is required');
      }

      const result = await PaymentService.getPaymentStatus(auctionId, userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async mockComplete(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const auctionId = String(req.params.auctionId);
      const userId = req.user!.id;

      if (!auctionId || auctionId === 'undefined') {
        throw new BadRequestError('Auction ID is required');
      }

      const result = await PaymentService.mockCompletePayment(auctionId, userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async handleWebhook(
    req: Request,
    res: Response,
  ): Promise<void> {
    const sig = req.headers['stripe-signature'];

    if (!sig || typeof sig !== 'string') {
      logger.warn('Stripe webhook request missing stripe-signature header');
      res.status(400).send('Missing stripe-signature header');
      return;
    }

    const stripe = getStripe();
    let event;

    try {
      // req.body is raw buffer since express.raw({ type: 'application/json' }) is used
      event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      logger.error({ err }, 'Stripe webhook signature verification failed');
      res.status(400).send(`Webhook signature verification failed: ${(err as Error).message}`);
      return;
    }

    // Insert-first idempotency: if duplicate key, already handled
    try {
      await StripeEvent.create({
        eventId: event.id,
        type: event.type,
        status: 'processing',
        receivedAt: new Date(),
      });
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        logger.info({ eventId: event.id }, 'Stripe event already handled (duplicate key)');
        res.status(200).json({ received: true, duplicate: true });
        return;
      }
      logger.error({ err, eventId: event.id }, 'Error recording Stripe event in database');
      res.status(500).send('Database error recording event');
      return;
    }

    try {
      await PaymentService.handleWebhookEvent(event);

      await StripeEvent.updateOne(
        { eventId: event.id },
        {
          $set: {
            status: 'done',
            processedAt: new Date(),
          },
        },
      );

      res.status(200).json({ received: true });
    } catch (err) {
      logger.error({ err, eventId: event.id }, 'Error processing Stripe webhook event');

      await StripeEvent.updateOne(
        { eventId: event.id },
        {
          $set: {
            status: 'failed',
            error: (err as Error).message,
          },
        },
      );

      res.status(500).send('Error processing event');
    }
  }

  public static async handleRazorpayWebhook(
    req: Request,
    res: Response,
  ): Promise<void> {
    const sig = req.headers['x-razorpay-signature'];
    if (!sig || typeof sig !== 'string') {
      logger.warn('Razorpay webhook request missing x-razorpay-signature header');
      res.status(400).send('Missing x-razorpay-signature header');
      return;
    }

    const { webhookSecret } = getRazorpayCredentials();
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body || {}), 'utf8');

    if (!verifyRazorpaySignature(rawBody, sig, webhookSecret)) {
      logger.error('Razorpay webhook signature verification failed');
      res.status(400).send('Invalid Razorpay webhook signature');
      return;
    }

    let parsed: { event?: string; payload?: Record<string, unknown> };
    try {
      parsed = JSON.parse(rawBody.toString('utf8')) as typeof parsed;
    } catch {
      res.status(400).send('Invalid JSON payload');
      return;
    }

    const headerEventId = req.headers['x-razorpay-event-id'];
    const eventId =
      typeof headerEventId === 'string' && headerEventId
        ? `rzp_${headerEventId}`
        : `rzp_${crypto.createHash('sha256').update(rawBody).digest('hex').slice(0, 32)}`;

    try {
      await StripeEvent.create({
        eventId,
        type: parsed.event || 'razorpay.event',
        status: 'processing',
        receivedAt: new Date(),
      });
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }
      logger.error({ err, eventId }, 'Error recording Razorpay event in database');
      res.status(500).send('Database error recording event');
      return;
    }

    try {
      await PaymentService.handleRazorpayWebhookEvent(parsed);
      await StripeEvent.updateOne(
        { eventId },
        { $set: { status: 'done', processedAt: new Date() } },
      );
      res.status(200).json({ received: true });
    } catch (err) {
      logger.error({ err, eventId }, 'Error processing Razorpay webhook event');
      await StripeEvent.updateOne(
        { eventId },
        { $set: { status: 'failed', error: (err as Error).message } },
      );
      res.status(500).send('Error processing Razorpay event');
    }
  }

  public static async verifyRazorpayCallback(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const auctionId = String(req.params.auctionId);
      const userId = req.user!.id;
      const body = razorpayVerifySchema.parse(req.body);
      const { keySecret } = getRazorpayCredentials();

      const payment = await Payment.findOne({ auctionId, buyerId: userId });
      if (!payment) {
        throw new NotFoundError('Payment record not found for buyer');
      }

      const signedPayload = body.razorpay_order_id
        ? `${body.razorpay_order_id}|${body.razorpay_payment_id}`
        : `${body.razorpay_payment_link_id || ''}|${body.razorpay_payment_link_reference_id || ''}|${body.razorpay_payment_link_status || ''}|${body.razorpay_payment_id}`;

      if (!verifyRazorpaySignature(signedPayload, body.razorpay_signature, keySecret)) {
        throw new BadRequestError('Invalid Razorpay signature', 'INVALID_PAYMENT_SIGNATURE');
      }

      await PaymentService.markPaymentSucceeded(payment._id.toString(), {
        stripeCheckoutSessionId: body.razorpay_payment_link_id || body.razorpay_order_id,
        stripePaymentIntentId: body.razorpay_payment_id,
      });

      res.status(200).json({ ok: true, status: 'succeeded' });
    } catch (err) {
      next(err);
    }
  }
}
