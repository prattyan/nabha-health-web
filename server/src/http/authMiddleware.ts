import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../security/jwt.js';
import { unauthorized } from './errors.js';
import type { UserRole } from '@prisma/client';

export type AuthedUser = {
  id: string;
  role: UserRole;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header) return next(unauthorized());
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return next(unauthorized());

  try {
    const claims = verifyAccessToken(token);
    req.user = { id: claims.sub, role: claims.role };
    return next();
  } catch {
    return next(unauthorized());
  }
}

