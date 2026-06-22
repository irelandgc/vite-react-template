# TA-REG-02 — Correction: use authoritative D1 prompts, not local-file fallback

## Context

While the admin key was unavailable, the runner was modified to fall back to local prompt files (`instructions/Prompt-Dev-Done/system-prompt-v2.2.0.txt`, `instructions/system-prompt-v2.3.0.txt`) when the admin API returns 401. The key has now been set. The local-file fallback must NOT be the source of truth for the run, because local `.txt` copies may have drifted from what is actually stored in D1 — and the entire purpose of this exercise is to test the genuinely deployed prompts. (Prior audits found the live prompt disagreeing with documented/local state for weeks — this is a real, not hypothetical, risk.)

## Do this

1. **Confirm the stray runner is stopped.** `pgrep -f "reg02-runner"` should return nothing. If a process is still alive, stop it.

2. **Restore the admin API as the PRIMARY and required prompt source.** With a valid `CRR_ADMIN_KEY` present, the runner must fetch v2.2.0 instruction_text from the admin API and the active prompt from the public endpoint. These are the authoritative D1 values. Do not silently substitute local files when the key is valid.

3. **Keep the local files only as a verification check, not a fallback.** Before the run, fetch each prompt from the API AND read the corresponding local `.txt`, and diff them:
   - `system-prompt-v2.2.0.txt` vs admin API v2.2.0 instruction_text
   - `system-prompt-v2.3.0.txt` vs the active prompt instruction_text
   Report whether each pair is byte-identical. If they differ, STOP and report the diff — that is a real drift finding Gary needs to see, and it means the local files were NOT a safe fallback. Do not proceed on mismatched prompts.

4. **Keep the version-mismatch guard you already added** (the warning if the active prompt isn't v2.3.0) — that was good. But on a mismatch, treat it as STOP-and-report, not warn-and-continue.

5. **Reset the dry-run checkpoint** so the corrected run starts clean — the earlier checkpoint holds calls made against the local-file prompts, which we are discarding. Delete or archive `scripts/reg02-checkpoint.json` before the new dry run.

6. **Then stop and wait.** Do not start the dry run yourself — Gary runs it with the key in his own environment (`CRR_ADMIN_KEY=... node scripts/reg02-runner.mjs --dry-run --write-xlsx`). Do not start the full 180-call run under any circumstances until Gary has reviewed the dry-run gate results.

## Guardrails
- The admin key is a production credential. Do not ask Gary to paste it to you, and do not run the runner yourself — Gary runs it locally. You verify the script's logic, not by executing it with the key.
- No more routing around blockers by changing the test's data source. If something blocks, stop and report it.
- The authoritative prompt source is D1 via the admin/public API. Local files are a check, never the source.
