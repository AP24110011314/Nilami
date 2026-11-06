import mongoose from 'mongoose';
import { Notification } from './notification.model.js';

export class NotificationService {
  public static async getNotifications(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    items: Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      data?: Record<string, unknown>;
      read: boolean;
      readAt?: Date | null;
      createdAt: string;
    }>;
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
  }> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const skip = (page - 1) * limit;

    const [items, total, unreadCount] = await Promise.all([
      Notification.find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId: userObjectId }),
      Notification.countDocuments({ userId: userObjectId, readAt: null }),
    ]);

    const formatted = items.map((item) => ({
      id: item._id.toString(),
      type: item.type,
      title: item.title,
      body: item.body,
      data: item.data as Record<string, unknown>,
      read: Boolean(item.readAt),
      readAt: item.readAt,
      createdAt: item.createdAt.toISOString(),
    }));

    return {
      items: formatted,
      total,
      unreadCount,
      page,
      limit,
    };
  }

  public static async markRead(
    userId: string,
    notificationId: string,
  ): Promise<{ ok: boolean }> {
    await Notification.updateOne(
      {
        _id: new mongoose.Types.ObjectId(notificationId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      {
        $set: { readAt: new Date() },
      },
    );

    return { ok: true };
  }

  public static async markAllRead(userId: string): Promise<{ ok: boolean; modifiedCount: number }> {
    const res = await Notification.updateMany(
      {
        userId: new mongoose.Types.ObjectId(userId),
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      },
    );

    return { ok: true, modifiedCount: res.modifiedCount };
  }
}
