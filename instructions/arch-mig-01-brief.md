# Claude Code Brief: Migration to the Rules-Bundle Architecture

**Brief ID:** ARCH-MIG-01
**Version:** 1.0.0
**Date:** 5 September 2026
**Model:** Phases 0–3 Claude Fable 5 (design and discovery only — no production changes). Phase 4 slices: Claude Code on Sonnet, except prompt decomposition (slice 4) and criteria transcription (slice 1b) which go to Opus.
**Status:** Phase 0 complete (`arch-mig-phase0-findings.md`, STOP). Phase 1 awaits decisions D1–D8.
**Depends on:** target architecture as built in `~/Projects/CRR Criteria/CRR_Desision_Support/` (`ct-cap-template/`, published page *CRR Decision Support Architecture*, `migration/CLAUDE.md`, `migration/MIGRATION_REVIEW_BRIEF.md`); NAIAEAG informal approach summary; CC-DESIGN-01 and TA-SRC-01 (both ACCEPTED, both superseded in part — see findings §4–§5).
**Deployment gated on:** Phase 2 plan approval; per slice, the bundle tooling's `npm run build && npm test && npm run check` green plus existing runners; SD/SR entries recorded before anything reaches production.

---

## Objective

Move the tool suite from the current structure (criteria as prose in a browser-assembled prompt; the LLM extracting, judging, prioritising and formatting in one call; criteria content in D1 JSON published to KV) to the rules-bundle architecture: national criteria published per exam/site as a versioned bundle (CQL Library → ELM, PlanDefinition, Questionnaire, population Library, terminology bindings, scenario tests); every input path producing one QuestionnaireResponse with evidence status per answer; a deterministic engine producing one Advisory rendered as referrer and triager views; the LLM confined to extraction behind a validation gate; retrieval from referrer systems designed in and dormant; regional overlays that cannot alter logic.

The outcome to take to NAIAEAG is: the architecture CK Jin assumed we had is the one we have, the fabrication finding is closed by construction, criteria staleness is closed by runtime bundle loading, and the benchmark separates extraction accuracy from rule correctness.

## What this is NOT

- **Not a UI redesign.** The Viewer's data source changes (PlanDefinition + Questionnaire from the registry); its visual design does not unless D-decided. The role-aware view branch is rebased, not rebuilt.
- **Not a re-transcription of all 53 sites before anything ships.** The pilot subset (D3) is transcribed first, with clinical review per site. Sites outside the subset are out of the tool until transcribed — no fallback to prose-in-prompt for untranscribed sites (that would recreate the architecture being retired). The Viewer keeps showing them from the published JSON until their bundle exists.
- **Not a hosting migration.** New server-side stages land where D7 says; moving off Cloudflare is a separate decision.
- **Not a change to the production model.** Governance-controlled setting; unchanged.

## Ground rules (in addition to `CLAUDE.md`)

1. Discovery and design are read-only. Outputs go in `instructions/` as `arch-mig-*.md`; registers are updated in `documents/` (SD/SR entries, release log), never duplicated.
2. STOP gates are literal. Phase 0 → 1 → 2 → 3 → 4, each ending the turn.
3. The backlog is a list of problems, not of work. For every recorded issue the disposition table names the recorded fix and the target fix; a recorded fix the target supersedes is not implemented unless named as an interim with a retirement slice and date (TA-SRC-01 is the canonical case).
4. Cite paths and line numbers. "The code seems to" is not a finding.
5. Criteria fidelity: every CQL define carries the verbatim source wording and page; every transcribed exam/site has clinician sign-off before its bundle is published; no LLM-authored terminology codes.
6. The LLM never decides: no prompt may ask for a verdict, priority, or advice. If a slice appears to need it, stop.

## Phases

### Phase 0 — Discovery (DONE, STOP)
`instructions/arch-mig-phase0-findings.md`.

