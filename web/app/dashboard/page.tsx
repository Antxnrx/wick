import type { Metadata } from 'next';
import { getCohortStats, getSnapshotHistory, type Cohort, type CohortStats, type HistoryRow } from '../../lib/db';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Cohort survival analysis — does the signal/noise split predict 24h and 7d returns? T+24h and T+7d median outcomes by cohort.',
};

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

function CohortBar({ row }: { row: HistoryRow }) {
  if (row.total_coins === 0) return <span className="text-[#64748b]">—</span>;
  const signal = row.signal ?? 0;
  const noise = row.noise ?? 0;
  const organic = row.organic ?? 0;
  const trending = row.trending ?? 0;
  const total = signal + noise + organic + trending;
  if (total === 0) return <span className="text-[#64748b]">—</span>;
  const pct = (n: number) => `${(n / total * 100).toFixed(0)}%`;
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-1.5 w-28 rounded overflow-hidden gap-px bg-border">
        {signal > 0 && <div className="bg-signal h-full" style={{ width: pct(signal) }} title={`signal: ${signal}`} />}
        {noise > 0 && <div className="bg-noise h-full" style={{ width: pct(noise) }} title={`noise: ${noise}`} />}
        {organic > 0 && <div className="bg-organic h-full" style={{ width: pct(organic) }} title={`organic: ${organic}`} />}
        {trending > 0 && <div className="bg-[#64748b] h-full" style={{ width: pct(trending) }} title={`trending: ${trending}`} />}
      </div>
      {signal > 0
        ? <span className="text-signal">{signal} sig</span>
        : <span className="text-noise/60 text-[10px]">0 sig</span>}
    </div>
  );
}

