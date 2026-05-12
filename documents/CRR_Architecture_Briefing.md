# CRR Decision Support Tools — Architecture Briefing
## Decoupled Design, Privacy by Design, and Integration Pathway

**Version:** 0.2 · May 2026
**Author:** CRR Programme — Digital & Integration
**Audience:** CRR Steering Group, HNZ Digital, Cybersecurity Review

---

## 1. Executive Summary

The CRR programme has developed two standalone clinical decision support tools to help primary care clinicians make better-informed radiology referral decisions and to support CRR Hub triagers in applying the National Radiology Access Criteria consistently.

The tools are deliberately designed as **decoupled, standalone web applications** — not embedded in or dependent on any referral platform (BPAC, HealthLink, ERMS) or clinical system (PMS, RIS). This architectural decision is intentional and strategic, driven by four factors:

1. **The referral platform landscape is fragmented** — five different configurations across six regions, none in scope for redesign
2. **The tools must serve two distinct user types** with different workflows — referrers (GPs/NPs) and triagers (PCRLs)
3. **Privacy by design** — a multi-layer PII prevention system ensures patient-identifiable information never reaches external APIs, simplifying the security classification
4. **Future-proof integration pathway** — the same tools and content APIs that power standalone use today can be consumed by referral platforms and PMS systems tomorrow

---

## 2. The Problem Being Solved

### For Referrers (GPs and Nurse Practitioners)
Referrers don't know the National Radiology Access Criteria. They submit referrals that get declined or queried, creating a back-and-forth cycle that wastes time for everyone and delays patient care. The referral platforms (BPAC, HealthLink, ERMS) don't consistently surface the criteria at the point of referral.

### For Triagers (PCRLs in CRR Hubs)
PCRLs apply criteria manually while reviewing referrals in their RIS worklist. They need instant access to the relevant criteria, and they need consistency between what the referrer was told and what they are applying.

### The Programme Design Tension
The CRR programme deliberately removed tick-box criteria logic from new referral forms in favour of HealthPathways links and safety questions. GP stakeholders have pushed back, wanting structured criteria guidance. The standalone tools resolve this tension — they provide structured criteria guidance without re-embedding tick-box logic in the forms themselves.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLINICIAN'S ENVIRONMENT                         │
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Medtech    │    │  MyPractice  │    │   Indici     │   PMS        │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
│         │                   │                   │                       │
│         └───────────┬───────┴───────────────────┘                       │
│                     ▼                                                    │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    REFERRAL PLATFORMS                             │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────┐                   │   │
│  │  │   BPAC   │  │  HealthLink  │  │   ERMS   │                   │   │
│  │  │ (TMT,    │  │  SmartForms  │  │ (Southern,│                   │   │
│  │  │ Central) │  │  (Auckland,  │  │ Central   │                   │   │
│  │  │          │  │  Northland)  │  │ sub-rg)   │                   │   │
│  │  └────┬─────┘  └──────┬──────┘  └─────┬────┘                   │   │
│  │       │               │               │                          │   │
│  │       │    ┌──────────┴──────────┐    │                          │   │
│  │       │    │  "Check criteria ›" │    │   Links to standalone    │   │
│  │       │    │  "Check referral ›" │    │   tools (URL params)     │   │
│  │       │    └──────────┬──────────┘    │                          │   │
│  │       │               │               │                          │   │
│  └───────┼───────────────┼───────────────┼──────────────────────────┘   │
│          │               │               │                              │
│          ▼               ▼               ▼                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              STANDALONE CRR DECISION SUPPORT TOOLS                │   │
│  │                    (opens in new tab/window)                      │   │
│  │                                                                   │   │
│  │  ┌─────────────────────┐    ┌─────────────────────┐              │   │
│  │  │  CRR CRITERIA       │    │  CRR TRIAGE          │              │   │
│  │  │  VIEWER             │    │  ADVISOR              │              │   │
│  │  │                     │    │                       │              │   │
│  │  │  • Browse criteria  │    │  • Paste clinical note│              │   │
│  │  │  • Self-assess      │    │  • PII auto-redaction │              │   │
│  │  │  • Copy structured  │    │  • AI assessment      │              │   │
│  │  │    text to form     │    │    (primary path)     │              │   │
│  │  │  • HealthPathways   │    │  • "What to add"      │              │   │
│  │  │    links (8 rgns)   │    │    guidance            │              │   │
│  │  │                     │    │                       │              │   │
│  │  │  URL: ?exam=ct_head │    │  No PII leaves       │              │   │
│  │  │  &region=canterbury │    │  the browser          │              │   │
│  │  └─────────────────────┘    └───────────┬──────────┘              │   │
│  │            │                             │                        │   │
│  └────────────┼─────────────────────────────┼────────────────────────┘   │
│               │                             │                            │
└───────────────┼─────────────────────────────┼────────────────────────────┘
                │                             │
                ▼                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE PLATFORM                                │
