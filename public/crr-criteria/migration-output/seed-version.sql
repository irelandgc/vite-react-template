-- Version record (snapshot stored in KV, not in D1 for initial migration)
INSERT INTO versions (version_label, notes, criteria_snapshot, status, created_at, created_by, published_at, published_by)
VALUES ('v3.4.4', 'Initial migration from monolithic HTML files', '[]', 'published', '2026-04-03T00:00:00Z', 'migration', '2026-04-03T00:00:00Z', 'migration');

-- Audit log entry
INSERT INTO audit_log (action, entity_type, entity_id, performed_by, performed_at)
VALUES ('publish', 'version', '1', 'migration', '2026-04-03T00:00:00Z');
