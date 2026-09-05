# ARCH-MIG-01 Phase 1 — Gap analysis

**Brief:** ARCH-MIG-01 v1.0.0 · **Phase:** 1 · **Date:** 5 September 2026
**Status:** STOP — awaiting Gary's review before the Phase 2 plan
**Author:** Claude Fable 5 (design session; read-only on the repository)
**Companions:** `arch-mig-known-issues.md` (44 issues, dispositioned), `arch-mig-prompt-decomposition.md` (41 clauses), `arch-mig-phase0-findings.md`. Template scenarios from the results matrix added to `tooling/criteria-bundle/tests/scenarios.mjs` (26/26 passing).
**Decisions applied:** D1 tabletop on the pipeline, no date, no interims · D2 sign-off not sent, fold into REVIEW Qn · D3 whole criteria set, sign-off as the sequencing lever · D4 BRD v3.1.1 unavailable, work against v2 · D5 template at `tooling/criteria-bundle/`, page and README at `documents/reference/architecture/` · D6 drop `suggested_wording`, keep advisory "what to add" · D7 stay on Cloudflare · D8 audit record redesign proposed (§6), server-side PII gate is a new requirement.

---

## Summary

The migration is a re-pointing, not a rewrite. The three browser apps, the two Workers, D1, KV and the governance registers all survive; what changes is where criteria logic lives and who decides. Today the criteria are prose in a browser-assembled prompt and the model extracts, judges, prioritises and formats in one call; in the target the criteria are a versioned bundle per exam/site loaded at runtime, the model only fills a Questionnaire with quoted evidence, and a deterministic engine produces one Advisory that both views render. Of 44 recorded issues, 24 cannot occur in the target, 8 are reduced and measurable, 6 remain open with named owners, and 5 carry unchanged. No recorded fix is implemented as written; TA-SRC-01, CC-DESIGN-01's `logic` key and the prompt grounding constraint are retired unbuilt. The long pole is transcribing 53 exam/sites with clinical sign-off, which §5 turns into a publish-state pipeline so the full set can be transcribed without 53 sign-offs gating the start. Two pieces of new design surfaced: multi-bundle evaluation for cross-exam recommendations (§4) and a structured audit record that replaces stored note text (§6).

---

## 1. Component map

