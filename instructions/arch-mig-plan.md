# ARCH-MIG-01 Phase 2 — Migration plan

**Brief:** ARCH-MIG-01 v1.0.0 · **Phase:** 2 · **Date:** 5 September 2026
**Status:** STOP — awaiting Gary's approval before Phase 3 (BRD redline) and any Phase 4 implementation
**Author:** Claude Fable 5 (design session; read-only on the repository)
**Inputs:** `arch-mig-gap-analysis.md` (approved with decisions below), `arch-mig-known-issues.md`, `arch-mig-prompt-decomposition.md`, `tooling/criteria-bundle/` (26/26).
**Decisions applied:** D1–D8 (Phase 0) · E1 pipeline in the API worker, fronted same-origin by a service binding from the main worker · E2 structured audit record; redacted note in a separate table, off by default, retention configurable (default 6 months), purge job · E3 national indicator vocabulary adopted now, versioned, linkIds immutable once published · E4 tabletop/benchmark mode may evaluate `signed-off` bundles · E5 sign-off recorded as a per-bundle file and as Admin Tool state · E6 terminology validation wired when NZHTS access exists; placeholders flagged until then · Admin Tool criteria editing **disabled** for the pilot; all criteria changes (text and logic) via Claude Code sessions against the repo with build gates and diff review · Entra ID for admin auth is a later item, noted so nothing here blocks it.

---

## Summary

Eleven slices, each one branch, one pull request, one concern, and each leaving the system deployable. The order is: bundle plumbing first (vocabulary, red-flag library, registry, engine), then the extraction service, then the pipeline that joins them, then the Viewer, with criteria transcription running in waves alongside from slice 1 onward and the benchmark harness landing before cut-over. The old assessment path is never modified and never "fixed" (D1): it keeps serving until cut-over, then is retired in one slice along with the embedded data, the match-data blob, the v2.3.0 prompt and the client post-processing. Nothing user-facing changes until the tabletop has been run on the pipeline with signed-off bundles. Security improves at slice 3 rather than at the end: the public `workers.dev` assessment route closes when the service-binding route opens, which retires KI-33/39 and most of SR-01/02 as a side effect of the architecture rather than a hardening task.

Model allocation: Sonnet for slices 0, 2, 3, 5, 6, 8, 10; Opus for slice 1 (vocabulary and red-flag content), slice 4 (prompt decomposition into the extraction prompt) and every transcription wave (slice 7). Fable for the reviews at each STOP.

---

## 1. Principles the plan enforces

1. **One concern per PR.** Slice boundaries are PR boundaries. A PR touching the bundle format, the extraction contract and a UI together is rejected.
2. **Tests are the gate.** `tooling/criteria-bundle`: `npm run build && npm test && npm run check` green on every change touching bundles. New server code ships with tests (Vitest under `nodejs_compat`), which the repo currently lacks entirely (KI-32).
3. **Nothing is built on the old path.** No TA-SRC-01, no grounding constraint, no `logic` key (D1). The old path is frozen until slice 10.
4. **Fail visibly.** No embedded fallbacks anywhere: bundle missing → "criteria unavailable"; prompt version missing → extraction refuses; validation fails → whole response rejected and logged.
5. **Registers, not new documents.** SD/SR entries in `documents/SECURITY_DECISIONS.md`, release-log entries at the time of deploy, instruction files filed to `instructions.complete/` with verification lines, per `CLAUDE.md`.
6. **Clinician sign-off before publish.** No bundle reaches `published` without a `signoff.md` naming the reviewer, date and answers to that site's REVIEW Qn (E5).

## 2. Slices

Effort is relative (S/M/L) — no dates were given (D1). Dependencies name the slice that must be merged first.

