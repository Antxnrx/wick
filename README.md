# Wick

> A candlestick wick is a price that spiked then came back. That's what noise coins do — CMC's own data says so.

**Build with CMC: API Hackathon (Plushie)** · Track: Data & Visualisation · Deadline Dec 10, 2026

---

## What it does

CoinMarketCap runs three independent market signals. Wick cross-references them every 6 hours to classify every trending coin into a cohort:

| Signal source | Description |
|---|---|
| **Gainers** (`listings/latest?sort=percent_change_24h`) | price is moving |
| **Most-Visited** (`listings/latest?sort=volume_24h`) | humans are actively looking |
| **Trending** (`listings/latest?sort=percent_change_1h`) | short-term chatter |

A coin in both **Gainers** and **Most-Visited** simultaneously has price momentum backed by real organic interest — that's the **signal** cohort. A coin in **Gainers only** has a price pump with no corresponding search traffic — that's **noise**. The question Wick answers: does that disagreement between CMC's own systems predict the coin's 7-day outcome?

Every appearance gets a dated receipt: the exact API calls that produced each number, the Fear & Greed regime at the time of entry, and the retroactively fetched price at T+24h and T+7d.

## The hypothesis

> Coins where CMC's two independent systems agree (signal) will outperform coins where only the price system fires (noise), measured at T+7d median return.

Numbers published in [`FINDINGS.md`](./FINDINGS.md) at submission with full evidence.

## Live data collection

The recorder runs on GitHub Actions cron every 6 hours (00:00, 06:00, 12:00, 18:00 UTC). Each run:

1. Fetches all three sorted listing sets from CMC
2. Classifies each coin into its cohort (signal / noise / organic / trending)
3. Backfills T+24h and T+7d outcomes for appearances that have aged out
4. Exports JSON files consumed by the web frontend
5. Commits `data/wick.db` and `web/public/data/*.json` to this repo

The git history is the audit trail — every snapshot is a verifiable commit.

## Stack

- **Recorder**: TypeScript, `node:sqlite` (Node 22 built-in), no native compilation
- **Analysis**: TypeScript, deterministic — no model produces a price
- **Web**: Next.js 15 App Router + Tailwind, deployed on Vercel
- **Data pipeline**: GitHub Actions → SQLite → JSON → Vercel static pages

## Repo layout

```
recorder/     snapshot + DB write logic
analysis/     outcomes backfill, receipt builder, offline replay
scripts/      export-json (SQLite → web/public/data/*.json)
web/          Next.js frontend (live / dashboard / evidence pages)
data/         wick.db — growing snapshot database (committed to repo)
FINDINGS.md   specific numbers, written at submission
API-NOTES.md  CMC endpoint notes and pivot decisions
```

## Running locally

```bash
# set your CMC API key
export CMC_API_KEY=your_key_here

# take a snapshot
npm run record

# backfill outcomes (run after 24h+)
npm run outcomes

# export JSON for the web app
npm run export-json

# start the web frontend
npm run dev
```

## Submission checklist

- [x] GitHub link (this repo)
- [ ] Demo video (record Dec 9)
- [ ] DoraHacks submission

---

Built for [Build with CMC: API Hackathon (Plushie)](https://dorahacks.io/hackathon/coinmarketcap-api-202611/build)
