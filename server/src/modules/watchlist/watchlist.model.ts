import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IWatchlist {
  userId: mongoose.Types.ObjectId;
  auctionId: mongoose.Types.ObjectId;
  remindMinutesBefore: number;
  remindedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type WatchlistDocument = Document<unknown, object, IWatchlist> &
  IWatchlist & {
    _id: mongoose.Types.ObjectId;
  };

const WatchlistSchema = new Schema<IWatchlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    auctionId: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
    },
    remindMinutesBefore: {
      type: Number,
      default: 15,
      min: 1,
      max: 1440,
    },
    remindedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

WatchlistSchema.index({ userId: 1, auctionId: 1 }, { unique: true });
WatchlistSchema.index({ auctionId: 1 });

export const Watchlist: Model<IWatchlist> =
  mongoose.models.Watchlist ||
  mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);
