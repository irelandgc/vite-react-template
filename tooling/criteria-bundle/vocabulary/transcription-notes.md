# Vocabulary v1 and national red-flag library — transcription notes

**Brief:** ARCH-MIG-01-S1 (slice 1, session 1 — content) · **Date:** 5 September 2026
**Status:** **NOT CLINICALLY REVIEWED.** First-pass transcription. Slice 1's Done line for this
content is *"vocabulary v1 reviewed by a clinician for grouping"*; that review has not happened.

**Primary source.** `documents/reference/National Primary Care Referral Criteria for Imaging.pdf`
— *National Community Referral Criteria for Imaging (Part I)*, National ID 15372, Version 2.0,
published 09/04/2026, review due 09/04/2028, 105 pages. Page numbers throughout are the
document's own printed page numbers, which match its physical pages (verified: the footer of
physical page 10 reads "Page: 10 of 105").

**Cross-checks only** (differences reported, never resolved by preferring the cross-check):
`documents/reference/pdf-criteria-all.json` (v5.0.0-pdf preview) and
`documents/reference/CURRENT CT Colonography and CT AP community referred criteria final draft
Updated 270826.docx`. The CT AP draft was read **only** to confirm the shared indicators would
cover its needs; CT AP itself is not transcribed here (slice 7).

**Outputs.** `vocabulary/indicators.json` (131 indicators), `cql/CRR_RedFlags.cql` (30 red flags +
the ACC redirect; 79 ELM definitions), `tests/scenarios-redflags.mjs` (46 scenarios, 47 runs).

| group | count | | group | count |
|---|---|---|---|---|
| `patient` | 3 | | `imaging` | 5 |
| `symptom` | 9 | | `advice` | 8 |
| `weightloss` | 4 | | `funding` | 3 |
| `workup` | 5 | | `excl` | 5 |
| `lab` | 23 | | `redflag` | 66 |

`redflag` is the largest group because it holds one boolean per named red flag **and** the
qualifying components of the ten compound flags. All 36 published CT CAP linkIds are present and
byte-identical (checked programmatically against
`fhir/Questionnaire-CRR-CT-CAP-Adult.json`); every `code` is `PLACEHOLDER`; every linkId's prefix
equals its declared `group`; there are no duplicate linkIds.

**A caveat on the `sites` attributions.** They were built by reading the pages, aided by pattern
searches over a `pdftotext -layout` extraction. That extraction interleaves the table's Source
column into the Clinical Presentation text mid-sentence, so pattern searches under-report and a
site list should be read as *"the sites this session verified"*, not *"every site where the concept
occurs"*. This is precisely what the clinical review is for. The verified lists were used
everywhere; where a concept is obviously more widespread than the list (`patient.age`, the three
`advice.*` gateways) the entry says so.

---

## 1. Scope taken

The brief scopes the red-flag library to prompt clause 2 *"and any others the PDF's 'refer for
acute assessment without imaging' rows contain"*. Every such row in the document was located and
transcribed. There are **23 rows across 23 exam/sites**:

| # | Exam/site (as printed) | Page | Top-level bullets |
|---|---|---|---|
| 1 | CT Chest - Adult | p12 | 2 |
| 2 | CT KUB - Adult | p25 | 1 (5 sub-bullets) |
| 3 | CT Sinus - Adult | p28 | 1 (3 sub-bullets) |
| 4 | US Abdomen - Adult | p30 | 5 |
| 5 | US Carotid - Adult | p34 | 1 (2 sub-bullets) |
| 6 | US Pelvis - Adult | p44 | 1 |
| 7 | US Renal - Adult | p52 | 1 (2 sub-bullets) |
| 8 | US Scrotum / Testis | p56 | 2 |
| 9 | X-ray Abdomen - Adult | p60 | 1 |
| 10 | X-ray Chest - Adult | p62 | 4 (one with 4 sub-bullets) |
| 11 | X-ray Shoulder and Upper Limb | p66 | 1 |
| 12 | X-ray –Pelvis/Hip and Lower Limb | p69 | 1 |
| 13 | X-ray Spine - Adult | p72 | 2 (one with 5 sub-bullets) |
| 14 | US Abdomen – Paediatric | p76 | 1 |
| 15 | US Pelvis - Paediatric | p82 | 1 |
| 16 | US Renal - Paediatric | p83 | 2 (one with 3 sub-bullets) |
| 17 | US Scrotum/Testis - Paediatric | p86 | 2 |
| 18 | US Soft Tissue Mass - Paediatric | p87 | 3 |
| 19 | X-ray Abdomen - Paediatric | p91 | 2 (one with 4 sub-bullets) |
| 20 | X-ray Chest-Paediatric | p93 | 1 (4 sub-bullets) |
| 21 | X-ray Shoulder and Upper Limb – Paediatric | p95 | 1 |
| 22 | X-ray Lower Limb – Paediatric | p97 | 1 |
| 23 | X-ray Pelvis/Hip - Paediatric | p99 | 2 |

**Sites with no acute-assessment row** (so nothing enters the national library from them):
CT Chest/Abdomen/Pelvis - Adult, CT Colonography - Adult, **CT Head - Adult**, CT IVU/CT Renal -
Adult, CT Other - Adult, US DVT - Adult, US Guided FNA/Core Biopsy - Adult, US Musculoskeletal -
Adult, US Neck/Thyroid - Adult, US Soft Tissue Mass - Adult, **CT Head - Paediatric**, US Hip -
Paediatric, US Neck/Thyroid - Paediatric, US Spine - Paediatric, X-ray Spine - Paediatric.

After merging concepts that recur across sites (KI-01), the 23 rows produce **30 named red flags**.

---

## 2. Atoms table