│                                                                           │
│  ┌─────────────────────────────────┐  ┌────────────────────────────────┐ │
│  │  Cloudflare Workers (Static)    │  │  Cloudflare Workers (Hono)     │ │
│  │  Static asset hosting           │  │  API proxy + auth              │ │
│  │  • Criteria Viewer HTML/JS      │  │  • x-admin-key auth            │ │
│  │  • Triage Advisor HTML/JS       │  │  • Anthropic API key secured   │ │
│  │  • Admin tool                   │  │    server-side only            │ │
│  │  • Demo harness                 │  │  • Usage + QA logging to D1    │ │
│  └─────────────────────────────────┘  └──────────────┬─────────────────┘ │
│                                                        │                   │
│  ┌─────────────────────────────────┐                  │                   │
│  │  D1 Database + KV Cache         │                  │                   │
│  │  • Criteria content             │                  │                   │
│  │  • Region localisation          │                  │                   │
│  │  • HealthPathways links         │                  │                   │
│  │  • Version control              │                  │                   │
│  │  • Audit log                    │                  │                   │
│  │  • Triage QA + usage logs       │                  │                   │
│  └─────────────────────────────────┘                  │                   │
│                                                        │                   │
│  ┌─────────────────────────────────┐                  │                   │
│  │  Cloudflare Access              │                  │                   │
│  │  Zero-trust access control      │                  │                   │
│  │  • HNZ SSO / email restriction  │                  │                   │
│  │  • MFA enforcement              │                  │                   │
│  └─────────────────────────────────┘                  │                   │
└────────────────────────────────────────────────────────┼───────────────────┘
                                                         │
                                                         ▼
                                            ┌────────────────────────┐
                                            │  Anthropic API         │
                                            │  Claude Sonnet 4       │
                                            │  (claude-sonnet-4-     │
                                            │   20250514)            │
                                            │  • De-identified text  │
                                            │    only                │
                                            │  • Zero data retention │
                                            │  • No PII at this layer│
                                            └────────────────────────┘