| Current component | Location | Target component | Verdict | Reason | Effort |
|---|---|---|---|---|---|
| Main site worker (same-origin admin proxy, asset serving) | `src/worker/index.ts` | Same, plus new same-origin routes for the pipeline (`/api/assess`, `/api/bundle/*`) | **adapt** | Pipeline must be same-origin and server-side; SD-02/SD-05 apply | M |
| API worker — criteria CRUD, versions, publish, rollback, regions, audit | `public/crr-criteria/api/worker.ts` | Publishing service: same routes, publish additionally builds/validates/stores the bundle and writes the audit row (KI-23); rollback per artefact version (KI-24) | **adapt** | The D1 working copy remains the editable source; publish output changes | M |
| API worker — `/api/triage/assess` pass-through | `worker.ts:620–660` | **Extraction service** (server-side prompt assembly from contract; PII gate; validation gate) + **rules-engine route** | **replace** | Nothing to keep: the route forwards a client-built body | L |
| API worker — `/api/match-data`, `transformToMatchFormat`, seed of match-data | `worker.ts:112, ≈690` | — | **retire** | Blob ceases to exist (KI-15/16/18) | S |
| API worker — system prompt versions/activate/rollback/audit | `worker.ts:728–866` | Same, for the extraction prompt; `performed_by` via `actorFrom(c)` (KI-26) | **keep** (small fix) | TA-009 survives | S |
| API worker — usage log, QA reviews, viewer events, releases | `worker.ts:450–620, 941–1220` | Usage log replaced by assessment audit record (§6); QA/releases unchanged | **adapt / keep** | | S–M |
| Criteria Viewer | `viewer/index.html` | Reads PlanDefinition + Questionnaire by bundle version; renders groups/badges/page refs/regional overlay from them; ticks produce a QuestionnaireResponse; optional "check" against the engine; embedded fallback removed | **adapt** | Visual design unchanged; data source and compound rendering (CV-014) change | M–L |
| Triage Advisor page | `triage/index.html` | Thin client: note + context in, Advisory out; client PII pipeline kept as courtesy; compare mode becomes "compare extraction" (§7); embedded criteria, prompt assembly, post-processing validation, synonym auto-detect removed | **replace** (page survives, ≈70 % of its JS retired) | Everything that decided what the model saw moves server-side | L |
| Client post-processing validation | `triage/index.html` (per `claude-code-brief-post-processing-validation.md`) | — | **retire** | Existed to repair model verdict inconsistencies; engine is consistent by construction | S |
| Rule-based exam/site auto-detection (synonyms) | `triage/index.html:≈993` | Exam/site selection in extraction (contract §2.4) | **replace** | Published data has no synonyms (KI-18) | M |
| Admin Tool | `admin/index.html` | Same editor for the D1 working copy; publish dialog copy corrected; bundle state shown per exam/site (§5); developer-mediated change path recorded (KI-43) | **adapt** | AD-002/003 reworded | S–M |
| Regions (KV overrides, admin tab) | KV `criteria:regions`; `admin/index.html:562–590` | `regions.json` + regional overlay PlanDefinitions in the registry; admin edits overlays through the same path; build-checked | **adapt** | Versioned and logic-free by construction | M |
| Releases, release bell, HL/demo harnesses | `releases/`, `shared/`, `hl/`, `crr-demo.html` | Unchanged; harness posts note via sessionStorage (SD-09) still valid | **keep** | | — |
| `feature/role-aware-view` branch | git | Rebased onto the Advisory object (two renderings of one output) | **adapt** | SD-01 intent preserved | S–M |
| Regression runners | `scripts/*.mjs`, `instructions/Prompt-Dev-Done/` | Benchmark harness (§7); existing cases become the seed | **replace** | Verdict-level runners cannot score extraction | M |
| Criteria bundle tooling (new) | `tooling/criteria-bundle/` | translate · test · check · publish; CT CAP + population library + overlays | **new** (exists as template) | | S to integrate |
| Bundle registry (new) | KV `bundle:<examSite>:<version>` (+ D1 `bundles` publish record) | Immutable; `GET /api/bundle/:examSite/:version` and `/latest` | **new** | | S |
| Rules-engine route (new) | main worker or API worker | `cql-execution` loads ELM by version; evaluates QuestionnaireResponse(s); returns Advisory; stamps versions | **new** | Verified in Node; Workers run needs a test (`nodejs_compat` flag present in `wrangler.json`) | M |
| National red-flag library (new) | `tooling/criteria-bundle/cql/CRR_RedFlags.cql` | Emergency/ACC indicators and precedence (prompt clauses 2–5) | **new** | Content from the "Refer for acute assessment" rows | S–M |
| Population library / merge (dormant) | template | Behind feature flag, default off | **new** (exists) | Invariant 7 | S |
| Terminology validation (new) | build step | NZHTS `$validate-code`; fails build on unresolved codes once wired | **new** | Needs network path/credentials to NZHTS from the build | M (blocked on access) |

## 2. Criteria content migration — field mapping

| Current (D1 `criteria.data`, per exam/site) | Target artefact | Notes |
|---|---|---|
| `id`, `title`, `modality`, `type`, `population` | PlanDefinition `id`/`title`/`useContext`; bundle key `<examSite>` | Paediatric `_p` suffix convention (AD-012) becomes a separate bundle per population |
| `groups[]` (indication groups with priority) | PlanDefinition top-level `action[]` with `priority` and priority-code `code` | One action per timeframe row as published |
| `groups[].items[]` (`id`, `label`, `shortLabel`, `type`, `mandatory`) | PlanDefinition nested `action` (title = published label verbatim) **and** one or more Questionnaire items (indicators) **and** a CQL define | The 1:1 item→checkbox model becomes 1:N item→indicators; the census sizes the N. `shortLabel` becomes the Criteria Viewer output text (CV-017) and stays on the action as `description` |
| `mandatory` | `selectionBehavior: all` on the group + MANDATORY badge code | Only 1 of 336 items carries it today (TA-SRC-01 §3); most "mandatory" semantics are implicit in wording — transcription makes them explicit |
| badges: gateway, lab value | `criteria-badge` codes on actions | Derived from indicator types where possible (a gateway indicator ⇒ GATEWAY badge) |
| `guidance`, `guidanceNarrative` | Guidance action `description`; `inlineGuidance || exam.guidance` per TA-SRC-01 decision 2 | |
| `outOfCriteriaNote`, `alternativeManagement` | Alternative-management action(s), each a redirect indicator + define | Redirects become evaluable, not just text |
| `notFundedDetail` | Not-funded action + `funding.*` indicator | Never tickable (GEN-005) — the Questionnaire item is not rendered as a checkbox in the Viewer |
| `footnotes` | `documentation` on the relevant action | |
| HealthPathways links / region overrides | `regions.json` + overlay PlanDefinitions; page ID on the national artefact | CV-012 |
| (absent) page numbers | `source-page` extension on every logic action | KI-20 |
| (absent) logic | CQL defines with verbatim `SOURCE:` provenance; REVIEW Qn list per site | |
| (absent) tests | `tests/scenarios.mjs` per bundle; results-matrix cases first | |

