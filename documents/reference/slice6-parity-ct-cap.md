# ARCH-MIG-01 slice 6 — CT CAP parity: bundle-rendered vs legacy JSON

**Date:** 2026-09-07 · **Branch:** `feature/arch-mig-slice6-viewer`

No headless browser was available in the session (`npx playwright` would have had
to download a browser — the brief forbids installing one). This is the DOM-dump
fallback the brief allows: the **rendered visible text** of CT CAP from its
published bundle (`shared/criteria-render.js` on `ct-chest-abdomen-pelvis-adult`
v2.2.0, referrer / "By indication"), beside the pre-migration Viewer's render of
the same site, with the differences classified.

The renderer output is exercised by `public/crr-criteria/api/test/criteria-render.test.ts`
(17 cases), including the "every displayed string traces to a bundle artefact"
word-level check — the same contract `advisory-render.js` holds.

## Bundle-rendered CT CAP — visible text (referrer, By indication, no region)

```
CT Chest, Abdomen and Pelvis - Adult
page 10-11
Guidance
This Radiology pathway is intended to cover the scenario where patients present with nonspecific symptoms, and the primary care practitioner suspects underlying primary or secondary malignancy in the abdomen or pelvis, no cause or localising features (or mass for tissue sampling) are evident on examination or initial investigations including CXR and blood tests, and there is no clear referral pathway available.
The use of CT Chest, Abdomen and Pelvis should be reserved for patients where after initial investigations and review, the primary care practitioner remains strongly suspicious of underlying malignancy. The presence of two or more persistently abnormal blood test results (Hb, CRP, Ca, ALP) significantly increases the probability of cancer being diagnosed.
For clinical presentations with other non-specific symptoms and signs and abnormal lab results where the primary care practitioner is strongly suspicious of underlying malignancy but not meeting either of these criteria below; discussion with Primary Care Radiology Liaison or secondary care specialist or radiologist for consideration of CT imaging is recommended.
page 10
Local HealthPathways
Urgent: non-deferrable imaging or intervention that must be completed within 2 weeks of receiving referral
page 10
Consider direct referral for CT chest, Abdomen and Pelvis if:
Suspected occult malignancy
Following full clinical assessment and examination and initial investigations (bloods, urinalysis and CX-RAY), the primary care practitioner has a strong suspicion of underlying malignancy but no focal pathology or localising signs/symptoms or potential biopsy site has been identified   MANDATORY   page 10
All of the following:
  Initial investigations: bloods
  Initial investigations: urinalysis
  Initial investigations: chest X-ray
  Strong suspicion of underlying malignancy
  No focal pathology, localising signs/symptoms or potential biopsy site identified
Male over 50 years of age or female over 60 years, and there is unintentional, unexplained, documented weight loss of more than 5 % of usual body weight over 3-6 months (+/- yellow flag symptoms of abdominal pain, fatigue, nausea)   page 10
Male over 40 years of age or female over 50 years of age, ... AND two or more of following abnormal lab test results ... raised CRP, low haemoglobin raised calcium, high platelet count, high alkaline phosphatase, low albumin.   LAB VALUE REQUIRED   page 11
  All of the following:
  Documented unintentional weight loss > 5% over 3-6 months   page 11
  Two or more abnormal lab results, unexplained and persistent on repeat testing after three weeks   page 11
    One or more of the following:
    Raised CRP / Low haemoglobin / Raised calcium / High platelet count / High alkaline phosphatase / Low albumin
Specialist-endorsed referral
Secondary care clinician or Primary Care Radiology Liaison (PCRL) or radiologist advises referral for urgent CT Chest, Abdomen and Pelvis.   GATEWAY   page 11
  Notes
  If the referral was discussed with and endorsed by any secondary care clinician, radiologist, or primary care radiology liaison, always include the name and role of that person in the referral.
Alternative management / redirect
  Patient has a current cancer diagnosis and under continued follow up.   page 11
  Patient has been investigated by secondary care within the last 12 months for the same symptoms/ signs - request follow-up review.   page 11
  Presentation requiring urgent admission or urgent secondary care assessment.   page 11
  Localising clinical features or results from preliminary investigations which suggest cancer in a specific system.   page 11
  Recent ultrasound of abdomen & pelvis within the last three months - Seek advice from a radiologist, or other appropriate secondary care specialist.   page 11
  CT Chest, Abdomen & Pelvis within the last 12 months - seek advice from a radiologist, or other appropriate secondary care specialist.   page 11
Not routinely funded
Community-referred radiology not routinely funded by Health New Zealand in these clinical scenarios. Imaging may still be appropriate, and the patient may wish to consider privately funding imaging.
  Patient is unfit for treatment or unwilling to have further investigations and / or treatment.   page 11
```

`?region=te-waipounamu` additionally renders, verbatim from the overlay:
`Regional delivery — EXAMPLE: PCRL advice line …` under B3, `Regional delivery —
EXAMPLE: Submit via ERMS …` under the P2 block, `Regional delivery — EXAMPLE: Use
the ERMS 'Radiology advice' request type …` under the redirects.

Triager view is identical except the timeframe row reads
`P2 Urgent: non-deferrable imaging … within 2 weeks` with a `P2` badge.

## Legacy Viewer render of CT CAP (pre-migration, "By indication")

