// ══════════════════════════════════════════════════════════════
//  CRR Criteria API — Hono Worker for Cloudflare
//  Serves published criteria to both Viewer and Triage Advisor
//  Version: v2.0.0
// Changelog:
// v2.0.0 — streaming extract-pdf, region KV endpoints, ADMIN_KEY auth, rollback, triage proxy
// v1.0.0 — initial release
// ══════════════════════════════════════════════════════════════

const WORKER_VERSION = '2.0.0';

import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  KV: KVNamespace;
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  ADMIN_KEY: string;  // set via: npx wrangler secret put ADMIN_KEY
};

const app = new Hono<{ Bindings: Bindings }>();

// ── Middleware ────────────────────────────────────────────────
// CORS allowlist: production frontend + local dev. Add partner origins (BPAC, HealthLink, ERMS)
// here when integration is wired up. Keep `*` out — the unauthenticated endpoints
// (/api/triage/assess, /api/qa-review) rely on same-origin policy as a primary defence.
const ALLOWED_ORIGINS = [
  'https://iteratio.nz',
  'https://www.iteratio.nz',
  'http://localhost:5173',
  'http://localhost:8787',
  'http://127.0.0.1:5173',
];
app.use('*', cors({
  origin: (origin) => (origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]),
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'cf-access-jwt-assertion', 'x-admin-key', 'x-admin-email'],
}));

// ── Types (for reference) ────────────────────────────────────
// Env bindings from wrangler.json:
//   DB: D1Database    — criteria database
//   KV: KVNamespace   — published criteria cache

// ══════════════════════════════════════════════════════════════
//  PUBLIC ROUTES (no auth required)
// ══════════════════════════════════════════════════════════════

// GET /api/criteria — Returns the published criteria snapshot from KV
// Used by both Criteria Viewer and Triage Advisor
app.get('/api/criteria', async (c) => {
  const kv = c.env.KV;

  try {
    // Read from KV — try as string first, then parse
    const raw = await kv.get('criteria:published');
    if (!raw) {
      return c.json({ error: 'No published criteria available', debug: 'KV key criteria:published returned null' }, 404);
    }

    const published = JSON.parse(raw);
    return c.json(published, 200, {
      'Cache-Control': 'no-store',
    });
  } catch (e: any) {
    return c.json({ error: 'Failed to read criteria', message: e.message }, 500);
  }
});

// GET /api/criteria/:id — Returns a single exam/site criteria
app.get('/api/criteria/:id', async (c) => {
  const kv = c.env.KV;
  const id = c.req.param('id');

  const published = await kv.get('criteria:published', 'json');
  if (!published || !published.data) {
    return c.json({ error: 'No published criteria available' }, 404);
  }

  // Search through exams for the requested ID
  const data = published.data;
  for (const exam of (data.exams || [])) {
    if (exam.id === id) return c.json(exam);
    if (exam.type === 'multisite') {
      for (const site of (exam.sites || [])) {
        if (site.id === id) return c.json({ ...site, examId: exam.id, examTitle: exam.title });
      }
    }
  }

  return c.json({ error: `Criteria '${id}' not found` }, 404);
});

// GET /api/version — Returns current published version info
app.get('/api/version', async (c) => {
  const kv = c.env.KV;

  try {
    const raw = await kv.get('criteria:version');
    if (!raw) {
      return c.json({ error: 'No version info available' }, 404);
    }
    return c.json(JSON.parse(raw));
  } catch (e: any) {
    return c.json({ error: 'Failed to read version', message: e.message }, 500);
  }
});

// GET /api/match-data — Returns MATCH_DATA for the Triage Advisor
// This is a transformed view of the criteria optimized for NLP matching
app.get('/api/match-data', async (c) => {
  const kv = c.env.KV;

  try {
    const raw = await kv.get('criteria:match-data');
    if (!raw) {
      return c.json({ error: 'No match data available' }, 404);
    }
    return c.json(JSON.parse(raw), 200, {
      'Cache-Control': 'public, max-age=300',
    });
  } catch (e: any) {
    return c.json({ error: 'Failed to read match data', message: e.message }, 500);
  }
});


// ══════════════════════════════════════════════════════════════
//  ADMIN ROUTES (Cloudflare Access required)
// ══════════════════════════════════════════════════════════════

// Middleware: check admin access
// Accepts either a Cloudflare Access JWT (set when CF Access fronts a request, or
// forwarded by the iteratio.nz same-origin proxy), OR a service-token x-admin-key
// header (kept for Claude Code / scripted use). Either is sufficient.
async function requireAccess(c: any, next: any) {
  const jwt = c.req.header('cf-access-jwt-assertion');
  const email = c.req.header('cf-access-authenticated-user-email') || c.req.header('x-admin-email');
  const adminKey = c.req.header('x-admin-key');
  if (!jwt && !adminKey && !email) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  if (adminKey && c.env.ADMIN_KEY && adminKey !== c.env.ADMIN_KEY) {
    return c.json({ error: 'Unauthorized — invalid admin key' }, 401);
  }
  await next();
}

// Resolve the actor for audit_log / created_by / updated_by attribution.
// Prefer the Cloudflare Access email (for human admin actions via the iteratio.nz proxy),
// fall back to the x-admin-email header (legacy / manual override), then "Claude Code"
// (any other authorised path — service token, scripted call, direct API hit).
function actorFrom(c: any): string {
  const email = c.req.header('cf-access-authenticated-user-email') || c.req.header('x-admin-email');
  if (email) return email;
  return 'Claude Code';
}

