import { env } from '../config/env';
import { logger } from './logger';

let tunnelUrl: string | null = null;
let ngrokProcess: ReturnType<typeof import('child_process').spawn> | null = null;

/**
 * Starts an ngrok tunnel to expose the local server for webhook callbacks.
 * Requires the ngrok CLI to be installed and NGROK_AUTHTOKEN to be set.
 * Parses the public URL from ngrok's API.
 */
export async function startNgrokTunnel(port: number): Promise<string | null> {
  if (!env.NGROK_AUTHTOKEN) {
    logger.info('NGROK_AUTHTOKEN not set, skipping ngrok tunnel');
    return null;
  }

  try {
    const { spawn } = await import('child_process');

    // Start ngrok in the background
    ngrokProcess = spawn('ngrok', ['http', String(port), '--log=stdout'], {
      env: {
        ...process.env,
        NGROK_AUTHTOKEN: env.NGROK_AUTHTOKEN,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    ngrokProcess.on('error', (err) => {
      logger.error(`ngrok process error: ${err.message}`);
      logger.info('Make sure ngrok is installed: https://ngrok.com/download');
    });

    ngrokProcess.on('exit', (code) => {
      if (code !== null && code !== 0) {
        logger.warn(`ngrok exited with code ${code}`);
      }
      ngrokProcess = null;
      tunnelUrl = null;
    });

    // Wait a moment for ngrok to start, then query its local API for the tunnel URL
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const response = await fetch('http://127.0.0.1:4040/api/tunnels');
    if (!response.ok) {
      logger.error('Failed to query ngrok API');
      return null;
    }

    const data = (await response.json()) as {
      tunnels: Array<{ public_url: string; proto: string }>;
    };
    const httpsTunnel = data.tunnels.find((t) => t.proto === 'https');
    tunnelUrl = httpsTunnel?.public_url || data.tunnels[0]?.public_url || null;

    if (tunnelUrl) {
      logger.info(`ngrok tunnel established: ${tunnelUrl}`);
      logger.info(`Webhook receiver URL: ${tunnelUrl}/webhooks/receive`);
    } else {
      logger.warn('ngrok started but no tunnel URL found');
    }

    return tunnelUrl;
  } catch (error) {
    const err = error as Error;
    logger.error(`Failed to start ngrok tunnel: ${err.message}`);
    logger.info('Make sure ngrok is installed: https://ngrok.com/download');
    return null;
  }
}

/**
 * Stops the running ngrok tunnel process.
 */
export function stopNgrokTunnel(): void {
  if (ngrokProcess) {
    ngrokProcess.kill();
    ngrokProcess = null;
    tunnelUrl = null;
    logger.info('ngrok tunnel stopped');
  }
}

/**
 * Returns the current ngrok tunnel URL, if active.
 */
export function getNgrokUrl(): string | null {
  return tunnelUrl;
}
