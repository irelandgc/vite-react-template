# Claude Code Plan: CRR UI/UX Enhancements — Implementation Brief

**Date:** 28 May 2026  
**Scope:** 11 UI/UX enhancements across Triage Advisor and Criteria Viewer  
**Approach:** Each enhancement has a unique ID, is implemented as an isolated change, and is documented in release notes. Any change can be reverted independently.

---

## IMPORTANT RULES

1. **One commit per enhancement.** Each UX-ID gets its own git commit with the ID in the commit message (e.g., "UX-01: Add loading indicator to Triage Advisor"). This enables reverting any single change with `git revert`.

2. **Feature flags where practical.** For changes that alter information display or layout (UX-02, UX-03, UX-04, UX-11, UX-12), wrap the new behaviour in a simple boolean flag at the top of the file so it can be toggled off without a revert. For simple additive changes (UX-01, UX-05, UX-06, UX-09, UX-10), a git revert is sufficient.

3. **Do not change clinical logic, criteria data, or system prompts.** These are UI/UX changes only.

4. **Update release notes** — add each enhancement to the announcement/release notes page on the Triage Advisor and/or Criteria Viewer as applicable.

5. **Do not iterate or refactor beyond what's specified.** Implement each enhancement as described, commit, move to the next.

---

## Implementation order

Grouped by file to minimise context-switching. Do all Triage Advisor changes first, then Criteria Viewer.

---

### PHASE 1 — Triage Advisor (`public/crr-criteria/triage/index.html` or equivalent)

---

#### UX-01: Loading indicator
**What:** Replace blank wait during API call with a stepped progress indicator.  
**Detail:** Show three stages: "Loading criteria..." → "Assessing referral..." → "Preparing result..." Transition between stages at rough intervals (0s, 3s, 7s). Use a simple text label with a subtle animation (pulsing dot or spinner). No percentage bar.  
**Safeguards:** None required — purely additive.  
**Rollback:** Git revert.

---

#### UX-02: Output section reordering
**What:** Reorder the AI assessment output sections.  
**Detail:** New order:

1. **Safety alerts / emergency redirects** — always pinned at very top in visually distinct alert banner (red/amber). Only present if Step 0 triggered.
2. **Verdict** with priority badge (existing)
3. **Summary** — one-line explanation (existing, may need repositioning)
4. **What's missing** — merged list (see UX-03)
5. **What's documented** — met criteria
6. **Advisory notes** — other pathways, clinical context, redirect suggestions
7. **Suggested wording** (existing, repositioned to bottom)

**Safeguards:** Safety alerts must be tested to confirm they remain at top. Test with an emergency presentation (thunderclap headache) and an ACC redirect (trauma) to verify alert banner renders above verdict.  
**Feature flag:** `const UX02_REORDER_OUTPUT = true;`  
**Rollback:** Set flag to false or git revert.

---

#### UX-03: Merge missing_criteria and add_to_note
**What:** Combine into a single "What's missing" section with enriched items.  
**Detail:** For each missing criterion, produce one line that states what's missing AND what to document. Format: "[Missing element] — [action to take] [page ref]". Example: "Wells score not documented — add numerical value (criteria require ≥2) [p42]".

If an add_to_note item has additional context beyond restating the missing criterion (e.g., a threshold explanation), append it to the merged line rather than creating a separate entry.

If add_to_note contains items that don't correspond to any missing_criteria entry (e.g., general guidance), show them at the end of the section under a "Notes" sub-heading.  
**Feature flag:** `const UX03_MERGE_MISSING = true;`  
**Rollback:** Set flag to false or git revert.

---

#### UX-04: Criteria reference panel — matched first, rest collapsed
**What:** In the criteria reference panel (right side), expand the criteria group the AI matched against and collapse all other groups.  
**Detail:** 

- Identify which criteria group(s) the AI's met_criteria and missing_criteria reference (by page ref or item ID).
- Show matched group(s) expanded at the top of the panel with a highlight border or background.
- Show all other groups as collapsed accordion sections with clear labels (e.g., "TIA criteria ▸", "Focal neurological signs ▸").
- If the AI matched multiple groups, expand all matched groups.
- Clicking a collapsed group expands it. Clicking an expanded group collapses it.
- Within expanded groups, highlight met items (green tick or left border) and missing items (amber/red marker) to match the assessment output.

