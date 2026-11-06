export interface CreateCheckoutSessionParams {
  auctionId: string;
  paymentId: string;
  title: string;
  amount: number; // in integer paise
  buyerId: string;
  buyerEmail: string;
  buyerName?: string;
  attemptsCount: number;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
}

export interface CreateSetupSessionParams {
  userId: string;
  email: string;
  name?: string;
}

export interface SetupSessionResult {
  sessionId: string;
  setupUrl: string;
}

export interface IPaymentProvider {
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult>;
  createSetupSession(params: CreateSetupSessionParams): Promise<SetupSessionResult>;
}

