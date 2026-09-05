# Viewer QA — Redesign and Database Storage

## Context

The Criteria Viewer (viewer/index.html) previously had a QA form but it has been lost during recent updates. It needs rebuilding with a new design that captures structured evaluation data and stores it in D1 for review via the Admin Tool.

The viewer QA evaluates criteria CONTENT accuracy — does the data displayed match the published national criteria document? This is different from the Triage Advisor QA which evaluates AI assessment quality.

Evaluators are clinical content validators (Tim, James, Alex) and potentially GPs. The form must be fast to complete.

## Part 1: QA Form Design

### File: viewer/index.html

Add a QA button to the viewer footer (small star icon, same placement pattern as the Triage Advisor QA button). When clicked, opens a modal form.

### Modal Header
"CLINICAL QA — RATE THIS CRITERIA DISPLAY"

### Description text
"Rate whether the criteria displayed for this exam are accurate and complete according to the national criteria document."

### Reviewer Section
- Name field — pre-populated from localStorage key "crr-qa-reviewer-name"
- Role — quick-tap buttons: **GP**, **Nurse Practitioner**, **PCRL**, **MIT**, **Radiologist**, **Other**. When "Other" is selected, show a text field for custom role entry. Save the selection (and custom text if Other) to localStorage key "crr-qa-reviewer-role". Pre-populate on subsequent opens.

### What are you reviewing? (auto-populated, read-only)
Show the current exam and site being viewed, e.g., "CT — Colonography (CTC) — Auckland Region"
This is captured automatically, not entered by the reviewer.

### Content Accuracy (3-point, required)
"Do the criteria and indications match the current national document for this exam?"
✗ Significant errors | ~ Minor issues | ✓ Accurate

### Usability (3-point, required)
"Can you find what you need quickly? Is the layout clear?"
✗ Difficult | ~ Adequate | ✓ Easy

### Value (3-point, required)
"Would you use this in practice for this exam?"
✗ Would not use | ~ Maybe | ✓ Definitely

### Content Checklist (multi-select checkboxes — tick what IS correct)
Quick validation of specific data elements. The evaluator ticks the ones that are correct for this exam site. Unticked items flag potential issues without requiring the evaluator to write out what is wrong.

- Criteria items correct
- Priority tiers correct
- Gateway flags correct
- Lab value flags correct
- Alternative management correct
- Not-funded items correct
- Guidance text correct
- HealthPathways link works
- Indication groupings make sense

### Issues Found (optional, free text)
Single textarea: "Describe any specific errors, missing items, or suggestions"
Placeholder: "e.g. P3 criteria missing item X, footnote for DVT Wells score incorrect, grouping for Y should be under Z..."

### Footer
- Running count: "X reviews submitted this session"
- Also show the count as a small badge on the QA button itself (like a notification badge) so the evaluator can see their progress without opening the form
- Cancel button
- Save to QA Log button (primary)

## Part 2: Data Captured Per Submission

### From the form:
- reviewer_name (string)
- reviewer_role (string)
- score_accuracy (string: "significant_errors" | "minor_issues" | "accurate")
- score_usability (string: "difficult" | "adequate" | "easy")
- score_value (string: "would_not_use" | "maybe" | "definitely")
- checklist_criteria_correct (boolean)
- checklist_priority_correct (boolean)
- checklist_gateway_correct (boolean)
- checklist_labvalue_correct (boolean)
- checklist_altmgmt_correct (boolean)
- checklist_notfunded_correct (boolean)
- checklist_guidance_correct (boolean)
- checklist_healthpathways_works (boolean)
- checklist_groupings_correct (boolean)
- comments (string, optional)

### Captured automatically:
- timestamp (ISO datetime)
- exam_type (e.g., "ct", "us", "xr")
- site_code (e.g., "ct_colonography", "us_dvt")
- site_label (e.g., "Colonography (CTC)")
- region (selected region)
- view_mode (indication or urgency — which view was active)
- session_id (random UUID per browser session, from sessionStorage)

## Part 3: D1 Database Storage

### Create table: qa_viewer_reviews

```sql
CREATE TABLE IF NOT EXISTS qa_viewer_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    session_id TEXT NOT NULL,
    reviewer_name TEXT NOT NULL,
    reviewer_role TEXT NOT NULL,
    exam_type TEXT NOT NULL,
    site_code TEXT NOT NULL,
    site_label TEXT NOT NULL,
    region TEXT NOT NULL,
    view_mode TEXT,
    score_accuracy TEXT NOT NULL,
    score_usability TEXT NOT NULL,
    score_value TEXT NOT NULL,
    checklist_criteria_correct INTEGER DEFAULT 0,
    checklist_priority_correct INTEGER DEFAULT 0,
    checklist_gateway_correct INTEGER DEFAULT 0,
    checklist_labvalue_correct INTEGER DEFAULT 0,
    checklist_altmgmt_correct INTEGER DEFAULT 0,
    checklist_notfunded_correct INTEGER DEFAULT 0,
    checklist_guidance_correct INTEGER DEFAULT 0,
    checklist_healthpathways_works INTEGER DEFAULT 0,
    checklist_groupings_correct INTEGER DEFAULT 0,
    comments TEXT
);
```

### API endpoints

POST /api/qa-viewer-review
- Accepts JSON body with all fields
- Inserts into qa_viewer_reviews table
- Returns { success: true, id: <new_row_id> }
- No authentication required (evaluators should not need admin key)

GET /api/qa-viewer-reviews
- Requires x-admin-key authentication
- Returns all viewer QA reviews, newest first
- Supports optional query params: ?reviewer=name&exam=ct&site=ct_head&from=date&to=date
- Returns JSON array

## Part 4: Admin Tool — Viewer QA Dashboard

### File: admin/index.html (add alongside the Triage QA dashboard)

Add a Viewer QA Reviews section (separate tab or section from the Triage QA reviews) displaying:

- Summary: total reviews, average scores per dimension (accuracy, usability, value), breakdown by exam type
- Checklist summary: for each checklist item, show percentage ticked as correct across all reviews — this quickly highlights which aspects have the most issues (e.g., if "Gateway flags correct" is only ticked 60% of the time, gateway data needs attention)
- Filter by: reviewer, exam type, site, region, date range
- Table of individual reviews: timestamp, reviewer, exam/site, 3 scores, checklist summary (e.g., "7/9 correct"), expandable for comments
- Export as CSV button

## Part 5: LocalStorage

Share the same localStorage keys as the Triage QA:
- "crr-qa-reviewer-name" — pre-populate name
- "crr-qa-reviewer-role" — pre-populate role

Share the same sessionStorage session_id if present, otherwise generate one.
