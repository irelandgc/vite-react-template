# CRR Criteria Tools — Admin Reference

**Last updated:** 2026-05-12
**Criteria Viewer:** v5.3.0
**Triage Advisor:** v2.1.1
**Admin Tool:** v1.5.8

Internal reference — not for external distribution. Contains infrastructure details, admin endpoints, and authentication information.

---

## Infrastructure

| Component | Details |
|-----------|---------|
| Main site worker | `vite-react-template` on Cloudflare Workers |
| Main site URL | `https://vite-react-template.fk4dsrmq5r.workers.dev` |
| API worker | `crr-criteria-api` on Cloudflare Workers |
| API URL | `https://crr-criteria-api.fk4dsrmq5r.workers.dev` |
| D1 database | `crr-criteria` (ID: `1a8307f9-69e9-4315-a8f3-7f6737dd9c55`) |
| KV namespace | ID: `d8e1a512828d4dd7981d7b241213f396` |
| Cloudflare account | `13d95cc559c1c6a7e6808d279d668b75` |

---

## Tool URLs

| Tool | URL |
|------|-----|
| Criteria Viewer | `.../crr-criteria/viewer/` |
| Triage Advisor | `.../crr-criteria/triage/` |
| Admin Tool | `.../crr-criteria/admin/` |

---

## Admin Tool authentication

The Admin Tool (`/crr-criteria/admin/`) is protected by Cloudflare Zero Trust Access (team: `crr-admin`, domain: `crr-admin.cloudflareaccess.com`). Users authenticate via email OTP.

Additionally, all admin API endpoints require an `x-admin-key` header. The key is stored in the browser's `localStorage` under `crr-admin-key` after first entry.

The admin key secret is set via:
```
npx wrangler secret put ADMIN_KEY --config public/crr-criteria/wrangler.json
```

---

## Admin API endpoints

**Base URL:** `https://crr-criteria-api.fk4dsrmq5r.workers.dev`

All admin endpoints require one of:
- `x-admin-key: <key>` header
- Cloudflare Access JWT (`cf-access-jwt-assertion` header)

### Criteria management

| Method | Endpoint | Body / Params | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/admin/criteria` | — | All criteria from D1 working copy |
| `GET` | `/api/admin/criteria/:id` | — | Single criteria record |
| `PUT` | `/api/admin/criteria/:id` | `{ data, updatedBy }` | Update a criteria record |
| `POST` | `/api/admin/criteria` | `{ id, title, modality, type, data, ... }` | Create a new criteria record |
| `DELETE` | `/api/admin/criteria/:id` | — | Delete a criteria record |

### Version management

| Method | Endpoint | Body / Params | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/admin/versions` | — | List all saved versions |
| `POST` | `/api/admin/versions` | `{ versionLabel, notes, createdBy }` | Save a new version snapshot from current D1 state |
| `POST` | `/api/admin/versions/:id/publish` | — | Publish a saved version to KV (makes it live) |
| `POST` | `/api/admin/publish` | `{ data, matchData, versionLabel, notes }` | Publish directly to KV (bypasses D1 snapshot flow) |
| `POST` | `/api/admin/versions/:id/rollback` | — | Restore a past version to KV |

### Region overrides

| Method | Endpoint | Body / Params | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/admin/regions` | — | All region override records |
| `PUT` | `/api/admin/regions/:regionId` | `{ overrides: { examId: url, ... } }` | Update a region's HealthPathways URL overrides |

### QA reviews

| Method | Endpoint | Query params | Description |
|--------|----------|--------------|-------------|
| `GET` | `/api/qa-reviews` | `?reviewer=&from=&to=` | All Triage Advisor QA reviews, newest first |
| `GET` | `/api/qa-viewer-reviews` | `?reviewer=&exam=&site=&from=&to=` | All Criteria Viewer QA reviews, newest first |

QA review submissions (`POST /api/qa-review`, `POST /api/qa-viewer-review`) do not require authentication and are rate-limited at 100 per hour per IP.

### Audit log

| Method | Endpoint | Query params | Description |
|--------|----------|--------------|-------------|
| `GET` | `/api/admin/audit` | `?limit=N` (default 50) | Audit log of publish/update/rollback actions |

### PDF extraction

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/admin/extract-pdf` | `{ pdf: base64, currentCriteria, chunkInfo, mode: "diff"\|"replace" }` | Server-side PDF processing via Anthropic. Streams SSE back to client. |

