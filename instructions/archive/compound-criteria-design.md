> **[SUPERSEDED — 2026-09-05]** ARCH-MIG-01 retires this design unbuilt (SD-10). The `logic`
> key / compound-criteria data model this document specifies is replaced entirely by CQL
> `define`s + FHIR PlanDefinition `selectionBehavior` nesting (see
> `tooling/criteria-bundle/README.md`, "Compound criteria decompose cleanly..."). Decision 6
> (`xrph_p2_3_p`) and the family-merger questions this design still poses are **not resolved**
> — they carry forward into slice 7 transcription (see `compound-criteria-clinical-signoff.md`,
> superseded same date, same note).
> Verification: verified — SD-10 raised; the replacement approach is demonstrated working
> (CT CAP bundle, `tooling/criteria-bundle/`), not merely proposed.
> Filed by: Claude Code

# Compound Criteria — Data Model & Architecture Design

**Brief:** CC-DESIGN-01 v1.1.0 · **Phase:** 1 (Design) · **Date:** 5 July 2026
**Status:** ACCEPTED (Gary, 12 July 2026). Migration plan (§6) finalised in
place — clinical sign-off extract for the working group in
`compound-criteria-clinical-signoff.md`.
**Inputs:** `compound-criteria-phase0-findings.md` (census of 60 items / 23
sites, Appendix A; both spot-checks accepted, Appendix B; seven recorded
decisions). Zero implementation code in this document.

---

## 1. Design summary

Add one optional key — `logic` — to the existing item JSON. Three logic types
(`all`, `any`, `mandatory_plus_any`), a flat list of sub-conditions, no
nesting, no counts, no expression language. The original prose `label` is
retained verbatim on every item, which makes the change invisible to every
consumer that doesn't know about `logic` and gives a per-item rollback path
(delete the key). No D1 DDL. The snapshot → publish → KV pipeline carries the
new shape unchanged.

The single most consequential simplification, and its justification: **the
schema has no nesting because no item needs it.** Phase 0 identified six items
with one level of internal nesting. Every one of them resolves into the three
flat types once intra-option conjunctions are kept as prose within a
condition's text — a rule Gary confirmed clinically on `usdvt_48_1` ("Wells<2 +
positive D-dimer is a single qualifying pathway per standard DVT decision
rules"). Worked through §2.3.

---

## 2. Data model

### 2.1 The item shape

Current item (unchanged for the ~413 simple items — this IS the before/after
example required by the acceptance criteria; the "after" for a simple item is
byte-identical):

```json
{
  "type": "cb",
  "id": "ctch_p2_1",
  "label": "Unexplained haemoptysis, chest infection and upper respiratory causes excluded…",
  "shortLabel": "Unexplained haemoptysis after initial workup"
}
```

Compound item — the same four fields plus one additive key:

```json
{
  "type": "cb",
  "id": "usdvt_48_1",
  "label": "Clinically suspected lower limb DVT and one or more of the following: Well's score of 2 or greater; Well's score less than 2 and positive D-dimer",
  "shortLabel": "Suspected lower limb DVT with Wells/D-dimer pathway",
  "logic": {
    "type": "mandatory_plus_any",
    "conditions": [
      { "id": "usdvt_48_1_a", "text": "Clinically suspected lower limb DVT", "required": true },
      { "id": "usdvt_48_1_b", "text": "Well's score of 2 or greater" },
      { "id": "usdvt_48_1_c", "text": "Well's score less than 2 and positive D-dimer" }
    ]
  }
}
```

Field semantics:

