import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ReviewService } from './review.service.js';
import { ValidationError } from '../../lib/errors.js';

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export class ReviewController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid review submission', parsed.error.format());
      }

      const auctionId = String(req.params.id);
      const reviewerId = req.user!.id;

      const review = await ReviewService.createReview({
        auctionId,
        reviewerId,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      });

      res.status(201).json({ review });
    } catch (err) {
      next(err);
    }
  }

  public static async getSellerReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = String(req.params.id);
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));

      const data = await ReviewService.getSellerReviews(sellerId, page, limit);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  public static async getSellerReputation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = String(req.params.id);
      const data = await ReviewService.getSellerReputation(sellerId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
}
