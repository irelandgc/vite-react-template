# CRR Criteria Data Load & Viewer Fix — Claude Code Instructions

## Context

The new `pdf-criteria-all.json` has been reviewed and approved for loading, subject to the
fixes listed below. Complete all pre-load fixes first, then do the wipe-and-reload, then
apply the post-load viewer fixes.

---

## PART 1 — Pre-load fixes to pdf-criteria-all.json

### 1.1 — Fix duplicate item IDs between adult and paediatric exams

Adult and paediatric sites share item ID prefixes, causing 61 collisions. Before loading,
rename all item IDs in `paedExams` by appending `_p` to each item ID.

For example:
- `xrkn_p2_1` in `xr_paed/xr_knee_paed` becomes `xrkn_p2_1_p`
- `xrch_em_1` in `xr_paed/xr_chest_paed` becomes `xrch_em_1_p`
- `xrel_em_1` in `xr_paed/xr_elbow_paed` becomes `xrel_em_1_p`

Apply this to ALL items in ALL paedExams sites. Adult exam item IDs are unchanged.

### 1.2 — Normalise five non-standard group titles

These five group titles will break `getPriorityShortFromGroup` and `groupClass` in the
viewer because they don't match the expected prefix patterns. Normalise them:

| Site | Current title | Normalise to |
|---|---|---|
| ct/ct_chest | `P3: non-deferrable, imaging or intervention...` | `P3 non-deferrable imaging or intervention that must be completed within 6 weeks of receiving referral.` |
| us/us_msk | `P3-P4 Ranges from non-deferrable imaging that must be completed within 6 weeks to deferrable, within 6-12 weeks` | `P3-P4 Deferrable to non-deferrable, within 6-12 weeks` |
| xr/xr_chest | `P3 Non-deferrable imaging or intervention...` | `P3 non-deferrable imaging or intervention that must be completed within 6 weeks of receiving referral.` (lowercase N) |
| us_paed/us_hip_paed | `P3 Urgent: Non-deferrable...` | `P3 non-deferrable imaging or intervention that must be completed within 6 weeks of receiving referral.` |
| us_paed/us_soft_tissue_paed | `P2 non-deferrable imaging or intervention...` | `P2 Urgent: Non-deferrable imaging or intervention that must be completed within 2 weeks of receiving referral.` |

### 1.3 — Check CT CAP for duplicate P2 items

CT CAP has two items both beginning with "Consider direct referral for CT chest, Abdomen
and Pelvis if: Following full clinical assessment..." — check whether these are genuinely
distinct criteria from the PDF or an extraction duplication. If they are duplicates, remove
one. If they are distinct (different AND conditions), ensure the label text is sufficiently
different to distinguish them.

---

## PART 2 — Database wipe-and-reload

### 2.1 — Export regionalisation data first

Before touching the database, export the current regionalisation data to
`regionalisation-current.json`. This covers:
- Default HealthPathways URLs per site (28 entries)
- Region overrides (86 overrides across 6 regions)

This is the ONLY data from the current database that is being preserved.

### 2.2 — Wipe all current criteria records

Delete all existing criteria records from the database. This includes all adult exam/site
records and all paediatric records, including all the duplicate `imp_` groups.

### 2.3 — Load from pdf-criteria-all.json

Load all records from the fixed `pdf-criteria-all.json` (after the Part 1 fixes above).
The JSON has a `paedExams` top-level key alongside `exams` — ensure both are loaded.

New paed exam IDs are `ct_paed`, `us_paed`, `xr_paed`. The old IDs were
`us_paed_paed_explorer` / `xr_paed_paed_explorer`. Update any hardcoded references to
the old paed exam IDs in the viewer code (see Part 3).

### 2.4 — Re-apply regionalisation data

After loading, re-apply the HealthPathways URLs and region overrides from
`regionalisation-current.json`. Match by site ID — the site IDs in the new JSON
are consistent with the old data (e.g. `ct_head`, `us_pelvis`, `us_renal`).

### 2.5 — Publish new version

Publish the new data as the live version. Bump the data version to `v4.1.0`.

---

## PART 3 — Viewer code fixes (viewer/index.html)

### 3.1 — Rebuild INDICATION_THEME_MAP for new item IDs

The viewer's `INDICATION_THEME_MAP` is a hand-crafted object mapping item IDs to clinical
indication themes (e.g. `"TIA / stroke"`, `"Haematuria — macroscopic"`). The new JSON
uses different item IDs from the old data. Of the 314 old map entries, only 95 IDs still
match the new data. The remaining 219 old entries are now orphaned, and 236 new item IDs
have no theme assigned.

