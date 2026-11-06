import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import type { UserRole, UserDocument, IUser } from '../users/user.model.js';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: UserRole[];
}

export function generateAccessToken(user: { _id: unknown; email: string; roles: UserRole[] }): string {
  const payload: AccessTokenPayload = {
    sub: String(user._id),
    email: user.email,
    roles: user.roles,
  };

  const signOptions: jwt.SignOptions = {
    // String formats like '15m' are supported by ms / jsonwebtoken
    expiresIn: env.ACCESS_TTL as unknown as number,
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, signOptions);
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  emailVerifiedAt: Date | null;
  status: string;
  ratingAvg: number;
  ratingCount: number;
  stats: {
    bidsPlaced: number;
    auctionsWon: number;
    auctionsSold: number;
  };
  createdAt: Date;
}

export function sanitizeUser(user: UserDocument | (IUser & { _id: unknown })): SafeUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    roles: user.roles,
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    status: user.status,
    ratingAvg: user.ratingAvg,
    ratingCount: user.ratingCount,
    stats: user.stats,
    createdAt: user.createdAt,
  };
}
