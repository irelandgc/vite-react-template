# Extraction benchmark — findings log

A numbered log of what the extraction benchmark has surfaced, and what was done about
each. One entry per distinct finding. Statuses:

- **closed** — fixed and verified by a later run.
- **open (engineering)** — a code/prompt/Questionnaire change is the fix, not yet made or not yet
  proven.
- **pending review** — an equivalence or contract change is staged (NEEDS CLINICAL REVIEW); the
  next run measured its effect, a clinician confirms or rejects it.
- **clinical question** — the finding is a question only a clinician can answer; nothing changes
  in code until it is answered.
- **ground-truth question** — the disagreement may be the ground truth, not the model.

Runs are cited as `<case> run N` against the dated file in `results/`. Two runs exist so far:
the **v3.0.0** single pass, and the **v3.0.1 / concept-equivalence-v1.1** `--runs 3` run
(`results/2026-09-06-anthropic-claude-sonnet-4-6.md`, the current file — it replaced the v3.0.0
one; `results/README.md` keeps the before/after).

---

## 1. Missing `answer-evidence` extension — structural gate failure · **closed**

**What happened.** v3.0.0 had the model hand-write a nested FHIR `QuestionnaireResponse` with
the `answer-evidence` extension (status + quote) repeated on every answer. It did not always
repeat it. The validation gate rejected the whole response (contract rule 3).

**Where.** v3.0.0 single pass: `GT-RM-MW-009-ctcap` and `GT-RM-RP-007-INT-002-ctcap` — 2 of 4
cases rejected whole.

**What changed.** Prompt **v3.0.1**: the model calls one tool (`submit_extraction`) with a flat
`{ linkId, value, status, quote }` list; the extraction **service** builds the FHIR and attaches
the evidence extension to every answer. Gate rule 3 is now satisfied by construction. Tool
`input_schema` makes the four keys required.

**Status.** **Closed** — v3.0.1 `--runs 3`: gate PASS 12/12 (both runs), quote validity
69/69 then 76/76.

---

## 2. NZ duration shorthand not read (E-04) · **pending review**

**What happened.** The model did not read `2/12` ("two-month history") as a duration.

**Where.** `GT-RM-RP-007-INT-002-ctcap`, v3.0.1 run — `weightloss.periodMonths` answered **0/3**
(ground truth: `2 / inferred`, quote `"2/12 h/o"`). The model *does* read `6/12` → 6 months in
`GT-RM-RP-001-ctcap` (3/3, both runs).

**What changed.** `concept-equivalence-v1.1` **E-04**: `n/12` / `n/52` / `n/7` ⇒ a duration in
the item's unit, `documented` — "still omit if the note does not attach the period to that
concept". Wired into prompt v3.0.1.

**Re-run result (v3.0.1 + v1.1).** `weightloss.periodMonths` on RP-007 **still 0/3** — and that
is now the **defensible** answer: "2/12 h/o mid/upper abdo discomfort" attaches the period to the
*discomfort*, not the weight loss, and E-04 says to omit when the attachment is unclear. The
ground truth's `2 / inferred` reads the weight-loss period off the symptom period — a reasoning
step. `6/12` cases unaffected (3/3, no regression).

**Open reviewer question.** Is reading `n/12` as a duration definitional (keep E-04)? Is
RP-007's ground truth (`2 / inferred` for `weightloss.periodMonths`) correct, or should it be
`absent`? → the ground truth may be the thing to change.

**Status.** **Pending review** — E-04 in force; the open question moved from "model can't read
the notation" to "is the RP-007 ground truth right".

---

## 3. Reported blood result not connected to `workup.bloods` (E-05) · **pending review**

**What happened.** "Hb mildly low" tells you bloods were taken; the model answered `lab.hb.low`
but not `workup.bloods`.

**Where.** `GT-RM-RP-001-ctcap` and `GT-RM-RP-001-ctcap-5.5pct`, v3.0.1 run — `workup.bloods`
answered **0/3** in both (ground truth `true / inferred`). Engine determination unaffected
(`workup.bloods` alone does not carry criterion A).