Concept → linkId → exam/sites the concept was seen in → page. `†` marks a source that is the CT AP
approved draft (27/08/26) rather than the PDF. This table is what a reviewer checks first.

### patient
| Concept | linkId | Sites seen | Page |
|---|---|---|---|
| Age in years | `patient.age` | CT CAP; CT Head; CT KUB; US Renal; US Pelvis; Overview (age conditions recur far more widely) | p10, p21, p26, p52, p49, p4 |
| Age in months (infant thresholds) | `patient.ageMonths` | US Renal Paed; US Soft Tissue Paed; US Scrotum Paed | p83, p87, p86 |
| Sex | `patient.sex` | CT CAP; CT KUB; US Renal; US Pelvis | p10, p26, p52, p44 |

### weightloss
| Concept | linkId | Sites seen | Page |
|---|---|---|---|
| Unintentional, unexplained weight loss | `weightloss.present` | CT CAP; X-ray Chest; US Pelvis | p10, p63, p49 |
| Loss documented by recorded weights | `weightloss.measured` | CT CAP | p10 |
| Loss as % of usual body weight | `weightloss.percent` | CT CAP | p10 |
| Period of loss, months | `weightloss.periodMonths` | CT CAP | p10 |

### symptom
| Concept | linkId | Sites seen | Page |
|---|---|---|---|
| Abdominal pain | `symptom.abdominalPain` | CT CAP; US Pelvis; US Abdomen Paed | p10, p49, p76 |
| Fatigue | `symptom.fatigue` | CT CAP; US Pelvis | p10, p49 |
| Nausea | `symptom.nausea` | CT CAP; US Scrotum Paed | p10, p86 |
| Persistent/progressive abdominal symptoms | `symptom.persistentAbdominal` | US Pelvis; US Abdomen Paed; CT AP† | p49, p76, draft† |
| Fever (no threshold stated) | `symptom.fever` | X-ray Spine; US Abdomen; US Pelvis | p72, p30, p44 |
| Temperature (°C) | `symptom.temperatureCelsius` | CT KUB; US Renal | p25, p52 |
| Back pain | `symptom.backPain` | X-ray Spine | p72 |
| Haematuria | `symptom.haematuria` | US Renal; US Renal Paed; CT KUB | p52, p83, p25 |
| Jaundice | `symptom.jaundice` | US Abdomen; US Abdomen Paed | p30, p76 |

### workup
| Concept | linkId | Sites seen | Page |
|---|---|---|---|
| Bloods done | `workup.bloods` | CT CAP; CT AP† | p10, draft† |
| Urinalysis done | `workup.urinalysis` | CT CAP | p10 |
| Chest X-ray done | `workup.cxr` | CT CAP; CT Chest; X-ray Chest | p10, p14, p62 |
| Strong suspicion of malignancy | `workup.strongSuspicionMalignancy` | CT CAP; CT Other; CT AP† | p10, p27, draft† |
| Focal pathology / localising features identified | `workup.localisingFeatures` | CT CAP; CT AP† | p10–11, draft† |

### lab
| Concept | linkId | Sites seen | Page |
|---|---|---|---|
| CRP raised / value | `lab.crp.raised`, `lab.crp.value` | CT CAP; CT AP† | p10–11, draft† |
| Haemoglobin low / value | `lab.hb.low`, `lab.hb.value` | CT CAP; CT Colonography; CT AP† | p10–11, p17–18, draft† |
| Calcium raised / value | `lab.calcium.raised`, `lab.calcium.value` | CT CAP; X-ray Chest | p10–11, p63 |
| Platelets high / value | `lab.platelets.high`, `lab.platelets.value` | CT CAP; CT AP† | p11, draft† |
| ALP high / value | `lab.alp.high`, `lab.alp.value` | CT CAP; US Abdomen; CT AP† | p11, p30/33, draft† |
| ALP as multiple of ULN | `lab.alp.timesULN` | US Abdomen | p30 |
| Albumin low / value | `lab.albumin.low`, `lab.albumin.value` | CT CAP | p11 |
| Ferritin low | `lab.ferritin.low` | CT Colonography; US Abdomen | p17–18, p33 |
| Ferritin raised | `lab.ferritin.raised` | US Abdomen | p33 |
| Creatinine raised / value | `lab.creatinine.raised`, `lab.creatinine.value` | CT KUB; US Renal; US Renal Paed | p25–26, p55, p84 |
| eGFR low / value | `lab.egfr.low`, `lab.egfr.value` | CT KUB; US Renal; CT IVU/Renal | p25, p52/55, p23 |
| Urine ACR value | `lab.acr.value` | US Renal; US Renal Paed | p52, p83–84 |
| Pyuria on microscopy | `lab.pyuriaOnMicroscopy` | US Renal | p52 |
| Results persistent on repeat testing | `lab.repeatConfirmed` | CT CAP; US Renal Paed | p11, p83 |
| Results unexplained | `lab.unexplained` | CT CAP; CT Colonography; US Renal | p11, p18, p52 |

### imaging
| Concept | linkId | Sites seen | Page |
|---|---|---|---|
| Confirmed stone on CT KUB within 5 years | `imaging.ctkub.within5y` | CT KUB | p26 |
| Previous CT sinus scan (ever) | `imaging.ctsinus.ever` | CT Sinus | p28 |
| X-ray of affected joint within 6 months | `imaging.xrayAffectedJoint.within6m` | X-ray Shoulder/Upper Limb; X-ray Pelvis-Hip/Lower Limb | p67, p69 |
| Renal ultrasound more than 12 months ago | `imaging.usrenal.moreThan12mAgo` | US Renal Paed | p85 |
| Biliary tree previously imaged | `imaging.biliaryTree.ever` | US Abdomen | p30 |

