# CRR_RedFlags - scenario results

| Scenario | Run | Determination | Fired | Indeterminate | Missing information | Result |
|---|---|---|---|---|---|---|
| RF-S01-massive-haemoptysis | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S02-stridor-svc | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S03-renal-colic-creatinine | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S03b-renal-colic-temperature | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S03c-renal-colic-solitary-kidney | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S04-rhinosinusitis-red-flags | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S05-cholecystitis | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S06-acute-abdomen | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S07-ruptured-aaa | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S08-testicular-torsion | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S09-painful-jaundice | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S10-tia-high-risk | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S10b-tia-dissection | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S11-unstable-gynae | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S12-pyelonephritis | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S13-inguinal-hernia | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S14-haemoptysis-red-flags | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S14b-haemoptysis-other-qualifiers | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S15-severe-respiratory-distress | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S16-large-pneumothorax | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S17-active-tb | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S18-septic-arthritis | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S19-spinal-infection | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 1 | redflag.backPainAcuteOnset, redflag.sphincterDisturbance, redflag.gaitDisturbance, redflag.saddleAnaesthesia, redflag.bowelOrBladderIncontinence, redflag.abnormalReflexesOrLegWeakness | PASS |
| RF-S20-cauda-equina | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S20b-cauda-equina-other-qualifiers | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S21-paed-acute-abdominal-pain | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S22-paed-gynae | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S23-paed-uti-under-3-months | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S23b-paed-uti-anatomical-abnormality | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S23c-paed-uti-seriously-unwell | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S24-paed-haematuria | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S25-paed-abscess | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S26-paed-soft-tissue-mass | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S27-paed-button-battery | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S27b-paed-fb-other-qualifiers | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S28-paed-respiratory-compromise | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S29-osteomyelitis | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S30-sufe | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S31-acc-trauma | strict | ACC_PATHWAY | 0 | 0 | - | PASS |
| RF-S32-fall-through | strict | NO_NATIONAL_REDIRECT | 0 | 0 | - | PASS |
| RF-S33-fall-through-silent-note | strict | NO_NATIONAL_REDIRECT | 0 | 0 | - | PASS |
| RF-S34-inferred-under-strict | strict | NO_NATIONAL_REDIRECT | 0 | 1 | redflag.saddleAnaesthesia, redflag.bowelOrBladderIncontinence | PASS |
| RF-S34-inferred-under-strict | inferred | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S35-indeterminate-compound | strict | NO_NATIONAL_REDIRECT | 0 | 1 | redflag.haemoptysisSignificantVolume, redflag.haemodynamicallyUnstable, redflag.hoarsenessOrStridorWithHaemoptysis, redflag.acuteDyspnoeaOrChestPain | PASS |
| RF-S36-small-pneumothorax-must-not-fire | strict | NO_NATIONAL_REDIRECT | 0 | 0 | - | PASS |
| RF-S37-red-flag-outranks-acc | strict | ACUTE_ASSESSMENT_REQUIRED | 1 | 0 | - | PASS |
| RF-S38-thunderclap-headache-has-no-flag | strict | NO_NATIONAL_REDIRECT | 0 | 0 | - | PASS |

## Full advisory output per scenario

### RF-S01-massive-haemoptysis (strict)

RF-01 CT Chest p12: life threatening massive haemoptysis -> acute assessment, no imaging

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Life threatening, massive haemoptysis - patient is at high risk of asphyxiation or exsanguination (CT Chest - Adult, p12)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": true,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S02-stridor-svc (strict)

RF-02 CT Chest p12: stridor / suspected SVC obstruction

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Stridor / suspected SVC obstruction (CT Chest - Adult, p12)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": true,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S03-renal-colic-creatinine (strict)

RF-03 CT KUB p25: acute renal colic with creatinine above 160 (REVIEW Q7 - published unit is 'mmol/L' at p25 and 'micromol/L' at p55)

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Acute episode of suspected renal colic with a red flag (CT KUB - Adult, p25)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": true,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S03b-renal-colic-temperature (strict)

RF-03 CT KUB p25: acute renal colic with temperature above 38 - a different qualifying sub-bullet of the same flag

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Acute episode of suspected renal colic with a red flag (CT KUB - Adult, p25)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": true,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S03c-renal-colic-solitary-kidney (strict)

RF-03 CT KUB p25: acute renal colic, solitary kidney, peritonitis and known bilateral ureteric stones all documented

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Acute episode of suspected renal colic with a red flag (CT KUB - Adult, p25)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": true,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S04-rhinosinusitis-red-flags (strict)

