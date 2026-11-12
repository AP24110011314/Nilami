import { Router } from 'express';
import { PaymentController } from './payment.controller.js';
import { requireAuth, requireVerified } from '../../middleware/auth.js';

export const paymentRouter = Router();

// Create checkout session for winning bidder
paymentRouter.post(
  '/checkout/:auctionId',
  requireAuth,
  requireVerified,
  PaymentController.createCheckoutSession,
);

// Poll payment status (for success redirect page)
paymentRouter.get(
  '/status/:auctionId',
  PaymentController.getPaymentStatus,
);

// Verify Razorpay callback signature
paymentRouter.post(
  '/razorpay/verify/:auctionId',
  requireAuth,
  PaymentController.verifyRazorpayCallback,
);

// Mock payment completion for tests and offline demos
paymentRouter.post(
  '/mock-complete/:auctionId',
  requireAuth,
  PaymentController.mockComplete,
);

export { PaymentController };

