/*
  CRR National Community Referral Criteria for Imaging (Part I)
  National red-flag and ACC redirect library

  SOURCE DOCUMENT
    Title:      National Community Referral Criteria for Imaging (Part I)
    Owner:      System Design Manager Community Radiology
    Authoriser: National Clinical Governance Group
    National ID 15372, Version 2.0, Published 09/04/2026, Review due 09/04/2028
    Repo copy:  documents/reference/National Primary Care Referral Criteria for Imaging.pdf
    Sections:   every "Refer for acute assessment without initial imaging" row in the
                document (23 rows across 23 exam/sites), plus Overview scope item 3
                and X-ray Spine - Adult p73 for the ACC redirect.
    Page numbers below are the document's own printed page numbers, which match its
    physical pages.

  WHAT THIS LIBRARY IS
    The national layer that runs BEFORE any exam/site library. It answers one
    question: does this presentation need acute assessment (or belong to another
    funding stream) rather than community imaging? It never decides eligibility
    for an exam - that is the site library's job.

  =========================================================================
  DETERMINATION PRECEDENCE CONTRACT  (BRD TA-011, TA-012, TA-013)
  =========================================================================
    1. This library is evaluated first, for every assessment, regardless of
       which exam/site bundles were selected.
    2. If "Determination" = 'ACUTE_ASSESSMENT_REQUIRED', the pipeline stops.
       No exam library is evaluated and no priority code is produced. The
       Advisory carries the fired red flags and their published wording.
    3. Otherwise, if "Determination" = 'ACC_PATHWAY', the pipeline stops and
       the Advisory carries the ACC redirect. (TA-012: the redirect precedes
       criteria assessment.)
    4. Otherwise "Determination" = 'NO_NATIONAL_REDIRECT' and evaluation
       continues to each selected exam/site library, which applies its own
       internal precedence (CT CAP: not-funded -> alternative management ->
       paediatric -> criteria).
    5. An exam library NEVER re-evaluates a red flag or the ACC redirect, and
       never defines an indicator in the `redflag.` or `funding.acc*` space.
       A site row that repeats a national red flag (e.g. X-ray Shoulder p67
       repeats septic arthritis under Alternative management) is transcribed
       at that site as a cross-reference in `documentation`, not as logic.
    6. Red flag before ACC is the encoded order: clinical safety outranks
       funding. REVIEW Q1 - confirm.

  =========================================================================
  THREE-VALUED LOGIC AND THE READING RULE FOR RED FLAGS
  =========================================================================
    true  = the red flag is present on accepted evidence
    false = the red flag is definitively absent
    null  = the note does not say

    A red flag is GATE-shaped, not criterion-shaped: it is read through
    `is true`. A null red flag does not fire and does not block the exam
    library - the same treatment CT CAP gives its exclusions. Nulls are not
    coalesced to false in the defines themselves, so the tri-state survives
    into "Indeterminate Red Flags" for the compound flags, where "the stem is
    present but we cannot tell whether it qualifies" is genuinely actionable.
    For SIMPLE (single-indicator) red flags a null is treated as "not raised"
    and is not reported - reporting all 30 unanswered flags on every
    assessment would be noise, not information. REVIEW Q20 - confirm.

  =========================================================================
  PROVENANCE CONVENTION
  =========================================================================
    Every clinical define carries a "SOURCE:" comment quoting the published
    row verbatim, with page and exam/site. A define with no SOURCE comment is
    engineering plumbing, not a clinical rule. Review is a side-by-side check
    of each SOURCE quote against the define beneath it.

    Wording introduced by "especially", "typically", "particularly" or "e.g."
    is a modifier, not a condition (KI-05). Where such wording appears inside a
    quoted row it is reproduced in the SOURCE comment and deliberately NOT
    encoded; each instance is listed in vocabulary/transcription-notes.md.

  =========================================================================
  NOT IN THIS LIBRARY
  =========================================================================
    - Thunderclap / worst-ever headache -> possible SAH. Present in system
      prompt v2.3.0 STEP 0(a); NOT PRESENT ANYWHERE IN THE PUBLISHED PDF.
      CT Head - Adult (pp.20-22) has no acute-assessment row at all. Dropped,
      not fabricated. See transcription-notes.md finding F-01.
    - "Wrong pathway" (prompt STEP 0(c)). Retired as a model judgement
      (prompt decomposition clause 4). Its only published statement is CT
      CAP's own redirect row, which stays in CT CAP's library.
    - Site-level ACC rows that turn on eligibility rather than a trauma
      mechanism (US Soft Tissue Mass - Adult p58; X-ray Abdomen - Paediatric
      p92). They belong to those sites' transcriptions. See REVIEW Q4.

  =========================================================================
  CLINICAL REVIEW FLAGS
  =========================================================================
    Points where the published wording is ambiguous are marked "REVIEW Qn"
    and listed in vocabulary/transcription-notes.md. The chosen reading is
    stated at each point. This library HAS NOT BEEN CLINICALLY REVIEWED.
*/

library CRR_RedFlags version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

/*
  Documentation standard (BRD TA-010). Governs which evidence statuses are
  accepted as establishing an indicator. Identical semantics to the CT CAP
  library so one parameter governs the whole pipeline.
    'strict'   - 'documented' and 'retrieved' answers count; 'inferred'
                 answers are treated as not answered (null).
    'inferred' - 'documented', 'retrieved' and 'inferred' all count.

  REVIEW Q21 - SAFETY CONSEQUENCE, and how the three-valued design softens it.
  Under 'strict', an inferred red-flag answer is treated as NOT ANSWERED, so
  the flag does not fire and the referral proceeds to criteria assessment
  rather than being redirected. It is not silently dropped, though: because
  the answer becomes null rather than false, a COMPOUND flag lands
  indeterminate and its qualifying linkIds are asked for (scenario RF-S34
  demonstrates exactly this for cauda equina). A SIMPLE flag answered only by
  inference is genuinely silent - nothing is reported.
  Confirm whether red flags should instead be exempt from the documentation
  standard and always evaluated on inferred evidence, and whether a simple
  flag suppressed by strict mode should be surfaced.
*/
parameter "Documentation Standard" String default 'strict'

context Patient

// ---------------------------------------------------------------------------
// Plumbing: QuestionnaireResponse access (shape shared with the CT CAP library)
// ---------------------------------------------------------------------------

define "Evidence Extension URL": 'http://crr.health.nz/fhir/StructureDefinition/answer-evidence'

define "Accepted Evidence Statuses":
  if "Documentation Standard" = 'inferred' then { 'documented', 'retrieved', 'inferred' }
  else { 'documented', 'retrieved' }

define "Responses":
  [QuestionnaireResponse] R
    where R.status.value in { 'completed', 'in-progress' }

define "Top Level Items": flatten ("Responses" R return R.item)

define "Items": "Top Level Items" union flatten ("Top Level Items" I return I.item)

define function "Item"(linkId String):
  First("Items" I where I.linkId.value = linkId)

define function "Answer"(linkId String):
  First("Item"(linkId).answer)

define function "Evidence Status"(linkId String):
  FHIRHelpers.ToString(
    First(
      (First(("Answer"(linkId).extension) E where E.url.value = "Evidence Extension URL").extension) S
        where S.url.value = 'status'
    ).value as FHIR.code
  )

