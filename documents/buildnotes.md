# Build Notes — CRR Tool Suite

Quirks, gotchas, and non-obvious decisions encountered during development. Add a new entry whenever something unexpected costs time or requires a workaround.

---

## Deployment

### Build and deploy sequence
Every change to a static file (`viewer/index.html`, `admin/index.html`, any file under `public/crr-criteria/`) requires a full build before deploying the main worker:

```bash
npm run build && npx wrangler deploy
```

The CRR API worker only needs its own deploy when `api/worker.ts` changes:

```bash
npx wrangler deploy --config public/crr-criteria/wrangler.json
```

Forgetting `npm run build` before `npx wrangler deploy` will deploy stale assets — the worker will serve the old HTML/JS/CSS.

---

## Cloudflare Access

### Public endpoints must not go through the `/crr-api/*` proxy
Cloudflare Access protects the entire `/crr-api/*` path on iteratio.nz. Any endpoint that needs to be publicly accessible (no login required) cannot use the same-origin proxy at `/crr-api/`. Instead, call the CRR API worker directly:

```
https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/<endpoint>
```

The existing QA submission endpoints already use this pattern. The viewer telemetry endpoint (`/api/viewer-event`) was initially routed through `/crr-api/viewer-event` but was changed to call the worker directly for this reason.

Admin endpoints (`/api/admin/*`) go through the proxy and are correctly protected by CF Access.

---

## CORS / Fetch

### `sendBeacon` with `application/json` Blob fails silently cross-origin
`navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))` triggers a CORS preflight. Even when the preflight succeeds and the server returns the correct `Access-Control-Allow-Origin` header, `sendBeacon` can still fail silently in some browsers when the request is cross-origin.

**Workaround:** Use `fetch` with `keepalive: true` instead. This provides the same "survives page navigation" behaviour as `sendBeacon` and uses the same CORS path that already works for other API calls (e.g. QA submissions).

```javascript
fetch(url, {
  method: 'POST',
  body: payload,
  headers: { 'Content-Type': 'application/json' },
  keepalive: true
}).catch(function(){});
```

---

## D1 / Database

### Run migrations against remote, not local
D1 migrations must target `--remote` to apply to the production database:

```bash
npx wrangler d1 execute crr-criteria --remote --command "..."
```

Omitting `--remote` runs against a local SQLite file and has no effect on production.

### Always use `npx wrangler`, never bare `wrangler`
The project has wrangler as a local dev dependency. Running `wrangler` directly will use whatever version (if any) is on the global PATH, which may differ or not exist.

---

## Cloudflare Workers / Hono

### CORS middleware must cover OPTIONS for cross-origin endpoints
Hono's `cors()` middleware handles OPTIONS preflight automatically when applied with `app.use('*', cors({...}))`. The `allowMethods` array must include `'OPTIONS'` explicitly, and `allowHeaders` must list every header the client will send (including `Content-Type`).

### `run_worker_first` in wrangler.json
The root `wrangler.json` uses `run_worker_first: ["/crr-api/*", "/api/*"]` to ensure API paths hit the worker before falling through to static assets. New API route prefixes must be added here or they will 404.

---

## Safari / Browser Compatibility

### `sessionStorage` in private browsing throws
`sessionStorage` access throws a `SecurityError` in Safari private browsing mode. All reads and writes must be wrapped in try/catch:

```javascript
try { sessionStorage.setItem('key', value); } catch(e) {}
try { var val = sessionStorage.getItem('key'); } catch(e) { var val = null; }
```

### No `Content-Type` header on GET requests
Adding a `Content-Type` header to GET requests triggers a CORS preflight in WebKit. Omit it for all GETs (the `api()` helper in the admin tool already does this).
