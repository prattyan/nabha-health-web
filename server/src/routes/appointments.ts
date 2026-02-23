import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../http/authMiddleware.js';
import { parseBody } from '../http/validate.js';
import { badRequest, forbidden, notFound } from '../http/errors.js';
import { encryptString, decryptString } from '../security/crypto.js';
import { AuditAction, AppointmentStatus, UserRole } from '@prisma/client';
import { writeAuditLog } from '../audit.js';
import { withRequestDb } from '../requestContext.js';

export const appointmentsRouter = Router();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor: z.string().min(1).optional(),
  patientId: z.string().min(1).optional(),
  doctorId: z.string().min(1).optional()
});

function toScheduledAt(date: string, time: string): Date {
  // Treat as local time; store ISO in DB as UTC instant.
  const dt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(dt.getTime())) throw badRequest('Invalid date/time');
  return dt;
}

function splitDateTime(scheduledAt: Date): { date: string; time: string } {
  const iso = scheduledAt.toISOString();
  const date = iso.slice(0, 10);
  const time = iso.slice(11, 16);
  return { date, time };
}

const createSchema = z.object({
  id: z.string().min(1).optional(),
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  healthWorkerId: z.string().min(1).optional(),
  date: z.string().min(10),
  time: z.string().min(4),
  duration: z.number().int().positive(),
  type: z.string().min(1),
  status: z.enum(['available', 'scheduled', 'ongoing', 'completed', 'cancelled', 'no_show']).optional(),
  village: z.string().optional(),
  specialization: z.string().optional(),
  reason: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  symptoms: z.array(z.string()).optional(),
  notes: z.string().optional(),
  meetingLink: z.string().optional()
});

function mapStatus(status?: string): AppointmentStatus {
  switch (status) {
    case 'available':
      return AppointmentStatus.AVAILABLE;
    case 'scheduled':
      return AppointmentStatus.SCHEDULED;
    case 'ongoing':
      return AppointmentStatus.ONGOING;
    case 'completed':
      return AppointmentStatus.COMPLETED;
    case 'cancelled':
      return AppointmentStatus.CANCELLED;
    case 'no_show':
      return AppointmentStatus.NO_SHOW;
    default:
      return AppointmentStatus.SCHEDULED;
  }
}

function unmapStatus(status: AppointmentStatus): string {
  switch (status) {
    case AppointmentStatus.AVAILABLE:
      return 'available';
    case AppointmentStatus.SCHEDULED:
      return 'scheduled';
    case AppointmentStatus.ONGOING:
      return 'ongoing';
    case AppointmentStatus.COMPLETED:
      return 'completed';
    case AppointmentStatus.CANCELLED:
      return 'cancelled';
    case AppointmentStatus.NO_SHOW:
      return 'no_show';
  }
}

appointmentsRouter.get('/', requireAuth, async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) throw badRequest('Validation error', 'VALIDATION_ERROR');
  const limit = parsed.data.limit ?? 50;
  const role = req.user!.role;
  const actorId = req.user!.id;

  const where: Record<string, unknown> = { deletedAt: null };
  if (role === UserRole.PATIENT) where.patientId = actorId;
  if (role === UserRole.DOCTOR) where.doctorId = actorId;
  if (role === UserRole.HEALTH_WORKER) where.healthWorkerId = actorId;

  // Admin can filter by patientId/doctorId
  if (role === UserRole.ADMIN) {
    if (parsed.data.patientId) where.patientId = parsed.data.patientId;
    if (parsed.data.doctorId) where.doctorId = parsed.data.doctorId;
  }

  const payload = await withRequestDb(req, async (tx) => {
    const rows = await tx.appointment.findMany({
      where: where as never,
      orderBy: [{ scheduledAt: 'desc' }, { id: 'desc' }],
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
        healthWorkerId: true,
        scheduledAt: true,
        durationMinutes: true,
        type: true,
        status: true,
        village: true,
        specialization: true,
        priority: true,
        symptoms: true,
        notesEnc: true,
        meetingLink: true,
        reminderSent: true,
        review: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.id : null;

    const appointments = pageRows.map((r) => {
      const { date, time } = splitDateTime(r.scheduledAt);
      return {
        id: r.id,
        version: r.version,
        patientId: r.patientId,
        doctorId: r.doctorId,
        healthWorkerId: r.healthWorkerId ?? undefined,
        patientName: '',
        doctorName: '',
        date,
        time,
        duration: r.durationMinutes,
        type: r.type,
        status: unmapStatus(r.status),
        village: r.village ?? undefined,
        specialization: r.specialization ?? undefined,
        review: r.review ?? undefined,
        reason: '',
        priority: r.priority as 'low' | 'medium' | 'high' | 'urgent',
        symptoms: r.symptoms.length ? r.symptoms : undefined,
        notes: r.notesEnc ? decryptString(r.notesEnc) : undefined,
        meetingLink: r.meetingLink ?? undefined,
        reminderSent: r.reminderSent,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString()
      };
    });

    return { appointments, nextCursor };
  });

  res.json(payload);
});

