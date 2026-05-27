# Triage Advisor v2.2.0 — INFERRED Mode vs STRICT Mode

**Date:** 2026-05-26T18:03:48.820Z
**Prompt:** v2.2.0 | **Mode:** INFERRED | **Model:** claude-sonnet-4-20250514
**Baseline:** v2.2.0 STRICT mode results

## Summary: 4 cases differ / 16 cases same

| Case | Exam | Strict | Infer | Evaluator Expects | Changed? |
|------|------|--------|-------|-------------------|----------|
| RP-000 | CT Head | proceeds | proceeds | Correct | = same |
| RP-001 | CT Chest/Abdomen/Pelvis | at_risk | at_risk | At risk — should accept Hb mildly l | = same |
| RP-002 | Ultrasound Abdomen | proceeds | declined | hepatomegaly pathway independently  | ◆ **DIFFERS** |
| RP-003 | CT Head | proceeds | proceeds | focal neurological signs pathway in | = same |
| RP-004 | CT Head | proceeds | proceeds | At risk — "progressive" meets patte | = same |
| RP-005 [P] | Knee X-ray | proceeds | proceeds | paediatric bone pain | = same |
| RP-006 | Renal Ultrasound | declined | proceeds | surface P1 AKI and P2, note conflic | ◆ **DIFFERS** |
| LP-001 | Chest X-ray | proceeds | proceeds | CAP | = same |
| LP-002 | Spine X-ray | declined | declined | Redirect to ACC — trauma mechanism | = same |
| LP-003 | Ultrasound Pelvis | at_risk | at_risk | postmenopausal bleeding | = same |
| LP-004 | Ultrasound Pelvis | proceeds | proceeds | IUD/Mirena malposition assessment | = same |
| CR-001 | Chest X-ray | proceeds | proceeds | CAP or TB concern | = same |
| CR-002 [P] | Hip X-ray | proceeds | proceeds | SUFE/hip pathology concern | = same |
| CR-003 | Renal Ultrasound | proceeds | proceeds | persistent microscopic haematuria,  | = same |
| TEST-001 | CT Chest/Abdomen/Pelvis | proceeds | at_risk | all CT CAP (3 abnormal bloods, weig | ◆ **DIFFERS** |
| TEST-003 | CT Head | proceeds | proceeds | focal neuro signs independently met | = same |
| TEST-004 | Ultrasound Abdomen | at_risk | at_risk | hepatomegaly pathway independently  | = same |
| TEST-005 | Renal Ultrasound | proceeds | proceeds | surface P1 and P2, note conflicting | = same |
| TEST-006 | CT Head | at_risk | proceeds | At risk — focal neuro signs transie | ◆ **DIFFERS** |
| TEST-007 | CT Chest/Abdomen/Pelvis | declined | declined | At risk or declined — weight loss 3 | = same |

## Cases Where Infer Differs From Strict

### RP-002 — Ultrasound Abdomen
**Note:** `61yo european male newly diagnosed autoimmune hepatitis – liver edge felt just below RCM. Screen for HCC, cirrhosis`
**Strict:** proceeds → **Infer:** declined | **Evaluator expects:** Proceeds — hepatomegaly pathway independently met
**Infer summary:** HCC surveillance requires initial recommendation by gastroenterologist or secondary care specialist.
**Met (infer):** Non-pulsatile abdominal mass and suspected enlarged liver on examination [p31]
**Missing (infer):** HCC surveillance pathway requires initial recommendation by gastroenterologist or other secondary care specialist [p31]
**Notes:** The referral mentions HCC screening but the S3 pathway for HCC surveillance requires initial recommendation by gastroenterologist. However, the clinical finding of hepatomegaly meets P3 criteria independently. The note could be reworded to focus on the hepatomegaly assessment rather than HCC surveillance to meet criteria.

### RP-006 — Renal Ultrasound
**Note:** `75yo m w/ new AKI, eGFR 3 (normally 55). No clear cause.`
**Strict:** declined → **Infer:** proceeds | **Evaluator expects:** Proceeds — surface P1 AKI and P2, note conflicting dispositions
**Infer summary:** Meets criteria for acute renal function deterioration with dramatic eGFR drop requiring urgent imaging.
**Met (infer):** Acute renal function deterioration — serum creatinine increase >50 micromol/L in 7 days or >25 micromol/L in 2 days [p53]
**Notes:** The dramatic eGFR drop from 55 to 3 represents severe acute kidney injury. While the criteria specify creatinine increases in micromol/L, an eGFR drop of this magnitude (>50 point decline) clearly meets the threshold for acute deterioration. The note recommends discussion with secondary care/PCRL which would be appropriate given the severity.

### TEST-001 — CT Chest/Abdomen/Pelvis
**Note:** `62yo male w/ unexplained weight loss 8% over 4 months. No focal pathology. CRP raised, Hb low, albumin low. Ex-smoker.`
**Strict:** proceeds → **Infer:** at_risk | **Evaluator expects:** Proceeds — all CT CAP criteria met (3 abnormal bloods, weight loss ≥5% over ≥3 months)
**Infer summary:** Meets clinical criteria but requires specific lab values and repeat testing documentation.
**Met (infer):** Male >40 with strong suspicion of malignancy, no focal pathology [p10] · Weight loss >5% over 3-6 months [p10] · Raised CRP [p10] · Low Hb [p10] · Low albumin [p10]
**Missing (infer):** Specific numeric values for CRP, Hb, and albumin [p10] · Documentation that abnormal bloods are persistent on repeat after 3 weeks [p10] · Documentation of 2+ abnormal bloods from the specified list (Hb, CRP, Ca, ALP) [p10]
**Notes:** Patient meets age and weight loss criteria. Has 3 documented abnormal bloods (CRP raised, Hb low, albumin low) but criteria specifically require 2+ from the list: Hb, CRP, Ca, ALP, high platelets. Need to document Ca and ALP values, and confirm persistence on repeat testing.

### TEST-006 — CT Head
**Note:** `45yo m, episode of slurred speech and R hand clumsiness lasting 30 minutes yesterday. Fully resolved. BP normal. ?TIA. No other focal signs currently.`
**Strict:** at_risk → **Infer:** proceeds | **Evaluator expects:** At risk — focal neuro signs transiently met; TIA gateway advisory
**Infer summary:** Referral meets criteria for focal neurological signs requiring acute CT Head within 48 hours.
**Met (infer):** Focal neurological signs [p20]
**Notes:** Note: TIA pathway also referenced but would require BPAC TIA decision support tool completion or HNZ neurologist/stroke specialist recommendation for CT appropriateness — consider completing BPAC tool or seeking specialist advice for comprehensive TIA assessment.

## Cases Where Infer = Strict

| Case | Verdict | Evaluator Expects |
|------|---------|-------------------|
| RP-000 | proceeds | Correct |
| RP-001 | at_risk | At risk — should accept Hb mildly l |
| RP-003 | proceeds | focal neurological signs pathway in |
| RP-004 | proceeds | At risk — "progressive" meets patte |
| RP-005 [P] | proceeds | paediatric bone pain |
| LP-001 | proceeds | CAP |
| LP-002 | declined | Redirect to ACC — trauma mechanism |
| LP-003 | at_risk | postmenopausal bleeding |
| LP-004 | proceeds | IUD/Mirena malposition assessment |
| CR-001 | proceeds | CAP or TB concern |
| CR-002 [P] | proceeds | SUFE/hip pathology concern |
| CR-003 | proceeds | persistent microscopic haematuria,  |
| TEST-003 | proceeds | focal neuro signs independently met |
| TEST-004 | at_risk | hepatomegaly pathway independently  |
| TEST-005 | proceeds | surface P1 and P2, note conflicting |
| TEST-007 | declined | At risk or declined — weight loss 3 |
