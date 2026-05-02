# CRR Criteria Viewer v5 — Claude Code Build Brief

## Context

This is a clinical decision support tool for the New Zealand Community Referred Radiology (CRR) programme. GPs use it to look up national imaging criteria before submitting radiology referrals. The tool helps them understand what needs to be documented, what safety redirects apply, and what alternative pathways exist — before submitting through BPAC, HealthLink, or ERMS.

There are three existing tools to study before building:

1. **viewer.html** — the current CRR Criteria Viewer v4.2.0. This is the production reference tool and the source of truth for architecture, data, and clinical logic. Preserve everything unless explicitly told otherwise.

2. **radiology-request-app_31.html** — a proof-of-concept by a different team. Good UX ideas: global keyword search, per-criterion card layout with a1pproval status badges, decision summary panel.

3. **popup.html** — an ultra-lightweight popup version (v3.4.4, 170 lines). Good ideas: emergency redirect treatment as a prominent red block before all other criteria, prerequisite summary before criteria list, pre-written COPY_TEXTS shorthand summaries per exam, window.close() after copy, print styles.

**The goal:** Build crr-criteria-viewer-v5.html — a natural evolution of viewer.html that incorporates the best UX from all three tools, with particular attention to surfacing clinical safety information and exam prerequisites prominently. Both v4.2.0 and v5 will run in parallel for evaluation.

---

## What to preserve exactly from viewer.html (v4.2.0)

### Architecture — do not change
- Decoupled data architecture: loads from API_BASE = "https://crr-criteria-api.fk4dsrmq5r.workers.dev" with embedded fallback
- DATA object structure: DATA.exams array — each exam has id, title, modality, type (singlesite/multisite), active, guidance, healthPathwaysUrl, sites[], groups[], items[], alternativeManagement, notFundedDetail, outOfCriteriaNote, footnotes
- PAED_EXAMS separate array for paediatric criteria
- TS tool state object: { examId, sites, cbs, radios, notes, age, sex, urlLaunched }
- URL parameter support: ?exam=, ?sites=, ?region=
- Region/localisation system: REGIONS object, regionOverrides from API, HealthPathways URL swapping
- outputMode (short/verbose), generateOutput(), clipboard copy
- Paediatric mode toggle (paedMode, togglePaedMode(), PAED_EXAMS)
- Safety alert detection (checkSafetyText())
- QA system (openCeQa(), saveCeQaEntry(), exportCeQaLog())
- All badge logic: Gateway, Lab Value Required, Mandatory, Priority tier (P2/P3/P4/Acute)
- getExamById(), getActiveExamList(), getAllChecked(), toolUpdatePreview(), updateCharCount()
- IE11 compatibility: var throughout (not const/let), no arrow functions, -ms-flexbox prefixes alongside flex
- Loader overlay with spinner while API data loads

### Clinical content — do not change or simplify
- All criteria items, group titles, priority tiers
- Gateway badge logic (isGatewayItem())
- Lab value badge logic
- alternativeManagement, notFundedDetail, outOfCriteriaNote, footnotes — all must render
- Safety alert patterns (checkSafetyText())
- toolRenderSitePanel(), toolRenderSinglesite(), toolRenderGroup(), toolRenderCb()

---

## What to change — UX improvements

### 1. Emergency redirect block — prominent, before all criteria (from popup.html)

This is the most important change. When an exam has criteria items in the "Refer for acute assessment" group (Emergency priority), render these as a visually distinct red alert block ABOVE all other criteria — not as just another group.

