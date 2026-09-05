/*
  CRR National Community Referral Criteria for Imaging (Part I)
  CT Chest, Abdomen and Pelvis - Adult

  SOURCE DOCUMENT
    Title:      National Community Referral Criteria for Imaging (Part I)
    Owner:      System Design Manager Community Radiology
    Authoriser: National Clinical Governance Group
    National ID 15372, Version 2.0, Published 09/04/2026, Review due 09/04/2028
    Section:    Adult CT > CT Chest, Abdomen and Pelvis - Adult, pages 10-11

  PROVENANCE CONVENTION
    Every clinical define below carries a "SOURCE:" comment quoting the published
    wording verbatim, with page reference. A define with no SOURCE comment is
    engineering plumbing, not a clinical rule. Review is a side-by-side check of
    each SOURCE quote against the define beneath it.

  INPUT CONTRACT
    The library evaluates a FHIR R4 QuestionnaireResponse conforming to
    Questionnaire "CRR-CT-CAP-Adult" (see fhir/Questionnaire-CRR-CT-CAP-Adult.json).
    Each answer MAY carry an evidence extension:
      url:    http://crr.health.nz/fhir/StructureDefinition/answer-evidence
        status  code       'documented' | 'inferred' | 'retrieved'
        quote   string     verbatim span from the referral note (documented, inferred)
        source  Reference  system-of-record resource(s) the value came from (retrieved)
    An answer with no evidence extension is treated as directly asserted
    (e.g. structured referral form input) and counts as 'documented'.
    'retrieved' answers are produced by the population library
    (CRR_CTCAP_Population) from coded patient-record data and merged in
    ahead of this library running; they are accepted under every
    documentation standard.
    An indicator that is not answered is NULL and propagates as
    "insufficient information" under CQL three-valued logic.

  THREE-VALUED LOGIC (deliberate)
    true  = criterion met on accepted evidence
    false = criterion definitively not met
    null  = cannot be determined from the information supplied
    This is what turns "the note doesn't say" into a missing-information
    prompt rather than an assumption either way.

  CLINICAL REVIEW FLAGS
    Points where the published wording is ambiguous are marked "REVIEW Qn"
    and listed in README.md. The chosen reading is stated at each point.
*/

library CRR_CTChestAbdomenPelvis_Adult version '2.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

/*
  Documentation standard (BRD TA-010). Governs which evidence statuses are
  accepted as establishing an indicator.
    'strict'   - 'documented' and 'retrieved' answers count; 'inferred'
                 answers are treated as not answered (null).
    'inferred' - 'documented', 'retrieved' and 'inferred' all count.
*/
parameter "Documentation Standard" String default 'strict'

/*
  REVIEW Q1 - Structural reading of the P2 bullet list (see "Meets P2 Criteria").
    'literal'     - A AND (B1 OR B2 OR B3)   [as printed: B3 is a sub-bullet under A]
    'alternative' - (A AND (B1 OR B2)) OR B3 [specialist advice stands alone]
*/
parameter "P2 Structure Reading" String default 'literal'

context Patient

// ---------------------------------------------------------------------------
// Plumbing: QuestionnaireResponse access
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

define function "Int"(linkId String):
  if "Is Accepted"(linkId) then FHIRHelpers.ToInteger("Answer"(linkId).value as FHIR.integer) else null

define function "CodeValue"(linkId String):
  if "Is Accepted"(linkId) then FHIRHelpers.ToCode("Answer"(linkId).value as FHIR.Coding).code else null

// ---------------------------------------------------------------------------
// Demographics
// ---------------------------------------------------------------------------

define "Age In Years":
  Coalesce("Int"('patient.age'), AgeInYears())

define "Sex":
  Coalesce("CodeValue"('patient.sex'), Patient.gender.value)

define "Is Male": "Sex" = 'male'
define "Is Female": "Sex" = 'female'

/*
  SOURCE (Overview, p4, Scope item 5): "The age band covered by the paediatric
  criteria has been specified as up to and including 15 years of age"
*/
define "Is Adult": "Age In Years" > 15

