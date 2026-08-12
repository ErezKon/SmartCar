import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env';

/**
 * Encrypt/decrypt SAIC account credentials at rest using AES-256-GCM.
 * The key is derived from SAIC_CREDENTIALS_KEY in .env.
 *
 * Format: iv (12 bytes) + authTag (16 bytes) + ciphertext, all hex-encoded.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const keyStr = env.SAIC_CREDENTIALS_KEY;
  if (!keyStr) {
    throw new Error('SAIC_CREDENTIALS_KEY is not set. Cannot encrypt/decrypt credentials.');
  }
  // Pad or truncate to exactly 32 bytes
  const buf = Buffer.alloc(KEY_LENGTH);
  Buffer.from(keyStr, 'utf8').copy(buf);
  return buf;
}

export function encryptCredential(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  // iv + authTag + ciphertext
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

export function decryptCredential(stored: string): string {
  const key = getKey();
  const ivHex = stored.slice(0, IV_LENGTH * 2);
  const authTagHex = stored.slice(IV_LENGTH * 2, IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2);
  const ciphertextHex = stored.slice(IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2);

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
