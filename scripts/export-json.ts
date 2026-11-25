/**
 * Exports DB state to static JSON files consumed by the Next.js app on Vercel.
 * Run after every snapshot: `tsx scripts/export-json.ts`
 * Writes to web/public/data/{live,stats,history}.json
 */
import { DatabaseSync } from 'node:sqlite';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DB_PATH = process.env.WICK_DB_PATH ?? join(process.cwd(), 'data', 'wick.db');
const OUT_DIR = join(process.cwd(), 'web', 'public', 'data');

type Cohort = 'gainers_only' | 'both' | 'most_visited_only' | 'trending_only';

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function q<T>(stmt: ReturnType<DatabaseSync['prepare']>, ...args: any[]): T[] {
  return stmt.all(...args) as unknown as T[];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function qOne<T>(stmt: ReturnType<DatabaseSync['prepare']>, ...args: any[]): T | undefined {
  return stmt.get(...args) as unknown as T | undefined;
}

if (!existsSync(DB_PATH)) {
  console.log('[export] no DB yet, writing empty stubs');
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'live.json'), JSON.stringify({ captured_at: null, window_count: 0, coins: [] }));
  writeFileSync(join(OUT_DIR, 'stats.json'), JSON.stringify([]));
  writeFileSync(join(OUT_DIR, 'history.json'), JSON.stringify([]));
  process.exit(0);
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');

// --- live snapshot ---
type WindowRow = { captured_at: string };
const latest = qOne<WindowRow>(db.prepare(`SELECT captured_at FROM snapshots ORDER BY captured_at DESC LIMIT 1`));
const windowCount = (qOne<{ n: number }>(db.prepare(`SELECT COUNT(DISTINCT captured_at) as n FROM snapshots`))?.n ?? 0);

type AppRow = { id: number; cmc_id: number; symbol: string; name: string; price_usd: number | null; pct_change_24h: number | null; pct_change_1h: number | null; volume_24h: number | null; fear_greed: number | null; endpoint: string };

let liveCoins: unknown[] = [];
if (latest) {
  const apps = q<AppRow>(db.prepare(`
    SELECT a.id, a.cmc_id, a.symbol, a.name, a.price_usd, a.pct_change_24h, a.pct_change_1h, a.volume_24h, a.fear_greed, a.endpoint
    FROM appearances a JOIN snapshots s ON s.id = a.snapshot_id WHERE s.captured_at = ?
  `), latest.captured_at);

  const gainers = new Map<number, AppRow>();
  const mv = new Map<number, AppRow>();
  const trending = new Map<number, AppRow>();
  for (const a of apps) {
    if (a.endpoint === 'gainers') gainers.set(a.cmc_id, a);
    else if (a.endpoint === 'most_visited') mv.set(a.cmc_id, a);
    else if (a.endpoint === 'trending') trending.set(a.cmc_id, a);
  }
  const allIds = new Set([...gainers.keys(), ...mv.keys(), ...trending.keys()]);
  for (const cmc_id of allIds) {
    const inG = gainers.has(cmc_id), inMV = mv.has(cmc_id);
    const cohort: Cohort = inG && inMV ? 'both' : inG ? 'gainers_only' : inMV ? 'most_visited_only' : 'trending_only';
    const p = gainers.get(cmc_id) ?? mv.get(cmc_id) ?? trending.get(cmc_id)!;
    liveCoins.push({ cmc_id, symbol: p.symbol, name: p.name, price_usd: p.price_usd, pct_change_24h: p.pct_change_24h, pct_change_1h: p.pct_change_1h, volume_24h: p.volume_24h, fear_greed: p.fear_greed, cohort });
  }
  const order: Record<Cohort, number> = { both: 0, gainers_only: 1, most_visited_only: 2, trending_only: 3 };
  liveCoins.sort((a: any, b: any) => order[a.cohort as Cohort] - order[b.cohort as Cohort]);
}

writeFileSync(join(OUT_DIR, 'live.json'), JSON.stringify({ captured_at: latest?.captured_at ?? null, window_count: windowCount, coins: liveCoins }));
console.log(`[export] live.json: ${liveCoins.length} coins`);

// --- cohort stats ---
const windows = q<WindowRow>(db.prepare(`SELECT DISTINCT captured_at FROM snapshots`));
const cohortData = new Map<Cohort, { t24h: number[]; t7d: number[]; count: number }>();
for (const c of ['gainers_only', 'both', 'most_visited_only', 'trending_only'] as Cohort[]) cohortData.set(c, { t24h: [], t7d: [], count: 0 });

type SlimRow = { id: number; cmc_id: number; endpoint: string };
type OutcomeRow = { horizon: string; pct_change: number | null };

