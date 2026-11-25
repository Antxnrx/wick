import { getLatestSnapshot, getSnapshotHistory, type Cohort, type CoinEntry } from '../lib/db';
import { CoinCard } from '../components/CoinCard';

const COLUMN_META: Record<Cohort, { label: string; desc: string; color: string }> = {
  both: {
    label: 'signal',
    desc: 'gainers + most-visited — price move backed by human interest',
    color: 'text-signal border-signal/20',
  },
  gainers_only: {
    label: 'noise',
    desc: 'gainers only — price move with no corresponding search traffic',
    color: 'text-noise border-noise/20',
  },
  most_visited_only: {
    label: 'organic',
    desc: 'most-visited only — attention without price confirmation',
    color: 'text-organic border-organic/20',
  },
  trending_only: {
    label: 'trending',
    desc: 'trending only — broad chatter, not in either primary system',
    color: 'text-[#64748b] border-[#64748b]/20',
  },
};

const COLUMN_ORDER: Cohort[] = ['both', 'gainers_only', 'most_visited_only', 'trending_only'];

function Column({ cohort, coins }: { cohort: Cohort; coins: CoinEntry[] }) {
  const meta = COLUMN_META[cohort];
  return (
    <div className="flex flex-col gap-3">
      <div className={`border-b pb-2 ${meta.color}`}>
        <div className="font-bold text-sm uppercase tracking-wider">{meta.label}</div>
        <div className="text-[11px] text-[#64748b] mt-0.5">{meta.desc}</div>
        <div className="text-[11px] mt-1 opacity-60">{coins.length} coin{coins.length !== 1 ? 's' : ''}</div>
      </div>
      {coins.length === 0 ? (
        <div className={`text-xs py-4 text-center ${cohort === 'both' ? 'text-signal/60' : 'text-[#64748b]'}`}>
          {cohort === 'both' ? 'no overlap — gainers & most-visited are disjoint' : 'none this window'}
        </div>
      ) : (
        coins.map(c => <CoinCard key={c.cmc_id} coin={c} />)
      )}
    </div>
  );
}

function FearGreedBadge({ value }: { value: number }) {
  const label = value <= 25 ? 'extreme fear' : value <= 45 ? 'fear' : value <= 55 ? 'neutral' : value <= 75 ? 'greed' : 'extreme greed';
  const color = value <= 25 ? 'text-noise' : value <= 45 ? 'text-orange-400' : value <= 55 ? 'text-[#64748b]' : value <= 75 ? 'text-yellow-400' : 'text-signal';
  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <span className="font-bold">{value}</span>
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </div>
  );
}

function EmptyState({ hasSnapshots }: { hasSnapshots: boolean }) {
  return (
    <div className="border border-dashed border-border rounded p-12 text-center">
      {hasSnapshots ? (
        <>
          <div className="text-[#64748b] text-sm">snapshot recorded — CMC returned no coin data</div>
          <div className="text-[#64748b] text-xs mt-2">
            CMC occasionally returns <code className="bg-panel px-1 py-0.5 rounded">error_code 500</code> with HTTP 200.
            waiting for the next 6h window.
          </div>
        </>
      ) : (
        <>
          <div className="text-[#64748b] text-sm">no snapshots recorded yet</div>
          <div className="text-[#64748b] text-xs mt-2">
            run <code className="bg-panel px-1 py-0.5 rounded">npm run record</code> or trigger the GitHub Actions cron
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const snap = getLatestSnapshot();
  const history = getSnapshotHistory();
  const hasData = snap && snap.coins.length > 0;

  const dataWindows = history.filter(h => h.total_coins > 0);
  const zeroSignalWindows = dataWindows.filter(h => (h.signal ?? 0) === 0).length;

  const capturedAt = snap?.captured_at
    ? new Date(snap.captured_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'
    : null;

  const coinsByColumn: Record<Cohort, CoinEntry[]> = {
    both: [], gainers_only: [], most_visited_only: [], trending_only: [],
  };

  if (hasData) {
    for (const coin of snap.coins) {
      coinsByColumn[coin.cohort].push(coin);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-base font-bold text-[#e6edf3]">live trending</h1>
          <p className="text-[#64748b] text-xs mt-1">
            CMC runs two independent trending systems. disagreement between them is the signal.
          </p>
        </div>
        <div className="text-right text-[11px] text-[#64748b] flex flex-col items-end gap-1">
          {capturedAt ? (
            <>
              <div>snapshot: {capturedAt}</div>
              <div>{snap?.window_count} window{snap?.window_count !== 1 ? 's' : ''} recorded</div>
              {snap && snap.coins[0]?.fear_greed != null && (
                <FearGreedBadge value={snap.coins[0].fear_greed} />
              )}
            </>
          ) : (
            <div>no data yet</div>
          )}
        </div>
      </div>

      {hasData && (() => {
        const signalN = coinsByColumn.both.length;
        const totalN = snap!.coins.length;
        const overlapPct = totalN > 0 ? (signalN / totalN * 100).toFixed(0) : '0';
        const isDisjoint = signalN === 0;
        return (
          <div className={`border rounded px-4 py-3 text-xs flex items-start gap-3 ${isDisjoint ? 'border-noise/30 bg-noise/5' : 'border-signal/30 bg-signal/5'}`}>
            <span className={`font-bold uppercase tracking-wider text-[11px] mt-0.5 ${isDisjoint ? 'text-noise' : 'text-signal'}`}>
              {isDisjoint ? 'max noise' : 'signal detected'}
            </span>
            <span className="text-[#64748b] leading-relaxed">
              {isDisjoint
                ? `gainers and most-visited are completely disjoint — 0 of ${totalN} coins overlap. ${zeroSignalWindows > 1 ? `consistent across all ${zeroSignalWindows} recorded windows.` : ''} every gainer this window lacks organic search confirmation.`
                : `${signalN} of ${totalN} coins (${overlapPct}%) appear in both gainers and most-visited — price move backed by organic interest.`}
            </span>
          </div>
        );
      })()}

      {!hasData ? (
        <EmptyState hasSnapshots={!!snap?.captured_at} />
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {COLUMN_ORDER.map(cohort => (
            <Column key={cohort} cohort={cohort} coins={coinsByColumn[cohort]} />
          ))}
        </div>
      )}
    </div>
  );
}
