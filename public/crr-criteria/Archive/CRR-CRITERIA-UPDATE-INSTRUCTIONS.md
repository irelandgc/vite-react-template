# CRR Criteria Database Update — April 2026 Release

## Context

The National Primary Care Referral Criteria for Imaging has been updated (April 2026, Version 2.0, published 09/04/2026). The current database was built from the Phase 1 release (September 2025). This document provides instructions for updating the criteria JSON to reflect the April 2026 changes.

## Source Document

`National_Primary_Care_Referral_Criteria_for_Imaging.pdf` — this is the April 2026 release (105 pages, Version 2.0).

## CRITICAL: Do NOT Change the Scan Type Structure

The April 2026 criteria PDF has restructured its X-ray MSK sections — combining what were previously separate body-part sections into two grouped sections:

- Old (Phase 1): Separate sections for X-ray Shoulder, X-ray Elbow, X-ray Knee, X-ray Ankle/Foot, X-ray Wrist/Hand, X-ray Pelvis/Hip
- New (April 2026): Combined into "X-ray Shoulder and Upper Limb (Humerus, Elbow, Forearm, Wrist/Hand)" and "X-ray Pelvis/Hip and Lower Limb (Femur, Knee, Tibia/Fibula, Foot/Ankle)"

**This is a criteria DOCUMENT restructure, NOT a scan type restructure.**

The referral forms (BPAC, HealthLink, ERMS) still use individual body-part scan types. The RIS, triage workflow, and HL7 integration all depend on body-part-level granularity. The combined sections in the PDF still contain body-part-specific criteria within them (e.g. "X-ray Shoulder:", "X-ray Elbow:", "X-ray knee:", "X-ray foot/ankle:" sub-headings).

**You MUST preserve the existing individual scan type keys in the JSON:**

```
X-ray > Adult:
  - "X-ray Abdomen"
  - "X-ray Ankle / Foot"
  - "X-ray Chest"
  - "X-ray Elbow"
  - "X-ray Knee"
  - "X-ray Pelvis / Hip"
  - "X-ray Shoulder"
  - "X-ray Spine"
  - "X-ray Wrist / Hand"

X-ray > Paediatric:
  - "X-ray Abdomen"
  - "X-ray Chest"
  - "X-ray Elbow"
  - "X-ray Feet"
  - "X-ray Knee"
  - "X-ray Pelvis/Hip"
  - "X-ray Shoulder"
  - "X-ray Spine"
  - "X-ray Wrist and Hands"
```

**Do NOT merge these into "X-ray Upper Limb" or "X-ray Lower Limb" to match the PDF's new section grouping.**

When reading the combined PDF sections, map the criteria back to the correct individual scan type based on the body-part sub-headings within those sections. Where a criterion applies generically across all upper or lower limb body parts (e.g. "Pain with red flags" with history of malignancy), duplicate it into each relevant individual scan type.

## New Scan Types to Add

The April 2026 criteria now covers long bones that were previously not included. The referral platforms already support these body parts as separate selections:

- **HealthLink** has the two-tier Upper Limb / Lower Limb structure with Humerus, Forearm, Femur, Tibia/Fibula, Clavicle, Finger, Toes etc. as separate Location sub-options
- **ERMS** has X-Ray Femur, X-Ray Upper Arms / Forearms, X-Ray Tibia / Fibula, X-Ray Hand, X-Ray Hip (separate from Pelvis) as individual scan types
- **BPAC Compass** does not have these individually — it uses joint-based types (Ankle/Foot, Elbow, Knee, Pelvis/Hip, Shoulder, Wrist/Hand) plus "Other"
- **TMT BPAC** also uses joint-based anatomical site checkboxes plus "Other", with Paediatric Upper Limb and Paediatric Lower Limb options

**Add the following new top-level scan type keys under X-ray > Adult:**

```
- "X-ray Humerus"          — new, criteria from the upper limb combined section
- "X-ray Forearm"          — new, criteria from the upper limb combined section
- "X-ray Femur"            — new, criteria from the lower limb combined section
- "X-ray Tibia / Fibula"   — new, criteria from the lower limb combined section
```

**And under X-ray > Paediatric** (same logic):
```
- "X-ray Humerus"          — new
- "X-ray Forearm"          — new
- "X-ray Femur"            — new
- "X-ray Tibia / Fibula"   — new
```

For each new long bone scan type, populate criteria from the combined PDF sections. The generic criteria that apply to "all upper limb body parts" or "all lower limb body parts" (e.g. pain with cancer history, suspected osteomyelitis, undiagnosed pain >4 weeks atypical for OA) should be duplicated into each of these new scan types as well as the existing joint-based types.

**ALSO add** (ERMS already has these as separate entries — currently our database has them combined):
- "X-ray Hand" — separate from "X-ray Wrist / Hand" if the data model supports it, OR keep combined as "X-ray Wrist / Hand" and note that it covers both
- "X-ray Hip" vs "X-ray Pelvis" — ERMS separates these; keep as "X-ray Pelvis / Hip" in our database for now but note the ERMS distinction

