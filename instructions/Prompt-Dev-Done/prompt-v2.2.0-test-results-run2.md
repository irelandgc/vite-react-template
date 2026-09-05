# Triage Advisor v2.2.0 Regression Test Results

**Date:** 2026-06-02T02:06:35.295Z
**Prompt version:** 2.2.0 — Concrete gateway/pathway examples + postmenopausal shorthand
**Model:** claude-sonnet-4-6 | **Mode:** strict | **Paediatric detection:** enabled

## Scorecard: 3 improved / 10 unchanged / 7 regressed (20 total)

| Case | Exam | v2.2.0 Verdict | Evaluator Expects | Status |
|------|------|----------------|-------------------|--------|
| RP-000 | CT Head | proceeds | Correct | = unchanged |
| RP-001 | CT Chest/Abdomen/Pelvis | at_risk | At risk — should accept Hb mildly l | = unchanged |
| RP-002 | Ultrasound Abdomen | at_risk | hepatomegaly pathway independently  | ⬇ REGRESSED |
| RP-003 | CT Head | proceeds | focal neurological signs pathway in | ⬆ improved |
| RP-004 | CT Head | proceeds | At risk — "progressive" meets patte | = unchanged |
| RP-005 [P] | Knee X-ray | proceeds | paediatric bone pain | = unchanged |
| RP-006 | Renal Ultrasound | declined | surface P1 AKI and P2, note conflic | ⬇ REGRESSED |
| LP-001 | Chest X-ray | at_risk | CAP | ⬇ REGRESSED |
| LP-002 | Spine X-ray | declined | Redirect to ACC — trauma mechanism | = unchanged |
| LP-003 | Ultrasound Pelvis | at_risk | postmenopausal bleeding | ⬇ REGRESSED |
| LP-004 | Ultrasound Pelvis | at_risk | IUD/Mirena malposition assessment | ⬇ REGRESSED |
| CR-001 | Chest X-ray | proceeds | CAP or TB concern | = unchanged |
| CR-002 [P] | Hip X-ray | proceeds | SUFE/hip pathology concern | = unchanged |
| CR-003 | Renal Ultrasound | proceeds | persistent microscopic haematuria,  | = unchanged |
| TEST-001 | CT Chest/Abdomen/Pelvis | at_risk | all CT CAP (3 abnormal bloods, weig | ⬇ REGRESSED |
| TEST-003 | CT Head | proceeds | focal neuro signs independently met | ⬆ improved |
| TEST-004 | Ultrasound Abdomen | proceeds | hepatomegaly pathway independently  | ⬆ improved |
| TEST-005 | Renal Ultrasound | declined | surface P1 and P2, note conflicting | ⬇ REGRESSED |
| TEST-006 | CT Head | proceeds | At risk — focal neuro signs transie | = unchanged |
| TEST-007 | CT Chest/Abdomen/Pelvis | at_risk | At risk or declined — weight loss 3 | = unchanged |

## Regressions

### RP-002 — Ultrasound Abdomen
**Note:** `61yo european male newly diagnosed autoimmune hepatitis – liver edge felt just below RCM. Screen for HCC, cirrhosis`
**v2.2.0 verdict:** Referral at risk — add missing information
**Summary:** The referral partially matches the P3 hepatomegaly/abdominal mass pathway and the S3 HCC surveillance pathway, but neither is fully met as documented: the hepatomegaly pathway requires a non-pulsatile abdominal mass or suspected enlarged liver on examination (met), but HCC surveillance requires an initial recommendation from a gastroenterologist or other secondary care specialist or agreed local pathway, which is not documented.
**Missing:** HCC surveillance (S3) requires that liver ultrasound surveillance was initially recommended by a gastroenterologist or other secondary care specialist, or by an agreed local pathway — no such recommendation is documented [p33] · The P3 hepatomegaly criterion ('non-pulsatile abdominal mass and suspected enlarged liver on examination') is met for a baseline liver ultrasound, but ongoing HCC surveillance scans require specialist initiation — clarify whether this is a first/baseline scan or ongoing surveillance [p33]
**Notes:** Two potential pathways apply: (1) P3 — 'Non-pulsatile abdominal mass and suspected enlarged liver on examination' [p33]: this is met for a baseline ultrasound given the palpable hepatomegaly documented. If the referral is framed as a baseline assessment of hepatomegaly in newly diagnosed autoimmune hepatitis, this pathway alone may be sufficient for a single scan. (2) S3 — HCC surveillance [p33]: ongoing surveillance scans require initial recommendation from a gastroenterologist or secondary care specialist or agreed local pathway. If the GP intends to establish a surveillance programme without specialist involvement, the patient should first be referred to gastroenterology/hepatology. Recommend the GP clarify whether this is a one-off baseline scan (P3 pathway likely sufficient if hepatomegaly criterion is accepted) or the start of a surveillance programme (S3 pathway requires specialist initiation). The triage radiologist may accept this under P3 for a single baseline scan given documented hepatomegaly.
**Evaluator expects:** Proceeds — hepatomegaly pathway independently met
**Assessment:** Verdict: at_risk. Priority: P3. Met: 2. Missing: 2.

### RP-006 — Renal Ultrasound
**Note:** `75yo m w/ new AKI, eGFR 3 (normally 55). No clear cause.`
**v2.2.0 verdict:** Referral likely to be declined — patient requires acute admission, not community imaging
**Summary:** An eGFR of 3 is a red-flag criterion requiring immediate hospital admission; community imaging is contraindicated at this level of renal impairment.
**Redirect:** Acute hospital admission required. Do not image in the community. Refer to ED or acute medical team urgently. Manage per local Acute Kidney Injury HealthPathway or seek nephrology advice. If renal ultrasound is subsequently indicated, it will be arranged by the inpatient team.
**Notes:** The CT KUB criteria explicitly list eGFR <45 as a red flag requiring acute admission rather than imaging [p26]. An eGFR of 3 far exceeds this threshold. The US Renal acute criteria (creatinine increase >50 micromol/L in 7 days) may also be met, but community ultrasound is not appropriate at this level of renal failure — the patient requires inpatient assessment and stabilisation first. Renal ultrasound may be arranged by the inpatient team as part of AKI workup.
**Evaluator expects:** Proceeds — surface P1 AKI and P2, note conflicting dispositions
**Assessment:** Verdict: declined. Priority: n/a. Met: 3. Missing: 0. Redirect: Acute hospital admission required. Do not image in the commu

### LP-001 — Chest X-ray
**Note:** `55 yo man, 3 days cough, fever and shortness of breath`
**v2.2.0 verdict:** Referral at risk — add missing information
**Summary:** This presentation may meet criteria for an acute CXR for suspected community-acquired pneumonia, but the note does not document whether the presentation is unexpectedly severe or atypical, or whether the patient is at risk of underlying lung pathology — both required for the Acute 24hr pathway.
**Missing:** Acute 24hr pathway requires: unexpectedly severe or atypical presentation OR patient considered at risk of underlying lung pathology (e.g. lung cancer) — neither is documented [p65] · Acute 48hr pathway (unexplained new or worsening dyspnoea / unexplained cough persisting and worsening >3 weeks) — symptom duration is only 3 days, does not meet the >3 weeks threshold for the worsening cough or dyspnoea criteria [p65]
**Notes:** If the patient is severely unwell (significant respiratory distress, suspected large pneumothorax, haemodynamically unstable haemoptysis), refer for acute assessment without imaging. If the presentation is straightforward CAP without severity or risk factors, a CXR does not change management in most cases per the criteria guidance and may not be funded. The strongest route to approval is documenting severity/atypical features or underlying lung cancer risk.
**Evaluator expects:** Proceeds — CAP criteria met
**Assessment:** Verdict: at_risk. Priority: Acute 24hr. Met: 4. Missing: 2.

### LP-003 — Ultrasound Pelvis
**Note:** `56 yo post menopausal woman on hormone replacement therapy with 2 days of PV bleeding`
**v2.2.0 verdict:** Referral at risk — add missing information
**Summary:** This referral is close to meeting criteria but requires clarification of the type of HRT (continuous combined vs cyclical) and duration of therapy to determine which pathway applies.
**Missing:** Type of HRT not specified — must clarify whether continuous combined MHT or combined cyclical MHT, as this determines which specific pathway applies [p46] · Duration of HRT not documented — both MHT-specific pathways require that it has been >6 months since starting therapy [p46]
**Notes:** Two separate pathways may apply depending on HRT type: (1) P2 — 'Persistent post-menopausal bleeding at any age while on continuous combined MHT and it has been >6 months since starting therapy' [p46]; (2) P3 — 'Perimenopausal woman on combined cyclical MHT with ongoing irregular bleeding or bleeding outside progestogen withdrawal, despite trial of increased progestogen, and it has been >6 months since starting MHT' [p47]. A third general pathway also exists: P2 — 'Post-menopausal bleeding (vaginal bleeding after >12 months amenorrhoea around expected age of menopause)' [p46] — this pathway does not require HRT type or duration and may be independently met if the GP confirms amenorrhoea >12 months prior to this bleed. If the GP can confirm >12 months amenorrhoea before this bleeding episode, the general post-menopausal bleeding P2 pathway is fully met without needing HRT details. Clarifying this point would allow the referral to proceed immediately.
**Evaluator expects:** Proceeds — postmenopausal bleeding
**Assessment:** Verdict: at_risk. Priority: P2. Met: 4. Missing: 2.

### LP-004 — Ultrasound Pelvis
**Note:** `35yo with Mirena, recent lower abdominal pain and pv bleeding ? IUD malpositioned`
**v2.2.0 verdict:** Referral at risk — add missing information
**Summary:** The note raises possible IUD malpositioning but does not document the specific clinical trigger required for the funded acute pathway — strings missing or IUD breaking on removal with fragment retained and symptoms of possible perforation.
**Missing:** IUCD strings missing OR IUCD breaks on removal with only a fragment removed — not documented [p46] · Symptoms suggestive of possible perforation (cramping pain, discharge, unexplained bleeding) — bleeding is noted but perforation concern not explicitly stated, and the specific trigger (missing strings or broken removal) is absent [p46]
**Notes:** The funded acute 24-hour pathway for IUD/IUCD on the US Pelvis criteria [p46] requires: strings missing OR IUD breaks on removal with only a fragment removed, AND symptoms suggestive of possible perforation (cramping pain, discharge, unexplained bleeding). The current note documents pain and bleeding but does not state that strings are missing or that removal was attempted and failed — these are the specific clinical triggers. If strings are present and the clinical concern is simply malpositioning without perforation symptoms, this pathway may not apply and secondary care advice should be sought. If the patient is systemically unstable or perforation is strongly suspected clinically, refer for acute assessment without imaging.
**Evaluator expects:** Proceeds — IUD/Mirena malposition assessment
**Assessment:** Verdict: at_risk. Priority: Acute 24hr. Met: 3. Missing: 2.

### TEST-001 — CT Chest/Abdomen/Pelvis
**Note:** `62yo male w/ unexplained weight loss 8% over 4 months. No focal pathology. CRP raised, Hb low, albumin low. Ex-smoker.`
**v2.2.0 verdict:** Referral at risk — add missing information
**Summary:** This referral is close to meeting P2 criteria for CT CAP but falls short on two elements: the GP's strong suspicion of malignancy is not explicitly stated, and the duration of weight loss (4 months) does not meet the 3–6 month minimum threshold as written.
**Missing:** Strong suspicion of malignancy not explicitly stated — the GP must document that after initial investigations they remain strongly suspicious of underlying malignancy [p10] · Weight loss duration: '4 months' does not meet the '3–6 months' threshold as stated — the criteria require weight loss over a period of at least 3 months; clarify that the 8% loss has occurred over at least 3 months (e.g. 'over the past 3–4 months') [p10] · Confirmation that bloods are persistent on repeat after 3 weeks is not documented [p10]
**Notes:** The second P2 pathway (male >40 with weight loss >5% over 3–6 months AND 2+ abnormal bloods) is the applicable pathway here given three abnormal bloods are documented. The note nearly meets all criteria. The primary issues are: (1) strong suspicion of malignancy must be explicitly stated by the GP; (2) the 4-month duration should be reworded to make clear it meets the ≥3 month threshold; and (3) persistence of abnormal bloods on repeat after 3 weeks must be confirmed. Note also that 'low albumin' satisfies one of the qualifying blood markers — together with raised CRP and low Hb, three of the six listed markers are met, exceeding the required two.
**Evaluator expects:** Proceeds — all CT CAP criteria met (3 abnormal bloods, weight loss ≥5% over ≥3 months)
**Assessment:** Verdict: at_risk. Priority: P2. Met: 4. Missing: 3.

### TEST-005 — Renal Ultrasound
**Note:** `68yo f w/ acute kidney injury, eGFR dropped from 60 to 12 over 5 days. No obstruction suspected. No clear cause identified.`
**v2.2.0 verdict:** Referral likely to be declined
**Missing:** Acute renal US criteria (Acute 48hr) require discussion with secondary care/PCRL — this is explicitly recommended in the criteria for acute renal function deterioration [p53]. No documentation of such discussion. · The severity of this AKI (eGFR 12) and the magnitude of decline over 5 days constitutes a medical emergency requiring acute hospital assessment, not community imaging — this presentation should be redirected to ED/acute secondary care, not CRR.
**Redirect:** Refer to ED or acute medical team immediately. Acute kidney injury of this severity requires urgent inpatient assessment, nephrology input, and likely inpatient imaging. See local Acute Kidney Injury HealthPathway. Community CRR ultrasound is not the appropriate pathway.
**Notes:** Although the Acute 48hr renal ultrasound criterion for acute renal function deterioration technically matches the documented eGFR drop, the criteria explicitly recommend discussion with secondary care/PCRL, and the clinical severity here (eGFR 12, Stage 3 AKI) mandates acute hospital assessment rather than community imaging. CRR is not designed for patients requiring acute inpatient management. If the patient is stabilised and secondary care subsequently recommends outpatient renal ultrasound, a new referral with the specialist's recommendation documented would be appropriate.
**Evaluator expects:** Proceeds — surface P1 and P2, note conflicting dispositions
**Assessment:** Verdict: declined. Priority: n/a. Met: 2. Missing: 2. Redirect: Refer to ED or acute medical team immediately. Acute kidney 
