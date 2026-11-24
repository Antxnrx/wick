import type { Cohort } from '../lib/db';

const LABEL: Record<Cohort, string> = {
  both: 'signal',
  gainers_only: 'noise',
  most_visited_only: 'organic',
  trending_only: 'trending',
};

const COLOR: Record<Cohort, string> = {
  both: 'text-signal border-signal/30 bg-signal/10',
  gainers_only: 'text-noise border-noise/30 bg-noise/10',
  most_visited_only: 'text-organic border-organic/30 bg-organic/10',
  trending_only: 'text-[#64748b] border-[#64748b]/30 bg-[#64748b]/10',
};

export function CohortBadge({ cohort }: { cohort: Cohort }) {
  return (
    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-widest ${COLOR[cohort]}`}>
      {LABEL[cohort]}
    </span>
  );
}
