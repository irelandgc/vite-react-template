# Viewer Layout, Styling, and Polish

## Context

This instruction covers layout changes, styling harmonisation with the Triage Advisor, and polish for both tools. Implement in viewer/index.html, triage/index.html, and the shared crr-design-system.css. Also update the demo harness (crr-demo-harness.html is opened from local file, but the buildToolUrl/launchTool functions need updating — see item 18).

Read instructions/crr-business-rules.md for context on data categories and display rules.

---

## Layout Changes

### 1. Interactive integration mode: two-column layout

Current: integration mode (URL has exam, sites, region params) uses a single-column layout regardless of mode.

Change: When in interactive integration mode (has URL params AND mode=interactive), use a two-column layout:
- LEFT panel: Selected Indicators summary. Shows ticked items (shorthand text), the urgency determination, and action buttons (Copy, Send to Form, Clear All). This panel stays visible as the user scrolls the criteria list on the right. Do NOT show exam/site selection on the left — the referral form already determined that and the black header bar confirms it.
- RIGHT panel: The full criteria list with tickable checkboxes, clinical theme groups, eligibility requirements, alternative management, not-funded, definitions.

When in passive integration mode (has URL params AND mode=passive), keep the single-column layout — there are no selections to show on the left.

### 2. Standalone interactive: keep two-column but add selected indicators

Current: standalone mode has exam/site selection on the left, criteria on the right.

Change: In standalone interactive mode, the left panel should show exam/site selection at the top AND the selected indicators summary below it. As items are ticked on the right, the left panel builds the selection list with urgency determination and action buttons.

### 3. Remove pinned summary bar and footer bar

Since the selected indicators and action buttons now live in the left panel (interactive modes), remove:
- The pinned/sticky summary bar at the top of the criteria area
- The sticky footer bar with Copy/Send to Form/Clear All

These are replaced by the left panel. In passive mode (single-column, no left panel), there are no action buttons or summary bar — the referrer is just reading.

### 4. Popup window sizing based on mode

The demo harness should open wider popups for interactive mode to accommodate the two-column layout.

In the harness launchTool function, set popup width based on mode:
- Interactive mode (viewer or triage): width = 1100
- Passive mode: width = 800
- Triage advisor: width = 1100 (always needs space for columns)
- Height stays at 850

---

## Styling — Match Triage Advisor

The Triage Advisor criteria reference panel is the design reference. The viewer must match it exactly (except for the addition of checkboxes in interactive mode).

### 5. Row spacing
Viewer rows have more padding than the triage panel. Match the tighter spacing from the triage panel.

### 6. Site name header
The viewer has the site name (e.g. "DVT") in a bordered container. The triage panel shows it as just bold text. Remove the container border in the viewer.

### 7. Guidance block
The viewer has a "More detail" toggle and a separate eligibility requirements block. The triage panel shows guidance concisely with just a left border. Make the viewer match — show guidance inline without extra containers. Keep eligibility requirements visible but with lighter styling.

### 8. No borders between criteria items
Remove all borders/dividers between individual criteria item rows. Items should be separated by spacing only, not lines. Match the triage panel.

### 9. Black header bar on criteria panel
The criteria panel should have a black header bar matching the triage panel "CRITERIA REFERENCE" bar — dark background, white text, site name right-aligned. In the viewer:
- Show "CRITERIA REFERENCE" when in passive mode
- Show "SELECT INDICATORS" when in interactive mode
The triage panel always shows "CRITERIA REFERENCE".

### 10. Card container
The entire criteria panel should be wrapped in a card matching the triage panel: black header bar at top, rounded corners, white background with a subtle border around the content area. All criteria content sits inside this card.

### 11. Lab value badges
The viewer shows an icon plus "Lab value" text. The triage panel shows a compact "LAB" pill. Use the same compact badge style in both. Fix in crr-design-system.css.

### 12. Alternative Management and Not Routinely Funded blocks
The viewer has heavier bordered containers for these. The triage panel uses lighter treatment — just a coloured header with text below. Match the lighter style. Fix in crr-design-system.css.

### 13. Group headers
Verify identical font size, weight, colour, and spacing in both tools. Fix in crr-design-system.css.

### 14. Checkbox alignment
Checkboxes exist in the viewer but not the triage panel. Tighten the checkbox area so text starts at the same horizontal position as in the triage panel. The checkbox should not add excessive width or push text rightward.

### 15. Urgency group headers in By urgency view
Must use left-border accent style, NOT full-width coloured bars. Only exception: emergency redirect banner keeps full red. Also remove duplicate labels — show ONLY the referrer-friendly timeframe label, not "P2 — URGENT, WITHIN 2 WEEKS" plus "URGENT (WITHIN TWO WEEKS)".

---

## Tool Identity — Both Tools

### 16. Move tool identity to footer
Current: "CRR Criteria Viewer v5.3.0 / Health New Zealand | Te Whatu Ora — CRR Programme" plus QA Log, version badge, API badge are in the main header. This is a lot of space for information the referrer does not need.

Change for BOTH viewer/index.html AND triage/index.html:
- The main header should contain only the exam/site/region identification and any critical navigation (like the Triage Advisor "AI Assessment / Compare Models" toggle).
- Move tool name, version, organisation, QA Log link, API version badge to a subtle footer at the bottom of the page. Small muted text: "CRR Criteria Viewer v5.3.0 . content v4.0.1 . Health New Zealand | Te Whatu Ora — CRR Programme"
- The clinical disclaimer banner ("This tool is for clinical reference only...") stays at the top — that is important.

---

## Passive Mode Fix

### 17. Disable checkboxes in passive mode
Current: passive mode hides action buttons but checkboxes are still interactive.

Change: In passive mode, disable all criteria checkboxes (greyed out, not clickable). The summary bar should not appear. The referrer can read criteria but not interact. The By indication / By urgency toggle can stay.

---

## Harness Update

### 18. Popup width based on mode
In the demo harness, update the launchTool function to vary popup width:

Interactive viewer: width = 1100
Passive viewer: width = 800
Triage advisor: width = 1100
Height stays at 850 for all

---

### 19. HealthPathways link in integration mode
Current: "View HealthPathways" sits in its own panel/row at the top of the criteria area, taking up vertical space.

Change: In integration mode, move the HealthPathways link into the black header bar — place it on the right side as a subtle white/light text link next to the site name, or just below the header bar as a compact text link. It should be accessible but not occupy its own row. In standalone mode where there is more space, it can remain in the guidance block as currently shown.

## Do NOT change

- The Triage Advisor three-column layout or appearance (it is the reference)
- Any functionality, data handling, or business logic
- Emergency redirect banner stays full-width red
- The By indication / By urgency toggle
- The clinical disclaimer banner position (stays at top)
- Criteria data or groupings
