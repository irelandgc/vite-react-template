# CRR Criteria Viewer v5.2.1 — Change Brief

**Date:** 4 May 2026  
**Changed by:** Gary Ireland (via Claude)  
**Base version:** v5.2.0  
**File:** `crr-criteria-viewer-v5_2_1.html`

---

## Changes Made

### 1. Exam Radio Buttons — Horizontal Layout

**What changed:** Removed the vertical modality group headings ("CT", "Ultrasound", "X-Ray") from the exam selector radio button list. Radio buttons now render in a horizontal flex-wrap row matching the anatomical site checkbox layout.

**Why:** The modality headings were unnecessary and the vertical layout wasted space. The site checkboxes already used a compact horizontal layout — the exam radios should be consistent.

**Code location:** `toolRender()` function, exam selector block (~line 907–921 in v5.2.0).

**Detail:** Replaced `<div class='exam-radio-list'>` with modality sub-groups and `<div class='exam-radio-modality-label'>` headings with a flat `<div class='site-check-row'>` container. Each radio button uses the existing `site-check` class for consistent inline styling. Modality grouping loop retained for ordering but no longer emits group headings.

---

### 2. "More Detail" Toggle — ID Sanitisation Fix

**What changed:** Fixed unreliable "More detail ›" toggle link for `guidanceNarrative` content.

**Why:** The element IDs for the toggle target and link were being constructed using the `esc()` HTML-encoding function (e.g. `guidNarr_` + `esc(TS.examId)`). When exam IDs contained characters like `/` or `&`, the `esc()` output produced IDs that worked in HTML attributes (where the browser decodes entities) but failed in the `onclick` JavaScript string (where the literal `&amp;` was passed to `getElementById()`). This caused the toggle to silently fail for affected exams.

**Fix:** Replaced `esc(TS.examId)` with `TS.examId.replace(/[^a-zA-Z0-9_]/g, "_")` to produce DOM-safe IDs using only alphanumeric characters and underscores. The same sanitised ID is used in both the element `id` attribute and the `onclick` handler, ensuring they always match.

**Code location:** `toolRender()` function, guidanceNarrative block (~line 952 in v5.2.0).

---

### 3. Gateway Indicator Tags Restored

**What changed:** Gateway tags (purple `🔒 Gateway` badges) now appear in the prerequisite block where gateway-related criteria items are rendered.

**Why:** The `gatherPrereqs()` function correctly identified gateway items (criteria mentioning BPAC, neurologist, stroke specialist) and moved them into the "Before referring, confirm:" prerequisite block at the top of the criteria display. However, `toolRenderGroup()` then excluded those same items from the main criteria card list via `excludeLabels`. The criteria cards were the only place gateway badges were rendered — so moving items to prereqs caused their badges to vanish. The items were still displayed (as plain text in the prereq block) but without their visual indicators.

**Fix:** Added `isGateway()` check to `renderPrereqBlock()`. Each prerequisite item is now tested, and if it matches gateway criteria, the `<span class='gateway-tag'>🔒 Gateway</span>` badge is appended inline.

**Code location:** `renderPrereqBlock()` function (~line 1226 in v5.2.0).

---

### 4. Lab Value Indicator Tags Restored

**What changed:** Lab value tags (blue `🔬 Lab value` badges) now appear in the prerequisite block, same fix as gateway tags.

**Why:** Same root cause as the gateway tags — lab value items were being extracted to the prerequisite block by `gatherPrereqs()` and losing their badges in the process.

**Fix:** Added `isLabValue()` check to `renderPrereqBlock()` alongside the gateway check. If an item matches lab value criteria, the `<span class='lab-tag'>🔬 Lab value</span>` badge is appended inline.

**Code location:** `renderPrereqBlock()` function, same block as gateway fix.

---

## Version Updates

Updated version string from `v5.2.0` to `v5.2.1` in four locations:

- `var VER = "v5.2.1";`
- `<title>CRR Criteria Viewer v5.2.1</title>`
- `<div class="app-title">CRR Criteria Viewer v5.2.1</div>`
- `<span class="ver-badge" id="verBadge">v5.2.1</span>`

## Not Changed

- No criteria data changes (embedded `EMBEDDED_DATA` and `COPY_TEXTS` unchanged — Phase 1 data)
- No structural changes to the scan type model
- No changes to the API endpoint configuration
- No changes to region selector, view mode toggle, or export functionality
