import { getEvidence } from '../../lib/db';

function fmtPrice(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return '$' + n.toFixed(2);
  if (n >= 0.001) return '$' + n.toFixed(4);
  return '$' + n.toExponential(2);
}

function fmtPct(n: number | null) {
  if (n == null) return <span className="text-[#64748b]">—</span>;
  return <span className={n >= 0 ? 'text-signal' : 'text-noise'}>{n >= 0 ? '+' : ''}{n.toFixed(2)}%</span>;
}

export default function Evidence() {
  const rows = getEvidence();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-base font-bold text-[#e6edf3]">evidence ledger</h1>
        <p className="text-[#64748b] text-xs mt-1">
          every number is traceable to its source API call — no model produces a price
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-border rounded p-12 text-center">
          <div className="text-[#64748b] text-sm">no evidence yet — waiting for first snapshot</div>
        </div>
      ) : (
        <div className="bg-panel border border-border rounded overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="border-b border-border">
              <tr className="text-[#64748b] uppercase tracking-wider">
                {['symbol', 'window', 'endpoint', 'entry price', 'entry 24h', 'horizon', 'outcome', 'source call'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border hover:bg-[#161b22]/50">
                  <td className="px-3 py-1.5 font-bold text-[#e6edf3]">{r.symbol}</td>
                  <td className="px-3 py-1.5 text-[#64748b] font-mono">
                    {r.captured_at.slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="px-3 py-1.5 text-[#64748b]">{r.endpoint}</td>
                  <td className="px-3 py-1.5 text-[#e6edf3]">{fmtPrice(r.price_usd)}</td>
                  <td className="px-3 py-1.5">{fmtPct(r.pct_change_24h)}</td>
                  <td className="px-3 py-1.5 text-[#64748b]">{r.horizon ?? '—'}</td>
                  <td className="px-3 py-1.5">{fmtPct(r.outcome_pct)}</td>
                  <td className="px-3 py-1.5">
                    {r.source_call ? (
                      <span className="text-[#64748b] font-mono truncate max-w-[200px] block" title={r.source_call}>
                        {r.source_call.length > 60 ? r.source_call.slice(0, 57) + '…' : r.source_call}
                      </span>
                    ) : <span className="text-[#64748b]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
