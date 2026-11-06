import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type UserRole = 'buyer' | 'seller' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  roles: UserRole[];
  emailVerifiedAt?: Date | null;
  status: UserStatus;
  stripeCustomerId?: string | null;
  defaultPaymentMethodId?: string | null;
  offSessionConsent?: {
    at: Date;
    ip: string;
    textVersion: string;
  } | null;
  ratingAvg: number;
  ratingCount: number;
  stats: {
    bidsPlaced: number;
    auctionsWon: number;
    auctionsSold: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = Document<unknown, object, IUser> &
  IUser & {
    _id: mongoose.Types.ObjectId;
  };

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    roles: {
      type: [String],
      enum: ['buyer', 'seller', 'admin'],
      default: ['buyer'],
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    defaultPaymentMethodId: {
      type: String,
      default: null,
    },
    offSessionConsent: {
      at: { type: Date },
      ip: { type: String },
      textVersion: { type: String },
    },
    ratingAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    stats: {
      bidsPlaced: { type: Number, default: 0 },
      auctionsWon: { type: Number, default: 0 },
      auctionsSold: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  },
);

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

