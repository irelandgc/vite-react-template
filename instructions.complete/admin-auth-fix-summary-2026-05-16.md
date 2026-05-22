# Admin Auth Fix — 2026-05-16

## What was broken

The Admin tool at `iteratio.nz/crr-criteria/admin/` was returning 401 errors on all API calls through the same-origin proxy (`/crr-api/api/*`). Three related problems were found and fixed.

---

## Problem 1: Worker routing — SPA catch-all was intercepting API requests

The `wrangler.json` had `not_found_handling: "single-page-application"` in the `assets` config, but no `run_worker_first` setting. This meant Cloudflare served `index.html` for every request that didn't match a static file — including `/crr-api/*` paths. The Hono worker proxy never received the requests.

### Fix

Added `run_worker_first` array and `binding` to the root `wrangler.json`:

```json
{
  "assets": {
    "directory": "./dist/client",
    "not_found_handling": "single-page-application",
    "binding": "ASSETS",
    "run_worker_first": ["/crr-api/*", "/api/*"]
  }
}
```

Updated `src/worker/index.ts`:
- Added `ASSETS: Fetcher` to the `Bindings` type
- Added a catch-all at the bottom to delegate non-API requests to the asset binding:
  ```typescript
  app.all("*", async (c) => {
    return c.env.ASSETS.fetch(c.req.raw);
  });
  ```

---

## Problem 2: CF Access path wildcard not matching `/crr-api/api/*`

The Cloudflare Access application had a public hostname entry for `iteratio.nz` with path `/crr-api/api/*`. CF Access was not injecting the `cf-access-authenticated-user-email` header on requests to this path — the wildcard wasn't matching nested paths as expected.

### Fix

Changed the CF Access public hostname path from `/crr-api/api/*` to `/crr-api/*` (broader wildcard). The three public hostnames in the Access app are now:

| Hostname | Path |
|----------|------|
| `vite-react-template.fk4dsrmq5r.workers.dev` | `/crr-criteria/admin` |
| `iteratio.nz` | `/crr-criteria/admin` |
| `iteratio.nz` | `/crr-api/*` |

---

## Problem 3: CF Access session duration set to "expires immediately"

The CF Access application's session duration was set to "No duration, expires immediately". This caused the session to authenticate successfully on the first request, then immediately expire — making all subsequent API calls fail with 401.

### Fix

Changed the session duration to a reasonable value (e.g. 24 hours) in the CF Access application settings. Also checked that neither the policy-level nor the global session duration was overriding the app setting.

---

## Admin tool fetch mode fix

During debugging, the admin tool's `api()` helper was updated to use explicit same-origin fetch settings:

```javascript
const res = await fetch(`${API}${path}`, {
  cache: 'no-store',
  credentials: 'same-origin',
  mode: 'same-origin',
  headers: {...ctHeader, ...extraHeaders},
  ...rest
});
```

Previously it used `credentials: 'include'` with no `mode` specified, which caused the browser to classify requests as `cross-site` with `Origin: null`, preventing CF Access from injecting the email header.

---

## Cleanup needed

1. **Remove the debug-headers route** from `src/worker/index.ts` — search for `/crr-api/debug-headers` and delete that route handler.
2. **Remove `public/_routes.json`** if it was created — it's not needed with the `run_worker_first` approach.
3. **ADMIN_KEY secrets** were re-set on both workers during debugging. Verify they match:
   ```bash
   npx wrangler secret list
   npx wrangler secret list --config public/crr-criteria/wrangler.json
   ```

---

## Architecture summary (updated)

```
Browser (iteratio.nz/crr-criteria/admin)
    │
    │  Same-origin fetch (mode: 'same-origin') to /crr-api/api/...
    ▼
Cloudflare Assets + run_worker_first: ["/crr-api/*"]
    │  Routes /crr-api/* to the Hono worker; everything else to static assets
    ▼
Cloudflare Access (iteratio.nz, path: /crr-api/*)
    │  Validates CF_Authorization cookie
    │  Injects cf-access-authenticated-user-email header
    ▼
Hono proxy worker (src/worker/index.ts)
    │  Reads email header — 401 if absent on admin paths
    │  Injects x-admin-key from ADMIN_KEY secret
    ▼
API worker (crr-criteria-api.fk4dsrmq5r.workers.dev)
    │  Validates x-admin-key
    ▼
D1 / KV
```

## Key learnings

- Cloudflare Workers `assets` with `not_found_handling: "single-page-application"` will serve `index.html` for ALL unmatched paths unless `run_worker_first` specifies which paths should hit the worker.
- CF Access path wildcards may not match nested paths as expected — use broader wildcards (e.g. `/crr-api/*` rather than `/crr-api/api/*`).
- CF Access session duration of "expires immediately" will authenticate the initial request but fail all subsequent ones.
- `fetch()` without explicit `mode: 'same-origin'` defaults to CORS mode, which can cause `Sec-Fetch-Site: cross-site` and `Origin: null`, preventing CF Access from injecting identity headers.
