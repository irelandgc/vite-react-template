# CRR Tools — Claude Code Work Items

## Context

The CRR (Community Referred Radiology) programme has three web-based tools:

1. **Criteria Viewer** (`viewer/index.html`) — Full criteria reference viewer. Displays National Radiology Access Criteria for a selected exam type and body site with regional HealthPathways localisation.
2. **Popup Viewer** (`viewer/popup.html`) — Compact version of the viewer designed to be launched as a popup window from a referral form (HealthLink, BPAC, ERMS). Copy-and-close already works correctly in popup.html — do not change its copy behaviour.
3. **Triage Advisor** (`triage/index.html`) — AI-assisted referral quality assessment tool. The referrer enters a clinical presentation and the tool evaluates it against access criteria using Claude via the Cloudflare Worker API proxy.

These tools are hosted on Cloudflare Workers/Pages at:
```
https://vite-react-template.fk4dsrmq5r.workers.dev/crr-criteria/
```

URL structure:
- Viewer: `/crr-criteria/viewer/?exam=ct&sites=ct_head&region=3d&mode=passive`
- Popup:  `/crr-criteria/viewer/popup?exam=us&sites=us_carotid&region=3d&mode=passive`
- Triage: `/crr-criteria/triage/?exam=ct&sites=ct_head&region=3d&presentation=<encoded text>`

A **demo harness** page (`crr-demo-harness.html`) simulates referral platforms (HealthLink, BPAC, ERMS) and launches these tools. It listens for `postMessage` events so the tools can send data back to the form.

---

## Work Items

### 1. Fix: Viewer Copy button should close popup when opened from a referral form

**Files:** `viewer/index.html` only — `viewer/popup.html` already handles copy-and-close correctly, do NOT change it.

**Current behaviour:** When the full viewer (`viewer/index.html`) is opened as a popup (via `window.open()` from a referral form), clicking the Copy button copies text to clipboard but does NOT close the popup window.

**Expected behaviour:** When the viewer was opened as a popup (i.e., `window.opener` exists and is not closed), clicking Copy should:
1. Copy the criteria summary text to clipboard
2. Show brief "Copied!" confirmation (0.5–1 second)
3. Then close the popup window with `window.close()`

If `window.opener` does not exist (viewer opened standalone/directly), Copy should behave as it does now — copy to clipboard, show confirmation, but do NOT close the window.

**How to detect popup context:**
```javascript
var isPopup = !!(window.opener && !window.opener.closed);
```

### 2. Fix: Triage Advisor Copy button — wrong text and doesn't close

**Files:** `triage/index.html`

**Current behaviour:** 
- The Copy button does NOT copy the correct text — review what text is actually being copied vs what the AI assessment output contains. The copied text should be the full AI-generated assessment that's displayed to the user after they submit a referral note for review.
- The Copy button does NOT close the popup window when opened from a referral form.

**Expected behaviour:**
- Copy should capture the complete AI assessment output text (the formatted assessment the user sees after the AI evaluates their referral note)
- Same popup-close logic as the viewer: if `window.opener` exists, close after copying. If standalone, stay open.

### 3. New: "Send to Form" postMessage integration

**Files:** `viewer/index.html`, `viewer/popup.html`, `triage/index.html`

**Context:** The demo harness (and eventually real referral platforms like HealthLink/BPAC/ERMS) listens for `postMessage` events with this contract:

```javascript
// Sent FROM the tool (viewer/popup/triage) TO the parent window:
window.opener.postMessage({
    type: 'crr-output',
    text: '...the criteria text or assessment...',
    source: 'viewer' | 'triage'
}, '*');
```

The parent page receives this and writes the text into its clinical notes field. In a real integration, HealthLink/BPAC/ERMS would add this same ~10-line listener to their form page.

**The "Send to Form" button is activated by a URL parameter.** The calling application must pass `sendButton=on` in the URL to enable the button. This is because only calling apps that have implemented the postMessage listener should enable it — otherwise the button does nothing useful.

Example URLs:
```
/crr-criteria/viewer/?exam=ct&sites=ct_head&region=3d&mode=passive&sendButton=on
/crr-criteria/viewer/popup?exam=us&sites=us_carotid&region=3d&sendButton=on
/crr-criteria/triage/?exam=ct&sites=ct_head&region=3d&sendButton=on
```

**Visibility logic:** The "Send to Form" button appears ONLY when ALL of these are true:
1. The URL contains `sendButton=on`
2. `window.opener` exists and is not closed

If either condition is false, the button is not shown.

**Implementation for the Criteria Viewer (`viewer/index.html`) and Popup Viewer (`viewer/popup.html`):**

