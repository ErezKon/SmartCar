import { Router, Request, Response } from 'express';
import { getVehicle, listSignals, getSignal } from '../api/vehicles';
import { SIGNAL_CODE_CATALOG, getSignalsByGroup, isValidSignalCode } from '../api/signal-codes';
import { ensureAuthenticated, extractUserId } from '../middleware/auth.middleware';
import { getDatabase } from '../db/database';
import { VehicleRepository } from '../db/repositories/vehicle.repository';
import { SignalRepository } from '../db/repositories/signal.repository';
import { logger } from '../utils/logger';

export const vehiclesRouter = Router();

// Signal catalog endpoint (no auth needed - local data only)
vehiclesRouter.get('/signals/catalog', (_req: Request, res: Response) => {
  res.json({
    signals: SIGNAL_CODE_CATALOG,
    groups: getSignalsByGroup(),
    totalSignals: Object.keys(SIGNAL_CODE_CATALOG).length,
  });
});

// All vehicle data routes require authentication
vehiclesRouter.use(ensureAuthenticated);

// GET /api/vehicles/:vehicleId - Get vehicle attributes
vehiclesRouter.get('/:vehicleId', async (req: Request, res: Response) => {
  try {
    const vehicleId = req.params.vehicleId as string;
    const result = await getVehicle(vehicleId);

    // Cache vehicle data locally
    const db = await getDatabase();
    const vehicleRepo = new VehicleRepository(db);
    const attrs = result.data.attributes;
    vehicleRepo.upsertVehicle(
      vehicleId,
      attrs.make,
      attrs.model,
      attrs.year,
      attrs.powertrainType
    );

    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error(`Get vehicle error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get vehicle', message: err.message });
  }
});

// GET /api/vehicles/:vehicleId/signals - Get all signals for a vehicle
vehiclesRouter.get('/:vehicleId/signals', extractUserId, async (req: Request, res: Response) => {
  try {
    const vehicleId = req.params.vehicleId as string;
    const userId = (req as Request & { scUserId: string }).scUserId;

    const result = await listSignals(vehicleId, userId);

    // Store signal snapshots
    const db = await getDatabase();
    const signalRepo = new SignalRepository(db);
    if (result.data) {
      for (const signal of result.data) {
        signalRepo.saveSignal(
          vehicleId,
          signal.attributes.code,
          JSON.stringify(signal.attributes.value),
          signal.attributes.dataAge || undefined
        );
      }
    }

    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error(`List signals error: ${err.message}`);
    res.status(500).json({ error: 'Failed to list signals', message: err.message });
  }
});

// GET /api/vehicles/:vehicleId/signals/:signalCode - Get a specific signal
vehiclesRouter.get('/:vehicleId/signals/:signalCode', extractUserId, async (req: Request, res: Response) => {
  try {
    const vehicleId = req.params.vehicleId as string;
    const signalCode = req.params.signalCode as string;
    const userId = (req as Request & { scUserId: string }).scUserId;

    // Validate signal code
    if (!isValidSignalCode(signalCode)) {
      res.status(400).json({
        error: 'Invalid signal code',
        message: `Signal code '${signalCode}' is not recognized. Use GET /api/signals/catalog to see available signals.`,
      });
      return;
    }

    const result = await getSignal(vehicleId, signalCode, userId);

    // Store signal snapshot
    const db = await getDatabase();
    const signalRepo = new SignalRepository(db);
    signalRepo.saveSignal(
      vehicleId,
      signalCode,
      JSON.stringify(result.data.attributes.value),
      result.data.attributes.dataAge || undefined
    );

    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error(`Get signal error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get signal', message: err.message });
  }
});

// GET /api/vehicles/:vehicleId/signals-history - Get cached signal history
vehiclesRouter.get('/:vehicleId/signals-history', async (req: Request, res: Response) => {
  try {
    const vehicleId = req.params.vehicleId as string;
    const signalCode = req.query.signalCode as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    const db = await getDatabase();
    const signalRepo = new SignalRepository(db);

    if (signalCode) {
      const history = signalRepo.getSignalHistory(vehicleId, signalCode, limit);
      res.json({ data: history });
    } else {
      const latest = signalRepo.getLatestSignals(vehicleId);
      res.json({ data: latest });
    }
  } catch (error) {
    const err = error as Error;
    logger.error(`Signal history error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get signal history', message: err.message });
  }
});
