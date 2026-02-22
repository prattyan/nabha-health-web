import type { Request } from 'express';
import { prisma } from './db.js';
import { AuditAction } from '@prisma/client';
import type { Prisma } from '@prisma/client';

function getIp(req: Request): string | undefined {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string') return xf.split(',')[0]?.trim();
  return req.socket.remoteAddress ?? undefined;
}

export async function writeAuditLog(params: {
  req: Request;
  db?: Prisma.TransactionClient;
  actorId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  const { req, db, actorId, action, entityType, entityId, before, after } = params;
  const client = db ?? prisma;
  await client.auditLog.create({
    data: {
      actorId: actorId ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      beforeJson: before ? (before as never) : undefined,
      afterJson: after ? (after as never) : undefined,
      ip: getIp(req),
      userAgent: req.headers['user-agent']?.toString()
    }
  });
}