**Safeguards:** If no criteria group is matched (e.g., declined with no met_criteria), show all groups expanded as current behaviour — don't collapse everything.  
**Feature flag:** `const UX04_PANEL_FILTERING = true;`  
**Rollback:** Set flag to false or git revert.

---

#### UX-05: Character count on free-text input
**What:** Show character count in corner of the clinical note text field.  
**Detail:** Display "342 characters" in small muted text at bottom-right of the textarea. If a practical maximum is determined (test with 1000, 2000, 5000 character inputs first — check latency and output quality), show as "342 / 3000". If no practical limit, show count only.

At 2000+ characters, show a subtle note: "Long notes may increase assessment time."

Do not truncate or block input. Do not prevent paste.  
**Safeguards:** None — purely additive.  
**Rollback:** Git revert.

---

#### UX-06: Prompt version in session info
**What:** Add prompt version to the session info line shown at the bottom of assessments and in QA review cards.  
**Detail:** Current format: "Model: claude-sonnet-4-20250514 · Mode: strict". New format: "Model: claude-sonnet-4-20250514 · Mode: strict · Prompt: v2.2.0". The prompt version is already available from the initial prompt fetch — include it in the display string.  
**Safeguards:** None — purely additive.  
**Rollback:** Git revert.

---

### PHASE 2 — Criteria Viewer (`public/crr-criteria/viewer/index.html` or equivalent)

---

#### UX-07: Search by abbreviation/keyword
**What:** Add clinical abbreviation aliases to criteria search so that searching "PMB" finds all post-menopausal bleeding criteria, not just those containing "PMB" in the text.  
**Detail:** Create a keyword alias map as a JS object or JSON data structure:

```javascript
const SEARCH_ALIASES = {
  'pmb': ['post-menopausal bleeding', 'postmenopausal bleeding'],
  'aub': ['abnormal uterine bleeding'],
  'tia': ['transient ischaemic attack'],
  'sol': ['space-occupying lesion', 'space occupying lesion'],
  'oa': ['osteoarthritis'],
  'sufe': ['slipped upper femoral epiphysis'],
  'lft': ['liver function'],
  'crp': ['c-reactive protein'],
  'hb': ['haemoglobin', 'hemoglobin'],
  'alp': ['alkaline phosphatase'],
  'ca125': ['ca-125'],
  'dvt': ['deep vein thrombosis'],
  'pe': ['pulmonary embolism'],
  'cap': ['community-acquired pneumonia'],
  'ckd': ['chronic kidney disease'],
  'aki': ['acute kidney injury'],
  'iud': ['intrauterine device', 'iucd', 'mirena'],
  'iucd': ['intrauterine device', 'iud', 'mirena'],
  'coc': ['combined oral contraceptive'],
  'mht': ['menopausal hormone therapy', 'hrt'],
  'hrt': ['hormone replacement therapy', 'mht'],
  'esr': ['erythrocyte sedimentation rate'],
  'egfr': ['estimated glomerular filtration rate'],
  'ct kub': ['ct kidneys ureters bladder'],
  'ct ivu': ['ct intravenous urogram'],
  'ct cap': ['ct chest abdomen pelvis'],
  'cxr': ['chest x-ray', 'chest xray'],
};
```

When the user types a search term, also search for all alias expansions. This is additive — the existing text search continues to work; aliases extend it.

**Safeguards:** Search results should indicate which exam type each result belongs to (they likely already do — verify).  
**Rollback:** Git revert (remove alias map and search expansion logic).

---

#### UX-09: Gateway tooltip
**What:** Add an info icon next to the "Gateway" label with a hover/tap explanation.  
**Detail:** Place a small ⓘ icon immediately after the Gateway badge/label. On hover (desktop) or tap (mobile), show a tooltip:

"A gateway is a required procedural step — such as completing a decision support tool or obtaining a specialist recommendation — that must be documented before the referral can be accepted. It is separate from clinical criteria."

Use the existing tooltip/popover pattern if one exists in the codebase. If not, a simple CSS tooltip is sufficient.  
**Safeguards:** None — purely additive.  
**Rollback:** Git revert.

---

