import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type StripeEventStatus = 'processing' | 'done' | 'failed';

export interface IStripeEvent {
  eventId: string;
  type: string;
  status: StripeEventStatus;
  error?: string | null;
  receivedAt: Date;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type StripeEventDocument = Document<unknown, object, IStripeEvent> &
  IStripeEvent & {
    _id: mongoose.Types.ObjectId;
  };

const StripeEventSchema = new Schema<IStripeEvent>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['processing', 'done', 'failed'],
      default: 'processing',
      required: true,
      index: true,
    },
    error: {
      type: String,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const StripeEvent: Model<IStripeEvent> =
  mongoose.models.StripeEvent ||
  mongoose.model<IStripeEvent>('StripeEvent', StripeEventSchema);

