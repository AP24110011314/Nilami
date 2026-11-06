import type { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service.js';
import { StripeEvent } from './stripe-event.model.js';
import { getStripe } from '../../config/stripe.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { BadRequestError } from '../../lib/errors.js';

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
}
