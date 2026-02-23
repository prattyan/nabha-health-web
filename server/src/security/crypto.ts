import crypto from 'node:crypto';
import { env } from '../env.js';

function getKey(): Buffer {
  const key = Buffer.from(env.ENCRYPTION_KEY_BASE64, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY_BASE64 must decode to 32 bytes');
  }
  return key;
}

export function sha256Base64(value: string): string {
  return crypto.createHash('sha256').update(value).digest('base64');
}

export function encryptString(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptString(payloadBase64: string): string {
  const buf = Buffer.from(payloadBase64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const key = getKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}
