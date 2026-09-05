> **[SUPERSEDED — 2026-09-05]** ARCH-MIG-01 (`instructions.complete/arch-mig-01-brief.md`,
> `instructions/arch-mig-plan.md`) retires the mechanism this brief specifies — switching the
> Triage Advisor onto the existing D1/KV published-JSON path is replaced entirely by the
> rules-bundle architecture (CQL/FHIR bundles, slices 1–3). Not implemented, and will not be;
> this file's job is done by the target architecture instead. Decision recorded: SD-10.
> Verification: verified — SD-10 raised, `documents/SECURITY_DECISIONS.md`.
> Filed by: Claude Code

# Claude Code Brief: Triage Advisor Criteria Source Switch

**Brief ID:** TA-SRC-01
**Version:** 1.0.0
**Date:** July 2026
**Model:** Claude Fable 5 (final session — design and discovery; implementation only if Phase 0 is clean and time permits)
**Status:** Ready for execution
**Depends on:** CC-DESIGN-01 §4 (target serialisation contract), Phase 0 headline finding 3 (match-data staleness)
**Deployment gated on:** TA-REG-01 baseline run against the CURRENT stale source — the switch must NOT go live before that baseline exists

---

## Objective

Move the Triage Advisor LLM's criteria block from the stale `criteria:match-data` KV blob (39 sites / 336 items, divergent IDs, not updated by publishes) onto the published criteria snapshot (`criteria:published`, currently v4.1.0, 53 sites / 473 items), and retire match-data as the LLM source — ending the divergence documented in CC-DESIGN-01 Phase 0 finding 3 and making AD-006 ("a single publish updates all consumer tools") true in practice.

## What this is NOT

- **Not a hotfix.** The switch changes assessment behaviour (14 sites become visible to the AI; block grows ~40%). It deploys only after the regression baseline is captured on the current source, so before/after impact is measured, not asserted.
- **Not the compound criteria migration.** The serialisation must *support* CC-DESIGN-01 §4.1's compound format, but at switch time all items are flat — the compound rendering path will simply have nothing to render yet.
- **Not a system prompt change.** Prompt v2.3.x text is untouched. If the source switch makes prompt instructions partially redundant (hand-written decomposition examples), flag it for the separate prompt exercise — do not edit.

---

## Phase 0 — Discovery (MANDATORY, report before designing)

1. **Full consumer inventory of `criteria:match-data`.** The LLM block (`buildCriteriaBlock()`) is one consumer — find ALL others. Specifically: does the rule-based exam/site auto-detection (TA-002) use the match-data synonym index? Does anything else read the blob (Viewer, Admin, telemetry)? For each consumer: what fields it reads, what breaks if the blob is retired vs frozen.
2. **ID mapping.** Produce the old-ID → published-ID mapping table for the 336 match-data items (e.g. `cth_a1` → published equivalent). Flag: items with no published counterpart, published items with no match-data counterpart (expected: the 14 missing sites), and any where the mapping is ambiguous. This table matters for interpreting historical D1 assessment logs that cite old IDs.
3. **Serialisation source audit.** Document exactly what `buildCriteriaBlock()` emits per site today (headers, guidance lines, mandatory markers, footnotes) and what the published snapshot structure provides for each element. Identify anything the block needs that published data lacks (e.g. the per-item `mandatory` boolean — set on 1 of 336 items — does published data carry it at all?).
4. **Token measurement.** Measure the current block's actual token count and project the published-source block (473 items, same serialisation). Report both numbers and the cost delta per assessment at current pricing. If projection exceeds ~35k tokens, flag for discussion before proceeding — options (site-scoped blocks, caching strategy) are a decision for Gary, not a unilateral design choice.
5. **`transformToMatchFormat()` disposition.** Given finding 1: recommend regenerate (rebuild match-data from published on each publish, for the rule-based matcher only) vs retire entirely (matcher moves to published data too) vs freeze (matcher keeps stale blob, LLM moves off it — interim only). Recommend one with reasoning.

**STOP.** Report findings (`ta-src-phase0-findings.md`) and wait for review.

## Phase 1 — Design and implementation plan (after sign-off)

- New block builder reading `criteria:published`, emitting CC-DESIGN-01 §4.1 format (flat items `- <label>`; compound items with REQUIRED / PLUS AT LEAST ONE OF / ALL OF / ANY OF headers and `(a)(b)` condition IDs when `logic` present).
- Match-data disposition per the Phase 0 recommendation.
- Publish-pipeline confirmation: after the switch, a criteria publish must reach the LLM block with no manual step — state how (KV read per session vs cached, and cache invalidation on publish).
- Cutover and rollback: feature flag or single deploy; rollback = revert to old builder (match-data blob retained read-only until decommission is signed off).
- Test plan hook: the TA-REG-01 suite runs identically against both sources; list the cases expected to change verdict (at minimum: any case whose correct pathway lives in one of the 14 previously-invisible sites — RP-007 / INT-001 routing territory) so the diff is checked against predictions, not just eyeballed.

## Acceptance criteria

- [ ] All match-data consumers inventoried; nothing breaks unknowingly
- [ ] ID mapping table produced with unmapped items flagged
- [ ] Token/cost figures measured and projected, not estimated
- [ ] transformToMatchFormat() disposition recommended with reasoning
- [ ] Serialisation supports compound format but functions with all-flat data
- [ ] Publish → LLM block path automatic post-switch (AD-006 true)
- [ ] Rollback path stated
- [ ] Zero deployment before the TA-REG-01 baseline run exists — restate this in the findings report

## Files

```
instructions/
  ta-src-phase0-findings.md      ← STOP for review
  ta-src-design.md               ← after sign-off
```