Build a new `INDICATION_THEME_MAP` for the new item IDs by applying the following rules:

**Rule A — Items whose IDs match both old and new data (95 items):**
Keep the existing theme mapping exactly. These are confirmed correct.

The 95 matching IDs include: `cth_p2_1` through `cth_p4_2`, `ctivu_p2_1` through
`ctivu_p3_3`, `usnt_p2_1` through `usnt_s2_2`, `ussc_48_1` through `ussc_p3_3`,
`ussc_p4_1`, `usst_48_1` and others. Check `INDICATION_THEME_MAP` in the current viewer
for the full list.

**Rule B — Gateway/specialist-endorsed items (any item whose label contains
"Secondary care clinician" OR "Primary Care Radiology Liaison" OR "PCRL" OR
"radiologist advises"):**
Map to `"Specialist-endorsed referral"` for every site.

**Rule C — Site-specific mappings for new IDs (apply by site):**

**ct_head** (`cth_a48_*`):
- `cth_a48_1` → `"TIA / stroke"` (TIA criterion)
- `cth_a48_2` → `"Focal neurological signs"` (focal signs)
- `cth_a48_3` → `"Seizure"` (palliative care seizure)
- `cth_a48_4` → `"Specialist-endorsed referral"`

**ct_cap** (`ctcap_*`):
- `ctcap_p2_1` → `"Suspected occult malignancy"`
- `ctcap_p2_2` → `"Suspected occult malignancy"`
- `ctcap_p2_3` → `"Specialist-endorsed referral"`

**ct_chest** (`ctch_*`):
- `ctch_em_1`, `ctch_em_2` → `"Emergency — refer immediately"`
- `ctch_p2_1` → `"Haemoptysis"`
- `ctch_p2_2` → `"Lung cancer risk"`
- `ctch_p2_3`, `ctch_p2_4` → `"Abnormal CXR / nodule"`
- `ctch_p2_5`, `ctch_p2_6` → `"Specialist-endorsed referral"`
- `ctch_p3_1` → `"Abnormal CXR / nodule"`
- `ctch_p3_2` → `"Specialist-endorsed referral"`

**ct_chest** (remaining `ctch_48_*` — lung cancer symptom items):
All `ctch_48_1` through `ctch_48_16` → `"Lung cancer risk"` except:
- `ctch_48_15` (suspected small pneumothorax) → `"Respiratory symptoms"`
- `ctch_48_16` (secondary care) → `"Specialist-endorsed referral"`
- `ctch_48_13`, `ctch_48_14` (dyspnoea/LRTI) → `"Respiratory symptoms"`
- `ctch_p3_2` through `ctch_p3_6` → use label content to assign: COPD/ILD → `"Chronic respiratory disease"`, cough → `"Respiratory symptoms"`, asbestos → `"Occupational and environmental exposure"`, post-cancer → `"Cancer surveillance and follow-up"`

**ct_chest** (`ctch_24_*`, `ctch_s2_*`):
- `ctch_24_1` → `"Respiratory infection"`
- `ctch_24_2` → `"Respiratory symptoms"`
- `ctch_s2_1` → `"Cancer surveillance and follow-up"`
- `ctch_s2_2`, `ctch_s2_3`, `ctch_s2_4` → `"Cancer surveillance and follow-up"`

**ct_colonography** (all `ctcol_*`):
Use label content to map: rectal bleeding → `"Rectal bleeding"`, anaemia/iron/ferritin → `"Anaemia / blood results"`, family history/Lynch/HNPCC → `"Family history"`, colorectal cancer/CRC/bowel → `"Known or suspected colorectal cancer"` or `"Bowel symptoms"`. Secondary care items → `"Specialist-endorsed referral"`.

**ct_kub** (`ctkub_*`):
- `ctkub_em_1` → `"Complicated stone — refer urgently"`
- `ctkub_a24_1` → `"Complicated stone — refer urgently"` (pyelonephritis with flank pain)
- `ctkub_a48_1` → `"Renal colic"`
- `ctkub_a48_2` → `"Specialist-endorsed referral"`
- `ctkub_s2_1` → `"Stone follow-up"`
- `ctkub_s2_2` → `"Specialist-endorsed referral"`

**ct_other** (`ctoth_*`): All → `"Specialist-endorsed referral"` except `ctoth_p2_2`,
`ctoth_p3_2` → `"Suspected malignancy"`

**ct_sinus** (`ctsin_*`):
- `ctsin_em_1` → `"Red flags — refer urgently"`
- `ctsin_p3_1` → `"Chronic rhinosinusitis"`
- `ctsin_p3_2` → `"Specialist-endorsed referral"`

