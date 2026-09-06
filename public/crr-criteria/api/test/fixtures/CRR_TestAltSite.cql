/*
  ARCH-MIG-01 slice 3 — throwaway engine-test fixture. NOT a real site.

  Produces the same Advisory shape a real site library does (determination,
  priorityCode, missingInformation, activeRedirects, ruleTrace), with a
  deliberately different rule from CT CAP: it "meets" (P2_URGENT) iff
  `workup.bloods` is true. That lets one QuestionnaireResponse make one exam
  reach a priority determination and not the other, which is what exercises the
  engine's alternatives[] aggregation (gap analysis §4).

  Compiled once to CRR_TestAltSite.elm.json beside this file:
    node tooling/criteria-bundle/tooling/translate.mjs \
      public/crr-criteria/api/test/fixtures/CRR_TestAltSite.cql \
      public/crr-criteria/api/test/fixtures/CRR_TestAltSite.elm.json
  Regenerate if this file changes.
*/
library CRR_TestAltSite version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

parameter "Documentation Standard" String default 'strict'

context Patient

define "Responses":
  [QuestionnaireResponse] R where R.status.value in { 'completed', 'in-progress' }

define "Top Level Items": flatten ("Responses" R return R.item)
define "Items": "Top Level Items" union flatten ("Top Level Items" I return I.item)

define function "Answer"(linkId String):
  First((First("Items" I where I.linkId.value = linkId)).answer)

define function "Bool"(linkId String):
  if "Answer"(linkId) is not null then FHIRHelpers.ToBoolean("Answer"(linkId).value as FHIR.boolean) else null

define "Meets": "Bool"('workup.bloods') is true

define "Determination":
  if "Meets" then 'P2_URGENT' else 'INSUFFICIENT_INFORMATION'

define "Advisory":
  Tuple {
    exam: 'Test Alternative Site (fixture)',
    criteriaVersion: 'fixture',
    determination: "Determination",
    priorityCode: (if "Determination" = 'P2_URGENT' then 'P2' else null),
    missingInformation: (if "Meets" then {} else { 'workup.bloods' }) as List<String>,
    activeRedirects: {} as List<String>,
    ruleTrace: Tuple { meets: "Meets", documentationStandard: "Documentation Standard" }
  }
