import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../http/authMiddleware.js';
import { requireRole } from '../http/rbac.js';
import { UserRole } from '@prisma/client';
import { decryptString } from '../security/crypto.js';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
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
      updatedAt: true
    }
  });
  if (!user) return res.json({ user: null });
  res.json({
    user: {
      ...user,
      email: user.emailEnc ? decryptString(user.emailEnc) : '',
      phone: user.phoneEnc ? decryptString(user.phoneEnc) : '',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    }
  });
});

usersRouter.get('/doctors', requireAuth, async (_req, res) => {
  const doctors = await prisma.user.findMany({
    where: { role: UserRole.DOCTOR, deletedAt: null, isActive: true },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    select: { id: true, firstName: true, lastName: true, specialization: true, village: true }
  });
  res.json({ doctors });
});

usersRouter.get('/', requireAuth, requireRole([UserRole.ADMIN]), async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ createdAt: 'desc' }],
    select: { id: true, role: true, firstName: true, lastName: true, village: true, isActive: true, createdAt: true }
  });
  res.json({ users });
});