**us_abdomen** (`usab_*`):
- `usab_em_1`, `usab_em_5`, `usab_48_1`, `usab_48_2`, `usab_p2_1`, `usab_p2_2`,
  `usab_p3_1`, `usab_p3_2`, `usab_p3_3`, `usab_p3_4`, `usab_p3_5` → `"Liver and biliary"`
- `usab_em_2` → `"Acute abdominal emergency"`
- `usab_em_3`, `usab_s3_2`, `usab_p3_6` → `"Aortic aneurysm"`
- `usab_em_4` → `"Acute abdominal emergency"` (testicular torsion — emergency)
- `usab_p3_7` → `"Abdominal mass or organomegaly"`
- `usab_p2_3`, `usab_p3_8` → `"Specialist-endorsed referral"`
- `usab_s3_1`, `usab_s3_3` → `"Cancer surveillance"`

**us_carotid** (`usca_*`):
- `usca_em_1`, `usca_48_1` → `"TIA / stroke risk"`

**us_dvt** (`usdvt_*`):
- `usdvt_24_1` → `"Superficial venous thrombosis"`
- `usdvt_24_2` → `"Suspected upper limb DVT"`
- `usdvt_24_3` → `"Specialist-endorsed referral"`
- `usdvt_48_1` → `"Suspected lower limb DVT"`
- `usdvt_s1_1`, `usdvt_s1_2`, `usdvt_s1_3`, `usdvt_s2_1` → `"DVT follow-up"`

**us_fna_biopsy** (`usfna_*`): All → `"Specialist-endorsed referral"`

**us_msk** (`usmsk_*`): All → `"Specialist-endorsed referral"`

**us_pelvis** (`uspv_*`):
- `uspv_em_1` → `"Acute pelvic pain"`
- `uspv_24_1`, `uspv_24_2`, `uspv_48_1` → `"Acute pelvic pain"`
- `uspv_48_2` → `"Specialist-endorsed referral"`
- `uspv_p2_1` → `"Suspected gynaecological malignancy"`
- `uspv_p2_2`, `uspv_p2_3` → `"Post-menopausal bleeding"`
- `uspv_p2_4`, `uspv_p2_5`, `uspv_p2_6` → `"Abnormal uterine bleeding"`
- `uspv_p2_7` → `"Specialist-endorsed referral"`
- `uspv_p3_1`, `uspv_p3_2`, `uspv_p3_3`, `uspv_p3_4`, `uspv_p3_5` → `"Abnormal uterine bleeding"`
- `uspv_p3_6`, `uspv_p3_7` → `"Ovarian cyst or pelvic mass"`
- `uspv_p3_8` → `"Chronic pelvic conditions"`
- `uspv_p3_9` → `"Chronic pelvic conditions"` (primary amenorrhoea)
- `uspv_p3_10` → `"Chronic pelvic conditions"` (IUD)
- `uspv_p3_11` → `"Chronic pelvic conditions"` (dysmenorrhoea)
- `uspv_p3_12` → `"Specialist-endorsed referral"`
- `uspv_p4_1`, `uspv_p4_2` → `"Chronic pelvic conditions"`
- `uspv_p4_3` → `"Specialist-endorsed referral"`
- `uspv_s2_1`, `uspv_s2_2`, `uspv_s2_3` → `"Ovarian cyst or pelvic mass"`
- `uspv_s2_4` → `"Specialist-endorsed referral"`
- `uspv_s3_1`, `uspv_s3_2`, `uspv_s3_3` → `"Ovarian cyst or pelvic mass"`
- `uspv_s3_4` → `"Specialist-endorsed referral"`

**us_renal** (`usrn_*`):
- `usrn_em_1` → `"Renal colic"` (pyelonephritis emergency)
- `usrn_48_1` → `"Renal colic"`
- `usrn_48_2` → `"Urinary symptoms"` (chronic urinary retention)
- `usrn_48_3` → `"Specialist-endorsed referral"`
- `usrn_p2_1`, `usrn_p2_2` → `"Haematuria — macroscopic"`
- `usrn_p2_3` → `"Specialist-endorsed referral"`
- `usrn_p3_1` → `"Haematuria — microscopic"`
- `usrn_p3_2` → `"CKD / kidney function"`
- `usrn_p3_3` → `"Varicocele"`
- `usrn_p3_4`, `usrn_p3_5` → `"Urinary symptoms"` (UTI in men/women)
- `usrn_p3_6` → `"Urinary symptoms"` (urinary incontinence)
- `usrn_p3_7` → `"Loin pain"`
- `usrn_p3_8` → `"Specialist-endorsed referral"`
- `usrn_p4_1`, `usrn_p4_2`, `usrn_p4_3` → `"Haematuria — microscopic"`
- `usrn_s2_1` → `"Renal colic"` (stone follow-up)

