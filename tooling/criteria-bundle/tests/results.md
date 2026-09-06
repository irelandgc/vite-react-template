# CT CAP Adult - scenario results

| Scenario | Run | Determination | Missing information | Retrieved | Result |
|---|---|---|---|---|---|
| S01-b1-p2 | strict/literal | P2_URGENT (P2) | - | - | PASS |
| S02-b2-p2 | strict/literal | P2_URGENT (P2) | - | - | PASS |
| S03-female55-labs-unknown | strict/literal | INSUFFICIENT_INFORMATION | advice.urgentCTRecommended, lab.crp.raised, lab.hb.low, lab.calcium.raised, lab.platelets.high, lab.alp.high, lab.albumin.low, lab.repeatConfirmed, lab.unexplained | - | PASS |
| S04-female55-labs-normal | strict/literal | CRITERIA_NOT_MET | - | - | PASS |
| S05-wl-percent-not-stated | strict/literal | INSUFFICIENT_INFORMATION | weightloss.measured, weightloss.percent, weightloss.periodMonths, advice.urgentCTRecommended | - | PASS |
| S06-inferred-percent | strict/literal | INSUFFICIENT_INFORMATION | weightloss.percent, weightloss.periodMonths, advice.urgentCTRecommended | - | PASS |
| S06-inferred-percent | inferred/literal | P2_URGENT (P2) | - | - | PASS |
| S07-localising-features | strict/literal | ALTERNATIVE_MANAGEMENT | - | - | PASS |
| S08-recent-ct | strict/literal | ALTERNATIVE_MANAGEMENT | - | - | PASS |
| S09-specialist-advice-only | strict/literal | CRITERIA_NOT_MET | weightloss.measured, weightloss.percent, weightloss.periodMonths, lab.crp.raised, lab.hb.low, lab.calcium.raised, lab.platelets.high, lab.alp.high, lab.albumin.low, lab.repeatConfirmed, lab.unexplained | - | PASS |
| S09-specialist-advice-only | strict/alternative | P2_URGENT (P2) | - | - | PASS |
| S10-advice-missing-name | {"P2 Structure Reading":"alternative"} | P2_URGENT (P2) | advice.adviserNameRole | - | PASS |
| S11-not-funded | strict/literal | NOT_ROUTINELY_FUNDED | - | - | PASS |
| S12-paediatric | strict/literal | PAEDIATRIC_CRITERIA_APPLY | advice.urgentCTRecommended, lab.crp.raised, lab.hb.low, lab.calcium.raised, lab.platelets.high, lab.alp.high, lab.albumin.low, lab.repeatConfirmed, lab.unexplained | - | PASS |
| S13-boundary-age50-male | strict/literal | INSUFFICIENT_INFORMATION | advice.urgentCTRecommended, lab.crp.raised, lab.hb.low, lab.calcium.raised, lab.platelets.high, lab.alp.high, lab.albumin.low, lab.repeatConfirmed, lab.unexplained | - | PASS |
| S14-unknown-exclusions | strict/literal | P2_URGENT (P2) | - | - | PASS |
| S15-record-labs-repeat | strict/literal | INSUFFICIENT_INFORMATION | advice.urgentCTRecommended, lab.unexplained | 9 | PASS |
| S16-record-labs-unexplained-stated | strict/literal | P2_URGENT (P2) | - | 9 | PASS |
| S17-record-repeat-too-soon | strict/literal | CRITERIA_NOT_MET | - | 9 | PASS |
| S18-record-weights | strict/literal | P2_URGENT (P2) | - | 8 | PASS |
| S19-record-prior-ct | strict/literal | ALTERNATIVE_MANAGEMENT | - | 2 | PASS |
| S20-record-discrepancy | strict/literal | P2_URGENT (P2) | - | 9 | PASS |
| S21-weights-both-documented | strict/literal | P2_URGENT (P2) | - | - | PASS |
| S22-weights-one-only | strict/literal | INSUFFICIENT_INFORMATION | weightloss.percent, advice.urgentCTRecommended, lab.crp.raised, lab.hb.low, lab.calcium.raised, lab.platelets.high, lab.alp.high, lab.albumin.low, lab.repeatConfirmed, lab.unexplained | - | PASS |
| S23-weights-stated-percent-wins | strict/literal | CRITERIA_NOT_MET | - | - | PASS |
| S24-browser-001 | strict/literal | INSUFFICIENT_INFORMATION | workup.strongSuspicionMalignancy, advice.urgentCTRecommended | - | PASS |
| RM-RP-001-ctcap | strict/literal | INSUFFICIENT_INFORMATION | workup.bloods, workup.urinalysis, workup.cxr, workup.strongSuspicionMalignancy, weightloss.measured, advice.urgentCTRecommended, lab.crp.raised, lab.calcium.raised, lab.platelets.high, lab.alp.high, lab.albumin.low, lab.repeatConfirmed, lab.unexplained | - | PASS |
| RM-RP-001-ctcap-5.5pct | strict/literal | INSUFFICIENT_INFORMATION | workup.bloods, workup.urinalysis, workup.cxr, workup.strongSuspicionMalignancy, weightloss.measured, advice.urgentCTRecommended, lab.crp.raised, lab.calcium.raised, lab.platelets.high, lab.alp.high, lab.albumin.low, lab.repeatConfirmed, lab.unexplained | - | PASS |
| RM-RP-007-INT-002-ctcap | strict/literal | ALTERNATIVE_MANAGEMENT | - | - | PASS |
| RM-MW-009-ctcap | strict/literal | ALTERNATIVE_MANAGEMENT | - | - | PASS |

