# CRR Tool Suite Security Audit Report

**Date:** 2026-05-15
**Auditor:** Claude Code
**Scope:** Deployed site at `https://iteratio.nz/crr-criteria/` and API at `https://crr-criteria-api.fk4dsrmq5r.workers.dev`, plus local project files

---

## Summary

- **Critical findings:** 4
- **Important findings:** 7
- **Informational / good practice:** 6

The two biggest issues are an **unauthenticated Anthropic API proxy** that allows arbitrary billable use by any caller from any origin, and an **unauthenticated `/api/seed` endpoint** that allows any caller to overwrite the published criteria in KV. Both are exploitable without any credentials. Several non-production files (source code, config, migration scripts) are also publicly served via the Pages frontend.

---

## Findings

### [CRITICAL-1] `/api/triage/assess` is an open Anthropic proxy

**Location:** `https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/triage/assess` (handler in `public/crr-criteria/api/worker.ts:600`)

**Description:** The endpoint forwards the request body to `https://api.anthropic.com/v1/messages` using the server's `ANTHROPIC_API_KEY` secret. There is **no authentication, no origin restriction, and no rate limit** on this handler. CORS is `Access-Control-Allow-Origin: *` (set globally for the app). Anyone on the internet — including any website embedding a fetch — can call this endpoint and spend the project's Anthropic budget.

**Evidence:**
```
$ curl -X POST https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/triage/assess \
  -H 'Content-Type: application/json' \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":50,"messages":[{"role":"user","content":"test"}]}'

{"id":"msg_01Qzs15PeF71Uri8gfoLY4Wh","type":"message","role":"assistant",
 "content":[{"type":"text","text":"Hello! I see you're testing the system..."}],
 "usage":{"input_tokens":8,"output_tokens":50,...}}
```

The handler has no `requireAccess`, no origin allowlist, no per-IP rate limit. Compare to e.g. `/api/qa-review` (worker.ts:434) which has IP-based hourly rate limiting via KV.

**Recommendation:** At minimum add a per-IP rate limit using KV (e.g. 30 calls/hour). Strongly preferred: also restrict CORS allowed origin to `https://iteratio.nz` for this route specifically, and add a short-lived signed token issued by the page itself (HMAC of timestamp + nonce, validated server-side). Set Anthropic monthly spend cap in the Anthropic dashboard as a defence-in-depth.

**Status:** OPEN — server-side rate limit applied this session (see Remediation row 1).

---

### [CRITICAL-2] `/api/seed` accepts unauthenticated KV writes

**Location:** `worker.ts:811`

**Description:** The `/api/seed` endpoint accepts a POST body with `?key=published|match-data|version` and writes the request body directly to the corresponding KV key (`criteria:published`, `criteria:match-data`, `criteria:version`). **No `requireAccess` middleware is applied.** Anyone can overwrite the published criteria with arbitrary content, breaking or corrupting the live viewer and triage tools for every user.

**Evidence:** Handler code:
```ts
app.post('/api/seed', async (c) => {       // <- no requireAccess
  const keyParam = c.req.query('key');
  const keyMap = { 'published': 'criteria:published', ... };
  const kvKey = keyMap[keyParam || ''];
  ...
  const body = await c.req.text();
  await kv.put(kvKey, body);               // <- writes arbitrary content
  ...
});
```

```
$ curl -X POST https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/seed?key=test
{"error":"Invalid key. Use: published, match-data, or version"}
```
The 400 is only because the `key` param is invalid — pass `?key=published` and any body would be written.

**Recommendation:** Add `requireAccess` middleware, or delete the endpoint (the publish flow already covers seeding via `/api/admin/publish` which IS authenticated).

**Status:** OPEN.

---

### [CRITICAL-3] `.claude/settings.local.json` publicly served and contains admin-key reference

**Location:** `https://iteratio.nz/crr-criteria/.claude/settings.local.json`

**Description:** Vite copies all of `public/` into `dist/client`, including the `.claude/settings.local.json` file. This file is the Claude Code agent's local permission allowlist and includes historical command lines such as:

```
"Bash(curl -s -X POST https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/admin/publish
  -H 'x-admin-key: admin' -d '{...}')"
```

