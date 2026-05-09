# CRR Criteria — Business and Clinical Rules

> **Purpose:** Single source of truth for how criteria data is categorised, displayed, and interacted with across the CRR tools. These rules govern the viewer, popup, and triage advisor. They must be preserved through any data restructure or platform migration (including future CQL/FHIR Questionnaire migration).
>
> **Maintained by:** CRR Programme  
> **Last updated:** 2026-05-09  
> **Version:** 1.0

---

## 1. Data Categories

Every piece of criteria content falls into exactly one of these categories. The category determines how it is displayed and whether it is interactive.

| Category | Source Field(s) | Tickable? | Display Location | UI Treatment |
|---|---|---|---|---|
| **Clinical Criterion** | Timeframe/priority groups (Acute, P2, P3, P4, S2, etc.) | ✅ Yes — checkbox | Criteria list (indication-first or urgency-grouped) | Empty checkbox + criteria text + urgency badge + optional Lab value/Gateway badge |
| **Eligibility Requirement** | `outOfCriteriaNote`, `notFundedDetail` (prerequisite portions) | ❌ No | Amber block at top of criteria display | Informational text, not interactive. Labels: "Eligibility requirements" |
| **Not Routinely Funded** | `notFundedDetail`, `outOfCriteriaNote` (exclusion portions) | ❌ No | Red block at bottom of criteria display | Informational, tells referrer what is NOT funded. Never a tickable item |
| **Alternative Management** | `alternativeManagement` | ❌ No | Amber block at bottom of criteria display | Redirect to another pathway. Never a tickable item |
| **Guidance** | `inlineGuidance`, `guidanceNarrative` | ❌ No | Top of criteria display, below site header | Informational context. `inlineGuidance` always visible, `guidanceNarrative` behind "More detail ›" expand |
| **Definitions / Footnotes** | `footnotes` | ❌ No | Bottom of criteria display | Supporting reference (e.g., NZGG family history categories). Expandable/collapsible |
| **HealthPathways Link** | `healthPathwaysUrl` | ❌ No (link) | Within guidance text and instruction block | External link with regional domain swap |
| **Emergency Redirect** | Emergency/redirect items in data | ❌ No | Red banner above criteria list | "Refer for acute assessment — without initial imaging." Prominent, not tickable |

### Rule 1.1: Only Clinical Criteria are tickable
Items from any other category must NEVER appear as tickable checkboxes in the criteria list. If an item exists in both a timeframe group AND in notFundedDetail (rare but possible), it should only appear as a tickable criterion — the not-funded section should reference it but not duplicate it as a separate item.

### Rule 1.2: Category is determined by source field, not content
The same clinical text could theoretically appear in multiple data fields. The source field determines the category and therefore the UI treatment. Do not infer category from the text content.

### Rule 1.3: Not-funded items may be stored as groups, not just fields
**Critical implementation note:** In some exam sites, not-funded content is stored in a separate `notFundedDetail` field. In OTHER exam sites, not-funded content is stored as a **priority group** with a name like "Not funded" or "Not routinely funded" — sitting at the same level as P2 and P3 groups in the data structure, with criteria items inside it.

The indication-first transform MUST filter out groups by name before building the tickable criteria list. Any group whose name/label matches any of the following (case-insensitive) should be EXCLUDED from tickable criteria and routed to the not-funded display section:
- "Not funded"
- "Not routinely funded"  
- "Not indicated"
- "Out of criteria"

This is in addition to checking the `notFundedDetail` and `outOfCriteriaNote` source fields. Both paths must be handled.

---

## 2. Priority / Urgency Mapping

The internal data model uses radiology priority codes. The referrer-facing UI uses clinical timeframe language.

| Internal Code | Referrer-Facing Label | Colour |
|---|---|---|
| Acute (24hr) | Acute 24 (within 24 hours) | Red |
| Acute (48hr) | Acute 48 (within 48 hours) | Red |
| S1 | Urgent (within one week) | Orange/amber |
| P2 / S2 | Urgent (within two weeks) | Orange/amber |
| P3 / S3 | Non-deferrable (within six weeks) | Green |
| P4 | Routine (within six weeks) | Blue/grey |

