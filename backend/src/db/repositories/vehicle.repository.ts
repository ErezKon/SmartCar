import { Database as SqlJsDatabase } from 'sql.js';
import { saveDatabase } from '../database';

export interface StoredVehicle {
  vehicle_id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  powertrain_type: string | null;
  updated_at: string;
}

export class VehicleRepository {
  constructor(private db: SqlJsDatabase) {}

  getVehicle(vehicleId: string): StoredVehicle | null {
    const stmt = this.db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?');
    stmt.bind([vehicleId]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as StoredVehicle;
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  getAllVehicles(): StoredVehicle[] {
    const results: StoredVehicle[] = [];
    const stmt = this.db.prepare('SELECT * FROM vehicles ORDER BY updated_at DESC');
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as StoredVehicle);
    }
    stmt.free();
    return results;
  }

  upsertVehicle(vehicleId: string, make?: string, model?: string, year?: number, powertrainType?: string): void {
    this.db.run(
      `INSERT INTO vehicles (vehicle_id, make, model, year, powertrain_type, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(vehicle_id) DO UPDATE SET
         make = COALESCE(excluded.make, vehicles.make),
         model = COALESCE(excluded.model, vehicles.model),
         year = COALESCE(excluded.year, vehicles.year),
         powertrain_type = COALESCE(excluded.powertrain_type, vehicles.powertrain_type),
         updated_at = datetime('now')`,
      [vehicleId, make || null, model || null, year || null, powertrainType || null]
    );
    saveDatabase();
  }

  deleteVehicle(vehicleId: string): void {
    this.db.run('DELETE FROM vehicles WHERE vehicle_id = ?', [vehicleId]);
    saveDatabase();
  }
}
