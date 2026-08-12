import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { SAIC_REGIONS } from '../saic/config';
import { isPollingEnabled, getPollingIntervalMs } from '../saic/scheduler';
import { encryptCredential } from '../saic/credentials';
import { login, clearSaicToken } from '../saic/auth';
import { listVehicles, getVehicleStatus, getChargingData, getMessages } from '../saic/vehicles';
import {
  findVehicle, lock, unlock, startClimate, stopClimate,
  setHeatedSeats, setRearWindowHeat,
  startCharging as saicStartCharging, stopCharging as saicStopCharging,
  setChargeLimit, setChargeCurrent, setBatteryHeating,
  setFrontDefrost, startClimateWithMode, controlWindows, controlSunroof,
  setHeatedSteeringWheel, setChargingCableLock,
  setChargingSchedule, setBatteryHeatingSchedule,
  setAlarmSwitches, getUnreadMessageCount,
} from '../saic/commands';
import type { ClimateMode } from '../saic/commands';
import type { ChargingScheduleMode, BatteryHeatingScheduleMode, AlarmSwitch } from '../saic/types';
import { normalizeVehicleStatus, normalizeChargingData } from '../saic/normalize';
import { getDatabase } from '../db/database';
import { SaicRepository } from '../db/repositories/saic.repository';
import { logger } from '../utils/logger';
import { redactSensitive } from '../utils/helpers';

export const saicRouter = Router();

// Sanitize error messages before sending to the client —
// strip tokens, credentials, and internal URLs from SAIC API errors.
function safeErrorMessage(err: Error): string {
  return redactSensitive(err.message);
}

// --- Rate Limiting ---

// Login: max 5 attempts per 15 minutes (prevent brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
});

// Live refresh: max 6 per 5 minutes (protect 12V battery)
const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 6,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many live refresh requests. Frequent polling drains the 12V battery.' },
});

// Commands: max 10 per minute per IP (prevent command flooding)
const commandLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many commands. Please wait before sending more.' },
});

// Conditional middleware: only apply refresh limiter when ?refresh=true
function conditionalRefreshLimiter(req: Request, res: Response, next: () => void) {
  if (req.query.refresh === 'true') {
    return refreshLimiter(req, res, next);
  }
  next();
}

// --- Settings ---

// GET /api/saic/settings - Get server-side SAIC configuration (polling mode, etc.)
saicRouter.get('/settings', (_req: Request, res: Response) => {
  res.json({
    pollingEnabled: isPollingEnabled(),
    pollingIntervalMs: getPollingIntervalMs(),
  });
});

// --- Account Management ---

// POST /api/saic/account - Save credentials and validate by logging in
saicRouter.post('/account', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password, region = 'il' } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const regionConfig = SAIC_REGIONS[region];
    if (!regionConfig) {
      res.status(400).json({
        error: `Invalid region "${region}". Valid regions: ${Object.keys(SAIC_REGIONS).join(', ')}`,
      });
      return;
    }

    // Validate by actually logging in
    logger.info(`SAIC: Validating credentials for ${username.slice(0, 3)}*** in region ${region}...`);
    const loginData = await login(username, password, regionConfig);

    // Encrypt and store credentials
    const passwordEnc = encryptCredential(password);
    const db = await getDatabase();
    const repo = new SaicRepository(db);
    const accountId = repo.saveAccount(username, passwordEnc, region);

    // Save the token from the login
    const expiresAt = Math.floor(Date.now() / 1000) + loginData.expires_in;
    repo.saveToken(accountId, loginData.access_token, loginData.refresh_token || null, expiresAt);

    // Clear cached token so next call uses the new account
    clearSaicToken();

    res.json({
      status: 'connected',
      username,
      region,
      userId: loginData.user_id,
      expiresIn: loginData.expires_in,
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`SAIC account setup error: ${err.message}`);
    res.status(err.name === 'SaicAuthError' ? 401 : 500).json({
      error: 'Failed to connect SAIC account',
      message: safeErrorMessage(err),
    });
  }
});