// ---------------------------------------------------------------------------
// Criterion A - initial assessment complete, strong suspicion, no localising features
// ---------------------------------------------------------------------------

/*
  SOURCE (p10, P2 Urgent, first bullet):
  "Following full clinical assessment and examination and initial investigations
   (bloods, urinalysis and CX-RAY), the primary care practitioner has a strong
   suspicion of underlying malignancy but no focal pathology or localising
   signs/symptoms or potential biopsy site has been identified AND"
*/
define "Initial Investigations Complete":
  "Bool"('workup.bloods') and "Bool"('workup.urinalysis') and "Bool"('workup.cxr')

define "Strong Suspicion Of Malignancy":
  "Bool"('workup.strongSuspicionMalignancy')

// Single indicator, used positively here and as an exclusion below.
define "Localising Features Identified":
  "Bool"('workup.localisingFeatures')

define "Criterion A: Assessed, Strong Suspicion, No Localising Features":
  "Initial Investigations Complete"
    and "Strong Suspicion Of Malignancy"
    and not "Localising Features Identified"

// ---------------------------------------------------------------------------
// Shared component - documented unintentional weight loss
// ---------------------------------------------------------------------------

/*
  SOURCE (p10, B1 and p11, B2 - identical wording in both):
  "there is unintentional, unexplained, documented weight loss of more than 5 %
   of usual body weight over 3-6 months (+/- yellow flag symptoms of abdominal
   pain, fatigue, nausea)"

  REVIEW Q2 - "over 3-6 months" is read as: the loss occurred over a period of
  between 3 and 6 months inclusive. Loss over a shorter period (faster) or a
  longer period is NOT met under this reading. Confirm intent.
  REVIEW Q3 - "documented weight loss" is read as requiring recorded weights
  (not patient report alone). Confirm whether this is a hard requirement.
  Yellow flag symptoms are "+/-" and therefore do not affect the logic; they
  are captured for context only.
*/
define "Weight Loss Percent": "Dec"('weightloss.percent')
define "Weight Loss Period Months": "Dec"('weightloss.periodMonths')

define "Weight Loss Criterion":
  "Bool"('weightloss.present')
    and "Bool"('weightloss.measured')
    and "Weight Loss Percent" > 5.0
    and "Weight Loss Period Months" in Interval[3.0, 6.0]

define "Yellow Flag Symptoms Present":
  Coalesce("Bool"('symptom.abdominalPain'), false)
    or Coalesce("Bool"('symptom.fatigue'), false)
    or Coalesce("Bool"('symptom.nausea'), false)

// ---------------------------------------------------------------------------
// Pathway B1 - age/sex threshold + weight loss
// ---------------------------------------------------------------------------

/*
  SOURCE (p10, sub-bullet B1):
  "Male over 50 years of age or female over 60 years, and there is unintentional,
   unexplained, documented weight loss of more than 5 % of usual body weight over
   3-6 months (+/- yellow flag symptoms of abdominal pain, fatigue, nausea)"

  REVIEW Q4 - "over 50" is read as strictly greater than 50 (age 50 does not
  qualify). Same for 60 / 40 / 50 below. Confirm intent.
*/
define "B1 Age Sex Threshold":
  ("Is Male" and "Age In Years" > 50) or ("Is Female" and "Age In Years" > 60)

define "Pathway B1: Age Threshold With Weight Loss":
  "B1 Age Sex Threshold" and "Weight Loss Criterion"

// ---------------------------------------------------------------------------
// Pathway B2 - lower age/sex threshold + weight loss + two or more persistent abnormal labs
// ---------------------------------------------------------------------------

/*
  SOURCE (p11, sub-bullet B2):
  "Male over 40 years of age or female over 50 years of age, and there is
   unintentional, unexplained, documented weight loss of more than 5 % of usual
   body weight over 3-6 months (+/- yellow flag symptoms of abdominal pain,
   fatigue, nausea)
   AND two or more of following abnormal lab test results, which are unexplained,
   and persistent on repeat testing after three weeks: raised CRP, low
   haemoglobin raised calcium, high platelet count, high alkaline phosphatase,
   low albumin."
*/
define "B2 Age Sex Threshold":
  ("Is Male" and "Age In Years" > 40) or ("Is Female" and "Age In Years" > 50)

