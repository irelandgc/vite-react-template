# Claude Code Brief — Verify Flagged Items from DOC-AUDIT-2026-06

**Status:** Read-only verification, then ONE permitted write (release-log backfill, see Part 6). Confirm against the actual current codebase and live deployment — not the release log, which is known to have gaps. Report findings; do not change viewer/triage/data code.

## Why

The documentation audit (`DOC-AUDIT-2026-06.md`) flagged four items as UNKNOWN because no release-log entry confirmed them. Gary believes all four are actually done — the issue is that small fixes shipped without a release-log line, so a log-based audit undercounts them. This brief confirms each against source/data directly, so the record matches reality. One item (the data reload) Gary is less sure about — verify that one most rigorously.

Important: absence of a release-log entry is NOT evidence a fix is missing. Check the actual code and data.

---

## Part 1 — Criteria data reload + 6 missing sites (the one to verify hardest)

The 2026-05-24 quality audit found 6 sites missing from `SITE_INDEX`:
`ct_other`, `us_fna_biopsy`, `xr_femur`, `xr_forearm`, `xr_humerus`, `xr_tibia_fibula`

Gary believes the wipe-and-reload from `pdf-criteria-all.json` was completed and these were fixed — confirm or refute with evidence.

1. Query the live D1 (or the published KV criteria snapshot the viewer actually reads — check which is authoritative for the deployed viewer) for each of the 6 site IDs. For each, report: present or absent, and if present, how many criteria items it has and what priority levels.
2. Confirm whether these 6 are reachable in the viewer UI — i.e. they appear under their parent modality/exam, not just present in the data. Check the `SITE_INDEX` / site list the viewer builds its selector from.
3. Spot-check data integrity from the reload: confirm no `imp_`-prefixed duplicate IDs remain (the PDF-import corruption noted previously), and confirm paediatric items carry the `_p` suffix as intended.
4. Report the total current site and item counts, and compare against the `pdf-criteria-all.json` baseline figures (53 sites / 473 items) if that file is locatable, so we know the reload landed fully rather than partially.

If any of the 6 sites are still missing, that's a live clinical-matching gap — call it out clearly at the top of the report.

---

## Part 2 — Viewer Fix 9 + Fix 10 (Gary believes done)

From `viewer-urgent-fixes.md`:
- **Fix 9:** expand/collapse arrows that had re-appeared after the indication-display rework should be removed/corrected.
- **Fix 10:** not-funded items should NOT appear in the tickable checkbox list.

Verify in the current viewer source (`public/crr-criteria/viewer/index.html`):
1. Fix 9 — check how expand arrows are rendered now; confirm the regression described is not present in current render logic.
2. Fix 10 — confirm not-funded items are rendered in their own non-tickable section, not as checkboxes in the criteria list. Cite the code that separates them.

Report DONE (with code evidence) or NOT DONE (with what's still wrong).

---

## Part 3 — Viewer Fix 11 + Fix 13 (Gary believes done)

From `viewer-ux-review-fixes.md`:
- **Fix 11:** duplicate P-code + timeframe prefix labels in urgency-view group headers should be de-duplicated.
- **Fix 13:** Before-Referring items should NOT be pre-ticked in urgency view.

Verify in current viewer source:
1. Fix 11 — check the urgency-view group header render; confirm labels aren't doubled (e.g. not showing both "P2" and "Urgent (within two weeks)" redundantly if that was the issue, per the file's own description).
2. Fix 13 — confirm Before-Referring items default to unticked in urgency grouping.

Report DONE (with evidence) or NOT DONE.

---

## Part 4 — Triage Clinical Review Brief (Gary thinks NOT done)

`Triage_Clinical_Review_Brief.md` poses open clinical questions A and B on CT Head P2 headache edge cases, awaiting Tim/James/Alex.

This is the one item that likely CANNOT be resolved from the codebase — the system prompt lives in D1 and the answer depends on a clinical decision that may not have been made. Do the limited check that's possible:
1. Fetch the current active system prompt from D1 (`/api/system-prompt` or the `system_prompts` table) and check whether it contains any rule addressing the two edge cases described (progressive worsening without baseline; blurred vision as objective deficit).
2. Report only what's verifiable: "current prompt does / does not contain a rule addressing these cases." Do NOT infer whether the clinical team responded — that's Gary's to confirm. Just say what the prompt currently does.

---

## Part 5 — Production prompt version (resolve the audit's internal contradiction)

The audit was internally inconsistent: some sections imply v2.3.0 is the working line; the retention note says v2.2.0 is what's actually active in D1 and v2.3.0 was only tested (2 regressions: LP-004, CR-003) and never promoted.

Resolve this definitively:
1. Query D1 `system_prompts` for the currently active/published prompt version.
2. Report: which version is live, and whether v2.3.0 exists in the table as draft/tested vs active.
3. State plainly which version the deployed Triage Advisor is using right now.

This matters because it tells Gary whether his deployed prompt is his latest prompt.

---

## Part 6 — Permitted write: backfill the release log

This is the ONLY file you may modify. After Parts 2, 3 (and 1 if confirmed done), for each fix verified as DONE that has no existing release-log entry, append a backfill entry to `documents/CRR_Release_Log.md`. Mark each clearly as a backfill, e.g.:

```
### [backfilled 2026-06-21] Viewer Fix 9/10/11/13 — confirmed present, original ship date unknown
- Fix 9: expand arrow regression resolved
- Fix 10: not-funded items excluded from tickable list
- Fix 11: urgency-view header label de-duplication
- Fix 13: Before-Referring items not pre-ticked in urgency view
Verified present in source 2026-06-21; original commit predates this entry.
```

Only backfill what you've actually verified as DONE in this pass. Do not invent dates. If something is NOT done, leave it out of the log and flag it as open instead.

Also add the missing entry the audit already identified: today's Triage v1.1.0 model update (to `claude-sonnet-4-6`) if it isn't already logged.

---

## Output

Write findings to `documents/VERIFICATION-2026-06-21.md`:
- A one-line verdict per item: Part 1 (each of 6 sites), Parts 2–5.
- Anything found NOT done or still broken goes in a "Still needs action" block at the top.
- Confirm what was backfilled into the release log.

Do not touch any file except `CRR_Release_Log.md` (Part 6) and the new verification report. No viewer/triage/data code changes.
