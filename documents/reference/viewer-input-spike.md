# ARCH-MIG-01 — Viewer input spike: getting past B1

**Date:** 2026-09-07 · **Branch:** `chore/arch-mig-viewer-findings` · **Status:** spike

> **Outcome (2026-09-07, `feature/arch-mig-viewer-inputs`):** option **(a)** built and accepted
> (AD-27 → Accepted; AD-18 dated note — LHC-Forms not adopted). One change from the
> checklist below: for the weight-loss inputs the referrer enters the **two recorded
> weights + the period** and the engine computes the percentage (AD-24); `weightloss.percent`
> is the last, fallback field. `weightloss.present` / `weightloss.measured` are surfaced too
> (the `Weight Loss Criterion` CQL reads them). CT CAP bundle republished once at `2.3.0`.
> See CL-45.

## The problem

The Criteria Viewer's self-check ("Check against criteria" → `/api/assess/evaluate`,
no note, no model) can never reach CT CAP's **B1** pathway, and the same is true of
**B2**.

CT CAP's PlanDefinition models B1 as one action with four heterogeneous inputs:

| linkId | Questionnaire type | text |
|---|---|---|
| `patient.age` | `integer` | Age in years at referral |
| `patient.sex` | `choice` (`answerOption`: male / female / other) | Sex |
| `weightloss.percent` | `decimal` | Weight loss as a percentage of usual body weight |
| `weightloss.periodMonths` | `decimal` | Period over which the weight was lost, in months |

`criteria-render.js` only renders a **checkbox** for an action with exactly one
input linkId whose Questionnaire type is `boolean` (`tickableLinkId`). B1 has four
inputs, none boolean, so it renders as a plain criterion row with **no way to
enter a value**. `buildQuestionnaireResponse` therefore never carries `patient.age`
etc., the B1 CQL is `null`, and the pathway is unreachable from the Viewer. B2's
`weightloss.*` and lab-value rows have the same shape. Only Criterion A (five
booleans) and B3's `advice.urgentCTRecommended` boolean are reachable today.

## AD-27 — the principle this spike is scoped by

**The Viewer collects indicator values, never pathway confirmations. A tickable
row is only ever a single boolean leaf.** The referrer answers *facts* (age, a
weight-loss %, "bloods done"); the engine — never the Viewer, never a tick —
decides whether B1 is met. So the fix is "let the referrer enter the four B1
*values*", not "add a B1 tickbox". Recorded as **AD-27**.

Given that, two ways to let the referrer enter non-boolean values were spiked.

---

## Option (a) — `criteria-render.js` renders Questionnaire items by type

Extend the renderer: for a compound action, render one input per input linkId,
inline under the criterion row, keyed off the Questionnaire item's `type`:

