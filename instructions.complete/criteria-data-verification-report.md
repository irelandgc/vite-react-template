# Criteria Data Chain Verification Report

**Date:** 24 May 2026
**Scope:** 4 cases regressed in v2.0.0 regression test, attributed to data gaps
**Method:** Traced each case through Layer 3 (D1), Layer 4 (SITE_INDEX), Layer 5 (prompt assembly)

> **Note on Layer 2 (JSON source):** `pdf-criteria-all.json` is not present in the repository (`migration-output/` directory does not exist). Verification started at Layer 3.

---

## Case 1 — Paediatric knee/bone pain (RP-005)

**Clinical note:** `8yo boy 5/12 h/o progressive pain R lower leg – ?knee ?ankle. Pain during the day and night. Limp at times.`
**Exam type:** Knee X-ray

**Layer 3 (D1):** FOUND. Record `xr_knee_paed` (population: paediatric) exists with correct `_p` suffix item IDs: `xrkn_em_1_p`, `xrkn_p2_1_p` through `xrkn_p3_5_p`. 5 criteria items across 3 groups.

**Layer 4 (SITE_INDEX):** FOUND. `xr_knee_paed` appears in `paed_index` (page 104) with matching items including `xrk_p_p2_1`: "Undiagnosed persistent knee pain for one week or more with pain at rest or waking at night" — directly matches the night pain in the note.

**Layer 5 (Prompt assembly):** ROOT CAUSE IDENTIFIED — TEST HARNESS BUG. The regression test script (`run-v200-regression-test.mjs`, line 322) uses `matchData.index || []` — the adult SITE_INDEX only. It never fetches `matchData.paed_index`. No paediatric detection is implemented. The system prompt was built with adult `xr_knee` (page 71) criteria, not paediatric. The AI correctly found adult criteria do not match an 8yo patient, then hallucinated the rule "CRR X-ray pathways specifically exclude children under 16 years" (no such rule exists — there is a separate paediatric pathway).

Confirmation: AI met_criteria cited "[p71]" (adult xr_knee page) instead of "[p104]" (paediatric xr_knee page), proving adult criteria were used.

**Root cause:** Layer 5 — test harness does not implement paediatric detection; adult criteria served instead of paediatric
**Fix required:** Update test script to detect paediatric patients from note text (pattern match `8yo`, `13yo`, etc.) and use `paed_index` for those cases. Add "NOTE: This patient is PAEDIATRIC" to the system prompt when paediatric detected. **Not a data gap — criteria data is correct in both D1 and SITE_INDEX.**

---

## Case 2 — Paediatric hip / SUFE (CR-002)

**Clinical note:** `13 year old boy with R knee pain for past few weeks... mild limp, restricted ROM R hip mild pain.`
**Exam type:** Hip X-ray

**Layer 3 (D1):** FOUND. Record `xr_pelvis_hip_paed` (population: paediatric) exists with correct `_p` suffix item IDs including `xrph_p_em2_p` (suspected SUFE) and `xrph_p3_1_p` through `xrph_p3_3_p`.

**Layer 4 (SITE_INDEX):** FOUND. `xr_pelvis_hip_paed` in `paed_index` (page 106) with items including:
- `xrph_p_em2`: "Suspected slipped upper femoral epiphysis (SUFE) — acute severe hip pain in overweight adolescent"
- `xrph_p_p3_1`: "Hip pain in a child persisting for more than 2 weeks without a clear diagnosis"
- `xrph_p_p3_2`: "Secondary care clinician, PCRL or radiologist advises referral for non-urgent X-ray"

`xrph_p_p3_1` directly matches the note (hip pain >2 weeks, no clear diagnosis).

**Layer 5 (Prompt assembly):** ROOT CAUSE IDENTIFIED — same test harness bug as Case 1. Adult `xr_pelvis_hip` (page 73) was served instead of paediatric (page 106). The AI produced an adult-criteria assessment ("clinical features not typical of osteoarthritis" — an adult criterion) and redirected to specialist SUFE assessment as a STEP 0 redirect, instead of finding the paediatric pathway where SUFE is an explicit criterion with a direct imaging pathway.

**Root cause:** Layer 5 — same test harness bug
**Fix required:** Same fix as Case 1. **Not a data gap.**

---

## Case 3 — IUCD / Mirena malposition (LP-004)

**Clinical note:** `35yo with Mirena, recent lower abdominal pain and pv bleeding ? IUD malpositioned`
**Exam type:** Ultrasound Pelvis

**Layer 3 (D1):** FOUND (partial match). `us_pelvis` record has:
- `uspv_24_2`: "IUD strings missing and not visible on examination, or IUD breaks on removal attempt… and the patient presents with symptoms suggestive of possible perforation including cramping pain, discharge, unexplained bleeding."
- `uspv_p3_10`: "IUD strings not visible on exam or IUD breaks on removal attempt and fragment only removed and patient is asymptomatic."

**Layer 4 (SITE_INDEX):** FOUND (partial match). `us_pelvis` (page 46) has:
- `usp_24_3`: "IUCD strings missing or IUCD breaks on removal with only fragment removed AND symptoms suggestive of possible perforation (cramping pain, discharge, unexplained bleeding)"

