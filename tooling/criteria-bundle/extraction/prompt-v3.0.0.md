# Extraction prompt v3.0.0

**Replaces:** system prompt v2.3.0 in full (`instructions/system-prompt-v2.3.0.txt` plus the
client-assembled preamble, `{{DOC_MODE_INSTRUCTION}}`, paediatric note, criteria block, JSON
output schema and `FALLBACK_INSTRUCTION_TEXT`).
**Machine-readable form:** `prompt-v3.0.0.json` — **that file is canonical.** This document is a
rendering of it; `npm run check` fails if the two drift.
**Contract:** `extraction-contract.md` v2 · **Equivalence list:** `concept-equivalence-v1.md`
**Decision record:** `PROMPT_DECISION_RECORD.md` (clause-by-clause disposition, dropped clauses, proposed model parameters)
**Status: NOT CLINICALLY REVIEWED.**

## How it is assembled

The service (slice 4b) joins `parts[].text` with a blank line between parts and sends the result
as the system prompt. Supplied per request, never baked into the prompt:

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
Return one JSON object, no other text:
{ "examSites": [{"id","requested","quote"}], "questionnaireResponse": <FHIR QuestionnaireResponse> }
Value type follows the item type; every answer carries the answer-evidence extension (status, quote).
Never output: verdict, priority, met/missing lists, suggested wording, a corrected note, free-text notes, safety alert, redirect, or status "retrieved". Any of these voids the response.
```
<!-- PROMPT-BODY-END -->

## What is deliberately not in it

The whole point of v3.0.0 is what it *omits*. If any of these reappears in a future version,
the prompt has started re-acquiring criteria and the architecture's third invariant is broken.

| Not in the prompt | Where it lives instead |
|---|---|
| The criteria block (all sites serialised, ≈21,000 tokens) | the bundle, loaded by version (clause 35) |
| Any threshold ("more than 5 %", "3–6 months", "Wells ≥2", "Ca-125 ≥35") | CQL defines per site (clauses 11, 18) |
| The per-exam lab requirements table | per-site indicators; the table is regenerated from bundles (clause 18) |
| What a red flag *means*, or any instruction to redirect to ED/111/ACC | `CRR_RedFlags.cql` precedence (clauses 2, 3, 5; AD-03) |
| Priority ordering, verdict rules, the Step 3b consistency checks | engine `Determination` (clauses 22–27) |
| Gender filtering, paediatric routing, general-vs-variant pathway rules | CQL defines (clauses 9, 10, 34) |
| The two documentation-standard prompts | one engine parameter over evidence status (clauses 20, 21; TA-010) |
| `suggested_wording`, `add_to_note`, `interpreted_note`, `notes` | the renderer, or nowhere (clauses 31, 32, 36, 40; D6) |
| The hard-coded fallback prompt | nothing — the service fails visibly if the prompt cannot be loaded (clause 41) |

One consequence worth stating plainly: the prompt–criteria drift recorded in the decomposition
(v2.3.0's CT CAP lab row lists ALP/GGT/ALT/bilirubin; the published CT CAP list is
CRP/Hb/calcium/platelets/ALP/albumin) **cannot recur**, because there is no copy of the criteria
in the prompt to drift from.

## Length

| Baseline | Chars | v3.0.0 as % |
|---|---|---|
| v2.3.0 assembled instruction text (system prompt + preamble + strict doc-mode + JSON output schema; excludes the criteria block, which is data) | 13,098 | **20.5 %** |
| `system-prompt-v2.3.0.txt` alone (contains an unsubstituted placeholder, so not a prompt on its own) | 11,499 | 23.3 % |
| v2.3.0 as actually sent, including the ≈21,000-token criteria block | ≈95,000 | ≈2.8 % |

v3.0.0 assembled: **2679 characters, 407 words.** The brief's target was ≤ 20 % of v2.3.0's
length; measured against the assembled instruction text it lands at 20.5 %, and no rule was
dropped to chase the last 60 characters.
