import { env } from '../config/env';
import { SMARTCAR_AUTH_URL, TOKEN_REFRESH_BUFFER_SECONDS } from '../config/constants';
import { getDatabase } from '../db/database';
import { TokenRepository } from '../db/repositories/token.repository';
import { AuthenticationError } from '../utils/errors';
import { logger } from '../utils/logger';

let tokenRepo: TokenRepository | null = null;
let refreshPromise: Promise<string> | null = null;

async function getTokenRepo(): Promise<TokenRepository> {
  if (!tokenRepo) {
    const db = await getDatabase();
    tokenRepo = new TokenRepository(db);
  }
  return tokenRepo;
}

async function fetchNewToken(): Promise<{ accessToken: string; expiresIn: number }> {
  const credentials = Buffer.from(
    `${env.SMARTCAR_CLIENT_ID}:${env.SMARTCAR_CLIENT_SECRET}`
  ).toString('base64');

  logger.info('Fetching new access token from Smartcar IAM...');

  const response = await fetch(`${SMARTCAR_AUTH_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error(`Token fetch failed: ${response.status} ${errorBody}`);
    throw new AuthenticationError(`Failed to obtain access token: ${response.status}`);
  }

  const data = await response.json() as { access_token: string; token_type: string; expires_in: number };

  logger.info(`Access token obtained, expires in ${data.expires_in}s`);

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function getAccessToken(): Promise<string> {
  const repo = await getTokenRepo();

  // Check for a cached valid token
  const stored = repo.getLatestToken();
  if (stored) {
    const now = Math.floor(Date.now() / 1000);
    const remainingSeconds = stored.expires_at - now;

    if (remainingSeconds > TOKEN_REFRESH_BUFFER_SECONDS) {
      return stored.access_token;
    }

    logger.info(`Token expires in ${remainingSeconds}s, refreshing...`);
  }

  // Prevent concurrent token refreshes
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const { accessToken, expiresIn } = await fetchNewToken();
      const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

      repo.saveToken(accessToken, expiresAt);
      repo.deleteExpiredTokens();

      return accessToken;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function forceTokenRefresh(): Promise<string> {
  refreshPromise = null;
  const { accessToken, expiresIn } = await fetchNewToken();
  const repo = await getTokenRepo();
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  repo.saveToken(accessToken, expiresAt);
  repo.deleteExpiredTokens();
  return accessToken;
}

export async function getTokenInfo(): Promise<{
  hasToken: boolean;
  expiresAt: number | null;
  remainingSeconds: number | null;
}> {
  const repo = await getTokenRepo();
  const stored = repo.getLatestToken();

  if (!stored) {
    return { hasToken: false, expiresAt: null, remainingSeconds: null };
  }

  const now = Math.floor(Date.now() / 1000);
  return {
    hasToken: true,
    expiresAt: stored.expires_at,
    remainingSeconds: stored.expires_at - now,
  };
}
