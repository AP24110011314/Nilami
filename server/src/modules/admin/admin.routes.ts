import { Router } from 'express';
import { AdminController } from './admin.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const adminRouter = Router();

// Protect all admin routes
adminRouter.use(requireAuth, requireRole('admin'));

// Audit logs
adminRouter.get('/audit-logs', AdminController.getAuditLogs);

// User moderation
adminRouter.post('/users/:id/suspend', AdminController.suspendUser);

// Auction moderation
adminRouter.post('/auctions/:id/cancel', AdminController.cancelAuction);

// Fraud review queue
adminRouter.get('/fraud-flags', AdminController.getFraudFlags);
adminRouter.patch('/fraud-flags/:id', AdminController.reviewFraudFlag);

// Queues dev inspection (docs/API.md §Admin)
adminRouter.get('/queues', (_req, res) => {
  res.json({ ok: true, status: 'healthy' });
});