**Gap 1 — indicator naming.** Items are labels; indicators need stable `linkId`s. Convention from the template: `<group>.<concept>` (`workup.cxr`, `lab.hb.low`, `excl.recentCTCAP12m`). Shared concepts across sites (weight loss, age/sex, common labs) should be a **national indicator vocabulary** so the extraction contract and terminology bindings are written once. Recommend a `tooling/criteria-bundle/vocabulary/` file listing shared indicators with text, type and (later) codes; per-site Questionnaires reference it.

**Gap 2 — the working-copy editor.** The Admin Tool edits `criteria.data` JSON; it cannot edit CQL. For the pilot the D1 working copy remains the editable *text* source (wording, guidance, badges, page refs), and the CQL/Questionnaire are maintained by the developer-mediated path with diff review. The publish step composes both into the bundle. A structured editor is deferred (KI-43).

## 3. Input paths → one QuestionnaireResponse

| Path | Producer | Evidence status | Present today? |
|---|---|---|---|
| Free-text note | Extraction service (server-side) | `documented` / `inferred` + quote | Replaces the current single call |
| Calling-application context (age, sex, labs — TA-005) | Main worker maps URL/postMessage fields → linkIds | `documented` (no extension) | Partially (age/sex); labs mapping new |
| Criteria Viewer ticks | Viewer builds QuestionnaireResponse | `documented` | New (ticks currently produce text only) |
| Coded record data (dormant) | Population library + merge | `retrieved` + source | Template only; flag off |

The merge stage (template `populate.mjs`) is the only place these meet; the engine has one input.

## 4. New design: multi-bundle evaluation (cross-exam recommendations)

The matrix shows cross-exam behaviour is real and valued: MW-009 (CT CAP declined, US Abdomen acute recommended), INT-001 (CT KUB vs Renal US), RP-007 (CT CAP vs CT Other), MW-008 (paediatric vs adult). Today it is a model judgement (TA-006). In the target:

1. Extraction returns **candidate exam/sites** — the requested one plus any the note plausibly indicates, each with a quote — chosen from the published exam/site list supplied in the prompt (titles only, no criteria).
2. The engine evaluates the requested bundle **and** each candidate bundle against the same QuestionnaireResponse (indicators are shared where the vocabulary is shared; unanswered ones are null).
3. The Advisory carries `requestedExam` result plus `alternatives[]`: any candidate whose determination is `P*` or `ACUTE` while the requested one is not becomes a cross-exam recommendation, rendered with the published wording ("Consider US Abdomen — acute 48 hr — <criterion met>").
4. Red flags and ACC are evaluated once, nationally, before any bundle.

This replaces prompt clauses 6, 8, 22–26 and answers KI-08. It also bounds cost: the extraction prompt carries the exam list (short) rather than all criteria (long). Scenario to write: MW-009 across CT CAP + US Abdomen once US Abdomen is transcribed.

## 5. New design: bundle publish states (D3)

Transcribing all 53 sites is right; gating the tabletop on 53 sign-offs is not. Each exam/site bundle has a state, stored in the D1 publish record and visible in the Admin Tool:

| State | Meaning | Engine | Viewer |
|---|---|---|---|
| `transcribed` | CQL/Questionnaire/PlanDefinition written with provenance; scenarios pass; consistency OK | Not evaluated | Shows current published JSON (unchanged) |
| `signed-off` | Clinician has confirmed each `SOURCE:` define against the PDF and answered the site's REVIEW Qn | Evaluated **only** in tabletop/benchmark mode (flag) | As above |
| `published` | Signed-off bundle published as an immutable version | Evaluated in production | Rendered from PlanDefinition + Questionnaire |

Tabletop cases decide sign-off order. A note for an exam/site whose bundle is not published gets a visible "criteria for this exam are not yet available in the advisor" state — never a prose-in-prompt fallback (brief §"not").

## 6. New design: assessment audit record (D8)

Replace `triage_usage_log.presentation_text` / `ai_response_summary` / `ai_response_json` with:

