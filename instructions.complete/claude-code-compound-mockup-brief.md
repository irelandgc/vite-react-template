# Compound Criteria UI Mockup — Claude Code Build Brief

## Context

The CRR Criteria Viewer currently renders all criteria items as atomic — one checkbox per item. We are designing support for compound criteria items that contain AND/OR logic, mandatory+optional groupings, and nested sub-conditions. This mockup demonstrates how compound items sit alongside atomic items in the viewer's existing layout, using the viewer's existing design language.

**This is a standalone mockup page** — it does NOT modify the viewer codebase. It's a visual prototype for working group review and stakeholder demonstration.

## What to build

Create a single standalone HTML file at `public/crr-criteria/compound-mockup.html` that replicates the Criteria Viewer's layout and styling, populated with hardcoded example data from CT Chest (Adult). The page should show a mix of atomic criteria items (rendered as they are today) and compound criteria items (rendered with the new compound logic UI).

## Visual design reference

The mockup MUST match the Criteria Viewer's existing visual language. Study these files before writing any CSS:

1. `public/crr-criteria/viewer/index.html` — the current viewer. Copy its CSS approach, colour variables, typography (DM Sans), badge styles, checkbox styles, section headers, criteria item row layout, and general visual tone.
2. If `public/crr-criteria/shared/crr-design-system.css` exists, import and use it. If not, extract the relevant styles from the viewer.
3. The Triage Advisor (`public/crr-criteria/triage/index.html`) is the design reference for the overall visual system. The viewer and triage advisor share the same design language.

**Critical visual rules:**
- Use the viewer's existing CSS variables, not new colour schemes
- DM Sans font family
- No blue primary colours — use the teal/dark navy palette from the viewer
- Priority badges show TIMEFRAME LANGUAGE ONLY — never show "P2", "P3" codes. Use "Urgent (within two weeks)", "Non-deferrable (within six weeks)" etc.
- Checkboxes use the viewer's custom-styled checkboxes, not native browser checkboxes
- Section headers use the small uppercase muted text style (10px, uppercase, letter-spacing), not heavy coloured bars
- No emoji in the UI (no 🛑, 🟢, ℹ️, 📁, 🧪) — use text labels and subtle colour cues instead
- No "Proceed to Referral" button — this is a criteria list, not a standalone form
- No red "Validation Error" banners — unmet compound items simply appear as not-met, same as unselected atomic items

## Page layout

Replicate the viewer's single-column layout (as used in integration mode). The page should show:

