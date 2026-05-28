# Triage Advisor v2.2.0 Regression Test Results

**Date:** 2026-05-27T19:12:55.967Z
**Prompt version:** 2.2.0 — Concrete gateway/pathway examples + postmenopausal shorthand
**Model:** claude-sonnet-4-20250514 | **Mode:** strict | **Paediatric detection:** enabled

## Scorecard: 5 improved / 12 unchanged / 3 regressed (20 total)

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
| LP-004 | Ultrasound Pelvis | declined | IUD/Mirena malposition assessment | ⬇ REGRESSED |
| CR-001 | Chest X-ray | proceeds | CAP or TB concern | = unchanged |
| CR-002 [P] | Hip X-ray | proceeds | SUFE/hip pathology concern | = unchanged |
| CR-003 | Renal Ultrasound | proceeds | persistent microscopic haematuria,  | = unchanged |
| TEST-001 | CT Chest/Abdomen/Pelvis | proceeds | all CT CAP (3 abnormal bloods, weig | ⬆ improved |
| TEST-003 | CT Head | proceeds | focal neuro signs independently met | ⬆ improved |
| TEST-004 | Ultrasound Abdomen | proceeds | hepatomegaly pathway independently  | ⬆ improved |
| TEST-005 | Renal Ultrasound | proceeds | surface P1 and P2, note conflicting | = unchanged |
| TEST-006 | CT Head | proceeds | At risk — focal neuro signs transie | = unchanged |
| TEST-007 | CT Chest/Abdomen/Pelvis | declined | At risk or declined — weight loss 3 | = unchanged |

## Regressions

### RP-006 — Renal Ultrasound
**Note:** `75yo m w/ new AKI, eGFR 3 (normally 55). No clear cause.`
**v2.2.0 verdict:** Referral likely to be declined
**Summary:** This presentation requires urgent secondary care assessment for acute kidney injury management rather than community imaging.
**Redirect:** Acute kidney injury — manage according to Acute Kidney Injury pathway or seek advice from relevant secondary care specialist
**Notes:** While the note documents acute renal function deterioration, an eGFR of 3 represents severe kidney failure requiring urgent specialist management rather than community ultrasound imaging
**Evaluator expects:** Proceeds — surface P1 AKI and P2, note conflicting dispositions
**Assessment:** Verdict: declined. Priority: n/a. Met: 1. Missing: 0. Redirect: Acute kidney injury — manage according to Acute Kidney Injur

### LP-003 — Ultrasound Pelvis
**Note:** `56 yo post menopausal woman on hormone replacement therapy with 2 days of PV bleeding`
**v2.2.0 verdict:** Referral at risk — add missing information
**Summary:** Post-menopausal bleeding criteria partially met but missing duration since starting MHT and type of MHT.
**Missing:** Duration since starting MHT (must be >6 months) [p46] · Type of MHT (continuous combined) [p46]
**Notes:** Two potential pathways identified: general post-menopausal bleeding (fully met) and MHT-specific bleeding (partially met). General pathway sufficient for P2 acceptance, but MHT details would help optimize triage.
**Evaluator expects:** Proceeds — postmenopausal bleeding
**Assessment:** Verdict: at_risk. Priority: P2. Met: 2. Missing: 2.

### LP-004 — Ultrasound Pelvis
**Note:** `35yo with Mirena, recent lower abdominal pain and pv bleeding ? IUD malpositioned`
**v2.2.0 verdict:** Referral likely to be declined
**Summary:** IUD malposition assessment is not covered under CRR criteria.
**Redirect:** IUD malposition assessment - seek advice from Family Planning or gynaecology services for appropriate management pathway
**Notes:** While the patient has pelvic pain and bleeding, the specific indication of suspected IUD malposition is not covered under the CRR pelvis ultrasound criteria. This requires specialist assessment through appropriate contraceptive or gynaecological services.
**Evaluator expects:** Proceeds — IUD/Mirena malposition assessment
**Assessment:** Verdict: declined. Priority: n/a. Met: 0. Missing: 0. Redirect: IUD malposition assessment - seek advice from Family Plannin
