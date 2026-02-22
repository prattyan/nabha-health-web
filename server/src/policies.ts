import { UserRole } from '@prisma/client';
import { forbidden } from './http/errors.js';

export function assertRoleAllowed(role: UserRole, allowed: UserRole[]) {
  if (!allowed.includes(role)) throw forbidden();
}

export function canAccessPatient(role: UserRole, actorId: string, patientId: string): boolean {
  if (role === UserRole.ADMIN) return true;
  if (role === UserRole.PATIENT) return actorId === patientId;
  // Doctors/health workers access is constrained per-resource using joins.
  return role === UserRole.DOCTOR || role === UserRole.HEALTH_WORKER;
}