Note: X-ray exams use S1/S2/S3 codes instead of P2/P3. S1 maps to "within one week", S2 maps to the same urgency as P2, S3 maps to the same urgency as P3. All must display as referrer-friendly timeframe labels.

### Rule 2.1: Referrer UI always uses timeframe labels
P2, P3, P4, S1, S2, S3 codes must never appear in referrer-facing UI — viewer, popup, copy output, or postMessage. Use the timeframe labels above.

### Rule 2.2: Internal sort order preserved
Urgency derivation uses the internal priority ordering: Acute > S1 > P2/S2 > P3/S3 > P4. When multiple items are ticked across different priorities, the highest urgency wins.

### Rule 2.3: Timeframe labels use words not numerals
"within two weeks" not "within 2 weeks". "within six weeks" not "within 6 weeks". This matches the published criteria language.

---

## 3. Indication-First View Rules

The indication-first view reorganises timeframe-grouped data into clinically themed groups.

### Rule 3.1: Clinical theme grouping
Items are grouped by clinical theme (e.g., Bleeding, Anaemia / Blood Results, Cancer / Malignancy, Secondary Care Referral, Neurological, Bowel Symptoms, Family History). The grouping is derived from the content of the criteria items, not from the priority groups.

### Rule 3.2: Every item shows its urgency inline
Each tickable item displays its urgency badge (e.g., "Urgent (within two weeks)") to the right of the criteria text. The referrer can see both the clinical scenario and the resulting priority without switching views.

### Rule 3.3: All items start unticked
No items are ever pre-ticked or system-asserted. Every checkbox starts empty. The referrer actively selects the criteria that match their patient.

### Rule 3.4: Any single tick indicates eligibility
Each criterion is an independent clinical presentation. Ticking any single item means the patient is eligible at that priority level. Items are OR logic within a priority group — the patient does not need to meet multiple criteria.

### Rule 3.5: Compound conditions within items are not decomposed
Some criteria items contain compound AND/PLUS conditions in their text (e.g., "Altered bowel habit >6 weeks PLUS unexplained rectal bleeding AND benign anal causes treated or excluded, aged >50"). These remain as single tickable items. The AND logic lives in the prose and should not be programmatically split — doing so risks changing clinical meaning.

### Rule 3.6: Urgency-grouped view remains available
The "By urgency" toggle switches to the original timeframe-first display. Both views show the same data — just organised differently.

---

## 4. Urgency Derivation

When the referrer ticks criteria items, the system determines the applicable urgency.

### Rule 4.1: Highest urgency wins
If items from multiple priority levels are ticked, the summary shows the highest (most urgent) level. E.g., ticking both a P2 and a P3 item shows "meets Urgent (within two weeks)".

### Rule 4.2: Summary bar display
The urgency determination appears in a pinned summary bar at the top of the criteria area:
- Hidden when nothing is ticked
- Appears immediately when any item is ticked
- Format: `✓ {n} criterion/criteria selected — meets {Urgency Label}`
- Green success style

### Rule 4.3: No assessment of documentation quality
The urgency determination is based solely on which indicators are ticked. It does NOT assess whether the referral note adequately documents the clinical scenario. The summary should include a disclaimer: "Based on selected indicators only. Does not assess documentation quality or completeness."

---

## 5. Copy and Send-to-Form Output

### Rule 5.1: Output format
```
{Exam} {Site}: Criteria meet {Urgency Label}
  - {shorthand item 1}
  - {shorthand item 2}
```

### Rule 5.2: Always use shorthand text
The copy/send output uses the shorthand (`shortLabel`) version of criteria text, not the verbose (`label`) version. The shorthand is the concise clinical summary suitable for a referral note.

### Rule 5.3: No verbose headers or labels
The output does not include "Referral Criteria:", "Site(s):", "Region:", or any framework labels. The first line is self-describing.

### Rule 5.4: Urgency label uses timeframe language
The output uses "Criteria meet Urgent (within two weeks)" — not "Criteria meet P2".

---

## 6. Mode Behaviour

### Rule 6.1: Passive mode
`?mode=passive` — Read-only reference. The referrer can view criteria and tick items to see the urgency determination, but:
- Copy, Send to Form, and Clear All action buttons are hidden
- The pinned summary bar can still show the urgency result (informational)

