# Viewer Fixes — Remaining Items

## Context

The indication-first view in `viewer/index.html` has had most issues resolved. Fixes 1, 2, 3, 4, 5, and 8 are already implemented and deployed. **Only fixes 6 and 7 below remain.**

## ✅ Already done (do not re-implement)

- Fix 1: All criteria items start unticked — done
- Fix 2: Per-item expand arrows removed — done
- Fix 3: Prerequisite block vs criteria groups clarified — done
- Fix 4: Urgency derivation summary — done
- Fix 5: Copy/Send-to-Form output uses shorthand text and clean format — done
- Fix 8: Urgency badges use referrer-friendly timeframe language — done

---

## Fix 6: Remove unnecessary panels in standalone mode

**Files:** `viewer/index.html`

**Current:** In standalone mode (full two-column layout), the left panel has:
1. Exam/site selection (top) — **keep**
2. "ADDITIONAL NOTES (optional)" textarea — **remove**
3. "SELECTED INDICATORS" panel showing ticked items in a structured list — **remove** (being replaced by pinned summary bar in Fix 7)
4. A second output area below that showing the same items in plain text format — **remove**

**Changes:**
- Remove the "ADDITIONAL NOTES (optional)" textarea entirely — the viewer is a reference tool, not a note-taking tool
- Remove the bottom plain-text output panel (the monospace-style text area that shows `Colonography (CTC):\n  - Secondary care clinician...`) — this is a debugging/clipboard preview
- Remove the "SELECTED INDICATORS" panel from the left column — this is being replaced by the pinned summary bar in Fix 7 which works in both standalone and integration mode
- The left column in standalone mode should contain ONLY the exam/site selection controls

## Fix 7: Replace Selected Indicators panel with pinned summary bar and single footer

**Files:** `viewer/index.html`

**This fix applies to BOTH standalone mode and integration mode.**

**Current (wrong):** 
- A "SELECTED INDICATORS" panel sits at the bottom of the criteria display (below Alternative Management, Not Funded, Definitions) showing the urgency determination, selected item list, and Copy/Send to Form buttons
- A DUPLICATE set of Copy/Send to Form buttons appears in a sticky footer bar
- The referrer has to scroll past all the bottom content to see their selection result

**Problems:**
- Panel is below the fold — referrer ticks a criterion partway up and has to scroll past Alternative Management, Not Funded, and Definitions to see the result
- Panel restates what the referrer just ticked — they can already see the tick and urgency badge on the item itself
- Duplicate buttons are confusing

**Correct behaviour:**

1. **Remove the Selected Indicators panel entirely** — delete it from both standalone and integration mode. No bottom panel showing selected items anywhere.

2. **Add a pinned summary bar** at the top of the criteria area, just below the Eligibility Requirements block and above the "By indication / By urgency" toggle. This bar:
   - Is **hidden** when no items are ticked
   - **Appears** as soon as one or more items are ticked
   - Shows: `✓ 1 criterion selected — meets Urgent (within two weeks)`
   - If multiple items ticked from different priorities: `✓ 3 criteria selected — highest urgency: Urgent (within two weeks)`
   - Uses a success/green style (green tick icon, light green background) — the referrer's question ("does my patient qualify?") has been answered
   - Is **sticky/pinned** so it remains visible regardless of scroll position within the criteria area
   - Does **NOT** list the individual selected items — the ticked checkboxes in the criteria list below already show that
   - Includes a small "Clear" link/button to untick all items

3. **Keep ONE set of action buttons** in a sticky footer bar at the bottom of the viewport:
   - Contains: Copy, Send to Form (only if `sendButton=on` URL param is present AND `window.opener` exists), Clear All
   - **Hidden** when no items are ticked
   - **Visible** as soon as one or more items are ticked
   - Remove ALL duplicate buttons elsewhere — there should be exactly one Copy button and one Send to Form button visible on the page at any time

4. In **passive mode** (`?mode=passive`): the pinned summary bar can still show the urgency determination (it's informational), but the footer action buttons (Copy, Send to Form, Clear All) remain hidden — the referrer is just reading criteria, not building output

---

## Do NOT change

- The "By indication / By urgency" toggle — keep both views available
- The urgency-grouped view ("By urgency") — leave as-is
- The guidance text at the top of each exam/site
- The "View HealthPathways ›" link
- The Eligibility Requirements block
- The Alternative Management and Not Routinely Funded sections
- The Definitions & Sub-Criteria section
- The urgency badges on each criteria item (already using correct timeframe language per Fix 8)
- The Gateway and Lab value badges
- The "More detail ›" expand/collapse for guidance narrative
- The clinical theme group headers (Bleeding, Anaemia, etc.)
- The exam/site selection controls in the left column (standalone mode)