// GET /api/saic/account - Get account status (never returns password)
saicRouter.get('/account', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const repo = new SaicRepository(db);
    const account = repo.getAccount();

    if (!account) {
      res.json({ connected: false });
      return;
    }

    const token = repo.getLatestToken(account.id);
    const now = Math.floor(Date.now() / 1000);

    res.json({
      connected: true,
      username: account.username,
      region: account.region,
      createdAt: account.created_at,
      tokenValid: token ? token.expires_at > now : false,
      tokenExpiresAt: token?.expires_at || null,
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`SAIC account status error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get account status', message: safeErrorMessage(err) });
  }
});

// DELETE /api/saic/account - Remove account and all associated data
saicRouter.delete('/account', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const repo = new SaicRepository(db);
    repo.deleteAccount();
    clearSaicToken();

    res.json({ status: 'disconnected' });
  } catch (error) {
    const err = error as Error;
    logger.error(`SAIC account delete error: ${err.message}`);
    res.status(500).json({ error: 'Failed to delete account', message: safeErrorMessage(err) });
  }
});

// --- Vehicles ---

// GET /api/saic/vehicles - List vehicles
saicRouter.get('/vehicles', async (_req: Request, res: Response) => {
  try {
    const vehicles = await listVehicles();
    res.json({ data: vehicles });
  } catch (error) {
    const err = error as Error;
    logger.error(`SAIC vehicles list error: ${err.message}`);
    res.status(err.name === 'SaicAuthError' ? 401 : 500).json({
      error: 'Failed to list vehicles',
      message: safeErrorMessage(err),
    });
  }
});

// GET /api/saic/vehicles/:vin/status - Get vehicle status
saicRouter.get('/vehicles/:vin/status', conditionalRefreshLimiter, async (req: Request, res: Response) => {
  try {
    const vin = req.params.vin as string;
    const refresh = req.query.refresh === 'true';

    const data = await getVehicleStatus(vin, refresh);

    if (!data) {
      res.json({ data: null, cached: false, message: 'No status data available. Try with ?refresh=true to wake the vehicle.' });
      return;
    }

    res.json({ data, cached: !refresh });
  } catch (error) {
    const err = error as Error;
    logger.error(`SAIC vehicle status error: ${err.message}`);

    if (err.name === 'SaicVehicleAsleepError') {
      res.status(504).json({ error: 'Vehicle is asleep', message: safeErrorMessage(err) });
      return;
    }

    res.status(err.name === 'SaicAuthError' ? 401 : 500).json({
      error: 'Failed to get vehicle status',
      message: safeErrorMessage(err),
    });
  }
});

// GET /api/saic/vehicles/:vin/charging - Get charging data
saicRouter.get('/vehicles/:vin/charging', conditionalRefreshLimiter, async (req: Request, res: Response) => {
  try {
    const vin = req.params.vin as string;
    const refresh = req.query.refresh === 'true';

    const data = await getChargingData(vin, refresh);

    if (!data) {
      res.json({ data: null, cached: false, message: 'No charging data available. Try with ?refresh=true.' });
      return;
    }

    res.json({ data, cached: !refresh });
  } catch (error) {
    const err = error as Error;
    logger.error(`SAIC charging data error: ${err.message}`);

    if (err.name === 'SaicVehicleAsleepError') {
      res.status(504).json({ error: 'Vehicle is asleep', message: safeErrorMessage(err) });
      return;
    }

    res.status(err.name === 'SaicAuthError' ? 401 : 500).json({
      error: 'Failed to get charging data',
      message: safeErrorMessage(err),
    });
  }
});

// GET /api/saic/vehicles/:vin/signals - Normalized signal view
saicRouter.get('/vehicles/:vin/signals', conditionalRefreshLimiter, async (req: Request, res: Response) => {
  try {
    const vin = req.params.vin as string;
    const refresh = req.query.refresh === 'true';

    const [statusData, chargingData] = await Promise.all([
      getVehicleStatus(vin, refresh).catch((err: Error) => {
        logger.warn(`Failed to get vehicle status for signals: ${err.message}`);
        return null;
      }),
      getChargingData(vin, refresh).catch((err: Error) => {
        logger.warn(`Failed to get charging data for signals: ${err.message}`);
        return null;
      }),
    ]);

    const signals = [
      ...(statusData ? normalizeVehicleStatus(statusData) : []),
      ...(chargingData ? normalizeChargingData(chargingData) : []),
    ];

    // De-duplicate by code, keeping the last occurrence (charging data may have better SOC/range)
    const signalMap = new Map<string, (typeof signals)[0]>();
    for (const signal of signals) {
      signalMap.set(signal.code, signal);
    }

    res.json({
      data: Array.from(signalMap.values()),
      count: signalMap.size,
      cached: !refresh,
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`SAIC signals error: ${err.message}`);
    res.status(err.name === 'SaicAuthError' ? 401 : 500).json({
      error: 'Failed to get vehicle signals',
      message: safeErrorMessage(err),
    });
  }
});

// GET /api/saic/vehicles/:vin/history - Get snapshot history
saicRouter.get('/vehicles/:vin/history', async (req: Request, res: Response) => {
  try {
    const vin = req.params.vin as string;
    const field = req.query.field as string | undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;

    const db = await getDatabase();
    const repo = new SaicRepository(db);

    if (field) {
      const history = repo.getSnapshotHistory(vin, field, limit);
      res.json({ data: history });
    } else {
      const latest = repo.getLatestSnapshots(vin);
      res.json({ data: latest });
    }
  } catch (error) {
    const err = error as Error;
    logger.error(`SAIC history error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get history', message: safeErrorMessage(err) });
  }
});

