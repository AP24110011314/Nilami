import { Router, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireRole('admin'));

adminRouter.get('/queues', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, message: 'Admin queues status' });
});

adminRouter.get('/fraud-flags', (_req: Request, res: Response) => {
  res.status(200).json({ flags: [] });
});
