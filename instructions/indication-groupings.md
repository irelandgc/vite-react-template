# Indication-First Clinical Theme Groupings

> **Purpose:** Explicit item-ID → clinical theme mapping for the indication-first view in the CRR viewer and triage advisor. Replaces keyword-matching logic.
>
> **Principles:**
> - No "Other" catch-all groups. Every item has a clinically meaningful home.
> - Groups reflect how a GP frames the patient's presenting problem, not urgency tiers.
> - "Specialist-endorsed referral" replaces all "Secondary Care Referral" group labels.
> - Medication-related imaging items form their own group where present.
> - Emergency redirect items (groups titled "Refer for acute assessment — without initial imaging") are excluded from the tickable criteria list entirely — they render as a red banner above the criteria.
> - Groups titled "Critical — seek acute specialist advice" are tickable but displayed prominently.
>
> **For implementation:** Replace `getIndicationTheme()` / `triGetIndicationTheme()` in viewer and triage with a direct `INDICATION_THEME_MAP` object lookup.
>
> **Last updated:** 2026-05-09

---

## CT Head (`ct_head`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| cth_a1 | Acute — within 48 hours | TIA / stroke |
| cth_a2 | Acute — within 48 hours | TIA / stroke |
| cth_a3 | Acute — within 48 hours | Seizure |
| cth_a4 | Acute — within 48 hours | Specialist-endorsed referral |
| cth_p2_1 | P2 — Urgent, within 2 weeks | Headache |
| cth_p2_2 | P2 — Urgent, within 2 weeks | Cognitive impairment |
| cth_p2_3 | P2 — Urgent, within 2 weeks | Seizure |
| cth_p2_4 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| cth_p4_1 | P4 — Deferrable | Cognitive impairment |
| cth_p4_2 | P4 — Deferrable | Specialist-endorsed referral |

**Proposed theme order:** TIA / stroke → Headache → Cognitive impairment → Seizure → Specialist-endorsed referral

---

## CT Chest/Abdomen/Pelvis (`ct_cap`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| ctcap_1 | P2 — Urgent, within 2 weeks | Suspected occult malignancy |
| ctcap_2 | P2 — Urgent, within 2 weeks | Suspected occult malignancy |
| ctcap_3 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |

---

## CT Chest (`ct_chest`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| ctc_p2_1 | P2 — Urgent, within 2 weeks | Haemoptysis |
| ctc_p2_2 | P2 — Urgent, within 2 weeks | Lung cancer risk |
| ctc_p2_3 | P2 — Urgent, within 2 weeks | Abnormal CXR / nodule |
| ctc_p2_4 | P2 — Urgent, within 2 weeks | Abnormal CXR / nodule |
| ctc_p2_5 | P2 — Urgent, within 2 weeks | Staging |
| ctc_p2_6 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| ctc_p3_1 | P3 — Non-deferrable, within 6 weeks | Abnormal CXR / nodule |
| ctc_p3_2 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

**Proposed theme order:** Haemoptysis → Lung cancer risk → Abnormal CXR / nodule → Staging → Specialist-endorsed referral

---

## CT Colonography (`ct_colonography`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| ctc_col_p2_1 | P2 — Urgent, within 2 weeks | Bowel symptoms |
| ctc_col_p2_2 | P2 — Urgent, within 2 weeks | Anaemia / blood results |
| ctc_col_p2_3 | P2 — Urgent, within 2 weeks | Known or suspected colorectal cancer |
| ctc_col_p2_4 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| ctc_col_p3_1 | P3 — Non-deferrable, within 6 weeks | Bowel symptoms |
| ctc_col_p3_2 | P3 — Non-deferrable, within 6 weeks | Bowel symptoms |
| ctc_col_p3_3 | P3 — Non-deferrable, within 6 weeks | Rectal bleeding |
| ctc_col_p3_4 | P3 — Non-deferrable, within 6 weeks | Anaemia / blood results |
| ctc_col_p3_5 | P3 — Non-deferrable, within 6 weeks | Family history |
| ctc_col_p3_6 | P3 — Non-deferrable, within 6 weeks | Family history |
| ctc_col_p3_7 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

**Proposed theme order:** Known or suspected colorectal cancer → Bowel symptoms → Rectal bleeding → Anaemia / blood results → Family history → Specialist-endorsed referral

