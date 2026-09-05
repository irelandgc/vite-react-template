> **[COMPLETE — 2026-09-05]** Reconciliation of unaccounted `instructions/` files, register/
> reference relocation, `CLAUDE.md` lifecycle rule.
> Verification: verified — reconciliation table reported to and confirmed with Gary in-session
> before any moves; moves and the `CLAUDE.md` edit executed in this commit.
> Filed by: Claude Code

# Claude Code Instruction — DOC-AUDIT-2026-09 Part 4 ADDENDUM

**Read this alongside `claude-code-part4-execute-tidy-up.md`.** Execute both in the same session, as one commit. This addendum adds three things the main instruction didn't cover: a reconciliation of files neither audit accounted for, a relocation that makes `instructions/` self-auditing, and a standing rule added to `CLAUDE.md` so this problem stops recurring.

Still read-only on all code, prompt, and data. `git mv` plus edits to `CLAUDE.md` and in-file filing tags only.

---

## A — Reconcile the unaccounted files (do this FIRST, before any moves)

`DOC-AUDIT-2026-09` §3.4 states `instructions/` holds **53 top-level files** and will drop to "roughly 25" after Part 4. But the move lists account for ~22 (to `instructions.complete/`) and 6 (to `Prompt-Dev-Done/`), and the "keep as still open" list names only about 11 files that actually live in `instructions/` — several entries on that list are in `documents/`, not `instructions/`.

That leaves roughly **13 files in `instructions/` that appear on neither list.** This is a scoping artefact: the September pass was scoped to "new since 12 July," so files the June or July audits already classified weren't re-enumerated. The consequence is that the "consolidated action list" isn't actually consolidated.

**Before moving anything:**

1. Produce a complete enumeration of every top-level file currently in `instructions/`.
2. Mark each as: **moving to `instructions.complete/`** / **moving to `Prompt-Dev-Done/`** / **staying (open work)** / **staying (register or reference — see section B)** / **unaccounted**.
3. For every file in the `unaccounted` bucket, classify it now using the standard scheme (`DONE` / `SUPERSEDED` / `PARTIAL` / `OPEN` / `OBSOLETE` / `UNKNOWN`) with concrete evidence — checking the June and July audits first, since most will already have a classification there that simply wasn't carried forward.
4. **Report the reconciliation to Gary before executing any moves.** If the unaccounted set is larger than ~15 files or contains anything you'd classify `OPEN`, stop and report rather than proceeding — that would mean the audit's picture of open work is materially incomplete and Gary needs to see that before files move.

If the count reconciles cleanly and nothing unexpected surfaces, fold the newly-classified `DONE`/`SUPERSEDED` files into the appropriate move lists and continue.

## B — Relocate registers and reference content out of `instructions/`

`instructions/` is currently doing three different jobs, which is why it looks permanently full of outstanding work:

- **Pending instructions** — work still to be done. These belong.
- **Standing registers** — append-only, never "complete."
- **Reference content** — describes how things are, not work to do.

The second and third categories will sit in `instructions/` forever and will make every future audit report open work that isn't open. Move them:

**To `documents/`:**
- `SECURITY_DECISIONS.md` — explicitly append-only by its own stated convention; it is a permanent register, not an instruction. **Important:** it is referenced by `CLAUDE.md` and possibly by other briefs — grep the repo for references to its path and update every one. Do not move it until those references are found; report them if any are in files you've been told not to edit.

**To `documents/reference/`** (folder already exists):
- `crr-business-rules.md`
- `viewer-layout-and-styling.md`
- Any other file identified in section A as reference content rather than pending work.

After this, `instructions/` becomes true by construction: **if a file is in `instructions/`, it is work still to be done.** That property is worth more than the file-count reduction, because it makes the folder self-auditing.

Update any `@`-import or path reference in `CLAUDE.md` or elsewhere that points at the moved files.

## C — Add the standing filing rule to `CLAUDE.md`

Add the following under the project conventions section. The wording matters: the rule must not let Claude Code's own assessment of its work become evidence that the work was verified — that is exactly the failure this project has hit twice (the June audit's false negatives on Fix 9/10/11/13, and the DONE-UNVERIFIED TA-REG-02 files).

```markdown
### Instruction file lifecycle

Files in `instructions/` are pending work. If a file is in `instructions/`, it is
still to be done. Registers and reference material live in `documents/` and
`documents/reference/`, never in `instructions/`.

When the work described by an instruction file is finished, file it in the same
session, as part of the same commit as the work itself:

1. Prepend a filing tag to the top of the file:

   > **[COMPLETE — YYYY-MM-DD]** <one line: what was done>
   > Verification: <one of — "verified: <specific evidence, e.g. commit hash, test
   > output, live API check>" | "not independently verified: <what could not be
   > confirmed and why>">
   > Filed by: <Claude Code | Gary>

2. `git mv` it to `instructions.complete/`.

Superseded or obsolete files go to `instructions/archive/` instead, with the same
tag but `[SUPERSEDED — YYYY-MM-DD]` and a one-line reason plus what replaced them.

**The verification line is not optional and must not be softened.** "Not
independently verified" is an acceptable and often correct answer — a file's
presence in `instructions.complete/` records that the work was carried out, never
that its outcome was confirmed. A future session must be able to tell those apart
from the file alone, without re-running an audit.

**Do not tag or move a file whose completion you are inferring rather than
observing.** If evidence is absent, leave it in `instructions/` and raise it with
Gary. Absence of a release-log entry is not evidence work was skipped; equally,
having written the code is not evidence the outcome was verified.

Add a corresponding entry to `documents/CRR_Release_Log.md` for any change that
alters deployed behaviour, at the time it happens, not retrospectively.
```

**Do not automate the move beyond this.** The rule deliberately requires the tag to be written before the move, so the act of filing forces an explicit, recorded claim about verification status. A silent auto-move on self-assessed completion would reintroduce exactly the ambiguity this whole three-audit exercise exists to clear up.

---

## Commit

Fold sections A and B into the single Part 4 commit. Extend the commit message with:

```
- Reconciled ~13 previously unaccounted instructions/ files (scoping gap between
  the June/July audits and the September pass)
- SECURITY_DECISIONS.md moved to documents/ (append-only register, not an instruction)
- crr-business-rules.md, viewer-layout-and-styling.md moved to documents/reference/
- CLAUDE.md: added instruction file lifecycle rule (tag with verification status,
  then file — no silent auto-move on self-assessed completion)
```

## Report back

In addition to the main instruction's report-back items:

1. The full section A reconciliation table.
2. Every path reference updated as a result of section B, and any you found but could not update.
3. The final list of files remaining in `instructions/`, each with one line on what remains to be done. This list is the answer to Gary's actual question — *is everything left in here genuinely open work?* — so it should be short enough to read at a glance and honest about anything that is only there because its status is unclear.