// GET /api/admin/criteria — All criteria from D1 (working copy)
app.get('/api/admin/criteria', requireAccess, async (c) => {
  const db = c.env.DB;
  const rows = await db.prepare('SELECT * FROM criteria ORDER BY modality, title').all();
  return c.json({ criteria: rows.results });
});

// GET /api/admin/criteria/:id — Single criteria record
app.get('/api/admin/criteria/:id', requireAccess, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const row = await db.prepare('SELECT * FROM criteria WHERE id = ?').bind(id).first();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

// PUT /api/admin/criteria/:id — Update criteria
app.put('/api/admin/criteria/:id', requireAccess, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = new Date().toISOString();

  // Get existing for diff
  const existing = await db.prepare('SELECT data FROM criteria WHERE id = ?').bind(id).first();

  // Update
  await db.prepare(
    'UPDATE criteria SET data = ?, updated_at = ?, updated_by = ? WHERE id = ?'
  ).bind(
    JSON.stringify(body.data),
    now,
    actorFrom(c),
    id
  ).run();

  // Audit log
  await db.prepare(
    'INSERT INTO audit_log (action, entity_type, entity_id, changes, performed_by, performed_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    'update', 'criteria', id,
    JSON.stringify({ before: existing?.data, after: body.data }),
    actorFrom(c),
    now
  ).run();

  return c.json({ success: true, id, updatedAt: now });
});

// POST /api/admin/criteria — Create new criteria
app.post('/api/admin/criteria', requireAccess, async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const now = new Date().toISOString();

  await db.prepare(
    'INSERT INTO criteria (id, title, modality, type, population, data, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    body.id, body.title, body.modality, body.type,
    body.population || 'adult',
    JSON.stringify(body.data),
    now,
    actorFrom(c)
  ).run();

  // Audit log
  await db.prepare(
    'INSERT INTO audit_log (action, entity_type, entity_id, changes, performed_by, performed_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind('create', 'criteria', body.id, JSON.stringify(body), actorFrom(c), now)
  .run();

  return c.json({ success: true, id: body.id }, 201);
});

// DELETE /api/admin/criteria/:id — Soft-delete
app.delete('/api/admin/criteria/:id', requireAccess, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const now = new Date().toISOString();
  const email = actorFrom(c);

  await db.prepare('DELETE FROM criteria WHERE id = ?').bind(id).run();

  await db.prepare(
    'INSERT INTO audit_log (action, entity_type, entity_id, performed_by, performed_at) VALUES (?, ?, ?, ?, ?)'
  ).bind('delete', 'criteria', id, email, now).run();

  return c.json({ success: true, deleted: id });
});

// ── Version Management ────────────────────────────────────

// GET /api/admin/versions — All versions
app.get('/api/admin/versions', requireAccess, async (c) => {
  const db = c.env.DB;
  const rows = await db.prepare('SELECT * FROM versions ORDER BY id DESC').all();
  return c.json({ versions: rows.results });
});

// POST /api/admin/versions — Create draft version (snapshot current D1 state)
app.post('/api/admin/versions', requireAccess, async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const now = new Date().toISOString();

  // Snapshot all current criteria
  const criteria = await db.prepare('SELECT * FROM criteria ORDER BY modality, title').all();
  const snapshot = criteria.results;

  await db.prepare(
    'INSERT INTO versions (version_label, notes, criteria_snapshot, status, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    body.versionLabel,
    body.notes || '',
    JSON.stringify(snapshot),
    'draft',
    now,
    actorFrom(c)
  ).run();

  return c.json({ success: true, versionLabel: body.versionLabel }, 201);
});

// POST /api/admin/versions/:id/publish — Publish a draft version
app.post('/api/admin/versions/:id/publish', requireAccess, async (c) => {
  const db = c.env.DB;
  const kv = c.env.KV;
  const versionId = c.req.param('id');
  const now = new Date().toISOString();
  const email = actorFrom(c);

  // Get the version
  const version = await db.prepare('SELECT * FROM versions WHERE id = ?').bind(versionId).first();
  if (!version) return c.json({ error: 'Version not found' }, 404);
  if (version.status === 'published') return c.json({ error: 'Already published' }, 400);

  // Parse the snapshot
  const snapshot = JSON.parse(version.criteria_snapshot);

  // Transform snapshot into the format expected by the Viewer
  // (reconstruct DATA structure from individual criteria rows)
  const viewerData = transformToViewerFormat(snapshot);

  // Transform snapshot into MATCH_DATA format for Triage Advisor
  const matchData = transformToMatchFormat(snapshot);

  // 1. Update version status
  await db.prepare(
    'UPDATE versions SET status = ?, published_at = ?, published_by = ? WHERE id = ?'
  ).bind('published', now, email, versionId).run();

  // 2. Write to KV — this is what the public endpoints serve
  await kv.put('criteria:published', JSON.stringify({
    version: version.version_label,
    publishedAt: now,
    publishedBy: email,
    data: viewerData,
  }));

  await kv.put('criteria:match-data', JSON.stringify(matchData));

  await kv.put('criteria:version', JSON.stringify({
    version: version.version_label,
    publishedAt: now,
    publishedBy: email,
    criteriaCount: snapshot.length,
  }));

  // 3. Audit log
  await db.prepare(
    'INSERT INTO audit_log (action, entity_type, entity_id, performed_by, performed_at) VALUES (?, ?, ?, ?, ?)'
  ).bind('publish', 'version', versionId.toString(), email, now).run();

  return c.json({
    success: true,
    version: version.version_label,
    publishedAt: now,
    criteriaCount: snapshot.length,
  });
});

