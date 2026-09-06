-- ARCH-MIG-01 — two-phase assessment (`/api/assess/propose` + `/api/assess/complete`).
--
-- The pipeline splits in two: `propose` runs a national-only extraction (exam
-- candidates + attestation questions + national red-flag answers), writes one
-- row, and returns the proposal. The user confirms the exam and answers the
-- attestations; `complete` runs the FULL extraction once, scoped to the
-- confirmed exam, then merges + evaluates and UPDATEs the SAME row. One
-- assessmentId, one row.
--
--   status    NULL for a slice-3 evaluate-only row or a one-call `/api/assess`
--             row; 'proposed' after `propose`; 'completed' after `complete`.
--   proposal  JSON { context, meta, modelExamSites, questionnaireResponse } —
--             phase-1's context, extraction meta, exam candidates and QR. Kept
--             after `complete` (the audit record and the AD-25 exam-override
--             discrepancy). Never contains note text.
--
-- A row left at 'proposed' past AUDIT_NOTE_RETENTION_DAYS (default 180) is purged
-- by the Cron `scheduled` handler (purgeExpiredProposals), same retention as
-- `assessment_notes`. Both columns nullable — applied to the remote D1 with
-- 0009/0010 at the slice 10 cut-over.

ALTER TABLE assessments ADD COLUMN status TEXT;
ALTER TABLE assessments ADD COLUMN proposal TEXT;