Design:
- Render immediately after the guidance box, before the criteria card list
- Red background (#fdecea), red left border (3px solid #c0392b)
- Bold header: "⛔ Refer for acute assessment — without initial imaging"
- Subheading in smaller text: "These presentations require emergency care. Do not arrange community imaging."
- List each emergency item as a bullet with the full criterion text
- The Emergency group must NOT also appear in the criteria card list below — remove it from the card list to avoid duplication

Examples of what this covers (already in the data for these exams):
- Suspected testicular torsion — US Abdomen, US Scrotum
- Suspected ruptured AAA — US Abdomen
- Cauda equina syndrome — X-Ray Spine
- Suspected septic arthritis — X-Ray Knee, Shoulder, Elbow etc.
- Life-threatening haemoptysis — X-Ray Chest, CT Chest
- Suspected large pneumothorax — X-Ray Chest
- Clinically unstable with suspected gynaecologic cause — US Pelvis

### 2. Prerequisites block — before criteria, after emergency block (new)

Surface mandatory prerequisites that must be completed before CRR imaging is appropriate as a distinct "Before referring, confirm:" block between the emergency block and the criteria card list.

What to surface as prerequisites — scan group and item text for:
- Gateway requirements: BPAC TIA decision support tool completion, specialist recommendation
- Lab results that must be available before imaging: ALP, GGT, D-dimer, Wells score, Ca-125, Hb, CRP, ferritin — look for "AND [lab] required" or "investigations including [lab]" patterns
- Prior imaging requirements: "CXR must be performed first", "initial investigation is CXR", "renal ultrasound before CT IVU"
- The Gateway badge items are the clearest signal — always surface these as prerequisites

Design:
- Amber/teal info box — not red (these are not emergencies, just mandatory prerequisites)
- Header: "📋 Before referring, confirm:"
- Short bullet list of prerequisites
- Only show if prerequisites exist for this exam/site
- These items also remain in the full criteria card list — this block is a summary/reminder, not a replacement

### 3. Alternative management and not-funded blocks — improved treatment (from popup.html)

The viewer already renders alternativeManagement and notFundedDetail. Improve their visual distinction to match popup.html's clearer approach, and ensure they are positioned after all criteria cards:

- Alternative management: amber left-border box, clear header "↳ Alternative management / redirect"
- Not routinely funded: red left-border box (lighter red than emergency), header "⊘ Not routinely funded under CRR"
- Out of criteria note: orange box if present
- Footnotes: subtle tinted background so they are not missed
- These are pathway information, not criteria to tick — make that visually clear

### 4. Global natural language search (from radiology-request-app)

Add a search input in the left column, above the exam selector. When user types 3+ characters:

- Search ALL criteria across all exams (adult + paediatric) simultaneously
- Scoring: exact phrase match = 20pts, individual word match = 3pts, clinical keyword bonus = 5pts
- Strip stop words: patient, presented, with, has, had, history, of, the, a, an, and, or, was, were
- Clinical keyword bonus list: chest, pain, headache, cancer, bleeding, acute, suspected, fracture, haemoptysis, seizure, tia, stroke, knee, lesion, lung, mass, torsion, cauda, equina, pneumothorax, testicular, appendicitis
- Show top 8 results as dropdown: exam name, criterion presentation text, priority badge
- Clicking a result navigates to that exam and scrolls to / highlights the matched criterion card
- Clear search returns to exam selector
- Label: "Search criteria" — do NOT call this AI or imply intelligence

### 5. Per-criterion card layout (from radiology-request-app, adapted)

Replace the flat checkbox list in the right 60% column with expandable cards:

Collapsed state (default): priority badge + presentation headline + checkbox
Expanded state: full detail bullet points, any prerequisites specific to this criterion, gateway badge, lab value badge, page reference [pXX]

Rules:
- Ticked criteria stay expanded — GP can review what they have selected
- Gateway criteria: purple left border on collapsed card (visible without expanding)
- Lab value criteria: blue left border on collapsed card
- Emergency criteria: NOT in card list — shown in emergency block (item 1) only
- Group headers (P2, P3, P4, Acute, S2 etc.) remain as section dividers with priority colour as left border
- Mandatory group indicator remains on group header
- Card expand/collapse on click anywhere except checkbox — checkbox is independent

IE11 note: Use onclick handlers not event delegation with closest(). Manipulate className not classList.toggle() without fallback.

### 6. Decision summary panel (from radiology-request-app, adapted)

In the left column between output preview and text output, show live decision status when criteria are ticked:

- Only visible when at least one criterion is ticked
- Green tick — all ticked criteria are standard CRR imaging criteria
- Amber arrow — ticked criteria include alternative pathway or not-funded items
- Red warning — mix of imaging and alternative criteria ticked simultaneously
- Show highest priority tier of approved ticked criteria: "P2 — Urgent, within 2 weeks"
- Disclaimer: "Based on selected indicators only. Does not assess documentation quality or completeness."
- Checkbox-based summary only — not AI, not a clinical verdict

### 7. Three copy modes (from popup.html COPY_TEXTS)

popup.html has a COPY_TEXTS object with pre-written shorthand summaries for every exam/site. These are never used in popup.html (dead code). Wire them into v5 as a third copy option.

Embed the COPY_TEXTS object from popup.html into v5 verbatim — it is a complete set of pre-written shorthand criteria summaries for all adult and paediatric exams.

Three copy buttons in footer:
- "Copy selected" — existing behaviour, copies only ticked items (shorthand or verbose per outputMode)
- "Copy & Close" — copies selected items then calls window.close() — for popup/integration use
- "Copy all (shorthand)" — copies the pre-written COPY_TEXTS entry for the current exam/site, regardless of what is ticked. Shows the full criteria list in compact format. Useful when GP wants to paste all criteria as reference rather than just their ticked items.

Label distinction must be clear. If no COPY_TEXTS entry exists for the current exam/site, grey out the "Copy all (shorthand)" button.

### 8. Layout refinements

Keep 40/60 split (IE11 flexbox, not CSS grid). Improve left column hierarchy:

- Exam selector: larger dropdown, more visually prominent — this is the primary navigation
- After exam selected: compact exam info card showing title, modality, page reference, HealthPathways link
- Guidance box: increase to 12-13px — currently 11px is too small for clinical reading
- Rename output preview panel header to "Selected indicators"
- Text output area: monospace font, slightly tinted background (#f8fafb), click-to-select-all on textarea
- Footer action bar: more spacious, grouped buttons (copy group | clear | output mode)

### 9. Visual design refinements

Keep HNZ palette exactly: navy #003B5C, teal #008B8B. Improve within that palette:

- Priority badges: slightly larger, more visually distinctive
- Group headers: priority colour as left border (Emergency=red, Acute=orange, P2=amber, P3=green, P4=blue, S-dates=teal)
- More breathing room in criteria column — current padding is tight
- Footnotes: subtle tinted background so they are not missed when scrolling
- Print styles (from popup.html): @media print — hide footer buttons, hide header controls, preserve emergency block and criteria in clean print layout

---

## Things NOT to add

- Do NOT add "CRR Imaging Approved / Declined" verdict language — implies a clinical decision the tool cannot make
- Do NOT add AI features or claim AI capabilities
- Do NOT add contrast safety screening questions (eGFR, Metformin, thyroid history) — belong in referral form, not criteria reference
- Do NOT add patient demographics input fields — BPAC/HealthLink handle this
- Do NOT remove or simplify any existing criteria content
- Do NOT break window.close() behaviour — tool may be opened as a popup from referral forms

---

## Output format

Single self-contained HTML file: crr-criteria-viewer-v5.html

- All CSS inline in style tag
- All JS inline in script tag (no external JS beyond Google Fonts if desired)
- No React, no build step — vanilla JS, same pattern as v4.2.0
- IE11 compatible: var throughout, no arrow functions, -ms-flexbox alongside flex
- Target file size: under 350KB (criteria load from API; embedded fallback can be empty array initially)
- Print styles: @media print included

---

## Files to study

Read all three files completely before writing any code:

1. viewer.html — source of truth for architecture, data structure, clinical logic, badge system, output generation, QA system, region localisation
2. radiology-request-app_31.html — reference for global search scoring algorithm, card layout approach, decision summary panel
3. popup.html — reference for emergency block visual treatment, COPY_TEXTS shorthand data (embed this verbatim), prerequisite surfacing pattern, print styles, window.close() after copy

---

## Version and attribution

- Version: v5.0.0
- Title: CRR Criteria Viewer v5.0.0
- Attribution: Health New Zealand | Te Whatu Ora — CRR Programme
- Prototype disclaimer in footer

---

## Key things to get right — in priority order

1. Emergency block — must appear before all criteria for every exam with Emergency items. Must NOT appear in card list below. Clinically most important change.
2. Prerequisites block — must extract and surface prerequisite conditions correctly. Must not remove them from criteria cards.
3. API load + fallback — init() async function, loader overlay, error handling exactly as v4.2.0.
4. URL parameter support — ?exam=ct&sites=ct_head&region=aucklandregion must work and pre-populate.
5. Global search — must navigate to correct exam AND scroll to / highlight matched criterion card.
6. Expandable cards — must not break TS.cbs state, getAllChecked(), or output generation. Checkbox ticking independent of card expand/collapse.
7. Decision panel — must update synchronously on each tick/untick.
8. Paediatric mode — toggle must work on new card layout exactly as before.
9. QA system — must remain functional.
10. Three copy modes — all must generate correct output including COPY_TEXTS shorthand.
11. Alternative/not-funded blocks — improved visual treatment, not removed or simplified.
12. Print styles — clean printed output hiding interactive elements.
