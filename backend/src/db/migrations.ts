import { Database as SqlJsDatabase } from 'sql.js';
import { logger } from '../utils/logger';

export function runMigrations(db: SqlJsDatabase): void {
  logger.info('Running database migrations...');

  db.run(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      access_token TEXT NOT NULL,
      token_type TEXT NOT NULL DEFAULT 'Bearer',
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      external_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS connections (
      connection_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      vehicle_id TEXT,
      mode TEXT DEFAULT 'simulated',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS vehicles (
      vehicle_id TEXT PRIMARY KEY,
      make TEXT,
      model TEXT,
      year INTEGER,
      powertrain_type TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT UNIQUE,
      event_type TEXT NOT NULL,
      vehicle_id TEXT,
      payload TEXT NOT NULL,
      received_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS signal_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id TEXT NOT NULL,
      signal_code TEXT NOT NULL,
      value TEXT,
      data_age TEXT,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_signal_snapshots_vehicle
    ON signal_snapshots(vehicle_id, signal_code)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_webhook_events_type
    ON webhook_events(event_type)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS command_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      command_type TEXT NOT NULL,
      status TEXT NOT NULL,
      request_body TEXT,
      response_body TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_command_logs_vehicle
    ON command_logs(vehicle_id, created_at)
  `);

  // --- SAIC tables ---

  db.run(`
    CREATE TABLE IF NOT EXISTS saic_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      password_enc TEXT NOT NULL,
      region TEXT NOT NULL DEFAULT 'il',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS saic_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES saic_accounts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS saic_vehicles (
      vin TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL,
      model TEXT,
      name TEXT,
      config_json TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES saic_accounts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS saic_state_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vin TEXT NOT NULL,
      field TEXT NOT NULL,
      value TEXT,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_saic_state_snapshots_vin_field
    ON saic_state_snapshots(vin, field)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS saic_command_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vin TEXT NOT NULL,
      command TEXT NOT NULL,
      status TEXT NOT NULL,
      request_body TEXT,
      response_body TEXT,
      event_id TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_saic_command_logs_vin
    ON saic_command_logs(vin, created_at)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS saic_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vin TEXT,
      message_id TEXT UNIQUE,
      type TEXT,
      title TEXT,
      content TEXT,
      message_time TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS saic_charging_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vin TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'charging',
      start_time TEXT NOT NULL DEFAULT (datetime('now')),
      end_time TEXT,
      start_soc_pct REAL NOT NULL,
      end_soc_pct REAL,
      start_battery_kwh REAL NOT NULL,
      end_battery_kwh REAL,
      energy_added_kwh REAL,
      start_odometer_km REAL NOT NULL,
      end_odometer_km REAL,
      distance_since_last_charge_km REAL,
      energy_used_since_last_charge_kwh REAL,
      efficiency_kwh_per_100km REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_saic_charging_sessions_vin
    ON saic_charging_sessions(vin, start_time)
  `);

  logger.info('Database migrations completed');
}