This exposes (a) the historical admin-key value `admin` (still accepted by the worker if the `ADMIN_KEY` secret was unset or matched), (b) the curl shapes that mutate the system, and (c) an inventory of what admin operations have been run.

**Evidence:**
```
$ curl https://iteratio.nz/crr-criteria/.claude/settings.local.json | head -10
{
  "permissions": {
    "allow": [
      "Bash(npx wrangler:*)",
      ...
      "Bash(curl -s -X POST https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/admin/publish -H 'Content-Type: application/json' -H 'x-admin-key: admin' -d ...)"
    ]
  }
}
```

**Recommendation:** Remove `public/crr-criteria/.claude/` from the repository (or at minimum from `public/`). Add `.claude/` to `.gitignore` going forward. Rotate `ADMIN_KEY` to a value that has never been logged.

**Status:** OPEN — file slated for deletion this session.

---

### [CRITICAL-4] CORS wide-open on all endpoints (`Access-Control-Allow-Origin: *`)

**Location:** `worker.ts:27` — global Hono CORS middleware

**Description:**
```ts
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowHeaders: ['Content-Type','Authorization','cf-access-jwt-assertion','x-admin-key','x-admin-email'],
}));
```
`origin: '*'` means any browser, any website, can make requests to any endpoint. For unauthenticated endpoints like `/api/triage/assess` and `/api/seed`, this means any malicious page on the open web can drive them from a victim's browser.

**Evidence:**
```
$ curl -i -X OPTIONS https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/triage/assess \
    -H 'Origin: https://evil.example.com' -H 'Access-Control-Request-Method: POST'

HTTP/2 204
access-control-allow-origin: *
access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS
```

**Recommendation:** Replace `origin: '*'` with an allowlist of legitimate origins — at minimum `['https://iteratio.nz']`, plus any partner-platform origins that need to embed the tools (e.g. BPAC, HealthLink, ERMS — confirm with platform team). The browser-level same-origin restriction is the primary defence for the unauthenticated endpoints; without it, those endpoints are open to drive-by abuse.

**Status:** OPEN.

---

### [IMPORTANT-1] Backend source code publicly served

**Location:** Multiple paths under `https://iteratio.nz/crr-criteria/`:
- `api/worker.ts` (HTTP 200)
- `api/schema.sql` (HTTP 200)
- `api/migrate.py` (HTTP 200)

**Description:** The full source of the API worker (`worker.ts`) is served as a static asset. It exposes the auth scheme, endpoint structure, prompt-construction logic for the Anthropic proxy, and the names of environment-variable secrets. Schema.sql exposes table structure. Migrate.py may expose historic migration logic. None of these leak secrets directly (secrets are in Cloudflare Worker env), but they materially lower the cost of mapping the system for an attacker.

**Recommendation:** Move `public/crr-criteria/api/` out of `public/` to a sibling directory (e.g. `api-worker/`) and update the deploy command. The API worker is built and deployed separately from the Pages frontend; co-locating its source under `public/` is what causes Vite to copy it into `dist/client`.

**Status:** OPEN.

---

### [IMPORTANT-2] Worker config exposing D1/KV IDs publicly served

**Location:** `https://iteratio.nz/crr-criteria/wrangler.json` (HTTP 200)

**Description:**
```json
{
  "d1_databases": [{ "database_id": "1a8307f9-69e9-4315-a8f3-7f6737dd9c55", ... }],
  "kv_namespaces": [{ "id": "d8e1a512828d4dd7981d7b241213f396", ... }]
}
```

These IDs alone are not directly exploitable — direct D1/KV access requires the Cloudflare account API token. But they confirm the resource layout, and combined with a leaked account-level token would be material.

**Recommendation:** Remove with the api/ move.

**Status:** OPEN.

---

### [IMPORTANT-3] Migration output and seed scripts publicly served

**Location:** `https://iteratio.nz/crr-criteria/migration-output/*` (HTTP 200)

- `migration-output/seed.sql` — DB seed SQL
- `migration-output/kv-published.json` — historical KV snapshot
- `migration-output/pdf-criteria-all.json` — new published dataset (already accessible via `/api/criteria`, so this is dup, not new exposure)
- `migration-output/regionalisation-current.json` — region URL mappings
- `migration-output/kv-version.json`, `kv-match-data.json` — historical KV state

