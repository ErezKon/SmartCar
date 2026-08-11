import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
  SMARTCAR_CLIENT_ID: string;
  SMARTCAR_CLIENT_SECRET: string;
  SMARTCAR_REDIRECT_URI: string;
  SMARTCAR_CONNECT_MODE: 'simulated' | 'live';
  SMARTCAR_APP_MANAGEMENT_TOKEN: string;
  PORT: number;
  FRONTEND_URL: string;
  NGROK_AUTHTOKEN: string;
  DATABASE_PATH: string;
}

function getEnvVar(key: string, required = true): string {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

export const env: EnvConfig = {
  SMARTCAR_CLIENT_ID: getEnvVar('SMARTCAR_CLIENT_ID', false),
  SMARTCAR_CLIENT_SECRET: getEnvVar('SMARTCAR_CLIENT_SECRET', false),
  SMARTCAR_REDIRECT_URI: getEnvVar('SMARTCAR_REDIRECT_URI', false) || 'http://localhost:3000/auth/callback',
  SMARTCAR_CONNECT_MODE: (getEnvVar('SMARTCAR_CONNECT_MODE', false) || 'simulated') as 'simulated' | 'live',
  SMARTCAR_APP_MANAGEMENT_TOKEN: getEnvVar('SMARTCAR_APP_MANAGEMENT_TOKEN', false),
  PORT: parseInt(getEnvVar('PORT', false) || '3000', 10),
  FRONTEND_URL: getEnvVar('FRONTEND_URL', false) || 'http://localhost:4200',
  NGROK_AUTHTOKEN: getEnvVar('NGROK_AUTHTOKEN', false),
  DATABASE_PATH: getEnvVar('DATABASE_PATH', false) || './data/smartcar.db',
};
