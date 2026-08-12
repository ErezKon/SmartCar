import { createHash } from 'node:crypto';
import { SaicClient } from './client';
import { SAIC_REGIONS, SAIC_LOGIN_BASIC_AUTH, SAIC_TOKEN_REFRESH_BUFFER_S, SaicRegionConfig } from './config';
import { SaicAuthError } from './errors';
import { logger } from '../utils/logger';
import { getDatabase } from '../db/database';
import { SaicRepository } from '../db/repositories/saic.repository';
import { decryptCredential } from './credentials';

export interface SaicLoginResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  tenant_id: string;
  user_id: string;
  user_name?: string;
  account?: string;
}

interface SaicTokenState {
  accessToken: string;
  expiresAt: number; // epoch seconds
  userId: string;
  accountId: number;
  regionCode: string;
}

let cachedToken: SaicTokenState | null = null;
let loginPromise: Promise<SaicTokenState> | null = null;

function sha1Hex(input: string): string {
  return createHash('sha1').update(input, 'utf8').digest('hex');
}

function buildDeviceId(): string {
  const ts = String(Math.floor(Date.now() / 1000));
  const prefix = 'simulator';
  const suffix = '###com.saicmotor.europecar';
  // Pad with '*' between prefix and timestamp to reach 50 chars before suffix
  const paddingLen = 50 - prefix.length - ts.length;
  const padding = '*'.repeat(Math.max(0, paddingLen));
  return prefix + padding + ts + suffix;
}

/**
 * Perform login against the SAIC API.
 * The password is SHA-1 hashed before being sent.
 * Login uses form-encoded body with a Basic auth header.
 */
export async function login(
  username: string,
  password: string,
  region: SaicRegionConfig
): Promise<SaicLoginResponse> {
  const passwordHash = sha1Hex(password);
  const isEmail = username.includes('@');

  const formBody = new URLSearchParams({
    grant_type: 'password',
    username,
    password: passwordHash,
    scope: 'all',
    deviceId: buildDeviceId(),
    deviceType: '0',
    language: 'EN',
    loginType: isEmail ? '2' : '1',
  });

  if (!isEmail) {
    formBody.set('countryCode', '+972');
  }

  const client = new SaicClient(region);

  // Login uses form-encoded content type and Basic auth
  // We need to do a raw encrypted request with the form body
  const currentTs = String(Date.now());
  const requestPath = '/oauth/token';
  const contentType = 'application/x-www-form-urlencoded';

  const { encryptRequestEnvelope, normalizeContentType, computeVerificationString } = await import('./crypto');
  const normalized = normalizeContentType(contentType);

  const encParams = {
    requestPath,
    currentTs,
    tenantId: '459771',
    userToken: '',
    contentType: normalized,
  };

  const bodyStr = formBody.toString();
  const { encryptedBody, verificationString } = encryptRequestEnvelope(bodyStr, encParams);

  const headers: Record<string, string> = {
    'User-Agent': 'Europe/2.1.0 (iPad; iOS 18.5; Scale/2.00)',
    'Content-Type': `${normalized};charset=utf-8`,
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip',
    'REGION': region.regionCode,
    'APP-SEND-DATE': currentTs,
    'APP-CONTENT-ENCRYPTED': '1',
    'tenant-id': '459771',
    'User-Type': 'app',
    'APP-LANGUAGE-TYPE': 'en',
    'ORIGINAL-CONTENT-TYPE': normalized,
    'APP-VERIFICATION-STRING': verificationString,
    'Authorization': SAIC_LOGIN_BASIC_AUTH,
  };

  const url = `${region.baseUri}${requestPath}`;
  logger.info('SAIC: Attempting login...');

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: encryptedBody,
  });

  if (!response.ok && response.status !== 200) {
    throw new SaicAuthError(`Login failed with HTTP ${response.status}`);
  }

  const responseText = await response.text();
  const respSendDate = response.headers.get('APP-SEND-DATE') || currentTs;
  const respContentType = response.headers.get('ORIGINAL-CONTENT-TYPE') || 'application/json';

  const { decryptResponse } = await import('./crypto');
  let plaintext: string;
  try {
    plaintext = decryptResponse(responseText, respSendDate, respContentType);
  } catch {
    plaintext = responseText;
  }

  const parsed = JSON.parse(plaintext);

  if (parsed.code !== 0) {
    throw new SaicAuthError(parsed.message || `Login failed (code ${parsed.code})`);
  }

  const data = parsed.data as SaicLoginResponse;
  if (!data?.access_token) {
    throw new SaicAuthError('Login response missing access_token');
  }

  logger.info(`SAIC: Login successful, token expires in ${data.expires_in}s`);
  return data;
}

/**
 * Get a valid SAIC access token, logging in if necessary.
 * Single-flight lock prevents concurrent logins.
 */
export async function getSaicToken(): Promise<{ token: string; userId: string; accountId: number; region: SaicRegionConfig }> {
  // Check cached token
  if (cachedToken) {
    const now = Math.floor(Date.now() / 1000);
    const remaining = cachedToken.expiresAt - now;
    if (remaining > SAIC_TOKEN_REFRESH_BUFFER_S) {
      const regionConfig = SAIC_REGIONS[cachedToken.regionCode] || SAIC_REGIONS['il'];
      return {
        token: cachedToken.accessToken,
        userId: cachedToken.userId,
        accountId: cachedToken.accountId,
        region: regionConfig,
      };
    }
    logger.info(`SAIC: Token expires in ${remaining}s, re-logging in...`);
  }

  // Single-flight lock
  if (loginPromise) {
    const state = await loginPromise;
    const regionConfig = SAIC_REGIONS[state.regionCode] || SAIC_REGIONS['il'];
    return { token: state.accessToken, userId: state.userId, accountId: state.accountId, region: regionConfig };
  }

  loginPromise = (async () => {
    try {
      const db = await getDatabase();
      const repo = new SaicRepository(db);
      const account = repo.getAccount();

      if (!account) {
        throw new SaicAuthError('No SAIC account configured. Add credentials via POST /api/saic/account.');
      }

      const password = decryptCredential(account.password_enc);
      const regionConfig = SAIC_REGIONS[account.region] || SAIC_REGIONS['il'];
      const data = await login(account.username, password, regionConfig);

      const expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;

      // Save token to DB
      repo.saveToken(account.id, data.access_token, data.refresh_token || null, expiresAt);

      const state: SaicTokenState = {
        accessToken: data.access_token,
        expiresAt,
        userId: data.user_id,
        accountId: account.id,
        regionCode: account.region,
      };

      cachedToken = state;
      return state;
    } finally {
      loginPromise = null;
    }
  })();

  const state = await loginPromise;
  const regionConfig = SAIC_REGIONS[state.regionCode] || SAIC_REGIONS['il'];
  return { token: state.accessToken, userId: state.userId, accountId: state.accountId, region: regionConfig };
}

/**
 * Clear the cached token (e.g., on auth error to force re-login).
 */
export function clearSaicToken(): void {
  cachedToken = null;
  loginPromise = null;
}
