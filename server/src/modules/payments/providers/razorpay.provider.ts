import crypto from 'node:crypto';
import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';
import type {
  IPaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  CreateSetupSessionParams,
  SetupSessionResult,
} from './payment-provider.interface.js';

interface RazorpayPaymentLinkResponse {
  id: string;
  short_url: string;
  status: string;
}

export function getRazorpayCredentials(): {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
} {
  const keyId = env.RAZORPAY_KEY_ID.trim();
  const keySecret = (
    env.RAZORPAY_KEY_SECRET ||
    (env.PAYMENT_PROVIDER === 'razorpay' ? env.STRIPE_SECRET_KEY : '')
  ).trim();
  const webhookSecret = (
    env.RAZORPAY_WEBHOOK_SECRET ||
    (env.PAYMENT_PROVIDER === 'razorpay' ? env.STRIPE_WEBHOOK_SECRET : '')
  ).trim();

  return { keyId, keySecret, webhookSecret };
}

export function verifyRazorpaySignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const sigBuf = Buffer.from(signature.trim(), 'utf8');
  if (expectedBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, sigBuf);
}

export class RazorpayPaymentProvider implements IPaymentProvider {
  public async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    const { keyId, keySecret } = getRazorpayCredentials();

    if (!keyId || !keySecret || keyId === 'rzp_test_xxx') {
      if (env.NODE_ENV === 'production') {
        throw new Error('Razorpay payment provider requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
      }
      logger.warn(
        { paymentId: params.paymentId },
        'RAZORPAY_KEY_ID is not configured; falling back to sandbox payment confirmation flow in non-production',
      );
      return {
        sessionId: `rzp_sandbox_${params.paymentId}_${Date.now()}`,
        checkoutUrl: `${env.CLIENT_URL}/payments/success?auction=${params.auctionId}&provider=razorpay&mock=true`,
      };
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amount, // integer paise
        currency: env.CURRENCY || 'INR',
        description: `Nilami Auction Lot: ${params.title}`,
        reference_id: `${params.paymentId}_${params.attemptsCount}`,
        customer: {
          name: params.buyerName || 'Nilami Buyer',
          email: params.buyerEmail,
        },
        notify: {
          sms: false,
          email: false,
        },
        notes: {
          auctionId: params.auctionId,
          paymentId: params.paymentId,
          buyerId: params.buyerId,
        },
        callback_url: `${env.CLIENT_URL}/payments/success?auction=${params.auctionId}&provider=razorpay`,
        callback_method: 'get',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, body: errorText.slice(0, 300), paymentId: params.paymentId },
        'Razorpay payment link creation failed',
      );
      if (env.NODE_ENV !== 'production') {
        return {
          sessionId: `rzp_fallback_${params.paymentId}_${Date.now()}`,
          checkoutUrl: `${env.CLIENT_URL}/payments/success?auction=${params.auctionId}&provider=razorpay&mock=true`,
        };
      }
      throw new Error(`Razorpay checkout failed (${response.status})`);
    }

    const data = (await response.json()) as RazorpayPaymentLinkResponse;
    return {
      sessionId: data.id,
      checkoutUrl:
        data.short_url ||
        `${env.CLIENT_URL}/payments/success?auction=${params.auctionId}&provider=razorpay`,
    };
  }

  public async createSetupSession(
    params: CreateSetupSessionParams,
  ): Promise<SetupSessionResult> {
    return {
      sessionId: `rzp_setup_${params.userId}_${Date.now()}`,
      setupUrl: `${env.CLIENT_URL}/settings/payments?setup=success&provider=razorpay`,
    };
  }
}

