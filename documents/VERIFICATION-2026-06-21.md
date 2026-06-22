# CRR Flagged-Item Verification Report

**Date:** 2026-06-21  
**Method:** Live API queries + viewer source inspection. Read-only except `CRR_Release_Log.md` (Part 6 backfill).  
**Brief:** `instructions/claude-code-brief-verify-flagged-items.md`

---

## Still needs action

**Part 4 — Question B (blurred vision) is NOT addressed in the current prompt.**  
The active system prompt (v2.3.0) contains a rule for Question A but nothing for Question B. This remains an open clinical governance item.

**Part 5 — Release log is wrong about the active prompt version.**  
The release log states v2.2.0 as active (as of 2026-05-24 entry) and v2.3.0 as "not promoted". The live API returns v2.3.0 as the deployed prompt. The log needs Gary's confirmation of when v2.3.0 was promoted, then a backfill entry. (A placeholder entry has been added — see Part 6 note.)

---

## Part 1 — Criteria data reload + 6 missing sites

**Verdict: ALL 6 SITES PRESENT — data reload confirmed complete.**

| Site | Status | Groups | Items |
|------|--------|--------|-------|
| `ct_other` | **PRESENT** | 3 | 5 |
| `us_fna_biopsy` | **PRESENT** | 2 | 2 |
| `xr_femur` | **PRESENT** | 3 | 10 |
| `xr_forearm` | **PRESENT** | 3 | 9 |
| `xr_humerus` | **PRESENT** | 3 | 9 |
| `xr_tibia_fibula` | **PRESENT** | 3 | 10 |

**Evidence:** Live API `GET /api/criteria` returns criteria version v4.1.0, published 2026-05-14, labelled "full PDF rebuild". All 31 adult sites are present and navigable.

**Data integrity checks:**
- `imp_` prefix items (corruption marker): **0 found** — no PDF-import corruption present
- Total adult sites: **31** (includes all 6 previously-missing sites)
- Total adult items: **331**
- Note on item count: the brief cited 473 items from `pdf-criteria-all.json` as the baseline. Current count is 331. `pdf-criteria-all.json` is not in the repo for direct comparison — the 473 figure likely included paediatric criteria, which are a separate dataset loaded via a different API path. Adult-only criteria at 331 items across 31 sites is consistent with the April 2026 reissue.

**Viewer reachability:** The viewer fetches live criteria from `/api/criteria` on load. All 31 sites appear as checkboxes in the site selector since `toolRender()` iterates `exam.sites` directly from the fetched data. The embedded fallback (v3.4.2, in viewer source) is older and would be missing the 6 sites, but the fallback only activates if the API is unreachable.

---

## Part 2 — Viewer Fix 9 + Fix 10

### Fix 9 — Expand arrows per item

**Verdict: DONE.**

**Evidence:** Feature flag `UX11_EXPANDABLE_SECTIONS = false` at viewer line 333. Neither `toolRenderCb` (line 2180) nor `toolRenderIndicCb` (line 1636) renders expand arrow HTML. Both functions calculate `var isExpanded = on || expandedCards[item.id]` but the variable is not used in any rendered output in the current code. No per-item expand/collapse arrow is present in the DOM.

### Fix 10 — Not-funded items excluded from tickable list

**Verdict: DONE.**

**Evidence:** `isNonClinicalGroup()` at viewer line 621 returns `true` for groups containing "not fund", "not routinely", or "alternative management" in the title. These groups are excluded from `nonEmergencyGroups` at lines 1706, 1752, 1810, 1845 — they are never passed to `toolRenderGroup()` or `toolRenderIndicationPanel()`, so they never produce checkboxes. Not-funded content is shown only by `renderFooterBlocks()` (line 2111) as a `not-funded-box` div — non-interactive display only.

Live data confirms: no groups with "not fund" / "not routinely" in their titles currently exist in any of the 31 adult sites (all groups are P2/P3/P4/Acute/Refer-for-acute types). Fix 10 is clean both in code and data.

---

## Part 3 — Viewer Fix 11 + Fix 13

### Fix 11 — Duplicate P-code + timeframe labels in urgency-view group headers

**Verdict: DONE.**

**Evidence:** `toolRenderGroup()` (line 2162–2163) and `toolRenderGroupPassive()` (line 1936–1937) both call `getPriorityShortFromGroup(group.title)` and render `_lbl11 || group.title`. `getPriorityShortFromGroup` (line 1548–1560) maps group titles to clean short labels:

| Raw group title (from data) | Rendered in urgency header |
|---|---|
| "P2 Urgent: Non-deferrable imaging…within 2 weeks…" | "Urgent (within two weeks)" |
| "P3 non-deferrable imaging…within 6 weeks…" | "Non-deferrable (within six weeks)" |
| "P4 Deferrable. If capacity…6–12 weeks…" | "Routine (within 6–12 weeks)" |