---

## CT IVU / CT Renal (`ct_ivu`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| ctivu_p2_1 | P2 — Urgent, within 2 weeks | Haematuria |
| ctivu_p2_2 | P2 — Urgent, within 2 weeks | Haematuria |
| ctivu_p2_3 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| ctivu_p3_1 | P3 — Non-deferrable, within 6 weeks | Haematuria |
| ctivu_p3_2 | P3 — Non-deferrable, within 6 weeks | Incidental renal lesion |
| ctivu_p3_3 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

---

## CT KUB (`ct_kub`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| kub_acute_1 | Refer for acute assessment — red flags | Complicated stone — refer urgently |
| kub_acute_2 | Refer for acute assessment — red flags | Complicated stone — refer urgently |
| kub_acute_3 | Refer for acute assessment — red flags | Complicated stone — refer urgently |
| kub_acute_4 | Refer for acute assessment — red flags | Complicated stone — refer urgently |
| kub_acute_5 | Refer for acute assessment — red flags | Complicated stone — refer urgently |
| kub_48_1 | Acute — within 48 hours | Renal colic |
| kub_48_2 | Acute — within 48 hours | Specialist-endorsed referral |
| kub_s2_1 | S2 — Specified date | Stone follow-up |
| kub_s2_2 | S2 — Specified date | Specialist-endorsed referral |

> Note: The "red flags" group for KUB (`kub_acute_1` through `kub_acute_5`) is NOT an emergency redirect — these items ARE tickable (they tell the referrer to admit, not to image). They should remain in the criteria list under "Complicated stone — refer urgently" theme. Do NOT treat this group as an emergency banner.

---

## CT Sinus (`ct_sinus`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| sin_p3_1 | P3 — Non-deferrable, within 6 weeks | Chronic rhinosinusitis |
| sin_p3_2 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

---

## CT Other (`ct_other`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| cto_acute_1 | Acute — within 24–48 hours | Specialist-endorsed referral |
| cto_p2_1 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| cto_p2_2 | P2 — Urgent, within 2 weeks | Suspected malignancy |
| cto_p3_1 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |
| cto_p3_2 | P3 — Non-deferrable, within 6 weeks | Suspected malignancy |

---

## US Abdomen (`us_abdomen`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| usa_emerg_1 | Refer for acute assessment | Acute abdominal emergency |
| usa_emerg_2 | Refer for acute assessment | Acute abdominal emergency |
| usa_emerg_3 | Refer for acute assessment | Acute abdominal emergency |
| usa_emerg_4 | Refer for acute assessment | Acute abdominal emergency |
| usa_48_1 | Acute — within 48 hours | Liver and biliary |
| usa_48_2 | Acute — within 48 hours | Liver and biliary |
| usa_48_3 | Acute — within 48 hours | Specialist-endorsed referral |
| usa_p2_1 | P2 — Urgent, within 2 weeks | Liver and biliary |
| usa_p2_2 | P2 — Urgent, within 2 weeks | Liver and biliary |
| usa_p2_3 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| usa_p3_1 | P3 — Non-deferrable, within 6 weeks | Liver and biliary |
| usa_p3_2 | P3 — Non-deferrable, within 6 weeks | Liver and biliary |
| usa_p3_3 | P3 — Non-deferrable, within 6 weeks | Liver and biliary |
| usa_p3_4 | P3 — Non-deferrable, within 6 weeks | Liver and biliary |
| usa_p3_5 | P3 — Non-deferrable, within 6 weeks | Liver and biliary |
| usa_p3_6 | P3 — Non-deferrable, within 6 weeks | Aortic aneurysm |
| usa_p3_7 | P3 — Non-deferrable, within 6 weeks | Abdominal mass or organomegaly |
| usa_p3_8 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |
| usa_s3_1 | S3 — Specified date | Cancer surveillance |
| usa_s3_2 | S3 — Specified date | Aortic aneurysm |
| usa_s3_3 | S3 — Specified date | Cancer surveillance |

**Proposed theme order:** Liver and biliary → Aortic aneurysm → Abdominal mass or organomegaly → Cancer surveillance → Specialist-endorsed referral

---

## US Carotid (`us_carotid`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| usc_emerg_1 | Refer for acute assessment | TIA / stroke risk |
| usc_48_1 | Acute — within 48 hours | TIA / stroke risk |

