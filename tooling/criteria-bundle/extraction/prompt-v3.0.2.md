# Extraction prompt v3.0.2

**Supersedes:** v3.0.1. Two changes, both from an arch-mig browser-testing session against the
thin Triage pipeline page:

- **(a) EVIDENCE rule 8 — conditional demographic stripping.** v3.0.1 said "Do not answer age
  or sex if the context block supplies them", but the context block also carries labs, and its
  "do not answer patient.age / patient.sex / patient.ageMonths" line was emitted whenever the
  block carried *anything*. So a request that supplied only labs still suppressed age and sex —
  and the pipeline then had no age/sex to pre-fill for the referrer to confirm. v3.0.2: the
  model answers a demographic item from the note (documented, with a quote) **unless the
  context block supplies that specific item**. The extraction service's context block is
  changed to match (`prompt.ts` `contextBlock()` names only the demographic fields actually
  supplied).
- **(b) EQUIVALENCE part wired to `concept-equivalence-v1.2`** — adds **E-07** (negative
  examination shorthand `"NAD"` / `"SNT"` / `"unremarkable"` / `"O/E normal"` => an
  examination-findings item such as `workup.localisingFeatures`, `false`) and **E-08**
  (`"on scales"` / two recorded weights => `weightloss.measured`). Both **NEEDS CLINICAL
  REVIEW**.

Parts role / examsite / redflags / output are byte-identical to v3.0.1.

**Machine-readable form:** `prompt-v3.0.2.json` — **that file is canonical.** This document is a
rendering of it; `npm run check` fails if the two drift.
**Contract:** `extraction-contract.md` v2 · **Equivalence list:** `concept-equivalence-v1.2.md`
**Decision record:** `PROMPT_DECISION_RECORD.md`
**Status: NOT CLINICALLY REVIEWED.**

## Why v3.0.2

The thin Triage pipeline page (slice 5) lets a referrer run `/api/assess` with or without an
age/sex context. Two browser findings:

- With no age/sex in context, the design is for the model to extract them (documented, quoted)
  so the page can pre-fill the Age/Sex fields for the referrer to confirm; a confirmed or
  corrected value is then sent as context on the next run and **overrides** the extracted one,
  with the supersession recorded as a discrepancy (`merge.ts`). v3.0.1's rule 8 got in the way
  whenever any other context (labs) was present.
- On `GT-BROWSER-001` ("… exam NAD …") the model left `workup.localisingFeatures` unanswered,
  so CT CAP could not clear criterion A. "exam NAD" is the standard shorthand for a normal
  examination — contract rule 7 (negation is documented) applied to the abbreviation for it.
  That is E-07.

Neither equivalence is clinically confirmed; the next benchmark measures their effect
(`benchmark/FINDINGS.md`).

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
8. Answer a demographic item (age, sex, ageMonths) from the note - documented, with a quote - unless the context block already supplies that item, in which case do not answer it. Age in years as written; ageMonths only if the note gives months.
9. A linkId shared by several Questionnaires is answered once.

EQUIVALENCE (concept-equivalence-v1.2, the whole list)
"tired all the time"/"TATT" -> a fatigue item, documented.
"worsening"/"progressive" -> an item worded "progressive" or "increasing" for the same symptom, documented.
"clothes loose"/"hanging off" -> an unintentional-weight-loss item, documented; never a percentage or period.
"n/12" is n months, "n/52" is n weeks, "n/7" is n days -> a duration item, the number in the item's unit, documented; still omit if the note does not attach the period to that concept.
a reported blood result ("Hb 120", "bloods normal", "FBC done") -> workup.bloods, documented; the result value or flag, if any, is a separate answer.
"NAD"/"SNT"/"unremarkable"/"O/E normal" written against an examination -> an examination-findings item such as workup.localisingFeatures, false, documented; not a finding the examination did not cover.
"on scales"/"weighed"/two recorded weights -> weightloss.measured, documented; the weights, percentage and period are separate answers.
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
must call it. Its `input_schema` is **byte-identical to v3.0.1**:

- `answers[]` — objects with **exactly** `linkId` (string), `value` (boolean | number | string),
  `status` (`"documented"` | `"inferred"`), `quote` (string). `additionalProperties: false`.
- `examSites[]` — objects with **exactly** `id` (string), `requested` (boolean), `quote`
  (string | null).

## What is deliberately not in it

Unchanged from v3.0.1: no criteria block, no thresholds, no lab lists, no red-flag meanings, no
priority ordering, no documentation-standard prose, no `suggested_wording` / `interpreted_note`
/ `notes`, no fallback prompt. The `outputTool` schema describes **shape only**. The E-07 / E-08
equivalences are same-fact rephrasings ("exam NAD" is a documented normal examination; a
recorded weight is a measurement), not criteria content — no threshold, analyte list or pathway
rule. `npm run check` runs the AD-16 no-criteria-content scan over the assembled body and the
tool schema, for every `prompt-v3.*.json`.
