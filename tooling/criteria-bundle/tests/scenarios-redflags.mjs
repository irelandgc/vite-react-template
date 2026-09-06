// Test scenarios for CRR_RedFlags (the national red-flag and ACC redirect library).
//
// Shape follows tests/scenarios.mjs: each scenario is a map of linkId -> answer.
// An answer is either a bare value (treated as documented, no evidence extension)
// or { v, status, quote }. Omitted linkIds are NOT answered (null in CQL).
//
// `expect` is keyed by run configuration; the default run is strict.
// Expectation keys:
//   determination        - the Advisory's determination string
//   fired                - exact number of entries in Advisory.firedRedFlags
//   trace                - object of Advisory.ruleTrace key -> expected value
//                          (null means the define evaluated to null)
//   indeterminate        - exact number of entries in Advisory.indeterminateRedFlags
//   missing              - exact set of Advisory.missingInformation linkIds
//   inferredExcluded     - exact set of Advisory.inferredExcludedByStrictStandard
//
// Coverage target (slice 1 Done line): every clinical define in CRR_RedFlags is
// true in at least one scenario. RF-01..RF-30 plus the ACC redirect each have a
// dedicated firing scenario (RF-S01..RF-S30, RF-S31), followed by the behavioural
// scenarios RF-S32..RF-S38.
//
// NOT CLINICALLY REVIEWED. Several expectations encode a reading that is flagged
// as a REVIEW question in vocabulary/transcription-notes.md; those are named in
// the scenario title so a reviewer can see what is being asserted.

const EVIDENCE_URL = "http://crr.health.nz/fhir/StructureDefinition/answer-evidence";

// linkIds whose Questionnaire type is `quantity` rather than `decimal`.
const QUANTITY_LINK_IDS = new Set(["lab.creatinine.value", "lab.egfr.value", "lab.alp.timesULN"]);

const ACUTE = "ACUTE_ASSESSMENT_REQUIRED";
const ACC = "ACC_PATHWAY";
const NONE = "NO_NATIONAL_REDIRECT";

