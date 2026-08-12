import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the env module before importing credentials
vi.mock('../config/env', () => ({
  env: {
    SAIC_CREDENTIALS_KEY: 'test-key-for-credentials-spec!',
  },
}));

import { encryptCredential, decryptCredential } from './credentials';

describe('SAIC Credentials', () => {
  describe('encrypt / decrypt round-trip', () => {
    it('should encrypt and decrypt a password correctly', () => {
      const password = 'mySecurePassword123!';
      const encrypted = encryptCredential(password);
      const decrypted = decryptCredential(encrypted);
      expect(decrypted).toBe(password);
    });

    it('should produce different ciphertext each time (random IV)', () => {
      const password = 'samePassword';
      const enc1 = encryptCredential(password);
      const enc2 = encryptCredential(password);
      expect(enc1).not.toBe(enc2);

      // But both should decrypt to the same value
      expect(decryptCredential(enc1)).toBe(password);
      expect(decryptCredential(enc2)).toBe(password);
    });

    it('should handle empty strings', () => {
      const encrypted = encryptCredential('');
      expect(decryptCredential(encrypted)).toBe('');
    });

    it('should handle unicode characters', () => {
      const password = 'p@$$w0rd-with-unicodе-символы-123';
      const encrypted = encryptCredential(password);
      expect(decryptCredential(encrypted)).toBe(password);
    });
  });

  describe('tamper detection', () => {
    it('should fail to decrypt tampered ciphertext', () => {
      const password = 'testPassword';
      const encrypted = encryptCredential(password);

      // Tamper with the last character of the ciphertext
      const tampered = encrypted.slice(0, -2) + 'ff';

      expect(() => decryptCredential(tampered)).toThrow();
    });

    it('should fail to decrypt with truncated data', () => {
      const password = 'testPassword';
      const encrypted = encryptCredential(password);

      // Truncate the encrypted data
      const truncated = encrypted.slice(0, 20);

      expect(() => decryptCredential(truncated)).toThrow();
    });
  });
});
