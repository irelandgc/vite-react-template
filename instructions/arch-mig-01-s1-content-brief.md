# Claude Code Brief: ARCH-MIG-01 slice 1 — Session 1 (content)

**Brief ID:** ARCH-MIG-01-S1 · **Parent:** `instructions/arch-mig-plan.md` slice 1 · **Model:** Claude Opus · **Branch:** `feature/arch-mig-s1-content` · **Scope:** indicator vocabulary v1 and the national red-flag library. Nothing else.

This is the *content* half of slice 1. Session 2 (`arch-mig-01-s2-tooling-brief.md`, Sonnet) does the tooling half afterwards and is gated on your two output files existing. You do not touch CT CAP, the tooling, or any other slice.

## Read first, in this order

1. `CLAUDE.md` — the ARCH-MIG-01 section.
2. `instructions/arch-mig-plan.md` — §1 (principles), §4 (interims), and the whole of "Slice 1". Note the **Done** line: *vocabulary v1 reviewed by a clinician for grouping*. That review is not yours to perform.
3. `instructions/arch-mig-gap-analysis.md` §2, specifically **Gap 1 — indicator naming** (`<group>.<concept>` linkIds; national vocabulary rationale).
4. `instructions/arch-mig-known-issues.md` section A, **KI-01 to KI-11**. Each is a constraint on how indicators are shaped (KI-01 one-concept-one-indicator; KI-05 modifiers are not conditions; KI-06 qualitative lab booleans; KI-07 gateways scoped to their pathway; KI-09 age as an extracted indicator; KI-11 equity provisions are content).
5. `instructions/arch-mig-prompt-decomposition.md` §1, **clauses 2–5** — the source for the red-flag library. Clause 4 ("wrong pathway") is *retired as a model judgement*: encode only what the PDF says, nowhere else.
6. `instructions/arch-mig-transcribe-brief-template.md` — the conventions every later site transcription will follow (`SOURCE:` quotes, `REVIEW Qn`, three-valued logic, modifiers listed not encoded). Your vocabulary must be what those sessions reuse.
7. The worked example: `tooling/criteria-bundle/cql/CRR_CTChestAbdomenPelvis_Adult.cql`, `tooling/criteria-bundle/fhir/Questionnaire-CRR-CT-CAP-Adult.json`, `tooling/criteria-bundle/tests/scenarios.mjs`, `tooling/criteria-bundle/README.md`. Copy its shape; do not edit it.

## Sources

- **Published criteria:** `documents/reference/National Primary Care Referral Criteria for Imaging.pdf` (September 2025, updated April 2026). Read the pages, not the JSON. This is the only source for red-flag wording and page citations.
- **Approved draft:** the CT Abdomen and Pelvis / CT Colonography draft (27/08/26) in `documents/reference/CURRENT CT Colonography and CT AP community referred criteria final draft Updated 270826.docx`. Use it only to check that the shared indicators you define (labs, weight loss, prior imaging) will cover what CT AP needs; do not transcribe CT AP.
- **Cross-check only:** `documents/reference/pdf-criteria-all.json`. Differences from the PDF are reported in your notes, never resolved by choosing the JSON.

## Outputs

### 1. `tooling/criteria-bundle/vocabulary/indicators.json`

National indicator vocabulary v1. Shared indicators only — concepts that recur across exam/sites. Groups, at minimum:

| group | examples |
|---|---|
| `patient` | `patient.age`, `patient.sex` (the CT CAP linkIds — keep them) |
| `symptom` | weight loss (boolean + `periodMonths` + `percent` as separate items, per the CT CAP split), persistent abdominal symptoms, other symptoms that appear in three or more sites |
| `lab` | the common flags as booleans (`lab.hb.low`, `lab.crp.raised`, `lab.alp.raised`, `lab.albumin.low`, `lab.platelets.raised`, `lab.calcium.raised`, ferritin, eGFR, creatinine…) with optional `.value` items only where a site states a numeric threshold |
| `imaging` | prior imaging by modality/region/interval (`imaging.ctcap.within12m` style, generalised) |
| `workup` | `workup.cxr`, `workup.localisingFeatures` (one indicator, both polarities — KI-01) |
| `advice` | specialist advice / discussion gateways; decision-support tool completed |
| `funding` | `funding.accTrauma`, not-routinely-funded markers |
| `redflag` | one boolean per red flag in the library below |

Each entry: `linkId`, `text` (published wording where it exists), `type` (FHIR Questionnaire item type), `group`, `status` (`active`; `deprecated` entries carry `successor`), `sites` (which exam/sites you saw the concept in, from the PDF — this is what the clinician reviews), `code` (`PLACEHOLDER` — no invented codes). Add a top-level `_convention` block stating the naming rules so transcription sessions stay consistent. Existing CT CAP linkIds are immutable: reuse them unchanged.

### 2. `tooling/criteria-bundle/cql/CRR_RedFlags.cql`

The national red-flag and ACC library. One `define` per red flag from clause 2 (thunderclap headache, cauda equina, testicular torsion, ruptured AAA, massive haemoptysis, pneumothorax — and any others the PDF's "refer for acute assessment without imaging" rows contain) plus the ACC trauma redirect (clause 3). Each define carries a `SOURCE:` comment quoting the PDF row verbatim with page and site. If a red flag is in the prompt but you cannot find it in the PDF, it goes in `transcription-notes.md` as a finding and does **not** go in the library.

Document at the top of the file the `Determination` precedence contract this library assumes (TA-011/012/013 in the known-issues register): red flags evaluated before any exam library; ACC redirect before criteria; the exam library never re-evaluates them. Follow the CT CAP library's plumbing for `Rule Trace` and `Missing Information`.

### 3. `tooling/criteria-bundle/tests/scenarios-redflags.mjs`

Following `tests/scenarios.mjs`: one scenario per red flag firing, ACC redirect firing, red flag with `inferred` status under strict documentation standard (must not fire), and at least one fall-through case where nothing fires and evaluation would continue to the exam library. Target is 100 % define coverage — the slice's Done line.

### 4. `tooling/criteria-bundle/vocabulary/transcription-notes.md`

The atoms table (concept → linkId → sites where seen → PDF page); every `REVIEW Qn` with the reading you chose; PDF-vs-JSON differences; red flags found in the prompt but not the PDF.

## Hard guardrails

- No edits outside `tooling/criteria-bundle/vocabulary/`, `cql/CRR_RedFlags.cql` and `tests/scenarios-redflags.mjs`.
- Do not modify CT CAP files, `tooling/criteria-bundle/tooling/`, the engine, or the extraction contract.
- No terminology codes. `PLACEHOLDER` everywhere a code would go.
- Ambiguity is a `REVIEW Qn`, never a silent decision.
- Do not run or build the publish tooling — it does not exist yet.
- Do not continue into slice 2 or Session 2's work.

## Do not mark this done

The plan's Done criterion for this content is **clinician review of the vocabulary grouping**. You produce a draft for that review. Do not write any status, registry or sign-off file, and do not describe the vocabulary as final. Your final report must end with, verbatim:

> **NEEDS CLINICAL REVIEW.** The indicator groupings, the `sites` attributions and the red-flag list are a first-pass transcription. A clinician must review the grouping and the SOURCE quotes before Session 2 retrofits CT CAP against this vocabulary or any site transcription references it.

## Report

Push the branch. Report: the atoms table; the vocabulary grouped by `group` with counts; every red-flag define with its SOURCE citation; the REVIEW Qn list; scenario results; PDF-vs-JSON differences; the clinical-review flag above. Then STOP.
