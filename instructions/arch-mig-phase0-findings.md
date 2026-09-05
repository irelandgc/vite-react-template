# ARCH-MIG-01 Phase 0 Findings — Migration to the rules-bundle architecture

**Brief:** ARCH-MIG-01 v1.0.0 (`instructions/arch-mig-01-brief.md`) · **Phase:** 0 (Discovery) · **Date:** 5 September 2026
**Status:** STOP — awaiting Gary's review before any design work
**Author:** Claude Fable 5 (design session; read-only — no production Worker routes, deployed assets, prompts, D1 or KV were modified)
**Method:** Direct file and git inspection of the working tree at `main` (HEAD `5a758ad`, plus one uncommitted edit to `CLAUDE.md` — the instruction-file-lifecycle section — which was left untouched). No live endpoint calls. Where a fact was established by an earlier audit and re-checked here, the earlier document is cited rather than re-derived.

**Inputs:** the target architecture as built in `~/Projects/CRR Criteria/CRR_Desision_Support/` (published page *CRR Decision Support Architecture*; `ct-cap-template/` with 3 CQL libraries, PlanDefinition, Questionnaire, regional overlay, 22 passing scenarios; `migration/CLAUDE.md` and `migration/MIGRATION_REVIEW_BRIEF.md`). The NAIAEAG summary and BRD v2 in the Claude project "CRR - Criteria Tools".

---

## Headline findings — read these first

### 1. The system prompt is assembled in the browser; the Worker is a pass-through

`public/crr-criteria/api/worker.ts:620–660` (`POST /api/triage/assess`) does origin check, per-IP rate limit, then forwards the request body verbatim to `api.anthropic.com`. Everything that decides what the model sees — criteria block, system prompt text, documentation-standard instruction, note — is built in `public/crr-criteria/triage/index.html` (`buildCriteriaBlock()` at 1585, prompt assembly around 1660, model constants at 3076–3077). Usage logging is a separate client POST (`/api/triage/usage-log`).

Consequences for the migration: there is no server-side stage to put a validation gate or a PII gate *into* — the extraction service, the gate and the engine are new server-side components, not modifications of existing ones. It also means the "all regression and test assessments go through the Worker API" rule in `CLAUDE.md` currently guarantees only origin/rate-limit/logging, not prompt integrity. The annex item "server-side PII gate" is therefore a new component. (Consistent with `CRR_PII_Detection_AutoRedaction_Spec_v0.2.md`, which is a browser pipeline by design.)

### 2. The model receives the entire criteria set as prose, from a compile-time constant

`triage/index.html` sets `API_BASE = ""` (≈line 645), so the `/api/match-data` fetch never runs and every assessment is built from `EMBEDDED_MATCH_DATA` — already established by `instructions/ta-src-phase0-findings.md` (6 July) and shown to have a live consequence in `documents/CRITERIA-REPUBLISH-2026-07-23-INVESTIGATION.md` (CT Colonography items removed on 23 July are still offered by the Triage Advisor). `buildCriteriaBlock()` serialises all 39 sites / 336 items (stale) into the prompt; TA-SRC-01's accepted design moves that to the published 53 sites / 473 (now 462) items via `buildCriteriaBlockV2()`.

In the target there is **no criteria block in the prompt at all**. The model receives the Questionnaire for the detected exam/site(s) and fills it; the criteria live in the bundle and are evaluated by the engine. This changes the disposition of TA-SRC-01 (see §5).

### 3. Prompt v2.3.0 is a rules engine written in prose — and contains the root of the fabrication finding

`instructions/system-prompt-v2.3.0.txt` (11.6 KB; live per `documents/SECURITY_DECISIONS.md` SD-07) is structured as STEP 0 (redirects/exclusions set verdict "declined" and stop), STEP 1 (identify all pathways, gender filtering, general-vs-specific variants), STEP 2 (interpretation rules: numeric thresholds, epidemiological modifiers, qualitative lab matching, clinical shorthand equivalence, compound decomposition, temporal ambiguity, gateways, lab requirements, `{{DOC_MODE_INSTRUCTION}}`), STEP 3 (verdict from strongest pathway with a five-check consistency pass), STEP 4 (output format with `[pXX]` page references).

A first-pass classification against the brief's five categories:

