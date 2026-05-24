# Triage Advisor v2.3.0 Regression Test Results

**Date:** 2026-05-24T18:13:21.111Z
**Prompt version:** 2.3.0 — Verdict consistency check + general-vs-specific pathway rule + clinical severity override fix
**Model:** claude-sonnet-4-20250514 | **Mode:** strict | **Paediatric detection:** enabled
**Baseline:** v2.2.0

## Scorecard vs v2.2.0: 3 improved / 14 unchanged / 3 regressed (20 total)

| Case | Exam | v2.2.0 | v2.3.0 | Evaluator Expects | Status |
|------|------|--------|--------|-------------------|--------|
| RP-000 | CT Head | proceeds | proceeds | Correct | = unchanged |
| RP-001 | CT Chest/Abdomen/Pelvis | at_risk | proceeds | At risk — should accept Hb mil | = unchanged |
| RP-002 | Ultrasound Abdomen | proceeds | at_risk | hepatomegaly pathway independe | ⬇ REGRESSED |
| RP-003 | CT Head | proceeds | proceeds | focal neurological signs pathw | = unchanged |
| RP-004 | CT Head | proceeds | proceeds | At risk — "progressive" meets  | = unchanged |
| RP-005 [P] | Knee X-ray | proceeds | proceeds | paediatric bone pain | = unchanged |
| RP-006 | Renal Ultrasound | declined | proceeds | surface P1 AKI and P2, note co | ⬆ improved |
| LP-001 | Chest X-ray | proceeds | proceeds | CAP | = unchanged |
| LP-002 | Spine X-ray | declined | declined | Redirect to ACC — trauma mecha | = unchanged |
| LP-003 | Ultrasound Pelvis | at_risk | proceeds | postmenopausal bleeding | ⬆ improved |
| LP-004 | Ultrasound Pelvis | proceeds | declined | IUD/Mirena malposition assessm | ⬇ REGRESSED |
| CR-001 | Chest X-ray | proceeds | proceeds | CAP or TB concern | = unchanged |
| CR-002 [P] | Hip X-ray | proceeds | proceeds | SUFE/hip pathology concern | = unchanged |
| CR-003 | Renal Ultrasound | proceeds | proceeds | persistent microscopic haematu | = unchanged |
| TEST-001 | CT Chest/Abdomen/Pelvis | proceeds | at_risk | all CT CAP (3 abnormal bloods, | ⬇ REGRESSED |
| TEST-003 | CT Head | proceeds | proceeds | focal neuro signs independentl | = unchanged |
| TEST-004 | Ultrasound Abdomen | at_risk | proceeds | hepatomegaly pathway independe | ⬆ improved |
| TEST-005 | Renal Ultrasound | proceeds | proceeds | surface P1 and P2, note confli | = unchanged |
| TEST-006 | CT Head | at_risk | at_risk | At risk — focal neuro signs tr | = unchanged |
| TEST-007 | CT Chest/Abdomen/Pelvis | declined | declined | At risk or declined — weight l | = unchanged |

## Improvements vs v2.2.0

### RP-006 — Renal Ultrasound
**Note:** `75yo m w/ new AKI, eGFR 3 (normally 55). No clear cause.`
**v2.2.0:** declined → **v2.3.0:** proceeds
**Summary:** Acute renal function deterioration with eGFR decrease >50 micromol/L meets criteria for urgent renal ultrasound.
**Notes:** The criteria mentions discussion with secondary care/PCRL is recommended for acute renal function deterioration. The dramatic eGFR decline from 55 to 3 represents severe acute kidney injury that warrants urgent imaging and likely secondary care involvement.

### LP-003 — Ultrasound Pelvis
**Note:** `56 yo post menopausal woman on hormone replacement therapy with 2 days of PV bleeding`
**v2.2.0:** at_risk → **v2.3.0:** proceeds
**Summary:** Post-menopausal bleeding meets urgent criteria for pelvic ultrasound within 2 weeks.
**Notes:** The general post-menopausal bleeding pathway is fully met. While there is also a more specific pathway for PMB on continuous combined MHT, the general pathway alone is sufficient for P2 priority. The specific MHT pathway would require documentation of type and duration of therapy (>6 months since starting), but this is not needed when the general pathway is met.

### TEST-004 — Ultrasound Abdomen
**Note:** `55yo male, known Hep C. Liver palpable 3cm below costal margin, firm and non-tender. Referred for HCC surveillance and assessment of hepatomegaly.`
**v2.2.0:** at_risk → **v2.3.0:** proceeds
**Summary:** Referral proceeds based on non-pulsatile abdominal mass and suspected enlarged liver on examination.
**Notes:** HCC surveillance pathway requires gastroenterologist recommendation which is not documented, but the general hepatomegaly pathway is fully met and sufficient for acceptance. HCC surveillance would require initial recommendation by a gastroenterologist or other secondary care specialist.

## Regressions vs v2.2.0

### RP-002 — Ultrasound Abdomen
**Note:** `61yo european male newly diagnosed autoimmune hepatitis – liver edge felt just below RCM. Screen for HCC, cirrhosis`
**v2.2.0:** proceeds → **v2.3.0:** At Risk — Missing Gateway Requirement
**Summary:** HCC surveillance requires initial recommendation by gastroenterologist or other secondary care specialist.
**Missing:** HCC surveillance using liver ultrasound as initially recommended by a gastroenterologist or other secondary care specialist, or as recommended by an agreed local pathway [p31]
**Notes:** Two pathways identified: (1) P3 pathway for suspected enlarged liver on examination is fully met, (2) S3 HCC surveillance pathway requires gastroenterologist recommendation which is not documented. The P3 pathway alone is sufficient for acceptance.
**Evaluator expects:** Proceeds — hepatomegaly pathway independently met

### LP-004 — Ultrasound Pelvis
**Note:** `35yo with Mirena, recent lower abdominal pain and pv bleeding ? IUD malpositioned`
**v2.2.0:** proceeds → **v2.3.0:** Does not meet CRR criteria
**Summary:** IUD malposition assessment is not covered under the CRR pelvis ultrasound criteria.
**Redirect:** Consider gynaecology assessment or discussion with family planning service for IUD position concerns
**Notes:** The note describes suspected IUD malposition with associated symptoms. While the patient has pelvic pain and bleeding, these symptoms are attributed to a specific device-related cause (malpositioned IUD) rather than the broader gynaecological conditions covered in the CRR pelvis ultrasound criteria. IUD position assessment and related complications are typically managed through gynaecology or family planning services rather than community radiology pathways.
**Evaluator expects:** Proceeds — IUD/Mirena malposition assessment

### TEST-001 — CT Chest/Abdomen/Pelvis
**Note:** `62yo male w/ unexplained weight loss 8% over 4 months. No focal pathology. CRP raised, Hb low, albumin low. Ex-smoker.`
**v2.2.0:** proceeds → **v2.3.0:** At Risk — Missing Lab Requirements
**Summary:** Meets most P2 criteria but needs documented persistence of abnormal bloods after 3-week repeat testing.
**Missing:** Abnormal bloods persistent on repeat after 3 weeks [p10]
**Notes:** Patient meets the age threshold (male >40), has significant weight loss (8% over 4 months exceeds the >5% over 3-6 months requirement), has no focal pathology, and has 3 abnormal blood parameters. Only missing documentation that the abnormal bloods persisted on repeat testing after 3 weeks, which is required for the P2 pathway.
**Evaluator expects:** Proceeds — all CT CAP criteria met (3 abnormal bloods, weight loss ≥5% over ≥3 months)
