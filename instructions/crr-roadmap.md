# CRR Decision Support — Roadmap

## Track 1: Pilot Phase (Now)

### Goal
Get the demonstrator into the hands of referrers for feedback. Validate the indication-first UX pattern. Keep the current D1/KV data model — all improvements are presentation-layer only.

### Completed
- [x] Demo harness with HealthLink, BPAC, ERMS mockups
- [x] Standalone / Integration Demo toggle
- [x] Viewer integration mode — single-column, hides selection UI when launched with params
- [x] Copy-and-close behaviour for popup context
- [x] postMessage "Send to Form" with sendButton=on activation
- [x] Triage Advisor copy fix and presentation param
- [x] UI modernisation — DM Sans, clean headers, harness design system
- [x] Site code verification against D1
- [x] Passive mode hides copy/action buttons
- [x] Simplified copy buttons (removed redundant Copy, Copy All, shorthand)

### To Do — Functional

#### P1: Indication-first display transform
**What:** Restructure the viewer's interactive mode so it presents all clinical indications as a flat tickable list (grouped by clinical theme, not urgency). When items are ticked, derive and display the urgency met.

**Approach:** JavaScript transform at display time. No D1 schema changes. The existing timeframe-grouped data is re-presented as indication-first.

**Steps:**
- [ ] Build the transform function: collect all criteria items across all timeframes, tag each with its source priority
- [ ] Present as a single tickable list, optionally grouped by clinical theme
- [ ] On tick: calculate and display the highest urgency met ("This meets P2 — Urgent, within 2 weeks")
- [ ] If no funded criteria met: show alternative management / not-funded guidance
- [ ] Handle compound AND conditions (e.g., CTC bowel prep tolerance) — display as confirmatory checkboxes that gate the urgency result
- [ ] Keep exam-level guidance text at the top, outside the indication list
- [ ] Test with CTC (most complex), CT Head (common), US Carotid (endorsing clinician requirement)

#### P2: Viewer shows HealthPathways link in integration mode
- [ ] Verify the "View HealthPathways ›" link renders correctly when selection UI is hidden
- [ ] Confirm link uses the correct regional domain swap

#### P3: Security review
- [ ] Audit deployed files — remove old versions, docs, instruction files from public path
- [ ] Verify admin API endpoint authentication
- [ ] Confirm no API keys in client-side code
- [ ] Check Admin Tool is not publicly accessible (or is behind Cloudflare Access)

#### P4: Harness refinements based on tester feedback
- [ ] Update harness to point "Popup Viewer" at `/viewer/` (with integration mode params) once item 5 is validated — deprecate `/viewer/popup` path
- [ ] Add ERMS mockup refinements when full screenshot is available
- [ ] Collect and export feedback CSV from testers

### To Do — Content / Stakeholder

- [ ] Prepare 3–5 test scenarios per exam type for referrer testing
- [ ] Brief testers on the demonstrator — what to test, how to give feedback
- [ ] Document the postMessage integration contract as a one-pager for HealthLink/platform conversations
- [ ] Update ENHANCEMENTS.md with current state

---

## Track 2: Post-Pilot — CQL / FHIR Questionnaire Migration

### Goal
Migrate the criteria from a bespoke D1 data model to FHIR Questionnaire resources with CQL decision logic. This makes the criteria machine-readable, platform-agnostic, and consumable by any FHIR-capable system — HealthLink, BPAC, ERMS, PMS vendors, and the NZ Algorithm Hub.

### Why
- FHIR Questionnaire already models what we need: structured questions (indications) where answers drive outcomes (urgency/eligibility)
- CQL is the standard expression language for clinical decision logic — "if X and Y and age >50, then P2"
- Platform-agnostic: any FHIR-capable system can render and evaluate the same Questionnaire without custom integration
- Aligns with NZ Algorithm Hub (Kevin Ross / Orchestral) direction
- Shifts the CRR programme from "tool builder" to "criteria publisher" — stronger long-term position

### Phase 1: Learn and Map (Can start during pilot)

