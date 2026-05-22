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
  ai_response_summary TEXT,
  ai_response_json TEXT,
  prompt_version TEXT,
  ip_address TEXT
);

-- Triage Advisor QA reviews
CREATE TABLE IF NOT EXISTS qa_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  session_id TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_role TEXT NOT NULL,
  scenario_type TEXT NOT NULL,
  score_criteria_id TEXT NOT NULL,
  score_suggestion_quality TEXT NOT NULL,
  score_compound_handling TEXT NOT NULL,
  score_safety_redirect TEXT NOT NULL,
  overall_assessment TEXT NOT NULL,
  comments TEXT,
  presentation_text TEXT NOT NULL,
  ai_response_summary TEXT NOT NULL,
  ai_response_json TEXT,
  prompt_version TEXT,
  exam_identified TEXT,
  model_used TEXT,
  documentation_standard TEXT,
  region TEXT,
  ip_address TEXT
);

-- Criteria Viewer QA reviews
CREATE TABLE IF NOT EXISTS qa_viewer_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  session_id TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_role TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  site_code TEXT NOT NULL,
  site_label TEXT NOT NULL,
  region TEXT NOT NULL,
  view_mode TEXT,
  score_accuracy TEXT NOT NULL,
  score_usability TEXT NOT NULL,
  score_value TEXT NOT NULL,
  checklist_criteria_correct INTEGER DEFAULT 0,
  checklist_priority_correct INTEGER DEFAULT 0,
  checklist_gateway_correct INTEGER DEFAULT 0,
  checklist_labvalue_correct INTEGER DEFAULT 0,
  checklist_altmgmt_correct INTEGER DEFAULT 0,
  checklist_notfunded_correct INTEGER DEFAULT 0,
  checklist_guidance_correct INTEGER DEFAULT 0,
  checklist_healthpathways_works INTEGER DEFAULT 0,
  checklist_groupings_correct INTEGER DEFAULT 0,
  comments TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_usage_log_timestamp ON triage_usage_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_log_user ON triage_usage_log(user_name);

-- System prompt versions (TA-009)
CREATE TABLE IF NOT EXISTS system_prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  instruction_text TEXT NOT NULL,
  changelog TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sp_active ON system_prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_sp_version ON system_prompts(version);

CREATE TABLE IF NOT EXISTS system_prompt_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  previous_version TEXT,
  performed_at TEXT NOT NULL DEFAULT (datetime('now')),
  performed_by TEXT NOT NULL,
  reason TEXT
);

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
