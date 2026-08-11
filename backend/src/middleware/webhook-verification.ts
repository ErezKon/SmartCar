import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Verifies the HMAC-SHA256 signature of incoming Smartcar webhook payloads.
 * Uses the SC-Signature header and the Application Management Token as the secret key.
 * Employs timing-safe comparison to prevent timing attacks.
 */
export function verifyWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const signature = req.headers['sc-signature'] as string | undefined;

  if (!signature) {
    logger.warn('Webhook received without SC-Signature header');
    res.status(401).json({ error: 'Missing SC-Signature header' });
    return;
  }

  const secret = env.SMARTCAR_APP_MANAGEMENT_TOKEN;
  if (!secret) {
    logger.error('SMARTCAR_APP_MANAGEMENT_TOKEN not configured, cannot verify webhook signature');
    res.status(500).json({ error: 'Webhook verification not configured' });
    return;
  }

  // The raw body is needed for signature verification
  const rawBody = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Timing-safe comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (signatureBuffer.length !== expectedBuffer.length) {
    logger.warn('Webhook signature length mismatch');
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    logger.warn('Webhook signature verification failed');
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  logger.debug('Webhook signature verified successfully');
  next();
}
