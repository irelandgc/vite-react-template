# CRR Documentation Audit — Consolidated Report (DOC-AUDIT-2026-09)

**Date:** 2026-09-05 · **Method:** Read-only. Git history, direct file/grep inspection, and live GET calls to the public `crr-criteria-api` worker (`https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/{system-prompt,version,criteria}` — public, unauthenticated, read-only; no admin endpoints called, no D1 writes). Builds on `documents/DOC-AUDIT-2026-06.md` (21 June) and `documents/PROJ-AUDIT-2026-07.md` (7–12 July) — their classifications are not repeated except where new evidence changes them.

**Headline:** The ~8-week gap between the July audit and today was quieter than expected. Only **one file** in `documents/`, `instructions/`, `instructions.complete/` is genuinely new-and-unclassified (`instructions/verification-report-2026-08.md`). Everything else that changed was either already correctly filed or a routine update to an existing register (`SECURITY_DECISIONS.md`). The bigger news is substantive, not filing: several July "Needs Gary" items were resolved in a single dense day of work on **12 July** (the same day the July audit closed), one long-claimed piece of drift in the CLAUDE.md-loaded Architecture Briefing turns out not to exist on re-check, and a new drift item in the same file was found in its place.

---

## 3.1 Carry-forward status

### The 5 disagreements (July §5.2)

