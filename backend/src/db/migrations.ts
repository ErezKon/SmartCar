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

  logger.info('Database migrations completed');
}
