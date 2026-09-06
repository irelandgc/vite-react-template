# Claude Code Brief: ARCH-MIG-01 slice 5 — Pipeline route, merge, Advisory renderer, thin Triage page

**Model:** Claude Sonnet · **Branch:** `feature/arch-mig-slice5-pipeline` from main · **Scope:** plan slice 5. This is the slice that turns three internal routes into one assessment the page can call. It is large; work the deliverables in order and stop at each gate rather than pressing on with something half-wired.

**Gate to start:** PRs #13 and #14 merged (prompt v3.0.1, equivalence v1.1, benchmark findings). Slice 3 and 4b routes are on main. If not, stop.

## Read first

1. `CLAUDE.md` — all eight invariants; this slice touches the page, so invariant 3 (no criteria logic in application code) and invariant 8 (versions stamped on every assessment) are the ones most easily broken here.
2. `documents/ARCHITECTURE_DECISIONS.md` — **AD-03/04** (national precedence, silent nulls), **AD-12** (state from D1), **AD-15** (one QuestionnaireResponse), **AD-17** (attestation category — Proposed, pending clinical ruling D6, but the plan commits slice 5 to building the mechanism), **AD-19** (fail closed on national bundle), **AD-20** (`requestedExamSite` / `candidateExamSites[]`), **AD-21** (Advisory is a separate reporting artefact from `$apply` output).
3. `instructions/arch-mig-plan.md` slice 5 (all five bullets are requirements) and §4 interims.
4. `instructions/arch-mig-gap-analysis.md` §3 (the four input paths and the merge), §4 (multi-bundle Advisory: `requestedExam` + `alternatives[]`), §6 (audit record fields — the row this slice writes must be complete).
5. `tooling/criteria-bundle/extraction/extraction-contract.md` — merge precedence `retrieved › documented › inferred`; answers with no evidence extension are treated as documented; discrepancies are recorded, never silently resolved.
6. Slice 3 (`engine.ts`, `worker.ts` evaluate route, `guardInternalAssess`) and slice 4b (`pii.ts`, `prompt.ts`, `provider.ts`, `gate.ts`, `buildQuestionnaireResponse`, extract route) — compose them; do not re-implement any of them.
7. `cql/CRR_CTChestAbdomenPelvis_Adult.cql` `Advisory`, `Rule Trace`, `Missing Information` defines — the Advisory shape is defined there and in slice 3's response; the renderer consumes it, never reshapes it.
8. `public/crr-criteria/triage/index.html` — the current page; and branch `feature/role-aware-view` (SD-01, never merged) for the referrer/triager view split to rebase onto the Advisory.
9. BRD v3.2 change log (`documents/BRD-change-log-v3.2.md`): TA-006/007 (single Advisory, two views), TA-008 (extraction only), TA-014 (insufficient information names the indicator), TA-018 (criteria rendered from the same PlanDefinition as the Viewer), TA-022–024 (compare extraction), TA-026 (audit, no note text), TA-028–030 (server-side pipeline, gate, merge/precedence), GEN-004 (priority codes not shown to referrers), CV-015.
10. `documents/SECURITY_DECISIONS.md` SD-01, SD-11, SD-12.

## Deliverables, in order

