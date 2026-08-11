import { Router, Request, Response } from 'express';
import { verifyWebhookSignature } from '../middleware/webhook-verification';
import { ensureAuthenticated } from '../middleware/auth.middleware';
import {
  listWebhooks,
  getWebhook,
  listSubscriptions,
  createSubscription,
  getSubscription,
  removeSubscription,
} from '../api/management';
import { getDatabase } from '../db/database';
import { WebhookRepository } from '../db/repositories/webhook.repository';
import { SignalRepository } from '../db/repositories/signal.repository';
import { logger } from '../utils/logger';

export const webhooksRouter = Router();

// --- Webhook Receiver (public, verified by signature) ---

// POST /webhooks/receive - Main webhook receiver endpoint
webhooksRouter.post('/receive', verifyWebhookSignature, async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const eventType = payload?.eventType || payload?.type;

    logger.info(`Webhook received: type=${eventType}`);

    const db = await getDatabase();
    const webhookRepo = new WebhookRepository(db);

    // Handle VERIFY events (Smartcar sends these to verify the endpoint)
    if (eventType === 'VERIFY') {
      const challenge = payload?.challenge;
      logger.info('Webhook VERIFY challenge received');
      webhookRepo.saveEvent(null, 'VERIFY', null, JSON.stringify(payload));
      res.json({ challenge });
      return;
    }

    // Handle VEHICLE_STATE events (signal data updates)
    if (eventType === 'VEHICLE_STATE') {
      const vehicleId = payload?.vehicleId || payload?.data?.vehicleId;
      const eventId = payload?.id || payload?.eventId;

      webhookRepo.saveEvent(eventId, 'VEHICLE_STATE', vehicleId, JSON.stringify(payload));

      // Store signal data from the webhook event
      const signals = payload?.data?.signals || payload?.signals;
      if (signals && vehicleId) {
        const signalRepo = new SignalRepository(db);
        for (const [signalCode, signalData] of Object.entries(signals)) {
          const data = signalData as { value?: unknown; dataAge?: string };
          const value = data?.value !== undefined ? JSON.stringify(data.value) : null;
          signalRepo.saveSignal(vehicleId, signalCode, value, data?.dataAge);
        }
        logger.info(`Stored ${Object.keys(signals).length} signals from webhook for vehicle ${vehicleId}`);
      }

      res.status(200).json({ status: 'received' });
      return;
    }

    // Handle VEHICLE_ERROR events
    if (eventType === 'VEHICLE_ERROR') {
      const vehicleId = payload?.vehicleId || payload?.data?.vehicleId;
      const eventId = payload?.id || payload?.eventId;

      logger.warn(`Vehicle error event received for ${vehicleId}: ${JSON.stringify(payload)}`);
      webhookRepo.saveEvent(eventId, 'VEHICLE_ERROR', vehicleId, JSON.stringify(payload));

      res.status(200).json({ status: 'received' });
      return;
    }

    // Unknown event type - store and acknowledge
    logger.warn(`Unknown webhook event type: ${eventType}`);
    webhookRepo.saveEvent(null, eventType || 'UNKNOWN', null, JSON.stringify(payload));
    res.status(200).json({ status: 'received' });
  } catch (error) {
    const err = error as Error;
    logger.error(`Webhook processing error: ${err.message}`);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// --- Management Webhook & Subscription Routes (require auth) ---

// GET /api/webhooks - List configured webhooks
webhooksRouter.get('/', ensureAuthenticated, async (_req: Request, res: Response) => {
  try {
    const result = await listWebhooks();
    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error(`List webhooks error: ${err.message}`);
    res.status(500).json({ error: 'Failed to list webhooks', message: err.message });
  }
});

// GET /api/webhooks/:webhookId - Get webhook details
webhooksRouter.get('/:webhookId', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const result = await getWebhook(req.params.webhookId as string);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error(`Get webhook error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get webhook', message: err.message });
  }
});

export const subscriptionsRouter = Router();

// All subscription routes require auth
subscriptionsRouter.use(ensureAuthenticated);

// GET /api/subscriptions - List subscriptions
subscriptionsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      webhookId: req.query.webhookId as string | undefined,
      vehicleId: req.query.vehicleId as string | undefined,
      userId: req.query.userId as string | undefined,
    };
    const pagination = {
      pageNumber: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.size ? parseInt(req.query.size as string, 10) : undefined,
    };

    const result = await listSubscriptions(filters, pagination);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error(`List subscriptions error: ${err.message}`);
    res.status(500).json({ error: 'Failed to list subscriptions', message: err.message });
  }
});

// POST /api/subscriptions - Create subscription
subscriptionsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { webhookId, userId, vehicleId } = req.body;

    if (!webhookId || !userId || !vehicleId) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'Provide webhookId, userId, and vehicleId.',
      });
      return;
    }

    const result = await createSubscription(webhookId, userId, vehicleId);
    res.status(201).json(result);
  } catch (error) {
    const err = error as Error;
    logger.error(`Create subscription error: ${err.message}`);
    res.status(500).json({ error: 'Failed to create subscription', message: err.message });
  }
});

// GET /api/subscriptions/:subscriptionId - Get subscription details
subscriptionsRouter.get('/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const result = await getSubscription(req.params.subscriptionId as string);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error(`Get subscription error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get subscription', message: err.message });
  }
});

// DELETE /api/subscriptions/:subscriptionId - Remove subscription
subscriptionsRouter.delete('/:subscriptionId', async (req: Request, res: Response) => {
  try {
    await removeSubscription(req.params.subscriptionId as string);
    res.status(204).send();
  } catch (error) {
    const err = error as Error;
    logger.error(`Remove subscription error: ${err.message}`);
    res.status(500).json({ error: 'Failed to remove subscription', message: err.message });
  }
});

// --- Webhook Events from SQLite ---

export const webhookEventsRouter = Router();

// GET /api/webhook-events - List received webhook events from SQLite
webhookEventsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const eventType = req.query.eventType as string | undefined;

    const db = await getDatabase();
    const webhookRepo = new WebhookRepository(db);

    const events = eventType
      ? webhookRepo.getEventsByType(eventType, limit)
      : webhookRepo.getEvents(limit, offset);

    res.json({ data: events });
  } catch (error) {
    const err = error as Error;
    logger.error(`Webhook events error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get webhook events', message: err.message });
  }
});
