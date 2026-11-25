import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Notes',
  description: 'Undocumented CMC API behaviors discovered while building Wick — HTTP 200 errors, plan restrictions, response shape inconsistencies.',
};

type NoteType = 'bug' | 'behavior' | 'finding' | 'pivot';

interface Note {
  id: string;
  type: NoteType;
  title: string;
  endpoints: string[];
  reproduced: string;
  body: React.ReactNode;
}

const TYPE_META: Record<NoteType, { label: string; color: string; border: string; bg: string }> = {
  bug:      { label: 'bug',      color: 'text-noise',          border: 'border-noise/30',          bg: 'bg-noise/[0.03]' },
  behavior: { label: 'behavior', color: 'text-organic',        border: 'border-organic/30',        bg: 'bg-organic/[0.03]' },
  finding:  { label: 'finding',  color: 'text-signal',         border: 'border-signal/30',         bg: 'bg-signal/[0.03]' },
  pivot:    { label: 'pivot',    color: 'text-[#f59e0b]',      border: 'border-[#f59e0b]/30',      bg: 'bg-[#f59e0b]/[0.03]' },
};

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-[#0d1117] border border-border rounded p-4 text-[11px] text-[#e6edf3] font-mono overflow-x-auto leading-relaxed whitespace-pre">
      {children}
    </pre>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="px-1.5 py-0.5 bg-panel border border-border rounded text-[10px] text-[#64748b] font-mono">
      {label}
    </span>
  );
}