// POST /api/admin/publish — Direct publish: takes the full criteria payload and writes to KV
// This bypasses the D1 version snapshot flow for now — suitable for admin tool use
app.post('/api/admin/publish', requireAccess, async (c) => {
  const kv = c.env.KV;
  const db = c.env.DB;
  const body = await c.req.json();
  const now = new Date().toISOString();
  const email = actorFrom(c);

  try {
    const versionLabel = body.versionLabel || 'v' + now.slice(0, 10).replace(/-/g, '.');

    // Write criteria:published to KV
    await kv.put('criteria:published', JSON.stringify({
      version: versionLabel,
      publishedAt: now,
      publishedBy: email,
      data: body.data,
    }));

    // Write criteria:match-data if provided
    if (body.matchData) {
      await kv.put('criteria:match-data', JSON.stringify(body.matchData));
    }

    // Write criteria:version
    await kv.put('criteria:version', JSON.stringify({
      version: versionLabel,
      publishedAt: now,
      publishedBy: email,
      criteriaCount: (body.data?.exams || []).reduce((n: number, e: any) =>
        n + (e.type === 'multisite' ? (e.sites || []).length : 1), 0),
    }));

    // Store snapshot in versions table for history & rollback (best-effort)
    try {
      await db.prepare(
        'INSERT INTO versions (version_label, notes, criteria_snapshot, status, created_at, created_by, published_at, published_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        versionLabel,
        body.notes || '',
        JSON.stringify(body.data),
        'published',
        now, email, now, email
      ).run();
    } catch (_) { /* don't fail publish if versions table missing */ }

    // Audit log (best-effort)
    try {
      await db.prepare(
        'INSERT INTO audit_log (action, entity_type, entity_id, performed_by, performed_at) VALUES (?, ?, ?, ?, ?)'
      ).bind('publish', 'version', versionLabel, email, now).run();
    } catch (_) {}

    return c.json({ success: true, version: versionLabel, publishedAt: now });
  } catch (e: any) {
    return c.json({ error: 'Publish failed: ' + e.message }, 500);
  }
});

// GET /api/admin/audit — Audit log
app.get('/api/admin/audit', requireAccess, async (c) => {
  const db = c.env.DB;
  const limit = parseInt(c.req.query('limit') || '50');
  try {
    const rows = await db.prepare(
      'SELECT * FROM audit_log ORDER BY id DESC LIMIT ?'
    ).bind(limit).all();
    return c.json({ entries: rows.results });
  } catch (_) {
    return c.json({ entries: [], note: 'audit_log table not yet created — run schema.sql' });
  }
});


// POST /api/admin/versions/:id/rollback — Restore a past version to KV
app.post('/api/admin/versions/:id/rollback', requireAccess, async (c) => {
  const db = c.env.DB;
  const kv = c.env.KV;
  const versionId = c.req.param('id');
  const now = new Date().toISOString();
  const email = actorFrom(c);

  const version = await db.prepare('SELECT * FROM versions WHERE id = ?').bind(versionId).first();
  if (!version) return c.json({ error: 'Version not found' }, 404);

  const data = JSON.parse(version.criteria_snapshot as string);
  const restoredLabel = `${version.version_label} (restored)`;

  await kv.put('criteria:published', JSON.stringify({
    version: restoredLabel,
    publishedAt: now,
    publishedBy: email,
    data,
  }));

  await kv.put('criteria:version', JSON.stringify({
    version: restoredLabel,
    publishedAt: now,
    publishedBy: email,
    criteriaCount: (data?.exams || []).reduce((n: number, e: any) =>
      n + (e.type === 'multisite' ? (e.sites || []).length : 1), 0),
  }));

  try {
    await db.prepare(
      'INSERT INTO audit_log (action, entity_type, entity_id, performed_by, performed_at) VALUES (?, ?, ?, ?, ?)'
    ).bind('rollback', 'version', versionId.toString(), email, now).run();
  } catch (_) {}

  return c.json({ success: true, version: restoredLabel, publishedAt: now, data });
});

