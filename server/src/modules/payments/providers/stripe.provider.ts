import { getStripe } from '../../../config/stripe.js';
import { env } from '../../../config/env.js';
import type {
  IPaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  CreateSetupSessionParams,
  SetupSessionResult,
} from './payment-provider.interface.js';

export class StripePaymentProvider implements IPaymentProvider {
  public async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    const stripe = getStripe();

    // Ensure Stripe customer exists
    let customerId: string | undefined;
    const existing = await stripe.customers.list({ email: params.buyerEmail, limit: 1 });
    if (existing.data.length > 0 && existing.data[0]) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: params.buyerEmail,
        name: params.buyerName,
        metadata: { userId: params.buyerId },
      });
      customerId = customer.id;
    }

    // Create Checkout Session with INR paise unit_amount
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer: customerId,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'inr',
              unit_amount: params.amount, // In paise
              product_data: {
                name: params.title,
              },
            },
          },
        ],
        payment_intent_data: {
          metadata: {
            auctionId: params.auctionId,
            paymentId: params.paymentId,
          },
        },
        metadata: {
          auctionId: params.auctionId,
          paymentId: params.paymentId,
        },
        success_url: `${env.CLIENT_URL}/payments/success?auction=${params.auctionId}`,
        cancel_url: `${env.CLIENT_URL}/auctions/${params.auctionId}`,
      },
      {
        idempotencyKey: `checkout_${params.paymentId}_${params.attemptsCount}`,
      },
    );

    return {
      sessionId: session.id,
      checkoutUrl: session.url || `${env.CLIENT_URL}/payments/success?auction=${params.auctionId}`,
    };
  }

  public async createSetupSession(
    params: CreateSetupSessionParams,
  ): Promise<SetupSessionResult> {
    const stripe = getStripe();

    let customerId: string | undefined;
    const existing = await stripe.customers.list({ email: params.email, limit: 1 });
    if (existing.data.length > 0 && existing.data[0]) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: { userId: params.userId },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      success_url: `${env.CLIENT_URL}/settings/payments?setup=success`,
      cancel_url: `${env.CLIENT_URL}/settings/payments?setup=cancel`,
      metadata: { userId: params.userId },
    });

    return {
      sessionId: session.id,
      setupUrl: session.url || '',
    };
  }
}
