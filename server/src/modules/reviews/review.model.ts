import mongoose, { Schema, type Document } from 'mongoose';

export interface IReview {
  auctionId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  rating: number; // 1 to 5 integer
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDocument = Document<unknown, object, IReview> &
  IReview & {
    _id: mongoose.Types.ObjectId;
  };

const reviewSchema = new Schema<IReview>(
  {
    auctionId: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5',
      },
    },
    comment: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// One review per auction per reviewer
reviewSchema.index({ auctionId: 1, reviewerId: 1 }, { unique: true });
reviewSchema.index({ sellerId: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', reviewSchema);