---

## US DVT (`us_dvt`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| usd_24_1 | Acute — within 24 hours | Superficial venous thrombosis |
| usd_24_2 | Acute — within 24 hours | Suspected upper limb DVT |
| usd_24_3 | Acute — within 24 hours | Specialist-endorsed referral |
| usd_48_1 | Acute — within 48 hours | Suspected lower limb DVT |
| usd_48_2 | Acute — within 48 hours | Suspected lower limb DVT |
| usd_s1_1 | S1 — Specified date | DVT follow-up |
| usd_s1_2 | S1 — Specified date | DVT follow-up |
| usd_s2_1 | S2 — Specified date | DVT follow-up |

**Proposed theme order:** Suspected lower limb DVT → Suspected upper limb DVT → Superficial venous thrombosis → DVT follow-up → Specialist-endorsed referral

---

## US Musculoskeletal (`us_msk`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| usmsk_1 | P3-P4 — within 6 to 12 weeks | Specialist-endorsed referral |

---

## US Neck / Thyroid (`us_neck_thyroid`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| usnt_p2_1 | P2 — Urgent, within 2 weeks | Thyroid nodule — suspected malignancy |
| usnt_p2_2 | P2 — Urgent, within 2 weeks | Thyroid nodule — suspected malignancy |
| usnt_p2_3 | P2 — Urgent, within 2 weeks | Neck mass |
| usnt_p2_4 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| usnt_p3_1 | P3 — Non-deferrable, within 6 weeks | Thyroid nodule — initial assessment |
| usnt_p3_2 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |
| usnt_p4_1 | P4 — Deferrable | Incidental thyroid nodule |
| usnt_p4_2 | P4 — Deferrable | Incidental thyroid nodule |
| usnt_s2_1 | S2 — Specified date | Specialist-endorsed referral |
| usnt_s2_2 | S2 — Specified date | Thyroid nodule — follow-up |

**Proposed theme order:** Thyroid nodule — suspected malignancy → Neck mass → Thyroid nodule — initial assessment → Incidental thyroid nodule → Thyroid nodule — follow-up → Specialist-endorsed referral

---

## US Pelvis (`us_pelvis`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| usp_emerg_1 | Refer for acute assessment | Acute pelvic pain |
| usp_24_1 | Acute — within 24 hours | Acute pelvic pain |
| usp_24_2 | Acute — within 24 hours | Acute pelvic pain |
| usp_24_3 | Acute — within 24 hours | Acute pelvic pain |
| usp_48_1 | Acute — within 48 hours | Acute pelvic pain |
| usp_48_2 | Acute — within 48 hours | Specialist-endorsed referral |
| usp_p2_1 | P2 — Urgent, within 2 weeks | Suspected gynaecological malignancy |
| usp_p2_2 | P2 — Urgent, within 2 weeks | Post-menopausal bleeding |
| usp_p2_3 | P2 — Urgent, within 2 weeks | Post-menopausal bleeding |
| usp_p2_4 | P2 — Urgent, within 2 weeks | Suspected gynaecological malignancy |
| usp_p2_5 | P2 — Urgent, within 2 weeks | Abnormal uterine bleeding |
| usp_p2_6 | P2 — Urgent, within 2 weeks | Suspected gynaecological malignancy |
| usp_p2_7 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| usp_p3_1 | P3 — Non-deferrable, within 6 weeks | Abnormal uterine bleeding |
| usp_p3_2 | P3 — Non-deferrable, within 6 weeks | Abnormal uterine bleeding |
| usp_p3_3 | P3 — Non-deferrable, within 6 weeks | Abnormal uterine bleeding |
| usp_p3_4 | P3 — Non-deferrable, within 6 weeks | Post-menopausal bleeding |
| usp_p3_5 | P3 — Non-deferrable, within 6 weeks | Post-menopausal bleeding |
| usp_p3_6 | P3 — Non-deferrable, within 6 weeks | Ovarian cyst or pelvic mass |
| usp_p3_7 | P3 — Non-deferrable, within 6 weeks | Chronic pelvic conditions |
| usp_p3_8 | P3 — Non-deferrable, within 6 weeks | Chronic pelvic conditions |
| usp_p3_9 | P3 — Non-deferrable, within 6 weeks | Chronic pelvic conditions |
| usp_p3_10 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |
| usp_p3_11 | P3 — Non-deferrable, within 6 weeks | Suspected gynaecological malignancy |
| usp_p4_1 | P4 — Deferrable | Chronic pelvic conditions |
| usp_p4_2 | P4 — Deferrable | Chronic pelvic conditions |
| usp_p4_3 | P4 — Deferrable | Specialist-endorsed referral |

