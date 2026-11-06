import type { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service.js';
import { BadRequestError } from '../../lib/errors.js';

export class NotificationController {
  public static async getNotifications(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
      const limit = req.query.limit ? Math.min(50, Math.max(1, Number(req.query.limit))) : 20;

      const result = await NotificationService.getNotifications(userId, page, limit);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async markRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const notificationId = String(req.params.id);

      if (!notificationId || notificationId === 'undefined') {
        throw new BadRequestError('Notification ID is required');
      }

      const result = await NotificationService.markRead(userId, notificationId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async markAllRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await NotificationService.markAllRead(userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

