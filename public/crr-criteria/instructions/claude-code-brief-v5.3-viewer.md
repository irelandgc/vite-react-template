# CRR Criteria Viewer v5.3.0 — Change Brief

**Date:** 4 May 2026  
**Changed by:** Gary Ireland (via Claude)  
**Base version:** v5.2.1  
**File:** `crr-criteria-viewer-v5_3.html`

---

## Changes Made

### 1. Combined Adult and Paediatric Exam List

**What changed:** Removed the Adult/Paediatric toggle button from the header. All adult and paediatric exams now appear together in the exam radio selector. The Paediatric mode banner has been removed.

**Why:** The toggle added an unnecessary interaction step and hid paediatric exams behind a mode switch. GPs who didn't realise they needed to switch might think the exam wasn't available. Paediatric exams are already clearly labelled with "(Paediatric)" in their titles, so there's no confusion risk in showing them alongside adult exams.

**Detail:** `getActiveExamList()` now returns `DATA.exams.concat(PAED_EXAMS)` — adult active exams followed by paediatric exams. The `togglePaedMode()` function and `paedMode` variable remain in the code (for backward compatibility with global search routing) but are no longer user-facing. The `paedToggleBtn` element and `paedBanner` element have been removed from the HTML.

---

### 2. Copy Buttons Hidden in Passive Mode

**What changed:** The footer copy/clear buttons (Copy Selected, Copy & Close, Copy All, Clear All) are hidden when the viewer is in Passive mode.

**Why:** Passive mode is read-only reference — there are no selected criteria to copy. The copy buttons were non-functional in this mode and cluttered the footer.

**Detail:** The footer buttons are wrapped in a `<span id="footerCopyBtns">` element. The `setViewMode()` function now toggles this element's `display` property: `none` for passive, `inline` for interactive.

---

### 3. Clinical Disclaimer Banner at Top

**What changed:** Replaced the small grey footer disclaimer text ("⚠ Prototype — for clinical reference only...") with a prominent red banner fixed below the header.

**Why:** The footer disclaimer was easily missed. A visible red banner ensures users see the clinical reference limitation immediately, consistent with the Triage Advisor tool's approach.

**Banner text:** "This tool is for clinical reference only and does not replace clinical judgement. HealthPathways is the authoritative source for referral criteria."

**Detail:** New `<div id="clinicalDisclaimer">` with `background:#c62828; color:#fff; font-weight:600`. The old `footer-disclaimer` span has been removed from the footer.

---

### 4. "More Detail" Moved Inside Green Guidance Panel

**What changed:** The "More detail ›" toggle link for `guidanceNarrative` content has been moved from floating between the blue exam guidance box and the criteria cards into the green `inlineGuidance` panel (the `ib-green` box) for each anatomical site.

**Why:** The "More detail" link was previously at the exam level, sitting outside the per-site context. Moving it inside the green panel associates it with the specific site guidance where it contextually belongs.

**Detail:** The `guidanceNarrative` is now computed in `toolRender()` and stored on `window._currentGuidNarr`. The per-site rendering functions (`toolRenderSite` for interactive and `toolRenderSitePassive` for passive) check this value and append the "More detail" toggle inside the `ib-green` div after the inline guidance text and HealthPathways link. The toggle link uses the site's green colour scheme (`color:#2a7a40`) instead of the previous teal to match the panel.

---

## Version Updates

Updated version string from `v5.2.1` to `v5.3.0` in four locations: VER variable, `<title>`, header `.app-title`, and `.ver-badge`.

## Not Changed

- No criteria data changes (embedded data unchanged)
- No changes to the v5.2.1 bug fixes (radio layout, gateway/lab tags in prereqs, ID sanitisation)
- No changes to API endpoint, region selector, or export format
- `togglePaedMode()` function retained for internal use by global search routing
