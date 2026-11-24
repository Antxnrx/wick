import { getDb } from '../recorder/db.js';
import { classifyWindow, allWindows, type Classification } from './classify.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Receipt {
  cmc_id: number;
  symbol: string;
  name: string;
  captured_at: string;
  fear_greed: number | null;
  cohort: string;
  price_at_entry: number | null;
  pct_change_24h_at_entry: number | null;
  outcomes: {
    T24h: { price_usd: number | null; pct_change: number | null; source_call: string } | null;
    T7d:  { price_usd: number | null; pct_change: number | null; source_call: string } | null;
  };
}

export interface CohortStats {
  cohort: string;
  count: number;
  median_T24h: number | null;
  median_T7d: number | null;
  pct_negative_T7d: number | null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function buildReceipts(): { receipts: Receipt[]; stats: CohortStats[] } {
  const db = getDb();
  const windows = allWindows();
  const all: Receipt[] = [];

  for (const w of windows) {
    const classifications = classifyWindow(w);

    for (const c of classifications) {
      const appearanceId = c.gainers_appearance_id ?? c.most_visited_appearance_id;
      if (!appearanceId) continue;

      type OutcomeRow = { horizon: string; price_usd: number | null; pct_change: number | null; source_call: string };
      const outcomeRows = db
        .prepare(`SELECT horizon, price_usd, pct_change, source_call FROM outcomes WHERE appearance_id = ?`)
        .all(appearanceId) as OutcomeRow[];

      const t24h = outcomeRows.find((r) => r.horizon === 'T24h') ?? null;
      const t7d  = outcomeRows.find((r) => r.horizon === 'T7d') ?? null;

      all.push({
        cmc_id: c.cmc_id,
        symbol: c.symbol,
        name: c.name,
        captured_at: c.captured_at,
        fear_greed: c.fear_greed,
        cohort: c.cohort,
        price_at_entry: c.price_usd,
        pct_change_24h_at_entry: c.pct_change_24h,
        outcomes: {
          T24h: t24h ? { price_usd: t24h.price_usd, pct_change: t24h.pct_change, source_call: t24h.source_call } : null,
          T7d:  t7d  ? { price_usd: t7d.price_usd,  pct_change: t7d.pct_change,  source_call: t7d.source_call  } : null,
        },
      });
    }
  }

  // Cohort stats
  const cohorts = ['gainers_only', 'both', 'most_visited_only', 'trending_only'];
  const stats: CohortStats[] = cohorts.map((cohort) => {
    const group = all.filter((r) => r.cohort === cohort);
    const t24hChanges = group.map((r) => r.outcomes.T24h?.pct_change).filter((v): v is number => v != null);
    const t7dChanges  = group.map((r) => r.outcomes.T7d?.pct_change).filter((v): v is number => v != null);
    return {
      cohort,
      count: group.length,
      median_T24h: median(t24hChanges),
      median_T7d: median(t7dChanges),
      pct_negative_T7d: t7dChanges.length
        ? (t7dChanges.filter((v) => v < 0).length / t7dChanges.length) * 100
        : null,
    };
  });

  return { receipts: all, stats };
}

export function writeReceiptsJson(outDir = process.cwd()): void {
  const { receipts, stats } = buildReceipts();
  const manifest = { generated_at: new Date().toISOString(), stats, receipts };
  const outPath = join(outDir, 'receipts.json');
  writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log(`[receipts] wrote ${receipts.length} receipts to ${outPath}`);
  console.log('[receipts] cohort stats:');
  for (const s of stats) {
    console.log(`  ${s.cohort}: n=${s.count} median_T24h=${s.median_T24h?.toFixed(1) ?? 'n/a'}% median_T7d=${s.median_T7d?.toFixed(1) ?? 'n/a'}%`);
  }
}
