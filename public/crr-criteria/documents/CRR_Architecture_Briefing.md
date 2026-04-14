# CRR Decision Support Tools — Architecture Briefing
## Decoupled Design, Privacy by Design, and Integration Pathway

**Version:** 0.1 · April 2026
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
│  │  │  EXPLORER           │    │  ADVISOR              │              │   │
│  │  │                     │    │                       │              │   │
│  │  │  • Browse criteria  │    │  • Paste clinical note│              │   │
│  │  │  • Self-assess      │    │  • PII auto-redaction │              │   │
│  │  │  • Copy structured  │    │  • Rule-based check   │              │   │
│  │  │    text to form     │    │  • AI assessment      │              │   │
│  │  │  • HealthPathways   │    │  • "What to add"      │              │   │
│  │  │    links (10 rgns)  │    │    guidance            │              │   │
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
│  │  Cloudflare Pages               │  │  Cloudflare Workers (Hono)     │ │
│  │  Static hosting                 │  │  API proxy + PII gate          │ │
│  │  • Criteria Explorer HTML/JS    │  │  • x-admin-key auth            │ │
│  │  • Triage Advisor HTML/JS       │  │  • Server-side PII detection   │ │
│  │  • Admin tool                   │  │  • API key secured server-side │ │
│  └─────────────────────────────────┘  │  • Rejects PII with 422        │ │
│                                        └──────────────┬─────────────────┘ │
│  ┌─────────────────────────────────┐                  │                   │
│  │  D1 Database + KV Cache         │                  │                   │
│  │  • Criteria content             │                  │                   │
│  │  • Region localisation          │                  │                   │
│  │  • HealthPathways links         │                  │                   │
│  │  • Version control              │                  │                   │
│  │  • Audit log                    │                  │                   │
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
                                            │  Claude Sonnet         │
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

The Criteria Explorer serves both user types from the same content:

```
┌─────────────────────────────────┐
│     NATIONAL ACCESS CRITERIA     │
│     (Single source in D1/KV)     │
└───────────────┬─────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
┌───────────────┐ ┌───────────────┐
│   REFERRER    │ │    TRIAGER    │
│   VIEW        │ │    VIEW       │
│               │ │               │
│ • Self-assess │ │ • Reference   │
│ • Checkboxes  │ │ • Read-only   │
│ • Copy text   │ │ • Denser      │
│ • HP links    │ │ • Quick-nav   │
│               │ │               │
│ ?mode=assess  │ │ ?mode=refer-  │
│ &region=tmk   │ │  ence         │
└───────────────┘ └───────────────┘
```

If the referrer checks their referral against the criteria in the Explorer, and the triager reviews the same criteria in the same tool, there is guaranteed consistency. A decline is never arbitrary — the triager is applying exactly the criteria the referrer was shown.

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
                │ PII gate (belt &     │
                │ braces — rejects if  │
                │ PII detected)        │
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

### 5.1 CRR Criteria Explorer (v4.0.0)

**Purpose:** Browse and self-assess against National Radiology Access Criteria.

**Users:** Referrers (self-assessment before submission) and triagers (criteria reference during triage).

**Key features:**
- Modality → body region → criteria navigation
- Checkbox-based self-assessment with structured text generation
- HealthPathways links with regional localisation (10 NZ regions)
- Localised information panels per modality and exam type
- URL parameter launch for context-aware linking from forms
- Admin/content editor for criteria maintenance
- Dual mode: assessment view (referrers) and reference view (triagers)

**Data:** National Access Criteria stored in D1 database with KV cache. No patient data.

### 5.2 CRR Triage Advisor (v2.1.1)

**Purpose:** AI-assisted assessment of clinical referral notes against access criteria.

**Users:** Referrers (pre-submission check: "will this referral be accepted?").

**Key features:**
- Free-text clinical note input
- Four-stage PII detection and auto-redaction pipeline
- Rule-based criteria matching (instant, no cost, no API)
- AI assessment via Claude Sonnet (deeper analysis, "Check with AI" option)
- "What to add" guidance for improving documentation
- Safety redirect detection (SP-01: redirects before criteria assessment)
- Model comparison capability for clinical validation

**Data:** De-identified clinical scenarios processed transiently. No storage. PII blocked at client and server.

### 5.3 Admin Tool (v1.1.0)

**Purpose:** Maintain criteria content, manage regional localisation, publish updates.

**Users:** Programme team (clinical content editors).

**Key features:**
- Criteria editor (add/edit/remove criteria by modality and exam)
- PDF import for bulk criteria updates from national documents
- Region management (10 NZ regions with HealthPathways URL configuration)
- Version control with publish workflow
- Audit log

**Data:** Criteria content and configuration. No patient data.

### 5.4 Cloudflare Workers API

**Purpose:** Content service and API proxy.

**Endpoints:**
- `GET /api/criteria` — serve criteria content (public, cacheable)
- `POST /api/assess` — proxy to Anthropic API with PII gate (authenticated)
- `POST /api/seed` — admin content management (admin-key auth)

**Security:**
- `x-admin-key` authentication for write operations
- Cloudflare Access for user-facing tools (SSO/email restriction)
- Server-side PII gate on `/assess` endpoint
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
│     ► Never stored by CRR tools                               │
│     ► Anthropic zero-retention API policy                     │
│     ► PII blocked by 4-stage client pipeline + server gate    │
│                                                               │
│  OPERATIONAL METADATA                                         │
│  ├─ PII detection event logs (pattern types only)             │
│  ├─ Usage analytics (aggregated, non-identifiable)            │
│  └─ Criteria version history and audit trail                  │
│     ► No clinical content · No patient identifiers            │
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
| PII bypasses client-side detection | Low | High | Server-side PII gate (Layer 3), no data storage, Anthropic zero-retention |
| Clinicians don't use the tools | Medium | Medium | Link placement in referral forms, working group endorsement, decline rate feedback |
| Criteria content becomes stale | Medium | Medium | Admin tool with version control, audit log, programme-owned update process |
| Anthropic API availability | Low | Medium | Rule-based assessment works without API, graceful fallback |
| Platform vendors refuse to add links | Low | Medium | Tools accessible by direct URL/bookmark regardless of form links |
| NHI format change (July 2026) breaks detection | Low | High | Dual-format detection implemented (old mod-11, new mod-23/mod-24) |

---

## 9. Recommendations

1. **Proceed with cybersecurity review** using the PII Detection Specification (v0.2) and this architecture briefing as supporting documentation. The data classification argument — that de-identified clinical scenarios are not identifiable health information — is the central proposition.

2. **Get links into referral forms** as the immediate high-value action. Even simple "Check access criteria ›" links in BPAC, HealthLink, and ERMS guidance panels would make the tools accessible at the point of referral with zero platform redesign.

3. **Validate criteria content** with the CRR working group (Tim, James, Alex) to ensure the Criteria Explorer covers all modalities and exam types in the national access criteria.

4. **Populate regional content** — the localisation architecture supports 10 regions but content is currently sparse. HealthPathways links and region-specific guidance need to be gathered and entered via the Admin tool.

5. **Establish criteria content governance** — define who owns updates, how frequently they're reviewed, and what the publish workflow looks like. The Admin tool supports this but the process needs to be agreed.

6. **Plan server-side PII gate implementation** — the client-side pipeline is built and tested; the server-side gate in the Cloudflare Worker is the remaining implementation item before the full three-layer architecture is complete.
