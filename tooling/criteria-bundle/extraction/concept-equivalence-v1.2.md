# Concept equivalence list v1.2

**Status: NEEDS CLINICAL REVIEW.** No entry below has been confirmed by a clinician.
**Owner:** clinical. **Versioned with:** extraction prompt v3.0.2 (`prompt-v3.0.2.json` names
`equivalenceListVersion: "concept-equivalence-v1.2"`). Prompt v3.0.0 stays on
`concept-equivalence-v1`; prompt v3.0.1 stays on `concept-equivalence-v1.1`.
**Supersedes:** `concept-equivalence-v1.1.md` for prompt v3.0.2. Entries E-01–E-05 are carried
forward **unchanged** — read v1 and v1.1 for their full rationale and reviewer notes. This file
records only what v1.2 adds.

---

## What v1.2 adds, and why

From an arch-mig browser-testing session against the thin Triage pipeline page (`benchmark/FINDINGS.md`
items 8 and 9; ground-truth case `GT-BROWSER-001`):

- **E-07** — the model did not read a negative examination shorthand ("NAD", "SNT",
  "unremarkable", "O/E normal") as answering an examination-findings item `false`. On
  `GT-BROWSER-001` ("… exam NAD") `workup.localisingFeatures` was left unanswered, so the CT CAP
  engine could not clear criterion A and returned INSUFFICIENT_INFORMATION where the referral
  supports P2.
- **E-08** — the model did not connect "on scales" / two recorded weights to
  `weightloss.measured` (whether the weight loss is documented by recorded weights rather than
  patient report). This is the same move as v1.1's E-05 ("a reported result means the test was
  done"): the recorded weights *are* the documentation.

Both are same-fact rephrasings, not clinical reasoning steps — the shape v1's rule admits as
`documented`. They are added so the next benchmark measures their effect; neither is clinically
confirmed.

---

## Live entries added in v1.2

### E-07 — negative examination shorthand ⇒ an examination-findings item, `false`

| | |
|---|---|
| **Phrase forms** | "NAD" (nothing abnormal detected), "SNT" (soft, non-tender), "unremarkable", "O/E normal" / "examination normal" — written against an examination or a body system. |
| **Item** | an examination-findings item the note's phrase is about — today: `workup.localisingFeatures` ("focal pathology, localising signs/symptoms, or a potential biopsy site has been identified"). |
| **Value / status** | `false` / `documented` |
| **Why definitional** | "exam NAD" *is* "no abnormal finding on examination" written in clinical shorthand — a clinician reading it has not deduced the absence of a finding, they have read a normal-examination statement. This is contract rule 7 (negation is `documented`) applied to the standard abbreviation for it, the same move as v1's `wt loss` / `abdo pain` handling. |
| **Does not earn** | A `false` for a finding the examination did not cover. "Abdo SNT" says nothing about a chest finding. "NAD" on a *history* line (not an examination) is not this entry. It never answers a symptom item `true`, and it never answers `weightloss.*` or a lab flag. |
| **⚠ Reviewer question** | Is a blanket "exam NAD" sufficient to answer `workup.localisingFeatures = false` (no localising features **anywhere**), or does the criterion need the examination to have addressed the relevant system specifically? The encoded reading is "a documented normal examination answers it `false`; a localising feature stated elsewhere in the note still answers it `true` and, being higher-signal, wins". |

### E-08 — recorded weights ⇒ the weight loss is documented by measurement

| | |
|---|---|
| **Phrase forms** | "on scales", "weighed", "recorded weights", or two dated/sequential weights ("84kg → 77kg", "was 80kg, now 74kg"). |
| **Item** | `weightloss.measured` — "weight loss is documented by recorded weights (not patient report alone)". |
| **Value / status** | `true` / `documented` |
| **Why definitional** | A recorded weight *is* a measurement; two of them *are* documented weight change. The item asks only whether the loss is measured rather than reported, and a stated weight answers exactly that. The number(s) themselves, and any percentage or period, are separate answers (contract rule 3 — a percentage computed from two weights is `inferred`). |
| **Does not earn** | Anything about the *amount*. It does not answer `weightloss.percent`, `weightloss.periodMonths`, `weightloss.weightBefore` or `weightloss.weightNow` — those are their own answers with their own quotes. "Weight stable on scales" is not weight loss and answers nothing here. Patient-reported loss with no recorded weight ("says he's lost a stone") does **not** earn `weightloss.measured`. |
| **⚠ Reviewer question** | Is "on scales" alone (one weighing, no comparison) enough for `weightloss.measured = true`, or does "documented by recorded weights" require at least two recorded weights? The encoded reading is "any statement that a weight was measured counts; a single weight does not by itself establish loss, only that measurement is the source". |

---

## Not added — recorded as a clinical question

### E-09 — "on scales" ⇒ `weightloss.weightBefore` / `weightloss.weightNow` · **NOT a live entry**

Where the note gives two numbers ("84kg → 77kg") the model should answer `weightloss.weightBefore`
and `weightloss.weightNow` directly from those numbers as plain `documented` values (contract
rule 5, numbers as written) — not via an equivalence. This is **not** an equivalence entry; it
is called out here only so a reviewer does not expect one. The CT CAP library computes
`weightloss.percent` from the two weights when no percentage is stated (see
`CRR_CTChestAbdomenPelvis_Adult.cql`, "Weight Loss Percent By Recorded Weights"; REVIEW Q3
revisited).

---

## Review checklist (v1.2 additions only — v1 and v1.1 checklists still apply to E-01–E-05)

1. E-07: does a documented normal examination ("NAD" / "unremarkable") answer
   `workup.localisingFeatures = false`, and is the "localising feature stated elsewhere wins"
   tie-break correct?
2. E-08: does "on scales" / a single recorded weight establish `weightloss.measured`, or is at
   least a pair of recorded weights required?
3. E-09 (not added): confirm two stated weights should be read straight into
   `weightloss.weightBefore` / `weightloss.weightNow` as `documented`, with the percentage
   computed by the engine, not the model.

## Change control

As v1 (§"Change control"): an entry changes only with a clinical ruling recorded against it, and
any change moves this file's version and the naming prompt's `equivalenceListVersion` together.