| Field | Rule | Traces to |
|---|---|---|
| `logic` (optional) | Absent → simple item, all current behaviour. Present → compound. | Backwards-compat requirement §1 of the brief; mockup's `logic: null` |
| `logic.type` | `all` \| `any` \| `mandatory_plus_any` — explicit logic-type attribute, never implied by formatting or order | Brief §Phase 1.1; pattern census: these three shapes cover all 60 items |
| `logic.conditions[]` | Flat array, 2–12 entries. `{id, text, required?}` | Largest per-item list is 6 (`usspp_p2_1_p`, `cth_p2_2`); the bound of 12 accommodates the collapsed xrch_48 family (§6.2), the largest structure the census can ever produce |
| `conditions[].id` | `<itemId>_<letter>` (`_a`, `_b`…). Stable once published — referenced by Viewer tick state, output text, and LLM citations | Sub-element addressability for CV-015 and TA citations (§4) |
| `conditions[].text` | The sub-condition prose. Intra-option conjunctions ("Wells<2 **and** positive D-dimer") stay inside `text` | B.2 clinical confirmation on `usdvt_48_1`; census rule validated across both spot-checks |
| `conditions[].required` | Only meaningful for `mandatory_plus_any`: `required: true` = mandatory stem. `all`/`any` items carry no `required` flags | Mockup model; census: 24 C-pattern items |
| `label` | On compound items: **display text derived from `conditions`** — see divergence rule below. Retained verbatim from source at migration; regenerated on any subsequent conditions edit | Criteria-fidelity rule (CLAUDE.md); per-item rollback (§6.4); graceful degradation (§2.4) |

Met-state semantics (normative, one sentence per type):
- `all` — met iff every condition is satisfied.
- `any` — met iff at least one condition is satisfied.
- `mandatory_plus_any` — met iff every `required` condition is satisfied AND at
  least one non-required condition is satisfied.

There is deliberately no `minOptions`/K-of-N field: zero census items need a
threshold other than "at least one" (§7, non-goal 3).

**Label/conditions divergence rule (normative).** On a compound item,
`logic.conditions` is the authoritative clinical text; `label` is derived
display text. The two states of `label`:

1. **At migration:** `label` keeps the original published prose verbatim, and
   the per-item clinical sign-off (§6.1) includes an explicit
   label↔conditions consistency check — the reviewer confirms the
   decomposition says exactly what the prose says.
2. **After any post-migration edit to `conditions`:** the Admin editor
   **regenerates `label` deterministically on save** from the conditions
   (template: `all` → texts joined with " AND "; `any` → "Any of: " + texts
   joined with "; "; `mandatory_plus_any` → required texts joined with
   " AND ", + " AND at least one of: " + option texts joined with "; ").
   `label` is not directly editable on compound items.

Regeneration was chosen over warn-on-divergence because a warning permits
drift and this is clinical content — divergence between what a compound-aware
consumer evaluates and what a prose-only consumer displays must be
impossible, not merely detectable. Consequence for rollback (§6.4): per-item
revert restores the *current* label — original prose if conditions were never
edited, regenerated text if they were — which is correct, since a
conditions edit is a clinical content change and reverting to pre-edit prose
would resurrect superseded wording.

### 2.2 Validation rules (enforced by the Admin editor, §5.3)

- `logic.type` present and one of the three values.
- 2–12 conditions, each with non-empty `text` and an `id` matching
  `<itemId>_[a-z]`. (12 = the collapsed xrch_48 family, §6.2 — the largest
  structure the census can produce.)
- `mandatory_plus_any`: ≥1 required and ≥1 non-required condition.
- `all`/`any`: no `required` flags.
- Condition IDs unique within the item; never reused after deletion
  (letters advance, gaps allowed) so historic references stay unambiguous.

### 2.3 Why no nesting — the six nested items, worked

| Item | Phase 0 nesting | Flat resolution |
|---|---|---|
| `usdvt_48_1` | option = (Wells<2 AND D-dimer+) | C; conjunction stays in `text` — **clinically confirmed** |
| `cth_a48_1` | any-of option = (no high-risk AND BPAC tool) | `any`(3); conjunction in `text` |
| `cth_p2_3` | mandatory + ((clear history AND low risk) OR MRI unavailable) | C(1+2); option (a) "clear history and low risk" as one text ⚑ corrupt source text fixed at migration, clinical sign-off |
| `usst_p3_1` | either-of options each internally conjunctive | C(1+2); conjunctions in `text` |
| `uspv_p2_5` | option = "≥2 risk factors*5" | C(1+2); the ≥2-of-list is one assertable condition; footnote *5 stays in `site.footnotes` |
| `ctcap_p2_2` | AND (at least 2 of 6 named labs) | `all`(3); "two or more of: CRP, Hb, Ca, platelets, ALP, albumin…" is one condition text |

`usca_48_1` (Mixed, the most complex item) also needs no new machinery: it is
`mandatory_plus_any` with seven `required` conditions (suspected TIA + the six
ALL-of criteria) and three non-required options (specialist rec / BPAC tool /
tool unavailable but suitable).

