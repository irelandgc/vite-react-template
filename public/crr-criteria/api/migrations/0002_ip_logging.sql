-- Adds ip_address columns to QA + usage log tables so we can correlate sessions.
-- Apply with:
--   npx wrangler d1 execute crr-criteria --remote --file=public/crr-criteria/api/migrations/0002_ip_logging.sql

ALTER TABLE qa_reviews         ADD COLUMN ip_address TEXT;
ALTER TABLE qa_viewer_reviews  ADD COLUMN ip_address TEXT;
ALTER TABLE triage_usage_log   ADD COLUMN ip_address TEXT;
