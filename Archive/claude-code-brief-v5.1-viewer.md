# CRR Criteria Viewer v5.1 — Claude Code Build Brief

## Context

This is an incremental update to `crr-criteria-viewer-v5.html`. Read that file completely before making any changes. The changes below are additions and fixes only — do not rewrite or restructure anything that already works.

The target output file is `crr-criteria-viewer-v5.1.html`.

---

## What v5.0.0 built successfully — do not touch

The following are all working correctly in v5. Preserve them exactly:

- API load + embedded fallback (`loadCriteriaData`, `init`)
- URL parameter support (`?exam=`, `?sites=`, `?region=`)
- Region/localisation system and HealthPathways URL swapping
- Emergency block (`renderEmergencyBlock`, `isEmergencyGroup`)
- Prerequisites block (`gatherPrereqs`, `renderPrereqBlock`)
- Alternative management and not-funded footer blocks (`renderFooterBlocks`)
- Expandable criterion cards (`toolRenderCb`, `expandedCards`, `toggleCb`)
- Global search (`onGlobalSearch`, `buildSearchIndex`, `selectSearchResult`, `clearGlobalSearch`)
- Gateway badge (`isGateway`, `gateway-card` CSS class, purple left border)
- Lab value detection (`isLabValue`, `lab-card` CSS class)
- Decision panel (`updateDecisionPanel`, `decisionPanel` CSS)
- COPY_TEXTS object (embedded from popup.html — all shorthand summaries present)
- Output generation (`generateOutput`, `getAllChecked`)
- Paediatric mode toggle (`togglePaedMode`, `PAED_EXAMS`)
- Print styles (`@media print`)

---

## What is missing or incomplete in v5 — fix these

### 1. Passive / Interactive mode toggle — NOT BUILT

This is the primary new feature for v5.1. v5.0.0 has no mode system at all. Add:

**URL parameter:** `?mode=passive` or `?mode=interactive`. Read on init. Store in `var viewMode = 'interactive'` (default).

**UI toggle:** When no `?mode=` parameter is present, show a toggle in the header (alongside the existing paediatric button):
```
[ Interactive ] [ Passive ]
```
Style: same pattern as the existing paedToggleBtn — small button, navy header, teal active state. When a `?mode=` param is present, fix the mode and hide the toggle.

**Interactive mode (default — what v5.0.0 already renders):**
- Expandable criterion cards with checkboxes
- Decision panel
- All copy buttons
- Left column with output preview
- No changes needed to existing rendering

**Passive mode — new:**
Passive mode replaces the entire criteria column content with a read-only reference view. It does NOT use the existing `toolRenderCb` card layout. Instead:

- Remove all checkboxes from criteria items
- Remove the decision panel from left column
- Remove all copy buttons and footer action bar
- Left column: show only exam selector, search input, guidance box, HealthPathways link — collapse the output/preview/notes sections
- Right column (full-width feel): render criteria as clean readable groups:
  1. Emergency block (same `renderEmergencyBlock` — already works)
  2. Prerequisites block (same `renderPrereqBlock` — already works)
  3. Priority groups with plain text items (no checkboxes, no expand/collapse)
  4. Alternative management + not-funded blocks (same `renderFooterBlocks` — already works)
  5. Footnotes

For the plain-text passive criteria rendering, add a new function `toolRenderGroupPassive(group)` that renders group items as simple `<div>` rows with a bullet, no checkbox, no expand arrow. Group headers use the same priority colour classes.

**Implementation:** Add `function setViewMode(mode)` that:
- Sets `viewMode`
- Shows/hides the decision panel
- Shows/hides the footer action bar
- Triggers `toolRender()` which should branch on `viewMode` to call either the existing card layout or the new passive layout

Add `var viewMode = 'interactive'` near the top of the JS, alongside `paedMode` and `outputMode`.

---

### 2. QA system — NOT BUILT

v5 is completely missing the QA system from v4.2.0. Port it directly from viewer.html (v4.2.0). The system consists of:

**State:** `var ceQaLog = []` and `var ceQaActive = null`

**Modal HTML:** Add `#ceQaModal` (QA rating modal) alongside the existing modals. Port the modal HTML structure from v4.2.0.

**Functions to port from v4.2.0:**
- `openCeQa()` — opens the QA modal after an assessment
- `setCeQaScore(n)` — sets star rating 1-5
- `saveCeQaEntry()` — saves entry to `ceQaLog` in localStorage
- `exportCeQaLog()` — downloads log as JSON

**Header button:** Add a `★ QA Log` button to the header right section (same pattern as v4.2.0). Style consistent with existing header buttons.

**QA button on assessment:** After criteria are selected (when decision panel is active), show a `★ QA` button in the footer alongside the copy buttons. Tapping opens the QA modal.

The QA system should only be visible/active in Interactive mode. Hide the QA button in Passive mode.

