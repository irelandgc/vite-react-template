# CRR Tool Suite — Documentation plan (ARCH-MIG-01 and after)

**Purpose:** one place that says which documents exist, what each is generated from, and when each is updated — so that nothing built during the migration is lost when the document set is brought up to date. Companion to `ARCHITECTURE_DECISIONS.md`, `SECURITY_DECISIONS.md`, `instructions/arch-mig-known-issues.md` and `CHANGE-LOG.md`.

**Principle:** registers are kept live at the moment of change (Claude Code does this as part of every slice); documents are generated from the registers at defined points, not maintained by hand in parallel. A document that is maintained separately from its source drifts within weeks — the September 2026 documentation audit found exactly that pattern in the pre-migration set.

## The registers (live, in the repo)

| Register | Records | Maintained |
|---|---|---|
| `documents/CHANGE-LOG.md` | **What changed, for whom** — every behaviour or requirement change, in plain language, tagged with the documents it lands in | Every slice that changes behaviour adds rows; the AD entry points to them |
| `documents/ARCHITECTURE_DECISIONS.md` (AD) | **Why** — design decisions, status, enforcement | Every design call |
| `documents/SECURITY_DECISIONS.md` (SD/SR) | Security decisions and open risks | Every security-relevant call |
| `instructions/arch-mig-known-issues.md` (KI) | Defects, gaps, dispositions | As found |
| `instructions/arch-mig-plan.md` | Slice status, cut-over checklist | Every slice |
| `documents/CRR_Release_Log.md` | **When it shipped** — deployments to users | At deploy (slice 10 onward) |
| `tooling/criteria-bundle/benchmark/FINDINGS.md` + `results/` | Extraction quality evidence | Every benchmark run |

The change log and the release log are different things: the change log records that a behaviour changed and where it must be documented; the release log records the date it reached users.

## The document set (generated at defined points)

| Artefact | Source of truth it is written from | Format | Update points |
|---|---|---|---|
| **Business Requirements (BRD)** | Change log rows tagged BRD; AD entries | `.docx` tracked-change redline, one version per update; `BRD-change-log-vX.md` companion | v3.2 done (5 Sep 2026). **v3.3 after slice 5** (attestation is the largest requirement change). v3.4 at cut-over (slice 10). Then per release |
| **Solution Design (SDD)** | `documents/reference/architecture/` page, `CLAUDE.md` invariants, AD register, route contracts, bundle format, data model (`schema.sql`), `CRR-integration-guide.md` | Markdown in repo (`documents/SOLUTION-DESIGN.md`), exported to `.docx` for governance | First cut at slice 11; regenerated per major release. Not hand-maintained as Word |
| **Operations runbook** | Slice 10 cut-over checklist (secrets, migrations, national bundle publish, flags, prompt activation), retention/purge config, bundle-state monitoring, publish procedure, rollback (flag flip) | Markdown in repo (`documents/OPERATIONS.md`) | Formalised at slice 10 from the checklist; per release |
| **User guides** — referrer, triager, admin | Change log rows tagged User; the rendered Advisory views; Admin Tool tabs | Markdown → `.docx`/PDF per audience | After slices 5 and 6 (UI is final); slice 11 |
| **Clinical governance pack** | Review packs and rulings (D1–D6, Qn), `signoff.md` per bundle, AD-05/AD-17 decisions, benchmark results with clinician-set ground truth, NAIAEAG correspondence | Bound set for NAIAEAG / clinical governance | Assembled at each NAIAEAG return; first after slice 1 sign-off and the slice 9 benchmark |
| **Integration guide** | Route contracts (`/api/assess`, `/api/criteria/:id`, exam/site mapping), calling-application context, CDS Hooks pattern (future) | Existing `CRR-integration-guide.md` | Slice 5 (pipeline mode section — done in the slice), slice 10 (old contract retired) |
| **Security decisions** | SD/SR register | Existing | Continuous |
| **Test and verification evidence** | Workers/tooling suites, benchmark results, verification reports | Existing pattern (`verification-report-*.md`) | Per release |

## Pre-migration documents

Documents describing the pre-migration system (`CRR_Architecture_Briefing.md`, `CRR-admin-reference.md`, `crr-business-rules.md`, `Triage_Clinical_Review_Brief.md`, PII spec v0.2) stay in place until slice 10 cut-over, because they describe what is in production. At slice 11 each is either regenerated from the sources above or moved to `documents/archive/` with a `[SUPERSEDED — date]` tag and a pointer to its replacement — the same convention `CLAUDE.md` defines for `instructions/`. `CRR_Architecture_Briefing.md` gets a status banner now, because it is loaded into every Claude Code session.

## Change log format (`documents/CHANGE-LOG.md`)

Append-only. One row per behaviour or requirement change. A code change that changes nothing a user, operator, or requirement can see does not get a row.

| Field | Content |
|---|---|
| `CL-nn` | Sequential id |
| Date / slice / PR | Where it came from |
| Change | One or two plain-language sentences: what now happens that did not before, or no longer happens |
| For whom | Referrer · Triager · Admin · Operator · Programme · Clinical governance |
| Documents | Which artefacts must reflect it: `BRD:<req id or NEW>` · `SDD` · `OPS` · `USER:<audience>` · `CLIN` · `INTEG` — or `none` |
| Decision | AD / SD / KI ids behind it |
| Status | `built` → `documented` (each tagged artefact updated) → `released` (release-log entry) |

A row is `documented` only when every artefact it names has been updated; the slice 11 brief is "every row not yet `documented`".