### 1. `merge.ts` — one QuestionnaireResponse from four sources
Inputs: the extracted QuestionnaireResponse (from `gate.ts`, already validated), calling-application context (`age`, `sex`, `labs[]` → linkIds, `documented`, no evidence extension), referrer attestations (see 3), and population answers (interface only — `POPULATION_ENABLED` is off and the stage is slice 8; leave a typed no-op). Precedence per contract: `retrieved › attested › documented › inferred`; context values override extracted values for the same linkId. Every override is recorded in `discrepancies[]` with both values, statuses and sources — never silently dropped. Attestation category indicators (from the vocabulary's `attestationIndicators`) are set only from the attestation input; if the extractor somehow answered one, the gate has already rejected it — assert this, don't re-handle it. Tests: precedence for every pair of sources; discrepancy recorded on every override; attestation-only for category indicators; `expectedAbsent` linkIds remain absent through the merge.

### 2. `POST /api/assess` on the API worker (internal), forwarded by the main worker
Same gating as evaluate and extract (SD-11). Request `{ note, context: { age?, sex?, labs?[] }, requestedExamSite, attestations?: { [linkId]: { value, attestedBy } }, documentationStandard?, performedBy }`. Flow: PII gate → extract → merge → evaluate (`requestedExamSite` + the extractor's `candidateExamSites[]`) → assemble Advisory → write **one** `assessments` row carrying everything gap §6 lists (bundle versions incl. national, engine/prompt/equivalence/model/provider versions, documentation standard, the merged QuestionnaireResponse, the Advisory, `discrepancies`, `validation_failures`, `redaction.patternsHit`, `performed_by`, and the attestations with `attestedBy`) → respond `{ assessmentId, advisory, versions, examSiteSelection, discrepancies, validation: { passed, failures[] } }`. A gate rejection or a fail-closed national bundle is a visible typed error to the page, and still writes an `assessments` row with `validation_failures` populated and no Advisory (the failure is part of the record). No free-text field anywhere. Main worker `/api/assess` forwards via `CRR_API` behind `ASSESS_PIPELINE_ENABLED`, stripping and setting `x-assess-internal`.

### 3. Attestation questions (AD-17 mechanism)
For every indicator in the vocabulary's attestation category that appears on the Questionnaire of the requested exam/site (or any candidate), the page shows an explicit question before assessment runs, in the criteria's published words, answered yes / no / not assessed, with the referrer's identity (`performedBy`) recorded against it. Unanswered = not sent = null downstream, and the Advisory's missing-information list then names it in the published words. Never pre-ticked, never defaulted. Record the representation decision as an AD: attestations carry `status: documented` plus an evidence sub-extension `{ source: 'referrer-attestation', attestedBy }` — no new status value, engine unchanged — with a note that AD-17's clinical ruling (D6) may change whether these are asked at all.

### 4. Advisory renderer — one object, two views
A shared `advisory-render.ts` (client-side, no criteria content — everything it displays comes from the Advisory, the PlanDefinition and the Questionnaire item text delivered with the bundle). **Referrer view:** determination in plain words from the PlanDefinition row wording; red flags and redirects with published wording; "what to add" = each `missingInformation` linkId rendered as the published Questionnaire item text (D6 — no suggested wording, no prose); cross-exam recommendations from `alternatives[]` with the published row wording; page references from `source-page`; **no priority codes** (GEN-004); the attestation questions from 3. **Triager view:** everything above plus priority codes, the rule trace, evidence status per indicator with its quote, `discrepancies`, `inferredExcludedByStrictStandard`, and version stamps. Rebase the useful parts of `feature/role-aware-view` onto this; SD-01's constraint (presentation only) still holds. Tests: referrer view HTML contains no priority code string and no text that is not traceable to a bundle artefact; triager view shows every trace item; "what to add" text equals the Questionnaire item text byte-for-byte.

### 5. Thin Triage page behind the flag
`triage/index.html`: when `ASSESS_PIPELINE_ENABLED` is on, the page collects note + context + attestation answers, calls `/api/assess`, renders the Advisory. It does **not** assemble a prompt, load `EMBEDDED_MATCH_DATA`, run synonym auto-detect, run post-processing validation, or call the model. When the flag is off, the existing page behaves exactly as today — keep the old code paths intact (deletion is slice 10) so the flag can be flipped both ways during tabletop. Usage and QA submissions carry `assessmentId`. The provenance modal shows the version stamps from the response.

### 6. Compare-extraction mode (TA-022–024)
Behind the same flag: run extraction with two providers/models (Anthropic live; Azure stub returns `NotConfigured` visibly), same contract, show per-indicator differences (value, status, quote) and the engine result for each — which must be identical when the merged QuestionnaireResponses are identical, and the diff explains it when not. No verdict comparison, no free text.

### 7. Tests and the end-to-end proof
Workers suite for 1–3 and the route; page-level tests for 4–5 where the harness allows; and the Done proof: the four CT CAP ground-truth notes through `/api/assess` in the two-worker `wrangler dev` (`-c wrangler.json -c public/crr-criteria/wrangler.json`), with attestations supplied for `workup.strongSuspicionMalignancy` where the ground truth expects the pathway to be reachable, engine determinations matching the scenario expectations, and one `assessments` row per call with every field populated. Record the run in `benchmark/results/` as an end-to-end entry.

### 8. Registers and docs
AD for the attestation representation (3); update AD-17's consequence text if the mechanism differs from what it assumed; SD-01 status updated (rebased/superseded); plan slice 5 status and slice 10 cut-over items (flag flip now switches the page, not just the route); a **draft** release-log entry for the pipeline (not deployed, flag off); `documents/CRR-integration-guide.md` gains a short "pipeline mode" section describing the new request contract for calling applications (the old contract stays documented until slice 10).

## Done (from the plan)
End-to-end on the CT CAP matrix notes in `wrangler dev`; role-aware views rendered from the Advisory; attestation questions rendered for every category-flagged indicator on the CT CAP Questionnaire and recorded with the assessment; usage/QA submissions reference the audit record id; release-log entry drafted; flags off in production config; all suites green; `wrangler deploy --dry-run` both workers.

## Do not
- Do not deploy or flip any flag in production config.
- Do not delete the old page code paths, `FALLBACK_INSTRUCTION_TEXT`, or the public proxy route — slice 10.
- Do not build the population stage — interface only (slice 8). Do not touch the Viewer (slice 6).
- Do not put criteria wording, thresholds or advice into page code; if the renderer needs text, it comes from the bundle.
- Do not activate prompt v3.0.1 for the current page; the pipeline route loads its own active prompt version.
- Same error twice: stop and report.

## Report
Route contract; merge precedence table with test evidence; the attestation AD text; screenshots or DOM dumps of referrer and triager views for one case; the end-to-end results entry; anything in the current page that resisted the thin-client cut (with a note on whether it is slice 10's problem). File this brief per the lifecycle. Stop before slice 6.