### Debug / maintenance

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/debug` | KV key list and env var presence check |
| `GET` | `/api/debug/seed` | Write test version record to KV and verify |
| `POST` | `/api/seed?key=published\|match-data\|version` | Write raw seed data to KV directly |

---

## D1 database schema

### `criteria`
Working copy of all exam criteria, edited via the Admin Tool.

### `versions`
Snapshots of the criteria at publish time, used for version history and rollback.

### `audit_log`
Every create/update/delete/publish/rollback action with actor and timestamp.

### `qa_reviews`
Triage Advisor QA submissions from evaluators.

| Column | Type | Description |
|--------|------|-------------|
| `timestamp` | TEXT | ISO datetime |
| `session_id` | TEXT | Browser session ID |
| `reviewer_name` | TEXT | |
| `reviewer_role` | TEXT | GP / Radiologist / PCRL / MIT / Nurse Practitioner / Other |
| `scenario_type` | TEXT | `clear_approve` / `borderline` / `should_decline` / `emergency_redirect` |
| `score_criteria_id` | TEXT | `wrong` / `partial` / `correct` |
| `score_suggestion_quality` | TEXT | `wrong` / `partial` / `correct` |
| `score_compound_handling` | TEXT | `wrong` / `partial` / `correct` |
| `score_safety_redirect` | TEXT | `wrong` / `partial` / `correct` |
| `overall_assessment` | TEXT | `accurate` / `minor_issues` / `significant_issues` / `wrong` |
| `comments` | TEXT | Optional free text |
| `presentation_text` | TEXT | Full clinical note submitted |
| `ai_response_summary` | TEXT | AI verdict + met/missing criteria |
| `exam_identified` | TEXT | Exam the AI identified |
| `model_used` | TEXT | e.g. `claude-sonnet-4-20250514` |
| `documentation_standard` | TEXT | `strict` (locked for pilot) |
| `region` | TEXT | Currently null (no region selector in triage) |

### `qa_viewer_reviews`
Criteria Viewer QA submissions from content validators.

| Column | Type | Description |
|--------|------|-------------|
| `timestamp` | TEXT | ISO datetime |
| `session_id` | TEXT | Browser session ID |
| `reviewer_name` | TEXT | |
| `reviewer_role` | TEXT | |
| `exam_type` | TEXT | Modality, e.g. `ct`, `us`, `xr` |
| `site_code` | TEXT | Site ID, e.g. `ct_colonography` |
| `site_label` | TEXT | Human-readable exam + site label |
| `region` | TEXT | Selected region key |
| `view_mode` | TEXT | `indication` or `urgency` |
| `score_accuracy` | TEXT | `significant_errors` / `minor_issues` / `accurate` |
| `score_usability` | TEXT | `difficult` / `adequate` / `easy` |
| `score_value` | TEXT | `would_not_use` / `maybe` / `definitely` |
| `checklist_*` | INTEGER | 9 boolean fields (0/1): criteria, priority, gateway, labvalue, altmgmt, notfunded, guidance, healthpathways, groupings |
| `comments` | TEXT | Optional free text |

---

## Deployment

Both workers are deployed from the project root:

```bash
# Deploy main site (viewer, triage, admin HTML)
cd /Users/garyireland/vite-react-template
npm run build && wrangler deploy

# Deploy API worker separately
npx wrangler deploy --config public/crr-criteria/wrangler.json
```

The main site build uploads all static files under `public/crr-criteria/` as Cloudflare Pages assets. The API worker compiles `api/worker.ts` separately.

---

## LocalStorage keys

| Key | Used by | Description |
|-----|---------|-------------|
| `crr-region` | Viewer | Last selected HealthPathways region |
| `crr-admin-key` | Admin Tool | Admin API key |
| `crr-qa-reviewer-name` | Triage + Viewer QA | Reviewer name (shared between tools) |
| `crr-qa-reviewer-role` | Triage + Viewer QA | Reviewer role (shared between tools) |

### SessionStorage

| Key | Used by | Description |
|-----|---------|-------------|
| `crr-qa-session-id` | Triage + Viewer QA | Random session ID grouping all reviews from one sitting (shared between tools) |
