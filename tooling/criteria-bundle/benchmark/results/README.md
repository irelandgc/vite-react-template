# Extraction benchmark results

One file per manual run: `<date>-<provider>-<modelId>.md`, written by
`../run-extraction-benchmark.mjs` (default `--runs 3`).

**These are produced by a manual run against a worker with real model
credentials — never in CI.** See the script header for the exact steps.

## Status (ARCH-MIG-01 slice 4b → 4b wire-format follow-up)

The committed file `2026-09-06-anthropic-claude-sonnet-4-6.md` is the **v3.0.1**
run (`--runs 3`). Before/after:

| | v3.0.0 (first run, single pass) | v3.0.1 (`--runs 3`, tool output) |
|---|---|---|
| gate PASS | 2 / 4 cases | **12 / 12 runs (all 4 cases, every run)** |
| gate failures | 2 cases rejected whole — model omitted the `answer-evidence` extension on some answers (contract rule 3) | none |
| quote validity (answered indicators, gate-passing runs) | 16 / 16 | **69 / 69 (100%)** |

**What changed.** v3.0.0 had the model hand-write a nested FHIR
`QuestionnaireResponse` with the evidence extension repeated on every answer;
it did not always repeat it. v3.0.1 has the model call one tool with a flat
`{ linkId, value, status, quote }` list and the **service** builds the FHIR and
attaches the evidence extension to every answer — so gate rule 3 is satisfied by
construction. The evidence rules are unchanged; only the wire format changed.
The `--runs N` harness re-extracts each note N times and reports per-indicator
agreement across runs, so extraction drift (SR-09) is now measured rather than
sampled.

**Findings still open after v3.0.1** (extraction quality, not wire format —
these are what the benchmark exists to surface, and are not fixed here):

- **`workup.localisingFeatures` under-extracted.** MW-009 (hepatomegaly,
  "Liver ~2 cm below costal margin") — answered 0/3. RP-007 ("15cm epigastric
  mass") — answered 1/3. When missed, the CT CAP engine returns
  `INSUFFICIENT_INFORMATION` instead of `ALTERNATIVE_MANAGEMENT`. RP-007's
  determination is non-deterministic across the 3 runs for exactly this reason.
- **`weightloss.periodMonths` from "2/12 h/o"** (NZ shorthand for a 2-month
  history) — RP-007, answered 0/3. Expected `2 / inferred`.
- **`workup.bloods` inferred from "Hb mildly low"** — RP-001 / RP-001-5.5pct,
  answered 0/3. Expected `true / inferred`.
- **`weightloss.present` false positive from "wt 58"** — MW-009, answered in
  2/3 runs. "wt 58" is a single recorded weight; the ground truth marks any
  weight-loss answer here a fabrication (contract rule 3 — a comparison needs
  two weights). The gate does not catch it: the model quotes "wt 58", which is
  verbatim. This is the fabrication class the benchmark is for.
- **`symptom.abdominalPain` status** — MW-009, "Occasional discomfort R side"
  answered `true / inferred` 3/3; ground truth says `documented`. Value and
  quote agree.

A miss is a **finding** (a Questionnaire item that extracted poorly; or a
prompt/contract gap), not a failure of the slice. Re-runs will differ; the file
is the record of this run, not a target to beat.
