import type { Request, Response, NextFunction } from 'express';
import { forbidden, unauthorized } from './errors.js';

export function requireRole(roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    return next();
  };
}
