# CRR Criteria Viewer v5.2 — Claude Code Build Brief

## Context

Incremental update to `crr-criteria-viewer-v5.1.html`. Read that file completely before making any changes. All changes below are additions and fixes only — do not rewrite or restructure anything that already works correctly.

Target output: `crr-criteria-viewer-v5.2.html`

---

## What to change

### 1. Gateway items appearing twice — prereq block AND criteria list

`gatherPrereqs()` extracts gateway and lab-value items and renders them in the amber "Before referring, confirm:" block. However `toolRenderGroup()` then renders those same items again in their normal group position in the criteria list. The result is duplication — the same item appears in two places.

**Fix:** After calling `gatherPrereqs()` in both `toolRenderSitePanel()` and `toolRenderSinglesite()`, build an exclusion set of the extracted item labels, then pass it into `toolRenderGroup()` to skip those items when rendering the criteria list.

```javascript
// After gatherPrereqs():
var prereqLabels = {};
for (var p = 0; p < prereqs.length; p++) prereqLabels[prereqs[p]] = true;

// In toolRenderGroup(), skip items in the exclusion set:
// if (prereqLabels[item.label]) continue;
```

Pass `prereqLabels` as a second argument to `toolRenderGroup(group, excludeLabels)`. If a group ends up with no renderable items after exclusion, skip rendering that group entirely (no empty group header).

This fix applies in both interactive and passive modes.

---

### 2. Duplicate not-funded / out-of-criteria text (CT Sinus and similar)

`renderFooterBlocks()` renders both `notFundedDetail` and `outOfCriteriaNote`. For some exams (e.g. CT Sinus) these fields contain the same information — one a short version, one long. The result is two boxes with near-identical content.

**Fix:** In `renderFooterBlocks()`, only render `outOfCriteriaNote` if `notFundedDetail` is empty OR if `outOfCriteriaStyle === 'alert'`. In all other cases where both fields are populated, render only `notFundedDetail` in the red not-funded box and suppress `outOfCriteriaNote`.

```javascript
if (obj.notFundedDetail) {
  // render notFundedDetail in red box
}
// Only render outOfCriteriaNote if notFundedDetail is absent OR style is 'alert'
if (obj.outOfCriteriaNote && (!obj.notFundedDetail || obj.outOfCriteriaStyle === 'alert')) {
  // render outOfCriteriaNote
}
```

---

### 3. guidanceNarrative expand toggle

Each exam/site has a `guidanceNarrative` field containing the full clinical background paragraph. The Viewer currently ignores it. The Triage Advisor renders this text in full — the Viewer should make it available without cluttering the default view.

**Fix:** Add a "More detail ›" link at the end of the `inlineGuidance` green box. Clicking it expands inline to show `guidanceNarrative` directly below the guidance box. A "Less ›" link collapses it.

- Collapsed by default
- Expanded text: 12px, `color: #1a3a4a`, no separate card — renders as a continuation below the green box with a subtle top border separator
- Toggle using a simple `onclick` show/hide on a `<div>` — no animation needed
- Only render the toggle link if `guidanceNarrative` is non-empty
- Works in both interactive and passive modes

---

### 4. Mandatory group visual treatment

When `group.mandatory === true`, improve the visual treatment to match the Triage Advisor's clearer style:

- Add a red `MANDATORY` badge in the group header: `background:#fdecea; color:#c62828; font-size:10px; font-weight:700; padding:1px 6px; border-radius:2px; margin-left:6px`
- Add a red left border to the group container: `border-left: 3px solid #c62828`
- Remove the current italic `(all must be met)` text — the badge replaces it

CT Sinus P3 is the primary example where this applies.

---

### 5. Passive mode — single column layout

In passive mode, the current two-column layout (left column for exam selection, right column for criteria) is unnecessary. Passive mode is a read-only reference view — it should use the full available width.

**Fix:** When `viewMode === 'passive'`, change the layout:

- Remove the left/right column split entirely
- Render exam selection (modality selector + site checkboxes) directly above the criteria content in a single full-width flow
- Guidance box appears directly below the site selection, then criteria content below that
- No output panel, no decision panel, no notes textarea, no copy buttons, no footer action bar — these are already hidden in passive mode
- The single-column layout should feel like reading a clean document: exam header → site selector → guidance → emergency block → prerequisites → criteria groups → alternative management → not funded → footnotes

Implementation: in `toolRender()`, when `viewMode === 'passive'`, write the left column content (exam selector, site checkboxes, guidance) directly into `elCrit` before the criteria groups, rather than into `elMain`. Set `elMain.innerHTML = ''` (or hide it) in passive mode.

---

### 6. Exam selector — replace dropdown with radio buttons

The exam dropdown (`<select>`) is replaced with a radio button group for better scannability and one-click navigation.

**Fix:** In `toolRender()`, replace the exam selector `<select>` with a styled radio button list:

- One radio button per exam, label shows exam title
- Currently selected exam is checked
- Clicking a radio calls `toolSwitch(examId)` immediately (`onchange`)
- Group the radios by modality (CT, Ultrasound, X-Ray, MRI) with a small modality label above each group
- Style: compact, clean — radio buttons flush left, exam name beside them, modality group label in small uppercase teal text
- In passive mode this selector sits above the criteria content in the single-column layout
- In interactive mode it sits in the left column as before, replacing the current dropdown

Example structure:
```
CT
○ CT (multisite)
○ MRI — Lumbar Spine

ULTRASOUND  
○ Ultrasound (multisite)

X-RAY
○ X-Ray (multisite)
```

Since most exams are multisite (CT, US, XR) with a single entry per modality, the list will be short — approximately 4–6 items. Use `exam.modality` to group them.

IE11 note: use `onchange` on each `<input type="radio">` individually, not event delegation.

---

## Version

Bump to `v5.2.0` in `<title>`, `app-title`, `VER` variable, and footer.

---

## Summary

| # | Change | Type |
|---|---|---|
| 1 | Gateway items appearing in prereq block AND criteria list | Bug fix |
| 2 | Duplicate not-funded/out-of-criteria text | Bug fix |
| 3 | guidanceNarrative expand toggle | Enhancement |
| 4 | Mandatory group badge and border treatment | Enhancement |
| 5 | Passive mode — single column layout | Enhancement |
| 6 | Exam selector — radio buttons instead of dropdown | Enhancement |
| — | Version bump to v5.2.0 | Version |

Do not change anything else. Read `crr-criteria-viewer-v5.1.html` completely before writing any code.
