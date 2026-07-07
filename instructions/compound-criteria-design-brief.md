# Claude Code Brief: Compound Criteria — Data Model & Architecture Design

**Brief ID:** CC-DESIGN-01
**Version:** 1.1.0
**Date:** July 2026
**Model:** Claude Fable 5 (development-time use only)
**Status:** Ready for execution
**Type:** DESIGN ONLY — no implementation code in this brief

---

## Objective

Design the data model and architecture for representing compound criteria — items containing multiple sub-elements with logical relationships (all-of, any-of, mandatory-plus-pick) — across the CRR Tool Suite. Produce a design document and migration plan for Gary's review. Do not implement.

---

## Context

Approximately 26 criteria items across 13 exam sites (~5–6% of the 473 items) contain compound logic that the current flat item structure cannot represent. Today these are rendered as single text blobs, which means:

- The Criteria Viewer cannot render sub-element checkboxes or logic grouping (requirement CV-014)
- The Triage Advisor cannot assess sub-elements individually — it sees one opaque string
- The Admin Tool cannot edit sub-elements independently
- A Phase 1 visual mockup exists demonstrating the intended Viewer rendering

This is the highest-stakes architectural decision in the suite. The design principle that governs it:

> **Code as liability.** Every line carries maintenance cost. The target is the minimum structure a future developer can understand without original context. A general-purpose rules engine is explicitly the failure mode to avoid — do not build for logic patterns that do not exist in the actual 26 items.

---

## Phase 0 — Discovery (MANDATORY before any design)

Read and report on the actual ground truth. Do not rely on this brief's description of the data.

1. **Read the current D1 schema** — all tables related to criteria items, groups, sites, exams. Document the actual structure.
2. **Read `pdf-criteria-all.json`** — document the item structure as extracted from the authoritative PDF.
3. **Identify and enumerate all compound items.** Find every item whose text contains multi-element logic. For each: item ID, exam/site, full text, and a classification of its logic pattern (all-of / any-of / mandatory-plus-pick / mixed / other).
4. **Produce a logic pattern census.** How many distinct logical shapes actually exist? This determines the minimum viable model — if only 3 patterns exist, do not design for 10.
5. **Read the Phase 1 mockup** (compound criteria rendering) and document what display behaviour it implies.
6. **Read how the Triage Advisor system prompt currently consumes criteria data** — the format criteria are serialised into for the LLM context.
7. **Check the wipe-and-reload instructions** (`claude-code-data-load-instructions.md`) and assess sequencing: should the reload land in the new compound-aware schema, or reload first and migrate second? Recommend one with reasoning.
8. **Locate and assess `CRRCriteria_v2_0.cql`** (draft CQL library, April 2026 criteria — status: unreviewed draft, never externally validated). Assess whether its logic expressions are well-formed and consistent with the patterns found in the census. **Report your assessment.** If it is sound, it may inform the logic-type vocabulary; if it is poorly structured or diverges from the actual criteria, say so and set it aside. Do not treat it as authoritative.

**STOP after Phase 0.** Produce a findings report (`compound-criteria-phase0-findings.md`) and wait for Gary's confirmation before proceeding to design. If any finding contradicts this brief's assumptions (e.g. the count is not 26, or a logic pattern exists that doesn't fit the three named types), flag it prominently.

---

## Phase 1 — Design (after Phase 0 sign-off)

Produce a design document (`compound-criteria-design.md`) covering:

### 1. Data model

- Schema changes to represent sub-elements and their logical relationships
- Must support exactly the logic patterns found in the Phase 0 census — no speculative generality
- Sub-element logic must be expressed as **structured data with an explicit logic-type attribute** (e.g. `logic: all | any | mandatory_plus_pick`), never buried in free text, display formatting, or implicit ordering
- Backwards compatibility: the ~447 non-compound items must not become more complex to store, edit, or render. A simple item should remain simple.
- Version/publish flow impact: how compound structures move through the existing snapshot → publish → KV cache pipeline unchanged (or with minimal change)

### 2. The four consumers

For each consumer, specify the contract — what it reads and how:

| Consumer | Design question |
|----------|----------------|
| **Criteria Viewer** | Rendering model for sub-element ticking. How does ticking interact with output generation (CV-015 to CV-017)? What does "this criterion is met" mean for the output text when 2-of-3 sub-elements are ticked? |
| **Triage Advisor** | Serialisation format for the LLM context. How are sub-element logic relationships expressed so the model assesses them correctly? Consider token cost. Flag any system prompt implications but do NOT redesign the prompt — prompt restructure is a separate exercise. |
| **Admin Tool** | Editing model. How does an author edit sub-elements and logic type? How does this interact with the click-to-edit pattern (AD-002)? |
| **Regionalisation** | Confirm compound structures don't break region overrides. |

### 3. Migration plan

- How the identified compound items move from flat text to structured form
- Whether migration is automated (parse the text), manual (author re-enters via Admin), or hybrid (automated draft + human review). Recommend one. Note that clinical meaning must not change — flag that migrated items likely need clinical review sign-off before publish.
- Rollback path

### 4. Sequencing recommendation

- Reload-then-migrate vs migrate-schema-then-reload, per Phase 0 finding 7
- Impact on the v4.0.5 → full reload plan

### 5. Standards path (NFR-013, expanded)

The model must not preclude future serialisation to:

- **FHIR Questionnaire** — content and user interaction layer (nested items, enableWhen/enableBehavior with all/any semantics)
- **CQL Library** — computable logic layer
- **FHIR Measure / MeasureReport** — evaluation and reporting layer (raised by Jon Herries, HealthX; a Measure packages criteria as a formal evaluable definition referencing a CQL Library; a MeasureReport records which criteria a case met — conceptually, the Triage Advisor's structured verdict output)

This constraint is satisfied by the structured-logic-as-data requirement in section 1. **Do not design *for* FHIR; design so a serialiser could be written later.** MeasureReport shapes future output serialisation only — it places no additional demands on the criteria schema.

### 6. Explicit non-goals

State what this design deliberately does not do (e.g. no generic rules engine, no FHIR/CQL serialisation now). If this section is thin, the design has probably over-reached — every schema feature must trace to a real item in the census.

---

## Constraints

- **Follow CLAUDE.md conventions** and the CRR-specific conventions file (`public/crr-criteria/CLAUDE.md`)
- **Design for the census, not the category.** If mandatory-plus-pick appears twice, it gets the simplest representation that handles two items — not a framework
- **No changes to production anything** — this brief produces markdown documents only
- **Plain-language logic labels** in any referrer-facing implications (GEN-004 spirit: internal logic codes never surface to referrers)
- The design must keep NFR-012 intact: criteria content changes must not require code changes
- Clinical meaning must not be altered by restructuring (Design Principle: criteria fidelity)

---

## Deliverables

```
instructions/
  compound-criteria-phase0-findings.md    ← STOP for review
  compound-criteria-design.md             ← after sign-off
  compound-criteria-migration-plan.md     ← may be a section of the design doc if short
```

## Acceptance criteria

- [ ] Phase 0 findings report produced and reviewed before any design work
- [ ] Every compound item enumerated with its actual logic pattern
- [ ] CQL draft assessed and either adopted as reference or explicitly set aside with reasoning
- [ ] Data model handles only the patterns found — reviewer can trace each schema feature to a real item
- [ ] All four consumer contracts specified
- [ ] Simple items remain simple (demonstrated with a before/after example)
- [ ] Migration and sequencing recommendation with reasoning
- [ ] Standards path check completed (nothing precludes Questionnaire / CQL / Measure serialisation)
- [ ] Zero implementation code written