export const scenarios = [
  // ---- One scenario per red flag firing -----------------------------------
  {
    id: "RF-S01-massive-haemoptysis",
    title: "RF-01 CT Chest p12: life threatening massive haemoptysis -> acute assessment, no imaging",
    note: "58M coughing large volumes of fresh blood, at risk of asphyxiation. Requesting CT chest.",
    answers: { "redflag.haemoptysisMassive": { v: true, status: "documented", quote: "coughing large volumes of fresh blood, at risk of asphyxiation" } },
    expect: { determination: ACUTE, fired: 1, trace: { rf01MassiveHaemoptysis: true }, indeterminate: 0, missing: [] }
  },
  {
    id: "RF-S02-stridor-svc",
    title: "RF-02 CT Chest p12: stridor / suspected SVC obstruction",
    answers: { "redflag.stridorOrSvcObstruction": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf02StridorOrSvcObstruction: true } }
  },
  {
    id: "RF-S03-renal-colic-creatinine",
    title: "RF-03 CT KUB p25: acute renal colic with creatinine above 160 (REVIEW Q7 - published unit is 'mmol/L' at p25 and 'micromol/L' at p55)",
    answers: {
      "redflag.renalColicAcuteEpisode": true,
      "lab.creatinine.value": 184
    },
    expect: { determination: ACUTE, fired: 1, trace: { rf03RenalColicWithRedFlag: true }, indeterminate: 0 }
  },
  {
    id: "RF-S03b-renal-colic-temperature",
    title: "RF-03 CT KUB p25: acute renal colic with temperature above 38 - a different qualifying sub-bullet of the same flag",
    answers: {
      "redflag.renalColicAcuteEpisode": true,
      "symptom.temperatureCelsius": 38.6
    },
    expect: { determination: ACUTE, fired: 1, trace: { rf03RenalColicWithRedFlag: true } }
  },
  {
    id: "RF-S03c-renal-colic-solitary-kidney",
    title: "RF-03 CT KUB p25: acute renal colic, solitary kidney, peritonitis and known bilateral ureteric stones all documented",
    answers: {
      "redflag.renalColicAcuteEpisode": true,
      "redflag.solitaryKidney": true,
      "redflag.peritonitisOrSepsisSigns": true,
      "redflag.knownBilateralUretericStones": true
    },
    expect: { determination: ACUTE, fired: 1, trace: { rf03RenalColicWithRedFlag: true } }
  },
  {
    id: "RF-S04-rhinosinusitis-red-flags",
    title: "RF-04 CT Sinus p28: rhinosinusitis with severe frontal headache, severe systemic symptoms and altered visual acuity",
    answers: {
      "redflag.rhinosinusitisSymptoms": true,
      "redflag.severeFrontalHeadache": true,
      "redflag.severeSystemicSymptoms": true,
      "redflag.alteredVisualAcuityOrDiplopia": true
    },
    expect: { determination: ACUTE, fired: 1, trace: { rf04RhinosinusitisRedFlags: true } }
  },
  {
    id: "RF-S05-cholecystitis",
    title: "RF-05 US Abdomen p30: suspected acute cholecystitis or cholangitis ('especially if accompanied by fever, persistent vomiting' is a modifier and is not required)",
    answers: { "redflag.cholecystitisOrCholangitis": true, "symptom.fever": false },
    expect: { determination: ACUTE, fired: 1, trace: { rf05CholecystitisOrCholangitis: true } }
  },
  {
    id: "RF-S06-acute-abdomen",
    title: "RF-06 US Abdomen p30 / X-ray Abdomen p60 / X-ray Abdomen Paediatric p91: acute abdomen (REVIEW Q6 - one concept across three sites)",
    answers: { "redflag.acuteAbdomen": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf06AcuteAbdomen: true } }
  },
  {
    id: "RF-S07-ruptured-aaa",
    title: "RF-07 US Abdomen p30: suspicion of ruptured abdominal aortic aneurysm",
    note: "74M sudden severe central abdominal pain radiating to back, pulsatile mass, shocked.",
    answers: { "redflag.rupturedAAA": { v: true, status: "documented", quote: "pulsatile mass, shocked" } },
    expect: { determination: ACUTE, fired: 1, trace: { rf07RupturedAAA: true } }
  },
  {
    id: "RF-S08-testicular-torsion",
    title: "RF-08 US Abdomen p30 / US Scrotum p56 / US Scrotum Paediatric p86: suspected testicular torsion",
    answers: { "redflag.testicularTorsion": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf08TesticularTorsion: true } }
  },
  {
    id: "RF-S09-painful-jaundice",
    title: "RF-09 US Abdomen p30: painful jaundice (contrast: 'painless jaundice without obvious cause' is Acute within 48 hours, p30, and must not fire this)",
    answers: { "redflag.painfulJaundice": true, "symptom.jaundice": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf09PainfulJaundice: true } }
  },
  {
    id: "RF-S10-tia-high-risk",
    title: "RF-10 US Carotid p34: suspected TIA with a high seven day stroke risk",
    answers: { "redflag.suspectedTIA": true, "redflag.highSevenDayStrokeRisk": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf10TiaHighRiskOrDissection: true }, indeterminate: 0 }
  },
  {
    id: "RF-S10b-tia-dissection",
    title: "RF-10 US Carotid p34: suspected TIA with associated neck pain (possible arterial dissection)",
    answers: { "redflag.suspectedTIA": true, "redflag.highSevenDayStrokeRisk": false, "redflag.tiaWithNeckPainOrHeadache": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf10TiaHighRiskOrDissection: true } }
  },
  {
    id: "RF-S11-unstable-gynae",
    title: "RF-11 US Pelvis p44: clinically unstable patient with suspected gynaecologic or pelvic cause",
    answers: { "redflag.clinicallyUnstableGynaePelvicCause": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf11UnstableGynaePelvicCause: true } }
  },
  {
    id: "RF-S12-pyelonephritis",
    title: "RF-12 US Renal p52: pyelonephritis with fever >38, pyuria, loin pain and flank pain persisting on antibiotics (REVIEW Q22 - the row reads 'Consider admission or seek advice')",
    answers: {
      "redflag.pyelonephritisSuspected": true,
      "symptom.temperatureCelsius": 38.9,
      "lab.pyuriaOnMicroscopy": true,
      "redflag.loinPainOrTenderness": true,
      "redflag.notRespondingToAntibiotics72h": false,
      "redflag.flankPainPersistingOnAntibiotics": true
    },
    expect: { determination: ACUTE, fired: 1, trace: { rf12Pyelonephritis: true }, indeterminate: 0, missing: [] }
  },
  {
    id: "RF-S13-inguinal-hernia",
    title: "RF-13 US Scrotum p56 / US Scrotum Paediatric p86 / US Soft Tissue Paediatric p87: strangulated or incarcerated inguinal hernia",
    answers: { "redflag.strangulatedOrIncarceratedInguinalHernia": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf13InguinalHernia: true } }
  },
  {
    id: "RF-S14-haemoptysis-red-flags",
    title: "RF-14 X-ray Chest p62: haemoptysis with a significant volume (REVIEW Q8 - the 20 ml / 100 ml figures are 'e.g.' and are not encoded as thresholds)",
    answers: {
      "redflag.haemoptysisPresent": true,
      "redflag.haemoptysisSignificantVolume": true,
      "redflag.haemodynamicallyUnstable": false,
      "redflag.hoarsenessOrStridorWithHaemoptysis": false,
      "redflag.acuteDyspnoeaOrChestPain": false
    },
    expect: { determination: ACUTE, fired: 1, trace: { rf14HaemoptysisWithRedFlags: true }, indeterminate: 0 }
  },
  {
    id: "RF-S14b-haemoptysis-other-qualifiers",
    title: "RF-14 X-ray Chest p62: haemoptysis with haemodynamic instability, hoarseness/stridor and acute dyspnoea - the other three qualifying features",
    answers: {
      "redflag.haemoptysisPresent": true,
      "redflag.haemoptysisSignificantVolume": false,
      "redflag.haemodynamicallyUnstable": true,
      "redflag.hoarsenessOrStridorWithHaemoptysis": true,
      "redflag.acuteDyspnoeaOrChestPain": true
    },
    expect: { determination: ACUTE, fired: 1, trace: { rf14HaemoptysisWithRedFlags: true } }
  },
  {
    id: "RF-S15-severe-respiratory-distress",
    title: "RF-15 X-ray Chest p62: severe respiratory distress",
    answers: { "redflag.severeRespiratoryDistress": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf15SevereRespiratoryDistress: true } }
  },
  {
    id: "RF-S16-large-pneumothorax",
    title: "RF-16 X-ray Chest p62: suspected LARGE pneumothorax with significant pain, breathlessness, tachycardia",
    answers: { "redflag.pneumothoraxLarge": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf16LargePneumothorax: true } }
  },
  {
    id: "RF-S17-active-tb",
    title: "RF-17 X-ray Chest p62: suspected active tuberculosis and the patient is acutely unwell",
    answers: { "redflag.activeTbAcutelyUnwell": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf17ActiveTbAcutelyUnwell: true } }
  },
  {
    id: "RF-S18-septic-arthritis",
    title: "RF-18 X-ray Shoulder/Upper Limb p66, X-ray Pelvis-Hip/Lower Limb p69, and paediatric limb sites pp.95/97/99: suspected septic arthritis",
    answers: { "redflag.septicArthritis": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf18SepticArthritis: true } }
  },
  {
    id: "RF-S19-spinal-infection",
    title: "RF-19 X-ray Spine p72: suspected spinal infection (REVIEW Q9 - 'e.g.' governs the feature list, so suspicion alone fires; the features are still reported)",
    note: "63M back pain, febrile, treated for cellulitis last month, on prednisone.",
    answers: {
      "redflag.spinalInfectionSuspected": true,
      "symptom.backPain": true,
      "symptom.fever": true,
      "redflag.recentInfectionHistory": true,
      "redflag.ivDrugUse": false,
      "redflag.immunosuppression": true
    },
    expect: {
      determination: ACUTE,
      fired: 1,
      trace: { rf19SpinalInfection: true, rf19IllustrativeFeatures: ["symptom.backPain", "symptom.fever", "redflag.recentInfectionHistory", "redflag.immunosuppression"] }
    }
  },
  {
    id: "RF-S20-cauda-equina",
    title: "RF-20 X-ray Spine p72: acute back pain with saddle anaesthesia and loss of bowel/bladder control ('i.e.' defines the condition, so the composition IS the rule)",
    note: "41F sudden severe low back pain, numb perineum, cannot pass urine since this morning.",
    answers: {
      "symptom.backPain": { v: true, status: "documented", quote: "sudden severe low back pain" },
      "redflag.backPainAcuteOnset": { v: true, status: "documented", quote: "sudden severe low back pain" },
      "redflag.sphincterDisturbance": false,
      "redflag.gaitDisturbance": false,
      "redflag.saddleAnaesthesia": { v: true, status: "documented", quote: "numb perineum" },
      "redflag.bowelOrBladderIncontinence": { v: true, status: "documented", quote: "cannot pass urine since this morning" },
      "redflag.abnormalReflexesOrLegWeakness": false
    },
    expect: { determination: ACUTE, fired: 1, trace: { rf20CaudaEquina: true }, indeterminate: 0, missing: [] }
  },
  {
    id: "RF-S20b-cauda-equina-other-qualifiers",
    title: "RF-20 X-ray Spine p72: acute back pain with sphincter disturbance, gait disturbance and abnormal reflexes - the other three qualifying features",
    answers: {
      "symptom.backPain": true,
      "redflag.backPainAcuteOnset": true,
      "redflag.sphincterDisturbance": true,
      "redflag.gaitDisturbance": true,
      "redflag.saddleAnaesthesia": false,
      "redflag.bowelOrBladderIncontinence": false,
      "redflag.abnormalReflexesOrLegWeakness": true
    },
    expect: { determination: ACUTE, fired: 1, trace: { rf20CaudaEquina: true } }
  },
  {
    id: "RF-S21-paed-acute-abdominal-pain",
    title: "RF-21 US Abdomen Paediatric p76: acute abdominal pain or pyloric stenosis including possible appendicitis (REVIEW Q6 - kept separate from RF-06)",
    answers: { "patient.age": 6, "redflag.paedAcuteAbdominalPainOrPyloricStenosis": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf21PaedAcuteAbdominalPain: true } }
  },
  {
    id: "RF-S22-paed-gynae",
    title: "RF-22 US Pelvis Paediatric p82: child acutely unwell from a suspected gynaecological cause",
    answers: { "patient.age": 13, "redflag.paedAcutelyUnwellGynaeCause": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf22PaedGynaeCause: true } }
  },
  {
    id: "RF-S23-paed-uti-under-3-months",
    title: "RF-23 US Renal Paediatric p83: UTI in an infant younger than 3 months (REVIEW Q12 - needs patient.ageMonths; patient.age in years cannot express it)",
    answers: { "patient.age": 0, "patient.ageMonths": 2, "redflag.paedUti": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf23PaedUti: true }, indeterminate: 0 }
  },
  {
    id: "RF-S23b-paed-uti-anatomical-abnormality",
    title: "RF-23 US Renal Paediatric p83: UTI in an infant of 5 months with a known urinary tract anatomical abnormality",
    answers: { "patient.ageMonths": 5, "redflag.paedUti": true, "redflag.paedKnownUrinaryTractAnatomicalAbnormality": true, "redflag.paedSeriouslyUnwell": false },
    expect: { determination: ACUTE, fired: 1, trace: { rf23PaedUti: true } }
  },
  {
    id: "RF-S23c-paed-uti-seriously-unwell",
    title: "RF-23 US Renal Paediatric p83: UTI in a 4-year-old who is seriously unwell (e.g. with sepsis) - age is not a bar",
    answers: { "patient.age": 4, "patient.ageMonths": 52, "redflag.paedUti": true, "redflag.paedKnownUrinaryTractAnatomicalAbnormality": false, "redflag.paedSeriouslyUnwell": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf23PaedUti: true } }
  },
  {
    id: "RF-S24-paed-haematuria",
    title: "RF-24 US Renal Paediatric p83: haematuria with hypertension, heavy proteinuria, oedema and impaired renal function",
    answers: {
      "patient.age": 9,
      "symptom.haematuria": true,
      "redflag.hypertension": true,
      "redflag.heavyProteinuria": true,
      "redflag.oedema": true,
      "redflag.impairedRenalFunction": true
    },
    expect: { determination: ACUTE, fired: 1, trace: { rf24PaedHaematuria: true }, indeterminate: 0 }
  },
  {
    id: "RF-S25-paed-abscess",
    title: "RF-25 US Soft Tissue Paediatric p87: suspected abscess and hospital management considered necessary ('especially if red flags' is a modifier and is not required)",
    answers: { "patient.age": 2, "redflag.paedAbscessSuspected": true, "redflag.paedHospitalManagementConsideredNecessary": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf25PaedAbscess: true }, indeterminate: 0 }
  },
  {
    id: "RF-S26-paed-soft-tissue-mass",
    title: "RF-26 US Soft Tissue Paediatric p87: soft tissue mass with suspicious features",
    answers: { "patient.age": 7, "redflag.paedSoftTissueMassSuspiciousFeatures": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf26PaedSoftTissueMass: true } }
  },
  {
    id: "RF-S27-paed-button-battery",
    title: "RF-27 X-ray Abdomen Paediatric p91: foreign body ingestion, known button battery",
    note: "3yo, witnessed swallowing a coin-shaped battery from a remote 1 hour ago.",
    answers: {
      "patient.age": 3,
      "redflag.paedForeignBodyIngestionHistory": { v: true, status: "documented", quote: "witnessed swallowing a coin-shaped battery" },
      "redflag.paedFbOesophagealObstruction": false,
      "redflag.paedFbButtonBattery": { v: true, status: "documented", quote: "coin-shaped battery from a remote" },
      "redflag.paedFbMultipleMagnets": false,
      "redflag.paedFbLargeObject": false
    },
    expect: { determination: ACUTE, fired: 1, trace: { rf27PaedForeignBody: true }, indeterminate: 0, missing: [] }
  },
  {
    id: "RF-S27b-paed-fb-other-qualifiers",
    title: "RF-27 X-ray Abdomen Paediatric p91: foreign body ingestion with oesophageal obstruction, multiple magnets and a large object - the other three qualifying features",
    answers: {
      "patient.age": 4,
      "redflag.paedForeignBodyIngestionHistory": true,
      "redflag.paedFbOesophagealObstruction": true,
      "redflag.paedFbButtonBattery": false,
      "redflag.paedFbMultipleMagnets": true,
      "redflag.paedFbLargeObject": true
    },
    expect: { determination: ACUTE, fired: 1, trace: { rf27PaedForeignBody: true } }
  },
  {
    id: "RF-S28-paed-respiratory-compromise",
    title: "RF-28 X-ray Chest Paediatric p93: respiratory distress, hypoxia, acute severe asthma and suspected inhaled foreign body - all four alternatives",
    answers: {
      "patient.age": 5,
      "redflag.paedRespiratoryDistress": true,
      "redflag.paedBreathingDifficultyWithHypoxia": true,
      "redflag.paedAcuteSevereAsthma": true,
      "redflag.paedInhaledForeignBody": true
    },
    expect: { determination: ACUTE, fired: 1, trace: { rf28PaedRespiratoryCompromise: true } }
  },
  {
    id: "RF-S29-osteomyelitis",
    title: "RF-29 X-ray Pelvis/Hip Paediatric p99: suspected osteomyelitis (REVIEW Q6 - published in the same bullet as septic arthritis at one site only)",
    answers: { "patient.age": 8, "redflag.osteomyelitis": true, "redflag.septicArthritis": false },
    expect: { determination: ACUTE, fired: 1, trace: { rf29Osteomyelitis: true, rf18SepticArthritis: false } }
  },
  {
    id: "RF-S30-sufe",
    title: "RF-30 X-ray Pelvis/Hip Paediatric p99: suspected SUFE (REVIEW Q24 - the same site also lists non-acute suspected SUFE as an Acute-24h imaging indication)",
    answers: { "patient.age": 12, "redflag.sufe": true },
    expect: { determination: ACUTE, fired: 1, trace: { rf30Sufe: true } }
  },

  // ---- ACC redirect --------------------------------------------------------
  {
    id: "RF-S31-acc-trauma",
    title: "ACC redirect (Overview p4 scope item 3; X-ray Spine p73): recent trauma mechanism is the primary cause -> ACC, not CRR. No red flag present.",
    note: "34M fell off a ladder yesterday, ongoing thoracic back pain. Requesting spine x-ray.",
    answers: {
      "funding.accTrauma": { v: true, status: "documented", quote: "fell off a ladder yesterday" },
      "symptom.backPain": { v: true, status: "documented", quote: "ongoing thoracic back pain" },
      "redflag.backPainAcuteOnset": false,
      "redflag.spinalInfectionSuspected": false
    },
    expect: { determination: ACC, fired: 0, trace: { accTrauma: true }, indeterminate: 0, missing: [] }
  },

  // ---- Behavioural scenarios ----------------------------------------------
  {
    id: "RF-S32-fall-through",
    title: "Fall-through: an ordinary CT CAP referral with no red flag and no ACC mechanism -> evaluation continues to the exam library, and the national library says nothing",
    note: "62M. 4/12 unintentional weight loss 84kg -> 77kg on scales. Exam NAD, no masses. Bloods/UA/CXR done. Strongly suspect occult malignancy.",
    answers: {
      "patient.age": 62,
      "funding.accTrauma": { v: false, status: "documented", quote: "no history of injury" },
      "redflag.acuteAbdomen": { v: false, status: "documented", quote: "Exam NAD, no masses" }
    },
    expect: { determination: NONE, fired: 0, indeterminate: 0, missing: [], trace: { rf06AcuteAbdomen: false, accTrauma: false } }
  },
  {
    id: "RF-S33-fall-through-silent-note",
    title: "Fall-through: a note that mentions no red-flag concept at all. Every flag is null; the library must stay silent rather than list thirty unanswered flags (REVIEW Q20).",
    note: "55F 6/12 unintentional weight loss, CRP raised and Hb low on repeat testing. Requesting CT CAP.",
    answers: { "patient.age": 55 },
    expect: { determination: NONE, fired: 0, indeterminate: 0, missing: [] }
  },
  {
    id: "RF-S34-inferred-under-strict",
    title: "REVIEW Q21 SAFETY CASE: the extraction step infers cauda equina from 'legs feel odd, difficulty on the toilet' and labels it inferred. Under the strict documentation standard the flag does NOT fire - but because the inferred answers become null rather than false, the flag lands INDETERMINATE and the two linkIds are asked for, so the concern is surfaced rather than silently dropped. Under the inferred standard it fires.",
    note: "44M low back pain since Saturday. Legs feel odd. Difficulty on the toilet.",
    answers: {
      "symptom.backPain": { v: true, status: "documented", quote: "low back pain since Saturday" },
      "redflag.backPainAcuteOnset": { v: true, status: "documented", quote: "since Saturday" },
      "redflag.saddleAnaesthesia": { v: true, status: "inferred", quote: "Legs feel odd" },
      "redflag.bowelOrBladderIncontinence": { v: true, status: "inferred", quote: "Difficulty on the toilet" },
      "redflag.sphincterDisturbance": false,
      "redflag.gaitDisturbance": false,
      "redflag.abnormalReflexesOrLegWeakness": false
    },
    expect: {
      determination: NONE,
      fired: 0,
      trace: { rf20CaudaEquina: null },
      indeterminate: 1,
      missing: ["redflag.saddleAnaesthesia", "redflag.bowelOrBladderIncontinence"],
      inferredExcluded: ["redflag.saddleAnaesthesia", "redflag.bowelOrBladderIncontinence"]
    },
    expectInferredMode: { determination: ACUTE, fired: 1, trace: { rf20CaudaEquina: true } }
  },
  {
    id: "RF-S35-indeterminate-compound",
    title: "Indeterminate compound flag: haemoptysis is documented but none of the four qualifying features is answered -> not fired, reported as indeterminate, and the four linkIds are asked for",
    note: "67M coughing up blood for a week. Ex-smoker. Requesting CXR.",
    answers: { "redflag.haemoptysisPresent": { v: true, status: "documented", quote: "coughing up blood for a week" } },
    expect: {
      determination: NONE,
      fired: 0,
      trace: { rf14HaemoptysisWithRedFlags: null },
      indeterminate: 1,
      missing: ["redflag.haemoptysisSignificantVolume", "redflag.haemodynamicallyUnstable", "redflag.hoarsenessOrStridorWithHaemoptysis", "redflag.acuteDyspnoeaOrChestPain"]
    }
  },
  {
    id: "RF-S36-small-pneumothorax-must-not-fire",
    title: "Finding F-02: 'Suspected small pneumothorax' is an Acute-within-48-hours X-ray Chest indication (p63), NOT a red flag. System prompt v2.3.0 redirects it to ED. It must fall through to the exam library.",
    note: "26M sudden pleuritic chest pain, mild SOB, vitals normal. ?small pneumothorax. Requesting CXR.",
    answers: {
      "redflag.pneumothoraxLarge": { v: false, status: "documented", quote: "mild SOB, vitals normal" },
      "redflag.severeRespiratoryDistress": { v: false, status: "documented", quote: "vitals normal" }
    },
    expect: { determination: NONE, fired: 0, trace: { rf16LargePneumothorax: false, rf15SevereRespiratoryDistress: false }, indeterminate: 0, missing: [] }
  },
  {
    id: "RF-S37-red-flag-outranks-acc",
    title: "REVIEW Q1 precedence: a trauma mechanism AND a red flag. Clinical safety is encoded as outranking funding, so the determination is ACUTE_ASSESSMENT_REQUIRED, not ACC_PATHWAY.",
    note: "29M motorcycle crash this morning, now cannot pass urine, saddle numbness.",
    answers: {
      "funding.accTrauma": { v: true, status: "documented", quote: "motorcycle crash this morning" },
      "symptom.backPain": true,
      "redflag.backPainAcuteOnset": true,
      "redflag.saddleAnaesthesia": { v: true, status: "documented", quote: "saddle numbness" },
      "redflag.bowelOrBladderIncontinence": { v: true, status: "documented", quote: "cannot pass urine" }
    },
    expect: { determination: ACUTE, fired: 1, trace: { rf20CaudaEquina: true, accTrauma: true } }
  },
  {
    id: "RF-S38-thunderclap-headache-has-no-flag",
    title: "Finding F-01: 'worst headache of my life' is a red flag in system prompt v2.3.0 STEP 0(a) but appears NOWHERE in the published criteria - CT Head Adult (pp.20-22) has no acute-assessment row. The national library has no indicator for it and must fall through.",
    note: "48F sudden worst headache of her life 2 hours ago, now settling. Requesting CT head.",
    answers: { "patient.age": 48 },
    expect: { determination: NONE, fired: 0, indeterminate: 0, missing: [] }
  }
];