**Proposed theme order:** Acute pelvic pain → Suspected gynaecological malignancy → Post-menopausal bleeding → Abnormal uterine bleeding → Ovarian cyst or pelvic mass → Chronic pelvic conditions → Specialist-endorsed referral

---

## US Renal (`us_renal`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| usr_24_1 | Acute — within 24–48 hours | Renal colic |
| usr_48_2 | Acute — within 48 hours | Urinary symptoms |
| usr_48_3 | Acute — within 48 hours | Specialist-endorsed referral |
| usr_p2_1 | P2 — Urgent, within 2 weeks | Haematuria — macroscopic |
| usr_p2_2 | P2 — Urgent, within 2 weeks | Haematuria — macroscopic |
| usr_p2_3 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| usr_p3_1 | P3 — Non-deferrable, within 6 weeks | Haematuria — microscopic |
| usr_p3_2 | P3 — Non-deferrable, within 6 weeks | CKD / kidney function |
| usr_p3_3 | P3 — Non-deferrable, within 6 weeks | Varicocele |
| usr_p3_4 | P3 — Non-deferrable, within 6 weeks | Urinary symptoms |
| usr_p3_5 | P3 — Non-deferrable, within 6 weeks | Urinary symptoms |
| usr_p3_6 | P3 — Non-deferrable, within 6 weeks | Urinary symptoms |
| usr_p3_7 | P3 — Non-deferrable, within 6 weeks | Loin pain |
| usr_p3_8 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |
| usr_p4_1 | P4 — Deferrable | Haematuria — microscopic |
| usr_p4_2 | P4 — Deferrable | Haematuria — microscopic |
| usr_p4_3 | P4 — Deferrable | Haematuria — microscopic |

**Proposed theme order:** Haematuria — macroscopic → Haematuria — microscopic → Renal colic → Urinary symptoms → CKD / kidney function → Loin pain → Varicocele → Specialist-endorsed referral

---

## US Scrotum (`us_scrotum`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| ussc_emerg_1 | Refer for acute assessment | Acute scrotal emergency |
| ussc_emerg_2 | Refer for acute assessment | Acute scrotal emergency |
| ussc_48_1 | Acute — within 48 hours | Suspected testicular cancer |
| ussc_48_2 | Acute — within 48 hours | Specialist-endorsed referral |
| ussc_p2_1 | P2 — Urgent, within 2 weeks | Suspected testicular cancer |
| ussc_p2_2 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| ussc_p3_1 | P3 — Non-deferrable, within 6 weeks | Scrotal lump |
| ussc_p3_2 | P3 — Non-deferrable, within 6 weeks | Infection / inflammation |
| ussc_p3_3 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |
| ussc_p4_1 | P4 — Deferrable | Scrotal lump |

**Proposed theme order:** Suspected testicular cancer → Scrotal lump → Infection / inflammation → Specialist-endorsed referral

---

## US Soft Tissue (`us_soft_tissue`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| usst_48_1 | Acute — within 48 hours | Foreign body |
| usst_p2_1 | P2 — Urgent, within 2 weeks | Suspected sarcoma or malignant lump |
| usst_p2_2 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| usst_p3_1 | P3 — Non-deferrable, within 6 weeks | Uncertain lump |
| usst_p3_2 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

**Proposed theme order:** Suspected sarcoma or malignant lump → Uncertain lump → Foreign body → Specialist-endorsed referral

---

