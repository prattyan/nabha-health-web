import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { UserRole } from '@prisma/client';

export type AccessTokenClaims = {
  sub: string;
  role: UserRole;
  typ: 'access';
};

export type RefreshTokenClaims = {
  sub: string;
  typ: 'refresh';
};

export function signAccessToken(userId: string, role: UserRole): string {
  return jwt.sign(
    { sub: userId, role, typ: 'access' } satisfies AccessTokenClaims,
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_TTL_SECONDS }
  );
}

export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, typ: 'refresh' } satisfies RefreshTokenClaims,
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_TTL_SECONDS }
  );
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenClaims;
  if (decoded.typ !== 'access') throw new Error('Invalid token type');
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenClaims;
  if (decoded.typ !== 'refresh') throw new Error('Invalid token type');
  return decoded;
}