**Escape hatch, named now:** the one item that could ever force K-of-N is
`ctcap_p2_2`, and only if clinical review decides the six labs must be
individually assessable. If that ruling comes back at migration, the decision
is escalated to Gary before any schema addition — it is not pre-built.

### 2.4 Version/publish flow impact: none

Item structure lives inside the `criteria.data` JSON blob (Phase 0 Finding 1);
`versions.criteria_snapshot` and KV `criteria:published` carry it opaquely. No
D1 DDL, no pipeline change, no new publish step. NFR-012 holds: adding or
editing compound structure is a content operation through the existing
draft → snapshot → publish → KV flow.

Deployment-order safety property worth stating: because `label` is retained,
**data-first is safe**. If compound data is published before a consumer is
updated, the old consumer renders the prose `label` exactly as today. There is
no flag-day coupling between data publishes and code deploys.

---

## 3. Consumer contract — Criteria Viewer

Requirement refs: CV-014 (render sub-elements + logic grouping), CV-015–017
(ticking → output generation).

### 3.1 Rendering (interactive mode)

Follows the Phase 1 mockup with one deliberate deviation:

- No `logic` → current card, unchanged code path.
- `all` → headline (from `shortLabel`) + "All of the following" header + one
  checkbox per condition + parent verify-all checkbox (mockup behaviour:
  parent ticks/unticks all subs; auto-checks when all subs ticked).
- `mandatory_plus_any` → required rows tagged "Required", divider "Plus at
  least one of the following", optional rows; met-state dot on the header.
- `any` → "Any of the following" header + **checkboxes, not the mockup's radio
  buttons**. Deviation rationale: several any-of options can be simultaneously
  true for one patient (e.g. two red flags in `xrsp_em_2`), and the output text
  should record every documented option. Met = ≥1 ticked; radios would force a
  false single choice.

Referrer-facing logic labels are plain language only ("All of the following",
"Plus at least one of the following") — the type codes never surface
(GEN-004 spirit; brief constraint).

Passive mode (`?mode=passive`): sub-conditions rendered as a read-only list
with AND/OR connective rows per the mockup; no inputs.

### 3.2 Ticking → output (CV-015 to CV-017)

"This criterion is met" means **`logic` evaluates true** over the ticked
condition set (§2.1 semantics) — the mockup's `evaluateCompound` behaviour,
adopted as the contract.

- **Met compound item** → contributes to the summary panel count and urgency
  determination exactly as a ticked simple item does today (urgency remains
  group-derived — unchanged). Output text emits the headline plus the ticked
  conditions' texts as indented lines, so the referral records *which* pathway
  was satisfied (e.g. which of Wells≥2 vs Wells<2+D-dimer).
- **Partially ticked but unmet** (2-of-3 on an `all` item) → NOT met: excluded
  from the met count and from "criteria met" output, identical to an unticked
  simple item today. No partial credit appears in output text. (A "what's
  missing" hint in the UI is a possible later refinement — explicitly not in
  this design; §7 non-goal 9.)
- Clear-all resets sub-element state along with item state.

`postMessage` (`crr-output`) payload shape is unchanged — it carries the
generated text, which now may contain indented sub-lines. No consumer of the
message parses its internals (Phase 0: demo harness inserts it as text), so
this is not a contract change.

---

## 4. Consumer contract — Triage Advisor

Two parts, per Decision 3: (a) the serialisation format, designed here against
**published criteria**; (b) the statement that the current match-data blob is
retired as the LLM source. The pipeline change that makes (a) live is a
**separate implementation brief** — this section defines the target contract
only.

### 4.1 Serialisation format for the LLM context

Simple items: unchanged — `- <label>`.

Compound items serialise their structure with the sub-element IDs inline:

```
- [usdvt_48_1] Suspected lower limb DVT with Wells/D-dimer pathway — REQUIRED:
    (a) Clinically suspected lower limb DVT
  PLUS AT LEAST ONE OF:
    (b) Well's score of 2 or greater
    (c) Well's score less than 2 and positive D-dimer
```

`all` items use the header `ALL OF THE FOLLOWING:`; `any` items use
`ANY OF THE FOLLOWING:`. Deterministic, line-oriented, no JSON in the block
(keeps the prompt-cache-friendly plain-text shape of the current block).

