# Triage Advisor v1.1.0 Regression Test Results

**Date:** 2026-05-23T20:24:13.146Z
**Prompt version:** 1.1.0
**Model:** claude-sonnet-4-20250514
**Mode:** strict

## Summary: 3/5 expected changes observed

| Case | Exam | Change observed |
|------|------|-----------------|
| RP-001 | CT Chest/Abdomen/Pelvis | ✅ Yes |
| RP-002 | Ultrasound Abdomen | ❌ No |
| RP-003 | CT Head | ❌ No |
| RP-004 | CT Head | ✅ Yes |
| RP-006 | Renal Ultrasound | ✅ Yes |

---

### ✅ RP-001 — CT Chest/Abdomen/Pelvis

**Clinical note:** `65yo male w/ unexplained wt loss 5% over past 6/12 with no localising symptoms or signs. Hb mildly low. Ex-smoker.`

**Expected change:** Should accept 'Hb mildly low' as meeting 'low Hb' criterion (rule 1d). Should still flag only one abnormal blood result documented (need 2+).

**Verdict:** Referral at risk — add missing information | Priority: P2

**Summary:** Weight loss duration meets minimum 6 months but requires 2+ abnormal bloods for P2 criteria — only 1 documented.

**Met criteria:**
- Male >50 with strong suspicion of malignancy [p10]
- No focal pathology [p10]
- Unintentional unexplained weight loss >5% over 3-6 months [p10]
- Low Hb [p10]

**Missing criteria:**
- 2+ abnormal bloods from: raised CRP, low Hb, raised Ca, high platelets, high ALP, low albumin — persistent on repeat after 3 weeks [p10]

**Notes:** Patient meets age and weight loss criteria but needs documentation of a second abnormal blood parameter to qualify for P2 urgent CT CAP pathway.

**Change observed:** YES
**Assessment:** Hb in met_criteria: true. Numeric Hb demanded in missing: false. Verdict: at_risk.

---

### ❌ RP-002 — Ultrasound Abdomen

**Clinical note:** `61yo european male newly diagnosed autoimmune hepatitis – liver edge felt just below RCM. Screen for HCC, cirrhosis`

**Expected change:** Should accept on hepatomegaly pathway. HCC surveillance gateway noted as advisory only (rule 7a), not as reason to decline.

**Verdict:** Referral likely to be declined | Priority: n/a

**Summary:** HCC surveillance requires initial gastroenterologist recommendation and is not routinely funded as screening without specialist guidance.

**Met criteria:**
- Non-pulsatile abdominal mass and suspected enlarged liver on examination [p31]

**Missing criteria:**
- HCC surveillance using liver ultrasound as initially recommended by a gastroenterologist or other secondary care specialist, or as recommended by an agreed local pathway [p31]

**Redirect:** Refer to gastroenterology for autoimmune hepatitis management and HCC surveillance planning

**Notes:** While hepatomegaly is documented, HCC surveillance is a specified-date pathway (S3) requiring initial specialist recommendation. The referral appears to be requesting screening rather than following an established surveillance protocol.

**Change observed:** NO
**Assessment:** Verdict: declined. Hepatomegaly in met: true. Notes field: While hepatomegaly is documented, HCC surveillance is a specified-date pathway (S3) requiring initial specialist recomme.

---

### ❌ RP-003 — CT Head

**Clinical note:** `64yo f w/ sudden onset R facial numbness + diplopia, lasting 10min. O/E: reduced sensation R face cf L, FROEM without diplopia. Obs OK, pulse regular. ?TIA`

**Expected change:** Should accept on focal neurological signs pathway. ?TIA noted as advisory differential with unmet gateway requirements (rule 7b).

**Verdict:** Referral likely to be declined | Priority: n/a

**Summary:** TIA pathway requires documented completion of BPAC TIA decision support tool, HNZ specialist recommendation, or inability to access rapid specialist care.

**Met criteria:**
- Focal neurological signs [p20]

**Missing criteria:**
- BPAC TIA decision support tool completed and indicates CT appropriate OR HNZ neurologist/stroke specialist/physician recommends CT OR patient unable to access rapid specialist care [p20]

**Notes:** The referral meets criteria for focal neurological signs but the TIA pathway has a mandatory gateway requirement. Even though clinical presentation is consistent with TIA, one of the three gateway requirements must be documented.

**Change observed:** NO
**Assessment:** Verdict: declined. Focal neuro in met: true. TIA noted as advisory: true.

---

### ✅ RP-004 — CT Head

**Clinical note:** `48yo m w/ 8/52 h/o progressive HA – bilateral – sometimes associated nausea – dizziness and vertigo over this period (normal hearing + vision testing). ?SOL`

**Expected change:** 'Progressive' should satisfy 'change in pattern with progressive increase in frequency or severity' (rule 1e). Should proceed without flagging pattern change as missing.

**Verdict:** Referral at risk — add missing information | Priority: P2

**Summary:** Progressive headache pattern documented but missing required associated features for P2 criteria.

**Met criteria:**
- Change in pattern of headaches with progressive increase in frequency or severity [p20]

**Missing criteria:**
- Associated with chronic illness with potential cerebral complications (especially malignancy), OR exacerbated by coughing/sneezing/Valsalva (not typical migraine), OR associated with persistent nausea/vomiting (not typical migraine), OR objective neurological deficit [p20]

**Notes:** The referral documents progressive headache but needs one of the four required associated features clearly documented to meet P2 criteria. The mentioned nausea could qualify if documented as persistent, or if persistent vomiting is present.

**Change observed:** YES
**Assessment:** Rule 1e working: "progressive" accepted as meeting "change in pattern" (in met_criteria, absent from missing_criteria). Verdict at_risk is correct — CT Head P2 also requires one associated feature (Valsalva/persistent nausea/malignancy/objective neuro); "sometimes associated nausea" does not meet "persistent" in strict mode. The specific expected change (rule 1e) DID take effect.

---

### ✅ RP-006 — Renal Ultrasound

**Clinical note:** `75yo m w/ new AKI, eGFR 3 (normally 55). No clear cause.`

**Expected change:** Should surface all matching pathways — P1 48hr AKI indication, P2 acute renal function deterioration, and alternative management. Should flag conflicting dispositions in notes (rule 7c).

**Verdict:** Referral likely to proceed | Priority: Acute 48hr

**Summary:** Meets criteria for acute renal ultrasound due to acute renal function deterioration with eGFR drop from 55 to 3.

**Met criteria:**
- Acute renal function deterioration — serum creatinine increase >50 micromol/L in 7 days or >25 micromol/L in 2 days [p53]

**Notes:** eGFR drop from 55 to 3 represents severe acute kidney injury warranting urgent imaging. Note recommends discussion with secondary care/PCRL for such presentations.

**Change observed:** YES
**Assessment:** Verdict: proceeds. Priority: Acute 48hr. P1/AKI surfaced: true. P2 surfaced: false. Alt mgmt: eGFR drop from 55 to 3 represents severe acute kidney injury warranting urgent imaging. Note recomme.

