import { Router } from 'express';
import {
  getMe,
  updateMe,
  becomeSeller,
  getPublicProfile,
  getUserPrivateSettings,
} from './user.controller.js';
import { getMyBids, getMyWins } from '../bids/bid.controller.js';
import { requireAuth, requireVerified } from '../../middleware/auth.js';

export const userRouter = Router();

userRouter.get('/me', requireAuth, getMe);
userRouter.patch('/me', requireAuth, updateMe);
userRouter.post('/me/become-seller', requireAuth, requireVerified, becomeSeller);
userRouter.get('/my-bids', requireAuth, getMyBids);
userRouter.get('/my-wins', requireAuth, getMyWins);
userRouter.get('/:id/public', getPublicProfile);
userRouter.get('/:id/private', requireAuth, getUserPrivateSettings);
