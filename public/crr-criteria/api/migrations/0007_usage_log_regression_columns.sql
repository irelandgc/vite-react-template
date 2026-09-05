-- Catch-up migration (KI-37): these three columns exist live on
-- triage_usage_log (added for TA-REG-02 / the ARCH-MIG-01 slice-0/1 baseline
-- runs) but were never given a migration file. Recording them here so
-- schema.sql can be regenerated from migrations and match live reality.
ALTER TABLE triage_usage_log ADD COLUMN temperature REAL;
ALTER TABLE triage_usage_log ADD COLUMN source TEXT;
ALTER TABLE triage_usage_log ADD COLUMN regression_run_id TEXT;