The P-code prefix is fully replaced by the human-readable label. In urgency view, items are rendered by `toolRenderCb()` (not `toolRenderIndicCb()`), which does NOT append a `indic-priority-badge`. No duplication is possible.

### Fix 13 — Before-Referring items not pre-ticked in urgency view

**Verdict: DONE** (resolved by combination of code and data).

**Evidence:**
1. No "Before Referring" groups exist in the live criteria — the only group types in all 31 sites are Acute/Refer-for-acute, P2, P3, P4.
2. No pre-ticking logic exists: `TS.cbs` is initialised as `{}` at viewer line ~345 on each exam switch; `toolRenderCb()` renders `on ? " checked" : ""` where `on = TS.cbs[item.id]`, which is `undefined` (falsy) by default.
3. No `autoCheck`, `preCheck`, or `defaultTick` code found anywhere in the viewer source.

Cannot manifest with current code + data.

---

## Part 4 — Triage Clinical Review Brief (CT Head P2 edge cases)

**Verdict: PARTIAL — Question A addressed, Question B is not.**

**Active prompt:** v2.3.0 (created 2026-05-24 18:06:54)

**Question A — progressive worsening without established baseline:**  
The current prompt (v2.3.0) contains this rule in the CLINICAL SHORTHAND EQUIVALENCE section:

> *"Progressive headache" satisfies "change in pattern of headaches with progressive increase in frequency or severity."*

This implicitly resolves Question A by accepting "progressive headache" as shorthand that satisfies the criterion — without requiring that the patient had a pre-existing pattern. A new progressive headache meets the criterion under this rule. However, the prompt does not contain explicit language addressing "first-ever headache that is progressive" or "no prior headache history" — the implicit coverage may or may not satisfy the clinical working group's intent.

**Question B — blurred vision as objective neurological deficit:**  
No explicit rule in the current prompt addresses whether blurred vision counts as a "focal neurological sign" for the CT Head Acute 48hr pathway. The prompt's focal neurological signs example (`Focal neurological signs pathway is fully met → verdict is "proceeds" at Acute 48hr`) does not enumerate what constitutes a focal neurological sign. **This remains unaddressed.** Gary should confirm with the clinical working group whether a ruling was made and whether it needs to be added to the prompt.

---

## Part 5 — Production prompt version

**Verdict: CONTRADICTS THE AUDIT. Active prompt is v2.3.0, not v2.2.0.**

**Evidence:**
- Live API `GET /api/system-prompt` returns: `version: "2.3.0"`, `label: "Verdict consistency check + general-vs-specific pathway rule + clinical severity override fix"`, `created_at: "2026-05-24 18:06:54"`
- The release log's 2026-05-24 entry states v2.2.0 was promoted and v2.3.0 was "not promoted / 3 new regressions". This was accurate at the time the entry was written, but v2.3.0 was subsequently promoted without a release log entry.
- The 2026-06-02 release log entry still refers to v2.3.0 as undeployed: *"v2.3.0 prompt + Sonnet 4.6: 3 improved / 15 unchanged / 2 regressed — better pairing if v2.3.0 is promoted"* — this confirms the log was not updated when v2.3.0 was activated.

**What this means for Gary:**  
- The deployed Triage Advisor is running v2.3.0 right now.  
- The DOC-AUDIT-2026-06 retention note recommended keeping v2.3.0 results as the test baseline before promoting — it already is the active prompt.  
- The 2 regressions in v2.3.0 testing (LP-004, CR-003) are live in production. Gary should decide whether to accept v2.3.0 as the promoted version (and update the release log to reflect this) or revert to v2.2.0.  
- The `system-prompt-v2.3.0.txt` file in `instructions/` is therefore the current production prompt, not a test artifact.

**Gary's question to resolve:** When was v2.3.0 promoted (it was created 2026-05-24)? Was this intentional, or did v2.2.0 never become active because v2.3.0 was created the same day?

---

## Part 6 — Release log backfill

The following entries have been added to `documents/CRR_Release_Log.md`:

**Added (confirmed DONE in this pass):**
1. Backfill: Viewer Fix 9 / Fix 10 / Fix 11 / Fix 13 — all confirmed present in source, original ship date unknown
2. New: Triage Advisor v1.1.0 — default model updated to claude-sonnet-4-6 (deployed 2026-06-20)
3. Placeholder: v2.3.0 system prompt active — flagged for Gary to confirm date and intent

**Not added:** Fix 12, Fix 14, passmode/integration fixes — already in the 2026-05-18 log entry.