```

---

## 4. Why Decoupled?

### 4.1 The Referral Platform Landscape Is Fragmented

| Region | Platform | CDS Status | Redesign in Scope? |
|--------|----------|------------|-------------------|
| Te Manawa Taki | BPAC | Partial embedded criteria | No |
| Central (C&C, Hutt) | BPAC | Minimal — HealthPathways links | No |
| Central (Whanganui, Wairarapa) | ERMS | Passive guidance panels | No |
| Auckland Metro | HealthLink SmartForms | HealthPathways links | No |
| Northland | HealthLink SmartForms | HealthPathways links | No |
| Te Waipounamu | ERMS | Passive guidance panels | No |

Embedding decision support in each platform would require six separate integrations with six different codebases, maintained by multiple vendors (BPAC, HealthLink, ERMS), across regions with different governance structures. This is neither feasible nor funded under the current programme scope.

A standalone tool linked from each platform achieves the same clinical outcome — criteria guidance at the point of referral — with a single codebase, single content source, and zero platform modification.

### 4.2 Two Users, One Source of Truth

The Criteria Viewer serves both user types from the same content via two launch modes:

```
┌─────────────────────────────────┐
│     NATIONAL ACCESS CRITERIA     │
│     (Single source in D1/KV)     │
└───────────────┬─────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
┌───────────────┐ ┌───────────────┐
│   PASSIVE     │ │  INTERACTIVE  │
│   MODE        │ │  MODE         │
│               │ │               │
│ • Read-only   │ │ • Checkboxes  │
│ • Reference   │ │ • Copy text   │
│ • Action      │ │ • Send to     │
│   buttons     │ │   form        │
│   hidden      │ │ • Clear all   │
│               │ │               │
│ ?mode=passive │ │ ?mode=        │
│ &region=tmk   │ │  interactive  │
└───────────────┘ └───────────────┘
```

If the referrer checks their referral against the criteria in the Viewer, and the triager reviews the same criteria in the same tool, there is guaranteed consistency. A decline is never arbitrary — the triager is applying exactly the criteria the referrer was shown.

### 4.3 Privacy by Design — PII Never Leaves the Browser

The Triage Advisor's four-stage PII pipeline ensures patient-identifiable information is detected and auto-redacted before any data leaves the clinician's browser:

```
┌──────────────────────────────────────────────────────────┐
│                    CLINICIAN'S BROWSER                     │
│                                                           │
│  Clinical Note (may contain PII)                          │
│  "ZZZ0094 Mr Kerry Smith, 74M, sore knee.                │
│   Lives in 23 Some Street, Hamilton."                     │
│         │                                                 │
│         ▼                                                 │
│  ┌──────────────────────────────────────────────────┐    │
│  │ STAGE 1: PRE-CORRECTION                          │    │
│  │ Fix PII-relevant typos (Stree→Street, etc.)      │    │
│  └──────────────────────┬───────────────────────────┘    │
│         │                                                 │
│         ▼                                                 │
│  ┌──────────────────────────────────────────────────┐    │
│  │ STAGE 2: DETECT + AUTO-REDACT                     │    │
│  │ NHI → [NHI REDACTED]                              │    │
│  │ Mr Kerry Smith → [NAME REDACTED]                   │    │
│  │ 23 Some Street, Hamilton → [ADDRESS REDACTED]      │    │
│  └──────────────────────┬───────────────────────────┘    │
│         │                                                 │
│         ▼                                                 │
│  ┌──────────────────────────────────────────────────┐    │
│  │ STAGE 3: USER REVIEWS                             │    │
│  │ "[NHI REDACTED] [NAME REDACTED] 74M, sore knee.  │    │
│  │  Lives in [ADDRESS REDACTED]."                    │    │
│  │                                                    │    │
│  │  [Use redacted text ✓]  [Edit]  [Cancel]          │    │
│  └──────────────────────┬───────────────────────────┘    │
│         │                                                 │
│         ▼                                                 │
│  ┌──────────────────────────────────────────────────┐    │
│  │ STAGE 4: SUBMIT (redacted text only)              │    │
│  │ Original text NEVER transmitted                   │    │
│  └──────────────────────┬───────────────────────────┘    │
│                          │                                │
└──────────────────────────┼────────────────────────────────┘
                           │ Only de-identified text
                           ▼
                ┌──────────────────────┐
                │ Cloudflare Worker    │
                │ API proxy            │
                │ (Anthropic key held  │
                │  server-side only)   │
                └──────────┬───────────┘
                           │ De-identified clinical scenario
                           ▼
                ┌──────────────────────┐
                │ Anthropic API        │
                │ "74M, sore knee.     │
                │  Lives in [ADDRESS   │
                │  REDACTED]."         │
                └──────────────────────┘
```

**Note on server-side PII gate:** The client-side four-stage pipeline is the primary PII control. A server-side PII gate in the Cloudflare Worker (which would reject requests where PII is detected after transmission) is a planned enhancement but is not yet implemented. See §9.

**Security classification impact:** Because PII is removed before transmission, the data reaching the Anthropic API is a de-identified clinical scenario — functionally equivalent to a clinician typing a clinical question into HealthPathways search, UpToDate, or Google. The tool has materially stronger PII controls than any of these commonly-used clinical reference tools, yet requires no special security treatment beyond standard web application controls.

### 4.4 The Integration Pathway Is Preserved

The decoupled architecture is not a dead end — it is the first phase of a progressive integration pathway:

```
PHASE 1 (Current)              PHASE 2                    PHASE 3
Standalone + Links             Deep Linking                PMS Integration
                               
