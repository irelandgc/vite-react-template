# CRR Tool Suite — Change log

**What changed, for whom.** One row per behaviour or requirement change, in plain
language, tagged with the documents that must reflect it. Companion to
`ARCHITECTURE_DECISIONS.md` (why), `SECURITY_DECISIONS.md` (security), and
`CRR_Release_Log.md` (when it reached users). Governed by `DOCUMENTATION-PLAN.md`.

**How to use this file:**
- Append-only. Add rows; don't rewrite them.
- One row per change a **user, operator, or requirement** can see. A code change
  that changes nothing visible does not get a row.
- Every slice that changes behaviour adds its rows **before filing its brief**
  (`CLAUDE.md`). The `ARCHITECTURE_DECISIONS.md` entry behind a change names its
  `CL-nn` rows.
- **Status:** `built` (the change is in the code and the registers) →
  `documented` (every artefact the row names has been updated) → `released` (a
  `CRR_Release_Log.md` entry exists). The slice 11 documentation brief is "every
  row not yet `documented`".
- **Documents** tokens: `BRD:<req id | NEW | §n>` · `SDD` · `OPS` ·
  `USER:<referrer|triager|admin>` · `CLIN` (clinical governance pack) · `INTEG`
  (integration guide) — or `none`.
- **For whom:** Referrer · Triager · Admin · Operator · Programme · Clinical
  governance.

---

## Backfill — ARCH-MIG-01 slices 1–5