**us_scrotum** (`ussc_*`):
- `ussc_em_1` → `"Acute scrotal emergency"` (torsion)
- `ussc_em_2` → `"Acute scrotal emergency"` (strangulated hernia)
- `ussc_p2_3` → `"Specialist-endorsed referral"`
- `ussc_p4_2` → `"Specialist-endorsed referral"`

**us_soft_tissue** (`usst_*`):
- `usst_48_1` → `"Foreign body"`
- `usst_p2_1`, `usst_p2_2` → `"Suspected sarcoma or malignant lump"`
- `usst_p3_1`, `usst_p3_2` → `"Uncertain lump"`

**xr_abdomen** (`xrab_*`):
- `xrab_em_1` → `"Acute abdomen"`
- `xrab_48_1` → `"Constipation"`
- `xrab_48_2` → `"Specialist-endorsed referral"`
- `xrab_p3_1` → `"Urinary tract / stones"`
- `xrab_p3_2`, `xrab_p3_3` → `"Urinary tract / stones"` (IUD removal)
- `xrab_p3_4` → `"Specialist-endorsed referral"`
- `xrab_s2_1` → `"Urinary tract / stones"` (stone follow-up)
- `xrab_s2_2` → `"Specialist-endorsed referral"`

**xr_chest** (`xrch_*`) — large site, use label content:
- All `em_*` → `"Emergency — refer immediately"`
- `xrch_24_1` → `"Respiratory infection"`
- `xrch_24_2` → `"Respiratory symptoms"`
- `xrch_48_1` through `xrch_48_12`: all concern lung cancer symptoms → `"Lung cancer risk"`
- `xrch_48_13`, `xrch_48_14` (dyspnoea, LRTI) → `"Respiratory symptoms"`
- `xrch_48_15` (small pneumothorax) → `"Respiratory symptoms"`
- `xrch_48_16` → `"Specialist-endorsed referral"`
- `xrch_p2_1` → `"Respiratory infection"` (TB)
- `xrch_p2_2` → `"Medication-related"` (drug-induced lung disease)
- `xrch_p2_3` → `"Cancer surveillance and follow-up"` (DVT/PE)
- `xrch_p2_4` → `"Medication-related"` (PMR/steroids)
- `xrch_p2_5` → `"Specialist-endorsed referral"` (staging CT)
- `xrch_p3_1` → `"Chronic respiratory disease"` (COPD comorbidities)
- `xrch_p3_2` → `"Respiratory symptoms"` (chronic cough)
- `xrch_p3_3` → `"Respiratory symptoms"` (chronic dyspnoea)
- `xrch_p3_4` → `"Chronic respiratory disease"` (unresponsive COPD/ILD)
- `xrch_p3_5` → `"Occupational and environmental exposure"` (asbestos)
- `xrch_p3_6` → `"Specialist-endorsed referral"`
- `xrch_s2_1` → `"Cancer surveillance and follow-up"`
- `xrch_s2_2`, `xrch_s2_3`, `xrch_s2_4` → `"Cancer surveillance and follow-up"`

**xr limb sites** (shoulder, humerus, elbow, forearm, wrist/hand, pelvis/hip, femur,
knee, tibia/fibula, ankle/foot):
For each site, the new items differ from old mainly by having a `_4` or `_5` suffix for
new bony swelling and secondary care items. Apply:
- `*_em_1` → keep as emergency (already excluded from indication view)
- `*_p2_1` (persistent deep pain) → `"Red flag pain — possible malignancy"`
- `*_p2_2` (night pain) → `"Red flag pain — possible malignancy"`
- `*_p2_3` (history of malignancy) → `"Red flag pain — possible malignancy"`
- `*_p2_4` (new bony swelling) — where present → `"Red flag pain — possible malignancy"`
- `*_p2_5` (secondary care urgent) → `"Specialist-endorsed referral"`
- `*_p3_1` (undiagnosed joint pain) → `"Undiagnosed persistent pain"`
- `*_p3_2` (known OA surgical) → `"Osteoarthritis — surgical assessment"`
- `*_p3_3` (previous arthroplasty) → `"Osteoarthritis — surgical assessment"`
- `*_p3_4` (secondary care non-urgent, or inflammatory arthritis) → check label:
  if inflammatory arthritis → `"Inflammatory arthritis"`, else → `"Specialist-endorsed referral"`