**What changed.** `concept-equivalence-v1.1` **E-05**: a reported blood result ⇒
`workup.bloods = true`, `documented`; the result value/flag is a separate answer. Wired into
prompt v3.0.1.

**Re-run result (v3.0.1 + v1.1).** `workup.bloods` now answered **3/3** in both cases, value
`true` 3/3. **But status is `documented`** (E-05 says `documented`), while the **ground truth
says `inferred`** — status agreement 0/3 (5.5pct) and 1/3 (RP-001). Engine still MATCHes
(`INSUFFICIENT_INFORMATION` — `workup.bloods` documented isn't enough on its own).

**Open reviewer question.** Is "a reported blood result ⇒ bloods were done" a documented fact
(E-05's reading) or an inference (the ground truth's)? And does any reported blood result count,
or only the specific initial-work-up panel?

**Status.** **Pending review** — E-05 closed the completeness gap; it opened a
documented-vs-inferred disagreement with the ground truth for a clinician to settle.

---

## 4. "Discomfort" labelled `inferred`, not `documented` (E-06) · **clinical question**

**What happened.** The model answered `symptom.abdominalPain = true` from "discomfort" wording
with status **`inferred`**; the ground truth says `documented`.

**Where.** v3.0.0 / early v3.0.1: `GT-RM-MW-009-ctcap` `symptom.abdominalPain` status 0/3;
`GT-RM-RP-007-INT-002-ctcap` 0/3.

**What changed.** **Nothing.** "discomfort ⇒ pain" is deliberately **not** added to
`concept-equivalence-v1.1` — recorded there under "Not added" as a review-pack question.

**Re-run result (v3.0.1 + v1.1).** The model has drifted toward `documented` on its own:
MW-009 status **2/3** documented, RP-007 **3/3** documented. Non-deterministic, not the result
of any change here.

**Status.** **Clinical question.** Is "discomfort" the same symptom as "pain" for
`symptom.abdominalPain`? Until answered, E-06 is not added and the model's own (now mostly
`documented`) labelling stands.

---

## 5. Liver edge as a localising sign · **ground-truth question (review pack 8b)**

**What happened.** The ground truth expects `workup.localisingFeatures = true` from
"Liver ~2 cm below costal margin" (a palpable liver edge / hepatomegaly). Whether a non-tender
hepatomegaly on its own is a "localising sign" that redirects to a system-specific pathway is a
clinical judgement.

**Where.** `GT-RM-MW-009-ctcap` — `workup.localisingFeatures` answered **0/3** in both runs.
Engine determination `INSUFFICIENT_INFORMATION` 3/3 vs ground truth `ALTERNATIVE_MANAGEMENT` —
the whole divergence rides on this one indicator.

**What changed.** **Nothing** in code. Raised to review pack **8b**: is a palpable liver edge,
absent other features, a localising sign for CT CAP redirect (CT CAP p10)?

**Status.** **Ground-truth question.** MW-009 is the only case still diverging after v1.1.

---

## 6. `workup.localisingFeatures` extraction reliability (15 cm mass) · **open (engineering)**

**What happened.** "O/E: 15cm epigastric mass" is an unambiguous localising sign / potential
biopsy site. The model read it inconsistently.

**Where.** `GT-RM-RP-007-INT-002-ctcap`, first v3.0.1 run — `workup.localisingFeatures` answered
**1/3**, making the engine determination non-deterministic across the 3 runs
(`[INSUFFICIENT_INFORMATION, ALTERNATIVE_MANAGEMENT, INSUFFICIENT_INFORMATION]`).

**What changed.** The `workup.localisingFeatures` Questionnaire item text was checked (follow-up
item 2). It is **already a positive question built from the CT CAP p10 published words** — the
source reads "…but no focal pathology or localising signs/symptoms or potential biopsy site has
been identified", and the item inverts that to "Focal pathology, localising signs/symptoms, or a
potential biopsy site has been identified (true = identified…)". **No wording change; CT CAP not
republished.**

