import { getCohortStats, getSnapshotHistory, type Cohort, type CohortStats } from '../../lib/db';

const LABEL: Record<Cohort, string> = {
  both: 'signal',
  gainers_only: 'noise',
  most_visited_only: 'organic',
  trending_only: 'trending',
};

const COLOR: Record<Cohort, string> = {
  both: 'text-signal',
  gainers_only: 'text-noise',
  most_visited_only: 'text-organic',
  trending_only: 'text-[#64748b]',
};

const BAR_COLOR: Record<Cohort, string> = {
  both: 'bg-signal',
  gainers_only: 'bg-noise',
  most_visited_only: 'bg-organic',
  trending_only: 'bg-[#64748b]',
};

function fmt(n: number | null, digits = 1): string {
  if (n == null) return '—';
  return (n > 0 ? '+' : '') + n.toFixed(digits) + '%';
}

function SurvivalBar({ value, max }: { value: number | null; max: number }) {
  if (value == null) return <div className="text-[#64748b] text-xs">no data</div>;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const isNeg = value < 0;
  const width = Math.abs(pct / 2); // normalize to 50% = max
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-border rounded overflow-hidden">
        <div
          className={`h-full rounded ${isNeg ? 'bg-noise' : 'bg-signal'}`}
          style={{ width: `${Math.min(100, Math.abs(value / max) * 100)}%` }}
        />
      </div>
      <span className={`text-xs ${isNeg ? 'text-noise' : 'text-signal'}`}>{fmt(value)}</span>
    </div>
  );
}

function StatRow({ stat, maxAbsT7d }: { stat: CohortStats; maxAbsT7d: number }) {
  return (
    <tr className="border-t border-border">
      <td className="py-2.5 pr-4">
        <span className={`font-bold text-xs uppercase tracking-wider ${COLOR[stat.cohort]}`}>
          {LABEL[stat.cohort]}
        </span>
      </td>
      <td className="py-2.5 pr-4 text-xs text-[#64748b]">{stat.count}</td>
      <td className="py-2.5 pr-4">
        <span className={`text-xs ${stat.median_T24h != null ? (stat.median_T24h >= 0 ? 'text-signal' : 'text-noise') : 'text-[#64748b]'}`}>
          {fmt(stat.median_T24h)}
        </span>
      </td>
      <td className="py-2.5 pr-8">
        <SurvivalBar value={stat.median_T7d} max={maxAbsT7d} />
      </td>
      <td className="py-2.5 text-xs text-[#64748b]">
        {stat.pct_negative_T7d != null ? stat.pct_negative_T7d.toFixed(0) + '% red' : '—'}
      </td>
    </tr>
  );
}

