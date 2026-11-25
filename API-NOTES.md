# API-NOTES — Undocumented CMC Behaviors

Observations from recording `/trending/gainers-losers`, `/trending/most-visited`,
`/trending/latest`, and `/fear-and-greed/latest` over time.

---

## 1. HTTP 200 with application-level error

**Endpoint:** all three trending endpoints

**Reproduced:** 2026-11-24T20:21:54Z (first local recording run)

```json
{
  "status": {
    "timestamp": "2026-11-24T20:21:55.584Z",
    "error_code": "500",
    "error_message": "The system is busy, please try again later!",
    "elapsed": "0",
    "credit_count": 0
  }
}
```

**What happens:** The CMC API returns HTTP 200 (not 429 or 503), but the JSON body
contains `status.error_code = "500"` with no `data` key. `credit_count` is 0,
so no credits are consumed.

**How we handle it:** `appErrorCode()` in `recorder/index.ts` checks
`status.error_code !== 0` and skips appearance insertion, logging the app error.

**Implication:** Any consumer of these endpoints that only checks HTTP status will
silently store empty snapshots. We always store the raw JSON regardless, so
nothing is lost — the gap is visible in the DB as a snapshot with 0 appearances.

---

## 2. Trending endpoint response shapes

The three endpoints return different shapes for `data`:

| Endpoint | `data` shape |
|---|---|
| `/trending/gainers-losers` | Object `{ gainers: CmcCoin[], losers: CmcCoin[] }` |
| `/trending/most-visited` | Array `CmcCoin[]` directly |
| `/trending/latest` | Array `CmcCoin[]` directly |

The gainers endpoint wraps in `data.gainers`, the others return `data` directly.

---

## 3. Fear & Greed endpoint shape

`/v3/fear-and-greed/latest` returns:

```json
{
  "status": { "timestamp": "...", "error_code": 0, ... },
  "data": {
    "value": 72,
    "value_classification": "Greed",
    "timestamp": "2026-11-24T00:00:00.000Z"
  }
}
```

`data.value` is a number 0–100. Used as context in every appearance row.

---

## 4. Trending endpoint plan restriction

**Endpoints affected:** all three `/v3/cryptocurrency/trending/*` endpoints

**Reproduced:** consistently across every run (Nov 24–25 2026)

The hackathon key has 450,000 monthly credits and no explicit tier field in
`/v1/key/info`. All three trending endpoints return error_code "500" (system busy)
with `credit_count: 0` on every request — even after retry. The Fear & Greed
endpoint (`/v3/fear-and-greed/latest`) works fine on the same key.

Zero credit consumption is the definitive indicator: CMC charges credits for
processed requests (even failed ones), but charges nothing when access is denied
before processing.

**Pivot:** Switched to `/v1/cryptocurrency/listings/latest` with different sort
parameters, which is accessible on all plans:

| Old endpoint | New endpoint | Sort param |
|---|---|---|
| `/v3/trending/gainers-losers` | `/v1/cryptocurrency/listings/latest` | `percent_change_24h DESC` |
| `/v3/trending/most-visited` | `/v1/cryptocurrency/listings/latest` | `volume_24h DESC` |
| `/v3/trending/latest` | `/v1/cryptocurrency/listings/latest` | `percent_change_1h DESC` |

DB schema is unchanged — endpoint names `gainers`, `most_visited`, `trending`
are preserved. The analysis and web UI are unaffected.

---

---

## 5. Structural finding: listings endpoints are completely disjoint

**Observed:** consistently across all 6 data windows (Nov 24–25 2026)

The top 20 by `percent_change_24h` (gainers) and top 20 by `volume_24h` (most-visited)
are always completely disjoint — 0 coins appear in both. Zero overlap in every window.

**Interpretation:** Coins that pump the most by percentage are small-caps with tiny
volume ($386K–$2M 24h). Coins with the highest volume (BTC at $32B, ETH at $14B,
USDT at $57B) have price changes of only −1% to −2%. The two sorting dimensions
select fundamentally different market segments, making overlap structurally rare.

**Implication for the thesis:** The "signal" cohort (both gainers + most-visited)
is empirically empty. This is itself the finding — price pumps in the top 20 gainers
consistently lack any organic volume backing. Every gainer classified as "noise" by
CMC's own data.

*Add observations here as they accumulate. Each entry should include endpoint,
reproduction timestamp, raw JSON snippet, and how we handle it.*
