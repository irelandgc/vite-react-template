> **[COMPLETE — 2026-09-06]** Extraction contract v2, national Questionnaire, extraction prompt v3.0.0 with decision record, concept-equivalence list v1, four CT CAP ground-truth cases with a manifest, and seven validation-gate vectors. Slice 4b not started.
> Verification: verified: `npm run build && npm test && npm run check` green from `tooling/criteria-bundle/tooling/` — 26/26 CT CAP scenarios, 47/47 red-flag runs, cross-bundle include, and 4/4 ground-truth cases whose engine Advisory matches both their own expectation and the scenario they derive from (`tooling/criteria-bundle/benchmark/ground-truth-results.md`); `check` additionally resolves all 78 national-Questionnaire items to the vocabulary and confirms all 75 linkIds `CRR_RedFlags.cql` reads are answerable. NOT independently verified: every clinical judgement in the new content — the equivalence list, the ground-truth labels and the exam/site candidates are engineering readings awaiting clinical review, and no model has been run against the prompt (that is slice 9).
> Filed by: Claude Code

# Claude Code Brief: ARCH-MIG-01 slice 4a — Extraction contract, prompt v3.0.0 and the national Questionnaire

**Model:** Claude Opus · **Branch:** `feature/arch-mig-slice4a-extraction` from main · **Scope:** the *content* half of plan slice 4 — the extraction contract generalised to many exam/sites, the national red-flag Questionnaire, the extraction prompt, the concept-equivalence list, and the benchmark ground truth for the CT CAP cases. No service code. The service half (PII gate, `/api/assess/extract` route, provider abstraction, validation gate implementation) is slice 4b on Sonnet, gated on this.

Opus because this is the one place the model's instructions are written, the errors are silent (a wrong equivalence rule looks like a correct extraction), and the evaluation harness measures exactly this artefact.

**Gate to start:** the decisions-filing PR is merged. Slice 2 may run in parallel. The clinical review of the vocabulary need not be complete — grouping changes do not alter the contract's shape — but any linkId the reviewer deprecates before you finish must be reflected (check `indicators.json` status at the end).

## Read first

1. `CLAUDE.md` invariants 1, 2 and 4 — the LLM never decides; every answer carries status and quote; strict by default.
2. `documents/ARCHITECTURE_DECISIONS.md` — AD-03/04 (red flags: precedence, nulls, not exempt from the documentation standard), AD-05 (no unsourced safety content in the prompt either), AD-06 (linkIds), AD-11 (modifiers).
3. `tooling/criteria-bundle/extraction/extraction-contract.md` — the existing contract, written against CT CAP alone. You are generalising it, not replacing it.
4. `instructions/arch-mig-prompt-decomposition.md` — §1 clauses tagged (a) are the rules that survive into the prompt (7, 13, 14, 16, 20, 21, 37); §2 is the prompt skeleton; §3 notes the two doc-mode prompts collapse into one.
5. `instructions/arch-mig-known-issues.md` KI-01, KI-02, KI-04, KI-06, KI-09, KI-10 (each is a constraint on the prompt) and KI-26/KI-28 (prompt audit and health check — service side, for awareness).
6. `instructions/arch-mig-gap-analysis.md` §3 (input paths), §4 (multi-bundle: exam/site selection with quotes), §7 (benchmark design).
7. `instructions/system-prompt-v2.3.0.txt` and `instructions/prompt-v2.3.0-test-results.md` — what is being retired and what it was measured on.
8. `tooling/criteria-bundle/vocabulary/indicators.json`, `cql/CRR_RedFlags.cql` (header only — the precedence contract and the reading rule), `fhir/Questionnaire-CRR-CT-CAP-Adult.json`, `tests/scenarios.mjs` (the four matrix-backed CT CAP scenarios `RM-*`).
9. `documents/CRR_Test_Case_Results_Matrix_v2.xlsx` — the four CT CAP cases (RP-001, RP-007/INT-002, MW-009, and the fourth `RM-*` case) with their notes and evaluator comments.

## Deliverables

### 1. `tooling/criteria-bundle/extraction/extraction-contract.md` v2 (generalised)
Keep rules 1–8 and the output shape. Add, each with an example:
- **Multi-Questionnaire input.** The model receives one or more site Questionnaires plus the national Questionnaire (below) and answers a single QuestionnaireResponse; shared linkIds are answered once. Unanswered items are omitted, never `false`.
- **Exam/site selection** (gap analysis §4, KI-08): output `examSites[]` — the requested id plus any candidate from the supplied published list (ids and titles only, never criteria), each with a quote. `?`-prefixed or "query" wording may support a candidate but never a condition-present indicator (clause 7).
- **Numeric and temporal values are answered as written** (KI-10, clause 16): no correction of apparent typos, no guessed durations; omit when ambiguous. Qualitative lab statements answer the boolean flag as `documented` (KI-06); numeric thresholds need a value (Q7b is pending clinical ruling — encode the literal reading and note it).
- **Red-flag items** (AD-03/04): answered like any other indicator — `documented` with quote, `inferred` when reasoned, omitted when the note does not raise the concept. The model is never told what a red flag *means* for the outcome and never asked whether the patient needs acute assessment.
- **Age and sex** (KI-09, TA-005): only from explicit text when not supplied by the calling application; `patient.age` in years as written, `patient.ageMonths` when the note gives months.
- **What the model never outputs** (clauses 1, 27, 32, 36, 40 retired): verdicts, priorities, missing-criteria lists, suggested wording, corrected notes, free-text notes. Any such field fails the gate.

