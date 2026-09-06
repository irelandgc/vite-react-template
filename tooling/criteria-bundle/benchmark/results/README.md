# Extraction benchmark results

One file per manual run: `<date>-<provider>-<modelId>.md`, written by
`../run-extraction-benchmark.mjs`.

**These are produced by a manual run against a worker with real model
credentials — never in CI.** See the script header for the exact steps.

## Status (ARCH-MIG-01 slice 4b)

**Not yet run.** The slice-4b session had no model credentials. The harness
(`run-extraction-benchmark.mjs`), the extract route, the gate and the four
ground-truth cases are all in place; the run itself is a one-command step for
whoever holds the `ANTHROPIC_API_KEY` (Gary), and its result — hits, misses and
engine determinations for the four CT CAP matrix notes — is committed here.

A miss is a **finding** (a Questionnaire item that extracted poorly, with its
page reference; or a prompt/contract gap), not a failure of the slice.
