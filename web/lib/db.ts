import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type Cohort = 'gainers_only' | 'both' | 'most_visited_only' | 'trending_only';

export interface CoinEntry {
  cmc_id: number;
  symbol: string;
  name: string;
  price_usd: number | null;
  pct_change_24h: number | null;
  pct_change_1h: number | null;
  volume_24h: number | null;
  fear_greed: number | null;
  cohort: Cohort;
}

export interface LatestSnapshot {
  captured_at: string;
  window_count: number;
  coins: CoinEntry[];
}

export interface CohortStats {
  cohort: Cohort;
  count: number;
  median_T24h: number | null;
  median_T7d: number | null;
  pct_negative_T7d: number | null;
}

// When running `cd web && next dev`, cwd is `web/`
const DB_PATH = process.env.WICK_DB_PATH ?? join(process.cwd(), '..', 'data', 'wick.db');

function openDb(): DatabaseSync | null {
  if (!existsSync(DB_PATH)) return null;
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  return db;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

type AppRow = {
  id: number; cmc_id: number; symbol: string; name: string;
  price_usd: number | null; pct_change_24h: number | null;
  pct_change_1h: number | null; volume_24h: number | null;
  fear_greed: number | null; endpoint: string;
};

// node:sqlite types don't accept `unknown` for bind params — cast through any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function q<T>(stmt: ReturnType<DatabaseSync['prepare']>, ...args: any[]): T[] {
  return stmt.all(...args) as unknown as T[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function qOne<T>(stmt: ReturnType<DatabaseSync['prepare']>, ...args: any[]): T | undefined {
  return stmt.get(...args) as unknown as T | undefined;
}

function classifyWindow(db: DatabaseSync, captured_at: string): CoinEntry[] {
  const appearances = q<AppRow>(db.prepare(`
    SELECT a.id, a.cmc_id, a.symbol, a.name, a.price_usd,
           a.pct_change_24h, a.pct_change_1h, a.volume_24h,
           a.fear_greed, a.endpoint
    FROM appearances a
    JOIN snapshots s ON s.id = a.snapshot_id
    WHERE s.captured_at = ?
  `), captured_at);

  const gainers = new Map<number, AppRow>();
  const mostVisited = new Map<number, AppRow>();
  const trending = new Map<number, AppRow>();

  for (const a of appearances) {
    if (a.endpoint === 'gainers') gainers.set(a.cmc_id, a);
    else if (a.endpoint === 'most_visited') mostVisited.set(a.cmc_id, a);
    else if (a.endpoint === 'trending') trending.set(a.cmc_id, a);
  }

  const allIds = new Set([...gainers.keys(), ...mostVisited.keys(), ...trending.keys()]);
  const coins: CoinEntry[] = [];

  for (const cmc_id of allIds) {
    const inG = gainers.has(cmc_id);
    const inMV = mostVisited.has(cmc_id);
    const cohort: Cohort = inG && inMV ? 'both' : inG ? 'gainers_only' : inMV ? 'most_visited_only' : 'trending_only';
    const p = gainers.get(cmc_id) ?? mostVisited.get(cmc_id) ?? trending.get(cmc_id)!;
    coins.push({ cmc_id, symbol: p.symbol, name: p.name, price_usd: p.price_usd, pct_change_24h: p.pct_change_24h, pct_change_1h: p.pct_change_1h, volume_24h: p.volume_24h, fear_greed: p.fear_greed, cohort });
  }

  const order: Record<Cohort, number> = { both: 0, gainers_only: 1, most_visited_only: 2, trending_only: 3 };
  return coins.sort((a, b) => order[a.cohort] - order[b.cohort]);
}

export function getLatestSnapshot(): LatestSnapshot | null {
  const db = openDb();
  if (!db) return null;

  type WindowRow = { captured_at: string };
  const latest = qOne<WindowRow>(db.prepare(`SELECT captured_at FROM snapshots ORDER BY captured_at DESC LIMIT 1`));
  if (!latest) return { captured_at: '', window_count: 0, coins: [] };

  const countRow = qOne<{ n: number }>(db.prepare(`SELECT COUNT(DISTINCT captured_at) as n FROM snapshots`));
  const window_count = countRow?.n ?? 0;
  const coins = classifyWindow(db, latest.captured_at);

  return { captured_at: latest.captured_at, window_count, coins };
}

export function getCohortStats(): CohortStats[] {
  const db = openDb();
  if (!db) return [];

  type WindowRow = { captured_at: string };
  const windows = q<WindowRow>(db.prepare(`SELECT DISTINCT captured_at FROM snapshots ORDER BY captured_at`));

  const cohortData = new Map<Cohort, { t24h: number[]; t7d: number[]; count: number }>();
  for (const c of ['gainers_only', 'both', 'most_visited_only', 'trending_only'] as Cohort[]) {
    cohortData.set(c, { t24h: [], t7d: [], count: 0 });
  }

  type SlimRow = { id: number; cmc_id: number; endpoint: string };
  type OutcomeRow = { horizon: string; pct_change: number | null };

  for (const { captured_at } of windows) {
    const apps = q<SlimRow>(db.prepare(`
      SELECT a.id, a.cmc_id, a.endpoint
      FROM appearances a JOIN snapshots s ON s.id = a.snapshot_id
      WHERE s.captured_at = ?
    `), captured_at);

    const gainersIds = new Set(apps.filter(a => a.endpoint === 'gainers').map(a => a.cmc_id));
    const mvIds = new Set(apps.filter(a => a.endpoint === 'most_visited').map(a => a.cmc_id));
    const allCmcIds = new Set(apps.map(a => a.cmc_id));

    for (const cmc_id of allCmcIds) {
      const inG = gainersIds.has(cmc_id);
      const inMV = mvIds.has(cmc_id);
      const cohort: Cohort = inG && inMV ? 'both' : inG ? 'gainers_only' : inMV ? 'most_visited_only' : 'trending_only';
      const data = cohortData.get(cohort)!;
      data.count++;

      const primaryEndpoint = inG ? 'gainers' : inMV ? 'most_visited' : 'trending';
      const app = apps.find(a => a.cmc_id === cmc_id && a.endpoint === primaryEndpoint);
      if (!app) continue;

      const outcomes = q<OutcomeRow>(
        db.prepare(`SELECT horizon, pct_change FROM outcomes WHERE appearance_id = ? AND pct_change IS NOT NULL`),
        app.id
      );
      for (const o of outcomes) {
        if (o.pct_change == null) continue;
        if (o.horizon === 'T24h') data.t24h.push(o.pct_change);
        if (o.horizon === 'T7d') data.t7d.push(o.pct_change);
      }
    }
  }

  return (['gainers_only', 'both', 'most_visited_only', 'trending_only'] as Cohort[]).map(cohort => {
    const d = cohortData.get(cohort)!;
    return {
      cohort, count: d.count, median_T24h: median(d.t24h), median_T7d: median(d.t7d),
      pct_negative_T7d: d.t7d.length ? (d.t7d.filter(v => v < 0).length / d.t7d.length) * 100 : null,
    };
  });
}

export function getSnapshotHistory(): Array<{ captured_at: string; total_coins: number; fear_greed: number | null }> {
  const db = openDb();
  if (!db) return [];

  type HistRow = { captured_at: string; total_coins: number; fear_greed: number | null };
  return q<HistRow>(db.prepare(`
    SELECT s.captured_at,
           COUNT(DISTINCT a.cmc_id) as total_coins,
           AVG(a.fear_greed) as fear_greed
    FROM snapshots s
    JOIN appearances a ON a.snapshot_id = s.id
    GROUP BY s.captured_at
    ORDER BY s.captured_at DESC
    LIMIT 48
  `));
}