## Full advisory output per scenario

### S01-b1-p2 (strict/literal)

Pathway B1: male 62, documented 8% loss over 4 months, full work-up, no localising features

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "P2_URGENT",
  "priorityCode": "P2",
  "priorityTimeframe": "Complete within 2 weeks of receiving referral",
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": true,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 8.3,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": true,
    "pathwayB1": true,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 0,
    "twoOrMorePersistentUnexplainedAbnormalLabs": false,
    "pathwayB2": false,
    "pathwayB3": null,
    "meetsP2Literal": true,
    "meetsP2Alternative": true,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S02-b2-p2 (strict/literal)

Pathway B2: female 55, 6% loss over 5 months, CRP raised + Hb low persistent on repeat, unexplained

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "P2_URGENT",
  "priorityCode": "P2",
  "priorityTimeframe": "Complete within 2 weeks of receiving referral",
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 6,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 5,
    "b1AgeSexThreshold": false,
    "pathwayB1": false,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 2,
    "unknownLabCount": 0,
    "twoOrMorePersistentUnexplainedAbnormalLabs": true,
    "pathwayB2": true,
    "pathwayB3": null,
    "meetsP2Literal": true,
    "meetsP2Alternative": true,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S03-female55-labs-unknown (strict/literal)

Female 55 (below B1 age threshold), weight loss met, labs not documented -> insufficient, asks for labs

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "INSUFFICIENT_INFORMATION",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [
    "advice.urgentCTRecommended",
    "lab.crp.raised",
    "lab.hb.low",
    "lab.calcium.raised",
    "lab.platelets.high",
    "lab.alp.high",
    "lab.albumin.low",
    "lab.repeatConfirmed",
    "lab.unexplained"
  ],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 7,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": false,
    "pathwayB1": false,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 6,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": null,
    "pathwayB3": null,
    "meetsP2Literal": null,
    "meetsP2Alternative": null,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S04-female55-labs-normal (strict/literal)

Female 55, weight loss met, all labs documented normal -> criteria not met (neither B1 age nor B2 labs)

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "CRITERIA_NOT_MET",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 7,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": false,
    "pathwayB1": false,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 0,
    "twoOrMorePersistentUnexplainedAbnormalLabs": false,
    "pathwayB2": false,
    "pathwayB3": false,
    "meetsP2Literal": false,
    "meetsP2Alternative": false,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S05-wl-percent-not-stated (strict/literal)

