# TA-REG-02 — Runner change: emit JSON only, drop spreadsheet writing

## Decision

The runner will NOT write the spreadsheet. The xlsx write step failed in the dry run (config-aware layout mismatch) and, more importantly, the formatted spreadsheet is being produced separately from the JSON by Gary's other workflow, to a higher presentation standard. The runner's job is to run the regression and emit a complete JSON results file. That's it. This also removes a dependency and a failure mode from the runner (code-as-liability).

## Do this

1. **Remove the spreadsheet-writing step entirely** from `reg02-runner.mjs` — the `--write-xlsx` flag, the Sheet-3 matching logic, and the xlsx write calls. The runner should no longer touch any `.xlsx` file.

2. **Remove the `xlsx` dependency** if nothing else uses it (`npm uninstall xlsx`). Confirm first that no other script depends on it; if something does, leave it but stop the runner importing it.

3. **Keep and confirm the JSON output is complete.** The runner must write `reg02-results.json` containing, for every tuple (case × config × run):
   - `caseId`, `config` (A/B), `run`, `promptVersion`, `model`
   - `rawVerdict`, `overrideVerdict`, `overrideFired`
   - `fabrication` (the grader's flag — see point 4)
   - `parseSuccess`
   - the full `result` object (verdict, verdict_summary, met_criteria, missing_criteria, notes, safety_alert, redirect, suggested_wording)
   - `cost_nzd` and `usage` (tokens)
   Also keep the per-case roll-up structure (caseId → {A:[runs], B:[runs]}) that the dry run already produced — it's useful.

4. **Check the fabrication grader is actually grading, not defaulting.** In the dry run every tuple came back `fabrication: "REVIEW"`. For the emergency cases that's acceptable (nothing to fabricate in a clean redirect), but confirm the grader will produce real YES/NO fabrication assessments on the clinical cases (e.g. the DG cases where the model historically invented criteria). If it's hard-defaulting everything to REVIEW, that's a bug — the fabrication finding is a core output. Report how the grader decides.

5. **Leave D1 logging unchanged** — every call still routes through the production Worker API tagged `source='regression'` + `regression_run_id`. Confirm the dry-run rows actually landed in D1 with those tags (the dry-run summary didn't explicitly show this — verify a couple of rows exist and are tagged).

6. **Do not run anything.** Make the code changes, confirm the JSON schema above, verify D1 tagging on the existing dry-run rows, then STOP and report. Gary runs the full regression himself with the key. Do not start the full run. Do not resume from any checkpoint.

## After this

Gary runs the full 30-case regression. The runner emits `reg02-results.json`. Gary hands that JSON to his formatting workflow, which builds the presentation spreadsheet. The runner is not involved in spreadsheet production at all.

## Guardrails
- No spreadsheet writing in the runner. JSON only.
- Do not run the runner yourself; Gary runs it with the admin key in his own environment.
- Do not start the full run or resume a checkpoint without Gary's explicit go-ahead.