- `*_p3_5` → `"Specialist-endorsed referral"`

**xr_spine** (`xrsp_*`):
- `xrsp_em_1` → already emergency (excluded from indication view)
- `xrsp_em_2` → already emergency
- `xrsp_p2_1` (osteoporotic fracture) → `"Suspected fracture"`
- `xrsp_p2_2` (malignant bone disease — history cancer) → `"Red flags for malignancy"`
- `xrsp_p2_3` (malignant bone disease — weight loss) → `"Red flags for malignancy"`
- `xrsp_p2_4` (night pain) → `"Red flags for malignancy"`
- `xrsp_p2_5` (aggravated by lying down) → `"Red flags for malignancy"`
- `xrsp_p2_6` (persistent unrelated to activity) → `"Red flags for malignancy"`
- `xrsp_p2_7` → `"Specialist-endorsed referral"`
- `xrsp_p3_1` (scoliosis) → `"Inflammatory spinal disease"` (check — may suit a
  "Scoliosis" theme if one exists)
- `xrsp_p3_2` (ankylosing spondylitis) → `"Inflammatory spinal disease"`
- `xrsp_p3_3` → `"Specialist-endorsed referral"` (if present)

**Paediatric items:** Paediatric exam items do not need `INDICATION_THEME_MAP` entries
because the indication view (`toolRenderIndicationPanel`) is only called for adult exams.
Paediatric mode uses the urgency view (`toolRenderGroup`). Confirm this in the code before
proceeding — if paediatric exams also call `toolRenderIndicationPanel`, paediatric items
will need theme assignments too.

**Rule D — Any remaining unmapped item:**
Apply `getIndicationTheme()` label-based fallback (already in the code). This catches
anything missed by the explicit map. Review the fallback output for a few sites after
deployment to confirm it's working sensibly.

### 3.2 — Fix P4 urgency label

In `getPriorityShortFromGroup`, the P4 branch currently returns:
```
"Routine (within six weeks)"
```
This is wrong — P4 is deferrable within 6–12 weeks, not six weeks.

Change to:
```
"Routine (within 6–12 weeks)"
```

### 3.3 — Fix false LAB badge on "Suspected chronic urinary retention"

`isLabValue()` is incorrectly flagging the US Renal item "Suspected chronic urinary
retention e.g. new onset incontinence with palpable enlarged bladder" with a LAB badge.
This is a clinical finding, not a lab value.

Diagnose which keyword in `isLabValue()` is matching this label and fix it. Most likely
candidates: "e" in "e.g." triggering `eGFR` match, or "enlarged" containing a matched
substring. Add a specific exclusion or tighten the matching pattern.

### 3.4 — Update paediatric exam ID references

The old paed exam IDs (`us_paed_paed_explorer`, `xr_paed_paed_explorer`) are no longer
used. The new IDs are `ct_paed`, `us_paed`, `xr_paed`. Update any hardcoded references
to the old paed exam IDs in the viewer code, including:
- The `PAED_EXAMS` array or equivalent
- Any `toolSwitch` or exam list building that references paed exam IDs directly
- The paediatric toggle button logic

### 3.5 — Add us_fna_biopsy to INDICATION_THEME_ORDER

`us_fna_biopsy` is a new site in the new JSON that wasn't in the old data. Add it to
`INDICATION_THEME_ORDER`:
```javascript
"us_fna_biopsy": ["Specialist-endorsed referral"]
```

---

## PART 4 — Post-load verification

After loading and applying viewer fixes, verify in the live viewer:

1. **US Renal** — confirm 6 groups (Emergency, Acute 48, P2, P3, P4, S2), no duplicate
   imp_ groups, pyelonephritis in emergency block, renal colic in Acute 48
2. **CT Head** — confirm TIA criterion wording, all 4 footnotes, Acute 48 group correct
3. **US Pelvis** — confirm 8 groups (Emergency, A24, A48, P2, P3, P4, S2, S3)
4. **XR Knee — By indication view** — confirm Haematuria themes don't appear (wrong site),
   items grouped correctly, P4 label shows "Routine (within 6–12 weeks)"
5. **US Renal — By indication view** — confirm Haematuria Macroscopic and Microscopic
   groups show correctly, "Suspected chronic urinary retention" has no LAB badge
6. **Paediatric mode** — toggle to paediatric, confirm criteria load for XR Knee Paed,
   US Pelvis Paed
7. **Region selector** — change region, confirm HealthPathways URLs update correctly
   (confirms regionalisation re-application worked)
