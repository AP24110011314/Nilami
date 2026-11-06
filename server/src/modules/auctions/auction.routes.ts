import { Router } from 'express';
import {
  createAuction,
  getAuction,
  updateAuction,
  cancelAuction,
  listAuctions,
} from './auction.controller.js';
import { placeBid, getAuctionBids } from '../bids/bid.controller.js';
import { requireAuth, requireRole, requireVerified } from '../../middleware/auth.js';
import { bidRateLimiter } from '../../middleware/rateLimit.js';

export const auctionRouter = Router();

auctionRouter.get('/', listAuctions);
auctionRouter.post('/', requireAuth, requireRole('seller', 'admin'), createAuction);
auctionRouter.get('/:id', getAuction);
auctionRouter.patch('/:id', requireAuth, updateAuction);
auctionRouter.post('/:id/cancel', requireAuth, cancelAuction);

// Bidding Engine Endpoints (Phase 3)
auctionRouter.post('/:id/bid', requireAuth, requireVerified, bidRateLimiter, placeBid);
auctionRouter.get('/:id/bids', getAuctionBids);
