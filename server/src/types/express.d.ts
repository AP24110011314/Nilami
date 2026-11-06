import type { UserRole, UserStatus } from '../modules/users/user.model.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: UserRole[];
  status: UserStatus;
  emailVerifiedAt?: Date | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