### advice
| Concept | linkId | Sites seen | Page |
|---|---|---|---|
| Urgent CT CAP advised (CT CAP's published instance) | `advice.urgentCTRecommended` | CT CAP | p11 |
| Urgent imaging advised | `advice.urgentImagingRecommended` | 25 sites | pp.14, 17, 21, 27, 30, 38, 46, 52, 56, 58, 63, 66, 69, 73, 75, 76, 79, 81, 83, 86, 89, 93, 95, 97, 100 |
| Same/next-day (or "acute") imaging advised | `advice.acuteImagingRecommended` | 16 sites | pp.20, 25, 27, 30, 45, 52, 56, 60, 63, 72, 75, 76, 82, 87, 91, 93 |
| Non-urgent imaging advised | `advice.nonUrgentImagingRecommended` | 27 sites | pp.18, 21, 24, 27, 29, 32, 38, 47, 53, 56, 58, 60, 64, 67, 70, 73, 75, 76, 81, 82, 84, 88, 91, 94, 95, 97, 102 |
| Adviser name and role | `advice.adviserNameRole` | Overview | p5 |
| Decision-support tool completed | `advice.decisionSupportToolCompleted` | CT Head; US Carotid | p20, p34 |
| Decision-support tool available | `advice.decisionSupportToolAvailable` | US Carotid | p34 |
| Rapid specialist care accessible | `advice.rapidSpecialistCareAccessible` | CT Head; US Carotid | p20, p34 |

### funding
| Concept | linkId | Sites seen | Page |
|---|---|---|---|
| Unfit or unwilling | `funding.unfitOrUnwilling` | CT CAP | p11 |
| Recent trauma mechanism → ACC | `funding.accTrauma` | Overview; X-ray Spine | p4, p73 |
| Covered by ACC or another funding stream | `funding.accCovered` | Overview; US Soft Tissue; X-ray Abdomen Paed | p4, p58, p92 |

### excl (CT CAP's published redirect set — immutable)
| Concept | linkId | Sites seen | Page |
|---|---|---|---|
| Current cancer under follow up | `excl.currentCancerFollowUp` | CT CAP | p11 |
| Investigated by secondary care within 12 months | `excl.secondaryCareInvestigated12m` | CT CAP; CT AP† | p11, draft† |
| Requires urgent admission / secondary care assessment | `excl.urgentAdmissionRequired` | CT CAP | p11 |
| US abdomen & pelvis within 3 months | `excl.recentUSAbdoPelvis3m` | CT CAP | p11 |
| CT CAP within 12 months | `excl.recentCTCAP12m` | CT CAP | p11 |

### redflag — the 30 named flags and their qualifying components

| RF | Flag | linkId(s) | Sites seen | Page |
|---|---|---|---|---|
| RF-01 | Massive haemoptysis | `redflag.haemoptysisMassive` | CT Chest | p12 |
| RF-02 | Stridor / suspected SVC obstruction | `redflag.stridorOrSvcObstruction` | CT Chest | p12 |
| RF-03 | Renal colic with a red flag | `redflag.renalColicAcuteEpisode` + `redflag.solitaryKidney`, `redflag.peritonitisOrSepsisSigns`, `redflag.knownBilateralUretericStones`, `lab.creatinine.value`, `lab.egfr.value`, `symptom.temperatureCelsius` | CT KUB | p25 |
| RF-04 | Rhinosinusitis with intracranial/orbital red flags | `redflag.rhinosinusitisSymptoms` + `redflag.severeFrontalHeadache`, `redflag.severeSystemicSymptoms`, `redflag.alteredVisualAcuityOrDiplopia` | CT Sinus | p28 |
| RF-05 | Acute cholecystitis or cholangitis | `redflag.cholecystitisOrCholangitis` | US Abdomen | p30 |
| RF-06 | Acute abdomen | `redflag.acuteAbdomen` | US Abdomen; X-ray Abdomen; X-ray Abdomen Paed | p30, p60, p91 |
| RF-07 | Ruptured abdominal aortic aneurysm | `redflag.rupturedAAA` | US Abdomen | p30 |
| RF-08 | Suspected testicular torsion | `redflag.testicularTorsion` | US Abdomen; US Scrotum; US Scrotum Paed | p30, p56, p86 |
| RF-09 | Painful jaundice | `redflag.painfulJaundice` | US Abdomen | p30 |
| RF-10 | Suspected TIA with high risk or dissection | `redflag.suspectedTIA` + `redflag.highSevenDayStrokeRisk`, `redflag.tiaWithNeckPainOrHeadache` | US Carotid | p34 |
| RF-11 | Clinically unstable gynaecologic/pelvic cause | `redflag.clinicallyUnstableGynaePelvicCause` | US Pelvis | p44 |
| RF-12 | Pyelonephritis not responding / persisting | `redflag.pyelonephritisSuspected` + `symptom.temperatureCelsius`, `lab.pyuriaOnMicroscopy`, `redflag.loinPainOrTenderness`, `redflag.notRespondingToAntibiotics72h`, `redflag.flankPainPersistingOnAntibiotics` | US Renal | p52 |
| RF-13 | Strangulated / incarcerated inguinal hernia | `redflag.strangulatedOrIncarceratedInguinalHernia` | US Scrotum; US Scrotum Paed; US Soft Tissue Paed | p56, p86, p87 |
| RF-14 | Haemoptysis with red flags | `redflag.haemoptysisPresent` + `redflag.haemoptysisSignificantVolume`, `redflag.haemodynamicallyUnstable`, `redflag.hoarsenessOrStridorWithHaemoptysis`, `redflag.acuteDyspnoeaOrChestPain` | X-ray Chest | p62 |
| RF-15 | Severe respiratory distress | `redflag.severeRespiratoryDistress` | X-ray Chest | p62 |
| RF-16 | Suspected **large** pneumothorax | `redflag.pneumothoraxLarge` | X-ray Chest | p62 |
| RF-17 | Active TB, acutely unwell | `redflag.activeTbAcutelyUnwell` | X-ray Chest | p62 |
| RF-18 | Suspected septic arthritis | `redflag.septicArthritis` | X-ray Shoulder/Upper Limb; X-ray Pelvis-Hip/Lower Limb; and paed limb sites | p66/67, p69, p95, p97, p99 |
| RF-19 | Suspected spinal infection | `redflag.spinalInfectionSuspected` (+ illustrative `symptom.backPain`, `symptom.fever`, `redflag.recentInfectionHistory`, `redflag.ivDrugUse`, `redflag.immunosuppression`) | X-ray Spine | p72 |
| RF-20 | Suspected cauda equina syndrome | `symptom.backPain` + `redflag.backPainAcuteOnset` + `redflag.sphincterDisturbance`, `redflag.gaitDisturbance`, `redflag.saddleAnaesthesia`, `redflag.bowelOrBladderIncontinence`, `redflag.abnormalReflexesOrLegWeakness` | X-ray Spine | p72 |
| RF-21 | Paediatric acute abdominal pain / pyloric stenosis | `redflag.paedAcuteAbdominalPainOrPyloricStenosis` | US Abdomen Paed | p76 |
| RF-22 | Child acutely unwell, gynaecological cause | `redflag.paedAcutelyUnwellGynaeCause` | US Pelvis Paed | p82 |
| RF-23 | Paediatric UTI requiring acute assessment | `redflag.paedUti` + `patient.ageMonths`, `redflag.paedKnownUrinaryTractAnatomicalAbnormality`, `redflag.paedSeriouslyUnwell` | US Renal Paed | p83 |
| RF-24 | Paediatric haematuria with renal compromise | `symptom.haematuria` + `redflag.hypertension`, `redflag.heavyProteinuria`, `redflag.oedema`, `redflag.impairedRenalFunction` | US Renal Paed | p83 |
| RF-25 | Paediatric abscess needing hospital management | `redflag.paedAbscessSuspected` + `redflag.paedHospitalManagementConsideredNecessary` | US Soft Tissue Paed | p87 |
| RF-26 | Paediatric soft tissue mass, suspicious features | `redflag.paedSoftTissueMassSuspiciousFeatures` | US Soft Tissue Paed | p87 |
| RF-27 | Paediatric high-risk foreign body ingestion | `redflag.paedForeignBodyIngestionHistory` + `redflag.paedFbOesophagealObstruction`, `redflag.paedFbButtonBattery`, `redflag.paedFbMultipleMagnets`, `redflag.paedFbLargeObject` | X-ray Abdomen Paed | p91 |
| RF-28 | Paediatric respiratory compromise | `redflag.paedRespiratoryDistress`, `redflag.paedBreathingDifficultyWithHypoxia`, `redflag.paedAcuteSevereAsthma`, `redflag.paedInhaledForeignBody` | X-ray Chest Paed | p93 |
| RF-29 | Suspected osteomyelitis | `redflag.osteomyelitis` | X-ray Pelvis/Hip Paed | p99 |
| RF-30 | Suspected SUFE | `redflag.sufe` | X-ray Pelvis/Hip Paed | p99 |
| ACC | Recent trauma mechanism → ACC | `funding.accTrauma` | Overview; X-ray Spine | p4, p73 |

---

## 3. Findings

### F-01 — "Thunderclap headache / possible SAH" is in the prompt and nowhere in the PDF

System prompt v2.3.0 STEP 0(a) lists *"Worst-ever / thunderclap / hit-in-head headache → POSSIBLE
SAH → 111/ED"* as the first emergency red flag. The strings "thunderclap", "worst-ever",
"subarachnoid" and "SAH" **do not appear anywhere in the 105-page published document**, and
**CT Head - Adult (pp.20–22) has no "Refer for acute assessment" row at all** — its timeframe rows
are Acute-48h, P2, P4, alternative management and not-funded only.

Per the brief this red flag is **dropped, not fabricated**. It has no indicator and no define.
This is a real behaviour change: today the tool declines such a referral and redirects to ED;
after migration the national library will be silent and the CT Head library will assess the
referral on its printed criteria. Scenario `RF-S38` pins that behaviour so the change is visible
rather than accidental. **This needs a governance decision, not a code decision** — either the
criteria document is amended, or an explicitly-owned national safety overlay is added outside the
transcribed criteria.

### F-02 — The prompt over-triages pneumothorax relative to the PDF

Prompt STEP 0(a) redirects *"Suspected pneumothorax → ED"* unqualified. The published red flag
(X-ray Chest - Adult, p62) is narrower: *"Suspected large pneumothorax with significant pain,
breathlessness, tachycardia"*. The same site lists *"Suspected small pneumothorax"* under
**Acute: Within 48 hours** (p63) — it proceeds to imaging. The published, narrower reading is
encoded; scenario `RF-S36` asserts that a suspected small pneumothorax falls through to the exam
library. REVIEW Q2.

### F-03 — The prompt's haemoptysis threshold comes from a different site than its own citation

Prompt STEP 0(a) says *"Massive haemoptysis (>20ml or haemodynamically unstable)"*. The ">20 ml"
and "haemodynamically unstable" wording is from **X-ray Chest - Adult p62**, not from the CT Chest
p12 row that names "massive haemoptysis". Both are transcribed, as RF-01 and RF-14 respectively,
because the two rows are worded differently and sit at different sites. REVIEW Q6.

### F-04 — Unit discrepancy inside the published document

CT KUB - Adult p25 and its p26 footnote print *"Creatinine greater than 160 **mmol/L**"*.
US Renal - Adult p55 prints *"Creatinine > 160 **micromol/L**"* for what is clearly the same
threshold. 160 mmol/L is not a physiological creatinine. The number is encoded without asserting a
unit and the referral's units are not checked. **A ruling is required before use.** REVIEW Q7.

### F-05 — Two clinically similar rows at one site with no stated way to tell them apart

X-ray Pelvis/Hip - Paediatric p99 lists *"Suspected Slipped Upper Femoral Epiphysis (SUFE)"* under
"Refer for acute assessment without initial imaging" **and** *"Child presenting with non-acute
symptoms where a diagnosis of SUFE is suspected - arrange hip X-ray…"* under "Acute: Within 24
hours". Encoded literally, RF-30 fires on suspected SUFE and will over-fire for the non-acute
presentation. REVIEW Q24.

### F-06 — CT AP cross-check: what the vocabulary does and does not cover

Read against the approved draft (27/08/26) as instructed. Covered by v1: `patient.age`,
`workup.bloods`, `workup.strongSuspicionMalignancy`, `workup.localisingFeatures`,
`symptom.persistentAbdominal`, `lab.crp.raised` ("raised inflammatory markers"), `lab.hb.low`
("unexplained anaemia"), `lab.alp.high` ("cholestatic LFTs"), `lab.platelets.high`
("thrombocytosis"), `lab.unexplained`, `excl.secondaryCareInvestigated12m`,
`advice.urgentImagingRecommended`.

**Not covered — CT AP will need these, and they are deliberately absent from a *national* vocabulary
because each appears at one site only:** LDH raised; clinical frailty score (7–9) and "advanced
frailty"; "limited life expectancy"; "investigation unlikely to change management"; FIT result;
family history of relevant abdominal cancer; known genetic predisposition. These belong in CT AP's
own Questionnaire or in a `vocabulary-additions.json` proposal at slice 7.

**Two wording traps for the CT AP session.** (a) *"persistent or progressive (**typically** greater
than 6 weeks) abdominal symptoms"* — "typically" is modifier wording (KI-05); the 6 weeks must not
silently become a duration threshold (REVIEW Q11). (b) The draft's *"investigated within the last
12 months for the same **presentation**"* is not word-for-word CT CAP's *"investigated **by
secondary care** within the last 12 months for the same **symptoms/signs**"* (REVIEW Q19).