define function "Is Answered"(linkId String):
  "Answer"(linkId) is not null

define function "Is Accepted"(linkId String):
  "Is Answered"(linkId)
    and Coalesce("Evidence Status"(linkId), 'documented') in "Accepted Evidence Statuses"

define function "Bool"(linkId String):
  if "Is Accepted"(linkId) then FHIRHelpers.ToBoolean("Answer"(linkId).value as FHIR.boolean) else null

define function "Dec"(linkId String):
  if "Is Accepted"(linkId) then FHIRHelpers.ToDecimal("Answer"(linkId).value as FHIR.decimal) else null

define function "Qty"(linkId String):
  if "Is Accepted"(linkId) then FHIRHelpers.ToQuantity("Answer"(linkId).value as FHIR.Quantity).value else null

// ===========================================================================
// RESPIRATORY / AIRWAY
// ===========================================================================

/*
  SOURCE (CT Chest - Adult, p12, "Refer for acute assessment without initial imaging"):
  "Life threatening, massive haemoptysis - patient is at high risk of asphyxiation
   or exsanguination"
*/
define "RF-01 Massive Haemoptysis":
  "Bool"('redflag.haemoptysisMassive')

/*
  SOURCE (CT Chest - Adult, p12, "Refer for acute assessment without initial imaging"):
  "Stridor / suspected SVC obstruction"
*/
define "RF-02 Stridor Or SVC Obstruction":
  "Bool"('redflag.stridorOrSvcObstruction')

/*
  SOURCE (X-ray Chest - Adult, p62, "Refer for acute assessment without initial imaging."):
  "Haemoptysis with "red flags" including if
     o Significant (e.g., more than 20ml (1 tablespoon) in a single episode) or life
       threatening (e.g., more than 100 ml/hour) haemoptysis
     o Haemodynamically unstable
     o Haemoptysis with hoarseness or stridor
     o Acute dyspnoea and/or chest pain"

  REVIEW Q8 - the volumes are introduced by "e.g." and are therefore encoded as
  illustrative of "significant / life threatening", not as numeric thresholds
  (KI-05). No lab-style value indicator is created. Confirm.
  REVIEW Q8b - "including if" makes the four sub-bullets non-exhaustive. Encoded
  as: haemoptysis AND at least one of the four listed features. Confirm that a
  fifth, unlisted "red flag" is not intended to fire this.
*/
define "RF-14 Haemoptysis With Red Flags":
  "Bool"('redflag.haemoptysisPresent')
    and (
      "Bool"('redflag.haemoptysisSignificantVolume')
        or "Bool"('redflag.haemodynamicallyUnstable')
        or "Bool"('redflag.hoarsenessOrStridorWithHaemoptysis')
        or "Bool"('redflag.acuteDyspnoeaOrChestPain')
    )

define "RF-14 Qualifiers Unanswered":
  (List<String>{
    if "Bool"('redflag.haemoptysisSignificantVolume') is null then 'redflag.haemoptysisSignificantVolume' else null,
    if "Bool"('redflag.haemodynamicallyUnstable') is null then 'redflag.haemodynamicallyUnstable' else null,
    if "Bool"('redflag.hoarsenessOrStridorWithHaemoptysis') is null then 'redflag.hoarsenessOrStridorWithHaemoptysis' else null,
    if "Bool"('redflag.acuteDyspnoeaOrChestPain') is null then 'redflag.acuteDyspnoeaOrChestPain' else null
  }) M where M is not null

/*
  SOURCE (X-ray Chest - Adult, p62, "Refer for acute assessment without initial imaging."):
  "Severe respiratory distress"
*/
define "RF-15 Severe Respiratory Distress":
  "Bool"('redflag.severeRespiratoryDistress')

/*
  SOURCE (X-ray Chest - Adult, p62, "Refer for acute assessment without initial imaging."):
  "Suspected large pneumothorax with significant pain, breathlessness, tachycardia"

  REVIEW Q2 - the published red flag is a LARGE pneumothorax with those features.
  The same site lists "Suspected small pneumothorax" under Acute: Within 48 hours
  (p63), i.e. it PROCEEDS to imaging. System prompt v2.3.0 STEP 0(a) redirects
  "Suspected pneumothorax" unqualified, which over-triages the small case. The
  published, narrower reading is encoded. Confirm.
*/
define "RF-16 Large Pneumothorax":
  "Bool"('redflag.pneumothoraxLarge')

/*
  SOURCE (X-ray Chest - Adult, p62, "Refer for acute assessment without initial imaging."):
  "Suspected active Tuberculosis and the patient is acutely unwell - follow the
   Tuberculosis pathway"
*/
define "RF-17 Active TB Acutely Unwell":
  "Bool"('redflag.activeTbAcutelyUnwell')

/*
  SOURCE (X-ray Chest - Paediatric, p93, "Refer for acute assessment without initial imaging"):
  "Refer child for acute assessment without requesting imaging if any of:
     o Respiratory distress- tachycardia, tachypnoea, stridor
     o Breathing difficulties and SpO2 92% or lower
     o Acute severe asthma
     o Suspected inhaled foreign body"
*/
define "RF-28 Paediatric Respiratory Compromise":
  "Bool"('redflag.paedRespiratoryDistress')
    or "Bool"('redflag.paedBreathingDifficultyWithHypoxia')
    or "Bool"('redflag.paedAcuteSevereAsthma')
    or "Bool"('redflag.paedInhaledForeignBody')

// ===========================================================================
// ABDOMINAL
// ===========================================================================

/*
  SOURCE (US Abdomen - Adult, p30, "Refer for acute assessment without imaging"):
  "Suspected acute cholecystitis or cholangitis (i.e. intractable biliary colic not
   relieved by simple analgesia and especially if accompanied by fever, persistent
   vomiting)"

  "especially if accompanied by fever, persistent vomiting" is modifier wording
  (KI-05) and is not encoded as a condition.
*/
define "RF-05 Cholecystitis Or Cholangitis":
  "Bool"('redflag.cholecystitisOrCholangitis')

/*
  SOURCE (US Abdomen - Adult, p30, "Refer for acute assessment without imaging"):
  "Acute abdomen, including possible appendicitis"
  SOURCE (X-ray Abdomen - Adult, p60, "Refer for acute assessment without initial imaging"):
  "Acute abdomen including suspected obstruction"
  SOURCE (X-ray Abdomen - Paediatric, p91, "Refer for acute assessment without initial imaging"):
  "Acute abdomen"

  REVIEW Q6 - three sites, three parentheticals, encoded as ONE concept
  (redflag.acuteAbdomen) on the reading that "including ..." names an example of
  acute abdomen rather than narrowing it. Confirm.
*/
define "RF-06 Acute Abdomen":
  "Bool"('redflag.acuteAbdomen')

/*
  SOURCE (US Abdomen - Adult, p30, "Refer for acute assessment without imaging"):
  "Suspicion of ruptured abdominal aortic aneurysm"
*/
define "RF-07 Ruptured Abdominal Aortic Aneurysm":
  "Bool"('redflag.rupturedAAA')

/*
  SOURCE (US Abdomen - Adult, p30, "Refer for acute assessment without imaging"):
  "Painful jaundice"
*/
define "RF-09 Painful Jaundice":
  "Bool"('redflag.painfulJaundice')