```
(exam title) — Chest/Abdomen/Pelvis                      [no page ref]
Guidance box: inlineGuidance ("Reserve for patients where …")   [+ "More detail" → guidanceNarrative]
GROUP  P2 — Urgent, within 2 weeks     (theme: Suspected occult malignancy)
  [ ] Male >50 or female >60 with strong suspicion of malignancy, no focal pathology, AND unintentional unexplained weight loss >5% over 3–6 months (+/- abdominal pain, fatigue, nausea)
  [ ] Male >40 or female >50 with strong suspicion of malignancy, no focal pathology, AND weight loss >5% over 3–6 months AND 2+ of: raised CRP, low Hb, raised Ca, high platelets, high ALP, low albumin — persistent on repeat after 3 weeks
  [ ] Secondary care clinician, PCRL or radiologist advises referral for urgent CT Chest, Abdomen and Pelvis      (theme: Specialist-endorsed referral)
Alternative management / redirect  (one prose blob)
  "Not indicated where: patient has a current cancer diagnosis …; investigated by secondary care within 12 months …; presentation requires urgent admission …; localising clinical features …; recent USS within 3 months …; CT CAP within 12 months …"
Not routinely funded (one prose line)
  "Patient is unfit for treatment or unwilling to have further investigations and/or treatment."
```

## Difference classification

| Difference | Kind | Notes |
|---|---|---|
| Source line "CT Chest, Abdomen and Pelvis - Adult · page 10-11" heads the panel | **intended** (AD-01, CV-026) | legacy has no page reference on the panel |
| `page 10` / `page 11` on every criterion row and every redirect | **intended** (CV-026, KI-20) | from `source-page` |
| `MANDATORY` / `GATEWAY` / `LAB VALUE REQUIRED` badges | **intended** (CV-014, gap §2) | from action `code`s, verbatim; legacy inferred these by keyword |
| Compound structure shown as "All of the following:" / "One or more of the following:" with the 5 initial-investigation leaves and the 6 lab leaves as their own rows | **intended** (CV-014) | legacy flattened criterion A + criterion B into one sentence per checkbox |
| Redirects rendered as 6 individual rows each with `page 11` | **intended** (gap §2 — "redirects become evaluable, not just text") | legacy was one prose paragraph |
| Guidance shows the full published narrative inline + a HealthPathways link | **intended** (CV-012, CV-017) | legacy showed a shorter `inlineGuidance` with `guidanceNarrative` behind "More detail" |
| Wording is the April 2026 PDF verbatim ("Male over 50 years of age or female over 60 years, and there is unintentional, unexplained, documented weight loss of more than 5 %…") | **content freshness**, not a rendering change | the March `EMBEDDED_DATA` snapshot carried summarised labels ("Male >50 or female >60 …"); the bundle is the transcription of the current source |
| B1 / B3 are **not** single checkboxes | **transcription-template finding** — see below | the bundle models B1 as 4 heterogeneous inputs and B3 as 2; there is nothing sound for one tick to set |
| Theme headings "Suspected occult malignancy" / "Specialist-endorsed referral" | **unchanged** | same two themes, same order; source moved from `INDICATION_THEME_MAP` (page code) to the `indication-theme` extension (bundle) |
| Not-funded row not tickable | **unchanged** (GEN-005) | |
| `checkSafetyText()` red banner | **removed on this path** (KI-51) | not carried into the bundle render; the national red-flag library is the safety layer |

## All other sites unchanged

The bundle path is entered **only** when `/crr-api/api/criteria/:id` returns a
`published` bundle (`window.crrBundleFor(id)` truthy). Only
`ct-chest-abdomen-pelvis-adult` is published, mapped from `ct_cap`. Every other
exam/site id resolves to no bundle, so `toolRenderSitePanel` /
`toolRenderSinglesite` / their passive twins fall straight through to the
unchanged legacy JSON render. `criteria-render.js` and the interception guards
add no code to that path. No site-by-site render diff was run (no browser); the
guard is the structural guarantee.

## Transcription-template findings (report, do not work around)

1. **B1 / B3 cannot be a single Viewer tick.** CT CAP's PlanDefinition models B1
   (`Pathway B1: Age Threshold With Weight Loss`) as one action with four
   heterogeneous inputs — `patient.age`, `patient.sex`, `weightloss.percent`,
   `weightloss.periodMonths` — and B3 as `advice.urgentCTRecommended` +
   `advice.adviserNameRole`. The pre-migration Viewer had each as one checkbox.
   A single tick cannot produce a valid QuestionnaireResponse for a mix of an
   integer, a coding and two decimals, and the bundle carries no structure
   telling a renderer how to collect them. `criteria-render.js` renders B1 / B3
   as plain criterion rows (published wording, no checkbox) and makes the leaf
   boolean indicators (criterion A's 5, the 6 labs) the tickable rows.
   **Template fix:** the transcription protocol should either (a) split a
   compound pathway leaf into per-indicator sub-actions with their own inputs, or
   (b) establish a `criteria-render` convention (e.g. a `compound-input` marker)
   for "the referrer confirms this whole statement" that maps one confirmation
   onto a set of `documented`/attested answers. Recorded for the transcribe brief
   template.

2. **The overlay region model does not map onto the legacy Viewer's regions.**
   `regions.json` / the CT CAP overlay use `northern` / `te-manawa-taki` /
   `central` / `te-waipounamu`; the Viewer's `REGIONS` map uses
   `aucklandregion` / `northland` / `midland` / … keyed to CHP domains. The
   bundle path applies an overlay only when `?region=` matches an overlay region
   code exactly, and its HealthPathways domains are `TBC` placeholders. The two
   region vocabularies need reconciling before regional overlays are real (a
   governance / data item, not a slice 6 code fix).
