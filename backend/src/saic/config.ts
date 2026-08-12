export interface SaicRegionConfig {
  baseUri: string;
  regionCode: string;
}

export const SAIC_REGIONS: Record<string, SaicRegionConfig> = {
  eu: { baseUri: 'https://gateway-mg-eu.soimt.com/api.app/v1', regionCode: 'eu' },
  au: { baseUri: 'https://gateway-mg-au.soimt.com/api.app/v1', regionCode: 'au' },
  tr: { baseUri: 'https://gateway-mg-tr.soimt.com/api.app/v1', regionCode: 'tr' },
  il: { baseUri: 'https://gateway-mg-il.soimt.com/api.app/v1', regionCode: 'il' },
  br: { baseUri: 'https://gateway-mg-br.soimt.com/api.app/v1', regionCode: 'br' },
  in: { baseUri: 'https://gateway-mg-in.soimt.com/api.app/v1', regionCode: 'in' },
  th: { baseUri: 'https://gateway-mg-th.soimt.com/api.app/v1', regionCode: 'th' },
  cn: { baseUri: 'https://tap-cn.soimt.com/api.app/v1', regionCode: 'cn' },
};

export const SAIC_TENANT_ID = '459771';

export const SAIC_USER_AGENT = 'Europe/2.1.0 (iPad; iOS 18.5; Scale/2.00)';

// Basic auth header for login: base64("sword:sword_secret")
export const SAIC_LOGIN_BASIC_AUTH = 'Basic c3dvcmQ6c3dvcmRfc2VjcmV0';

export const SAIC_DEFAULT_REGION = 'il';

// Polling constants
export const SAIC_EVENT_POLL_INTERVAL_MS = 3000;
export const SAIC_EVENT_POLL_TIMEOUT_MS = 30000;
export const SAIC_COMMAND_POLL_INTERVAL_MS = 1000;

// Operational discipline (from saic-python-mqtt-gateway)
export const SAIC_REFRESH_ACTIVE_MS = 30_000;
export const SAIC_REFRESH_AFTER_SHUTDOWN_MS = 120_000;
export const SAIC_REFRESH_INACTIVE_MS = 86_400_000; // 24 hours
export const SAIC_REFRESH_INACTIVE_GRACE_MS = 600_000; // 10 minutes
export const SAIC_REFRESH_MESSAGE_MS = 60_000;
export const SAIC_RELOGIN_DELAY_MS = 900_000; // 15 minutes

// Token management
export const SAIC_TOKEN_REFRESH_BUFFER_S = 600; // refresh 10 min before expiry