### Rule 6.2: Interactive mode
`?mode=interactive` — Full interaction. Copy, Send to Form, Clear All buttons visible when items are ticked.

### Rule 6.3: Integration mode
When `exam`, `sites`, and `region` URL parameters are all present:
- Hide region dropdown, exam radio buttons, site checkboxes
- Hide instruction text ("Select the anatomical site(s)...")
- Switch to single-column layout
- Show compact header: "{Exam} — {Site} ({Region})"
- Keep HealthPathways link visible
- Keep all criteria display and interaction intact

### Rule 6.4: Send to Form visibility
The "Send to Form" button appears only when BOTH conditions are true:
- URL contains `sendButton=on`
- `window.opener` exists and is not closed

### Rule 6.5: Copy-and-close in popup context
When `window.opener` exists (opened as popup from a form), Copy and Send to Form both close the popup window after a brief confirmation delay (~700ms–1s). When standalone (no opener), Copy shows confirmation but does NOT close the window.

---

## 7. Display Rules

### Rule 7.1: Lab value badge
Items tagged with `Lab value` show a badge indicating the criterion requires laboratory results. Display as a small coloured badge next to the urgency badge.

### Rule 7.2: Gateway badge
Items tagged with `Gateway` show a badge indicating an access gateway requirement (e.g., specialist endorsement needed). Display as a small coloured badge.

### Rule 7.3: Emergency/redirect items
Some exams have emergency redirect items (e.g., "Refer for acute assessment — without initial imaging" for US Carotid). These display as a prominent red banner above the criteria list. They are NOT tickable — they are directives.

### Rule 7.4: HealthPathways link — regional domain swap
HealthPathways URLs use regional domains. The viewer swaps the domain based on the selected region. The seven confirmed regional instances are: `aucklandregion`, `northland`, `midland`, `hawkesbay`, `3d` (Central), `canterbury` (Waitaha), `southern`. Page IDs are generally consistent across regions — domain swapping is the correct default behaviour.

### Rule 7.5: Eligibility requirements block
Universal qualifying conditions (e.g., CTC's "must tolerate bowel prep AND no previous colonoscopy/CTC within 5 years") display in an amber "Eligibility requirements" block at the top of the criteria area. This block is informational and not tickable. It tells the referrer what must also be true for any criteria to apply.

### Rule 7.6: Not-funded items in eligibility block
The not-funded / out-of-criteria information also appears in the eligibility requirements block as exclusions: "Not indicated for: [list]". This gives the referrer an upfront signal before they scan the criteria list.

### Rule 7.7: No per-item expand/collapse
Criteria items display their full text (or shorthand in output). There are no per-item expand arrows or toggles. The expand/collapse pattern is only used for the guidance narrative ("More detail ›") and definitions/footnotes.

---

## 8. FHIR / CQL Migration Mapping (Future Reference)

These rules map to FHIR Questionnaire and CQL concepts as follows:

| Business Rule | FHIR Questionnaire Concept | CQL Concept |
|---|---|---|
| Clinical Criterion (tickable) | `item` with `type=boolean` | Input variable for CQL expressions |
| Eligibility Requirement | `item` with `type=display`, in prerequisite group | CQL precondition expression |
| Not Routinely Funded | `item` with `type=display`, in exclusion group | CQL exclusion expression |
| Alternative Management | `item` with `type=display`, in redirect group | CQL alternative pathway expression |
| Urgency derivation | Calculated `item` or extension | CQL `define` expression evaluating ticked items |
| Any-single-tick = eligible | OR logic across items | `define "Meets P2": item1 or item2 or item3...` |
| Compound AND in prose | Single `item` (not decomposed) | Single boolean input |
| Highest urgency wins | Calculated output | `define "Priority": if "Meets Acute" then 'Acute' else if "Meets P2" then 'P2'...` |
| Regional variants | `Questionnaire.useContext` with region coding | Context parameter in CQL library |
| Lab value / Gateway tags | `item.extension` or `item.code` | Could gate on external lab data via FHIR observation |

---

## Change Log

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-05-09 | Initial version — consolidated from conversation history, instruction files, and code review |
| 1.1 | 2026-05-09 | Added S1/S2/S3 priority codes (X-ray). Added Rule 1.3: not-funded items may be stored as groups in the data, not just separate fields — transform must filter by group name |
