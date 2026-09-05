# Viewer Passive Mode Fixes & Interactive/Passive Toggle

## Context

The Criteria Viewer (`public/crr-criteria/viewer/index.html`) currently has two modes — interactive (checkboxes, selection, copy/send) and passive (read-only reference). There are three issues to fix:

1. **Passive mode is missing the indication-first grouping** — interactive mode has a "By indication / By urgency" toggle, but passive mode only shows the urgency-grouped view. Passive mode should support the same toggle.

2. **No way to switch between interactive and passive in standalone mode** — when the viewer is launched standalone (no URL params), there's no UI to toggle between modes. The mode toggle should be added to the footer bar.

3. **Passive mode uses a different layout** — passive mode currently renders in a single-column centred layout, while interactive mode uses a two-panel layout (modality/exam selector on the left, criteria reference on the right). Both modes should use the same two-panel layout. The only difference between modes is what renders inside the criteria panel.

## What to change

### 1. Add Interactive/Passive toggle to the footer bar

Add a segmented control to the existing footer bar in the standalone viewer. Position it on the left side of the footer, before the existing footer content.

**Toggle design:**
- Two-button segmented control: "Interactive" | "Passive"
- Use the same `mod-btn` / segmented control styling already used elsewhere in the viewer (e.g. the "By indication / By urgency" toggle)
- Default: Interactive
- Persist the selected mode to `localStorage` key `crr-view-mode` (values: `interactive` or `passive`)
- On page load, read from localStorage and apply. If no stored value, default to interactive
- When the viewer is launched with URL params that force passive mode (e.g. `?mode=passive`), the URL param takes precedence over localStorage, and the toggle should reflect the forced state

**Important:** This toggle is for standalone mode only. When the viewer is in integration mode (launched with URL params for embedding in a referral platform), the mode is determined by the URL params as it is today — the toggle should not appear in integration mode.

### 2. Unify the layout between modes

Both interactive and passive modes should use the same two-panel layout:
- Left panel: modality radio buttons + exam site checkboxes/selector
- Right panel: criteria reference content

Remove any layout branching that creates a different DOM structure for passive mode. The mode flag should only affect what renders *inside* the criteria panel, not the page layout.

Specifically:
- In passive mode, the left panel (modality + exam selector) remains visible and functional — users can still navigate between exams
- The criteria panel on the right renders without checkboxes, without the summary bar, and without the copy button
- The exam selector in the left panel should work the same in both modes — radio buttons for modality, checkboxes for exam sites (even in passive mode, the exam selector is interactive for navigation purposes)

### 3. Add indication grouping to passive mode

The passive mode criteria rendering should support the same "By indication / By urgency" toggle as interactive mode.

**What this means:**
- The "By indication / By urgency" segmented control should appear in passive mode, in the same position as it does in interactive mode (above the criteria list, inside the criteria panel)
- When "By indication" is selected, criteria items are grouped by clinical indication theme — same transform logic as interactive mode
- When "By urgency" is selected, criteria items are grouped by timeframe — same as the current passive display
- The selected view should be shared between modes — if the user selects "By indication" in interactive mode and then switches to passive, the indication grouping should persist

### 4. Passive mode rendering rules (inside the criteria panel)

When in passive mode, the criteria panel should render:

**Atomic items:**
- Item text displayed as a label (no checkbox)
- Urgency timeframe badge displayed in the same position as interactive mode
- No hover/click behaviour on the item row

**Gateway items (emergency redirect banners, eligibility requirements, etc.):**
- Render IDENTICALLY to interactive mode — these are informational banners, not interactive elements, so they should look the same in both modes
- Emergency redirect banners (red/amber full-width), alternative management panels, not-funded sections, guidance blocks with "More detail" toggles — all preserved exactly as they are in interactive mode

**Compound items (future — not implemented yet, but design for it):**
- In passive mode, compound items would render as structured text with AND/OR connector labels between sub-conditions, no checkboxes
- For now, compound items don't exist in the data, so this is just a note for future reference — don't build compound passive rendering in this task

**Summary bar / copy button / send button:**
- Hidden in passive mode
- The footer bar still shows (it has the mode toggle), but the summary count and action buttons are hidden

### 5. Mode switching behaviour

When the user toggles between interactive and passive:
- The selected exam(s) should be preserved — don't reset the exam selector
- The selected region should be preserved
- In interactive mode, any previously ticked criteria checkboxes should be preserved (the selection state lives in memory)
- Switching to passive and back to interactive should restore the previous selection state
- The "By indication / By urgency" view selection should be preserved across mode switches
- The criteria panel should re-render with the appropriate mode rendering

## Files to modify

- `public/crr-criteria/viewer/index.html` — main viewer file

## Do NOT

- Do NOT change the integration mode behaviour (when URL params are present)
- Do NOT change the criteria data model or API calls
- Do NOT add compound criteria rendering — that's a separate future task
- Do NOT change the Triage Advisor
- Do NOT remove any existing features — emergency banners, guidance blocks, alternative management panels, not-funded sections, HealthPathways links, region selector, QA feedback — all must continue to work in both modes
- Do NOT change the viewer's existing colour scheme or typography

## Testing

After implementing, verify:

1. Standalone viewer loads in interactive mode by default
2. Footer toggle switches between interactive and passive
3. Mode persists across page refreshes via localStorage
4. Both modes use the same two-panel layout
5. Passive mode shows no checkboxes, no summary bar, no copy/send buttons
6. "By indication / By urgency" toggle works in both modes
7. Emergency redirect banners, guidance blocks, alternative management panels render in both modes
8. Exam selector works in both modes (navigation is always interactive)
9. Region selector works in both modes
10. URL param `?mode=passive` overrides localStorage and shows passive mode
11. Switching modes preserves exam selection, region, and view grouping