define "Abnormal Lab Flags":
  {
    "Bool"('lab.crp.raised'),
    "Bool"('lab.hb.low'),
    "Bool"('lab.calcium.raised'),
    "Bool"('lab.platelets.high'),
    "Bool"('lab.alp.high'),
    "Bool"('lab.albumin.low')
  }

// NOTE: "return all" is required - a CQL query returns distinct elements by
// default, which would collapse {true, true} to a count of 1. Length is used
// rather than Count because Count ignores null elements.
define "Abnormal Lab Count": Length("Abnormal Lab Flags" F where F is true return all F)
define "Unknown Lab Count": Length("Abnormal Lab Flags" F where F is null return all F)

// Three-valued: known >= 2 -> true; could still reach 2 with unknowns -> null; else false
define "Two Or More Abnormal Labs":
  if "Abnormal Lab Count" >= 2 then true
  else if "Abnormal Lab Count" + "Unknown Lab Count" >= 2 then null
  else false

define "Abnormal Labs Persistent On Repeat After Three Weeks":
  "Bool"('lab.repeatConfirmed')

define "Abnormal Labs Unexplained":
  "Bool"('lab.unexplained')

define "Two Or More Persistent Unexplained Abnormal Labs":
  "Two Or More Abnormal Labs"
    and "Abnormal Labs Persistent On Repeat After Three Weeks"
    and "Abnormal Labs Unexplained"

define "Pathway B2: Lower Age Threshold With Weight Loss And Abnormal Labs":
  "B2 Age Sex Threshold"
    and "Weight Loss Criterion"
    and "Two Or More Persistent Unexplained Abnormal Labs"

// ---------------------------------------------------------------------------
// Pathway B3 - specialist / PCRL / radiologist advice
// ---------------------------------------------------------------------------

/*
  SOURCE (p11, sub-bullet B3):
  "Secondary care clinician or Primary Care Radiology Liaison (PCRL) or
   radiologist advises referral for urgent CT Chest, Abdomen and Pelvis."
  SOURCE (Overview p5): "If the referral was discussed with and endorsed by any
   secondary care clinician, radiologist, or primary care radiology liaison,
   always include the name and role of that person in the referral."
*/
define "Pathway B3: Specialist Advises Urgent CT CAP":
  "Bool"('advice.urgentCTRecommended')

define "Adviser Name And Role Documented":
  "Is Answered"('advice.adviserNameRole')

// ---------------------------------------------------------------------------
// P2 Urgent determination
// ---------------------------------------------------------------------------

/*
  SOURCE (p10, Timeframe column): "P2 Urgent: non-deferrable imaging or
   intervention that must be completed within 2 weeks of receiving referral"
  SOURCE (p10): "Consider direct referral for CT chest, Abdomen and Pelvis if:"

  REVIEW Q1 - As printed, B1/B2/B3 are sub-bullets beneath the "AND" of
  criterion A, giving A AND (B1 OR B2 OR B3). Clinically, specialist advice
  (B3) may be intended to stand alone. Both readings are encoded; the
  parameter "P2 Structure Reading" selects one. Default is the literal reading.
*/
define "Any B Pathway (B1 or B2)":
  "Pathway B1: Age Threshold With Weight Loss"
    or "Pathway B2: Lower Age Threshold With Weight Loss And Abnormal Labs"

define "Meets P2 Criteria (Literal Reading)":
  "Is Adult"
    and "Criterion A: Assessed, Strong Suspicion, No Localising Features"
    and ("Any B Pathway (B1 or B2)" or "Pathway B3: Specialist Advises Urgent CT CAP")

define "Meets P2 Criteria (Alternative Reading)":
  "Is Adult"
    and (
      ("Criterion A: Assessed, Strong Suspicion, No Localising Features" and "Any B Pathway (B1 or B2)")
        or "Pathway B3: Specialist Advises Urgent CT CAP"
    )