Note: The D1 P3 IUD item (`uspv_p3_10`, non-urgent asymptomatic string visibility) does NOT appear in the SITE_INDEX as an IUD item — `usp_p3_10` in SITE_INDEX is a "secondary care clinician" item instead.

**Layer 5 (Prompt assembly):** Criterion `usp_24_3` IS included in the system prompt for Ultrasound Pelvis. The AI correctly found this criterion but declined because:
1. `usp_24_3` requires "IUCD strings missing" as a documented exam finding
2. The note says "?IUD malpositioned" — clinical suspicion only, no documented string exam
3. In STRICT documentation mode, the AI correctly refused to infer "strings missing" from "?malpositioned"

**Root cause:** CRITERIA GAP — `usp_24_3` requires a documented exam finding (strings missing) before imaging, but there is no criterion for "suspected IUD malposition with symptoms" prior to a string visibility examination. A GP suspecting malposition may not yet have done the vaginal exam. The brief confirms v1.0.0 handled this correctly for Louise, suggesting either the earlier prompt was more permissive in inferred mode, or there was/should be a criterion for general malposition suspicion.

**Fix required:** Manual verification against PDF p46 required. If the PDF contains a criterion for "suspected IUD malposition with symptoms" that is less restrictive than requiring documented string exam findings, update the SITE_INDEX criterion accordingly. In the meantime, consider updating `usp_24_3` label to include "OR suspected IUD malposition with symptoms (lower abdominal pain, PV bleeding) warranting position assessment". **FLAG FOR GARY: cross-check PDF p46 for IUD/IUCD malposition criteria wording.**

---

## Case 4 — Female microscopic haematuria (CR-003)

**Clinical note:** `Persisting microscopic haematuria in usually well and active 64 year old lady... non smoker, No infection on microscopy`
**Exam type:** Renal Ultrasound

**Layer 3 (D1):** FOUND. `us_renal` record has `usrn_p4_3`: "Microscopic haematuria, female, of any age and smoking status" — directly matches this patient.

**Layer 4 (SITE_INDEX):** FOUND. `us_renal` (page 53) has `usr_p4_2`: "Microscopic haematuria — female, of any age" — directly matches.

**Layer 5 (Prompt assembly):** Criterion `usr_p4_2` IS included in the system prompt. The AI explicitly listed it as met: "Microscopic haematuria — female patient [p53]" in `met_criteria`.

**Root cause:** PROMPT REASONING BUG — not a data gap. The AI:
1. Correctly found `usr_p4_2` and listed it as met
2. ALSO listed male-specific criteria (`usr_p3_1`, `usr_p4_1`) as "missing"
3. Allowed the "missing" male criteria to override the met female criterion in the verdict
4. Final verdict: declined, "Female patients with microscopic haematuria do not meet funding criteria" — directly contradicting its own met_criteria

This is the same pathway-versus-gateway confusion seen in RP-002 and TEST-004. The v2.0.0 "identify ALL matching pathways" step causes the AI to list ALL haematuria items, then apply each criterion's sub-elements to the patient regardless of gender specificity. The female criterion `usr_p4_2` is met, but the AI then also requires the male criteria to be met, which they cannot be for a female patient.

**Fix required:** Update v2.0.0 system prompt to explicitly state that gender-specific criteria are mutually exclusive — a female patient cannot and should not be assessed against male-specific haematuria criteria. This is a prompt logic fix, not a data fix. **No data changes required.**

---

## Summary

| Case | Layer 2 | Layer 3 (D1) | Layer 4 (SITE_INDEX) | Layer 5 (Prompt) | Root Cause |
|------|---------|--------------|----------------------|-----------------|------------|
| RP-005 Paed knee | N/A | ✓ Found | ✓ Found (paed_index) | ✗ Test script served adult criteria | Test harness bug |
| CR-002 Paed hip | N/A | ✓ Found | ✓ Found (paed_index) | ✗ Test script served adult criteria | Test harness bug |
| LP-004 IUCD | N/A | ✓ Found (partial) | ✓ Found (requires strings exam) | ✓ Included — AI correctly strict | Criteria gap (strings required) |
| CR-003 Haematuria | N/A | ✓ Found | ✓ Found | ✗ AI reasoning error | Prompt reasoning bug |

**No paediatric ID collision (the `_p` suffix fix has already been applied in D1). Both D1 and SITE_INDEX paediatric records are structurally correct.**

---

## Fixes

### Fix 1 — Test script paediatric detection (Cases 1 & 2)
Update `run-v200-regression-test.mjs` to detect paediatric patients and use `paed_index`. See separate test script update.

### Fix 2 — LP-004 IUCD criteria gap
**PENDING GARY REVIEW:** Cross-check PDF p46 for IUD malposition criterion wording. If PDF supports a more general malposition criterion, update `usp_24_3` in the SITE_INDEX KV to include "OR suspected IUD malposition with symptoms" as an additional trigger.

### Fix 3 — CR-003 prompt reasoning (female haematuria)
Update v2.0.0 system prompt to clarify that gender-exclusive criteria apply only to patients of the specified gender. Add explicit instruction to STEP 1 or STEP 2 that criteria containing "male patient" or "female" should not be listed as "missing" for patients of the other gender.
