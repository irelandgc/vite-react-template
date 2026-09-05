> **[COMPLETE — 2026-09-05]** DOC-AUDIT-2026-09 §3.3 file moves, TA-REG-02 DONE-UNVERIFIED
> annotations, `SECURITY_DECISIONS.md` SR-02 wording correction.
> Verification: verified — executed and committed (`6b18dc7`); file counts and move list
> checked against the report with no discrepancies.
> Filed by: Claude Code

# Claude Code Instruction — DOC-AUDIT-2026-09 Part 4 (Execute)

**Authorisation:** Gary has reviewed `documents/DOC-AUDIT-2026-09.md` and approves the Part 4 moves, with the four decisions below applied. This is the file-moving step only — `git mv`, a small number of in-file annotations, and one wording correction. No code, prompt, data, or deployment changes.

**Scope discipline:** If you find yourself wanting to fix something outside this list, stop and report it instead. The whole point of this gate is that the repo gets tidied without anything else moving underneath it.

---

## Decision 1 — Folder naming: keep `instructions/archive/`

Do **not** create `instructions.superseded/`. The existing `instructions/archive/` is the standing convention for superseded/obsolete files. Where this brief's predecessor said `instructions.superseded/`, read it as `instructions/archive/`.

Per the audit, the archive list has already been fully executed (2026-07-12) and no new candidates were found — so in practice there is nothing to move here. Confirm that's still true at execution time and report if anything has changed.

## Decision 2 — File `verification-report-2026-08.md` into `documents/`

`git mv instructions/verification-report-2026-08.md documents/verification-report-2026-08.md`

Rationale (record it in the commit body): it is a governance-facing verification output, matching the `documents/VERIFICATION-2026-06-21.md` precedent, rather than a brief's paired working output.

## Decision 3 — DONE-UNVERIFIED files carry their caveat in-file

