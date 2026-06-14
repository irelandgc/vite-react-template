# Triage Advisor v2.3.0 Regression Test Results

**Date:** 2026-06-02T02:03:39.245Z
**Prompt version:** 2.3.0 — Verdict consistency check + general-vs-specific pathway rule + clinical severity override fix
**Model:** claude-sonnet-4-6 | **Mode:** strict | **Paediatric detection:** enabled
**Baseline:** v2.2.0

## Scorecard vs v2.2.0: 3 improved / 15 unchanged / 2 regressed (20 total)

| Case | Exam | v2.2.0 | v2.3.0 | Evaluator Expects | Status |
|------|------|--------|--------|-------------------|--------|
| RP-000 | CT Head | proceeds | proceeds | Correct | = unchanged |
| RP-001 | CT Chest/Abdomen/Pelvis | at_risk | at_risk | At risk — should accept Hb mil | = unchanged |
| RP-002 | Ultrasound Abdomen | proceeds | proceeds | hepatomegaly pathway independe | = unchanged |
| RP-003 | CT Head | proceeds | proceeds | focal neurological signs pathw | = unchanged |
| RP-004 | CT Head | proceeds | at_risk | At risk — "progressive" meets  | = unchanged |
| RP-005 [P] | Knee X-ray | proceeds | proceeds | paediatric bone pain | = unchanged |
| RP-006 | Renal Ultrasound | declined | proceeds | surface P1 AKI and P2, note co | ⬆ improved |
| LP-001 | Chest X-ray | proceeds | proceeds | CAP | = unchanged |
| LP-002 | Spine X-ray | declined | declined | Redirect to ACC — trauma mecha | = unchanged |
| LP-003 | Ultrasound Pelvis | at_risk | proceeds | postmenopausal bleeding | ⬆ improved |
| LP-004 | Ultrasound Pelvis | proceeds | at_risk | IUD/Mirena malposition assessm | ⬇ REGRESSED |
| CR-001 | Chest X-ray | proceeds | proceeds | CAP or TB concern | = unchanged |
| CR-002 [P] | Hip X-ray | proceeds | proceeds | SUFE/hip pathology concern | = unchanged |
| CR-003 | Renal Ultrasound | proceeds | at_risk | persistent microscopic haematu | ⬇ REGRESSED |
| TEST-001 | CT Chest/Abdomen/Pelvis | proceeds | proceeds | all CT CAP (3 abnormal bloods, | = unchanged |
| TEST-003 | CT Head | proceeds | proceeds | focal neuro signs independentl | = unchanged |
| TEST-004 | Ultrasound Abdomen | at_risk | proceeds | hepatomegaly pathway independe | ⬆ improved |
| TEST-005 | Renal Ultrasound | proceeds | proceeds | surface P1 and P2, note confli | = unchanged |
| TEST-006 | CT Head | at_risk | proceeds | At risk — focal neuro signs tr | = unchanged |
| TEST-007 | CT Chest/Abdomen/Pelvis | declined | at_risk | At risk or declined — weight l | = unchanged |

## Improvements vs v2.2.0

### RP-006 — Renal Ultrasound
**Note:** `75yo m w/ new AKI, eGFR 3 (normally 55). No clear cause.`
**v2.2.0:** declined → **v2.3.0:** proceeds
**Summary:** Acute renal function deterioration with a dramatic eGFR drop from 55 to 3 meets the Acute 48hr criterion for urgent renal ultrasound.
**Notes:** The CT KUB red-flag criterion (eGFR <45 → admit, do not image) applies to CT KUB only and does not block renal ultrasound referral. The renal ultrasound Acute 48hr criterion for acute renal function deterioration is independently met. However, the clinical severity (eGFR 3) warrants a parallel urgent secondary care discussion. The creatinine values and exact timeframe are not explicitly stated — the add_to_note items request these to strengthen documentation, but the eGFR drop from 55 to 3 is sufficient on its face to satisfy the qualitative threshold of acute renal function deterioration.

### LP-003 — Ultrasound Pelvis
**Note:** `56 yo post menopausal woman on hormone replacement therapy with 2 days of PV bleeding`
**v2.2.0:** at_risk → **v2.3.0:** proceeds
**Summary:** This referral meets P2 criteria for post-menopausal bleeding; the scan should be completed within 2 weeks.
**Notes:** A more specific P2 variant exists for 'persistent post-menopausal bleeding at any age while on continuous combined MHT and it has been >6 months since starting therapy' [p46]. The note does not specify the type of HRT (continuous combined vs. other) or duration of therapy, so this specific variant cannot be confirmed. However, the general post-menopausal bleeding criterion is independently and fully met — the verdict is 'proceeds' at P2 on that basis. The MHT type and duration details are advisory only. Note also that Māori and Pacific peoples are disproportionately affected by endometrial cancer — if applicable, this supports prompt investigation. The referral proceeds regardless.

### TEST-004 — Ultrasound Abdomen
**Note:** `55yo male, known Hep C. Liver palpable 3cm below costal margin, firm and non-tender. Referred for HCC surveillance and assessment of hepatomegaly.`
**v2.2.0:** at_risk → **v2.3.0:** proceeds
**Summary:** The referral meets P3 criteria for ultrasound abdomen on the basis of a non-pulsatile abdominal mass and suspected enlarged liver on examination, independently of the HCC surveillance pathway.
**Notes:** Two pathways were identified: (1) P3 — Non-pulsatile abdominal mass / suspected enlarged liver on examination [p31]: FULLY MET — liver palpable 3cm below costal margin is explicit clinical hepatomegaly. This pathway is the basis for the proceeds verdict. (2) S3 — HCC surveillance as initially recommended by a gastroenterologist or other secondary care specialist [p31]: NOT MET — the criteria require that HCC surveillance ultrasound be initiated on the recommendation of a gastroenterologist or other secondary care specialist, or per an agreed local pathway. No such specialist recommendation is documented in this note. The GP should seek gastroenterology input to establish a formal HCC surveillance programme for this patient with Hepatitis C, which would then support ongoing S3 surveillance referrals. The unmet HCC surveillance gateway does not affect the proceeds verdict, which is secured by the independently met hepatomegaly criterion.

## Regressions vs v2.2.0

### LP-004 — Ultrasound Pelvis
**Note:** `35yo with Mirena, recent lower abdominal pain and pv bleeding ? IUD malpositioned`
**v2.2.0:** proceeds → **v2.3.0:** At Risk — Key Information Missing
**Summary:** The referral may meet criteria for an acute or urgent pelvic ultrasound but critical details about IUD string status and symptom acuity are not documented.
**Missing:** IUD string status not documented — criteria for Acute 24hr require 'IUCD strings missing OR IUCD breaks on removal with only fragment removed AND symptoms suggestive of possible perforation (cramping pain, discharge, unexplained bleeding)' [p46] · Symptom acuity and onset not documented — 'sudden onset severe pelvic pain' would trigger Acute 24hr suspected ovarian cyst accident pathway; gradual onset would direct to a different priority [p46] · Clinical stability not documented — if patient is clinically unstable, refer for acute assessment without imaging [p46] · Duration of symptoms not documented — needed to determine appropriate priority level [p46]
**Notes:** Two potential pathways exist depending on documented findings: (1) Acute 24hr — 'IUCD strings missing or IUCD breaks on removal with only fragment removed AND symptoms suggestive of possible perforation (cramping pain, discharge, unexplained bleeding)' [p46]. If strings are confirmed missing and perforation symptoms are present, this pathway is met. (2) P3 — 'Suspected ovarian cyst (unilateral pelvic pain >4 weeks and/or unilateral tenderness) or other pelvic mass and low/uncertain suspicion of cancer' [p46] — if symptoms are more chronic and strings are present. If the patient is clinically unstable, she should be referred for acute assessment without imaging. The note as written does not explicitly document string status, which is the crux of the IUD malposition/perforation pathway.
**Evaluator expects:** Proceeds — IUD/Mirena malposition assessment

### CR-003 — Renal Ultrasound
**Note:** `Persisting microscopic haematuria in usually well and active 64 year old lady works as a hairdresser all her life, non smoker, No infection on microscopy, no wt loss or other symptoms`
**v2.2.0:** proceeds → **v2.3.0:** At Risk — Gender-Specific Pathway Applies, Priority Depends on Smoking Status
**Summary:** Microscopic haematuria in a female patient is funded under the Renal Ultrasound pathway at P4 regardless of age or smoking status, but the note must explicitly state the patient's sex to confirm the gender-specific criterion is met.
**Missing:** Age and sex are inferable but must be explicitly stated in the referral note per strict documentation standard — 'lady' implies female but explicit statement of sex is preferred [p53]
**Notes:** The applicable criterion is 'Microscopic haematuria — female, of any age' at P4 [p53]. This criterion applies regardless of smoking status or age in female patients. The male-specific P3 criterion ('male patient, older than 50 years, current or ex-smoker') is gender-inapplicable here and has not been assessed. Note that macroscopic haematuria in a female aged 40–85 would qualify at P2 via CT IVU [p24], but this referral documents microscopic haematuria only. The word 'lady' strongly implies female sex; however, under the strict documentation standard, explicit statement is preferred. The referral is very likely to proceed once the note is clarified with explicit sex documentation and confirmation of persistent haematuria.
**Evaluator expects:** Proceeds — persistent microscopic haematuria, no infection
