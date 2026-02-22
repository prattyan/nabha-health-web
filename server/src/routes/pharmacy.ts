import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../http/authMiddleware.js';
import { parseBody } from '../http/validate.js';
import { forbidden, notFound } from '../http/errors.js';
import { AuditAction, InventoryTransactionType, UserRole } from '@prisma/client';
import { writeAuditLog } from '../audit.js';
import { withRequestDb } from '../requestContext.js';

export const pharmacyRouter = Router();

const allowedPharmacyRoles: UserRole[] = [UserRole.PHARMACY, UserRole.HEALTH_WORKER, UserRole.ADMIN];

pharmacyRouter.get('/inventory', requireAuth, async (req, res) => {
  if (!allowedPharmacyRoles.includes(req.user!.role)) throw forbidden();
  const pharmacyId = req.user!.role === UserRole.ADMIN && typeof req.query.pharmacyId === 'string'
    ? req.query.pharmacyId
    : req.user!.id;

  const payload = await withRequestDb(req, async (tx) => {
    const items = await tx.pharmacyInventoryItem.findMany({
      where: { pharmacyId, deletedAt: null },
      orderBy: [{ name: 'asc' }],
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
    return {
      items: items.map((i) => ({
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
      }))
    };
  });

  res.json(payload);
});

const upsertSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().nonnegative(),
  unit: z.string().min(1),
  minStockLevel: z.number().int().nonnegative(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional()
});

pharmacyRouter.post('/inventory', requireAuth, async (req, res) => {
  if (!allowedPharmacyRoles.includes(req.user!.role)) throw forbidden();
  const pharmacyId = req.user!.role === UserRole.ADMIN && typeof req.query.pharmacyId === 'string'
    ? req.query.pharmacyId
    : req.user!.id;
  const body = parseBody(upsertSchema, req.body);

  const payload = await withRequestDb(req, async (tx) => {
    const item = await tx.pharmacyInventoryItem.upsert({
      where: { pharmacyId_sku: { pharmacyId, sku: body.sku } },
      update: {
        name: body.name,
        quantity: body.quantity,
        unit: body.unit,
        minStockLevel: body.minStockLevel,
        batchNumber: body.batchNumber ?? null,
        expiryDate: body.expiryDate ? new Date(`${body.expiryDate}T00:00:00Z`) : null,
        lastUpdatedAt: new Date(),
        version: { increment: 1 }
      },
      create: {
        pharmacyId,
        sku: body.sku,
        name: body.name,
        quantity: body.quantity,
        unit: body.unit,
        minStockLevel: body.minStockLevel,
        batchNumber: body.batchNumber ?? null,
        expiryDate: body.expiryDate ? new Date(`${body.expiryDate}T00:00:00Z`) : null
      },
      select: { id: true }
    });

    await writeAuditLog({
      req,
      db: tx,
      actorId: req.user!.id,
      action: AuditAction.UPDATE,
      entityType: 'PharmacyInventoryItem',
      entityId: item.id,
      after: { id: item.id }
    });

    return { id: item.id };
  });

  res.status(201).json(payload);
});

const stockSchema = z.object({
  quantityChange: z.number().int(),
  type: z.enum(['in', 'out', 'adjustment']),
  reason: z.string().optional()
});

pharmacyRouter.post('/inventory/:id/stock', requireAuth, async (req, res) => {
  if (!allowedPharmacyRoles.includes(req.user!.role)) throw forbidden();
  const body = parseBody(stockSchema, req.body);
  const id = req.params.id;

  const payload = await withRequestDb(req, async (tx) => {
    const item = await tx.pharmacyInventoryItem.findUnique({
      where: { id },
      select: { id: true, pharmacyId: true, quantity: true }
    });
    if (!item) throw notFound();

    if (req.user!.role !== UserRole.ADMIN && item.pharmacyId !== req.user!.id) throw forbidden();

    const newQuantity = item.quantity + body.quantityChange;
    if (newQuantity < 0 && body.type === 'out') throw forbidden('Insufficient stock');

    const updated = await tx.pharmacyInventoryItem.update({
      where: { id },
      data: {
        quantity: Math.max(0, newQuantity),
        lastUpdatedAt: new Date(),
        version: { increment: 1 }
      },
      select: { id: true, quantity: true, lastUpdatedAt: true }
    });

    await tx.inventoryTransaction.create({
      data: {
        itemId: id,
        type:
          body.type === 'in'
            ? InventoryTransactionType.IN
            : body.type === 'out'
              ? InventoryTransactionType.OUT
              : InventoryTransactionType.ADJUSTMENT,
        quantity: Math.abs(body.quantityChange),
        reason: body.reason,
        performedById: req.user!.id
      }
    });

    await writeAuditLog({
      req,
      db: tx,
      actorId: req.user!.id,
      action: AuditAction.UPDATE,
      entityType: 'PharmacyInventoryItem',
      entityId: id,
      before: { quantity: item.quantity },
      after: { quantity: updated.quantity }
    });

    return {
      item: {
        id: updated.id,
        quantity: updated.quantity,
        lastUpdated: updated.lastUpdatedAt.toISOString()
      }
    };
  });

  res.json(payload);
});
