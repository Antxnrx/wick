import { getDb } from '../recorder/db.js';

const BASE = 'https://pro-api.coinmarketcap.com';
const KEY = process.env.CMC_API_KEY ?? '';

export type Horizon = 'T24h' | 'T7d';

const HORIZON_OFFSET_MS: Record<Horizon, number> = {
  T24h: 24 * 60 * 60 * 1000,
  T7d: 7 * 24 * 60 * 60 * 1000,
};

interface OhlcvQuote {
  open: number; high: number; low: number; close: number;
  volume: number; timestamp: string;
}

async function fetchOhlcv(cmcId: number, timeStart: Date, timeEnd: Date): Promise<{ price: number; sourceCall: string } | null> {
  const params = new URLSearchParams({
    id: String(cmcId),
    time_start: Math.floor(timeStart.getTime() / 1000).toString(),
    time_end: Math.floor(timeEnd.getTime() / 1000).toString(),
    interval: 'hourly',
    count: '1',
    convert: 'USD',
  });
  const url = `${BASE}/v2/cryptocurrency/ohlcv/historical?${params}`;

  const res = await fetch(url, {
    headers: { 'X-CMC_PRO_API_KEY': KEY, Accept: 'application/json' },
  });
  const json = await res.json() as {
    data?: { quotes?: Array<{ quote: { USD: OhlcvQuote } }> };
  };

  const quote = json?.data?.quotes?.[0]?.quote?.USD;
  if (!quote) return null;

  return { price: quote.close, sourceCall: url };
}

export async function backfillOutcomes(): Promise<void> {
  if (!KEY) {
    console.warn('[outcomes] CMC_API_KEY not set — skipping backfill');
    return;
  }

  const db = getDb();
  const now = Date.now();

  type AppRow = { id: number; cmc_id: number; captured_at: string };

  // Appearances old enough to have T24h but no outcome yet
  const needsT24h = db.prepare(`
    SELECT a.id, a.cmc_id, s.captured_at
    FROM appearances a
    JOIN snapshots s ON s.id = a.snapshot_id
    WHERE a.id NOT IN (SELECT appearance_id FROM outcomes WHERE horizon = 'T24h')
      AND (? - unixepoch(s.captured_at) * 1000) > ?
  `).all(now, HORIZON_OFFSET_MS.T24h) as AppRow[];

  const needsT7d = db.prepare(`
    SELECT a.id, a.cmc_id, s.captured_at
    FROM appearances a
    JOIN snapshots s ON s.id = a.snapshot_id
    WHERE a.id NOT IN (SELECT appearance_id FROM outcomes WHERE horizon = 'T7d')
      AND (? - unixepoch(s.captured_at) * 1000) > ?
  `).all(now, HORIZON_OFFSET_MS.T7d) as AppRow[];

  const insertOutcome = db.prepare(`
    INSERT INTO outcomes (appearance_id, horizon, price_usd, pct_change, fetched_at, source_call)
    VALUES (:appearance_id, :horizon, :price_usd, :pct_change, :fetched_at, :source_call)
  `);

  async function fetchAndStore(rows: AppRow[], horizon: Horizon) {
    for (const row of rows) {
      const entryTime = new Date(row.captured_at);
      const targetTime = new Date(entryTime.getTime() + HORIZON_OFFSET_MS[horizon]);
      const windowEnd = new Date(targetTime.getTime() + 60 * 60 * 1000);

      const result = await fetchOhlcv(row.cmc_id, targetTime, windowEnd);
      if (!result) {
        console.warn(`[outcomes] no data for cmc_id=${row.cmc_id} at ${targetTime.toISOString()}`);
        continue;
      }

      // Need entry price to compute pct_change
      const entryRow = db.prepare(
        `SELECT price_usd FROM appearances WHERE id = ?`
      ).get(row.id) as { price_usd: number | null } | undefined;

      const entryPrice = entryRow?.price_usd ?? null;
      const pctChange = entryPrice && result.price
        ? ((result.price - entryPrice) / entryPrice) * 100
        : null;

      insertOutcome.run({
        appearance_id: row.id,
        horizon,
        price_usd: result.price,
        pct_change: pctChange,
        fetched_at: new Date().toISOString(),
        source_call: result.sourceCall,
      } as unknown as Record<string, unknown>);

      console.log(`[outcomes] ${horizon} ${row.cmc_id}: ${pctChange?.toFixed(1)}%`);
    }
  }

  console.log(`[outcomes] backfilling T24h for ${needsT24h.length} appearances`);
  await fetchAndStore(needsT24h, 'T24h');

  console.log(`[outcomes] backfilling T7d for ${needsT7d.length} appearances`);
  await fetchAndStore(needsT7d, 'T7d');

  console.log('[outcomes] done');
}