**Description:** None contain secrets or PII, but `seed.sql` reveals DB schema initialisation logic and historical INSERT statements. `regionalisation-current.json` reveals all region HealthPathways URL structures (mostly public anyway). Mostly low-impact, but unnecessary attack surface.

**Recommendation:** Move `migration-output/` out of `public/`.

**Status:** OPEN.

---

### [IMPORTANT-4] `CLAUDE.md` publicly served

**Location:** `https://iteratio.nz/crr-criteria/CLAUDE.md` (HTTP 200)

**Description:** Internal architecture notes including D1 database ID, KV namespace ID, deployment workflow, and Claude Code agent instructions. Duplicates the wrangler.json IDs and adds context an attacker would otherwise infer.

**Recommendation:** Remove from `public/`. The same file already exists at project root for Claude Code use.

**Status:** OPEN.

---

### [IMPORTANT-5] `package.json` and `package-lock.json` publicly served

**Location:** `https://iteratio.nz/crr-criteria/{package.json,package-lock.json}` (HTTP 200)

**Description:** Dependency inventory including exact pinned versions. Useful for an attacker checking against known CVE lists.

**Recommendation:** Remove from `public/` (move with `api/`).

**Status:** OPEN.

---

### [IMPORTANT-6] Old/development HTML files left in deployment

**Location:**
- `public/crr-criteria/viewer/viewer.html` (HTTP 307)
- `public/crr-criteria/viewer/popup.html` (HTTP 307)
- `public/crr-criteria/crr-demo.html` (HTTP 307)
- `public/crr-criteria/hl/index.html` (HTTP 307)

**Description:** These return 307 redirects (likely SPA fallback rewrites), so the literal file content isn't being served — but the paths suggest old viewer versions and integration mockups still exist in the deployment. The `viewer.html` and `popup.html` files contain hard-coded `EMBEDDED_DATA` with old criteria.

**Recommendation:** Delete files that aren't needed. If the demo/HL mockup is needed for stakeholder demos, move under an authenticated path (Cloudflare Access).

**Status:** OPEN.

---

### [IMPORTANT-7] No rate limit on `/api/triage/assess`

**Location:** `worker.ts:600` handler

**Description:** Other public endpoints (`/api/qa-review`, `/api/qa-viewer-review`, `/api/triage/usage-log`) have KV-backed IP rate limits (100–200 per hour per IP). `/api/triage/assess` has none — this is the only endpoint that costs money per call and it's the only unauthenticated public endpoint that's unrated.

**Recommendation:** Mirror the existing rate-limit pattern from `/api/qa-review`: 30–60 calls/hour/IP for triage assess.

**Status:** OPEN (planned this session).

---

## Good practice / informational

### [INFO-1] Admin tool protected by Cloudflare Access ✓
`https://iteratio.nz/crr-criteria/admin/` returns 302 → `crr-admin.cloudflareaccess.com/cdn-cgi/access/login`. Zero-trust auth is correctly enforced on the admin UI route.

### [INFO-2] No Anthropic API keys in browser code ✓
`grep -ri "sk-ant-"` against `public/` returns no matches. The only `x-api-key` references are inside `worker.ts` (server-side).

### [INFO-3] No direct Anthropic calls from browser ✓
The only `fetch('https://api.anthropic.com/v1/messages', ...)` calls are server-side in `worker.ts`. The triage UI and admin PDF-import flow both proxy through the worker.

### [INFO-4] Admin key not embedded in client code ✓
`public/crr-criteria/admin/index.html` stores the admin key in `localStorage` after a user prompt — it is never hard-coded in the deployed file.

### [INFO-5] Mutating admin endpoints reject anonymous requests ✓
`POST /api/admin/publish` → 401 without `x-admin-key`. `requireAccess` middleware correctly applied to `/api/admin/*` family.

### [INFO-6] QA + usage-log endpoints have rate-limit ✓
Confirms the pattern is in place — just needs extending to `/api/triage/assess`.

---

## Remediation Tracking

