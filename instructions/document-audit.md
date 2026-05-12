# CRR Documentation Gap Analysis
**Produced:** 2026-05-12  
**Scope:** `crr-business-rules.md` (v1.1) and `CRR_Architecture_Briefing.md` (v0.1) versus actual source files (viewer v5.3.0, triage v2.1.1, admin v1.5.8, crr-demo.html, crr-design-system.css)

---

## 1. What's documented but no longer accurate

### Tool names

- **CRR_Architecture_Briefing.md §5.1** names the first tool "CRR Criteria Explorer". The source HTML titles it "CRR Criteria Viewer" (`<title>CRR Criteria Viewer v5.3.0</title>`, footer `CRR Criteria Viewer v5.3.0`). Every reference to "Criteria Explorer" in the briefing (§3 diagram, §4.2 heading, §5.1, §9.3) uses the wrong name.

- **CRR_Architecture_Briefing.md §3 architecture diagram** labels both standalone tools inside the diagram box as "CRR CRITERIA EXPLORER" and "CRR TRIAGE ADVISOR". The demo harness (`crr-demo.html` line 270) refers to them as "Criteria Viewer" and "Triage Advisor", matching the actual HTML titles.

### Mode parameter values

- **CRR_Architecture_Briefing.md §4.2 diagram** shows `?mode=assess` (referrer view) and `?mode=reference` (triager view). The actual viewer (`viewer/index.html`) only accepts `?mode=passive` and `?mode=interactive`. There is no `?mode=assess` or `?mode=reference` parameter in the source code. These two mode values are entirely invented or obsolete.

- **crr-business-rules.md §6.1 and §6.2** correctly describe `?mode=passive` and `?mode=interactive`. The Architecture Briefing is inconsistent with both the business rules and the source.

### Dual-mode triager/referrer view claim

