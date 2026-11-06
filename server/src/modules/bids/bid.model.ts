import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IBid {
  auctionId: mongoose.Types.ObjectId;
  bidderId: mongoose.Types.ObjectId;
  amount: number; // in integer paise
  idempotencyKey: string;
  extended: boolean;
  ip: string;
  userAgentHash: string;
  createdAt: Date;
}

export type BidDocument = Document<unknown, object, IBid> &
  IBid & {
    _id: mongoose.Types.ObjectId;
  };

const bidSchema = new Schema<IBid>(
  {
    auctionId: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      index: true,
    },
    bidderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: [Number.isSafeInteger, 'Bid amount must be an integer paise'],
    },
    idempotencyKey: {
      type: String,
      required: true,
    },
    extended: {
      type: Boolean,
      default: false,
    },
    ip: {
      type: String,
      required: true,
    },
    userAgentHash: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// DB-level invariants from docs/DATABASE.md & docs/BIDDING_ENGINE.md
bidSchema.index({ auctionId: 1, amount: -1 }, { unique: true });
bidSchema.index({ bidderId: 1, idempotencyKey: 1 }, { unique: true });
bidSchema.index({ auctionId: 1, createdAt: -1 });
bidSchema.index({ bidderId: 1, createdAt: -1 });

export const Bid: Model<IBid> = mongoose.model<IBid>('Bid', bidSchema);

