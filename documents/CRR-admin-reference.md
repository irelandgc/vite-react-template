# CRR Criteria Tools — Admin Reference

**Last updated:** 2026-05-16
**Criteria Viewer:** v5.3.0
**Triage Advisor:** v2.1.1
**Admin Tool:** v1.5.8

Internal reference — not for external distribution. Contains infrastructure details, admin endpoints, and authentication information.

---

## Infrastructure

| Component | Details |
|-----------|---------|
| Main site worker | `vite-react-template` on Cloudflare Workers |
| Main site URL | `https://iteratio.nz` |
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

### Architecture overview

Admin auth uses a two-layer stack:

```
Browser (iteratio.nz/crr-criteria/admin)
    │
    │  Same-origin fetch to /crr-api/api/...
    ▼
Cloudflare Access (iteratio.nz)
    │  Injects cf-access-authenticated-user-email header
    │  Returns 302 to login if no valid session
    ▼
Main worker proxy  (src/worker/index.ts)
    │  Checks email header — 401 if absent on admin paths
    │  Injects x-admin-key from ADMIN_KEY secret
    ▼
API worker  (crr-criteria-api.fk4dsrmq5r.workers.dev)
    │  Validates x-admin-key
    ▼
D1 / KV
```

The admin tool never sends an admin key from the browser. The proxy injects it server-side from the `ADMIN_KEY` secret. The browser only needs a valid Cloudflare Access session.

### Cloudflare Access application

| Field | Value |
|-------|-------|
| Application name | vite-react-template.fk4dsrmq5r.workers.dev |
| Application ID | `0c011c32-833d-45dc-8304-068e4b6064c1` |
| Team domain | `crr-admin.cloudflareaccess.com` |
| Auth method | Email OTP |
| Policy | CRR Admin Users (4 email addresses, 0 exclusions) |

**Public hostnames covered by the Access app (all three are required):**

| Hostname | Path |
|----------|------|
| `vite-react-template.fk4dsrmq5r.workers.dev` | `/crr-criteria/admin` |
| `iteratio.nz` | `/crr-criteria/admin` |
| `iteratio.nz` | `/crr-api/*` |

The third row (`/crr-api/*`) is critical — it ensures CF Access injects the email header on the proxy requests that the admin tool makes. Without it, every API call gets redirected to the Access login page with a CORS error. Use the broader `/crr-api/*` wildcard, not `/crr-api/api/*` — CF Access wildcard matching does not reliably cover nested paths with the narrower pattern.

### Proxy routing (src/worker/index.ts)

The main worker proxies all `/crr-api/*` requests to the API worker. Admin paths get the `x-admin-key` injected; public paths pass through without it.

| Path pattern | Admin auth applied |
|---|---|
| `/crr-api/api/admin/*` | Yes |
| `/crr-api/api/qa-reviews` | Yes |
| `/crr-api/api/qa-viewer-reviews` | Yes |
| `/crr-api/api/triage/usage-logs` | Yes |
| `/crr-api/api/*` (all others) | No |

Note: `qa-reviews`, `qa-viewer-reviews`, and `triage/usage-logs` are admin-only on the API worker but live outside the `/api/admin/*` namespace — so they need explicit proxy routes to get the key injected.

### ADMIN_KEY secrets

The `ADMIN_KEY` secret must be set on **both** workers and the values must match. The proxy reads the key from the main worker's secret and forwards it to the API worker, which validates it.

```bash
# Set on main worker (vite-react-template)
npx wrangler secret put ADMIN_KEY

# Set on API worker (crr-criteria-api)
npx wrangler secret put ADMIN_KEY --config public/crr-criteria/wrangler.json
```

To generate a new key:
```bash
openssl rand -base64 32
```

To avoid the interactive prompt, pipe the value directly:
```bash
printf '%s' 'your-key-here' | npx wrangler secret put ADMIN_KEY
printf '%s' 'your-key-here' | npx wrangler secret put ADMIN_KEY --config public/crr-criteria/wrangler.json
```

To verify a secret is set (values are never shown, only names):
```bash
npx wrangler secret list
npx wrangler secret list --config public/crr-criteria/wrangler.json
```

### Session management

CF Access sets a `CF_AppSession` cookie scoped to `iteratio.nz` (Path=`/`, Domain=`iteratio.nz`). This cookie is automatically sent with all same-origin fetch calls from the admin tool.

**CF Access session duration** must not be set to "No duration, expires immediately". That setting authenticates the first request then immediately invalidates the session, causing all subsequent API calls to return 401. Set to a real duration (e.g. 24 hours) in the Access app settings — check both the app-level and global session duration overrides.

**After editing the Access app configuration** (adding hostnames, changing policies), existing browser sessions may not pick up the changes. Force a fresh session:

```
1. Visit:  https://iteratio.nz/cdn-cgi/access/logout
2. Close all iteratio.nz tabs
3. Reopen: https://iteratio.nz/crr-criteria/admin
4. Re-authenticate via email OTP
```

### Using the API directly (Claude Code / scripts)

The API worker still accepts `x-admin-key` directly — useful for scripted updates or Claude Code sessions. Call the API worker URL directly, bypassing the proxy:

```bash
curl -H "x-admin-key: YOUR_KEY" \
  https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/admin/versions
```

The audit log records these calls with actor "Claude Code" (falls back when no CF Access email header is present).

---

## Admin API endpoints

**Browser base URL (via proxy):** `/crr-api/api/...` (same-origin, credentials included automatically)

**Direct base URL (scripts/CLI):** `https://crr-criteria-api.fk4dsrmq5r.workers.dev`

All admin endpoints require one of:
- `x-admin-key: <key>` header (direct/script access)
- CF Access session cookie + email header injected by proxy (browser via iteratio.nz)

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

Always deploy from the repo root. Never `cd` into `public/crr-criteria/` — use `--config` to target the API worker.

```bash
# Deploy main site (viewer, triage, admin HTML + proxy worker)
npm run build && npx wrangler deploy

# Deploy API worker separately
npx wrangler deploy --config public/crr-criteria/wrangler.json
```

The main site build uploads all static files under `public/crr-criteria/` as Cloudflare Pages assets and deploys `src/worker/index.ts` as the edge worker (which includes the `/crr-api/*` proxy). The API worker compiles `api/worker.ts` separately.

---

## LocalStorage keys

| Key | Used by | Description |
|-----|---------|-------------|
| `crr-region` | Viewer | Last selected HealthPathways region |
| `crr-admin-key` | Admin Tool | ~~Admin API key~~ — no longer used. Auth now handled by CF Access session cookie + server-side proxy. |
| `crr-qa-reviewer-name` | Triage + Viewer QA | Reviewer name (shared between tools) |
| `crr-qa-reviewer-role` | Triage + Viewer QA | Reviewer role (shared between tools) |

### SessionStorage

| Key | Used by | Description |
|-----|---------|-------------|
| `crr-qa-session-id` | Triage + Viewer QA | Random session ID grouping all reviews from one sitting (shared between tools) |
