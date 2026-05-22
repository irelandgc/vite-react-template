-- Adds structured AI response JSON to triage tables for richer JSON export.
-- Apply with:
--   npx wrangler d1 execute crr-criteria --remote --file=public/crr-criteria/api/migrations/0003_ai_response_json.sql

ALTER TABLE triage_usage_log ADD COLUMN ai_response_json TEXT;
ALTER TABLE qa_reviews        ADD COLUMN ai_response_json TEXT;