1. **Page header** — "CRR Criteria Viewer — Compound Logic Mockup" with version badge, matching the viewer's header bar style
2. **Exam selector** — hardcoded to "CT Chest — Adult" (no functional dropdown needed, just show the selected state)
3. **View toggle** — "By indication" / "By urgency" segmented control (hardcoded to "By indication" — just show the toggle, don't need to implement the switch)
4. **Criteria list** — this is the main content area, showing a mix of items

## Criteria items to include

Use CT Chest (Adult) as the exam. Include these items in a single indication group called "Lung cancer investigation":

### Atomic items (render as current viewer does)

1. **"Unexplained haemoptysis, chest infection and upper respiratory causes excluded, initial investigations including CXR fail to identify a cause"** — Urgent (within two weeks). Render as a normal single-checkbox criteria item.

2. **"Secondary care clinician or Radiologist advises referral for urgent CT chest"** — Urgent (within two weeks). Normal single-checkbox item.

### Compound items (new rendering)

3. **Pattern A — All (AND): "Current smoker with persistent lung cancer symptoms"** — Urgent (within two weeks).
   
   Logic type: `all` — every sub-condition must be met.
   
   Sub-conditions:
   - "Patient aged over 55 years and is a current smoker"
   - "One or more concerning, new onset symptoms/signs for lung cancer, persistent for six weeks despite appropriate treatment"
   - "Clinical picture unexplained despite initial investigations including chest x-ray and blood tests"
   
   **Rendering:**
   - The item renders as a visually grouped block with a subtle left border accent (use the teal accent colour) and a very light background tint to distinguish it from atomic items
   - A small header line inside the block: "All of the following" in the muted section-header style (10px uppercase)
   - A parent "Verify all" checkbox at the top of the block. Clicking it ticks all three sub-conditions. Unticking any sub-condition unticks the parent
   - Each sub-condition gets its own checkbox, indented slightly under the parent
   - No AND labels between items — the "All of the following" header is sufficient
   - The urgency badge sits on the parent row, same position as atomic items

4. **Pattern B — Mandatory + Pick: "Indeterminate CXR abnormality"** — Urgent (within two weeks).
   
   Logic type: `mandatory_plus_any`
   
   Mandatory condition:
   - "Indeterminate abnormality on chest x-ray raising the possibility of lung cancer"
   
   Options (at least one required):
   - "CT chest is recommended in the Radiology report"
   - "Secondary care clinician or PCRL advises CT chest"
   
   **Rendering:**
   - Same grouped block style as Pattern A
   - Required condition has a "Required" badge (use the existing mandatory badge style from the viewer) and its own checkbox
   - A divider line, then "Plus at least one of the following" in muted header style
   - Each option gets its own checkbox below the divider
   - The parent item's met/not-met state auto-computes: mandatory must be ticked AND at least one option must be ticked

5. **Pattern C — Any (OR): "Abnormal CXR with radiology recommendation"** — Non-deferrable (within six weeks).
   
   Logic type: `any`
   
   Options (any one is sufficient):
   - "Isolated pulmonary nodule on CXR, cannot be confirmed as benign, and CT chest is recommended in the Radiology report"
   - "Secondary care clinician or PCRL advises referral for non-urgent CT chest"
   
   **Rendering:**
   - Same grouped block style
   - "Any of the following" in muted header style
   - Radio buttons (not checkboxes) for exclusive selection — selecting any one satisfies the criterion
   - Parent auto-computes as met when any option is selected

## Three rendering modes

The mockup should demonstrate all three rendering contexts for compound items. Add a mode switcher at the top of the page (a simple segmented control with three options):

### Mode 1: Interactive (default)
- Checkboxes and radio buttons are active and clickable
- Compound items have the full interactive behaviour described above
- "Verify all" shortcut works
- Progressive disclosure works for any nested panels
- A summary bar at the bottom shows count of selected items (matching the viewer's existing pinned summary bar)
- A "Copy selected" button generates shorthand text output for selected criteria

### Mode 2: Passive
- All checkboxes and radio buttons are HIDDEN — no interactive elements
- Compound items render as structured text with AND/OR connector labels between sub-conditions
- The "Required" badge is still visible as a text label
- "All of the following" / "Any of the following" / "Plus at least one of" headers are visible
- Everything is expanded — no progressive disclosure
- No summary bar, no copy button
- Single column layout

### Mode 3: Triage reference
- Same as passive mode but styled as the triage advisor's criteria reference panel (right column)
- This shows how compound criteria would appear in the triage advisor's criteria display
- Read-only, no checkboxes
- Items show met/not-met indicators (use the triage advisor's ✓/✗ style) — hardcode some as met and some as not-met to demonstrate the display

## Evaluation logic (JavaScript)

Implement the evaluation engine from the spec:

```javascript
function evaluateCompound(logic, checkedIds) {
  const checked = (id) => checkedIds.has(id);
  switch (logic.type) {
    case 'all':
      return logic.conditions.every(c => checked(c.id));
    case 'any':
      return logic.conditions.some(c => checked(c.id));
    case 'mandatory_plus_any': {
      const mandatoryMet = logic.conditions
        .filter(c => c.required)
        .every(c => checked(c.id));
      const optionalCount = logic.conditions
        .filter(c => !c.required)
        .filter(c => checked(c.id)).length;
      return mandatoryMet && optionalCount >= (logic.minOptional || 1);
    }
  }
  return false;
}
```

The "Verify all" parent checkbox for AND patterns:
- Clicking it when unchecked → ticks all sub-conditions
- Clicking it when checked → unticks all sub-conditions  
- Unticking any individual sub-condition → unticks the parent
- Ticking the last remaining sub-condition → auto-ticks the parent

## Copy/send output

When in interactive mode, the copy button should generate shorthand text for selected criteria. For compound items:
- AND items: semicolon-separated list of all sub-conditions (they're all required)
- Mandatory + pick: mandatory condition + selected optional, semicolon-separated
- OR items: only the selected option text

## Data structure

Use this hardcoded data structure for the mockup. This matches the compound logic spec:

```javascript
const MOCKUP_DATA = {
  exam: "CT Chest — Adult",
  modality: "CT",
  indicationGroup: "Lung cancer investigation",
  items: [
    // Atomic items
    {
      id: "ct_chest_001",
      text: "Unexplained haemoptysis, chest infection and upper respiratory causes excluded, initial investigations including CXR fail to identify a cause",
      priority: "P2",
      timeframe: "Urgent (within two weeks)",
      mandatory: false,
      logic: null  // null = atomic item
    },
    {
      id: "ct_chest_002", 
      text: "Secondary care clinician or Radiologist advises referral for urgent CT chest",
      priority: "P2",
      timeframe: "Urgent (within two weeks)",
      mandatory: false,
      logic: null
    },
    // Compound: All (AND)
    {
      id: "ct_chest_003",
      text: "Current smoker with persistent lung cancer symptoms",
      shortText: "Smoker >55 + lung cancer symptoms + unexplained on investigation",
      priority: "P2",
      timeframe: "Urgent (within two weeks)",
      mandatory: false,
      logic: {
        type: "all",
        conditions: [
          { id: "ct_chest_003_a", text: "Patient aged over 55 years and is a current smoker" },
          { id: "ct_chest_003_b", text: "One or more concerning, new onset symptoms/signs for lung cancer, persistent for six weeks despite appropriate treatment" },
          { id: "ct_chest_003_c", text: "Clinical picture unexplained despite initial investigations including chest x-ray and blood tests" }
        ]
      }
    },
    // Compound: Mandatory + pick
    {
      id: "ct_chest_004",
      text: "Indeterminate CXR abnormality with recommendation for CT",
      shortText: "Indeterminate CXR + CT recommended",
      priority: "P2",
      timeframe: "Urgent (within two weeks)",
      mandatory: false,
      logic: {
        type: "mandatory_plus_any",
        conditions: [
          { id: "ct_chest_004_a", text: "Indeterminate abnormality on chest x-ray raising the possibility of lung cancer", required: true },
          { id: "ct_chest_004_b", text: "CT chest is recommended in the Radiology report", required: false },
          { id: "ct_chest_004_c", text: "Secondary care clinician or PCRL advises CT chest", required: false }
        ],
        minOptional: 1
      }
    },
    // Compound: Any (OR)
    {
      id: "ct_chest_005",
      text: "Abnormal CXR with radiology recommendation",
      shortText: "CXR abnormality + radiology/clinician recommendation",
      priority: "P3",
      timeframe: "Non-deferrable (within six weeks)",
      mandatory: false,
      logic: {
        type: "any",
        conditions: [
          { id: "ct_chest_005_a", text: "Isolated pulmonary nodule on CXR, cannot be confirmed as benign, and CT chest is recommended in the Radiology report" },
          { id: "ct_chest_005_b", text: "Secondary care clinician or PCRL advises referral for non-urgent CT chest" }
        ]
      }
    }
  ]
};
```

## What NOT to do

- Do NOT modify any existing viewer files — this is a standalone mockup
- Do NOT use React/Vite — this is a single HTML file with inline CSS and JS
- Do NOT use any external dependencies other than Google Fonts (DM Sans)
- Do NOT use emoji icons
- Do NOT show priority codes (P2, P3) anywhere in the UI — only timeframe language
- Do NOT create a standalone form experience — compound items are part of a criteria list
- Do NOT use red/green validation banners — use the viewer's existing subtle met/not-met styling
- Do NOT fetch any data from the API — everything is hardcoded
- Do NOT use localStorage or sessionStorage

## File location

Save to: `public/crr-criteria/compound-mockup.html`

This will be accessible at `https://iteratio.nz/crr-criteria/compound-mockup.html` after deployment.

## Acceptance criteria

1. The page loads and displays the CT Chest criteria list with both atomic and compound items
2. Atomic items look identical to how they appear in the current viewer
3. Compound items are visually distinguishable but use the same design language — not a different visual style
4. The three rendering modes (Interactive, Passive, Triage reference) work via the mode switcher
5. In interactive mode: checkboxes work, "Verify all" shortcut works, evaluation logic correctly computes met/not-met states, copy output generates correct shorthand text
6. In passive mode: no interactive elements, structured text with AND/OR connectors, everything expanded
7. In triage reference mode: read-only with met/not-met indicators, styled like the triage advisor's criteria panel
8. The page is responsive and works on mobile (single column, touch-friendly checkbox sizes)
