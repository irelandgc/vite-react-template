# Claude Code Brief: Triage Advisor System Prompt v3 — Audit & Restructure Design

**Brief ID:** TA-PROMPT-01
**Version:** 1.0.0
**Date:** July 2026
**Model:** Claude Fable 5 (final window — design only)
**Status:** Ready for execution
**Type:** DESIGN ONLY — the deployed prompt (v2.3.0) is untouchable. This brief produces markdown documents. Nothing is written to D1, nothing is published, no prompt version is created or activated.
**Depends on:** TA-SRC-01 design (accepted 6 Jul), CC-DESIGN-01 §4.1 (compound serialisation), CRR_Test_Case_Results_Matrix_v2.xlsx (30 cases), evaluation findings
**Deployment reality (for context, not action):** any v3 prompt would deploy only after the TA-SRC-01 cutover is complete and measured, via the existing versioned prompt machinery (TA-009), behind its own regression run with pre-registered predictions. That is a separate, gated, future exercise.

---

## Objective

Produce (1) a complete provenance audit of system prompt v2.3.0 — every instruction traced to the finding that created it, the regression case that protects it, and its status after the source switch — and (2) a restructured v3 prompt architecture in which every v2.3.0 behaviour is explicitly carried forward, relocated, or retired with reasoning.

## Problem statement

v2.3.0 is accreted, not designed. Step 0 (emergency/ACC/compound redirect), instruction 0's numeric-threshold rule and its risk-modifier EXCEPTION, SP-01, SP-02, and the decomposition examples were each added in response to a specific evaluation finding, layered onto the existing text. Consequences:

- Nobody holds a written record of why each instruction exists or what protects it — the provenance lives in chat history and memory
- Instructions interact in unaudited ways (exception clauses scoped by position rather than intent)
- The TA-SRC-01 source switch changes the ground truth several instructions were written against: compound structure will arrive pre-decomposed in the criteria block (CC-DESIGN-01 §4.1 format), page citations become correct again, and 14 new sites (including `ct_other`) become visible — the hand-written decomposition examples and any wording compensating for the invisible `ct_other` pathway may be redundant or wrong post-switch
- The central unresolved clinical safety finding — fabrication in suggested wording (DG-001/002/003/005) — has only ever been patched with instructions, never addressed architecturally

## Phase 0 — Instruction-by-instruction audit (MANDATORY, report before designing)

Read the deployed v2.3.0 prompt text (from D1 via the admin API or the repo copy — read-only), the regression case set (CRR_Test_Case_Results_Matrix_v2.xlsx), the evaluator findings, and the TA-SRC-01 design. Produce a traceability table with one row per instruction / distinct behavioural clause:

| Column | Content |
|---|---|
| Instruction | Verbatim clause (or tight paraphrase + location) |
| Origin | The evaluator finding, incident, or design decision that created it (name the case: RP-003, DG-002, MW-008, KV incident, etc.). Mark UNKNOWN honestly if provenance can't be established — do not invent origins |
| Protected by | Which regression case(s) would catch its removal. Mark UNPROTECTED if none — these are the dangerous ones |
| Post-switch status | UNCHANGED / PARTIALLY REDUNDANT / REDUNDANT / WRONG once TA-SRC-01 lands, with one-line reasoning |
| Interactions | Any other instruction it overlaps, scopes, or conflicts with |

Additionally in Phase 0:

1. **Fabrication architecture analysis.** Examine how the prompt currently produces suggested wording relative to assessment. State, with reference to the DG case texts (in the spreadsheet), the mechanism hypothesis: what about the current structure permits asserting clinical facts not present in the note? Identify candidate structural remedies (e.g. hard separation of "documented findings" extraction from "wording suggestions"; suggested wording constrained to name *what to document*, never *what the finding is*) — analysis only, no design commitment yet.
2. **Gap list.** Behaviours the evaluation showed are needed but no instruction currently provides (candidates from findings: ACC detection — Michaela: "ED yes, ACC no"; telehealth/no-examination detection; the defer-don't-decline "CT Other" behaviour flagged as a separate brief; DG-005-class contradiction flagging). List them; do NOT design them yet. Note which have regression cases already and which would need new cases.
3. **Redundancy candidates from TA-SRC-01.** Specifically assess: decomposition examples vs §4.1 structured blocks; FALLBACK_INSTRUCTION_TEXT in triage/index.html; instruction 9 page citations; any ct_other compensation.
4. **UNPROTECTED × load-bearing matrix.** The instructions that are both unprotected by regression cases and clinically load-bearing are the riskiest part of any restructure — name them explicitly.

**STOP.** Report as `instructions/prompt-v3-phase0-audit.md`. Wait for review.

## Phase 1 — v3 architecture design (after sign-off)

`instructions/prompt-v3-design.md` covering:

1. **Structure** — the restructured prompt's sections and ordering, with the design rationale for each. Safety-critical logic (Step 0 class) must be architecturally prominent, not positionally incidental.
2. **Behaviour mapping** — every Phase 0 table row maps to: CARRIED (where in v3), RESTRUCTURED (how, why equivalent or better), or RETIRED (why safe, citing the post-switch status). Zero silent drops.
3. **Fabrication remedy** — the structural answer to the DG findings, designed. This is the clinical headline of v3; it gets its own section with the mechanism, the expected effect on DG-001/002/003/005, and the regression predictions.
4. **Gap decisions** — for each Phase 0 gap: include in v3, defer to a named follow-up, or reject with reasoning. (The ACC gap is a strong candidate for v3 inclusion — it has an evaluator finding, a clear behaviour, and Step 0 is its natural home.)
5. **Documentation standard (TA-010)** — how strict vs inferred reading mode is expressed in the v3 structure; the setting exists, the default is a clinical evaluation decision, the architecture must make the mode boundary clean.
6. **Regression plan** — pre-registered predictions per the TA-SRC-01 §9 pattern: which of the 30 cases should change (the four DG cases are the point), which must not (every currently-passing safety case), and what new cases the gap inclusions need. Note explicitly that v3's baseline is the *post-switch* run, not the current one.
7. **Rollout sketch** — versioned via existing TA-009 machinery, activation via admin API only, rollback path, and the governance note: a prompt restructure during/after evaluation is a Tim-visible change, same class as a model change.
8. **Non-goals** — at minimum: no model change, no temperature change, no output JSON schema change unless a mapped behaviour requires it (flag loudly if so, since the client parses it), no role-aware variants (working-group dependency — but state how the v3 structure would accommodate them later without another restructure).

## Constraints

- Deployed prompt, D1, KV, production assets: untouched. Read-only access throughout
- Every v3 design choice must trace to a Phase 0 table row, a named finding, or a stated principle — same census discipline as CC-DESIGN-01
- Prompt text drafting in Phase 1 is limited to structural skeleton + the fabrication-remedy section drafted in full (it's the part needing review); full v3 text authoring is the implementation exercise, not this one
- Follow CLAUDE.md, including the Design Briefs and Model Boundaries sections

## Deliverables

```
instructions/
  prompt-v3-phase0-audit.md     ← STOP for review
  prompt-v3-design.md           ← after sign-off
```

## Acceptance criteria

- [ ] Every v2.3.0 instruction in the traceability table; origins honest (UNKNOWN allowed, invention not)
- [ ] UNPROTECTED × load-bearing instructions named
- [ ] Fabrication mechanism hypothesis stated with reference to the DG case texts
- [ ] Post-switch redundancy assessed for all four named candidates
- [ ] Phase 1: zero silent drops — full behaviour mapping
- [ ] Fabrication remedy designed with per-DG-case regression predictions
- [ ] Non-goals section earns its place
- [ ] Nothing deployed, written to D1, or published
