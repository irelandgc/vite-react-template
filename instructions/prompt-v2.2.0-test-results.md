# Triage Advisor v2.2.0 Regression Test Results

**Date:** 2026-05-23T23:13:55.118Z
**Prompt version:** 2.2.0 — Concrete gateway/pathway examples + postmenopausal shorthand
**Model:** claude-sonnet-4-20250514 | **Mode:** strict | **Paediatric detection:** enabled

## Scorecard: 4 improved / 13 unchanged / 3 regressed (20 total)

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
| LP-004 | Ultrasound Pelvis | proceeds | IUD/Mirena malposition assessment | = unchanged |
| CR-001 | Chest X-ray | proceeds | CAP or TB concern | = unchanged |
| CR-002 [P] | Hip X-ray | proceeds | SUFE/hip pathology concern | = unchanged |
| CR-003 | Renal Ultrasound | proceeds | persistent microscopic haematuria,  | = unchanged |
| TEST-001 | CT Chest/Abdomen/Pelvis | proceeds | all CT CAP (3 abnormal bloods, weig | ⬆ improved |
| TEST-003 | CT Head | proceeds | focal neuro signs independently met | ⬆ improved |
| TEST-004 | Ultrasound Abdomen | at_risk | hepatomegaly pathway independently  | ⬇ REGRESSED |
| TEST-005 | Renal Ultrasound | proceeds | surface P1 and P2, note conflicting | = unchanged |
| TEST-006 | CT Head | at_risk | At risk — focal neuro signs transie | = unchanged |
| TEST-007 | CT Chest/Abdomen/Pelvis | declined | At risk or declined — weight loss 3 | = unchanged |

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

### TEST-004 — Ultrasound Abdomen
**Note:** `55yo male, known Hep C. Liver palpable 3cm below costal margin, firm and non-tender. Referred for HCC surveillance and assessment of hepatomegaly.`
**v2.2.0 verdict:** At Risk — Missing Gateway Requirement
**Summary:** Hepatomegaly pathway criteria are met, but HCC surveillance requires gastroenterologist recommendation.
**Missing:** HCC surveillance using liver ultrasound as initially recommended by a gastroenterologist or other secondary care specialist, or as recommended by an agreed local pathway [p31]
**Notes:** Two pathways identified: (1) Hepatomegaly assessment - fully meets P3 criteria; (2) HCC surveillance - requires gastroenterologist recommendation as gateway. Verdict based on hepatomegaly pathway which is fully met. For HCC surveillance, consider referral to gastroenterology for surveillance planning.
**Evaluator expects:** Proceeds — hepatomegaly pathway independently met
**Assessment:** Verdict: at_risk. Priority: P3. Met: 1. Missing: 1.
