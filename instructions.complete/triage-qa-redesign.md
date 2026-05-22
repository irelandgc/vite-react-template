# Triage Advisor QA — Redesign and Database Storage

## Context

The Triage Advisor QA system needs to capture structured clinical evaluation data and store it in D1 for review via the Admin Tool. The current QA form has a single accuracy score and two free-text fields, which is insufficient for the clinical evaluation programme.

The evaluators are clinicians (Tim, James, Alex and potentially GPs) who will each do a minimum of 10 scored test cases. The form must be fast to complete — tappable responses, minimal typing.

## Part 1: QA Form Redesign

### File: triage/index.html

Replace the current QA modal form with the following structure. Keep the same modal styling but update the content.

### Reviewer Section
- Name field — **pre-populated from localStorage** after first entry. Save to localStorage key "crr-qa-reviewer-name" on submit. Editable if they want to change it.
- Role dropdown — GP, Radiologist, PCRL, Nurse Practitioner, Other. Also saved to localStorage key "crr-qa-reviewer-role".

### Scenario Type (single select, required)
Quick buttons the evaluator taps to classify the case they just tested:

- Clear-cut approve
- Borderline / partial criteria
- Should be declined
- Emergency / ACC redirect

### Assessment Scores (4 separate scores, each 1-5, required)
Each as a row of 5 tappable number buttons (like the current star rating but labelled):

**Criteria identification** — "Did the tool correctly identify which criteria are met and which are missing?"
1 (Poor) to 5 (Excellent)

**Suggestion quality** — "Are the suggestions for improving the referral clinically accurate and specific?"
1 (Poor) to 5 (Excellent)

**Compound handling** — "Does it handle compound or complex presentations appropriately?"
1 (Poor) to 5 (Excellent)

**Safety/redirect** — "Does it correctly flag cases that should be redirected (ED, ACC, not funded)?"
1 (Poor) to 5 (Excellent)

### Overall Assessment (single select, required)
- Accurate — no changes needed
- Minor issues — small inaccuracies but clinically acceptable
- Significant issues — could mislead the referrer
- Wrong — fundamentally incorrect assessment

### Comments (optional, free text)
Single textarea: "Any specific observations, errors, or suggestions?"

### Form Layout
- Keep it compact — the evaluator should be able to complete the form in under 30 seconds
- The scenario type buttons and score buttons should be tappable without scrolling if possible
- Show a running count at the bottom: "You have submitted X QA reviews this session"

## Part 2: Data Captured Per Submission

Each QA submission should store ALL of the following:

### From the form:
- reviewer_name (string)
- reviewer_role (string)
- scenario_type (string: "clear_approve" | "borderline" | "should_decline" | "emergency_redirect")
- score_criteria_id (integer 1-5)
- score_suggestion_quality (integer 1-5)
- score_compound_handling (integer 1-5)
- score_safety_redirect (integer 1-5)
- overall_assessment (string: "accurate" | "minor_issues" | "significant_issues" | "wrong")
- comments (string, optional)

### Captured automatically:
- timestamp (ISO datetime)
- presentation_text (the clinical note the evaluator submitted — the full text from the input field)
- ai_response_summary (the AI assessment output text — what the tool returned)
- exam_identified (what exam/site the AI identified)
- model_used (which AI model produced the assessment — e.g., "claude-sonnet-4")
- documentation_standard (which mode was active — "strict" or "inferred")
- region (selected region)
- session_id (a random ID generated per browser session to group one evaluator's submissions)

## Part 3: D1 Database Storage

### Create table: qa_reviews

```sql
CREATE TABLE IF NOT EXISTS qa_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    session_id TEXT NOT NULL,
    reviewer_name TEXT NOT NULL,
    reviewer_role TEXT NOT NULL,
    scenario_type TEXT NOT NULL,
    score_criteria_id INTEGER NOT NULL,
    score_suggestion_quality INTEGER NOT NULL,
    score_compound_handling INTEGER NOT NULL,
    score_safety_redirect INTEGER NOT NULL,
    overall_assessment TEXT NOT NULL,
    comments TEXT,
    presentation_text TEXT NOT NULL,
    ai_response_summary TEXT NOT NULL,
    exam_identified TEXT,
    model_used TEXT,
    documentation_standard TEXT,
    region TEXT
);
```

### API endpoint

Add a POST endpoint to the Worker API:

POST /api/qa-review

- Accepts JSON body with all fields above
- Inserts into qa_reviews table
- Returns { success: true, id: <new_row_id> }
- No authentication required for this endpoint (evaluators should not need an admin key)
- Rate limit: reasonable limit to prevent abuse (e.g., 100 per hour per IP)

Add a GET endpoint for the Admin Tool:

GET /api/qa-reviews

- Requires x-admin-key authentication
- Returns all QA reviews, newest first
- Supports optional query params: ?reviewer=name&from=date&to=date
- Returns JSON array of review objects

## Part 4: Admin Tool — QA Review Dashboard

### File: admin/index.html (or a new admin/qa.html)

Add a QA Reviews section to the Admin Tool that displays:

- Summary statistics: total reviews, average scores per dimension, score distribution
- Filter by: reviewer, scenario type, overall assessment, date range
- Table of individual reviews: timestamp, reviewer, scenario type, 4 scores, overall, and expandable detail showing the presentation text, AI response, and comments
- Export as CSV button

This does not need to be elaborate — a functional table with filters and export is sufficient for the pilot evaluation.

## Part 5: LocalStorage for Reviewer

On first QA submission, save reviewer_name and reviewer_role to localStorage.
On subsequent QA modal opens, pre-populate these fields from localStorage.
The evaluator can still edit them (in case someone else uses the same browser).

Also generate a session_id on page load (random UUID) and store in sessionStorage. This groups all reviews from one sitting together for analysis.

---

## Addendum — Updates to Deployed Implementation

The following changes should be applied to the already-deployed QA form.

### A1: Change role selector

Replace the current role dropdown with quick-tap buttons: **GP**, **Nurse Practitioner**, **PCRL**, **MIT**, **Radiologist**, **Other**. When "Other" is selected, show a text field for custom role entry. Save the selection (and custom text if Other) to localStorage key "crr-qa-reviewer-role". Pre-populate on subsequent opens.

### A2: Change assessment scores from 1-5 to three-point scale

Replace the 1-5 number buttons with three tappable buttons per dimension:

✗ Wrong / missed | ~ Partially correct | ✓ Correct

Apply to all four scores: Criteria identification, Suggestion quality, Compound handling, Safety/redirect.

Update the D1 schema — the four score columns change from INTEGER to TEXT, storing "wrong", "partial", or "correct".

If the qa_reviews table already exists with INTEGER columns, use ALTER TABLE to change them, or create a new table and migrate. The simplest approach: since this is a pilot with minimal data, drop and recreate the table if needed.

### A3: Add submission count badge on QA button

Show the count of QA reviews submitted this session as a small badge on the QA button itself (like a notification badge), so evaluators can see their progress without opening the form.

### A4: Update Admin Tool dashboard

Update the QA dashboard to handle the three-point scale instead of 1-5. Show distribution as percentage of wrong/partial/correct per dimension rather than averages.
