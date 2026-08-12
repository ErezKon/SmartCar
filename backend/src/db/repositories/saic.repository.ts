import { Database as SqlJsDatabase } from 'sql.js';
import { saveDatabase } from '../database';

export interface SaicAccount {
  id: number;
  username: string;
  password_enc: string;
  region: string;
  created_at: string;
  updated_at: string;
}

export interface SaicToken {
  id: number;
  account_id: number;
  access_token: string;
  refresh_token: string | null;
  expires_at: number;
  created_at: string;
}

export interface SaicVehicle {
  vin: string;
  account_id: number;
  model: string | null;
  name: string | null;
  config_json: string | null;
  updated_at: string;
}

export interface SaicStateSnapshot {
  id: number;
  vin: string;
  field: string;
  value: string | null;
  recorded_at: string;
}

export interface SaicCommandLog {
  id: number;
  vin: string;
  command: string;
  status: string;
  request_body: string | null;
  response_body: string | null;
  event_id: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface SaicMessage {
  id: number;
  vin: string | null;
  message_id: string;
  type: string | null;
  title: string | null;
  content: string | null;
  message_time: string | null;
  created_at: string;
}

export class SaicRepository {
  constructor(private db: SqlJsDatabase) {}

  // --- Accounts ---

  getAccount(): SaicAccount | null {
    const stmt = this.db.prepare('SELECT * FROM saic_accounts ORDER BY id DESC LIMIT 1');
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as SaicAccount;
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  saveAccount(username: string, passwordEnc: string, region: string): number {
    // Only allow one account at a time — delete existing
    this.db.run('DELETE FROM saic_accounts');
    this.db.run(
      'INSERT INTO saic_accounts (username, password_enc, region) VALUES (?, ?, ?)',
      [username, passwordEnc, region]
    );
    saveDatabase();
    const stmt = this.db.prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    const row = stmt.getAsObject() as { id: number };
    stmt.free();
    return row.id;
  }

  deleteAccount(): void {
    this.db.run('DELETE FROM saic_messages');
    this.db.run('DELETE FROM saic_command_logs');
    this.db.run('DELETE FROM saic_state_snapshots');
    this.db.run('DELETE FROM saic_vehicles');
    this.db.run('DELETE FROM saic_tokens');
    this.db.run('DELETE FROM saic_accounts');
    saveDatabase();
  }

  // --- Tokens ---

  getLatestToken(accountId: number): SaicToken | null {
    const stmt = this.db.prepare(
      'SELECT * FROM saic_tokens WHERE account_id = ? ORDER BY id DESC LIMIT 1'
    );
    stmt.bind([accountId]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as SaicToken;
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  saveToken(accountId: number, accessToken: string, refreshToken: string | null, expiresAt: number): void {
    this.db.run(
      'INSERT INTO saic_tokens (account_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
      [accountId, accessToken, refreshToken, expiresAt]
    );
    saveDatabase();
  }

  deleteExpiredTokens(): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.run('DELETE FROM saic_tokens WHERE expires_at < ?', [now]);
    saveDatabase();
  }

  // --- Vehicles ---

  getVehicles(accountId: number): SaicVehicle[] {
    const results: SaicVehicle[] = [];
    const stmt = this.db.prepare('SELECT * FROM saic_vehicles WHERE account_id = ?');
    stmt.bind([accountId]);
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as SaicVehicle);
    }
    stmt.free();
    return results;
  }

  upsertVehicle(vin: string, accountId: number, model: string | null, name: string | null, configJson: string | null): void {
    this.db.run(
      `INSERT INTO saic_vehicles (vin, account_id, model, name, config_json, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(vin) DO UPDATE SET
         model = excluded.model,
         name = excluded.name,
         config_json = excluded.config_json,
         updated_at = datetime('now')`,
      [vin, accountId, model, name, configJson]
    );
    saveDatabase();
  }

  getCachedVehicles(): SaicVehicle[] {
    const results: SaicVehicle[] = [];
    const stmt = this.db.prepare('SELECT * FROM saic_vehicles');
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as SaicVehicle);
    }
    stmt.free();
    return results;
  }

  // --- State Snapshots ---

  saveSnapshot(vin: string, field: string, value: string | null): void {
    this.db.run(
      'INSERT INTO saic_state_snapshots (vin, field, value) VALUES (?, ?, ?)',
      [vin, field, value]
    );
    saveDatabase();
  }

  saveBulkSnapshots(vin: string, fields: Array<{ field: string; value: string | null }>): void {
    for (const { field, value } of fields) {
      this.db.run(
        'INSERT INTO saic_state_snapshots (vin, field, value) VALUES (?, ?, ?)',
        [vin, field, value]
      );
    }
    saveDatabase();
  }

  getLatestSnapshots(vin: string): SaicStateSnapshot[] {
    const results: SaicStateSnapshot[] = [];
    const stmt = this.db.prepare(`
      SELECT s1.* FROM saic_state_snapshots s1
      INNER JOIN (
        SELECT vin, field, MAX(recorded_at) as max_recorded
        FROM saic_state_snapshots
        WHERE vin = ?
        GROUP BY vin, field
      ) s2 ON s1.vin = s2.vin AND s1.field = s2.field AND s1.recorded_at = s2.max_recorded
      ORDER BY s1.field
    `);
    stmt.bind([vin]);
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as SaicStateSnapshot);
    }
    stmt.free();
    return results;
  }

  getSnapshotHistory(vin: string, field: string, limit = 100): SaicStateSnapshot[] {
    const results: SaicStateSnapshot[] = [];
    const stmt = this.db.prepare(
      'SELECT * FROM saic_state_snapshots WHERE vin = ? AND field = ? ORDER BY recorded_at DESC LIMIT ?'
    );
    stmt.bind([vin, field, limit]);
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as SaicStateSnapshot);
    }
    stmt.free();
    return results;
  }

  // --- Command Logs ---

  logCommand(
    vin: string,
    command: string,
    status: string,
    requestBody?: unknown,
    responseBody?: unknown,
    eventId?: string,
    durationMs?: number
  ): void {
    this.db.run(
      `INSERT INTO saic_command_logs (vin, command, status, request_body, response_body, event_id, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        vin,
        command,
        status,
        requestBody ? JSON.stringify(requestBody) : null,
        responseBody ? JSON.stringify(responseBody) : null,
        eventId || null,
        durationMs || null,
      ]
    );
    saveDatabase();
  }

  getCommandLogs(vin: string, limit = 50, offset = 0): SaicCommandLog[] {
    const results: SaicCommandLog[] = [];
    const stmt = this.db.prepare(
      'SELECT * FROM saic_command_logs WHERE vin = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    );
    stmt.bind([vin, limit, offset]);
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as SaicCommandLog);
    }
    stmt.free();
    return results;
  }

  // --- Messages ---

  saveMessage(
    vin: string | null,
    messageId: string,
    type: string | null,
    title: string | null,
    content: string | null,
    messageTime: string | null
  ): void {
    this.db.run(
      `INSERT OR IGNORE INTO saic_messages (vin, message_id, type, title, content, message_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [vin, messageId, type, title, content, messageTime]
    );
    saveDatabase();
  }

  getMessages(limit = 50, offset = 0): SaicMessage[] {
    const results: SaicMessage[] = [];
    const stmt = this.db.prepare(
      'SELECT * FROM saic_messages ORDER BY created_at DESC LIMIT ? OFFSET ?'
    );
    stmt.bind([limit, offset]);
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as SaicMessage);
    }
    stmt.free();
    return results;
  }
}
