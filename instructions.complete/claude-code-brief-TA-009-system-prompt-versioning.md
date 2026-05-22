# Claude Code Brief: TA-009 — System Prompt Version Control

**Requirement:** TA-009 (v2.0, Must have)  
**Brief version:** 1.0  
**Date:** 22 May 2026  
**Context:** The Triage Advisor system prompt currently lives as a hardcoded string assembled by `buildSystemPrompt()` in the Triage Advisor HTML. We need to move the **instruction text** (the assessment rules, safety logic, interpretation guidance) into the database with version control so it can be edited, versioned, and rolled back without redeployment. The first use case is applying three prompt fixes from evaluator feedback.

---

## What this brief covers

Moving the Triage Advisor's **instruction block** (the rules the AI follows — sections 0, 1, 1a, 1b, 1c, temporal ambiguity, Step 0, numbered rules 2–6) into D1 with versioning. The **criteria text** (built dynamically from MATCH_DATA/SITE_INDEX per exam) and the **JSON output schema** stay in code — they are structural, not tuneable.

---

## Current state

`buildSystemPrompt()` in the Triage Advisor assembles the full prompt from:

1. **Preamble** — "You are a clinical decision support assistant for the New Zealand CRR programme..."
2. **Instruction block** — Rules 0, 1, 1a, 1b, 1c, temporal ambiguity, Step 0, rules 2–6. This is the tuneable part. Currently hardcoded as concatenated string literals.
3. **Criteria text** — Built dynamically from SITE_INDEX data per exam site. NOT tuneable — changes via data load.
4. **JSON output schema** — The response format specification. Changes only with code changes.

Only part 2 (the instruction block) moves to the database.

---

## Database schema

Add two tables to D1:

```sql
CREATE TABLE system_prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,        -- e.g. '1.0.0', '1.1.0'
  label TEXT NOT NULL,                 -- human-readable, e.g. 'Initial baseline'
  instruction_text TEXT NOT NULL,      -- the full instruction block text
  changelog TEXT,                      -- what changed and why, reference case IDs
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL,            -- e.g. 'gary.ireland'
  is_active INTEGER NOT NULL DEFAULT 0 -- only one row should have is_active = 1
);

CREATE INDEX idx_sp_active ON system_prompts(is_active);
CREATE INDEX idx_sp_version ON system_prompts(version);

CREATE TABLE system_prompt_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,                -- 'activate', 'create', 'rollback'
  prompt_version TEXT NOT NULL,        -- version affected
  previous_version TEXT,               -- version it replaced (for activate/rollback)
  performed_at TEXT NOT NULL DEFAULT (datetime('now')),
  performed_by TEXT NOT NULL,
  reason TEXT                          -- why the change was made
);
```

---

## API endpoints

All endpoints require `x-admin-key` authentication. Add to the existing Hono worker routes under `/crr-api/`.

### GET /crr-api/system-prompt
Returns the currently active system prompt instruction text. This is the endpoint the Triage Advisor calls at runtime.

**Response:**
```json
{
  "version": "1.0.0",
  "label": "Initial baseline",
  "instruction_text": "0. NUMERIC THRESHOLDS ARE HARD MINIMUMS...",
  "created_at": "2026-05-22T..."
}
```

**Caching:** Cache in KV under key `system_prompt:active` on activation. The Triage Advisor reads from KV for performance; KV is updated whenever the active prompt changes. Fallback to D1 if KV miss.

### GET /crr-api/system-prompt/versions
Returns all versions (without full instruction_text — just metadata) for the version list UI.

**Response:**
```json
{
  "versions": [
    {
      "id": 1,
      "version": "1.0.0",
      "label": "Initial baseline",
      "changelog": null,
      "created_at": "2026-05-22T...",
      "created_by": "gary.ireland",
      "is_active": true
    }
  ]
}
```

### GET /crr-api/system-prompt/versions/:version
Returns full detail for a specific version including instruction_text. For viewing/comparing versions.

### POST /crr-api/system-prompt/versions
Creates a new version. Does NOT automatically activate it.

**Request body:**
```json
{
  "version": "1.1.0",
  "label": "Evaluator feedback fixes — pathway priority, semantic equivalence",
  "instruction_text": "...",
  "changelog": "Fixes from RP-001, RP-002, RP-003, RP-004. Added: qualitative term acceptance, pathway priority logic, differential diagnosis marker handling.",
  "created_by": "gary.ireland"
}
```

### POST /crr-api/system-prompt/activate/:version
Sets the specified version as active. Deactivates the current active version. Updates KV cache. Writes audit log entry.

**Request body:**
```json
{
  "activated_by": "gary.ireland",
  "reason": "Applying evaluator feedback fixes for pathway priority and semantic equivalence"
}
```

### POST /crr-api/system-prompt/rollback/:version
Convenience alias for activate — semantically the same but logs the action as 'rollback' in the audit table for traceability.