for (const { captured_at } of windows) {
  const apps = q<SlimRow>(db.prepare(`SELECT a.id, a.cmc_id, a.endpoint FROM appearances a JOIN snapshots s ON s.id=a.snapshot_id WHERE s.captured_at=?`), captured_at);
  const gIds = new Set(apps.filter(a => a.endpoint === 'gainers').map(a => a.cmc_id));
  const mvIds = new Set(apps.filter(a => a.endpoint === 'most_visited').map(a => a.cmc_id));
  for (const cmc_id of new Set(apps.map(a => a.cmc_id))) {
    const inG = gIds.has(cmc_id), inMV = mvIds.has(cmc_id);
    const cohort: Cohort = inG && inMV ? 'both' : inG ? 'gainers_only' : inMV ? 'most_visited_only' : 'trending_only';
    const d = cohortData.get(cohort)!;
    d.count++;
    const pep = inG ? 'gainers' : inMV ? 'most_visited' : 'trending';
    const app = apps.find(a => a.cmc_id === cmc_id && a.endpoint === pep);
    if (!app) continue;
    for (const o of q<OutcomeRow>(db.prepare(`SELECT horizon, pct_change FROM outcomes WHERE appearance_id=? AND pct_change IS NOT NULL`), app.id)) {
      if (o.pct_change == null) continue;
      if (o.horizon === 'T24h') d.t24h.push(o.pct_change);
      if (o.horizon === 'T7d') d.t7d.push(o.pct_change);
    }
  }
}

const stats = (['gainers_only', 'both', 'most_visited_only', 'trending_only'] as Cohort[]).map(cohort => {
  const d = cohortData.get(cohort)!;
  return { cohort, count: d.count, median_T24h: median(d.t24h), median_T7d: median(d.t7d), pct_negative_T7d: d.t7d.length ? (d.t7d.filter(v => v < 0).length / d.t7d.length) * 100 : null };
});
writeFileSync(join(OUT_DIR, 'stats.json'), JSON.stringify(stats));
console.log('[export] stats.json');

// --- history (with per-window cohort counts) ---
type RawHistRow = { captured_at: string; total_coins: number; fear_greed: number | null };
const rawHistory = q<RawHistRow>(db.prepare(`
  SELECT s.captured_at, COUNT(DISTINCT a.cmc_id) as total_coins, AVG(a.fear_greed) as fear_greed
  FROM (SELECT DISTINCT captured_at FROM snapshots ORDER BY captured_at DESC LIMIT 48) s
  LEFT JOIN appearances a ON a.snapshot_id IN (SELECT id FROM snapshots WHERE captured_at = s.captured_at)
  GROUP BY s.captured_at ORDER BY s.captured_at DESC
`));

// Compute per-window cohort breakdown
type WindowCohortsRow = { cmc_id: number; endpoint: string };
const history = rawHistory.map(row => {
  if (row.total_coins === 0) return { ...row, signal: 0, noise: 0, organic: 0, trending: 0 };
  const apps = q<WindowCohortsRow>(db.prepare(`
    SELECT a.cmc_id, a.endpoint FROM appearances a
    JOIN snapshots s ON s.id = a.snapshot_id WHERE s.captured_at = ?
  `), row.captured_at);
  const gIds = new Set(apps.filter(a => a.endpoint === 'gainers').map(a => a.cmc_id));
  const mvIds = new Set(apps.filter(a => a.endpoint === 'most_visited').map(a => a.cmc_id));
  const allIds = new Set(apps.map(a => a.cmc_id));
  let signal = 0, noise = 0, organic = 0, trending = 0;
  for (const id of allIds) {
    const inG = gIds.has(id), inMV = mvIds.has(id);
    if (inG && inMV) signal++;
    else if (inG) noise++;
    else if (inMV) organic++;
    else trending++;
  }
  return { ...row, signal, noise, organic, trending };
});

writeFileSync(join(OUT_DIR, 'history.json'), JSON.stringify(history));
console.log(`[export] history.json: ${history.length} windows`);

// --- evidence ---
type EviRow = { symbol: string; name: string; captured_at: string; endpoint: string; price_usd: number | null; pct_change_24h: number | null; horizon: string | null; outcome_price: number | null; outcome_pct: number | null; source_call: string | null };
const evidence = q<EviRow>(db.prepare(`
  SELECT a.symbol, a.name, s.captured_at, a.endpoint,
    a.price_usd, a.pct_change_24h,
    o.horizon, o.price_usd as outcome_price, o.pct_change as outcome_pct, o.source_call
  FROM appearances a
  JOIN snapshots s ON s.id = a.snapshot_id
  LEFT JOIN outcomes o ON o.appearance_id = a.id
  ORDER BY s.captured_at DESC, a.symbol ASC
  LIMIT 500
`));
writeFileSync(join(OUT_DIR, 'evidence.json'), JSON.stringify(evidence));
console.log(`[export] evidence.json: ${evidence.length} rows`);

console.log('[export] done →', OUT_DIR);
