# Extraction contract — free-text referral note to QuestionnaireResponse

**Version 2** (ARCH-MIG-01 slice 4a) · generalised from one exam/site to many.
v1 was written against `Questionnaire/CRR-CT-CAP-Adult` alone. Rules 1–8 and the output shape
are unchanged; §"Rules added in v2" adds what many exam/sites and a national red-flag layer
require. Implemented by the extraction prompt `prompt-v3.0.0.md`; enforced by the validation
gate (slice 4b), whose reject cases are in `gate-vectors/`.

This is the only job the LLM has in the two-stage architecture. It reads the referral note and
fills in FHIR `QuestionnaireResponse` items against the Questionnaires it is given. It does
**not** decide whether criteria are met, does not assign priority, does not decide whether a
red flag means the patient needs acute assessment, and does not comment on the referral. The
CQL libraries do all of that.

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

Rules 4 and 5 are the fabrication and typo-assumption findings (KI-01, KI-04, KI-10) written as
rules. The closed list of phrase equivalences that rule 4's first two examples come from is
`concept-equivalence-v1.md`; nothing outside that list earns `documented` on grounds of
equivalence.

---

## Rules added in v2 (generalisation to many exam/sites)

### 9. Multi-Questionnaire input, one response

The model receives **the national Questionnaire** (`Questionnaire/CRR-National` — red flags,
the ACC redirect, demographics) plus **one or more site Questionnaires**, and answers a single
QuestionnaireResponse covering all of them. A linkId shared between Questionnaires is answered
**once**; the vocabulary exists so that the same concept has the same linkId everywhere
(`vocabulary/indicators.json`, KI-01). Unanswered items are omitted, never `false` (rule 1).

> **Example.** Selected: CT CAP + the national Questionnaire. Note: *"68M, 3/12 unintentional weight loss, no localising signs. Some loin pain."*
> `weightloss.present` is answered once, though only CT CAP asks it. `redflag.loinPainOrTenderness` is answered once, though only the national Questionnaire asks it. `redflag.pyelonephritisSuspected` is **omitted** — the note raises loin pain, not pyelonephritis, and answering the stem `false` would be rule 1's forbidden move.

Because one response spans several Questionnaires, its `questionnaire` element names the
national canonical (the one Questionnaire present in every assessment) and the envelope's
`questionnaires[]` lists them all; the gate validates every linkId against the **union**. The
alternative — one response per Questionnaire — was rejected: it would answer shared linkIds
more than once, which is precisely what this rule forbids (AD-15).

### 10. Exam/site selection

The model is given the **published exam/site list — ids and titles only, never criteria** —
and outputs `examSites[]`: the requested id, plus any other id the note plausibly indicates,
each with a quote (gap analysis §4, KI-08, TA-002/TA-006). The engine then evaluates every
candidate and decides; the model never says which exam is *right*.

A `?`-prefixed or "query" marker is the GP raising a possibility (clause 7). It **may** support
a candidate exam/site. It **never** answers a condition-present indicator as `documented`.

**Quotes on `examSites[]`.** A **candidate** (`requested: false`) must carry a quote — it is the
model's claim that the note indicates that exam, and an unquotable claim is exactly what the
gate exists to catch. The **requested** entry (`requested: true`) comes from the calling
application, not from the note, so its quote is `null` whenever the note does not name the exam;
many real referral notes do not. The gate checks a quote only where one is present, and requires
one on every candidate (gate rule 5).

> **Example.** Note: *"68 yo man. Sudden onset painless jaundice … Liver ~2 cm below costal margin. Request CT chest abdo pelvis."*
> ```json
> "examSites": [
>   { "id": "ct_cap",     "requested": true,  "quote": "Request CT chest abdo pelvis" },
>   { "id": "us_abdomen", "requested": false, "quote": "painless jaundice" }
> ]
> ```
> The cross-exam recommendation (MW-009) is then the engine's output, not the model's opinion.
>
> **Example of the `?` rule.** Note: *"55F ?TIA, left arm weakness resolved."*
> `us_carotid` becomes a candidate with quote `"?TIA"`. `redflag.suspectedTIA` is **not**
> answered `documented` from `"?TIA"` alone — a query is not an assertion. If the model judges
> the note does support the suspicion, it may answer `inferred`, which under `strict` does not
> fire the flag (AD-04, Q21).

### 11. Numeric and temporal values are answered as written

No correction of apparent typos, no guessed durations, no unit conversion, no rounding
(KI-10, clause 16). If the value is ambiguous, omit it — the engine reports insufficient
information and names the indicator, which is the useful outcome.