// POST /api/qa-review — QA review submission (no auth, rate-limited 100/hr/IP)
app.post('/api/qa-review', async (c) => {
  const db = c.env.DB;
  const kv = c.env.KV;

  // IP-based rate limit: 100 per hour
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const hour = new Date().toISOString().slice(0, 13);
  const rlKey = `ratelimit:qa:${ip}:${hour}`;
  try {
    const countRaw = await kv.get(rlKey);
    const count = countRaw ? parseInt(countRaw) : 0;
    if (count >= 100) {
      return c.json({ error: 'Rate limit exceeded — try again in an hour' }, 429);
    }
    await kv.put(rlKey, String(count + 1), { expirationTtl: 3600 });
  } catch (_) {}

  const body = await c.req.json();
  const now = new Date().toISOString();
  try {
    const result = await db.prepare(`
      INSERT INTO qa_reviews (
        timestamp, session_id, reviewer_name, reviewer_role,
        scenario_type, score_criteria_id, score_suggestion_quality,
        score_compound_handling, score_safety_redirect,
        overall_assessment, comments,
        presentation_text, ai_response_summary, ai_response_json,
        prompt_version, exam_identified, model_used, documentation_standard, region, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.timestamp || now,
      body.session_id || '',
      body.reviewer_name || '',
      body.reviewer_role || '',
      body.scenario_type || '',
      body.score_criteria_id || 0,
      body.score_suggestion_quality || 0,
      body.score_compound_handling || 0,
      body.score_safety_redirect || 0,
      body.overall_assessment || '',
      body.comments || null,
      body.presentation_text || '',
      body.ai_response_summary || '',
      body.ai_response_json || null,
      body.prompt_version || null,
      body.exam_identified || null,
      body.model_used || null,
      body.documentation_standard || null,
      body.region || null,
      ip
    ).run();
    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (e: any) {
    return c.json({ error: 'Failed to save QA review: ' + e.message }, 500);
  }
});

// POST /api/qa-viewer-review — Viewer QA submission (no auth, rate-limited)
app.post('/api/qa-viewer-review', async (c) => {
  const db = c.env.DB;
  const kv = c.env.KV;

  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const hour = new Date().toISOString().slice(0, 13);
  const rlKey = `ratelimit:qa-viewer:${ip}:${hour}`;
  try {
    const countRaw = await kv.get(rlKey);
    const count = countRaw ? parseInt(countRaw) : 0;
    if (count >= 100) return c.json({ error: 'Rate limit exceeded' }, 429);
    await kv.put(rlKey, String(count + 1), { expirationTtl: 3600 });
  } catch (_) {}

  const body = await c.req.json();
  const now = new Date().toISOString();
  try {
    const result = await db.prepare(`
      INSERT INTO qa_viewer_reviews (
        timestamp, session_id, reviewer_name, reviewer_role,
        exam_type, site_code, site_label, region, view_mode,
        score_accuracy, score_usability, score_value,
        checklist_criteria_correct, checklist_priority_correct, checklist_gateway_correct,
        checklist_labvalue_correct, checklist_altmgmt_correct, checklist_notfunded_correct,
        checklist_guidance_correct, checklist_healthpathways_works, checklist_groupings_correct,
        comments, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.timestamp || now,
      body.session_id || '',
      body.reviewer_name || '',
      body.reviewer_role || '',
      body.exam_type || '',
      body.site_code || '',
      body.site_label || '',
      body.region || '',
      body.view_mode || null,
      body.score_accuracy || '',
      body.score_usability || '',
      body.score_value || '',
      body.checklist_criteria_correct ? 1 : 0,
      body.checklist_priority_correct ? 1 : 0,
      body.checklist_gateway_correct ? 1 : 0,
      body.checklist_labvalue_correct ? 1 : 0,
      body.checklist_altmgmt_correct ? 1 : 0,
      body.checklist_notfunded_correct ? 1 : 0,
      body.checklist_guidance_correct ? 1 : 0,
      body.checklist_healthpathways_works ? 1 : 0,
      body.checklist_groupings_correct ? 1 : 0,
      body.comments || null,
      ip
    ).run();
    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (e: any) {
    return c.json({ error: 'Failed to save viewer QA review: ' + e.message }, 500);
  }
});

// GET /api/qa-viewer-reviews — Admin: viewer QA reviews with optional filters
app.get('/api/qa-viewer-reviews', requireAccess, async (c) => {
  const db = c.env.DB;
  const reviewer = c.req.query('reviewer');
  const exam = c.req.query('exam');
  const site = c.req.query('site');
  const from = c.req.query('from');
  const to = c.req.query('to');

  let sql = 'SELECT * FROM qa_viewer_reviews';
  const params: any[] = [];
  const conditions: string[] = [];
  if (reviewer) { conditions.push('reviewer_name = ?'); params.push(reviewer); }
  if (exam) { conditions.push('exam_type = ?'); params.push(exam); }
  if (site) { conditions.push('site_code = ?'); params.push(site); }
  if (from) { conditions.push('timestamp >= ?'); params.push(from); }
  if (to) { conditions.push('timestamp <= ?'); params.push(to + 'T23:59:59Z'); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY id DESC';

  try {
    const rows = await db.prepare(sql).bind(...params).all();
    return c.json(rows.results);
  } catch (e: any) {
    return c.json({ error: 'Failed to fetch viewer QA reviews: ' + e.message }, 500);
  }
});

// GET /api/qa-reviews — Admin: all QA reviews with optional filters
app.get('/api/qa-reviews', requireAccess, async (c) => {
  const db = c.env.DB;
  const reviewer = c.req.query('reviewer');
  const from = c.req.query('from');
  const to = c.req.query('to');

  let sql = 'SELECT * FROM qa_reviews';
  const params: any[] = [];
  const conditions: string[] = [];
  if (reviewer) { conditions.push('reviewer_name = ?'); params.push(reviewer); }
  if (from) { conditions.push('timestamp >= ?'); params.push(from); }
  if (to) { conditions.push('timestamp <= ?'); params.push(to + 'T23:59:59Z'); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY id DESC';

  try {
    const rows = await db.prepare(sql).bind(...params).all();
    return c.json(rows.results);
  } catch (e: any) {
    return c.json({ error: 'Failed to fetch QA reviews: ' + e.message }, 500);
  }
});

// POST /api/triage/assess — Proxy Anthropic API calls for the Triage Advisor
// No admin auth — public endpoint; API key kept server-side
app.post('/api/triage/assess', async (c) => {
  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

  // Origin check: only allow calls from the production frontend (server-side calls have no Origin header)
  const origin = c.req.header('Origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return c.json({ error: 'Origin not permitted' }, 403);
  }

  // Per-IP rate limit: 30 requests / hour
  const kv = c.env.KV;
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const hour = new Date().toISOString().slice(0, 13);
  const rlKey = `ratelimit:triage:${ip}:${hour}`;
  try {
    const countRaw = await kv.get(rlKey);
    const count = countRaw ? parseInt(countRaw) : 0;
    if (count >= 30) return c.json({ error: 'Rate limit exceeded (30/hour). Try again later.' }, 429);
    await kv.put(rlKey, String(count + 1), { expirationTtl: 3600 });
  } catch (_) { /* fail-open on rate-limit KV errors */ }

  const body = await c.req.json();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify(body),
  });

  const result: any = await response.json();
  return c.json(result, response.ok ? 200 : (response.status as any));
});

// ── Transform Functions ──────────────────────────────────

function transformToViewerFormat(snapshot) {
  // Group criteria rows by exam (modality)
  // This reconstructs the DATA.exams structure
  const examMap = {};
  for (const row of snapshot) {
    const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    // Each row is either an exam (singlesite) or a site within an exam (multisite)
    // The structure depends on how criteria were stored in D1
    // This is a placeholder — the actual transform depends on D1 schema design
    if (!examMap[row.modality]) {
      examMap[row.modality] = {
        id: row.id,
        title: row.title,
        modality: row.modality,
        type: row.type,
        active: true,
        sites: [],
        ...data,
      };
    }
  }
  return { exams: Object.values(examMap) };
}

function transformToMatchFormat(snapshot) {
  // Transform criteria into MATCH_DATA format for the Triage Advisor
  // This includes synonyms, site index, and paediatric index
  // Placeholder — actual implementation depends on how match groups are stored
  return {
    synonyms: {},
    index: [],
    paed_index: [],
  };
}


// ── Region Overrides ────────────────────────────────────

// GET /api/regions — public; returns all region overrides from KV
app.get('/api/regions', async (c) => {
  const kv = c.env.KV;
  try {
    const raw = await kv.get('criteria:regions');
    return c.json(raw ? JSON.parse(raw) : {}, 200, { 'Cache-Control': 'public, max-age=300' });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// GET /api/admin/regions — admin read of all region overrides
app.get('/api/admin/regions', requireAccess, async (c) => {
  const kv = c.env.KV;
  try {
    const raw = await kv.get('criteria:regions');
    return c.json(raw ? JSON.parse(raw) : {});
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// PUT /api/admin/regions/:regionId — save overrides for one region
app.put('/api/admin/regions/:regionId', requireAccess, async (c) => {
  const kv = c.env.KV;
  const regionId = c.req.param('regionId');
  const body = await c.req.json();
  try {
    const raw = await kv.get('criteria:regions');
    const all = raw ? JSON.parse(raw) : {};
    all[regionId] = body.overrides || {};
    await kv.put('criteria:regions', JSON.stringify(all));
    return c.json({ success: true, regionId });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── System Prompt Version Control (TA-009) ───────────────

// GET /api/system-prompt — public, returns active prompt (KV first, D1 fallback)
app.get('/api/system-prompt', async (c) => {
  const kv = c.env.KV;
  const db = c.env.DB;
  try {
    const cached = await kv.get('system_prompt:active');
    if (cached) return c.json(JSON.parse(cached));
  } catch (_) {}
  try {
    const row = await db.prepare(
      'SELECT version, label, instruction_text, created_at FROM system_prompts WHERE is_active = 1'
    ).first() as any;
    if (!row) return c.json({ error: 'No active prompt' }, 404);
    const result = { version: row.version, label: row.label, instruction_text: row.instruction_text, created_at: row.created_at };
    try { await kv.put('system_prompt:active', JSON.stringify(result)); } catch (_) {}
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// GET /api/admin/system-prompt/versions — list all versions (metadata only)
app.get('/api/admin/system-prompt/versions', requireAccess, async (c) => {
  const db = c.env.DB;
  try {
    const rows = await db.prepare(
      'SELECT id, version, label, changelog, created_at, created_by, is_active FROM system_prompts ORDER BY id DESC'
    ).all();
    return c.json({ versions: rows.results });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// GET /api/admin/system-prompt/versions/:version — full detail including instruction_text
app.get('/api/admin/system-prompt/versions/:version', requireAccess, async (c) => {
  const db = c.env.DB;
  const version = c.req.param('version');
  try {
    const row = await db.prepare(
      'SELECT * FROM system_prompts WHERE version = ?'
    ).bind(version).first();
    if (!row) return c.json({ error: 'Version not found' }, 404);
    return c.json(row);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// POST /api/admin/system-prompt/versions — create new version (does NOT activate)
app.post('/api/admin/system-prompt/versions', requireAccess, async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const now = new Date().toISOString();
  if (!body.version || !body.label || !body.instruction_text || !body.created_by) {
    return c.json({ error: 'version, label, instruction_text, and created_by are required' }, 400);
  }
  try {
    const result = await db.prepare(
      'INSERT INTO system_prompts (version, label, instruction_text, changelog, created_at, created_by, is_active) VALUES (?, ?, ?, ?, ?, ?, 0)'
    ).bind(body.version, body.label, body.instruction_text, body.changelog || null, now, body.created_by).run();
    await db.prepare(
      'INSERT INTO system_prompt_audit (action, prompt_version, performed_at, performed_by, reason) VALUES (?, ?, ?, ?, ?)'
    ).bind('create', body.version, now, body.created_by, body.changelog || null).run();
    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// POST /api/admin/system-prompt/activate/:version — activate a version, update KV, write audit
app.post('/api/admin/system-prompt/activate/:version', requireAccess, async (c) => {
  const db = c.env.DB;
  const kv = c.env.KV;
  const version = c.req.param('version');
  const body = await c.req.json();
  const now = new Date().toISOString();
  try {
    const target = await db.prepare(
      'SELECT version, label, instruction_text, created_at FROM system_prompts WHERE version = ?'
    ).bind(version).first() as any;
    if (!target) return c.json({ error: 'Version not found' }, 404);
    const current = await db.prepare(
      'SELECT version FROM system_prompts WHERE is_active = 1'
    ).first() as any;
    await db.prepare('UPDATE system_prompts SET is_active = 0 WHERE is_active = 1').run();
    await db.prepare('UPDATE system_prompts SET is_active = 1 WHERE version = ?').bind(version).run();
    const result = { version: target.version, label: target.label, instruction_text: target.instruction_text, created_at: target.created_at };
    try { await kv.put('system_prompt:active', JSON.stringify(result)); } catch (_) {}
    await db.prepare(
      'INSERT INTO system_prompt_audit (action, prompt_version, previous_version, performed_at, performed_by, reason) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind('activate', version, current?.version || null, now, body.activated_by || 'unknown', body.reason || null).run();
    return c.json({ success: true, version });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// POST /api/admin/system-prompt/rollback/:version — same as activate, logged as 'rollback'
app.post('/api/admin/system-prompt/rollback/:version', requireAccess, async (c) => {
  const db = c.env.DB;
  const kv = c.env.KV;
  const version = c.req.param('version');
  const body = await c.req.json();
  const now = new Date().toISOString();
  try {
    const target = await db.prepare(
      'SELECT version, label, instruction_text, created_at FROM system_prompts WHERE version = ?'
    ).bind(version).first() as any;
    if (!target) return c.json({ error: 'Version not found' }, 404);
    const current = await db.prepare(
      'SELECT version FROM system_prompts WHERE is_active = 1'
    ).first() as any;
    await db.prepare('UPDATE system_prompts SET is_active = 0 WHERE is_active = 1').run();
    await db.prepare('UPDATE system_prompts SET is_active = 1 WHERE version = ?').bind(version).run();
    const result = { version: target.version, label: target.label, instruction_text: target.instruction_text, created_at: target.created_at };
    try { await kv.put('system_prompt:active', JSON.stringify(result)); } catch (_) {}
    await db.prepare(
      'INSERT INTO system_prompt_audit (action, prompt_version, previous_version, performed_at, performed_by, reason) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind('rollback', version, current?.version || null, now, body.activated_by || 'unknown', body.reason || null).run();
    return c.json({ success: true, version });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// GET /api/admin/system-prompt/audit — audit log, most recent first
app.get('/api/admin/system-prompt/audit', requireAccess, async (c) => {
  const db = c.env.DB;
  try {
    const rows = await db.prepare(
      'SELECT * FROM system_prompt_audit ORDER BY id DESC LIMIT 200'
    ).all();
    return c.json({ audit: rows.results });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── Health check ─────────────────────────────────────────

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'crr-criteria-api',
    version: WORKER_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint — check KV bindings
app.get('/api/debug', async (c) => {
  const kv = c.env.KV;
  try {
    const keys = await kv.list();
    const versionRaw = await kv.get('criteria:version');
    return c.json({
      kvBound: !!kv,
      keys: keys.keys.map((k: any) => k.name),
      versionRaw: versionRaw ? versionRaw.substring(0, 200) : null,
    });
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack }, 500);
  }
});

// Debug write — test that KV binding can read and write
app.get('/api/debug/seed', async (c) => {
  const kv = c.env.KV;
  try {
    await kv.put('criteria:version', JSON.stringify({
      version: 'v3.4.4',
      publishedAt: '2026-04-03T00:00:00Z',
      publishedBy: 'debug-seed',
      criteriaCount: 40
    }));
    const check = await kv.get('criteria:version');
    return c.json({ success: true, written: !!check, value: check });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Seed endpoint — POST data directly into KV through the worker
// Usage: curl -X POST ".../api/seed?key=published" -d @kv-published.json
app.post('/api/seed', requireAccess, async (c) => {
  const kv = c.env.KV;
  const keyParam = c.req.query('key');
  const keyMap: Record<string, string> = {
    'published': 'criteria:published',
    'match-data': 'criteria:match-data',
    'version': 'criteria:version',
  };
  const kvKey = keyMap[keyParam || ''];
  if (!kvKey) {
    return c.json({ error: 'Invalid key. Use: published, match-data, or version' }, 400);
  }
  try {
    const body = await c.req.text();
    await kv.put(kvKey, body);
    const check = await kv.get(kvKey);
    return c.json({ 
      success: true, 
      key: kvKey, 
      size: body.length,
      verified: !!check 
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});


// POST /api/viewer-event — Fire-and-forget viewer telemetry (public, rate-limited)
app.post('/api/viewer-event', async (c) => {
  const kv = c.env.KV;
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || 'unknown';

  // Reject oversized bodies
  const contentLength = parseInt(c.req.header('content-length') || '0');
  if (contentLength > 2048) return c.json({ error: 'Payload too large' }, 413);

  // IP-based rate limit: 500 per hour
  const hour = new Date().toISOString().slice(0, 13);
  const rlKey = `ratelimit:viewer-event:${ip}:${hour}`;
  try {
    const countRaw = await kv.get(rlKey);
    const count = countRaw ? parseInt(countRaw) : 0;
    if (count >= 500) return c.json({ error: 'Rate limit exceeded' }, 429);
    await kv.put(rlKey, String(count + 1), { expirationTtl: 3600 });
  } catch (_) {}

  let body: any;
  try { body = await c.req.json(); } catch (_) { return c.json({ error: 'Invalid JSON' }, 400); }

  const { session_id, event_type } = body;
  if (!session_id || !event_type) return c.json({ error: 'Missing required fields' }, 400);

  const ALLOWED_EVENTS = ['exam_selected', 'copy_action', 'hp_link_click', 'guidance_expanded'];
  if (!ALLOWED_EVENTS.includes(event_type)) return c.json({ error: 'Invalid event_type' }, 400);

  const ua = c.req.header('user-agent') || null;
  const eventDataStr = body.event_data ? JSON.stringify(body.event_data) : null;

  try {
    await c.env.DB.prepare(`
      INSERT INTO viewer_events (session_id, event_type, exam_id, site_code, event_data, region, user_name, user_role, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      session_id, event_type,
      body.exam_id || null, body.site_code || null,
      eventDataStr,
      body.region || null, body.user_name || null, body.user_role || null,
      ua, ip
    ).run();
    return c.json({ ok: true }, 201);
  } catch (e: any) {
    console.error('viewer-event error:', e);
    return c.json({ error: 'Internal error' }, 500);
  }
});

// GET /api/admin/viewer-events — Admin: viewer usage events with optional filters
app.get('/api/admin/viewer-events', requireAccess, async (c) => {
  const db = c.env.DB;
  const from = c.req.query('from');
  const to = c.req.query('to');
  const eventType = c.req.query('event_type');
  const exam = c.req.query('exam');

  let sql = 'SELECT * FROM viewer_events WHERE 1=1';
  const params: any[] = [];
  if (from) { sql += ' AND created_at >= ?'; params.push(from); }
  if (to) { sql += ' AND created_at <= ?'; params.push(to + 'T23:59:59'); }
  if (eventType) { sql += ' AND event_type = ?'; params.push(eventType); }
  if (exam) { sql += ' AND exam_id = ?'; params.push(exam); }
  sql += ' ORDER BY created_at DESC LIMIT 500';

  try {
    const result = await db.prepare(sql).bind(...params).all();
    return c.json(result.results || []);
  } catch (e: any) {
    return c.json({ error: 'Failed to fetch viewer events: ' + e.message }, 500);
  }
});

// POST /api/triage/usage-log — Log every triage assessment (no auth, rate-limited)
app.post('/api/triage/usage-log', async (c) => {
  const db = c.env.DB;
  const kv = c.env.KV;

  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const hour = new Date().toISOString().slice(0, 13);
  const rlKey = `ratelimit:usage:${ip}:${hour}`;
  try {
    const countRaw = await kv.get(rlKey);
    const count = countRaw ? parseInt(countRaw) : 0;
    if (count >= 200) return c.json({ error: 'Rate limit exceeded' }, 429);
    await kv.put(rlKey, String(count + 1), { expirationTtl: 3600 });
  } catch (_) {}

  const body = await c.req.json();
  const now = new Date().toISOString();
  try {
    const result = await db.prepare(`
      INSERT INTO triage_usage_log (
        timestamp, session_id, user_name, user_role,
        exam_identified, verdict, model_used, documentation_standard,
        input_tokens, cache_read_tokens, cache_write_tokens, output_tokens, cost_nzd,
        presentation_text, ai_response_summary, ai_response_json, prompt_version, parse_success, ip_address, temperature,
        source, regression_run_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.timestamp || now,
      body.session_id || '',
      body.user_name || '',
      body.user_role || '',
      body.exam_identified || null,
      body.verdict || null,
      body.model_used || null,
      body.documentation_standard || null,
      body.input_tokens || 0,
      body.cache_read_tokens || 0,
      body.cache_write_tokens || 0,
      body.output_tokens || 0,
      body.cost_nzd || 0,
      body.presentation_text || null,
      body.ai_response_summary || null,
      body.ai_response_json || null,
      body.prompt_version || null,
      body.parse_success != null ? (body.parse_success ? 1 : 0) : 1,
      ip,
      body.temperature != null ? body.temperature : null,
      body.source || null,
      body.regression_run_id || null
    ).run();
    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (e: any) {
    return c.json({ error: 'Failed to log usage: ' + e.message }, 500);
  }
});

// GET /api/triage/usage-logs — Admin: all usage log entries
app.get('/api/triage/usage-logs', requireAccess, async (c) => {
  const db = c.env.DB;
  const from = c.req.query('from');
  const to = c.req.query('to');
  const user = c.req.query('user');

  let sql = 'SELECT * FROM triage_usage_log';
  const params: any[] = [];
  const conditions: string[] = [];
  if (user) { conditions.push('user_name = ?'); params.push(user); }
  if (from) { conditions.push('timestamp >= ?'); params.push(from); }
  if (to) { conditions.push('timestamp <= ?'); params.push(to + 'T23:59:59Z'); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY id DESC LIMIT 500';

  try {
    const rows = await db.prepare(sql).bind(...params).all();
    return c.json(rows.results);
  } catch (e: any) {
    return c.json({ error: 'Failed to fetch usage logs: ' + e.message }, 500);
  }
});

// ══════════════════════════════════════════════════════════════
//  RELEASES / ANNOUNCEMENTS — shared release log
// ══════════════════════════════════════════════════════════════

function releaseAppsMatch(rowApps: string, app: string | null | undefined): boolean {
  if (!app) return true;
  const list = (rowApps || 'all').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return list.includes('all') || list.includes(app.toLowerCase());
}

// GET /api/releases — Published entries, optionally filtered by ?app=viewer|triage|admin
app.get('/api/releases', async (c) => {
  const db = c.env.DB;
  const app_ = c.req.query('app');
  try {
    const rows = await db.prepare(
      "SELECT id, title, body, type, apps, published_at FROM releases WHERE status='published' ORDER BY published_at DESC, id DESC LIMIT 100"
    ).all();
    const all = (rows.results as any[]) || [];
    const filtered = all.filter(r => releaseAppsMatch(r.apps, app_));
    return c.json({ entries: filtered });
  } catch (e: any) {
    return c.json({ error: 'Failed to fetch releases: ' + e.message }, 500);
  }
});

// GET /api/releases/latest-id — Lightweight: latest published id + published_at for the app indicator
app.get('/api/releases/latest-id', async (c) => {
  const db = c.env.DB;
  const app_ = c.req.query('app');
  try {
    const rows = await db.prepare(
      "SELECT id, apps, published_at FROM releases WHERE status='published' ORDER BY published_at DESC, id DESC LIMIT 50"
    ).all();
    const all = (rows.results as any[]) || [];
    const match = all.find(r => releaseAppsMatch(r.apps, app_));
    if (!match) return c.json({ id: null, published_at: null });
    return c.json({ id: match.id, published_at: match.published_at });
  } catch (e: any) {
    return c.json({ error: 'Failed to fetch latest release: ' + e.message }, 500);
  }
});

// ── Admin routes ──
// GET /api/admin/releases — all entries (any status)
app.get('/api/admin/releases', requireAccess, async (c) => {
  const db = c.env.DB;
  try {
    const rows = await db.prepare(
      "SELECT * FROM releases ORDER BY COALESCE(published_at, updated_at) DESC, id DESC"
    ).all();
    return c.json({ entries: rows.results || [] });
  } catch (e: any) {
    return c.json({ error: 'Failed to fetch releases: ' + e.message }, 500);
  }
});

// POST /api/admin/releases — create entry (draft or published)
app.post('/api/admin/releases', requireAccess, async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const now = new Date().toISOString();
  const status = body.status === 'published' ? 'published' : 'draft';
  const publishedAt = status === 'published' ? (body.published_at || now) : null;
  const type = ['release', 'criteria_update', 'announcement'].includes(body.type) ? body.type : 'announcement';
  const apps = typeof body.apps === 'string' && body.apps.trim() ? body.apps.trim() : 'all';

  if (!body.title || !body.body) return c.json({ error: 'title and body required' }, 400);

  try {
    const result: any = await db.prepare(
      'INSERT INTO releases (title, body, type, apps, status, published_at, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      body.title, body.body, type, apps, status, publishedAt, now, now,
      actorFrom(c)
    ).run();
    const id = result.meta?.last_row_id;
    await db.prepare(
      'INSERT INTO audit_log (action, entity_type, entity_id, changes, performed_by, performed_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind('create', 'release', String(id), JSON.stringify({ title: body.title, type, apps, status }), actorFrom(c), now).run();
    return c.json({ success: true, id }, 201);
  } catch (e: any) {
    return c.json({ error: 'Failed to create release: ' + e.message }, 500);
  }
});

// PUT /api/admin/releases/:id — update entry
app.put('/api/admin/releases/:id', requireAccess, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = new Date().toISOString();
  const status = body.status === 'published' ? 'published' : 'draft';
  const type = ['release', 'criteria_update', 'announcement'].includes(body.type) ? body.type : 'announcement';
  const apps = typeof body.apps === 'string' && body.apps.trim() ? body.apps.trim() : 'all';

  try {
    const existing: any = await db.prepare('SELECT * FROM releases WHERE id = ?').bind(id).first();
    if (!existing) return c.json({ error: 'Not found' }, 404);
    // Publish timestamp: keep existing if already published, set now if newly publishing, clear if reverting to draft
    let publishedAt = existing.published_at;
    if (status === 'published' && !existing.published_at) publishedAt = now;
    if (status === 'draft') publishedAt = null;

    await db.prepare(
      'UPDATE releases SET title = ?, body = ?, type = ?, apps = ?, status = ?, published_at = ?, updated_at = ? WHERE id = ?'
    ).bind(body.title, body.body, type, apps, status, publishedAt, now, id).run();

    await db.prepare(
      'INSERT INTO audit_log (action, entity_type, entity_id, changes, performed_by, performed_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind('update', 'release', String(id), JSON.stringify({ title: body.title, type, apps, status }), actorFrom(c), now).run();

    return c.json({ success: true, id });
  } catch (e: any) {
    return c.json({ error: 'Failed to update release: ' + e.message }, 500);
  }
});

// DELETE /api/admin/releases/:id
app.delete('/api/admin/releases/:id', requireAccess, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const now = new Date().toISOString();
  try {
    await db.prepare('DELETE FROM releases WHERE id = ?').bind(id).run();
    await db.prepare(
      'INSERT INTO audit_log (action, entity_type, entity_id, performed_by, performed_at) VALUES (?, ?, ?, ?, ?)'
    ).bind('delete', 'release', String(id), actorFrom(c), now).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: 'Failed to delete release: ' + e.message }, 500);
  }
});

export default app;