### F-07 — Modifier wording deliberately NOT encoded (KI-05)

| Site / page | Wording | Why not encoded |
|---|---|---|
| US Abdomen p30 | "…and **especially** if accompanied by fever, persistent vomiting" | "especially" — the fever/vomiting are not required for RF-05 |
| X-ray Chest p62 | "Significant (**e.g.**, more than 20ml…) or life threatening (**e.g.**, more than 100 ml/hour)" | "e.g." — volumes are illustrative, not thresholds; no value indicator created |
| X-ray Chest p62 | "Haemoptysis with 'red flags' **including** if…" | "including" — sub-bullet list is non-exhaustive |
| CT Sinus p28 | "…any red flags for intracranial or orbital pathology **including**:" | as above |
| X-ray Spine p72 | "Suspected spinal infection **e.g.** back pain and one or more of…" | "e.g." governs the whole description; RF-19 is the suspicion, features reported not required |
| US Soft Tissue Paed p87 | "…hospital management considered necessary, **especially** if red flags: *1" | "especially" — the four sub-bullets are not conditions |
| US Soft Tissue Paed p87 | "…suspicious features **including** hard, irregular, fixed/deep to fascia…" | "including" — one clinician judgement, not five indicators |
| US Renal p52 | "…loin pain or tenderness, **+/-** lower UTI symptoms and:" | "+/-" — does not affect the logic (the CT CAP yellow-flag pattern) |
| CT CAP p10/p11 | "**+/-** yellow flag symptoms of abdominal pain, fatigue, nausea" | already handled this way in CT CAP; the three symptom indicators are context only |
| CT Head p20 | "…**especially** in patients aged 50 years and older" | KI-05's original finding (RP-000); belongs to the CT Head transcription |

