import { Router } from 'express';
import {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
} from './auth.controller.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, register);
authRouter.post('/verify-email', verifyEmail);
authRouter.post('/login', authRateLimiter, login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.post('/forgot-password', authRateLimiter, forgotPassword);
authRouter.post('/reset-password', resetPassword);

