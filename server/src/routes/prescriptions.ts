import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../http/authMiddleware.js';
import { parseBody } from '../http/validate.js';
import { badRequest, forbidden } from '../http/errors.js';
import { encryptString, decryptString } from '../security/crypto.js';
import { AuditAction, UserRole } from '@prisma/client';
import { writeAuditLog } from '../audit.js';
import { withRequestDb } from '../requestContext.js';

export const prescriptionsRouter = Router();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor: z.string().min(1).optional()
});

const medicineSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  timesToTake: z.array(z.string()).optional()
});

const createSchema = z.object({
  patientId: z.string().min(1),
  appointmentId: z.string().min(1).optional(),
  date: z.string().min(10),
  diagnosis: z.string().min(1),
  symptoms: z.string().min(1),
  medicines: z.array(medicineSchema).min(1),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
  vitalSigns: z.any().optional(),
  attachments: z.array(z.string()).optional()
});

prescriptionsRouter.get('/', requireAuth, async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) throw badRequest('Validation error', 'VALIDATION_ERROR');
  const limit = parsed.data.limit ?? 50;
  const role = req.user!.role;
  const actorId = req.user!.id;

  const where: Record<string, unknown> = { deletedAt: null };
  if (role === UserRole.PATIENT) where.patientId = actorId;
  if (role === UserRole.DOCTOR) where.doctorId = actorId;
  if (role === UserRole.HEALTH_WORKER) throw forbidden();

  const payload = await withRequestDb(req, async (tx) => {
    const rows = await tx.prescription.findMany({
      where: where as never,
      orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }],
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
        doctorId: true,
        appointmentId: true,
        issuedAt: true,
        followUpAt: true,
        diagnosisEnc: true,
        symptomsEnc: true,
        notesEnc: true,
        vitalSignsJson: true,
        attachmentsJson: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        items: {
          select: {
            id: true,
            medicineName: true,
            dosage: true,
            frequency: true,
            duration: true,
            instructions: true,
            quantity: true,
            timesToTake: true
          }
        }
      }
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.id : null;

    const prescriptions = pageRows.map((p) => ({
      id: p.id,
      version: p.version,
      patientId: p.patientId,
      patientName: p.patient ? `${p.patient.firstName ?? ''} ${p.patient.lastName ?? ''}`.trim() : '',
      doctorId: p.doctorId,
      appointmentId: p.appointmentId ?? '',
      date: p.issuedAt.toISOString().slice(0, 10),
      diagnosis: p.diagnosisEnc ? decryptString(p.diagnosisEnc) : '',
      symptoms: p.symptomsEnc ? decryptString(p.symptomsEnc) : '',
      medicines: p.items.map((i) => ({
        id: i.id,
        name: i.medicineName,
        dosage: i.dosage ?? '',
        frequency: i.frequency ?? '',
        duration: i.duration ?? '',
        instructions: i.instructions ?? '',
        quantity: i.quantity ?? 0,
        timesToTake: i.timesToTake ?? []
      })),
      notes: p.notesEnc ? decryptString(p.notesEnc) : '',
      followUpDate: p.followUpAt ? p.followUpAt.toISOString().slice(0, 10) : undefined,
      status: String(p.status).toLowerCase(),
      vitalSigns: (p.vitalSignsJson as unknown) ?? undefined,
      attachments: (p.attachmentsJson as unknown as string[] | null) ?? undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    }));

    return { prescriptions, nextCursor };
  });

  res.json(payload);
});

prescriptionsRouter.post('/', requireAuth, async (req, res) => {
  const body = parseBody(createSchema, req.body);
  const role = req.user!.role;
  const actorId = req.user!.id;
  const allowedCreators: UserRole[] = [UserRole.DOCTOR, UserRole.ADMIN];
  if (!allowedCreators.includes(role)) throw forbidden();

  const issuedAt = new Date(`${body.date}T00:00:00Z`);
  const followUpAt = body.followUpDate ? new Date(`${body.followUpDate}T00:00:00Z`) : null;

  const payload = await withRequestDb(req, async (tx) => {
    const row = await tx.prescription.create({
      data: {
        patientId: body.patientId,
        doctorId: actorId,
        appointmentId: body.appointmentId ?? null,
        issuedAt,
        followUpAt,
        diagnosisEnc: encryptString(body.diagnosis),
        symptomsEnc: encryptString(body.symptoms),
        notesEnc: body.notes ? encryptString(body.notes) : null,
        vitalSignsJson: body.vitalSigns ? (body.vitalSigns as never) : undefined,
        attachmentsJson: body.attachments ? (body.attachments as never) : undefined,
        items: {
          create: body.medicines.map((m) => ({
            medicineName: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            instructions: m.instructions,
            quantity: m.quantity,
            timesToTake: m.timesToTake ?? []
          }))
        }
      },
      select: { id: true, version: true, createdAt: true, updatedAt: true }
    });

    await writeAuditLog({
      req,
      db: tx,
      actorId,
      action: AuditAction.CREATE,
      entityType: 'Prescription',
      entityId: row.id,
      after: { id: row.id }
    });

    return { id: row.id, version: row.version, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
  });

  res.status(201).json(payload);
});
