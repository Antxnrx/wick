import type { CoinEntry } from '../lib/db';
import { CohortBadge } from './CohortBadge';

function fmt(n: number | null, digits = 2): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function fmtPrice(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return '$' + fmt(n, 2);
  if (n >= 0.001) return '$' + fmt(n, 4);
  return '$' + n.toExponential(2);
}

function fmtPct(n: number | null): { text: string; color: string } {
  if (n == null) return { text: '—', color: 'text-[#64748b]' };
  const color = n > 0 ? 'text-signal' : n < 0 ? 'text-noise' : 'text-[#64748b]';
  return { text: (n > 0 ? '+' : '') + fmt(n) + '%', color };
}

function fmtVol(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + (n / 1e3).toFixed(0) + 'K';
}

export function CoinCard({ coin }: { coin: CoinEntry }) {
  const pct24h = fmtPct(coin.pct_change_24h);
  const pct1h  = fmtPct(coin.pct_change_1h);

  return (
    <div className="bg-panel border border-border rounded p-3 flex flex-col gap-2 hover:border-[#30363d] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-sm font-bold text-[#e6edf3]">{coin.symbol}</span>
          <span className="text-[#64748b] text-xs ml-1.5 truncate">{coin.name}</span>
        </div>
        <CohortBadge cohort={coin.cohort} />
      </div>

      <div className="text-xs text-[#e6edf3] font-medium">{fmtPrice(coin.price_usd)}</div>

      <div className="flex gap-3 text-[11px]">
        <div>
          <span className="text-[#64748b]">24h </span>
          <span className={pct24h.color}>{pct24h.text}</span>
        </div>
        <div>
          <span className="text-[#64748b]">1h </span>
          <span className={pct1h.color}>{pct1h.text}</span>
        </div>
      </div>

      <div className="flex gap-3 text-[11px] text-[#64748b]">
        <span>vol {fmtVol(coin.volume_24h)}</span>
        {coin.fear_greed != null && <span>f/g {coin.fear_greed}</span>}
      </div>
    </div>
  );
}