const NOTES: Note[] = [
  {
    id: '1',
    type: 'bug',
    title: 'HTTP 200 with application-level error — credit_count: 0 is the tell',
    endpoints: ['/v3/cryptocurrency/trending/gainers-losers', '/v3/cryptocurrency/trending/most-visited', '/v3/cryptocurrency/trending/latest'],
    reproduced: '2026-11-24T20:21:54Z',
    body: (
      <div className="flex flex-col gap-4">
        <p className="text-[#64748b] text-xs leading-relaxed">
          CMC returns HTTP&nbsp;200 (not 429 or 503), but the JSON body has{' '}
          <code className="bg-panel px-1 py-0.5 rounded text-noise">status.error_code = &quot;500&quot;</code>{' '}
          with no <code className="bg-panel px-1 py-0.5 rounded">data</code> key.
          The definitive indicator is <code className="bg-panel px-1 py-0.5 rounded text-signal">credit_count: 0</code> —
          CMC charges credits for processed requests (even failed ones) but charges nothing when access is denied before processing.
        </p>
        <Code>{`{
  "status": {
    "timestamp": "2026-11-24T20:21:55.584Z",
    "error_code": "500",
    "error_message": "The system is busy, please try again later!",
    "elapsed": "0",
    "credit_count": 0        // ← zero credits = not processed, not quota
  }
}`}</Code>
        <div className="border-l-2 border-noise/40 pl-3">
          <p className="text-[11px] text-[#64748b] leading-relaxed">
            <span className="text-[#e6edf3] font-bold">Implication:</span>{' '}
            Any consumer that only checks HTTP status will silently store empty snapshots.
            Wick stores the raw JSON regardless; the gap appears as a snapshot with 0 appearances
            (visible in the evidence table as empty windows).
          </p>
        </div>
        <p className="text-[11px] text-[#64748b]">
          <span className="text-[#e6edf3]">Fix:</span>{' '}
          <code className="bg-panel px-1 py-0.5 rounded">appErrorCode()</code> in{' '}
          <code className="bg-panel px-1 py-0.5 rounded">recorder/index.ts</code> checks{' '}
          <code className="bg-panel px-1 py-0.5 rounded">status.error_code !== 0</code>{' '}
          and skips insertion, logging the app error clearly.
        </p>
      </div>
    ),
  },
  {
    id: '2',
    type: 'behavior',
    title: 'Trending endpoints have inconsistent data shapes',
    endpoints: ['/v3/cryptocurrency/trending/gainers-losers', '/v3/cryptocurrency/trending/most-visited', '/v3/cryptocurrency/trending/latest'],
    reproduced: '2026-11-24',
    body: (
      <div className="flex flex-col gap-4">
        <p className="text-[#64748b] text-xs leading-relaxed">
          The three trending endpoints return different shapes for <code className="bg-panel px-1 py-0.5 rounded">data</code>.
          A single generic parser will fail silently on gainers.
        </p>
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="border-b border-border bg-panel">
              <tr>
                <th className="text-left px-3 py-2 text-[#64748b] font-normal uppercase tracking-wider">endpoint</th>
                <th className="text-left px-3 py-2 text-[#64748b] font-normal uppercase tracking-wider">data shape</th>
              </tr>
            </thead>
            <tbody>
              {[
                { ep: '/trending/gainers-losers', shape: 'Object { gainers: CmcCoin[], losers: CmcCoin[] }' },
                { ep: '/trending/most-visited',   shape: 'Array CmcCoin[] directly' },
                { ep: '/trending/latest',         shape: 'Array CmcCoin[] directly' },
              ].map(r => (
                <tr key={r.ep} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-noise">{r.ep}</td>
                  <td className="px-3 py-2 text-[#e6edf3]">{r.shape}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[#64748b] leading-relaxed">
          Gainers wraps in <code className="bg-panel px-1 py-0.5 rounded">data.gainers</code>;
          the other two return <code className="bg-panel px-1 py-0.5 rounded">data</code> directly.
          Losers data is available but discarded — Wick only tracks upside momentum.
        </p>
      </div>
    ),
  },
  {
    id: '3',
    type: 'behavior',
    title: 'Fear & Greed endpoint returns a different data shape',
    endpoints: ['/v3/fear-and-greed/latest'],
    reproduced: '2026-11-24',
    body: (
      <div className="flex flex-col gap-4">
        <p className="text-[#64748b] text-xs leading-relaxed">
          Unlike the coin endpoints, the Fear &amp; Greed response wraps in a single object rather than an array.
          The useful field is <code className="bg-panel px-1 py-0.5 rounded text-signal">data.value</code> (0–100).
        </p>
        <Code>{`{
  "status": { "timestamp": "...", "error_code": 0, ... },
  "data": {
    "value": 8,                            // ← the number you want
    "value_classification": "Extreme Fear",
    "timestamp": "2026-11-24T00:00:00.000Z"
  }
}`}</Code>
        <p className="text-[11px] text-[#64748b]">
          Wick stores <code className="bg-panel px-1 py-0.5 rounded">data.value</code> as{' '}
          <code className="bg-panel px-1 py-0.5 rounded">fear_greed</code> on each appearance row
          so every coin entry is tagged with the market regime at snapshot time.
          Across all 11 windows, the index was 8–9 (Extreme Fear) every time.
        </p>
      </div>
    ),
  },
  {
    id: '4',
    type: 'pivot',
    title: 'All /v3/trending/* endpoints are plan-restricted — zero credit is the proof',
    endpoints: ['/v3/cryptocurrency/trending/*'],
    reproduced: '2026-11-24, every run Nov 24–25',
    body: (
      <div className="flex flex-col gap-4">
        <p className="text-[#64748b] text-xs leading-relaxed">
          The hackathon key has 450,000 monthly credits. All three trending endpoints return{' '}
          <code className="bg-panel px-1 py-0.5 rounded text-noise">error_code &quot;500&quot;</code>{' '}
          with <code className="bg-panel px-1 py-0.5 rounded text-signal">credit_count: 0</code> on every request —
          even after retry and even as the Fear &amp; Greed endpoint on the same key succeeds.
          Zero credit consumption is the definitive indicator: the request is denied before processing, not a quota issue.
        </p>
        <div className="border border-[#f59e0b]/30 bg-[#f59e0b]/[0.04] rounded p-3">
          <div className="text-[#f59e0b] text-[10px] font-bold uppercase tracking-wider mb-2">pivot</div>
          <p className="text-xs text-[#64748b] leading-relaxed">
            Switched to <code className="bg-panel px-1 py-0.5 rounded">/v1/cryptocurrency/listings/latest</code>{' '}
            with different sort parameters — accessible on all plans, more auditable, and analytically equivalent.
          </p>
        </div>
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="border-b border-border bg-panel">
              <tr>
                <th className="text-left px-3 py-2 text-[#64748b] font-normal uppercase tracking-wider">original endpoint</th>
                <th className="text-left px-3 py-2 text-[#64748b] font-normal uppercase tracking-wider">replacement</th>
                <th className="text-left px-3 py-2 text-[#64748b] font-normal uppercase tracking-wider">sort</th>
              </tr>
            </thead>
            <tbody>
              {[
                { old: '/v3/trending/gainers-losers', next: '/v1/listings/latest', sort: 'percent_change_24h DESC' },
                { old: '/v3/trending/most-visited',   next: '/v1/listings/latest', sort: 'volume_24h DESC' },
                { old: '/v3/trending/latest',         next: '/v1/listings/latest', sort: 'percent_change_1h DESC' },
              ].map(r => (
                <tr key={r.old} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-noise text-[10px]">{r.old}</td>
                  <td className="px-3 py-2 font-mono text-signal text-[10px]">{r.next}</td>
                  <td className="px-3 py-2 text-[#64748b]">{r.sort}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[#64748b]">
          DB schema is unchanged — endpoint names <code className="bg-panel px-1 py-0.5 rounded">gainers</code>,{' '}
          <code className="bg-panel px-1 py-0.5 rounded">most_visited</code>,{' '}
          <code className="bg-panel px-1 py-0.5 rounded">trending</code> are preserved.
          The analysis and UI are unaffected.
        </p>
      </div>
    ),
  },
  {
    id: '5',
    type: 'finding',
    title: 'The two sort dimensions are structurally disjoint — 0 overlap in every window',
    endpoints: ['/v1/cryptocurrency/listings/latest (both sort params)'],
    reproduced: 'every window Nov 24–25 (7 data windows)',
    body: (
      <div className="flex flex-col gap-4">
        <p className="text-[#64748b] text-xs leading-relaxed">
          The top 20 by <code className="bg-panel px-1 py-0.5 rounded">percent_change_24h</code> (gainers)
          and the top 20 by <code className="bg-panel px-1 py-0.5 rounded">volume_24h</code> (most-visited)
          share zero coins in every single recorded window. This is consistent across all 7 windows with real data.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-noise/25 rounded p-3 bg-noise/[0.03]">
            <div className="text-noise text-[10px] font-bold uppercase tracking-widest mb-2">gainers (top 20 by %change)</div>
            <div className="text-[11px] text-[#64748b] space-y-1">
              <div>Market cap: $400K – $2M</div>
              <div>Volume: $386K – $2M</div>
              <div>Typical: micro-cap meme/new tokens</div>
              <div className="text-noise">Examples: ELEVATE +10,264%, GROW +7,769%</div>
            </div>
          </div>
          <div className="border border-organic/25 rounded p-3 bg-organic/[0.03]">
            <div className="text-organic text-[10px] font-bold uppercase tracking-widest mb-2">most-visited (top 20 by volume)</div>
            <div className="text-[11px] text-[#64748b] space-y-1">
              <div>Market cap: $80B – $1.5T</div>
              <div>Volume: $4B – $57B</div>
              <div>Typical: BTC, ETH, stablecoins, top-20</div>
              <div className="text-organic">Examples: USDT $57B, BTC $32B, ETH $14B</div>
            </div>
          </div>
        </div>
        <div className="border-l-2 border-signal/40 pl-3">
          <p className="text-[11px] text-[#64748b] leading-relaxed">
            <span className="text-[#e6edf3] font-bold">Interpretation:</span>{' '}
            The two sort keys select fundamentally different market segments. The micro-caps that dominate
            the percentage-change list have 4–5 orders of magnitude less volume than the large-caps that
            dominate the volume list. During extreme fear (F&amp;G: 8–9), this structural separation is
            maximally pronounced — large-caps get relative safety flows, micro-caps get speculative pumps
            with no volume backing.
          </p>
        </div>
        <p className="text-[11px] text-[#64748b]">
          This is not a bug. The{' '}
          <span className="text-[#e6edf3]">signal cohort is empirically empty</span>{' '}
          — which is itself the finding. See{' '}
          <a href="/dashboard" className="text-signal hover:underline">cohort survival dashboard</a> and{' '}
          <a href="/evidence" className="text-signal hover:underline">evidence ledger</a>.
        </p>
      </div>
    ),
  },
];

function NoteCard({ note }: { note: Note }) {
  const meta = TYPE_META[note.type];
  return (
    <div className={`border ${meta.border} ${meta.bg} rounded-lg p-6 flex flex-col gap-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>§{note.id}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${meta.border} ${meta.color}`}>
              {meta.label}
            </span>
          </div>
          <h2 className="text-[#e6edf3] text-sm font-bold leading-snug">{note.title}</h2>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {note.endpoints.map(ep => <Tag key={ep} label={ep} />)}
        <Tag label={`reproduced: ${note.reproduced}`} />
      </div>
      {note.body}
    </div>
  );
}

export default function ApiNotes() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-base font-bold text-[#e6edf3]">api notes</h1>
        <p className="text-[#64748b] text-xs mt-1 max-w-xl leading-relaxed">
          undocumented CMC behaviors discovered while building Wick.
          each entry includes the raw response, reproduction timestamp, and how we handle it.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {NOTES.map(note => <NoteCard key={note.id} note={note} />)}
      </div>

      <div className="border border-dashed border-border rounded px-5 py-4 text-[11px] text-[#64748b]">
        all behaviors observed with the CMC hackathon API key (450,000 credits/month).
        raw JSON for every API response is stored in <code className="bg-panel px-1 py-0.5 rounded">data/wick.db</code> alongside the parsed appearance rows.
      </div>
    </div>
  );
}
