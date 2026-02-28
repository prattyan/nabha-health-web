import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../http/authMiddleware.js';
import { parseBody } from '../http/validate.js';
import { badRequest, forbidden } from '../http/errors.js';
import { AuditAction, UserRole } from '@prisma/client';
import { writeAuditLog } from '../audit.js';
import { decryptString, encryptString } from '../security/crypto.js';
import { requireRole } from '../http/rbac.js';
import { withRequestDb } from '../requestContext.js';

export const syncRouter = Router();

const adminListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor: z.string().min(1).optional()
});

const allowedInventoryRoles: UserRole[] = [UserRole.PHARMACY, UserRole.HEALTH_WORKER, UserRole.ADMIN];

const allowedAppointmentCreators: UserRole[] = [UserRole.PATIENT, UserRole.HEALTH_WORKER, UserRole.ADMIN];

function toScheduledAt(date: string, time: string): Date {
  const dt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(dt.getTime())) throw badRequest('Invalid date/time');
  return dt;
}

function splitDateTime(scheduledAt: Date): { date: string; time: string } {
  const iso = scheduledAt.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function mapStatus(status?: string) {
  switch (status) {
    case 'available':
      return 'AVAILABLE';
    case 'scheduled':
      return 'SCHEDULED';
    case 'ongoing':
      return 'ONGOING';
    case 'completed':
      return 'COMPLETED';
    case 'cancelled':
      return 'CANCELLED';
    case 'no_show':
      return 'NO_SHOW';
    default:
      return 'SCHEDULED';
  }
}

function unmapStatus(status: string) {
  switch (status) {
    case 'AVAILABLE':
      return 'available';
    case 'SCHEDULED':
      return 'scheduled';
    case 'ONGOING':
      return 'ongoing';
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
    case 'NO_SHOW':
      return 'no_show';
    default:
      return 'scheduled';
  }
}

function mapPrescriptionStatus(status?: string) {
  switch (status) {
    case 'completed':
      return 'COMPLETED';
    case 'cancelled':
      return 'CANCELLED';
    case 'active':
    default:
      return 'ACTIVE';
  }
}

const ensurePlainObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  throw badRequest('Invalid data payload', 'VALIDATION_ERROR');
};

const opSchema = z.object({
  opId: z.string().min(1),
  entity: z.enum(['Appointment', 'EhrRecord', 'Prescription', 'PharmacyInventoryItem', 'AiTriageLog', 'FollowUpVisit']),
  action: z.enum(['upsert', 'delete']),
  entityId: z.string().optional(),
  baseVersion: z.number().int().positive().optional(),
  data: z.any().optional(),
  clientTimestamp: z.number().int().optional()
});

const triageDtoSchema = z.object({
  id: z.string().min(1).optional(),
  patientId: z.string().min(1).optional(),
  symptoms: z.array(z.string()).min(1),
  result: z.any(),
  latencyMs: z.number().int().optional(),
  source: z.string().optional(),
  createdAt: z.string().optional()
});

const followUpDtoSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  workerId: z.string().min(1).optional(),
  scheduledAt: z.string().min(10),
  status: z.string().min(1),
  village: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().int().positive().optional()
});

const appointmentDtoSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  healthWorkerId: z.string().optional(),
  patientName: z.string().optional(),
  doctorName: z.string().optional(),
  date: z.string().min(10),
  time: z.string().min(4),
  duration: z.number().int().positive(),
  type: z.string().min(1),
  status: z.enum(['available', 'scheduled', 'ongoing', 'completed', 'cancelled', 'no_show']).optional(),
  village: z.string().optional(),
  specialization: z.string().optional(),
  prescriptionId: z.string().optional(),
  review: z.number().int().min(1).max(5).optional(),
  reason: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  symptoms: z.array(z.string()).optional(),
  notes: z.string().optional(),
  meetingLink: z.string().optional(),
  reminderSent: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().int().positive().optional()
});

const inventoryDtoSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().nonnegative(),
  unit: z.string().min(1),
  minStockLevel: z.number().int().nonnegative(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  lastUpdated: z.string().optional(),
  version: z.number().int().positive().optional()
});

const ehrDtoSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  doctorId: z.string().optional(),
  healthWorkerId: z.string().optional(),
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
  followUpDate: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().int().positive().optional()
});

const rxMedicineSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  quantity: z.number().int().nonnegative().optional(),
  timesToTake: z.array(z.string()).optional()
});

const rxDtoSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  patientName: z.string().optional(),
  doctorId: z.string().optional(),
  appointmentId: z.string().optional(),
  date: z.string().min(10),
  diagnosis: z.string().min(1),
  symptoms: z.string().min(1),
  medicines: z.array(rxMedicineSchema).min(1),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  vitalSigns: z.any().optional(),
  attachments: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().int().positive().optional()
});

const pushSchema = z.object({
  deviceId: z.string().min(1),
  ops: z.array(opSchema).max(500)
});