Qualitative lab statements answer the **boolean flag** as `documented` (KI-06, clause 13):
"Hb mildly low" → `lab.hb.low = true`, documented. A criterion stating a **numeric threshold**
needs a value, and a qualitative statement does not supply one.

> **Example.** *"21yo with headache"* in a note the referrer meant as 61: `patient.age = 21`, documented, quote `"21yo"`. The model does not correct it and does not flag it as odd (DG-005).
> *"Creatinine 180"* → `lab.creatinine.value = 180` documented, **no unit asserted** (the source document contradicts itself on the unit — KI-47, Q7).
> *"renal impairment"* with no number → `lab.creatinine.value` and `lab.egfr.value` are **omitted**. Q7b (pending clinical ruling) asks whether the qualitative statement should satisfy the threshold; the literal reading — number required — is what is encoded, and it sits in tension with KI-06's rule for boolean flags.
> *"lost a bit of weight over a few months"* → `weightloss.present = true` documented; `weightloss.percent` and `weightloss.periodMonths` **omitted** (rule 5).

### 12. Red-flag items are answered like any other indicator

`redflag.*` items are answered `documented` with a quote, `inferred` when reasoned, and
**omitted** when the note does not raise the concept. The model is never told what a red flag
*means* for the outcome and is never asked whether the patient needs acute assessment. The
national library decides that, before any exam library runs (AD-03).

Two consequences the model must not try to be clever about:

- **Omission is correct and is silent.** A flag the note never raises is omitted; the engine does not report it (AD-04, Q20). The model must not answer 30 flags `false` to be thorough.
- **A compound flag's qualifiers are answered independently of its stem.** If the note raises the stem but says nothing about the qualifiers, answer the stem and omit the qualifiers; the engine reports the flag as *indeterminate* and names what is missing. The model must not resolve the compound itself.