// ---- FHIR builders -------------------------------------------------------

function answerFor(linkId, a) {
  const raw = (a !== null && typeof a === "object" && "v" in a) ? a : { v: a };
  const v = raw.v;
  let ans;
  if (linkId === "patient.sex") ans = { valueCoding: { system: "http://hl7.org/fhir/administrative-gender", code: v } };
  else if (typeof v === "boolean") ans = { valueBoolean: v };
  else if (linkId === "patient.age") ans = { valueInteger: v };
  else if (QUANTITY_LINK_IDS.has(linkId)) ans = { valueQuantity: { value: v } };
  else if (typeof v === "number") ans = { valueDecimal: v };
  else if (typeof v === "string") ans = { valueString: v };
  else throw new Error("unsupported answer for " + linkId);
  if (raw.status) {
    ans.extension = [{
      url: EVIDENCE_URL,
      extension: [
        { url: "status", valueCode: raw.status },
        ...(raw.quote ? [{ url: "quote", valueString: raw.quote }] : [])
      ]
    }];
  }
  return ans;
}

export function toQuestionnaireResponse(s) {
  const groups = {};
  for (const [linkId, a] of Object.entries(s.answers)) {
    const g = linkId.split(".")[0];
    (groups[g] ||= []).push({ linkId, answer: [answerFor(linkId, a)] });
  }
  return {
    resourceType: "QuestionnaireResponse",
    id: "qr-" + s.id,
    questionnaire: "http://crr.health.nz/fhir/Questionnaire/CRR-National",
    status: "completed",
    subject: { reference: "Patient/" + s.id },
    authored: "2026-09-05",
    item: Object.entries(groups).map(([g, items]) => ({ linkId: g, item: items }))
  };
}

export function toBundle(list) {
  return {
    resourceType: "Bundle",
    type: "collection",
    entry: list.flatMap(s => [
      { resource: { resourceType: "Patient", id: s.id } },
      { resource: toQuestionnaireResponse(s) }
    ])
  };
}
