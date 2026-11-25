import { backfillOutcomes } from './outcomes.js';
backfillOutcomes().catch(err => { console.error(err); process.exit(1); });
