/*
  CRR CT Chest, Abdomen and Pelvis - Adult
  POPULATION LIBRARY (retrieval path, pipeline stage 4)

  PURPOSE
    Derives QuestionnaireResponse answers for CRR-CT-CAP-Adult indicators from
    coded patient-record data (FHIR Observation, DiagnosticReport) when a
    referrer system or national platform supplies it. The criteria library
    never reads these resources; this library turns them into answers that are
    merged into the QuestionnaireResponse with evidence status 'retrieved' and a
    source reference. It is DORMANT until a retrieval tier is enabled.

  WHAT CAN BE RETRIEVED, AND WHAT CANNOT
    Retrievable: lab abnormal flags and values, persistence on repeat testing
    (two abnormal results >= 21 days apart), weight loss percent and period
    from recorded weights, prior CT CAP / US abdomen-pelvis within the window.
    NOT retrievable: 'lab.unexplained', 'workup.strongSuspicionMalignancy',
    'workup.localisingFeatures', specialist advice, funding. These are clinical
    judgements and stay with the referrer / note. This is deliberate: the
    retrieval path removes documentation burden, not clinical responsibility.

  TERMINOLOGY - PLACEHOLDERS
    Codes below are LOINC placeholders for the analytes and a CRR placeholder
    codesystem for procedures. They MUST be replaced by NZHTS-validated
    bindings (NZPOCS for laboratory observations; a national radiology
    procedure reference set, which does not yet exist in NZHTS) before this
    library is enabled. The build's terminology validation step is where that
    is enforced.

  ABNORMAL FLAGS
    Taken from Observation.interpretation (v3 ObservationInterpretation
    H / HH = high, L / LL = low). No thresholds are applied here; the lab's own
    reference range decides. See README review question Q6.
*/

library CRR_CTCAP_Population version '2.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

codesystem "LOINC": 'http://loinc.org'
codesystem "ObservationInterpretation": 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation'
codesystem "CRR Procedure Placeholder": 'http://crr.health.nz/fhir/CodeSystem/procedure-placeholder'

// PLACEHOLDER analyte codes - replace with NZPOCS-validated bindings
code "Haemoglobin": '718-7' from "LOINC" display 'Hemoglobin [Mass/volume] in Blood'
code "CRP": '1988-5' from "LOINC" display 'C reactive protein [Mass/volume] in Serum or Plasma'
code "Calcium": '17861-6' from "LOINC" display 'Calcium [Mass/volume] in Serum or Plasma'
code "Platelets": '777-3' from "LOINC" display 'Platelets [#/volume] in Blood by Automated count'
code "ALP": '6768-6' from "LOINC" display 'Alkaline phosphatase [Enzymatic activity/volume] in Serum or Plasma'
code "Albumin": '1751-7' from "LOINC" display 'Albumin [Mass/volume] in Serum or Plasma'
code "Body Weight": '29463-7' from "LOINC" display 'Body weight'

// PLACEHOLDER procedure codes - replace with the national radiology procedure reference set
code "CT Chest Abdomen Pelvis": 'CT-CAP' from "CRR Procedure Placeholder"
code "US Abdomen Pelvis": 'US-ABDO-PELVIS' from "CRR Procedure Placeholder"

parameter "Repeat Interval Days" Integer default 21
parameter "Weight Window Min Months" Integer default 3
parameter "Weight Window Max Months" Integer default 6

define "Repeat Interval": System.Quantity { value: "Repeat Interval Days", unit: 'days' }
define "Weight Window Min": System.Quantity { value: "Weight Window Min Months", unit: 'months' }
define "Weight Window Max": System.Quantity { value: "Weight Window Max Months", unit: 'months' }

context Patient

// ---------------------------------------------------------------------------
// Observation access
// ---------------------------------------------------------------------------

define function "Has Interpretation"(O Observation, codes List<String>):
  exists (O.interpretation I where exists (I.coding C where C.code.value in codes))