| Category | Prompt content | Disposition in target |
|---|---|---|
| (a) extraction instruction — survives | clinical shorthand equivalence; negation; qualitative lab descriptions; temporal ambiguity → don't assume; gender noted; differential-diagnosis `?` markers are not assertions | Becomes the extraction contract, **with the status split**: "accept and note the inference in the notes field" becomes "answer with `status: inferred` and a quote". This clause is where inferred and documented were conflated — the mechanism behind the fabrication finding. |
| (b) criteria logic | numeric thresholds are hard minimums; "2 or more abnormal bloods"; gateway-per-pathway; lab requirements table (CT CAP ALP/GGT…, US DVT Wells/D-dimer, Ca-125 ≥35…) | Moves into CQL per exam/site (the CT CAP template already encodes its row of that table). |
| (c) safety / redirect logic | STEP 0 emergencies, ACC, wrong-pathway; "one met pathway = proceeds"; conflicting dispositions; not-funded vs redirected | Becomes CQL precedence (`Determination` case) and the redirect list; STEP 0's emergency list becomes a small national "red flag" library evaluated before any exam library. |
| (d) output formatting | STEP 4 fields, `[pXX]` references, `add_to_note`, `suggested_wording` | Advisory renderer; page refs come from PlanDefinition `source-page`. `suggested_wording` is a **decision** (§10 D6): it is generated text a referrer may paste — keep, but as a renderer template over the Advisory, not a model free-text field. |
| (e) judgement — retired | STEP 1 pathway identification (beyond exam/site detection), STEP 3 verdict rules, STEP 3b consistency checks, "at_risk" verdict | The engine does all of this deterministically; 3b exists only because the model was doing 3. |

The full clause-by-clause table is Phase 1 work; this pass is to show the shape. Roughly 60 % of the prompt by length is (b), (c) and (e).

### 4. CC-DESIGN-01 (accepted 12 July) is a stepping stone the target supersedes — but its census and sign-off are directly reusable

`instructions/compound-criteria-design.md` adds one optional `logic` key (`all` / `any` / `mandatory_plus_any`, flat, no nesting) to the existing item JSON; `compound-criteria-phase0-findings.md` is an item-by-item census: **~60 compound items across 23 sites** (52 adult / 8 paediatric), with the CT CAP `ctcap_p2_1..3` family identified as a denormalised mandatory stem. `compound-criteria-clinical-signoff.md` is a one-page working-group request with six specific rulings — one of them is exactly the CT CAP labs question (single line vs six tickable tests).

The target replaces the `logic` key with Questionnaire indicators + PlanDefinition `selectionBehavior` + CQL, which handles nesting, thresholds, units and three-valued logic that the flat key deliberately excluded. But nothing in the census or the sign-off is wasted: the census **is the transcription worklist** (which sites need compound handling, and what shape), and the six rulings map straight onto the template's REVIEW Qn list. **Decision D2 (§10):** if the sign-off has already gone to the working group, keep the questions and change only the artefact they are signing; do not re-ask.

### 5. TA-SRC-01 is the canonical "recorded fix vs target fix" case

Recorded fix (accepted 6 July, `instructions/ta-src-design.md`): runtime fetch of `criteria:published`, `buildCriteriaBlockV2()`, "criteria unavailable" state, `criteria_version` in the usage log; gated on the TA-REG-01 baseline; the §6.1 no-op already shipped (SR-04 closed). Target fix: the Triage Advisor loads the **bundle** by version and the engine evaluates; there is no criteria block to build. The two share exactly one piece — runtime loading with version stamping and no silent fallback — and that principle is already in the target design.

Whether TA-SRC-01 is implemented as an interim depends on the tabletop date (**D1**). If the tabletop runs on the current tool, TA-SRC-01 (plus the grounding constraint) is the minimum honest state for it; if the tabletop runs on the pipeline, TA-SRC-01 is retired unbuilt. Either way its Phase 0 consumer inventory stands: rule-based exam/site auto-detection (TA-002) depends on `synonyms` / `match_groups` that published data does not carry. In the target, exam/site selection becomes an extraction task (the model picks from the published exam/site list) — the synonym index is retired, or kept only as a client-side hint.

### 6. Current data model → bundle: a clean mapping with two gaps

