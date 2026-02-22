import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../http/authMiddleware.js';
import { parseBody } from '../http/validate.js';
import { forbidden } from '../http/errors.js';
import { encryptString, decryptString } from '../security/crypto.js';
import { AuditAction, UserRole } from '@prisma/client';
import { writeAuditLog } from '../audit.js';
import { withRequestDb } from '../requestContext.js';

export const followupsRouter = Router();

followupsRouter.get('/', requireAuth, async (req, res) => {
  const role = req.user!.role;
  const actorId = req.user!.id;
  const where: Record<string, unknown> = { deletedAt: null };

  if (role === UserRole.PATIENT) where.patientId = actorId;
  if (role === UserRole.HEALTH_WORKER) where.workerId = actorId;
  if (role === UserRole.DOCTOR) throw forbidden();

  const payload = await withRequestDb(req, async (tx) => {
    const visits = await tx.followUpVisit.findMany({
      where: where as never,
      orderBy: [{ scheduledAt: 'desc' }, { id: 'desc' }],
      take: 200,
      select: {
        id: true,
        patientId: true,
        workerId: true,
        scheduledAt: true,
        status: true,
        village: true,
        notesEnc: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return {
      visits: visits.map((v) => ({
        id: v.id,
        patientId: v.patientId,
        workerId: v.workerId,
        scheduledAt: v.scheduledAt.toISOString(),
        status: v.status,
        village: v.village ?? undefined,
        notes: v.notesEnc ? decryptString(v.notesEnc) : undefined,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString()
      }))
    };
  });

  res.json(payload);
});

const createSchema = z.object({
  patientId: z.string().min(1),
  scheduledAt: z.string().min(10),
  status: z.string().min(1),
  village: z.string().optional(),
  notes: z.string().optional()
});

followupsRouter.post('/', requireAuth, async (req, res) => {
  const role = req.user!.role;
  const allowedCreators: UserRole[] = [UserRole.HEALTH_WORKER, UserRole.ADMIN];
  if (!allowedCreators.includes(role)) throw forbidden();
  const body = parseBody(createSchema, req.body);

  const payload = await withRequestDb(req, async (tx) => {
    const scheduledAt = new Date(body.scheduledAt);
    const row = await tx.followUpVisit.create({
      data: {
        patientId: body.patientId,
        workerId: req.user!.id,
        scheduledAt,
        status: body.status,
        village: body.village ?? null,
        notesEnc: body.notes ? encryptString(body.notes) : null
      },
      select: { id: true, createdAt: true, updatedAt: true }
    });

    await writeAuditLog({
      req,
      db: tx,
      actorId: req.user!.id,
      action: AuditAction.CREATE,
      entityType: 'FollowUpVisit',
      entityId: row.id,
      after: { id: row.id }
    });

    return { id: row.id, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
  });

  res.status(201).json(payload);
});
