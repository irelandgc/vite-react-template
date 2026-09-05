> **[COMPLETE — 2026-09-05]** DOC-AUDIT-2026-09 four-part tidy-up (re-baseline, new-file
> inventory, consolidated report, execute).
> Verification: verified — `documents/DOC-AUDIT-2026-09.md` produced and reviewed by Gary;
> Part 4 moves executed across this commit and the preceding one (`6b18dc7`), plus the
> addendum's reconciliation, relocations, and CLAUDE.md lifecycle rule.
> Filed by: Claude Code

# Claude Code Brief — Documentation & Instructions Tidy-Up (September 2026 pass)

**Status:** This is a GATE. No other system, code, prompt, or data changes should be made until this brief's Part 4 (execute) is complete and committed. Gary has explicitly asked for the tidy-up to happen before any further system changes proceed.

**Sequence:** Part 1 (re-baseline, read-only) → Part 2 (fresh inventory of what's new, read-only) → Part 3 (single report, read-only, stop for Gary) → Part 4 (execute, only after Gary approves Part 3).

---

## Why

Two prior audits exist and should NOT be re-derived from scratch — that would waste effort and risk contradicting settled findings:

- `documents/DOC-AUDIT-2026-06.md` (22 June) — first full inventory of `documents/`, `instructions/`, `instructions.complete/`. ~70 files classified. Its mechanical filing recommendations (move DONE → `instructions.complete/`, archive SUPERSEDED/OBSOLETE → a new `instructions.superseded/`) were never executed.
- `documents/PROJ-AUDIT-2026-07.md` (7–12 July) — broader, evidence-only re-verification that superseded several of the June audit's findings. Found `ct_other` was actually live (but TA-SRC-01 still blind to it), confirmed 3 stale docs still describe removed PDF Import, and discovered `TA-REG-01` was cited in four documents but never actually built. Also produced a "Needs Gary" list of ~10 items.

Neither audit's proposed file-moves were ever executed. ~10 weeks have passed since the July audit, more files have very likely been added, and some "Needs Gary" items may have been resolved by conversations that happened outside the repo (i.e. Claude Code cannot see them). This pass must reconcile all of that into one current, accurate state — and then, unlike the prior two passes, actually finish the filing.

---

## Part 1 — Re-baseline (read-only)

Do NOT re-classify files that both prior audits already agreed on and that haven't changed since. Instead:

1. Read `documents/DOC-AUDIT-2026-06.md` and `documents/PROJ-AUDIT-2026-07.md` in full.
2. For each of the 5 "disagreements" in the July audit and each item in its "Needs Gary" list, do a quick current-state check (git log, D1 query, or file grep as appropriate) and report: **unchanged / resolved / newly contradicted** since 12 July. Do not re-investigate from zero — just diff against what the July audit already established.
3. Specifically re-confirm, since these are the ones most likely to have silently drifted again:
   - Is `TA-REG-01` still missing, or has a baseline runner been built since?
   - Is v2.2.0 or v2.3.0 the currently active/published prompt in D1 right now?
   - Do `document-audit.md`, `PROJECT-STATUS.md`, `crr-roadmap.md` still incorrectly describe PDF Import as present?
   - Has `instructions.superseded/` been created by any later session? (If yes, check what's already in it before creating anything new.)

## Part 2 — Fresh inventory: what's new since 12 July (read-only)

1. `git log --since="2026-07-12" --name-only` across `documents/`, `instructions/`, `instructions.complete/` (and `instructions.superseded/` if it exists) to find every file added, modified, or deleted since the July audit.
2. For every **new** file not covered by either prior audit, classify it using the same scheme as before:
   - `DONE` / `SUPERSEDED` / `PARTIAL` / `OPEN` / `OBSOLETE` / `UNKNOWN`, each with concrete evidence (file path + line, grep match, D1 query result, git entry). No status without evidence — `UNKNOWN` is the honest answer when evidence isn't found, not a guess dressed up as confidence.
3. For files **modified** since 12 July that either prior audit already classified, note whether the modification changes that classification.
4. Regression test artefacts specifically: list every `prompt-v*.md/json`, `run-*.mjs`, `system-prompt-v*.txt` file that exists now, including any created since 12 July (e.g. from the TA-REG-01 baseline work, if that happened). Identify the currently-active prompt version and flag anything older as a retention candidate (recommend keeping the most recent 2–3, archiving the rest — do not delete).
5. Confirm current total file counts in `documents/`, `instructions/`, `instructions.complete/` (and `instructions.superseded/` if present).

## Part 3 — Single consolidated report (read-only, stop here)

Write ONE file: `documents/DOC-AUDIT-2026-09.md`. Structure:

### 3.1 Carry-forward status
A short table resolving every item from the July audit's "Needs Gary" list and 5 disagreements: item, July status, current status, evidence for the change (or "unchanged, still needs Gary").

### 3.2 New files since 12 July
Same DONE/SUPERSEDED/PARTIAL/OPEN/OBSOLETE/UNKNOWN table format as the June audit, but only for files not already covered.

### 3.3 Consolidated action list (this is the one Gary actually needs)
Merge June + July + this pass into one final set of recommendations, since Gary should only have to read one list:
- **Move to `instructions.complete/`:** every file, old or new, now verifiably `DONE`
- **Archive to `instructions.superseded/`:** every file now `SUPERSEDED` or `OBSOLETE`, with the one-line reason each (create the folder if it still doesn't exist)
- **Regression artefact retention:** explicit keep-list vs archive-list for the `prompt-v*`/`run-*`/`system-prompt-v*` family
- **Keep in `instructions/` as still open:** files that are `OPEN` or `PARTIAL`, each with what remains
- **Needs Gary's call:** anything `UNKNOWN`, plus any carry-forward item from 3.1 still unresolved

### 3.4 Summary
File counts per status, before/after picture if the moves in 3.3 are executed, and a one-paragraph plain-language statement of whether the repo's documentation is now trustworthy or still has known drift.

**Stop here. Do not move, archive, or delete anything yet. Wait for Gary's review of `DOC-AUDIT-2026-09.md` before proceeding to Part 4.**

---

## Part 4 — Execute (ONLY after Gary explicitly approves Part 3's action list)

This part does not run automatically. It runs only when Gary confirms the report's recommendations (with any corrections he makes).

1. `git mv` each file per the approved 3.3 lists — `instructions.complete/`, `instructions.superseded/` (create if needed), regression artefact archive location.
2. Do not hard-delete anything, even `OBSOLETE` files — archive, never remove, in case of future reference.
3. Commit with a clear message: `docs: tidy-up per DOC-AUDIT-2026-09 (approved by Gary)`.
4. Confirm in your final message to Gary that the tidy-up is complete and the repo is now in a clean state — this is the explicit signal that the gate is lifted and further system/code changes can resume.

---

## Notes for Claude Code

- This is a gate, not routine housekeeping — Gary has asked that no other system changes happen until this closes. Treat Part 4's completion as a checkpoint worth clearly flagging back to him.
- Resist marking anything `DONE` because it "sounds like" it should be by now. Evidence or `UNKNOWN`, nothing in between.
- If you find a fix or decision described differently in two documents (a recurring failure mode on this project — see the June/July audits), flag it explicitly rather than picking one silently.
- Absence of a release-log entry is NOT evidence a fix is missing — check code/data directly, per the lesson from the June audit's false negatives (Fix 9/10/11/13).
- Keep the report terse and evidence-dense. It's for Gary and for future cold-start Claude Code sessions to trust without re-verifying.