What this buys: the model no longer re-derives decomposition from prose —
today's prompt carries hand-written decomposition examples (v2.3.0 "COMPOUND
CRITERIA: … Decompose and evaluate each sub-element separately") precisely
because the data can't say it. `met_criteria`/`missing_criteria` strings can
cite `usdvt_48_1(b)` instead of paraphrasing, making verdicts auditable
against specific sub-elements.

**Token cost:** decomposition re-segments the same words; overhead is the
headers and letters, ≈10–20 tokens × 60 items ≈ +1k tokens. The dominant cost
change comes from the source switch (336-item match-data → 473-item published
set), independent of this design; both land within the existing cached-block
approach. Exact figures belong to the implementation brief.

**Prompt implications — flagged, not designed** (prompt restructure is a
separate exercise per the brief): once structure is in the block, prompt
v2.3.x's hand-written decomposition instructions and pathway examples become
partially redundant and should be revisited; the output contract could later
adopt structured per-sub-element verdicts (the MeasureReport-shaped upgrade,
§8). Neither is part of this design. The assessment response contract is
unchanged (§7 non-goal 7).

### 4.2 Match-data retirement (target state)

The LLM criteria block's source becomes the published snapshot
(KV `criteria:published`), ending the divergence documented in Phase 0
headline finding 3. The rule-based matcher's synonym index is out of scope
here — only the LLM block's source is specified. `criteria:match-data` is
retired as the LLM source; its disposal (regenerate for the rule engine vs
retire entirely) is decided in the implementation brief.

---

## 5. Consumer contract — Admin Tool

Requirement ref: AD-002 (click-to-edit).

### 5.1 Editing model

Clicking a compound item opens the same editor as today plus a logic section:

- Logic type selector: Simple (default) / All of / Any of / Mandatory + any.
- Condition rows: text field, drag-reorder, add/remove; a "Required" toggle
  per row visible only for `mandatory_plus_any`.
- Condition IDs are assigned automatically (`_a`, `_b`…) and are not editable.
- **Label on compound items is read-only**, shown with a "regenerated from
  conditions on save" note (divergence rule, §2.1). Editing conditions and
  saving replaces it with the deterministic regeneration.
- Validation per §2.2, enforced on save to the working copy.

### 5.2 Convert / revert

- **Convert to compound:** author picks a type and decomposes; `label` is kept
  as-is (it remains the published source text).
- **Revert to simple:** deletes the `logic` key; the item renders from `label`
  again everywhere. This is the per-item rollback and costs nothing to build
  beyond the delete.

### 5.3 Flow impact

Working copy → snapshot → publish unchanged. Audit log captures logic changes
through the existing `changes` JSON diff — no schema addition.

---

## 6. Migration plan — FINAL (finalised in place per Gary, 5 July 2026; no separate migration-plan file)

### 6.1 Method: hand-authored decomposition, clinically reviewed — not parsing

Recommendation: **hybrid, weighted heavily to manual.** The decompositions for
all 60 items are hand-authored (Appendix A of the findings report already
contains the sub-structure for each), entered via the Admin editor into a
draft working copy — **not** produced by regex/text-parsing of the prose. The
"automated" half is only mechanical: pre-populating condition text fields by
splitting on the connectives identified in Appendix A, always followed by
human correction. Rationale: 60 items is an afternoon of authoring but a
catastrophic surface for silent parser errors; clinical meaning must not
change (CLAUDE.md criteria-fidelity rule).

**Every migrated item requires clinical review sign-off before publish**, and
that sign-off includes, for every item, the **label↔conditions consistency
check** (§2.1 divergence rule, state 1): the reviewer confirms the decomposed
conditions say exactly what the published prose says — no added, dropped, or
reweighted clinical meaning. Named items with additional rulings needed:

| Item | Ruling needed |
|---|---|
| `xrph_p2_3_p` | Working assumption any-of (Decision 6) — REQUIRES CLINICAL RULING |
| `cth_p2_3` | Corrupt duplicated clause — corrected text needs sign-off |
| `ushp_p2_2_p` | Possible two-criteria merge — split or keep needs ruling |
| `ctcap_p2_2` | Labs as one condition (design default) vs individually assessable (escape hatch §2.3) |
| Each denormalised family | Collapse decision per family (Decision 2) |
| `xrph_p2_4_p` | Inline footnote *1 risk factors as conditions vs keep flat with footnote reference |

