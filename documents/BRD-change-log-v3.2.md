# BRD change log — v3.2 DRAFT (architecture migration, ARCH-MIG-01)

**File:** `documents/CRR_Tool_Suite_Business_Requirements_DRAFT_v3.2.docx` · **Baseline:** v2 (22 May 2026) · **Date:** 5 September 2026 · **Author of redline:** Claude (ARCH-MIG-01 Phase 3), tracked changes throughout — accept or reject in Word.
**Why v2 is the baseline:** v3.1.1 is referenced by `documents/verification-report-2026-08.md` but is not in the repository and could not be located (ARCH-MIG-01 D4). If it is found, its status annotations should be reconciled onto this revision; the requirement wording below supersedes either.
**Source of the changes:** `instructions/arch-mig-gap-analysis.md` §8 (requirements impact), applied one-for-one. Every change is a tracked insertion or deletion; nothing is silently rewritten. Validated: OOXML schema clean; all edits attributed to the redline author.

## Front matter, purpose, definitions, scope, principles, roles

| Where | Change |
|---|---|
| Status / date | "DRAFT" → "DRAFT v3.2 — architecture migration (ARCH-MIG-01)"; date → 5 September 2026 |
| Document status | New paragraph describing the rules-bundle architecture and the v2 baseline reason |
| §2 tool descriptions | Triage Advisor and Admin Tool descriptions reworded (extraction + deterministic evaluation; admin as management tool, criteria via governed change process) |
| §4 Definitions | Reworded: Triage Advisor, Admin Tool, Compound criteria. Added: Criteria bundle, Indicator, Evidence status, Advisory, Regional overlay, Bundle state |
| §5.1 In scope | "Data model" bullet replaced by "Criteria rules bundle…"; added pipeline, retrieval path (dormant) and evaluation bullets |
| §6 Design principles | Criteria fidelity and Centralised content reworded; added "Deterministic evaluation" and "Evidence before inference" |
| §7 Roles | CRR Programme — Clinical (bundle sign-off, vocabulary grouping, benchmark review) and CRR Programme — Digital (change process, model/prompt releases) reworded |

## §8.1 General

| Req | Change |
|---|---|
| GEN-001 | Reworded: PDF or approved amendment as source; bundle per exam/site with verbatim provenance; JSON extracts are cross-checks |
| GEN-002 | Reworded: server-side redaction; structured audit record; optional redacted-note store with retention/purge |
| GEN-003 | Replaced: server-side auto-redaction with tests (Must have, was Should have); client pipeline is a courtesy |
| GEN-004, 005, 006, 010 | Unchanged |
| GEN-007 | Reworded: overlays as the mechanism; overlays cannot alter logic |
| GEN-008 | Reworded: bundles, registry, publication states |
| GEN-009 | Reworded: bundle/vocabulary/engine/prompt/model versions on every assessment and display |
| **BND-001…006** | **New:** bundle contents; indicator vocabulary; build gates; clinical sign-off; runtime loading (no embedded criteria, fail visibly); cross-bundle references |

## §8.2 Criteria Viewer

| Req | Change |
|---|---|
| CV-001–011, 013, 016–025 | Unchanged |
| CV-012 | Reworded: guidance and HealthPathways link composed from national page ID + regional domain; overlay guidance |
| CV-014 | Reworded: compound rendering from PlanDefinition selection behaviour — same structure the engine evaluates |
| CV-015 | Reworded: ticks recorded as a QuestionnaireResponse; optional "check against criteria" via the engine |
| **CV-026, CV-027** | **New:** page references (Should have); indicator-based grouping option (Nice to have) |

## §8.3 Triage Advisor

| Req | Change |
|---|---|
| TA-001, 003, 004, 019, 021, 024, 025, 027 | Unchanged |
| TA-002 | Reworded: exam/site selection is an extraction output over the published list, with quotes and user correction |
| TA-005 | Reworded: supplied values mapped to indicators as documented evidence |
| TA-006 | Replaced ("Criteria evaluation"): engine evaluates requested and candidate exam/sites; cross-exam recommendation; red flags first |
| TA-007 | Replaced ("Advisory output"): the single Advisory object; two views of one output |
| TA-008 | Replaced ("LLM extraction"): extraction only; evidence status and quote; never assesses; pinned model, benchmark-gated change |
| TA-009 | Reworded ("Extraction prompt control"): server-side assembly; no criteria content; verified-identity audit |
| TA-010 | Reworded: documentation standard as an engine parameter over evidence status |
| TA-011, 012, 013 | Reworded: red-flag/ACC indicators with fixed engine precedence |
| TA-014 | Reworded: ambiguous timing omitted → insufficient information naming the indicator |
| TA-015 | Reworded: modifiers never transcribed as conditions |
| TA-016 | Reworded: lab indicators per bundle; missing named; no reference ranges from referrers |
| TA-017 | Reworded: gateways inside their pathway |
| TA-018 | Reworded: criteria rendered from the same PlanDefinition as the Viewer |
| TA-020 | Reworded: cost of the extraction call |
| TA-022, 023 | Replaced: compare **extraction** across models; engine result identical by construction |
| TA-026 | Replaced: structured audit record; no note text by default; optional separate redacted-note store |
| **TA-028…032** | **New:** server-side pipeline; validation gate; merge and precedence; retrieval path (dormant, governance-gated); benchmark and model comparison |

## §8.4 Admin Tool

| Req | Change |
|---|---|
| AD-001, 011, 012 | Unchanged |
| AD-002 | Replaced: criteria maintained via governed change process; in-tool editing disabled for pilot; structured editor with roles/approval/Entra ID is a future phase |
| AD-003 | Reworded: diff review with source wording and tests; publish requires signed-off state by a second person |
| AD-004, 005, 006, 007, 008, 009, 010, 013 | Reworded for bundles, registry artefacts, publish-service audit, bundle-state monitoring, JSON as cross-check/Viewer interim source, overlays |

## §9 Non-functional

| Req | Change |
|---|---|
| NFR-001, 002 | Reworded (bundle delivery; extraction + evaluation) |
| NFR-003 | Replaced: structured record; retention/purge for any redacted note |
| NFR-004, 005, 010, 011 | Unchanged |
| NFR-006 | Reworded: model called only server-side; same-origin service binding; no public route accepts a model request body |
| NFR-007, 008 | Reworded (server-side redaction, tested; NFR-008 Must have, was Should have) |
| NFR-009 | Reworded: provider-agnostic behind the contract |
| NFR-012 | Reworded: criteria changes are bundle versions |
| NFR-013 | Replaced ("FHIR and CQL publication", Must have, was Nice to have): delivered, not a future path |
| **NFR-014, NFR-015** | **New:** deterministic reproducibility; automated test coverage in CI |

## §10 Future considerations

Replaced "FHIR/CQL serialisation" (now delivered) with platform consumption of the published bundles; replaced "deep referral platform integration" with the tiered enabling of the dormant retrieval path; added the structured editor with roles/approval/Entra ID, and NZHTS terminology binding.

## Not changed and worth a decision

- §11 Review and Approval table left as v2 (names, roles, dates blank). The review list should be revisited for v3.2: NAIAEAG engagement (Robyn Whittaker, CK Jin) and the privacy office (audit record, retention) are new reviewers this revision implies.
- GEN-010 attribution wording unchanged; the verification report notes the current UI does not meet it.
- CV-003 still states "14 exam/site combinations (89 items)" for paediatrics; the census counts 22 paediatric sites / 142 items in published data. Flagged, not changed — a content-count question for the programme, not an architecture change.