### GET /crr-api/system-prompt/audit
Returns the audit log. Most recent first.

---

## Triage Advisor changes

### Loading the prompt

Currently `buildSystemPrompt()` hardcodes the instruction text. Change it to:

1. On page load (or first assessment), fetch `GET /crr-api/system-prompt` and cache the result in a module-level variable.
2. `buildSystemPrompt()` uses the fetched `instruction_text` instead of the hardcoded string.
3. The preamble ("You are a clinical decision support assistant..."), criteria text (from SITE_INDEX), and JSON output schema remain in code — only the instruction block comes from the API.
4. Display the active prompt version somewhere visible — e.g. in the session info line at the bottom of QA reviews (currently shows model and mode). Add `· Prompt: v1.0.0`.
5. If the fetch fails, fall back to the current hardcoded text so the tool doesn't break.

### Prompt structure in buildSystemPrompt()

The assembled prompt should be:

```
{preamble}

{instruction_text from DB}

CRITERIA:

{criteria text built from SITE_INDEX — unchanged}

{JSON output schema — unchanged}
```

The instruction_text from the DB is inserted as-is between the preamble and the criteria block. It contains the full text of rules 0, 1, 1a, 1b, 1c, temporal ambiguity, Step 0, and rules 2–6.

---

## Admin Tool changes

Add a "System Prompts" section to the Admin Tool with:

1. **Version list** — table showing all versions with version number, label, created date, active status. Active version highlighted.
2. **View version** — click to see full instruction text and changelog.
3. **Create new version** — text editor (plain textarea is fine, doesn't need to be rich text) pre-populated with the current active version's text. Fields for version number, label, changelog. Save creates the version but does NOT activate.
4. **Activate** — button on any inactive version to make it active. Confirm dialog: "Activate version X.Y.Z? This will replace the currently active version (A.B.C)."
5. **Diff view** — nice to have, not essential for v1. Compare two versions side by side.
6. **Audit log** — table showing activation/rollback history.

The text editor should be a monospace textarea, full-width, tall enough to show the instruction block without excessive scrolling (~40 rows minimum). No markdown rendering needed — the prompt is plain text.

---

## Migration: seed v1.0.0

On first deployment, seed the `system_prompts` table with the current hardcoded instruction text as version 1.0.0. Extract the exact text from the current `buildSystemPrompt()` function — everything between the preamble and the criteria block.

The seed should:
1. Insert one row with version "1.0.0", label "Initial baseline — hardcoded prompt migration", is_active = 1
2. Write the KV cache entry
3. Log the activation in system_prompt_audit

Write a migration script (can be a wrangler D1 command or a one-shot API call) that extracts the instruction text and seeds it.

---

## Compare Models mode

The Compare Models mode currently shares `buildSystemPrompt()`. After this change, both standard mode and compare mode will automatically use the DB-stored prompt since they share the same function. No separate changes needed — but verify this works.

---

## Usage and QA logging

The tool currently logs every Triage Advisor assessment (not just QA reviews). Both logs should record the prompt version:

1. **Usage log** (every assessment) — add `prompt_version` to the record written on each AI call. This lets you correlate any assessment with the prompt that produced it, not just the ones evaluators reviewed.
2. **QA review export** — add `prompt_version` to the review record so the evaluator feedback log can track which prompt version produced each result.

The prompt version is already available client-side from the initial fetch — just include it in the payload sent to the logging endpoint alongside model, mode, tokens, etc.

---

## What NOT to change

- **Criteria text generation** — the SITE_INDEX/MATCH_DATA loop that builds criteria text stays in code. It's data-driven, not prompt-driven.
- **JSON output schema** — stays in code. Changes here are structural.
- **Preamble** — "You are a clinical decision support assistant..." stays in code. It's boilerplate identity, not tuneable logic.
- **Temperature, model selection, max_tokens** — these are code configuration, not prompt content.

---

## Test plan

1. Deploy with v1.0.0 seeded. Run the same test cases from the evaluator feedback log (RP-000 through RP-006) and verify identical results to current hardcoded prompt.
2. Create v1.1.0 with the three evaluator feedback fixes (to be provided as a separate brief after TA-009 is implemented). Activate it. Run the same test cases and verify the fixes take effect.
3. Roll back to v1.0.0. Verify the old behaviour returns.
4. Check the audit log shows all three actions (activate 1.0.0, activate 1.1.0, rollback to 1.0.0).
5. Verify the Triage Advisor displays the correct prompt version in the session info line.
6. Verify Compare Models mode uses the same DB prompt as standard mode.

---

## Files likely affected

- `src/worker/index.ts` — new API routes
- `src/worker/db.ts` or similar — new DB queries
- `public/triage-advisor/index.html` — fetch prompt from API, update buildSystemPrompt()
- `public/admin/index.html` — new System Prompts section
- `wrangler.json` — D1 migration for new tables
- Migration SQL file for table creation and v1.0.0 seed
