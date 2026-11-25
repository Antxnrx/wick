# Wick — Findings

> Every number in this file is reproducible. See the [evidence ledger](https://web-zeta-two-28.vercel.app/evidence) or run `npm run export-json && npm run dev` from a fresh clone.

---

## The Core Hypothesis

CoinMarketCap runs three independent market signals. Cross-referencing them classifies every trending coin:

- **Signal** — appears in both Gainers (pct_change_24h ↑) and Most-Visited (volume_24h ↑) simultaneously
- **Noise** — Gainers only: price pumping with no corresponding volume/attention
- **Organic** — Most-Visited only: attention without price confirmation
- **Trending** — 1h momentum only

Hypothesis: Signal coins (double-confirmed by two independent systems) outperform Noise coins (only one system) at T+7d.

---

## Structural Finding (confirmed, pre-outcomes)

**CMC's gainers and most-visited lists are completely disjoint.**

Across all 7 windows with real data (Nov 24–25, 2026):

| Windows with real data | Windows with 0 signal coins |
|---|---|
| 7 | 7 (100%) |

The top 20 coins by `percent_change_24h` and the top 20 by `volume_24h` have zero overlap in every single window. Price pumps in the gainer list are exclusively small-caps ($400K–$2M 24h volume). High-volume coins (BTC at $32B, ETH at $14B) have < 2% daily change.

**This IS the finding:** Every coin classified as a "gainer" by CMC lacks organic volume confirmation. The signal cohort is structurally empty during the extreme-fear regime (Fear & Greed: 8–9 across all windows).

---

## Cohort Counts (7 data windows, Nov 24–25 2026)

| Cohort | Appearances | Median T+24h | Median T+7d | % negative T+7d |
|---|---|---|---|---|
| **Signal** (both Gainers + Most-Visited) | 0 | — | — | — |
| **Noise** (Gainers only) | 140 | pending | pending | pending |
| **Organic** (Most-Visited only) | 140 | pending | pending | pending |
| **Trending only** | 133 | pending | pending | pending |

*T+24h outcomes fill from Nov 25 ~21:06 UTC (CI at 00:00 UTC Nov 26 captures first batch).*
*T+7d outcomes fill from Dec 1.*

---

## Market Regime Context

All data collected during **Extreme Fear** (Fear & Greed Index: 8–9) across every window.

| Window | Coins | F&G | Signal |
|---|---|---|---|
| 2026-11-25T20:56 | 60 | 9 | 0 |
| 2026-11-25T10:23 | 58 | 8 | 0 |
| 2026-11-25T10:14 | 59 | 8 | 0 |
| 2026-11-25T10:10 | 59 | 8 | 0 |
| 2026-11-25T10:07 | 60 | 8 | 0 |
| 2026-11-25T06:30 | 57 | 8 | 0 |
| 2026-11-24T21:06 | 60 | 9 | 0 |

Extreme fear is a regime where pump-and-dump dynamics concentrate in micro-caps while large-caps attract relative safety flows. The structural disjoint is maximally pronounced in this regime.

---

## Evidence

Every appearance has a dated receipt in the [evidence ledger](https://web-zeta-two-28.vercel.app/evidence):
- Exact CMC API call that produced each coin entry
- Entry price and 24h % change at time of snapshot
- T+24h and T+7d outcome price (backfilled via `v1/cryptocurrency/quotes/historical` once available)
- Fear & Greed index at snapshot time

No model produces any number. All figures are math on CMC API fields.

---

## Supporting Observations

1. **Trending endpoint plan restriction** — All `/v3/cryptocurrency/trending/*` endpoints
   return `error_code "500"` with `credit_count: 0` on the hackathon key. Zero credit consumption
   confirms access is denied before processing (not a quota issue). Pivoted to `listings/latest`
   with sort params — same analytical value, more auditable. See [`API-NOTES.md`](./API-NOTES.md) §4
   and [api-notes page](https://web-zeta-two-28.vercel.app/api-notes).

2. **HTTP 200 with application-level error** — CMC returns HTTP 200 for server errors, not 429/503.
   The tell is `credit_count: 0` — requests denied before processing charge no credits. Any consumer
   that only checks HTTP status will silently miss these errors. See [`API-NOTES.md`](./API-NOTES.md) §1.

3. **Price pumps concentrate in micro-caps** — The 24h gainer list exclusively contains coins
   with market caps not represented in the volume leaders. ELEVATE (+10,264% 24h), GROW (+7,769%),
   CDXR (+7,644%) all have volume < $2M. The Most-Visited list is dominated by BTC/ETH/stables.

4. **Extreme fear regime** — Fear & Greed index was 8–9 ("extreme fear") across all recorded
   windows. Results should be interpreted in this context — the disjoint finding may be less
   pronounced in bull or neutral markets. This is a dataset study of one specific market regime.

---

*T+24h outcomes: arriving Nov 26. T+7d outcomes: arriving Dec 1. Numbers fill automatically.*
*Final version: Dec 9, 2026. Submission via DoraHacks.*
