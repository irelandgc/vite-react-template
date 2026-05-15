-- ══════════════════════════════════════════════════════════════
--  CRR Criteria Database — D1 Schema
--  Run: wrangler d1 execute crr-criteria --file=schema.sql
-- ══════════════════════════════════════════════════════════════

-- The criteria data, one row per exam/site combination
CREATE TABLE IF NOT EXISTS criteria (
  id TEXT PRIMARY KEY,             -- e.g. 'ct-head', 'us-abdomen'
  title TEXT NOT NULL,             -- e.g. 'CT — Head'
  modality TEXT NOT NULL,          -- 'CT' | 'Ultrasound' | 'X-Ray' | 'MRI'
  type TEXT NOT NULL,              -- 'singlesite' | 'multisite'
  population TEXT DEFAULT 'adult', -- 'adult' | 'paediatric'
  data JSON NOT NULL,              -- full criteria object (groups, items, guidance, etc.)
  updated_at TEXT NOT NULL,        -- ISO timestamp
  updated_by TEXT NOT NULL         -- admin email
);

-- Version history — snapshot of all criteria at a point in time
CREATE TABLE IF NOT EXISTS versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version_label TEXT NOT NULL,     -- e.g. 'v3.4.4', 'v4.0.0'
  notes TEXT,                      -- change description
  criteria_snapshot JSON NOT NULL, -- full criteria at time of publish
  status TEXT DEFAULT 'draft',     -- 'draft' | 'published'
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  published_at TEXT,
  published_by TEXT
);

-- Audit log — every edit action
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,            -- 'create' | 'update' | 'delete' | 'publish'
  entity_type TEXT NOT NULL,       -- 'criteria' | 'version'
  entity_id TEXT NOT NULL,         -- criteria.id or versions.id
  changes JSON,                    -- diff of what changed
  performed_by TEXT NOT NULL,
  performed_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_criteria_modality ON criteria(modality);
CREATE INDEX IF NOT EXISTS idx_criteria_population ON criteria(population);
CREATE INDEX IF NOT EXISTS idx_versions_status ON versions(status);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(performed_at);

-- Triage usage log — every AI assessment during pilot
CREATE TABLE IF NOT EXISTS triage_usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_name TEXT,
  user_role TEXT,
  exam_identified TEXT,
  verdict TEXT,
  model_used TEXT,
  documentation_standard TEXT,
  input_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  cache_write_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_nzd REAL DEFAULT 0,
  presentation_text TEXT,
  ai_response_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_usage_log_timestamp ON triage_usage_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_log_user ON triage_usage_log(user_name);

-- Release log / announcements — visible across all apps via the shared releases page
CREATE TABLE IF NOT EXISTS releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,                 -- markdown
  type TEXT NOT NULL DEFAULT 'announcement',  -- 'release' | 'criteria_update' | 'announcement'
  apps TEXT NOT NULL DEFAULT 'all',   -- CSV: 'all' or any of 'viewer','triage','admin'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published'
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_releases_status ON releases(status);
CREATE INDEX IF NOT EXISTS idx_releases_published_at ON releases(published_at);