- `boolean` → checkbox (as today)
- `integer` / `decimal` / `quantity` → `<input type="number">`, label = `item.text`
- `choice` → `<select>` built from the item's `answerOption` displays
- `string` → `<input type="text">` (B3's `advice.adviserNameRole`)

The change events already wired for `.crit-card-check` extend to
`input[data-linkid]`; `buildQuestionnaireResponse` already maps a value by
Questionnaire type (`CV-015` — it handles `valueInteger` / `valueDecimal` /
`valueCoding` / `valueString` today, only the *rendering* is missing).

### What works out of the box

- `patient.sex` — `answerOption` is present with male / female / other displays; a
  `<select>` renders with no artefact change.
- `patient.age`, `weightloss.percent`, `weightloss.periodMonths` — a number input
  with `item.text` as the label works; the unit ("years", "%", "months") is in the
  prose of `item.text`, so the label reads correctly with nothing added.
- `advice.adviserNameRole` (B3) — a text input; B3 becomes reachable too.
- `lab.*.value` rows (B2 quantity inputs) — same number-input treatment.

### What the CT CAP Questionnaire needs changed

- **Nothing required.** Every item already has `type`, `required`, and (for
  `choice`) `answerOption`.
- **Optional, for a cleaner input:** add
  `http://hl7.org/fhir/StructureDefinition/questionnaire-unit` (UCUM) to the three
  numeric weight-loss / age items so the renderer can show a unit *chip* rather
  than relying on the unit being inside `item.text`. This is a Questionnaire
  minor-version bump (no ELM change) and would ride into CT CAP's next publish.
- The B1/B2 actions already carry the right `input` profiles; no PlanDefinition
  change.

### Bundle size

Zero. No new dependency; the Questionnaire items are already in the bundle the
Viewer fetches.

### Does the artefact-subset test still hold?

Yes, with one caveat. Every *displayed string* is still `item.text`, an
`answerOption.display`, or a badge — all from the bundle. The only new literals
are input *chrome* the test already tolerates for the checkbox path (it checks
visible text, and `<input>` has none). If a unit chip is added it must come from
the `questionnaire-unit` extension, not a renderer constant — then the test is
unchanged. `criteria-render.test.ts` gains cases: B1 renders four typed inputs;
ticking them builds a QR with `valueInteger` / `valueDecimal` / `valueCoding`;
the self-check then reaches `Pathway B1`.

### Cost / risk

~1 session to build: one new branch in `renderRow` for compound-action inputs,
the `change` handler, `buildQuestionnaireResponse` already done, ~4 tests, the
optional `questionnaire-unit` addition. Risk is low and contained to the renderer
the two tools already share.

---

## Option (b) — LHC-Forms renders the Questionnaire beside the criteria structure

Per AD-18(b), LHC-Forms (`lhncbc.github.io/lforms`) is the named "preferred
Questionnaire renderer". Layout: the criteria *structure* stays as
`criteria-render.js` (read-only), and a second panel is an LHC-Forms form of the
same bundle Questionnaire; its `QuestionnaireResponse` is what
`/api/assess/evaluate` receives.

### What works

- Renders **every** item type, with validation, `required`, `answerOption`,
  repeats, `enableWhen`, units, and SDC `initialExpression` support — far more
  than option (a).
- Emits a spec-conformant `QuestionnaireResponse` directly; no
  `buildQuestionnaireResponse` shim.
- It is a maintained FHIR tool, so future Questionnaire features (skip logic,
  calculated fields — CT CAP already has `initialExpression` on `weightloss.percent`)
  work without renderer work.

### What the CT CAP Questionnaire needs changed

- Functionally nothing — it is already a valid R4 Questionnaire.
- Presentationally, a lot: LHC-Forms renders the Questionnaire's **own group
  structure** (`patient`, `workup`, `weightloss`, `lab`, `advice`, `excl`,
  `funding`), which is *not* the criteria structure. The referrer would see a flat
  form of ~40 fields — including `excl.*` and `funding.*` items that are redirect
  / not-funded logic, not things to "fill in" — with no connection to "you are one
  fact short of B1". Making it usable means authoring display extensions
  (`questionnaire-item-control`, hidden items, group ordering) — i.e. a second,
  parallel authoring surface on top of the PlanDefinition.

### Bundle size

Large. The LHC-Forms web-component build is ~1–3 MB of JS + CSS, plus a FHIR
context library. It is **not** on the Viewer's CSP allowlist and not on npm in a
form that self-hosts cleanly from `public/` without a build step; adopting it is a
new dependency (CLAUDE.md rule 7) and a CSP / hosting change. For comparison the
whole current Viewer HTML+shared JS is well under 200 KB.

### Does the artefact-subset test still hold?

No. LHC-Forms renders its own chrome — field labels, "Add"/"Remove" for repeats,
validation messages, unit pickers, a table-of-contents — none of which comes from
the bundle. The "every displayed string traces to a bundle artefact" contract
(the thing that makes invariant 3 checkable for the Viewer) cannot be enforced
over a third-party renderer; we would be trusting LHC-Forms not to inject
criteria-shaped text, and losing the automated guarantee.

### Cost / risk

Days, not hours: dependency + CSP + hosting, a display-extension authoring pass on
the Questionnaire, reconciling two panels, and accepting the loss of the
artefact-subset guarantee. It buys capability the Viewer self-check does not need
yet (the self-check is a deterministic check of a handful of indicators, not a
data-entry product).

---

## Comparison

| | (a) typed inputs in `criteria-render.js` | (b) LHC-Forms |
|---|---|---|
| Reaches B1 / B2 / B3 | yes | yes |
| New dependency | none | ~1–3 MB + CSP + hosting |
| CT CAP Questionnaire change | none required; optional `questionnaire-unit` | none functionally; substantial display-extension authoring for a usable form |
| Presentation | inputs sit under the criterion they belong to | separate flat form, not the criteria shape |
| Artefact-subset test | holds (unit chip must be artefact-sourced) | does not hold over LHC-Forms chrome |
| Shared with Triage reference column | yes (same module) | no (Triage column stays read-only structure) |
| Effort | ~1 session | days |

## Recommendation

**Option (a).** It is the minimum that makes B1/B2/B3 reachable, it keeps the
one-renderer / one-artefact-contract property the migration is built on, it adds
nothing to the bundle, and it needs no CT CAP Questionnaire change to ship (the
`questionnaire-unit` addition is a nice-to-have for a later publish). LHC-Forms
solves a data-entry problem the Viewer self-check does not have, at the cost of a
large dependency and the automated invariant-3 check; revisit it only if the
Viewer becomes a full structured-referral entry surface (a product decision above
this migration, same class as AD-18's revisit trigger).

## If (a) is built later — checklist

- `renderRow`: for a non-not-funded action with `>1` input linkId, or one
  non-boolean input, render one control per linkId by Questionnaire `type`
  (`number` / `select` from `answerOption` / `text`), inline, `data-linkid` on each.
- Host `change` handler: extend the `.crit-card-check` listener to
  `input[data-linkid], select[data-linkid]`.
- `buildQuestionnaireResponse`: already types values — no change.
- CT CAP Questionnaire (optional): `questionnaire-unit` on `patient.age`,
  `weightloss.percent`, `weightloss.periodMonths`; Questionnaire minor bump.
- Tests: B1 renders four typed inputs; QR carries `valueInteger`/`valueDecimal`/
  `valueCoding`; self-check reaches `Pathway B1`; artefact-subset check still green.