Male 62, 'losing weight' but no figure and no period -> insufficient; asks for percent, period, measured

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "INSUFFICIENT_INFORMATION",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [
    "weightloss.measured",
    "weightloss.percent",
    "weightloss.periodMonths",
    "advice.urgentCTRecommended"
  ],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": null,
    "weightLossPercent": null,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": null,
    "b1AgeSexThreshold": true,
    "pathwayB1": null,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 0,
    "twoOrMorePersistentUnexplainedAbnormalLabs": false,
    "pathwayB2": false,
    "pathwayB3": null,
    "meetsP2Literal": null,
    "meetsP2Alternative": null,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S06-inferred-percent (strict/literal)

The fabrication case: LLM computes 7.5% from '80kg -> 74kg' and labels it INFERRED. Strict -> insufficient; inferred mode -> P2

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "INSUFFICIENT_INFORMATION",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [
    "weightloss.percent",
    "weightloss.periodMonths",
    "advice.urgentCTRecommended"
  ],
  "inferredIndicators": [
    "weightloss.percent",
    "weightloss.periodMonths"
  ],
  "inferredExcludedByStrictStandard": [
    "weightloss.percent",
    "weightloss.periodMonths"
  ],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": null,
    "weightLossPercent": null,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": null,
    "b1AgeSexThreshold": true,
    "pathwayB1": null,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 0,
    "twoOrMorePersistentUnexplainedAbnormalLabs": false,
    "pathwayB2": false,
    "pathwayB3": null,
    "meetsP2Literal": null,
    "meetsP2Alternative": null,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S06-inferred-percent (inferred/literal)

The fabrication case: LLM computes 7.5% from '80kg -> 74kg' and labels it INFERRED. Strict -> insufficient; inferred mode -> P2

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "P2_URGENT",
  "priorityCode": "P2",
  "priorityTimeframe": "Complete within 2 weeks of receiving referral",
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [],
  "inferredIndicators": [
    "weightloss.percent",
    "weightloss.periodMonths"
  ],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 7.5,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": true,
    "pathwayB1": true,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 0,
    "twoOrMorePersistentUnexplainedAbnormalLabs": false,
    "pathwayB2": false,
    "pathwayB3": null,
    "meetsP2Literal": true,
    "meetsP2Alternative": true,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "inferred",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S07-localising-features (strict/literal)

Redirect: 4cm palpable left iliac fossa mass -> localising features -> alternative management, not CT CAP

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ALTERNATIVE_MANAGEMENT",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [
    "Localising clinical features or preliminary results suggest cancer in a specific system"
  ],
  "unconfirmedExclusions": [],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": false,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": true,
    "weightLossCriterion": true,
    "weightLossPercent": 9,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 3,
    "b1AgeSexThreshold": true,
    "pathwayB1": true,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 6,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": null,
    "pathwayB3": null,
    "meetsP2Literal": false,
    "meetsP2Alternative": null,
    "alternativeManagement": true,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S08-recent-ct (strict/literal)

Redirect: otherwise meets B1 but had CT CAP 8 months ago -> seek radiologist advice

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ALTERNATIVE_MANAGEMENT",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [
    "CT Chest, Abdomen & Pelvis within the last 12 months - seek radiologist / specialist advice"
  ],
  "unconfirmedExclusions": [],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 6,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": true,
    "pathwayB1": true,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 6,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": null,
    "pathwayB3": null,
    "meetsP2Literal": true,
    "meetsP2Alternative": true,
    "alternativeManagement": true,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S09-specialist-advice-only (strict/literal)

REVIEW Q1: PCRL advised urgent CT CAP, but CXR not done and no weight loss. Literal reading -> not met; alternative reading -> P2

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "CRITERIA_NOT_MET",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [
    "weightloss.measured",
    "weightloss.percent",
    "weightloss.periodMonths",
    "lab.crp.raised",
    "lab.hb.low",
    "lab.calcium.raised",
    "lab.platelets.high",
    "lab.alp.high",
    "lab.albumin.low",
    "lab.repeatConfirmed",
    "lab.unexplained"
  ],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": false,
    "initialInvestigationsComplete": false,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": false,
    "weightLossPercent": null,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": null,
    "b1AgeSexThreshold": true,
    "pathwayB1": false,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 6,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": false,
    "pathwayB3": true,
    "meetsP2Literal": false,
    "meetsP2Alternative": true,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S09-specialist-advice-only (strict/alternative)