appointmentsRouter.post('/', requireAuth, async (req, res) => {
  const body = parseBody(createSchema, req.body);
  const role = req.user!.role;
  const actorId = req.user!.id;

  // Patient can only create for themselves.
  if (role === UserRole.PATIENT && body.patientId !== actorId) throw forbidden();
  const allowedCreators: UserRole[] = [UserRole.PATIENT, UserRole.HEALTH_WORKER, UserRole.ADMIN];
  if (!allowedCreators.includes(role)) throw forbidden();

  const payload = await withRequestDb(req, async (tx) => {
    const scheduledAt = toScheduledAt(body.date, body.time);
    const row = await tx.appointment.create({
      data: {
        id: body.id,
        patientId: body.patientId,
        doctorId: body.doctorId,
        healthWorkerId: body.healthWorkerId ?? null,
        scheduledAt,
        durationMinutes: body.duration,
        type: body.type,
        status: mapStatus(body.status),
        priority: body.priority,
        reasonEnc: encryptString(body.reason),
        notesEnc: body.notes ? encryptString(body.notes) : null,
        village: body.village ?? null,
        specialization: body.specialization ?? null,
        meetingLink: body.meetingLink ?? null,
        symptoms: body.symptoms ?? []
      },
      select: { id: true, version: true, scheduledAt: true, createdAt: true, updatedAt: true }
    });

    await writeAuditLog({
      req,
      db: tx,
      actorId,
      action: AuditAction.CREATE,
      entityType: 'Appointment',
      entityId: row.id,
      after: { id: row.id }
    });

    const { date, time } = splitDateTime(row.scheduledAt);
    return {
      appointment: {
        id: row.id,
        version: row.version,
        patientId: body.patientId,
        doctorId: body.doctorId,
        healthWorkerId: body.healthWorkerId,
        patientName: '',
        doctorName: '',
        date,
        time,
        duration: body.duration,
        type: body.type,
        status: body.status ?? 'scheduled',
        village: body.village,
        specialization: body.specialization,
        reason: body.reason,
        priority: body.priority,
        symptoms: body.symptoms,
        notes: body.notes,
        meetingLink: body.meetingLink,
        reminderSent: false,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString()
      }
    };
  });

  res.status(201).json(payload);
});

const patchSchema = z.object({
  status: z.enum(['available', 'scheduled', 'ongoing', 'completed', 'cancelled', 'no_show']).optional(),
  notes: z.string().optional(),
  meetingLink: z.string().optional(),
  review: z.number().int().min(1).max(5).optional(),
  reminderSent: z.boolean().optional()
});

appointmentsRouter.patch('/:id', requireAuth, async (req, res) => {
  const body = parseBody(patchSchema, req.body);
  const id = req.params.id;
  const role = req.user!.role;
  const actorId = req.user!.id;

  const payload = await withRequestDb(req, async (tx) => {
    const existing = await tx.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        healthWorkerId: true,
        notesEnc: true,
        status: true
      }
    });
    if (!existing) throw notFound();

    const isParticipant =
      existing.patientId === actorId ||
      existing.doctorId === actorId ||
      (existing.healthWorkerId && existing.healthWorkerId === actorId);

    if (!(role === UserRole.ADMIN || isParticipant)) throw forbidden();

    // Patients can only add review, not change status.
    if (role === UserRole.PATIENT && (body.status || body.meetingLink)) throw forbidden();

    const updated = await tx.appointment.update({
      where: { id },
      data: {
        status: body.status ? mapStatus(body.status) : undefined,
        notesEnc: body.notes ? encryptString(body.notes) : undefined,
        meetingLink: body.meetingLink ?? undefined,
        review: body.review,
        reminderSent: body.reminderSent,
        version: { increment: 1 }
      },
      select: {
        id: true,
        version: true,
        status: true,
        notesEnc: true,
        meetingLink: true,
        review: true,
        reminderSent: true,
        updatedAt: true,
        scheduledAt: true,
        durationMinutes: true,
        type: true,
        priority: true,
        patientId: true,
        doctorId: true,
        healthWorkerId: true,
        village: true,
        specialization: true,
        symptoms: true,
        createdAt: true
      }
    });

    await writeAuditLog({
      req,
      db: tx,
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'Appointment',
      entityId: id,
      before: { status: existing.status, notesEnc: existing.notesEnc },
      after: { status: updated.status, notesEnc: updated.notesEnc }
    });

    const { date, time } = splitDateTime(updated.scheduledAt);
    return {
      appointment: {
        id: updated.id,
        version: updated.version,
        patientId: updated.patientId,
        doctorId: updated.doctorId,
        healthWorkerId: updated.healthWorkerId ?? undefined,
        patientName: '',
        doctorName: '',
        date,
        time,
        duration: updated.durationMinutes,
        type: updated.type,
        status: unmapStatus(updated.status),
        village: updated.village ?? undefined,
        specialization: updated.specialization ?? undefined,
        review: updated.review ?? undefined,
        reason: '',
        priority: updated.priority as 'low' | 'medium' | 'high' | 'urgent',
        symptoms: updated.symptoms.length ? updated.symptoms : undefined,
        notes: updated.notesEnc ? decryptString(updated.notesEnc) : undefined,
        meetingLink: updated.meetingLink ?? undefined,
        reminderSent: updated.reminderSent,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString()
      }
    };
  });

  res.json(payload);
});
