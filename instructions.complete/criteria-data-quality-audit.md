# Criteria Data Quality Audit

**Date:** 24 May 2026
**Scope:** Full audit of SITE_INDEX match-data and D1 criteria table

---

## 1. Paediatric ID collisions — SITE_INDEX

**Finding:** No ID collisions. All 336 criteria items (247 adult + 89 paediatric) across all SITE_INDEX sites have unique IDs.

The adult and paediatric SITE_INDEX use different ID prefix conventions:
- Adult: `cth_p2_1`, `usp_24_3`, `xrk_p3_1` etc.
- Paediatric: `xrk_p_p2_1`, `xrph_p_em2` etc. (prefix includes `_p_` separator)

These conventions avoid collision without requiring a `_p` suffix on each item ID (the approach documented in `claude-code-data-load-instructions.md` applies to D1 item IDs within the `data` JSON column, which also have `_p` suffixes applied correctly).

**D1 paediatric items:** All have `_p` suffix applied (e.g., `xrkn_em_1_p`, `xrph_p2_1_p`). No collision with adult IDs.

---

## 2. Exam site mapping completeness

### Adult sites

| Site | In D1 | In SITE_INDEX | Items |
|------|-------|---------------|-------|
| ct_head | ✓ | ✓ | 10 |
| ct_cap | ✓ | ✓ | 3 |
| ct_chest | ✓ | ✓ | 8 |
| ct_colonography | ✓ | ✓ | 11 |
| ct_ivu | ✓ | ✓ | 6 |
| ct_kub | ✓ | ✓ | 9 |
| ct_sinus | ✓ | ✓ | 2 |
| **ct_other** | ✓ | ✗ MISSING | — |
| us_abdomen | ✓ | ✓ | 21 |
| us_carotid | ✓ | ✓ | 2 |
| us_dvt | ✓ | ✓ | 8 |
| **us_fna_biopsy** | ✓ | ✗ MISSING | — |
| us_msk | ✓ | ✓ | 1 |
| us_neck_thyroid | ✓ | ✓ | 10 |
| us_pelvis | ✓ | ✓ | 26 |
| us_renal | ✓ | ✓ | 18 |
| us_scrotum | ✓ | ✓ | 10 |
| us_soft_tissue | ✓ | ✓ | 5 |
| xr_abdomen | ✓ | ✓ | 5 |
| xr_ankle_foot | ✓ | ✓ | 9 |
| xr_chest | ✓ | ✓ | 33 |
| xr_elbow | ✓ | ✓ | 8 |
| **xr_femur** | ✓ | ✗ MISSING | — |
| **xr_forearm** | ✓ | ✗ MISSING | — |
| **xr_humerus** | ✓ | ✗ MISSING | — |
| xr_knee | ✓ | ✓ | 8 |
| xr_pelvis_hip | ✓ | ✓ | 7 |
| xr_shoulder | ✓ | ✓ | 9 |
| xr_spine | ✓ | ✓ | 9 |
| **xr_tibia_fibula** | ✓ | ✗ MISSING | — |
| xr_wrist_hand | ✓ | ✓ | 9 |

**6 adult D1 sites missing from SITE_INDEX:** ct_other, us_fna_biopsy, xr_femur, xr_forearm, xr_humerus, xr_tibia_fibula

These sites exist in D1 but are not served through `/api/match-data` to the Triage Advisor. Referrals for these exam types will not get criteria-based assessments. The 4 XR limb sites (femur, forearm, humerus, tibia/fibula) apply the same clinical logic as adjacent sites (shoulder, elbow, wrist/hand, knee) — the absence is a coverage gap but not a critical failure.

### Paediatric sites

| Site | In D1 | In SITE_INDEX | Items |
|------|-------|---------------|-------|
| **ct_head_paed** | ✓ | ✗ MISSING | — |
| us_abdomen_paed | ✓ | ✓ | 8 |
| us_hip_paed | ✓ | ✓ | 4 |
| **us_neck_thyroid_paed** | ✓ | ✗ MISSING | — |
| **us_pelvis_paed** | ✓ | ✗ MISSING | — |
| us_renal_paed | ✓ | ✓ | 8 |
| us_scrotum_paed | ✓ | ✓ | 5 |
| us_soft_tissue_paed | ✓ | ✓ | 4 |
| **us_spine_paed** | ✓ | ✗ MISSING | — |
| xr_abdomen_paed | ✓ | ✓ | 6 |
| xr_chest_paed | ✓ | ✓ | 10 |
| xr_elbow_paed | ✓ | ✓ | 7 |
| xr_feet_paed | ✓ | ✓ | 6 |
| **xr_femur_paed** | ✓ | ✗ MISSING | — |
| **xr_forearm_paed** | ✓ | ✗ MISSING | — |
| **xr_humerus_paed** | ✓ | ✗ MISSING | — |
| xr_knee_paed | ✓ | ✓ | 9 |
| xr_pelvis_hip_paed | ✓ | ✓ | 7 |
| xr_shoulder_paed | ✓ | ✓ | 6 |
| xr_spine_paed | ✓ | ✓ | 2 |
| **xr_tibia_fibula_paed** | ✓ | ✗ MISSING | — |
| xr_wrist_hand_paed | ✓ | ✓ | 7 |