RF-04 CT Sinus p28: rhinosinusitis with severe frontal headache, severe systemic symptoms and altered visual acuity

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Rhinosinusitis symptoms associated with red flags for intracranial or orbital pathology (CT Sinus - Adult, p28)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": true,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S05-cholecystitis (strict)

RF-05 US Abdomen p30: suspected acute cholecystitis or cholangitis ('especially if accompanied by fever, persistent vomiting' is a modifier and is not required)

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspected acute cholecystitis or cholangitis (US Abdomen - Adult, p30)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": true,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S06-acute-abdomen (strict)

RF-06 US Abdomen p30 / X-ray Abdomen p60 / X-ray Abdomen Paediatric p91: acute abdomen (REVIEW Q6 - one concept across three sites)

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Acute abdomen (US Abdomen - Adult p30; X-ray Abdomen - Adult p60; X-ray Abdomen - Paediatric p91)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": true,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S07-ruptured-aaa (strict)

RF-07 US Abdomen p30: suspicion of ruptured abdominal aortic aneurysm

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspicion of ruptured abdominal aortic aneurysm (US Abdomen - Adult, p30)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": true,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S08-testicular-torsion (strict)

RF-08 US Abdomen p30 / US Scrotum p56 / US Scrotum Paediatric p86: suspected testicular torsion

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspected testicular torsion (US Abdomen - Adult p30; US Scrotum / Testis p56; US Scrotum/Testis - Paediatric p86)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": true,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S09-painful-jaundice (strict)

RF-09 US Abdomen p30: painful jaundice (contrast: 'painless jaundice without obvious cause' is Acute within 48 hours, p30, and must not fire this)

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Painful jaundice (US Abdomen - Adult, p30)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": true,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S10-tia-high-risk (strict)

RF-10 US Carotid p34: suspected TIA with a high seven day stroke risk

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspected TIA with a high seven day stroke risk or associated neck pain or headache (US Carotid - Adult, p34)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": true,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S10b-tia-dissection (strict)

RF-10 US Carotid p34: suspected TIA with associated neck pain (possible arterial dissection)

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspected TIA with a high seven day stroke risk or associated neck pain or headache (US Carotid - Adult, p34)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": true,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S11-unstable-gynae (strict)

RF-11 US Pelvis p44: clinically unstable patient with suspected gynaecologic or pelvic cause

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Clinically unstable patient with suspected gynaecologic or pelvic cause (US Pelvis - Adult, p44)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": true,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S12-pyelonephritis (strict)

RF-12 US Renal p52: pyelonephritis with fever >38, pyuria, loin pain and flank pain persisting on antibiotics (REVIEW Q22 - the row reads 'Consider admission or seek advice')

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Pyelonephritis not responding to antibiotics or with persisting flank pain - consider admission or seek advice (US Renal - Adult, p52)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": true,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S13-inguinal-hernia (strict)

RF-13 US Scrotum p56 / US Scrotum Paediatric p86 / US Soft Tissue Paediatric p87: strangulated or incarcerated inguinal hernia

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Strangulated or incarcerated inguinal hernia (US Scrotum / Testis p56; US Scrotum/Testis - Paediatric p86; US Soft Tissue Mass - Paediatric p87)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": true,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S14-haemoptysis-red-flags (strict)

RF-14 X-ray Chest p62: haemoptysis with a significant volume (REVIEW Q8 - the 20 ml / 100 ml figures are 'e.g.' and are not encoded as thresholds)

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Haemoptysis with red flags (X-ray Chest - Adult, p62)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": true,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S14b-haemoptysis-other-qualifiers (strict)

RF-14 X-ray Chest p62: haemoptysis with haemodynamic instability, hoarseness/stridor and acute dyspnoea - the other three qualifying features

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Haemoptysis with red flags (X-ray Chest - Adult, p62)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": true,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S15-severe-respiratory-distress (strict)

RF-15 X-ray Chest p62: severe respiratory distress

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Severe respiratory distress (X-ray Chest - Adult, p62)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": true,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S16-large-pneumothorax (strict)

RF-16 X-ray Chest p62: suspected LARGE pneumothorax with significant pain, breathlessness, tachycardia

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspected large pneumothorax with significant pain, breathlessness, tachycardia (X-ray Chest - Adult, p62)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": true,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S17-active-tb (strict)