// --- Messages ---

// GET /api/saic/messages - Get alarm/command/news messages
saicRouter.get('/messages', async (req: Request, res: Response) => {
  try {
    const group = (String(req.query.group || 'ALARM')).toUpperCase() as 'ALARM' | 'COMMAND' | 'NEWS';
    const pageNum = req.query.pageNum ? parseInt(String(req.query.pageNum), 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(String(req.query.pageSize), 10) : 20;

    const messages = await getMessages(group, pageNum, pageSize);

    res.json({ data: messages });
  } catch (error) {
    const err = error as Error;
    logger.error(`SAIC messages error: ${err.message}`);
    res.status(err.name === 'SaicAuthError' ? 401 : 500).json({
      error: 'Failed to get messages',
      message: safeErrorMessage(err),
    });
  }
});

// GET /api/saic/messages/unreadCount - Get unread message count
saicRouter.get('/messages/unreadCount', async (_req: Request, res: Response) => {
  try {
    const counts = await getUnreadMessageCount();
    res.json({ data: counts });
  } catch (error) {
    const err = error as Error;
    logger.error(`SAIC unread count error: ${err.message}`);
    res.status(err.name === 'SaicAuthError' ? 401 : 500).json({
      error: 'Failed to get unread message count',
      message: safeErrorMessage(err),
    });
  }
});

// --- Commands ---

// Command name → handler map
const commandHandlers: Record<string, (vin: string, body: Record<string, unknown>) => Promise<unknown>> = {
  findVehicle: (vin, body) => findVehicle(vin, body.enable !== false),
  lock: (vin) => lock(vin),
  unlock: (vin, body) => unlock(vin, typeof body.lockId === 'number' ? body.lockId : 3),
  startClimate: (vin, body) => startClimate(
    vin,
    typeof body.temperature === 'number' ? body.temperature : 22,
    typeof body.fanSpeed === 'number' ? body.fanSpeed : 2
  ),
  stopClimate: (vin) => stopClimate(vin),
  heatedSeats: (vin, body) => setHeatedSeats(
    vin,
    typeof body.driverLevel === 'number' ? body.driverLevel : 0,
    typeof body.passengerLevel === 'number' ? body.passengerLevel : 0
  ),
  rearWindowHeat: (vin, body) => setRearWindowHeat(vin, body.enable !== false),
  startCharging: (vin) => saicStartCharging(vin),
  stopCharging: (vin) => saicStopCharging(vin),
  setChargeLimit: (vin, body) => {
    if (typeof body.percent !== 'number') {
      throw new Error('percent is required (40, 50, 60, 70, 80, 90, or 100)');
    }
    return setChargeLimit(vin, body.percent);
  },
  setChargeCurrent: (vin, body) => {
    if (typeof body.current !== 'string') {
      throw new Error('current is required (6A, 8A, 16A, or Max)');
    }
    return setChargeCurrent(vin, body.current);
  },
  batteryHeating: (vin, body) => setBatteryHeating(vin, body.enable !== false),
  frontDefrost: (vin, body) => setFrontDefrost(vin, body.enable !== false),
  climateMode: (vin, body) => {
    const validModes = ['ac', 'front', 'blowing'];
    const mode = typeof body.mode === 'string' && validModes.includes(body.mode)
      ? body.mode as ClimateMode
      : 'ac';
    return startClimateWithMode(
      vin,
      mode,
      typeof body.temperature === 'number' ? body.temperature : 22,
      typeof body.fanSpeed === 'number' ? body.fanSpeed : 2
    );
  },
  controlWindows: (vin, body) => {
    const validActions = ['close', 'ventilate', 'open'];
    const action = typeof body.action === 'string' && validActions.includes(body.action)
      ? body.action as 'close' | 'ventilate' | 'open'
      : undefined;
    if (!action) {
      throw new Error('action is required (close, ventilate, or open)');
    }
    return controlWindows(vin, action);
  },
  controlSunroof: (vin, body) => {
    const validActions = ['close', 'open'];
    const action = typeof body.action === 'string' && validActions.includes(body.action)
      ? body.action as 'close' | 'open'
      : undefined;
    if (!action) {
      throw new Error('action is required (close or open)');
    }
    return controlSunroof(vin, action);
  },
  heatedSteeringWheel: (vin, body) => setHeatedSteeringWheel(vin, body.enable !== false),
  chargingCableLock: (vin, body) => setChargingCableLock(vin, body.lock !== false),
  chargingSchedule: (vin, body) => {
    if (typeof body.startTime !== 'string' || typeof body.endTime !== 'string') {
      throw new Error('startTime and endTime are required (HH:MM format)');
    }
    const validModes = ['disabled', 'until_target_soc', 'until_scheduled_time'];
    const mode = typeof body.mode === 'string' && validModes.includes(body.mode)
      ? body.mode as ChargingScheduleMode
      : 'until_target_soc';
    return setChargingSchedule(vin, body.startTime, body.endTime, mode);
  },
  batteryHeatingSchedule: (vin, body) => {
    if (typeof body.startTime !== 'string') {
      throw new Error('startTime is required (HH:MM format)');
    }
    const validModes = ['on', 'off'];
    const mode = typeof body.mode === 'string' && validModes.includes(body.mode)
      ? body.mode as BatteryHeatingScheduleMode
      : 'on';
    return setBatteryHeatingSchedule(vin, body.startTime, mode);
  },
  alarmSwitches: (vin, body) => {
    if (typeof body.pin !== 'string') {
      throw new Error('pin is required');
    }
    if (!Array.isArray(body.switches)) {
      throw new Error('switches array is required');
    }
    return setAlarmSwitches(vin, body.pin, body.switches as AlarmSwitch[]);
  },
};

// POST /api/saic/vehicles/:vin/commands/:command - Execute a command
saicRouter.post('/vehicles/:vin/commands/:command', commandLimiter, async (req: Request, res: Response) => {
  try {
    const vin = req.params.vin as string;
    const command = req.params.command as string;

    const handler = commandHandlers[command];
    if (!handler) {
      res.status(400).json({
        error: `Unknown command: "${command}"`,
        availableCommands: Object.keys(commandHandlers),
      });
      return;
    }

    logger.info(`SAIC: Executing command "${command}" on VIN ${vin.slice(0, 6)}...`);
    const result = await handler(vin, req.body || {});

    res.status(200).json({ data: result, command, vin });
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    logger.error(`SAIC command error: ${err.message}`);

    if (err.name === 'SaicVehicleAsleepError') {
      res.status(504).json({
        error: 'Vehicle is asleep and did not respond to the command',
        message: safeErrorMessage(err),
      });
      return;
    }

    if (err.name === 'SaicAuthError') {
      res.status(401).json({ error: 'Authentication failed', message: safeErrorMessage(err) });
      return;
    }

    res.status(err.statusCode || 500).json({
      error: 'Command failed',
      message: safeErrorMessage(err),
    });
  }
});

// GET /api/saic/vehicles/:vin/commands - Get command history
saicRouter.get('/vehicles/:vin/commands', async (req: Request, res: Response) => {
  try {
    const vin = req.params.vin as string;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

    const db = await getDatabase();
    const repo = new SaicRepository(db);
    const logs = repo.getCommandLogs(vin, limit, offset);

    res.json({ data: logs });
  } catch (error) {
    const err = error as Error;
    logger.error(`SAIC command logs error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get command logs', message: safeErrorMessage(err) });
  }
});
