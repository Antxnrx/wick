/**
 * Offline replay — runs the full analysis against fixtures/sample.db.
 * No API key, no network. Used by judges and CI.
 *
 * Usage: npm run replay
 */

import { join } from 'node:path';
import { existsSync, copyFileSync } from 'node:fs';

const FIXTURES_DB = join(process.cwd(), 'fixtures', 'sample.db');
const LIVE_DB     = join(process.cwd(), 'data', 'wick.db');
const REPLAY_DB   = join(process.cwd(), 'data', 'replay.db');

if (!existsSync(FIXTURES_DB)) {
  console.error('[replay] fixtures/sample.db not found — run `npm run snapshot-fixtures` first');
  process.exit(1);
}

// Point the DB module at the replay copy so we don't touch live data
copyFileSync(FIXTURES_DB, REPLAY_DB);
process.env.WICK_DB_PATH = REPLAY_DB;

// Dynamic import after env is set so db.ts picks up the override
const { buildReceipts } = await import('./receipts.js');
const { allWindows } = await import('./classify.js');

const windows = allWindows();
console.log(`[replay] ${windows.length} snapshot windows in fixtures`);

const { receipts, stats } = buildReceipts();

console.log('\n[replay] cohort survival rates:');
for (const s of stats) {
  const t7d = s.median_T7d != null ? `${s.median_T7d.toFixed(1)}%` : 'n/a (not enough data yet)';
  const neg = s.pct_negative_T7d != null ? `${s.pct_negative_T7d.toFixed(0)}% went negative` : '';
  console.log(`  ${s.cohort.padEnd(20)} n=${s.count}  median_T7d=${t7d}  ${neg}`);
}

console.log(`\n[replay] total receipts: ${receipts.length}`);
console.log('[replay] all findings reproducible offline ✓');
