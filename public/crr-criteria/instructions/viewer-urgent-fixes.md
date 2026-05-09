# Viewer Fixes — Urgent Follow-up

## Context

Fixes 6 and 7 have been implemented but introduced two regressions. Fix these now.

## Fix 9: Remove per-item expand arrows (again)

The per-item expand arrows (►/▼) on criteria rows have reappeared — they were removed in Fix 2 but reintroduced during the Fix 6/7 work. 

Remove them again. Every criteria row should show just the checkbox, the criteria text, and the urgency/lab-value/gateway badges. No expand/collapse toggle per item.

Also remove the shorthand text line that appears below items when expanded (e.g., "Shorthand: Constipation — patient history unobtainable"). The shorthand is used only in the copy/send output, not displayed in the UI.

## Fix 10: Not-funded and alternative management items must NOT be tickable

**Current (wrong):** The indication-first view is including items from `notFundedDetail` / not-routinely-funded data as tickable checkbox items in the criteria list. For example, "Vague central abdominal pain. Suspected constipation other than in a patient group specified above" appears as both a tickable checkbox AND in the red "NOT ROUTINELY FUNDED UNDER CRR" info section at the bottom.

**Why it's wrong:** Not-funded items are exclusions — they tell the referrer "this scenario is NOT eligible for CRR funding." Making them tickable implies the referrer can select them as valid criteria, which they are not. Same applies to alternative management items — those are redirects to other pathways, not selectable criteria.

**Correct behaviour:**
- The indication-first transform should ONLY create tickable checkbox items from criteria that belong to actual priority timeframe groups (Acute, P2/Urgent, P3/Non-deferrable, P4/Routine, S2, etc.)
- Items from `notFundedDetail`, `outOfCriteriaNote`, or `alternativeManagement` data should NEVER appear as tickable checkboxes
- These items should ONLY appear in their respective info sections at the bottom of the criteria display (the red "NOT ROUTINELY FUNDED UNDER CRR" block and the amber "ALTERNATIVE MANAGEMENT / REDIRECT" block), which already exist and are correct
- Check all exam sites to make sure no not-funded or alternative-management items have leaked into the tickable criteria list

**How to identify these items in the data:** They come from different data fields than the criteria items. The tickable criteria come from the timeframe/priority groups. The not-funded and alternative management come from separate top-level fields. The transform function should only be iterating over the timeframe group items when building the tickable list.
