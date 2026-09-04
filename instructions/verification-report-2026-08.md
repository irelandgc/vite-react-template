# Verification Pass — BRD v3.1.1 statuses and evaluation counts

**Date:** 2026-08-09
**Type:** Read-only investigation. No code, data, or documents were modified.
**Scope note:** The instructions reference `CRR_Tool_Suite_Business_Requirements_DRAFT_v3_1_1.docx`. That file does not exist in this repository — only `documents/CRR_Tool_Suite_Business_Requirements_DRAFT_v2.docx` is present, and its table structure did not extract reliably enough to safely quote current per-item status text. **I have not compared findings against a specific "current status" string for any item** — every verdict below is this investigation's independent finding against the running code/data, not a diff against a quoted BRD cell. Where the BRD's current status matters, get me the actual v3.1.1 file and I'll do the line-by-line diff.

**Access note:** D1 queries were initially blocked — the local wrangler CLI was authenticated to a Cloudflare account (`547305b23d4ab7840913e9c6356adbeb`, gary.ireland@email.com) that does not own the `crr-criteria` D1 database. You logged into a different account (`fk4dsrmq5r@privaterelay.appleid.com`, account `13d95cc559c1c6a7e6808d279d668b75`) mid-session, which resolved it. All Part A queries below ran successfully against the remote `crr-criteria` database under that account.

---

## Part A — D1 evaluation counts

### A1. Schema

Tables in the live `crr-criteria` D1 database (`SELECT name FROM sqlite_master WHERE type='table'`):
`_cf_KV, criteria, versions, sqlite_sequence, audit_log, qa_reviews, qa_viewer_reviews, triage_usage_log, releases, viewer_events, system_prompts, system_prompt_audit`.

**`triage_usage_log`** (`PRAGMA table_info`): `id, timestamp, session_id, user_name, user_role, exam_identified, verdict, model_used, documentation_standard, input_tokens, cache_read_tokens, cache_write_tokens, output_tokens, cost_nzd, presentation_text, ai_response_summary, ip_address, ai_response_json, prompt_version, parse_success, temperature, source, regression_run_id`.

**`qa_reviews`**: `id, timestamp, session_id, reviewer_name, reviewer_role, scenario_type, score_criteria_id, score_suggestion_quality, score_compound_handling, score_safety_redirect, overall_assessment, comments, presentation_text, ai_response_summary, exam_identified, model_used, documentation_standard, region, ip_address, ai_response_json, prompt_version`.

**Gap found:** `public/crr-criteria/api/schema.sql` (the checked-in schema file) does **not** define `triage_usage_log.source` or `.regression_run_id`, both of which exist on the live table and are actively written by `worker.ts:1037` (`source`, `regression_run_id` columns). The committed schema file is stale relative to the deployed database — at least one migration was applied directly without updating `schema.sql`.

### A2. Total assessments

`SELECT COUNT(*), MIN(id), MAX(id) FROM triage_usage_log` → **736 rows, id 1–736, no gaps**. This exceeds 138 by a wide margin, consistent with the results matrix referencing ids up to 366.

**What "138" referred to:** not established. No document in the repo defines it. I could not reconstruct it exactly — candidates I checked and ruled out or couldn't confirm: raw non-internal evaluator rows (122, see A3/A4), the corrected evaluator figure your own prior work used (117, per project memory — not independently re-derived from a document in this pass), and combinations thereof. None equals 138 exactly. **What would settle it:** find the governance document/slide where "138" was first written and check its date — it's likely a count taken at an earlier point in time, before later assessments accrued, rather than a different population.

### A3. Breakdown by source/type

| Category | Rows | Evidence |
|---|---|---|
| Regression/automated runs (`source='regression'`) | 310 | 3 named runs: `TA-REG-02-A-20260621` (111), `TA-REG-02-B-20260621` (109), `reg_baseline_ta-src-01_20260712_01` (90) |
| Internal/test runs by Gary (`source IS NULL`, `user_name LIKE '%Gary%'`) | 304 | Names: "Gary Tester" (229+5), "Gary Ireland" (46+1), "Gary Ireland (Testing)" (18), "Gary" (5) |
| Clinician evaluation sessions (`source IS NULL`, non-Gary named) | 122 | See A4 |
| Null/blank evaluator | **0** | No row has null or empty `user_name` |