#### UX-10: Red flag asterisk cross-reference
**What:** Fix the broken asterisk linkage so "red flag*" links to the red flag detail.  
**Detail:** Implement as a clickable anchor link. Clicking "red flag*" scrolls to the red flag detail section. Add a "back to top" or return link at the detail section. Standard footnote cross-reference pattern.  
**Safeguards:** None — fixing broken linkage.  
**Rollback:** Git revert.

---

#### UX-11: Expandable dense text sections
**What:** Add expand/collapse to text-heavy sections, with safety constraints on which sections can be collapsed.  
**Detail:**

**Sections that CAN be collapsed** (show summary + expand arrow):
- Definitions and sub-criteria detail
- Gateway detailed text (show gateway requirement summary always, detail expandable)
- HealthPathways links

**Sections that MUST remain visible** (summary always shown, only extended detail collapsible):
- Alternative management / redirect — show one-line summary always (e.g., "Alternative management recommended — see details"), expand for full text
- Not-funded items — "NOT ROUTINELY FUNDED" banner always visible, detail expandable

**Sections that MUST NEVER be collapsed:**
- Safety alerts / emergency redirects
- The not-funded banner itself (the detail below it can collapse, the banner cannot)

**Implementation:** Use a consistent expand/collapse component. Default state: collapsed for definitions/HealthPathways, expanded-summary for alternative management, always visible for safety items.

**Feature flag:** `const UX11_EXPANDABLE_SECTIONS = true;`  
**Rollback:** Set flag to false or git revert.

---

#### UX-12: Definitions under relevant urgency
**What:** Display definitions and sub-criteria under the criteria items they relate to, rather than lumped at the top of the page.  
**Detail:** 

- For each definition block, identify which criteria item(s) it relates to (by reference marker *1, *2, etc. or by content matching).
- Display the definition as expandable detail directly below the first criteria item that references it.
- For subsequent criteria items that reference the same definition, show a brief link: "See [definition name] above ↑" that scrolls to the first occurrence.
- Do not duplicate long definition blocks.

**Safeguards:** This requires the criteria data to have linkage between definitions and items. Check the current data structure first — if definitions are stored as standalone blocks without item references, this change needs a data mapping step before the UI change. If the mapping doesn't exist, create it as a separate data structure (similar to SEARCH_ALIASES) rather than modifying the criteria data itself.  
**Feature flag:** `const UX12_DEFINITIONS_INLINE = true;`  
**Rollback:** Set flag to false or git revert.

---

## Release notes

After all enhancements are implemented and deployed, update the release notes on both tools. Write two release notes entries:

### Triage Advisor release note:

> **Assessment display improvements (28 May 2026)**
>
> Based on evaluator feedback, we've improved how assessment results are displayed:
>
> - A progress indicator now shows during the assessment so you can see it's working
> - Results are reordered to show what's missing and what to do first, with supporting detail below
> - The criteria reference panel now highlights the relevant criteria for your referral, with other criteria groups collapsed but accessible
> - Character count shown on the clinical note field
>
> Assessment engine: v2.2.0 · Model: Claude Sonnet 4

### Criteria Viewer release note:

> **Search and display improvements (28 May 2026)**
>
> Based on evaluator feedback:
>
> - Search now recognises common clinical abbreviations (e.g., PMB, TIA, AUB, SUFE) and finds all matching criteria
> - Gateway requirements now include a tooltip explaining what "Gateway" means
> - Dense text sections can be expanded and collapsed for easier scanning
> - Red flag cross-references now link correctly to their detail sections
> - Definitions and sub-criteria are displayed under the relevant criteria items rather than grouped at the top

---

## Execution checklist

1. [ ] UX-01: Loading indicator — commit
2. [ ] UX-02: Output reordering — commit, test safety alert positioning
3. [ ] UX-03: Merge missing/add_to_note — commit
4. [ ] UX-04: Panel filtering — commit, test multi-match and no-match cases
5. [ ] UX-05: Character count — test long input first, then commit
6. [ ] UX-06: Prompt version display — commit
7. [ ] UX-07: Search aliases — commit
8. [ ] UX-09: Gateway tooltip — commit
9. [ ] UX-10: Red flag asterisk — commit
10. [ ] UX-11: Expandable sections — commit, verify safety sections remain visible
11. [ ] UX-12: Definitions inline — check data structure first, then commit
12. [ ] Release notes — update both tools
13. [ ] Deploy
14. [ ] Smoke test both tools end to end