- **CRR_Architecture_Briefing.md §5.1** lists "Dual mode: assessment view (referrers) and reference view (triagers)" as a Criteria Explorer/Viewer feature. This is not implemented. The viewer has passive (read-only) and interactive (checkbox) modes — there is no distinct triager reference view with denser layout or quick-nav (as described in §4.2's diagram). The source has no code path keying off a "triager" role or separate triager rendering.

### HealthPathways regional count

- **CRR_Architecture_Briefing.md §5.1** states "HealthPathways links with regional localisation (10 NZ regions)". The viewer source (`viewer/index.html` lines 316–325) defines only 8 regions: `aucklandregion`, `northland`, `midland`, `hawkesbay`, `3d`, `canterbury`, `southern`, and `ccp` (Whanganui & MidCentral CHP). There is no configuration for 10 regions anywhere in the source.

- **CRR_Architecture_Briefing.md §5.3** repeats the "10 NZ regions" claim for the Admin tool. The admin source (`admin/index.html` lines 54–63) defines the same 8 regions.

- **crr-business-rules.md §7.4** states "The seven confirmed regional instances are: `aucklandregion`, `northland`, `midland`, `hawkesbay`, `3d` (Central), `canterbury` (Waitaha), `southern`." This is also outdated — the `ccp` (Whanganui & MidCentral CHP) region was added in admin v1.5.4, giving 8 regions. The business rules document still says seven.

### Canterbury region label

- **crr-business-rules.md §7.4** refers to the Canterbury region as "Waitaha". The admin source uses `"Waitaha Canterbury"` as the label, and the viewer source uses `"Waitaha Canterbury"` as well. This is a minor inconsistency — the business rules drops the "Canterbury" qualifier.

### Server-side PII gate status

- **CRR_Architecture_Briefing.md §9.6** says "Plan server-side PII gate implementation — the client-side pipeline is built and tested; the server-side gate in the Cloudflare Worker is the remaining implementation item." The same document's §4.3 PII pipeline diagram shows a "Cloudflare Worker PII gate (belt & braces — rejects if PII detected)" as if it exists, and §8 Risk Register lists "Server-side PII gate (Layer 3)" as a current mitigation. The document contradicts itself: §9.6 correctly admits it is not yet built, but the diagram and risk register imply it is live.

### `POST /api/seed` endpoint

- **CRR_Architecture_Briefing.md §5.4** lists `POST /api/seed` as an admin content management endpoint. There is no reference to `/api/seed` anywhere in the admin, viewer, or triage source files. The actual admin write endpoint used is `POST /api/admin/publish` (`admin/index.html` line 265). `/api/seed` appears to be either renamed or never implemented.

### Triage Advisor intended users

- **CRR_Architecture_Briefing.md §5.2** states the Triage Advisor's users are "Referrers (pre-submission check: 'will this referral be accepted?')". The briefing §1 and §2 also positions PCRLs as triage users for the Criteria Explorer/Viewer, not the Triage Advisor. The privacy banner in `triage/index.html` (line 269) says "For clinical use, refer to your local PMS and HealthPathways" and the tool's UI does not describe or target PCRLs. The briefing's user allocation is plausible but the current tool positioning (especially the privacy warning) implies it is still prototype-only for any user type.

---

## 2. What's implemented but not documented

### Admin tool — actual tab set

**CRR_Architecture_Briefing.md §5.3** lists five Admin tool features (criteria editor, PDF import, region management, version control, audit log). The actual admin (`admin/index.html` lines 286–295) has **eight** tabs:

| Tab ID | Label | Documented? |
|---|---|---|
| `editor` | Criteria Editor | Yes (partially) |
| `import` | PDF Import | Yes |
| `regions` | Regions | Yes |
| `versions` | Versions | Yes |
| `qa` | Triage QA | No |
| `viewerqa` | Viewer QA | No |
| `usagelog` | Usage Log | No |
| `audit` | Audit Log | Yes |

The **Triage QA**, **Viewer QA**, and **Usage Log** tabs are not mentioned anywhere in either document. These read data from `/api/qa-reviews`, `/api/qa-viewer-reviews`, and `/api/triage/usage-logs` respectively.

### Admin API endpoints not in Architecture Briefing

**CRR_Architecture_Briefing.md §5.4** lists only three endpoints. The actual API calls in the source reveal more:

| Endpoint | Used in | Documented? |
|---|---|---|
| `GET /api/criteria` | viewer, admin | Yes (as `GET /api/criteria`) |
| `GET /api/version` | admin | No |
| `GET /api/regions` | viewer | No |
| `POST /api/admin/publish` | admin | No (briefing lists `/api/seed` instead) |
| `GET /api/admin/versions` | admin | No |
| `POST /api/admin/versions/{id}/rollback` | admin | No |
| `GET /api/admin/regions` | admin | No |
| `PUT /api/admin/regions/{region}` | admin | No |
| `POST /api/admin/extract-pdf` | admin | No |
| `GET /api/admin/audit` | admin | No |
| `GET /api/qa-reviews` | admin | No |
| `GET /api/qa-viewer-reviews` | admin | No |
| `GET /api/triage/usage-logs` | admin | No |
| `POST /api/triage/assess` | triage | No (briefing lists `/api/assess`) |
| `POST /api/triage/usage-log` | triage | No |
| `POST /api/qa-review` | triage | No |
| `POST /api/qa-viewer-review` | viewer | No |
| `GET /api/match-data` | triage | No |

### Paediatric criteria dataset

Neither document mentions that the system handles a separate paediatric criteria dataset (`paedExams`). The embedded data in `viewer/index.html` (line 307: `var PAED_EXAMS = []`) and the admin source (lines 191–196, 250–256) show a complete paediatric exam/site structure parallel to the adult one. The triage provenance modal (`triage/index.html` lines 396–399) states "Paediatric: 89 items, 14 exam/site combinations." Neither `crr-business-rules.md` nor `CRR_Architecture_Briefing.md` mentions paediatric criteria at all.

### Triage tool — AI is now the primary (and only) assessment path

**CRR_Architecture_Briefing.md §5.2** describes the triage flow as "Rule-based criteria matching (instant, no cost, no API)" with "AI assessment via Claude Sonnet (deeper analysis, 'Check with AI' option)". The source (`triage/index.html` line 336 comment: "COL 2: AI ASSESSMENT (now primary)") shows AI is the primary path. The "Check Referral" button (`runCheck()`) calls `runAI()` directly. The rule-based match engine still runs client-side for the middle column display, but the AI assessment fires automatically on every check — there is no separate "Check with AI" button to escalate. The two-step model described in the briefing does not match the current UX.

### Triage tool — three-column layout with criteria browser

**CRR_Architecture_Briefing.md §5.2** does not mention that the Triage Advisor has a built-in criteria browser in a third column. The layout (`triage/index.html` line 24: `grid-template-columns:340px 1fr 1fr`) shows: Col 1 = note input, Col 2 = AI assessment, Col 3 = criteria reference. The criteria panel auto-populates with the identified exam's criteria after each assessment.

### Triage tool — usage cost tracking

The Triage Advisor header includes a live NZ$ cost tracker (`<span id="statsBadge">NZ$0.00</span>`, line 247) and a Stats modal that shows per-session API spending. Not mentioned in either document.

### Triage tool — model comparison mode

**CRR_Architecture_Briefing.md §5.2** lists "Model comparison capability for clinical validation" as a feature — but the specific models compared are not stated. The source (`triage/index.html` line 243) shows the Compare button is titled "Compare Sonnet 4 vs Opus 4.6 side by side". Sonnet 4 and Opus 4.6 are the two models. The compare feature has a full log modal with Markdown export capability (`exportCompLog()`), none of which is described.

### Viewer — modal embed mode

The viewer supports a third launch mode beyond popup and new tab: **modal embed** (`?embed=modal`), where it sends `window.parent.postMessage({ type: 'crr-close' }, '*')` to close itself inside an iframe. This is demonstrated in `crr-demo.html` (line 633–636). The business rules §6 only describes passive mode, interactive mode, and integration mode — modal embed is not mentioned.

### Viewer — global search bar

`viewer/index.html` includes a full-text global search bar (lines 270–278: `<input id="globalSearch" placeholder="Search criteria — type 3+ characters">`) that searches across all criteria items with a live dropdown. Not mentioned in either document.

### Viewer — QA feedback modal

The viewer has a structured QA/feedback form (`ceQaModal`) that collects reviewer name, role (GP/NP/PCRL/MIT/Radiologist), usability score, value-in-practice score, and comments. Results are posted to `/api/qa-viewer-review`. Not mentioned in either document.

### Demo harness (`crr-demo.html`)

`crr-demo.html` is not mentioned in either document at all. It is a full integration demonstrator with:
- Two modes: "Explore Tools" and "Integration Demo"
- Mock-ups of HealthLink SmartForms, BPAC bestpractice, and ERMS referral forms
- postMessage listener that receives `crr-output` from the viewer/triage tools and inserts text into the mock form's clinical notes field
- URL debug bar, feedback collection with CSV export, and scenario test cards for the Triage Advisor

### Viewer — left-column selection summary and notes field

The viewer has a left-column summary panel (`#leftColSummary`) that shows selected criteria count, urgency determination, and action buttons. It also includes a free-text notes field for the referrer. Neither the business rules nor the architecture briefing describe the left-column layout or the notes field.

---

## 3. Version numbers and feature descriptions that have drifted

### Criteria Explorer / Criteria Viewer version

- **CRR_Architecture_Briefing.md §5.1** states version `v4.0.0`. The actual source title and footer both read `v5.3.0` (`viewer/index.html` lines 6, 290, 303). The tool is a full major version ahead of what the briefing documents.

### Admin tool version

- **CRR_Architecture_Briefing.md §5.3** states Admin version `v1.1.0`. The actual source reads `v1.5.8` (`admin/index.html` line 27). Seven patch/minor versions ahead.

### AI model identifier

- **CRR_Architecture_Briefing.md §5.4** (and the architecture diagram in §3) refers to the AI model as "Claude Sonnet" without a version qualifier. The Triage Advisor provenance modal (`triage/index.html` line 419) specifies **"Claude Sonnet 4 (claude-sonnet-4-20250514, Anthropic)"**. The compare mode button (line 243) compares **"Sonnet 4 vs Opus 4.6"**. The briefing's generic "Claude Sonnet" label is too vague to be accurate for the current deployment.

### Criteria data version shown in embedded data

- The viewer's embedded fallback data (`viewer/index.html` line 312) has `"label":"v3.4.4 — 2026-03-20"`. The footer shows `content v4.0.1`. The triage provenance modal says "Criteria data: Aug 2025 reissue 3, Adult/Paediatric updated: March 2026". No document mentions content versioning at all. The Architecture Briefing says data is "stored in D1 database with KV cache" but doesn't describe the content versioning scheme.

### API endpoint name for assess

- **CRR_Architecture_Briefing.md §5.4** documents the assessment endpoint as `POST /api/assess`. The actual triage source uses `POST /api/triage/assess` (`triage/index.html` line 1676). The endpoint path has a `/triage/` namespace prefix.

### Triage Advisor described as having "Check with AI" as optional escalation

- **CRR_Architecture_Briefing.md §5.2** describes the AI assessment as an opt-in escalation ("Check with AI" option). The triage source (`triage/index.html` comment at line 336: "COL 2: AI ASSESSMENT (now primary)") shows this description is obsolete — AI fires on every "Check Referral" click. The rule-based engine still runs for the criteria match display panel, but the tool's primary output is AI-driven. The briefing's characterisation of rule-based as primary and AI as secondary is reversed in the current implementation.

### Triage Advisor build date vs. Architecture Briefing date

- **CRR_Architecture_Briefing.md** is dated "April 2026". The Triage Advisor build date is `"2026-04-03"` (`triage/index.html` line 586). The Viewer build is newer (v5.3.0 shipped post-briefing). The Admin build is `2026-04-07c`. The briefing was written around the same time as these builds but reflects an earlier design intent rather than the as-built state.