Contrast: X-ray Spine p72 cauda equina uses **"i.e."**, which *defines* the condition, so RF-20's
composition IS the rule.

### F-08 — Site rows that repeat a national red flag

X-ray Shoulder and Upper Limb p67, under "Alternative management or HealthPathway recommended.",
states *"Musculoskeletal x-rays requested through acute demand services - if septic arthritis is
suspected refer for acute assessment without initial imaging"*. US Pelvis p49 footnote *1 states
*"If systemically unstable and/or severe persistent pelvic pain refer for acute assessment without
requesting imaging"*. Per the precedence contract these are transcribed at their site as a
`documentation` cross-reference, **never** as site logic — the national library owns them. The US
Pelvis footnote wording is broader than the p44 row (`severe persistent pelvic pain` is not in the
row); the US Pelvis transcription must raise that.

### F-09 — The PDF's own table of contents is off by one, on every entry

The contents pages (pp.2–3) list "CT Chest, Abdomen and Pelvis - Adult …… 9", "US Abdomen - Adult
…… 29", "X-ray Chest - Adult …… 61". The sections actually begin on printed pages **10, 30 and 62**.
The shift is consistent across all 38 sections. **Any transcription session that takes page
citations from the contents list will cite the wrong page for every site.** Section boundaries were
therefore derived from the document body (each section's title line immediately preceding its
"Referral Criteria and Prioritisation Timeframes" banner). The resulting map is:

