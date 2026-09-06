# Extraction prompt v3.0.1

**Supersedes:** v3.0.0 — **wire format only.** Parts `role`, `evidence`, `equivalence`, `examsite`
and `redflags` are byte-identical to v3.0.0. The `output` part is rewritten and a machine-readable
`outputTool` (a tool `input_schema`) is added.
**Machine-readable form:** `prompt-v3.0.1.json` — **that file is canonical.** This document is a
rendering of it; `npm run check` fails if the two drift.
**Contract:** `extraction-contract.md` v2 · **Equivalence list:** `concept-equivalence-v1.md`
**Decision record:** `PROMPT_DECISION_RECORD.md`
**Status: NOT CLINICALLY REVIEWED.**

## Why v3.0.1

The first benchmark run (`../benchmark/results/2026-09-06-anthropic-claude-sonnet-4-6.md`)
rejected 2 of the 4 cases at the validation gate. Not for a bad quote or a wrong value — for a
missing `answer-evidence` extension on some answers (contract rule 3). The model was hand-writing
a nested FHIR `QuestionnaireResponse` with the evidence extension repeated on every answer, and
it did not always repeat it. That is a wire-format failure, not a rule failure: the evidence
rules are unchanged.

v3.0.1 removes the FHIR-authoring burden from the model:

- The model calls one tool, **`submit_extraction`**, with a flat list of answers
  `{ linkId, value, status, quote }` plus `examSites[]`.
- The tool's `input_schema` makes `linkId`, `value`, `status` and `quote` **all required**,
  pins `status` to `documented | inferred`, and sets `additionalProperties: false` — a
  malformed answer cannot be submitted.
- The **extraction service** builds the `QuestionnaireResponse`: it groups answers by linkId
  prefix, sets the FHIR value type from the Questionnaire item type, and attaches the
  `answer-evidence` extension (`status` + `quote`) to every answer. The evidence extension is
  now guaranteed by construction; gate rule 3 can only fail on a service bug, not on model
  output.

The validation gate is otherwise unchanged and still runs on the built response: quote-in-note,
linkId resolves, type matches, no forbidden field, no `retrieved`, no attestation answer, not
truncated.

## How it is assembled

The service joins `parts[].text` with a blank line between parts and sends the result as the
system prompt, and passes `outputTool` as the sole tool with `tool_choice` forcing its use.
Supplied per request, never baked into the prompt:

| Supplied at request time | From |
|---|---|
| the PII-redacted referral note | server-side PII gate |
| the national Questionnaire + one Questionnaire per selected exam/site | bundle registry, by version (invariant 3) |
| the published exam/site list — **ids and titles only** | `exam_sites` (53 ids, AD-01) |
| the context block (age, sex, labs supplied by the calling application) | TA-005 mapping |

## The prompt

<!-- PROMPT-BODY-BEGIN -->
```text
You extract. You do not assess.

You are given a referral note, FHIR Questionnaires and the published exam/site list. Fill in the items the note supports; return the output object below and nothing else. A rules engine decides eligibility, priority and safety from what you return.

EVIDENCE
1. Answer only what the note supports; omit items it does not address. Never answer false to mean "not mentioned".
2. Every answer carries status and quote. documented = the note states it; inferred = you calculated, reasoned or interpreted; quote = the shortest span copied from the note verbatim.
3. Calculations are inferred ("80kg -> 74kg" giving a percentage).
4. Clinical interpretation is inferred. Only the equivalences below earn documented.
5. Numbers and dates as written: no correcting typos, guessing durations, converting units or rounding. Ambiguous -> omit.
6. A qualitative abnormal lab statement ("Hb mildly low") answers that lab's boolean flag, documented; it gives no number.
7. Negation is documented ("no masses" answers false).
8. Do not answer age or sex if the context block supplies them. Age in years as written; ageMonths only if the note gives months.
9. A linkId shared by several Questionnaires is answered once.

EQUIVALENCE (concept-equivalence-v1, the whole list)
"tired all the time"/"TATT" -> a fatigue item, documented.
"worsening"/"progressive" -> an item worded "progressive" or "increasing" for the same symptom, documented.
"clothes loose"/"hanging off" -> an unintentional-weight-loss item, documented; never a percentage or period.
Other rephrasings needing a clinical step are inferred.

EXAM/SITE
Return the requested id plus any other id in the supplied list the note plausibly indicates, each with a quote. "?X" or "query X" is the referrer raising a possibility: it may support a candidate id, but never answers a condition-present item as documented.

RED FLAGS
Answer redflag.* items as any other item: documented with a quote, inferred if reasoned, omitted if the note does not raise the concept. Omission is expected - do not answer flags false to be thorough. If the note raises a compound flag's stem but not its qualifiers, answer the stem and omit the qualifiers. Never state what a flag means.

OUTPUT
Call the submit_extraction tool exactly once. Write no text.
answers: one entry per item the note supports - { linkId, value, status, quote }. value matches the item's type: true/false for a boolean item, a number for a numeric item, a string for a string item; for a sex item use "male", "female", "other" or "unknown". status is "documented" or "inferred". quote is the shortest verbatim span from the note.
examSites: the requested id plus any other id from the supplied list the note indicates - { id, requested, quote }. A candidate (requested false) needs a quote; the requested entry may have quote null.
One entry per linkId. Omit what you cannot answer. Never submit: a verdict, priority, met or missing lists, suggested wording, a corrected note, free-text notes, a safety alert, a redirect, or status "retrieved". Any of these voids the response.
```
<!-- PROMPT-BODY-END -->

## The output tool

`outputTool` is passed to the provider as the only tool, with `tool_choice` set so the model
must call it. Its `input_schema`:

- `answers[]` — objects with **exactly** `linkId` (string), `value` (boolean | number | string),
  `status` (`"documented"` | `"inferred"`), `quote` (string). `additionalProperties: false`.
- `examSites[]` — objects with **exactly** `id` (string), `requested` (boolean), `quote`
  (string | null).

The service rejects a tool call the provider somehow lets through malformed, then the gate runs
on the built `QuestionnaireResponse`.

## What is deliberately not in it

Unchanged from v3.0.0: no criteria block, no thresholds, no lab lists, no red-flag meanings, no
priority ordering, no documentation-standard prose, no `suggested_wording` / `interpreted_note`
/ `notes`, no fallback prompt. The `outputTool` schema describes **shape only** — value types
and the four required keys — never criteria content. `npm run check` runs the AD-16
no-criteria-content scan over the assembled body and the tool schema.
