import { Database as SqlJsDatabase } from 'sql.js';
import { saveDatabase } from '../database';
import { CommandLogEntry } from '../../api/types/commands';

export class CommandLogRepository {
  constructor(private db: SqlJsDatabase) {}

  logCommand(
    vehicleId: string,
    userId: string,
    commandType: string,
    status: string,
    requestBody?: unknown,
    responseBody?: unknown,
    durationMs?: number
  ): void {
    this.db.run(
      `INSERT INTO command_logs (vehicle_id, user_id, command_type, status, request_body, response_body, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicleId,
        userId,
        commandType,
        status,
        requestBody ? JSON.stringify(requestBody) : null,
        responseBody ? JSON.stringify(responseBody) : null,
        durationMs || null,
      ]
    );
    saveDatabase();
  }

  getCommandLogs(vehicleId?: string, limit = 50, offset = 0): CommandLogEntry[] {
    const results: CommandLogEntry[] = [];
    let query: string;
    let params: (string | number)[];

    if (vehicleId) {
      query = 'SELECT * FROM command_logs WHERE vehicle_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params = [vehicleId, limit, offset];
    } else {
      query = 'SELECT * FROM command_logs ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params = [limit, offset];
    }

    const stmt = this.db.prepare(query);
    stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as CommandLogEntry);
    }
    stmt.free();
    return results;
  }

  getCommandLogsByType(commandType: string, limit = 50): CommandLogEntry[] {
    const results: CommandLogEntry[] = [];
    const stmt = this.db.prepare(
      'SELECT * FROM command_logs WHERE command_type = ? ORDER BY created_at DESC LIMIT ?'
    );
    stmt.bind([commandType, limit]);
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as CommandLogEntry);
    }
    stmt.free();
    return results;
  }
}