┌──────────┐                   ┌──────────┐               ┌──────────┐
│ BPAC     │                   │ BPAC     │               │ PMS      │
│ form     │                   │ form     │               │          │
│          │                   │          │               │ Criteria │
│ [Link] ──┼──► CRR Tool      │ [Link] ──┼──► CRR Tool   │ panel    │
│          │   (new tab)       │  auto-   │   (pre-nav'd  │ rendered │
│          │                   │  builds  │    to exam)    │ inline   │
└──────────┘                   │  URL     │               │ from API │
                               └──────────┘               └────┬─────┘
• Simple href link             • Form passes modality,         │
• Manual copy-paste back         body region, age via URL     │
• Works today with zero        • Tool opens pre-navigated     ▼
  platform changes             • Structured text copies     ┌──────────┐
                                 back to form               │Cloudflare│
                                                            │Criteria  │
                               PHASE 4                      │API       │
                               In-Form Embedded             └──────────┘
                               
                               ┌──────────┐
                               │ BPAC /   │
                               │ HL /     │               Single source
                               │ ERMS     │               of criteria
                               │          │               truth powers
                               │ Criteria │               all surfaces
                               │ guidance │
                               │ rendered │
                               │ INLINE   │
                               │ from API │
                               └──────────┘
```

The Cloudflare Workers API and D1/KV database that power the standalone tools today become the criteria content service that multiple platforms consume. No rearchitecting required — only new consumers of the existing API.

---

## 5. Component Summary

### 5.1 CRR Criteria Viewer (v5.3.0)

**Purpose:** Browse and self-assess against National Radiology Access Criteria.

**Users:** Referrers (self-assessment before submission) and triagers (criteria reference during triage).

**Key features:**
- Modality → body region → criteria navigation
- Global full-text search across all criteria items (live dropdown, 3+ character trigger)
- Checkbox-based self-assessment with structured text generation
- Left-column summary panel: selected criteria count, urgency determination, notes field, action buttons
- HealthPathways links with regional localisation (8 NZ regions)
- Localised information panels per modality and exam type
- URL parameter launch for context-aware linking from forms (`?exam=`, `?region=`, `?mode=`)
- Two launch modes: `?mode=passive` (read-only reference) and `?mode=interactive` (full interaction)
- Modal embed mode (`?embed=modal`) for iframe integration with `postMessage` close/output
- `postMessage` output (`crr-output`) delivers structured criteria text back to the calling form
- QA/feedback modal collecting reviewer role, usability, and value-in-practice scores (posts to `/api/qa-viewer-review`)
- Embedded fallback criteria data for offline resilience

**Data:** National Access Criteria stored in D1 database with KV cache. No patient data.

### 5.2 CRR Triage Advisor (v2.1.1)

**Purpose:** AI-assisted assessment of clinical referral notes against access criteria.

**Users:** Referrers (pre-submission check: "will this referral be accepted?") and evaluators during pilot.

**Key features:**
- Three-column layout: (1) note input + demographics, (2) AI assessment result, (3) criteria reference browser
- Free-text clinical note input with example scenarios
- Four-stage PII detection and auto-redaction pipeline (client-side)
- Paediatric patient detection with automatic switch to paediatric criteria dataset
- **AI assessment is the primary path** — fires on every "Check Referral" click via `POST /api/triage/assess`
- Rule-based criteria matching still runs client-side to populate the criteria reference panel (column 3)
- "What to add" guidance for improving documentation
- Safety redirect detection (fires before criteria assessment — redirects emergency presentations)
- Temporal ambiguity flagging (identifies uncertain timeframes that need clarification)
- Live NZD API cost tracker per session with stats modal
- Model comparison mode: Sonnet 4 vs Opus 4.6 side-by-side with Markdown export
- User identity prompt (name + role) before first assessment — logged with each assessment
- Usage logging to D1 (`POST /api/triage/usage-log`): exam, verdict, note, AI summary, tokens, NZD cost
- QA feedback modal for structured evaluator review (posts to `/api/qa-review`)
- Prompt caching: the ~21,000-token criteria block is cached server-side, reducing latency after the first call

**Data:** De-identified clinical scenarios processed transiently. Assessment content and usage metadata logged to D1 for pilot evaluation. PII blocked by 4-stage client pipeline before any transmission.

### 5.3 Admin Tool (v1.5.8)

**Purpose:** Maintain criteria content, manage regional localisation, publish updates, and review evaluation data.

**Users:** Programme team (clinical content editors) and programme evaluators.

**Eight tabs:**

| Tab | Function |
|-----|----------|
| **Criteria Editor** | Add/edit/remove criteria by modality and exam; working copy saved locally until published |
| **PDF Import** | Bulk criteria updates from national documents; diff mode (change detection) and replace mode (full reimport) |
| **Regions** | 8 NZ regions with HealthPathways URL override configuration per exam |
| **Versions** | Version control with publish workflow; rollback to prior versions |
| **Triage QA** | Review structured QA feedback from Triage Advisor evaluators; filter by reviewer/date/scenario; CSV export |
| **Viewer QA** | Review structured feedback from Criteria Viewer users; filter by reviewer/date/exam; CSV export |
| **Usage Log** | Per-assessment usage log from Triage Advisor pilot: user, exam, verdict, note, AI summary, tokens, NZD cost |
| **Audit Log** | Every create/update/delete/publish/rollback action with actor and timestamp |

**Data:** Criteria content and configuration. QA reviews and usage logs (de-identified clinical content). No patient-identifiable data.

### 5.4 Demo Harness (`crr-demo.html`)

**Purpose:** Demonstrate tool integration for platform stakeholders and gather evaluator feedback.

**Key features:**
- Two modes: **Explore Tools** (standalone preview in embedded pane) and **Integration Demo** (tool embedded in mock referral form)
- Mock referral forms: HealthLink SmartForms, BPAC bestpractice, ERMS — all three referral platform UIs
- `postMessage` listener receives `crr-output` from viewer/triage and inserts structured text into the mock form's clinical notes field
- `sendButton=on` URL parameter activates Send to Form button in integration context
- Three tool configurations: popup Criteria Viewer, full Criteria Viewer, Triage Advisor
- URL debug bar, feedback collection with CSV export, scenario test cards for the Triage Advisor

**Data:** No data stored. Demo only.

### 5.5 Cloudflare Workers API

**Purpose:** Content service, API proxy, and data logging.

**Public endpoints (no auth):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/criteria` | Published criteria snapshot from KV (used by Viewer and Triage Advisor) |
| `GET` | `/api/criteria/:id` | Single exam/site criteria record |
| `GET` | `/api/version` | Current published version info |
| `GET` | `/api/match-data` | Criteria in match format for Triage Advisor rule engine |
| `GET` | `/api/regions` | Region HealthPathways URL overrides |
| `POST` | `/api/triage/assess` | Proxy to Anthropic API (Anthropic key stays server-side) |
| `POST` | `/api/triage/usage-log` | Log each triage assessment (rate-limited 200/hr/IP) |
| `POST` | `/api/qa-review` | Triage Advisor QA submission (rate-limited 100/hr/IP) |
| `POST` | `/api/qa-viewer-review` | Criteria Viewer QA submission (rate-limited 100/hr/IP) |

