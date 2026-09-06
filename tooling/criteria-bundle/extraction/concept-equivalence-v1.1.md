# Concept equivalence list v1.1

**Status: NEEDS CLINICAL REVIEW.** No entry below has been confirmed by a clinician.
**Owner:** clinical. **Versioned with:** extraction prompt v3.0.1 and v3.0.2 (`prompt-v3.0.1.json`
/ `prompt-v3.0.2.json` name `equivalenceListVersion: "concept-equivalence-v1.1"`). Prompt v3.0.0
stays on `concept-equivalence-v1`.
**Supersedes:** `concept-equivalence-v1.md` for those prompt versions. v1's entries E-01, E-02,
E-03 are carried forward **unchanged** — read v1 for their full rationale and reviewer notes.
This file records only what v1.1 adds.

---

## What v1.1 adds, and why

Two benchmark findings from the v3.0.1 run (`benchmark/results/2026-09-06-anthropic-claude-sonnet-4-6.md`,
`benchmark/FINDINGS.md` items 2 and 3):

- The model did not read NZ duration shorthand (`2/12`, `6/52`, `3/7`). RP-007's
  `weightloss.periodMonths` was answered 0/3.
- The model did not connect a reported blood result to `workup.bloods` (whether the initial
  work-up was done). RP-001 / RP-001-5.5pct `workup.bloods` answered 0/3.

Both are **notation / same-fact** rephrasings, not clinical reasoning steps — the shape v1's
rule admits as `documented`. They are added here so the next benchmark measures their effect;
neither is clinically confirmed.

---

## Live entries added in v1.1

### E-04 — NZ duration shorthand ⇒ a duration in the stated unit

| | |
|---|---|
| **Phrase forms** | `n/12` (n months), `n/52` (n weeks), `n/7` (n days) — the standard NZ primary-care notation for a duration or history-of period. |
| **Item** | any duration item, in its own unit — today: `weightloss.periodMonths` ("… over how many months"). |
| **Value / status** | the number, in the item's unit / `documented` |
| **Why definitional** | `2/12` *is* "two months" written in clinical shorthand — a clinician reading it has not deduced a duration, they have read one. This is the same move as v1's abbreviation handling (`wt loss`, `abdo pain`), not an inference. |
| **Does not earn** | A duration for a concept the note does not attach the period to. "2/12 h/o abdo discomfort … 3kg wt loss" gives the *discomfort* a 2-month history; it says nothing about how long the weight loss has been happening. Contract rule 5 still governs which concept a bare period belongs to — omit `weightloss.periodMonths` there. |
| **⚠ Reviewer question** | RP-007's ground truth labels `weightloss.periodMonths = 2` as **`inferred`** (it reads the weight-loss period *off* the symptom period — a reasoning step). E-04 would make the model answer `documented` **only** where the note attaches `2/12` to the weight loss directly. Confirm: (a) is reading `n/12` as a duration definitional (keep as `documented`), and (b) does the ground truth's `inferred` reflect the *attachment* inference, not the notation? If (b), the two are consistent — E-04 covers the notation, the attachment stays `inferred` or omitted. |

### E-05 — a reported blood result ⇒ the initial work-up bloods were done

| | |
|---|---|
| **Phrase forms** | any stated blood result or its absence-of-abnormality: "Hb 120", "FBC normal", "bloods unremarkable", "recent bloods NAD", "LFTs done". |
| **Item** | `workup.bloods` — "Bloods have been taken as part of the initial work-up" |
| **Value / status** | `true` / `documented` |
| **Why definitional** | A reported result is direct evidence the test was performed — the report *is* the test having happened, not a conclusion drawn from it. `workup.bloods` asks only whether bloods were taken, not what they showed. |
| **Does not earn** | Anything about the *result*. "Hb 120" answers `workup.bloods = true` **and**, separately, may answer `lab.hb.low` under contract rule 6 — the two are independent answers. It does not answer `workup.urinalysis` or `workup.cxr`; the initial work-up is three separate items (bloods, urinalysis, CXR) and each needs its own evidence. |
| **⚠ Reviewer question** | Is "a result was reported" sufficient for `workup.bloods`, or does the criterion mean *the specific initial-work-up panel* (FBC, U&E, LFT, …) such that an unrelated result (e.g. an old INR) should not count? The encoded reading is "any reported blood result counts". |

---

## Not added — recorded as a clinical question

### E-06 — "discomfort" ⇒ "pain"  · **NOT a live entry**

The v3.0.1 run answered `symptom.abdominalPain` from "Occasional discomfort R side" (MW-009)
and "mid/upper abdo discomfort" (RP-007) with status **`inferred`** 3/3; the ground truth says
`documented`. Whether "discomfort" and "pain" are the same symptom (definitional — would earn
`documented`) or a clinical distinction (the model's `inferred` is right) is a **clinical
question for the review pack**, not an engineering call. It is **not** added to this list. See
`benchmark/FINDINGS.md` item 4.

---

## Review checklist (v1.1 additions only — v1's checklist still applies to E-01–E-03)

1. E-04: is reading `n/12` / `n/52` / `n/7` as a duration definitional? Does it conflict with the
   ground truth's `inferred` on RP-007, or are they about different steps (notation vs attachment)?
2. E-05: does "a reported blood result" mean the item, or only the specific initial-work-up panel?
3. E-06: is "discomfort" the same symptom as "pain" for `symptom.abdominalPain`? (If yes, it
   becomes E-06 live; if no, the model's `inferred` is correct and nothing changes.)

## Change control

As v1 (§"Change control"): an entry changes only with a clinical ruling recorded against it, and
any change moves this file's version and the naming prompt's `equivalenceListVersion` together.
