# TA-REG-02 — Proceed Instruction (post Part 0)

Part 0 findings accepted. Proceed as follows. Build in this order; stop at the dry-run gate.

## 1. Adopt the 2-config design (§0.3 approved)

- Config A: v2.2.0 system text → raw verdict (C1 data)
- Config B: v2.3.0 system text → raw verdict (C2) + override-applied verdict (C3), both derived from the SAME response
- 30 cases × 3 runs × 2 configs = 180 calls

**Critical caveat on the override replay:** the runner must derive the C3 (post-override) verdict by porting `postProcessResult()` **verbatim** — same logic, same MET_PHRASES list, same guards, same line-for-line behaviour as the deployed function. Do not paraphrase or "clean up" the logic. Cite the exact source line range you ported from in a comment. If the replayed logic drifts from production even slightly, the C2-vs-C3 override-contribution number measures the wrong thing. If you cannot import the function directly, copy it exactly and note that it must be kept in sync.

## 2. §0.4 D1 migration — approved, but ADDITIVE ONLY

Add `source` and `regression_run_id` columns. Before deploying, confirm and report:
- Both columns are nullable with no default backfill.
- Existing evaluator inserts continue to work unchanged, writing NULL to both new columns — i.e. no change to the existing INSERT's behaviour for real traffic beyond appending two nullable fields.
- No change to any existing column, index, or read path.

Once confirmed, do the migration + worker.ts INSERT update + redeploy. This is the ONLY production change authorised in this exercise. Do not deploy it while an evaluator may be mid-session — flag when you're ready to deploy so Gary picks the moment.

## 3. Rate limit — respect it, do NOT bypass it

The 30/hour/IP limiter stays in place — it is a deliberate security/cost control on the public assess endpoint, not a nuisance. Do NOT add an IP exemption or otherwise weaken it. Instead, the runner must:
- Treat HTTP 429 as expected, not an error.
- Back off and resume (the enforced floor is ~2 min between calls; 180 calls ≈ 6+ hours wall-clock — this is fine, it's designed to run unattended/overnight).
- Be **resumable across interruptions**: checkpoint which (case, config, run) tuples have completed and their results, so a dropped connection, 429, or restart resumes from the last incomplete tuple rather than starting over. Do not lose completed work.

## 4. Dry-run gate — STOP here for Gary

Before the full 180-call run, execute 2–3 cases end-to-end and confirm:
- D1 rows land tagged with `source='regression'` and `regression_run_id='TA-REG-02-{config}-{YYYYMMDD}'`.
- Both raw and override-applied verdicts are captured correctly from Config B responses.
- The spreadsheet copy (`documents/CRR_Test_Case_Results_Matrix_REG02.xlsx`) writes cleanly without disturbing existing sheets/formatting.
- The resume/checkpoint mechanism works (interrupt and restart one case to prove it).

Report the dry-run results and STOP. Do not start the full run until Gary confirms.

## Note before the full run

The full run makes ~180 real Anthropic API calls against the CRR Prototypes workspace. Gary will check the workspace spend balance before authorising the full run so it can't die mid-way on a billing 403.
