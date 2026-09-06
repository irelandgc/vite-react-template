# Claude Code Brief (template): Transcribe one exam/site into a criteria bundle

**Brief ID:** ARCH-MIG-TX-`<examSite>` · **Parent:** ARCH-MIG-01 slice 7 · **Model:** Claude Opus (transcription fidelity matters and the errors are silent) · **Session scope:** exactly one exam/site · **Branch:** `feature/arch-mig-tx-<examSite>`
**Fill in before starting:** `<examSite>` (e.g. `ct-abdomen-pelvis-adult`), `<title>` as published, `<population>` adult | paediatric, `<source>` (PDF pages, or approved-draft document and date), `<wave>`, `<census entries>` from `instructions/archive/compound-criteria-phase0-findings.md` Appendix A, `<matrix cases>` for this site from `documents/CRR_Test_Case_Results_Matrix_v2.xlsx`.

Read first, once: `CLAUDE.md` (target-architecture section), `tooling/criteria-bundle/README.md`, `tooling/criteria-bundle/extraction/extraction-contract.md`, the CT CAP bundle as the worked example (`cql/CRR_CTChestAbdomenPelvis_Adult.cql`, `fhir/*`, `tests/scenarios.mjs`), and `tooling/criteria-bundle/vocabulary/indicators.json`.

---

## Objective

Produce the bundle artefacts for `<examSite>` such that a clinician can verify every rule against the published wording side by side, every scenario the tool has been measured on passes, and the build gates are green. The output is a **transcription**, not an interpretation: where the wording is ambiguous you encode one reading, mark it `REVIEW Qn`, and let the clinician decide.

## What this is NOT

- Not a place to improve the criteria. If the wording is wrong, contradictory or unclear, encode it as printed, raise a REVIEW question, and move on.
- Not a place to invent terminology codes. Leave codes off or use placeholders marked `PLACEHOLDER`.
- Not a place to touch any other site's bundle, the vocabulary's existing entries, the engine, or the extraction prompt. Vocabulary *additions* are proposed in a separate file (see outputs) and merged by the vocabulary owner.

## Inputs

1. The source: `<source>` — read the actual pages/document, not the JSON extract.
2. Cross-checks only: the site's entry in `documents/reference/pdf-criteria-all.json` and the current published JSON (`GET /api/criteria/<id>`). Differences between these and the source are reported, never resolved by choosing the JSON.
3. `<census entries>` — which items were identified as compound and their shape.
4. `<matrix cases>` — every evaluated case for this site, with the evaluator's expectation and comment.
5. The vocabulary — reuse a shared indicator whenever the concept is the same; never create a near-duplicate.

## Outputs (all under `tooling/criteria-bundle/sites/<examSite>/`)

| File | Content |
|---|---|
| `<Library>.cql` | One clinical `define` per criterion, sub-criterion, redirect and not-funded item; each with a `SOURCE:` comment quoting the wording verbatim with page/section (or draft reference); plumbing copied from the CT CAP library unchanged; `Determination`, `Missing Information`, `Rule Trace`, `Advisory` following the CT CAP shape; `REVIEW Qn` comments at every ambiguity with the reading chosen |
| `Questionnaire-<examSite>.json` | Indicators for the site: vocabulary linkIds where shared; site-specific linkIds as `<group>.<concept>`; published text on each item; `initialExpression` on items the population library can fill |
| `PlanDefinition-<examSite>.json` | Published structure verbatim: timeframe rows as actions with priority codes, nested `selectionBehavior` for compound items, badges, `documentation` with `source-page` (or draft reference), guidance, sources, HealthPathways page-ID placeholder |
| `population.cql` (if any lab/imaging-history indicators) | Following `CRR_CTCAP_Population.cql`; placeholder codes marked |
| `scenarios.mjs` | See §Protocol step 4 |
| `signoff.md` | From the template at the end of this brief, with the REVIEW Qn list filled in and answers blank |
| `vocabulary-additions.json` | Proposed new shared indicators (only if a concept is plausibly reused by other sites) |
| `transcription-notes.md` | Differences between source and JSON/published; anything you could not encode; the modifiers you deliberately did not encode as conditions |

## Protocol

