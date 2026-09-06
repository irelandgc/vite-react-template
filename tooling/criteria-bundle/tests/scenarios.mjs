// Test scenarios for CRR_CTChestAbdomenPelvis_Adult.
// Each scenario is a map of linkId -> answer. An answer is either a bare value
// (treated as documented, no evidence extension) or { v, status, quote }.
// Omitted linkIds are NOT answered (null in CQL).
//
// `expect` is keyed by run configuration: default = strict/literal.

const EVIDENCE_URL = "http://crr.health.nz/fhir/StructureDefinition/answer-evidence";

export const scenarios = [
  {
    id: "S01-b1-p2",
    title: "Pathway B1: male 62, documented 8% loss over 4 months, full work-up, no localising features",
    note: "62M. 4/12 hx unintentional weight loss, 84kg -> 77kg (8%) on scales. Tired. Exam NAD, no masses. FBC/CRP/LFT/Ca/UA/CXR all done and unremarkable. Strongly suspect occult malignancy.",
    answers: {
      "patient.age": 62, "patient.sex": "male",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": true, "weightloss.measured": true, "weightloss.percent": 8.3, "weightloss.periodMonths": 4,
      "symptom.fatigue": true,
      "lab.crp.raised": false, "lab.hb.low": false, "lab.calcium.raised": false, "lab.platelets.high": false, "lab.alp.high": false, "lab.albumin.low": false,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false, "excl.recentUSAbdoPelvis3m": false, "excl.recentCTCAP12m": false,
      "funding.unfitOrUnwilling": false
    },
    expect: { determination: "P2_URGENT", priorityCode: "P2", missing: [] }
  },
  {
    id: "S02-b2-p2",
    title: "Pathway B2: female 55, 6% loss over 5 months, CRP raised + Hb low persistent on repeat, unexplained",
    answers: {
      "patient.age": 55, "patient.sex": "female",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": true, "weightloss.measured": true, "weightloss.percent": 6, "weightloss.periodMonths": 5,
      "lab.crp.raised": true, "lab.hb.low": true, "lab.calcium.raised": false, "lab.platelets.high": false, "lab.alp.high": false, "lab.albumin.low": false,
      "lab.repeatConfirmed": true, "lab.unexplained": true,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false, "excl.recentUSAbdoPelvis3m": false, "excl.recentCTCAP12m": false,
      "funding.unfitOrUnwilling": false
    },
    expect: { determination: "P2_URGENT", priorityCode: "P2", missing: [] }
  },
  {
    id: "S03-female55-labs-unknown",
    title: "Female 55 (below B1 age threshold), weight loss met, labs not documented -> insufficient, asks for labs",
    answers: {
      "patient.age": 55, "patient.sex": "female",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": true, "weightloss.measured": true, "weightloss.percent": 7, "weightloss.periodMonths": 4,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false, "excl.recentUSAbdoPelvis3m": false, "excl.recentCTCAP12m": false,
      "funding.unfitOrUnwilling": false
    },
    expect: {
      determination: "INSUFFICIENT_INFORMATION",
      missing: ["advice.urgentCTRecommended", "lab.crp.raised", "lab.hb.low", "lab.calcium.raised", "lab.platelets.high", "lab.alp.high", "lab.albumin.low", "lab.repeatConfirmed", "lab.unexplained"]
    }
  },
  {
    id: "S04-female55-labs-normal",
    title: "Female 55, weight loss met, all labs documented normal -> criteria not met (neither B1 age nor B2 labs)",
    answers: {
      "patient.age": 55, "patient.sex": "female",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": true, "weightloss.measured": true, "weightloss.percent": 7, "weightloss.periodMonths": 4,
      "lab.crp.raised": false, "lab.hb.low": false, "lab.calcium.raised": false, "lab.platelets.high": false, "lab.alp.high": false, "lab.albumin.low": false,
      "advice.urgentCTRecommended": false,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false, "excl.recentUSAbdoPelvis3m": false, "excl.recentCTCAP12m": false,
      "funding.unfitOrUnwilling": false
    },
    expect: { determination: "CRITERIA_NOT_MET", missing: [] }
  },
  {
    id: "S05-wl-percent-not-stated",
    title: "Male 62, 'losing weight' but no figure and no period -> insufficient; asks for percent, period, measured",
    note: "62M. Says he's been losing weight, clothes loose. Bloods, UA, CXR NAD. Worried re Ca.",
    answers: {
      "patient.age": 62, "patient.sex": "male",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": { v: true, status: "documented", quote: "been losing weight, clothes loose" },
      "lab.crp.raised": false, "lab.hb.low": false, "lab.calcium.raised": false, "lab.platelets.high": false, "lab.alp.high": false, "lab.albumin.low": false,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false, "excl.recentUSAbdoPelvis3m": false, "excl.recentCTCAP12m": false,
      "funding.unfitOrUnwilling": false
    },
    expect: { determination: "INSUFFICIENT_INFORMATION", missing: ["weightloss.measured", "weightloss.percent", "weightloss.periodMonths", "advice.urgentCTRecommended"] }
  },
  {
    id: "S06-inferred-percent",
    title: "The fabrication case: LLM computes 7.5% from '80kg -> 74kg' and labels it INFERRED. Strict -> insufficient; inferred mode -> P2",
    note: "62M. Was 80kg in March, 74kg today (July). Unintentional. Full work-up NAD. Strong suspicion malignancy.",
    answers: {
      "patient.age": 62, "patient.sex": "male",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": { v: true, status: "documented", quote: "Was 80kg in March, 74kg today (July). Unintentional." },
      "weightloss.measured": { v: true, status: "documented", quote: "Was 80kg in March, 74kg today" },
      "weightloss.percent": { v: 7.5, status: "inferred", quote: "Was 80kg in March, 74kg today" },
      "weightloss.periodMonths": { v: 4, status: "inferred", quote: "in March, 74kg today (July)" },
      "lab.crp.raised": false, "lab.hb.low": false, "lab.calcium.raised": false, "lab.platelets.high": false, "lab.alp.high": false, "lab.albumin.low": false,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false, "excl.recentUSAbdoPelvis3m": false, "excl.recentCTCAP12m": false,
      "funding.unfitOrUnwilling": false
    },
    expect: { determination: "INSUFFICIENT_INFORMATION", missing: ["weightloss.percent", "weightloss.periodMonths", "advice.urgentCTRecommended"], inferredExcluded: ["weightloss.percent", "weightloss.periodMonths"] },
    expectInferredMode: { determination: "P2_URGENT", priorityCode: "P2", missing: [] }
  },
  {
    id: "S07-localising-features",
    title: "Redirect: 4cm palpable left iliac fossa mass -> localising features -> alternative management, not CT CAP",
    answers: {
      "patient.age": 66, "patient.sex": "female",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": true,
      "weightloss.present": true, "weightloss.measured": true, "weightloss.percent": 9, "weightloss.periodMonths": 3,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false, "excl.recentUSAbdoPelvis3m": false, "excl.recentCTCAP12m": false,
      "funding.unfitOrUnwilling": false
    },
    expect: { determination: "ALTERNATIVE_MANAGEMENT", redirects: ["Localising clinical features or preliminary results suggest cancer in a specific system"] }
  },
  {
    id: "S08-recent-ct",
    title: "Redirect: otherwise meets B1 but had CT CAP 8 months ago -> seek radiologist advice",
    answers: {
      "patient.age": 70, "patient.sex": "male",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": true, "weightloss.measured": true, "weightloss.percent": 6, "weightloss.periodMonths": 4,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false, "excl.recentUSAbdoPelvis3m": false, "excl.recentCTCAP12m": true,
      "funding.unfitOrUnwilling": false
    },
    expect: { determination: "ALTERNATIVE_MANAGEMENT" }
  },
  {
    id: "S09-specialist-advice-only",
    title: "REVIEW Q1: PCRL advised urgent CT CAP, but CXR not done and no weight loss. Literal reading -> not met; alternative reading -> P2",
    answers: {
      "patient.age": 58, "patient.sex": "male",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": false,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": false,
      "advice.urgentCTRecommended": true, "advice.adviserNameRole": "Dr A Example, PCRL",
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false, "excl.recentUSAbdoPelvis3m": false, "excl.recentCTCAP12m": false,
      "funding.unfitOrUnwilling": false
    },
    expect: { determination: "CRITERIA_NOT_MET" },
    expectAlternativeReading: { determination: "P2_URGENT", priorityCode: "P2" }
  },
  {
    id: "S10-advice-missing-name",
    title: "Specialist advice pathway met (alt reading) but adviser name/role not documented -> P2 with a missing-information prompt",
    answers: {
      "patient.age": 58, "patient.sex": "male",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": false,
      "advice.urgentCTRecommended": true,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false, "excl.recentUSAbdoPelvis3m": false, "excl.recentCTCAP12m": false,
      "funding.unfitOrUnwilling": false
    },
    expect: { determination: "P2_URGENT", missing: ["advice.adviserNameRole"] },
    runWith: { "P2 Structure Reading": "alternative" }
  },
  {
    id: "S11-not-funded",
    title: "Not routinely funded: patient declines further investigation/treatment (takes precedence)",
    answers: {
      "patient.age": 75, "patient.sex": "male",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": true, "weightloss.measured": true, "weightloss.percent": 10, "weightloss.periodMonths": 4,
      "funding.unfitOrUnwilling": true
    },
    expect: { determination: "NOT_ROUTINELY_FUNDED" }
  },
  {
    id: "S12-paediatric",
    title: "Age 14 -> adult criteria do not apply; paediatric set applies",
    answers: {
      "patient.age": 14, "patient.sex": "female",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": true, "weightloss.measured": true, "weightloss.percent": 10, "weightloss.periodMonths": 4,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false, "excl.recentUSAbdoPelvis3m": false, "excl.recentCTCAP12m": false,
      "funding.unfitOrUnwilling": false
    },
    expect: { determination: "PAEDIATRIC_CRITERIA_APPLY" }
  },
  {
    id: "S13-boundary-age50-male",
    title: "REVIEW Q4 boundary: male exactly 50 with weight loss -> B1 'over 50' read as >50 -> not met; B2 needs labs -> insufficient",
    answers: {
      "patient.age": 50, "patient.sex": "male",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": true, "weightloss.measured": true, "weightloss.percent": 6, "weightloss.periodMonths": 4,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false, "excl.recentUSAbdoPelvis3m": false, "excl.recentCTCAP12m": false,
      "funding.unfitOrUnwilling": false
    },
    expect: { determination: "INSUFFICIENT_INFORMATION" }
  },
  {
    id: "S14-unknown-exclusions",
    title: "B1 met but exclusions not addressed in note -> P2 with unconfirmed exclusions listed for the triager",
    answers: {
      "patient.age": 62, "patient.sex": "male",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": true, "weightloss.measured": true, "weightloss.percent": 8, "weightloss.periodMonths": 4
    },
    expect: {
      determination: "P2_URGENT",
      unconfirmedExclusions: ["excl.currentCancerFollowUp", "excl.secondaryCareInvestigated12m", "excl.urgentAdmissionRequired", "excl.recentUSAbdoPelvis3m", "excl.recentCTCAP12m"]
    }
  },
  // ---- Record-backed scenarios (retrieval path, dormant in production until enabled) ----
  {
    id: "S15-record-labs-repeat",
    title: "Retrieval: note has work-up + weight loss only; PMS record supplies Hb low and CRP raised, each repeated >21 days apart -> only lab.unexplained still missing",
    note: "55F. 4/12 unintentional wt loss 72->67kg. Exam NAD. Bloods/UA/CXR done. Strong suspicion malignancy.",
    answers: {
      "patient.age": 55, "patient.sex": "female",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": true, "weightloss.measured": true, "weightloss.percent": 6.9, "weightloss.periodMonths": 4,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false
    },
    record: [
      { obs: "hb", daysAgo: 30, value: 98, unit: "g/L", interp: "L" }, { obs: "hb", daysAgo: 2, value: 95, unit: "g/L", interp: "L" },
      { obs: "crp", daysAgo: 30, value: 41, unit: "mg/L", interp: "H" }, { obs: "crp", daysAgo: 1, value: 38, unit: "mg/L", interp: "H" },
      { obs: "calcium", daysAgo: 2, value: 2.3, unit: "mmol/L", interp: "N" }, { obs: "platelets", daysAgo: 2, value: 250, unit: "10*9/L", interp: "N" },
      { obs: "alp", daysAgo: 2, value: 80, unit: "U/L", interp: "N" }, { obs: "albumin", daysAgo: 2, value: 40, unit: "g/L", interp: "N" }
    ],
    expect: { determination: "INSUFFICIENT_INFORMATION", missing: ["lab.unexplained", "advice.urgentCTRecommended"],
              retrieved: ["lab.hb.low", "lab.crp.raised", "lab.calcium.raised", "lab.platelets.high", "lab.alp.high", "lab.albumin.low", "lab.repeatConfirmed", "excl.recentCTCAP12m", "excl.recentUSAbdoPelvis3m"] }
  },
  {
    id: "S16-record-labs-unexplained-stated",
    title: "Retrieval: as S15 but the note states the abnormal results are unexplained -> P2 via B2 with labs retrieved, not transcribed",
    answers: {
      "patient.age": 55, "patient.sex": "female",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": true, "weightloss.measured": true, "weightloss.percent": 6.9, "weightloss.periodMonths": 4,
      "lab.unexplained": { v: true, status: "documented", quote: "no explanation for the anaemia or raised CRP" },
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false
    },
    record: [
      { obs: "hb", daysAgo: 30, value: 98, unit: "g/L", interp: "L" }, { obs: "hb", daysAgo: 2, value: 95, unit: "g/L", interp: "L" },
      { obs: "crp", daysAgo: 30, value: 41, unit: "mg/L", interp: "H" }, { obs: "crp", daysAgo: 1, value: 38, unit: "mg/L", interp: "H" },
      { obs: "calcium", daysAgo: 2, value: 2.3, unit: "mmol/L", interp: "N" }, { obs: "platelets", daysAgo: 2, value: 250, unit: "10*9/L", interp: "N" },
      { obs: "alp", daysAgo: 2, value: 80, unit: "U/L", interp: "N" }, { obs: "albumin", daysAgo: 2, value: 40, unit: "g/L", interp: "N" }
    ],
    expect: { determination: "P2_URGENT", priorityCode: "P2", missing: [] }
  },
  {
    id: "S17-record-repeat-too-soon",
    title: "Retrieval: Hb and CRP abnormal twice but only 10 days apart -> repeat NOT confirmed -> criteria not met on B2 (B1 age not met)",
    answers: {
      "patient.age": 55, "patient.sex": "female",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": true, "weightloss.measured": true, "weightloss.percent": 6.9, "weightloss.periodMonths": 4,
      "lab.unexplained": true, "advice.urgentCTRecommended": false,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false
    },
    record: [
      { obs: "hb", daysAgo: 12, value: 98, unit: "g/L", interp: "L" }, { obs: "hb", daysAgo: 2, value: 95, unit: "g/L", interp: "L" },
      { obs: "crp", daysAgo: 12, value: 41, unit: "mg/L", interp: "H" }, { obs: "crp", daysAgo: 1, value: 38, unit: "mg/L", interp: "H" },
      { obs: "calcium", daysAgo: 2, value: 2.3, unit: "mmol/L", interp: "N" }, { obs: "platelets", daysAgo: 2, value: 250, unit: "10*9/L", interp: "N" },
      { obs: "alp", daysAgo: 2, value: 80, unit: "U/L", interp: "N" }, { obs: "albumin", daysAgo: 2, value: 40, unit: "g/L", interp: "N" }
    ],
    expect: { determination: "CRITERIA_NOT_MET" }
  },
  {
    id: "S18-record-weights",
    title: "Retrieval: the fabrication case resolved at source - weights 80kg (4 months ago) and 74kg (3 days ago) in the record -> 7.5% retrieved, P2 in strict mode",
    note: "62M. Losing weight, unintentional. Full work-up NAD. Strong suspicion malignancy.",
    answers: {
      "patient.age": 62, "patient.sex": "male",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": { v: true, status: "documented", quote: "Losing weight, unintentional" },
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false
    },
    record: [
      { obs: "weight", daysAgo: 122, value: 80, unit: "kg" }, { obs: "weight", daysAgo: 3, value: 74, unit: "kg" },
      { obs: "hb", daysAgo: 2, value: 140, unit: "g/L", interp: "N" }, { obs: "crp", daysAgo: 2, value: 3, unit: "mg/L", interp: "N" }
    ],
    expect: { determination: "P2_URGENT", priorityCode: "P2", retrieved: ["weightloss.measured", "weightloss.percent", "weightloss.periodMonths", "weightloss.present", "lab.hb.low", "lab.crp.raised", "excl.recentCTCAP12m", "excl.recentUSAbdoPelvis3m"] }
  },
  {
    id: "S19-record-prior-ct",
    title: "Retrieval: note says nothing about prior imaging; record holds a CT CAP report from 8 months ago -> redirect to radiologist advice",
    answers: {
      "patient.age": 70, "patient.sex": "male",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": true, "weightloss.measured": true, "weightloss.percent": 6, "weightloss.periodMonths": 4
    },
    record: [ { report: "ct-cap", daysAgo: 240 } ],
    expect: { determination: "ALTERNATIVE_MANAGEMENT", redirects: ["CT Chest, Abdomen & Pelvis within the last 12 months - seek radiologist / specialist advice"] }
  },
  {
    id: "S20-record-discrepancy",
    title: "Retrieval: note says 'Hb normal' but the record shows Hb low twice -> retrieved wins, discrepancy reported to the triager",
    answers: {
      "patient.age": 55, "patient.sex": "female",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": true, "weightloss.measured": true, "weightloss.percent": 6.9, "weightloss.periodMonths": 4,
      "lab.hb.low": { v: false, status: "documented", quote: "Hb normal" },
      "lab.unexplained": true,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false
    },
    record: [
      { obs: "hb", daysAgo: 30, value: 98, unit: "g/L", interp: "L" }, { obs: "hb", daysAgo: 2, value: 95, unit: "g/L", interp: "L" },
      { obs: "crp", daysAgo: 30, value: 41, unit: "mg/L", interp: "H" }, { obs: "crp", daysAgo: 1, value: 38, unit: "mg/L", interp: "H" },
      { obs: "calcium", daysAgo: 2, value: 2.3, unit: "mmol/L", interp: "N" }, { obs: "platelets", daysAgo: 2, value: 250, unit: "10*9/L", interp: "N" },
      { obs: "alp", daysAgo: 2, value: 80, unit: "U/L", interp: "N" }, { obs: "albumin", daysAgo: 2, value: 40, unit: "g/L", interp: "N" }
    ],
    expect: { determination: "P2_URGENT", discrepancies: ["lab.hb.low"] }
  },
  {
    id: "S21-weights-both-documented",
    title: "Weights: 84kg -> 77kg documented, no percentage stated -> CT CAP computes 8.3%, B1 met, P2 (arch-mig browser findings, weightBefore/weightNow)",
    note: "62M. 4/12 unintentional weight loss, 84kg then 77kg on the practice scales. Bloods, urinalysis, CXR all done and normal. Exam NAD. Strong suspicion of occult malignancy.",
    answers: {
      "patient.age": 62, "patient.sex": "male",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": { v: true, status: "documented", quote: "unintentional weight loss" },
      "weightloss.measured": { v: true, status: "documented", quote: "on the practice scales" },
      "weightloss.weightBefore": { v: 84, status: "documented", quote: "84kg then 77kg" },
      "weightloss.weightNow": { v: 77, status: "documented", quote: "84kg then 77kg" },
      "weightloss.periodMonths": { v: 4, status: "documented", quote: "4/12" },
      "lab.crp.raised": false, "lab.hb.low": false, "lab.calcium.raised": false, "lab.platelets.high": false, "lab.alp.high": false, "lab.albumin.low": false,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false, "excl.recentUSAbdoPelvis3m": false, "excl.recentCTCAP12m": false,
      "funding.unfitOrUnwilling": false
    },
    expect: { determination: "P2_URGENT", priorityCode: "P2", missing: [] }
  },
  {
    id: "S22-weights-one-only",
    title: "Weights: only the current weight recorded, no earlier weight and no percentage -> not computable, INSUFFICIENT, asks for percent",
    note: "62M. Unintentional weight loss over 4 months, now 77kg on the scales. Bloods, urinalysis, CXR done and normal. Exam NAD. Suspect malignancy.",
    answers: {
      "patient.age": 62, "patient.sex": "male",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": { v: true, status: "documented", quote: "Unintentional weight loss" },
      "weightloss.measured": { v: true, status: "documented", quote: "on the scales" },
      "weightloss.weightNow": { v: 77, status: "documented", quote: "now 77kg on the scales" },
      "weightloss.periodMonths": { v: 4, status: "documented", quote: "over 4 months" },
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false, "excl.recentUSAbdoPelvis3m": false, "excl.recentCTCAP12m": false,
      "funding.unfitOrUnwilling": false
    },
    expect: {
      determination: "INSUFFICIENT_INFORMATION",
      missing: ["weightloss.percent", "advice.urgentCTRecommended", "lab.crp.raised", "lab.hb.low", "lab.calcium.raised", "lab.platelets.high", "lab.alp.high", "lab.albumin.low", "lab.repeatConfirmed", "lab.unexplained"]
    }
  },
  {
    id: "S23-weights-stated-percent-wins",
    title: "Weights imply ~8% but the referral states 5% -> the stated percentage is used (not 'more than 5%'), CRITERIA_NOT_MET",
    note: "62M. 4/12 unintentional weight loss, 84kg to 77kg, GP has recorded this as 5%. Bloods, urinalysis, CXR done and normal. Exam NAD. Suspect malignancy. No specialist advice.",
    answers: {
      "patient.age": 62, "patient.sex": "male",
      "workup.bloods": true, "workup.urinalysis": true, "workup.cxr": true,
      "workup.strongSuspicionMalignancy": true, "workup.localisingFeatures": false,
      "weightloss.present": { v: true, status: "documented", quote: "unintentional weight loss" },
      "weightloss.measured": { v: true, status: "documented", quote: "84kg to 77kg" },
      "weightloss.weightBefore": { v: 84, status: "documented", quote: "84kg to 77kg" },
      "weightloss.weightNow": { v: 77, status: "documented", quote: "84kg to 77kg" },
      "weightloss.percent": { v: 5, status: "documented", quote: "recorded this as 5%" },
      "weightloss.periodMonths": { v: 4, status: "documented", quote: "4/12" },
      "lab.crp.raised": false, "lab.hb.low": false, "lab.calcium.raised": false, "lab.platelets.high": false, "lab.alp.high": false, "lab.albumin.low": false,
      "advice.urgentCTRecommended": false,
      "excl.currentCancerFollowUp": false, "excl.secondaryCareInvestigated12m": false, "excl.urgentAdmissionRequired": false, "excl.recentUSAbdoPelvis3m": false, "excl.recentCTCAP12m": false,
      "funding.unfitOrUnwilling": false
    },
    expect: { determination: "CRITERIA_NOT_MET", missing: [] }
  },
  {
    id: "S24-browser-001",
    title: "Ground-truth GT-BROWSER-001: full B1 setup from recorded weights, but strong suspicion of malignancy is attestation-only (AD-17) -> INSUFFICIENT until attested",
    note: "62M, 4/12 unintentional weight loss 84->77kg (8%) on scales, bloods/urinalysis/CXR done and normal, exam NAD. Requesting CT chest abdomen pelvis.",
    answers: {
      "patient.age": { v: 62, status: "documented", quote: "62M" },
      "patient.sex": { v: "male", status: "documented", quote: "62M" },
      "weightloss.present": { v: true, status: "documented", quote: "unintentional weight loss" },
      "weightloss.measured": { v: true, status: "documented", quote: "on scales" },
      "weightloss.weightBefore": { v: 84, status: "documented", quote: "84->77kg" },
      "weightloss.weightNow": { v: 77, status: "documented", quote: "84->77kg" },
      "weightloss.percent": { v: 8, status: "documented", quote: "(8%)" },
      "weightloss.periodMonths": { v: 4, status: "documented", quote: "4/12" },
      "workup.bloods": { v: true, status: "documented", quote: "bloods/urinalysis/CXR done and normal" },
      "workup.urinalysis": { v: true, status: "documented", quote: "bloods/urinalysis/CXR done and normal" },
      "workup.cxr": { v: true, status: "documented", quote: "bloods/urinalysis/CXR done and normal" },
      "workup.localisingFeatures": { v: false, status: "documented", quote: "exam NAD" }
    },
    expect: { determination: "INSUFFICIENT_INFORMATION", missing: ["workup.strongSuspicionMalignancy", "advice.urgentCTRecommended"] }
  },
  // ---- Cases from CRR_Test_Case_Results_Matrix_v2.xlsx (the cases the current tool was measured on) ----
  {
    id: "RM-RP-001-ctcap",
    title: "Results matrix RP-001 (Rhys Parry): 65M, 5% loss over 6/12, no localising signs, Hb mildly low. Evaluator expected 'at risk (need 2 bloods)'. Literal criteria: 5% is not 'more than 5%' so B1/B2 fail; work-up and specialist advice not stated -> INSUFFICIENT with the full checklist. REVIEW Q7 (is exactly 5% 'more than 5%'?).",
    note: "65yo male w/ unexplained wt loss 5% over past 6/12 with no localising symptoms or signs. Hb mildly low. Ex-smoker.",
    answers: {
      "patient.age": 65, "patient.sex": "male",
      "workup.bloods": { v: true, status: "inferred", quote: "Hb mildly low" },
      "workup.localisingFeatures": { v: false, status: "documented", quote: "no localising symptoms or signs" },
      "weightloss.present": { v: true, status: "documented", quote: "unexplained wt loss 5% over past 6/12" },
      "weightloss.percent": { v: 5, status: "documented", quote: "wt loss 5%" },
      "weightloss.periodMonths": { v: 6, status: "documented", quote: "over past 6/12" },
      "lab.hb.low": { v: true, status: "documented", quote: "Hb mildly low" }
    },
    expect: { determination: "INSUFFICIENT_INFORMATION" }
  },
  {
    id: "RM-RP-001-ctcap-5.5pct",
    title: "RP-001 variant: same note but 5.5% -> weight loss met; B1 age met; work-up not documented -> INSUFFICIENT, asks for what the PCRL would actually need",
    answers: {
      "patient.age": 65, "patient.sex": "male",
      "workup.bloods": { v: true, status: "inferred", quote: "Hb mildly low" },
      "workup.localisingFeatures": { v: false, status: "documented", quote: "no localising symptoms or signs" },
      "weightloss.present": { v: true, status: "documented", quote: "unexplained wt loss 5.5% over past 6/12" },
      "weightloss.percent": { v: 5.5, status: "documented", quote: "wt loss 5.5%" },
      "weightloss.periodMonths": { v: 6, status: "documented", quote: "over past 6/12" },
      "lab.hb.low": { v: true, status: "documented", quote: "Hb mildly low" }
    },
    expect: { determination: "INSUFFICIENT_INFORMATION", missing: ["workup.bloods", "workup.urinalysis", "workup.cxr", "workup.strongSuspicionMalignancy", "weightloss.measured", "advice.urgentCTRecommended", "lab.crp.raised", "lab.calcium.raised", "lab.platelets.high", "lab.alp.high", "lab.albumin.low", "lab.repeatConfirmed", "lab.unexplained"] }
  },
  {
    id: "RM-RP-007-INT-002-ctcap",
    title: "Results matrix RP-007 / INT-002 — THE fabrication case: 76F, 3kg loss, 15cm epigastric mass. The model asserted 'no focal pathology' as met. Under the contract the mass is a documented localising feature -> ALTERNATIVE_MANAGEMENT; 3kg cannot become a percent.",
    note: "76yo f w/ 2/12 h/o mid/upper abdo discomfort, anorexia, 3kg wt loss. No change in bowel habit. O/E: 15cm epigastric mass. Request CT A/P to further elucidate.",
    answers: {
      "patient.age": 76, "patient.sex": "female",
      "workup.localisingFeatures": { v: true, status: "documented", quote: "O/E: 15cm epigastric mass" },
      "weightloss.present": { v: true, status: "documented", quote: "3kg wt loss" },
      "weightloss.periodMonths": { v: 2, status: "inferred", quote: "2/12 h/o" },
      "symptom.abdominalPain": { v: true, status: "documented", quote: "mid/upper abdo discomfort" }
    },
    expect: { determination: "ALTERNATIVE_MANAGEMENT", redirects: ["Localising clinical features or preliminary results suggest cancer in a specific system"] }
  },
  {
    id: "RM-MW-009-ctcap",
    title: "Results matrix MW-009 (Michaela Wood): 68M painless jaundice, hepatomegaly -> localising features -> ALTERNATIVE_MANAGEMENT (cross-exam redirect to US Abdomen is the multi-bundle layer's job)",
    note: "CT chest abdo pelvis. 68 yo man. Sudden onset painless jaundice. Diabetes on metformin. Occasional discomfort R side, some pallor and jaundice. Liver ~2 cm below costal margin. wt 58",
    answers: {
      "patient.age": 68, "patient.sex": "male",
      "workup.localisingFeatures": { v: true, status: "documented", quote: "Liver ~2 cm below costal margin" },
      "symptom.abdominalPain": { v: true, status: "documented", quote: "occasional discomfort R side" }
    },
    expect: { determination: "ALTERNATIVE_MANAGEMENT" }
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
    questionnaire: "http://crr.health.nz/fhir/Questionnaire/CRR-CT-CAP-Adult",
    status: "completed",
    subject: { reference: "Patient/" + s.id },
    authored: "2026-09-05",
    item: Object.entries(groups).map(([g, items]) => ({ linkId: g, item: items }))
  };
}

