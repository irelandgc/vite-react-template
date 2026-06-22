# Claude Code Brief — Documentation & Instructions Audit + Tidy-Up

**Status:** Read-only review. Do NOT move, delete, archive, or modify any file. The entire job is to produce one accurate report that Gary uses to decide next steps himself. No actions are taken on the filesystem at all.

## Why

`documents/`, `instructions/`, and `instructions.complete/` have accumulated across many months of work. Many files describe work that is now shipped, some describe work that was superseded by a different approach, and a few are still genuinely open. Nobody currently has an accurate picture of which is which. This brief produces that picture before anything is archived or deleted.

`instructions.complete/` already exists as a precedent (7 files) but stopped being used — everything since has stayed in `instructions/` regardless of status.

---

## Part 1 — Inventory & Status Classification (read-only, no changes)

For every file in `documents/`, `instructions/`, and `instructions.complete/`, produce one row in an output table with these columns:

| File | Folder | Topic (1 line) | Status | Evidence | Confidence |
|---|---|---|---|---|---|

**Status** must be one of:
- `DONE` — the thing it describes is implemented in the current codebase/data, verified by evidence below
- `SUPERSEDED` — a later file or implementation replaced this approach; name the superseding file/commit
- `PARTIAL` — some but not all of the instruction is implemented; say what's missing
- `OPEN` — not implemented, still relevant
- `OBSOLETE` — describes something no longer relevant (deprecated tool, abandoned approach) regardless of whether it was ever done
- `UNKNOWN` — can't determine from available evidence; needs Gary's input

**Evidence** must cite something concrete, not a guess — e.g. a file path + line number, a grep match, a D1 query result, a git log entry, a version string found in code. If no evidence can be found either way, status is `UNKNOWN`, not a guess dressed up as `DONE`.

### How to gather evidence

1. **Version-numbered files first** (the regression test family: `prompt-v*.md`, `prompt-v*.json`, `run-*-regression-test.mjs`, `system-prompt-v*.txt`, and their `-infer` / `-run2` variants). Cross-reference against:
   - The live system prompt currently deployed (find it in the Worker source — likely `src/worker` or similar) and its version string
   - D1 `regression_run_id` / `source` columns if the TA-REG-01 schema addition has been applied — query which `regression_run_id` values exist and what prompt version they're tagged with
   - Any version older than the currently-deployed prompt version is a `SUPERSEDED` candidate by default, but confirm nothing in it is still referenced by a newer file before marking it so.

2. **Claude Code brief files** (`claude-code-brief-*.md`, `claude-code-*.md`, `criteria-data-*.md`). For each, check whether the specific changes it describes (file names, function names, UI elements, data fields mentioned in the brief) actually exist in the current source. Grep for distinctive strings from the brief in the relevant source files.

3. **Viewer-specific instruction files** (`viewer-*.md`). Check against the current viewer source (`public/crr-criteria/viewer/`) for whether the described fixes are present — e.g. if `viewer-indication-fixes.md` describes a specific grouping behaviour, check the current render logic implements it.

4. **Architecture/reference docs** (`CRR_Architecture_Briefing.md`, `CRR-admin-reference.md`, `CRR-integration-guide.md`, `buildnotes.md`, `README.md`). These were flagged in an earlier session as having "substantial drift" from the real implementation (wrong tool names, invented URL parameters, missing admin tabs, undocumented endpoints). Don't assume that audit was ever actioned — re-check current accuracy directly against source, and flag anything still wrong specifically rather than just noting "may be outdated."

5. **Planning/business-rules docs** (`crr-business-rules.md`, `crr-roadmap.md`, `CRR_Tool_Suite_Enhancements_Backlog.md` if present, `PROJECT-STATUS.md`, `document-audit.md`). Check whether items listed as pending in these have since shipped (cross-check against `instructions.complete/` contents and git log), and whether items listed as done are genuinely done.

6. **Security files** (`security-audit-instruction.md` and any `SECURITY-AUDIT-REPORT.md`). Check the report's remediation tracking table against current code — e.g. is CORS still origin-locked, is rate limiting still in place, is `ADMIN_KEY` still a real secret (don't print its value, just confirm `wrangler secret list` shows it's set and isn't being read from a committed file).

7. **`instructions.complete/` files** — sanity check these are still correctly archived, i.e. nothing in there is actually still being referenced as a live instruction. Just confirm, don't re-investigate deeply.

### Output

Write the full table to `documents/DOC-AUDIT-2026-06.md`, grouped by status (`OPEN` and `PARTIAL` first, since those are actionable, then `UNKNOWN`, then `DONE`/`SUPERSEDED`/`OBSOLETE`). Include a short summary at the top: counts per status, and a flat list of filenames recommended for `UNKNOWN` review with Gary.

**Do not delete, move, or archive any file in this part.** This is a report only.

---

## Part 2 — Recommendation Per File (still no changes made)

In the same report, after the table, add a **Recommendation** for each file so Gary can act on it. Use plain language, one line each, grouped so the actionable stuff is at the top:

- **Looks safe to archive (DONE):** files whose work is verifiably shipped — list them so Gary can move them in one batch if he agrees
- **Looks superseded/obsolete:** each with the one-line reason and what replaced it
- **Still open / unfinished:** what specifically remains, ordered by what seems most urgent (e.g. anything blocking the criteria data wipe-and-reload, or referenced by the upcoming NAIAEAG presentation) — flag if you're inferring the priority vs. stating it from the file
- **Needs Gary's decision (UNKNOWN):** why it couldn't be classified, and the single question that would resolve it

For the regression result files specifically (`prompt-v*-test-results.json/.md`, `run-*.mjs`, `system-prompt-v*.txt`), give a separate retention recommendation rather than per-file status — e.g. "current prod prompt is vX; results for versions older than that are historical — suggest keeping the most recent N, the rest are reference-only."

**That is the whole job. Stop after writing the report. Do not move, rename, archive, or delete anything. Do not create new folders. Gary will decide what to action.**

---

## Notes for Claude Code

- Read-only. The single deliverable is `documents/DOC-AUDIT-2026-06.md`. Touch nothing else.
- This is an investigation-heavy task. Resist the temptation to mark things `DONE` because they "sound like" they'd be done by now — find the actual evidence in code or data, or mark `UNKNOWN`.
- If a file is ambiguous because it was partially superseded by a *later instruction file* rather than by shipped code, say so explicitly (e.g. "superseded by `claude-code-brief-v5.2-viewer.md`, items 1–4; items 5–6 not covered elsewhere").
- Flag if you find the same fix described in more than one file with conflicting detail — that's drift worth surfacing even if both are technically "done."
- Where you're genuinely unsure, `UNKNOWN` with a clear question is far more useful to Gary than a confident guess.