1. **Read the source and list the atoms.** Before writing CQL, produce in `transcription-notes.md` a table of every clinical fact the criteria mention (symptom, finding, investigation, threshold, duration, age/sex band, gateway, exclusion) → the indicator that will represent it (existing vocabulary linkId or new), and whether that indicator is an **attestation / clinical-judgement indicator** (AD-17 — see step 3). This table is what the reviewer checks first.
2. **Encode structure before logic.** Write the PlanDefinition actions in the order printed; get the nesting (all / one-or-more / any) right from the printed bullets and connectives; mark every place the connective is ambiguous as a REVIEW question rather than guessing silently (CT CAP Q1 is the model).
3. **Write the CQL define by define, source quote first.** Rules that bite:
   - Numeric wording is literal: "more than 5 %" is `> 5.0`; "over 50" is `> 50`; "3–6 months" is `in Interval[3.0, 6.0]`. Every boundary is a REVIEW question (CT CAP Q4, Q7).
   - "Especially", "typically", "particularly", "more commonly" mark **modifiers**, not conditions. They are not encoded; they are listed in `transcription-notes.md`.
   - Three-valued logic is the point: unanswered indicators are `null`; never coalesce a clinical indicator to `false` except for exclusions (which use `Coalesce(x, false)` and are surfaced as "unconfirmed").
   - One concept, one indicator, even when it appears as both a positive condition and an exclusion (CT CAP `workup.localisingFeatures`).
   - **Attestation / clinical-judgement indicators (AD-17).** An indicator that rests on the referrer's attestation or clinical judgement rather than on a fact stated in the note — "strong suspicion of malignancy" (`workup.strongSuspicionMalignancy`), "urgent admission required" (`excl.urgentAdmissionRequired`), a clinician's overall impression — is flagged as the **attestation category**: on the existing vocabulary entry via `transcription-notes.md`, or on a proposed new one in `vocabulary-additions.json`. The extraction model may never answer these; the Triage Advisor asks the referrer directly (AD-17). Identify them while building the atoms table (step 1), not after the CQL is written.
   - Gateways (specialist advice, decision-support tool completed) live inside the pathway they gate.
   - Cross-site references ("patients who meet the criteria for X") are `include`d from that site's library, never re-transcribed.
   - CQL traps that compiled cleanly and were wrong in CT CAP: a query returns **distinct** elements by default (`return all` when counting); `Count` ignores nulls (`Length` for tri-state lists); `First(...)` on a function-result query needs parentheses.
4. **Scenarios before you trust anything.** In this order: (a) every matrix case for the site, with the evaluator's expectation as the expected result — where the literal criteria disagree with the evaluator, encode the literal result and raise a REVIEW question citing the case; (b) the STEP-3 worked examples from `instructions/arch-mig-prompt-decomposition.md` §3 if they apply to this site; (c) one scenario per pathway met, per redirect, per not-funded item, per boundary value, and at least one "insufficient" case per pathway showing the missing-information list; (d) if a population library exists, one record-backed scenario per retrievable indicator, including the "repeat at 10 days is not confirmed" pattern.
5. **Build gates.** From `tooling/criteria-bundle/tooling`: `npm run build && npm test && npm run check` green. The check must show the new site's Questionnaire linkIds all resolve and every logic-carrying action has a page or draft reference.
6. **STOP.** Push the branch. Report: the atoms table, the REVIEW Qn list, the matrix-case results, the source-vs-JSON differences, and any vocabulary additions. Do not mark the site `transcribed` yourself; a second session or Gary reviews the `SOURCE:` quotes against the source first.

## Hard guardrails

- No edits outside `tooling/criteria-bundle/sites/<examSite>/` and `vocabulary-additions.json`.
- No deployment, no D1/KV writes, no publishing.
- If a matrix case cannot be expressed with the indicators you have, that is a finding, not a reason to add a free-text indicator.
- If you hit the same compile error twice, stop and report.

## signoff.md template

```
# Clinical sign-off — <title> (<examSite>) — bundle <version>

Source: <PDF pages | approved draft, date>
Transcribed by: <session/date>   Engineering review of SOURCE quotes by: <name/date>

## Reading each define against the source
[ ] Every SOURCE quote matches the source document verbatim
[ ] Every define beneath its quote says what the quote says — nothing added, nothing dropped, nothing stronger or weaker
[ ] Modifiers listed in transcription-notes.md are correctly excluded from logic
[ ] Redirects and not-funded items are complete

## REVIEW questions (answer each)
Q1 <question> — reading encoded: <…> — ruling: ________  by: ________
Q2 …

## Matrix cases
<case id>: engine result <…> vs evaluator expectation <…> — agreed / ruled (see Qn)

Signed off by: ____________________  Role: ____________  Date: ________
State → signed-off   (publish on: ________ by: ________)
```
