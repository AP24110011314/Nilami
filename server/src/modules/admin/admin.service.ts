import mongoose from 'mongoose';
import { AuditLog, type AdminAction, type IAuditLog } from './audit-log.model.js';
import { User } from '../users/user.model.js';
import { Auction } from '../auctions/auction.model.js';
import { RefreshToken } from '../auth/refresh-token.model.js';
import { NotFoundError, BadRequestError } from '../../lib/errors.js';

export class AdminService {
  /**
   * Records an audit log entry for admin actions
   */
  public static async logAction(params: {
    adminId: string;
    action: AdminAction;
    targetType: 'user' | 'auction' | 'fraud_flag' | 'payment';
    targetId: string;
    details?: Record<string, unknown>;
    ip?: string;
  }): Promise<void> {
    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(params.adminId),
      action: params.action,
      targetType: params.targetType,
      targetId: new mongoose.Types.ObjectId(params.targetId),
      details: params.details || {},
      ip: params.ip || '127.0.0.1',
    });
  }

  /**
   * Suspends a user account and revokes active sessions
   */
  public static async suspendUser(
    adminId: string,
    userId: string,
    reason: string,
    ip: string,
  ): Promise<{ ok: boolean }> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    if (user.roles.includes('admin')) {
      throw new BadRequestError('Cannot suspend an administrator account');
    }

    user.status = 'suspended';
    await user.save();

    // Revoke all refresh token sessions
    await RefreshToken.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    await this.logAction({
      adminId,
      action: 'SUSPEND_USER',
      targetType: 'user',
      targetId: userId,
      details: { reason },
      ip,
    });

    return { ok: true };
  }

  /**
   * Cancels an active auction
   */
  public static async cancelAuction(
    adminId: string,
    auctionId: string,
    reason: string,
    ip: string,
  ): Promise<{ ok: boolean }> {
    const auction = await Auction.findById(auctionId);
    if (!auction) throw new NotFoundError('Auction not found');

    if (['completed', 'cancelled'].includes(auction.status)) {
      throw new BadRequestError(`Cannot cancel auction in status ${auction.status}`);
    }

    auction.status = 'cancelled';
    auction.version += 1;
    await auction.save();

    await this.logAction({
      adminId,
      action: 'CANCEL_AUCTION',
      targetType: 'auction',
      targetId: auctionId,
      details: { reason, priorStatus: auction.status },
      ip,
    });

    return { ok: true };
  }

  /**
   * Fetches paginated audit logs
   */
  public static async getAuditLogs(
    page = 1,
    limit = 20,
  ): Promise<{
    logs: Array<IAuditLog & { _id: mongoose.Types.ObjectId }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find()
        .populate('adminId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(),
    ]);

    return {
      logs: logs as unknown as Array<IAuditLog & { _id: mongoose.Types.ObjectId }>,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
