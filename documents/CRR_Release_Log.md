# CRR Tool Suite — Release Log

Changes are listed newest-first. Each entry covers one deployment cycle.

---

## 2026-05-18 — Viewer Telemetry + Passive/Integration Mode Fixes

**Deployed:** Both workers (`vite-react-template` + `crr-criteria-api`)

### Viewer Usage Telemetry (new feature)
- **D1 schema** — new `viewer_events` table with indexes on session, type, exam, date
- **API** — `POST /api/viewer-event` (public, rate-limited 500/hr/IP) logs exam selections, copy actions, HP link clicks, guidance expansions
- **API** — `GET /api/admin/viewer-events` (CF Access protected) serves the admin tab with from/to/event_type/exam filters, limit 500
- **Viewer** — session ID (`vsess_` prefix) persisted in sessionStorage; `logViewerEvent()` beacon function using `sendBeacon`/`fetch`; identity (name/role) inherited from QA review submission
- **Viewer** — four instrumentation points: exam radio switch, site checkbox tick, copy button, send-to-form button, and all five HealthPathways link clicks
- **Admin** — new "Viewer Usage" tab (between Viewer QA and Usage Log) with filter bar, five summary cards (total events, unique sessions, top exam, copy rate, HP clicks), colour-coded event table, expandable rows, CSV export

### Viewer Passive Mode & Integration Mode Fixes
- Both interactive and passive modes now use the same two-column layout (left: exam selector; right: criteria panel) in all four contexts: standalone interactive, standalone passive, integration interactive, integration passive
- "By indication / By urgency" toggle now works in passive mode
- Passive mode renders items without checkboxes/summary bar/copy button; gateway and emergency banners render identically to interactive mode
- Interactive/Passive toggle added to footer bar in standalone mode; persists via `localStorage`
- URL param `?mode=passive` overrides localStorage

### Integration Mode — Show Selectors
- Integration interactive mode now shows modality radio buttons and exam site checkboxes (previously hidden)
- Sites pre-selected by URL params show a "from referral" badge; badge is purely informational
- Integration passive mode uses the same two-column layout as standalone passive

### Compound Criteria Mockup
- New standalone prototype at `public/crr-criteria/compound-mockup.html` demonstrating AND/OR compound criteria logic with Interactive, Passive, and Triage reference render modes

---

## 2026-05-16 — Admin Tool Major Release

**Deployed:** Both workers

- Admin tool restructured with Releases tab for creating and publishing release notes/announcements
- Release bell added to Criteria Viewer, Triage Advisor, and Admin Tool header — shows unread indicator and modal listing recent releases
- Releases stored in D1 `releases` table with draft/published workflow
- Public API: `GET /api/releases`, `GET /api/releases/latest-id`
- Admin API: `GET/POST/PUT/DELETE /api/admin/releases`
- Shared `release-bell.js` loaded from `/crr-criteria/shared/release-bell.js`

---

## Earlier history

Prior to 2026-05-16 the project did not maintain a structured release log. Key milestones from git history:

- **Triage Clinical Review Brief** — Triage Advisor prompt and clinical logic updates
- **API and Cloudflare infrastructure fixes** — `run_worker_first` route pattern, ASSETS binding, same-origin proxy wiring
- **Admin Tool v1.5.x series** — admin key persistence, Safari compat fixes, region management, version control, PDF import (since deprecated), QA review tabs, usage log tab, audit log
- **Criteria Viewer** — two-column layout, HealthPathways regional localisation, QA feedback modal, search, passive/interactive modes, integration URL params, postMessage output
- **Triage Advisor** — PII pipeline, AI assessment via Anthropic API, usage logging, QA reviews, paediatric mode, model comparison
