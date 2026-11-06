import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'expired'
  | 'refunded';

export type PaymentMethod = 'checkout' | 'off_session';

export interface PaymentAttempt {
  at: Date;
  method: PaymentMethod;
  outcome: 'succeeded' | 'failed' | 'requires_action';
  errorCode?: string;
}

export interface IPayment {
  auctionId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  amount: number; // in integer paise
  currency: 'INR';
  status: PaymentStatus;
  method?: PaymentMethod;
  stripeCustomerId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  attempts: PaymentAttempt[];
  dueAt: Date;
  paidAt?: Date | null;
  refundedAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentDocument = Document<unknown, object, IPayment> &
  IPayment & {
    _id: mongoose.Types.ObjectId;
  };

const PaymentAttemptSchema = new Schema<PaymentAttempt>(
  {
    at: { type: Date, required: true, default: Date.now },
    method: { type: String, enum: ['checkout', 'off_session'], required: true },
    outcome: { type: String, enum: ['succeeded', 'failed', 'requires_action'], required: true },
    errorCode: { type: String, required: false },
  },
  { _id: false },
);

const PaymentSchema = new Schema<IPayment>(
  {
    auctionId: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      unique: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v >= 0,
        message: 'Payment amount must be an integer (in paise)',
      },
    },
    currency: {
      type: String,
      enum: ['INR'],
      default: 'INR',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'succeeded', 'failed', 'expired', 'refunded'],
      default: 'pending',
      required: true,
      index: true,
    },
    method: {
      type: String,
      enum: ['checkout', 'off_session'],
      required: false,
    },
    stripeCustomerId: {
      type: String,
      required: false,
    },
    stripeCheckoutSessionId: {
      type: String,
      required: false,
      sparse: true,
      unique: true,
    },
    stripePaymentIntentId: {
      type: String,
      required: false,
      sparse: true,
      unique: true,
    },
    attempts: {
      type: [PaymentAttemptSchema],
      default: [],
    },
    dueAt: {
      type: Date,
      required: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    refundedAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

PaymentSchema.index({ status: 1, dueAt: 1 });
PaymentSchema.index({ buyerId: 1, createdAt: -1 });
PaymentSchema.index({ sellerId: 1, createdAt: -1 });

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

