CREATE TABLE IF NOT EXISTS snapshots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  captured_at TEXT NOT NULL,
  endpoint    TEXT NOT NULL CHECK(endpoint IN ('gainers', 'most_visited', 'trending')),
  raw_json    TEXT NOT NULL,
  credits     INTEGER,
  status_code INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS appearances (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id     INTEGER NOT NULL REFERENCES snapshots(id),
  cmc_id          INTEGER NOT NULL,
  symbol          TEXT NOT NULL,
  name            TEXT NOT NULL,
  price_usd       REAL,
  volume_24h      REAL,
  pct_change_1h   REAL,
  pct_change_24h  REAL,
  fear_greed      INTEGER,
  endpoint        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outcomes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  appearance_id INTEGER NOT NULL REFERENCES appearances(id),
  horizon       TEXT NOT NULL CHECK(horizon IN ('T24h', 'T7d')),
  price_usd     REAL,
  pct_change    REAL,
  fetched_at    TEXT NOT NULL,
  source_call   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_appearances_cmc_id ON appearances(cmc_id);
CREATE INDEX IF NOT EXISTS idx_appearances_endpoint ON appearances(endpoint);
CREATE INDEX IF NOT EXISTS idx_snapshots_captured_at ON snapshots(captured_at);
