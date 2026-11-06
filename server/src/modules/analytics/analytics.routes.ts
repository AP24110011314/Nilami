import { Router } from 'express';
import { AnalyticsController } from './analytics.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const analyticsRouter = Router();

// Public / lot analytics
analyticsRouter.get('/auctions/:id/analytics', AnalyticsController.getAuctionAnalytics);

// Public / trending lots
analyticsRouter.get('/analytics/trending', AnalyticsController.getTrending);

// Seller dashboard analytics
analyticsRouter.get(
  '/analytics/seller/overview',
  requireAuth,
  requireRole('seller', 'admin'),
  AnalyticsController.getSellerOverview,
);

// Admin platform analytics
analyticsRouter.get(
  '/analytics/admin/overview',
  requireAuth,
  requireRole('admin'),
  AnalyticsController.getAdminOverview,
);
