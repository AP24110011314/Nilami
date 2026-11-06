import mongoose, { Schema, type Document } from 'mongoose';

export type FraudRuleType =
  | 'SELLER_LINKED_BIDDER'
  | 'SHILL_PATTERN'
  | 'BID_BURST'
  | 'PING_PONG'
  | 'LAST_SECOND_SNIPER'
  | 'PAYMENT_ABANDONER'
  | 'MULTI_ACCOUNT_IP'
  | 'NEW_ACCOUNT_HIGH_BID';

export type FraudFlagStatus = 'open' | 'dismissed' | 'confirmed';

export interface IFraudFlag {
  type: FraudRuleType;
  score: number;
  subjectUserId: mongoose.Types.ObjectId;
  auctionId?: mongoose.Types.ObjectId;
  bidIds: mongoose.Types.ObjectId[];
  evidence: Record<string, unknown>;
  status: FraudFlagStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  appealNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type FraudFlagDocument = Document<unknown, object, IFraudFlag> &
  IFraudFlag & {
    _id: mongoose.Types.ObjectId;
  };

const fraudFlagSchema = new Schema<IFraudFlag>(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'SELLER_LINKED_BIDDER',
        'SHILL_PATTERN',
        'BID_BURST',
        'PING_PONG',
        'LAST_SECOND_SNIPER',
        'PAYMENT_ABANDONER',
        'MULTI_ACCOUNT_IP',
        'NEW_ACCOUNT_HIGH_BID',
      ],
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    subjectUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    auctionId: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
    },
    bidIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Bid',
      },
    ],
    evidence: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['open', 'dismissed', 'confirmed'],
      default: 'open',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    appealNote: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes specified in DATABASE.md
fraudFlagSchema.index({ status: 1, score: -1 });
fraudFlagSchema.index({ subjectUserId: 1, auctionId: 1 });
fraudFlagSchema.index({ auctionId: 1 });

export const FraudFlag = mongoose.model<IFraudFlag>('FraudFlag', fraudFlagSchema);
