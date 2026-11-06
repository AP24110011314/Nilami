import { env } from '../../../config/env.js';
import type {
  IPaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  CreateSetupSessionParams,
  SetupSessionResult,
} from './payment-provider.interface.js';

export class MockPaymentProvider implements IPaymentProvider {
  public async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    const sessionId = `mock_cs_${params.paymentId}_${Date.now()}`;
    return {
      sessionId,
      checkoutUrl: `${env.CLIENT_URL}/payments/success?auction=${params.auctionId}&mock=true`,
    };
  }

  public async createSetupSession(
    _params: CreateSetupSessionParams,
  ): Promise<SetupSessionResult> {
    const sessionId = `mock_setup_${Date.now()}`;
    return {
      sessionId,
      setupUrl: `${env.CLIENT_URL}/settings/payments?setup=success&mock=true`,
    };
  }
}