### Slice 0 — Repo hygiene and guardrails · S · Sonnet · no dependency
**Status: COMPLETE — PR #1, SR-10 closed 2026-09-05.**
- Move `_to_delete/` out of the repo; `.gitignore` for `tooling/**/node_modules` (already covered by the global rule — verify).
- Append `CLAUDE.md` "Target architecture (ARCH-MIG-01)" section (brief Appendix A) — on Gary's approval.
- Add Vitest to the root project for Worker tests; a smoke test that runs `cql-execution` on the CT CAP ELM under `nodejs_compat` in `wrangler dev` (**SR-10 closes here or the plan changes** — see §6).
- File `ta-src-*` and `compound-criteria-*` instruction files as `[SUPERSEDED — date]` to `instructions/archive/` with the reason ("ARCH-MIG-01 retires the mechanism; census and sign-off questions carried into transcription").
**Done:** CI runs build/test/check for `tooling/criteria-bundle` and Vitest for the workers; SR-10 recorded as closed or as a blocker.

### Slice 1 — Indicator vocabulary, red-flag library, bundle build and publish tooling · M · Opus (content) + Sonnet (tooling) · after 0
**Status: COMPLETE (engineering) — PR #2, #3; clinical review of vocabulary pending.**
- `tooling/criteria-bundle/vocabulary/indicators.json`: national vocabulary v1 — shared indicators (demographics, weight loss, common labs, prior imaging, specialist advice, funding, red flags) with `linkId`, text, type, group, status (`active`/`deprecated`), optional codes (placeholders flagged). Rule: linkIds immutable once any published bundle references them; deprecations point to successors. CT CAP retrofitted to reference it.
- `cql/CRR_RedFlags.cql`: national red-flag and ACC library from prompt clauses 2–5, each item citing the PDF row it comes from; `Determination` precedence contract documented; scenarios.
- Publish tooling: `npm run publish -- <examSite>` composes Library (ELM), PlanDefinition, Questionnaire, population Library, overlays, vocabulary version and test results into an immutable bundle JSON; requires `signoff.md` unless `--state transcribed|signed-off`; writes to KV via the API worker's admin route (slice 2) or a local registry dir for dev. Version rule (AD-02): bundle version is independent of `PlanDefinition.version`; first publish of a site is `1.0.0`; the major segment changes if and only if the ELM hash changed since the previous published version — `publish` refuses a mismatched bump either way.
- **Source provenance for approved drafts.** A bundle's `source` metadata records the document it was transcribed from: `{ type: 'pdf' | 'approved-draft', title, identifier, date, pages? }`. Criteria changes arrive as approved drafts ahead of the PDF (CT AP / CTC, 27/08/26); such bundles carry `source.type = 'approved-draft'`, no page references (the `source-page` build rule is relaxed to "page or draft reference"), and are re-provenanced to the PDF page when it is released — a version bump with no logic change.
- **Cross-bundle references.** Where one site's criteria depend on another's determination ("Patients who meet the criteria for CT CAP" is an exclusion in CT AP), the CQL library `include`s the other site's library and references its define; the build resolves includes from the registry and the consistency check records the dependency so a change to CT CAP re-runs CT AP's tests.
- Terminology validation step scaffolded: runs when `NZHTS_URL`/credentials are configured; otherwise reports placeholders and passes (E6). Publishing a bundle with unvalidated codes is blocked once the step is live.
**Done:** vocabulary v1 reviewed by a clinician for grouping (evaluator feedback); CT CAP builds against it; red-flag library 100 % scenario-covered; `publish` produces a bundle that `check` validates.