The total adult X-ray scan type count should increase from 9 to 13 (adding Humerus, Forearm, Femur, Tibia/Fibula).

## Summary of Changes to Apply

### Adult X-ray

#### X-ray Abdomen
- **Add** new criterion: Persistent lower UTI or pyelonephritis with bacteria confirmed on MSU despite appropriate antibiotics — consider renal tract stone colonisation, request KUB X-ray and pre/post void renal US. (Aligns with Renal US criteria.)

#### X-ray Chest
- **Add** new accepted criterion: Drug-induced lung disease — new symptoms while taking amiodarone, methotrexate, nitrofurantoin (priority: urgent, within 2 weeks)
- **Add** new criterion: DVT or PE which is idiopathic/unprovoked, underlying malignancy needs exclusion (urgent, within 2 weeks)
- **Add** new criterion: PMR — CXR for all patients prior to starting steroids to exclude alternative cause (urgent, within 2 weeks). Also consider other targeted imaging if specific concerns about underlying malignancy
- **Add** to not-funded: Routine monitoring for asymptomatic patients taking medications which may cause drug-induced lung disease

#### X-ray Shoulder (and Upper Limb body parts)
- **Add** new P2 criterion: Pain in a person with a history of cancer known to metastasize to bone (urgent, within 2 weeks) — apply to ALL upper limb scan types
- **Add** new Critical/Acute criterion: Suspected osteomyelitis — seek advice from appropriate secondary care specialist — apply to ALL upper limb scan types
- **Update** description to note long bone coverage (humerus, forearm)
- Criteria within the combined section that are body-part-specific:
  - "X-ray Shoulder:" criteria → map to "X-ray Shoulder"
  - "X-ray Shoulder only:" criteria → map to "X-ray Shoulder"
  - "X-ray Elbow:" criteria → map to "X-ray Elbow"
  - "Wrist / Hand:" criteria → map to "X-ray Wrist / Hand"
  - Generic upper limb criteria (e.g. "All upper limb body parts") → duplicate across Shoulder, Elbow, Wrist/Hand

#### X-ray Pelvis/Hip and Lower Limb body parts
- **Add** new P2 criterion: Pain in a person with a history of cancer known to metastasize to bone (urgent, within 2 weeks) — apply to ALL lower limb scan types
- **Add** new Critical/Acute criterion: Suspected osteomyelitis — seek advice from appropriate secondary care specialist — apply to ALL lower limb scan types  
- **Update** descriptions to note long bone coverage
- Criteria within the combined section that are body-part-specific:
  - "X-ray Pelvis / Hip:" criteria → map to "X-ray Pelvis / Hip"
  - "X-ray knee:" criteria → map to "X-ray Knee"
  - "X-ray foot/ankle:" criteria → map to "X-ray Ankle / Foot"
  - Generic lower limb criteria → duplicate across Pelvis/Hip, Knee, Ankle/Foot

#### X-ray Spine
- **Move** Scoliosis advice to alternative management — follow local scoliosis pathway, Ortho will request any imaging needed (aligns with new secondary care guidelines)

### Adult Ultrasound

#### US Abdomen
- **Add** Painful jaundice as a critical/acute criterion — request acute assessment by relevant specialty
- **Rewrite** Abnormal LFT criteria for clarity (compare old vs new text)
- **Add** Hepatitis Foundation can now request US for HCC Surveillance

#### US Carotid
- **Add** requirement: "does not have any high risk indicators or other features that may indicate an underlying dissection" to the acceptance requirements list

#### US DVT
- No changes

#### US Guided FNA
- No criteria changes. **Add** note: Not all regions have direct access via Radiology — check local HealthPathways

#### US MSK
- **Add** "Bakers Cyst / Knee Cyst" to the Not Publicly Funded section

#### US Neck / Thyroid
- **Update** Neck mass criteria to: Undifferentiated, solitary, non-pulsatile neck mass meeting ALL of: present >3 weeks, >1cm diameter, no obvious cause identified — mark as urgent (within 2 weeks)

#### US Pelvis
- **Update** Abortion criteria to also cover miscarriage occurring outside the two-week post-miscarriage maternity-funded scan window
- **Simplify** Ovarian Cancer criteria — now has both urgent and routine criteria

#### US Renal
- **Remove** from community imaging (redirect to acute secondary care):
  - Pyelonephritis not responding to antibiotics with abscess concerns, or flank pain not improving
  - Acute renal function deterioration / Acute Kidney Injury — manage per local AKI pathway
- **Update** Renal colic: pregnant or <35y with no red flags → renal US within 48h (was 24h)
- **Update** Microscopic haematuria — new renal US criteria covering males and females of different age ranges and smoking status with different timeframes (refer to full pathway in PDF)
- **Update** UTI criteria now also apply to patients presenting with pyelonephritis

