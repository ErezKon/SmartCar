import { describe, it, expect } from 'vitest';
import { redactSensitive } from './helpers';

describe('redactSensitive', () => {
  it('redacts access_token values', () => {
    const input = 'access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc"';
    const result = redactSensitive(input);
    expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts password values', () => {
    const input = 'password: "mysecretpass123"';
    const result = redactSensitive(input);
    expect(result).not.toContain('mysecretpass123');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts blade-auth header values', () => {
    const input = 'blade-auth: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token';
    const result = redactSensitive(input);
    expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts SAIC_CREDENTIALS_KEY values', () => {
    const input = 'SAIC_CREDENTIALS_KEY=my-super-secret-key-123';
    const result = redactSensitive(input);
    expect(result).not.toContain('my-super-secret-key-123');
    expect(result).toContain('[REDACTED]');
  });

  it('preserves non-sensitive content', () => {
    const input = 'SAIC vehicle status error: Vehicle asleep code 5';
    const result = redactSensitive(input);
    expect(result).toBe(input);
  });

  it('redacts api_key values', () => {
    const input = 'api_key: "abc123def456ghi"';
    const result = redactSensitive(input);
    expect(result).not.toContain('abc123def456ghi');
    expect(result).toContain('[REDACTED]');
  });

  it('handles strings with no sensitive data', () => {
    const input = 'Normal log message with no secrets';
    expect(redactSensitive(input)).toBe(input);
  });
});
