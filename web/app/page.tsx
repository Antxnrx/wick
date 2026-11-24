import { getLatestSnapshot, type Cohort, type CoinEntry } from '../lib/db';
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
        <div className="text-[#64748b] text-xs py-4 text-center">none this window</div>
      ) : (
        coins.map(c => <CoinCard key={c.cmc_id} coin={c} />)
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-border rounded p-12 text-center">
      <div className="text-[#64748b] text-sm">no snapshots recorded yet</div>
      <div className="text-[#64748b] text-xs mt-2">
        run <code className="bg-panel px-1 py-0.5 rounded">npm run record</code> or trigger the GitHub Actions cron
      </div>
    </div>
  );
}

export default function Home() {
  const snap = getLatestSnapshot();
  const hasData = snap && snap.coins.length > 0;

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
        <div className="text-right text-[11px] text-[#64748b]">
          {capturedAt ? (
            <>
              <div>snapshot: {capturedAt}</div>
              <div>{snap?.window_count} window{snap?.window_count !== 1 ? 's' : ''} recorded</div>
            </>
          ) : (
            <div>no data yet</div>
          )}
        </div>
      </div>

      {!hasData ? (
        <EmptyState />
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
