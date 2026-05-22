# Security Audit — Claude Code Instruction

**Priority: Complete before sharing URLs with any external testers.**

Run this audit against the deployed site (`iteratio.nz/crr-criteria`) and the local project files. Report findings in a new file `SECURITY-AUDIT-REPORT.md` at project root.

---

## Part 1: Deployed File Exposure

### 1.1 Public file inventory
List every file accessible under `https://iteratio.nz/crr-criteria/`. Include the `public/` directory tree. Flag:
- Old HTML versions (e.g. `crr-criteria-viewer-v4.html`, `crr-criteria-viewer-v5_3.html`, any versioned filenames)
- Markdown files (`.md`) — especially `claude-code-work-items.md`, `README.md`, `ENHANCEMENTS.md`, any roadmap or architecture docs
- Instruction files from `instructions/` folder
- Test data, seed data, or migration output files
- Any file containing internal architecture notes, database IDs, namespace IDs, or API endpoint URLs

### 1.2 Directory listing
Check whether Cloudflare Pages serves directory listings for `/`, `/viewer/`, `/triage/`, `/admin/`, `/instructions/`. If it does, that's a finding.

### 1.3 Source map exposure
Check if any `.map` files are deployed alongside JS/CSS bundles.

---

## Part 2: API Endpoint Security

### 2.1 Admin endpoint authentication
Test every admin/write endpoint:
```bash
# These should ALL return 401 or 403 without the x-admin-key header:
curl -X POST https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/seed -d '{}' -H 'Content-Type: application/json'
curl -X POST https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/seed?key=test -d '{}' -H 'Content-Type: application/json'

# Also test any other POST/PUT/DELETE endpoints discovered in the Worker code
```
Confirm: does the Worker validate `x-admin-key` on ALL mutating endpoints?

### 2.2 Anthropic API proxy endpoint (`/api/assess` or `/api/triage`)
This is the highest-risk endpoint. Test:

```bash
# 1. Can it be called without any authentication?
curl -X POST https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/assess \
  -H 'Content-Type: application/json' \
  -d '{"note": "test note", "examCode": "CT-HEAD"}'

# 2. What CORS headers does it return?
curl -I -X OPTIONS https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/assess \
  -H 'Origin: https://evil.example.com' \
  -H 'Access-Control-Request-Method: POST'

# 3. Does it accept requests from any origin?
curl -X POST https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/assess \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://evil.example.com' \
  -d '{"note": "test note", "examCode": "CT-HEAD"}'
# Check response headers for Access-Control-Allow-Origin value
```

**Expected secure state:**
- CORS `Access-Control-Allow-Origin` restricted to `iteratio.nz` (and any other legitimate origins)
- Rate limiting in place (check Worker code for any rate limit logic)
- Ideally: some form of request authentication (HMAC token, session, or at minimum origin validation)

### 2.3 Rate limiting
Review the Worker source code. Is there ANY rate limiting on the `/api/assess` endpoint? Document:
- Per-IP limits?
- Per-session limits?
- Global limits?
- Anthropic spend cap configured in Anthropic dashboard?

---

## Part 3: Client-Side Secret Exposure

### 3.1 Anthropic API key in browser code
Search ALL deployed HTML and JS files for:
```bash
grep -ri "sk-ant-" public/
grep -ri "anthropic" public/ | grep -i "key\|api\|secret\|token"
grep -ri "x-api-key" public/
```
The Triage Advisor should proxy through the Worker — confirm no direct Anthropic calls from browser JS.

**Known issue:** The Admin Tool's PDF import flow has a browser-exposed Anthropic API key. Confirm:
- Is the Admin Tool accessible from the public Pages URL?
- If yes, is the API key present in the deployed HTML?

### 3.2 Other secrets
Search deployed files for:
```bash
grep -ri "api[_-]key\|apikey\|secret\|password\|token\|auth" public/
grep -ri "workers.dev" public/   # Worker endpoint URLs (not secret, but inventory them)
grep -ri "d1.*database\|namespace.*id" public/   # D1/KV IDs
```
Worker endpoint URLs in client code are expected (the browser needs to call them), but document what's exposed.

### 3.3 Admin key in client code
```bash
grep -ri "x-admin-key\|admin.key\|adminKey" public/
```
If the admin tool is in `public/`, does it contain the admin key value or just the header name?

---

## Part 4: Recommended Fixes

Based on findings, implement these fixes (in priority order):

### P1 — Critical (fix before any external access)
1. **Remove non-production files from deployment** — old versions, .md files, instruction files, test data. Either:
   - Add to `.gitignore` / Cloudflare Pages build exclusion, OR
   - Move to a non-deployed directory
2. **Fix browser-exposed API key in PDF import** — move to server-side proxy or remove from deployed admin tool
3. **If `/api/assess` has no CORS restriction** — add origin allowlist middleware to Hono:
   ```typescript
   import { cors } from 'hono/cors';
   
   app.use('/api/assess', cors({
     origin: ['https://iteratio.nz'],
     allowMethods: ['POST', 'OPTIONS'],
     allowHeaders: ['Content-Type'],
   }));
   ```

### P2 — Important (fix before pilot)
4. **Add rate limiting to `/api/assess`** — basic per-IP rate limit using KV or in-memory counter:
   ```typescript
   // Example: max 30 requests per hour per IP
   const ip = c.req.header('CF-Connecting-IP');
   const key = `rate:${ip}`;
   const count = await c.env.KV.get(key);
   if (count && parseInt(count) > 30) {
     return c.json({ error: 'Rate limit exceeded' }, 429);
   }
   await c.env.KV.put(key, String((parseInt(count || '0') + 1)), { expirationTtl: 3600 });
   ```
5. **Add request token / HMAC validation** — generate a short-lived token in the page, validate in Worker
6. **Set Anthropic API spend cap** — configure monthly limit in Anthropic dashboard

### P3 — Good practice
7. **Add audit logging** — log every `/api/assess` call: IP, timestamp, exam code, response status (NOT the clinical note)
8. **Content Security Policy headers** — add CSP to Cloudflare Pages headers to prevent XSS
9. **Cloudflare Access** — add zero-trust auth layer for admin routes and optionally the whole site during pilot

---

## Report Format

Create `SECURITY-AUDIT-REPORT.md` with:

```markdown
# CRR Tool Suite Security Audit Report
**Date:** [today]
**Auditor:** Claude Code
**Scope:** Deployed files + API endpoints

## Summary
- Critical findings: [count]
- Important findings: [count]
- Informational: [count]

## Findings

### [CRITICAL/IMPORTANT/INFO] Finding title
**Location:** [file or endpoint]
**Description:** [what was found]
**Evidence:** [curl output or grep result]
**Recommendation:** [fix]
**Status:** [open / fixed]

## Remediation Tracking
| # | Finding | Severity | Status | Fixed in commit |
|---|---------|----------|--------|-----------------|
```
