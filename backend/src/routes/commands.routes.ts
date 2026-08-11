import { Router, Request, Response } from 'express';
import {
  startCharging, stopCharging, setChargeLimit,
  lockDoors, unlockDoors,
  setDestination,
  setDailySchedule, setWeeklySchedule, setWorkweekSchedule, deleteChargeSchedule,
} from '../api/commands';
import { ensureAuthenticated, extractUserId } from '../middleware/auth.middleware';
import { getDatabase } from '../db/database';
import { CommandLogRepository } from '../db/repositories/command-log.repository';
import { logger } from '../utils/logger';
import { isValidTimeFormat, isValidDay } from '../utils/helpers';

export const commandsRouter = Router();

// All command routes require authentication and a user ID
commandsRouter.use(ensureAuthenticated);
commandsRouter.use(extractUserId);

// Helper to execute a command with logging
async function executeCommand(
  req: Request,
  res: Response,
  commandType: string,
  commandFn: () => Promise<unknown>,
  requestBody?: unknown
): Promise<void> {
  const vehicleId = req.params.vehicleId as string;
  const userId = (req as Request & { scUserId: string }).scUserId;
  const startTime = Date.now();

  try {
    const result = await commandFn();
    const durationMs = Date.now() - startTime;

    // Log the command execution
    const db = await getDatabase();
    const cmdLogRepo = new CommandLogRepository(db);
    cmdLogRepo.logCommand(vehicleId, userId, commandType, 'SUCCESS', requestBody, result, durationMs);

    res.json(result);
  } catch (error) {
    const err = error as Error;
    const durationMs = Date.now() - startTime;

    // Log the failed command
    try {
      const db = await getDatabase();
      const cmdLogRepo = new CommandLogRepository(db);
      cmdLogRepo.logCommand(vehicleId, userId, commandType, 'FAILURE', requestBody, { error: err.message }, durationMs);
    } catch (logErr) {
      logger.error(`Failed to log command error: ${(logErr as Error).message}`);
    }

    logger.error(`Command ${commandType} error: ${err.message}`);
    res.status(500).json({ error: `Failed to execute ${commandType}`, message: err.message });
  }
}

// --- Charging Commands ---

// POST /api/vehicles/:vehicleId/commands/charge/start
commandsRouter.post('/:vehicleId/commands/charge/start', async (req: Request, res: Response) => {
  const vehicleId = req.params.vehicleId as string;
  const userId = (req as Request & { scUserId: string }).scUserId;
  await executeCommand(req, res, 'charge/start', () => startCharging(vehicleId, userId));
});

// POST /api/vehicles/:vehicleId/commands/charge/stop
commandsRouter.post('/:vehicleId/commands/charge/stop', async (req: Request, res: Response) => {
  const vehicleId = req.params.vehicleId as string;
  const userId = (req as Request & { scUserId: string }).scUserId;
  await executeCommand(req, res, 'charge/stop', () => stopCharging(vehicleId, userId));
});

// POST /api/vehicles/:vehicleId/commands/charge/set-limit
commandsRouter.post('/:vehicleId/commands/charge/set-limit', async (req: Request, res: Response) => {
  const vehicleId = req.params.vehicleId as string;
  const userId = (req as Request & { scUserId: string }).scUserId;
  const percent = req.body?.data?.attributes?.percent ?? req.body?.percent;

  if (percent === undefined || percent < 0 || percent > 100) {
    res.status(400).json({
      error: 'Invalid charge limit',
      message: 'Provide a percent value between 0 and 100.',
    });
    return;
  }

  await executeCommand(
    req, res, 'charge/set-limit',
    () => setChargeLimit(vehicleId, userId, percent),
    { percent }
  );
});

// --- Security Commands ---

// POST /api/vehicles/:vehicleId/commands/security/lock
commandsRouter.post('/:vehicleId/commands/security/lock', async (req: Request, res: Response) => {
  const vehicleId = req.params.vehicleId as string;
  const userId = (req as Request & { scUserId: string }).scUserId;
  await executeCommand(req, res, 'security/lock', () => lockDoors(vehicleId, userId));
});

// POST /api/vehicles/:vehicleId/commands/security/unlock
commandsRouter.post('/:vehicleId/commands/security/unlock', async (req: Request, res: Response) => {
  const vehicleId = req.params.vehicleId as string;
  const userId = (req as Request & { scUserId: string }).scUserId;
  await executeCommand(req, res, 'security/unlock', () => unlockDoors(vehicleId, userId));
});

// --- Navigation Commands ---

// POST /api/vehicles/:vehicleId/commands/navigation/set-destination
commandsRouter.post('/:vehicleId/commands/navigation/set-destination', async (req: Request, res: Response) => {
  const vehicleId = req.params.vehicleId as string;
  const userId = (req as Request & { scUserId: string }).scUserId;
  const attrs = req.body?.data?.attributes || req.body;
  const { latitude, longitude } = attrs;

  if (latitude === undefined || longitude === undefined) {
    res.status(400).json({
      error: 'Invalid destination',
      message: 'Provide latitude and longitude.',
    });
    return;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    res.status(400).json({
      error: 'Invalid coordinates',
      message: 'Latitude must be -90 to 90, longitude must be -180 to 180.',
    });
    return;
  }

  await executeCommand(
    req, res, 'navigation/set-destination',
    () => setDestination(vehicleId, userId, latitude, longitude),
    { latitude, longitude }
  );
});