| Current | Where | Target |
|---|---|---|
| `criteria` rows: one per exam/site, `data` JSON (groups, items, guidance, footnotes, badges) | D1 (`api/schema.sql`), edited by Admin | PlanDefinition (structure, wording, badges, page refs) + Questionnaire (indicators) per exam/site. **Gap 1:** current items are *checkbox labels*, not indicators — each compound item decomposes into several linkIds; the CC-DESIGN-01 census sizes this. |
| `versions` snapshots, publish → KV `criteria:published` | D1 + KV | Bundle registry: KV can hold immutable versioned bundles today (`bundle:<exam-site>:<version>`); D1 `versions` becomes the publish record. |
| Item `logic` key (designed, not shipped) | — | CQL defines + `selectionBehavior`. |
| `system_prompts` + activation → KV (TA-009) | D1 + KV | Survives as **extraction prompt** versioning; the prompt shrinks to category (a) + contract. |
| Regions in KV (`/api/regions`), HealthPathways per region | KV | `regions.json` + regional overlay PlanDefinitions (build-checked: no logic). |
| `audit_log` | D1 | Keep. **Gap 2 (pre-existing, AD-008):** the 23 July content edit has no `criteria`/`update` audit row (`CRITERIA-REPUBLISH…INVESTIGATION.md`). The bundle publish step should write the audit row itself. |
| `triage_usage_log` (incl. live columns `source`, `regression_run_id`, `temperature` absent from `schema.sql` — `verification-report-2026-08.md` §A1) | D1 | Assessment audit record: add bundle version, evidence counts, determination; drop `presentation_text` / `ai_response_summary` storage or confirm they are policy-permitted (they hold note text — see NFR-007). |
| Viewer `EMBEDDED_DATA` fallback (v3.4.4, March) | `viewer/index.html:383` | Retire; Viewer loads PlanDefinition + Questionnaire by version, no silent fallback (same principle as TA-SRC-01 decision 5). |

### 7. The evaluation base is real but not in the shape the benchmark needs