`ct-chest-abdomen-pelvis-adult` p10–11 · `ct-chest-adult` p12–16 · `ct-colonography-adult` p17–19 ·
`ct-head-adult` p20–22 · `ct-ivu-renal-adult` p23–24 · `ct-kub-adult` p25–26 · `ct-other-adult` p27 ·
`ct-sinus-adult` p28–29 · `us-abdomen-adult` p30–33 · `us-carotid-adult` p34–35 · `us-dvt-adult`
p36–37 · `us-fna-biopsy-adult` p38 · `us-musculoskeletal-adult` p39–40 · `us-neck-thyroid-adult`
p41–43 · `us-pelvis-adult` p44–51 · `us-renal-adult` p52–55 · `us-scrotum-testis-adult` p56–57 ·
`us-soft-tissue-mass-adult` p58–59 · `xray-abdomen-adult` p60–61 · `xray-chest-adult` p62–65 ·
`xray-shoulder-upper-limb-adult` p66–68 · `xray-pelvis-hip-lower-limb-adult` p69–71 ·
`xray-spine-adult` p72–74 · `ct-head-paediatric` p75 · `us-abdomen-paediatric` p76–77 ·
`us-hip-paediatric` p78–80 · `us-neck-thyroid-paediatric` p81 · `us-pelvis-paediatric` p82 ·
`us-renal-paediatric` p83–85 · `us-scrotum-testis-paediatric` p86 ·
`us-soft-tissue-mass-paediatric` p87–88 · `us-spine-paediatric` p89–90 · `xray-abdomen-paediatric`
p91–92 · `xray-chest-paediatric` p93–94 · `xray-shoulder-upper-limb-paediatric` p95–96 ·
`xray-lower-limb-paediatric` p97–98 · `xray-pelvis-hip-paediatric` p99–101 · `xray-spine-paediatric`
p102–105.

That is **38 exam/site sections**, against the 53 the plan cites (the plan counts the JSON's
exploded limb sites — see D-01 below) and the 36 the CT CAP Questionnaire's siblings imply. The
number of sites to transcribe in slice 7 depends on which of these two structures is adopted; that
is a question for the plan, not for this session.

### F-10 — One proposed indicator withdrawn after checking the page

`advice.specifiedDateImagingRecommended` was drafted for the S2 ("specified target date") timeframe
rows, on the assumption it recurred at CT KUB p25 and X-ray Abdomen p61. Reading p61 shows its S2
advice row actually says *"advises referral for **follow-up** x-ray"*, not a specified date. The
concept is therefore single-site (CT KUB p25 only) and was **removed** from the national
vocabulary; it belongs in CT KUB's own Questionnaire at slice 7.

---

## 4. PDF vs `pdf-criteria-all.json` differences

Reported only. No difference was resolved by preferring the JSON. All 23 acute-assessment rows are
present in the JSON — nothing is missing — but the following structural differences exist.

| # | Difference | Detail |
|---|---|---|
| D-01 | **The JSON explodes two PDF sites into ten.** | The PDF has one site *"X-ray Shoulder and Upper Limb (Humerus, Elbow, Forearm, Wrist/Hand)"* (p66) and one *"X-ray –Pelvis/Hip and Lower Limb (Femur, Knee, Tibia/Fibula, Foot/Ankle)"* (p69). The JSON has `xr_shoulder`, `xr_humerus`, `xr_elbow`, `xr_forearm`, `xr_wrist_hand` and `xr_pelvis_hip`, `xr_femur`, `xr_knee`, `xr_tibia_fibula`, `xr_ankle_foot`, each carrying its own copy of "Suspected septic arthritis". Same again for the paediatric limb sites. This inflates the site count and duplicates one red flag ten times. |
| D-02 | **Compound rows are flattened, with the stem repeated.** | X-ray Chest Adult p62's single "Haemoptysis with red flags" bullet with four sub-bullets becomes four JSON items `xrch_em_1..4`, each beginning "Haemoptysis with 'red flags' including if…". US Renal Paediatric p83's "UTI in a child" with three sub-bullets becomes three items each beginning "UTI in a child". This is KI-21 (compound criteria denormalised in extraction) visible in the acute rows. |
| D-03 | **Sub-bullets collapsed into one label with punctuation.** | CT KUB p25's five sub-bullets become a single run-on `ctkub_em_1`; likewise CT Sinus `ctsin_em_1`, US Carotid `usca_em_1` (semicolon-joined), US Renal Adult `usrn_em_1`, US Soft Tissue Paediatric `usstp_em_2_p`, X-ray Abdomen Paediatric `xrabd_em_1_p`. The connective ("any of the following", "at least one of") survives only as prose. |
| D-04 | **X-ray Chest Paediatric keeps the row header inside the item text.** | `xrch_em_1_p` begins "Refer child for acute assessment without requesting imaging if any of:" — the timeframe label duplicated into the clinical presentation. |
| D-05 | **Paediatric lower-limb site list differs.** | The PDF site is *"X-ray Lower Limb (Femur, Knee, Tibia/Fibula, Foot, Ankle) – Paediatric"* (p97). The JSON has `xr_femur_paed`, `xr_knee_paed`, `xr_tibia_fibula_paed`, `xr_feet_paed` — no ankle site. |
| D-06 | **Row-title punctuation and wording drift.** | "Refer for acute assessment without imaging" (CT Sinus p28, US Abdomen p30) vs "…without initial imaging" elsewhere; trailing full stops present on some JSON titles and not others. Cosmetic, but it means the row title is not a reliable key. |
| D-07 | **Version provenance.** | The JSON declares `v5.0.0-pdf — PDF rebuild (preview, unpublished)`, dated 2026-05-14, and states it was built from the same source (Version 2.0, 09/04/2026). It carries no page numbers (KI-20/KI-25 confirmed). |

---

## 5. REVIEW questions

Each states the reading encoded. **None of these is answered.** Answers belong in the eventual
sign-off record, not here.

