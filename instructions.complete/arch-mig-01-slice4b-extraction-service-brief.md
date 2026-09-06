> **[COMPLETE — 2026-09-06]** Deliverables 1–5 and 7 done. `pii.ts` (client pipeline ported, `CRR_PII_Detection_AutoRedaction_Spec_v1.0.md`, v0.2 tagged superseded), `provider.ts` (Anthropic live, Azure `NotConfiguredError` stub), `prompt.ts` (assembly from `prompt-v3.0.0.json`, attestation items stripped per AD-17, KI-28 load guard), `gate.ts` (contract gate + AD-17 + truncation), `POST /api/assess/extract` (internal — reuses the slice-3 SD-11 guard `guardInternalAssess`), `POST /api/admin/extraction-prompt/register` (stores v3.0.0 `is_active=0`, never activated). AD-17 attestation category added to the vocabulary (a new top-level key, not an edit to an entry; Proposed set = `workup.strongSuspicionMalignancy`, `excl.urgentAdmissionRequired`). `check` gains an AD-17 rule and accepts the runtime prompt via a mirrored AD-16 test. SR-09 raised; plan slice 4 + slice 10 updated (prompt v3.0.0 activation is a cut-over item).
> **Deliverable 6 (first benchmark run) NOT DONE — blocked.** No model credentials this session, and CLAUDE.md forbids direct Anthropic calls / model calls in CI. The harness (`tooling/criteria-bundle/benchmark/run-extraction-benchmark.mjs`), `results/README.md` and the four ground-truth cases are in place; the run is one command for whoever holds `ANTHROPIC_API_KEY`.
> Verification: verified: `npm run test:api-worker` 103/103 (PII pattern table 22; all 7 gate vectors + AD-17 + truncation; prompt assembly + no-criteria-leak + attestation strip; extract route — gating, PII, provider stub, gate-pass/fail, context injection, fail-closed; register route); tooling `npm run build && npm test && npm run check` green (incl. the AD-17 check rule); root `npm test` / `build` / `check` green; `wrangler deploy --dry-run` both workers (API worker gzip 519 KiB). **Not independently verified:** no model has been run against the prompt (deliverable 6); prompt v3.0.0 is stored but NOT active for the live page; `ASSESS_PIPELINE_ENABLED` off in all config; the extract route was exercised only with a stubbed provider, not a real `wrangler dev` model call; the AD-17 attestation set is engineering's reading of AD-17 (still Proposed), not clinically confirmed. No two-worker `wrangler dev` round trip of `/api/assess/extract` (needs credentials).
> Filed by: Claude Code

# Claude Code Brief: ARCH-MIG-01 slice 4b — Extraction service

**Model:** Claude Sonnet · **Branch:** `feature/arch-mig-slice4b-extraction-service` from main · **Scope:** the service half of plan slice 4. The content half (contract v2, prompt v3.0.0, national Questionnaire, equivalence list, ground truth, gate vectors) is done — slice 4a, PR #7 — and is the specification this slice implements. Sonnet: every design question is answered in the register and the 4a artefacts.

**Gate to start:** PRs #7, #8, #9, #10 merged. If not, stop.

## Read first

1. `CLAUDE.md` — invariants 1, 2, 4, 6, 8; "runs go through the Worker".
2. `documents/ARCHITECTURE_DECISIONS.md` — **AD-15** (one QuestionnaireResponse spans all Questionnaires), **AD-16** (equivalence list versioned with the prompt; `check` fails if criteria content enters the prompt), **AD-17** (attestation indicators — the model must not answer them), **AD-19** (national bundle from KV, fail closed), **AD-20** (`requestedExamSite` + `candidateExamSites[]`), **AD-21** (standards alignment — no change here).
3. `tooling/criteria-bundle/extraction/` — `extraction-contract.md` v2 (the rules and the gate), `prompt-v3.0.0.md` and `prompt-v3.0.0.json` (the machine-readable prompt: `{ version, parts[], equivalenceListVersion, questionnaireUrls[] }`), `PROMPT_DECISION_RECORD.md` (model parameters proposed: `max_tokens 8000`, temperature omitted), `concept-equivalence-v1.md`, `gate-vectors/`.
4. `tooling/criteria-bundle/benchmark/ground-truth/` — the four CT CAP cases and `manifest.json`.
5. `documents/CRR_PII_Detection_AutoRedaction_Spec_v0.2.md` and the client pipeline it describes in `public/crr-criteria/triage/index.html` — this slice ports that to the server and supersedes the spec.
6. `instructions/arch-mig-plan.md` slice 4; `instructions/arch-mig-known-issues.md` KI-26 (prompt audit `performed_by`), KI-28 (startup health check), KI-32 (client pipeline retained as courtesy), KI-35 (provider abstraction), KI-10 (no note correction).
7. `documents/SECURITY_DECISIONS.md` — SD-11 (the internal-route pattern from slice 3: `ASSESS_PIPELINE_ENABLED` on the API worker plus `x-assess-internal`); NFR-006 (model called only server-side, no public route accepts a model request body), NFR-007/008 (redaction before any model call, tested), NFR-009 (provider-agnostic; Anthropic now, Azure OpenAI later).
8. Slice 3's `worker.ts` route gating and `engine.ts` — reuse the gating helper; do not duplicate it.

## Deliverables

