# Viewer Usage Telemetry — Claude Code Build Brief

## Context

The CRR Tool Suite has comprehensive logging for the Triage Advisor (usage log with cost/tokens/verdict per API call, plus structured QA reviews) and for admin operations (audit log). The Criteria Viewer has a QA review mechanism (subjective feedback from testers) but no behavioural telemetry — we cannot answer "which exams do people look at", "do they copy the output", or "do they click HealthPathways links".

This brief adds lightweight, fire-and-forget usage event logging to the Criteria Viewer, plus a new admin tab to view the data. No PII is captured — the data is exam IDs, event types, and optional self-identified name/role inherited from the existing Viewer QA review flow.

## Scope

1. **D1 schema** — new `viewer_events` table
2. **Worker endpoint** — `POST /crr-api/viewer-event` (public, no auth, rate-limited)
3. **Viewer client-side** — beacon calls on key interactions
4. **Admin tab** — "Viewer Usage" tab in admin tool

---

## 1. D1 Schema

Add this table to the database. Run via `npx wrangler d1 execute crr-criteria --remote --command "..."` or add to a migration SQL file.

```sql
CREATE TABLE IF NOT EXISTS viewer_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  exam_id TEXT,
  site_code TEXT,
  event_data TEXT,                    -- JSON string for event-specific extras
  region TEXT,
  user_name TEXT,                     -- nullable; inherited from QA review if submitted in same session
  user_role TEXT,                     -- nullable; same inheritance
  user_agent TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_viewer_events_session ON viewer_events(session_id);
CREATE INDEX IF NOT EXISTS idx_viewer_events_type ON viewer_events(event_type);
CREATE INDEX IF NOT EXISTS idx_viewer_events_exam ON viewer_events(exam_id);
CREATE INDEX IF NOT EXISTS idx_viewer_events_date ON viewer_events(created_at);
```

---

## 2. Worker Endpoint

Add a new route in `src/worker/index.ts` (or wherever the Hono routes are defined).

### Route: `POST /crr-api/viewer-event`

- **No auth required** — this is a public telemetry endpoint (no PII)
- **Rate limiting** — basic protection: reject if body > 2KB; optionally track IP + timestamp in memory and reject if > 60 events/minute from same IP
- **CORS** — must accept requests from the viewer origin (same-origin should work since the viewer is served from `iteratio.nz/crr-criteria`)

### Request body (JSON):

```json
{
  "session_id": "vsess_abc123def456",
  "event_type": "exam_selected",
  "exam_id": "ct_head",
  "site_code": "head",
  "event_data": { "view_mode": "indication" },
  "region": "aucklandregion",
  "user_name": "Louise Poynton",
  "user_role": "GP"
}
```

All fields except `session_id` and `event_type` are optional/nullable.

### Handler logic:

```typescript
app.post('/crr-api/viewer-event', async (c) => {
  try {
    const body = await c.req.json();

    // Validate required fields
    const { session_id, event_type } = body;
    if (!session_id || !event_type) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Validate event_type against allowed values
    const ALLOWED_EVENTS = ['exam_selected', 'copy_action', 'hp_link_click', 'guidance_expanded'];
    if (!ALLOWED_EVENTS.includes(event_type)) {
      return c.json({ error: 'Invalid event_type' }, 400);
    }

    // Extract IP from Cloudflare header
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null;

    // Extract user agent
    const ua = c.req.header('user-agent') || null;

    // Serialise event_data if present
    const eventDataStr = body.event_data ? JSON.stringify(body.event_data) : null;

    await c.env.DB.prepare(`
      INSERT INTO viewer_events (session_id, event_type, exam_id, site_code, event_data, region, user_name, user_role, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      session_id,
      event_type,
      body.exam_id || null,
      body.site_code || null,
      eventDataStr,
      body.region || null,
      body.user_name || null,
      body.user_role || null,
      ua,
      ip
    ).run();

    return c.json({ ok: true }, 201);
  } catch (e) {
    console.error('viewer-event error:', e);
    return c.json({ error: 'Internal error' }, 500);
  }
});
```

### Admin query endpoint: `GET /crr-api/api/admin/viewer-events`

This endpoint serves the admin tab. Protected by the same Cloudflare Access auth as other admin routes.

Query parameters (all optional):
- `from` — ISO date string, filters `created_at >= ?`
- `to` — ISO date string, filters `created_at <= ? || 'T23:59:59'`
- `event_type` — filter by event type
- `exam` — filter by exam_id

Returns JSON array of event rows, ordered by `created_at DESC`, limit 500.

```typescript
app.get('/crr-api/api/admin/viewer-events', async (c) => {
  // ... auth check (same pattern as other admin routes) ...

  const from = c.req.query('from');
  const to = c.req.query('to');
  const eventType = c.req.query('event_type');
  const exam = c.req.query('exam');

  let sql = 'SELECT * FROM viewer_events WHERE 1=1';
  const params = [];

  if (from) { sql += ' AND created_at >= ?'; params.push(from); }
  if (to) { sql += ' AND created_at <= ?'; params.push(to + 'T23:59:59'); }
  if (eventType) { sql += ' AND event_type = ?'; params.push(eventType); }
  if (exam) { sql += ' AND exam_id = ?'; params.push(exam); }

  sql += ' ORDER BY created_at DESC LIMIT 500';

  const result = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(result.results || []);
});
```

---

## 3. Viewer Client-Side Changes

These changes go in the Criteria Viewer HTML file (currently at `public/crr-criteria/viewer/index.html`).

### 3a. Session ID generation

On page load, generate a session ID and store in sessionStorage. Use prefix `vsess_` to distinguish from triage sessions (`sess_`).

```javascript
// Near top of script, after app initialisation
const VIEWER_SESSION_ID = sessionStorage.getItem('crr_viewer_session')
  || (() => {
    const id = 'vsess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('crr_viewer_session', id);
    return id;
  })();
