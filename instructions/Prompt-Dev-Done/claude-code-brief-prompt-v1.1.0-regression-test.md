# Claude Code Brief: Triage Advisor Prompt v1.1.0 Regression Test

**Date:** 23 May 2026  
**Purpose:** Run the five evaluator feedback cases through the Triage Advisor using the current active system prompt (v1.1.0) and output the results for review.

---

## What to do

Write and run a Node.js test script that:

1. Fetches the active system prompt from D1 (the `system_prompts` table, `is_active = 1`)
2. For each test case below, builds the full prompt using the same logic as `buildSystemPrompt()` — instruction text from DB + exam-specific criteria from SITE_INDEX + JSON output schema
3. Calls the Anthropic API (claude-sonnet-4-20250514, mode: strict) with the assembled prompt and clinical note
4. Parses the JSON response (apply the code fence stripping logic)
5. Outputs a structured results file

Use the existing codebase to assemble prompts — don't recreate the logic from scratch. Import or replicate the SITE_INDEX data and buildSystemPrompt assembly as closely as possible to what the live tool does.

---

## Test cases

### Case RP-001 | CT Chest/Abdomen/Pelvis
**Clinical note:** `65yo male w/ unexplained wt loss 5% over past 6/12 with no localising symptoms or signs. Hb mildly low. Ex-smoker.`
**Previous verdict (v1.0.0):** Borderline — demanded specific Hb value
**Expected change (v1.1.0):** Should accept "Hb mildly low" as meeting "low Hb" criterion (rule 1d). Should still flag that only one abnormal blood result is documented (need 2+).

### Case RP-002 | Ultrasound Abdomen
**Clinical note:** `61yo european male newly diagnosed autoimmune hepatitis – liver edge felt just below RCM. Screen for HCC, cirrhosis`
**Previous verdict (v1.0.0):** Borderline/likely declined — HCC surveillance gateway overrode hepatomegaly acceptance
**Expected change (v1.1.0):** Should accept on hepatomegaly pathway. HCC surveillance gateway noted as advisory, not as reason to decline (rule 7a).

### Case RP-003 | CT Head
**Clinical note:** `64yo f w/ sudden onset R facial numbness + diplopia, lasting 10min. O/E: reduced sensation R face cf L, FROEM without diplopia. Obs OK, pulse regular. ?TIA`
**Previous verdict (v1.0.0):** Borderline/likely declined — ?TIA triggered gateway, overrode focal neuro signs
**Expected change (v1.1.0):** Should accept on focal neurological signs pathway. ?TIA noted as advisory differential with unmet gateway requirements (rule 7b).

### Case RP-004 | CT Head
**Clinical note:** `48yo m w/ 8/52 h/o progressive HA – bilateral – sometimes associated nausea – dizziness and vertigo over this period (normal hearing + vision testing). ?SOL`
**Previous verdict (v1.0.0):** At risk — "change in pattern" flagged as not clearly documented despite "progressive"
**Expected change (v1.1.0):** "Progressive" should satisfy "change in pattern with progressive increase in frequency or severity" (rule 1e). Should proceed without flagging pattern change as missing.

### Case RP-006 | Renal Ultrasound
**Clinical note:** `75yo m w/ new AKI, eGFR 3 (normally 55). No clear cause.`
**Previous verdict (v1.0.0):** Likely to proceed — found P2 pathway only, didn't surface P1 or alternative management
**Expected change (v1.1.0):** Should surface all matching pathways — P1 48hr AKI indication, P2 acute renal function deterioration, and alternative management recommended. Should flag conflicting dispositions in notes (rule 7c).

---

## Output format

Save results to `instructions/prompt-v1.1.0-test-results.json` with this structure:

```json
{
  "test_run": {
    "date": "2026-05-23T...",
    "prompt_version": "1.1.0",
    "model": "claude-sonnet-4-20250514",
    "mode": "strict"
  },
  "results": [
    {
      "case_id": "RP-001",
      "exam": "CT Chest/Abdomen/Pelvis",
      "clinical_note": "...",
      "ai_response": {
        "verdict": "...",
        "verdict_title": "...",
        "verdict_summary": "...",
        "met_criteria": [...],
        "missing_criteria": [...],
        "notes": "...",
        "safety_alert": null,
        "redirect": null
      },
      "expected_change": "Should accept 'Hb mildly low' without demanding numeric value",
      "change_observed": true/false,
      "notes": "Brief assessment of whether the fix took effect"
    }
  ]
}
```

Also output a human-readable summary to `instructions/prompt-v1.1.0-test-results.md` with each case showing: the clinical note, the AI response summary, whether the expected change was observed, and any unexpected behaviour.

---

## Important

- Use the LIVE active prompt from D1 — do not hardcode prompt text
- Use the same SITE_INDEX/criteria data the live tool uses
- Use the same JSON output schema the live tool uses
- Run in strict mode to match the evaluator test conditions
- If any response fails to parse, record the raw response in the output