RF-17 X-ray Chest p62: suspected active tuberculosis and the patient is acutely unwell

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspected active tuberculosis and the patient is acutely unwell (X-ray Chest - Adult, p62)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": true,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S18-septic-arthritis (strict)

RF-18 X-ray Shoulder/Upper Limb p66, X-ray Pelvis-Hip/Lower Limb p69, and paediatric limb sites pp.95/97/99: suspected septic arthritis

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspected septic arthritis (X-ray Shoulder and Upper Limb p66; X-ray Pelvis/Hip and Lower Limb p69; and the paediatric limb sites pp.95, 97, 99)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": true,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S19-spinal-infection (strict)

RF-19 X-ray Spine p72: suspected spinal infection (REVIEW Q9 - 'e.g.' governs the feature list, so suspicion alone fires; the features are still reported)

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspected spinal infection - seek acute orthopaedic advice (X-ray Spine - Adult, p72)"
  ],
  "indeterminateRedFlags": [
    "RF-20 Suspected cauda equina syndrome (X-ray Spine - Adult, p72)"
  ],
  "missingInformation": [
    "redflag.backPainAcuteOnset",
    "redflag.sphincterDisturbance",
    "redflag.gaitDisturbance",
    "redflag.saddleAnaesthesia",
    "redflag.bowelOrBladderIncontinence",
    "redflag.abnormalReflexesOrLegWeakness"
  ],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": true,
    "rf19IllustrativeFeatures": [
      "symptom.backPain",
      "symptom.fever",
      "redflag.recentInfectionHistory",
      "redflag.immunosuppression"
    ],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S20-cauda-equina (strict)

RF-20 X-ray Spine p72: acute back pain with saddle anaesthesia and loss of bowel/bladder control ('i.e.' defines the condition, so the composition IS the rule)

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspicion of cauda equina syndrome (X-ray Spine - Adult, p72)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [
      "symptom.backPain"
    ],
    "rf20CaudaEquina": true,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S20b-cauda-equina-other-qualifiers (strict)

RF-20 X-ray Spine p72: acute back pain with sphincter disturbance, gait disturbance and abnormal reflexes - the other three qualifying features

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspicion of cauda equina syndrome (X-ray Spine - Adult, p72)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [
      "symptom.backPain"
    ],
    "rf20CaudaEquina": true,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S21-paed-acute-abdominal-pain (strict)

RF-21 US Abdomen Paediatric p76: acute abdominal pain or pyloric stenosis including possible appendicitis (REVIEW Q6 - kept separate from RF-06)

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Acute abdominal pain or pyloric stenosis including possible appendicitis - request acute paediatric assessment (US Abdomen - Paediatric, p76)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": true,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S22-paed-gynae (strict)

RF-22 US Pelvis Paediatric p82: child acutely unwell from a suspected gynaecological cause

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Child acutely unwell from a suspected gynaecological cause (US Pelvis - Paediatric, p82)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": true,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S23-paed-uti-under-3-months (strict)

RF-23 US Renal Paediatric p83: UTI in an infant younger than 3 months (REVIEW Q12 - needs patient.ageMonths; patient.age in years cannot express it)

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "UTI in a child under 3 months, under 6 months with a known urinary tract anatomical abnormality, or seriously unwell (US Renal - Paediatric, p83)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": true,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S23b-paed-uti-anatomical-abnormality (strict)

RF-23 US Renal Paediatric p83: UTI in an infant of 5 months with a known urinary tract anatomical abnormality

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "UTI in a child under 3 months, under 6 months with a known urinary tract anatomical abnormality, or seriously unwell (US Renal - Paediatric, p83)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": true,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S23c-paed-uti-seriously-unwell (strict)

RF-23 US Renal Paediatric p83: UTI in a 4-year-old who is seriously unwell (e.g. with sepsis) - age is not a bar

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "UTI in a child under 3 months, under 6 months with a known urinary tract anatomical abnormality, or seriously unwell (US Renal - Paediatric, p83)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": true,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S24-paed-haematuria (strict)

RF-24 US Renal Paediatric p83: haematuria with hypertension, heavy proteinuria, oedema and impaired renal function

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Haematuria associated with hypertension, heavy proteinuria, oedema or impaired renal function (US Renal - Paediatric, p83)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": true,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S25-paed-abscess (strict)