> **Example.** Note: *"34F acute back pain since yesterday, saddle numbness."*
> `symptom.backPain = true` documented (`"acute back pain"`); `redflag.backPainAcuteOnset = true` documented (`"acute back pain since yesterday"`); `redflag.saddleAnaesthesia = true` documented (`"saddle numbness"`). The other four RF-20 qualifiers are **omitted**. The model does not output "cauda equina" or "ED" anywhere — RF-20 fires in CQL.
>
> **Example of stem-only.** Note: *"Query pyelonephritis, on antibiotics."* `redflag.pyelonephritisSuspected` = `inferred` at most (rule 10's `?` rule); every RF-12 qualifier omitted. The engine reports RF-12 indeterminate and lists the qualifiers.

Red flags are **not** exempt from the documentation standard: under `strict`, an `inferred`
answer does not fire the flag (AD-04, Q21 — pending clinical ruling; the residual risk that a
simple flag answered only by inference is silent is recorded there, not solved here).

### 13. Age and sex

Only from explicit text, and only when the calling application has not supplied them (rule 7,
KI-09, TA-005). `patient.age` in **years as written**; `patient.ageMonths` when the note gives
months. Never derive age from a date of birth the note happens to carry, never infer sex from a
name or a pronoun, and never infer either from the clinical picture.

> **Example.** *"6 week old with fever"* → `patient.ageMonths = 1.5` … **no.** "6 week old" is not months as written: answer `patient.ageMonths = 1.5` only as `inferred` (it is a conversion — rule 3), or preferably omit and let the engine ask. The paediatric infant thresholds ("younger than 3 months", US Renal Paediatric p83) then land indeterminate rather than wrong (Q12). A note saying *"3 month old"* answers `patient.ageMonths = 3` documented.
> *"24 year old"* is answered 24 — the model does not decide whether that is paediatric. `Is Adult` is a CQL define (MW-008, KI-09).

### 14. What the model never outputs

Any of these fields present in the response fails the gate and the **whole response** is
rejected (gate rule 4). Each is a v2.3.0 output field that the engine or the renderer now owns
(decomposition clauses 1, 27, 32, 36, 40):

| Never output | Owned by | Retired clause |
|---|---|---|
| `verdict`, `verdict_title`, `verdict_summary` | engine `Determination` | 38 |
| `priority`, `criteria_page`, `not_funded_flag` | engine + renderer | 38 |
| `met_criteria`, `missing_criteria` | engine rule trace / `missingInformation` | 29, 30 |
| `add_to_note`, `suggested_wording` | renderer, from published item text (D6) | 31, 32 |
| `interpreted_note` (a "corrected" note) | nobody — the redacted note is the record (KI-10) | 36 |
| `notes` / any free-text commentary | nobody (KI-12) | 40 |
| `safety_alert`, `redirect` | national library precedence (AD-03) | 39 |
| `status: "retrieved"` on any answer | the population/merge stage only, never the model | — |

The model outputs the envelope in §"Output shape" and nothing else.

---

## Output shape

**Model-facing shape (prompt v3.0.1).** The model does not write FHIR. It calls one tool,
`submit_extraction`, whose input is `{ answers: [{ linkId, value, status, quote }], examSites: [{ id, requested, quote }] }`.
The tool `input_schema` (prompt `outputTool`) makes `linkId`, `value`, `status` and `quote` all
required, pins `status` to `documented | inferred`, and forbids extra properties. The extraction
**service** then builds the `QuestionnaireResponse` below — grouping answers by linkId prefix,
setting the FHIR value type from the Questionnaire item type, and attaching the `answer-evidence`
extension (`status` + `quote`) to every answer. Rules 1–14 are unchanged; only who serialises the
FHIR changes. v3.0.0 had the model emit the envelope directly and the first benchmark run showed
it dropping the evidence extension intermittently (SR-09) — hence v3.0.1.

**Service-facing envelope (unchanged).** The extraction service returns an envelope; the
QuestionnaireResponse inside it is what the engine consumes (slice 3's
`POST /api/assess/evaluate` takes `{ questionnaireResponse, examSites[], parameters }`).

```json
{
  "questionnaires": [
    "http://crr.health.nz/fhir/Questionnaire/CRR-National",
    "http://crr.health.nz/fhir/Questionnaire/CRR-CT-CAP-Adult"
  ],
  "examSites": [
    { "id": "ct_cap", "requested": true, "quote": "Request CT CAP" }
  ],
  "questionnaireResponse": {
    "resourceType": "QuestionnaireResponse",
    "questionnaire": "http://crr.health.nz/fhir/Questionnaire/CRR-National",
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
}
```

Value types follow the Questionnaire item type: `boolean → valueBoolean`, `integer → valueInteger`, `decimal → valueDecimal`, `quantity → valueQuantity`, `string → valueString`, `choice → valueCoding` (system `http://hl7.org/fhir/administrative-gender` for `patient.sex`).

Group items are nesting only and carry no answer. A compound red flag's stem is an answerable
item that *also* has children (national Questionnaire): answer the stem and, separately, any
child the note supports.

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

The model therefore **always** labels and never chooses which standard applies: the two
doc-mode prompts of v2.3.0 collapse into one prompt and one engine parameter (clauses 20, 21;
TA-010).

## Why this fixes the fabrication finding

The evaluated tool presented an inferred finding as documented. Under this contract the model cannot do that: it has to label every value, quote the note, and the quote is mechanically checkable against the note before the engine runs. A value whose quote is not in the note is rejected at the gate; a value labelled inferred cannot establish a criterion in strict mode. The failure mode is converted from "silent" to "detectable and testable".

## Validation gate (run before the engine)

1. Every `quote` exists in the note (normalised whitespace, case-insensitive).
2. Every `linkId` exists in one of the supplied Questionnaires; every value type matches the item type.
3. No answer is present without an evidence extension (LLM path only).
4. No forbidden field is present (rule 14), and no answer carries `status: "retrieved"` on the model path.
5. Every `examSites[]` entry names an id in the supplied published list; every candidate (`requested: false`) carries a quote, and any quote present satisfies rule 1.
6. Reject the whole response on any failure and log it — a partial response would silently become "insufficient information".

Hand-written responses exercising each of these are in `gate-vectors/`; slice 4b's gate tests
consume them.

## Evaluation design (benchmark dataset, per CK Jin's recommendation)

Ground truth is labelled **per indicator per case**: for each linkId, the expected value and expected status (documented / inferred / absent) with the expected quote. Extraction accuracy is then precision/recall per indicator, and the final verdict is checked separately by running the ground-truth QuestionnaireResponse through the engine. This separates "did the model read the note correctly" from "are the rules right", which the current single-verdict evaluation cannot do. It also makes model comparison (Claude vs Azure OpenAI) a bounded extraction benchmark rather than a clinical-judgement comparison.

The seed set is `../benchmark/ground-truth/` (the four CT CAP cases from the results matrix),
whose `manifest.json` records each case's provenance — the start of the manifest that replaces
the unreconstructable "138" figure (KI-30).