### Slice 2 — Bundle registry and runtime loading · S–M · Sonnet · after 1
**Status: COMPLETE — PR #5; AD-12 recorded. Automated Vitest coverage not achieved in this slice (tooling limitation, see brief filing note); route behaviour verified live instead. The CI-runnable D1/KV test harness that closes that gap landed separately: `chore/arch-mig-test-harness`, PR #6, AD-13 — `npm run test:api-worker`, all 19 slice-2 scenarios ported and passing.**
- KV keys `bundle:<examSite>:<version>` (immutable) and `bundle:<examSite>:latest-published`; D1 table `bundles` (examSite, version, state, vocabulary version, sign-off ref, published_by/at, test summary) — the publish record and the source of the Admin bundle-state view.
- `examSites` mapping (AD-01): registry `index.json` carries a table mapping every published exam/site ID (53) onto exactly one bundle (38, keyed by PDF section) — e.g. `xr_elbow → xray-shoulder-upper-limb-adult`; non-limb IDs map one-to-one. The Viewer, `GET /api/criteria/<id>`, exam selection, the Advisory and the audit record all keep using the published ID; resolution happens in this layer.
- API worker routes: `GET /api/bundle/:examSite/:version|latest`, `GET /api/bundles` (states), admin `POST /api/admin/bundles/publish` (writes KV + D1 + audit row — KI-23), `POST /api/admin/bundles/:examSite/state` (transcribed → signed-off with `signoff.md` reference).
- `schema.sql` regenerated from migrations (KI-37).
**Done:** CT CAP published as `2.0.0` in state `signed-off` (Gary as interim signatory until the clinical review) and loadable by version; audit row present; Admin Tool shows bundle states (read-only tab).

