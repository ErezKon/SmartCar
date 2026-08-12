import { describe, it, expect } from 'vitest';
import {
  encryptRequest, decryptResponse, computeVerificationString,
  normalizeContentType,
} from './crypto';
import type { RequestEncryptionParams } from './crypto';

describe('SAIC Crypto', () => {
  // Known-good test vectors from saic-python-client-ng tests/security_test.py

  const baseParams: RequestEncryptionParams = {
    requestPath: '/api/v1/data',
    currentTs: '20230514123000',
    tenantId: '1234',
    contentType: 'application/json',
    userToken: 'dummy_token',
  };

  describe('computeVerificationString', () => {
    it('Vector 1: standard request', () => {
      const body = '{"key": "value"}';
      const { encryptedBody } = encryptRequest(body, baseParams);
      const result = computeVerificationString(baseParams, encryptedBody);
      expect(result).toBe('afd4eaf98af2d964f8ea840fc144ee7bae95dbeeeb251d5e3a01371442f92eeb');
    });

    it('Vector 2: empty path', () => {
      const params: RequestEncryptionParams = {
        ...baseParams,
        requestPath: '',
      };
      const body = '{"key": "value"}';
      const { encryptedBody } = encryptRequest(body, params);
      const result = computeVerificationString(params, encryptedBody);
      expect(result).toBe('ff8cb13ebcce5958e7fbfe602716c653fd72ce78842be87b6d50dccede198735');
    });

    it('Vector 3: no content', () => {
      const result = computeVerificationString(baseParams, '');
      expect(result).toBe('332c85836aa9afc864282436a740eb2cc778fafd1fea74dd887c1f8de5056de0');
    });
  });

  describe('encrypt / decrypt round-trip', () => {
    it('should produce hex-encoded ciphertext different from plaintext', () => {
      const plaintext = '{"key": "value", "number": 42, "nested": {"a": true}}';
      const ts = '1700000000000';
      const params: RequestEncryptionParams = {
        requestPath: '/vehicle/status',
        currentTs: ts,
        tenantId: '459771',
        contentType: 'application/json',
        userToken: 'test_token_123',
      };

      const { encryptedBody } = encryptRequest(plaintext, params);

      // Encrypted body should be hex-encoded and different from plaintext
      expect(encryptedBody).not.toBe(plaintext);
      expect(/^[0-9a-f]+$/.test(encryptedBody)).toBe(true);
    });

    it('should decrypt a response encrypted with response key derivation', () => {
      // Simulate what the server does: encrypt with response key derivation
      // then decrypt with decryptResponse (same derivation).
      // Response key = md5(appSendDate + "1" + contentType)
      // Response IV  = md5(appSendDate)
      const { createCipheriv, createHash } = require('node:crypto');
      const md5Hex = (s: string) => createHash('md5').update(s, 'utf8').digest('hex');

      const plaintext = '{"code":0,"data":{"vin":"ABC123"}}';
      const appSendDate = '1700000000000';
      const contentType = 'application/json';
      const key = Buffer.from(md5Hex(appSendDate + '1' + contentType), 'hex');
      const iv = Buffer.from(md5Hex(appSendDate), 'hex');

      const cipher = createCipheriv('aes-128-cbc', key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const decrypted = decryptResponse(encrypted, appSendDate, contentType);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty strings in encryption', () => {
      const ts = '1700000000000';
      const params: RequestEncryptionParams = {
        requestPath: '/test',
        currentTs: ts,
        tenantId: '459771',
        contentType: 'application/json',
        userToken: '',
      };

      // Encrypting empty string should produce valid hex output (PKCS7 padding block)
      const { encryptedBody } = encryptRequest('', params);
      expect(encryptedBody.length).toBeGreaterThan(0);
    });
  });

  describe('normalizeContentType', () => {
    it('should normalize form-urlencoded', () => {
      expect(normalizeContentType('application/x-www-form-urlencoded')).toBe('application/x-www-form-urlencoded');
    });

    it('should normalize multipart', () => {
      expect(normalizeContentType('multipart/form-data; boundary=---')).toBe('multipart/form-data');
    });

    it('should normalize JSON and other types', () => {
      expect(normalizeContentType('application/json')).toBe('application/json');
      expect(normalizeContentType('text/plain')).toBe('application/json');
    });
  });
});