Two files are being archived as DONE but could not be fully verified from static files (per the July audit's own caveat, restated in the September audit §3.3):

- `TA-REG-02-runner-json-only.md`
- `TA-REG-02-full-run-go.md`

**Before moving them**, prepend a clearly delimited note to the top of each file. The caveat must travel in the file itself, not only in the audit report — otherwise a future cold-start session finds them in `instructions.complete/` and reads their location as confirmation they were verified.

Use this form, adapted per file to state the specific thing that could not be confirmed:

```
> **[Filing note, 2026-09-05]** Archived as DONE-UNVERIFIED per DOC-AUDIT-2026-09 §3.3.
> Location in `instructions.complete/` reflects that this work was carried out, NOT that its
> outcome was independently verified. Specifically unverified: <the JSON-only runner fix /
> the manual clinical REVIEW pass> could not be confirmed from static repository files alone.
> Do not cite this file as evidence of a verified result.
```

## Decision 4 — Correct the SR-02 wording in `SECURITY_DECISIONS.md`

This is a **correction of the recorded risk description**, not a status change. SR-02 stays OPEN.

The existing SR-02 entry describes the risk as proxy IP masking collapsing per-IP rate limits via the `feature/role-aware-view` public proxy. Per DOC-AUDIT-2026-09 §3.1 (disagreement 3), that proxy was never merged and does not exist in deployed code — so the risk as written does not describe anything live.

Amend the entry so it describes the actual deployed exposure, preserving the original wording inline rather than overwriting it (this register is append-only in spirit — the history of what was believed matters):

- Keep the original description, marked as superseded, with the date and the reason it was wrong.
- Add the corrected description: the Triage Advisor (`triage/index.html`) calls the `crr-criteria-api` worker **directly cross-origin**. Per-IP rate limiting (30/hr on assess) is therefore intact — nothing masks client IPs on this path — but the endpoint has **no Cloudflare Access, no Turnstile challenge, and no daily budget cap**. The SR-01 cost-sink risk stands on its own merits; SR-02 as originally described does not apply to any deployed component.
- Add an explicit note: **the SR-01/SR-02 sign-off gate must be assessed against the corrected description.** Signing off against the superseded wording would approve a risk that isn't the one running in production.

Do not alter SR-01, SR-03, or any SD-xx entry.

---

## The moves

Execute exactly the lists in `documents/DOC-AUDIT-2026-09.md` §3.3. Reproduced here for cross-checking — if this list and the report disagree, **stop and report the discrepancy rather than picking one**.

### To `instructions.complete/`

From the June audit backlog (re-confirmed accurate):
`claude-code-brief-criteria-data-verification.md`, `claude-code-brief-post-processing-validation.md`, `run-post-processing-validation-test.mjs`, `claude-code-brief-prompt-v2.3.0-test.md`, `claude-code-viewer-passive-mode-fix.md`, `viewer-indication-fixes.md`, `viewer-qa-redesign.md`, `viewer-styling-pass.md`, `criteria-data-quality-audit.md`, `criteria-data-fix-verification-results.md`, `criteria-data-verification-report.md`

New/reclassified this pass:
`claude-code-brief-verify-flagged-items.md`, `claude-code-brief-project-audit-2026-07.md`, `claude-code-brief-TA-REG-02-three-config-run.md`, `TA-REG-02-proceed-instruction.md`, `TA-REG-02-correction-prompt-source.md`, `TA-REG-02-runner-json-only.md` (annotated per Decision 3), `TA-REG-02-full-run-go.md` (annotated per Decision 3), `compound-criteria-design-brief.md`, `prompt-v3-design.md`, `prompt-v3-phase0-audit.md`, `ta-prompt-01-brief.md`

**Explicitly do NOT move:** `compound-criteria-clinical-signoff.md` and `compound-criteria-phase0-findings.md` — Decision 6 and the other clinical rulings inside them are still open.

### To `instructions/Prompt-Dev-Done/`

`prompt-v2.2.0-infer-test-results.json`, `prompt-v2.2.0-infer-test-results.md`, `prompt-v2.2.0-test-results-run2.json`, `prompt-v2.2.0-test-results-run2.md`, `run-v220-infer-regression-test.mjs`, `run-v220-regression-test-run2.mjs`

### Keep in place — do not touch

Everything in the report's "Keep in `instructions/` as still open" list, and all keep-list regression artefacts (v2.3.0 family, `ta-src-01-baseline-*`, `reg02-*`). The TA-SRC-01 baseline artefacts in particular are the gate evidence for the source switch — leave them exactly where they are.

---

## Commit

Use `git mv` throughout so history is preserved. Nothing is deleted, including anything obsolete.

One commit, message:

```
docs: execute DOC-AUDIT-2026-09 tidy-up (approved by Gary)

- ~22 completed briefs/outputs filed to instructions.complete/
- 6 orphaned v2.2.0 regression artefacts to instructions/Prompt-Dev-Done/
- verification-report-2026-08.md to documents/ (governance output, per VERIFICATION-2026-06-21 precedent)
- TA-REG-02 JSON-only + full-run-go annotated in-file as DONE-UNVERIFIED before archiving
- SECURITY_DECISIONS.md SR-02 description corrected (risk as written described an unmerged proxy;
  actual exposure is the direct cross-origin assess endpoint with no Turnstile/budget cap). SR-02 remains OPEN.
- Retained instructions/archive/ as the superseded-file convention; instructions.superseded/ not created
```

---

## Final report back to Gary

After committing, report:

1. Final file counts per folder, before and after.
2. Any file in the lists above that could not be moved (already moved, renamed, or missing) — with what you found instead.
3. Any discrepancy between this instruction and `DOC-AUDIT-2026-09.md` §3.3.
4. Confirmation of the SR-02 amendment text as written.
5. **An explicit statement that the documentation tidy-up gate is now closed** — this is the signal Gary is waiting on before further system changes resume.

Then stop. Do not begin any other work, including anything listed in the audit's "Needs Gary" section.
