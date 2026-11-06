import { Router } from 'express';
import {
  createAuction,
  getAuction,
  updateAuction,
  cancelAuction,
  listAuctions,
} from './auction.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const auctionRouter = Router();

auctionRouter.get('/', listAuctions);
auctionRouter.post('/', requireAuth, requireRole('seller', 'admin'), createAuction);
auctionRouter.get('/:id', getAuction);
auctionRouter.patch('/:id', requireAuth, updateAuction);
auctionRouter.post('/:id/cancel', requireAuth, cancelAuction);
