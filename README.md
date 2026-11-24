# Wick

> A candlestick wick is a price that spiked then came back. That's what trending-only coins do. CMC's own data says so.

**Build with CMC: API Hackathon (Plushie)** · Track: Data & Visualisation · Deadline Dec 10, 2026

---

## What it does

CoinMarketCap runs two independent trending systems:

- **Gainers** (`/trending/gainers-losers`) — coins whose price is moving
- **Most-Visited** (`/trending/most-visited`) — coins humans are actively looking up

When a coin appears in Gainers but *not* Most-Visited, CMC's own data says the price is pumping without organic human interest. That is a CMC-native manipulation signal.

Wick records both endpoints every 6 hours — the only persistent record of which coins trended, when, and in what regime. It then retroactively scores each coin using CMC's historical OHLCV endpoint and cross-references the two lists to classify every trending coin as:

- **Signal** — appeared in both (convergent)
- **Noise** — appeared in Gainers only (divergent)
- **Organic** — appeared in Most-Visited only

Every coin gets a dated receipt: the exact API calls, the Fear & Greed regime at entry, and the retrospective price at T+24h and T+7d.

## The finding

> "Of coins that hit Gainers but never Most-Visited: median price at T+7d was −X%.
> Of coins that hit both: median T+7d was +Y%.
> CMC's own two endpoints disagreed — and that disagreement predicted outcome."

Numbers published in [`FINDINGS.md`](./FINDINGS.md) at submission with full evidence.

## Offline replay

```bash
npm run replay   # no API key, no network — runs against stored fixtures
```

All findings are reproducible from the fixture snapshots in `fixtures/`.

## Stack

- **Recorder**: TypeScript + better-sqlite3, runs on GitHub Actions cron every 6h
- **Analysis**: TypeScript, deterministic — no model produces a number
- **Web**: Next.js + Tailwind
- **Data**: SQLite (`data/wick.db`) committed to repo — git history is the audit trail

## Repo layout

```
recorder/     cron entry point + DB helpers
analysis/     classify, outcomes fetch, receipt builder, offline replay
web/          Next.js frontend
data/         wick.db — the growing snapshot database
fixtures/     48h frozen slice for keyless replay
FINDINGS.md   specific numbers, written at submission
API-NOTES.md  CMC bugs found with curl repros
```

## Submissions requirements

- [x] GitHub link (this repo)
- [ ] Demo video (recorded Dec 9)
- [ ] DoraHacks submission

---

Built for [Build with CMC: API Hackathon (Plushie)](https://dorahacks.io/hackathon/coinmarketcap-api-202611/build)
