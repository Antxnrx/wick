import { getDb } from '../recorder/db.js';

export type Cohort = 'gainers_only' | 'both' | 'most_visited_only' | 'trending_only';

export interface Classification {
  cmc_id: number;
  symbol: string;
  name: string;
  captured_at: string;
  fear_greed: number | null;
  cohort: Cohort;
  price_usd: number | null;
  pct_change_24h: number | null;
  gainers_appearance_id: number | null;
  most_visited_appearance_id: number | null;
}

export function classifyWindow(capturedAt: string): Classification[] {
  const db = getDb();

  type AppRow = {
    id: number; cmc_id: number; symbol: string; name: string;
    price_usd: number | null; pct_change_24h: number | null;
    fear_greed: number | null; endpoint: string;
  };

  const appearances = db
    .prepare(`
      SELECT a.* FROM appearances a
      JOIN snapshots s ON s.id = a.snapshot_id
      WHERE s.captured_at = ?
      ORDER BY a.endpoint
    `)
    .all(capturedAt) as AppRow[];

  const gainers = new Map<number, AppRow>();
  const mostVisited = new Map<number, AppRow>();
  const trending = new Map<number, AppRow>();

  for (const a of appearances) {
    if (a.endpoint === 'gainers') gainers.set(a.cmc_id, a);
    else if (a.endpoint === 'most_visited') mostVisited.set(a.cmc_id, a);
    else if (a.endpoint === 'trending') trending.set(a.cmc_id, a);
  }

  const allIds = new Set([...gainers.keys(), ...mostVisited.keys(), ...trending.keys()]);
  const results: Classification[] = [];

  for (const cmc_id of allIds) {
    const inGainers = gainers.has(cmc_id);
    const inMostVisited = mostVisited.has(cmc_id);

    let cohort: Cohort;
    if (inGainers && inMostVisited) cohort = 'both';
    else if (inGainers) cohort = 'gainers_only';
    else if (inMostVisited) cohort = 'most_visited_only';
    else cohort = 'trending_only';

    const primary = gainers.get(cmc_id) ?? mostVisited.get(cmc_id) ?? trending.get(cmc_id)!;

    results.push({
      cmc_id,
      symbol: primary.symbol,
      name: primary.name,
      captured_at: capturedAt,
      fear_greed: primary.fear_greed,
      cohort,
      price_usd: primary.price_usd,
      pct_change_24h: primary.pct_change_24h,
      gainers_appearance_id: gainers.get(cmc_id)?.id ?? null,
      most_visited_appearance_id: mostVisited.get(cmc_id)?.id ?? null,
    });
  }

  return results;
}

export function allWindows(): string[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT DISTINCT captured_at FROM snapshots ORDER BY captured_at ASC`)
    .all() as Array<{ captured_at: string }>;
  return rows.map((r) => r.captured_at);
}