| Field | Content | PII exposure |
|---|---|---|
| `bundle_versions` | exam/site → version evaluated (incl. red-flag library) | none |
| `engine_version`, `prompt_version`, `model_id`, `documentation_standard` | as stamped | none |
| `questionnaire_response` | the merged QuestionnaireResponse: every value with status and **quote** | quotes are short spans of the *redacted* note — bounded, inspectable |
| `advisory` | determination, priority, redirects, missing, trace | none |
| `discrepancies`, `validation_failures` | from merge/gate | none |
| `note_redacted` | optional, separate table, retention class with purge job; only if review needs the prose | residual (unverified redaction) — policy decision |

This is a better review record than prose: a reviewer sees exactly what was extracted, with its evidence, and why the verdict followed. Retention/purge becomes a job on one table rather than a policy on three. Requires an SD entry and privacy-office confirmation (KI-34).

## 7. Benchmark and evaluation harness

- **Ground truth per indicator**: for each case, expected `linkId → (value, status, quote)` set by a clinician; expected Advisory follows by running the ground-truth response through the engine (so rule correctness is checked without a model).
- **Extraction score**: precision/recall per indicator and per status; quote validity rate; exam/site selection accuracy.
- **Model comparison** (TA-022–024 reworked): same contract, different models; compare extraction scores, not verdicts. Cost and latency recorded.
- **Seed**: the 37 matrix cases (four already encoded for CT CAP), the REG02 30-case set, and D1 rows by consent. The "138" figure is replaced by a manifest that lists every case with provenance (KI-30).
- **Runs go through the Worker** (CLAUDE.md rule) with `regression_run_id`; no direct model calls.

## 8. Requirements impact (BRD v2 — v3.1.1 unavailable, D4)

Legend: U unchanged · R reworded · X replaced · – retired · N new.

| Req | Impact | Proposed wording / note |
|---|---|---|
| GEN-001 | R | PDF remains the source of truth; add: "published as a versioned rules bundle per exam/site with verbatim provenance to the PDF" |
| GEN-002 | R | "No patient data at rest" restated with §6: structured, quoted audit record; redacted note only under a retention class |
| GEN-003 | X | Server-side PII redaction with automated tests is **Must have**; client-side pipeline is a courtesy (KI-32) |
| GEN-004, 005, 006, 007, 010 | U | GEN-007 gains overlays as the mechanism |
| GEN-008 | R | "A single publish action updates all consumer tools" becomes true; add bundle states (§5) |
| GEN-009 | R | Bundle version (per exam/site), engine version, prompt version and model id displayed and stamped |
| CV-001–013, 015–025 | U | CV-012 references `regions.json`; CV-017 output text from action `description` |
| CV-014 | R | Compound logic rendered from PlanDefinition `selectionBehavior` nesting |
| CV-015/016 | R | Ticks produce a QuestionnaireResponse; optional "check against criteria" via the engine |
| TA-001, 003, 004, 005 | U/R | TA-005 gains lab-value → linkId mapping |
| TA-002 | R | Exam/site selection is an extraction output over the published list (with correction) |
| TA-006 | X | "The **engine** evaluates every candidate exam/site the extraction proposes; cross-exam recommendations are engine outputs" |
| TA-007 | X | Structured output = Advisory: determination (P-code / acute / not met / insufficient / redirect / not funded / paediatric), met and missing indicators with page refs, inferred and retrieved indicators, rule trace |
| TA-008 | R | "The LLM performs extraction only: it fills the published Questionnaire with evidence-labelled, quoted answers. It does not assess, prioritise or advise." |
| TA-009 | R | Prompt = extraction prompt; versioning unchanged; verified attribution |
| TA-010 | R | Documentation standard is an engine parameter over evidence status; the model always labels |
| TA-011, 012, 013 | R | Red-flag/ACC indicators + national precedence library, evaluated before criteria |
| TA-014 | R | Ambiguous timing → value omitted → engine reports insufficient and names the indicator |
| TA-015 | R | Modifiers are not encoded as conditions (transcription rule) |
| TA-016, 017 | R | Lab and gateway indicators per site; missing ones named by linkId |
| TA-018, 019, 021 | U | |
| TA-020 | R | Cost/tokens for the extraction call only |
| TA-022, 023, 024 | X | Compare **extraction** across models; verdicts are identical by construction |
| TA-025 | U | QA reviews now reference the audit record id |
| TA-026 | X | Assessment audit record per §6 (no note text by default) |
| TA-027 | U | |
| AD-001 | U | |
| AD-002 | X | Editing of published wording, guidance, badges, page references via the Admin Tool; criteria logic (CQL, Questionnaire) via a developer-mediated change path with diff review; a structured logic editor is a future phase |
| AD-003 | R | Second-person review = clinical sign-off state on the bundle (§5); publish requires `signed-off` |
| AD-004, 005 | R | Versions are per exam/site bundle; history and compare per bundle |
| AD-006 | R | Publish builds, validates (tests, consistency, terminology) and stores the bundle; the toast is true |
| AD-007 | R | Rollback per artefact version incl. overlays (KI-24) |
| AD-008 | R | Publish writes the audit row itself (KI-23) |
| AD-009 | U | |
| AD-010, 011, 012, 013 | R | Bulk load stays for the text working copy; the JSON extract is a cross-check for transcription; regionalisation = overlays |
| NFR-001 | U | Bundles are KV-served |
| NFR-002 | R | Extraction call + engine; expect faster (no criteria block) |
| NFR-003 | X | Audit record storage with retention class and purge job |
| NFR-004, 005, 006 | U | NFR-006 strengthened: the browser cannot compose a model request |
| NFR-007 | R | Per §6 |
| NFR-008 | R | Server-side, tested |
| NFR-009 | U | Provider switch is a config + benchmark run |
| NFR-010, 011 | U | |
| NFR-012 | R | Criteria changes = bundle versions; no code change |
| NFR-013 | X | "The criteria are published as FHIR PlanDefinition, Questionnaire and CQL Library" — delivered, not a path |
| **New** | N | BND-001 bundle contents and versioning; BND-002 bundle states and sign-off; BND-003 build gates (tests, consistency, terminology); BND-004 registry immutability and runtime loading with visible failure; BND-005 regional overlays carry no logic; EXT-001 extraction contract (status + quote); EXT-002 validation gate (whole-response rejection); EXT-003 server-side prompt assembly; ENG-001 deterministic evaluation, three-valued logic; ENG-002 multi-bundle evaluation and cross-exam recommendation; ENG-003 precedence order; POP-001 population stage behind a flag, governance gate to enable; AUD-001 audit record; EVAL-001 indicator-level benchmark and model comparison |

