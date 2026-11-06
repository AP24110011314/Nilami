import type { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service.js';

export class AnalyticsController {
  public static async getAuctionAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auctionId = String(req.params.id);
      const data = await AnalyticsService.getAuctionAnalytics(auctionId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  public static async getSellerOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = req.user!.id;
      const data = await AnalyticsService.getSellerOverview(sellerId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  public static async getTrending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit || '6'), 10)));
      const data = await AnalyticsService.getTrendingAuctions(limit);
      res.json({ trending: data });
    } catch (err) {
      next(err);
    }
  }

  public static async getAdminOverview(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AnalyticsService.getAdminOverview();
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
}

