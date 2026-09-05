# Claude Code Brief: ARCH-MIG-01 slice 1 — Session 2 (tooling)

**Brief ID:** ARCH-MIG-01-S2 · **Parent:** `instructions/arch-mig-plan.md` slice 1 · **Model:** Claude Sonnet · **Branch:** `feature/arch-mig-s2-tooling` (from the merged S1 branch) · **Scope:** CT CAP retrofit to the vocabulary, publish tooling, source provenance, cross-bundle includes.

**Gate to start:** `tooling/criteria-bundle/vocabulary/indicators.json` and `cql/CRR_RedFlags.cql` exist (Session 1 output). They may still be awaiting clinical review — that is fine for tooling work; it is not fine to treat their content as final (see "What you must not do").

## Read first, in this order

1. `CLAUDE.md` — the ARCH-MIG-01 section.
2. `instructions/arch-mig-plan.md` — §1, §4, and the whole of "Slice 1", including the two addendum paragraphs **Source provenance for approved drafts** and **Cross-bundle references**. The Done line is: *CT CAP builds against the vocabulary; red-flag library 100 % scenario-covered; `publish` produces a bundle that `check` validates.*
3. `instructions/arch-mig-gap-analysis.md` §5 (bundle publish states, D3) and §2 Gap 1.
4. `instructions/arch-mig-transcribe-brief-template.md` — the outputs table and protocol step 5 define what `publish` must consume and what `check` must assert for every future site.
5. `tooling/criteria-bundle/README.md`, `tooling/criteria-bundle/tooling/*.mjs` (translate, populate, run-tests, check-consistency), and the CT CAP artefacts under `cql/`, `fhir/`, `elm/`, `tests/`.
6. Session 1's output: `vocabulary/indicators.json` (its `_convention` block), `cql/CRR_RedFlags.cql`, `tests/scenarios-redflags.mjs`, `vocabulary/transcription-notes.md`.

## Work items, in order

### 1. Retrofit CT CAP to the vocabulary

`fhir/Questionnaire-CRR-CT-CAP-Adult.json` items whose concept is in the vocabulary reference the vocabulary entry (keep the linkId — CT CAP's linkIds were the seed and are immutable; if Session 1 changed one, that is a defect to report, not adopt). Site-specific items stay in the Questionnaire. Add a `vocabularyVersion` to the bundle metadata. `check-consistency` gains: every Questionnaire linkId either resolves to the vocabulary or is declared site-local; no site-local item duplicates a vocabulary concept (compare `text`, report near-duplicates as warnings).

CT CAP's CQL is unchanged in logic. All existing scenarios must still pass with identical results.

### 2. Red-flag library in the build

`translate` compiles `CRR_RedFlags.cql` to ELM; `run-tests` runs `scenarios-redflags.mjs`; `check` asserts every red-flag define has a `SOURCE:` comment with a page reference and is covered by at least one scenario. Do not edit the library's content; if it does not compile, report the error and stop after the second attempt.

### 3. `npm run publish -- <examSite> [--state transcribed|signed-off] [--registry <dir>]`

Composes into one immutable bundle JSON: Library ELM (site + population + red-flags reference), PlanDefinition, Questionnaire, overlays from `fhir/regions.json`, `vocabularyVersion`, test results (from the last `run-tests`), `source` provenance, `state`, content hash, and `publishedAt`. Rules:

- Refuses without `signoff.md` unless `--state transcribed|signed-off` is given; `--state signed-off` additionally requires the sign-off block to be filled.
- Writes to a local registry directory for dev (`tooling/criteria-bundle/registry/<examSite>/<version>.json` plus an `index.json`); the KV/admin-route target is slice 2 — leave a clearly named stub, not an implementation.
- A published bundle file is never rewritten; a re-publish is a new version.
- `check` must be able to validate a published bundle file standalone (schema, hash, linkId resolution, page/draft references).

### 4. Source provenance

Bundle metadata `source: { type: 'pdf' | 'approved-draft', title, identifier, date, pages? }`. The `source-page` build rule becomes "page reference **or** draft reference": for `type: 'approved-draft'` every logic-carrying action needs a `source-draft` reference (section/paragraph) instead of a page. Re-provenancing a draft bundle to the PDF is a version bump with no logic change — `check` should confirm the ELM hash is unchanged between the two versions when only `source` differs.

CT CAP is `type: 'pdf'`, identifier and date from `documents/reference/National Primary Care Referral Criteria for Imaging.pdf` (September 2025, updated April 2026). Do not invent a draft bundle; the CT AP transcription is slice 7.

### 5. Cross-bundle `include`

A site library may `include CRR_<Other>_Adult` and reference its determination define (CT AP will exclude "patients who meet the criteria for CT CAP"). `translate` resolves includes from `cql/` (and, for published bundles, from the registry); `check` records the dependency in the bundle metadata and in `index.json`; `run-tests` re-runs dependants' scenarios when a dependency changes. Prove it with a throwaway test library under `tests/fixtures/` that includes CT CAP — not a real site.

### 6. Terminology validation scaffold

`check` runs a terminology step when `NZHTS_URL` and credentials are configured; otherwise it lists `PLACEHOLDER` codes and passes. Publishing with unvalidated codes is blocked only when the step is live (feature-flagged). No network calls in tests.

## Gate

From `tooling/criteria-bundle/tooling`: `npm run build && npm test && npm run check` green, then `npm run publish -- ct-chest-abdomen-pelvis-adult --state transcribed` produces a bundle that `npm run check -- --bundle <path>` validates. Include the command output in the report.

## What you must not do

- Do not change the clinical content of the vocabulary, the red-flag library or CT CAP's CQL. Findings about them (near-duplicates, a changed CT CAP linkId, a define without a scenario) go in the report.
- Do not mark the vocabulary or red-flag library as reviewed or signed off; do not publish anything at `--state signed-off`.
- No D1/KV writes, no deployment, no changes outside `tooling/criteria-bundle/`.
- Do not start slice 2 (registry route, runtime loading) or slice 7 (site transcription). The KV target is a stub.
- Same compile or test error twice: stop and report.

## Report

Push the branch. Report: what changed in CT CAP's Questionnaire (linkId → vocabulary mapping table); the `publish` bundle schema; gate output; the cross-bundle fixture result; any findings against Session 1's content; open decisions for slice 2. Then STOP.
