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

*Add observations here as they accumulate. Each entry should include endpoint,
reproduction timestamp, raw JSON snippet, and how we handle it.*
