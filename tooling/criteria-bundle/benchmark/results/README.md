# Extraction benchmark results

One file per manual run: `<date>-<provider>-<modelId>.md`, written by
`../run-extraction-benchmark.mjs` (default `--runs 3`). The running finding log
is `../FINDINGS.md`.

**These are produced by a manual run against a worker with real model
credentials — never in CI.** See the script header for the exact steps.

## Status (ARCH-MIG-01 slice 4b → wire-format → benchmark follow-ups → browser findings)

The committed file `2026-09-06-anthropic-claude-sonnet-4-6.md` is the
**v3.0.2 / concept-equivalence-v1.2** run (`--runs 3`, 5 cases — adds
`GT-BROWSER-001`). The earlier v3.0.0 / v3.0.1 detailed files were replaced in
place at each step and live in git history; the snapshots:

| | v3.0.0 (single pass) | v3.0.1 (`--runs 3`) | v3.0.1 + equiv v1.1 (`--runs 3`) | v3.0.2 + equiv v1.2 (`--runs 3`, 5 cases) |
|---|---|---|---|---|
| gate PASS | 2 / 4 cases | 12 / 12 runs | 12 / 12 runs | **15 / 15 runs** |
| gate failures | 2 cases rejected whole (missing `answer-evidence` extension, rule 3) | none | none | none |
| quote validity | 16 / 16 | 69 / 69 (100%) | 76 / 76 (100%) | **115 / 115 (100%)** |
| engine determination MATCH | n/a (2 cases never evaluated) | 2 / 4 cases | 3 / 4 cases; MW-009 diverges | **4 / 5 cases** (GT-BROWSER-001 + RP-001 ×2 + RP-007 3/3); MW-009 still diverges |
| `workup.bloods` answered (RP-001 ×2) | 0 / 3 | 0 / 3 | 3 / 3 (E-05) | **3 / 3** (E-05) |
| `workup.localisingFeatures` (RP-007, 15 cm mass) | — | 1 / 3 | 3 / 3 → `ALTERNATIVE_MANAGEMENT` 3/3 | **3 / 3** (E-07 did not misfire on a positive finding) |
| `weightloss.present` false positive from "wt 58" (MW-009) | 2 / 3 | 2 / 3 | 1 / 3, always `inferred` | **3 / 3 answered**: runs 1–2 `inferred` (strict excludes), run 3 `false / documented` (counts) — new wrinkle, `FINDINGS.md` item 10 |

### v3.0.1 + v1.1 → v3.0.2 + v1.2 — browser findings

`concept-equivalence-v1.2` (NEEDS CLINICAL REVIEW) carries E-01–E-05 unchanged and
adds **E-07** ("NAD" / "SNT" / "unremarkable" / "O/E normal" ⇒ an
examination-findings item `false`, `documented`) and **E-08** ("on scales" / two
recorded weights ⇒ `weightloss.measured`). Prompt **v3.0.2** also makes the
demographic-stripping rule (EVIDENCE 8) conditional on the context block. The new
`GT-BROWSER-001` case measures the effect:

- **GT-BROWSER-001 is clean 3/3 on every indicator** — E-04 (`4/12` ⇒ 4 months),
  E-07 (`exam NAD` ⇒ `workup.localisingFeatures` `false / documented`), E-08
  (`on scales` ⇒ `weightloss.measured`), the new `weightloss.weightBefore` /
  `weightloss.weightNow` indicators, a stated `(8%)` alongside the two weights,
  and `workup.strongSuspicionMalignancy` correctly **not** answered (AD-17).
  Engine `INSUFFICIENT_INFORMATION` 3/3 as expected — P2 needs the attested
  suspicion (`FINDINGS.md` item 8, this is by design not a miss).
- **E-07 did not misfire on RP-007's positive finding** — "O/E: 15cm epigastric
  mass" still answered `workup.localisingFeatures` `true` 3/3.
- **"wt 58" (MW-009) now answered 3/3**, including one run `false / documented`
  (E-08 side effect — a single recorded weight read as "no documented weight
  loss"). Low impact — MW-009 already diverges on localising features — but it is
  a `documented` answer under strict, so `FINDINGS.md` item 10 tracks it and
  v1.2's non-entry E-09 flags the single-weight case.
- **No regression** on the two long-standing findings: RP-007
  `weightloss.periodMonths` still omitted (E-04 attachment, item 2); RP-001
  `workup.bloods` status still `documented` vs GT `inferred` (E-05, item 3).

### v3.0.0 → v3.0.1 — wire format

v3.0.0 had the model hand-write a nested FHIR `QuestionnaireResponse` with the
evidence extension repeated on every answer; it did not always repeat it.
v3.0.1 has the model call one tool with a flat `{ linkId, value, status, quote }`
list and the **service** builds the FHIR and attaches the evidence extension to
every answer — gate rule 3 satisfied by construction. Evidence rules unchanged.
The `--runs N` harness re-extracts each note N times and reports per-indicator
agreement across runs, so extraction drift (SR-09) is measured, not sampled.

### v3.0.1 → v3.0.1 + equivalence v1.1 — two staged equivalences

`concept-equivalence-v1.1` (NEEDS CLINICAL REVIEW) adds **E-04** (NZ duration
shorthand `n/12` etc. ⇒ a duration, `documented`) and **E-05** (a reported blood
result ⇒ `workup.bloods`, `documented`). Effect measured by the re-run:

- **E-05 worked:** `workup.bloods` went 0/3 → 3/3 on both RP-001 cases. It opened
  a new question — the model labels it `documented` (per E-05), the ground truth
  says `inferred` (`FINDINGS.md` item 3).
- **E-04 did not change RP-007's `weightloss.periodMonths` (still 0/3)** — and
  that is now the defensible answer: "2/12 h/o" attaches the period to the
  *discomfort*, not the weight loss. The RP-007 ground truth (`2 / inferred`) is
  the side under review (`FINDINGS.md` item 2).
- **The "wt 58" false positive dropped to 1/3 and is always `inferred`**, so the
  default `strict` engine excludes it. `extraction-contract.md` rule 4 now names
  the case (`FINDINGS.md` item 7).
- **RP-007 `workup.localisingFeatures` improved 1/3 → 3/3** (engine now
  `ALTERNATIVE_MANAGEMENT` 3/3). **Not attributable to a change in this PR** —
  E-04/E-05 do not touch that indicator; likely run variance. The finding stays
  open (`FINDINGS.md` item 6).

### Still open after v1.1

- **MW-009 diverges** — `workup.localisingFeatures` from "Liver ~2 cm below
  costal margin" answered 0/3; engine `INSUFFICIENT_INFORMATION` vs ground truth
  `ALTERNATIVE_MANAGEMENT`. Whether a palpable liver edge alone is a localising
  sign is a ground-truth / review-pack question (`FINDINGS.md` item 5, review
  pack 8b).
- **`workup.localisingFeatures` extraction reliability** — engineering, no fix
  in this PR (`FINDINGS.md` item 6).
- **E-04 / E-05 documented-vs-inferred vs the ground truth** — clinical review
  (`FINDINGS.md` items 2, 3).
- **"discomfort" vs "pain" status** — clinical question, not added to v1.1
  (`FINDINGS.md` item 4).

A miss is a **finding**, not a failure of the slice. Re-runs will differ; the
file is the record of this run, not a target to beat.