define "Meets P2 Criteria":
  if "P2 Structure Reading" = 'alternative' then "Meets P2 Criteria (Alternative Reading)"
  else "Meets P2 Criteria (Literal Reading)"

// ---------------------------------------------------------------------------
// Alternative management / HealthPathway recommended (redirects)
// ---------------------------------------------------------------------------

/*
  SOURCE (p11, "Alternative management or HealthPathway recommended."):
   - "Patient has a current cancer diagnosis and under continued follow up."
   - "Patient has been investigated by secondary care within the last 12 months
      for the same symptoms/ signs - request follow-up review."
   - "Presentation requiring urgent admission or urgent secondary care assessment."
   - "Localising clinical features or results from preliminary investigations
      which suggest cancer in a specific system."
   - "Recent ultrasound of abdomen & pelvis within the last three months - Seek
      advice from a radiologist, or other appropriate secondary care specialist."
   - "CT Chest, Abdomen & Pelvis within the last 12 months - seek advice from a
      radiologist, or other appropriate secondary care specialist."

  An unknown exclusion is treated as not present (Coalesce to false): absence
  of information about an exclusion does not block a referral, but it is
  surfaced in "Unconfirmed Exclusions" for the triager.
*/
define "Redirect: Current Cancer Under Follow Up": "Bool"('excl.currentCancerFollowUp')
define "Redirect: Investigated By Secondary Care Within 12 Months": "Bool"('excl.secondaryCareInvestigated12m')
define "Redirect: Requires Urgent Admission Or Assessment": "Bool"('excl.urgentAdmissionRequired')
define "Redirect: Localising Features Suggest Cancer In Specific System": "Localising Features Identified"
define "Redirect: US Abdomen Pelvis Within 3 Months": "Bool"('excl.recentUSAbdoPelvis3m')
define "Redirect: CT CAP Within 12 Months": "Bool"('excl.recentCTCAP12m')

define "Active Redirects":
  (List<String>{
    if "Redirect: Current Cancer Under Follow Up" is true then 'Current cancer diagnosis under continued follow up' else null,
    if "Redirect: Investigated By Secondary Care Within 12 Months" is true then 'Investigated by secondary care within the last 12 months for the same symptoms/signs - request follow-up review' else null,
    if "Redirect: Requires Urgent Admission Or Assessment" is true then 'Presentation requiring urgent admission or urgent secondary care assessment' else null,
    if "Redirect: Localising Features Suggest Cancer In Specific System" is true then 'Localising clinical features or preliminary results suggest cancer in a specific system' else null,
    if "Redirect: US Abdomen Pelvis Within 3 Months" is true then 'Ultrasound of abdomen & pelvis within the last three months - seek radiologist / specialist advice' else null,
    if "Redirect: CT CAP Within 12 Months" is true then 'CT Chest, Abdomen & Pelvis within the last 12 months - seek radiologist / specialist advice' else null
  }) R where R is not null

define "Alternative Management Recommended": exists "Active Redirects"

define "Unconfirmed Exclusions":
  (List<String>{
    if "Redirect: Current Cancer Under Follow Up" is null then 'excl.currentCancerFollowUp' else null,
    if "Redirect: Investigated By Secondary Care Within 12 Months" is null then 'excl.secondaryCareInvestigated12m' else null,
    if "Redirect: Requires Urgent Admission Or Assessment" is null then 'excl.urgentAdmissionRequired' else null,
    if "Redirect: US Abdomen Pelvis Within 3 Months" is null then 'excl.recentUSAbdoPelvis3m' else null,
    if "Redirect: CT CAP Within 12 Months" is null then 'excl.recentCTCAP12m' else null
  }) R where R is not null

// ---------------------------------------------------------------------------
// Not routinely funded
// ---------------------------------------------------------------------------

/*
  SOURCE (p11, "Community-referred radiology not routinely funded by Health New
  Zealand in these clinical scenarios. Imaging may still be appropriate, and the
  patient may wish to consider privately funding imaging."):
   - "Patient is unfit for treatment or unwilling to have further investigations
      and / or treatment."
*/
define "Not Routinely Funded":
  Coalesce("Bool"('funding.unfitOrUnwilling'), false)

