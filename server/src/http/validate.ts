import { z } from 'zod';
import { badRequest } from './errors.js';

export function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw badRequest('Validation error', 'VALIDATION_ERROR');
  }
  return result.data;
}
