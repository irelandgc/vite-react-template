# CRR Criteria Tool Suite

Community Referred Radiology criteria management system. Three clinical tools backed by a Cloudflare Worker API.

- **Viewer** — browse and filter referral criteria, generate output text
- **Admin** — edit criteria, import PDFs, manage regions and versions
- **Triage Advisor** — AI-powered referral triage against criteria

---

## Folder Structure

```
crr-criteria/
├── api/              # Cloudflare Worker (Hono) + D1 schema + migration script
├── admin/            # Admin Tool (React via CDN)
├── viewer/           # Criteria Viewer (vanilla JS)
├── triage/           # Triage Advisor (vanilla JS)
├── documents/        # Architecture docs, specs
├── reference/        # Original monolithic HTML files, source PDF, HealthPathways materials
└── migration-output/ # KV and D1 seed files
```

---

## Prerequisites

- Node.js 18+
- Wrangler (installed locally via npm): `npm install` in this directory
- Cloudflare account with access to the `crr-criteria-api` worker

---

## First-Time Setup

### 1. Install dependencies

```bash
cd /path/to/crr-criteria
npm install
```

### 2. Apply D1 schema

```bash
npx wrangler d1 execute crr-criteria --file=api/schema.sql
```

This creates the `criteria`, `versions`, and `audit_log` tables. Run once. Safe to re-run (uses `CREATE TABLE IF NOT EXISTS`).

### 3. Seed KV data

The published criteria, match data, and version info live in Cloudflare KV. Seed via the worker's seed endpoint:

```bash
# Seed published criteria (full snapshot)
curl -X POST "https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/seed?key=criteria:published" \
  -H "Content-Type: application/json" \
  -d @migration-output/kv-published.json

# Seed match data (for Triage Advisor)
curl -X POST "https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/seed?key=criteria:match-data" \
  -H "Content-Type: application/json" \
  -d @migration-output/kv-match-data.json

# Seed version metadata
curl -X POST "https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/seed?key=criteria:version" \
  -H "Content-Type: application/json" \
  -d @migration-output/kv-version.json
```

> **Note:** D1 has a 100 KB statement limit. Use the split seed files if seeding via `wrangler d1 execute`:
> ```bash
> npx wrangler d1 execute crr-criteria --file=migration-output/seed-criteria.sql
> npx wrangler d1 execute crr-criteria --file=migration-output/seed-version.sql
> ```

### 4. Set Cloudflare secrets

```bash
# Required for PDF extraction in Admin Tool and AI in Triage Advisor
npx wrangler secret put ANTHROPIC_API_KEY

# Optional: lock admin routes to a specific key
npx wrangler secret put ADMIN_KEY
```

If `ADMIN_KEY` is not set, any value in the `x-admin-key` header is accepted on admin routes.

---

## Deploying

Always deploy from the `crr-criteria/` directory (not the parent):

```bash
cd /path/to/crr-criteria
npm run build && npx wrangler deploy
```

> The `build` step in the parent `vite-react-template/` copies static assets to `dist/`. The `wrangler deploy` here deploys only the Cloudflare Worker from `api/worker.ts`.

---

## Development

Run the worker locally with hot-reload:

```bash
npx wrangler dev
```

The worker will be available at `http://localhost:8787`. Update `API_BASE` in the HTML files to point to localhost for local testing.

---

## Regenerating Seed Data

If the source criteria change (new PDF, updated criteria), regenerate the seed files:

```bash
cd api
python3 migrate.py \
  --explorer ../reference/crr-criteria-explorer-v3.4.4.html \
  --triage ../reference/crr-triage-advisor-v1.2.3.002.html \
  --output-dir ../migration-output
```

Then re-seed KV as above.

---

## Viewer URL Parameters

The Criteria Viewer (`viewer/index.html`) supports deep-linking:

| Parameter | Example | Effect |
|-----------|---------|--------|
| `?exam=` | `?exam=ct` | Pre-select exam by ID |
| `?sites=` | `?sites=ct_head,ct_chest` | Pre-tick anatomical sites (comma-separated) |
| `?region=` | `?region=waikato` | Pre-select district (persists to localStorage) |

Parameters can be combined: `?exam=ct&sites=ct_head&region=canterbury`

Valid exam IDs: `ct`, `us`, `xr`, `mri_lumbar`, `mri_shoulder`, etc. (see embedded data in `viewer/index.html`).

Valid region IDs: `aucklandregion`, `northland`, `waikato`, `bayofplenty`, `hawkesbay`, `3d`, `midcentral`, `whanganui`, `canterbury`, `southern`.

---

## API Reference

**Base URL:** `https://crr-criteria-api.fk4dsrmq5r.workers.dev`

### Public endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/criteria` | Published criteria (full snapshot) |
| `GET` | `/api/version` | Current published version info |
| `GET` | `/api/match-data` | Triage Advisor match data |
| `GET` | `/api/regions` | Region override data |

### Admin endpoints (require `x-admin-key` header)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/publish` | Publish working copy to KV |
| `POST` | `/api/admin/extract-pdf` | Extract criteria changes from a PDF |
| `GET` | `/api/admin/audit` | Audit log (requires D1 schema) |
| `GET` | `/api/admin/versions` | Version history (requires D1 schema) |
| `POST` | `/api/admin/versions/:id/rollback` | Restore a previous version |
| `PUT` | `/api/admin/regions/:regionId` | Save region override data |

### Seed endpoint

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/seed?key=<kv-key>` | Write JSON body to KV under given key |

---

## Known Issues

See [PROJECT-STATUS.md](PROJECT-STATUS.md) for full status including known issues and pending work.
