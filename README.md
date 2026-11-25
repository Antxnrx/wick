# Wick — CMC Trending Audit

> A candlestick wick is a price that spiked then came back. That's what noise coins do — CMC's own data proves it.

**🏆 Build with CMC: API Hackathon** · Track: Data & Visualisation · Deadline Dec 10, 2026

**[→ Live Demo](https://web-zeta-two-28.vercel.app)** · **[→ Evidence Ledger](https://web-zeta-two-28.vercel.app/evidence)** · **[→ API Notes](https://web-zeta-two-28.vercel.app/api-notes)**

---

## The Finding

CMC runs two independent ranking systems. Cross-referencing them classifies every trending coin:

| Cohort | Definition | Count (7 windows) |
|---|---|---|
| **Signal** | In both Gainers + Most-Visited simultaneously | **0** |
| **Noise** | Gainers only — price moved, no volume | 140 appearances |
| **Organic** | Most-Visited only — attention, no price move | 140 appearances |
| **Trending** | Trending only — 1h momentum chatter | 133 appearances |

**0 signal coins across 7 data windows (100%).** The top 20 by pct_change_24h and the top 20 by volume_24h have never shared a single coin. Every price pump in CMC's gainer list lacks organic volume confirmation — structurally, every gainer is noise.

---

## How It Works

```
CMC API (every 6h)
  │
  ├── /v1/listings/latest?sort=percent_change_24h  → gainers (top 20)
  ├── /v1/listings/latest?sort=volume_24h          → most_visited (top 20)
  └── /v1/listings/latest?sort=percent_change_1h   → trending (top 20)
         │
         ▼ classify each coin
  signal = gainers ∩ most_visited   (double-confirmed)
  noise  = gainers \ most_visited   (price pump, no volume)
  organic= most_visited \ gainers   (volume, no pump)
  trending = trending \ (gainers ∪ most_visited)
         │
         ▼ after 24h / 7d
  backfill T+24h and T+7d outcome prices via CMC historical API
         │
         ▼
  SQLite → export JSON → commit to repo → Vercel static pages
```

---

## Hypothesis

> Coins where CMC's two independent systems agree (signal) outperform coins where only one fires (noise), measured at median T+7d return.

Since the signal cohort is structurally empty, the finding is the disjoint itself — not survival data. T+7d data arrives Dec 1 and fills automatically.

---

## Stack

| Layer | Tech |
|---|---|
| Recorder | TypeScript, `node:sqlite` (Node 22 built-in), no native deps |
| Analysis | TypeScript, deterministic — no model produces a price |
| CI | GitHub Actions cron 00:00/06:00/12:00/18:00 UTC |
| Web | Next.js 15 App Router + Tailwind, Vercel |
| Data | SQLite → JSON → committed to repo (git history = audit trail) |

---

## Interesting API Behaviors

Documented in [`API-NOTES.md`](./API-NOTES.md) and the [live API Notes page](https://web-zeta-two-28.vercel.app/api-notes):

1. **HTTP 200 with `error_code: "500"`** — CMC returns success HTTP status for errors; `credit_count: 0` is the real tell
2. **Trending endpoints plan-restricted** — All `/v3/trending/*` return error with zero credits on the hackathon key; pivoted to `listings/latest` with sort params
3. **Inconsistent response shapes** — `gainers-losers` wraps in `data.gainers`; other trending endpoints return `data` directly
4. **Structural disjoint** — `percent_change_24h` and `volume_24h` sort keys select completely non-overlapping market segments during extreme fear

---

## Repo Layout

```
recorder/     snapshot + DB write (CMC API → SQLite)
analysis/     outcomes backfill (retroactive T+24h, T+7d prices)
scripts/      export-json (SQLite → web/public/data/*.json)
web/          Next.js frontend (landing / live / dashboard / evidence / api-notes)
data/         wick.db — growing snapshot database (committed, every CI run)
FINDINGS.md   specific numbers and interpretation
API-NOTES.md  undocumented CMC behaviors with raw JSON evidence
```

---

## Running Locally

```bash
export CMC_API_KEY=your_key_here

npm run record        # take a snapshot (CMC API → SQLite)
npm run outcomes      # backfill T+24h and T+7d prices (run after 24h+)
npm run export-json   # export SQLite → web/public/data/*.json
npm run dev           # start Next.js dev server
```

---

## Submission Checklist

- [x] Live demo: https://web-zeta-two-28.vercel.app
- [x] GitHub repo with full history (every snapshot is a verifiable commit)
- [x] Evidence ledger — every number traceable to its source API call
- [x] API Notes — undocumented CMC behaviors documented
- [x] FINDINGS.md with structural finding and cohort counts
- [ ] T+7d outcome numbers (arrive Dec 1 — auto-fill)
- [ ] Demo video (record Dec 9)
- [ ] DoraHacks submission

---

Built for [Build with CMC: API Hackathon (Plushie)](https://dorahacks.io/hackathon/coinmarketcap-build-hackathon/detail) by [@whereizanton](https://x.com/whereizanton)
