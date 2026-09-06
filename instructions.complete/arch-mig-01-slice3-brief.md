> **[COMPLETE — 2026-09-06]** `POST /api/assess/evaluate` (rules engine), the `CRR_API` service binding with internal-only gating (`x-assess-internal` secret + `ASSESS_PIPELINE_ENABLED`), the `assessments` / `assessment_notes` audit tables (migration 0009) and the Cron purge job delivered. Deliverables §1–6 done, including the two hygiene items. AD-19 recorded as **Proposed** (interim import of the national red-flag library; registry follow-up is SR-13); AD-20 (evaluate contract), AD-13 amendment (immutable test alias), SD-11, SD-12, SR-13 recorded. All flags off in committed config; nothing deployed.
> Verification: verified: `npm run test:api-worker` 51/51 (all 17 non-record CT CAP scenarios + red-flag precedence over HTTP, internal-only gating, multi-bundle aggregation, determinism, audit, purge); root `npm test` 1/1; `tooling/criteria-bundle` `npm run build && npm test && npm run check` green (26/26, 47/47, 4/4, quote check); root `npm run build` / `npm run check` green; `wrangler deploy --dry-run` clean for both workers (API worker gzip 536 KiB); two-worker `wrangler dev -c wrangler.json -c public/crr-criteria/wrangler.json` round trip returned `P2_URGENT`/`P2` for scenario S01 with an `assessments` row written. **Not independently verified:** no production deploy (all flags off — `ASSESS_PIPELINE_ENABLED` must stay off until SR-13 closes); migration `0009` not applied to the remote D1 (slice 10 item); the `assessment_notes` store awaits privacy-office sign-off (KI-34); no release-log entry (slice 3 alters no deployed behaviour). AD-19 is Proposed, not Accepted — Gary to rule on the import-vs-registry question.
> Filed by: Claude Code

# Claude Code Brief: ARCH-MIG-01 slice 3 — Rules-engine route and audit record

**Model:** Claude Sonnet · **Branch:** `feature/arch-mig-slice3-engine` from main · **Scope:** plan slice 3 only. The design is settled in the decisions register; this is implementation against it.

**Gate to start:** PRs #5 (slice 2), #6 (test harness), #7 (slice 4a) and #8 (4a follow-ups) merged. SR-10 closed. If any is missing, stop and report.

## Read first

1. `CLAUDE.md` — invariants 1, 3, 4, 8 and the instruction-file lifecycle.
2. `documents/ARCHITECTURE_DECISIONS.md` — **AD-01** (exam/site → bundle resolution), **AD-03** (red-flag precedence: national library first, stop on fire, ACC second, exam libraries never re-evaluate), **AD-04** (null red flags), **AD-12** (bundle state comes from D1, never from the KV artefact), **AD-13** (the workers test harness — use it), **AD-15** (one QuestionnaireResponse spans all Questionnaires), **AD-17** (Proposed — attestation indicators; nothing to build, but never coalesce their nulls).
3. `instructions/arch-mig-plan.md` slice 3 and §5 (SD-11, SD-12 to raise).
4. `instructions/arch-mig-gap-analysis.md` §4 (multi-bundle evaluation), §5 (publish states and the tabletop flag E4), §6 (audit record — the field list is the schema).
5. `documents/SECURITY_DECISIONS.md` — SD-02/SD-05 (the public proxy this replaces), NFR-003/006/007 as reworded in the v3.2 BRD change log (`documents/BRD-change-log-v3.2.md`): structured record, same-origin service binding, no public route accepts a model request body.
6. Slice 2's code: `loadBundle`, `loadForExamSiteId`, the `bundles` and `exam_sites` tables, and the 19 workers-vitest scenarios — extend them, don't duplicate.
7. `tooling/criteria-bundle/cql/CRR_CTChestAbdomenPelvis_Adult.cql` — the `Determination`, `Advisory`, `Rule Trace` and `Missing Information` defines are the engine's output contract; `cql/CRR_RedFlags.cql` header for the precedence contract; `tests/scenarios.mjs` and `tests/scenarios-redflags.mjs` for the expected results the route must reproduce over HTTP.
8. `test/cql-nodejs-compat.smoke.test.ts` — the SR-10 proof; the evaluate route is the production version of what this test does.

## Deliverables

