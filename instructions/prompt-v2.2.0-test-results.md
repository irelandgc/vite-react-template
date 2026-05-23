# Triage Advisor v2.2.0 Regression Test Results

**Date:** 2026-05-23T23:13:55.118Z
**Prompt version:** 2.2.0 — Concrete gateway/pathway examples + postmenopausal shorthand
**Model:** claude-sonnet-4-20250514 | **Mode:** strict | **Paediatric detection:** enabled

## Scorecard: 2 improved / 6 unchanged / 12 regressed (20 total)

| Case | Exam | v2.2.0 Verdict | Evaluator Expects | Status |
|------|------|----------------|-------------------|--------|
| RP-000 | CT Head | proceeds | Correct | = unchanged |
| RP-001 | CT Chest/Abdomen/Pelvis | at_risk | At risk — should accept Hb mildly l | = unchanged |
| RP-002 | Ultrasound Abdomen | proceeds | hepatomegaly pathway independently  | ⬆ improved |
| RP-003 | CT Head | proceeds | focal neurological signs pathway in | ⬆ improved |
| RP-004 | CT Head | proceeds | At risk — "progressive" meets patte | = unchanged |
| RP-005 [P] | Knee X-ray | proceeds | paediatric bone pain | = unchanged |
| RP-006 | Renal Ultrasound | declined | surface P1 AKI and P2, note conflic | ⬇ REGRESSED |
| LP-001 | Chest X-ray | proceeds | CAP | = unchanged |
| LP-002 | Spine X-ray | declined | Redirect to ACC — trauma mechanism | = unchanged |
| LP-003 | Ultrasound Pelvis | at_risk | postmenopausal bleeding | ⬇ REGRESSED |
| LP-004 | Ultrasound Pelvis | ERROR | IUD/Mirena malposition assessment | ⬇ REGRESSED |
| CR-001 | Chest X-ray | ERROR | CAP or TB concern | ⬇ REGRESSED |
| CR-002 [P] | Hip X-ray | ERROR | SUFE/hip pathology concern | ⬇ REGRESSED |
| CR-003 | Renal Ultrasound | ERROR | persistent microscopic haematuria,  | ⬇ REGRESSED |
| TEST-001 | CT Chest/Abdomen/Pelvis | ERROR | all CT CAP (3 abnormal bloods, weig | ⬇ REGRESSED |
| TEST-003 | CT Head | ERROR | focal neuro signs independently met | ⬇ REGRESSED |
| TEST-004 | Ultrasound Abdomen | ERROR | hepatomegaly pathway independently  | ⬇ REGRESSED |
| TEST-005 | Renal Ultrasound | ERROR | surface P1 and P2, note conflicting | ⬇ REGRESSED |
| TEST-006 | CT Head | ERROR | At risk — focal neuro signs transie | ⬇ REGRESSED |
| TEST-007 | CT Chest/Abdomen/Pelvis | ERROR | At risk or declined — weight loss 3 | ⬇ REGRESSED |

## Regressions

### RP-006 — Renal Ultrasound
**Note:** `75yo m w/ new AKI, eGFR 3 (normally 55). No clear cause.`
**v2.2.0 verdict:** Referral likely to be declined
**Summary:** This presentation requires urgent secondary care assessment for acute kidney injury management rather than community imaging.
**Redirect:** Acute kidney injury — manage according to Acute Kidney Injury pathway or seek advice from relevant secondary care specialist
**Notes:** While the note documents acute renal function deterioration, an eGFR of 3 represents severe acute kidney injury requiring urgent nephrology input and hospital-based management rather than community ultrasound imaging.
**Evaluator expects:** Proceeds — surface P1 AKI and P2, note conflicting dispositions
**Assessment:** Verdict: declined. Priority: n/a. Met: 1. Missing: 0. Redirect: Acute kidney injury — manage according to Acute Kidney Injur

### LP-003 — Ultrasound Pelvis
**Note:** `56 yo post menopausal woman on hormone replacement therapy with 2 days of PV bleeding`
**v2.2.0 verdict:** Referral at risk — add missing information
**Summary:** Post-menopausal bleeding pathway identified but missing duration since starting MHT and type of MHT to determine if P2 criteria are met.
**Missing:** Duration since starting MHT (>6 months required for continuous combined MHT pathway) [p46] · Type of MHT (continuous combined vs other) [p46]
**Notes:** Two potential P2 pathways: (1) General post-menopausal bleeding, or (2) Persistent post-menopausal bleeding on continuous combined MHT >6 months since starting therapy. Need MHT details to determine which applies.
**Evaluator expects:** Proceeds — postmenopausal bleeding
**Assessment:** Verdict: at_risk. Priority: P2. Met: 2. Missing: 2.

### LP-004 — Ultrasound Pelvis
**Note:** `35yo with Mirena, recent lower abdominal pain and pv bleeding ? IUD malpositioned`
**v2.2.0 verdict:** API 429: Too Many Requests
**Evaluator expects:** Proceeds — IUD/Mirena malposition assessment
**Assessment:** Error: API 429: Too Many Requests

### CR-001 — Chest X-ray
**Note:** `42 yr old homeless patient with fever productive cough, smoker, unsure re wt loss. Fine lower basal crepitus, mild tachy,`
**v2.2.0 verdict:** API 429: Too Many Requests
**Evaluator expects:** Proceeds — CAP or TB concern
**Assessment:** Error: API 429: Too Many Requests

### CR-002 — Hip X-ray
**Note:** `13 year old boy with R knee pain for past few weeks, staying with grandparents in town holidays and usually lives rurally. Knee examination is normal no fever, mild limp, restricted ROM R hip mild pain. No recent illness`
**v2.2.0 verdict:** API 429: Too Many Requests
**Evaluator expects:** Proceeds — SUFE/hip pathology concern
**Assessment:** Error: API 429: Too Many Requests

### CR-003 — Renal Ultrasound
**Note:** `Persisting microscopic haematuria in usually well and active 64 year old lady works as a hairdresser all her life, non smoker, No infection on microscopy, no wt loss or other symptoms`
**v2.2.0 verdict:** API 429: Too Many Requests
**Evaluator expects:** Proceeds — persistent microscopic haematuria, no infection
**Assessment:** Error: API 429: Too Many Requests

### TEST-001 — CT Chest/Abdomen/Pelvis
**Note:** `62yo male w/ unexplained weight loss 8% over 4 months. No focal pathology. CRP raised, Hb low, albumin low. Ex-smoker.`
**v2.2.0 verdict:** API 429: Too Many Requests
**Evaluator expects:** Proceeds — all CT CAP criteria met (3 abnormal bloods, weight loss ≥5% over ≥3 months)
**Assessment:** Error: API 429: Too Many Requests

### TEST-003 — CT Head
**Note:** `58yo m w/ sudden onset L arm weakness and facial droop, resolved after 20 minutes. O/E: mild residual L facial weakness. BP 165/95. ?TIA`
**v2.2.0 verdict:** API 429: Too Many Requests
**Evaluator expects:** Proceeds — focal neuro signs independently met; TIA gateway advisory
**Assessment:** Error: API 429: Too Many Requests

### TEST-004 — Ultrasound Abdomen
**Note:** `55yo male, known Hep C. Liver palpable 3cm below costal margin, firm and non-tender. Referred for HCC surveillance and assessment of hepatomegaly.`
**v2.2.0 verdict:** API 429: Too Many Requests
**Evaluator expects:** Proceeds — hepatomegaly pathway independently met
**Assessment:** Error: API 429: Too Many Requests

### TEST-005 — Renal Ultrasound
**Note:** `68yo f w/ acute kidney injury, eGFR dropped from 60 to 12 over 5 days. No obstruction suspected. No clear cause identified.`
**v2.2.0 verdict:** API 429: Too Many Requests
**Evaluator expects:** Proceeds — surface P1 and P2, note conflicting dispositions
**Assessment:** Error: API 429: Too Many Requests

### TEST-006 — CT Head
**Note:** `45yo m, episode of slurred speech and R hand clumsiness lasting 30 minutes yesterday. Fully resolved. BP normal. ?TIA. No other focal signs currently.`
**v2.2.0 verdict:** API 429: Too Many Requests
**Evaluator expects:** At risk — focal neuro signs transiently met; TIA gateway advisory; note history of focal signs
**Assessment:** Error: API 429: Too Many Requests

### TEST-007 — CT Chest/Abdomen/Pelvis
**Note:** `70yo f w/ unexplained weight loss 3% over 2 months. Low Hb, raised CRP.`
**v2.2.0 verdict:** API 429: Too Many Requests
**Evaluator expects:** At risk or declined — weight loss 3% (below 5% threshold) AND 2 months (below 3-month threshold)
**Assessment:** Error: API 429: Too Many Requests