define function "Results"(c Code):
  [Observation: c] O
    where O.status.value in { 'final', 'amended', 'corrected' }
      and O.effective is not null
    return Tuple {
      id: 'Observation/' + O.id.value,
      dt: FHIRHelpers.ToDateTime(O.effective as FHIR.dateTime),
      high: "Has Interpretation"(O, { 'H', 'HH' }),
      low: "Has Interpretation"(O, { 'L', 'LL' }),
      value: FHIRHelpers.ToQuantity(O.value as FHIR.Quantity)
    }
    sort by dt desc

define function "Latest"(c Code):
  First("Results"(c))

/*
  Persistence on repeat: the latest result is abnormal in the given direction
  AND an earlier result at least "Repeat Interval Days" before it is abnormal
  in the same direction.
*/
define function "Repeat Confirmed"(c Code, direction String):
  if "Latest"(c) is null then null
  else
    (
      if direction = 'high' then "Latest"(c).high else "Latest"(c).low
    )
    and exists (
      ("Results"(c)) R
        where (if direction = 'high' then R.high else R.low)
          and R.dt <= "Latest"(c).dt - "Repeat Interval"
    )

// ---------------------------------------------------------------------------
// Laboratory indicators
// ---------------------------------------------------------------------------

define "Hb Low": "Latest"("Haemoglobin").low
define "CRP Raised": "Latest"("CRP").high
define "Calcium Raised": "Latest"("Calcium").high
define "Platelets High": "Latest"("Platelets").high
define "ALP High": "Latest"("ALP").high
define "Albumin Low": "Latest"("Albumin").low

define "Hb Value": "Latest"("Haemoglobin").value
define "CRP Value": "Latest"("CRP").value
define "Calcium Value": "Latest"("Calcium").value
define "Platelets Value": "Latest"("Platelets").value
define "ALP Value": "Latest"("ALP").value
define "Albumin Value": "Latest"("Albumin").value

// Per-analyte repeat flags, only for analytes currently abnormal in the criterion's direction
define "Abnormal Analyte Repeat Flags":
  (List<Boolean>{
    if "Hb Low" is true then "Repeat Confirmed"("Haemoglobin", 'low') else null,
    if "CRP Raised" is true then "Repeat Confirmed"("CRP", 'high') else null,
    if "Calcium Raised" is true then "Repeat Confirmed"("Calcium", 'high') else null,
    if "Platelets High" is true then "Repeat Confirmed"("Platelets", 'high') else null,
    if "ALP High" is true then "Repeat Confirmed"("ALP", 'high') else null,
    if "Albumin Low" is true then "Repeat Confirmed"("Albumin", 'low') else null
  }) F where F is not null return all F

/*
  'lab.repeatConfirmed' - "persistent on repeat testing after three weeks".
  True only when EVERY currently-abnormal analyte has a confirming earlier
  abnormal result; null when no analyte is abnormal (nothing to confirm).
*/
define "Repeat Confirmed All":
  if not exists "Abnormal Analyte Repeat Flags" then null
  else AllTrue("Abnormal Analyte Repeat Flags")

// ---------------------------------------------------------------------------
// Weight loss from recorded weights
// ---------------------------------------------------------------------------

define "Weights": "Results"("Body Weight")
define "Latest Weight": First("Weights")

/*
  Prior weight: the earliest recorded weight between Min and Max months before
  the latest weight (i.e. the longest baseline inside the criteria window).
*/
define "Prior Weight":
  Last(
    "Weights" W
      where W.dt <= "Latest Weight".dt - "Weight Window Min"
        and W.dt >= "Latest Weight".dt - "Weight Window Max"
  )

define "Weight Loss Percent":
  if "Latest Weight" is null or "Prior Weight" is null then null
  else Round(100 * ("Prior Weight".value.value - "Latest Weight".value.value) / "Prior Weight".value.value, 1)

define "Weight Loss Period Months":
  if "Latest Weight" is null or "Prior Weight" is null then null
  else Round((days between "Prior Weight".dt and "Latest Weight".dt) / 30.44, 1)

define "Weight Loss Present From Record":
  if "Weight Loss Percent" is null then null else "Weight Loss Percent" > 0