### Phase 1 — Gap analysis (read-only)
Outputs: `instructions/arch-mig-gap-analysis.md`, `instructions/arch-mig-known-issues.md`, `instructions/arch-mig-prompt-decomposition.md`.
- Component map: keep / adapt / replace / retire / new, per module, with effort.
- Criteria content migration: field-by-field D1 JSON → PlanDefinition + Questionnaire + CQL, sized by the CC-DESIGN-01 census.
- Prompt decomposition: every clause of `system-prompt-v2.3.0.txt` classified (a)–(e), with the surviving (a) clauses rewritten as extraction-contract rules.
- Requirements impact: every BRD v3.1.1 requirement — unchanged / reworded / replaced / retired / new, with proposed wording.
- Known-issues disposition: every issue from the sources listed in findings §6 (plus what Gary supplies), with recorded fix, target fix, verification, status.
- Governance mapping: each NAIAEAG point → component → how it becomes demonstrable.
- Results matrix → scenarios: every failed/partial/contested case re-expressed against the template for the pilot subset.
STOP.

### Phase 2 — Migration plan (read-only)
Output: `instructions/arch-mig-plan.md`. Slices, dependencies, "done" per slice, interims with retirement dates, SD/SR entries to be raised. STOP.

### Phase 3 — BRD v3.2 redline
Output: tracked-changes `.docx` from the approved requirements-impact table, plus `documents/BRD-change-log-v3.2.md`. STOP.

### Phase 4 — Implementation (Claude Code; one slice per session; branch per slice; no merge without Gary)
Suggested order (to be confirmed by the Phase 2 plan):
1a. Bundle tooling into the repo (`tooling/criteria-bundle/`: translate, test, check, publish) with CT CAP as the first bundle; bundle registry in KV (`bundle:<exam-site>:<version>`, immutable) and `GET /api/bundle/:examSite/:version`.
1b. Transcribe the pilot subset exam-by-exam (Opus), scenarios first, clinician sign-off per site.
2. Rules-engine route: evaluate a QuestionnaireResponse against a bundle version, return the Advisory, stamp bundle version + engine version; no LLM.
3. Viewer reads PlanDefinition + Questionnaire from the registry for bundled sites; ticks → QuestionnaireResponse; page refs and regional overlay rendering; embedded fallback retired.
4. Extraction service (server-side): new prompt from the extraction contract (Opus for the decomposition), validation gate, server-side PII gate with tests; the browser sends note + context only.
5. Merge + Advisory renderer; rebase `feature/role-aware-view` onto the Advisory.
6. Population stage behind a flag (default off) with the synthetic-FHIR scenarios.
7. Audit record and benchmark harness (indicator-level labelling; model comparison over the extraction contract).
8. Admin: developer-mediated change path (diff review + publish) for the pilot; SD entry recording AD-002 deferral.

## Reporting

Every phase output starts with a one-paragraph summary a programme director can read, then the tables, then open questions. Findings are not softened.

---

## Appendix A — Proposed addition to `CLAUDE.md` (for Gary's approval; not applied)

```
## Target architecture (ARCH-MIG-01)

The tool suite is migrating to the rules-bundle architecture (see
documents/reference/architecture/). Invariants that hold from now on:

1. The LLM never decides. No prompt may ask for a verdict, priority,
   eligibility judgement or advice. Its output is a QuestionnaireResponse.
2. Every LLM-produced answer carries evidence: status (documented|inferred)
   and a verbatim quote. The validation gate rejects the whole response on
   any unquotable value, unknown linkId or type mismatch.
3. Criteria logic lives only in the published bundle, loaded by version at
   runtime. No criteria logic in application code, prompts or constants.
4. Strict documentation standard by default; inferred answers are surfaced,
   not used, unless the parameter says otherwise.
5. Retrieval from referrer systems is designed in and dormant; enabling a
   tier is a governance event (PTA / IPP 3A, terminology validation).
6. Terminology is validated against NZHTS in the build, never authored by a
   model. Placeholders are marked and listed.
7. Regional overlays add delivery information only; the build rejects an
   overlay carrying logic.
8. Bundle version, engine version, model identifier and prompt version are
   stamped on every assessment.

During the migration, a recorded fix that the target supersedes is not
implemented unless the plan names it as an interim with a retirement date.
```
