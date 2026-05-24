# Triage Advisor v2.1.0 Regression Test Results

**Date:** 2026-05-23T23:03:21.004Z
**Prompt version:** 2.1.0 — Data fix: gender-exclusive criteria + one-pathway-met=proceeds
**Model:** claude-sonnet-4-20250514 | **Mode:** strict | **Paediatric detection:** enabled

## Scorecard: 1 improved / 13 unchanged / 6 regressed (20 total)

| Case | Exam | v2.1.0 Verdict | Evaluator Expects | Status |
|------|------|----------------|-------------------|--------|
| RP-000 | CT Head | proceeds | Correct | = unchanged |
| RP-001 | CT Chest/Abdomen/Pelvis | at_risk | At risk — should accept Hb mildly l | = unchanged |
| RP-002 | Ultrasound Abdomen | declined | hepatomegaly pathway independently  | ⬇ REGRESSED |
| RP-003 | CT Head | at_risk | focal neurological signs pathway in | ⬇ REGRESSED |
| RP-004 | CT Head | proceeds | At risk — "progressive" meets patte | = unchanged |
| RP-005 [P] | Knee X-ray | proceeds | paediatric bone pain | = unchanged |
| RP-006 | Renal Ultrasound | proceeds | surface P1 AKI and P2, note conflic | = unchanged |
| LP-001 | Chest X-ray | proceeds | CAP | = unchanged |
| LP-002 | Spine X-ray | declined | Redirect to ACC — trauma mechanism | = unchanged |
| LP-003 | Ultrasound Pelvis | at_risk | postmenopausal bleeding | ⬇ REGRESSED |
| LP-004 | Ultrasound Pelvis | declined | IUD/Mirena malposition assessment | ⬇ REGRESSED |
| CR-001 | Chest X-ray | proceeds | CAP or TB concern | = unchanged |
| CR-002 [P] | Hip X-ray | proceeds | SUFE/hip pathology concern | = unchanged |
| CR-003 | Renal Ultrasound | proceeds | persistent microscopic haematuria,  | = unchanged |
| TEST-001 | CT Chest/Abdomen/Pelvis | proceeds | all CT CAP (3 abnormal bloods, weig | ⬆ improved |
| TEST-003 | CT Head | declined | focal neuro signs independently met | ⬇ REGRESSED |
| TEST-004 | Ultrasound Abdomen | declined | hepatomegaly pathway independently  | ⬇ REGRESSED |
| TEST-005 | Renal Ultrasound | proceeds | surface P1 and P2, note conflicting | = unchanged |
| TEST-006 | CT Head | at_risk | At risk — focal neuro signs transie | = unchanged |
| TEST-007 | CT Chest/Abdomen/Pelvis | declined | At risk or declined — weight loss 3 | = unchanged |

## Regressions

### RP-002 — Ultrasound Abdomen
**Note:** `61yo european male newly diagnosed autoimmune hepatitis – liver edge felt just below RCM. Screen for HCC, cirrhosis`
**v2.1.0 verdict:** Referral likely to be declined
**Summary:** HCC surveillance requires initial recommendation by gastroenterologist or secondary care specialist.
**Missing:** HCC surveillance requires initial recommendation by gastroenterologist or other secondary care specialist [p31]
**Redirect:** Refer to gastroenterology for HCC surveillance planning and autoimmune hepatitis management
**Notes:** While the patient has suspected hepatomegaly which meets P3 criteria, the primary request is for HCC surveillance which requires specialist recommendation. The autoimmune hepatitis diagnosis also warrants specialist management.
**Evaluator expects:** Proceeds — hepatomegaly pathway independently met
**Assessment:** Verdict: declined. Priority: n/a. Met: 1. Missing: 1. Redirect: Refer to gastroenterology for HCC surveillance planning and 

### RP-003 — CT Head
**Note:** `64yo f w/ sudden onset R facial numbness + diplopia, lasting 10min. O/E: reduced sensation R face cf L, FROEM without diplopia. Obs OK, pulse regular. ?TIA`
**v2.1.0 verdict:** Referral at risk — add missing information
**Summary:** Suspected TIA within 7 days requires BPAC TIA decision support tool completion or neurologist/stroke specialist recommendation to confirm CT Head appropriate.
**Missing:** BPAC TIA decision support tool indicates CT appropriate OR HNZ neurologist/stroke specialist recommendation OR patient unable to access rapid specialist care [p20]
**Notes:** Note also matches focal neurological signs pathway which is independently met and would proceed at Acute 48hr priority without gateway requirements.
**Evaluator expects:** Proceeds — focal neurological signs pathway independently met
**Assessment:** Verdict: at_risk. Priority: Acute 48hr. Met: 2. Missing: 1.

### LP-003 — Ultrasound Pelvis
**Note:** `56 yo post menopausal woman on hormone replacement therapy with 2 days of PV bleeding`
**v2.1.0 verdict:** Referral at risk — add missing information
**Summary:** Post-menopausal bleeding criteria partially met but missing key details about HRT type and duration since starting therapy.
**Missing:** Duration since starting MHT therapy (need >6 months) [p46] · Type of MHT (continuous combined vs other) [p46]
**Notes:** Two potential P2 pathways identified: general post-menopausal bleeding and specific MHT-related bleeding. General PMB pathway requires >12 months amenorrhoea (not documented). MHT-specific pathway requires continuous combined MHT and >6 months since starting therapy (both not documented).
**Evaluator expects:** Proceeds — postmenopausal bleeding
**Assessment:** Verdict: at_risk. Priority: P2. Met: 2. Missing: 2.

### LP-004 — Ultrasound Pelvis
**Note:** `35yo with Mirena, recent lower abdominal pain and pv bleeding ? IUD malpositioned`
**v2.1.0 verdict:** Referral likely to be declined
**Summary:** IUD malposition assessment does not meet CRR criteria — refer to secondary care for clinical assessment and management.
**Redirect:** IUD malposition assessment — refer to secondary care for clinical assessment and management rather than community imaging
**Notes:** Assessment of IUD position is not covered under CRR criteria. Clinical assessment by secondary care is the appropriate pathway for suspected IUD complications.
**Evaluator expects:** Proceeds — IUD/Mirena malposition assessment
**Assessment:** Verdict: declined. Priority: n/a. Met: 0. Missing: 0. Redirect: IUD malposition assessment — refer to secondary care for cli

### TEST-003 — CT Head
**Note:** `58yo m w/ sudden onset L arm weakness and facial droop, resolved after 20 minutes. O/E: mild residual L facial weakness. BP 165/95. ?TIA`
**v2.1.0 verdict:** Referral likely to be declined
**Summary:** TIA within 7 days requires completion of BPAC TIA decision support tool or neurologist/stroke specialist recommendation to confirm CT Head appropriate.
**Missing:** CT +/- CTA recommended by HNZ neurologist/stroke specialist OR BPAC TIA decision support tool indicates CT appropriate OR patient unable to access rapid specialist care [p20]
**Notes:** This presentation matches both the TIA pathway and focal neurological signs pathway. The TIA pathway requires gateway documentation (BPAC tool or specialist recommendation) which is missing. The focal neurological signs pathway is independently met and would qualify for Acute 48hr priority if the gateway requirement applies only to the TIA-specific pathway.
**Evaluator expects:** Proceeds — focal neuro signs independently met; TIA gateway advisory
**Assessment:** Verdict: declined. Priority: n/a. Met: 2. Missing: 1.

### TEST-004 — Ultrasound Abdomen
**Note:** `55yo male, known Hep C. Liver palpable 3cm below costal margin, firm and non-tender. Referred for HCC surveillance and assessment of hepatomegaly.`
**v2.1.0 verdict:** Referral likely to be declined
**Summary:** HCC surveillance requires initial recommendation by gastroenterologist or secondary care specialist.
**Missing:** HCC surveillance pathway requires initial recommendation by gastroenterologist or other secondary care specialist [p31]
**Redirect:** HCC surveillance requires gastroenterology referral for surveillance planning before imaging can be arranged
**Notes:** The hepatomegaly assessment component meets P3 criteria, but HCC surveillance specifically requires specialist recommendation first. Consider referring to gastroenterology for comprehensive hepatitis C management including surveillance planning.
**Evaluator expects:** Proceeds — hepatomegaly pathway independently met
**Assessment:** Verdict: declined. Priority: n/a. Met: 1. Missing: 1. Redirect: HCC surveillance requires gastroenterology referral for surv