## 9. Governance mapping (NAIAEAG summary)

| Point raised | Target component | How it becomes demonstrable |
|---|---|---|
| Fabrication / grounding | Extraction contract + validation gate + engine | `RM-RP-007-INT-002-ctcap` scenario; gate test with an unquotable value |
| Criteria staleness (build-time copy) | Runtime bundle loading, version stamping, no fallback | Deploy check: no embedded constants; every audit record carries bundle versions |
| CK Jin's "extraction + rule engine" understanding | The architecture itself | Architecture page; this migration |
| Benchmark dataset (Q4) | §7 harness; indicator-level labels | Manifest with provenance; extraction scores per model |
| Residency / endpoint control (Q3) | Provider-agnostic extraction service; Azure under HNZ tenancy | Benchmark run on both providers before switch |
| Model change control | Model id stamped; model change = benchmark-gated release | SD entry per change |
| "Light on next steps" (Q7) | This migration plan (Phase 2) | Slice list with "done" criteria |
| Working-group conditions | §5 sign-off states (clinical ownership); §6 audit (monitoring); cost of extraction-only calls | Admin bundle-state view; cost per assessment in audit record |

## 10. Open decisions for Phase 2

| # | Decision | Default if no answer |
|---|---|---|
| E1 | Where the engine and extraction routes live: main worker (`src/worker/`) or API worker | Main worker (same-origin, SD-02 intent), API worker keeps admin/publishing |
| E2 | Audit record design §6 — accept, and whether `note_redacted` is kept at all | Accept; keep `note_redacted` off until privacy office confirms |
| E3 | National indicator vocabulary (§2 gap 1) — adopt now or per-site ad hoc | Adopt now; retrofit CT CAP |
| E4 | Tabletop/benchmark mode may evaluate `signed-off` (not yet `published`) bundles | Yes, behind the same flag as population |
| E5 | Clinical sign-off recording: a per-bundle file in the repo (`signoff.md` with reviewer, date, Qn answers) vs Admin Tool state only | Both: file is the record, Admin shows state |
| E6 | Terminology validation access — who provides NZHTS credentials/network for the build | Build passes with placeholders flagged until access exists; publish blocked for bundles with unvalidated codes once wired |

---

## STOP

Phase 2 (sequenced migration plan with slices, dependencies, "done" criteria, SD/SR entries) starts on review of this document and the two companions, and on answers or defaults for E1–E6.
