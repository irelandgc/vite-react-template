-- Add parse_success flag to triage_usage_log
-- Allows failed JSON parses to be identified in the usage log.
-- Default 1 (true) so existing rows are not affected.
ALTER TABLE triage_usage_log ADD COLUMN parse_success INTEGER DEFAULT 1;