syncRouter.post('/push', requireAuth, async (req, res) => {
  const body = parseBody(pushSchema, req.body);
  const actorId = req.user!.id;
  const role = req.user!.role;

  const payload = await withRequestDb(req, async (tx) => {
    const applied: Array<{ opId: string; entityId: string; newVersion: number }> = [];
    const conflicts: Array<{ opId: string; entityId: string; serverVersion: number; reason: string; serverData?: unknown }> = [];

    for (const op of body.ops) {
      try {
        if (op.entity === 'PharmacyInventoryItem' && !allowedInventoryRoles.includes(role)) {
          throw forbidden();
        }

        if (op.entity === 'Appointment') {
          if (op.action === 'delete') throw badRequest('Delete not supported for Appointment');
          const dataObj = ensurePlainObject(op.data);
          const dto = appointmentDtoSchema.parse({ ...dataObj, id: (op.entityId as string | undefined) ?? dataObj.id });
          const entityId = dto.id;
          if (!entityId) throw badRequest('Missing entityId');

          if (dto.patientId !== actorId && role === UserRole.PATIENT) throw forbidden();
          if (!allowedAppointmentCreators.includes(role)) throw forbidden();

          const existing = await tx.appointment.findUnique({
            where: { id: entityId },
            select: { id: true, version: true, patientId: true, doctorId: true, healthWorkerId: true }
          });
          if (existing) {
            // Conflict detection
            if (op.baseVersion && existing.version !== op.baseVersion) {
              const serverRow = await tx.appointment.findUnique({
                where: { id: entityId },
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
                  reasonEnc: true,
                  notesEnc: true,
                  meetingLink: true,
                  reminderSent: true,
                  review: true,
                  createdAt: true,
                  updatedAt: true
                }
              });
              const serverData = serverRow
                ? (() => {
                    const { date, time } = splitDateTime(serverRow.scheduledAt);
                    return {
                      id: serverRow.id,
                      version: serverRow.version,
                      patientId: serverRow.patientId,
                      doctorId: serverRow.doctorId,
                      healthWorkerId: serverRow.healthWorkerId ?? undefined,
                      patientName: '',
                      doctorName: '',
                      date,
                      time,
                      duration: serverRow.durationMinutes,
                      type: serverRow.type,
                      status: unmapStatus(serverRow.status as unknown as string),
                      village: serverRow.village ?? undefined,
                      specialization: serverRow.specialization ?? undefined,
                      prescriptionId: undefined,
                      review: serverRow.review ?? undefined,
                      reason: serverRow.reasonEnc ? decryptString(serverRow.reasonEnc) : '',
                      priority: serverRow.priority as 'low' | 'medium' | 'high' | 'urgent',
                      symptoms: serverRow.symptoms.length ? serverRow.symptoms : undefined,
                      notes: serverRow.notesEnc ? decryptString(serverRow.notesEnc) : undefined,
                      meetingLink: serverRow.meetingLink ?? undefined,
                      reminderSent: serverRow.reminderSent,
                      createdAt: serverRow.createdAt.toISOString(),
                      updatedAt: serverRow.updatedAt.toISOString()
                    };
                  })()
                : undefined;
              conflicts.push({ opId: op.opId, entityId, serverVersion: existing.version, reason: 'VERSION_MISMATCH', serverData });
              continue;
            }

            const isParticipant =
              existing.patientId === actorId ||
              existing.doctorId === actorId ||
              (existing.healthWorkerId && existing.healthWorkerId === actorId);
            if (!(role === UserRole.ADMIN || isParticipant)) throw forbidden();

            const scheduledAt = toScheduledAt(dto.date, dto.time);
            const updated = await tx.appointment.update({
              where: { id: entityId },
              data: {
                patientId: dto.patientId,
                doctorId: dto.doctorId,
                healthWorkerId: dto.healthWorkerId ?? null,
                scheduledAt,
                durationMinutes: dto.duration,
                type: dto.type,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                status: mapStatus(dto.status) as any,
                priority: dto.priority,
                reasonEnc: encryptString(dto.reason),
                notesEnc: dto.notes ? encryptString(dto.notes) : null,
                village: dto.village ?? null,
                specialization: dto.specialization ?? null,
                meetingLink: dto.meetingLink ?? null,
                symptoms: dto.symptoms ?? [],
                reminderSent: dto.reminderSent ?? false,
                review: dto.review ?? null,
                version: { increment: 1 }
              },
              select: { id: true, version: true }
            });
            applied.push({ opId: op.opId, entityId, newVersion: updated.version });
            continue;
          }

          // Create
          const scheduledAt = toScheduledAt(dto.date, dto.time);
          const created = await tx.appointment.create({
            data: {
              id: entityId,
              patientId: dto.patientId,
              doctorId: dto.doctorId,
              healthWorkerId: dto.healthWorkerId ?? null,
              scheduledAt,
              durationMinutes: dto.duration,
              type: dto.type,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              status: mapStatus(dto.status) as any,
              priority: dto.priority,
              reasonEnc: encryptString(dto.reason),
              notesEnc: dto.notes ? encryptString(dto.notes) : null,
              village: dto.village ?? null,
              specialization: dto.specialization ?? null,
              meetingLink: dto.meetingLink ?? null,
              symptoms: dto.symptoms ?? [],
              reminderSent: dto.reminderSent ?? false,
              review: dto.review ?? null
            },
            select: { id: true, version: true }
          });
          applied.push({ opId: op.opId, entityId: created.id, newVersion: created.version });
          continue;
        }

        if (op.entity === 'EhrRecord') {
          if (op.action === 'delete') throw badRequest('Delete not supported for EhrRecord');
          const dataObj = ensurePlainObject(op.data);
          const dto = ehrDtoSchema.parse({ ...dataObj, id: (op.entityId as string | undefined) ?? dataObj.id });
          const entityId = dto.id;
          if (!entityId) throw badRequest('Missing entityId');
          const allowedEhrCreators: UserRole[] = [UserRole.DOCTOR, UserRole.HEALTH_WORKER, UserRole.ADMIN];
          if (!allowedEhrCreators.includes(role)) throw forbidden();

          const encounterAt = new Date(`${dto.date}T00:00:00Z`);
          if (Number.isNaN(encounterAt.getTime())) throw badRequest('Invalid date');

          const followUpAtParsed = dto.followUpDate ? new Date(`${dto.followUpDate}T00:00:00Z`) : null;
          if (dto.followUpDate && followUpAtParsed && Number.isNaN(followUpAtParsed.getTime())) throw badRequest('Invalid followUpDate');

          const existing = await tx.ehrRecord.findUnique({ where: { id: entityId }, select: { id: true, version: true, createdById: true } });
          if (existing) {
            if (op.baseVersion && existing.version !== op.baseVersion) {
              const serverRow = await tx.ehrRecord.findUnique({
                where: { id: entityId },
                select: {
                  id: true,
                  version: true,
                  patientId: true,
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
              const serverData = serverRow
                ? {
                    id: serverRow.id,
                    version: serverRow.version,
                    patientId: serverRow.patientId,
                    doctorId: undefined,
                    healthWorkerId: undefined,
                    recordType: serverRow.recordType,
                    title: serverRow.title,
                    description: decryptString(serverRow.descriptionEnc),
                    date: serverRow.encounterAt.toISOString().slice(0, 10),
                    diagnosis: serverRow.diagnosisEnc ? decryptString(serverRow.diagnosisEnc) : undefined,
                    notes: serverRow.notesEnc ? decryptString(serverRow.notesEnc) : undefined,
                    attachments: (serverRow.attachmentsJson as unknown as string[] | null) ?? undefined,
                    vitalSigns: (serverRow.vitalsJson as unknown) ?? undefined,
                    testResults: (serverRow.testResultsJson as unknown) ?? undefined,
                    followUpRequired: serverRow.followUpRequired,
                    followUpDate: serverRow.followUpAt ? serverRow.followUpAt.toISOString().slice(0, 10) : undefined,
                    createdAt: serverRow.createdAt.toISOString(),
                    updatedAt: serverRow.updatedAt.toISOString()
                  }
                : undefined;
              conflicts.push({ opId: op.opId, entityId, serverVersion: existing.version, reason: 'VERSION_MISMATCH', serverData });
              continue;
            }
            if (!(role === UserRole.ADMIN || existing.createdById === actorId)) throw forbidden();
            const updated = await tx.ehrRecord.update({
              where: { id: entityId },
              data: {
                patientId: dto.patientId,
                encounterAt,
                recordType: dto.recordType,
                title: dto.title,
                descriptionEnc: encryptString(dto.description),
                diagnosisEnc: dto.diagnosis ? encryptString(dto.diagnosis) : null,
                notesEnc: dto.notes ? encryptString(dto.notes) : null,
                vitalsJson: dto.vitalSigns ? (dto.vitalSigns as never) : undefined,
                attachmentsJson: dto.attachments ? (dto.attachments as never) : undefined,
                testResultsJson: dto.testResults ? (dto.testResults as never) : undefined,
                followUpRequired: dto.followUpRequired ?? false,
                followUpAt: followUpAtParsed,
                version: { increment: 1 }
              },
              select: { id: true, version: true }
            });
            applied.push({ opId: op.opId, entityId, newVersion: updated.version });
            continue;
          }
          const created = await tx.ehrRecord.create({
            data: {
              id: entityId,
              patientId: dto.patientId,
              createdById: actorId,
              encounterAt,
              recordType: dto.recordType,
              title: dto.title,
              descriptionEnc: encryptString(dto.description),
              diagnosisEnc: dto.diagnosis ? encryptString(dto.diagnosis) : null,
              notesEnc: dto.notes ? encryptString(dto.notes) : null,
              vitalsJson: dto.vitalSigns ? (dto.vitalSigns as never) : undefined,
              attachmentsJson: dto.attachments ? (dto.attachments as never) : undefined,
              testResultsJson: dto.testResults ? (dto.testResults as never) : undefined,
              followUpRequired: dto.followUpRequired ?? false,
              followUpAt: followUpAtParsed
            },
            select: { id: true, version: true }
          });
          applied.push({ opId: op.opId, entityId: created.id, newVersion: created.version });
          continue;
        }

        if (op.entity === 'Prescription') {
          if (op.action === 'delete') throw badRequest('Delete not supported for Prescription');
          const dataObj = ensurePlainObject(op.data);
          const dto = rxDtoSchema.parse({ ...dataObj, id: (op.entityId as string | undefined) ?? dataObj.id });
          const entityId = dto.id;
          if (!entityId) throw badRequest('Missing entityId');
          const allowedRxCreators: UserRole[] = [UserRole.DOCTOR, UserRole.ADMIN];
          if (!allowedRxCreators.includes(role)) throw forbidden();

          const issuedAt = new Date(`${dto.date}T00:00:00Z`);
          if (Number.isNaN(issuedAt.getTime())) throw badRequest('Invalid date');
          const followUpAt = dto.followUpDate ? new Date(`${dto.followUpDate}T00:00:00Z`) : null;
          if (dto.followUpDate && followUpAt && Number.isNaN(followUpAt.getTime())) throw badRequest('Invalid followUpDate');

          const existing = await tx.prescription.findUnique({ where: { id: entityId }, select: { id: true, version: true, doctorId: true } });
          if (existing) {
            if (op.baseVersion && existing.version !== op.baseVersion) {
              const serverRow = await tx.prescription.findUnique({
                where: { id: entityId },
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
                  patient: { select: { firstName: true, lastName: true } },
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
              const serverData = serverRow
                ? {
                    id: serverRow.id,
                    version: serverRow.version,
                    patientId: serverRow.patientId,
                    patientName: serverRow.patient ? `${serverRow.patient.firstName ?? ''} ${serverRow.patient.lastName ?? ''}`.trim() : '',
                    doctorId: serverRow.doctorId,
                    appointmentId: serverRow.appointmentId ?? '',
                    date: serverRow.issuedAt.toISOString().slice(0, 10),
                    diagnosis: serverRow.diagnosisEnc ? decryptString(serverRow.diagnosisEnc) : '',
                    symptoms: serverRow.symptomsEnc ? decryptString(serverRow.symptomsEnc) : '',
                    medicines: serverRow.items.map((i) => ({
                      id: i.id,
                      name: i.medicineName,
                      dosage: i.dosage ?? '',
                      frequency: i.frequency ?? '',
                      duration: i.duration ?? '',
                      instructions: i.instructions ?? '',
                      quantity: i.quantity ?? 0,
                      timesToTake: i.timesToTake ?? []
                    })),
                    notes: serverRow.notesEnc ? decryptString(serverRow.notesEnc) : '',
                    followUpDate: serverRow.followUpAt ? serverRow.followUpAt.toISOString().slice(0, 10) : undefined,
                    status: String(serverRow.status).toLowerCase(),
                    vitalSigns: (serverRow.vitalSignsJson as unknown) ?? undefined,
                    attachments: (serverRow.attachmentsJson as unknown as string[] | null) ?? undefined,
                    createdAt: serverRow.createdAt.toISOString(),
                    updatedAt: serverRow.updatedAt.toISOString()
                  }
                : undefined;
              conflicts.push({ opId: op.opId, entityId, serverVersion: existing.version, reason: 'VERSION_MISMATCH', serverData });
              continue;
            }
            if (!(role === UserRole.ADMIN || existing.doctorId === actorId)) throw forbidden();

            await tx.prescriptionItem.deleteMany({ where: { prescriptionId: entityId } });
            const updated = await tx.prescription.update({
              where: { id: entityId },
              data: {
                patientId: dto.patientId,
                doctorId: actorId,
                appointmentId: dto.appointmentId ? dto.appointmentId : null,
                issuedAt,
                followUpAt,
                diagnosisEnc: encryptString(dto.diagnosis),
                symptomsEnc: encryptString(dto.symptoms),
                notesEnc: dto.notes ? encryptString(dto.notes) : null,
                vitalSignsJson: dto.vitalSigns ? (dto.vitalSigns as never) : undefined,
                attachmentsJson: dto.attachments ? (dto.attachments as never) : undefined,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                status: mapPrescriptionStatus(dto.status) as any,
                items: {
                  create: dto.medicines.map((m) => ({
                    medicineName: m.name,
                    dosage: m.dosage,
                    frequency: m.frequency,
                    duration: m.duration,
                    instructions: m.instructions,
                    quantity: m.quantity,
                    timesToTake: m.timesToTake ?? []
                  }))
                },
                version: { increment: 1 }
              },
              select: { id: true, version: true }
            });
            applied.push({ opId: op.opId, entityId, newVersion: updated.version });
            continue;
          }

          const created = await tx.prescription.create({
            data: {
              id: entityId,
              patientId: dto.patientId,
              doctorId: actorId,
              appointmentId: dto.appointmentId ? dto.appointmentId : null,
              issuedAt,
              followUpAt,
              diagnosisEnc: encryptString(dto.diagnosis),
              symptomsEnc: encryptString(dto.symptoms),
              notesEnc: dto.notes ? encryptString(dto.notes) : null,
              vitalSignsJson: dto.vitalSigns ? (dto.vitalSigns as never) : undefined,
              attachmentsJson: dto.attachments ? (dto.attachments as never) : undefined,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              status: mapPrescriptionStatus(dto.status) as any,
              items: {
                create: dto.medicines.map((m) => ({
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
            select: { id: true, version: true }
          });
          applied.push({ opId: op.opId, entityId: created.id, newVersion: created.version });
          continue;
        }

        if (op.entity === 'PharmacyInventoryItem') {
          const dataObj = ensurePlainObject(op.data);
          const dto = inventoryDtoSchema.parse(dataObj);
          const pharmacyId = role === UserRole.ADMIN && typeof dataObj.pharmacyId === 'string' ? dataObj.pharmacyId : actorId;
          if (role !== UserRole.ADMIN && pharmacyId !== actorId) throw forbidden();

          const existing = await tx.pharmacyInventoryItem.findUnique({
            where: { pharmacyId_sku: { pharmacyId, sku: dto.sku } },
            select: { id: true, version: true, pharmacyId: true }
          });

          if (existing) {
            if (op.baseVersion && existing.version !== op.baseVersion) {
              const serverRow = await tx.pharmacyInventoryItem.findUnique({
                where: { id: existing.id },
                select: {
                  id: true,
                  version: true,
                  name: true,
                  sku: true,
                  quantity: true,
                  unit: true,
                  minStockLevel: true,
                  batchNumber: true,
                  expiryDate: true,
                  lastUpdatedAt: true
                }
              });
              const serverData = serverRow
                ? {
                    id: serverRow.id,
                    version: serverRow.version,
                    name: serverRow.name,
                    sku: serverRow.sku,
                    quantity: serverRow.quantity,
                    unit: serverRow.unit,
                    minStockLevel: serverRow.minStockLevel,
                    batchNumber: serverRow.batchNumber ?? undefined,
                    expiryDate: serverRow.expiryDate ? serverRow.expiryDate.toISOString().slice(0, 10) : undefined,
                    lastUpdated: serverRow.lastUpdatedAt.toISOString()
                  }
                : undefined;
              conflicts.push({ opId: op.opId, entityId: existing.id, serverVersion: existing.version, reason: 'VERSION_MISMATCH', serverData });
              continue;
            }
            if (!(role === UserRole.ADMIN || existing.pharmacyId === actorId)) throw forbidden();

            if (op.action === 'delete') {
              const deleted = await tx.pharmacyInventoryItem.update({
                where: { id: existing.id },
                data: { deletedAt: new Date(), version: { increment: 1 } },
                select: { id: true, version: true }
              });
              applied.push({ opId: op.opId, entityId: deleted.id, newVersion: deleted.version });
              continue;
            }

            const updated = await tx.pharmacyInventoryItem.update({
              where: { id: existing.id },
              data: {
                name: dto.name,
                quantity: dto.quantity,
                unit: dto.unit,
                minStockLevel: dto.minStockLevel,
                batchNumber: dto.batchNumber ?? null,
                expiryDate: dto.expiryDate ? new Date(`${dto.expiryDate}T00:00:00Z`) : null,
                lastUpdatedAt: new Date(),
                version: { increment: 1 }
              },
              select: { id: true, version: true }
            });
            applied.push({ opId: op.opId, entityId: updated.id, newVersion: updated.version });
            continue;
          }

          if (op.action === 'delete') {
            applied.push({ opId: op.opId, entityId: dto.sku, newVersion: 0 });
            continue;
          }

          const created = await tx.pharmacyInventoryItem.create({
            data: {
              pharmacyId,
              sku: dto.sku,
              name: dto.name,
              quantity: dto.quantity,
              unit: dto.unit,
              minStockLevel: dto.minStockLevel,
              batchNumber: dto.batchNumber ?? null,
              expiryDate: dto.expiryDate ? new Date(`${dto.expiryDate}T00:00:00Z`) : null
            },
            select: { id: true, version: true }
          });
          applied.push({ opId: op.opId, entityId: created.id, newVersion: created.version });
          continue;
        }

        if (op.entity === 'AiTriageLog') {
          if (op.action === 'delete') throw badRequest('Delete not supported for AiTriageLog');
          // Allow any authenticated user to log triage results; patientId is optional.
          const dataObj = ensurePlainObject(op.data);
          const dto = triageDtoSchema.parse(dataObj);
          const entityId = (op.entityId as string | undefined) ?? dto.id;
          if (!entityId) throw badRequest('Missing entityId');

          const existing = await tx.aiTriageLog.findUnique({ where: { id: entityId }, select: { id: true } });
          if (existing) {
            applied.push({ opId: op.opId, entityId, newVersion: 1 });
            continue;
          }

          await tx.aiTriageLog.create({
            data: {
              id: entityId,
              patientId: dto.patientId ?? null,
              createdById: actorId,
              symptoms: dto.symptoms,
              resultJson: dto.result as never,
              latencyMs: dto.latencyMs,
              source: dto.source
            },
            select: { id: true }
          });

          applied.push({ opId: op.opId, entityId, newVersion: 1 });
          continue;
        }

        if (op.entity === 'FollowUpVisit') {
          if (op.action === 'delete') throw badRequest('Delete not supported for FollowUpVisit');
          const dataObj = ensurePlainObject(op.data);
          const dto = followUpDtoSchema.parse({ ...dataObj, id: (op.entityId as string | undefined) ?? dataObj.id });
          const entityId = dto.id;
          const allowedCreators: UserRole[] = [UserRole.HEALTH_WORKER, UserRole.ADMIN];
          if (!allowedCreators.includes(role)) throw forbidden();

          const scheduledAt = new Date(dto.scheduledAt);
          if (Number.isNaN(scheduledAt.getTime())) throw badRequest('Invalid scheduledAt');

          const existing = await tx.followUpVisit.findUnique({ where: { id: entityId }, select: { id: true, version: true, workerId: true } });
          if (existing) {
            if (op.baseVersion && existing.version !== op.baseVersion) {
              const serverRow = await tx.followUpVisit.findUnique({
                where: { id: entityId },
                select: {
                  id: true,
                  version: true,
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
              const serverData = serverRow
                ? {
                    id: serverRow.id,
                    version: serverRow.version,
                    patientId: serverRow.patientId,
                    workerId: serverRow.workerId,
                    scheduledAt: serverRow.scheduledAt.toISOString(),
                    status: serverRow.status,
                    village: serverRow.village ?? undefined,
                    notes: serverRow.notesEnc ? decryptString(serverRow.notesEnc) : undefined,
                    createdAt: serverRow.createdAt.toISOString(),
                    updatedAt: serverRow.updatedAt.toISOString()
                  }
                : undefined;
              conflicts.push({ opId: op.opId, entityId, serverVersion: existing.version, reason: 'VERSION_MISMATCH', serverData });
              continue;
            }
            if (!(role === UserRole.ADMIN || existing.workerId === actorId)) throw forbidden();
            const updated = await tx.followUpVisit.update({
              where: { id: entityId },
              data: {
                patientId: dto.patientId,
                workerId: role === UserRole.ADMIN ? (dto.workerId ?? existing.workerId) : actorId,
                scheduledAt,
                status: dto.status,
                village: dto.village ?? null,
                notesEnc: dto.notes ? encryptString(dto.notes) : null,
                version: { increment: 1 }
              },
              select: { id: true, version: true }
            });
            applied.push({ opId: op.opId, entityId, newVersion: updated.version });
            continue;
          }

          const created = await tx.followUpVisit.create({
            data: {
              id: entityId,
              patientId: dto.patientId,
              workerId: role === UserRole.ADMIN ? (dto.workerId ?? actorId) : actorId,
              scheduledAt,
              status: dto.status,
              village: dto.village ?? null,
              notesEnc: dto.notes ? encryptString(dto.notes) : null
            },
            select: { id: true, version: true }
          });
          applied.push({ opId: op.opId, entityId: created.id, newVersion: created.version });
          continue;
        }
      } catch {
        conflicts.push({ opId: op.opId, entityId: op.entityId ?? 'unknown', serverVersion: 0, reason: 'REJECTED' });
      }
    }

    await tx.syncHistory.upsert({
      where: { userId_deviceId: { userId: actorId, deviceId: body.deviceId } },
      update: { lastPushedAt: new Date() },
      create: { userId: actorId, deviceId: body.deviceId, lastPushedAt: new Date() }
    });

    await writeAuditLog({
      req,
      db: tx,
      actorId,
      action: AuditAction.SYNC_PUSH,
      entityType: 'Sync',
      entityId: body.deviceId,
      after: { applied: applied.length, conflicts: conflicts.length }
    });

    return { applied, conflicts };
  });

  res.json(payload);
});

const pullSchema = z.object({
  deviceId: z.string().min(1),
  since: z.string().optional()
});

syncRouter.get('/pull', requireAuth, async (req, res) => {
  const parsed = pullSchema.safeParse(req.query);
  if (!parsed.success) throw badRequest('Validation error', 'VALIDATION_ERROR');

  const actorId = req.user!.id;
  const role = req.user!.role;
  const since = parsed.data.since ? new Date(parsed.data.since) : null;
  const sinceFilter = since && !Number.isNaN(since.getTime()) ? { gt: since } : undefined;

  const payload = await withRequestDb(req, async (tx) => {
    const appointmentRows = await tx.appointment.findMany({
      where: {
        deletedAt: null,
        ...(role === UserRole.PATIENT ? { patientId: actorId } : {}),
        ...(role === UserRole.DOCTOR ? { doctorId: actorId } : {}),
        ...(role === UserRole.HEALTH_WORKER ? { healthWorkerId: actorId } : {}),
        ...(sinceFilter ? { updatedAt: sinceFilter } : {})
      },
      take: 500,
      orderBy: [{ updatedAt: 'asc' }],
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
        reasonEnc: true,
        notesEnc: true,
        meetingLink: true,
        reminderSent: true,
        review: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const appointments = appointmentRows.map((r) => {
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
        status: unmapStatus(r.status as unknown as string),
        village: r.village ?? undefined,
        specialization: r.specialization ?? undefined,
        prescriptionId: undefined,
        review: r.review ?? undefined,
        reason: r.reasonEnc ? decryptString(r.reasonEnc) : '',
        priority: r.priority as 'low' | 'medium' | 'high' | 'urgent',
        symptoms: r.symptoms.length ? r.symptoms : undefined,
        notes: r.notesEnc ? decryptString(r.notesEnc) : undefined,
        meetingLink: r.meetingLink ?? undefined,
        reminderSent: r.reminderSent,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString()
      };
    });

    const inventoryRows = allowedInventoryRoles.includes(role)
      ? await tx.pharmacyInventoryItem.findMany({
          where: {
            deletedAt: null,
            pharmacyId: actorId,
            ...(sinceFilter ? { updatedAt: sinceFilter } : {})
          },
          take: 500,
          orderBy: [{ updatedAt: 'asc' }],
          select: {
            id: true,
            version: true,
            name: true,
            sku: true,
            quantity: true,
            unit: true,
            minStockLevel: true,
            batchNumber: true,
            expiryDate: true,
            lastUpdatedAt: true
          }
        })
      : [];

    const inventory = inventoryRows.map((i) => ({
      id: i.id,
      version: i.version,
      name: i.name,
      sku: i.sku,
      quantity: i.quantity,
      unit: i.unit,
      minStockLevel: i.minStockLevel,
      batchNumber: i.batchNumber ?? undefined,
      expiryDate: i.expiryDate ? i.expiryDate.toISOString().slice(0, 10) : undefined,
      lastUpdated: i.lastUpdatedAt.toISOString()
    }));

    const ehrWhere: Record<string, unknown> = { deletedAt: null };
    const patientId = typeof req.query.patientId === 'string' ? req.query.patientId : undefined;
    if (role === UserRole.PATIENT) {
      ehrWhere.patientId = actorId;
    } else if (role === UserRole.DOCTOR || role === UserRole.HEALTH_WORKER) {
      if (patientId) ehrWhere.patientId = patientId;
      else ehrWhere.createdById = actorId;
    } else if (patientId) {
      ehrWhere.patientId = patientId;
    }
    if (sinceFilter) ehrWhere.updatedAt = sinceFilter;

    const ehrRows = await tx.ehrRecord.findMany({
      where: ehrWhere as never,
      orderBy: [{ updatedAt: 'asc' }],
      take: 500,
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

    const records = ehrRows.map((r) => ({
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

    const rxWhere: Record<string, unknown> = { deletedAt: null };
    if (role === UserRole.PATIENT) rxWhere.patientId = actorId;
    if (role === UserRole.DOCTOR) rxWhere.doctorId = actorId;
    if (role === UserRole.HEALTH_WORKER) {
      // keep empty for HW
      rxWhere.id = '__none__';
    }
    if (sinceFilter) rxWhere.updatedAt = sinceFilter;

    const rxRows = rxWhere.id === '__none__'
      ? []
      : await tx.prescription.findMany({
          where: rxWhere as never,
          orderBy: [{ updatedAt: 'asc' }],
          take: 500,
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

interface SyncMedicineItem {
  id: string;
  medicineName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  quantity?: number;
  timesToTake?: string[];
}

interface SyncPrescriptionRow {
  id: string;
  version: number;
  patientId: string;
  patient?: { firstName?: string; lastName?: string };
  doctorId: string;
  appointmentId?: string;
  issuedAt: Date;
  diagnosisEnc?: string;
  symptomsEnc?: string;
  items: SyncMedicineItem[];
  notesEnc?: string;
  followUpAt?: Date;
  status: string;
  vitalSignsJson?: unknown;
  attachmentsJson?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const prescriptions = (rxRows as unknown as SyncPrescriptionRow[]).map((p) => ({
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

    const triageWhere: Record<string, unknown> = {};
    if (role === UserRole.PATIENT) triageWhere.patientId = actorId;
    if (role === UserRole.HEALTH_WORKER) triageWhere.createdById = actorId;
    if (role === UserRole.DOCTOR) {
      // No triage log access for doctors in this API.
      triageWhere.id = '__none__';
    }
    if (sinceFilter) triageWhere.createdAt = sinceFilter;

    const triageRows = triageWhere.id === '__none__'
      ? []
      : await tx.aiTriageLog.findMany({
          where: triageWhere as never,
          orderBy: [{ createdAt: 'asc' }],
          take: 500,
          select: {
            id: true,
            patientId: true,
            symptoms: true,
            resultJson: true,
            latencyMs: true,
            source: true,
            createdAt: true
          }
        });

    const triageLogs = triageRows.map((t) => ({
      id: t.id,
      patientId: t.patientId ?? undefined,
      symptoms: t.symptoms,
      result: t.resultJson,
      latencyMs: t.latencyMs ?? undefined,
      source: t.source ?? undefined,
      createdAt: t.createdAt.toISOString()
    }));

    const followUpWhere: Record<string, unknown> = { deletedAt: null };
    if (role === UserRole.PATIENT) followUpWhere.patientId = actorId;
    if (role === UserRole.HEALTH_WORKER) followUpWhere.workerId = actorId;
    if (role === UserRole.DOCTOR) {
      followUpWhere.id = '__none__';
    }
    if (sinceFilter) followUpWhere.updatedAt = sinceFilter;

    const followUpRows = followUpWhere.id === '__none__'
      ? []
      : await tx.followUpVisit.findMany({
          where: followUpWhere as never,
          orderBy: [{ updatedAt: 'asc' }],
          take: 500,
          select: {
            id: true,
            version: true,
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

    const followups = followUpRows.map((v) => ({
      id: v.id,
      version: v.version,
      patientId: v.patientId,
      workerId: v.workerId,
      scheduledAt: v.scheduledAt.toISOString(),
      status: v.status,
      village: v.village ?? undefined,
      notes: v.notesEnc ? decryptString(v.notesEnc) : undefined,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString()
    }));

    await tx.syncHistory.upsert({
      where: { userId_deviceId: { userId: actorId, deviceId: parsed.data.deviceId } },
      update: { lastPulledAt: new Date() },
      create: { userId: actorId, deviceId: parsed.data.deviceId, lastPulledAt: new Date() }
    });

    await writeAuditLog({
      req,
      db: tx,
      actorId,
      action: AuditAction.SYNC_PULL,
      entityType: 'Sync',
      entityId: parsed.data.deviceId,
      after: {
        appointments: appointments.length,
        ehr: records.length,
        prescriptions: prescriptions.length,
        inventory: inventory.length,
        triageLogs: triageLogs.length,
        followups: followups.length
      }
    });

    return {
      serverTime: new Date().toISOString(),
      appointments,
      records,
      prescriptions,
      inventory,
      triageLogs,
      followups
    };
  });

  res.json(payload);
});

syncRouter.get('/history', requireAuth, requireRole([UserRole.ADMIN]), async (req, res) => {
  const parsed = adminListQuerySchema.safeParse(req.query);
  if (!parsed.success) throw badRequest('Validation error', 'VALIDATION_ERROR');
  const limit = parsed.data.limit ?? 50;

  const payload = await withRequestDb(req, async (tx) => {
    const rows = await tx.syncHistory.findMany({
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(parsed.data.cursor
        ? {
            cursor: { id: parsed.data.cursor },
            skip: 1
          }
        : {}),
      select: {
        id: true,
        userId: true,
        deviceId: true,
        lastPulledAt: true,
        lastPushedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.id : null;

    return {
      history: pageRows.map((r) => ({
        id: r.id,
        userId: r.userId,
        deviceId: r.deviceId,
        lastPulledAt: r.lastPulledAt ? r.lastPulledAt.toISOString() : null,
        lastPushedAt: r.lastPushedAt ? r.lastPushedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString()
      })),
      nextCursor
    };
  });

  res.json(payload);
});

syncRouter.get('/audit', requireAuth, requireRole([UserRole.ADMIN]), async (req, res) => {
  const parsed = adminListQuerySchema.safeParse(req.query);
  if (!parsed.success) throw badRequest('Validation error', 'VALIDATION_ERROR');
  const limit = parsed.data.limit ?? 50;

  const payload = await withRequestDb(req, async (tx) => {
    const rows = await tx.auditLog.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(parsed.data.cursor
        ? {
            cursor: { id: parsed.data.cursor },
            skip: 1
          }
        : {}),
      select: {
        id: true,
        actorId: true,
        action: true,
        entityType: true,
        entityId: true,
        ip: true,
        userAgent: true,
        createdAt: true
      }
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.id : null;

    return {
      audit: pageRows.map((r) => ({
        id: r.id,
        actorId: r.actorId,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        ip: r.ip,
        userAgent: r.userAgent,
        createdAt: r.createdAt.toISOString()
      })),
      nextCursor
    };
  });

  res.json(payload);
});