### 1. `POST /api/assess/evaluate` on the API worker (internal)
Input `{ questionnaireResponse, examSites: [id…], parameters: { documentationStandard: 'strict' | 'inferred' } }`. Behaviour, in order:
- Resolve each id through `exam_sites` (AD-01) to a bundle; a bundle not in `published` state (or `signed-off` when `ASSESS_ALLOW_SIGNED_OFF` is on — E4) produces a per-exam `{ state: 'not-available' }` entry in the response, never a fallback (gap §5).
- Load ELM by version from KV with the per-isolate cache; evaluate the national red-flag library first; if `ACUTE_ASSESSMENT_REQUIRED` or `ACC_PATHWAY`, stop and return the national Advisory with no exam evaluation (AD-03).
- Otherwise evaluate every resolved bundle against the same QuestionnaireResponse (AD-15). Aggregate per gap §4: `requestedExam` result plus `alternatives[]` — any candidate whose determination is `P*` or `ACUTE` while the requested one is not.
- Response carries `bundleVersions` (per exam/site and the red-flag library), `engineVersion`, `vocabularyVersion`, `documentationStandard`, and the full rule trace per bundle. No free-text field anywhere in the shape.
- Deterministic: the same input must produce a byte-identical response body apart from timestamps and ids. Add a test that evaluates twice and compares (NFR-014).

### 2. Service binding
Main worker `wrangler.json`: `services: [{ binding: "CRR_API", service: "crr-criteria-api" }]`. Main worker route `/api/assess/*` forwards via `c.env.CRR_API.fetch()` with trusted headers (`CF-Connecting-IP`; Access identity when present). Gate exposure behind `ASSESS_PIPELINE_ENABLED` (default off in production config). No public HTTP hop between workers; the existing public proxy route is left in place for now and its closure is recorded as a slice 10 item.

### 3. Audit record (gap §6)
D1 migration: `assessments` (id, created_at, bundle_versions JSON, engine_version, prompt_version nullable, model_id nullable, documentation_standard, questionnaire_response JSON, advisory JSON, discrepancies JSON, validation_failures JSON, performed_by, regression_run_id nullable) and `assessment_notes` (assessment_id, note_redacted, created_at) as a **separate table, written only when `AUDIT_STORE_REDACTED_NOTE` is on (default off)**. `retention_days` config (default 180) and a Cron Trigger purge job on the API worker for `assessment_notes` only. The evaluate route writes an `assessments` row on every call. `schema.sql` regenerated. Existing `triage_usage_log` untouched — migration of its role is slice 10.

### 4. Tests (AD-13 harness, `workers-vitest`)
- Every CT CAP scenario in `tests/scenarios.mjs` reproduced through the route over HTTP with identical determinations, missing-information lists and traces.
- Red-flag scenarios: national library fires → exam library not evaluated; ACC after red flag; fall-through to exam evaluation.
- Multi-bundle: use the slice 2 cross-bundle fixture as a second "site"; assert `alternatives[]` populated when the fixture meets and CT CAP does not.
- `not-available` for an unpublished bundle; `signed-off` evaluated only with the flag.
- Version stamping present; audit row written with no note text by default; note stored only with the flag; purge removes rows older than `retention_days`.
- Determinism test.
- `wrangler dev` round trip of the service binding recorded in the PR.

### 5. Registers
Raise **SD-11** (service binding replaces the SD-02/SD-05 public proxy; public assess route closes at slice 10) and **SD-12** (audit record; note store separate, off by default, retention with purge; privacy-office confirmation pending — KI-34) in `documents/SECURITY_DECISIONS.md`. Add an AD entry for any design call not already covered. Update the plan's slice 3 status line.

### 6. Two hygiene items while you're in the tree
- `tests/scenarios-bundle.json` churns timestamps on every `npm test`. Make the generated output deterministic (drop or fix the timestamp) so the file only changes when content changes.
- `instructions/arch-mig-known-issues.md` footer count is stale (says 44; register has KI-52). Fix it.

## Done (from the plan)
Vitest covers the evaluate route (CT CAP scenarios via HTTP), version stamping, audit write, purge job; service-binding round trip works in `wrangler dev`; SD-11 and SD-12 raised; flags off in production config; `npm run build && npm test && npm run check` (tooling) and the workers suite green.

## Do not
- Do not implement extraction, the PII gate, merge, the pipeline route or any renderer — slices 4b and 5.
- Do not call a model from anywhere in this slice.
- Do not change bundle content, CQL, the vocabulary or `publish.mjs`.
- Do not enable `ASSESS_PIPELINE_ENABLED` or `AUDIT_STORE_REDACTED_NOTE` in production config.
- Do not close the existing public proxy route.
- Same error twice: stop and report.

## Report
Route contract (request/response shape); migration; test output; the `wrangler dev` binding check; SD-11/SD-12 text as raised; any AD added; anything in the current workers that conflicted with the design. File this brief per the lifecycle. Stop.
