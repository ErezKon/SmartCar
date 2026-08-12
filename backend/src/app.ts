import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { logger } from './utils/logger';
import { authRouter } from './routes/auth.routes';
import { connectionsRouter } from './routes/connections.routes';
import { vehiclesRouter } from './routes/vehicles.routes';
import { commandsRouter } from './routes/commands.routes';
import { webhooksRouter, subscriptionsRouter, webhookEventsRouter } from './routes/webhooks.routes';
import { compatibilityRouter } from './routes/compatibility.routes';
import { managementRouter } from './routes/management.routes';
import { saicRouter } from './routes/saic.routes';

const app = express();

// Trust the first reverse proxy (nginx frontend container)
// Required for express-rate-limit to read the real client IP from X-Forwarded-For
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Request logging
app.use(morgan('combined', {
  stream: { write: (message: string) => logger.info(message.trim()) },
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRouter);
app.use('/api/connections', connectionsRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/vehicles', commandsRouter);
app.use('/webhooks', webhooksRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/webhook-events', webhookEventsRouter);
app.use('/api/compatibility', compatibilityRouter);
app.use('/api/management', managementRouter);
app.use('/api/saic', saicRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler with user-friendly Smartcar error mapping
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });

  if (err.name === 'SmartcarApiError') {
    const scErr = err as Error & { statusCode: number; errorType: string; errorCode?: string };
    const friendlyMessages: Record<string, string> = {
      AUTHENTICATION: 'Authentication with Smartcar failed. Check your API credentials.',
      PERMISSION: 'Your application does not have permission for this action.',
      VEHICLE_STATE: 'The vehicle is not in a state that allows this action (e.g. engine off, not connected).',
      RATE_LIMIT: 'Too many requests. Please wait and try again.',
      VEHICLE_NOT_FOUND: 'The specified vehicle was not found or is no longer connected.',
      NOT_CAPABLE: 'This vehicle does not support the requested feature.',
      UPSTREAM: 'The vehicle manufacturer service is temporarily unavailable.',
    };
    const friendly = friendlyMessages[scErr.errorType] || err.message;
    res.status(scErr.statusCode).json({ error: friendly, type: scErr.errorType, code: scErr.errorCode });
    return;
  }

  if (err.name === 'SaicApiError') {
    const saicErr = err as Error & { statusCode: number; apiCode?: number };
    const saicFriendly: Record<string, string> = {
      SaicAuthError: 'SAIC authentication failed. Check your credentials.',
      SaicVehicleAsleepError: 'The vehicle is asleep and did not respond. Try again later or wait for it to wake up.',
      SaicPinRequiredError: 'This command requires a PIN that is not configured.',
      SaicThrottledError: 'Too many requests to the SAIC API. Please wait and try again.',
    };
    const friendly = saicFriendly[err.name] || err.message;
    res.status(saicErr.statusCode).json({ error: friendly, type: err.name });
    return;
  }

  if (err.name === 'SaicAuthError') {
    res.status(401).json({ error: 'SAIC authentication failed. Check your credentials.', type: 'SaicAuthError' });
    return;
  }

  if (err.name === 'SaicVehicleAsleepError') {
    res.status(504).json({ error: 'The vehicle is asleep and did not respond.', type: 'SaicVehicleAsleepError' });
    return;
  }

  if (err.name === 'AuthenticationError' || err.name === 'TokenExpiredError') {
    res.status(401).json({ error: err.message });
    return;
  }

  if (err.name === 'RateLimitError') {
    const rlErr = err as Error & { retryAfter: number };
    res.status(429).json({ error: 'Rate limit exceeded. Please wait and try again.', retryAfter: rlErr.retryAfter });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
});

export { app };
