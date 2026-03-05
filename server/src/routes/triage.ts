import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../http/authMiddleware.js';
import { parseBody } from '../http/validate.js';
import { AuditAction } from '@prisma/client';
import { writeAuditLog } from '../audit.js';
import { withRequestDb } from '../requestContext.js';
import { logger } from '../logger.js';

export const triageRouter = Router();

const createSchema = z.object({
  patientId: z.string().optional(),
  symptoms: z.array(z.string()).min(1),
  result: z.any(),
  latencyMs: z.number().int().optional(),
  source: z.string().optional()
});

triageRouter.post('/', requireAuth, async (req, res, next) => {
  try {
  const body = parseBody(createSchema, req.body);
  
  if (body.latencyMs && body.latencyMs > 5000) {
    logger.warn(`Triage Timeout: High latency detected`, { latencyMs: body.latencyMs, patientId: body.patientId, symptoms: body.symptoms });
  }

  const payload = await withRequestDb(req, async (tx) => {
    const row = await tx.aiTriageLog.create({
      data: {
        patientId: body.patientId ?? null,
        createdById: req.user!.id,
        symptoms: body.symptoms,
        resultJson: body.result as never,
        latencyMs: body.latencyMs,
        source: body.source
      },
      select: { id: true, createdAt: true }
    });

    await writeAuditLog({
      req,
      db: tx,
      actorId: req.user!.id,
      action: AuditAction.CREATE,
      entityType: 'AiTriageLog',
      entityId: row.id,
      after: { id: row.id }
    });

    return { id: row.id, createdAt: row.createdAt.toISOString() };
  });

  res.status(201).json(payload);
  } catch (error) {
    logger.error(`Triage Error: ${error instanceof Error ? error.message : String(error)}`, { error, userId: req.user?.id });
    next(error);
  }
});
