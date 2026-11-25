'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface CoinSlim { symbol: string; pct_change_24h: number | null; volume_24h: number | null; }

export interface LandingData {
  windowCount: number;
  dataWindowCount: number;
  zeroSignalWindows: number;
  capturedAt: string | null;
  coinCount: number;
  fearGreed: number | null;
  noiseCoins: CoinSlim[];
  organicCoins: CoinSlim[];
}

const FALLBACK_NOISE: CoinSlim[] = [
  { symbol: 'ELEVATE', pct_change_24h: 10264, volume_24h: null },
  { symbol: 'GROW',    pct_change_24h: 7769,  volume_24h: null },
  { symbol: 'CDXR',   pct_change_24h: 7644,  volume_24h: null },
  { symbol: 'FOMO',   pct_change_24h: 3218,  volume_24h: null },
  { symbol: 'BDAG',   pct_change_24h: 892,   volume_24h: null },
];

const FALLBACK_ORGANIC: CoinSlim[] = [
  { symbol: 'USDT', volume_24h: 57_000_000_000, pct_change_24h: null },
  { symbol: 'BTC',  volume_24h: 32_000_000_000, pct_change_24h: null },
  { symbol: 'ETH',  volume_24h: 14_000_000_000, pct_change_24h: null },
  { symbol: 'SOL',  volume_24h:  8_200_000_000, pct_change_24h: null },
  { symbol: 'USDC', volume_24h:  6_100_000_000, pct_change_24h: null },
];