```

### 3b. Identity inheritance from QA review

When the user submits a Viewer QA review (the existing feedback mechanism), their name and role are already captured. After successful QA submission, also store these in sessionStorage:

```javascript
// In the QA review submit handler, after successful POST:
if (reviewerName) sessionStorage.setItem('crr_viewer_user_name', reviewerName);
if (reviewerRole) sessionStorage.setItem('crr_viewer_user_role', reviewerRole);
```

### 3c. Beacon function

A single fire-and-forget function used by all event calls. Uses `navigator.sendBeacon` with `fetch` fallback.

```javascript
function logViewerEvent(eventType, data = {}) {
  const payload = JSON.stringify({
    session_id: VIEWER_SESSION_ID,
    event_type: eventType,
    exam_id: data.exam_id || null,
    site_code: data.site_code || null,
    event_data: data.event_data || null,
    region: data.region || getCurrentRegion() || null,   // use whatever function returns the active HP region
    user_name: sessionStorage.getItem('crr_viewer_user_name') || null,
    user_role: sessionStorage.getItem('crr_viewer_user_role') || null,
  });

  const url = '/crr-api/viewer-event';

  // sendBeacon is fire-and-forget, survives page unload
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
  } else {
    fetch(url, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
  }
}
```

### 3d. Event instrumentation points

Add `logViewerEvent` calls at these four points in the Viewer code:

#### `exam_selected` — when user selects an exam/site combination

Fires when the user picks an exam from the sidebar/selector and criteria are displayed. Captures the exam_id, site_code, and current view mode (indication vs urgency).

```javascript
// In the exam selection handler (wherever the selected exam state changes):
logViewerEvent('exam_selected', {
  exam_id: selectedExam.id,          // e.g. 'ct' or 'ultrasound'
  site_code: selectedSite?.code,     // e.g. 'head', 'chest_abdomen_pelvis'
  event_data: { view_mode: currentViewMode }  // 'indication' or 'urgency'
});
```

#### `copy_action` — when user copies/sends the criteria output

Fires when the user clicks the copy or send button. Captures how many criteria were ticked.

```javascript
// In the copy/send handler:
logViewerEvent('copy_action', {
  exam_id: selectedExam.id,
  site_code: selectedSite?.code,
  event_data: {
    criteria_count: tickedCriteria.length,
    view_mode: currentViewMode
  }
});
```

#### `hp_link_click` — when user clicks a HealthPathways link

Fires when a HealthPathways link is clicked. Captures the item ID and which HP domain was used.

```javascript
// On HealthPathways link click (add to the link's onClick or a delegated handler):
logViewerEvent('hp_link_click', {
  exam_id: selectedExam.id,
  site_code: selectedSite?.code,
  event_data: {
    item_id: criterionItem.id,       // the criterion item that has the HP link
    hp_domain: hpUrl.hostname         // e.g. 'aucklandregion.communityhealthpathways.org'
  }
});
```

#### `guidance_expanded` — when user expands a guidance narrative

This event is for the v5.2 guidanceNarrative expand feature. If that feature hasn't been implemented yet, skip this event for now and add it when the expand/collapse UI is built.

```javascript
// On guidance narrative expand:
logViewerEvent('guidance_expanded', {
  exam_id: selectedExam.id,
  site_code: selectedSite?.code,
  event_data: { item_id: criterionItem.id }
});
```

---

## 4. Admin Tab — "Viewer Usage"

Add a new tab to the admin tool (`public/crr-criteria/admin/index.html`).

### Tab registration

In the `tabs` array in `CRRAdmin`, add between `viewerqa` and `audit`:

```javascript
{id:"viewerusage", label:"Viewer Usage", icon:"📊"},
```

In the content render section, add:

```javascript
{tab==="viewerusage" && <ViewerUsageTab />}
```

### Tab component: `ViewerUsageTab`

Follow the same patterns as `UsageLogTab` and `ViewerQATab`. The tab should have:

#### Filters bar
- Date range (from/to date inputs)
- Event type dropdown: All events, exam_selected, copy_action, hp_link_click, guidance_expanded
- Exam filter dropdown (populated from distinct exam_id values in results)
- Clear button, Refresh button

#### Summary cards (top of tab, above the table)

A stats row showing aggregate numbers from the filtered data:

- **Total events** — count of all events
- **Unique sessions** — count of distinct session_id values
- **Top exam** — the exam_id with the most `exam_selected` events (show as "CT — Head" not the raw ID; use a simple mapping or just show the raw ID)
- **Copy rate** — percentage: (count of `copy_action` events) / (count of `exam_selected` events) × 100, displayed as "X%"
- **HP clicks** — count of `hp_link_click` events

Use the same card grid style as the QA Reviews summary cards (`display: grid`, `gridTemplateColumns: repeat(5, 1fr)`).

#### Events table

Columns:
- **Date** — formatted as other tabs (day month, hour:minute)
- **Session** — truncated session_id (first 12 chars), monospace
- **Event** — event_type, with colour coding:
  - `exam_selected` → navy/blue badge
  - `copy_action` → green badge (pass colour)
  - `hp_link_click` → teal badge
  - `guidance_expanded` → grey badge
- **Exam** — exam_id or '—'
- **Site** — site_code or '—'
- **User** — user_name (bold) + user_role (small, grey) if present; '(anonymous)' in grey if both null
- **Region** — region or '—'
- **IP** — ip_address, monospace, small

Expandable row on click (same pattern as other tabs) showing:
- Full session_id
- User agent
- event_data (rendered as formatted JSON or key-value pairs)
- Full timestamp (ISO)

#### Export CSV button

Same pattern as other tabs. Columns: `id, created_at, session_id, event_type, exam_id, site_code, event_data, region, user_name, user_role, user_agent, ip_address`.

---

## Implementation notes

- The public `POST /crr-api/viewer-event` endpoint does NOT go through Cloudflare Access — it needs to be accessible from the public viewer. Make sure the `run_worker_first` pattern in `wrangler.json` covers this path. The route does NOT have the `/api/admin/` prefix.
- The admin query endpoint `GET /crr-api/api/admin/viewer-events` DOES go through Cloudflare Access (same as other admin endpoints).
- The `ALLOWED_EVENTS` whitelist in the POST handler prevents arbitrary event types being injected.
- `sendBeacon` with a JSON Blob is the correct pattern — it doesn't trigger CORS preflight for same-origin requests and survives page navigation.
- The `getCurrentRegion()` call in `logViewerEvent` should reference whatever existing function or state variable tracks the selected HealthPathways region in the viewer. If no region is selected, send null.
- Session ID persists in sessionStorage (not localStorage) — a new tab or browser restart generates a new session, which is the right granularity for usage analysis.

## Testing

After deployment:
1. Open the Viewer, select an exam — check D1 for an `exam_selected` row
2. Tick some criteria and click copy — check for a `copy_action` row
3. Click a HealthPathways link — check for an `hp_link_click` row
4. Open the Admin tool → Viewer Usage tab — verify events appear with correct data
5. Submit a Viewer QA review with name/role, then select another exam — verify the subsequent `exam_selected` event has the name/role populated
6. Check that the summary cards calculate correctly (especially copy rate)

## Not in scope

- Dashboard visualisations (charts, trends over time) — can be added later if the data proves useful
- Real-time streaming — the admin tab uses standard fetch-on-load, same as other tabs
- Retention/cleanup policy — not needed at pilot scale; revisit if event volume becomes significant