### Adult CT

#### CT Head
- **Update** High Risk Factors for TIA Drop Box to: <59 years old; ABCD2 >4; Crescendo TIAs; Atrial fibrillation; On anticoagulants; Severe or prolonged deficit (hemiparesis >60 minutes); Known carotid artery stenosis

#### CT KUB
- **Update** Follow-up imaging for known renal stone → now "as recommended" by local Renal Colic HealthPathway
- **Update** Alternative management: acute renal US timeframe → within 48h for females <35 with no red flags, or pregnant patients
- **Add** for pregnant patients: "consider seeking obstetric advice, as acute assessment may be indicated"

#### CT Other
- **Add** explicit mention: CT Abdo/Pelvis (CT AP) MUST be requested under CT Other scan type — cannot use CT Chest or CT CAP referral
- **Add** Alternative management section listing scan types that cannot be requested via CRR even if endorsed by secondary care: CT Cardiac, CT Spine, CT Biopsy, CT lower limb angiography, CT Joints

#### CT Chest / CT CAP / CT Colonography / CT IVU / CT Sinus
- No changes

### Paediatric X-ray

#### X-ray Chest
- **Add** Asthma criterion: to help assess for alternative diagnoses or co-morbidities if unclear diagnosis and considering secondary care referral

#### MSK X-ray (Shoulder, Elbow, Knee, etc.)
- **Add** new Critical criterion: Suspected osteomyelitis — seek advice from appropriate secondary care specialist — apply to ALL paediatric MSK X-ray scan types

#### Hip Imaging
- **Update** DDH Risk factors to: Breech presentation at any time in 3rd trimester; Strong family history (especially parent/sibling); Intrauterine packaging problems (oligohydramnios, bicornuate uterus, birth weight ≥4000g, club foot, metatarsus adductus, torticollis, dislocated knee)
- **Update** DDH Soft Signs to: Asymmetric thigh/buttock creases; Clicky hips; Slight differences in limb lengths difficult to detect on repeat examination

### Paediatric Ultrasound
- No changes across all types

### Paediatric CT

#### CT Head
- **Add** restriction: Paediatric CT head can only be recommended by a Paediatrician or Paediatric Radiologist

## Validation Checklist

After applying updates, verify:

1. **Scan type count increased:** Adult X-ray should now have 13 individual scan types (the original 9 plus Humerus, Forearm, Femur, Tibia/Fibula). Do NOT reduce to 5 by merging to match the PDF layout.
2. **Paediatric X-ray scan types expanded:** Should still have individual body-part entries, not merged upper/lower limb. Add new long bone types here too.
3. **No orphaned criteria:** Every criterion from the PDF's combined sections should be mapped to at least one individual scan type.
4. **Cross-applied criteria:** Where the PDF lists a criterion generically for "all upper limb" or "all lower limb", confirm it appears in each relevant individual scan type.
5. **New criteria IDs:** Use the existing ID convention (e.g. `xr-shoulder-N`, `xr-elbow-N`).
6. **Version metadata:** Update any version fields to reflect "2.0" and publication date "09/04/2026".
7. **Priority codes:** Use existing convention — acute, P2, P3, P4, not-funded, alternative-management.

---

## Also Update: Embedded Data in the CRR Criteria Viewer HTML

The CRR Criteria Viewer HTML file (`crr-criteria-viewer-v5_2_1.html`) contains a full embedded copy of the criteria data as a JavaScript object (`EMBEDDED_DATA`) and pre-built copy text for each exam/site combination (`COPY_TEXTS`). This embedded data is the offline fallback when the Cloudflare Workers API is unreachable.

After updating the API database, **also update the HTML file**:

1. **`EMBEDDED_DATA`** — regenerate the entire JSON object to match the updated API data. This is the large object near the top of the `<script>` block.
2. **`COPY_TEXTS`** — regenerate all the shorthand copy text entries for each exam/site combination. These are keyed as `"examId|siteId"` and contain pre-formatted plain text summaries of all criteria for that exam/site.
3. **Update the version metadata** inside `EMBEDDED_DATA.version` to reflect the April 2026 release (version 2.0, date 2026-04-09, criteriaSource updated).

## Also Update: PDF Page Number References

The paediatric exam site entries in the database include `page` fields referencing specific pages in the Phase 1 PDF (e.g. `"page":83` for US Abdomen Paediatric, `"page":85` for US Hip Paediatric, etc.).

The April 2026 PDF is 105 pages (was 107) and content has shifted. **Update all `page` fields** to match the correct page numbers in the new PDF (`National_Primary_Care_Referral_Criteria_for_Imaging.pdf`, Version 2.0, published 09/04/2026).

Check both adult and paediatric exam entries for any `page` fields that need updating.
