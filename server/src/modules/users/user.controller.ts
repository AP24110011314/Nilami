import type { Request, Response } from 'express';
import { z } from 'zod';
import { UserService } from './user.service.js';
import { UnauthorizedError, ForbiddenError } from '../../lib/errors.js';

const updateMeSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
  })
  .strict();

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'UNAUTHENTICATED');
  }

  const profile = await UserService.getMe(req.user.id);
  res.status(200).json({ user: profile });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'UNAUTHENTICATED');
  }

  const validated = updateMeSchema.parse(req.body);
  const updated = await UserService.updateMe(req.user.id, validated);
  res.status(200).json({ user: updated });
}

export async function becomeSeller(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'UNAUTHENTICATED');
  }

  const updated = await UserService.becomeSeller(req.user.id);
  res.status(200).json({ user: updated });
}

export async function getPublicProfile(req: Request, res: Response): Promise<void> {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'User ID is required' } });
    return;
  }

  const profile = await UserService.getPublicProfile(id);
  res.status(200).json(profile);
}

// User-specific resource access check for IDOR guard testing
export async function getUserPrivateSettings(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'UNAUTHENTICATED');
  }

  const rawId = req.params.id;
  const targetUserId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!targetUserId) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'User ID is required' } });
    return;
  }

  // IDOR Protection: User can only access their own private settings
  if (req.user.id !== targetUserId && !req.user.roles.includes('admin')) {
    throw new ForbiddenError('You are not authorized to view another user’s private settings', 'FORBIDDEN');
  }

  const profile = await UserService.getMe(targetUserId);
  res.status(200).json({ settings: profile });
}
