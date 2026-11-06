import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type OutboxStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface IOutbox {
  type: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  attempts: number;
  availableAt: Date;
  lockedUntil?: Date | null;
  lastError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type OutboxDocument = Document<unknown, object, IOutbox> &
  IOutbox & {
    _id: mongoose.Types.ObjectId;
  };

const OutboxSchema = new Schema<IOutbox>(
  {
    type: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'done', 'failed'],
      default: 'pending',
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    availableAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

OutboxSchema.index({ status: 1, availableAt: 1 });
OutboxSchema.index({ status: 1, lockedUntil: 1 });

export const Outbox: Model<IOutbox> =
  mongoose.models.Outbox || mongoose.model<IOutbox>('Outbox', OutboxSchema);