## XR Chest (`xr_chest`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| xrc_emerg_1 | Refer for acute assessment | Acute deterioration — refer urgently |
| xrc_emerg_2 | Refer for acute assessment | Acute deterioration — refer urgently |
| xrc_emerg_3 | Refer for acute assessment | Acute deterioration — refer urgently |
| xrc_emerg_4 | Refer for acute assessment | Acute deterioration — refer urgently |
| xrc_24_1 | Acute — within 24 hours | Acute deterioration — refer urgently |
| xrc_24_2 | Acute — within 24 hours | Acute deterioration — refer urgently |
| xrc_48_1 | Acute — within 48 hours | Respiratory symptoms |
| xrc_48_2 | Acute — within 48 hours | Respiratory symptoms |
| xrc_48_3 | Acute — within 48 hours | Respiratory symptoms |
| xrc_48_4 | Acute — within 48 hours | Chronic respiratory disease |
| xrc_48_5 | Acute — within 48 hours | Suspected malignancy |
| xrc_48_6 | Acute — within 48 hours | Respiratory infection |
| xrc_48_7 | Acute — within 48 hours | Suspected malignancy |
| xrc_48_8 | Acute — within 48 hours | Suspected malignancy |
| xrc_48_9 | Acute — within 48 hours | Suspected malignancy |
| xrc_48_10 | Acute — within 48 hours | Suspected malignancy |
| xrc_48_11 | Acute — within 48 hours | Suspected malignancy |
| xrc_48_12 | Acute — within 48 hours | Suspected malignancy |
| xrc_48_13 | Acute — within 48 hours | Respiratory symptoms |
| xrc_48_14 | Acute — within 48 hours | Respiratory infection |
| xrc_48_15 | Acute — within 48 hours | Respiratory symptoms |
| xrc_48_16 | Acute — within 48 hours | Specialist-endorsed referral |
| xrc_p2_1 | P2 — Urgent, within 2 weeks | Respiratory infection |
| xrc_p2_2 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| xrc_p2_3 | P2 — Urgent, within 2 weeks | Medication-related |
| xrc_p2_4 | P2 — Urgent, within 2 weeks | Suspected malignancy |
| xrc_p2_5 | P2 — Urgent, within 2 weeks | Medication-related |
| xrc_p3_1 | P3 — Non-deferrable, within 6 weeks | Chronic respiratory disease |
| xrc_p3_2 | P3 — Non-deferrable, within 6 weeks | Chronic respiratory disease |
| xrc_p3_3 | P3 — Non-deferrable, within 6 weeks | Chronic respiratory disease |
| xrc_p3_4 | P3 — Non-deferrable, within 6 weeks | Occupational and environmental exposure |
| xrc_p3_5 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |
| xrc_s2_1 | S2 — Specified date | Respiratory infection |
| xrc_s2_2 | S2 — Specified date | Cancer surveillance and follow-up |
| xrc_s2_3 | S2 — Specified date | Cancer surveillance and follow-up |
| xrc_s2_4 | S2 — Specified date | Specialist-endorsed referral |

**Proposed theme order:** Respiratory symptoms → Suspected malignancy → Respiratory infection → Chronic respiratory disease → Medication-related → Occupational and environmental exposure → Cancer surveillance and follow-up → Specialist-endorsed referral

---

## XR Abdomen (`xr_abdomen`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| xra_emerg_1 | Refer for acute assessment | Acute abdomen — refer urgently |
| xra_48_1 | Acute — within 48 hours | Constipation |
| xra_48_2 | Acute — within 48 hours | Specialist-endorsed referral |
| xra_p3_1 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |
| xra_p3_2 | P3 — Non-deferrable, within 6 weeks | Urinary tract / stones |
| xra_s2_1 | S2 — Specified date | Urinary tract / stones |

**Proposed theme order:** Constipation → Urinary tract / stones → Specialist-endorsed referral

---

## XR Ankle / Foot (`xr_ankle_foot`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| xraf_emerg_1 | Refer for acute assessment | Acute infection — refer urgently |
| xraf_acute_1 | Critical — seek acute specialist advice | Acute infection — refer urgently |
| xraf_48_1 | Acute — within 48 hours | Specialist-endorsed referral |
| xraf_p2_1 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xraf_p2_2 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xraf_p2_3 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xraf_p3_1 | P3 — Non-deferrable, within 6 weeks | Undiagnosed persistent pain |
| xraf_p3_2 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xraf_p3_3 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xraf_p3_4 | P3 — Non-deferrable, within 6 weeks | Inflammatory arthritis |
| xraf_p3_5 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

**Proposed theme order:** Red flag pain — possible malignancy → Undiagnosed persistent pain → Osteoarthritis — surgical assessment → Inflammatory arthritis → Specialist-endorsed referral

---

