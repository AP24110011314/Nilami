import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type NotificationType =
  | 'OUTBID'
  | 'WON'
  | 'LOST'
  | 'PAYMENT_DUE'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED'
  | 'AUCTION_ENDING'
  | 'AUCTION_EXTENDED'
  | 'SOLD'
  | 'UNSOLD'
  | 'WATCH_REMINDER'
  | 'FRAUD_ALERT'
  | 'REVIEW_RECEIVED';

export interface INotification {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    auctionId?: mongoose.Types.ObjectId;
    bidId?: mongoose.Types.ObjectId;
    paymentId?: mongoose.Types.ObjectId;
  };
  dedupeKey?: string | null;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = Document<unknown, object, INotification> &
  INotification & {
    _id: mongoose.Types.ObjectId;
  };

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    data: {
      auctionId: { type: Schema.Types.ObjectId, ref: 'Auction' },
      bidId: { type: Schema.Types.ObjectId, ref: 'Bid' },
      paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    },
    dedupeKey: {
      type: String,
      sparse: true,
      unique: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });

export const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  notificationSchema,
);