REVIEW Q1: PCRL advised urgent CT CAP, but CXR not done and no weight loss. Literal reading -> not met; alternative reading -> P2

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "P2_URGENT",
  "priorityCode": "P2",
  "priorityTimeframe": "Complete within 2 weeks of receiving referral",
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": false,
    "initialInvestigationsComplete": false,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": false,
    "weightLossPercent": null,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": null,
    "b1AgeSexThreshold": true,
    "pathwayB1": false,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 6,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": false,
    "pathwayB3": true,
    "meetsP2Literal": false,
    "meetsP2Alternative": true,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "alternative"
  },
  "discrepancies": []
}
```

### S10-advice-missing-name ({"P2 Structure Reading":"alternative"})

Specialist advice pathway met (alt reading) but adviser name/role not documented -> P2 with a missing-information prompt

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "P2_URGENT",
  "priorityCode": "P2",
  "priorityTimeframe": "Complete within 2 weeks of receiving referral",
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [
    "advice.adviserNameRole"
  ],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": false,
    "weightLossPercent": null,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": null,
    "b1AgeSexThreshold": true,
    "pathwayB1": false,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 6,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": false,
    "pathwayB3": true,
    "meetsP2Literal": true,
    "meetsP2Alternative": true,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "alternative"
  },
  "discrepancies": []
}
```

### S11-not-funded (strict/literal)

Not routinely funded: patient declines further investigation/treatment (takes precedence)

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "NOT_ROUTINELY_FUNDED",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [],
  "unconfirmedExclusions": [
    "excl.currentCancerFollowUp",
    "excl.secondaryCareInvestigated12m",
    "excl.urgentAdmissionRequired",
    "excl.recentUSAbdoPelvis3m",
    "excl.recentCTCAP12m"
  ],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 10,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": true,
    "pathwayB1": true,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 6,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": null,
    "pathwayB3": null,
    "meetsP2Literal": true,
    "meetsP2Alternative": true,
    "alternativeManagement": false,
    "notRoutinelyFunded": true,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S12-paediatric (strict/literal)

Age 14 -> adult criteria do not apply; paediatric set applies

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "PAEDIATRIC_CRITERIA_APPLY",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [
    "advice.urgentCTRecommended",
    "lab.crp.raised",
    "lab.hb.low",
    "lab.calcium.raised",
    "lab.platelets.high",
    "lab.alp.high",
    "lab.albumin.low",
    "lab.repeatConfirmed",
    "lab.unexplained"
  ],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": false,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 10,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": false,
    "pathwayB1": false,
    "b2AgeSexThreshold": false,
    "abnormalLabCount": 0,
    "unknownLabCount": 6,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": false,
    "pathwayB3": null,
    "meetsP2Literal": false,
    "meetsP2Alternative": false,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S13-boundary-age50-male (strict/literal)

REVIEW Q4 boundary: male exactly 50 with weight loss -> B1 'over 50' read as >50 -> not met; B2 needs labs -> insufficient

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "INSUFFICIENT_INFORMATION",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [
    "advice.urgentCTRecommended",
    "lab.crp.raised",
    "lab.hb.low",
    "lab.calcium.raised",
    "lab.platelets.high",
    "lab.alp.high",
    "lab.albumin.low",
    "lab.repeatConfirmed",
    "lab.unexplained"
  ],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 6,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": false,
    "pathwayB1": false,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 6,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": null,
    "pathwayB3": null,
    "meetsP2Literal": null,
    "meetsP2Alternative": null,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S14-unknown-exclusions (strict/literal)

