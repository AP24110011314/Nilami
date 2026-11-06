import mongoose, { Schema, type Document } from 'mongoose';

export type AdminAction =
  | 'SUSPEND_USER'
  | 'ACTIVATE_USER'
  | 'CANCEL_AUCTION'
  | 'REVIEW_FRAUD_FLAG'
  | 'REFUND_PAYMENT';

export interface IAuditLog {
  adminId: mongoose.Types.ObjectId;
  action: AdminAction;
  targetType: 'user' | 'auction' | 'fraud_flag' | 'payment';
  targetId: mongoose.Types.ObjectId;
  details: Record<string, unknown>;
  ip: string;
  createdAt: Date;
}

export type AuditLogDocument = Document<unknown, object, IAuditLog> &
  IAuditLog & {
    _id: mongoose.Types.ObjectId;
  };

const auditLogSchema = new Schema<IAuditLog>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'SUSPEND_USER',
        'ACTIVATE_USER',
        'CANCEL_AUCTION',
        'REVIEW_FRAUD_FLAG',
        'REFUND_PAYMENT',
      ],
    },
    targetType: {
      type: String,
      required: true,
      enum: ['user', 'auction', 'fraud_flag', 'payment'],
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: '127.0.0.1',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

