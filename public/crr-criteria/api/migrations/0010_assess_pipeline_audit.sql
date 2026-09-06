-- ARCH-MIG-01 slice 5 — pipeline audit columns.
--
-- POST /api/assess (the full pipeline: PII gate -> extract -> merge -> evaluate)
-- writes ONE assessments row per call. Slice 3's 0009 row already covers bundle
-- versions, engine/prompt/model versions, the QuestionnaireResponse, the Advisory,
-- discrepancies and validation_failures. The pipeline adds four things the brief
-- (slice 5 D2) requires on the record and that had no column:
--   equivalence_list_version  the concept-equivalence list in force (invariant 8)
--   model_provider            'anthropic' | 'azure-openai' (extraction variance, SR-09)
--   redaction_patterns        JSON array of PII pattern types hit (never the note)
--   attestations              JSON [{ linkId, value, attestedBy }] (AD-17)
--   exam_site_selection       JSON { requestedExamSite, candidateExamSites[] } (AD-20)
--
-- All nullable — a slice-3 evaluate-only row leaves them null. Applied to the
-- remote D1 at the slice 10 cut-over, with 0009 (not before — flags are off).

ALTER TABLE assessments ADD COLUMN equivalence_list_version TEXT;
ALTER TABLE assessments ADD COLUMN model_provider TEXT;
ALTER TABLE assessments ADD COLUMN redaction_patterns TEXT;
ALTER TABLE assessments ADD COLUMN attestations TEXT;
ALTER TABLE assessments ADD COLUMN exam_site_selection TEXT;