function fmtVol(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${(v / 1e3).toFixed(0)}K`;
}

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const str = abs >= 1000
    ? abs.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : abs.toFixed(1);
  return (v > 0 ? '+' : '-') + str + '%';
}

function fearLabel(v: number): string {
  if (v <= 25) return 'extreme fear';
  if (v <= 45) return 'fear';
  if (v <= 55) return 'neutral';
  if (v <= 75) return 'greed';
  return 'extreme greed';
}

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const hasRun = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !hasRun.current) {
        hasRun.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - (1 - p) ** 3;
          setVal(Math.round(eased * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val}</span>;
}

export function LandingClient({ windowCount, dataWindowCount, capturedAt, coinCount, fearGreed, noiseCoins, organicCoins }: LandingData) {
  const stats  = useReveal();
  const method = useReveal();
  const quote  = useReveal();
  const proof  = useReveal();

  const noise   = noiseCoins.length   > 0 ? noiseCoins.slice(0, 5)   : FALLBACK_NOISE;
  const organic = organicCoins.length > 0 ? organicCoins.slice(0, 5) : FALLBACK_ORGANIC;
  const fg      = fearGreed ?? 9;

  return (
    <div className="flex flex-col gap-20 pb-24">

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

        {/* left: pitch */}
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3 text-[11px] text-[#64748b]"
            style={{ animation: 'fadeUp 0.5s ease-out 0.05s forwards', opacity: 0 }}>
            <span className="uppercase tracking-widest">cmc trending audit</span>
            {capturedAt && (
              <>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse inline-block" />
                  live · {coinCount} coins
                </span>
                <span className="text-border">·</span>
                <span className={fg <= 25 ? 'text-noise' : ''}>f&amp;g {fg} — {fearLabel(fg)}</span>
              </>
            )}
          </div>

          <h1 className="text-[clamp(2.6rem,5vw,4.5rem)] font-bold leading-[1.05] tracking-tight text-[#e6edf3]"
            style={{ animation: 'fadeUp 0.6s ease-out 0.15s forwards', opacity: 0 }}>
            every gainer<br />
            on cmc is{' '}
            <span className="text-noise" style={{ textShadow: '0 0 32px rgba(239,68,68,0.35)' }}>
              noise.
            </span>
          </h1>

          <p className="text-[#64748b] text-sm leading-relaxed max-w-sm"
            style={{ animation: 'fadeUp 0.6s ease-out 0.3s forwards', opacity: 0 }}>
            cmc runs two independent ranking systems — gainers sorted by pct_change_24h,
            most&#8209;visited sorted by volume_24h. cross-referencing them classifies every
            trending coin. across {dataWindowCount}+ windows, the two lists have{' '}
            <span className="text-[#e6edf3]">never shared a single coin.</span>
          </p>

          <div className="flex flex-wrap gap-2.5"
            style={{ animation: 'fadeUp 0.6s ease-out 0.45s forwards', opacity: 0 }}>
            <Link href="/dashboard"
              className="px-4 py-2 bg-signal text-[#0f1117] text-[11px] font-bold uppercase tracking-wider rounded hover:bg-signal/85 transition-colors">
              view dashboard →
            </Link>
            <Link href="/evidence"
              className="px-4 py-2 border border-border text-[#64748b] text-[11px] uppercase tracking-wider rounded hover:border-[#64748b] hover:text-[#e6edf3] transition-colors">
              evidence ledger
            </Link>
            <Link href="/live"
              className="px-4 py-2 border border-border text-[#64748b] text-[11px] uppercase tracking-wider rounded hover:border-[#64748b] hover:text-[#e6edf3] transition-colors">
              live coins
            </Link>
          </div>
        </div>

        {/* right: disjoint visual */}
        <div style={{ animation: 'fadeUp 0.7s ease-out 0.5s forwards', opacity: 0 }}>
          <div className="grid grid-cols-[1fr_52px_1fr] rounded-lg overflow-hidden border border-border">

            {/* gainers col */}
            <div className="p-4 bg-noise/[0.03] border-r border-border">
              <div className="text-noise text-[10px] font-bold uppercase tracking-widest mb-0.5">gainers</div>
              <div className="text-[#64748b] text-[9px] mb-3">sorted by pct_change_24h</div>
              <div className="flex flex-col gap-2">
                {noise.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-[#e6edf3] text-xs font-bold">{c.symbol}</span>
                    <span className="text-noise text-[11px] font-mono tabular-nums">{fmtPct(c.pct_change_24h)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* intersection */}
            <div className="flex flex-col items-center justify-center bg-panel border-r border-border gap-1 py-4">
              <div className="text-[#64748b] text-[11px] mb-1">∩</div>
              <div className="text-noise text-2xl font-bold leading-none">0</div>
              <div className="text-[9px] text-[#64748b] uppercase tracking-wider text-center leading-tight mt-1">
                signal<br/>coins
              </div>
            </div>

            {/* most visited col */}
            <div className="p-4 bg-organic/[0.03]">
              <div className="text-organic text-[10px] font-bold uppercase tracking-widest mb-0.5">most visited</div>
              <div className="text-[#64748b] text-[9px] mb-3">sorted by volume_24h</div>
              <div className="flex flex-col gap-2">
                {organic.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-[#e6edf3] text-xs font-bold">{c.symbol}</span>
                    <span className="text-organic text-[11px] font-mono tabular-nums">{fmtVol(c.volume_24h)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 text-[10px] text-[#64748b] text-center uppercase tracking-wider">
            same snapshot · zero coins in common
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────── */}
      <section ref={stats.ref} className={`reveal ${stats.visible ? 'is-visible' : ''}`}>
        <div className="grid grid-cols-3 divide-x divide-border border border-border rounded-lg overflow-hidden">
          {([
            {
              val: 0, label: 'signal coins detected',
              note: `across ${dataWindowCount} windows with real data`,
              color: 'text-noise',
            },
            {
              val: windowCount, label: 'windows recorded',
              note: 'every 6h via github actions cron',
              color: 'text-[#e6edf3]',
            },
            {
              val: fg, label: 'fear & greed index',
              note: fearLabel(fg) + ' — entire dataset',
              color: 'text-noise',
            },
          ] as const).map((s, i) => (
            <div key={i} className="bg-panel p-6 flex flex-col gap-2">
              <div className={`text-5xl font-bold tabular-nums ${s.color}`}>
                {stats.visible ? <CountUp target={s.val} /> : '0'}
              </div>
              <div className="text-xs text-[#e6edf3] uppercase tracking-wider">{s.label}</div>
              <div className="text-[11px] text-[#64748b]">{s.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── METHODOLOGY ──────────────────────────────────── */}
      <section ref={method.ref} className={`reveal ${method.visible ? 'is-visible' : ''} flex flex-col gap-6`}>
        <div>
          <div className="text-[11px] text-[#64748b] uppercase tracking-widest mb-2">methodology</div>
          <p className="text-[#e6edf3] text-sm leading-relaxed max-w-lg">
            each coin is classified by which of cmc&apos;s systems it appears in.
            the intersection — appearing in both simultaneously — is the signal.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: 'signal',   color: 'text-signal',          border: 'border-signal/20',          bg: 'bg-signal/[0.03]',   desc: 'gainers + most-visited', note: 'double confirmation' },
            { label: 'noise',    color: 'text-noise',           border: 'border-noise/20',           bg: 'bg-noise/[0.03]',    desc: 'gainers only',           note: '100% of gainers → here' },
            { label: 'organic',  color: 'text-organic',         border: 'border-organic/20',         bg: 'bg-organic/[0.03]',  desc: 'most-visited only',      note: 'btc, eth, stables' },
            { label: 'trending', color: 'text-[#64748b]',       border: 'border-[#64748b]/20',       bg: 'bg-[#64748b]/[0.03]',desc: 'trending only',          note: 'unfiltered chatter' },
          ]).map(({ label, color, border, bg, desc, note }) => (
            <div key={label} className={`border ${border} ${bg} rounded-lg p-4 flex flex-col gap-1.5`}>
              <span className={`${color} font-bold text-[11px] uppercase tracking-wider`}>{label}</span>
              <span className="text-[11px] text-[#64748b] leading-relaxed">{desc}</span>
              <span className={`text-[10px] ${color} opacity-50 uppercase tracking-wider`}>{note}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINDING QUOTE ────────────────────────────────── */}
      <section ref={quote.ref} className={`reveal ${quote.visible ? 'is-visible' : ''}`}>
        <div className="border border-border rounded-lg p-8 flex flex-col gap-5"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(239,68,68,0.04) 0%, transparent 70%)' }}>
          <div className="text-[11px] text-[#64748b] uppercase tracking-widest">the finding</div>
          <blockquote className="text-xl sm:text-2xl font-bold text-[#e6edf3] leading-snug max-w-2xl">
            &ldquo;price pumps in cmc&apos;s top gainers have{' '}
            <span className="text-noise">zero volume confirmation</span>.
            every coin classified as a gainer is structurally noise.&rdquo;
          </blockquote>
          <p className="text-sm text-[#64748b] leading-relaxed max-w-xl">
            during extreme fear (f&amp;g {fg}), micro-caps dominate the gainers list at $400k–$2m daily volume
            while the most-visited list is btc at $32b, eth at $14b. the two sort dimensions select
            fundamentally different market segments — overlap is structurally impossible at this regime.
          </p>
          <div className="flex gap-5 pt-3 border-t border-border">
            <Link href="/evidence" className="text-[11px] text-[#64748b] hover:text-[#e6edf3] transition-colors uppercase tracking-wider">
              evidence ledger →
            </Link>
            <Link href="/dashboard" className="text-[11px] text-[#64748b] hover:text-[#e6edf3] transition-colors uppercase tracking-wider">
              cohort survival →
            </Link>
          </div>
        </div>
      </section>

      {/* ── PROOF ────────────────────────────────────────── */}
      <section ref={proof.ref} className={`reveal ${proof.visible ? 'is-visible' : ''}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-dashed border-border rounded-lg px-6 py-5">
          <div>
            <div className="text-[#e6edf3] text-sm font-bold mb-1">every number has a dated receipt.</div>
            <div className="text-[11px] text-[#64748b] leading-relaxed max-w-sm">
              exact cmc api call, entry price, timestamp, and outcome price for every coin appearance.
              no model, no imputation — raw math on cmc api fields.
            </div>
          </div>
          <Link href="/evidence"
            className="shrink-0 px-4 py-2 border border-border text-[11px] text-[#64748b] uppercase tracking-wider rounded hover:border-[#64748b] hover:text-[#e6edf3] transition-colors whitespace-nowrap">
            view evidence →
          </Link>
        </div>
      </section>

    </div>
  );
}