**Admin endpoints (`x-admin-key` or Cloudflare Access JWT required):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST/PUT/DELETE` | `/api/admin/criteria[/:id]` | Criteria CRUD on D1 working copy |
| `GET` | `/api/admin/versions` | List saved version snapshots |
| `POST` | `/api/admin/versions/:id/publish` | Publish a version snapshot to KV (makes it live) |
| `POST` | `/api/admin/versions/:id/rollback` | Restore a past version to KV |
| `POST` | `/api/admin/publish` | Direct publish to KV (bypasses snapshot flow) |
| `GET/PUT` | `/api/admin/regions[/:regionId]` | Region HealthPathways URL overrides |
| `POST` | `/api/admin/extract-pdf` | Server-side PDF processing via Anthropic; streams SSE |
| `GET` | `/api/admin/audit` | Audit log |
| `GET` | `/api/qa-reviews` | Triage Advisor QA reviews (with filters) |
| `GET` | `/api/qa-viewer-reviews` | Criteria Viewer QA reviews (with filters) |
| `GET` | `/api/triage/usage-logs` | Triage usage log entries (with filters) |

**Security:**
- `x-admin-key` authentication for all admin write operations
- Cloudflare Access for the Admin Tool UI (SSO/email restriction)
- Anthropic API key held server-side only (never in browser)
- TLS everywhere, WAF, DDoS protection (Cloudflare platform)

---

## 6. Data Flow Summary

```
┌──────────────────────────────────────────────────────────────┐
│                     DATA CLASSIFICATION                       │
│                                                               │
│  PUBLIC REFERENCE DATA                                        │
│  ├─ National Radiology Access Criteria                        │
│  ├─ HealthPathways links (per region)                         │
│  ├─ Localised guidance content                                │
│  └─ Exam type / modality / body region structure              │
│     ► Stored in D1/KV · Served to authenticated users         │
│     ► No patient data · No clinical records                   │
│                                                               │
│  DE-IDENTIFIED CLINICAL SCENARIOS                             │
│  ├─ Free-text clinical notes with PII removed                 │
│  └─ Processed transiently by Anthropic API                    │
│     ► Anthropic zero-retention API policy                     │
│     ► PII blocked by 4-stage client pipeline                  │
│                                                               │
│  OPERATIONAL METADATA (stored in D1 for pilot evaluation)     │
│  ├─ Usage log: de-identified note text, AI summary,           │
│  │   exam identified, verdict, tokens, NZD cost               │
│  ├─ QA reviews: evaluator scores and comments                 │
│  ├─ Criteria version history and audit trail                  │
│  └─ PII detection event logs (pattern types only)             │
│     ► Usage log content is de-identified text only            │
│     ► No patient identifiers in any stored record             │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Why Not Embed in the Referral Platforms?

