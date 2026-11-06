import mongoose from 'mongoose';
import { Review, type IReview } from './review.model.js';
import { Auction } from '../auctions/auction.model.js';
import { User } from '../users/user.model.js';
import { Payment } from '../payments/payment.model.js';
import { Notification } from '../notifications/notification.model.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '../../lib/errors.js';
import { emitNotification, maskName } from '../../realtime/events.js';

export interface CreateReviewParams {
  auctionId: string;
  reviewerId: string;
  rating: number;
  comment?: string;
}

export type SellerTier = 'New' | 'Seller' | 'Trusted' | 'Top Seller';

export interface SellerReputation {
  sellerId: string;
  name: string;
  ratingAvg: number;
  ratingCount: number;
  salesCount: number;
  tier: SellerTier;
  isVerifiedSeller: boolean;
}

export class ReviewService {
  /**
   * Submits a review after successful payment for an auction
   */
  public static async createReview(params: CreateReviewParams): Promise<IReview & { _id: mongoose.Types.ObjectId }> {
    const { auctionId, reviewerId, rating, comment } = params;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new ValidationError('Rating must be an integer between 1 and 5');
    }

    const auctionObjectId = new mongoose.Types.ObjectId(auctionId);
    const reviewerObjectId = new mongoose.Types.ObjectId(reviewerId);

    const auction = await Auction.findById(auctionObjectId);
    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    // Only winner can review
    if (!auction.winnerId || !auction.winnerId.equals(reviewerObjectId)) {
      throw new ForbiddenError('Only the winning bidder can review this auction');
    }

    // Seller cannot review self
    if (auction.sellerId.equals(reviewerObjectId)) {
      throw new ForbiddenError('Sellers cannot review their own auctions');
    }

    // Verify payment succeeded
    const payment = await Payment.findOne({ auctionId: auctionObjectId });
    if (!payment || payment.status !== 'succeeded') {
      throw new ConflictError('A review can only be submitted after payment has succeeded', 'PAYMENT_REQUIRED');
    }

    // Check duplicate
    const existing = await Review.findOne({
      auctionId: auctionObjectId,
      reviewerId: reviewerObjectId,
    });
    if (existing) {
      throw new ConflictError('You have already reviewed this auction', 'ALREADY_REVIEWED');
    }

    const session = await mongoose.startSession();
    try {
      let createdReview: (IReview & { _id: mongoose.Types.ObjectId }) | null = null;

      await session.withTransaction(async () => {
        const [newReview] = await Review.create(
          [
            {
              auctionId: auctionObjectId,
              reviewerId: reviewerObjectId,
              sellerId: auction.sellerId,
              rating,
              comment: comment?.trim(),
            },
          ],
          { session },
        );

        if (newReview) {
          createdReview = newReview.toObject() as IReview & { _id: mongoose.Types.ObjectId };
        }

        // Transactionally update seller rating aggregate:
        // ratingAvg = (ratingAvg * ratingCount + new) / (ratingCount + 1)
        const seller = await User.findById(auction.sellerId).session(session);
        if (seller) {
          const currentCount = seller.ratingCount || 0;
          const currentAvg = seller.ratingAvg || 0;
          const newCount = currentCount + 1;
          const newAvg = (currentAvg * currentCount + rating) / newCount;

          await User.updateOne(
            { _id: auction.sellerId },
            {
              $set: { ratingAvg: Math.round(newAvg * 10) / 10 },
              $inc: { ratingCount: 1 },
            },
            { session },
          );
        }

        // Create persistent notification for seller
        await Notification.create(
          [
            {
              userId: auction.sellerId,
              type: 'REVIEW_RECEIVED',
              title: 'New review received!',
              body: `A buyer gave you a ${rating}★ review for "${auction.title}".`,
              data: { auctionId: auction._id },
              dedupeKey: `review_${auction._id}`,
            },
          ],
          { session },
        );
      });

      // Emit socket notification to seller outside transaction
      if (createdReview) {
        emitNotification(auction.sellerId.toString(), {
          _id: (createdReview as { _id: mongoose.Types.ObjectId })._id.toString(),
          userId: auction.sellerId.toString(),
          type: 'REVIEW_RECEIVED',
          title: 'New review received!',
          message: `A buyer gave you a ${rating}★ review for "${auction.title}".`,
          data: { auctionId: auction._id.toString() },
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      return createdReview!;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Fetches paginated reviews for a seller
   */
  public static async getSellerReviews(
    sellerId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    reviews: Array<{
      id: string;
      auctionId: string;
      reviewerMasked: string;
      rating: number;
      comment?: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ sellerId: sellerObjectId })
        .populate('reviewerId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ sellerId: sellerObjectId }),
    ]);

    const formatted = reviews.map((r) => {
      const reviewerUser = r.reviewerId as unknown as { name?: string } | null;
      return {
        id: r._id.toString(),
        auctionId: r.auctionId.toString(),
        reviewerMasked: maskName(reviewerUser?.name),
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return {
      reviews: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Computes seller reputation tier and statistics
   */
  public static async getSellerReputation(sellerId: string): Promise<SellerReputation> {
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);
    const seller = await User.findById(sellerObjectId).lean();

    if (!seller) {
      throw new NotFoundError('Seller not found');
    }

    const salesCount = await Auction.countDocuments({
      sellerId: sellerObjectId,
      status: 'completed',
    });

    const ratingAvg = seller.ratingAvg || 0;
    const ratingCount = seller.ratingCount || 0;

    // Reputation tiers (docs/ADVANCED_FEATURES.md §5):
    // New (<3 sales)
    // Trusted (>=10 sales and >=4.5 avg)
    // Top Seller (>=50 sales and >=4.7 avg)
    let tier: SellerTier = 'Seller';
    if (salesCount < 3) {
      tier = 'New';
    } else if (salesCount >= 50 && ratingAvg >= 4.7) {
      tier = 'Top Seller';
    } else if (salesCount >= 10 && ratingAvg >= 4.5) {
      tier = 'Trusted';
    }

    return {
      sellerId,
      name: seller.name,
      ratingAvg,
      ratingCount,
      salesCount,
      tier,
      isVerifiedSeller: Boolean(seller.emailVerifiedAt && seller.roles.includes('seller')),
    };
  }
}