| # | Where | Question | Reading encoded |
|---|---|---|---|
| Q1 | Precedence | Should a red flag outrank the ACC redirect when both apply? | Red flag first — clinical safety before funding. Scenario `RF-S37`. |
| Q2 | X-ray Chest p62/p63 | Prompt redirects "suspected pneumothorax" unqualified; the PDF red-flags only a **large** pneumothorax and sends a suspected small one to imaging within 48h. Which governs? | The PDF. RF-16 requires the large presentation. Finding F-02, scenario `RF-S36`. |
| Q3 | Overview p4 + X-ray Spine p73 | The national trauma→ACC redirect rests on a scope statement plus one site row. Does it apply nationally or only at X-ray Spine? | Nationally, as prompt clause 3 and TA-012 assume. |
| Q4 | Overview p4, p58, p92 | Should the redirect also fire on non-trauma ACC eligibility and the Primary Maternity Services Notice (2021)? | No. `funding.accCovered` exists in the vocabulary but the national define uses `funding.accTrauma` only. The two site-level ACC rows stay with their sites. |
| Q5 | CT CAP p11 | "Presentation requiring urgent admission or urgent secondary care assessment" is the only published statement of the retired "wrong pathway" judgement. Should it become a national red flag? | No. It stays a CT CAP criterion (`excl.urgentAdmissionRequired`). Lifting it nationally would re-create the judgement clause 4 retired. |
| Q6 | Multiple | Which near-identical rows across sites are the same concept? Merged: acute abdomen (p30/p60/p91); testicular torsion (p30/p56/p86); strangulated vs incarcerated hernia (p56/p86/p87); septic arthritis (5 sites). Kept separate: paediatric acute abdominal pain/pyloric stenosis (p76) from acute abdomen; osteomyelitis (p99) from septic arthritis; RF-01 massive haemoptysis (p12) from RF-14 haemoptysis with red flags (p62). | As listed. Each merge and each split is a clinical call. |
| Q7 | CT KUB p25/p26 vs US Renal p55 | "Creatinine greater than 160 **mmol/L**" vs "> 160 **micromol/L**". Which is correct, and should the engine assert units? | 160 encoded, no unit asserted, referral units unchecked. Finding F-04. |
| Q7b | CT KUB p25 | Should a qualitative statement ("renal impairment") satisfy "Creatinine greater than 160 or eGFR less than 45", or is the number required? | Number required (literal reading). Sits in tension with KI-06. |
| Q8 | p28, p62, p87 | "including" / "e.g." make several sub-bullet lists non-exhaustive. Should an unlisted equivalent feature fire the flag? | No — only the listed features are encoded. |
| Q8b | X-ray Chest p62 | Are ">20 ml in a single episode" and ">100 ml/hour" thresholds, or examples of "significant / life threatening"? | Examples (they follow "e.g."). Encoded as a boolean judgement, not a measured volume. |
| Q9 | X-ray Spine p72 | "Suspected spinal infection **e.g.** back pain and one or more of fever, recent infection, IV drug use, immunosuppression". Is the flag (a) the suspicion alone or (b) suspicion AND back pain AND ≥1 feature? | (a). Encoding (b) would turn "e.g." into a condition. The features are still extracted and reported. |
| Q10 | CT CAP p11 vs US Renal Paed p83 | `lab.repeatConfirmed` — CT CAP says "after three weeks", US Renal Paediatric says "after 2 weeks". One indicator or two? | One indicator; the interval is asserted by each site's own define. |
| Q11 | CT AP draft | "persistent or progressive (**typically** greater than 6 weeks) abdominal symptoms" — is 6 weeks a threshold or a modifier? | Modifier (KI-05). `symptom.persistentAbdominal` is a boolean with no duration sibling. The CT AP session must not add one without a ruling. |
| Q12 | US Renal Paed p83 | Infant age thresholds ("younger than 3 months") cannot be expressed by `patient.age` (integer years). Is `patient.ageMonths` accepted? | Yes — added. A referral supplying only years leaves RF-23 indeterminate, not false. |
| Q13 | Naming | The brief places weight loss under `symptom`; the published CT CAP linkIds are `weightloss.*`. | Immutability wins: `weightloss.*` retained, `group` = `weightloss`. Consolidation under `symptom` would be a deprecation at a future major version. |
| Q14 | Naming | CT CAP published two prior-imaging concepts under the `excl.` prefix (`excl.recentCTCAP12m`, `excl.recentUSAbdoPelvis3m`) while v1 introduces an `imaging.*` group for the same class. | The `excl.` linkIds are kept unchanged and no `imaging.*` duplicate is minted. The inconsistency is real and is a deprecation decision, not an edit. |
| Q15 | Naming | The brief writes `lab.alp.raised` and `lab.platelets.raised`; the published CT CAP linkIds are `lab.alp.high` and `lab.platelets.high`. | Published names retained. Flagged so nobody "corrects" them later. |
| Q16 | Scope | Nine non-`redflag` entries are single-site at v1: `lab.alp.timesULN`, `lab.pyuriaOnMicroscopy`, `lab.ferritin.raised`, `imaging.ctkub.within5y`, `imaging.ctsinus.ever`, `imaging.biliaryTree.ever`, `imaging.usrenal.moreThan12mAgo`, `symptom.backPain`, `advice.decisionSupportToolAvailable`. Do single-site concepts belong in a *national* vocabulary, or in the site Questionnaire? | Admitted to v1 because each is either composed by the national red-flag library or is a standard analyte / prior-imaging class. Reviewer may push any of them back to site-local. `advice.specifiedDateImagingRecommended` was pushed back on exactly this test — see finding F-10. |
| Q17 | `advice` | `advice.urgentCTRecommended` (CT CAP, immutable, exam-specific) and `advice.urgentImagingRecommended` (national, 18 sites) are the same concept at different scopes. | Both retained; CT CAP's is not deprecated. Whether the retrofit should point CT CAP at the national one is a governance decision, not Session 2's. |
| Q18 | CT Head p20 vs US Carotid p34 | "Patient is unable to access rapid specialist care" and "Acute stroke specialist assessment is not available" — one concept or two? | One (`advice.rapidSpecialistCareAccessible`). They may not be the same thing. |
| Q19 | CT CAP p11 vs CT AP draft | "investigated **by secondary care** … for the same **symptoms/signs**" vs "investigated … for the same **presentation**". Reuse `excl.secondaryCareInvestigated12m` or create a CT AP variant? | Reuse proposed; not decided. |
| Q20 | Reporting | Should an unanswered red flag be reported? | Only compound flags whose **stem is true** are reported as indeterminate; a flag null because the note never raised the concept is silent. Otherwise every ordinary referral would list ~30 flags. Scenarios `RF-S33` (silent) and `RF-S35` (stem true → reported). |
| Q21 | Documentation standard | Under `strict`, an inferred red-flag answer is treated as unanswered and the flag does not fire. Should red flags be exempt from the documentation standard? | Not exempt. Mitigation observed in testing: a **compound** flag then lands *indeterminate* and asks for its qualifiers, so the concern surfaces (scenario `RF-S34`). A **simple** flag answered only by inference is genuinely silent — that residual risk is the live part of this question. |
| Q22 | US Renal p52 | This row reads "**Consider** admission **or seek advice** for Pyelonephritis where…", softer than every other acute-assessment row. Should it stop criteria assessment? | Encoded as a red flag on the strength of the row it sits in. |
| Q23 | US Carotid p34 / CT Head p21 | "A high seven day stroke risk*" points at the CT Head "*1 High risk features for TIA" footnote (five features). Should those become sub-indicators of RF-10? | No — `redflag.highSevenDayStrokeRisk` is one extracted judgement. The footnote belongs to the CT Head / US Carotid site transcriptions. |
| Q24 | X-ray Pelvis/Hip Paed p99 | Suspected SUFE appears both as an acute-assessment red flag and as an Acute-24h imaging indication ("non-acute symptoms where a diagnosis of SUFE is suspected"). How are they distinguished? | Encoded literally; RF-30 will over-fire for the non-acute presentation. Finding F-05. |
| Q25 | `advice` | The published gateway alternates between "advises referral for **same or next day** \<exam\>" and "advises referral for **acute** \<exam\>" (X-ray Abdomen p60, X-ray Spine p72). One gateway or two? | One (`advice.acuteImagingRecommended`). |
| Q26 | US Scrotum p56 | The P4 row uses "advises referral for **deferrable, non-urgent** ultrasound" — the only such wording in the document. Own indicator or fold into non-urgent? | Folded into `advice.nonUrgentImagingRecommended`. |
| Q27 | `advice` | The three timeframe gateways are national in wording but each belongs to the timeframe row it sits in (KI-07). Should a site's Questionnaire instead carry one gateway per timeframe row, scoped to that row? | National indicators; the site library composes each inside its own pathway. |

