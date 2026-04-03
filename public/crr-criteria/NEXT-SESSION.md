# CRR Admin — Next Session Pickup Notes

## What's Done (this session)

### Deployed & Working
- **Cloudflare Worker API** — live at `https://crr-criteria-api.fk4dsrmq5r.workers.dev`
  - Public: `/api/criteria`, `/api/match-data`, `/api/version`, `/api/health`
  - Admin: `/api/admin/publish`, `/api/admin/audit`, `/api/seed`
  - Auth: `x-admin-key` header (any value accepted for now)
  - CORS: allows `x-admin-key` and `x-admin-email` headers
- **Criteria Viewer v4.0.0** — loads from API, embedded fallback, regions restored
- **Triage Advisor v2.0.0** — loads from `/api/match-data`, embedded fallback
- **Admin Tool v1.1.0** — 5 tabs: Editor, PDF Import, Regions, Versions, Audit Log

### Editor (working)
- Sidebar with 40 exam/site entries grouped by modality, searchable
- Form editor: inline guidance, HealthPathways URL, priority groups, criteria items
- ▲▼ reorder for both items and groups
- Add/remove items and groups
- Save updates local working copy (in-memory)
- Publish on Versions tab writes to KV → both tools update immediately

### Issues Found in Testing
1. **Version badge doesn't update on Save** — by design: Save is local, Publish updates KV version
2. **Audit log table missing** — user needs to run `npx wrangler d1 execute crr-criteria --file=api/schema.sql`
3. **PDF Import fails** — "Unexpected EOF" because large PDF base64 payload sent from browser. Needs server-side proxy.
4. **API key stored in browser** — insecure. Needs to move to Cloudflare Worker secret.

---

## What to Build Next Session

### 1. Server-side PDF Processing (Priority)

**Problem:** The admin tool currently sends the PDF as base64 from the browser directly to the Anthropic API. This fails for large PDFs and exposes the API key in the browser.

**Solution:** Add a `/api/admin/extract-pdf` endpoint to the worker that:
1. Accepts a PDF upload (multipart form or base64 POST body)
2. Reads `ANTHROPIC_API_KEY` from worker environment (Cloudflare secret)
3. Calls the Anthropic API server-side
4. Returns the extracted changes to the admin tool

**Worker changes needed:**
```typescript
// In worker.ts — add new endpoint
app.post('/api/admin/extract-pdf', requireAccess, async (c) => {
  const apiKey = c.env.ANTHROPIC_API_KEY; // Cloudflare secret
  if (!apiKey) return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
  
  const body = await c.req.json();
  const pdfBase64 = body.pdf; // base64 PDF from admin tool
  const currentCriteria = body.currentCriteria; // summary for comparison
  
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{ role: "user", content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 }},
        { type: "text", text: `...extraction prompt with currentCriteria...` }
      ]}],
    }),
  });
  
  const result = await response.json();
  // Parse and return changes
  return c.json(result);
});
```

**Setup commands:**
```bash
# Set the API key as a Cloudflare secret (prompted for value)
npx wrangler secret put ANTHROPIC_API_KEY

# Add to Bindings type in worker.ts
type Bindings = {
  KV: KVNamespace;
  DB: D1Database;
  ANTHROPIC_API_KEY: string;  // ← add this
};
```

**Admin tool changes:**
- Remove the API key input field from the PDF Import tab
- Change `processDocument()` to POST to `/api/admin/extract-pdf` instead of directly to Anthropic
- Simplify: just upload PDF, worker handles everything

### 2. Wire "Apply Selected" in PDF Import

Currently the "Apply Selected Changes" button just shows a toast. It needs to actually modify the criteria data:
- For "added" changes: insert the new item into the correct exam/site/group
- For "removed" changes: remove the item from the working copy
- For "changed" changes: update the item text
- Then mark the working copy as dirty so the user can Publish

### 3. Audit Log — Run Schema

User needs to run:
```bash
npx wrangler d1 execute crr-criteria --file=api/schema.sql
```

After that, audit entries from Publish and Save operations will be recorded and visible in the Audit Log tab.

### 4. Region Overrides Persistence

Currently region overrides in the Regions tab are local only. Need to:
- Store in KV alongside the published data (e.g. `criteria:regions` key)
- Add a `/api/admin/regions` endpoint for CRUD
- Include region data in the publish payload so the Viewer can load it
- Viewer reads `LOCALISED_INFO` from the API response

### 5. Version History & Rollback

Currently only shows the current published version. Should:
- Store each publish as a version record in D1 (with the full snapshot)
- Show version history list
- Allow restoring a previous version (copies its snapshot back to KV)

### 6. Match Data Regeneration

When criteria are edited and published, the Triage Advisor's match data also needs updating. The `MATCH_DATA` includes synonym groups and a site index with `match_groups` arrays. Currently:
- Published criteria → Viewer reads from `criteria:published` ✓
- Match data → Triage reads from `criteria:match-data` — but this is the ORIGINAL migration data, not regenerated from edits

Options:
- Regenerate match data on every publish (complex — needs synonym mapping logic)
- Store match data separately and edit it in the Admin tool
- For now: accept that Triage uses the seeded match data until a full regeneration pipeline is built

---

## File Locations

All output files are in `/mnt/user-data/outputs/crr-decoupled/`:
- `viewer/crr-criteria-viewer-v4.0.0.html`
- `triage/crr-triage-advisor-v2.0.0.html`
- `admin/crr-criteria-admin-v1.1.0.html`
- `api/worker.ts`
- `api/schema.sql`
- `wrangler.json`
- `migration-output/` (seed files)
- `README.md`

## Key Deployment Facts
- Use `npx wrangler` (not `wrangler`) — global install doesn't work on this Mac
- Use `zsh` shell (bash-3.2 swallows stdout)
- KV CLI puts go to wrong namespace — always seed via worker's `/api/seed?key=` endpoint
- D1 has 100KB statement limit — use split seed files
- Worker CORS allows: Content-Type, Authorization, cf-access-jwt-assertion, x-admin-key, x-admin-email