304 + 122 + 310 = 736. The three populations are cleanly separable by `source` and a `user_name LIKE '%Gary%'` filter, with no leftover/unclassified rows.

### A4. By evaluator (excluding internal Gary rows and regression)

122 rows, 15 distinct `user_name` values:

| Evaluator | Role | n |
|---|---|---|
| Libby Prenton | GP liason | 31 |
| Michaela Wood | PCRL | 24 |
| Campbell Brebner | GP | 14 |
| Rhys Parry | PCRL | 14 |
| Danielle Gerrard | TMT Community Radiology Lead | 6 |
| di Davis | GP | 6 |
| lp | GP | 6 |
| robyn Barnes | GP | 5 |
| Claire Russell | urgent care | 4 |
| Louise Poynton | GP | 4 |
| Salmon | Nurse Practitioner | 3 |
| stu | Radiologist | 2 |
| Craig Milligan | PM | 1 |
| M | GP | 1 |
| blah | GP | 1 |

**Judgement call flagged, not made silently:** "lp" (6), "stu" (2), "M" (1) and "blah" (1) — 10 rows — are free-text name fields a user typed into a browser prompt (see `getOrPromptUserIdentity`, triage/index.html), not verified identities. "lp" is plausibly Libby Prenton typing shorthand; "blah" is plausibly a throwaway/test entry. This is exactly the kind of merge/exclusion decision that would take the raw 122/15 figure down toward a smaller reported figure — I'm not making that call here, just surfacing the raw, undecided breakdown as requested.

### A5. Compare-mode double-counting — confirmed: **two rows per submission**

Code evidence: `runComparison()` (triage/index.html:3108) calls `callModelForComp(SONNET_46_MODEL, ...)` and `callModelForComp(OPUS_MODEL, ...)` as two independent calls, each running the full `callTriageAPI()` → `logTriageUsage()` path — i.e. two separate `INSERT`s.

Data evidence, directly confirming this in the live table: rows id 220 (`claude-sonnet-4-20250514`, 05:31:50.620Z) and 221 (`claude-opus-4-20250514`, 05:31:53.973Z) carry **identical `presentation_text`** ("Neck and thyroid ultrasou...") 3 seconds apart, same `session_id`. Same pattern at ids 222/223.

`model_used='claude-opus-4-20250514'`: 22 rows, all `source IS NULL`. The UI has no standalone Opus selector (only one `model-toggle-btn`, "Sonnet 4.6" — triage/index.html:310) — Opus only appears via compare mode. So **22 rows = 22 compare-mode submissions**, each also producing a paired Sonnet row.

By user: Michaela Wood (11 opus rows = 11 compare submissions), Gary Tester (10), Gary Ireland (Testing) (1).

**Clinician counts both ways:**
- Assessments logged (rows): 736 total; 122 non-internal, non-regression.
- Distinct submissions: 736 − 22 = **714** total (subtracting one row per compare-mode pair); for the 122 non-internal figure, only Michaela Wood used compare mode (11 pairs), so 122 rows = **111 distinct submissions** for that population.

### A6. Distinct cases vs assessments

Grouped by exact `presentation_text` match:
- All 736 rows → **161 distinct notes**.
- The 122 non-internal, non-regression rows → **84 distinct notes**.

Caveat: this is exact-string matching. A note re-typed with even a single character different, or re-submitted after PII auto-redaction changed the text slightly, will not collapse — so 161/84 are likely slight *undercounts* of re-run consolidation (i.e., true distinct-case counts may be marginally lower still). Compare-mode pairs (identical text, different model) correctly collapse to one distinct note in this count.

### A7. QA reviews

- `qa_reviews` (Triage Advisor): **38 rows, 10 distinct `reviewer_name` values** — but 4 of those 10 are Gary variants under different self-typed roles ("Gary - Testing" ×3 roles, "Gary Tester"), totaling 9 rows. Real named non-Gary reviewers: Rhys Parry (9), Danielle Gerrard (5), Claire Russell (4), Louise Poynton (4), Campbell Brebner (2), Craig Milligan (1), Michaela Wood (1) = 7 people, 26 rows. Plus 1 fully blank row (`reviewer_name=''`).
- `qa_viewer_reviews` (Criteria Viewer): **22 rows, 5 distinct `reviewer_name` values** — Gary variants account for 8 rows across 3 self-typed roles; real named reviewers: Claire Russell (9), Louise Poynton (3), Craig Milligan (1), Danielle Gerrard (1) = 4 people, 14 rows.

