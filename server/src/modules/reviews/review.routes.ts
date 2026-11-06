import { Router } from 'express';
import { ReviewController } from './review.controller.js';
import { requireAuth, requireVerified } from '../../middleware/auth.js';

export const reviewRouter = Router();

// Submit review for an auction
reviewRouter.post('/auctions/:id/review', requireAuth, requireVerified, ReviewController.create);

// Get reviews and reputation for a seller
reviewRouter.get('/users/:id/reviews', ReviewController.getSellerReviews);
reviewRouter.get('/users/:id/reputation', ReviewController.getSellerReputation);
