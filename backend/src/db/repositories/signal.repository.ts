import { Database as SqlJsDatabase } from 'sql.js';
import { saveDatabase } from '../database';

export interface StoredSignalSnapshot {
  id: number;
  vehicle_id: string;
  signal_code: string;
  value: string | null;
  data_age: string | null;
  recorded_at: string;
}

export class SignalRepository {
  constructor(private db: SqlJsDatabase) {}

  getLatestSignals(vehicleId: string): StoredSignalSnapshot[] {
    const results: StoredSignalSnapshot[] = [];
    const stmt = this.db.prepare(`
      SELECT s1.* FROM signal_snapshots s1
      INNER JOIN (
        SELECT vehicle_id, signal_code, MAX(recorded_at) as max_recorded
        FROM signal_snapshots
        WHERE vehicle_id = ?
        GROUP BY vehicle_id, signal_code
      ) s2 ON s1.vehicle_id = s2.vehicle_id
        AND s1.signal_code = s2.signal_code
        AND s1.recorded_at = s2.max_recorded
      ORDER BY s1.signal_code
    `);
    stmt.bind([vehicleId]);
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as StoredSignalSnapshot);
    }
    stmt.free();
    return results;
  }

  getSignalHistory(vehicleId: string, signalCode: string, limit = 100): StoredSignalSnapshot[] {
    const results: StoredSignalSnapshot[] = [];
    const stmt = this.db.prepare(
      'SELECT * FROM signal_snapshots WHERE vehicle_id = ? AND signal_code = ? ORDER BY recorded_at DESC LIMIT ?'
    );
    stmt.bind([vehicleId, signalCode, limit]);
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as StoredSignalSnapshot);
    }
    stmt.free();
    return results;
  }

  saveSignal(vehicleId: string, signalCode: string, value: string | null, dataAge?: string): void {
    this.db.run(
      'INSERT INTO signal_snapshots (vehicle_id, signal_code, value, data_age) VALUES (?, ?, ?, ?)',
      [vehicleId, signalCode, value, dataAge || null]
    );
    saveDatabase();
  }
}
