# Claude Code Brief: ARCH-MIG-01 slice 6 — Criteria Viewer on bundles, and the shared criteria renderer

**Model:** Claude Sonnet · **Branch:** `feature/arch-mig-slice6-viewer` from main · **Scope:** plan slice 6, plus the shared PlanDefinition renderer that the Triage page's reference column must also use (TA-018). The Triage page's current reference column renders the Questionnaire — the internal fact list — and that is wrong; this slice replaces it.

**Gate to start:** PRs #15 (slice 5) and #16 (change log) merged; the browser-findings PR (`chore/arch-mig-browser-findings-1`) merged or at least not touching the Viewer. If the browser-findings PR is still open, coordinate: this slice does not touch `merge.ts`, the vocabulary or CT CAP CQL.

## Read first

1. `CLAUDE.md` invariants 3 and 7; `documents/CHANGE-LOG.md` (add rows for every behaviour change here).
2. `documents/ARCHITECTURE_DECISIONS.md` — **AD-01** (exam/site IDs resolve to bundles; the Viewer heads the page with the chosen exam and shows the PDF section as the source line), **AD-05** and **KI-51** (the hard-coded `checkSafetyText()` list), **AD-12** (state from D1), **AD-18** (LHC-Forms is the preferred Questionnaire renderer — evaluate it for the tick form, but the criteria structure renders from the PlanDefinition, which LHC-Forms does not cover), **AD-21**.
3. `instructions/arch-mig-plan.md` slice 6 — all five bullets are requirements.
4. `instructions/arch-mig-gap-analysis.md` §2 (the field mapping: groups → actions with priority codes; items → nested actions with `selectionBehavior`; badges; guidance; redirects; not-funded; footnotes; HealthPathways; `source-page`); §5 (states — the Viewer shows current published JSON for any site without a `published` bundle).
5. BRD v3.2 change log: CV-012 (guidance + HealthPathways from national page ID + regional domain), CV-014 (compound rendering from `selectionBehavior`), CV-015 (ticks → QuestionnaireResponse; optional check via the engine), CV-017 (output text from action `description`), CV-021 (region from URL param), CV-026 (page references), CV-027 (indicator-based grouping option), TA-018 (Triage renders criteria from the same PlanDefinition as the Viewer), GEN-004.
6. `public/crr-criteria/viewer/index.html` — in particular `INDICATION_THEME_MAP`, `INDICATION_THEME_ORDER`, `getIndicationTheme()` (the indication-first grouping the sponsor asked for — it is keyed by the *old JSON item ids* and will not survive a move to bundles unless the theme moves into the bundle), `checkSafetyText()`, the QA review submission, and `EMBEDDED_DATA`.
7. `instructions/archive/indication-groupings.md` — the grouping principles (no "Other"; groups reflect how a GP frames the presenting problem; acute-assessment rows render as a red banner above the criteria, not as tickable items).
8. `fhir/PlanDefinition-CRR-CT-CAP-Adult.json`, `Questionnaire-CRR-CT-CAP-Adult.json`, `RegionalOverlay-*.json`, `regions.json`; slice 2's `GET /api/criteria/:id` (resolves through `exam_sites`, returns `examSite`, `bundle { key, version, sectionTitle, pages }`, and falls back to current JSON when unpublished); slice 5's `shared/advisory-render.js` and the Triage page's reference column.
9. `documents/reference/viewer-layout-and-styling.md` and `shared/crr-design-system.css` — the current look is the parity target.

## Deliverables, in order

### 1. Indication theme moves into the bundle
Add a PlanDefinition action extension `indication-theme` (code + display) so the Viewer's grouping is carried by the artefact, not by page code keyed to retired ids. Retrofit CT CAP's PlanDefinition from `INDICATION_THEME_MAP` for its items (no logic change — CT CAP minor version bump; if the browser-findings PR has already taken CT CAP to 2.0.0, this becomes 2.1.0). Add the extension to `instructions/arch-mig-transcribe-brief-template.md` so every later site carries themes from transcription, and add a `check` rule: every logic-carrying action in a bundle has an `indication-theme`. `INDICATION_THEME_MAP` stays in the page for non-bundle sites until slice 7 retires them.

