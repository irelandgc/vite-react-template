# CRR Tool Suite — Full Project Status Audit (PROJ-AUDIT-2026-07)

## Purpose

Produce a single, evidence-based picture of the true state of the CRR Tool Suite:
what is DONE, what is PARTIAL, what is OPEN, what is SUPERSEDED, and what should
be proposed as ABANDONED. This reconciles three sources that may disagree:

1. **Intent** — instruction files, briefs, and backlog entries
2. **Implementation** — the actual code in the repo and its git history
3. **Reality** — what is live in production (D1, KV, deployed Workers/Pages)

This is a follow-up to DOC-AUDIT-2026-06.md, widened from documents to the whole
delivery state. Read that audit first if present — do not repeat its findings,
build on them.

## Hard rules — read before doing anything

- **READ-ONLY.** No code changes, no deployments, no `wrangler deploy`, no
  `wrangler versions upload`, no D1 writes, no KV writes, no schema migrations.
- **No background loops or autonomous re-runs.** Run each check once, record the
  result, move on.
- **All API checks use documented read endpoints only** (GET). If an endpoint
  requires the admin key and it is unavailable, record UNVERIFIABLE — do not
  work around it, do not fall back to local files as a substitute for live state.
- **Evidence or UNKNOWN.** Every classification must cite concrete evidence:
  a file path + relevant excerpt, a git log entry (hash + date), or an API
  response. If evidence is missing, the status is UNKNOWN with a note saying
  exactly what check would resolve it.
- **Do not guess intent.** If a brief and the code disagree, report the
  disagreement — do not decide which one is "right".

## Status vocabulary

| Status | Meaning |
|---|---|
| DONE | Implemented, and verified in live/production state where applicable |
| DONE-UNVERIFIED | Implemented in repo, but live state could not be confirmed |
| PARTIAL | Some elements implemented, specific gaps identified |
| OPEN | Brief/backlog item exists, no implementation evidence found |
| SUPERSEDED | Replaced by a later decision or design — cite what replaced it |
| PROPOSE-ABANDON | No activity, overtaken by events, or conflicts with a later decision. Recommendation only — Gary confirms |
| UNKNOWN | Cannot determine — state exactly what would resolve it |
| UNVERIFIABLE | Live check needed but not possible in this session (e.g. auth) |

## Phase 1 — Inventory the intent

Scan these locations and list every brief, instruction, and backlog item:

- `instructions/` (active briefs)
- `instructions.complete/` (nominally done briefs — spot-check, don't trust the folder name)
- `documents/`
- `CRR_Tool_Suite_Enhancements_Backlog.md`
- `SECURITY_DECISIONS.md` (open risks and gated decisions)
- `CLAUDE.md` (if present — also note whether it exists at all; its absence is itself a finding)
- `DOC-AUDIT-2026-06.md` (prior audit — carry forward any items it left OPEN/UNKNOWN)

For each item capture: ID (if it has one), title, source file, date if determinable,
and what "done" would look like in one sentence.

## Phase 2 — Inventory the implementation

- `git log --oneline --since="2026-04-01"` — map commits to Phase 1 items where possible.
- List deployed artefact versions found in the repo: Criteria Viewer HTML version
  string, Triage Advisor version, Admin tool version, Worker version markers.
- Identify branches: is `feature/role-aware-view` still unmerged? Any other
  stale branches?
- Check for the presence/absence of specific implementation markers (Phase 4 list).

## Phase 3 — Verify live state (read-only)

Using GET endpoints on the production Worker API (and the public criteria endpoint):

| Check | What it settles |
|---|---|
| Published criteria version identifier | Is live data v4.0.5 partial rebuild, or post-reload? |
| Total item count in published data | ~473 items = reload done; materially fewer = not done |
| Presence of `_p` suffixed paediatric item IDs | Pre-load fix 1.1 applied or not |
| Presence of any `imp_` prefixed items | Corruption remnants still live or purged |
| Count of distinct sites | 53 = full extract loaded |
| Regionalisation: HealthPathways URL count / region overrides | Preserved through any reload (expect 28 site URLs; item-level overrides may have been deliberately discarded per CC-DESIGN-01 — check SECURITY_DECISIONS.md / design docs before treating absence as a defect) |
| Current production system prompt version | Confirm v2.3.0 or later |
| Production model string in Worker config (read from repo, not by calling the model) | Confirm claude-sonnet-4-6, temp 0.1 |
| Viewer live version string (fetch the deployed page) | v5.1.0 or v5.2.0 — settles whether v5.2 shipped |

Record raw responses (trimmed) as evidence. If any check requires the admin key
and it isn't configured in this session, mark UNVERIFIABLE and list it in the
"needs Gary" section.

## Phase 4 — Specific items that MUST appear in the register

Do not let these get lost in the general sweep. Each needs an explicit row:

1. **Criteria data wipe-and-reload** (`claude-code-data-load-instructions.md`) —
   including whether pre-load fixes 1.1–1.3 were applied to `pdf-criteria-all.json`
2. **Viewer v5.2** (`claude-code-brief-v5.2-viewer.md`) — all six changes, individually
3. **TA-REG-01** regression runner through Worker API — built? baseline run completed?
4. **TA-SRC-01** Triage Advisor source switch — five recorded decisions; any implemented?
   Is the Advisor still running on the embedded compile-time constant?
5. **CC-DESIGN-01** compound criteria — design docs present; Admin logic-editing UI
   built or not (it gates the migration draft pass)
6. **TA-PROMPT-01** system prompt v3 restructure — Phase 0 audit output present?
7. **SR-01 / SR-02 hardening** — brief exists; any of the three gates
   (Turnstile / rate limit / budget guard) implemented? Deployed? (Should be NO
   deploy per the sign-off gate — flag if anything went live)
8. **Role-aware view** (`feature/role-aware-view`) — branch state, merged or parked
9. **AD-01** PDF import removal from Admin tool — removed, disabled, or still present
10. **AD-02/AD-03/AD-04** Admin backlog items — staleness indicator, workflow doc, scope narrowing
11. **Viewer usage telemetry** (vsess_ events, Viewer Usage admin tab) — built per the May design?
12. **CLAUDE.md** — exists? Current? (flagged June 28 as highest-leverage improvement)
13. **CT Other pathway** — behaviour brief written? Data model change made? (Known
    to be brief-pending as of late June)
14. **Public proxy (`/api/*` proxyPublic)** — confirm it is NOT serving production
    traffic ahead of SR-01/SR-02 sign-off
15. **Demonstrator page** (`crr-demonstrator.html`) — present, current versions linked?

## Phase 5 — Output

Produce ONE file: `PROJ-AUDIT-2026-07.md` containing:

### 5.1 Status register
A single table: ID | Item | Status | Evidence | Gap (if PARTIAL) | Next action (one line).
Every Phase 1 item and every Phase 4 item gets a row.

### 5.2 Disagreements
Items where intent, code, and live state tell different stories. These are the
most valuable findings — call them out explicitly.

### 5.3 PROPOSE-ABANDON list
Items with no activity, overtaken by later decisions, or in conflict with the
current direction. For each: why abandonment is proposed, and what (if anything)
of value should be salvaged into the backlog before closing.

### 5.4 Needs Gary
Anything UNVERIFIABLE or requiring a decision, as a short checklist.

### 5.5 Honest one-paragraph summary
Plain-language: where the project actually is, the top three genuinely blocking
items, and anything found that was thought done but isn't (or vice versa).

## Style

Terse. Evidence-dense. No cheerleading. If something is a mess, say so and say
why. The report is for Gary and future Claude Code sessions — it should let a
cold-start session understand the true project state in one read.