## XR Elbow (`xr_elbow`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| xre_emerg_1 | Refer for acute assessment | Acute infection — refer urgently |
| xre_acute_1 | Critical — seek acute specialist advice | Acute infection — refer urgently |
| xre_p2_1 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xre_p2_2 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xre_p2_4 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xre_p2_3 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| xre_p3_1 | P3 — Non-deferrable, within 6 weeks | Undiagnosed persistent pain |
| xre_p3_2 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xre_p3_3 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xre_p3_4 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

**Proposed theme order:** Red flag pain — possible malignancy → Undiagnosed persistent pain → Osteoarthritis — surgical assessment → Specialist-endorsed referral

---

## XR Knee (`xr_knee`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| xrk_emerg_1 | Refer for acute assessment | Acute infection — refer urgently |
| xrk_acute_1 | Critical — seek acute specialist advice | Acute infection — refer urgently |
| xrk_p2_1 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrk_p2_2 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrk_p2_4 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrk_p2_3 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| xrk_p3_1 | P3 — Non-deferrable, within 6 weeks | Undiagnosed persistent pain |
| xrk_p3_2 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrk_p3_3 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrk_p3_4 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

---

## XR Pelvis / Hip (`xr_pelvis_hip`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| xrph_emerg_1 | Refer for acute assessment | Acute infection — refer urgently |
| xrph_acute_1 | Critical — seek acute specialist advice | Acute infection — refer urgently |
| xrph_p2_1 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrph_p2_3 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrph_p2_4 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrph_p2_2 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| xrph_p3_1 | P3 — Non-deferrable, within 6 weeks | Undiagnosed persistent pain |
| xrph_p3_2 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrph_p3_3 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrph_p3_4 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

---

## XR Shoulder (`xr_shoulder`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| xrs_emerg_1 | Refer for acute assessment | Acute infection — refer urgently |
| xrs_acute_1 | Critical — seek acute specialist advice | Acute infection — refer urgently |
| xrs_p2_1 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrs_p2_2 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrs_p2_4 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrs_p2_3 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| xrs_p3_1 | P3 — Non-deferrable, within 6 weeks | Unresponsive to conservative management |
| xrs_p3_2 | P3 — Non-deferrable, within 6 weeks | Unresponsive to conservative management |
| xrs_p3_3 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrs_p3_4 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrs_p3_5 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

**Proposed theme order:** Red flag pain — possible malignancy → Unresponsive to conservative management → Osteoarthritis — surgical assessment → Specialist-endorsed referral

---

## XR Spine (`xr_spine`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| xrsp_emerg_1 | Refer for acute assessment | Emergency — refer urgently |
| xrsp_emerg_2 | Refer for acute assessment | Emergency — refer urgently |
| xrsp_48_1 | Acute — within 48 hours | Specialist-endorsed referral |
| xrsp_p2_1 | P2 — Urgent, within 2 weeks | Suspected fracture |
| xrsp_p2_2 | P2 — Urgent, within 2 weeks | Red flags for malignancy |
| xrsp_p2_3 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| xrsp_p3_2 | P3 — Non-deferrable, within 6 weeks | Inflammatory spinal disease |
| xrsp_p3_3 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

**Proposed theme order:** Red flags for malignancy → Suspected fracture → Inflammatory spinal disease → Specialist-endorsed referral

---

## XR Wrist / Hand (`xr_wrist_hand`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| xrwh_emerg_1 | Refer for acute assessment | Acute infection — refer urgently |
| xrwh_acute_1 | Critical — seek acute specialist advice | Acute infection — refer urgently |
| xrwh_p2_1 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrwh_p2_2 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrwh_p2_4 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrwh_p2_3 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| xrwh_p3_1 | P3 — Non-deferrable, within 6 weeks | Undiagnosed persistent pain |
| xrwh_p3_2 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrwh_p3_3 | P3 — Non-deferrable, within 6 weeks | Inflammatory arthritis |
| xrwh_p3_4 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrwh_p3_5 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

---

## XR Humerus (`xr_humerus`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| xrhu_emerg_1 | Refer for acute assessment | Acute infection — refer urgently |
| xrhu_acute_1 | Critical — seek acute specialist advice | Acute infection — refer urgently |
| xrhu_p2_1 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrhu_p2_2 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrhu_p2_3 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrhu_p2_4 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| xrhu_p3_1 | P3 — Non-deferrable, within 6 weeks | Undiagnosed persistent pain |
| xrhu_p3_2 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrhu_p3_3 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrhu_p3_4 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

