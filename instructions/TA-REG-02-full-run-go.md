# TA-REG-02 — Full Run: final direction

Runner is JSON-only, prompts verified byte-identical to D1, dry run passed on mechanics and clinical logic. Cleared for the full run. Read all of this before starting.

## What runs

- Full 30-case set from the input spreadsheet (the runner reads cases via `loadCasesFromSpreadsheet()`).
- 2 configs (A = v2.2.0, B = v2.3.0 with raw + override-applied verdict derived from the same response).
- 3 runs per case per config.
- ~180 API calls, all `claude-sonnet-4-6`, temperature 0.1, all routed through the production Worker API (tagged `source='regression'`, `regression_run_id`).
- Rate limit is ~30/hr/IP — expect ~6+ hours wall-clock. This is fine; it runs unattended.

## Output

- **JSON only:** `reg02-results.json` with the full per-tuple schema and the per-case roll-up. NO spreadsheet writing — Gary builds the formatted spreadsheet from the JSON separately.

## Hard rules

1. **Gary runs the runner, not you.** It needs the admin key in his environment. Do NOT ask him to paste the key to you. Do NOT execute the runner yourself.
2. **No autonomous resume.** Do NOT schedule wakeups, background-poll, or auto-resume the runner. If the process stops, report it and wait for Gary — do not restart it on your own. (This caused repeated problems before.)
3. **Checkpoint is for Gary's manual resume only.** The runner may write a checkpoint so Gary can resume if the run drops. That checkpoint exists for HIM to resume manually with the key — it is not a signal for you to continue the task.

## Pre-flight (do these checks, report, then STOP and wait for Gary to launch)

1. Confirm the runner reads all 30 cases from the input spreadsheet — print the list of case IDs it will run, so Gary can eyeball that all 30 (including EQ-002, INT-AKI, INT-SAH, INT-TORSION) are present and nothing's missing or duplicated.
2. Confirm no stale checkpoint exists that would cause a partial run — if `reg02-checkpoint.json` exists from the dry run, archive or delete it so the full run starts clean from 0/180.
3. Confirm the runner will fetch BOTH prompts from D1 and run the byte-identical diff check at startup (same as the dry run) before making any calls — the full run must verify prompt fidelity too, not just the dry run.
4. Report the estimated call count and run time so Gary knows what he's committing to.

Then STOP. Gary launches the full run himself when he's ready and can leave it running.

## For Gary (not Claude Code) — before launching

- Check the CRR Prototypes workspace spend balance so ~180 calls can't die mid-run on a billing 403.
- Launch with the key in his own shell:
  `CRR_ADMIN_KEY='...' node scripts/reg02-runner.mjs`  (no --dry-run, no --write-xlsx)
- Leave it running. When done, hand `reg02-results.json` to the spreadsheet-formatting workflow.

## After the run (Gary)

- Every clinical-case REVIEW from the fabrication grader needs manual inspection — the grader catches quoted/parenthetical fabrication but not smoothly-worded fabrication, so REVIEW is "look at this", not a pass.
- Hand the JSON over for the formatted spreadsheet build.
