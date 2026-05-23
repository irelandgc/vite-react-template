# Claude Code Brief: System Prompt v2.0.0 Regression Test

**Date:** 23 May 2026  
**Purpose:** Run ALL evaluator test cases through the Triage Advisor using prompt v2.0.0 and compare results against v1.0.0 evaluator feedback.

---

## Setup

1. Save the contents of `instructions/system-prompt-v2.0.0.txt` as a new system prompt version in D1 with version "2.0.0", label "Full rewrite — sequential decision process", but do NOT activate it yet.
2. Use the v2.0.0 prompt text for this test run (fetch it from D1 by version, not by active flag).

---

## Test cases

Run every evaluator case from the QA reviews (excluding Gary Tester and Craig Milligan test entries). Use the same exam type and clinical note as recorded. All cases run with model claude-sonnet-4-20250514, mode strict.

### Rhys Parry cases

| Case ID | QA ID | Exam | Clinical note |
|---------|-------|------|---------------|
| RP-000 | 13 | CT Head | 45 maori woman with 2/12 h/o progressively worsening HA present nocturnally and first thing in the morning with associated blurred vision and nausea |
| RP-001 | 16 | CT Chest/Abdomen/Pelvis | 65yo male w/ unexplained wt loss 5% over past 6/12 with no localising symptoms or signs. Hb mildly low. Ex-smoker. |
| RP-002 | 17 | Ultrasound Abdomen | 61yo european male newly diagnosed autoimmune hepatitis – liver edge felt just below RCM. Screen for HCC, cirrhosis |
| RP-003 | 18 | CT Head | 64yo f w/ sudden onset R facial numbness + diplopia, lasting 10min. O/E: reduced sensation R face cf L, FROEM without diplopia. Obs OK, pulse regular. ?TIA |
| RP-004 | 19 | CT Head | 48yo m w/ 8/52 h/o progressive HA – bilateral – sometimes associated nausea – dizziness and vertigo over this period (normal hearing + vision testing). ?SOL |
| RP-005 | 20 | Knee X-ray | 8yo boy 5/12 h/o progressive pain R lower leg – ?knee ?ankle. Pain during the day and night. Limp at times. Stopping him from doing normal activities (basketball and karate). R/O overt malignancy. |
| RP-006 | 21 | Renal Ultrasound | 75yo m w/ new AKI, eGFR 3 (normally 55). No clear cause. |

### Louise Poynton cases

| Case ID | QA ID | Exam | Clinical note |
|---------|-------|------|---------------|
| LP-001 | 8 | Chest X-ray | 55 yo man, 3 days cough, fever and shortness of breath |
| LP-002 | 9 | Spine X-ray | 3 months lower back pain after stepping down from a ladder. no radiation, no bowel symptoms. no fevers. not tender to palpation. normal lower limb exam. |
| LP-003 | 10 | Ultrasound Pelvis | 56 yo post menopausal woman on hormone replacement therapy with 2 days of PV bleeding |
| LP-004 | 11 | Ultrasound Pelvis | 35yo with Mirena, recent lower abdominal pain and pv bleeding ? IUD malpositioned |

### Claire Russell cases

| Case ID | QA ID | Exam | Clinical note |
|---------|-------|------|---------------|
| CR-001 | 22 | Chest X-ray | 42 yr old homeless patient with fever productive cough, smoker, unsure re wt loss. Fine lower basal crepitus, mild tachy, |
| CR-002 | 23 | Hip X-ray | 13 year old boy with R knee pain for past few weeks, staying with grandparents in town holidays and usually lives rurally. Knee examination is normal no fever, mild limp, restricted ROM R hip mild pain. No recent illness |
| CR-003 | 25 | Renal Ultrasound | Persisting microscopic haematuria in usually well and active 64 year old lady works as a hairdresser all her life, non smoker, No infection on microscopy, no wt loss or other symptoms |

Note: CR-002 submitted twice (QA IDs 23 and 24) with different comments — only run once.

### v1.1.0 targeted test cases (no QA ID — designed to test specific rules)

Also re-run the targeted test cases from the v1.1.0 regression to verify v2.0.0 handles them correctly:

| Case ID | Exam | Clinical note |
|---------|------|---------------|
| TEST-001 | CT Chest/Abdomen/Pelvis | 62yo male w/ unexplained weight loss 8% over 4 months. No focal pathology. CRP raised, Hb low, albumin low. Ex-smoker. |
| TEST-003 | CT Head | 58yo m w/ sudden onset L arm weakness and facial droop, resolved after 20 minutes. O/E: mild residual L facial weakness. BP 165/95. ?TIA |
| TEST-004 | Ultrasound Abdomen | 55yo male, known Hep C. Liver palpable 3cm below costal margin, firm and non-tender. Referred for HCC surveillance and assessment of hepatomegaly. |
| TEST-005 | Renal Ultrasound | 68yo f w/ acute kidney injury, eGFR dropped from 60 to 12 over 5 days. No obstruction suspected. No clear cause identified. |
| TEST-006 | CT Head | 45yo m, episode of slurred speech and R hand clumsiness lasting 30 minutes yesterday. Fully resolved. BP normal. ?TIA. No other focal signs currently. |
| TEST-007 | CT Chest/Abdomen/Pelvis | 70yo f w/ unexplained weight loss 3% over 2 months. Low Hb, raised CRP. |

---

## Output

Save results to TWO files:

### 1. `instructions/prompt-v2.0.0-test-results.json`

```json
{
  "test_run": {
    "date": "...",
    "prompt_version": "2.0.0",
    "model": "claude-sonnet-4-20250514",
    "mode": "strict"
  },
  "results": [
    {
      "case_id": "RP-001",
      "qa_id": 16,
      "exam": "...",
      "clinical_note": "...",
      "ai_response": { full response object },
      "previous_verdict_v1": "description of what v1.0.0 produced",
      "evaluator_verdict": "what the evaluator said was correct",
      "evaluator_comment": "the evaluator's comment",
      "regression_status": "improved" | "unchanged" | "regressed",
      "notes": "brief assessment"
    }
  ]
}
```

### 2. `instructions/prompt-v2.0.0-test-results.md`

Human-readable summary with:
- Overall scorecard (improved / unchanged / regressed counts)
- Each case showing: clinical note, v2.0.0 verdict vs evaluator verdict, regression status, assessment notes
- Highlight any regressions (cases that got WORSE compared to v1.0.0)
- Highlight the five target cases (RP-001 through RP-006) showing whether the specific issues are now fixed

---

## Critical

- Use v2.0.0 prompt text from D1 — do not hardcode
- Use the same SITE_INDEX/criteria data and JSON output schema as the live tool
- Use the shared assessment function (post-refactor) to ensure test matches production behaviour
- Run in strict mode
- If any response fails to parse, record the raw response
- Include the `previous_verdict_v1` based on what the evaluators reported, so we can compare without re-running v1.0.0