#### 1.1 FHIR Questionnaire familiarisation
- [ ] Review FHIR R4 Questionnaire resource spec (https://hl7.org/fhir/R4/questionnaire.html)
- [ ] Review FHIR Structured Data Capture (SDC) implementation guide — this extends Questionnaire with calculated expressions, pre-population, and extraction
- [ ] Review CQL spec and tooling (https://cql.hl7.org/)
- [ ] Identify NZ-specific FHIR profiles — check NZ FHIR IG (https://fhir.org.nz/) for relevant profiles or extensions
- [ ] Look at existing CDS Hooks / CQL implementations in Australasia — any prior art in radiology referral criteria?

#### 1.2 Map one exam site to FHIR Questionnaire (proof of concept)
- [ ] Choose CT Colonography — most complex, best test of the model
- [ ] Map each element from the PDF to FHIR Questionnaire items:

| PDF Element | FHIR Questionnaire Element |
|---|---|
| Exam/site name | Questionnaire.title, Questionnaire.code |
| Guidance text ("CTC may be appropriate where...") | item with type=display |
| Clinical indication ("Altered bowel habit >6 weeks...") | item with type=boolean |
| Urgency timeframe (P2, P3) | item.code annotation or CQL-calculated output |
| Compound AND condition ("can tolerate bowel prep") | enableWhen on output items, or CQL expression |
| Lab value requirement badge | item.extension (custom or SDC) |
| Gateway badge | item.extension |
| Alternative management | item with type=display, in a separate group |
| Not funded scenarios | item with type=display, in a separate group |
| Definitions/footnotes (NZGG categories) | contained ValueSet or item with type=display |
| HealthPathways link | item.extension with url |

- [ ] Write the Questionnaire resource as JSON — even if not yet machine-evaluated, this validates the mapping
- [ ] Identify gaps: what doesn't map cleanly? What needs extensions?

#### 1.3 Write CQL for the proof-of-concept site
- [ ] Express the priority determination logic in CQL:
  ```cql
  // Pseudocode
  define "Meets P2 Criteria":
    (AlteredBowelHabit and UnexplainedRectalBleeding and AgeOver50)
    or (KnownColorectalCancer)
    or ...
  
  define "Meets P3 Criteria":
    not "Meets P2 Criteria"
    and (AlteredBowelHabit and AgeOver50)
    or ...
  
  define "Qualifying Conditions Met":
    CanTolerateBowelPrep and NoPreviousCTCWithin5Years
  
  define "Funded":
    ("Meets P2 Criteria" or "Meets P3 Criteria")
    and "Qualifying Conditions Met"
  ```
- [ ] Test CQL evaluation using the CQL execution engine (cql-execution npm package or Bonnie)
- [ ] Compare CQL output against manual criteria assessment for 5–10 test cases

#### 1.4 Assess tooling landscape
- [ ] Evaluate CQL authoring tools: CQL IDE (VS Code extension), Atom CQL plugin
- [ ] Evaluate FHIR Questionnaire renderers: LHC-Forms (NLM), SDC reference renderer
- [ ] Evaluate CQL execution engines: cql-execution (JS), cql-evaluator (Java)
- [ ] Can any of these run in a Cloudflare Worker / browser context? (cql-execution is JavaScript — likely yes)
- [ ] Check if the NZ Algorithm Hub has a preferred stack or existing FHIR infrastructure

### Phase 2: Build the Pipeline

#### 2.1 Questionnaire authoring workflow
- [ ] Define the authoring workflow: who creates/updates Questionnaire resources when criteria change?
- [ ] Options:
  - **Manual:** Clinical content team writes Questionnaire JSON (high accuracy, slow)
  - **AI-assisted:** Extend Admin Tool PDF import to output FHIR Questionnaire + CQL (fast, needs validation)
  - **Hybrid:** AI generates draft, clinical team validates and publishes
- [ ] The existing Admin Tool's AI PDF import is a natural starting point for the hybrid approach — extend it to output Questionnaire JSON alongside the current D1 format

#### 2.2 Questionnaire server
- [ ] Stand up a FHIR Questionnaire endpoint — options:
  - Cloudflare Worker serving static Questionnaire JSON from KV (simplest)
  - HAPI FHIR server (full featured, heavier)
  - NZ Algorithm Hub infrastructure (if available)
- [ ] Implement versioning: Questionnaire.version, Questionnaire.date, Questionnaire.status (draft/active/retired)
- [ ] Implement regional variants: Questionnaire.useContext with region coding

#### 2.3 CQL evaluation service
- [ ] Bundle cql-execution into the viewer or a Worker endpoint
- [ ] Accept Questionnaire responses (ticked items) → evaluate CQL → return priority determination
- [ ] This replaces the JavaScript display transform from Track 1

#### 2.4 Viewer migration
- [ ] Replace D1 data fetch with FHIR Questionnaire fetch
- [ ] Replace JavaScript display transform with Questionnaire renderer + CQL evaluation
- [ ] The indication-first UX from Track 1 should remain identical — the migration is backend, not frontend

### Phase 3: Platform Integration

#### 3.1 Publish Questionnaires for consumption
- [ ] Document the FHIR endpoint and Questionnaire format for platform vendors
- [ ] HealthLink SmartForms: could embed a Questionnaire renderer directly, or consume the CQL output to auto-populate the "Does this meet criteria?" field
- [ ] BPAC: similar integration path
- [ ] ERMS: similar integration path
- [ ] PMS vendors: could render Questionnaires natively if FHIR-capable

#### 3.2 CDS Hooks integration (future)
- [ ] Explore CDS Hooks as the trigger mechanism — when a referrer starts a radiology referral, the PMS calls a CDS Hook that returns the relevant Questionnaire
- [ ] This is the "fully integrated" end state: no popup, no separate tool — the criteria appear inline in the PMS referral workflow

#### 3.3 NZ Algorithm Hub alignment
- [ ] Connect with Kevin Ross / Orchestral on Algorithm Hub delivery pathway
- [ ] Determine if CRR Questionnaires could be hosted on the Algorithm Hub
- [ ] Align on standards, profiles, and infrastructure

### Key Decisions (to make before Phase 2)

| Decision | Options | Considerations |
|---|---|---|
| Questionnaire authoring | Manual / AI-assisted / Hybrid | Speed vs accuracy. Hybrid likely best — AI draft, clinical validation |
| CQL execution location | Browser / Worker / External | Browser (cql-execution JS) is simplest. Worker is more secure. External adds latency |
| FHIR server | Static KV / HAPI / Algorithm Hub | KV is simplest for pilot. Algorithm Hub is strategic but dependency |
| Regional variants | Separate Questionnaires / useContext | useContext is cleaner but needs renderer support |
| Versioning | Questionnaire.version / Git / Both | Both — Git for history, Questionnaire.version for consumers |

### Dependencies and Risks

| Risk | Mitigation |
|---|---|
| CQL complexity for non-developers | AI-assisted authoring, clinical validation workflow |
| No NZ FHIR profile for radiology criteria | Start with base R4, propose NZ extension if needed |
| Algorithm Hub timeline uncertain | Build standalone first, align later |
| FHIR Questionnaire renderer limitations | LHC-Forms is mature, but may need custom rendering for priority badges etc. |
| CQL evaluation performance in browser | cql-execution is lightweight, test with largest criteria set |
| Criteria updates during migration | Maintain D1 as source during transition, dual-publish |

### Resources

- FHIR R4 Questionnaire: https://hl7.org/fhir/R4/questionnaire.html
- FHIR SDC IG: https://build.fhir.org/ig/HL7/sdc/
- CQL specification: https://cql.hl7.org/
- CQL execution engine (JS): https://github.com/cqframework/cql-execution
- LHC-Forms renderer: https://lhcforms.nlm.nih.gov/
- NZ FHIR IG: https://fhir.org.nz/
- CDS Hooks: https://cds-hooks.hl7.org/