B1 met but exclusions not addressed in note -> P2 with unconfirmed exclusions listed for the triager

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "P2_URGENT",
  "priorityCode": "P2",
  "priorityTimeframe": "Complete within 2 weeks of receiving referral",
  "activeRedirects": [],
  "unconfirmedExclusions": [
    "excl.currentCancerFollowUp",
    "excl.secondaryCareInvestigated12m",
    "excl.urgentAdmissionRequired",
    "excl.recentUSAbdoPelvis3m",
    "excl.recentCTCAP12m"
  ],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 8,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": true,
    "pathwayB1": true,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 6,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": null,
    "pathwayB3": null,
    "meetsP2Literal": true,
    "meetsP2Alternative": true,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S15-record-labs-repeat (strict/literal)

Retrieval: note has work-up + weight loss only; PMS record supplies Hb low and CRP raised, each repeated >21 days apart -> only lab.unexplained still missing

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "INSUFFICIENT_INFORMATION",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [
    "advice.urgentCTRecommended",
    "lab.unexplained"
  ],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [
    "lab.crp.raised",
    "lab.hb.low",
    "lab.calcium.raised",
    "lab.platelets.high",
    "lab.alp.high",
    "lab.albumin.low",
    "lab.repeatConfirmed",
    "excl.recentUSAbdoPelvis3m",
    "excl.recentCTCAP12m"
  ],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 6.9,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": false,
    "pathwayB1": false,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 2,
    "unknownLabCount": 0,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": null,
    "pathwayB3": null,
    "meetsP2Literal": null,
    "meetsP2Alternative": null,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S16-record-labs-unexplained-stated (strict/literal)

Retrieval: as S15 but the note states the abnormal results are unexplained -> P2 via B2 with labs retrieved, not transcribed

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "P2_URGENT",
  "priorityCode": "P2",
  "priorityTimeframe": "Complete within 2 weeks of receiving referral",
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [
    "lab.crp.raised",
    "lab.hb.low",
    "lab.calcium.raised",
    "lab.platelets.high",
    "lab.alp.high",
    "lab.albumin.low",
    "lab.repeatConfirmed",
    "excl.recentUSAbdoPelvis3m",
    "excl.recentCTCAP12m"
  ],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 6.9,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": false,
    "pathwayB1": false,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 2,
    "unknownLabCount": 0,
    "twoOrMorePersistentUnexplainedAbnormalLabs": true,
    "pathwayB2": true,
    "pathwayB3": null,
    "meetsP2Literal": true,
    "meetsP2Alternative": true,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S17-record-repeat-too-soon (strict/literal)

Retrieval: Hb and CRP abnormal twice but only 10 days apart -> repeat NOT confirmed -> criteria not met on B2 (B1 age not met)

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "CRITERIA_NOT_MET",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [
    "lab.crp.raised",
    "lab.hb.low",
    "lab.calcium.raised",
    "lab.platelets.high",
    "lab.alp.high",
    "lab.albumin.low",
    "lab.repeatConfirmed",
    "excl.recentUSAbdoPelvis3m",
    "excl.recentCTCAP12m"
  ],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 6.9,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": false,
    "pathwayB1": false,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 2,
    "unknownLabCount": 0,
    "twoOrMorePersistentUnexplainedAbnormalLabs": false,
    "pathwayB2": false,
    "pathwayB3": false,
    "meetsP2Literal": false,
    "meetsP2Alternative": false,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S18-record-weights (strict/literal)

Retrieval: the fabrication case resolved at source - weights 80kg (4 months ago) and 74kg (3 days ago) in the record -> 7.5% retrieved, P2 in strict mode

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "P2_URGENT",
  "priorityCode": "P2",
  "priorityTimeframe": "Complete within 2 weeks of receiving referral",
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [
    "weightloss.present",
    "weightloss.measured",
    "weightloss.percent",
    "weightloss.periodMonths",
    "lab.crp.raised",
    "lab.hb.low",
    "excl.recentUSAbdoPelvis3m",
    "excl.recentCTCAP12m"
  ],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 7.5,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 3.9,
    "b1AgeSexThreshold": true,
    "pathwayB1": true,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 4,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": null,
    "pathwayB3": null,
    "meetsP2Literal": true,
    "meetsP2Alternative": true,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S19-record-prior-ct (strict/literal)

