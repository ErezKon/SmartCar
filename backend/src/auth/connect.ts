import { env } from '../config/env';
import { SMARTCAR_CONNECT_URL } from '../config/constants';
import { getDatabase } from '../db/database';
import { UserRepository } from '../db/repositories/user.repository';
import { ConnectFlowError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface ConnectUrlOptions {
  applicationId?: string;
  redirectUri?: string;
  responseType?: 'code' | 'none';
  mode?: 'simulated' | 'live';
  scope?: string[];
  state?: string;
  make?: string;
  singleSelect?: boolean;
  singleSelectVin?: string;
  externalId?: string;
  flags?: Record<string, string>;
}

export function buildConnectUrl(options: ConnectUrlOptions = {}): string {
  const params = new URLSearchParams();

  params.set('application_id', options.applicationId || env.SMARTCAR_CLIENT_ID);
  params.set('redirect_uri', options.redirectUri || env.SMARTCAR_REDIRECT_URI);
  params.set('response_type', options.responseType || 'none');
  params.set('mode', options.mode || env.SMARTCAR_CONNECT_MODE);

  if (options.scope && options.scope.length > 0) {
    params.set('scope', options.scope.join(' '));
  }
  if (options.state) {
    params.set('state', options.state);
  }
  if (options.make) {
    params.set('make', options.make);
  }
  if (options.singleSelect) {
    params.set('single_select', 'true');
  }
  if (options.singleSelectVin) {
    params.set('single_select_vin', options.singleSelectVin);
  }
  if (options.externalId) {
    params.set('external_id', options.externalId);
  }
  if (options.flags) {
    for (const [key, value] of Object.entries(options.flags)) {
      params.set(`flag:${key}`, value);
    }
  }

  return `${SMARTCAR_CONNECT_URL}?${params.toString()}`;
}

export interface ConnectCallbackParams {
  user_id?: string;
  error?: string;
  error_description?: string;
  state?: string;
}

export async function handleConnectCallback(
  queryParams: ConnectCallbackParams
): Promise<{ userId: string; state?: string }> {
  if (queryParams.error) {
    logger.error(`Connect flow error: ${queryParams.error} - ${queryParams.error_description}`);
    throw new ConnectFlowError(
      queryParams.error_description || queryParams.error,
      queryParams.error,
      queryParams.error_description
    );
  }

  const userId = queryParams.user_id;
  if (!userId) {
    throw new ConnectFlowError('No user_id in callback', 'missing_user_id');
  }

  // Store user in database
  const db = await getDatabase();
  const userRepo = new UserRepository(db);
  userRepo.upsertUser(userId);

  logger.info(`Connect flow completed, user_id: ${userId}`);

  return {
    userId,
    state: queryParams.state,
  };
}
