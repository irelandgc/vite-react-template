# Extraction benchmark results

One file per manual run: `<date>-<provider>-<modelId>.md`, written by
`../run-extraction-benchmark.mjs`.

**These are produced by a manual run against a worker with real model
credentials — never in CI.** See the script header for the exact steps.

## Status (ARCH-MIG-01 slice 4b)

**First run committed: `2026-09-06-anthropic-claude-sonnet-4-6.md`.** Two of the
four cases passed the gate with every indicator matching ground truth on value,
status and quote (16/16 quotes valid); the other two were rejected whole by the
validation gate because the model omitted the `answer-evidence` extension on
some answers (contract rule 3) — extraction variance, the SR-09 finding, not a
tooling failure. Re-runs will differ; the file is the record of this run, not a
target to beat.

A miss is a **finding** (a Questionnaire item that extracted poorly, with its
page reference; or a prompt/contract gap), not a failure of the slice.