// --- Charge Schedule Commands ---

// POST /api/vehicles/:vehicleId/charge-schedules/daily
commandsRouter.post('/:vehicleId/charge-schedules/daily', async (req: Request, res: Response) => {
  const vehicleId = req.params.vehicleId as string;
  const userId = (req as Request & { scUserId: string }).scUserId;
  const schedule = req.body;
  const attrs = schedule?.data?.attributes || schedule;

  if (!attrs?.startTime || !attrs?.endTime) {
    res.status(400).json({
      error: 'Missing schedule times',
      message: 'Provide startTime and endTime in HH:mm format.',
    });
    return;
  }

  if (!isValidTimeFormat(attrs.startTime) || !isValidTimeFormat(attrs.endTime)) {
    res.status(400).json({
      error: 'Invalid time format',
      message: 'Times must be in HH:mm format (e.g. 22:00).',
    });
    return;
  }

  if (attrs.targetSoc !== undefined && (attrs.targetSoc < 0 || attrs.targetSoc > 100)) {
    res.status(400).json({
      error: 'Invalid target SOC',
      message: 'targetSoc must be between 0 and 100.',
    });
    return;
  }

  await executeCommand(
    req, res, 'charge-schedules/daily',
    () => setDailySchedule(vehicleId, userId, schedule),
    schedule
  );
});

// POST /api/vehicles/:vehicleId/charge-schedules/weekly
commandsRouter.post('/:vehicleId/charge-schedules/weekly', async (req: Request, res: Response) => {
  const vehicleId = req.params.vehicleId as string;
  const userId = (req as Request & { scUserId: string }).scUserId;
  const schedule = req.body;
  const attrs = schedule?.data?.attributes || schedule;
  const schedules = attrs?.schedules;

  if (!Array.isArray(schedules) || schedules.length === 0) {
    res.status(400).json({
      error: 'Missing schedules',
      message: 'Provide an array of day schedules with day, startTime, and endTime.',
    });
    return;
  }

  for (const entry of schedules) {
    if (!entry.day || !isValidDay(entry.day)) {
      res.status(400).json({
        error: 'Invalid day',
        message: `Invalid day "${entry.day}". Must be monday-sunday.`,
      });
      return;
    }
    if (!entry.startTime || !entry.endTime || !isValidTimeFormat(entry.startTime) || !isValidTimeFormat(entry.endTime)) {
      res.status(400).json({
        error: 'Invalid time format',
        message: 'Each schedule entry needs startTime and endTime in HH:mm format.',
      });
      return;
    }
  }

  await executeCommand(
    req, res, 'charge-schedules/weekly',
    () => setWeeklySchedule(vehicleId, userId, schedule),
    schedule
  );
});

// POST /api/vehicles/:vehicleId/charge-schedules/workweek
commandsRouter.post('/:vehicleId/charge-schedules/workweek', async (req: Request, res: Response) => {
  const vehicleId = req.params.vehicleId as string;
  const userId = (req as Request & { scUserId: string }).scUserId;
  const schedule = req.body;
  const attrs = schedule?.data?.attributes || schedule;

  const times = [attrs?.weekdayStartTime, attrs?.weekdayEndTime, attrs?.weekendStartTime, attrs?.weekendEndTime];
  if (times.some((t: string | undefined) => !t)) {
    res.status(400).json({
      error: 'Missing schedule times',
      message: 'Provide weekdayStartTime, weekdayEndTime, weekendStartTime, and weekendEndTime in HH:mm format.',
    });
    return;
  }

  if (times.some((t: string) => !isValidTimeFormat(t))) {
    res.status(400).json({
      error: 'Invalid time format',
      message: 'All times must be in HH:mm format (e.g. 22:00).',
    });
    return;
  }

  if (attrs.targetSoc !== undefined && (attrs.targetSoc < 0 || attrs.targetSoc > 100)) {
    res.status(400).json({
      error: 'Invalid target SOC',
      message: 'targetSoc must be between 0 and 100.',
    });
    return;
  }

  await executeCommand(
    req, res, 'charge-schedules/workweek',
    () => setWorkweekSchedule(vehicleId, userId, schedule),
    schedule
  );
});

// DELETE /api/vehicles/:vehicleId/charge-schedules/:scheduleId
commandsRouter.delete('/:vehicleId/charge-schedules/:scheduleId', async (req: Request, res: Response) => {
  const vehicleId = req.params.vehicleId as string;
  const scheduleId = req.params.scheduleId as string;
  const userId = (req as Request & { scUserId: string }).scUserId;

  await executeCommand(
    req, res, 'charge-schedules/delete',
    () => deleteChargeSchedule(vehicleId, userId, scheduleId),
    { scheduleId }
  );
});

// GET /api/vehicles/:vehicleId/command-logs - Get command execution history
commandsRouter.get('/:vehicleId/command-logs', async (req: Request, res: Response) => {
  try {
    const vehicleId = req.params.vehicleId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const db = await getDatabase();
    const cmdLogRepo = new CommandLogRepository(db);
    const logs = cmdLogRepo.getCommandLogs(vehicleId, limit, offset);

    res.json({ data: logs });
  } catch (error) {
    const err = error as Error;
    logger.error(`Command logs error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get command logs', message: err.message });
  }
});