### Slice 3 — Rules-engine route and audit record · M · Sonnet · after 2
**Status: COMPLETE (engineering) — PR #9 (`feature/arch-mig-slice3-engine`) + follow-ups `chore/arch-mig-slice3-followups`. `POST /api/assess/evaluate` (rules engine), the `CRR_API` service binding with internal-only gating (`x-assess-internal` secret + `ASSESS_PIPELINE_ENABLED`), the `assessments`/`assessment_notes` audit tables (migration 0009) + Cron purge job, all delivered. Decisions: AD-19 (**Accepted** — every library incl. `national-redflags` is a KV-published bundle; engine fails closed if the national layer has no published version), AD-20 (evaluate contract — explicit `requestedExamSite`/`candidateExamSites`), AD-13 amended (immutable test alias), AD-21 (CPG standards alignment), AD-22 (referral outcome reporting — Proposed, future); SD-11, SD-12; **SR-13 closed by design**. 54/54 api-worker tests (17 non-record CT CAP scenarios + red-flag precedence over HTTP, internal-only gating, fail-closed national layer, multi-bundle aggregation, determinism, audit, purge); two-worker `wrangler dev -c wrangler.json -c public/crr-criteria/wrangler.json` round trip returns a correct `P2_URGENT` with an audit row. All flags off in committed config. Not done (slice 10 cut-over): remote publish of `national-redflags`; migration 0009 `--remote` apply; `ASSESS_PIPELINE_ENABLED` flip. The `assessment_notes` store awaits privacy-office sign-off (KI-34).**
- API worker `POST /api/assess/evaluate`: input `{ questionnaireResponse, examSites[], parameters }`; loads ELM by version from KV (per-isolate cache), evaluates red-flag library then each bundle (multi-bundle, gap analysis §4), returns the Advisory with `bundleVersions`, `engineVersion`, `vocabularyVersion`. API worker gains `nodejs_compat`.
- Service binding: main worker `wrangler.json` `services: [{ binding: "CRR_API", service: "crr-criteria-api" }]`; main worker route `/api/assess/*` forwards via `c.env.CRR_API.fetch()` with trusted headers (`CF-Connecting-IP`, Access identity when present). No public HTTP hop.
- Audit record tables (gap analysis §6): `assessments` (structured, no note text) and `assessment_notes` (redacted note, separate, off by default, `retention_days` config, default 180); Cron Trigger purge job on the API worker.
- Feature flag `ASSESS_PIPELINE_ENABLED` (default off in production) gating exposure of the new routes to the page; tabletop mode flag `ASSESS_ALLOW_SIGNED_OFF` (E4).
**Done:** Vitest covers evaluate route (CT CAP scenarios via HTTP), version stamping, audit write, purge job; service-binding round trip works in `wrangler dev`; **SD-11** raised (service binding replaces SD-02/SD-05's public proxy; public `workers.dev` assess route to close at slice 10); **SD-12** raised (audit record and retention).

### Slice 4 — Extraction service · L · Opus (prompt) + Sonnet (service) · after 1; parallel with 2–3
**Status: 4a COMPLETE — PR #7 (content: contract v2, national Questionnaire, prompt v3.0.0, equivalence list, ground-truth seed, gate vectors — AD-14/15/16). 4b COMPLETE (engineering) — branch `feature/arch-mig-slice4b-extraction-service`: `pii.ts` (client pipeline ported, 22-test suite, `CRR_PII_Detection_AutoRedaction_Spec_v1.0.md`), `provider.ts` (Anthropic live, Azure stub — NFR-009), `prompt.ts` (assembly from `prompt-v3.0.0.json`, attestation items stripped — AD-17, no-criteria-leak test, KI-28 load guard), `gate.ts` (contract gate + AD-17 + truncation; all 7 4a vectors), `POST /api/assess/extract` (internal — reuses the SD-11 guard), `POST /api/admin/extraction-prompt/register` (stores v3.0.0 `is_active=0`; never activated — slice 10). 103/103 api-worker tests. **Deliverable 6 (first benchmark run) DONE — commit d9f0c60, `benchmark/results/2026-09-06-anthropic-claude-sonnet-4-6.md`: 2/4 cases gate-pass with every indicator matching ground truth on value/status/quote (16/16 quotes valid); 2/4 gate-fail because the model intermittently omitted the answer-evidence extension (contract rule 3) — an SR-09 wire-format finding, addressed by prompt v3.0.1 (flat model output + tool-use schema; the service builds the FHIR response).** SR-09 raised; AD-17 attestation category added to the vocabulary (Proposed set). Flags off in committed config; prompt v3.0.0 not active for the live page.**
- API worker `POST /api/assess/extract` (internal — called by the pipeline route in slice 5): input `{ note, context: { age, sex, labs[] }, examSiteHint }`.
- **Server-side PII gate** (new requirement): port the client pipeline's detection to the worker with a test suite (NHI mod-11/23 incl. mod-24 legacy, names, DOB, address, phone, email, referrer patterns); redacts before any model call; residual-PII policy = reject with a visible reason if a hard pattern (NHI) survives redaction. Client pipeline retained as courtesy (KI-32).
- Prompt assembled server-side from the extraction contract: skeleton in `arch-mig-prompt-decomposition.md` §2; concept-equivalence list versioned with the prompt (TA-009 table reused; `performed_by` via `actorFrom(c)` — KI-26). Model parameters owned here; startup health check (KI-28). Provider abstraction: Anthropic now, Azure OpenAI later (NFR-009, KI-35).
- **Validation gate**: every quote exists in the redacted note (whitespace-normalised, case-insensitive); linkIds and value types match the Questionnaire(s); evidence extension present on every answer; whole response rejected on any failure and logged to `assessments.validation_failures`.
- Exam/site selection: model chooses candidates from the published exam/site list (titles only) with quotes; red-flag indicators answered from the national library's items.
- Questionnaire for the national `redflag.*` indicators (S1 `transcription-notes.md` §7): the extraction contract needs one so the model has something to answer the red-flag items against; not produced by slice 1 (content-only scope).
**Done:** extraction prompt v3.0.0 stored and active with a decision record; PII suite ≥ the client's pattern coverage; gate tests include an unquotable value, an unknown linkId, a type mismatch; the four CT CAP matrix notes produce QuestionnaireResponses whose engine results match the scenario expectations; **SR-09** raised (extraction drift, measurable via slice 9).

### Slice 5 — Pipeline route, merge, Advisory renderer, thin Triage page · L · Sonnet · after 3 and 4
**Status: not started.**
- API worker `POST /api/assess` orchestrates: PII gate → extract → (population, flag off) → merge → evaluate → Advisory; writes the audit record. Exposed same-origin via the service binding.
- `triage/index.html`: becomes a thin client behind `ASSESS_PIPELINE_ENABLED` — note + context in, Advisory out; removes prompt assembly, `EMBEDDED_MATCH_DATA` loading, synonym auto-detect, post-processing validation, compare-verdict mode (kept code paths are deleted in slice 10, not now, so the flag can be flipped back during tabletop).
- Renderer: referrer view and triager view from one Advisory — rebase `feature/role-aware-view` (SD-01) onto the Advisory object; "what to add" from `missingInformation` linkIds → published wording (D6: no `suggested_wording`); cross-exam recommendations from `alternatives[]`; page references from `source-page`; priority codes suppressed in referrer view (GEN-004).
- **Referrer attestation questions (AD-17).** Every vocabulary indicator in the attestation / clinical-judgement category that appears on a selected Questionnaire is put to the referrer as an explicit question in the thin Triage page; their answer is recorded as an attestation attributed to the named referrer and stored with the assessment. The extraction model never answers these indicators and they are never left silently null. Consequence: CT CAP's main adult pathway (B1) cannot reach "met" from a note alone — the attestation (`workup.strongSuspicionMalignancy`) is required.
- Compare mode becomes **compare extraction** (TA-022–024): two models, same contract, shows per-indicator differences and identical engine result.
**Done:** end-to-end on the CT CAP matrix notes in `wrangler dev`; role-aware views rendered from Advisory; attestation questions rendered for every category-flagged indicator on the CT CAP Questionnaire and recorded with the assessment (AD-17); usage/QA submissions reference the audit record id; release-log entry drafted (not deployed to users — flag off).

### Slice 6 — Criteria Viewer on bundles · M–L · Sonnet · after 2; parallel with 3–5
**Status: not started.**
- Viewer loads PlanDefinition + Questionnaire by `latest-published` for each exam/site that has one; falls back to the current published JSON for sites without a published bundle (this is the only permitted "fallback" and it is the *current* source, not an embedded copy); `EMBEDDED_DATA` removed (KI-19).
- Compound rendering (CV-014) from `selectionBehavior` nesting; badges from action codes; page references; regional overlay rendering from `regions.json` + overlays (region from URL param, CV-021); output text from action `description` (CV-017).
- Ticks produce a QuestionnaireResponse (kept client-side); optional "Check against criteria" button calls `/api/assess/evaluate` with the ticked response (no LLM) and shows the Advisory — a deterministic self-check for referrers.
- Indicator-based grouping option in the Viewer using the vocabulary groups (evaluator feedback), behind a UX flag.
- **`checkSafetyText()`'s hard-coded, unsourced, negation-blind safety-alert list (KI-51) must not be carried forward silently.** Resolve per the outcome of review-pack decision D1 (AD-05) before this slice ships: either the six phrases become a governed national safety define with real provenance/sign-off, sourced the same way as everything else the Viewer renders, or the check is dropped. Do not port the current `indexOf` substring match as-is.
**Done:** CT CAP renders from its bundle with visual parity to today (screenshots in the PR); all other sites unchanged; QA viewer review still works; `checkSafetyText()` resolved per D1, not carried forward unexamined.

### Slice 7 — Criteria transcription programme (waves) · L overall · Opus per site · after 1; runs alongside 2–6
**Status: not started.**
Protocol per exam/site (one Claude Code session each, Opus):
1. Inputs: PDF pages for the site (`documents/reference/` copy of the April 2026 PDF), `pdf-criteria-all.json` entry and current published JSON as cross-checks, CC-DESIGN-01 census entry, vocabulary.
2. Outputs into `tooling/criteria-bundle/sites/<examSite>/`: `<Site>.cql` (verbatim `SOURCE:` on every clinical define; REVIEW Qn list), `Questionnaire-*.json` (vocabulary linkIds where shared; site-specific ones proposed to the vocabulary as additions), `PlanDefinition-*.json` (published wording verbatim, badges, `source-page`), `scenarios.mjs` (every matrix case for the site first, then the STEP-3 worked examples where they apply, then coverage of each pathway/redirect/boundary), `population.cql` where labs/imaging history apply, `signoff.md` template.
3. Gates: `build && test && check` green; a second session (or Gary) reviews the `SOURCE:` quotes against the PDF before the site is marked `transcribed`.
4. Clinical sign-off: reviewer reads define-by-define beside the PDF and answers the REVIEW Qn; `signoff.md` completed; state → `signed-off`; publish.

Site count (AD-01): the source document has **38 sections**; the published exam/site list has **53 IDs** because two adult limb X-ray sections and the paediatric limb sections are each split by joint with identical criteria repeated. One transcription per PDF section, not per published ID — the `examSites` mapping (slice 2) carries the 53→38 resolution. Wave sizing below predates this finding and **is to be re-sized** against 38 bundles, not 53 sites.

Waves (compound density from the census, matrix demand, and volume) — to be re-sized:
- **W1** (tabletop set): CT CAP (done), **CT Abdomen and Pelvis (new criteria, approved draft 27/08/26)**, **CT Colonography (changed: guidance-only, single point of referral)**, CT Head, US Pelvis, US Abdomen, US DVT, CT Chest, X-ray Chest, US Renal.
- **W2**: remaining adult CT (Colonography, IVU/Renal, KUB, Other, Sinus) and adult US (Carotid, FNA/biopsy, MSK, Neck/Thyroid, Scrotum, Soft tissue).
- **W3**: adult X-ray (Abdomen, Shoulder/Upper limb, Pelvis/Hip/Lower limb, Spine).
- **W4**: paediatric (15 sites; note the age-band switch and the CC-DESIGN-01 paediatric findings).
- **W5**: reconciliation — items present in published JSON but absent from the PDF or vice versa (TA-SRC-01 §2 unmatched CSV), and any site whose sign-off raised a national criteria question for the working group.
**Done per wave:** every site in the wave at `signed-off` or with a recorded blocker; vocabulary additions merged; the matrix cases for those sites encoded and passing.

### Slice 8 — Population stage behind a flag · S · Sonnet · after 5
**Status: not started.**
- Integrate `populate.mjs` + population libraries into the pipeline behind `POPULATION_ENABLED` (default off); merge precedence and discrepancy reporting into the Advisory; synthetic-FHIR scenarios run in CI.
**Done:** flag off in production; enabling documented as a governance event (invariant 7) with the PTA/IPP 3A and terminology gates named.

### Slice 9 — Benchmark harness · M · Sonnet (tooling) · after 4
**Status: not started.**
- Labelling aid: a small HTML page (single file, per repo style) that shows a note and the site's Questionnaire and lets a clinician set expected `(value, status, quote)` per linkId; saves JSON into `tooling/criteria-bundle/benchmark/cases/`.
- Runner: posts cases through the Worker with `regression_run_id`; scores extraction per indicator/status, quote validity, exam/site selection; runs the ground-truth response through the engine to check rule correctness; manifest lists every case with provenance (matrix id, D1 id, consent) — replaces "138" (KI-30).
- Model comparison mode over the same cases (Anthropic vs Azure OpenAI when available).
**Done:** the 37 matrix cases labelled at indicator level for W1 sites by clinicians (this is the clinical-time item); baseline extraction scores recorded; **SR-09** has a measurement.

### Slice 10 — Cut-over and retirement · M · Sonnet · after 5, 6, 7-W1, 9
**Status: not started.**
- Pre-conditions: tabletop run on the pipeline with W1 bundles at `signed-off`/`published` (E4), results recorded per case; benchmark baseline recorded; SD-11/12 signed off; **`national-redflags` published to the remote registry** (`registry/national-redflags/1.0.0.json` → admin publish route → `transcribed → signed-off → published`; the engine fails closed until then — AD-19, SR-13 closed by design); **migration `0009_assessment_audit.sql` applied to the remote D1** (`wrangler d1 execute crr-criteria --remote --file public/crr-criteria/api/migrations/0009_assessment_audit.sql`); **`ASSESS_INTERNAL_KEY` set as a secret on both workers** with the same value (`npx wrangler secret put ASSESS_INTERNAL_KEY` and `npx wrangler secret put ASSESS_INTERNAL_KEY --config public/crr-criteria/wrangler.json`) — the internal-only gate on `/api/assess/evaluate` 403s until it is configured (SD-11).
- Flip `ASSESS_PIPELINE_ENABLED` (both workers); **activate extraction prompt v3.0.0** (`POST /api/admin/system-prompt/activate/v3.0.0` via the admin API — never raw SQL; it is stored `is_active=0` from slice 4b); close the public `workers.dev` `/api/triage/assess` and `/api/match-data` routes; delete `EMBEDDED_MATCH_DATA`, prompt assembly, synonym auto-detect, post-processing, `FALLBACK_INSTRUCTION_TEXT`, compare-verdict code from `triage/index.html`; delete `transformToMatchFormat`, match-data seed; retire `criteria:match-data` KV key; archive system prompt v2.3.0 (inactive, kept in D1 history); Admin criteria editing disabled with a notice pointing to the change process (**SD-13**); publish dialog copy corrected (KI-17); `iteratio.nz` page calls no `workers.dev` origin (KI-39).
- Release-log entry; instruction files for ARCH-MIG-01 filed with verification lines.
**Done:** no criteria text reaches a model anywhere in the codebase (grep gate in CI: `EMBEDDED_`, `buildCriteriaBlock`); every production assessment writes an audit record with bundle versions; old routes return 410.

### Slice 11 — Documents · S · Fable/Sonnet · alongside 10
**Status: not started.**
- Architecture Briefing v0.4 §3 replaced by the three architecture views (KI-41); NAIAEAG next-steps annex updated to reference this plan; BRD v3.2 (Phase 3, separate STOP).

## 3. Dependency order

```
0 ─► 1 ─► 2 ─► 3 ─┐
     │    │       ├─► 5 ─► 8
     │    └─► 6   │        
     └─► 4 ───────┘   4 ─► 9
     └─► 7 (W1…W5, continuous)
5 + 6 + 7-W1 + 9 ─► 10 ─► 11
```

## 4. Interims

None (D1). The only bridging behaviour is the Viewer's use of the *current published JSON* for sites without a published bundle (slice 6), which is the live source today, not a frozen copy, and which disappears site by site as waves complete.

## 5. Register entries to raise

| ID | When | Content |
|---|---|---|
| SD-10 | now | Decision to migrate to the rules-bundle architecture (ARCH-MIG-01); TA-SRC-01, CC-DESIGN-01 `logic` key and prompt grounding constraint retired unbuilt; interims none |
| SD-11 | slice 3 | Pipeline hosted in the API worker, exposed same-origin via service binding; public `workers.dev` assessment routes closed at cut-over; supersedes SD-02/SD-05 for the assessment path |
| SD-12 | slice 3 | Assessment audit record: structured, no note text by default; `assessment_notes` separate, off by default, retention default 180 days, purge job |
| SD-13 | slice 10 | Admin Tool criteria editing disabled for the pilot; criteria changes via repo change process with build gates and diff review; future editor with roles/approval and Entra ID noted |
| SR-09 | slice 4 | Extraction drift across model versions — measured per indicator by the benchmark; model change is a benchmark-gated release |
| SR-10 | slice 0 | `cql-execution` under Workers `nodejs_compat` unverified — closed by the slice-0 smoke test or escalated |
| SR-11 | slice 1 | Terminology placeholders in vocabulary/population libraries until NZHTS validation is wired; publish blocked for unvalidated codes once live |
| SR-12 | slice 6 | Viewer shows unbundled sites from published JSON while waves complete — two rendering paths coexist until W4 |
| SR-13 | slice 3 (raised); **closed by design** on `chore/arch-mig-slice3-followups` | National red-flag / ACC layer now registry-published under `national-redflags`; engine fails closed when no published version exists (AD-19 → Accepted). Remote publish + `ASSESS_PIPELINE_ENABLED` flip are slice 10. |

## 6. Risks and how the plan handles them

- **SR-10 (runtime).** If `cql-execution` fails under Workers, the fallback is a small dedicated Node service (Cloudflare Container or an HNZ-hosted Node endpoint) called by the API worker; the bundle format and every test are unchanged. Decided at slice 0, not discovered at slice 3.
- **Clinical review bandwidth.** The wave order and E4 (tabletop on `signed-off`) keep 53 sign-offs off the critical path; W1 is eight sites.
- **Extraction quality.** The benchmark exists before cut-over; if extraction scores are poor for a site, the Advisory still cannot fabricate — it says insufficient — which is the safe failure mode.
- **Bundle size on Workers.** FHIRHelpers ELM is 459 KB, CT CAP 169 KB, population 118 KB; loaded from KV and cached per isolate. Acceptable; measured in slice 3.
- **Cost.** Extraction prompts carry the exam list and Questionnaire(s), not all criteria; expect fewer input tokens per call than today (TA-SRC-01 projected +40 % for the *old* design). Recorded per assessment.
- **Scope creep in the Viewer.** Slice 6 is parity plus compound rendering and overlays; the indicator-grouping option is flagged; nothing else.

## 7. What Claude Code receives, and when

After this plan is approved: `arch-mig-01-brief.md` (already in `instructions/`) plus this plan, with the instruction "work slice 0". One slice per session, Sonnet unless the slice says Opus, branch `feature/arch-mig-<slice>`, PR restating the slice's "done" criteria, then stop. Transcription sessions (slice 7) use a separate short brief per site derived from §2 slice 7's protocol — I'll write that template as the first Phase 4 artefact so it exists before W1 starts.

## 8. Future items (beyond ARCH-MIG-01)

Recorded so they are not re-discovered; none is in this migration's scope.

- **Referral outcome reporting (AD-22).** The slice 3 audit record is the reporting source for per-assessment outcomes (determination, priority, failed defines, missing indicators, redirects) by exam/site, region and bundle version, with no note text. Reporting questions become FHIR `Measure` resources with CQL populations over that record — versioned, governed artefacts like the criteria. The high-value dataset is the join of tool determination to the actual triage decision from RIS/ERMS/BPAC: it (i) becomes the live benchmark replacing hand-labelled cases (slice 9), (ii) feeds criteria performance back to the authors, (iii) enables criterion-level equity and access analysis. Prerequisites, not built: a coded decline-reason list on the RIS side; a referral identifier for linkage (makes the record linkable data → PTA / IPP 3A); ethnicity in the calling-app context (a slice 5 design choice, TA-005). Decider: Gary / programme.
- **CPG standards serialisation and platform adapters (AD-21).** A CPG-conformant IG package serialiser (mapping table recorded), a PlanDefinition/$apply adapter, and a CDS Hooks (`order-sign`) adapter for ERMS / BPAC / SmartForms — the evaluate contract is kept adapter-compatible so each is thin future work, not a re-architecture.

---

## STOP

Phase 3 (BRD v3.2 redline from the approved requirements-impact table) and the first Phase 4 hand-off start on approval of this plan.
