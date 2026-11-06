import type { Request, Response, NextFunction } from 'express';
import { WatchlistService } from './watchlist.service.js';
import { BadRequestError } from '../../lib/errors.js';

export class WatchlistController {
  public static async watch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auctionId = String(req.params.auctionId);
      const userId = req.user!.id;
      const remindMinutes = req.body.remindMinutesBefore ? Number(req.body.remindMinutesBefore) : 15;

      if (!auctionId || auctionId === 'undefined') {
        throw new BadRequestError('Auction ID is required');
      }

      const result = await WatchlistService.watchAuction(userId, auctionId, remindMinutes);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async unwatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auctionId = String(req.params.auctionId);
      const userId = req.user!.id;

      if (!auctionId || auctionId === 'undefined') {
        throw new BadRequestError('Auction ID is required');
      }

      const result = await WatchlistService.unwatchAuction(userId, auctionId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async checkStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auctionId = String(req.params.auctionId);
      const userId = req.user?.id || '';

      if (!auctionId || auctionId === 'undefined') {
        throw new BadRequestError('Auction ID is required');
      }

      if (!userId) {
        res.status(200).json({ watching: false, remindMinutesBefore: 15 });
        return;
      }

      const result = await WatchlistService.isWatching(userId, auctionId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getMyWatchlist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const items = await WatchlistService.getMyWatchlist(userId);
      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  }
}

