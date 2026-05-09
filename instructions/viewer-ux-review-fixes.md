# Viewer UX Review Fixes

## Context

Post-modernisation UX review against clinical standards. Fix in viewer/index.html.

## Fix 11: Urgency group headers show duplicate labels in By urgency view

The urgency-grouped view shows both the old P-code label AND the new timeframe label on each group header. For example: "P2 - URGENT, WITHIN 2 WEEKS" followed by badge "URGENT (WITHIN TWO WEEKS)".

Fix: Remove the old P-code prefix. Headers should show ONLY the referrer-friendly timeframe label. "URGENT (WITHIN TWO WEEKS)" not "P2 - URGENT, WITHIN 2 WEEKS". Same for P3, Acute, etc. Fix 8 was applied to indication view badges but NOT urgency view headers.

## Fix 12: Passive mode should disable checkboxes

When mode=passive, footer buttons are correctly hidden but checkboxes are still interactive and the summary bar appears when items are ticked.

Fix: In passive mode, disable all criteria checkboxes (greyed out, not clickable). The summary bar should NOT appear. The referrer can read criteria but not interact. The By indication / By urgency toggle can stay.

## Fix 13: Before referring confirm items pre-ticked in urgency view

In the By urgency view, Before referring confirm items show with amber ticks, appearing pre-selected. Same bug as Fix 1 but only in the urgency-grouped render path.

Fix: ALL items in BOTH views (indication AND urgency) must start unticked. Apply Fix 1 consistently to both render paths.

## Fix 14: Instruction text visible in integration mode

In integration mode (URL has exam, sites, region params), the instruction text "Select the anatomical site(s) being requested..." is still showing. This should be hidden. The exam/site is already shown in the header bar.

Fix: Hide the instruction paragraph in integration mode. Keep the View HealthPathways link visible as a standalone link.
