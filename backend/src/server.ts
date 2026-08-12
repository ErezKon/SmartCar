import { app } from './app';
import { env } from './config/env';
import { getDatabase, closeDatabase, startAutoSave, stopAutoSave, saveDatabase } from './db/database';
import { runMigrations } from './db/migrations';
import { logger } from './utils/logger';
import { startNgrokTunnel, stopNgrokTunnel } from './utils/ngrok';
import { startSaicPolling, stopSaicPolling } from './saic/scheduler';

async function start(): Promise<void> {
  try {
    // Initialize database
    const db = await getDatabase();
    runMigrations(db);
    saveDatabase();
    startAutoSave();

    // Start server
    const server = app.listen(env.PORT, () => {
      logger.info(`Smartcar backend server running on port ${env.PORT}`);
      logger.info(`Mode: ${env.SMARTCAR_CONNECT_MODE}`);
      logger.info(`Frontend URL: ${env.FRONTEND_URL}`);
    });

    // Start ngrok tunnel for development webhook support
    if (env.NGROK_AUTHTOKEN) {
      startNgrokTunnel(env.PORT).catch((err) => {
        logger.warn(`ngrok tunnel failed to start: ${(err as Error).message}`);
      });
    }

    // Start SAIC background polling (if enabled via SAIC_POLLING_ENABLED)
    startSaicPolling();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      stopSaicPolling();
      stopNgrokTunnel();
      stopAutoSave();
      server.close(() => {
        closeDatabase();
        logger.info('Server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