### 6.1.1 Migration mechanics — clarification (added 6 July 2026, Gary)

"Hybrid, weighted heavily to manual" means the following division of labour —
it does NOT mean hand-typing 60 decompositions:

1. **Scripted draft pass (Claude Code).** Generate draft `logic` blocks for
   the tier's items from the Phase 0 Appendix A census, written to a **draft
   working copy via the admin API** — never published, never raw SQL. The
   census already contains the sub-structure per item; the script only
   mechanises it.
2. **Human correction (Admin editor).** A reviewer walks each pre-populated
   item with the source `label` alongside the draft conditions, correcting
   split errors (footnote-marker artefacts, prefix strings, intra-option
   conjunctions that must stay prose). Minutes per item.
3. **Clinical sign-off** per the one-pager process (per-item consistency
   check; family mergers and named rulings gated individually).
4. **Snapshot → publish**, tier by tier.

The prohibition in §6.1 is on **unsupervised parse-to-publish** — no parser
output reaches a published snapshot without steps 2–3. The authority split:
Claude Code drafts at scale; a human owns every publish decision.

**Sequencing dependency:** steps 1–2 require the Admin editor's logic-editing
UI (§5.1) to exist first. Order: Viewer/Admin logic support ships → scripted
draft pass → review → sign-off → publish.

### 6.2 Tiers (Decision 5 — by value, not uniformly)

