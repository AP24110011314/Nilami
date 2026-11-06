import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import { User, type UserRole } from '../modules/users/user.model.js';

interface TokenPayload {
  sub: string;
  email: string;
  roles: UserRole[];
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication token required', 'UNAUTHENTICATED');
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    const user = await User.findById(decoded.sub).lean();

    if (!user) {
      throw new UnauthorizedError('User no longer exists', 'UNAUTHENTICATED');
    }

    if (user.status === 'suspended') {
      throw new ForbiddenError('Account is suspended', 'ACCOUNT_SUSPENDED');
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      roles: user.roles,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
    };

    next();
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Invalid or expired authentication token', 'UNAUTHENTICATED');
  }
}

export function requireVerified(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required', 'UNAUTHENTICATED');
  }

  if (!req.user.emailVerifiedAt) {
    throw new ForbiddenError(
      'Email verification required to perform this action',
      'EMAIL_NOT_VERIFIED',
    );
  }

  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'UNAUTHENTICATED');
    }

    const hasRole = allowedRoles.some((role) => req.user!.roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenError('Forbidden: insufficient permissions', 'FORBIDDEN');
    }

    next();
  };
}
