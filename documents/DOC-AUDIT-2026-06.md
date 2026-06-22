# CRR Documentation Audit Report

**Date:** 2026-06-21 · **Method:** Read-only; no files written or modified
**Total files audited:** 70 (8 documents/ · 39 instructions/ incl. `.DS_Store` · 7 instructions.complete/ · 17 instructions/Prompt-Dev-Done/)

---

## Summary

| Status | Count |
|--------|-------|
| DONE | 28 |
| SUPERSEDED | 9 |
| PARTIAL | 6 |
| OPEN | 4 |
| OBSOLETE | 3 |
| UNKNOWN | 4 |

**Files needing Gary's decision (UNKNOWN):** `viewer-urgent-fixes.md`, `claude-code-data-load-instructions.md`, `Triage_Clinical_Review_Brief.md`, `viewer-ux-review-fixes.md` (Fixes 11 + 13 only)

---

## Full Table — OPEN / PARTIAL first, then UNKNOWN, then rest

### OPEN / PARTIAL

| File | Folder | Topic | Status | Evidence | Confidence |
|------|--------|-------|--------|----------|------------|
| `crr-roadmap.md` | instructions/ | Full roadmap: Track 1 pilot items + Track 2 FHIR/CQL migration | PARTIAL | Track 1 done items confirmed in release log; Track 2 entirely unchecked — no evidence of start | High |
| `crr-business-rules.md` | instructions/ | Business rules for criteria display, modes, copy output (v1.3, 2026-05-14) | PARTIAL | Substantially correct and actively used. One inaccuracy: §7.4 says "seven confirmed regional instances" — should be 8 (Canterbury/Central Plains `ccp` was added; viewer has all 8 in code) | High |
| `viewer-layout-and-styling.md` | instructions/ | Two-column layout, shared CSS, passive mode, harness width (17+ items) | PARTIAL | `crr-design-system.css` confirmed in shared/. Passive two-column layout confirmed (release log 2026-05-18). Items 16 (move identity to footer) and 19 (HP link in integration mode header bar) not confirmed — version still appears in header at viewer line ~312 | Medium |
| `viewer-ux-review-fixes.md` | instructions/ | Fixes 11–14: duplicate labels, passive checkboxes, pre-ticked urgency, instruction text | PARTIAL | Fix 12 (passive disables checkboxes) confirmed (release log 2026-05-18). Fix 14 (instruction text hidden in integration) confirmed (release log 2026-05-18). Fix 11 (duplicate P-code + timeframe labels in urgency view) and Fix 13 (Before-Referring items pre-ticked in urgency view) — no release log entry; status unknown | Medium |
| `claude-code-plan-ux-enhancements.md` | instructions/ | 11 UX enhancements UX-01 through UX-12 for triage + viewer | PARTIAL | UX-01 through UX-11 all confirmed in release log 2026-05-28. UX-12 (definitions inline): no release log entry; not in any checklist as completed | High |
| `document-audit.md` | instructions/ | Prior doc gap analysis (2026-05-12) | PARTIAL | Identified real drift in architecture briefing and admin ref. Many findings still unfixed: `CRR_Architecture_Briefing.md` mode params, tool name, endpoint paths, PII gate diagram still wrong. Now a historical record; issues it raised are partially still live | High |
| `documents/CRR_Architecture_Briefing.md` | documents/ | Architecture overview v0.3 for governance audience | PARTIAL | Core architecture accurate (Cloudflare Workers, D1/KV, decoupled design, PII pipeline). Documented drift remains unfixed: wrong mode params (`?mode=assess`/`?mode=reference` don't exist — should be `?mode=passive`/`?mode=interactive`), wrong tool name ("Criteria Explorer"), wrong admin tab count (~5 vs 9+), AI described as opt-in not primary path, wrong endpoint `/api/assess` not `/api/triage/assess`, "10 regions" not 8. §4.3 server-side PII gate diagram implies it exists; §9 admits it doesn't — the diagram is misleading. **This document is loaded in CLAUDE.md** — inaccuracies are fed to Claude on every session. | High |
| `documents/CRR-admin-reference.md` | documents/ | Admin infrastructure, auth, endpoints, D1 schema (last updated 2026-05-16) | PARTIAL | Auth architecture matches worker code exactly. D1 schema tables match. API endpoints largely accurate. Missing: Viewer Usage tab (added 2026-05-18), Releases tab (added ~same date), `viewer_events` D1 table and `/api/admin/viewer-events` endpoint, updated tool version numbers (shows Viewer v5.3.0, Triage v2.1.1, Admin v1.5.8 — all reset to v1.0.0 DEV on 2026-05-14) | High |
| `documents/CRR-integration-guide.md` | documents/ | URL params, postMessage contract, exam/site IDs, region keys | PARTIAL | URL params for viewer largely correct. Drift: mode=passive description says "Full-width single-column layout" — changed to two-column on 2026-05-18. Does not document that triage `/api/triage/assess` now accepts `claude-sonnet-4-6`. Otherwise postMessage contract and exam/site ID tables look current | High |
| `Triage_Clinical_Review_Brief.md` | documents/ | Open clinical questions for working group: CT Head P2 headache edge cases | OPEN | Questions A and B listed as open. No release log entry shows clinical rulings applied to system prompt. Prompt stored in D1 (external API) — can't verify from codebase alone. Awaiting clinical response from Tim/James/Alex | Low |
| `claude-code-data-load-instructions.md` | instructions/ | DB wipe-and-reload with new PDF criteria JSON + new item IDs + viewer INDICATION_THEME_MAP rebuild | OPEN (Part 2 unknown) | Part 3 (INDICATION_THEME_MAP rebuild) confirmed done at viewer line ~1179. Part 2 (actual wipe-and-reload from pdf-criteria-all.json): `pdf-criteria-all.json` not in repo; 2026-05-24 quality audit found 6 sites still missing from SITE_INDEX (`ct_other`, `us_fna_biopsy`, `xr_femur`, `xr_forearm`, `xr_humerus`, `xr_tibia_fibula`) | Low |

### UNKNOWN

| File | Folder | Topic | Status | Evidence | Confidence |
|------|--------|-------|--------|----------|------------|
| `viewer-urgent-fixes.md` | instructions/ | Fix 9 (expand arrows re-added regression), Fix 10 (not-funded items in tickable list) | UNKNOWN | viewer-indication-fixes.md implies fixes 6+7 were done but introduced regressions 9+10. No release log entry confirms either regression was resolved | Low |
| `viewer-ux-review-fixes.md` (fixes 11, 13) | instructions/ | Fix 11 (P-code prefix duplicate labels), Fix 13 (Before-Referring pre-ticked) | UNKNOWN | Fixes 12 and 14 confirmed in release log 2026-05-18. Fixes 11 and 13 not mentioned anywhere | Low |
| `claude-code-data-load-instructions.md` Part 2 | instructions/ | DB wipe-and-reload completion | UNKNOWN | Part 3 done; Part 2 unclear — 6 sites missing in May quality audit; unknown if fixed post-audit | Low |
| `Triage_Clinical_Review_Brief.md` | documents/ | Clinical ruling on CT Head P2 edge cases | UNKNOWN | Requires Gary to confirm whether clinical team responded and whether rulings were applied | Low |

### DONE

| File | Folder | Topic | Status | Evidence | Confidence |
|------|--------|-------|--------|----------|------------|
| `claude-code-brief-criteria-data-verification.md` | instructions/ | Brief for verifying 4 regression data gaps (RP-005, CR-002, LP-004, CR-003) | DONE | `criteria-data-verification-report.md` and `criteria-data-fix-verification-results.md` both exist with complete findings | High |
| `claude-code-brief-post-processing-validation.md` | instructions/ | Add deterministic post-processing verdict validation | DONE | triage/index.html: `postProcessingValidation()` function with `MET_PHRASES` and `_overrides` array confirmed present | High |
| `claude-code-brief-prompt-v2.3.0-test.md` | instructions/ | Run 20-case regression test on v2.3.0 prompt | DONE | `prompt-v2.3.0-test-results.md` + `.json` exist; 3 improved / 15 unchanged / 2 regressed vs v2.2.0 | High |
| `claude-code-viewer-passive-mode-fix.md` | instructions/ | Fix passive mode: unified two-column layout, indication toggle, mode toggle in footer | DONE | Release log 2026-05-18: "Both interactive and passive modes now use the same two-column layout"; "By indication / By urgency toggle now works in passive mode"; viewer: `id="modePassiveBtn"` present | High |
| `viewer-indication-fixes.md` | instructions/ | Fixes 1–8 for viewer indication display | DONE | File states fixes 1–5 and 8 already implemented. Release log 2026-05-28 confirms summary/verdict display changes (fixes 6+7). Note: 6+7 may have introduced regressions 9+10 per viewer-urgent-fixes.md | High |
| `viewer-qa-redesign.md` | instructions/ | Build viewer QA modal, D1 table, admin tab | DONE | viewer/index.html: `ceQaModal` div + posts to `/api/qa-viewer-review`; admin: `{id:"viewerqa"}` tab; `CRR-admin-reference.md` documents `qa_viewer_reviews` D1 schema | High |
| `viewer-styling-pass.md` | instructions/ | Extract shared CSS to crr-design-system.css | DONE | `/crr-criteria/shared/crr-design-system.css` confirmed present; both viewer and triage reference it | High |
| `criteria-data-quality-audit.md` | instructions/ | Output of data quality investigation (2026-05-24) | DONE (archive) | Investigation completed; still useful as record of 6 missing sites | High |
| `criteria-data-fix-verification-results.md` | instructions/ | Output confirming RP-005, CR-002, CR-003, LP-004 fixes | DONE (archive) | Output document dated 2026-05-24 | High |
| `criteria-data-verification-report.md` | instructions/ | Layer-by-layer verification report | DONE (archive) | Root causes identified; fixes applied | High |
| `run-post-processing-validation-test.mjs` | instructions/ | One-shot test for post-processing validation (RP-002, CR-003, LP-001, LP-002, thunderclap) | DONE | Implementation confirmed in triage; one-off verification runner | High |
| `prompt-v2.3.0-test-results.json` | instructions/ | v2.3.0 regression results (JSON) | DONE (current baseline) | Most recent test run; retain | High |
| `prompt-v2.3.0-test-results.md` | instructions/ | v2.3.0 regression results (Markdown) | DONE (current baseline) | Retain | High |
| `documents/buildnotes.md` | documents/ | Build gotchas: deploy sequence, CF Access rules, CORS/sendBeacon, D1 remote, Safari compat | DONE (evergreen) | All entries match current state: `run_worker_first` confirmed; `keepalive:true` pattern confirmed; accurate and useful | High |
| `documents/CRR_Release_Log.md` | documents/ | Release log (newest-first from 2026-05-16) | DONE (evergreen, needs update) | Well-maintained through 2026-06-14. Needs entry for today's triage v1.1.0 model update | High |
| `documents/CRR_PII_Detection_AutoRedaction_Spec_v0.2.md` | documents/ | 4-stage PII pipeline spec | DONE (governance reference) | Architecture Briefing §4.3 confirms pipeline exists and matches spec. Retained as clinical governance record | Medium |
| `admin-auth-fix-summary-2026-05-16.md` | instructions.complete/ | Auth fix: run_worker_first, CF Access wildcard, session duration | DONE | worker/index.ts confirms all fixes; no debug-headers route in current worker (cleanup done) | High |
| `claude-code-brief-TA-009-system-prompt-versioning.md` | instructions.complete/ | Move system prompt to D1 with version control | DONE | triage/index.html line ~799: `fetch('.../api/system-prompt')`; `loadedPrompt` with version shown in session info; D1 `system_prompts` table in release log 2026-05-24 | High |
| `claude-code-compound-mockup-brief.md` | instructions.complete/ | Build compound-mockup.html prototype | DONE | `/crr-criteria/compound-mockup.html` exists; release log 2026-05-18 | High |
| `claude-code-integration-selectors.md` | instructions.complete/ | Show modality/site selectors in integration mode | DONE | Release log 2026-05-18: "Integration interactive mode now shows modality radio buttons and exam site checkboxes"; "Sites pre-selected by URL params show a 'from referral' badge" | High |
| `claude-code-viewer-telemetry.md` | instructions.complete/ | Viewer usage telemetry: viewer_events table, API, admin tab | DONE | viewer: `logViewerEvent()` function; `vsess_` session IDs; HP link click logging; admin: `{id:"viewerusage",label:"Viewer Usage"}` tab; release log 2026-05-18 | High |
| `security-audit-instruction.md` | instructions.complete/ | Security audit before external testers | DONE | `SECURITY-AUDIT-REPORT.md` confirmed at project root | High |
| `triage-qa-redesign.md` | instructions.complete/ | Triage QA modal redesign + D1 storage + admin tab | DONE | admin: `{id:"qa",label:"Triage QA"}` tab; triage: posts to `/api/qa-review`; D1 schema in admin reference | High |

### SUPERSEDED / OBSOLETE

| File | Folder | Topic | Status | Evidence | Confidence |
|------|--------|-------|--------|----------|------------|
| `indication-groupings.md` | instructions/ | Item-ID → clinical theme mapping using old IDs | SUPERSEDED | Old IDs (`usa_48_1`, `usp_24_1` etc.) no longer exist. New IDs (`usab_*`, `uspv_*` etc.) documented in `claude-code-data-load-instructions.md`; new `INDICATION_THEME_MAP` built at viewer line ~1179 | High |
| `prompt-v2.2.0-infer-test-results.json` | instructions/ | v2.2.0 infer mode results | SUPERSEDED | v2.3.0 is most recent test run | High |
| `prompt-v2.2.0-infer-test-results.md` | instructions/ | v2.2.0 infer mode results | SUPERSEDED | Same | High |
| `prompt-v2.2.0-test-results-run2.json` | instructions/ | v2.2.0 run 2 results | SUPERSEDED | Same | High |
| `prompt-v2.2.0-test-results-run2.md` | instructions/ | v2.2.0 run 2 results | SUPERSEDED | Same | High |
| `run-v220-infer-regression-test.mjs` | instructions/ | Test runner for v2.2.0 infer mode | SUPERSEDED | Replaced by `run-v230-regression-test.mjs` | High |
| `run-v220-regression-test-run2.mjs` | instructions/ | Test runner for v2.2.0 run 2 | SUPERSEDED | Same | High |
| `system-prompt-v2.3.0.txt` | instructions/ | v2.3.0 prompt text | SUPERSEDED (test artifact) | v2.3.0 not promoted to production — v2.2.0 is active in D1 per release log 2026-05-24. v2.3.0 had 2 regressions (LP-004, CR-003). Authoritative prompt is in D1. | High |
| `PROJECT-STATUS.md` | instructions/ | Project status snapshot (2026-04-18) | SUPERSEDED | Every "blocking" and "in-progress" item resolved. Admin tab count wrong (5 vs 9+), viewer version wrong (v4.2.0 vs v1.0.0 DEV), deployment notes contradict current practice | High |
| `documents/README.md` | documents/ | Old standalone deployment guide | SUPERSEDED | Describes `cd crr-criteria/` deploy (contradicts current practice), `/api/seed` endpoint (doesn't exist), `migration-output/` files (not in repo), only 4 exam types. Superseded by `buildnotes.md` + `CRR-admin-reference.md` | High |
| `michaela-wood-usage-log-30may.json` | instructions/ | Usage log export for one user (2026-05-30) | OBSOLETE | Raw data export; no instruction content; belongs in an exports folder if kept at all | High |
| `claude-code-work-items.md` | instructions/ | Original 6-item work list (pre-integration architecture) | OBSOLETE | All 6 items completed; references `popup.html` as live (it's not); predates current architecture | High |
| `claude-code-brief-docs-tidy-up.md` | instructions/ | This brief | DONE (meta) | Report is the output | — |

### instructions/Prompt-Dev-Done/ — all correctly archived

| File | Topic | Status |
|------|-------|--------|
| `claude-code-brief-prompt-v1.1.0-regression-test.md` | v1.1.0 regression test brief | DONE (historical) |
| `claude-code-brief-prompt-v2.0.0-regression-test.md` | v2.0.0 regression test brief | DONE (historical) |
| `prompt-v1.1.0-test-results.{json,md}` | v1.1.0 results | DONE (historical) |
| `prompt-v2.0.0-test-results.{json,md}` | v2.0.0 results | DONE (historical) |
| `prompt-v2.1.0-test-results.{json,md}` | v2.1.0 results | DONE (historical) |
| `prompt-v2.2.0-test-results.{json,md}` | v2.2.0 run-1 results | DONE (historical) |
| `run-regression-test.mjs` | Original test runner | SUPERSEDED (historical) |
| `run-v200-regression-test.mjs` | v2.0.0 runner | DONE (historical) |
| `run-v210-regression-test.mjs` | v2.1.0 runner | DONE (historical) |
| `run-v220-regression-test.mjs` | v2.2.0 run-1 runner | DONE (historical) |
| `system-prompt-v2.0.0.txt` | v2.0.0 prompt | DONE (historical) |
| `system-prompt-v2.1.0.txt` | v2.1.0 prompt | DONE (historical) |
| `system-prompt-v2.2.0.txt` | v2.2.0 prompt (current prod) | DONE (reference — current prod) |

---

## Per-File Recommendations

### Safe to archive — move from `instructions/` to `instructions.complete/` in one batch

These are briefs or investigation outputs for verifiably completed work:

- `claude-code-brief-criteria-data-verification.md`
- `claude-code-brief-post-processing-validation.md`
- `claude-code-brief-prompt-v2.3.0-test.md`
- `claude-code-viewer-passive-mode-fix.md`
- `claude-code-work-items.md`
- `viewer-indication-fixes.md` (fixes 1–8 confirmed; regressions 9+10 tracked in viewer-urgent-fixes.md)
- `viewer-qa-redesign.md`
- `viewer-styling-pass.md`
- `criteria-data-quality-audit.md`
- `criteria-data-fix-verification-results.md`
- `criteria-data-verification-report.md`
- `document-audit.md` (historical record; issues it raised partially still live but the doc itself is done)
- `PROJECT-STATUS.md` (entirely stale snapshot)

### Superseded/obsolete — can be deleted or moved to `Prompt-Dev-Done/`

- `indication-groupings.md` — old item IDs no longer exist in DB; INDICATION_THEME_MAP rebuilt from new IDs
- `prompt-v2.2.0-infer-test-results.*` (×2) + `prompt-v2.2.0-test-results-run2.*` (×2) — orphaned v2.2.0 siblings; move to `Prompt-Dev-Done/` where run-1 equivalents already live
- `run-v220-infer-regression-test.mjs` + `run-v220-regression-test-run2.mjs` — superseded by run-v230; move to `Prompt-Dev-Done/`
- `michaela-wood-usage-log-30may.json` — raw data export, not an instruction; delete or move to an exports folder
- `documents/README.md` — describes a deployment workflow that no longer applies; `buildnotes.md` supersedes it

### Still open — ordered by urgency

**1. `viewer-urgent-fixes.md` (UNKNOWN — may be active regressions)**
Fix 9 (expand arrows re-appeared after indication display rework) and Fix 10 (not-funded items in the tickable checkbox list). These are visual/functional regressions introduced during the indication display overhaul. No release log entry confirms either was resolved. If not done, they affect current clinical usability.

**2. `claude-code-data-load-instructions.md` Part 2 (UNKNOWN)**
The DB wipe-and-reload from `pdf-criteria-all.json` may not have been completed — the May quality audit found 6 sites missing from SITE_INDEX (`ct_other`, `us_fna_biopsy`, `xr_femur`, `xr_forearm`, `xr_humerus`, `xr_tibia_fibula`). If those sites are still absent, any referral involving them will fail to match criteria.

**3. `viewer-ux-review-fixes.md` Fixes 11 + 13 (UNKNOWN)**
Fix 11 (duplicate P-code + timeframe prefix labels in urgency view headers) and Fix 13 (Before-Referring items pre-ticked in urgency view). Fixes 12 and 14 confirmed done; 11 and 13 not mentioned anywhere.

**4. `Triage_Clinical_Review_Brief.md` — awaiting clinical input**
Questions A and B on CT Head P2 headache (progressive worsening without baseline; blurred vision as objective deficit) remain open as posed. No prompt update recorded. If Tim/James/Alex responded and the ruling was applied, this can be archived.

**5. `documents/CRR_Architecture_Briefing.md` — governance-critical drift**
Multiple inaccuracies that matter if shared with HNZ Digital or cybersecurity reviewers: wrong mode params (`?mode=assess` / `?mode=reference` — don't exist), wrong tool name ("Criteria Explorer"), wrong endpoint (`/api/assess` not `/api/triage/assess`), wrong admin tab count, "10 regions" not 8. The server-side PII gate diagram is the most misleading — it shows a gate that §9 admits doesn't exist. **Also loaded in CLAUDE.md — inaccuracies propagate into every Claude session.**

**6. `crr-business-rules.md` §7.4 — one-line fix**
"Seven confirmed regional instances" should be eight.

**7. `documents/CRR-admin-reference.md` — three missing items**
Viewer Usage tab, Releases tab, `viewer_events` endpoint, and tool version numbers all need updating.

**8. `documents/CRR-integration-guide.md` — mode layout drift**
Mode=passive layout description outdated since 2026-05-18; also doesn't document `claude-sonnet-4-6` model param.

**9. `crr-roadmap.md` Track 1 remaining items**
P2 (HP link in integration mode header bar) unconfirmed. Track 2 (FHIR/CQL) is future work, not urgent.

**10. `claude-code-plan-ux-enhancements.md` UX-12**
Definitions inline — no evidence of implementation. Lowest urgency.

### Needs Gary's decision — one question each

1. **`viewer-urgent-fixes.md`** — Were Fix 9 (expand arrows removed) and Fix 10 (not-funded items excluded from tickable list) implemented? If not, these are live regressions.

2. **`claude-code-data-load-instructions.md`** — Was the DB wipe-and-reload from `pdf-criteria-all.json` completed? The 6 sites missing in the May quality audit — are they still missing, or were they fixed after the audit was written?

3. **`Triage_Clinical_Review_Brief.md`** — Did Tim/James/Alex respond to Questions A and B? If yes, were the rulings incorporated into a system prompt update?

4. **`viewer-ux-review-fixes.md` Fixes 11 + 13** — Were these implemented? Fixes 12 and 14 are confirmed in the release log; 11 and 13 are not mentioned anywhere.

---

## Regression File Retention Note

**Current prod prompt:** v2.2.0 (confirmed active in D1 per release log 2026-05-24)

**v2.3.0 status:** Tested only — 3 improved / 2 regressed (LP-004, CR-003 regressed). Not promoted to production.

**Keep in `instructions/` (current baseline):**
- `prompt-v2.3.0-test-results.{json,md}` — most recent test run; needed to compare against any v2.3.1 / v2.4.0
- `run-v230-regression-test.mjs` — current test runner template
- `system-prompt-v2.3.0.txt` — keep if v2.3.0 may be fixed and promoted; move to `Prompt-Dev-Done/` if a new v2.4.0 is authored instead

**Move to `Prompt-Dev-Done/` (orphaned v2.2.0 siblings — run-1 equivalents already live there):**
- `prompt-v2.2.0-infer-test-results.{json,md}`
- `prompt-v2.2.0-test-results-run2.{json,md}`
- `run-v220-infer-regression-test.mjs`
- `run-v220-regression-test-run2.mjs`

`Prompt-Dev-Done/` is correctly structured for v1.1.0 through v2.2.0 run-1 artifacts. The four files above are the only orphans.
