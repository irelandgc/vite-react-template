# Viewer Styling — Match Triage Advisor via Shared CSS

## Context

The viewer has been updated but still does not visually match the Triage Advisor. The root cause is that both tools have their own independent CSS. This task extracts shared styles into a single stylesheet and then ensures the viewer matches the Triage Advisor exactly.

## Step 1: Create shared design system stylesheet

Extract all shared component styles from triage/index.html into a new file:

public/crr-criteria/shared/crr-design-system.css

This file should contain:

- CSS variables: all colours, spacing values, border-radii, shadows, font sizes
- DM Sans font import
- Typography: body text, headings, section labels (10px uppercase muted), muted text, secondary text, links
- Buttons: primary, secondary, footer bar buttons, segmented controls
- Form controls: checkboxes (custom styled, not native), radio buttons (custom styled), selects, textareas, input focus states
- Badges: urgency timeframe badges, Lab value badge, Gateway badge
- Cards and panels: border styling, padding, left-accent border pattern for categorised content
- Criteria item rows: checkbox + text + badge layout, row padding, hover state
- Section/group headers: the light treatment (small uppercase muted text with thin bottom border, NOT heavy coloured bars)
- Alert blocks: eligibility requirements (amber), alternative management (amber), not-funded (red), emergency redirect (full red banner), PII warning
- Pinned summary bar: sticky positioning, green success style, clear link
- Sticky footer bar: positioning, show/hide behaviour, button layout
- Guidance blocks: left-border accent style, More detail toggle
- Search bar styling

## Step 2: Link from both tools

Both viewer/index.html and triage/index.html should add:

<link rel="stylesheet" href="/crr-criteria/shared/crr-design-system.css">

Remove all duplicated styles from both files. Each file keeps ONLY its layout-specific CSS inline:
- Viewer: two-column standalone layout, single-column integration layout, left panel sizing, right panel sizing
- Triage: three-column layout, column sizing, AI assessment specific styling, suggested wording box

## Step 3: Fix remaining viewer inconsistencies

After linking the shared stylesheet, go through viewer/index.html and ensure every component uses the shared classes. Specific things to check:

- Exam radio buttons: must use the same styled control pattern as the Triage Advisor, not native HTML radios
- Site checkboxes in the left panel: must use custom styled checkboxes, not native
- The teal exam type header bar (e.g. "X-Ray" with "X-Ray" right-aligned): replace with the lighter section header from the shared stylesheet
- Urgency group headers in "By urgency" view: must use left-border accent style, NOT full-width coloured bars. Only exception is the emergency redirect banner which keeps full red.
- Criteria checkbox rows: must have identical padding, spacing, and hover states as the Triage Advisor criteria reference panel
- Group headers (PAIN, BLEEDING, etc.): must use the same light treatment as Triage Advisor section headers
- Instruction text block: match the weight and density of equivalent text in the Triage Advisor
- Region dropdown: match the Triage Advisor select styling

## Step 4: Visual verification

Open both tools side by side and compare:
- Same font rendering and sizes
- Same button styles and sizes
- Same badge colours and shapes
- Same card/panel borders
- Same spacing between sections
- Same checkbox appearance
- Same section header weight

Components that appear in both tools should be pixel-identical.

## Do NOT change

- The viewer layout structure (two-column standalone, single-column integration)
- The triage three-column layout
- Any functionality, data handling, or business logic
- The Triage Advisor appearance (it is the reference, do not modify it)
- Emergency redirect banner stays full-width red