**What can/can't be cleanly separated:** Source/type (A3) and compare-mode pairing (A5) separate cleanly on stored columns (`source`, `model_used` + timestamp/text adjacency) with zero ambiguous leftover rows. Evaluator identity (A4, A7) does **not** separate cleanly — `user_name`/`reviewer_name` are free-text fields with no canonical ID, so "Libby Prenton" vs "lp", and "Gary - Testing" logged under four different self-selected roles, are reconciled by judgement, not by the schema.

---

## Part B — BRD status verification

### GEN-003 / NFR-008 — PII auto-redaction & NHI detection
Status: **✓ Implemented** (client-side only — see server-side note below)
Evidence: `triage/index.html:1050-1174` (`detectAndRedactPII`) runs a pre-correction pass (fixes PII-relevant typos so patterns aren't missed, lines 1055-1088), then detects and **replaces** NHI/name/DOB/address/phone/email/referrer patterns with `[X REDACTED]` tokens in the same string it returns. This is genuine auto-redaction, not detect-and-warn: `runCheck()` (line 1284) never sends the original note if PII is found — it shows the user the redacted version for confirmation (`_showPIIReview`, line 1193) and only `lastNote = redactedNote` (line 1236) is ever passed to `callTriageAPI()`. The unredacted original is discarded, never transmitted.
NHI validation: both formats covered — `_validateNHIOld` (mod-11, line 1025) and `_validateNHINew` (mod-23, line 1036, with a documented mod-24 legacy fallback for "test/sample NHIs generated before correction"). Unlabelled new-format matches require check-digit validation to fire (reduces false positives); labelled/old-format matches redact on pattern alone.
Server-side: **no equivalent gate exists.** `grep -n "pii|PII|redact|nhi|NHI" api/worker.ts` returns zero matches. `/api/triage/assess` (worker.ts:620) accepts and forwards any request body to Anthropic with no PII check — a direct API call (curl, script) bypasses the client-side pipeline entirely. This matches the architecture briefing's own §9 recommendation 6 (server-side gate "not yet implemented").
Test coverage: **none.** No test files exist anywhere in the repository (`find ... -iname "*test*"` returns only an unrelated .xlsx), and `package.json` has no `test` script. There is no automated verification that the redaction regexes work, regress, or cover new PII patterns.

### GEN-002 / NFR-007 / TA-026 — What is stored
Status: **Partial**
Evidence: `triage_usage_log.presentation_text` and `qa_reviews.presentation_text` store free text (schema confirmed live, A1 above). Tracing what text actually lands there: `logTriageUsage()` (triage/index.html:2614) writes `result._originalNote || lastNote`, and `result._originalNote` is set at `callTriageAPI()` line 2820 to the `note` parameter it was *called with* — which is always `lastNote`, i.e. the **post-redaction** text (or the original text unchanged, if no PII was found in it). So in the normal flow, what's stored is de-identified — the naming (`_originalNote`) is misleading internally but does not indicate a leak; I traced the actual value, not just the variable name.
Gap: this holds only as far as the client-side redaction pipeline is complete. Since there is no server-side gate (see GEN-003) and no test coverage confirming redaction regex correctness, a note containing a PII pattern the client-side regexes miss (e.g. a name that doesn't match `Mr/Mrs/Ms` + capitalised-word patterns, or an NHI typo that also fails the fallback pattern) would be logged verbatim to D1 with no downstream check to catch it.
Retention/purge: **none found.** No `DELETE`, TTL, or scheduled-cleanup logic exists anywhere in `worker.ts` for `triage_usage_log`, `qa_reviews`, or `qa_viewer_reviews` (only KV rate-limit keys carry `expirationTtl`). Data persists indefinitely — 736 rows going back to at least 2026-05-22 are all still present.

### GEN-008 / TA-033 / TA-SRC-01 — Publishing
Status: **Partial — and the Admin UI's own confirmation dialog overstates it**
Evidence: The Admin tool's Publish button calls `POST /api/admin/publish` (admin/index.html:204, `handlePublish`), sending `{versionLabel, notes, data: fullData}` — **no `matchData` field**. Server-side (`worker.ts:338-394`), this route writes `criteria:published` (used by the Viewer) unconditionally, and `criteria:match-data` only `if (body.matchData)` — which the Admin UI never supplies. The pre-publish confirm dialog (admin/index.html:726) tells the user: *"Both Criteria Viewer and Triage Advisor will immediately serve the updated criteria"* — this is not accurate for the Triage Advisor.
Triage Advisor's actual data source: `triage/index.html:645` sets `var API_BASE = ""`. The runtime data-loading code (`triage/index.html:656-660`) only attempts `fetch(API_BASE + "/api/match-data")` `if (API_BASE)` — an empty string is falsy, so **this fetch never executes in production**; it falls straight through to `MATCH_DATA = EMBEDDED_MATCH_DATA` (line 676), a JSON blob compiled into the HTML file at build time (`triage/index.html:648`, 39 sites: 25 adult + 14 paediatric, confirmed by direct count).
This is corroborated by your own `instructions/SECURITY_DECISIONS.md` (SD-06, SR-04 — see B4) and by commit `2cc1f38`, which explicitly states: *"Production Triage Advisor doesn't read this path (it uses the compile-time embedded constant per SD-06)."*
Live drift confirmed directly: `GET https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/version` currently returns `criteriaCount: 31` (published 2026-07-23), while the embedded constant baked into the currently-deployed `triage/index.html` has 39 site entries — different counts, meaning the embedded copy the Triage Advisor actually runs on is **not** the current published criteria set. (I also compared the live `/api/match-data` KV blob byte-for-byte against the current embedded constant — they are identical, meaning the KV key nobody's publish flow touches happens to still mirror the stale embedded copy, purely because both were last hand-seeded together, not because they're kept in sync.)
Gap: a single "Publish" click updates the Viewer's live data but has **no effect whatsoever** on what the Triage Advisor actually assesses against, and the UI tells the operator otherwise.

### TA-035 / TA-036 — Model and prompt governance
Status: **Partial**
System prompt versioning: **✓ real, demonstrated working**, not just a table that exists. Live query of `system_prompts` shows 6 versions (1.0.0 → 2.3.0), `is_active=1` correctly on 2.3.0 only; `system_prompt_audit` shows create/activate actions with `previous_version` chaining. `GET /api/system-prompt` (public, unauthenticated) currently returns version `2.3.0`, label "Verdict consistency check + general-vs-specific pathway rule + clinical severity override fix" — confirmed live, matching the D1 row. Rollback path exists at code level (`POST /api/admin/system-prompt/rollback/:version`, worker.ts:826) using the same activate/deactivate/audit-write logic as promotion; I did not exercise it live (would require the admin key and would mutate the live active prompt — out of scope for a read-only pass).
Gap in attribution: `created_by`/`activated_by` on system-prompt actions are free-text fields taken directly from the POST body (worker.ts:777-823), not the `actorFrom(c)` CF-Access-verified attribution used for criteria edits (worker.ts:154-158). The live audit rows show `performed_by` values of `"system"`, `"admin"`, `"claude-code"` — self-reported strings, not verified identities. This is weaker than the criteria audit trail.
Independent corroboration of a known gap: `system_prompt_audit` has an `activate` row for 2.3.0 dated **2026-06-03**, but the version's own `created_at` is **2026-05-24**. This 10-day gap between when 2.3.0 actually went live (per `instructions/SECURITY_DECISIONS.md` SD-07: "promoted to production on 2026-05-24") and when its activation was logged is a second, independent piece of evidence for the governance gap SD-07 already records ("no decision record was made at the time").
Model pinning: **not pinned to a dated snapshot.** `triage/index.html:3074-3075` define `OPUS_MODEL = 'claude-opus-4-8'` and `SONNET_46_MODEL = 'claude-sonnet-4-6'` — both alias-style identifiers with no dated snapshot suffix (contrast with the historical `claude-sonnet-4-20250514`, visible in 336 older D1 rows, which *was* a dated pin before being "retired" per the changelog comment at line 610). This is a recorded, open risk: `SECURITY_DECISIONS.md` SR-05, "Model alias drift... behaviour can change without a decision record," status Open.
Additional flag not in the brief but directly relevant: `TRIAGE_TEMPERATURE = 0.1` (triage/index.html:790) is sent on every call. CLAUDE.md's own Model Boundaries section notes newer Sonnet versions may reject `temperature: 0.1` with a 400 error. Combined with SR-05 (the model alias can silently move to a newer snapshot), this is a live latent-failure risk: if the alias resolves to a version that rejects this temperature, every assessment would start failing with no code change on this side to explain it. I did not find evidence in the code of this having already happened; flagging as a risk, not an observed incident.
Regression routing: **✓ confirmed correct.** Both `scripts/reg02-runner.mjs` and `scripts/ta-src-01-baseline-runner.mjs` hit `ASSESS_URL = 'https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/triage/assess'` — the Worker API, not the Anthropic API directly. This satisfies CLAUDE.md's Production Safety rule.

### B5 — Flagged items, confirmed individually

**CV-019 — send-to-referral-form (postMessage/callback):** ✓ Implemented. `handleSendToForm()` (viewer/index.html:2576) posts `{type:'crr-output', text, source:'viewer'}` to `window.parent` (modal/iframe embed) or `window.opener` (popup), with UI feedback ("✓ Sent") and auto-close. Both integration modes are wired to a real button, not dead code.

**CV-024 — QA review submission from the Viewer:** ✓ Implemented. Submission handler (viewer/index.html:~2730-2767) posts to `https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/qa-viewer-review`, and the server route (worker.ts:508-564) inserts into `qa_viewer_reviews` with IP-based rate limiting (100/hr). Confirmed 22 real rows exist in D1 (A7).

**TA-010 — documentation standard setting (strict vs inferred):** ✓ Implemented, and configurable without a code change. `setDocMode(mode, btn)` (triage/index.html:871) is bound to two UI buttons (`#modeStrict`/`#modeInferred`); it's a per-session runtime toggle defaulting to `'strict'` (line 791), not a build-time constant.

**AD-002 — click-to-edit and drag-and-drop in the Admin tool:** **Not implemented.** No `draggable`, `dragstart`, `dragover`, `contentEditable`, or `dblclick` handlers exist anywhere in `admin/index.html`. The actual editing model is click-to-**select** an item from a list (line 424: `onClick={()=>{setSelected(item.id)...}}`), then edit its fields in a separate form panel (lines 305-396: explicit add/remove buttons for groups and items, standard controlled `<input>`s). This is a normal form-based editor, not click-to-edit-in-place or drag-and-drop reordering.

**AD-003 — change review/approval before publication:** **Partial.** There is a real pre-publish diff summary (`VersionsTab`, admin/index.html:687-704: computes added/removed criteria IDs and item-count deltas vs the last published snapshot) shown to the publishing user before they click Publish, gated by a browser `confirm()` dialog (line 726). What does **not** exist: any second-person approval step, a "pending review" state, or any mechanism requiring someone other than the editor to sign off — the same admin who edits also publishes, with only a self-serve diff and a JS confirm as the gate.

**AD-007 — version restore, including regionalisation data:** **Partial / gap confirmed.** `POST /api/admin/versions/:id/rollback` (worker.ts:412-447) restores `criteria:published` and `criteria:version` from the D1 snapshot — it never references `criteria:regions`. Region HealthPathways overrides live in a separate KV key entirely outside the versions/snapshot system, and are not captured in `versions.criteria_snapshot` (schema.sql:19-29 — snapshot is only a copy of the `criteria` table). Restoring a version does not, and cannot, restore what the region overrides looked like at that point in time.

**GEN-010 — attribution:** Page `<title>` tags read "CRR Criteria Admin v1.0.0 DEV", "CRR Triage Advisor v1.1.0 DEV", "CRR Criteria Viewer v1.0.0 DEV" — tool name and dev-version only. No personal name, no HNZ/programme branding, and no `<meta name="author">` found in any of the four HTML entry points I checked. The Viewer's "tool identity footer" (viewer/index.html:307-314) shows only a content-version string ("content v4.0.1"). The only place a private company domain appears is `iteratio.nz` in the CORS allowlist (worker.ts:29-30) and as the production hostname — not rendered as UI text or attribution, but worth being aware of as the de facto production domain name for a national HNZ-facing tool (see closing list 3).

### TA-012 — Safety logic (ACC redirect)
Status: **✓ Implemented — "Partial" would not be a fair characterisation**
Evidence: fetched the **live, currently-active** system prompt directly (`GET /api/system-prompt`, public, unauthenticated — version 2.3.0, matches the D1 `is_active=1` row). It contains, under "STEP 0 — REDIRECT AND EXCLUSION CHECK", subsection "(b) FUNDING REDIRECTS": *"Recent trauma mechanism (fall, accident, injury) as primary cause → ACC, not CRR."* Step 0 is explicitly gated as the *only* place a redirect can set the verdict to "declined" ("STEP 0 IS THE ONLY PLACE WHERE A REDIRECT OR SAFETY CONCERN CAN SET THE VERDICT TO 'DECLINED'"), and is evaluated before any criteria matching, with an instruction to stop further assessment once triggered.
Note: I initially mis-checked this with a regex that required 60 characters of same-line context and got a false negative — corrected by dumping and grepping the full prompt text. Flagging this so the false-negative risk of shallow text search on this kind of check is visible, not silently corrected out of the trail.
A client-side fallback copy of similar wording also exists in `triage/index.html:1647` (used only if `/api/system-prompt` fails to load), confirming the redirect logic is present at both the primary and fallback layers.

### NFR-014 / SR-01 / SR-02 — Public endpoint hardening
Status: **Confirmed largely as recorded in `SECURITY_DECISIONS.md`, with one architecture clarification**
`/api/triage/assess` (worker.ts:618-657): **public, no admin auth** — anyone can call it directly. Mitigations present: (1) per-IP rate limit, 30 requests/hour, enforced via KV (`ratelimit:triage:{ip}:{hour}`, fails open on KV errors); (2) an Origin check — but it only rejects requests where an Origin header **is present and not allowlisted**: `if (origin && !ALLOWED_ORIGINS.includes(origin))`. A direct call with **no** Origin header (any non-browser client — curl, a script, server-to-server) skips this check entirely. I did not send a real POST to confirm this live, since that would spend real Anthropic API cost and write a log row — a side-effecting action outside a read-only investigation's scope. The bypass is established from the code alone and is unambiguous: the `if (origin && ...)` structure has no fallback branch for a missing header.
No Turnstile, no CAPTCHA, and no daily/aggregate budget cap exist anywhere in `worker.ts` — confirmed by grep (zero matches for turnstile/captcha/budget/daily-cap patterns) — only the per-hour, per-IP counters (30/hr assess, 100/hr QA, 200/hr usage-log, 500/hr viewer-event).
Architecture clarification vs `SECURITY_DECISIONS.md` SD-02: that entry describes a same-origin `proxyPublic` route (`/api/*` on the main worker) intended to front public Triage Advisor calls, with production deploy gated on SD-05 sign-off. I checked `src/worker/index.ts` directly: it defines only `/crr-api/*` routes (admin-proxy, CF-Access gated — confirmed live: `GET https://iteratio.nz/crr-api/api/system-prompt` → HTTP 302 to `crr-admin.cloudflareaccess.com` login). **No `/api/*` public-proxy route exists in the deployed main worker** — confirmed live, `GET https://iteratio.nz/api/triage/assess` falls through to the SPA's `index.html` (the catch-all route), not a proxy. So SD-05's gate is accurately "not deployed," and SR-02 (proxy masking client IP) does not currently apply because there is no live proxy in the path at all. What **is** live and does carry SR-01's core risk: the browser (`triage/index.html:2770`) calls `crr-criteria-api.fk4dsrmq5r.workers.dev` directly, cross-origin — a bare `*.workers.dev` address, reachable by anyone, with real per-caller-IP rate limiting (since there's no proxy masking IPs on this actual path) but no CF Access, no Turnstile, and no spend cap.
`instructions/SECURITY_DECISIONS.md`: **exists and reads as current** — cross-checked five of its entries (SD-02, SD-06, SD-07, SR-04, SR-05) against live code/data in this pass and found them accurate or independently corroborated (see TA-035/036 and GEN-008 above).
`instructions/SR-01-SR-02-hardening-brief.md`: **does not exist**, and has never existed in this repository's git history (`git log --all -- <path>` returns nothing). The verification brief asks me to check it "still exists and is current" — it isn't there to check.

---

## 1. Statuses that should change in the BRD

*(Against the v2 draft's likely status conventions — I could not quote v3.1.1's actual current cell text; get me that file for an exact diff.)*

| Item | This pass's finding | Suggested BRD status |
|---|---|---|
| GEN-003 / NFR-008 | Real client-side auto-redaction; zero server-side gate; zero test coverage | Partial — flag "no server-side gate, no tests" explicitly, don't let "implemented" stand alone |
| GEN-008 / TA-033 / TA-SRC-01 | Publish button has no effect on Triage Advisor's actual data; UI claims otherwise | Partial — and the UI copy itself needs a fix (misleading confirm-dialog text), independent of BRD wording |
| TA-035 (model pinning) | Alias, not a dated snapshot; recorded as an open risk (SR-05) already | Partial, not ✓ |
| AD-002 | No click-to-edit or drag-and-drop exists | Not implemented |
| AD-003 | Self-serve diff + browser confirm only; no second-person approval | Partial, not ✓ |
| AD-007 | Regionalisation data is never restored by version rollback | Partial, not ✓ |
| CV-019, CV-024, TA-010 | All confirmed genuinely working end-to-end | ✓ — these can be marked confirmed with confidence |
| TA-012 (ACC redirect) | Confirmed live and correctly gated | ✓ — "Partial" (if currently marked that way) is not fair |

## 2. Not established

- **What "138" originally referred to.** No source document defines it; ruled out several candidate reconstructions without finding an exact match. Settle by locating the original governance artifact where the figure first appeared and checking its date.
- **BRD v3.1.1's actual current status text**, for any item — the file isn't in the repo. Settle by adding the real v3.1.1 docx to `documents/`.
- **Whether the client-side PII regex set has ever missed a real PII instance in production.** No test suite exists to have caught this, and I did not run the 736 stored `presentation_text` values through the redaction function to check for residual PII, since that would mean reading potentially-sensitive stored text at volume — flagging as an option for you to authorise separately if wanted, not doing it silently as part of this pass.
- **Whether the SR-01 Origin-header bypass has been exploited.** No abuse-monitoring/alerting was found in `worker.ts` beyond the rate-limit counters themselves; I did not test the bypass live (would incur real API cost). Settle by checking Anthropic billing/usage dashboards for call volume not attributable to logged `triage_usage_log`/`qa_reviews` rows, or by adding request logging that distinguishes Origin-present vs Origin-absent calls.

## 3. Found but not asked about — governance/privacy relevant

- **The Admin tool's own publish confirmation dialog makes an inaccurate factual claim** ("Both Criteria Viewer and Triage Advisor will immediately serve the updated criteria") on every single publish action, to the person actually responsible for content governance. This isn't a documentation gap — it's live, user-facing software actively telling an operator something false about what their action just did, on every use.
- **`schema.sql` is stale** relative to the live D1 schema (missing `source`/`regression_run_id` on `triage_usage_log`). Anyone provisioning a fresh environment from this file would get a schema the current `worker.ts` can't fully write to.
- **`instructions/SR-01-SR-02-hardening-brief.md` doesn't exist and never has**, despite being referenced as something to check for currency. If this was meant to be written, it wasn't; if it was written elsewhere and never committed, that's a process gap for a doc that's supposed to be the durable record per `SECURITY_DECISIONS.md`'s own stated purpose.
- **No retention/purge mechanism exists for any table storing free-text clinical content** (`triage_usage_log`, `qa_reviews`, `qa_viewer_reviews`). Combined with NFR-007's "no patient-identifiable information stored" framing, indefinite retention of de-identified-but-not-verified-clean clinical text is a real, live gap for the privacy office to weigh in on, not solely a code-quality issue.
- **`TRIAGE_TEMPERATURE = 0.1` combined with an unpinned model alias (SR-05)** is a live latent-failure combination CLAUDE.md itself already anticipated ("newer Sonnet versions may reject temperature: 0.1") — worth a proactive check rather than waiting for it to surface as a support incident.
- **The production Triage Advisor's cross-origin API calls go to a bare `*.workers.dev` address**, not a branded/first-party domain — `SECURITY_DECISIONS.md`'s own notes section already flags that `*.workers.dev` "is not behind CF Access" and warns not to infer production safety from a working preview; that note applies to this literal, currently-deployed call path, not just to preview testing.
