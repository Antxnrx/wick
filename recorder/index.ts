import { insertSnapshot, insertAppearances, type AppearanceRow } from './db.js';

const BASE = 'https://pro-api.coinmarketcap.com';
const KEY = process.env.CMC_API_KEY ?? '';

if (!KEY) {
  console.error('CMC_API_KEY not set');
  process.exit(1);
}

interface CmcCoin {
  id: number;
  name: string;
  symbol: string;
  quote?: { USD?: { price?: number; volume_24h?: number; percent_change_1h?: number; percent_change_24h?: number } };
}

async function fetchEndpoint(path: string): Promise<{ body: string; status: number; credits: number | null }> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'X-CMC_PRO_API_KEY': KEY, Accept: 'application/json' },
  });
  const body = await res.text();
  const credits = res.headers.get('X-CMC_PRO_CREDITS_LEFT')
    ? Number(res.headers.get('X-CMC_PRO_CREDITS_LEFT'))
    : null;
  return { body, status: res.status, credits };
}

function appErrorCode(body: string): string | null {
  try {
    const json = JSON.parse(body);
    const code = json?.status?.error_code;
    if (code !== undefined && code !== 0 && code !== '0') return String(code);
    return null;
  } catch { return null; }
}

// listings/latest returns data as a flat array — same CmcCoin shape
function extractCoins(body: string): CmcCoin[] {
  try {
    const json = JSON.parse(body);
    return (json?.data ?? []) as CmcCoin[];
  } catch { return []; }
}

async function fetchFearAndGreed(): Promise<number | null> {
  try {
    const { body, status } = await fetchEndpoint('/v3/fear-and-greed/latest');
    if (status !== 200) return null;
    const json = JSON.parse(body);
    return json?.data?.value ?? null;
  } catch { return null; }
}

async function run() {
  const capturedAt = new Date().toISOString();
  console.log(`[wick] snapshot at ${capturedAt}`);

  const fearGreed = await fetchFearAndGreed();
  console.log(`[wick] fear & greed: ${fearGreed ?? 'unavailable'}`);

  // /v3/trending/gainers-losers and /v3/trending/most-visited require a plan tier
  // above what the hackathon key provides (all return error_code 500, 0 credits).
  // Pivot to /v1/cryptocurrency/listings/latest with different sort params —
  // accessible on all plans, same cross-reference logic, more auditable.
  //
  // gainers     = top 20 by percent_change_24h (price-based momentum)
  // most_visited = top 20 by volume_24h (organic buying activity proxy)
  // trending    = top 20 by percent_change_1h (short-term price momentum)
  const endpoints: Array<{ key: 'gainers' | 'most_visited' | 'trending'; path: string }> = [
    { key: 'gainers',       path: '/v1/cryptocurrency/listings/latest?sort=percent_change_24h&sort_dir=desc&limit=20&convert=USD' },
    { key: 'most_visited',  path: '/v1/cryptocurrency/listings/latest?sort=volume_24h&sort_dir=desc&limit=20&convert=USD' },
    { key: 'trending',      path: '/v1/cryptocurrency/listings/latest?sort=percent_change_1h&sort_dir=desc&limit=20&convert=USD' },
  ];

  for (const { key, path } of endpoints) {
    const { body, status, credits } = await fetchEndpoint(path);

    const snapshotId = insertSnapshot({
      captured_at: capturedAt,
      endpoint: key,
      raw_json: body,
      credits,
      status_code: status,
    });

    const appErr = appErrorCode(body);
    if (status !== 200 || appErr) {
      console.warn(`[wick] ${key} returned HTTP ${status}${appErr ? ` / app error ${appErr}` : ''} — stored, skipping appearances`);
      continue;
    }

    const coins = extractCoins(body);
    const appearances: AppearanceRow[] = coins.map((coin) => ({
      snapshot_id: snapshotId,
      cmc_id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      price_usd: coin.quote?.USD?.price ?? null,
      volume_24h: coin.quote?.USD?.volume_24h ?? null,
      pct_change_1h: coin.quote?.USD?.percent_change_1h ?? null,
      pct_change_24h: coin.quote?.USD?.percent_change_24h ?? null,
      fear_greed: fearGreed,
      endpoint: key,
    }));

    insertAppearances(appearances);
    console.log(`[wick] ${key}: stored ${appearances.length} coins (snapshot #${snapshotId})`);
  }

  console.log('[wick] done');
}

run().catch((err) => {
  console.error('[wick] fatal:', err);
  process.exit(1);
});