/*
  SOURCE (US Abdomen - Paediatric, p76, "Refer for acute assessment without initial imaging"):
  "Acute abdominal pain or pyloric stenosis including possible appendicitis -
   request acute paediatric assessment"

  REVIEW Q6 - kept as a separate concept from RF-06 because the published wording
  names pyloric stenosis and directs to paediatric assessment. Confirm whether the
  paediatric row should instead reuse redflag.acuteAbdomen.
*/
define "RF-21 Paediatric Acute Abdominal Pain Or Pyloric Stenosis":
  "Bool"('redflag.paedAcuteAbdominalPainOrPyloricStenosis')

/*
  SOURCE (X-ray Abdomen - Paediatric, p91, "Refer for acute assessment without initial imaging"):
  "History of foreign body ingestion and any of:
     o Suspected oesophageal obstruction (e.g. drooling or reluctance to swallow)
     o Known or suspected disc / button battery ingestion
     o Multiple magnets ingested
     o Large object (more than 5cm long and / or 2cms wide)"
*/
define "RF-27 Paediatric High-Risk Foreign Body Ingestion":
  "Bool"('redflag.paedForeignBodyIngestionHistory')
    and (
      "Bool"('redflag.paedFbOesophagealObstruction')
        or "Bool"('redflag.paedFbButtonBattery')
        or "Bool"('redflag.paedFbMultipleMagnets')
        or "Bool"('redflag.paedFbLargeObject')
    )

define "RF-27 Qualifiers Unanswered":
  (List<String>{
    if "Bool"('redflag.paedFbOesophagealObstruction') is null then 'redflag.paedFbOesophagealObstruction' else null,
    if "Bool"('redflag.paedFbButtonBattery') is null then 'redflag.paedFbButtonBattery' else null,
    if "Bool"('redflag.paedFbMultipleMagnets') is null then 'redflag.paedFbMultipleMagnets' else null,
    if "Bool"('redflag.paedFbLargeObject') is null then 'redflag.paedFbLargeObject' else null
  }) M where M is not null

// ===========================================================================
// UROLOGICAL / RENAL
// ===========================================================================

/*
  SOURCE (CT KUB - Adult, p25, "Refer for acute assessment without initial imaging:"):
  "Acute episode of suspected renal colic and the patient has any of the following:
     o Creatinine greater than 160 mmol/L or eGFR less than 45 ml/min
     o Solitary kidney
     o Temperature above 38 degrees
     o Peritonitis / signs of sepsis
     o Known bilateral ureteric stones"

  REVIEW Q7 - UNIT DISCREPANCY IN THE PUBLISHED DOCUMENT. CT KUB p25 and the p26
  footnote print "Creatinine greater than 160 mmol/L"; the US Renal - Adult p55
  footnote prints "Creatinine > 160 micromol/L" for the same threshold. The number
  160 is encoded without asserting a unit; the referral's own units are not checked.
  A clinical/units ruling is required before this is used.
  REVIEW Q7b - "Creatinine greater than 160" and "eGFR less than 45" are numeric
  thresholds, so the value indicators are required. A qualitative statement
  ("renal impairment") answering only lab.creatinine.raised / lab.egfr.low does NOT
  satisfy them under this encoding, which is the literal reading but sits in tension
  with KI-06. Confirm.
*/
define "Renal Colic Creatinine Or eGFR Threshold":
  "Qty"('lab.creatinine.value') > 160.0 or "Qty"('lab.egfr.value') < 45.0

define "Renal Colic Temperature Above 38":
  "Dec"('symptom.temperatureCelsius') > 38.0

define "RF-03 Renal Colic With Red Flag":
  "Bool"('redflag.renalColicAcuteEpisode')
    and (
      "Renal Colic Creatinine Or eGFR Threshold"
        or "Bool"('redflag.solitaryKidney')
        or "Renal Colic Temperature Above 38"
        or "Bool"('redflag.peritonitisOrSepsisSigns')
        or "Bool"('redflag.knownBilateralUretericStones')
    )

define "RF-03 Qualifiers Unanswered":
  (List<String>{
    if "Qty"('lab.creatinine.value') is null then 'lab.creatinine.value' else null,
    if "Qty"('lab.egfr.value') is null then 'lab.egfr.value' else null,
    if "Bool"('redflag.solitaryKidney') is null then 'redflag.solitaryKidney' else null,
    if "Dec"('symptom.temperatureCelsius') is null then 'symptom.temperatureCelsius' else null,
    if "Bool"('redflag.peritonitisOrSepsisSigns') is null then 'redflag.peritonitisOrSepsisSigns' else null,
    if "Bool"('redflag.knownBilateralUretericStones') is null then 'redflag.knownBilateralUretericStones' else null
  }) M where M is not null

/*
  SOURCE (US Renal - Adult, p52, "Refer for acute assessment without initial imaging"):
  "Consider admission or seek advice for Pyelonephritis where presentation with fever
   (higher than 38 degrees), pyuria on microscopy, loin pain or tenderness, +/- lower
   UTI symptoms and:
     o not responding to antibiotics after 72 hours and abscess development is a
       consideration, or
     o flank pain that does not improve within 24 hours of IV or 48 hours of oral
       antibiotics"

  "+/- lower UTI symptoms" does not affect the logic (the CT CAP yellow-flag pattern).
  REVIEW Q22 - this row is the only acute-assessment row phrased as "Consider
  admission OR seek advice" rather than a direction. Encoded as a red flag on the
  strength of the row it sits in. Confirm that it should stop criteria assessment
  rather than produce advice alongside it.
*/
define "RF-12 Pyelonephritis Not Responding Or Persisting":
  "Bool"('redflag.pyelonephritisSuspected')
    and "Renal Colic Temperature Above 38"
    and "Bool"('lab.pyuriaOnMicroscopy')
    and "Bool"('redflag.loinPainOrTenderness')
    and (
      "Bool"('redflag.notRespondingToAntibiotics72h')
        or "Bool"('redflag.flankPainPersistingOnAntibiotics')
    )

define "RF-12 Qualifiers Unanswered":
  (List<String>{
    if "Dec"('symptom.temperatureCelsius') is null then 'symptom.temperatureCelsius' else null,
    if "Bool"('lab.pyuriaOnMicroscopy') is null then 'lab.pyuriaOnMicroscopy' else null,
    if "Bool"('redflag.loinPainOrTenderness') is null then 'redflag.loinPainOrTenderness' else null,
    if "Bool"('redflag.notRespondingToAntibiotics72h') is null then 'redflag.notRespondingToAntibiotics72h' else null,
    if "Bool"('redflag.flankPainPersistingOnAntibiotics') is null then 'redflag.flankPainPersistingOnAntibiotics' else null
  }) M where M is not null

/*
  SOURCE (US Renal - Paediatric, p83, "Refer for acute assessment without initial imaging"):
  "UTI in a child
     o younger than 3 months of age
     o younger than 6 months of age who has a known urinary tract anatomical
       abnormality
     o seriously unwell (e.g. with sepsis)"

  REVIEW Q12 - the age tests need sub-year precision. patient.age is integer years
  (published CT CAP linkId, immutable), so patient.ageMonths is introduced. A
  referral supplying only patient.age = 0 cannot resolve "younger than 3 months";
  the flag is then indeterminate rather than false. Confirm patient.ageMonths.
*/
define "RF-23 Paediatric UTI Requiring Acute Assessment":
  "Bool"('redflag.paedUti')
    and (
      "Dec"('patient.ageMonths') < 3.0
        or ("Dec"('patient.ageMonths') < 6.0 and "Bool"('redflag.paedKnownUrinaryTractAnatomicalAbnormality'))
        or "Bool"('redflag.paedSeriouslyUnwell')
    )

