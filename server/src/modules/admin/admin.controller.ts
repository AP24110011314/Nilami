import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AdminService } from './admin.service.js';
import { FraudService } from '../fraud/fraud.service.js';
import { ValidationError } from '../../lib/errors.js';

const suspendSchema = z.object({
  reason: z.string().min(3).max(500),
});

const cancelAuctionSchema = z.object({
  reason: z.string().min(3).max(500),
});

const reviewFraudSchema = z.object({
  status: z.enum(['confirmed', 'dismissed']),
  appealNote: z.string().max(1000).optional(),
});

export class AdminController {
  public static async suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = suspendSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Reason is required to suspend user', parsed.error.format());
      }

      const userId = String(req.params.id);
      const adminId = req.user!.id;
      const ip = req.ip || '127.0.0.1';

      const result = await AdminService.suspendUser(adminId, userId, parsed.data.reason, ip);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async cancelAuction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = cancelAuctionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Reason is required to cancel auction', parsed.error.format());
      }

      const auctionId = String(req.params.id);
      const adminId = req.user!.id;
      const ip = req.ip || '127.0.0.1';

      const result = await AdminService.cancelAuction(adminId, auctionId, parsed.data.reason, ip);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));

      const data = await AdminService.getAuditLogs(page, limit);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  public static async getFraudFlags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as 'open' | 'dismissed' | 'confirmed' | undefined;
      const minScore = req.query.minScore ? parseInt(String(req.query.minScore), 10) : undefined;
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));

      const data = await FraudService.getFraudFlags({ status, minScore, page, limit });
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  public static async reviewFraudFlag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = reviewFraudSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Status must be confirmed or dismissed', parsed.error.format());
      }

      const flagId = String(req.params.id);
      const adminId = req.user!.id;
      const ip = req.ip || '127.0.0.1';

      const updated = await FraudService.reviewFlag(
        flagId,
        adminId,
        parsed.data.status,
        parsed.data.appealNote,
      );

      // Audit log the fraud flag review
      await AdminService.logAction({
        adminId,
        action: 'REVIEW_FRAUD_FLAG',
        targetType: 'fraud_flag',
        targetId: flagId,
        details: { status: parsed.data.status, appealNote: parsed.data.appealNote },
        ip,
      });

      res.json({ flag: updated });
    } catch (err) {
      next(err);
    }
  }
}