// ---------------------------------------------------------------------------
// Determination
// ---------------------------------------------------------------------------

/*
  Precedence (REVIEW Q5 - confirm ordering):
    1. Not routinely funded
    2. Alternative management / redirect (BRD TA-013: redirect wins over criteria)
    3. Paediatric patient - the adult criteria do not apply (BRD TA-003)
    4. P2 criteria met
    5. P2 criteria definitively not met
    6. Insufficient information
*/
define "Determination":
  case
    when "Not Routinely Funded" then 'NOT_ROUTINELY_FUNDED'
    when "Alternative Management Recommended" then 'ALTERNATIVE_MANAGEMENT'
    when "Is Adult" is false then 'PAEDIATRIC_CRITERIA_APPLY'
    when "Meets P2 Criteria" is true then 'P2_URGENT'
    when "Meets P2 Criteria" is false then 'CRITERIA_NOT_MET'
    else 'INSUFFICIENT_INFORMATION'
  end

define "Priority Code":
  if "Determination" = 'P2_URGENT' then 'P2' else null

/*
  SOURCE (Overview p5): "urgent P2 (within two weeks)"
  SOURCE (p10): "must be completed within 2 weeks of receiving referral"
*/
define "Priority Timeframe":
  if "Determination" = 'P2_URGENT' then 'Complete within 2 weeks of receiving referral' else null

// ---------------------------------------------------------------------------
// Missing information (referrer checklist)
// ---------------------------------------------------------------------------

define "Missing Core Indicators":
  (List<String>{
    if "Age In Years" is null then 'patient.age' else null,
    if "Sex" is null then 'patient.sex' else null,
    if "Bool"('workup.bloods') is null then 'workup.bloods' else null,
    if "Bool"('workup.urinalysis') is null then 'workup.urinalysis' else null,
    if "Bool"('workup.cxr') is null then 'workup.cxr' else null,
    if "Strong Suspicion Of Malignancy" is null then 'workup.strongSuspicionMalignancy' else null,
    if "Localising Features Identified" is null then 'workup.localisingFeatures' else null,
    if "Bool"('weightloss.present') is null then 'weightloss.present' else null,
    if "Bool"('weightloss.measured') is null then 'weightloss.measured' else null,
    if "Weight Loss Percent" is null then 'weightloss.percent' else null,
    if "Weight Loss Period Months" is null then 'weightloss.periodMonths' else null,
    // Specialist / PCRL advice can establish P2 on its own (alternative reading) or with A (literal); unknown blocks a definitive "not met"
    if "Pathway B3: Specialist Advises Urgent CT CAP" is null then 'advice.urgentCTRecommended' else null
  }) M where M is not null

// Lab information only matters if B1 is not already satisfied.
define "Missing Lab Indicators":
  if "Pathway B1: Age Threshold With Weight Loss" is true then {} as List<String>
  else (List<String>{
    if "Bool"('lab.crp.raised') is null then 'lab.crp.raised' else null,
    if "Bool"('lab.hb.low') is null then 'lab.hb.low' else null,
    if "Bool"('lab.calcium.raised') is null then 'lab.calcium.raised' else null,
    if "Bool"('lab.platelets.high') is null then 'lab.platelets.high' else null,
    if "Bool"('lab.alp.high') is null then 'lab.alp.high' else null,
    if "Bool"('lab.albumin.low') is null then 'lab.albumin.low' else null,
    // repeat/unexplained only matter once two or more abnormal results are possible
    if "Two Or More Abnormal Labs" is not false and "Abnormal Labs Persistent On Repeat After Three Weeks" is null then 'lab.repeatConfirmed' else null,
    if "Two Or More Abnormal Labs" is not false and "Abnormal Labs Unexplained" is null then 'lab.unexplained' else null
  }) M where M is not null

