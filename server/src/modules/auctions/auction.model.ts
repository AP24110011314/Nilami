import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type AuctionCategory =
  | 'electronics'
  | 'watches'
  | 'fashion'
  | 'art'
  | 'collectibles'
  | 'books'
  | 'furniture'
  | 'vehicles'
  | 'musical'
  | 'appliances'
  | 'sports'
  | 'other';

export type AuctionCondition = 'new' | 'like_new' | 'used_good' | 'used_fair';

export type AuctionStatus =
  | 'scheduled'
  | 'active'
  | 'payment_pending'
  | 'completed'
  | 'payment_failed'
  | 'unsold'
  | 'cancelled';

export interface AuctionImage {
  url: string;
  publicId?: string;
}

export interface AntiSnipeConfig {
  enabled: boolean;
  windowMs: number;
  extendMs: number;
  maxExtensions: number;
}

export interface IAuction {
  sellerId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: AuctionCategory;
  condition: AuctionCondition;
  images: AuctionImage[];
  currency: 'INR';
  startingPrice: number; // in paise
  reservePrice?: number | null; // in paise (never expose publicly)
  minIncrement: number; // in paise
  currentPrice: number; // in paise
  minNextBid: number; // in paise
  highestBidderId?: mongoose.Types.ObjectId | null;
  outbidUserId?: mongoose.Types.ObjectId | null;
  bidCount: number;
  startsAt: Date;
  endsAt: Date;
  originalEndsAt: Date;
  extensionCount: number;
  antiSnipe: AntiSnipeConfig;
  status: AuctionStatus;
  closedAt?: Date | null;
  winnerId?: mongoose.Types.ObjectId | null;
  finalPrice?: number | null;
  paymentDueAt?: Date | null;
  watchCount: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type AuctionDocument = Document<unknown, object, IAuction> &
  IAuction & {
    _id: mongoose.Types.ObjectId;
  };

const auctionSchema = new Schema<IAuction>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      enum: [
        'electronics',
        'watches',
        'fashion',
        'art',
        'collectibles',
        'books',
        'furniture',
        'vehicles',
        'musical',
        'appliances',
        'sports',
        'other',
      ],
      required: true,
    },
    condition: {
      type: String,
      enum: ['new', 'like_new', 'used_good', 'used_fair'],
      required: true,
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String },
        },
      ],
      validate: [
        (val: AuctionImage[]) => val.length >= 1 && val.length <= 6,
        'Auction must have between 1 and 6 images',
      ],
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
      immutable: true,
    },
    startingPrice: {
      type: Number,
      required: true,
      min: 100, // min 100 paise (₹1)
      validate: [Number.isSafeInteger, 'Starting price must be an integer paise'],
    },
    reservePrice: {
      type: Number,
      default: null,
      validate: [
        (val: number | null | undefined) =>
          val === null || val === undefined || Number.isSafeInteger(val),
        'Reserve price must be an integer paise or null',
      ],
    },
    minIncrement: {
      type: Number,
      required: true,
      min: 100, // min 100 paise (₹1)
      validate: [Number.isSafeInteger, 'Minimum increment must be an integer paise'],
    },
    currentPrice: {
      type: Number,
      required: true,
      validate: [Number.isSafeInteger, 'Current price must be an integer paise'],
    },
    minNextBid: {
      type: Number,
      required: true,
      validate: [Number.isSafeInteger, 'Next minimum bid must be an integer paise'],
    },
    highestBidderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    outbidUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    bidCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    originalEndsAt: {
      type: Date,
      required: true,
    },
    extensionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    antiSnipe: {
      enabled: { type: Boolean, default: true },
      windowMs: { type: Number, default: 10000 },
      extendMs: { type: Number, default: 30000 },
      maxExtensions: { type: Number, default: 20 },
    },
    status: {
      type: String,
      enum: [
        'scheduled',
        'active',
        'payment_pending',
        'completed',
        'payment_failed',
        'unsold',
        'cancelled',
      ],
      default: 'scheduled',
      index: true,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    winnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    finalPrice: {
      type: Number,
      default: null,
    },
    paymentDueAt: {
      type: Date,
      default: null,
    },
    watchCount: {
      type: Number,
      default: 0,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes specified in docs/DATABASE.md
auctionSchema.index({ status: 1, endsAt: 1 });
auctionSchema.index({ status: 1, startsAt: 1 });
auctionSchema.index({ sellerId: 1, createdAt: -1 });
auctionSchema.index({ category: 1, status: 1, endsAt: 1 });
auctionSchema.index({ title: 'text', description: 'text' });
auctionSchema.index({ highestBidderId: 1, status: 1 });
auctionSchema.index({ winnerId: 1 });

export const Auction: Model<IAuction> = mongoose.model<IAuction>('Auction', auctionSchema);