define "RF-23 Qualifiers Unanswered":
  (List<String>{
    if "Dec"('patient.ageMonths') is null then 'patient.ageMonths' else null,
    if "Bool"('redflag.paedKnownUrinaryTractAnatomicalAbnormality') is null then 'redflag.paedKnownUrinaryTractAnatomicalAbnormality' else null,
    if "Bool"('redflag.paedSeriouslyUnwell') is null then 'redflag.paedSeriouslyUnwell' else null
  }) M where M is not null

/*
  SOURCE (US Renal - Paediatric, p83, "Refer for acute assessment without initial imaging"):
  "Haematuria associated with hypertension, heavy proteinuria, oedema or impaired
   renal function"
*/
define "RF-24 Paediatric Haematuria With Renal Compromise":
  "Bool"('symptom.haematuria')
    and (
      "Bool"('redflag.hypertension')
        or "Bool"('redflag.heavyProteinuria')
        or "Bool"('redflag.oedema')
        or "Bool"('redflag.impairedRenalFunction')
    )

define "RF-24 Qualifiers Unanswered":
  (List<String>{
    if "Bool"('redflag.hypertension') is null then 'redflag.hypertension' else null,
    if "Bool"('redflag.heavyProteinuria') is null then 'redflag.heavyProteinuria' else null,
    if "Bool"('redflag.oedema') is null then 'redflag.oedema' else null,
    if "Bool"('redflag.impairedRenalFunction') is null then 'redflag.impairedRenalFunction' else null
  }) M where M is not null

// ===========================================================================
// SCROTAL / GROIN
// ===========================================================================

/*
  SOURCE (US Abdomen - Adult, p30, "Refer for acute assessment without imaging"):
  "Suspected testicular torsion"
  SOURCE (US Scrotum / Testis, p56, "Refer for acute assessment without initial imaging."):
  "Suspected testicular torsion."
  SOURCE (US Scrotum/Testis - Paediatric, p86, "Refer for acute assessment without initial imaging"):
  "Testicular torsion suspected (acute testicular pain, nausea/vomiting, high riding
   testis, absent cremasteric reflex)"

  REVIEW Q6 - the paediatric parenthetical is read as a description of the same
  suspicion, not as four additional required findings. One concept. Confirm.
*/
define "RF-08 Suspected Testicular Torsion":
  "Bool"('redflag.testicularTorsion')

/*
  SOURCE (US Scrotum / Testis, p56, "Refer for acute assessment without initial imaging."):
  "Strangulated inguinal hernia"
  SOURCE (US Scrotum/Testis - Paediatric, p86, "Refer for acute assessment without initial imaging"):
  "Incarcerated inguinal hernia (acute scrotal and/or groin pain)"
  SOURCE (US Soft Tissue Mass - Paediatric, p87, "Refer for acute assessment without initial imaging"):
  "Swelling in groin with pain and clinical suspicion of strangulation or
   incarceration of hernia - irreducible, irritability, pain, tenderness, inflammation"

  REVIEW Q6 - three wordings, one concept. Confirm that "strangulated" and
  "incarcerated" are not intended as distinct triggers.
*/
define "RF-13 Strangulated Or Incarcerated Inguinal Hernia":
  "Bool"('redflag.strangulatedOrIncarceratedInguinalHernia')

// ===========================================================================
// GYNAECOLOGICAL
// ===========================================================================

/*
  SOURCE (US Pelvis - Adult, p44, "Refer for acute assessment without initial imaging"):
  "Clinically unstable patients with suspected gynaecologic or pelvic cause"
*/
define "RF-11 Clinically Unstable Gynaecologic Or Pelvic Cause":
  "Bool"('redflag.clinicallyUnstableGynaePelvicCause')

/*
  SOURCE (US Pelvis - Paediatric, p82, "Refer for acute assessment without initial imaging"):
  "Child who is acutely unwell from a suspected gynaecological cause (e.g. possible
   acute ovarian cyst accident or torsion)"
*/
define "RF-22 Paediatric Acutely Unwell Gynaecological Cause":
  "Bool"('redflag.paedAcutelyUnwellGynaeCause')

// ===========================================================================
// NEUROVASCULAR
// ===========================================================================

/*
  SOURCE (US Carotid - Adult, p34, "Refer for acute assessment without initial imaging"):
  "All patients with suspected TIA with at least one of the following:
     o A high seven day stroke risk*
     o Suspected TIA with associated neck pain or headache (may indicate an underlying
       arterial dissection)"

  "*" refers to the CT Head - Adult p21 footnote "*1 High risk features for TIA".
  That footnote list is NOT transcribed here: it belongs to the CT Head and US
  Carotid site transcriptions, which own the definition of "high risk". This
  library takes redflag.highSevenDayStrokeRisk as a single extracted judgement.
  REVIEW Q23 - confirm, or require the footnote's five features as sub-indicators.
*/
define "RF-10 Suspected TIA With High Risk Or Dissection":
  "Bool"('redflag.suspectedTIA')
    and (
      "Bool"('redflag.highSevenDayStrokeRisk')
        or "Bool"('redflag.tiaWithNeckPainOrHeadache')
    )

define "RF-10 Qualifiers Unanswered":
  (List<String>{
    if "Bool"('redflag.highSevenDayStrokeRisk') is null then 'redflag.highSevenDayStrokeRisk' else null,
    if "Bool"('redflag.tiaWithNeckPainOrHeadache') is null then 'redflag.tiaWithNeckPainOrHeadache' else null
  }) M where M is not null

// ===========================================================================
// ENT
// ===========================================================================

/*
  SOURCE (CT Sinus - Adult, p28, "Refer for acute assessment without imaging"):
  "Rhinosinusitis symptoms associated with any red flags for intracranial or orbital
   pathology including:
     o Severe frontal headache
     o Severe systemic symptoms
     o Altered visual acuity or diplopia"

  REVIEW Q8 - "including" makes the three sub-bullets non-exhaustive. Encoded as:
  rhinosinusitis symptoms AND at least one of the three listed red flags. An
  unlisted intracranial/orbital red flag will not fire this. Confirm.
*/
define "RF-04 Rhinosinusitis With Intracranial Or Orbital Red Flags":
  "Bool"('redflag.rhinosinusitisSymptoms')
    and (
      "Bool"('redflag.severeFrontalHeadache')
        or "Bool"('redflag.severeSystemicSymptoms')
        or "Bool"('redflag.alteredVisualAcuityOrDiplopia')
    )

define "RF-04 Qualifiers Unanswered":
  (List<String>{
    if "Bool"('redflag.severeFrontalHeadache') is null then 'redflag.severeFrontalHeadache' else null,
    if "Bool"('redflag.severeSystemicSymptoms') is null then 'redflag.severeSystemicSymptoms' else null,
    if "Bool"('redflag.alteredVisualAcuityOrDiplopia') is null then 'redflag.alteredVisualAcuityOrDiplopia' else null
  }) M where M is not null

