# CRR Criteria Tool Suite — Project Status

**Last updated:** 2026-04-18

---

## Deployed State

### API Worker
- **URL:** `https://crr-criteria-api.fk4dsrmq5r.workers.dev`
- **Worker version:** 2.0.0 (from `/api/health`)
- **Criteria version published:** v3.5.4 (published 2026-04-17)
- **Criteria count in KV:** 4 adult exam groups, 2 paed exam groups (ct, us, xr, mri_lumbar — each is a multisite exam containing all anatomical sites and criteria)
- **D1 database:** `crr-criteria` (ID: `1a8307f9-69e9-4315-a8f3-7f6737dd9c55`)
- **KV namespace:** `d8e1a512828d4dd7981d7b241213f396`

### API Endpoints
| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/health` | ✅ Working | Returns worker version + timestamp |
| `GET /api/criteria` | ✅ Working | Returns published KV data (only 4 exams — needs re-seed) |
| `GET /api/match-data` | ✅ Working | Returns match data for Triage Advisor |
| `GET /api/version` | ✅ Working | Returns criteria version metadata |
| `GET /api/regions` | ✅ Working | Returns region override data |
| `GET /api/admin/audit` | ⚠️ Needs D1 schema | `audit_log` table not yet created |
| `POST /api/admin/publish` | ✅ Working | Writes criteria to KV |
| `POST /api/admin/extract-pdf` | ✅ Working | Server-side PDF extraction via Anthropic API |
| `GET /api/admin/versions` | ⚠️ Needs D1 schema | `versions` table may not be created |

### Cloudflare Setup
```bash
# Verify deployment
npx wrangler deployments list --name crr-criteria-api

# Check KV
npx wrangler kv list --binding KV

# Check D1
npx wrangler d1 info crr-criteria
```

---

## Tools

### Viewer — `viewer/index.html` — v4.2.0
**What it does:** Display and filter Community Referred Radiology criteria by exam type, anatomical site, and population (adult/paediatric). Produces copy-pasteable referral text.

**URL parameters (restored in v4.2.0):**
- `?exam=ct` — pre-select exam by ID
- `?sites=ct_head,ct_chest` — pre-tick anatomical sites (comma-separated)
- `?region=waikato` — pre-select a district (also saves to localStorage)
- Combined: `?exam=ct&sites=ct_head&region=canterbury`

**Data source:** Loads from `/api/criteria` on startup; falls back to embedded v3.4.4 snapshot if API unavailable.

**Known issues:**
- Version badge shows `v4.2.0` but the API criteria version is `v3.5.4` — these are different version spaces (tool version vs. criteria version).

---

### Admin — `admin/index.html` — v1.5.4
**What it does:** Full CRUD for criteria data. 5 tabs:
1. **Editor** — Edit exam titles, guidance, HealthPathways URLs, criteria items and groups; save to in-memory working copy; publish to KV.
2. **PDF Import** — Upload a PDF referral form; Claude extracts changes (server-side via `/api/admin/extract-pdf`). "Apply Selected Changes" UI exists but wiring to working copy not yet implemented.
3. **Regions** — Edit per-region HealthPathways URL overrides. Saved to KV via `/api/admin/regions/:regionId`.
4. **Versions** — Publish working copy and view version history. Rollback to previous versions.
5. **Audit Log** — Read-only audit trail of all publish/edit actions.

**Known issues:**
- D1 `audit_log` and `versions` tables need schema migration run (see Pending Work below).
- "Apply Selected Changes" in PDF Import tab is wired to a toast but does not yet modify the working copy.
- API key not required if `ADMIN_KEY` secret is not set on the worker — any value in the `x-admin-key` header is accepted.

---

### Triage Advisor — `triage/index.html` — v2.1.1
**What it does:** AI-powered triage assessment. Enter a clinical referral note; the tool:
1. Runs rule-based matching against criteria (left panel).
2. Sends to Claude via `/api/triage/assess` for full AI analysis (right panel).
3. Streams AI response in real-time.

**Features:**
- PII detection and redaction before sending to Claude.
- Demographics input (age, sex).
- Paediatric warning for age < 16.
- Modality filter (All / CT / Ultrasound / X-Ray).
- Documentation standard toggle (Strict vs. Inferred).
- QA rating system (1–5 stars) with JSON export.
- Cost tracker (NZ$).

**Data source:** Loads from `/api/match-data` (rule-based matching data) and `/api/criteria` (for criteria text display).

---

## Architecture Overview

```
crr-criteria/
├── api/
│   ├── worker.ts          # Hono-based Cloudflare Worker (v2.0.0)
│   ├── schema.sql         # D1 database schema (criteria, versions, audit_log)
│   └── migrate.py         # Migration script: extracts from monolithic HTML → seed files
├── admin/
│   └── index.html         # Admin Tool v1.5.4 (React via CDN)
├── viewer/
│   └── index.html         # Criteria Viewer v4.2.0 (vanilla JS)
├── triage/
│   └── index.html         # Triage Advisor v2.1.1 (vanilla JS)
├── documents/
│   ├── CRR_Architecture_Briefing.md
│   └── CRR_PII_Detection_AutoRedaction_Spec_v0.2.md
├── reference/
│   ├── crr-criteria-explorer-v3.4.4.html   # Pre-decoupling monolith (source of truth for original logic)
│   ├── crr-criteria-explorer-v3.4.3_11.html
│   ├── crr-triage-advisor-v1.2.3.001.html
│   ├── crr-triage-advisor-v1.2.3.002.html
│   ├── National Primary Care Referral Criteria for Imaging.pdf  # Source criteria document
│   └── healthpathways/                      # Referral forms and HealthPathways links
└── migration-output/
    ├── kv-published.json   # Full criteria snapshot for KV seeding
    ├── kv-match-data.json  # Match data for Triage Advisor
    ├── kv-version.json     # Version metadata
    └── seed.sql            # D1 seed statements
