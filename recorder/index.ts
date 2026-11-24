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
    // CMC uses "0" for success, non-zero string or number for errors
    if (code !== undefined && code !== 0 && code !== '0') return String(code);
    return null;
  } catch {
    return null;
  }
}

function extractCoins(endpoint: string, body: string): CmcCoin[] {
  try {
    const json = JSON.parse(body);
    if (endpoint === 'gainers') {
      return (json?.data?.gainers ?? []) as CmcCoin[];
    }
    return (json?.data ?? []) as CmcCoin[];
  } catch {
    return [];
  }
}

async function fetchFearAndGreed(): Promise<number | null> {
  try {
    const { body, status } = await fetchEndpoint('/v3/fear-and-greed/latest');
    if (status !== 200) return null;
    const json = JSON.parse(body);
    return json?.data?.value ?? null;
  } catch {
    return null;
  }
}

async function run() {
  const capturedAt = new Date().toISOString();
  console.log(`[wick] snapshot at ${capturedAt}`);

  const fearGreed = await fetchFearAndGreed();
  console.log(`[wick] fear & greed: ${fearGreed ?? 'unavailable'}`);

  const endpoints: Array<{ key: 'gainers' | 'most_visited' | 'trending'; path: string }> = [
    { key: 'gainers',      path: '/v3/cryptocurrency/trending/gainers-losers?limit=10' },
    { key: 'most_visited', path: '/v3/cryptocurrency/trending/most-visited?limit=10' },
    { key: 'trending',     path: '/v3/cryptocurrency/trending/latest?limit=10' },
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

    const coins = extractCoins(key, body);
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