// ===========================================================================
// MUSCULOSKELETAL / SPINE
// ===========================================================================

/*
  SOURCE (X-ray Shoulder and Upper Limb (Humerus, Elbow, Forearm, Wrist/Hand), p66,
   "Refer for acute assessment without initial imaging"):
  "Suspected septic arthritis"
  SOURCE (X-ray -Pelvis/Hip and Lower Limb (Femur, Knee, Tibia/Fibula, Foot/Ankle),
   p69, "Refer for acute assessment without initial imaging."):
  "Suspected septic arthritis."
  SOURCE (X-ray Shoulder and Upper Limb ... - Paediatric, p95,
   "Refer for acute assessment without initial imaging"):
  "Suspected septic arthritis *1"
  SOURCE (X-ray Lower Limb (Femur, Knee, Tibia/Fibula, Foot, Ankle) - Paediatric,
   p97, "Refer for acute assessment without initial imaging"):
  "Suspected septic arthritis *1"
  SOURCE (X-ray Pelvis/Hip - Paediatric, p99, "Refer for acute assessment without
   initial imaging"):
  "Suspected septic arthritis or osteomyelitis"
  SOURCE (X-ray Shoulder and Upper Limb, p67, "Alternative management or
   HealthPathway recommended.", cross-reference to the same red flag):
  "Musculoskeletal x-rays requested through acute demand services - if septic
   arthritis is suspected refer for acute assessment without initial imaging"
*/
define "RF-18 Suspected Septic Arthritis":
  "Bool"('redflag.septicArthritis')

/*
  SOURCE (X-ray Pelvis/Hip - Paediatric, p99, "Refer for acute assessment without
   initial imaging"):
  "Suspected septic arthritis or osteomyelitis"

  REVIEW Q6 - osteomyelitis appears in an acute-assessment row at one site only
  (p99), and separately as a non-acute alternative-management row at X-ray Spine -
  Adult p73 ("Osteomyelitis - discuss with relevant specialist"). Modelled as its
  own indicator so the two dispositions do not collide. Confirm.
*/
define "RF-29 Suspected Osteomyelitis":
  "Bool"('redflag.osteomyelitis')

/*
  SOURCE (X-ray Pelvis/Hip - Paediatric, p99, "Refer for acute assessment without
   initial imaging"):
  "Suspected Slipped Upper Femoral Epiphysis (SUFE)"

  REVIEW Q24 - the same site's "Acute: Within 24 hours" row (p99) directs
  "Child presenting with non-acute symptoms where a diagnosis of SUFE is suspected -
  arrange hip X-ray ...". The two rows both concern suspected SUFE and are separated
  only by whether the presentation is acute. Encoded literally: the red flag fires on
  redflag.sufe, which will over-fire for the non-acute presentation. A clinical
  ruling on how to distinguish them is needed before use.
*/
define "RF-30 Suspected SUFE":
  "Bool"('redflag.sufe')

/*
  SOURCE (X-ray Spine - Adult, p72, "Refer for acute assessment without initial imaging"):
  "Suspected spinal infection e.g. back pain and one or more of fever, history of
   recent infection, IV drug use, immunosuppression - seek acute orthopaedic advice"

  REVIEW Q9 - "e.g." governs the entire description of spinal infection, so the
  listed features are illustrative rather than required (KI-05). Two readings exist:
  (a) the flag is the clinician's suspicion alone (redflag.spinalInfectionSuspected);
  (b) suspicion AND back pain AND at least one of the four features.
  Reading (a) is encoded, because encoding (b) would turn "e.g." into a condition.
  The four features are still extracted so the triager sees them. Confirm.
*/
define "RF-19 Suspected Spinal Infection":
  "Bool"('redflag.spinalInfectionSuspected')

define "RF-19 Illustrative Features Present":
  (List<String>{
    if "Bool"('symptom.backPain') is true then 'symptom.backPain' else null,
    if "Bool"('symptom.fever') is true then 'symptom.fever' else null,
    if "Bool"('redflag.recentInfectionHistory') is true then 'redflag.recentInfectionHistory' else null,
    if "Bool"('redflag.ivDrugUse') is true then 'redflag.ivDrugUse' else null,
    if "Bool"('redflag.immunosuppression') is true then 'redflag.immunosuppression' else null
  }) F where F is not null

/*
  SOURCE (X-ray Spine - Adult, p72, "Refer for acute assessment without initial imaging"):
  "Suspicion of cauda equina syndrome i.e. acute back pain with any of:
     o sphincter disturbance
     o gait disturbance
     o saddle anaesthesia
     o loss of bowel or bladder control
     o abnormal reflexes, or loss of muscle power or feeling in the legs"

  "i.e." (unlike "e.g." above) defines the condition, so the composition IS the rule.
*/
define "RF-20 Suspected Cauda Equina Syndrome":
  "Bool"('symptom.backPain')
    and "Bool"('redflag.backPainAcuteOnset')
    and (
      "Bool"('redflag.sphincterDisturbance')
        or "Bool"('redflag.gaitDisturbance')
        or "Bool"('redflag.saddleAnaesthesia')
        or "Bool"('redflag.bowelOrBladderIncontinence')
        or "Bool"('redflag.abnormalReflexesOrLegWeakness')
    )

define "RF-20 Qualifiers Unanswered":
  (List<String>{
    if "Bool"('redflag.backPainAcuteOnset') is null then 'redflag.backPainAcuteOnset' else null,
    if "Bool"('redflag.sphincterDisturbance') is null then 'redflag.sphincterDisturbance' else null,
    if "Bool"('redflag.gaitDisturbance') is null then 'redflag.gaitDisturbance' else null,
    if "Bool"('redflag.saddleAnaesthesia') is null then 'redflag.saddleAnaesthesia' else null,
    if "Bool"('redflag.bowelOrBladderIncontinence') is null then 'redflag.bowelOrBladderIncontinence' else null,
    if "Bool"('redflag.abnormalReflexesOrLegWeakness') is null then 'redflag.abnormalReflexesOrLegWeakness' else null
  }) M where M is not null

// ===========================================================================
// PAEDIATRIC SOFT TISSUE
// ===========================================================================

/*
  SOURCE (US Soft Tissue Mass - Paediatric, p87, "Refer for acute assessment without
   initial imaging"):
  "Suspected abscess and hospital management considered necessary, especially if red
   flags: *1
     o child younger than 3 months' old
     o child not expected to tolerate incision
     o systemically unwell
     o swelling or redness around a joint or rapidly progressive"

  "especially if red flags" is modifier wording (KI-05): the four sub-bullets are NOT
  encoded as conditions. The condition is the conjunction printed before them.
*/
define "RF-25 Paediatric Abscess Needing Hospital Management":
  "Bool"('redflag.paedAbscessSuspected')
    and "Bool"('redflag.paedHospitalManagementConsideredNecessary')

define "RF-25 Qualifiers Unanswered":
  (List<String>{
    if "Bool"('redflag.paedHospitalManagementConsideredNecessary') is null then 'redflag.paedHospitalManagementConsideredNecessary' else null
  }) M where M is not null

