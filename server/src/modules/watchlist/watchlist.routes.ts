import { Router } from 'express';
import { WatchlistController } from './watchlist.controller.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';

export const watchlistRouter = Router();

// Get current user's watchlist
watchlistRouter.get('/', requireAuth, WatchlistController.getMyWatchlist);

// Check if user is watching auction
watchlistRouter.get('/:auctionId/status', optionalAuth, WatchlistController.checkStatus);

// Watch auction with optional reminder preference
watchlistRouter.post('/:auctionId', requireAuth, WatchlistController.watch);

// Unwatch auction
watchlistRouter.delete('/:auctionId', requireAuth, WatchlistController.unwatch);