function HistoryRow({ row }: { row: { captured_at: string; total_coins: number; fear_greed: number | null } }) {
  const dt = new Date(row.captured_at);
  const isValid = !isNaN(dt.getTime());
  return (
    <tr className="border-t border-border text-xs">
      <td className="py-1.5 pr-4 text-[#e6edf3] font-mono">
        {isValid ? dt.toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : row.captured_at}
      </td>
      <td className="py-1.5 pr-4 text-[#64748b]">{row.total_coins}</td>
      <td className="py-1.5 text-[#64748b]">
        {row.fear_greed != null ? row.fear_greed.toFixed(0) : '—'}
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const stats = getCohortStats();
  const history = getSnapshotHistory();
  const hasStats = stats.some(s => s.count > 0);

  const maxAbsT7d = stats.reduce((m, s) =>
    s.median_T7d != null ? Math.max(m, Math.abs(s.median_T7d)) : m, 1
  );

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-base font-bold text-[#e6edf3]">cohort survival</h1>
        <p className="text-[#64748b] text-xs mt-1">
          outcome by classification — does the signal/noise split predict 24h and 7d returns?
        </p>
      </div>

      <div className="bg-panel border border-border rounded p-5">
        <div className="text-xs text-[#64748b] mb-3 uppercase tracking-wider">methodology</div>
        <div className="grid grid-cols-4 gap-3 text-[11px]">
          {([
            { cohort: 'both' as Cohort, label: 'signal', desc: 'in both gainers + most-visited simultaneously', color: COLOR['both'] },
            { cohort: 'gainers_only' as Cohort, label: 'noise', desc: 'gainers only — price moved but no search traffic', color: COLOR['gainers_only'] },
            { cohort: 'most_visited_only' as Cohort, label: 'organic', desc: 'most-visited only — attention, no price confirmation', color: COLOR['most_visited_only'] },
            { cohort: 'trending_only' as Cohort, label: 'trending', desc: 'trending only — broad market chatter, unfiltered', color: COLOR['trending_only'] },
          ]).map(({ label, desc, color }) => (
            <div key={label} className="border border-border rounded p-3 flex flex-col gap-1">
              <span className={`font-bold uppercase tracking-wider ${color}`}>{label}</span>
              <span className="text-[#64748b] leading-relaxed">{desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-[#64748b] leading-relaxed border-t border-border pt-3">
          Hypothesis: coins validated by two independent systems (signal) outperform coins where only one system fires.
          CMC&apos;s gainers list is price-driven; most-visited is search/attention-driven.
          Overlap = genuine momentum. Gainers-only = pump with no community backing.
          T7d median spread between signal and noise is the core metric.
        </div>
      </div>

      <div className="bg-panel border border-border rounded p-5">
        <div className="text-xs text-[#64748b] mb-3 uppercase tracking-wider">cohort outcomes</div>
        {!hasStats ? (
          <div className="text-[#64748b] text-xs py-4">
            no outcome data yet — outcomes backfill after 24h+ from first snapshot
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-[11px] text-[#64748b] uppercase tracking-wider">
                <th className="text-left pb-2 pr-4 font-normal">cohort</th>
                <th className="text-left pb-2 pr-4 font-normal">n</th>
                <th className="text-left pb-2 pr-4 font-normal">median 24h</th>
                <th className="text-left pb-2 pr-8 font-normal">median 7d</th>
                <th className="text-left pb-2 font-normal">neg rate</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(s => <StatRow key={s.cohort} stat={s} maxAbsT7d={maxAbsT7d} />)}
            </tbody>
          </table>
        )}
      </div>

      {hasStats && (
        <div className="bg-panel border border-border rounded p-5">
          <div className="text-xs text-[#64748b] mb-3 uppercase tracking-wider">the finding</div>
          <div className="space-y-1 text-sm">
            {(() => {
              const signal = stats.find(s => s.cohort === 'both');
              const noise = stats.find(s => s.cohort === 'gainers_only');
              if (!signal || !noise || signal.median_T7d == null || noise.median_T7d == null) return null;
              const diff = signal.median_T7d - noise.median_T7d;
              return (
                <p className="text-[#e6edf3] text-xs leading-relaxed">
                  Coins in <span className="text-signal font-bold">signal</span> (both Gainers + Most-Visited) show{' '}
                  <span className={signal.median_T7d >= 0 ? 'text-signal' : 'text-noise'}>
                    {fmt(signal.median_T7d)}
                  </span>{' '}
                  median T7d vs{' '}
                  <span className={noise.median_T7d >= 0 ? 'text-signal' : 'text-noise'}>
                    {fmt(noise.median_T7d)}
                  </span>{' '}
                  for <span className="text-noise font-bold">noise</span> (Gainers only) —
                  a <span className="font-bold">{Math.abs(diff).toFixed(1)}pp gap</span>.{' '}
                  CMC&apos;s two trending systems disagree for a reason.
                </p>
              );
            })()}
          </div>
        </div>
      )}

      <div className="bg-panel border border-border rounded p-5">
        <div className="text-xs text-[#64748b] mb-3 uppercase tracking-wider">
          snapshot history ({history.length} windows)
        </div>
        {history.length === 0 ? (
          <div className="text-[#64748b] text-xs">no snapshots yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-[11px] text-[#64748b] uppercase tracking-wider">
                <th className="text-left pb-2 pr-4 font-normal">captured at (UTC)</th>
                <th className="text-left pb-2 pr-4 font-normal">coins</th>
                <th className="text-left pb-2 font-normal">fear/greed</th>
              </tr>
            </thead>
            <tbody>
              {history.map(row => <HistoryRow key={row.captured_at} row={row} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