### 2. `shared/criteria-render.js` — one renderer for the published criteria structure
Pure client function: PlanDefinition (+ Questionnaire for item text, + overlay for the region) → DOM. Renders: timeframe rows in printed order with priority codes (suppressed in referrer contexts per GEN-004); nested actions with `selectionBehavior` shown as all / one-or-more / any exactly as the current compound rendering does (CV-014); badges from action codes (MANDATORY, GATEWAY, lab value); guidance and HealthPathways link from national page ID + regional domain (CV-012); redirects and not-funded rows as today (not-funded never tickable, GEN-005); footnotes; `source-page` as a page reference (CV-026); acute-assessment rows as the red banner above the criteria, wording from the bundle; indication-first grouping from `indication-theme` (CV-027 — the existing layout as default, vocabulary-group layout behind the UX flag). Every string it displays comes from a bundle artefact; add a test that asserts the rendered text is a subset of the artefact strings.

### 3. Viewer on bundles
For each exam/site id, call `/api/criteria/:id`; when the response carries a `published` bundle, render with `criteria-render.js`, head the page with the chosen exam's title and show the PDF section title and pages as the source line (AD-01 — `xr_elbow` shows the upper-limb section); otherwise render the current JSON with the existing code path unchanged. Remove `EMBEDDED_DATA` (KI-19). Region from URL param (CV-021); overlay applied. Ticks build a QuestionnaireResponse client-side (CV-015), and a "Check against criteria" button — shown only when the bundle is published and `ASSESS_PIPELINE_ENABLED` is on — posts it to `/api/assess/evaluate` via the main worker (no note, no model) and renders the Advisory with `advisory-render.js` in referrer view. QA viewer review submission unchanged and still works.

### 4. Triage reference column and "what to add" (from the browser test)
Replace the Triage page's reference column (currently the Questionnaire bullet list) with `criteria-render.js` on the same bundle artefacts the pipeline returns (TA-018), referrer context (no priority codes). Separate item text from extraction guidance: Questionnaire `item.text` is published wording only; any model-facing hint (e.g. "true = identified; this is a redirect…") moves to an `extraction-hint` extension that `prompt.ts` includes in the model's items and no renderer ever displays; `check` fails if `item.text` contains "true =" or "linkId". "What to add" renders from the PlanDefinition action title where a missing linkId maps to an action, else the cleaned item text, grouped by pathway with the pathway that is fewest facts short listed first. Add change-log rows for each.

### 5. `checkSafetyText()` — not carried forward
Do not port it into any bundle-rendered path. Leave the legacy function in place on the legacy (non-bundle) path only, with a comment citing KI-51 and AD-05. Its removal or replacement by a governed national define is a separate follow-up gated on review-pack decision D1; record that as the open item in the plan's slice 6 status and in the change log. This slice does not ship to users, so the Done line's "resolved per D1" is satisfied by "not carried forward, replacement pending D1" — say so explicitly in the PR.

### 6. Parity evidence
CT CAP rendered from its bundle beside CT CAP rendered from current JSON: screenshots if a headless browser is available (`npx playwright` — do not install a browser if it is not already present; fall back to DOM dumps), plus a text diff of the rendered strings showing only intended differences (page references, source line, badges from codes). All other sites unchanged — assert by rendering three non-CT-CAP sites and diffing against main.

### 7. Registers and docs
AD entry for the `indication-theme` extension and the `extraction-hint` split; plan slice 6 status; change-log rows (Viewer on bundles; source line; check-against-criteria; reference column; what-to-add wording; theme in bundle); `documents/CRR-admin-reference.md` gains a paragraph on bundle states as the Viewer sees them; user-guide notes for slice 11 in the change-log rows' Documents column.

## Done (from the plan, adjusted)
CT CAP renders from its bundle with visual parity to today (evidence in the PR); all other sites unchanged; QA viewer review works; `checkSafetyText()` not carried into the bundle path, replacement pending D1; Triage reference column renders from the PlanDefinition; suites green; `wrangler deploy --dry-run` both workers.

## Do not
- Do not change CT CAP's CQL, the vocabulary entries, or the engine.
- Do not delete legacy Viewer code paths or `INDICATION_THEME_MAP` — slice 7 and 10 retire them site by site.
- Do not port the `indexOf` safety check anywhere.
- Do not flip flags in production config or deploy.
- Same error twice: stop and report.

## Report
The `indication-theme` retrofit table for CT CAP; renderer test evidence; the parity evidence; the Triage reference column before/after; any place the current Viewer's behaviour could not be reproduced from the bundle (that is a transcription-template finding — report it, don't work around it). File this brief per the lifecycle. Stop.
