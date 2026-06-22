-- TA-REG-02 D1 migration: add source and regression_run_id to triage_usage_log
-- Additive only. Nullable, no default, no backfill.
-- Existing evaluator inserts continue writing NULL to both new columns.
-- No change to any existing column, index, or read path.
--
-- Deploy via:
--   npx wrangler d1 execute crr-criteria-db --command="ALTER TABLE triage_usage_log ADD COLUMN source TEXT;"
--   npx wrangler d1 execute crr-criteria-db --command="ALTER TABLE triage_usage_log ADD COLUMN regression_run_id TEXT;"
--
-- Verify:
--   npx wrangler d1 execute crr-criteria-db --command="PRAGMA table_info(triage_usage_log);"

ALTER TABLE triage_usage_log ADD COLUMN source TEXT;
ALTER TABLE triage_usage_log ADD COLUMN regression_run_id TEXT;