/*
  SOURCE (US Soft Tissue Mass - Paediatric, p87, "Refer for acute assessment without
   initial imaging"):
  "Soft tissue mass with suspicious features including hard, irregular, fixed/deep to
   fascia, rapidly growing and/or more than 5cm in diameter"

  "including" makes the feature list non-exhaustive; encoded as one clinician
  judgement rather than five indicators. REVIEW Q8.
*/
define "RF-26 Paediatric Soft Tissue Mass With Suspicious Features":
  "Bool"('redflag.paedSoftTissueMassSuspiciousFeatures')

// ===========================================================================
// ACC / OTHER FUNDING STREAM REDIRECT  (prompt clause 3, BRD TA-012)
// ===========================================================================

/*
  SOURCE (Overview, p4, Scope item 3):
  "Imaging covered by ACC or other funding streams, including under the Primary
   Maternity Services Notice (2021), is outside the scope of these criteria."
  SOURCE (X-ray Spine - Adult, p73, "Alternative management or HealthPathway
   recommended."):
  "History of recent trauma - request imaging via ACC funding"

  REVIEW Q3 - the national trauma redirect rests on Overview p4 (a scope statement,
  not a criterion row) plus one site row (X-ray Spine p73). No other site states the
  trauma-mechanism rule. Confirm that it applies nationally rather than at X-ray
  Spine only.
  REVIEW Q4 - Overview p4 also puts non-trauma ACC eligibility and the Primary
  Maternity Services Notice (2021) outside these criteria, and two sites state
  ACC-eligibility redirects that do not turn on trauma (US Soft Tissue Mass - Adult
  p58 "Localisation of a suspected foreign body for removal and eligible for ACC
  funding - use ACC funding"; X-ray Abdomen - Paediatric p92 "Suspected injury as a
  result of a foreign body ingestion - request imaging via ACC funding").
  funding.accCovered exists in the vocabulary for those but is deliberately NOT
  evaluated here: prompt clause 3 scopes the national redirect to the trauma
  mechanism only. Confirm, or widen this define to include funding.accCovered.
*/
define "ACC Redirect: Recent Trauma Mechanism":
  "Bool"('funding.accTrauma')

// ===========================================================================
// Fired red flags (published wording for the Advisory)
// ===========================================================================

define "Fired Red Flags":
  (List<String>{
    if "RF-01 Massive Haemoptysis" is true then 'Life threatening, massive haemoptysis - patient is at high risk of asphyxiation or exsanguination (CT Chest - Adult, p12)' else null,
    if "RF-02 Stridor Or SVC Obstruction" is true then 'Stridor / suspected SVC obstruction (CT Chest - Adult, p12)' else null,
    if "RF-03 Renal Colic With Red Flag" is true then 'Acute episode of suspected renal colic with a red flag (CT KUB - Adult, p25)' else null,
    if "RF-04 Rhinosinusitis With Intracranial Or Orbital Red Flags" is true then 'Rhinosinusitis symptoms associated with red flags for intracranial or orbital pathology (CT Sinus - Adult, p28)' else null,
    if "RF-05 Cholecystitis Or Cholangitis" is true then 'Suspected acute cholecystitis or cholangitis (US Abdomen - Adult, p30)' else null,
    if "RF-06 Acute Abdomen" is true then 'Acute abdomen (US Abdomen - Adult p30; X-ray Abdomen - Adult p60; X-ray Abdomen - Paediatric p91)' else null,
    if "RF-07 Ruptured Abdominal Aortic Aneurysm" is true then 'Suspicion of ruptured abdominal aortic aneurysm (US Abdomen - Adult, p30)' else null,
    if "RF-08 Suspected Testicular Torsion" is true then 'Suspected testicular torsion (US Abdomen - Adult p30; US Scrotum / Testis p56; US Scrotum/Testis - Paediatric p86)' else null,
    if "RF-09 Painful Jaundice" is true then 'Painful jaundice (US Abdomen - Adult, p30)' else null,
    if "RF-10 Suspected TIA With High Risk Or Dissection" is true then 'Suspected TIA with a high seven day stroke risk or associated neck pain or headache (US Carotid - Adult, p34)' else null,
    if "RF-11 Clinically Unstable Gynaecologic Or Pelvic Cause" is true then 'Clinically unstable patient with suspected gynaecologic or pelvic cause (US Pelvis - Adult, p44)' else null,
    if "RF-12 Pyelonephritis Not Responding Or Persisting" is true then 'Pyelonephritis not responding to antibiotics or with persisting flank pain - consider admission or seek advice (US Renal - Adult, p52)' else null,
    if "RF-13 Strangulated Or Incarcerated Inguinal Hernia" is true then 'Strangulated or incarcerated inguinal hernia (US Scrotum / Testis p56; US Scrotum/Testis - Paediatric p86; US Soft Tissue Mass - Paediatric p87)' else null,
    if "RF-14 Haemoptysis With Red Flags" is true then 'Haemoptysis with red flags (X-ray Chest - Adult, p62)' else null,
    if "RF-15 Severe Respiratory Distress" is true then 'Severe respiratory distress (X-ray Chest - Adult, p62)' else null,
    if "RF-16 Large Pneumothorax" is true then 'Suspected large pneumothorax with significant pain, breathlessness, tachycardia (X-ray Chest - Adult, p62)' else null,
    if "RF-17 Active TB Acutely Unwell" is true then 'Suspected active tuberculosis and the patient is acutely unwell (X-ray Chest - Adult, p62)' else null,
    if "RF-18 Suspected Septic Arthritis" is true then 'Suspected septic arthritis (X-ray Shoulder and Upper Limb p66; X-ray Pelvis/Hip and Lower Limb p69; and the paediatric limb sites pp.95, 97, 99)' else null,
    if "RF-19 Suspected Spinal Infection" is true then 'Suspected spinal infection - seek acute orthopaedic advice (X-ray Spine - Adult, p72)' else null,
    if "RF-20 Suspected Cauda Equina Syndrome" is true then 'Suspicion of cauda equina syndrome (X-ray Spine - Adult, p72)' else null,
    if "RF-21 Paediatric Acute Abdominal Pain Or Pyloric Stenosis" is true then 'Acute abdominal pain or pyloric stenosis including possible appendicitis - request acute paediatric assessment (US Abdomen - Paediatric, p76)' else null,
    if "RF-22 Paediatric Acutely Unwell Gynaecological Cause" is true then 'Child acutely unwell from a suspected gynaecological cause (US Pelvis - Paediatric, p82)' else null,
    if "RF-23 Paediatric UTI Requiring Acute Assessment" is true then 'UTI in a child under 3 months, under 6 months with a known urinary tract anatomical abnormality, or seriously unwell (US Renal - Paediatric, p83)' else null,
    if "RF-24 Paediatric Haematuria With Renal Compromise" is true then 'Haematuria associated with hypertension, heavy proteinuria, oedema or impaired renal function (US Renal - Paediatric, p83)' else null,
    if "RF-25 Paediatric Abscess Needing Hospital Management" is true then 'Suspected abscess and hospital management considered necessary (US Soft Tissue Mass - Paediatric, p87)' else null,
    if "RF-26 Paediatric Soft Tissue Mass With Suspicious Features" is true then 'Soft tissue mass with suspicious features (US Soft Tissue Mass - Paediatric, p87)' else null,
    if "RF-27 Paediatric High-Risk Foreign Body Ingestion" is true then 'History of foreign body ingestion with a high-risk feature (X-ray Abdomen - Paediatric, p91)' else null,
    if "RF-28 Paediatric Respiratory Compromise" is true then 'Refer child for acute assessment without requesting imaging - respiratory distress, hypoxia, acute severe asthma or suspected inhaled foreign body (X-ray Chest - Paediatric, p93)' else null,
    if "RF-29 Suspected Osteomyelitis" is true then 'Suspected osteomyelitis (X-ray Pelvis/Hip - Paediatric, p99)' else null,
    if "RF-30 Suspected SUFE" is true then 'Suspected Slipped Upper Femoral Epiphysis (SUFE) (X-ray Pelvis/Hip - Paediatric, p99)' else null
  }) F where F is not null