1. Add a **"Send to Form"** button near the existing Copy button, using the same button styling.
2. When clicked:
   a. Gather the currently displayed criteria summary text — the exam name, site name, and the list of criteria items shown (ticked criteria, additional notes, alternative management if present). Format as readable plain text suitable for pasting into a clinical note.
   b. Send via: `window.opener.postMessage({ type: 'crr-output', text: summaryText, source: 'viewer' }, '*');`
   c. Show brief visual confirmation (button text changes to "✓ Sent" for 1 second).
   d. Close the popup window with `window.close()`.

**Implementation for the Triage Advisor (`triage/index.html`):**

1. Add a **"Send Assessment to Form"** button — same visibility logic (sendButton=on AND window.opener exists).
2. When clicked:
   a. Gather the AI-generated triage assessment output text (the full assessment displayed after the user submits a referral note for review).
   b. Send via: `window.opener.postMessage({ type: 'crr-output', text: assessmentText, source: 'triage' }, '*');`
   c. Same confirmation/close behaviour as the viewer.

**Important:**
- The `source` field (`'viewer'` or `'triage'`) helps the parent page distinguish what kind of data it received.
- Keep the existing Copy button functionality intact — "Send to Form" is an additional option, not a replacement.
- The "Send to Form" button should sit next to the Copy button.

### 4. Verify: Site codes match D1 database

**Files:** The Cloudflare Worker API, D1 database

The demo harness uses these site codes in URLs. Verify they match what's actually in the D1 database (`crr-criteria`, ID: `1a8307f9-69e9-4315-a8f3-7f6737dd9c55`):

**Ultrasound:**
`us_abdomen`, `us_carotid`, `us_child_hip`, `us_child_spine`, `us_dvt`, `us_msk`, `us_thyroid`, `us_pelvis`, `us_renal`, `us_scrotum`, `us_tissue`, `us_fna`, `other`

**CT:**
`ct_abdo_pelvis`, `ct_cap`, `ct_chest`, `ct_colonography`, `ct_head`, `ct_ivu`, `ct_kub`, `ct_sinuses`

**X-ray:**
`xr_chest`, `xr_abdomen`, `xr_spine`, `xr_upper_limb`, `xr_lower_limb`, `xr_pelvis`, `other`

**MRI:**
`mri_brain`, `mri_spine`, `mri_knee`, `mri_shoulder`, `mri_hip`, `other`

If any codes don't match, note the correct codes so we can update the demo harness.

### 5. Viewer integration mode — hide selection UI, switch to single-column layout

**Files:** `viewer/index.html`

**Context:** The full viewer currently has a two-column layout: left column has exam/site selection + output panels (Selected Indicators, output text), right column has the criteria display. When launched from a referral form with URL parameters, the selection UI and output panels aren't needed — the viewer should behave like a streamlined criteria reference popup.