**Re-run result (v3.0.1 + v1.1).** RP-007 `workup.localisingFeatures` now **3/3**, engine
`ALTERNATIVE_MANAGEMENT` 3/3 (MATCH), deterministic. **This improvement is not attributable to a
change in this PR** — E-04/E-05 do not touch localising features; it is most likely run variance
or the fuller equivalence block. MW-009 (item 5) still shows the underlying unreliability at
0/3, so the finding stays open.

**Status.** **Open (engineering).** Candidate fixes for a later slice: an explicit
localising-features example in the prompt's evidence rules; retrieval of examination findings;
the AD-17 referrer attestation on the redirect side. Not done here.

**Slice 5 e2e (2026-09-07, `results/2026-09-07-pipeline-e2e-claude-sonnet-4-6.md`).** The full
`POST /api/assess` pipeline over the two-worker `wrangler dev` reproduced this: MW-009 returned
`INSUFFICIENT_INFORMATION` (expected `ALTERNATIVE_MANAGEMENT`) because `workup.localisingFeatures`
was again not extracted; the other three ground-truth notes matched. Pipeline wiring, merge,
audit row and the AD-17 attestation flow are all correct — this is the same extraction-drift
finding, unchanged. Still open.

---

## 7. "wt 58" read as weight loss · **open (low) — mitigated**

**What happened.** "wt 58" is a single recorded weight with nothing to compare it against. The
model answered `weightloss.present` from it.

**Where.** `GT-RM-MW-009-ctcap` — `weightloss.present` is an `expectedAbsent` item (ground
truth: any weight-loss answer here is a fabrication — a comparison needs two weights). v3.0.0 /
early v3.0.1: answered **2/3**. v3.0.1 + v1.1 re-run: answered **1/3**.

**Status of the answer / strict mode.** Every occurrence is labelled **`inferred`** (the value
itself varies — `true` in one probe, `false` in the committed re-run, quote `"wt 58"`). Under
the default `strict` documentation standard an `inferred` answer **does not establish (or
negate) a criterion** — so `strict` **excludes it** and the engine determination is unaffected.
The residual issue is a contract-rule-1 violation (answering an item the note does not raise),
at ~1/3, contained by `strict`.

**What changed.** `extraction-contract.md` **rule 4** gains a negative example: a single recorded
weight is not weight loss; `weightloss.present` needs a stated loss or two weights (omit). **No
prompt change** — the follow-up instruction added the prompt sentence (as v3.0.2) only if the
status was `documented`; it was `inferred`.

**Status.** **Open (low) — mitigated.** `strict` excludes it; the contract now names the case.
**Update (v3.0.2 / v1.2 run):** with E-08 in force, one of three runs answered
`weightloss.present = false / documented` from "wt 58" — a `documented` answer that `strict`
would count. Tracked separately as **item 10**.

---

## 8. Browser findings — E-04 / E-07 / E-08 and weights-based weight loss (`GT-BROWSER-001`) · **pending review**

**What happened.** An arch-mig browser-testing session against the thin Triage pipeline page
surfaced three same-fact rephrasings the extraction model was not reading, and one engine gap
(demographic items suppressed whenever the context block carried anything — item 9). Ground-truth
case **`GT-BROWSER-001`** was added to measure them: *"62M, 4/12 unintentional weight loss
84->77kg (8%) on scales, bloods/urinalysis/CXR done and normal, exam NAD."*

**What changed.**
- `concept-equivalence-v1.2` (NEEDS CLINICAL REVIEW): **E-07** ("NAD" / "SNT" / "unremarkable" /
  "O/E normal" on an examination ⇒ an examination-findings item such as
  `workup.localisingFeatures`, `false`, `documented`) and **E-08** ("on scales" / two recorded
  weights ⇒ `weightloss.measured`, `documented`). Prompt **v3.0.2** wires the equivalence part
  to v1.2 and adds the E-07 example to the EVIDENCE rules.
