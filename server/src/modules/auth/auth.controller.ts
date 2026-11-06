import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema.js';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../lib/errors.js';

const REFRESH_COOKIE_NAME = 'rt';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const validated = registerSchema.parse(req.body);
  const result = await AuthService.register(validated);
  res.status(201).json(result);
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const validated = verifyEmailSchema.parse(req.body);
  await AuthService.verifyEmail(validated.token);
  res.status(200).json({ message: 'Email verified successfully' });
}

export async function login(req: Request, res: Response): Promise<void> {
  const validated = loginSchema.parse(req.body);
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  const result = await AuthService.login(validated, ip, userAgent);
  setRefreshCookie(res, result.plainRefreshToken);

  res.status(200).json({
    accessToken: result.accessToken,
    user: result.user,
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const plainRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  if (!plainRefreshToken) {
    throw new UnauthorizedError('Refresh token required', 'UNAUTHENTICATED');
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const result = await AuthService.refresh(plainRefreshToken, ip, userAgent);
    setRefreshCookie(res, result.plainRefreshToken);
    res.status(200).json({ accessToken: result.accessToken });
  } catch (error) {
    clearRefreshCookie(res);
    throw error;
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const plainRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  await AuthService.logout(plainRefreshToken);
  clearRefreshCookie(res);
  res.status(200).json({ message: 'Logged out successfully' });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const validated = forgotPasswordSchema.parse(req.body);
  await AuthService.forgotPassword(validated.email);
  res.status(200).json({
    message: 'If that email is registered, a password reset link has been sent',
  });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const validated = resetPasswordSchema.parse(req.body);
  await AuthService.resetPassword(validated.token, validated.password);
  clearRefreshCookie(res);
  res.status(200).json({ message: 'Password reset successfully' });
}
