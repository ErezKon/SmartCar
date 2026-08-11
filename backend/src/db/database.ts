import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let db: SqlJsDatabase | null = null;

export async function getDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();
  const dbPath = path.resolve(env.DATABASE_PATH);
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    logger.info(`SQLite database loaded from ${dbPath}`);
  } else {
    db = new SQL.Database();
    logger.info(`New SQLite database created at ${dbPath}`);
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  return db;
}

export function saveDatabase(): void {
  if (!db) return;
  const dbPath = path.resolve(env.DATABASE_PATH);
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    logger.info('SQLite database closed');
  }
}

// Auto-save periodically
let saveInterval: NodeJS.Timeout | null = null;

export function startAutoSave(intervalMs = 30000): void {
  if (saveInterval) return;
  saveInterval = setInterval(() => {
    saveDatabase();
  }, intervalMs);
}

export function stopAutoSave(): void {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
}
