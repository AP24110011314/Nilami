import { User } from './user.model.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { sanitizeUser, type SafeUser } from '../auth/auth.utils.js';

export interface PublicUserProfile {
  id: string;
  name: string;
  ratingAvg: number;
  ratingCount: number;
  auctionsSold: number;
}

export class UserService {
  public static async getMe(userId: string): Promise<SafeUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return sanitizeUser(user);
  }

  public static async updateMe(userId: string, data: { name?: string }): Promise<SafeUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (data.name) {
      user.name = data.name.trim();
      await user.save();
    }

    return sanitizeUser(user);
  }

  public static async becomeSeller(userId: string): Promise<SafeUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenError(
        'Email verification required before becoming a seller',
        'EMAIL_NOT_VERIFIED',
      );
    }

    if (!user.roles.includes('seller')) {
      user.roles.push('seller');
      await user.save();
    }

    return sanitizeUser(user);
  }

  public static async getPublicProfile(userId: string): Promise<PublicUserProfile> {
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user._id.toString(),
      name: user.name,
      ratingAvg: user.ratingAvg,
      ratingCount: user.ratingCount,
      auctionsSold: user.stats.auctionsSold,
    };
  }
}
