# Wick — Findings

> Every number in this file is reproducible. See the [evidence ledger](https://wick.vercel.app/evidence) or run `npm run export-json && npm run dev` from a fresh clone.

---

## The Core Hypothesis

CoinMarketCap runs three independent market signals. Cross-referencing them classifies every trending coin:

- **Signal** — appears in both Gainers (pct_change_24h ↑) and Most-Visited (volume_24h ↑) simultaneously
- **Noise** — Gainers only: price pumping with no corresponding volume/attention
- **Organic** — Most-Visited only: attention without price confirmation
- **Trending** — 1h momentum only

Hypothesis: Signal coins (double-confirmed by two independent systems) outperform Noise coins (only one system) at T+7d.

---

## Structural Finding (pre-outcomes, confirmed)

**CMC's gainers and most-visited lists are completely disjoint.**

Across all 10+ windows recorded (Nov 24–25, 2026):

| Windows with real data | Windows with 0 signal coins |
|---|---|
| 6+ | 6+ (100%) |

The top 20 coins by `percent_change_24h` and the top 20 by `volume_24h` have zero overlap in every single window. Price pumps in the gainer list are exclusively small-caps ($400K–$2M 24h volume). High-volume coins (BTC at $32B, ETH at $14B) have <2% daily change.

**This IS the finding:** Every coin classified as a "gainer" by CMC lacks organic volume confirmation. The signal cohort is structurally empty during the extreme-fear regime (Fear & Greed: 8–9 across all windows).

---

## Cohort Survival (outcomes pending)

| Cohort | n | Median T+24h | Median T+7d | % negative T+7d |
|---|---|---|---|---|
| **Signal** (both Gainers + Most-Visited) | 0 | — | — | — |
| **Noise** (Gainers only) | 80+ | — | — | — |
| **Organic** (Most-Visited only) | 80+ | — | — | — |
| Trending only | 76+ | — | — | — |

*T+24h outcomes available from Nov 25 ~21:00 UTC. T+7d available from Dec 1. Numbers filled at submission.*

---

## Evidence

Every appearance has a dated receipt in the [evidence ledger](https://wick.vercel.app/evidence):
- Exact CMC API call that produced each coin entry
- Entry price and 24h % change at time of snapshot
- T+24h and T+7d outcome price (backfilled via `v2/cryptocurrency/ohlcv/historical`)
- Fear & Greed index at snapshot time

No model produces any number. All figures are math on CMC API fields.

---

## Supporting Observations

1. **Trending endpoint plan restriction** — All `/v3/cryptocurrency/trending/*` endpoints
   return `error_code "500"` with `credit_count: 0` on the hackathon key. Zero credit consumption
   confirms access is denied before processing (not a quota issue). Pivoted to `listings/latest`
   with sort params — same analytical value, more auditable. See `API-NOTES.md` §4.

2. **Price pumps concentrate in micro-caps** — The 24h gainer list exclusively contains coins
   with market caps not represented in the volume leaders. ELEVATE (+10,264% 24h), GROW (+7,769%),
   CDXR (+7,644%) all have volume <$1M. The Most-Visited list is dominated by BTC/ETH/stables.

3. **Extreme fear regime** — Fear & Greed index was 8–9 ("extreme fear") across all recorded
   windows. This is a specific market regime where pump-and-dump dynamics are most common.
   Results should be interpreted in this context.

---

*Finalized Dec 9, 2026. Submission via DoraHacks.*