This effectively makes `viewer/popup.html` redundant. Once this work is done, the full viewer in integration mode replaces the popup viewer. Keep `popup.html` in place (don't delete it — existing links may reference it) but all new development goes into `viewer/index.html`.

**Current behaviour:** The viewer always shows the full two-column layout with region dropdown, exam radio buttons, site checkboxes, instruction text, output panels (Selected Indicators, generated output text), and the shorthand/verbose toggle — regardless of how it was opened.

**Expected behaviour:** When `exam`, `sites`, and `region` URL parameters are ALL present (indicating integration mode):

1. **Hide the selection UI:**
   - Hide the region dropdown row
   - Hide the exam type radio buttons
   - Hide the site checkboxes
   - Hide the instruction text block ("Select the anatomical site(s) being requested...")

2. **Hide the output panels:**
   - Hide the "Selected Indicators" output area
   - Hide the generated output text area
   - Hide the "SELECTED INDICATORS" label and "OUTPUT: Shorthand/Verbose" toggle
   - These panels are useful for standalone debugging but not needed when a referrer is just checking criteria from a form

3. **Switch to single-column layout:**
   - Remove the two-column split — criteria should fill the available width
   - Show a compact header line confirming what's selected, e.g.: "CT Head — Central (3D)"
   - Display the criteria directly below, full-width
   - This works well in an 800×850 popup window

4. **Keep visible:**
   - The "View HealthPathways ›" link if one exists for the selected modality/region — this is important even in integration mode
   - The criteria display with tickable checkboxes
   - The search bar
   - The Copy and Clear All buttons (unless `mode=passive`, see item 5b)
   - The "Send to Form" button (if `sendButton=on`, see item 3)

5. Go straight to displaying the criteria for the specified exam/sites/region

**Standalone mode** (no URL params): Show everything as normal — the user needs the selectors, output panels, and two-column layout to navigate and build output.

**Detection:**
```javascript
var params = new URLSearchParams(window.location.search);
var isIntegration = params.has('exam') && params.has('sites') && params.has('region');
```

### 5b. Viewer: Simplify Copy buttons and hide in passive mode

**Files:** `viewer/index.html`

**Current state:** The viewer has 4 buttons: "Copy selected", "Copy", "Copy all (shorthand)", "Clear All"

**Changes:**
1. **Remove the "Copy" button** — "Copy selected" already does the same thing. Keep "Copy selected" and rename it to just "Copy".
2. **Remove the "Copy all" button** — unnecessary.
3. **Keep "Clear All"** — this is useful.
4. The remaining buttons should be: **"Copy"** (copies ticked items) and **"Clear All"**.
5. **Remove the Shorthand option from the criteria indicators.** The criteria items should display in their normal (verbose) form only — no shorthand toggle needed.
6. **Hide all copy/action buttons when `mode=passive`** is set in the URL. In passive mode the viewer is read-only reference — the referrer is just checking criteria, not building output text. The criteria display, ticking, and HealthPathways link should still work; just hide the copy/clear buttons.

**Detection for passive mode:**
```javascript
var params = new URLSearchParams(window.location.search);
var isPassive = params.get('mode') === 'passive';
```

### 6. UI Modernisation — UX Review and Design System Alignment

**Files:** `viewer/index.html`, `triage/index.html` — do NOT spend time modernising `viewer/popup.html` as it is being superseded by the viewer's integration mode (item 5)

**Goal:** Modernise both tools to feel cohesive with the demo harness design language. The harness uses DM Sans, clean white surfaces, subtle borders, and restrained colour. Both tools currently feel dated by comparison — heavy teal header bars, ALL-CAPS labels, unstyled native controls, and dense visual noise.

This is a cosmetic/UX pass — do NOT change functionality, layout structure, or the criteria display logic. Just update the visual treatment.

#### Design System Reference (match the harness)

**Typography:**
- Font: `'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif`
- Import: `https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap`
- Body text: 13px, weight 400, color `#1a1d21`
- Secondary text: `#5a6068`
- Muted/hint text: `#8b919a`
- Section labels: 10px, weight 600, uppercase, letter-spacing 0.8px, color `#8b919a` — use sparingly, NOT on everything
- Headings: 14-15px, weight 600-700, no all-caps

**Colours:**
- Background: `#f5f6f8`
- Surface (cards, panels): `#ffffff`
- Surface alt (subtle backgrounds): `#f0f2f5`
- Borders: `#dde1e6`
- Accent (primary blue): `#1a6fa0` — use for primary buttons, active states, links
- Accent hover: `#145a84`
- Accent light (backgrounds): `#e8f2fa`
- Teal (triage-specific accent): `#009688` — keep for triage identity but use more sparingly
- Warning: `#d97706` on `#fef3c7`
- Success: `#059669`
- Danger/required: `#dc2626`

**Components:**
- Buttons: `border-radius: 6px`, padding `7px 16px`, font-size 12px, weight 500. Primary = accent bg + white text. Secondary = white bg + border + muted text.
- Segmented controls (for toggles like Strict/Inferred): Use the harness pattern — `background: #f0f2f5` container with `border-radius: 6px`, 2px padding, active segment gets white bg + accent text + subtle shadow. NOT solid coloured buttons.
- Inputs/textareas: `border: 1px solid #dde1e6`, `border-radius: 6px`, padding 8px 10px, focus state `border-color: #4a86b5`
- Cards/panels: `border: 1px solid #dde1e6`, `border-radius: 10px`, `background: white`
- Shadows: Minimal — `0 1px 2px rgba(0,0,0,0.06)` for elevated elements

#### Specific Changes — Criteria Viewer (`index.html`)

1. **Header bar:** Replace the heavy dark teal header ("CRR Criteria Viewer v5.3.0 / Health New Zealand...") with a clean white header matching the harness style. Tool name in 15px weight 700 accent colour. Version and QA Log as subtle badges, not prominent buttons.

2. **PII/disclaimer banner:** Keep it prominent but restyle — white text on a softer amber/warning background instead of the dark bar. Match the harness disclaimer box style (amber bg `#fff8e1`, border `#ffe082`).

3. **Region dropdown:** Style with the `.config-select` pattern — custom appearance, subtle border, proper focus state. (Hidden in integration mode per item 5.)

4. **Exam radio buttons:** Replace native radio buttons with styled segmented control (the harness pattern). Group them cleanly. (Hidden in integration mode per item 5.)

5. **Site checkboxes:** Style the checkboxes — use CSS custom checkboxes with accent colour for checked state. The current raw checkboxes look unfinished.

6. **Instruction text block** ("Select the anatomical site(s)..."): Restyle as a subtle info callout with a light blue background, not a plain text block. (Hidden in integration mode per item 5.)

7. **Priority grouping badges** (the amber/red "ACUTE — WITHIN 48 HOURS", "P2 — URGENT" labels): These actually work well — keep the colour coding but refine the typography. Use the harness badge style (small, rounded, appropriate weight).

8. **Copy buttons bar:** Per item 5b, this is now just "Copy" and "Clear All" (plus "Send to Form" when enabled per item 3). Style as harness secondary buttons. Hidden when `mode=passive`.

9. **Search bar:** Style to match — add proper border-radius, subtle search icon, match input styling.

#### Specific Changes — Triage Advisor

1. **Header bar:** Same treatment as the viewer — replace heavy dark teal with clean white. "CRR Triage Advisor" in accent colour, version/status as subtle badges. The "Ready" badge and "Today: 2 · NZ$0.04" cost display can stay but should be subdued (small, muted text).

2. **PII warning banner:** Restyle to match the viewer's approach — amber/warning style, not dark block.

3. **Column headers** ("CLINICAL NOTE", "AI ASSESSMENT", "CRITERIA REFERENCE"): Remove the traffic-light dots (●). Use the harness section label style — 10px uppercase, muted colour, no dots.

4. **"NOTE & SETTINGS" section header:** Remove the teal block header. Use a subtle section label instead.

5. **"DESCRIBE THE PATIENT AND CLINICAL PRESENTATION" label:** Too long and too loud. Shorten to "Clinical Presentation" in normal weight, 13px.

6. **Strict/Inferred toggle:** Replace the current solid-teal-vs-outlined button pair with the harness segmented control pattern (grey container, white active segment with accent text).

7. **"Check Referral" button:** Keep prominent but restyle as harness primary button (accent blue `#1a6fa0`, not teal). "Clear" as secondary button.

8. **"EXAMPLES" expandable section:** Replace teal block header with a subtle expandable — maybe a text link with chevron, or a light bordered section.

9. **Empty states** ("Enter a note and click Check Referral"): Add a subtle icon and use muted text, matching the harness standalone-empty pattern.

10. **AI Assessment output area:** When assessment is displayed, ensure it uses the harness typography (DM Sans, proper line-height, body colour). Any criteria-met/not-met indicators should use the success/danger colours from the design system.

11. **Textarea:** Style to match — proper border-radius, focus state, placeholder styling.

#### General (Both Tools)

- Remove ALL-CAPS from labels except the small 10px section labels
- Ensure consistent spacing: 16px section padding, 8px between related elements, 14-16px between sections
- Body background should be `#f5f6f8`, not white — content panels sit on cards with white background
- All interactive elements need visible hover states
- Ensure the tools still work correctly in popup windows (smaller viewport) — test at 800x850

---

## Technical Notes

- Hosted on Cloudflare Workers/Pages with GitHub CI/CD
- Worker API: `crr-criteria-api.fk4dsrmq5r.workers.dev` (Hono framework)
- D1 database: `crr-criteria` (ID: `1a8307f9-69e9-4315-a8f3-7f6737dd9c55`)
- KV namespace ID: `d8e1a512828d4dd7981d7b241213f396`
- Use `npx wrangler` from the project folder
- Mac/zsh environment — avoid bash-3.2 quirks
- **File locations:** Viewer is `viewer/index.html`, popup is `viewer/popup.html`, triage is `triage/index.html`
- **popup.html copy-and-close already works** — do not modify its copy behaviour
- **popup.html is being superseded:** Once item 5 is complete, the demo harness will be updated to point the "Popup Viewer" option at `/viewer/` (with URL params triggering integration mode) instead of `/viewer/popup`. Do NOT delete popup.html — existing external links may reference it — but do not invest new development effort into it.

## Priority Order

1. Fix Viewer Copy button close behaviour (item 1) — bug, viewer/index.html only
2. Fix Triage copy text + close (item 2) — bug, triage/index.html
3. Simplify viewer Copy buttons + passive mode hiding (item 5b) — cleanup
4. Viewer hides selection UI in integration mode (item 5) — new feature
5. Add postMessage "Send to Form" with sendButton=on param (item 3) — new feature
6. Verify site codes (item 4) — validation
7. UI Modernisation (item 6) — UX improvement (do this last as it touches the most CSS)
