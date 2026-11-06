import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { ConflictError, UnauthorizedError, ValidationError, ForbiddenError } from '../../lib/errors.js';
import { User, type UserRole } from '../users/user.model.js';
import { RefreshToken } from './refresh-token.model.js';
import { AuthToken } from './auth-token.model.js';
import {
  hashToken,
  generateRandomToken,
  generateAccessToken,
  sanitizeUser,
  type SafeUser,
} from './auth.utils.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../config/mailer.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

export interface AuthResult {
  accessToken: string;
  plainRefreshToken: string;
  user: SafeUser;
}

export class AuthService {
  public static async register(input: RegisterInput): Promise<{ user: SafeUser }> {
    const existing = await User.findOne({ email: input.email }).lean();
    if (existing) {
      throw new ConflictError('An account with this email already exists', 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const roles: UserRole[] = input.role === 'seller' ? ['buyer', 'seller'] : ['buyer'];

    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      roles,
      status: 'active',
    });

    // Create verification token (24 hours expiry)
    const rawToken = generateRandomToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await AuthToken.create({
      userId: user._id,
      tokenHash,
      type: 'email_verification',
      expiresAt,
    });

    try {
      await sendVerificationEmail(user.email, rawToken);
    } catch (err) {
      logger.error({ err, userId: user._id }, 'Failed to dispatch verification email');
    }

    return { user: sanitizeUser(user) };
  }

  public static async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const authToken = await AuthToken.findOne({
      tokenHash,
      type: 'email_verification',
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!authToken) {
      throw new ValidationError('Invalid or expired verification token');
    }

    await User.findByIdAndUpdate(authToken.userId, {
      emailVerifiedAt: new Date(),
    });

    authToken.usedAt = new Date();
    await authToken.save();
  }

  public static async login(
    input: LoginInput,
    ip: string,
    userAgent: string,
  ): Promise<AuthResult> {
    const user = await User.findOne({ email: input.email });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (user.status === 'suspended') {
      throw new ForbiddenError('Account is suspended', 'ACCOUNT_SUSPENDED');
    }

    const accessToken = generateAccessToken(user);
    const plainRefreshToken = generateRandomToken();
    const tokenHash = hashToken(plainRefreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      familyId,
      expiresAt,
      ip,
      userAgent,
    });

    return {
      accessToken,
      plainRefreshToken,
      user: sanitizeUser(user),
    };
  }

  public static async refresh(
    plainRefreshToken: string,
    ip: string,
    userAgent: string,
  ): Promise<{ accessToken: string; plainRefreshToken: string }> {
    const tokenHash = hashToken(plainRefreshToken);
    const tokenDoc = await RefreshToken.findOne({ tokenHash });

    if (!tokenDoc || tokenDoc.expiresAt <= new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token', 'UNAUTHENTICATED');
    }

    // Reuse Detection: If a revoked token is used, revoke the ENTIRE token family
    if (tokenDoc.revokedAt) {
      logger.warn(
        { familyId: tokenDoc.familyId, userId: tokenDoc.userId, ip },
        'SECURITY ALERT: Refresh token reuse detected! Revoking family.',
      );
      await RefreshToken.updateMany(
        { familyId: tokenDoc.familyId },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedError(
        'Refresh token reuse detected. All sessions in this family revoked',
        'TOKEN_REUSE_DETECTED',
      );
    }

    const user = await User.findById(tokenDoc.userId);
    if (!user || user.status === 'suspended') {
      throw new UnauthorizedError('User account not found or suspended', 'UNAUTHENTICATED');
    }

    // Rotate token
    const newPlainRefreshToken = generateRandomToken();
    const newHash = hashToken(newPlainRefreshToken);
    const newExpiresAt = new Date(Date.now() + env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    tokenDoc.revokedAt = new Date();
    tokenDoc.replacedByHash = newHash;
    await tokenDoc.save();

    await RefreshToken.create({
      userId: user._id,
      tokenHash: newHash,
      familyId: tokenDoc.familyId,
      expiresAt: newExpiresAt,
      ip,
      userAgent,
    });

    const accessToken = generateAccessToken(user);

    return {
      accessToken,
      plainRefreshToken: newPlainRefreshToken,
    };
  }

  public static async logout(plainRefreshToken?: string): Promise<void> {
    if (!plainRefreshToken) return;

    const tokenHash = hashToken(plainRefreshToken);
    const tokenDoc = await RefreshToken.findOne({ tokenHash });
    if (tokenDoc) {
      await RefreshToken.updateMany(
        { familyId: tokenDoc.familyId },
        { revokedAt: new Date() },
      );
    }
  }

  public static async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email });
    if (!user) {
      // Do not reveal if email exists
      return;
    }

    // Invalidate existing unused password reset tokens
    await AuthToken.updateMany(
      { userId: user._id, type: 'password_reset', usedAt: null },
      { usedAt: new Date() },
    );

    const rawToken = generateRandomToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await AuthToken.create({
      userId: user._id,
      tokenHash,
      type: 'password_reset',
      expiresAt,
    });

    try {
      await sendPasswordResetEmail(user.email, rawToken);
    } catch (err) {
      logger.error({ err, userId: user._id }, 'Failed to dispatch password reset email');
    }
  }

  public static async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const authToken = await AuthToken.findOne({
      tokenHash,
      type: 'password_reset',
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!authToken) {
      throw new ValidationError('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(authToken.userId, { passwordHash });

    authToken.usedAt = new Date();
    await authToken.save();

    // Revoke all existing sessions for this user on password change
    await RefreshToken.updateMany({ userId: authToken.userId }, { revokedAt: new Date() });
  }
}
