import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DB_PATH = process.env.WICK_DB_PATH ?? join(process.cwd(), 'data', 'wick.db');
const SCHEMA_PATH = join(process.cwd(), 'recorder', 'schema.sql');

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;
  _db = new DatabaseSync(DB_PATH);
  _db.exec('PRAGMA journal_mode = WAL');
  const schema = readFileSync(SCHEMA_PATH, 'utf8');
  _db.exec(schema);
  return _db;
}

export interface SnapshotRow {
  captured_at: string;
  endpoint: 'gainers' | 'most_visited' | 'trending';
  raw_json: string;
  credits: number | null;
  status_code: number;
}

export interface AppearanceRow {
  snapshot_id: number;
  cmc_id: number;
  symbol: string;
  name: string;
  price_usd: number | null;
  volume_24h: number | null;
  pct_change_1h: number | null;
  pct_change_24h: number | null;
  fear_greed: number | null;
  endpoint: string;
}

export function insertSnapshot(row: SnapshotRow): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO snapshots (captured_at, endpoint, raw_json, credits, status_code)
    VALUES (:captured_at, :endpoint, :raw_json, :credits, :status_code)
  `);
  const result = stmt.run(row as unknown as Record<string, unknown>);
  return Number(result.lastInsertRowid);
}

export function insertAppearances(rows: AppearanceRow[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO appearances
      (snapshot_id, cmc_id, symbol, name, price_usd, volume_24h,
       pct_change_1h, pct_change_24h, fear_greed, endpoint)
    VALUES
      (:snapshot_id, :cmc_id, :symbol, :name, :price_usd, :volume_24h,
       :pct_change_1h, :pct_change_24h, :fear_greed, :endpoint)
  `);
  for (const row of rows) {
    stmt.run(row as unknown as Record<string, unknown>);
  }
}