### 2. `tooling/criteria-bundle/fhir/Questionnaire-CRR-National.json`
The national Questionnaire: every `redflag.*`, `funding.acc*` and `patient.*` item from the vocabulary, with the published text as item text, grouped as in the vocabulary, `url` `http://crr.health.nz/fhir/Questionnaire/CRR-National`. Compound red flags nest their qualifiers under the stem. This is what S1 §7 said was missing. `check` must resolve every linkId in it to the vocabulary; do not add items the vocabulary lacks.

### 3. `tooling/criteria-bundle/extraction/prompt-v3.0.0.md` and `prompt-v3.0.0.json`
The prompt, assembled from the skeleton in decomposition §2, in six parts: role; evidence rules (contract 1–8 plus the additions above); concept-equivalence list (below) by reference to its version; exam/site selection; red-flag items; output-only instruction. Target ≤ 20 % of v2.3.0's length. **No criteria text, no red-flag meanings, no thresholds, no lab lists** — if a sentence describes a criterion, it belongs in a bundle and must come out (decomposition §3, prompt–criteria drift). The JSON form is the machine-readable version the service will load: `{ version, parts[], equivalenceListVersion, questionnaireUrls[] }`.

A `PROMPT_DECISION_RECORD.md` alongside: what each v2.3.0 clause became (cite the decomposition table), what was dropped and why, and the model parameters proposed (temperature, max tokens) — parameters are then owned by the service (slice 4b).

### 4. `tooling/criteria-bundle/extraction/concept-equivalence-v1.md`
The clause 14 rewrite: a short, reviewed list of definitional equivalences that count as `documented` — post-menopausal ⇒ >12 months amenorrhoea; progressive ⇒ increasing; "tired all the time" ⇒ fatigue; "clothes loose" ⇒ weight loss present. Each entry: phrase, linkId, status it earns, and why it is definitional rather than a reasoning step. **Anything requiring clinical reasoning is `inferred` and does not go on this list.** Mark the file NEEDS CLINICAL REVIEW; it is clinically owned and versioned with the prompt.

### 5. `tooling/criteria-bundle/benchmark/ground-truth/` — CT CAP seed
For each of the four CT CAP matrix cases: the redacted note as used in the scenario, and the expected QuestionnaireResponse per gap analysis §7 — every linkId with expected value, status and quote, plus expected `examSites[]`. Run each expected response through the existing engine (`run-tests` machinery) and confirm the Advisory matches the scenario expectation — this proves the ground truth is consistent with the rules before any model is involved. A `manifest.json` listing each case with provenance (matrix id, evaluator, date) — the start of the manifest that replaces the "138" figure (KI-30).

### 6. Gate test vectors — `tooling/criteria-bundle/extraction/gate-vectors/`
Hand-written QuestionnaireResponses that the validation gate must reject: an unquotable value; an unknown linkId; a type mismatch; an answer without the evidence extension; a `retrieved` status from the model path; a verdict-shaped field. And one that must pass. Slice 4b's gate tests consume these.

## Do not
- Do not call any model. This session writes the prompt; the benchmark run is slice 9.
- Do not write service code, the PII gate, the route, or the provider abstraction.
- Do not put criteria content, thresholds, red-flag consequences or exam-specific lab lists in the prompt. If you think the model needs one to extract well, that is a Questionnaire item-text question, not a prompt question — raise it.
- Do not add to the vocabulary. Propose in `vocabulary-additions.json` if the Questionnaire needs an item that does not exist.
- Do not resolve pending clinical rulings (review pack D1–D5, Q7b, Q21); encode the current reading and cite the question.

## Done
Contract v2 and prompt v3.0.0 with decision record; national Questionnaire passing `check`; equivalence list v1 marked for clinical review; four ground-truth cases whose engine result matches their scenario; gate vectors; `npm run build && npm test && npm run check` green.

## Report
The clause-to-disposition table for v3.0.0; the equivalence list; the four ground-truth cases with engine results; any Questionnaire item text you believe is too ambiguous for reliable extraction (with the page reference); proposed vocabulary additions. File this brief per the lifecycle. Stop before slice 4b.