---

### 3. "Copy all (shorthand)" button — COPY_TEXTS not wired

`COPY_TEXTS` is embedded in v5 but never called. Wire it up:

- Add a third copy button to the footer: **"Copy all (shorthand)"**
- On click, look up `COPY_TEXTS[examKey]` where `examKey` is constructed as `examId + '|' + siteId` (matching the popup.html key format, e.g. `"ct|ct_head"`, `"us|us_pelvis"`, `"xr|xr_knee"`)
- If found, copy that text to clipboard and show success status
- If not found (e.g. paediatric exams), grey out / disable the button
- The existing "Copy selected" and "Copy & Close" buttons remain as-is

**Key format mapping:** The COPY_TEXTS keys use `examId|siteId` format. The exam IDs in COPY_TEXTS are the short forms (`ct`, `us`, `xr`, `mri_lumbar`) and site IDs match the existing `TS.examId` / `TS.sites` structure. Check existing keys in COPY_TEXTS to confirm the mapping.

---

### 4. Lab value badge — rendering incomplete

`isLabValue()` exists and `lab-card` CSS class is applied correctly to criterion cards. However there is no visible lab value badge rendered inside the card header or collapsed view. In v4.2.0 the lab value badge was a distinct coloured tag.

Add a visible **📋 Lab value** badge (similar to the gateway badge) that appears in the collapsed card header when `isLabValue(item.label)` is true. Use the existing badge pattern — small blue pill, visible without expanding the card. This mirrors how the gateway badge already works.

---

### 5. Version bump

Change `v5.0.0` to `v5.1.0` in:
- The `<title>` tag
- The `app-title` div text
- The `VER` JS variable
- The footer/provenance text

---

## Implementation notes

**Do not change:**
- Any existing CSS classes or their styles
- `toolRenderCb`, `toolRenderGroup`, `toolRenderItem` — only add the passive variants alongside
- The COPY_TEXTS data object
- The embedded fallback data
- The API loading logic
- The search index or search functions
- The card expand/collapse logic
- The paediatric mode toggle

**IE11 compatibility:** Maintain throughout. Use `var`, no arrow functions, no `classList.toggle` without fallback, `-ms-flexbox` alongside `flex`.

**File size:** v5.0.0 is 246KB. The additions (QA modal, passive render function, mode toggle, COPY_TEXTS wiring) should add ~5-10KB. Target under 260KB.

---

## Summary of changes

| # | Feature | Status in v5 | Action |
|---|---|---|---|
| 1 | Passive / Interactive mode toggle | Missing | Add `setViewMode()`, `toolRenderGroupPassive()`, mode buttons in header |
| 2 | QA system | Missing | Port from v4.2.0 — `openCeQa`, `saveCeQaEntry`, `exportCeQaLog`, modal HTML, header button |
| 3 | Copy all (shorthand) | COPY_TEXTS present but unwired | Add third copy button, wire to `COPY_TEXTS` lookup |
| 4 | Lab value badge | Detection works, badge not rendered | Add visible badge in card header |
| 5 | Version | v5.0.0 | Bump to v5.1.0 |

---

### 6. Copy & Close — window.close() fails in Edge and Chrome

`window.close()` is blocked by modern browsers (Edge, Chrome, Firefox) when the page was not opened programmatically via `window.open()`. The current implementation silently fails.

**Fix:** Replace the `handleCopyAndClose` function with a graceful degradation approach:

```javascript
function handleCopyAndClose() {
  var items = getAllChecked();
  if (!items.length) { showToolStatus("Please select at least one clinical indicator before copying.", "warn"); return; }
  var out = generateOutput();
  var ok = copyToClipboard(out);
  if (!ok) { showToolStatus("Automatic copy failed — please copy from the text box.", "error"); return; }

  // Attempt close — only works if window was opened via window.open()
  showToolStatus("&#10003; Copied to clipboard.", "success");
  setTimeout(function() {
    try {
      window.close();
      // If we're still here after 300ms, close didn't work
      setTimeout(function() {
        showToolStatus("&#10003; Copied. You can now close this tab.", "success");
      }, 300);
    } catch(e) {
      showToolStatus("&#10003; Copied. You can now close this tab.", "success");
    }
  }, 600);
}
```

**Also:** Rename the button label from "Copy & Close" to "Copy + Close tab" to set correct expectations. If the tool is opened via a URL parameter `?popup=1` (set by the referral form when it opens the tool), show the close button prominently. Without that parameter, consider hiding it or showing it greyed with a tooltip: "Close only works when opened from a referral form link."

The `?popup=1` parameter approach: add `var isPopup = getParam('popup') === '1';` on init. If `isPopup` is false, change the button label to "Copy" and remove the close behaviour entirely — it adds nothing when the tool is opened as a standalone tab.