---

## 6. Scenario results

`tests/scenarios-redflags.mjs` — 46 scenarios, 47 runs (RF-S34 runs under both documentation
standards). Verified against ELM compiled from `cql/CRR_RedFlags.cql` with `@cqframework/cql`
5.2.0 and `cql-execution` 3.3.2.

```
47/47 passed
Define coverage: 31/31  (100%)
```

Coverage is measured over the 31 clinical determinations in `Rule Trace` (RF-01…RF-30 plus the ACC
redirect); each is `true` in at least one scenario. `RF-19 Illustrative Features Present` is a
reporting list rather than a determination and is asserted directly by `RF-S19`.

Scenario groups: `RF-S01`…`RF-S30` one per red flag firing (with `b`/`c` variants where a compound
flag has alternative qualifying features — RF-03, RF-10, RF-14, RF-20, RF-23, RF-27); `RF-S31` ACC
redirect firing; `RF-S32`/`RF-S33` fall-through; `RF-S34` inferred red flag under the strict
standard (must not fire); `RF-S35` indeterminate compound flag with missing-information list;
`RF-S36` finding F-02; `RF-S37` red-flag-over-ACC precedence; `RF-S38` finding F-01.

**The scenarios are not wired into `npm test`.** Session 2 owns that (S2 brief item 2), along with
adding `CRR_RedFlags.cql` to the `build` script. Nothing under `tooling/criteria-bundle/tooling/`
was modified by this session; the compile and the scenario run above were performed with the
existing `translate.mjs` writing to a scratchpad path.

---

## 7. What this session did not do

- Did not transcribe any exam/site. CT AP, CT Colonography and the other 51 sites are slice 7.
- Did not touch CT CAP's CQL, Questionnaire, PlanDefinition, ELM or scenarios; did not touch
  `tooling/criteria-bundle/tooling/`, the engine, or the extraction contract.
- Did not add a Questionnaire for the national red-flag indicators. The extraction prompt needs one
  (prompt decomposition §2 item 5 — "answer the national `redflag.*` items"), but that is the
  extraction service's contract, built in slice 4.
- Did not author any terminology code. Every `code` is `PLACEHOLDER` (SR-11).
- Did not run or build publish tooling — it does not exist yet.
- Did not write a status, registry or sign-off file, and does not describe the vocabulary as final.

---

**NEEDS CLINICAL REVIEW.** The indicator groupings, the `sites` attributions and the red-flag list
are a first-pass transcription. A clinician must review the grouping and the SOURCE quotes before
Session 2 retrofits CT CAP against this vocabulary or any site transcription references it.