// ---------------------------------------------------------------------------
// Indeterminate compound red flags (see "THREE-VALUED LOGIC" above)
//
// A compound flag is reported as indeterminate ONLY when its stem indicator is
// TRUE and the flag still evaluates to null - i.e. the presenting concept is
// documented but we cannot tell whether it qualifies. That is the actionable
// case. A flag that is null because the note never mentioned the concept at all
// is silent: reporting all thirty on every referral would be noise, and would
// make the national library shout on every ordinary request. REVIEW Q20.
// Simple single-indicator flags are never reported as indeterminate.
// ---------------------------------------------------------------------------

define "RF-03 Is Indeterminate": "Bool"('redflag.renalColicAcuteEpisode') is true and "RF-03 Renal Colic With Red Flag" is null
define "RF-04 Is Indeterminate": "Bool"('redflag.rhinosinusitisSymptoms') is true and "RF-04 Rhinosinusitis With Intracranial Or Orbital Red Flags" is null
define "RF-10 Is Indeterminate": "Bool"('redflag.suspectedTIA') is true and "RF-10 Suspected TIA With High Risk Or Dissection" is null
define "RF-12 Is Indeterminate": "Bool"('redflag.pyelonephritisSuspected') is true and "RF-12 Pyelonephritis Not Responding Or Persisting" is null
define "RF-14 Is Indeterminate": "Bool"('redflag.haemoptysisPresent') is true and "RF-14 Haemoptysis With Red Flags" is null
define "RF-20 Is Indeterminate": "Bool"('symptom.backPain') is true and "RF-20 Suspected Cauda Equina Syndrome" is null
define "RF-23 Is Indeterminate": "Bool"('redflag.paedUti') is true and "RF-23 Paediatric UTI Requiring Acute Assessment" is null
define "RF-24 Is Indeterminate": "Bool"('symptom.haematuria') is true and "RF-24 Paediatric Haematuria With Renal Compromise" is null
define "RF-25 Is Indeterminate": "Bool"('redflag.paedAbscessSuspected') is true and "RF-25 Paediatric Abscess Needing Hospital Management" is null
define "RF-27 Is Indeterminate": "Bool"('redflag.paedForeignBodyIngestionHistory') is true and "RF-27 Paediatric High-Risk Foreign Body Ingestion" is null

define "Indeterminate Red Flags":
  (List<String>{
    if "RF-03 Is Indeterminate" then 'RF-03 Renal colic with red flag (CT KUB - Adult, p25)' else null,
    if "RF-04 Is Indeterminate" then 'RF-04 Rhinosinusitis with intracranial or orbital red flags (CT Sinus - Adult, p28)' else null,
    if "RF-10 Is Indeterminate" then 'RF-10 Suspected TIA with high risk or dissection (US Carotid - Adult, p34)' else null,
    if "RF-12 Is Indeterminate" then 'RF-12 Pyelonephritis not responding or persisting (US Renal - Adult, p52)' else null,
    if "RF-14 Is Indeterminate" then 'RF-14 Haemoptysis with red flags (X-ray Chest - Adult, p62)' else null,
    if "RF-20 Is Indeterminate" then 'RF-20 Suspected cauda equina syndrome (X-ray Spine - Adult, p72)' else null,
    if "RF-23 Is Indeterminate" then 'RF-23 Paediatric UTI requiring acute assessment (US Renal - Paediatric, p83)' else null,
    if "RF-24 Is Indeterminate" then 'RF-24 Paediatric haematuria with renal compromise (US Renal - Paediatric, p83)' else null,
    if "RF-25 Is Indeterminate" then 'RF-25 Paediatric abscess needing hospital management (US Soft Tissue Mass - Paediatric, p87)' else null,
    if "RF-27 Is Indeterminate" then 'RF-27 Paediatric high-risk foreign body ingestion (X-ray Abdomen - Paediatric, p91)' else null
  }) R where R is not null

// ---------------------------------------------------------------------------
// Missing information: the qualifying indicators of the indeterminate flags
// ---------------------------------------------------------------------------

define "Missing Information":
  distinct(
    (if "RF-03 Is Indeterminate" then "RF-03 Qualifiers Unanswered" else {} as List<String>)
      union (if "RF-04 Is Indeterminate" then "RF-04 Qualifiers Unanswered" else {} as List<String>)
      union (if "RF-10 Is Indeterminate" then "RF-10 Qualifiers Unanswered" else {} as List<String>)
      union (if "RF-12 Is Indeterminate" then "RF-12 Qualifiers Unanswered" else {} as List<String>)
      union (if "RF-14 Is Indeterminate" then "RF-14 Qualifiers Unanswered" else {} as List<String>)
      union (if "RF-20 Is Indeterminate" then "RF-20 Qualifiers Unanswered" else {} as List<String>)
      union (if "RF-23 Is Indeterminate" then "RF-23 Qualifiers Unanswered" else {} as List<String>)
      union (if "RF-24 Is Indeterminate" then "RF-24 Qualifiers Unanswered" else {} as List<String>)
      union (if "RF-25 Is Indeterminate" then "RF-25 Qualifiers Unanswered" else {} as List<String>)
      union (if "RF-27 Is Indeterminate" then "RF-27 Qualifiers Unanswered" else {} as List<String>)
  )

// ---------------------------------------------------------------------------
// Determination (see the precedence contract at the top of this file)
// ---------------------------------------------------------------------------

define "Determination":
  case
    when exists "Fired Red Flags" then 'ACUTE_ASSESSMENT_REQUIRED'
    when "ACC Redirect: Recent Trauma Mechanism" is true then 'ACC_PATHWAY'
    else 'NO_NATIONAL_REDIRECT'
  end

define "Evaluation Continues To Exam Libraries":
  "Determination" = 'NO_NATIONAL_REDIRECT'

// ---------------------------------------------------------------------------
// Grounding audit - which accepted indicators were inferred rather than documented
// ---------------------------------------------------------------------------