- Vocabulary v1.2: `weightloss.weightBefore` / `weightloss.weightNow` (decimal, kg). CT CAP
  library republished **v2.0.0** (logic change, AD-02): `"Weight Loss Percent By Recorded
  Weights"` computes `weightloss.percent` from the two weights when both are documented and no
  percentage is stated; a stated percentage still wins (REVIEW Q3 revisited).

**Re-run result (v3.0.2 + v1.2, `--runs 3`).** `GT-BROWSER-001` **clean 3/3 on every one of its
12 indicators** (value, status, quote), all three `expectedAbsent` clean including
`workup.strongSuspicionMalignancy` (AD-17 — the model never answered it). Engine
`INSUFFICIENT_INFORMATION` 3/3, which is the **expected** result: the CT CAP P2 pathway needs
the attested strong suspicion of malignancy, which the extraction model may not supply. E-07 did
**not** misfire on RP-007's positive "15cm epigastric mass" (`workup.localisingFeatures` `true`
3/3). E-04 / E-05 unchanged from the v1.1 run — no regression.

**Open reviewer questions.** E-07: does a documented normal examination answer
`workup.localisingFeatures = false` blanket, or only for the system examined? E-08: does one
recorded weight (no comparison) earn `weightloss.measured`, or is a pair required? (v1.2's
review checklist; E-09 is the non-entry recording the single-weight case.)

**Status.** **Pending review** — E-07 / E-08 are NEEDS CLINICAL REVIEW; the run measured their
effect and shows no regression.

---

## 9. Demographic items suppressed whenever the context block carried anything · **closed**

**What happened.** Prompt v3.0.1's EVIDENCE rule 8 ("Do not answer age or sex if the context
block supplies them") plus `prompt.ts` `contextBlock()` emitted "Do NOT answer patient.age /
patient.sex / patient.ageMonths" whenever the context block carried **any** field — so a request
that supplied only labs also suppressed age and sex, and the pipeline then had no extracted
age/sex to pre-fill for the referrer to confirm.

**What changed.** Prompt **v3.0.2** rule 8: the model answers a demographic item from the note
(`documented`, with a quote) **unless the context block supplies that specific item**.
`contextBlock()` now names only the demographic fields actually supplied. The thin Triage
pipeline page pre-fills the Age / Sex fields from the merged `QuestionnaireResponse`; a confirmed
or corrected value goes back as context and **overrides** the extracted one, recorded as a
discrepancy (`merge.ts`, unchanged).

**Re-run result.** The benchmark runs with `context: {}`; `patient.age` / `patient.sex` answered
`documented` 3/3 on `GT-BROWSER-001` and every RM case (unchanged — the benchmark never supplied
context, so this was never the failing path there; the fix is for the mixed-context pipeline
call the browser session hit).

**Status.** **Closed** — behaviour corrected; pipeline pre-fill browser-tested.

---

## 10. "wt 58" answered `false / documented` under E-08 · **open (low)**

**What happened.** With E-08 in force ("on scales" / recorded weights ⇒ `weightloss.measured`),
one of three `GT-BROWSER-001`-run probes of `GT-RM-MW-009` answered `weightloss.present = false /
documented` from "wt 58" — reading a single recorded weight as a documented statement that there
is no weight loss. Runs 1–2 answered `inferred` (strict excludes, as in item 7).

**Impact.** Low. MW-009's determination already diverges for the `workup.localisingFeatures`
reason (item 5); `weightloss.present = false` does not change it. But a `documented` answer
**counts under `strict`**, unlike the `inferred` answers item 7 describes.

**What could change.** `concept-equivalence-v1.2` records this as non-entry **E-09** (two stated
weights read straight into `weightloss.weightBefore` / `weightloss.weightNow`; a single weight
computes nothing and is not weight loss). A prompt evidence-rule clause scoping E-08 to a *pair*
of weights is the candidate fix if a later run shows this rising.

**Status.** **Open (low).** Watch the next run; contract rule 4 and E-09 name the case.
