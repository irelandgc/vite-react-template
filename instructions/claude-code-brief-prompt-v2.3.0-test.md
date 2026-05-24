# Claude Code Brief: System Prompt v2.3.0 — Test Only

**Date:** 24 May 2026

## IMPORTANT: DO NOT ITERATE AUTONOMOUSLY

Run the regression test and report the results. Do NOT:
- Write a v2.4.0 or any further prompt versions
- Modify the prompt based on results
- Attempt fixes for any regressions found

Report the results back. Prompt changes will be reviewed and authored in the design conversation, not here.

---

## Steps

1. Save `instructions/system-prompt-v2.3.0.txt` as a new system prompt version in D1:
   - version: "2.3.0"
   - label: "Verdict consistency check + general-vs-specific pathway rule + clinical severity override fix"
   - changelog: "Added Step 3b verdict consistency check (5 checks). Added GENERAL vs SPECIFIC VARIANTS to Step 1. Added explicit rule that Step 0 is the only place where redirect/safety can set verdict to declined. Added AKI concrete example to Step 3. Addresses LP-003, TEST-004, RP-006 regressions from v2.2.0."
   - Do NOT activate

2. Run the full 20-case regression test using v2.3.0, with paediatric detection enabled, same as the v2.2.0 run:
   - All Rhys Parry cases (RP-000 through RP-006)
   - All Louise Poynton cases (LP-001 through LP-004)
   - All Claire Russell cases (CR-001 through CR-003)
   - All TEST cases (TEST-001 through TEST-007)
   - Model: claude-sonnet-4-20250514, mode: strict

3. Save results to:
   - `instructions/prompt-v2.3.0-test-results.json`
   - `instructions/prompt-v2.3.0-test-results.md`
   
   Use the same format as previous test results. Include comparison against v2.2.0 results to show what changed.

4. STOP. Report results. Do not create further prompt versions or attempt fixes.

---

## Rate limiting

If you hit 429 errors, wait for the rate limit window to reset and retry. Do not skip cases. All 20 cases must complete. Add delays between calls if needed (e.g., 3-second pause between each call) to stay within the 30 req/hr limit.