// ---- Patient-record builders (retrieval path) --------------------------------
// PLACEHOLDER codes - mirror the population library; replace with NZHTS-validated bindings.
const ANALYTE = {
  hb: ["718-7", "Hemoglobin"], crp: ["1988-5", "C reactive protein"], calcium: ["17861-6", "Calcium"],
  platelets: ["777-3", "Platelets"], alp: ["6768-6", "Alkaline phosphatase"], albumin: ["1751-7", "Albumin"], weight: ["29463-7", "Body weight"]
};
const PROCEDURE = { "ct-cap": "CT-CAP", "us-abdo-pelvis": "US-ABDO-PELVIS" };

// Record fixtures are dated relative to a reference instant. The live test path
// (populate/merge, which compares against CQL `Now()`) uses the default —
// the real current time — so "240 days ago" is genuinely 240 days ago. The
// serialized `scenarios-bundle.json` snapshot passes a fixed reference so that
// committed file only changes when scenario content changes, not on every run.
export const REFERENCE_INSTANT_MS = Date.parse("2026-09-06T00:00:00Z");
const isoDaysAgo = (d, refMs) => new Date(refMs - d * 86400000).toISOString().slice(0, 19) + "+12:00";

export function toRecordResources(s, refMs = Date.now()) {
  const out = [];
  (s.record || []).forEach((r, i) => {
    if (r.obs) {
      const [code, display] = ANALYTE[r.obs];
      const o = { resourceType: "Observation", id: `${s.id}-${r.obs}-${i}`, status: "final",
        code: { coding: [{ system: "http://loinc.org", code, display }] },
        subject: { reference: "Patient/" + s.id }, effectiveDateTime: isoDaysAgo(r.daysAgo, refMs),
        valueQuantity: { value: r.value, unit: r.unit, system: "http://unitsofmeasure.org", code: r.unit } };
      if (r.interp) o.interpretation = [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", code: r.interp }] }];
      out.push(o);
    } else if (r.report) {
      out.push({ resourceType: "DiagnosticReport", id: `${s.id}-${r.report}-${i}`, status: "final",
        code: { coding: [{ system: "http://crr.health.nz/fhir/CodeSystem/procedure-placeholder", code: PROCEDURE[r.report] }] },
        subject: { reference: "Patient/" + s.id }, effectiveDateTime: isoDaysAgo(r.daysAgo, refMs) });
    }
  });
  return out;
}

export function toRecordBundle(s) {
  return { resourceType: "Bundle", type: "collection",
    entry: [{ resource: { resourceType: "Patient", id: s.id } }, ...toRecordResources(s).map(r => ({ resource: r }))] };
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