| # | Item | July finding | Current status | Evidence |
|---|---|---|---|---|
| 1 | `ct_other` missing vs. live | Live in published D1 data; invisible to Viewer offline-fallback and Triage Advisor's embedded blob | **Unchanged.** Still live and correct in the three-way split July described | Direct `GET /api/criteria` today: `ct_other` present in `exams[ct].sites`. Triage Advisor still runs on `EMBEDDED_MATCH_DATA` (see TA-SRC-01 row below) |
| 2 | Prompt promotion history vs. governance record | v2.3.0 live since 24 May with no decision record; open question since 21 June | **Resolved.** | `SECURITY_DECISIONS.md` SD-07 (2026-07-12): rationale recovered — deliberate promotion during a same-session Sonnet 4 vs 4.6 comparison, two known regressions accepted as cost. Status: "Recorded — rationale recovered; go-forward rule in force." |
| 3 | Rate limiting "exists" vs. "protects" (SR-01/SR-02) | New `proxyPublic` route would mask client IPs, collapsing per-IP limits | **Newly contradicted — the described mechanism isn't the live one.** | `instructions/verification-pass-instructions.md`'s output (now `instructions/verification-report-2026-08.md`, §NFR-014) found `feature/role-aware-view`'s proxy was **never merged** — confirmed again today, `src/worker/index.ts` has no `/api/*` public-proxy route, only `/crr-api/*` (CF-Access gated). The actual live path: `triage/index.html` calls the bare `crr-criteria-api.fk4dsrmq5r.workers.dev` **cross-origin, directly** — real per-IP rate limiting (30/hr on assess) since nothing masks IPs on this path, but no CF Access, Turnstile, or budget cap. SR-01's cost-sink risk stands; SR-02 as literally described (proxy masking IPs) doesn't apply to anything currently deployed. **`SECURITY_DECISIONS.md`'s SR-02 entry needs a wording correction**, not just a status update |
| 4 | PDF Import: 3 stale docs vs. current code | `document-audit.md`, `PROJECT-STATUS.md`, `crr-roadmap.md` all describe PDF Import as present; code removed it | **Resolved for the 3 named docs — plus a 4th instance found.** | All 3 named files moved to `instructions/archive/` on 2026-07-12 (commit `1c96b52`, "Archive stale docs per PROJ-AUDIT-2026-07 §5.3") — no longer live in the working `instructions/` set a cold-start session reads. **New finding:** `documents/CRR_Architecture_Briefing.md` §5.3's admin-tab table *still* lists "PDF Import" as tab 2 of 8, and is missing "Releases" and "System Prompts" (live admin tool has 10 tabs, no PDF Import — AD-01, confirmed again today). This file wasn't checked for this specific issue by either prior audit |
| 5 | The "TA-REG-01 gate" cited but never built | 4 documents treat it as an established checkpoint; no artefact exists under that name | **Resolved via a dedicated baseline (July audit's "Option B").** | `scripts/ta-src-01-baseline-runner.mjs` + `scripts/reg_baseline_ta-src-01_20260712_01-{checkpoint,results}.json`, committed 2026-07-12 (commits `6cc3c35`, `f01596b`) — 30 cases × 3 runs = 90 assessments via `/api/triage/assess`, D1-tagged `source='regression'`, `regression_run_id='reg_baseline_ta-src-01_20260712_01'`, explicitly built with "distinct run-ID/file naming so it can't be confused with TA-REG-02." A real, dedicated baseline now exists — not literally named "TA-REG-01" but built to serve exactly that gating role. TA-SRC-01 *implementation* itself has still not started (see below) |

### The 10 "Needs Gary" items (July §5.4)

| # | Item | July status | Current status | Evidence |
|---|---|---|---|---|
| 1 | TA-REG-01 baseline | Missing | **Resolved** — see disagreement 5 above | as above |
| 2 | CC-DESIGN-01 Phase 1 design sign-off | Awaiting Gary | **Resolved.** Signed off 2026-07-12 | Commits `871e30b`, `1011825`; `compound-criteria-design.md:4`: "**Status:** ACCEPTED (Gary, 12 July 2026)" |
| 3 | CC-DESIGN-01 Decision 6 (`xrph_p2_3_p` classification) | Requires clinical ruling | **Unchanged — still open.** | `instructions/compound-criteria-clinical-signoff.md` (which poses this exact question to the working group) has not been touched since the 2026-07-07 merge — no evidence it was ever sent to James/clinical reviewers, let alone answered |
| 4 | v2.3.0 promotion circumstances | Unanswered since 21 June | **Resolved** — see disagreement 2 above | as above |
| 5 | `Triage_Clinical_Review_Brief.md` Question B (blurred vision) | Unaddressed | **Unchanged — still unaddressed.** | Live `/api/system-prompt` today: still v2.3.0, same label as July. No v2.4.0 or later exists anywhere in the repo |
| 6 | SR-01/SR-02 sign-off | Blocking proxy merge | **Substance unchanged (still open, still no Turnstile/budget cap); description needs correcting** — see disagreement 3 above | as above |
| 7 | Business Requirements doc | Draft, zero approvals since 22 May | **Unchanged — still open**, and now independently probed | `instructions/verification-pass-instructions.md` (2026-08-09, brief) → `instructions/verification-report-2026-08.md` (output, committed today 2026-09-05) ran a full status check against BRD v3.1.1's claims — but v3.1.1 **still isn't in the repo** (only the v2 draft is). The pass found several items that should downgrade: GEN-008/TA-033 (Partial, and the Admin UI's publish-confirm dialog makes an outright false claim to the operator), TA-035 model pinning (Partial, alias not a dated snapshot), AD-002 (Not implemented), AD-003 (Partial), AD-007 (Partial) |
| 8 | Demonstrator page name (`crr-demonstrator.html` vs `crr-demo.html`) | Unconfirmed | **Unchanged.** Low-stakes — `crr-demo.html` is unambiguously the intended file; only a one-word confirmation is needed | No new reference to "crr-demonstrator" anywhere since July |
| 9 | AD-02/AD-03/AD-04 admin backlog items | No definition found anywhere | **Resolved — found, under a different ID format.** | The Aug verification report individually verifies **AD-002** (click-to-edit/drag-drop — Not implemented), **AD-003** (change review/approval — Partial), **AD-006** (publish→LLM automatic — blocked on TA-SRC-01), **AD-007** (version restore incl. regionalisation — Partial). These are 3-digit BRD item IDs; the July audit's grep for the 2-digit shorthand ("AD-02", "AD-03", "AD-04") is why it came up empty |
| 10 | Enhancements backlog file | Doesn't exist anywhere in repo | **Unchanged.** | `find -iregex '.*enhancements.*backlog.*'` still returns nothing |

### The 4 specific re-confirm checks (this brief's Part 1 instructions)

| Check | Result |
|---|---|
| Is TA-REG-01 still missing, or has a baseline been built? | A dedicated baseline was built 2026-07-12 (see above). TA-SRC-01 **implementation** itself is still not started: `triage/index.html:647` still `var API_BASE = ""`; live published criteria (`/api/version` today: `v4.1.2`, published 2026-07-23) still has **zero** `"mandatory"` or `"page"` fields anywhere — TA-SRC-01 design decisions 1 (page backfill) and 3 (mandatory flag) haven't been applied to the published data. **Note:** the criteria data itself moved from v4.1.0 → v4.1.2 between July and now with no release-log entry, and the live adult item count dropped from 331 to 320 (paediatric unchanged at 142; sites unchanged 31 adult / 22 paediatric) — worth a direct question to Gary about what that publish changed, since nothing in this repo documents it |
| Is v2.2.0 or v2.3.0 currently active? | **v2.3.0**, confirmed live today via `GET /api/system-prompt` (unchanged since 24 May) |
| Do `document-audit.md`, `PROJECT-STATUS.md`, `crr-roadmap.md` still incorrectly describe PDF Import as present? | Their content is unchanged (still says what it said), but all three were moved out of `instructions/` to `instructions/archive/` on 2026-07-12 — a cold-start session no longer reads them by default. **New instance found in a file neither of those audits checked for this**: `documents/CRR_Architecture_Briefing.md` — see disagreement 4 above |
| Has `instructions.superseded/` been created? | **No — but a functional equivalent has.** `instructions/archive/` was created 2026-07-12 in the same commit that filed the 3 PDF Import docs, and also holds `indication-groupings.md` (4 files total — exactly the June/July SUPERSEDED/OBSOLETE recommendations, minus `michaela-wood-usage-log-30may.json`, which went to `documents/exports/` instead). **This is a naming decision for Gary**, not a doc-drift finding: either keep `instructions/archive/` as the standing convention (rename this brief's target to match it) or create `instructions.superseded/` alongside it and consolidate. Recommendation below defaults to keeping `instructions/archive/` — least churn, and it's already doing the job correctly |

---

## 3.2 New files since 12 July

Full `git log --since=2026-07-13 --name-status` across `documents/`, `instructions/`, `instructions.complete/` shows far less churn than anticipated — 5 commits, one code fix (SR-08), and two unrelated `.github/` additions (Copilot/Mermaid instructions — outside this audit's scope, not classified here).

| File | Status | Evidence |
|---|---|---|
| `instructions/verification-report-2026-08.md` | **DONE, but unfiled — the one genuinely new item this pass exists to catch** | 189-line output of `instructions.complete/verification-pass-instructions.md`'s brief. Internally dated 2026-08-09; committed to git today (2026-09-05) — exactly the "resolved outside the repo, written up later" pattern this brief's own Why section anticipated. Evidence-dense, methodologically careful (flags its own false-negative correction on TA-012, distinguishes "not established" from "confirmed absent" throughout). **Needs a filing decision**: it reads like `documents/VERIFICATION-2026-06-21.md` (a governance-facing verification report that belongs in `documents/`), not like a brief's paired output that stays in `instructions.complete/`. Both precedents exist in this repo for different files — flagging rather than picking silently, per this brief's own Notes section |
| `instructions.complete/SR-08-url-handoff-finding.md` | **DONE, already correctly filed** | Added 2026-08-24 directly into `instructions.complete/`, alongside the fix commit. No action needed |
| `instructions.complete/verification-pass-instructions.md` | **DONE, already correctly filed** | Added to `instructions/` 2026-08-09, renamed into `instructions.complete/` 2026-08-24 in the same commit as the SR-08 fix. No action needed |
| `instructions/SECURITY_DECISIONS.md` | **Modified, not new** — pre-existing file, two updates since July | SD-09 added (2026-08-24: closes SR-08, records the sessionStorage/no-referrer pattern for future PMS integrations); SR-04/SR-05/SR-08 status lines updated. SR-01/SR-02/SR-03 remain the only open rows — see disagreement 3 above for a correction to SR-02's description |
| `documents/CRR_Test_Case_Results_Matrix_v2.xlsx` | **DONE (evergreen reference)** | Added 2026-07-12, same day as the July audit's own work (case registry refresh); referenced by `claude-code-brief-TA-REG-02-three-config-run.md`, `prompt-v3-phase0-audit.md`, `ta-prompt-01-brief.md`. Not previously formally classified; no action needed, noted for completeness |

**One coverage gap found in the July audit itself:** `instructions/claude-code-brief-TA-REG-02-three-config-run.md` was committed 2026-06-22 — after the June audit, before the July audit — and should have appeared in July's "12 new files" table but didn't. Classifying it now: **DONE** — it's the brief that specifies the TA-REG-02 three-config run; `scripts/reg02-runner.mjs` and `scripts/reg02-results.json` (210 rows, both configs) match its spec exactly.

**One reclassification from PARTIAL to DONE**, driven by the 12 July sign-off (disagreement/Needs-Gary item 2 above): `instructions/compound-criteria-design-brief.md`. The brief's deliverable — Phase 0 findings + Phase 1 design for Gary's review — is now accepted. Implementation is explicit future/out-of-scope work, same pattern as TA-PROMPT-01.

**Current file counts:** `documents/` 14 files (+2 subfolders: `exports/` 1, `reference/` 1) · `instructions/` 53 top-level files (+`archive/` 4, +`Prompt-Dev-Done/` 17) · `instructions.complete/` 9 · `instructions.superseded/` does not exist (see above).

---

## 3.3 Consolidated action list

### Move to `instructions.complete/` — verifiably DONE, old + new

From the June audit (recommended, never executed — re-confirmed still accurate today):
- `claude-code-brief-criteria-data-verification.md`
- `claude-code-brief-post-processing-validation.md` — **and its pair**, `run-post-processing-validation-test.mjs` (not explicitly listed in June, but the same completed one-off test; belongs alongside its brief)
- `claude-code-brief-prompt-v2.3.0-test.md`
- `claude-code-viewer-passive-mode-fix.md`
- `viewer-indication-fixes.md`
- `viewer-qa-redesign.md`
- `viewer-styling-pass.md`
- `criteria-data-quality-audit.md`
- `criteria-data-fix-verification-results.md`
- `criteria-data-verification-report.md`

New/reclassified this pass:
- `claude-code-brief-verify-flagged-items.md` — DONE, output `documents/VERIFICATION-2026-06-21.md` exists
- `claude-code-brief-project-audit-2026-07.md` — DONE, output is `documents/PROJ-AUDIT-2026-07.md` itself
- `claude-code-brief-TA-REG-02-three-config-run.md` — DONE (see coverage-gap note above)
- `TA-REG-02-proceed-instruction.md`, `TA-REG-02-correction-prompt-source.md` — DONE (July audit's own classification, still unfiled)
- `TA-REG-02-runner-json-only.md`, `TA-REG-02-full-run-go.md` — DONE-UNVERIFIED (July audit's own caveat stands: the JSON-only fix and the manual clinical REVIEW pass can't be confirmed from static files alone; archive anyway, the caveat travels with the file, not with its location)
- `compound-criteria-design-brief.md` — DONE (Phase 1 design now signed off; see reclassification note above). **Do not** move `compound-criteria-clinical-signoff.md` or `compound-criteria-phase0-findings.md` — the clinical circulation and Decision 6 ruling inside them are still open
- `prompt-v3-design.md`, `prompt-v3-phase0-audit.md`, `ta-prompt-01-brief.md` — DONE at design phase (July audit's own classification of TA-PROMPT-01, unchanged); implementation is explicitly separate future work

### Archive to `instructions/archive/`** — every file now SUPERSEDED or OBSOLETE

*(using the existing folder rather than creating a second one — see the naming decision above; rename this whole folder to `instructions.superseded/` instead if Gary prefers the brief's literal name)*

Already done (2026-07-12, confirmed present): `PROJECT-STATUS.md`, `crr-roadmap.md`, `document-audit.md`, `indication-groupings.md`. No new candidates found this pass beyond the ones the June audit already named and that remain unarchived:
- *(none outstanding — the June audit's SUPERSEDED/OBSOLETE list has been fully executed except for the one item below, which is a data export, not an instruction)*
- `michaela-wood-usage-log-30may.json` — already relocated to `documents/exports/` (2026-07-12), which is arguably the more correct home for a raw data export than either archive folder. No further action.

### Regression artefact retention — keep-list vs. archive-list

**Current active prompt: v2.3.0** (confirmed live today).

**Keep (current baseline / active work):**
- `system-prompt-v2.3.0.txt`, `prompt-v2.3.0-test-results.{json,md}`, `run-v230-regression-test.mjs`
- `prompt-v3-design.md`, `prompt-v3-phase0-audit.md` — moving to `instructions.complete/` per above, but flagged here too since they're the forward baseline for whatever comes after v2.3.0
- `scripts/ta-src-01-baseline-runner.mjs` + `scripts/reg_baseline_ta-src-01_20260712_01-{checkpoint,results}.json` — **must** be kept until TA-SRC-01 implementation actually ships and is diffed against this baseline; this is the gate artefact itself
- `scripts/reg02-runner.mjs`, `reg02-results.json`, `reg02-checkpoint.json`, `reg02-migration.sql` — current, actively cited

**Archive to `instructions/Prompt-Dev-Done/`** (orphaned v2.2.0 siblings — unchanged from June/July's recommendation, still not executed):
- `prompt-v2.2.0-infer-test-results.{json,md}`
- `prompt-v2.2.0-test-results-run2.{json,md}`
- `run-v220-infer-regression-test.mjs`
- `run-v220-regression-test-run2.mjs`

**Flagging, not recommending action (out of this brief's `documents/`/`instructions/` scope):** `scripts/reg02-checkpoint.dry-run-discarded.json` — filename says discarded; a scripts/ cleanup question for Gary separately, not part of this doc tidy-up.

### Keep in `instructions/` as still open

| File | What remains |
|---|---|
| `ta-src-01-brief.md`, `ta-src-design.md`, `ta-src-phase0-findings.md`, `ta-src-id-mapping.csv`, `ta-src-published-unmatched.csv` | TA-SRC-01 implementation checklist — confirmed still entirely unstarted today (`API_BASE=""`, no `mandatory`/`page` fields live) |
| `compound-criteria-clinical-signoff.md` | Not yet circulated to the working group; Decision 6 (`xrph_p2_3_p`) and 5 other rulings still needed |
| `compound-criteria-phase0-findings.md` | Same — Decision 6 still flagged "REQUIRES CLINICAL RULING" |
| `claude-code-brief-role-aware-view-step1.md` | Branch `feature/role-aware-view` still unmerged, parked behind clinical validation + SR-01/SR-02 sign-off |
| `SECURITY_DECISIONS.md` | SR-01, SR-02 (description needs correcting — see 3.1), SR-03 still open |
| `crr-business-rules.md`, `viewer-layout-and-styling.md`, `CRR-admin-reference.md` (documents/), `CRR-integration-guide.md` (documents/) | Unchanged since June/July — none touched since 2026-05-18 or earlier; low-urgency content fixes still pending (§7.4 region count, admin tab list, mode-layout description) |
| `documents/CRR_Architecture_Briefing.md` | **Escalated**: still governance-critical (loaded via CLAUDE.md) — needs its admin-tab list corrected (drop PDF Import, add Releases + System Prompts). The mode-params/tool-name/endpoint drift both prior audits flagged does **not** appear to exist in the current file (unchanged since 2026-05-15, predating both audits) — see below |
| `instructions/verification-report-2026-08.md` | Filing location decision (`documents/` vs `instructions.complete/`) — see 3.2 |

### Needs Gary's call

1. **A prior-audit correction, found this pass:** both the June and July audits describe `documents/CRR_Architecture_Briefing.md` as containing wrong mode params (`?mode=assess`/`?mode=reference`), a wrong tool name ("Criteria Explorer"), and a wrong endpoint (`/api/assess`). Direct grep of the current file (unchanged since 2026-05-15, before either audit) finds **none of these strings** — only the correct `?mode=passive`/`?mode=interactive`, `/api/triage/assess`, and "8 regions." Either both audits misread this file, or something about how it was read differs from what's on disk today. Worth 30 seconds of Gary's own eyes on the live file before this report's finding is fully trusted either way.
2. **Naming convention:** keep `instructions/archive/` as the standing "superseded" folder, or rename to `instructions.superseded/` per this brief's literal instruction? Recommend keeping `archive/` — it's already correctly populated and working.
3. **`instructions/verification-report-2026-08.md` filing location** — `documents/` (matches `VERIFICATION-2026-06-21.md` precedent) or `instructions.complete/` (matches its brief)? Recommend `documents/`.
4. **CC-DESIGN-01 Decision 6** and the other 5 clinical rulings in `compound-criteria-clinical-signoff.md` — has this been sent to James/the working group yet? No evidence of it in-repo.
5. **`Triage_Clinical_Review_Brief.md` Question B** — still no prompt-level answer. Same question as June/July: was a ruling ever made outside the repo?
6. **Business Requirements doc v3.1.1** — still not in the repo; the August verification pass could only check code/data directly, not diff against the BRD's actual current status text. Needed for an exact diff.
7. **SR-01/SR-02 sign-off** — substance unchanged (still no Turnstile/budget cap on the live public assess endpoint), but note the corrected mechanism description (3.1, item 3) before this gate is actually resolved.
8. **The unexplained criteria republish** (v4.1.0 → v4.1.2, 2026-07-23, no release-log entry, adult item count 331→320) — worth a direct check on what that publish changed, independent of TA-SRC-01.
9. **Demonstrator page name** — low-stakes, one-word confirmation that `crr-demo.html` is what "crr-demonstrator.html" always meant.
10. **Enhancements backlog file** — confirm it can be dropped from tracking, or point to where it actually lives.

---

## 3.4 Summary

**Before this pass would execute (current state):** `documents/` 14 + 2 subfolders · `instructions/` 53 top-level + `archive/` 4 + `Prompt-Dev-Done/` 17 · `instructions.complete/` 9 · no `instructions.superseded/`.

**After the moves above execute:** roughly 24 files move from `instructions/` into `instructions.complete/` (10 from June's backlog + 8 new/reclassified this pass + the post-processing test pair), 4 more move into `Prompt-Dev-Done/`, and `instructions/` drops to roughly 25 top-level files — almost entirely the genuinely open TA-SRC-01, compound-criteria, security, and content-drift items, plus this brief itself once Part 4 runs. No new folder is created (recommendation: reuse `instructions/archive/`, pending Gary's call).

**Plain-language state of the documentation:** The repo's *filing* has drifted (two full audits' worth of "move this" recommendations sat un-executed for ten weeks) but its *content* has not drifted nearly as much as the gap suggests — the 12 July session that closed out the last audit also happened to resolve four of its five open governance items in one sitting (CC-DESIGN-01 sign-off, TA-REG-01 baseline, v2.3.0 promotion rationale, PDF Import archival), and the August verification pass (committed only today) independently re-confirmed the code-level findings from scratch rather than trusting prior write-ups. What's left open is a short, real list — two clinical rulings, one unmerged security-gated branch, one still-unstarted TA-SRC-01 implementation, and one BRD sitting in permanent Draft — not a pile of unknowns. The one genuine surprise this pass turned up is that a specific, twice-repeated claim about the Architecture Briefing's drift doesn't hold up against the file as it exists today; that's worth Gary's own eyes before either this report or the two before it are taken as the last word on that file.