RF-25 US Soft Tissue Paediatric p87: suspected abscess and hospital management considered necessary ('especially if red flags' is a modifier and is not required)

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspected abscess and hospital management considered necessary (US Soft Tissue Mass - Paediatric, p87)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": true,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S26-paed-soft-tissue-mass (strict)

RF-26 US Soft Tissue Paediatric p87: soft tissue mass with suspicious features

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Soft tissue mass with suspicious features (US Soft Tissue Mass - Paediatric, p87)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": true,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S27-paed-button-battery (strict)

RF-27 X-ray Abdomen Paediatric p91: foreign body ingestion, known button battery

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "History of foreign body ingestion with a high-risk feature (X-ray Abdomen - Paediatric, p91)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": true,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S27b-paed-fb-other-qualifiers (strict)

RF-27 X-ray Abdomen Paediatric p91: foreign body ingestion with oesophageal obstruction, multiple magnets and a large object - the other three qualifying features

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "History of foreign body ingestion with a high-risk feature (X-ray Abdomen - Paediatric, p91)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": true,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S28-paed-respiratory-compromise (strict)

RF-28 X-ray Chest Paediatric p93: respiratory distress, hypoxia, acute severe asthma and suspected inhaled foreign body - all four alternatives

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Refer child for acute assessment without requesting imaging - respiratory distress, hypoxia, acute severe asthma or suspected inhaled foreign body (X-ray Chest - Paediatric, p93)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": true,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S29-osteomyelitis (strict)

RF-29 X-ray Pelvis/Hip Paediatric p99: suspected osteomyelitis (REVIEW Q6 - published in the same bullet as septic arthritis at one site only)

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspected osteomyelitis (X-ray Pelvis/Hip - Paediatric, p99)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": false,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": true,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S30-sufe (strict)

RF-30 X-ray Pelvis/Hip Paediatric p99: suspected SUFE (REVIEW Q24 - the same site also lists non-acute suspected SUFE as an Acute-24h imaging indication)

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspected Slipped Upper Femoral Epiphysis (SUFE) (X-ray Pelvis/Hip - Paediatric, p99)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": true,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S31-acc-trauma (strict)

ACC redirect (Overview p4 scope item 3; X-ray Spine p73): recent trauma mechanism is the primary cause -> ACC, not CRR. No red flag present.

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACC_PATHWAY",
  "firedRedFlags": [],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": false,
    "rf19IllustrativeFeatures": [
      "symptom.backPain"
    ],
    "rf20CaudaEquina": false,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": true,
    "documentationStandard": "strict"
  }
}
```

### RF-S32-fall-through (strict)

Fall-through: an ordinary CT CAP referral with no red flag and no ACC mechanism -> evaluation continues to the exam library, and the national library says nothing

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "NO_NATIONAL_REDIRECT",
  "firedRedFlags": [],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": true,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": false,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": false,
    "documentationStandard": "strict"
  }
}
```

### RF-S33-fall-through-silent-note (strict)

Fall-through: a note that mentions no red-flag concept at all. Every flag is null; the library must stay silent rather than list thirty unanswered flags (REVIEW Q20).

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "NO_NATIONAL_REDIRECT",
  "firedRedFlags": [],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": true,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S34-inferred-under-strict (strict)

REVIEW Q21 SAFETY CASE: the extraction step infers cauda equina from 'legs feel odd, difficulty on the toilet' and labels it inferred. Under the strict documentation standard the flag does NOT fire - but because the inferred answers become null rather than false, the flag lands INDETERMINATE and the two linkIds are asked for, so the concern is surfaced rather than silently dropped. Under the inferred standard it fires.

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "NO_NATIONAL_REDIRECT",
  "firedRedFlags": [],
  "indeterminateRedFlags": [
    "RF-20 Suspected cauda equina syndrome (X-ray Spine - Adult, p72)"
  ],
  "missingInformation": [
    "redflag.saddleAnaesthesia",
    "redflag.bowelOrBladderIncontinence"
  ],
  "evaluationContinuesToExamLibraries": true,
  "inferredIndicators": [
    "redflag.saddleAnaesthesia",
    "redflag.bowelOrBladderIncontinence"
  ],
  "inferredExcludedByStrictStandard": [
    "redflag.saddleAnaesthesia",
    "redflag.bowelOrBladderIncontinence"
  ],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [
      "symptom.backPain"
    ],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S34-inferred-under-strict (inferred)