// ---------------------------------------------------------------------------
// Prior imaging (redirects)
// ---------------------------------------------------------------------------

define function "Reports Within"(c Code, window System.Quantity):
  [DiagnosticReport: c] R
    where R.status.value in { 'final', 'amended', 'corrected', 'appended' }
      and FHIRHelpers.ToDateTime(R.effective as FHIR.dateTime) >= Now() - window
    return 'DiagnosticReport/' + R.id.value

define "Recent CT CAP Reports": "Reports Within"("CT Chest Abdomen Pelvis", 12 months)
define "Recent US Abdomen Pelvis Reports": "Reports Within"("US Abdomen Pelvis", 3 months)

// ---------------------------------------------------------------------------
// Populated answers - consumed by the population/merge step
// ---------------------------------------------------------------------------

define function "Bool Answer"(linkId String, v Boolean, sources List<String>):
  if v is null then null
  else Tuple { linkId: linkId, type: 'boolean', valueBoolean: v, valueDecimal: null as Decimal, valueQuantity: null as System.Quantity, sources: sources }

define function "Dec Answer"(linkId String, v Decimal, sources List<String>):
  if v is null then null
  else Tuple { linkId: linkId, type: 'decimal', valueBoolean: null as Boolean, valueDecimal: v, valueQuantity: null as System.Quantity, sources: sources }

define function "Qty Answer"(linkId String, v System.Quantity, sources List<String>):
  if v is null then null
  else Tuple { linkId: linkId, type: 'quantity', valueBoolean: null as Boolean, valueDecimal: null as Decimal, valueQuantity: v, sources: sources }

define function "Src"(c Code): { "Latest"(c).id }

define "Weight Sources":
  if "Latest Weight" is null or "Prior Weight" is null then {} as List<String>
  else { "Prior Weight".id, "Latest Weight".id }

define "Populated Answers":
  (List<Tuple { linkId String, type String, valueBoolean Boolean, valueDecimal Decimal, valueQuantity System.Quantity, sources List<String> }>{
    "Bool Answer"('lab.hb.low', "Hb Low", "Src"("Haemoglobin")),
    "Qty Answer"('lab.hb.value', "Hb Value", "Src"("Haemoglobin")),
    "Bool Answer"('lab.crp.raised', "CRP Raised", "Src"("CRP")),
    "Qty Answer"('lab.crp.value', "CRP Value", "Src"("CRP")),
    "Bool Answer"('lab.calcium.raised', "Calcium Raised", "Src"("Calcium")),
    "Qty Answer"('lab.calcium.value', "Calcium Value", "Src"("Calcium")),
    "Bool Answer"('lab.platelets.high', "Platelets High", "Src"("Platelets")),
    "Qty Answer"('lab.platelets.value', "Platelets Value", "Src"("Platelets")),
    "Bool Answer"('lab.alp.high', "ALP High", "Src"("ALP")),
    "Qty Answer"('lab.alp.value', "ALP Value", "Src"("ALP")),
    "Bool Answer"('lab.albumin.low', "Albumin Low", "Src"("Albumin")),
    "Qty Answer"('lab.albumin.value', "Albumin Value", "Src"("Albumin")),
    "Bool Answer"('lab.repeatConfirmed', "Repeat Confirmed All",
      ("Abnormal Analyte Repeat Flags" F return all 'Observation') ),
    "Bool Answer"('weightloss.present', "Weight Loss Present From Record", "Weight Sources"),
    "Bool Answer"('weightloss.measured', if "Weight Loss Percent" is null then null else true, "Weight Sources"),
    "Dec Answer"('weightloss.percent', "Weight Loss Percent", "Weight Sources"),
    "Dec Answer"('weightloss.periodMonths', "Weight Loss Period Months", "Weight Sources"),
    "Bool Answer"('excl.recentCTCAP12m', exists "Recent CT CAP Reports", "Recent CT CAP Reports"),
    "Bool Answer"('excl.recentUSAbdoPelvis3m', exists "Recent US Abdomen Pelvis Reports", "Recent US Abdomen Pelvis Reports")
  }) A where A is not null return all A
