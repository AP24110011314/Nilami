import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type AuthTokenType = 'email_verification' | 'password_reset';

export interface IAuthToken {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  type: AuthTokenType;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AuthTokenDocument = Document<unknown, object, IAuthToken> &
  IAuthToken & {
    _id: mongoose.Types.ObjectId;
  };

const authTokenSchema = new Schema<IAuthToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['email_verification', 'password_reset'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

authTokenSchema.index({ tokenHash: 1, type: 1 });
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthToken: Model<IAuthToken> = mongoose.model<IAuthToken>(
  'AuthToken',
  authTokenSchema,
);