### 1. Server-side PII gate — `pii.ts` with a test suite
Port the client pipeline's detection to a worker module: NHI (mod-11 and mod-23 check digits, mod-24 legacy), names, DOB, address, phone, email, referrer-name patterns. Redaction runs **before** prompt assembly and before any model call; the redacted note is the only text the model sees and the only text quotes are validated against. Residual policy: if a hard pattern (NHI) survives redaction, reject the request with a visible reason — never send. Coverage must be ≥ the client's: enumerate every pattern in the v0.2 spec as a test case, plus the negative cases (clinical numbers that look like NHIs, dates that are clinical not DOB). Write `documents/CRR_PII_Detection_AutoRedaction_Spec_v1.0.md` describing the server-side pipeline and marking v0.2 superseded; the client pipeline stays as a courtesy (KI-32).

### 2. Prompt assembly and versioning
Load `prompt-v3.0.0.json` and the equivalence list by version; assemble server-side: the prompt parts, then the Questionnaires for the selected exam/sites plus the national Questionnaire (items only — never criteria text), then the published exam/site list (ids and titles only, from `exam_sites`). Store v3.0.0 in the existing prompt-version table with the decision record reference and make it active; `performed_by` via `actorFrom(c)` (KI-26). A startup health check that the active prompt loads and parses, failing the worker visibly if not (KI-28). `check` already fails if criteria content enters the prompt (AD-16) — add a worker test that the assembled prompt contains no string from any PlanDefinition action title or any numeric threshold from any CQL library.

### 3. Provider abstraction — `provider.ts`
An `ExtractionProvider` interface: `extract({ system, messages, maxTokens }) → { text, modelId, usage }`. Anthropic implementation now; an Azure OpenAI implementation as a compiling stub that throws `NotConfigured` (NFR-009, KI-35). Model parameters are owned here: `max_tokens 8000`; **temperature is not set, and the code comment records that the provider default therefore applies and may differ between providers — extraction variance is measured per provider in slice 9.** Provider name and `modelId` are returned and stamped on every response. API keys from worker secrets only.

### 4. `POST /api/assess/extract` (internal)
Same gating as evaluate (SD-11: flag on the API worker plus `x-assess-internal`). Input `{ note, context: { age?, sex?, labs?[] }, requestedExamSite?, documentationStandard? }`. Flow: PII gate → prompt assembly → provider → parse → validation gate → response. Output `{ questionnaireResponse, examSiteSelection: { requestedExamSite, candidateExamSites[] }, promptVersion, equivalenceListVersion, modelId, provider, redaction: { patternsHit[] }, validation: { passed, failures[] } }`. Age and sex supplied in `context` are never asked of the model (contract rule 7); the route injects them as `documented` answers with no evidence extension (they are structured input, not extraction). No free-text field in the response shape.

### 5. Validation gate — `gate.ts`
Implement the contract's gate and AD-17. Reject the whole response on any of: a quote not present in the redacted note (whitespace-normalised, case-insensitive); an unknown linkId; a value type not matching the item type; an answer without the evidence extension; status `retrieved` from the model path; any verdict-shaped field (`verdict`, `priority`, `missing_criteria`, `suggested_wording`, `notes`, `interpreted_note`); **any answer to an indicator in the attestation category** (AD-17 — read the category from the vocabulary). `gate-vectors/` from 4a are the test fixtures: every reject vector rejects, the pass vector passes. Failures are returned in the response; persistence into `assessments.validation_failures` is slice 5's merge step, not this route.

### 6. First benchmark run (manual, results committed)
No model calls in CI. Once, by hand, through the worker in `wrangler dev` with real credentials: run each of the four ground-truth notes through `/api/assess/extract`, compare the returned QuestionnaireResponse to the ground truth per indicator (value, status, quote) and per `expectedAbsent`, then run the result through `/api/assess/evaluate` and compare the determination to the scenario expectation. Commit the outcome to `tooling/criteria-bundle/benchmark/results/<date>-<provider>-<modelId>.md`: per-indicator hits and misses, quote validity, exam/site selection, and the engine results. This is the plan's "four CT CAP matrix notes produce QuestionnaireResponses whose engine results match" — report it honestly, including misses; a miss is a finding, not a failure of this slice.

### 7. Registers
Raise **SR-09** (extraction drift — variance across runs and providers, measurable via slice 9) in `SECURITY_DECISIONS.md`. Record the residency position as it stands (Anthropic endpoint now; Azure OpenAI Australia East path stubbed) against NFR-009. Update the plan's slice 4 status and slice 10 cut-over list (prompt v3.0.0 activation is a cut-over item, not a merge item — keep v2.3.0 active for the current page until slice 10).

## Done
PII suite ≥ client coverage with the v1.0 spec written; gate tests cover every 4a vector plus the AD-17 rejection; extract route gated like evaluate and unreachable from the public origin; prompt v3.0.0 stored (not yet active for the live page); provider abstraction with Anthropic live and Azure stubbed; the manual benchmark run committed with per-indicator results; SR-09 raised; workers suite and tooling gate green; `wrangler deploy --dry-run` both workers.

## Do not
- Do not build the merge step, the pipeline route, the Advisory renderer or touch the Triage page — slice 5.
- Do not activate prompt v3.0.0 for the current production page or change `FALLBACK_INSTRUCTION_TEXT` — slice 10.
- Do not put criteria content, thresholds or red-flag meanings in the prompt; if extraction quality seems to need it, that's a Questionnaire item-text finding — report it.
- Do not "correct" the note (KI-10) or add any free-text output.
- Do not run model calls from anywhere but the worker, and never in CI.
- Flags stay off in production config. Same error twice: stop and report.

## Report
Route contract; PII pattern table with test counts; gate test matrix; the benchmark results file; any Questionnaire item that extracted poorly (with the page reference); SR-09 text. File this brief per the lifecycle. Stop before slice 5.