function HistoryRow({ row }: { row: HistoryRow }) {
  const dt = new Date(row.captured_at);
  const isValid = !isNaN(dt.getTime());
  return (
    <tr className="border-t border-border text-xs">
      <td className="py-1.5 pr-4 text-[#e6edf3] font-mono">
        {isValid ? dt.toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : row.captured_at}
      </td>
      <td className="py-1.5 pr-4 text-[#64748b]">{row.total_coins || '—'}</td>
      <td className="py-1.5 pr-4">
        <CohortBar row={row} />
      </td>
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
  const hasT24h = stats.some(s => s.median_T24h != null);
  const hasT7d  = stats.some(s => s.median_T7d != null);

  const maxAbsT7d = stats.reduce((m, s) =>
    s.median_T7d != null ? Math.max(m, Math.abs(s.median_T7d)) : m, 1
  );

  const totalAppearances = stats.reduce((sum, s) => sum + s.count, 0);
  const earliestWindow = history.length > 0 ? history[history.length - 1]?.captured_at : null;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-base font-bold text-[#e6edf3]">cohort survival</h1>
        <p className="text-[#64748b] text-xs mt-1">
          outcome by classification — does the signal/noise split predict 24h and 7d returns?
        </p>
      </div>

      {!hasT24h && totalAppearances > 0 && (
        <div className="border border-[#21262d] rounded px-4 py-3 text-[11px] text-[#64748b] flex items-start gap-3">
          <span className="text-yellow-500 font-bold uppercase tracking-wider mt-0.5">collecting</span>
          <span className="leading-relaxed">
            {totalAppearances} appearances recorded across {history.filter(h => h.total_coins > 0).length} windows.{' '}
            T+24h outcomes available ~24h after first snapshot{earliestWindow ? ` (from ${earliestWindow.slice(0, 16).replace('T', ' ')} UTC)` : ''}.{' '}
            T+7d outcomes available 7 days after first snapshot.
            Numbers fill in automatically — check back after{' '}
            {earliestWindow ? new Date(new Date(earliestWindow).getTime() + 24 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '24h'}.
          </span>
        </div>
      )}

      {hasT24h && !hasT7d && (
        <div className="border border-[#21262d] rounded px-4 py-3 text-[11px] text-[#64748b] flex items-start gap-3">
          <span className="text-signal font-bold uppercase tracking-wider mt-0.5">t24h ready</span>
          <span className="leading-relaxed">
            24h outcomes are live. T+7d outcomes will be available{' '}
            {earliestWindow ? new Date(new Date(earliestWindow).getTime() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10) : 'in 7 days'}.
          </span>
        </div>
      )}

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

      <div className="bg-panel border border-border rounded p-5">
        <div className="text-xs text-[#64748b] mb-3 uppercase tracking-wider">the finding</div>
        <div className="space-y-3 text-xs">
          {(() => {
            const signal = stats.find(s => s.cohort === 'both');
            const noise = stats.find(s => s.cohort === 'gainers_only');
            const dataWindows = history.filter(h => h.total_coins > 0);
            const zeroSignal = dataWindows.filter(h => (h.signal ?? 0) === 0).length;

            if (signal && noise && signal.median_T7d != null && noise.median_T7d != null) {
              const diff = signal.median_T7d - noise.median_T7d;
              return (
                <p className="text-[#e6edf3] leading-relaxed">
                  Coins in <span className="text-signal font-bold">signal</span> (both Gainers + Most-Visited) show{' '}
                  <span className={signal.median_T7d >= 0 ? 'text-signal' : 'text-noise'}>{fmt(signal.median_T7d)}</span>{' '}
                  median T7d vs{' '}
                  <span className={noise.median_T7d >= 0 ? 'text-signal' : 'text-noise'}>{fmt(noise.median_T7d)}</span>{' '}
                  for <span className="text-noise font-bold">noise</span> —
                  a <span className="font-bold">{Math.abs(diff).toFixed(1)}pp gap</span>.{' '}
                  CMC&apos;s two systems disagree for a reason.
                </p>
              );
            }

            return (
              <>
                <p className="text-[#e6edf3] leading-relaxed">
                  <span className="text-noise font-bold">Structural:</span>{' '}
                  CMC&apos;s gainers (top by pct_change_24h) and most-visited (top by volume_24h) are
                  completely disjoint — {zeroSignal > 0 ? `0 signal coins in all ${zeroSignal} data windows` : 'no overlap detected'}.
                  Price pumps in the top gainers have zero volume backing from the same system.
                </p>
                <p className="text-[#64748b] leading-relaxed">
                  Outcome data: T+24h fills from {earliestWindow
                    ? new Date(new Date(earliestWindow).getTime() + 24 * 3600 * 1000).toISOString().slice(0, 10)
                    : 'day 2'}.
                  T+7d fills from {earliestWindow
                    ? new Date(new Date(earliestWindow).getTime() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
                    : 'day 8'}.
                  The survival table above will populate automatically.
                </p>
              </>
            );
          })()}
        </div>
      </div>

      {(() => {
        const dataWindows = history.filter(h => h.total_coins > 0 && h.fear_greed != null);
        if (dataWindows.length === 0) return null;
        const extremeFearCount = dataWindows.filter(h => (h.fear_greed ?? 100) <= 25).length;
        const pctExtreme = Math.round((extremeFearCount / dataWindows.length) * 100);
        return (
          <div className="bg-panel border border-border rounded p-5">
            <div className="text-xs text-[#64748b] mb-4 uppercase tracking-wider">market regime</div>
            <div className="flex items-center gap-6 mb-5">
              <div>
                <div className="text-noise text-4xl font-bold leading-none">{pctExtreme}%</div>
                <div className="text-[11px] text-[#64748b] mt-1">extreme fear across all windows</div>
              </div>
              <div className="border-l border-border pl-6 flex flex-col gap-1 text-[11px] text-[#64748b]">
                <div><span className="text-[#e6edf3]">{dataWindows.length}</span> windows with real data</div>
                <div><span className="text-noise">{extremeFearCount}</span> at F&amp;G ≤ 25 (extreme fear)</div>
                <div>range: F&amp;G {Math.min(...dataWindows.map(w => w.fear_greed ?? 100))}–{Math.max(...dataWindows.map(w => w.fear_greed ?? 0))}</div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {dataWindows.slice().reverse().map(w => {
                const fg = w.fear_greed ?? 9;
                return (
                  <div key={w.captured_at} className="flex items-center gap-3">
                    <span className="text-[10px] text-[#64748b] font-mono w-32 shrink-0">
                      {w.captured_at.slice(0, 16).replace('T', ' ')}
                    </span>
                    <div className="flex-1 h-1.5 bg-border rounded overflow-hidden">
                      <div className="h-full bg-noise rounded" style={{ width: `${fg}%` }} />
                    </div>
                    <span className="text-noise text-[10px] font-mono w-10 text-right">{fg.toFixed(0)}</span>
                    <span className="text-[10px] text-noise/60 w-20">extreme fear</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-[11px] text-[#64748b] border-t border-border pt-3 leading-relaxed">
              Extreme fear is a regime where pump dynamics concentrate in micro-caps while large-caps attract
              relative safety flows. The structural disjoint between gainers and most-visited is maximally
              pronounced here — results should be interpreted in this market context.
            </div>
          </div>
        );
      })()}

      <div className="bg-panel border border-border rounded p-5">
        <div className="text-xs text-[#64748b] mb-3 uppercase tracking-wider">
          snapshot history ({history.length} windows) · updates every 6h (00:00, 06:00, 12:00, 18:00 UTC)
        </div>
        {history.length === 0 ? (
          <div className="text-[#64748b] text-xs">no snapshots yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-[11px] text-[#64748b] uppercase tracking-wider">
                <th className="text-left pb-2 pr-4 font-normal">captured at (UTC)</th>
                <th className="text-left pb-2 pr-4 font-normal">coins</th>
                <th className="text-left pb-2 pr-4 font-normal">cohort split</th>
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