Reconstructed 2026-09-07 from `ARCHITECTURE_DECISIONS.md`, `instructions/arch-mig-plan.md`
slice-status lines, the merged PR descriptions (#2–#15) and the AD entries. All
rows are `built` (merged to `main`); **no user-facing behaviour has changed yet**
— the assessment pipeline is gated behind `ASSESS_PIPELINE_ENABLED`, off in
production until the slice 10 cut-over. `documented` / `released` follow at
slices 11 and 10 respectively.

| CL | Date · slice · PR | Change | For whom | Documents | Decision | Status |
|----|-------------------|--------|----------|-----------|----------|--------|
| **CL-01** | 2026-09-06 · slice 3 · PR #9, #10 | Referral assessment runs compiled criteria logic (CQL/ELM) from the published bundle against a QuestionnaireResponse. The model's only job is to turn the note into that structured response — it no longer produces a verdict, priority or advice. | Referrer · Triager · Programme · Clinical governance | BRD:GEN-001, BRD:TA-006, BRD:TA-008, SDD, USER:referrer, USER:triager, CLIN, INTEG | AD-15, AD-19, AD-20, AD-21 | built |
| **CL-02** | 2026-09-06 · slice 4a/4b · PR #7, #12, #13 | Every answer the model returns carries an evidence status (`documented` / `inferred`) and a verbatim span from the redacted note. The validation gate rejects the whole response on any unquotable value, unknown linkId or type mismatch — the assessment fails visibly rather than proceeding on a fabricated value. | Triager · Programme · Clinical governance | BRD:TA-008, BRD:TA-028, BRD:TA-029, SDD, CLIN | AD-16, KI-01, KI-04 | built |
| **CL-03** | 2026-09-06 · slice 5 · PR #15 | The Advisory no longer contains model-authored "suggested wording" or free-text advice. "What to add" is the published Questionnaire item text for each missing indicator, nothing more. | Referrer · Triager | BRD:TA-007, USER:referrer, USER:triager | AD-21 | built |
| **CL-04** | 2026-09-06 · slice 5 · PR #15 | When an assessment is "insufficient information", the indicators it needs are listed in the exact words of the published Questionnaire — the referrer sees the wording the triager applies. | Referrer · Triager | BRD:TA-014, USER:referrer | AD-15 | built |
| **CL-05** | 2026-09-06 · slice 1 + 3 · PR #2, #9, #10 | Every assessment evaluates the national red-flag / ACC-redirect library first. A fired red flag stops the pipeline — no exam is evaluated, no priority produced. If the national library has no published bundle the assessment refuses with a visible error rather than skipping the safety layer. | Referrer · Triager · Operator · Clinical governance | BRD:TA-011, BRD:TA-013, SDD, OPS, CLIN | AD-03, AD-14, AD-19 | built |
| **CL-06** | 2026-09-06 · slice 1 + 2 · PR #2, #5 | The 53 published exam/site IDs resolve, through a registry table, onto 38 bundles (the source document's sections); limb X-ray IDs with identical criteria share one bundle. The published ID stays what the Viewer, the API and the audit record use. | Programme · Operator · Clinical governance | BRD:GEN-008, BRD:CV-003, SDD, OPS, CLIN | AD-01 | built |
| **CL-07** | 2026-09-06 · slice 1 + 2 · PR #3, #5 | Each bundle moves through `transcribed` → `signed-off` → `published`, tracked in D1, not baked into the frozen bundle. Bundle versions are semantic and tied to logic: the major segment changes if and only if the compiled logic (ELM hash) changed, and `publish` refuses a mismatched bump. A published version is immutable. | Operator · Programme · Clinical governance | BRD:GEN-008, BRD:GEN-009, SDD, OPS | AD-02, AD-12 | built |
| **CL-08** | 2026-09-06 · slice 2 · PR #5 | The Admin Tool gains a read-only Bundles tab: states, versions, logic hashes and the exam/site → bundle mapping. Criteria are not editable in the Admin Tool — all changes go through the governed repo change process. | Admin | BRD:AD-004, USER:admin | AD-12, AD-18 | built |
| **CL-09** | 2026-09-06 · slice 3 + 5 · PR #9, #15 | Every assessment writes one structured audit row (determinations, indicators, versions, discrepancies, validation failures) with no referral text. A redacted-note store is available but off by default, in a separate table, with configurable retention (default 6 months) and a scheduled purge job. | Operator · Programme · Clinical governance | BRD:TA-026, BRD:NFR-003, SDD, OPS, CLIN | SD-12 | built |
| **CL-10** | 2026-09-06 · slice 3 · PR #9, #11 | The assessment endpoints are not reachable from the public `workers.dev` origin. The main worker forwards them same-origin over a service binding and sets a shared internal key; a browser-supplied key is stripped. This closes the public ingress to the model-calling route. | Operator · Programme | BRD:NFR-006, SDD, OPS | SD-11 | built |
| **CL-11** | 2026-09-06 · slice 4b · PR #12 | The worker redacts patient-identifiable information (NHI mod-11/23/legacy, names, DOB, address, phone, email, referrer patterns) before the note reaches any model. If an NHI-shaped value survives redaction the request is refused with a visible reason. The client-side pipeline is retained as a courtesy layer. | Referrer · Operator · Programme · Clinical governance | BRD:GEN-003, BRD:NFR-007, BRD:NFR-008, SDD, OPS, CLIN | SD-11 | built |
| **CL-12** | 2026-09-06 · slice 4a/4b · PR #7, #12, #13, #14 | The extraction prompt contains no thresholds, priority codes, analyte names or redirect destinations — `check` fails the build if any appear. The closed list of phrase equivalences that earn `documented` is a versioned file, stamped on every assessment, and is NEEDS CLINICAL REVIEW. | Programme · Clinical governance | BRD:TA-009, SDD, CLIN | AD-16 | built |
| **CL-13** | 2026-09-07 · slice 4b + 5 · PR #12, #15 | Indicators that rest on the referrer's judgement (strong suspicion of malignancy, urgent admission required, …) are a declared category the extraction model may never answer. The Triage page asks each as an explicit yes / no / not-assessed question recorded against the named user, and each carries two wordings — one for the referrer attesting, one for the triager reading the letter. Consequence: CT CAP's main adult pathway cannot reach "met" from a note alone. | Referrer · Triager · Clinical governance | BRD:NEW, SDD, USER:referrer, USER:triager, CLIN | AD-17, AD-23 | built |
| **CL-14** | 2026-09-06 · slice 3 + 5 · PR #9, #15 | When the requested exam does not reach a priority but a candidate exam the note points at does, the Advisory surfaces it as a cross-exam recommendation, in that exam's published row wording. | Referrer · Triager | BRD:TA-006, USER:referrer, USER:triager | AD-20 | built |
| **CL-15** | 2026-09-07 · slice 5 · PR #15 | Model-comparison mode now compares two providers/models on the same extraction contract — per-indicator value/status/quote differences and the engine determination for each — instead of comparing two free-text verdicts. The Azure provider is a visible "not configured" stub. | Programme | BRD:TA-022, BRD:TA-023, BRD:TA-024, BRD:NFR-009, SDD | KI-35 | built |
| **CL-16** | 2026-09-06 · slice 3 + 5 · PR #9, #15 | Every assessment records the bundle versions (including the national library), engine version, prompt version, equivalence-list version, model id and provider; the provenance view shows them. | Triager · Operator · Programme · Clinical governance | BRD:GEN-009, SDD, OPS, CLIN | AD-19, AD-20 | built |
| **CL-17** | 2026-09-06 · slice 3 · PR #9 | For identical input the assessment response is byte-identical apart from the assessment id — the engine does not vary run to run. Extraction, being a model call, still varies; that variance is measured, not hidden. | Programme · Clinical governance | BRD:NFR-014, SDD, CLIN | AD-20 | built |
| **CL-18** | 2026-09-06 · slice 4a/4b · PR #8, #14 | Extraction quality is measured against per-indicator ground truth — expected value, status, verbatim quote, and the indicators a correct extraction must NOT answer — with the engine result checked separately. Every run and every finding is logged (`benchmark/FINDINGS.md`, `results/`). | Programme · Clinical governance | BRD:TA-032, CLIN | KI-30, SR-09 | built |
| **CL-19** | 2026-09-05 · slice 1 · PR #3 | The bundle build runs a terminology-validation step against NZHTS when credentials are configured; until then every code is marked `PLACEHOLDER` and listed. Publishing a bundle with unvalidated codes is blocked once the step is live. | Operator · Programme · Clinical governance | BRD:BND-002, SDD, OPS, CLIN | AD-06, SR-11 | built |
| **CL-20** | 2026-09-06 · slice 1 · PR #4 | The programme will not build a visual criteria / CQL editor. The clinician-facing task is verifying a transcription and ruling on ambiguities against source quotes — a review process, not an authoring tool. | Admin · Programme · Clinical governance | BRD:AD-002, SDD, CLIN | AD-18 | built |
| **CL-21** | 2026-09-06 · slice 3 · PR #10 | The bundle and the evaluate contract are kept shape-compatible with the FHIR Clinical Practice Guidelines methodology and PlanDefinition/`$apply`; CDS Hooks (`order-sign` on a radiology referral) is the recorded future pattern for referral-platform integration. Nothing is built now — a serialiser and adapters stay thin future work. | Programme | BRD:NFR-013, SDD, INTEG | AD-21 | built |
| **CL-22** | 2026-09-06 · slice 3 · PR #10 | The audit record is the reporting source for per-assessment outcomes by exam, region and bundle version. Reporting questions will be FHIR `Measure` resources over that record; the high-value dataset is the join to the actual RIS / referral-platform triage decision. Prerequisites (coded decline reasons, a linkage id → PTA / IPP 3A, ethnicity capture) are recorded, not built. | Programme | BRD:§10, SDD, CLIN | AD-22 | built |
| **CL-23** | 2026-09-05 · slice 1 · recorded | The Criteria Viewer's hard-coded, unsourced, negation-blind safety-alert substring check must not be carried forward as-is. Before the Viewer moves to bundles (slice 6) it is either replaced with a governed national safety define — with provenance and sign-off — or dropped, per review-pack decision D1. | Referrer · Clinical governance | CLIN | KI-51, AD-05 | built |