| # | Finding | Severity | Status | Fix applied |
|---|---|---|---|---|
| 1 | `/api/triage/assess` open Anthropic proxy | CRITICAL | **FIXED** | Origin allowlist + 30 req/hr/IP rate limit added to handler (`worker.ts:610`). Worker version `97d25c83`. Verified live: `evil.example.com` → 403; iteratio.nz still works. |
| 2 | `/api/seed` unauthenticated KV writes | CRITICAL | **FIXED** | `requireAccess` middleware added (`worker.ts:821`). Verified live: anonymous POST → 401. |
| 3 | `.claude/settings.local.json` exposes admin-key history | CRITICAL | **FIXED (deployment)** | Build script (`postbuild:clean`) now strips `.claude/`, `.wrangler/`, `api/`, `migration-output/`, `node_modules/`, `CLAUDE.md`, `package*.json`, `wrangler.json`, old viewer HTML from `dist/client/` after every Vite build. Verified live: `https://iteratio.nz/crr-criteria/.claude/settings.local.json` → 404. **Still TODO:** rotate `ADMIN_KEY` to a value never logged (the historical `admin` value appears in the now-deleted file). |
| 4 | CORS `*` on all endpoints | CRITICAL | **FIXED** | Replaced with allowlist of `https://iteratio.nz`, `https://www.iteratio.nz`, and local dev hosts (`worker.ts:25`). Verified live: preflight from `evil.example.com` returns `access-control-allow-origin: https://iteratio.nz` (the fallback), not `*`. Partner-platform origins (BPAC/HealthLink/ERMS) need to be added when integration is wired. |
| 5 | Backend source served publicly | IMPORTANT | **FIXED (deployment)** | `dist/client/crr-criteria/api/` removed by `postbuild:clean`. Verified live: `api/worker.ts`, `api/schema.sql`, `api/migrate.py` all 404. Source still lives at `public/crr-criteria/api/` for API-worker deploy convenience — recommended follow-up is to move it out of `public/` entirely for defence-in-depth. |
| 6 | `wrangler.json` exposes D1/KV IDs | IMPORTANT | **FIXED (deployment)** | Removed from `dist/client/` by postbuild script. Verified 404 live. |
| 7 | `migration-output/` publicly served | IMPORTANT | **FIXED (deployment)** | Same. `migration-output/seed.sql` → 404. |
| 8 | `CLAUDE.md` publicly served | IMPORTANT | **FIXED (deployment)** | Same. `CLAUDE.md` → 404. |
| 9 | `package.json/lock` publicly served | IMPORTANT | **FIXED (deployment)** | Same. |
| 10 | Old HTML files (`viewer.html`, `popup.html`, `crr-demo.html`, `hl/`) | IMPORTANT | **PARTIAL** | `viewer/viewer.html` and `viewer/popup.html` removed by postbuild. `crr-demo.html` and `hl/index.html` are still deployed (used as integration demos). Recommendation: move behind Cloudflare Access alongside the admin tool. |
| 11 | No rate limit on `/api/triage/assess` | IMPORTANT | **FIXED** | 30 req/hr/IP via KV (same pattern as `/api/qa-review`). |

---

## Outstanding actions (post-fix)

1. **Rotate `ADMIN_KEY`** — the historical `admin` value was visible in `.claude/settings.local.json` for some period; rotate via `npx wrangler secret put ADMIN_KEY` and update the admin tool localStorage prompt.
2. **Set Anthropic monthly spend cap** in the Anthropic dashboard — defence-in-depth against bypass of the 30/hr/IP limit (e.g. distributed abuse).
3. **Move `public/crr-criteria/api/` and related worker config out of `public/`** — eliminates the dependency on the postbuild scrub. Update the API-worker deploy command to point at the new location.
4. **Move `crr-demo.html` and `hl/index.html` behind Cloudflare Access** if they're only for stakeholder demos.
5. **Add request-token / HMAC validation** for `/api/triage/assess` — the current origin check is bypassable by a server-side caller that omits the Origin header. The rate limit caps abuse at 30/hr/IP but a determined attacker with distributed IPs could still spend the budget.
6. **Add CSP headers** to Pages responses (Workers Static Assets supports `_headers`).
7. **Add `.claude/`, `.wrangler/`, `node_modules/` to `.gitignore`** if not already present, to prevent re-introduction.