Retrieval: note says nothing about prior imaging; record holds a CT CAP report from 8 months ago -> redirect to radiologist advice

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ALTERNATIVE_MANAGEMENT",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [
    "CT Chest, Abdomen & Pelvis within the last 12 months - seek radiologist / specialist advice"
  ],
  "unconfirmedExclusions": [
    "excl.currentCancerFollowUp",
    "excl.secondaryCareInvestigated12m",
    "excl.urgentAdmissionRequired"
  ],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [
    "excl.recentUSAbdoPelvis3m",
    "excl.recentCTCAP12m"
  ],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 6,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": true,
    "pathwayB1": true,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 6,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": null,
    "pathwayB3": null,
    "meetsP2Literal": true,
    "meetsP2Alternative": true,
    "alternativeManagement": true,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S20-record-discrepancy (strict/literal)

Retrieval: note says 'Hb normal' but the record shows Hb low twice -> retrieved wins, discrepancy reported to the triager

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "P2_URGENT",
  "priorityCode": "P2",
  "priorityTimeframe": "Complete within 2 weeks of receiving referral",
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [
    "lab.crp.raised",
    "lab.hb.low",
    "lab.calcium.raised",
    "lab.platelets.high",
    "lab.alp.high",
    "lab.albumin.low",
    "lab.repeatConfirmed",
    "excl.recentUSAbdoPelvis3m",
    "excl.recentCTCAP12m"
  ],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 6.9,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": false,
    "pathwayB1": false,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 2,
    "unknownLabCount": 0,
    "twoOrMorePersistentUnexplainedAbnormalLabs": true,
    "pathwayB2": true,
    "pathwayB3": null,
    "meetsP2Literal": true,
    "meetsP2Alternative": true,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": [
    {
      "linkId": "lab.hb.low",
      "note": false,
      "noteStatus": "documented",
      "record": true,
      "sources": [
        "Observation/S20-record-discrepancy-hb-1"
      ]
    }
  ]
}
```

### S21-weights-both-documented (strict/literal)

Weights: 84kg -> 77kg documented, no percentage stated -> CT CAP computes 8.3%, B1 met, P2 (arch-mig browser findings, weightBefore/weightNow)

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "P2_URGENT",
  "priorityCode": "P2",
  "priorityTimeframe": "Complete within 2 weeks of receiving referral",
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 8.333333333333332,
    "weightLossPercentByRecordedWeights": 8.333333333333332,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": true,
    "pathwayB1": true,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 0,
    "twoOrMorePersistentUnexplainedAbnormalLabs": false,
    "pathwayB2": false,
    "pathwayB3": null,
    "meetsP2Literal": true,
    "meetsP2Alternative": true,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S22-weights-one-only (strict/literal)

Weights: only the current weight recorded, no earlier weight and no percentage -> not computable, INSUFFICIENT, asks for percent

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "INSUFFICIENT_INFORMATION",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [
    "weightloss.percent",
    "advice.urgentCTRecommended",
    "lab.crp.raised",
    "lab.hb.low",
    "lab.calcium.raised",
    "lab.platelets.high",
    "lab.alp.high",
    "lab.albumin.low",
    "lab.repeatConfirmed",
    "lab.unexplained"
  ],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": null,
    "weightLossPercent": null,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": true,
    "pathwayB1": null,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 6,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": null,
    "pathwayB3": null,
    "meetsP2Literal": null,
    "meetsP2Alternative": null,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S23-weights-stated-percent-wins (strict/literal)

Weights imply ~8% but the referral states 5% -> the stated percentage is used (not 'more than 5%'), CRITERIA_NOT_MET

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "CRITERIA_NOT_MET",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [],
  "unconfirmedExclusions": [],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": true,
    "initialInvestigationsComplete": true,
    "strongSuspicion": true,
    "localisingFeatures": false,
    "weightLossCriterion": false,
    "weightLossPercent": 5,
    "weightLossPercentByRecordedWeights": 8.333333333333332,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": true,
    "pathwayB1": false,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 0,
    "twoOrMorePersistentUnexplainedAbnormalLabs": false,
    "pathwayB2": false,
    "pathwayB3": false,
    "meetsP2Literal": false,
    "meetsP2Alternative": false,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### S24-browser-001 (strict/literal)

Ground-truth GT-BROWSER-001: full B1 setup from recorded weights, but strong suspicion of malignancy is attestation-only (AD-17) -> INSUFFICIENT until attested

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "INSUFFICIENT_INFORMATION",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [],
  "unconfirmedExclusions": [
    "excl.currentCancerFollowUp",
    "excl.secondaryCareInvestigated12m",
    "excl.urgentAdmissionRequired",
    "excl.recentUSAbdoPelvis3m",
    "excl.recentCTCAP12m"
  ],
  "missingInformation": [
    "workup.strongSuspicionMalignancy",
    "advice.urgentCTRecommended"
  ],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": null,
    "initialInvestigationsComplete": true,
    "strongSuspicion": null,
    "localisingFeatures": false,
    "weightLossCriterion": true,
    "weightLossPercent": 8,
    "weightLossPercentByRecordedWeights": 8.333333333333332,
    "weightLossPeriodMonths": 4,
    "b1AgeSexThreshold": true,
    "pathwayB1": true,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 6,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": null,
    "pathwayB3": null,
    "meetsP2Literal": null,
    "meetsP2Alternative": null,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### RM-RP-001-ctcap (strict/literal)

Results matrix RP-001 (Rhys Parry): 65M, 5% loss over 6/12, no localising signs, Hb mildly low. Evaluator expected 'at risk (need 2 bloods)'. Literal criteria: 5% is not 'more than 5%' so B1/B2 fail; work-up and specialist advice not stated -> INSUFFICIENT with the full checklist. REVIEW Q7 (is exactly 5% 'more than 5%'?).

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "INSUFFICIENT_INFORMATION",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [],
  "unconfirmedExclusions": [
    "excl.currentCancerFollowUp",
    "excl.secondaryCareInvestigated12m",
    "excl.urgentAdmissionRequired",
    "excl.recentUSAbdoPelvis3m",
    "excl.recentCTCAP12m"
  ],
  "missingInformation": [
    "workup.bloods",
    "workup.urinalysis",
    "workup.cxr",
    "workup.strongSuspicionMalignancy",
    "weightloss.measured",
    "advice.urgentCTRecommended",
    "lab.crp.raised",
    "lab.calcium.raised",
    "lab.platelets.high",
    "lab.alp.high",
    "lab.albumin.low",
    "lab.repeatConfirmed",
    "lab.unexplained"
  ],
  "inferredIndicators": [
    "workup.bloods"
  ],
  "inferredExcludedByStrictStandard": [
    "workup.bloods"
  ],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": null,
    "initialInvestigationsComplete": null,
    "strongSuspicion": null,
    "localisingFeatures": false,
    "weightLossCriterion": false,
    "weightLossPercent": 5,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 6,
    "b1AgeSexThreshold": true,
    "pathwayB1": false,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 1,
    "unknownLabCount": 5,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": false,
    "pathwayB3": null,
    "meetsP2Literal": null,
    "meetsP2Alternative": null,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### RM-RP-001-ctcap-5.5pct (strict/literal)

RP-001 variant: same note but 5.5% -> weight loss met; B1 age met; work-up not documented -> INSUFFICIENT, asks for what the PCRL would actually need

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "INSUFFICIENT_INFORMATION",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [],
  "unconfirmedExclusions": [
    "excl.currentCancerFollowUp",
    "excl.secondaryCareInvestigated12m",
    "excl.urgentAdmissionRequired",
    "excl.recentUSAbdoPelvis3m",
    "excl.recentCTCAP12m"
  ],
  "missingInformation": [
    "workup.bloods",
    "workup.urinalysis",
    "workup.cxr",
    "workup.strongSuspicionMalignancy",
    "weightloss.measured",
    "advice.urgentCTRecommended",
    "lab.crp.raised",
    "lab.calcium.raised",
    "lab.platelets.high",
    "lab.alp.high",
    "lab.albumin.low",
    "lab.repeatConfirmed",
    "lab.unexplained"
  ],
  "inferredIndicators": [
    "workup.bloods"
  ],
  "inferredExcludedByStrictStandard": [
    "workup.bloods"
  ],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": false,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": null,
    "initialInvestigationsComplete": null,
    "strongSuspicion": null,
    "localisingFeatures": false,
    "weightLossCriterion": null,
    "weightLossPercent": 5.5,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": 6,
    "b1AgeSexThreshold": true,
    "pathwayB1": null,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 1,
    "unknownLabCount": 5,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": null,
    "pathwayB3": null,
    "meetsP2Literal": null,
    "meetsP2Alternative": null,
    "alternativeManagement": false,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### RM-RP-007-INT-002-ctcap (strict/literal)

Results matrix RP-007 / INT-002 — THE fabrication case: 76F, 3kg loss, 15cm epigastric mass. The model asserted 'no focal pathology' as met. Under the contract the mass is a documented localising feature -> ALTERNATIVE_MANAGEMENT; 3kg cannot become a percent.

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ALTERNATIVE_MANAGEMENT",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [
    "Localising clinical features or preliminary results suggest cancer in a specific system"
  ],
  "unconfirmedExclusions": [
    "excl.currentCancerFollowUp",
    "excl.secondaryCareInvestigated12m",
    "excl.urgentAdmissionRequired",
    "excl.recentUSAbdoPelvis3m",
    "excl.recentCTCAP12m"
  ],
  "missingInformation": [],
  "inferredIndicators": [
    "weightloss.periodMonths"
  ],
  "inferredExcludedByStrictStandard": [
    "weightloss.periodMonths"
  ],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": true,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": false,
    "initialInvestigationsComplete": null,
    "strongSuspicion": null,
    "localisingFeatures": true,
    "weightLossCriterion": null,
    "weightLossPercent": null,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": null,
    "b1AgeSexThreshold": true,
    "pathwayB1": null,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 6,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": null,
    "pathwayB3": null,
    "meetsP2Literal": false,
    "meetsP2Alternative": null,
    "alternativeManagement": true,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

### RM-MW-009-ctcap (strict/literal)

Results matrix MW-009 (Michaela Wood): 68M painless jaundice, hepatomegaly -> localising features -> ALTERNATIVE_MANAGEMENT (cross-exam redirect to US Abdomen is the multi-bundle layer's job)

```json
{
  "exam": "CT Chest, Abdomen and Pelvis - Adult",
  "criteriaVersion": "2.0 (published 09/04/2026)",
  "determination": "ALTERNATIVE_MANAGEMENT",
  "priorityCode": null,
  "priorityTimeframe": null,
  "activeRedirects": [
    "Localising clinical features or preliminary results suggest cancer in a specific system"
  ],
  "unconfirmedExclusions": [
    "excl.currentCancerFollowUp",
    "excl.secondaryCareInvestigated12m",
    "excl.urgentAdmissionRequired",
    "excl.recentUSAbdoPelvis3m",
    "excl.recentCTCAP12m"
  ],
  "missingInformation": [],
  "inferredIndicators": [],
  "inferredExcludedByStrictStandard": [],
  "retrievedIndicators": [],
  "yellowFlagSymptoms": true,
  "ruleTrace": {
    "isAdult": true,
    "criterionA": false,
    "initialInvestigationsComplete": null,
    "strongSuspicion": null,
    "localisingFeatures": true,
    "weightLossCriterion": null,
    "weightLossPercent": null,
    "weightLossPercentByRecordedWeights": null,
    "weightLossPeriodMonths": null,
    "b1AgeSexThreshold": true,
    "pathwayB1": null,
    "b2AgeSexThreshold": true,
    "abnormalLabCount": 0,
    "unknownLabCount": 6,
    "twoOrMorePersistentUnexplainedAbnormalLabs": null,
    "pathwayB2": null,
    "pathwayB3": null,
    "meetsP2Literal": false,
    "meetsP2Alternative": null,
    "alternativeManagement": true,
    "notRoutinelyFunded": false,
    "documentationStandard": "strict",
    "p2StructureReading": "literal"
  },
  "discrepancies": []
}
```

