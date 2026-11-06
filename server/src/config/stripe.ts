import Stripe from 'stripe';
import { env } from './env.js';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return stripeClient;
}

