-- Catch-up migration (KI-37): viewer_events exists live but was never given a
-- migration file. Recording it here so schema.sql can be regenerated from
-- migrations and match live reality, before adding slice 2's new tables.
CREATE TABLE IF NOT EXISTS viewer_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  exam_id TEXT,
  site_code TEXT,
  event_data TEXT,
  region TEXT,
  user_name TEXT,
  user_role TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_viewer_events_session ON viewer_events(session_id);
CREATE INDEX IF NOT EXISTS idx_viewer_events_created ON viewer_events(created_at);
