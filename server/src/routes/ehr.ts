import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../http/authMiddleware.js';
import { parseBody } from '../http/validate.js';
import { badRequest, forbidden } from '../http/errors.js';
import { decryptString, encryptString } from '../security/crypto.js';
import { AuditAction, UserRole } from '@prisma/client';
import { writeAuditLog } from '../audit.js';
import { withRequestDb } from '../requestContext.js';

export const ehrRouter = Router();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor: z.string().min(1).optional(),
  patientId: z.string().min(1).optional()
});

const createSchema = z.object({
  patientId: z.string().min(1),
  recordType: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.string().min(10),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  vitalSigns: z.any().optional(),
  testResults: z.any().optional(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().optional()
});

ehrRouter.get('/', requireAuth, async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) throw badRequest('Validation error', 'VALIDATION_ERROR');

  const limit = parsed.data.limit ?? 50;
  const role = req.user!.role;
  const actorId = req.user!.id;

  const patientId = parsed.data.patientId;
  if (role === UserRole.PATIENT && patientId && patientId !== actorId) throw forbidden();

  const where: Record<string, unknown> = { deletedAt: null };
  if (role === UserRole.PATIENT) where.patientId = actorId;
  if (patientId) where.patientId = patientId;
  if (role === UserRole.DOCTOR || role === UserRole.HEALTH_WORKER) {
    // Providers can see records they created; patient-scoped reads require explicit patientId.
    if (!patientId) where.createdById = actorId;
  }

  const payload = await withRequestDb(req, async (tx) => {
    const rows = await tx.ehrRecord.findMany({
      where: where as never,
      orderBy: [{ encounterAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(parsed.data.cursor
        ? {
            cursor: { id: parsed.data.cursor },
            skip: 1
          }
        : {}),
      select: {
        id: true,
        version: true,
        patientId: true,
        createdById: true,
        encounterAt: true,
        recordType: true,
        title: true,
        descriptionEnc: true,
        diagnosisEnc: true,
        notesEnc: true,
        vitalsJson: true,
        attachmentsJson: true,
        testResultsJson: true,
        followUpRequired: true,
        followUpAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.id : null;

    const records = pageRows.map((r) => ({
      id: r.id,
      version: r.version,
      patientId: r.patientId,
      doctorId: undefined,
      healthWorkerId: undefined,
      recordType: r.recordType,
      title: r.title,
      description: decryptString(r.descriptionEnc),
      date: r.encounterAt.toISOString().slice(0, 10),
      attachments: (r.attachmentsJson as unknown as string[] | null) ?? undefined,
      vitalSigns: (r.vitalsJson as unknown) ?? undefined,
      testResults: (r.testResultsJson as unknown) ?? undefined,
      followUpRequired: r.followUpRequired,
      followUpDate: r.followUpAt ? r.followUpAt.toISOString().slice(0, 10) : undefined,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    }));

    return { records, nextCursor };
  });

  res.json(payload);
});

ehrRouter.post('/', requireAuth, async (req, res) => {
  const body = parseBody(createSchema, req.body);
  const role = req.user!.role;
  const actorId = req.user!.id;

  const allowedCreators: UserRole[] = [UserRole.DOCTOR, UserRole.HEALTH_WORKER, UserRole.ADMIN];
  if (!allowedCreators.includes(role)) throw forbidden();

  const encounterAt = new Date(`${body.date}T00:00:00Z`);
  if (Number.isNaN(encounterAt.getTime())) throw badRequest('Invalid date');

  const payload = await withRequestDb(req, async (tx) => {
    const row = await tx.ehrRecord.create({
      data: {
        patientId: body.patientId,
        createdById: actorId,
        encounterAt,
        recordType: body.recordType,
        title: body.title,
        descriptionEnc: encryptString(body.description),
        diagnosisEnc: body.diagnosis ? encryptString(body.diagnosis) : null,
        notesEnc: body.notes ? encryptString(body.notes) : null,
        vitalsJson: body.vitalSigns ? (body.vitalSigns as never) : undefined,
        attachmentsJson: body.attachments ? (body.attachments as never) : undefined,
        testResultsJson: body.testResults ? (body.testResults as never) : undefined,
        followUpRequired: body.followUpRequired ?? false,
        followUpAt: body.followUpDate ? new Date(`${body.followUpDate}T00:00:00Z`) : null
      },
      select: { id: true, version: true, createdAt: true, updatedAt: true }
    });

    await writeAuditLog({
      req,
      db: tx,
      actorId,
      action: AuditAction.CREATE,
      entityType: 'EhrRecord',
      entityId: row.id,
      after: { id: row.id }
    });

    return {
      record: {
        id: row.id,
        version: row.version,
        patientId: body.patientId,
        doctorId: role === UserRole.DOCTOR ? actorId : undefined,
        healthWorkerId: role === UserRole.HEALTH_WORKER ? actorId : undefined,
        recordType: body.recordType,
        title: body.title,
        description: body.description,
        date: body.date,
        attachments: body.attachments,
        vitalSigns: body.vitalSigns,
        testResults: body.testResults,
        followUpRequired: body.followUpRequired,
        followUpDate: body.followUpDate,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString()
      }
    };
  });

  res.status(201).json(payload);
});
