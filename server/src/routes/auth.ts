import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { parseBody } from '../http/validate.js';
import { badRequest, unauthorized } from '../http/errors.js';
import { decryptString, encryptString, sha256Base64 } from '../security/crypto.js';
import { hashPassword, verifyPassword } from '../security/passwords.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../security/jwt.js';
import { normalizeEmail, normalizePhone } from '../util/normalize.js';
import { AuditAction, UserRole } from '@prisma/client';
import { writeAuditLog } from '../audit.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(8),
  role: z.enum(['patient', 'doctor', 'healthworker', 'admin', 'pharmacy']),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  village: z.string().optional(),
  workLocation: z.string().optional(),
  experience: z.number().int().nonnegative().optional(),
  abhaId: z.string().optional()
});

function mapRole(role: string): UserRole {
  switch (role) {
    case 'patient':
      return UserRole.PATIENT;
    case 'doctor':
      return UserRole.DOCTOR;
    case 'healthworker':
      return UserRole.HEALTH_WORKER;
    case 'pharmacy':
      return UserRole.PHARMACY;
    case 'admin':
      return UserRole.ADMIN;
    default:
      return UserRole.PATIENT;
  }
}

authRouter.post('/register', async (req, res) => {
  const body = parseBody(registerSchema, req.body);

  const emailNorm = normalizeEmail(body.email);
  const phoneNorm = normalizePhone(body.phone);
  const emailHash = sha256Base64(emailNorm);
  const phoneHash = sha256Base64(phoneNorm);
  const abhaHash = body.abhaId ? sha256Base64(body.abhaId.trim()) : null;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { emailHash },
        { phoneHash },
        ...(abhaHash ? [{ abhaIdHash: abhaHash }] : [])
      ]
    },
    select: { id: true }
  });
  if (existing) throw badRequest('User already exists', 'USER_EXISTS');

  const passwordHash = await hashPassword(body.password);
  const user = await prisma.user.create({
    data: {
      role: mapRole(body.role),
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      emailEnc: encryptString(emailNorm),
      emailHash,
      phoneEnc: encryptString(phoneNorm),
      phoneHash,
      abhaIdEnc: body.abhaId ? encryptString(body.abhaId.trim()) : null,
      abhaIdHash: abhaHash,
      passwordHash,
      village: body.village?.trim(),
      workLocation: body.workLocation?.trim(),
      specialization: body.specialization?.trim(),
      licenseNumber: body.licenseNumber?.trim(),
      experience: body.experience
    },
    select: {
      id: true,
      role: true,
      firstName: true,
      lastName: true,
      emailEnc: true,
      phoneEnc: true,
      village: true,
      workLocation: true,
      specialization: true,
      licenseNumber: true,
      experience: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id);
  const refreshTokenHash = sha256Base64(refreshToken);
  const refreshDecoded = verifyRefreshToken(refreshToken);
  const expMs = (refreshDecoded as unknown as { exp?: number }).exp;
  const expiresAt = expMs ? new Date(expMs * 1000) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt
    }
  });

  await writeAuditLog({
    req,
    actorId: user.id,
    action: AuditAction.CREATE,
    entityType: 'User',
    entityId: user.id,
    after: user
  });

  res.status(201).json({
    user: {
      id: user.id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.emailEnc ? decryptString(user.emailEnc) : '',
      phone: user.phoneEnc ? decryptString(user.phoneEnc) : '',
      village: user.village ?? undefined,
      workLocation: user.workLocation ?? undefined,
      specialization: user.specialization ?? undefined,
      licenseNumber: user.licenseNumber ?? undefined,
      experience: user.experience ?? undefined,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    },
    accessToken,
    refreshToken
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

authRouter.post('/login', async (req, res) => {
  const body = parseBody(loginSchema, req.body);
  const emailNorm = normalizeEmail(body.email);
  const emailHash = sha256Base64(emailNorm);

  const user = await prisma.user.findFirst({
    where: { emailHash, isActive: true, deletedAt: null },
    select: {
      id: true,
      role: true,
      firstName: true,
      lastName: true,
      emailEnc: true,
      phoneEnc: true,
      passwordHash: true,
      village: true,
      workLocation: true,
      specialization: true,
      licenseNumber: true,
      experience: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
  if (!user) throw unauthorized('Invalid credentials');

  const ok = await verifyPassword(body.password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid credentials');

  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id);
  const refreshTokenHash = sha256Base64(refreshToken);
  const refreshDecoded = verifyRefreshToken(refreshToken);
  const expMs = (refreshDecoded as unknown as { exp?: number }).exp;
  const expiresAt = expMs ? new Date(expMs * 1000) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt
    }
  });

  await writeAuditLog({
    req,
    actorId: user.id,
    action: AuditAction.LOGIN,
    entityType: 'User',
    entityId: user.id
  });

  // Do not return passwordHash
  const { passwordHash: _ph, ...safeUser } = user;
  void _ph;
  res.json({
    user: {
      ...safeUser,
      email: user.emailEnc ? decryptString(user.emailEnc) : '',
      phone: user.phoneEnc ? decryptString(user.phoneEnc) : '',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    },
    accessToken,
    refreshToken
  });
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

authRouter.post('/refresh', async (req, res) => {
  const body = parseBody(refreshSchema, req.body);
  const decoded = verifyRefreshToken(body.refreshToken);
  const tokenHash = sha256Base64(body.refreshToken);

  const tokenRow = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      userId: decoded.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    select: { id: true, userId: true }
  });
  if (!tokenRow) throw unauthorized('Invalid refresh token');

  // Rotate: revoke old, issue new
  await prisma.refreshToken.update({
    where: { id: tokenRow.id },
    data: { revokedAt: new Date() }
  });

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: { id: true, role: true, firstName: true, lastName: true }
  });
  if (!user) throw unauthorized('Invalid user');

  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id);
  const refreshTokenHash = sha256Base64(refreshToken);
  const refreshDecoded = verifyRefreshToken(refreshToken);
  const expMs = (refreshDecoded as unknown as { exp?: number }).exp;
  const expiresAt = expMs ? new Date(expMs * 1000) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt
    }
  });

  res.json({ accessToken, refreshToken });
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1)
});

authRouter.post('/logout', async (req, res) => {
  const body = parseBody(logoutSchema, req.body);
  const decoded = verifyRefreshToken(body.refreshToken);
  const tokenHash = sha256Base64(body.refreshToken);

  await prisma.refreshToken.updateMany({
    where: { userId: decoded.sub, tokenHash, revokedAt: null },
    data: { revokedAt: new Date() }
  });

  await writeAuditLog({
    req,
    actorId: decoded.sub,
    action: AuditAction.LOGOUT,
    entityType: 'User',
    entityId: decoded.sub
  });

  res.status(204).send();
});