define "All Indicator LinkIds":
  {
    'patient.ageMonths',
    'symptom.backPain', 'symptom.fever', 'symptom.haematuria', 'symptom.temperatureCelsius',
    'lab.creatinine.value', 'lab.egfr.value', 'lab.pyuriaOnMicroscopy',
    'funding.accTrauma',
    'redflag.haemoptysisMassive', 'redflag.stridorOrSvcObstruction',
    'redflag.renalColicAcuteEpisode', 'redflag.solitaryKidney', 'redflag.peritonitisOrSepsisSigns', 'redflag.knownBilateralUretericStones',
    'redflag.rhinosinusitisSymptoms', 'redflag.severeFrontalHeadache', 'redflag.severeSystemicSymptoms', 'redflag.alteredVisualAcuityOrDiplopia',
    'redflag.cholecystitisOrCholangitis', 'redflag.acuteAbdomen', 'redflag.rupturedAAA', 'redflag.testicularTorsion', 'redflag.painfulJaundice',
    'redflag.suspectedTIA', 'redflag.highSevenDayStrokeRisk', 'redflag.tiaWithNeckPainOrHeadache',
    'redflag.clinicallyUnstableGynaePelvicCause',
    'redflag.pyelonephritisSuspected', 'redflag.loinPainOrTenderness', 'redflag.notRespondingToAntibiotics72h', 'redflag.flankPainPersistingOnAntibiotics',
    'redflag.strangulatedOrIncarceratedInguinalHernia',
    'redflag.haemoptysisPresent', 'redflag.haemoptysisSignificantVolume', 'redflag.haemodynamicallyUnstable', 'redflag.hoarsenessOrStridorWithHaemoptysis', 'redflag.acuteDyspnoeaOrChestPain',
    'redflag.severeRespiratoryDistress', 'redflag.pneumothoraxLarge', 'redflag.activeTbAcutelyUnwell',
    'redflag.septicArthritis', 'redflag.osteomyelitis', 'redflag.sufe',
    'redflag.spinalInfectionSuspected', 'redflag.recentInfectionHistory', 'redflag.ivDrugUse', 'redflag.immunosuppression',
    'redflag.backPainAcuteOnset', 'redflag.sphincterDisturbance', 'redflag.gaitDisturbance', 'redflag.saddleAnaesthesia', 'redflag.bowelOrBladderIncontinence', 'redflag.abnormalReflexesOrLegWeakness',
    'redflag.paedAcuteAbdominalPainOrPyloricStenosis', 'redflag.paedAcutelyUnwellGynaeCause',
    'redflag.paedUti', 'redflag.paedKnownUrinaryTractAnatomicalAbnormality', 'redflag.paedSeriouslyUnwell',
    'redflag.hypertension', 'redflag.heavyProteinuria', 'redflag.oedema', 'redflag.impairedRenalFunction',
    'redflag.paedAbscessSuspected', 'redflag.paedHospitalManagementConsideredNecessary', 'redflag.paedSoftTissueMassSuspiciousFeatures',
    'redflag.paedForeignBodyIngestionHistory', 'redflag.paedFbOesophagealObstruction', 'redflag.paedFbButtonBattery', 'redflag.paedFbMultipleMagnets', 'redflag.paedFbLargeObject',
    'redflag.paedRespiratoryDistress', 'redflag.paedBreathingDifficultyWithHypoxia', 'redflag.paedAcuteSevereAsthma', 'redflag.paedInhaledForeignBody'
  }

define "Inferred Indicators":
  "All Indicator LinkIds" L where "Evidence Status"(L) = 'inferred'

define "Inferred Indicators Excluded By Strict Standard":
  if "Documentation Standard" = 'strict' then "Inferred Indicators" else {} as List<String>

define "Retrieved Indicators":
  "All Indicator LinkIds" L where "Evidence Status"(L) = 'retrieved'

// ---------------------------------------------------------------------------
// Rule trace (triager audit view)
// ---------------------------------------------------------------------------

define "Rule Trace":
  Tuple {
    rf01MassiveHaemoptysis: "RF-01 Massive Haemoptysis",
    rf02StridorOrSvcObstruction: "RF-02 Stridor Or SVC Obstruction",
    rf03RenalColicWithRedFlag: "RF-03 Renal Colic With Red Flag",
    rf04RhinosinusitisRedFlags: "RF-04 Rhinosinusitis With Intracranial Or Orbital Red Flags",
    rf05CholecystitisOrCholangitis: "RF-05 Cholecystitis Or Cholangitis",
    rf06AcuteAbdomen: "RF-06 Acute Abdomen",
    rf07RupturedAAA: "RF-07 Ruptured Abdominal Aortic Aneurysm",
    rf08TesticularTorsion: "RF-08 Suspected Testicular Torsion",
    rf09PainfulJaundice: "RF-09 Painful Jaundice",
    rf10TiaHighRiskOrDissection: "RF-10 Suspected TIA With High Risk Or Dissection",
    rf11UnstableGynaePelvicCause: "RF-11 Clinically Unstable Gynaecologic Or Pelvic Cause",
    rf12Pyelonephritis: "RF-12 Pyelonephritis Not Responding Or Persisting",
    rf13InguinalHernia: "RF-13 Strangulated Or Incarcerated Inguinal Hernia",
    rf14HaemoptysisWithRedFlags: "RF-14 Haemoptysis With Red Flags",
    rf15SevereRespiratoryDistress: "RF-15 Severe Respiratory Distress",
    rf16LargePneumothorax: "RF-16 Large Pneumothorax",
    rf17ActiveTbAcutelyUnwell: "RF-17 Active TB Acutely Unwell",
    rf18SepticArthritis: "RF-18 Suspected Septic Arthritis",
    rf19SpinalInfection: "RF-19 Suspected Spinal Infection",
    rf19IllustrativeFeatures: "RF-19 Illustrative Features Present",
    rf20CaudaEquina: "RF-20 Suspected Cauda Equina Syndrome",
    rf21PaedAcuteAbdominalPain: "RF-21 Paediatric Acute Abdominal Pain Or Pyloric Stenosis",
    rf22PaedGynaeCause: "RF-22 Paediatric Acutely Unwell Gynaecological Cause",
    rf23PaedUti: "RF-23 Paediatric UTI Requiring Acute Assessment",
    rf24PaedHaematuria: "RF-24 Paediatric Haematuria With Renal Compromise",
    rf25PaedAbscess: "RF-25 Paediatric Abscess Needing Hospital Management",
    rf26PaedSoftTissueMass: "RF-26 Paediatric Soft Tissue Mass With Suspicious Features",
    rf27PaedForeignBody: "RF-27 Paediatric High-Risk Foreign Body Ingestion",
    rf28PaedRespiratoryCompromise: "RF-28 Paediatric Respiratory Compromise",
    rf29Osteomyelitis: "RF-29 Suspected Osteomyelitis",
    rf30Sufe: "RF-30 Suspected SUFE",
    accTrauma: "ACC Redirect: Recent Trauma Mechanism",
    documentationStandard: "Documentation Standard"
  }

// ---------------------------------------------------------------------------
// Advisory output
// ---------------------------------------------------------------------------

define "Advisory":
  Tuple {
    library: 'CRR national red flags and ACC redirect',
    criteriaVersion: '2.0 (published 09/04/2026)',
    determination: "Determination",
    firedRedFlags: "Fired Red Flags",
    indeterminateRedFlags: "Indeterminate Red Flags",
    missingInformation: "Missing Information",
    evaluationContinuesToExamLibraries: "Evaluation Continues To Exam Libraries",
    inferredIndicators: "Inferred Indicators",
    inferredExcludedByStrictStandard: "Inferred Indicators Excluded By Strict Standard",
    retrievedIndicators: "Retrieved Indicators",
    ruleTrace: "Rule Trace"
  }