- **Tier 1 — denormalised families + complex items.** Collapse arithmetic per
  family (target state, **each gated on its own clinical sign-off** —
  Decision 2, not a done deal):
  - **ctcol 11 → 2.** Collapse is per priority group, because priority is
    group-derived and cannot mix within one item: P2 (4 items) → one
    `mandatory_plus_any` [gate required + 4 indication options]; P3 (7 items)
    → one `mandatory_plus_any` [gate required + 7 options, the largest
    C-structure: 8 conditions]. The specialist-advises items (`ctcol_p2_4`,
    `ctcol_p3_7`) fold in as options because their source text carries the
    gate (confirmed in spot-check B.1 #5).
  - **ctcap 3 → 2.** `ctcap_p2_1` + `ctcap_p2_2` → one `mandatory_plus_any`
    [malignancy-suspicion stem required + 2 demographic/lab options].
    `ctcap_p2_3` (specialist advises) **stays a standalone simple item**: its
    source text does not carry the stem, so folding it in would impose a gate
    the criteria don't — the prior 26-item analysis modelled it as a third
    option, which the source text does not support.
  - **xrch_48 12 → 1.** `xrch_48_1..12` → one `any` item with 12 conditions
    (headline: the shared stem "symptoms or signs concerning for lung
    cancer"); this is the item that sets the 12-condition bound in §2.2.
    `xrch_48_13..16` were never in the family and are untouched.
  - Net: 26 flat items → 5 structured items, plus the M-pattern items
    (`usca_48_1`, `ctcap_p2_2` via the ctcap collapse, `cth_p2_3`). Highest
    clinical value: these are the items the flat structure damages most.
- **Tier 2 — the C and B pattern items** (~28): high value (mandatory
  gateways and red-flag lists become explicit).
- **Tier 3 — trivial all(2) items** (~10, e.g. `ctch_p2_3`): migrate last,
  **with the standing option that they remain flat indefinitely.** Capability
  ≠ obligation (Decision 5).

Family collapse changes item IDs. Consequences owned by the plan: viewer
`INDICATION_THEME_MAP` entries for retired IDs; a recorded old-ID → new-ID
mapping table for usage-log/QA continuity (historic rows keep old IDs; the
mapping is documentation, not a data migration).

### 6.3 Sequencing (Decision 4: v4.1.0 is the baseline)

1. Ship logic-aware Viewer + Admin (renders/edits `logic` if present — no-op
   while none exists). Safe in either order relative to data (§2.4), but
   code-first avoids even transient prose-only rendering of migrated items.
2. Tier 1 authoring → clinical sign-off → snapshot → publish. Observe.
3. Tier 2 likewise. Tier 3 only if wanted.
4. Triage Advisor source switch (separate implementation brief) — any time
   after step 1; benefits compound items as each tier publishes.

No reload interaction: the schema is additive on the live v4.1.0 data.
Region step per Decision 7: site-level HealthPathways URLs are untouched by
migration (they live in `criteria:regions`, keyed by site, orthogonal to item
structure — §confirmed in Phase 0 Finding 1); item-level overrides are
placeholder data, discarded, no preservation machinery.

### 6.4 Rollback

Three independent layers, all existing mechanisms:
1. **Version rollback** — republish the prior snapshot (flat v4.1.0 or any
   intermediate tier) via the existing rollback endpoint.
2. **Per-item revert** — delete the `logic` key; `label` is authoritative
   prose again (§5.2).
3. **Consumer indifference** — any consumer reading only `label` is already
   rolled back by construction.

---

## 7. Non-goals — what this design deliberately does not do

1. **No generic rules engine or expression language.** Three named types, flat
   conditions. The census found three shapes; nothing else is representable on
   purpose.
2. **No nesting.** All six candidate items resolve flat (§2.3), anchored by a
   clinical confirmation, not convenience.
3. **No K-of-N / `minOptions`.** Zero items need it. The one future candidate
   (`ctcap_p2_2` labs) is a named escalation, not a built feature.
4. **No FHIR Questionnaire / CQL / Measure serialisers now.** §8 checks
   nothing is precluded; nothing is built.
5. **No item-level region override machinery** (Decision 7). Placeholder data,
   discarded at migration.
6. **No system prompt redesign.** §4.1 flags the implications; the prompt is a
   governance-controlled artifact changed in its own exercise.
7. **No change to the Triage Advisor request/response contract.** Sub-element
   citations ride inside existing free-text fields.
8. **No D1 DDL, no new tables, no migration scripts against the database.**
   Structure is JSON content in the existing blob.
9. **No partial-credit UX** ("2 of 3 ticked — nearly met") in the Viewer
   output; unmet is unmet. Possible later refinement, not designed.
10. **No decomposition of the excluded items** — the ~40 "specialist advises"
    actor-alternative items and the Appendix A Part 2 exclusions stay flat by
    classification, not by omission.
11. **No match-data pipeline implementation.** §4.2 sets the target contract;
    the fix is a separate implementation brief (Decision 3).

## 8. Standards path check (NFR-013 expanded)

The requirement is that the model not *preclude* later serialisation. Check:

- **FHIR Questionnaire** — each compound item maps to a Questionnaire group
  item; conditions map to boolean child items; `all` → all children required;
  `any`/`mandatory_plus_any` → `enableWhen`/`enableBehavior` (`all`/`any`)
  driving a group-met derivation. Flat conditions with stable IDs
  (`usdvt_48_1_b` → `linkId`) are exactly what a generator needs. ✓
- **CQL Library** — each condition = a named parameter/define; each item's
  `logic` = a one-line and/or expression over them. The set-aside draft CQL
  (Phase 0 Finding 8) independently used this exact shape, corroborating
  generatability — a faithful generated library would supersede that draft. ✓
- **FHIR Measure / MeasureReport** — a Measure packages item logic as
  evaluable criteria referencing the CQL; a MeasureReport recording which
  conditions a case met is structurally the Triage Advisor's per-sub-element
  verdict (§4.1's future upgrade). Output-side only; places no additional
  demand on this schema. ✓

Satisfied by structured-logic-as-data with stable condition IDs. Nothing here
requires — or builds — any FHIR artifact now.

---

## Acceptance criteria mapping (brief checklist)

- Data model handles only census patterns; every feature traces to named items ✓ (§2.1 table, §2.3)
- All four consumer contracts specified ✓ (§3–§5, regionalisation in §6.3)
- Simple items remain simple, before/after shown ✓ (§2.1)
- Migration + sequencing recommendation with reasoning ✓ (§6)
- Standards path check ✓ (§8)
- Zero implementation code ✓
- Non-goals substantive ✓ (§7)

**ACCEPTED (Gary, 12 July 2026).** Migration plan (§6) finalised with this
acceptance. The clinical sign-off extract
(`compound-criteria-clinical-signoff.md`) is ready for circulation to the
working group on his go-ahead.

*Recorded for the future Viewer implementation brief, not this design:
sub-element tick events are to be included in usage telemetry (CV-025).*