| Consideration | Embedded Approach | Standalone + Link Approach |
|--------------|-------------------|---------------------------|
| **Platform modifications** | 6 separate integrations across BPAC, HealthLink, ERMS | Zero platform modifications |
| **Vendor dependencies** | Requires BPAC, HealthLink, ERMS development cycles | Independent of vendor roadmaps |
| **Content consistency** | Risk of divergent criteria across platforms | Single source of truth |
| **Time to deploy** | Months (vendor engagement, testing, release cycles) | Days (update tools, update links) |
| **Criteria updates** | Coordinate across all platform vendors | Update D1/KV, all surfaces update immediately |
| **Cost** | Platform development costs per vendor | Cloudflare free/Pro tier |
| **Clinical governance** | Criteria logic owned by platform vendors | Criteria content owned by programme |
| **Future integration** | Locked to specific platforms | API-first — any platform can consume |

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| PII bypasses client-side detection | Low | High | Four-stage client-side pipeline; server-side PII gate planned (not yet implemented — see §9); Anthropic zero-retention policy |
| Clinicians don't use the tools | Medium | Medium | Link placement in referral forms, working group endorsement, decline rate feedback |
| Criteria content becomes stale | Medium | Medium | Admin tool with version control, audit log, programme-owned update process |
| Anthropic API availability | Low | Medium | Graceful error handling; rule-based criteria panel still renders without AI |
| Platform vendors refuse to add links | Low | Medium | Tools accessible by direct URL/bookmark regardless of form links |
| NHI format change (July 2026) breaks detection | Low | High | Dual-format detection implemented (old mod-11, new mod-23) |

---

## 9. Recommendations

1. **Proceed with cybersecurity review** using the PII Detection Specification (v0.2) and this architecture briefing as supporting documentation. The data classification argument — that de-identified clinical scenarios are not identifiable health information — is the central proposition.

2. **Get links into referral forms** as the immediate high-value action. Even simple "Check access criteria ›" links in BPAC, HealthLink, and ERMS guidance panels would make the tools accessible at the point of referral with zero platform redesign.

3. **Validate criteria content** with the CRR working group (Tim, James, Alex) to ensure the Criteria Viewer covers all modalities and exam types in the national access criteria.

4. **Populate regional content** — the localisation architecture supports 8 regions with HealthPathways URL override configuration. Content for non-Auckland regions needs to be gathered and entered via the Admin tool's Regions tab.

5. **Establish criteria content governance** — define who owns updates, how frequently they're reviewed, and what the publish workflow looks like. The Admin tool supports this but the process needs to be agreed.

6. **Implement server-side PII gate** — the client-side pipeline is built and tested; a server-side gate in the Cloudflare Worker (rejecting requests where PII is detected after transmission) is the remaining implementation item before the full belt-and-braces architecture is complete.
