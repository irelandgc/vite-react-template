# Extraction contract — free-text referral note to QuestionnaireResponse

This is the only job the LLM has in the two-stage architecture. It reads the referral note and fills in a FHIR `QuestionnaireResponse` against `Questionnaire/CRR-CT-CAP-Adult`. It does **not** decide whether criteria are met, does not assign priority, and does not comment on the referral. The CQL library does all of that.

## Rules the extraction must obey

1. **Only answer what the note supports.** An indicator the note does not address is omitted. Omission is the correct output for "not stated"; it becomes a missing-information prompt downstream. Never answer `false` to mean "not mentioned".
2. **Every answer carries evidence.** Each answer has the `answer-evidence` extension with:
   - `status` = `documented` when the value is stated in the note (a verbatim or trivially rephrased fact), or `inferred` when the value is derived by calculation, reasoning, or clinical interpretation.
   - `quote` = the shortest verbatim span of the note that supports the answer. The quote must appear in the note character-for-character (whitespace-normalised). A quote that is not in the note is an extraction failure.
3. **Calculations are inferences.** "80kg → 74kg" supports `weightloss.measured = true` (documented) and `weightloss.percent = 7.5` (**inferred**, quote "80kg → 74kg"). A stated "lost 7.5%" is documented.
4. **Clinical interpretation is an inference.** "Tired all the time" → `symptom.fatigue = true` is documented (same concept). "Clothes loose" → `weightloss.present = true` is documented. "Clothes loose" → `weightloss.percent` is **not answerable** (omit). "Hb 98" → `lab.hb.low = true` is **inferred** unless the note says it is low or flags it.
5. **Temporal ambiguity is left to the engine.** "A few months" → omit `weightloss.periodMonths` (do not guess a number). "Since March" with a dated note → `periodMonths` inferred with the quote.
6. **Negation is documented.** "No masses, no localising signs" → `workup.localisingFeatures = false`, documented.
7. **Do not answer `patient.age` / `patient.sex` if supplied by the calling application** (TA-005); the engine falls back to the Patient resource.
8. **Never output free-text commentary, verdicts, priorities or advice.** The output is the QuestionnaireResponse and nothing else.

## Output shape

```json
{
  "resourceType": "QuestionnaireResponse",
  "questionnaire": "http://crr.health.nz/fhir/Questionnaire/CRR-CT-CAP-Adult",
  "status": "completed",
  "subject": { "reference": "Patient/<id>" },
  "item": [
    { "linkId": "weightloss", "item": [
      { "linkId": "weightloss.present", "answer": [{ "valueBoolean": true,
          "extension": [{ "url": "http://crr.health.nz/fhir/StructureDefinition/answer-evidence",
            "extension": [{ "url": "status", "valueCode": "documented" },
                          { "url": "quote",  "valueString": "Was 80kg in March, 74kg today. Unintentional." }] }] }] },
      { "linkId": "weightloss.percent", "answer": [{ "valueDecimal": 7.5,
          "extension": [{ "url": "http://crr.health.nz/fhir/StructureDefinition/answer-evidence",
            "extension": [{ "url": "status", "valueCode": "inferred" },
                          { "url": "quote",  "valueString": "Was 80kg in March, 74kg today" }] }] }] }
    ]}
  ]
}
```

Value types follow the Questionnaire item type: `boolean → valueBoolean`, `integer → valueInteger`, `decimal → valueDecimal`, `quantity → valueQuantity`, `string → valueString`, `choice → valueCoding` (system `http://hl7.org/fhir/administrative-gender` for `patient.sex`).

## The third status: `retrieved` (retrieval path, dormant until enabled)

When a retrieval tier is enabled, the population step (pipeline stage 4, library `CRR_CTCAP_Population`) derives answers from coded patient-record data and the merge step (stage 5) adds them to the QuestionnaireResponse with:

- `status` = `retrieved`
- one `source` sub-extension per contributing resource, e.g. `valueReference: { reference: "Observation/hb-2026-08-30" }`, instead of a quote.

Precedence at merge is **retrieved › documented › inferred**. A retrieved value replaces a note-derived value for the same linkId; the disagreement is recorded (`discrepancies`, with the note value, its status and the record sources) and shown to the triager rather than silently discarded. The LLM never produces `retrieved` and must not be asked to.

Only indicators that are facts of record can be retrieved: lab flags and values, persistence on repeat testing (two abnormal results ≥ 21 days apart), weight-loss percentage and period from recorded weights, prior CT CAP / US abdomen-pelvis within the window. Clinical judgements — `workup.strongSuspicionMalignancy`, `workup.localisingFeatures`, `lab.unexplained`, specialist advice, funding — are never retrieved; they stay with the referrer. Which items are retrievable is declared on the Questionnaire itself (`initialExpression` on the item), so the contract is self-describing.

## How the engine uses the evidence

- In `Documentation Standard = 'strict'` (default) `documented` and `retrieved` answers establish an indicator; `inferred` answers are treated as unanswered and are listed in `inferredExcludedByStrictStandard` so the referrer can confirm them.
- In `Documentation Standard = 'inferred'` all three count; `inferredIndicators` and `retrievedIndicators` are still reported for the triager.
- Answers with no evidence extension (structured form input, Criteria Viewer ticks) are treated as documented.

## Why this fixes the fabrication finding

The evaluated tool presented an inferred finding as documented. Under this contract the model cannot do that: it has to label every value, quote the note, and the quote is mechanically checkable against the note before the engine runs. A value whose quote is not in the note is rejected at the gate; a value labelled inferred cannot establish a criterion in strict mode. The failure mode is converted from "silent" to "detectable and testable".

## Validation gate (run before the engine)

1. Every `quote` exists in the note (normalised whitespace, case-insensitive).
2. Every `linkId` exists in the Questionnaire; every value type matches the item type.
3. No answer is present without an evidence extension (LLM path only).
4. Reject the whole response on any failure and log it — a partial response would silently become "insufficient information".

## Evaluation design (benchmark dataset, per CK Jin's recommendation)

Ground truth is labelled **per indicator per case**: for each linkId, the expected value and expected status (documented / inferred / absent) with the expected quote. Extraction accuracy is then precision/recall per indicator, and the final verdict is checked separately by running the ground-truth QuestionnaireResponse through the engine. This separates "did the model read the note correctly" from "are the rules right", which the current single-verdict evaluation cannot do. It also makes model comparison (Claude vs Azure OpenAI) a bounded extraction benchmark rather than a clinical-judgement comparison.