**8 paediatric D1 sites missing from SITE_INDEX:** ct_head_paed, us_neck_thyroid_paed, us_pelvis_paed, us_spine_paed, xr_femur_paed, xr_forearm_paed, xr_humerus_paed, xr_tibia_fibula_paed

Most significant gap: `us_pelvis_paed` — paediatric pelvic ultrasound criteria are in D1 but not served to the Triage Advisor. `ct_head_paed` is also a gap.

---

## 3. Gender-specific criteria

Items in SITE_INDEX that contain explicit gender qualifiers:

| Site | Item ID | Gender qualifier | Criterion |
|------|---------|-----------------|-----------|
| ct_cap | ctcap_1 | Male >50 or female >60 | Age/gender threshold within a single item — correctly handled (both genders mentioned) |
| ct_cap | ctcap_2 | Male >40 or female >50 | As above |
| us_neck_thyroid | usnt_p2_1 | (mentions "rapid growth" — not gender restricted) | Not gender-exclusive |
| us_pelvis | usp_p2_6 | women only | Cervical screening cytology — context is implicitly female-only (pelvis exam) |
| us_renal | usr_24_1 | female only | Renal colic in pregnant or female <35 |
| **us_renal** | **usr_p3_1** | **male only** | Microscopic haematuria — male, >50, smoker |
| **us_renal** | **usr_p4_1** | **male only** | Microscopic haematuria — male, <50 |
| **us_renal** | **usr_p4_2** | **female only** | Microscopic haematuria — female, any age |
| us_renal | usr_p3_4 | men only | UTI in men |
| us_renal | usr_p3_5 | women only | UTI in women |
| us_renal | usr_p3_6 | men only | Urinary incontinence in men |

**HIGH RISK items — the haematuria trio (usr_p3_1, usr_p4_1, usr_p4_2) are mutually exclusive by gender but appear as separate items in the same criteria list.** The v2.0.0 system prompt's "identify ALL pathways" step causes the AI to assess a female patient against all three, then list the male criteria as "missing" — which is incorrect. This caused the CR-003 regression. Fix: update system prompt to explicitly exclude gender-inapplicable criteria from assessment and from missing_criteria.

Other gender-exclusive pairs (UTI in men/women, urinary incontinence in men) carry the same risk and should be covered by the same prompt fix.

---

## 4. Item count reconciliation

| Layer | Adult sites | Adult items | Paed sites | Paed items | Total |
|-------|-------------|-------------|------------|------------|-------|
| D1 (criteria table) | 31 | varies* | 22 | varies* | 53 rows |
| SITE_INDEX (match-data) | 25 | 247 | 14 | 89 | 336 items |

*D1 stores JSON per site/exam row; item counts must be parsed from JSON

**Drop between D1 and SITE_INDEX:** 6 adult + 8 paed = 14 exam sites present in D1 but absent from SITE_INDEX. These sites' criteria are not available to the Triage Advisor. This is a known coverage gap, not a recent regression.

**No item count drop within SITE_INDEX:** All 336 items are confirmed present and have non-null labels. No truncated or empty criteria items detected.

---

## 5. Recommended actions

**Immediate (blocking the 4 test case regressions):**
1. Fix test script paediatric detection — RP-005, CR-002 (test harness bug)
2. Fix v2.0.0 prompt to exclude gender-inapplicable criteria — CR-003 (prompt reasoning bug)
3. Flag LP-004 for Gary to verify IUD malposition criterion against PDF p46

**Short-term (coverage gaps):**
4. Add missing SITE_INDEX entries for us_pelvis_paed and ct_head_paed — highest clinical priority among the 14 missing entries
5. Consider adding us_fna_biopsy to SITE_INDEX (all items are specialist-endorsed, so simple)
6. Evaluate whether the 4 adult XR limb sites (femur, forearm, humerus, tibia/fibula) need SITE_INDEX coverage or can be deferred to adjacent sites

**Data governance:**
7. The SITE_INDEX is stored in KV as `criteria:match-data` and was loaded manually/separately from D1. The `transformToMatchFormat()` function in `worker.ts` (line 690) is a stub that returns empty data. If criteria are ever republished through the admin tool, match-data will be wiped. A proper `transformToMatchFormat()` implementation is needed before any admin publish workflow is used.