```

**Data flow:**
1. Admin edits criteria in Editor tab (in-memory working copy).
2. Admin clicks Publish → `POST /api/admin/publish` writes snapshot to KV (`criteria:published`) and records in D1.
3. Viewer fetches `GET /api/criteria` on load → reads from `criteria:published` KV key.
4. Triage fetches `GET /api/match-data` on load → reads from `criteria:match-data` KV key.
5. Region overrides fetched from `GET /api/regions` → KV key per region.

**Deployment:** Single Cloudflare Worker handles all routes. Static HTML files are served from a separate location (public Vite build or direct URL). No build step for the worker — `wrangler deploy` from `crr-criteria/` root.

---

## Known Issues & Pending Work

### Blocking
- **D1 schema not applied** — run `npx wrangler d1 execute crr-criteria --file=api/schema.sql` to create `audit_log` and `versions` tables. Until then, Audit Log tab and Version History tab will fail.

### In Progress
- **PDF Import "Apply Selected Changes"** — UI exists, wiring to working copy not implemented.
- **Match data regeneration** — Triage Advisor uses the original seeded match data. When criteria are edited and published, match data is not automatically regenerated.

### Planned
- **Version history & rollback** — scaffolded in Admin Tool; needs D1 schema applied.
- **Auth hardening** — set `ADMIN_KEY` secret via `npx wrangler secret put ADMIN_KEY` to require proper authentication on admin routes.
- **Audit log** — after D1 schema applied, publish and save actions will record entries.

---

## Key Deployment Notes

- Use `npx wrangler` (not global `wrangler`) — global install doesn't work on this Mac.
- Use `zsh` shell — bash 3.2 swallows stdout.
- KV CLI puts go to the wrong namespace — always seed via the worker's `/api/seed?key=` endpoint.
- D1 has a 100 KB statement limit — use split seed files.
- `wrangler deploy` must be run from `crr-criteria/` (not the parent `vite-react-template/`).
- Worker reads `ANTHROPIC_API_KEY` from Cloudflare secret for PDF extraction and Triage AI calls.
