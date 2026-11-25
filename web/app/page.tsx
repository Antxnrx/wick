import { getLatestSnapshot, getSnapshotHistory } from '../lib/db';
import { LandingClient, type LandingData } from './LandingClient';

export default function LandingPage() {
  const snap    = getLatestSnapshot();
  const history = getSnapshotHistory();

  const dataWindows       = history.filter(h => h.total_coins > 0);
  const zeroSignalWindows = dataWindows.filter(h => (h.signal ?? 0) === 0).length;

  const noiseCoins   = (snap?.coins ?? [])
    .filter(c => c.cohort === 'gainers_only')
    .sort((a, b) => (b.pct_change_24h ?? 0) - (a.pct_change_24h ?? 0))
    .slice(0, 5)
    .map(c => ({ symbol: c.symbol, pct_change_24h: c.pct_change_24h, volume_24h: c.volume_24h }));

  const organicCoins = (snap?.coins ?? [])
    .filter(c => c.cohort === 'most_visited_only')
    .sort((a, b) => (b.volume_24h ?? 0) - (a.volume_24h ?? 0))
    .slice(0, 5)
    .map(c => ({ symbol: c.symbol, pct_change_24h: c.pct_change_24h, volume_24h: c.volume_24h }));

  const data: LandingData = {
    windowCount:        snap?.window_count ?? history.length,
    dataWindowCount:    dataWindows.length,
    zeroSignalWindows,
    capturedAt:         snap?.captured_at ?? null,
    coinCount:          snap?.coins.length ?? 0,
    fearGreed:          snap?.coins[0]?.fear_greed ?? null,
    noiseCoins,
    organicCoins,
  };

  return <LandingClient {...data} />;
}