Regression runners (`scripts/reg02-runner.mjs`, `instructions/Prompt-Dev-Done/run-*.mjs`, `scripts/ta-src-01-baseline-runner.mjs`) post cases to the production Worker and record to D1 with `regression_run_id`. `documents/CRR_Test_Case_Results_Matrix_v2.xlsx` holds the case-level outcomes. `verification-report-2026-08.md` could not reconstruct what "138" (the corpus size quoted to NAIAEAG) refers to, and found evaluator-count ambiguity (the eleven-vs-twelve item). All existing cases are labelled at **verdict** level only. The benchmark the target needs is labelled at **indicator** level (per linkId: value, status, quote). The existing cases are the seed; the labelling is new work and should be clinician-set (CK's recommendation).

### 8. Governance registers exist and must be the migration's registers too

`documents/SECURITY_DECISIONS.md` (SD-01…SD-09, SR-01…SR-08), `CRR_Release_Log.md`, `DOC-AUDIT-2026-06/09.md`, `PROJ-AUDIT-2026-07.md`, `verification-report-2026-08.md`, `VERIFICATION-2026-06-21.md`. The migration should add SD/SR entries, not a parallel register. **BRD v3.1.1** is referenced by the verification report but is not in the repository (only v2 is); the BRD redline needs the v3.1.1 file (**D4**).

### 9. Things already aligned with the target

- `feature/role-aware-view` (SD-01, unmerged): a presentation-only referrer/triager split over the same assessment. This is the Advisory's two-view rendering; the branch can be rebased onto the Advisory object rather than the model's JSON.
- Prompt versioning with activation and rollback (TA-009) — keep as-is for the extraction prompt.
- Model pinned by fixed identifier (`claude-sonnet-4-6`, `triage/index.html:3077`; SR-05 alias-drift risk recorded).
- Release-bell / releases table — unaffected.
- Instruction-file lifecycle and STOP-gate discipline — this document follows it.

### 10. Decisions for Gary (needed before Phase 1)

| # | Decision | Why it blocks |
|---|---|---|
| D1 | **Tabletop date** and whether it runs on the current tool or the pipeline. | Determines whether TA-SRC-01 and the grounding constraint are built as interims (and when they become dead code) or retired unbuilt. |
| D2 | Has `compound-criteria-clinical-signoff.md` gone to the working group? | If yes, keep the six rulings and re-point the artefact; if no, fold them into the REVIEW Qn list and send once. |
| D3 | **Pilot exam/site subset.** | Transcription is the long pole; only the subset is transcribed before the tabletop. Suggest: CT CAP (done), CT Head, US Pelvis, US DVT, one paediatric (US Hip) — chosen for compound density per the census. |
| D4 | Supply **BRD v3.1.1** (`.docx`) — not in the repo. | Phase 1 requirements-impact table and Phase 3 redline must diff against the current text, not v2. |
| D5 | Where the template and architecture page live in this repo. Proposal: `documents/reference/architecture/` (page + template, no `node_modules`), tooling under `tooling/criteria-bundle/`. | `CLAUDE.md` says ask before creating files/reorganising; this is a structure addition. |
| D6 | `suggested_wording` (a complete rewritten note the model produces today): keep as a renderer template over the Advisory, or drop for the pilot? | It is the highest-value referrer feature and the highest fabrication risk; a template is deterministic but blunter. |
| D7 | Hosting direction for the new server-side stages: stay on Cloudflare Workers for the pilot (fastest) with the HNZ-controlled platform as the target, or move first? | Everything server-side in the target is new code; where it lands first is a real choice. NFR-009 (Azure OpenAI Australia East) is unimplemented either way. |
| D8 | `presentation_text` / `ai_response_summary` in `triage_usage_log`: are these policy-permitted to persist (they contain note text)? | NFR-007 says no PII stored; note text after redaction is currently stored. The target audit record should not carry it unless explicitly decided. |

---

## 1. Deployable units

| Unit | Entry point | Runtime | Deployed via | Notes |
|---|---|---|---|---|
| Main site worker + static assets | `src/worker/index.ts` (88 lines) | Cloudflare Workers, Hono; assets from `dist/client` | `npm run deploy` (`wrangler.json`) | Same-origin proxy `/crr-api/*` → API worker; injects `ADMIN_KEY` for admin paths; CF Access on `iteratio.nz/crr-criteria/admin/*` |
| API worker `crr-criteria-api` | `public/crr-criteria/api/worker.ts` (48 KB) | Cloudflare Workers, Hono; D1 `crr-criteria`; KV | `public/crr-criteria/wrangler.json` | Public: criteria, version, match-data, regions, system-prompt, releases, triage/assess (proxy), usage-log, qa-review, viewer-event. Admin: criteria CRUD, versions/publish/rollback, regions, system-prompt versions/activate/rollback, audit, releases, seed |
| Criteria Viewer | `public/crr-criteria/viewer/index.html` (320 KB, vanilla JS) | Browser | static | Reads `/api/criteria` live (`API_BASE` set, line 330) with embedded v3.4.4 fallback (line 383); `/api/regions`; URL params exam/site/region/mode; postMessage output |
| Triage Advisor | `public/crr-criteria/triage/index.html` (378 KB, vanilla JS) | Browser | static | Embedded criteria (finding 2); client-side PII pipeline; prompt assembly; strict/inferred `docMode`; compare mode (Sonnet 4.6 vs Opus 4.8); usage-log POST; QA review |
| Admin Tool | `public/crr-criteria/admin/index.html` (127 KB, React via CDN) | Browser | static | Criteria edit, versions, publish (`/api/admin/publish`), regions, system-prompt versions, QA tabs, usage logs, releases, audit |
| Releases page, HL page, demo, compound mock-up | `releases/`, `hl/`, `crr-demo.html`, `compound-mockup.html` | Browser | static | `compound-mockup.html` is the CC-DESIGN-01 rendering mock-up |
| React scaffold | `src/react-app/*` | — | — | Vite template remnants; not part of the tools |

## 2. Where criteria content and logic live today

| Location | What it encodes |
|---|---|
| D1 `criteria.data` JSON (working copy) | Groups, items (`id`, `label`, `shortLabel`, `type`, `mandatory`), guidance, guidanceNarrative, outOfCriteriaNote, alternativeManagement, notFundedDetail, footnotes, badges |
| KV `criteria:published` | Published snapshot served by `/api/criteria` |
| KV `criteria:match-data` and `triage/index.html` `EMBEDDED_MATCH_DATA` | Stale 39-site serialisation + synonym index used by the Triage Advisor (finding 2) |
| `viewer/index.html` `EMBEDDED_DATA` | Stale v3.4.4 fallback |
| `documents/reference/pdf-criteria-all.json` | v5.0.0-pdf preview extract (53 sites / 473 items), no page numbers; authoritative PDF extract for reconciliation |
| `instructions/system-prompt-v2.3.0.txt` / D1 `system_prompts` | Interpretation rules, lab-requirement table, redirect list, verdict logic (finding 3) |
| `triage/index.html` client code | Paediatric detection, exam/site auto-detection from synonyms, post-processing validation (`claude-code-brief-post-processing-validation.md`), output rendering |
| `documents/reference/crr-business-rules.md` | Data categorisation and display rules |

## 3. Prompts and model invocations

One invocation path: browser → `POST /api/triage/assess` → Anthropic Messages API, with prompt caching header. Model `claude-sonnet-4-6` (pinned, client constant), temperature 0.1 (note in `CLAUDE.md` that newer Sonnet may reject it), compare mode adds `claude-opus-4-8`. System prompt fetched at page load from `/api/system-prompt` (active version from D1) with a hard-coded fallback block (`triage/index.html` ≈1612). Output is JSON parsed client-side; `parse_success` recorded in usage log. Malformed output → post-processing validation layer (client).

## 4. Tests

| Asset | Coverage |
|---|---|
| `scripts/reg02-runner.mjs` + results/checkpoint | TA-REG-02: 30 cases × configs A/B (prompt v2.2.0 vs v2.3.0), run through production Worker, tagged in D1 |
| `scripts/ta-src-01-baseline-runner.mjs` + `reg_baseline_…` | TA-REG-01 baseline for the source switch |
| `instructions/Prompt-Dev-Done/run-*.mjs` + results | Prompt v1.1.0–v2.2.0 regression runs |
| `instructions/run-v230-regression-test.mjs`, `prompt-v2.3.0-test-results.*` | v2.3.0 run (pending filing) |
| `documents/CRR_Test_Case_Results_Matrix_v2.xlsx` | Case-level results register |
| Application unit tests | **None found** for Worker routes, PII pipeline, post-processing, or Viewer rendering (`SECURITY-AUDIT-REPORT.md` and the NAIAEAG summary both note the PII pipeline has no automated tests) |

## 5. Backlog (pending instruction files, verbatim list)

`instructions/`: `claude-code-brief-role-aware-view-step1.md` (SD-01, branch exists), `claude-code-plan-ux-enhancements.md` (UX-01…UX-12; UX-02/03/04 flags present in `triage/index.html`), `compound-criteria-clinical-signoff.md`, `compound-criteria-design.md` (ACCEPTED), `compound-criteria-phase0-findings.md`, `prompt-v2.3.0-test-results.{json,md}`, `run-v230-regression-test.mjs`, `system-prompt-v2.3.0.txt`, `ta-src-01-brief.md`, `ta-src-design.md` (ACCEPTED), `ta-src-id-mapping.csv`, `ta-src-phase0-findings.md`, `ta-src-published-unmatched.csv`; `instructions/archive/` (PROJECT-STATUS, work-items, roadmap, document-audit — superseded); `instructions/Prompt-Dev-Done/` (completed prompt regression material, not yet filed to `instructions.complete/`).

## 6. Known-issues register (sources found in the repo)

Compiled into `instructions/arch-mig-known-issues.md` at Phase 1 with the disposition columns. Sources located: `documents/SECURITY_DECISIONS.md` (SD-01…09, SR-01…08 — SR-01/02 rate-limit-behind-proxy, SR-03…, SR-05 model alias drift, SR-08 URL handoff closed), `SECURITY-AUDIT-REPORT.md`, `DOC-AUDIT-2026-06.md`, `DOC-AUDIT-2026-09.md` (5 carry-forward disagreements; Architecture Briefing drift item), `PROJ-AUDIT-2026-07.md`, `VERIFICATION-2026-06-21.md`, `verification-report-2026-08.md` (NFR statuses; schema/live drift; "138" not reconstructable; evaluator counts), `CRITERIA-REPUBLISH-2026-07-23-INVESTIGATION.md` (AD-008 audit gap; live TA-SRC-01 instance), `ta-src-phase0-findings.md` (4 headline findings), `compound-criteria-phase0-findings.md` (3 headline findings), `Triage_Clinical_Review_Brief.md`, `CRR_Test_Case_Results_Matrix_v2.xlsx`. **Not in the repo** (Gary to supply or confirm absent): evaluator-level clinical findings beyond the results matrix, the AI register entry, the PTA, the working-group record of 16 July, the NAIAEAG next-steps annex, BRD v3.1.1.

---

## STOP

No design, no implementation. Phase 1 (gap analysis, prompt decomposition table, requirements impact, known-issues disposition, governance mapping) starts on Gary's answers to D1–D8, or on instruction to proceed with stated assumptions.