REVIEW Q21 SAFETY CASE: the extraction step infers cauda equina from 'legs feel odd, difficulty on the toilet' and labels it inferred. Under the strict documentation standard the flag does NOT fire - but because the inferred answers become null rather than false, the flag lands INDETERMINATE and the two linkIds are asked for, so the concern is surfaced rather than silently dropped. Under the inferred standard it fires.

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspicion of cauda equina syndrome (X-ray Spine - Adult, p72)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [
    "redflag.saddleAnaesthesia",
    "redflag.bowelOrBladderIncontinence"
  ],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [
      "symptom.backPain"
    ],
    "rf20CaudaEquina": true,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "inferred"
  }
}
```

### RF-S35-indeterminate-compound (strict)

Indeterminate compound flag: haemoptysis is documented but none of the four qualifying features is answered -> not fired, reported as indeterminate, and the four linkIds are asked for

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "NO_NATIONAL_REDIRECT",
  "firedRedFlags": [],
  "indeterminateRedFlags": [
    "RF-14 Haemoptysis with red flags (X-ray Chest - Adult, p62)"
  ],
  "missingInformation": [
    "redflag.haemoptysisSignificantVolume",
    "redflag.haemodynamicallyUnstable",
    "redflag.hoarsenessOrStridorWithHaemoptysis",
    "redflag.acuteDyspnoeaOrChestPain"
  ],
  "evaluationContinuesToExamLibraries": true,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S36-small-pneumothorax-must-not-fire (strict)

Finding F-02: 'Suspected small pneumothorax' is an Acute-within-48-hours X-ray Chest indication (p63), NOT a red flag. System prompt v2.3.0 redirects it to ED. It must fall through to the exam library.

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "NO_NATIONAL_REDIRECT",
  "firedRedFlags": [],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": true,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": false,
    "rf16LargePneumothorax": false,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

### RF-S37-red-flag-outranks-acc (strict)

REVIEW Q1 precedence: a trauma mechanism AND a red flag. Clinical safety is encoded as outranking funding, so the determination is ACUTE_ASSESSMENT_REQUIRED, not ACC_PATHWAY.

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ACUTE_ASSESSMENT_REQUIRED",
  "firedRedFlags": [
    "Suspicion of cauda equina syndrome (X-ray Spine - Adult, p72)"
  ],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": false,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [
      "symptom.backPain"
    ],
    "rf20CaudaEquina": true,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": true,
    "documentationStandard": "strict"
  }
}
```

### RF-S38-thunderclap-headache-has-no-flag (strict)

Finding F-01: 'worst headache of my life' is a red flag in system prompt v2.3.0 STEP 0(a) but appears NOWHERE in the published criteria - CT Head Adult (pp.20-22) has no acute-assessment row. The national library has no indicator for it and must fall through.

```json
{
  "library": "CRR national red flags and ACC redirect",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "NO_NATIONAL_REDIRECT",
  "firedRedFlags": [],
  "indeterminateRedFlags": [],
  "missingInformation": [],
  "evaluationContinuesToExamLibraries": true,
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "ruleTrace": {
    "rf01MassiveHaemoptysis": null,
    "rf02StridorOrSvcObstruction": null,
    "rf03RenalColicWithRedFlag": null,
    "rf04RhinosinusitisRedFlags": null,
    "rf05CholecystitisOrCholangitis": null,
    "rf06AcuteAbdomen": null,
    "rf07RupturedAAA": null,
    "rf08TesticularTorsion": null,
    "rf09PainfulJaundice": null,
    "rf10TiaHighRiskOrDissection": null,
    "rf11UnstableGynaePelvicCause": null,
    "rf12Pyelonephritis": null,
    "rf13InguinalHernia": null,
    "rf14HaemoptysisWithRedFlags": null,
    "rf15SevereRespiratoryDistress": null,
    "rf16LargePneumothorax": null,
    "rf17ActiveTbAcutelyUnwell": null,
    "rf18SepticArthritis": null,
    "rf19SpinalInfection": null,
    "rf19IllustrativeFeatures": [],
    "rf20CaudaEquina": null,
    "rf21PaedAcuteAbdominalPain": null,
    "rf22PaedGynaeCause": null,
    "rf23PaedUti": null,
    "rf24PaedHaematuria": null,
    "rf25PaedAbscess": null,
    "rf26PaedSoftTissueMass": null,
    "rf27PaedForeignBody": null,
    "rf28PaedRespiratoryCompromise": null,
    "rf29Osteomyelitis": null,
    "rf30Sufe": null,
    "accTrauma": null,
    "documentationStandard": "strict"
  }
}
```