define "Missing Advice Indicators":
  (List<String>{
    if "Pathway B3: Specialist Advises Urgent CT CAP" is true and not "Adviser Name And Role Documented"
      then 'advice.adviserNameRole' else null
  }) M where M is not null

define "Missing Information":
  if "Determination" in { 'P2_URGENT', 'ALTERNATIVE_MANAGEMENT', 'NOT_ROUTINELY_FUNDED' }
    then "Missing Advice Indicators"
  else "Missing Core Indicators" union "Missing Lab Indicators" union "Missing Advice Indicators"

// ---------------------------------------------------------------------------
// Grounding audit - which accepted indicators were inferred rather than documented
// ---------------------------------------------------------------------------

define "All Indicator LinkIds":
  {
    'patient.age', 'patient.sex',
    'workup.bloods', 'workup.urinalysis', 'workup.cxr', 'workup.strongSuspicionMalignancy', 'workup.localisingFeatures',
    'weightloss.present', 'weightloss.measured', 'weightloss.percent', 'weightloss.periodMonths',
    'symptom.abdominalPain', 'symptom.fatigue', 'symptom.nausea',
    'lab.crp.raised', 'lab.hb.low', 'lab.calcium.raised', 'lab.platelets.high', 'lab.alp.high', 'lab.albumin.low',
    'lab.repeatConfirmed', 'lab.unexplained',
    'advice.urgentCTRecommended', 'advice.adviserNameRole',
    'excl.currentCancerFollowUp', 'excl.secondaryCareInvestigated12m', 'excl.urgentAdmissionRequired',
    'excl.recentUSAbdoPelvis3m', 'excl.recentCTCAP12m',
    'funding.unfitOrUnwilling'
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
    isAdult: "Is Adult",
    criterionA: "Criterion A: Assessed, Strong Suspicion, No Localising Features",
    initialInvestigationsComplete: "Initial Investigations Complete",
    strongSuspicion: "Strong Suspicion Of Malignancy",
    localisingFeatures: "Localising Features Identified",
    weightLossCriterion: "Weight Loss Criterion",
    weightLossPercent: "Weight Loss Percent",
    weightLossPeriodMonths: "Weight Loss Period Months",
    b1AgeSexThreshold: "B1 Age Sex Threshold",
    pathwayB1: "Pathway B1: Age Threshold With Weight Loss",
    b2AgeSexThreshold: "B2 Age Sex Threshold",
    abnormalLabCount: "Abnormal Lab Count",
    unknownLabCount: "Unknown Lab Count",
    twoOrMorePersistentUnexplainedAbnormalLabs: "Two Or More Persistent Unexplained Abnormal Labs",
    pathwayB2: "Pathway B2: Lower Age Threshold With Weight Loss And Abnormal Labs",
    pathwayB3: "Pathway B3: Specialist Advises Urgent CT CAP",
    meetsP2Literal: "Meets P2 Criteria (Literal Reading)",
    meetsP2Alternative: "Meets P2 Criteria (Alternative Reading)",
    alternativeManagement: "Alternative Management Recommended",
    notRoutinelyFunded: "Not Routinely Funded",
    documentationStandard: "Documentation Standard",
    p2StructureReading: "P2 Structure Reading"
  }

// ---------------------------------------------------------------------------
// Advisory output (single object for the tools to render)
// ---------------------------------------------------------------------------

define "Advisory":
  Tuple {
    exam: 'CT Chest, Abdomen and Pelvis - Adult',
    criteriaVersion: '2.0 (published 09/04/2026)',
    determination: "Determination",
    priorityCode: "Priority Code",
    priorityTimeframe: "Priority Timeframe",
    activeRedirects: "Active Redirects",
    unconfirmedExclusions: "Unconfirmed Exclusions",
    missingInformation: "Missing Information",
    inferredIndicators: "Inferred Indicators",
    inferredExcludedByStrictStandard: "Inferred Indicators Excluded By Strict Standard",
    retrievedIndicators: "Retrieved Indicators",
    yellowFlagSymptoms: "Yellow Flag Symptoms Present",
    ruleTrace: "Rule Trace"
  }
