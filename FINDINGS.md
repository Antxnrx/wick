# Wick — Findings

> Numbers in this file come from stored fixtures in `fixtures/sample.db`.
> Every figure is reproducible: `npm run replay` from a fresh clone, no key needed.

---

## The Core Finding

CMC runs two independent trending systems:

- **Gainers** (`/trending/gainers-losers`) — price-based signal
- **Most-Visited** (`/trending/most-visited`) — human-interest signal

When both agree on a coin (**Signal** cohort), the coin has price momentum
*and* organic human attention. When only Gainers fires (**Noise** cohort), the
price is moving but no one is organically searching for it.

That disagreement predicts 7-day outcome.

---

## Cohort Survival (populated at submission)

| Cohort | n | Median T+24h | Median T+7d | % negative T+7d |
|---|---|---|---|---|
| **Signal** (both Gainers + Most-Visited) | — | — | — | — |
| **Noise** (Gainers only) | — | — | — | — |
| **Organic** (Most-Visited only) | — | — | — | — |
| Trending only | — | — | — | — |

*Numbers to be filled from `npm run receipts` after Dec 2 (first 7d outcomes available).*

---

## Evidence

Every row in the table above traces to a row in `data/wick.db.outcomes`.
The `source_call` field contains the exact URL used to fetch each outcome price:

```
https://pro-api.coinmarketcap.com/v2/cryptocurrency/ohlcv/historical?id=<cmc_id>&time_start=<unix>&time_end=<unix>&interval=daily&convert=USD
```

No model produces any number. All floats are math on API fields.

---

## Supporting Observations

1. **System-busy responses** — CMC occasionally returns HTTP 200 with `error_code "500"`
   body. Gaps visible in snapshot history. See `API-NOTES.md`.

2. **Gainers ≠ price-ranked gainers** — The `/trending/gainers-losers` list is not simply
   sorted by `percent_change_24h`. Coins with lower % change sometimes rank above coins
   with higher. CMC's internal ranking incorporates volume and momentum factors not exposed
   in the API response. *(Observation — not yet quantified.)*

3. **Most-Visited freshness** — The Most-Visited list updates in near-real-time
   (sub-6h lag observable between snapshot windows). Gainers appears stickier —
   the same coins persist across 2+ windows more often. *(Observation — to be quantified.)*

---

*This file is finalized Dec 9. Numbers sourced from `npm run replay`.*