---

## XR Forearm (`xr_forearm`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| xrfa_emerg_1 | Refer for acute assessment | Acute infection — refer urgently |
| xrfa_acute_1 | Critical — seek acute specialist advice | Acute infection — refer urgently |
| xrfa_p2_1 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrfa_p2_2 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrfa_p2_3 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrfa_p2_4 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| xrfa_p3_1 | P3 — Non-deferrable, within 6 weeks | Undiagnosed persistent pain |
| xrfa_p3_2 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrfa_p3_3 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrfa_p3_4 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

---

## XR Femur (`xr_femur`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| xrfe_emerg_1 | Refer for acute assessment | Acute infection — refer urgently |
| xrfe_acute_1 | Critical — seek acute specialist advice | Acute infection — refer urgently |
| xrfe_p2_1 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrfe_p2_2 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrfe_p2_3 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrfe_p2_4 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| xrfe_p3_1 | P3 — Non-deferrable, within 6 weeks | Undiagnosed persistent pain |
| xrfe_p3_2 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrfe_p3_3 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrfe_p3_4 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

---

## XR Tibia / Fibula (`xr_tibia_fibula`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| xrtf_emerg_1 | Refer for acute assessment | Acute infection — refer urgently |
| xrtf_acute_1 | Critical — seek acute specialist advice | Acute infection — refer urgently |
| xrtf_p2_1 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrtf_p2_2 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrtf_p2_3 | P2 — Urgent, within 2 weeks | Red flag pain — possible malignancy |
| xrtf_p2_4 | P2 — Urgent, within 2 weeks | Specialist-endorsed referral |
| xrtf_p3_1 | P3 — Non-deferrable, within 6 weeks | Undiagnosed persistent pain |
| xrtf_p3_2 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrtf_p3_3 | P3 — Non-deferrable, within 6 weeks | Osteoarthritis — surgical assessment |
| xrtf_p3_4 | P3 — Non-deferrable, within 6 weeks | Specialist-endorsed referral |

---

## MRI Lumbar Spine (`mri_lumbar`)

| Item ID | Current Group | Proposed Theme |
|---|---|---|
| mril_emerg_1 | Red flags — refer for acute assessment | Emergency — refer urgently |
| mril_emerg_2 | Red flags — refer for acute assessment | Emergency — refer urgently |
| mril1 | Indicative criteria | Neurological symptoms |
| mril2 | Indicative criteria | Suspected serious spinal pathology |
| mril3 | Indicative criteria | Neurological symptoms |
| mril4 | Indicative criteria | Specialist-endorsed referral |

**Proposed theme order:** Suspected serious spinal pathology → Neurological symptoms → Specialist-endorsed referral

---

## Implementation Notes

### `INDICATION_THEME_MAP` structure

```javascript
var INDICATION_THEME_MAP = {
  // CT Head
  "cth_a1": "TIA / stroke",
  "cth_a2": "TIA / stroke",
  // ... etc
};
```

### Theme order per site

Define a `INDICATION_THEME_ORDER` map keyed by site ID to control the display order of themes in the indication-first view. Themes not in the order array fall back to alphabetical.

### Emergency items

Items in groups titled "Refer for acute assessment — without initial imaging" (and the MRI Lumbar "Red flags" group) must be EXCLUDED from the indication-first tickable list. They render as a red banner above the criteria area per the existing emergency redirect logic.

**Exception:** CT KUB "Refer for acute assessment — red flags" items (`kub_acute_1` through `kub_acute_5`) ARE tickable — they instruct the referrer to admit the patient, not to image. These appear under the theme "Complicated stone — refer urgently".

### Critical — seek acute specialist advice items

These (e.g. `xraf_acute_1`, osteomyelitis items across XR joints) remain tickable. They group into "Acute infection — refer urgently" along with their site's emergency redirect item. In the urgency view they continue to appear under the "Critical" group header.

### XR MSK joint sites — shared pattern

All XR joint sites follow the same theme pattern. Sites with inflammatory arthritis items (Ankle/Foot: `xraf_p3_4`, Wrist/Hand: `xrwh_p3_3`) include an "Inflammatory arthritis" theme; other joint sites do not.
