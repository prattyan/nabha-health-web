import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from './db.js';

export type DbTx = Prisma.TransactionClient;

async function setRlsContext(tx: DbTx, req: Request): Promise<void> {
  // RLS policies read these settings via current_setting(..., true)
  if (!req.user) return;

  await tx.$executeRaw`
    SELECT
      set_config('app.user_id', ${req.user.id}, true),
      set_config('app.user_role', ${String(req.user.role)}, true)
  `;
}

export async function withRequestDb<T>(req: Request, fn: (tx: DbTx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await setRlsContext(tx, req);
    return fn(tx);
  });
}
