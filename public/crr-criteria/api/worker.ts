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
  // ARCH-MIG-01 slice 3 (vars in wrangler.json; string flags, '"true"' to enable):
  ASSESS_PIPELINE_ENABLED?: string;   // gates /api/assess/* itself (default off; slice 10 flips it)
  ASSESS_INTERNAL_KEY?: string;       // secret shared with the main worker; required in x-assess-internal
  ASSESS_ALLOW_SIGNED_OFF?: string;   // E4 tabletop mode — evaluate signed-off (not just published) bundles
  AUDIT_STORE_REDACTED_NOTE?: string; // write the redacted note to assessment_notes (default off)
  AUDIT_NOTE_RETENTION_DAYS?: string; // purge job cutoff for assessment_notes (default 180)
  // ARCH-MIG-01 slice 4b — extraction service:
  EXTRACTION_PROVIDER?: string;       // "anthropic" (default) | "azure-openai" (stub, NFR-009)
  EXTRACTION_MODEL?: string;          // governance-controlled; default claude-sonnet-4-6 (KI-27, SR-09)
  EXTRACTION_MAX_TOKENS?: string;     // default 8000 (PROMPT_DECISION_RECORD)
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
// ARCH-MIG-01 slice 2 (AD-01): resolves the published id through `exam_sites`
// to its bundle key first. If that bundle has a `published` row, serves the
// bundle's PlanDefinition/Questionnaire instead. Otherwise — which is every
// id today, since no bundle has reached `published` state yet — falls
// through to the current published JSON, byte-for-byte unchanged. The Viewer
// keeps reading the legacy shape until slice 6 flips it (gap analysis §5).
app.get('/api/criteria/:id', async (c) => {
  const kv = c.env.KV;
  const db = c.env.DB;
  const id = c.req.param('id');

  try {
    const resolved = await loadForExamSiteId(db, kv, id);
    if (resolved) {
      return c.json({
        examSite: { id: resolved.examSiteId, title: resolved.title },
        bundle: {
          key: resolved.bundle.examSite,
          version: resolved.bundle.version,
          sectionTitle: resolved.bundle.planDefinition?.title ?? null,
          pages: resolved.bundle.source?.pages ?? resolved.bundle.source?.draftRef ?? null,
        },
        planDefinition: resolved.bundle.planDefinition,
        questionnaire: resolved.bundle.questionnaire,
      });
    }
  } catch (e: any) {
    return c.json({ error: 'Failed to resolve bundle', message: e.message }, 500);
  }

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
//  ARCH-MIG-01 BUNDLE REGISTRY (slice 2)
// ══════════════════════════════════════════════════════════════
//
// Runtime loading. Per-isolate cache keyed by KV key (immutable content, so
// there is no staleness question — a given key's value never changes once
// written). Fails visibly (throws / returns null) on a missing bundle —
// invariant 3, no silent fallback to embedded criteria.
const bundleCache = new Map<string, any>();

async function loadBundle(kv: KVNamespace, examSite: string, version: string): Promise<any | null> {
  const key = version === 'latest'
    ? await kv.get(`bundle:${examSite}:latest-published`).then((v) => (v ? `bundle:${examSite}:${v}` : null))
    : `bundle:${examSite}:${version}`;
  if (!key) return null;
  if (bundleCache.has(key)) return bundleCache.get(key);
  const raw = await kv.get(key);
  if (!raw) return null;
  const bundle = JSON.parse(raw);
  bundleCache.set(key, bundle);
  return bundle;
}

// Resolves a published exam/site id (e.g. 'xr_elbow') to its bundle key (AD-01),
// then to that bundle's `published` version, if one exists. Returns null (not
// an error) when the id has no bundle yet, or the bundle isn't published —
// both are the normal, expected state for every site until slice 7 transcribes it.
async function loadForExamSiteId(db: D1Database, kv: KVNamespace, id: string): Promise<{ examSiteId: string; title: string; bundle: any } | null> {
  const row: any = await db.prepare('SELECT title, bundle_key, live FROM exam_sites WHERE id = ?').bind(id).first();
  if (!row || !row.live) return null;
  const bundleRow: any = await db.prepare(
    "SELECT version FROM bundles WHERE exam_site = ? AND state = 'published' ORDER BY id DESC LIMIT 1"
  ).bind(row.bundle_key).first();
  if (!bundleRow) return null;
  const bundle = await loadBundle(kv, row.bundle_key, bundleRow.version);
  if (!bundle) return null;
  return { examSiteId: id, title: row.title, bundle };
}

// GET /api/bundle/:examSite/:version — serves the immutable bundle JSON.
// :version may be a literal version or 'latest' (resolves latest-published).
app.get('/api/bundle/:examSite/:version', async (c) => {
  const examSite = c.req.param('examSite');
  const requested = c.req.param('version');
  try {
    const bundle = await loadBundle(c.env.KV, examSite, requested);
    if (!bundle) return c.json({ error: `No bundle for '${examSite}' at version '${requested}'` }, 404);
    // KV content (logic, metadata) is immutable once published — a bundle is
    // never rewritten. `state` is the one field that legitimately changes
    // over the bundle's lifecycle (transcribed -> signed-off -> published)
    // without any logic change, so it's tracked in D1, not frozen in KV.
    // Overlay the live value rather than echo whatever `state` the bundle
    // happened to say at the moment it was first written to KV.
    const stateRow: any = await c.env.DB.prepare(
      'SELECT state FROM bundles WHERE exam_site = ? AND version = ?'
    ).bind(examSite, bundle.version).first();
    const current = { ...bundle, state: stateRow?.state ?? bundle.state };
    const isImmutableVersion = requested !== 'latest';
    return c.json(current, 200, {
      'Cache-Control': isImmutableVersion ? 'public, max-age=31536000, immutable' : 'public, max-age=60',
      'ETag': bundle.logicHash ?? '',
    });
  } catch (e: any) {
    return c.json({ error: 'Failed to read bundle', message: e.message }, 500);
  }
});

// GET /api/bundles — states for all bundles + the exam_sites (AD-01) mapping.
// Data source for the Admin Tool's read-only Bundles tab.
app.get('/api/bundles', async (c) => {
  const db = c.env.DB;
  try {
    const [bundles, examSites] = await Promise.all([
      db.prepare('SELECT exam_site, version, state, logic_hash, vocabulary_version, source_type, signoff_ref, published_by, published_at, test_summary, created_at FROM bundles ORDER BY exam_site, id').all(),
      db.prepare('SELECT id, title, bundle_key, live FROM exam_sites ORDER BY id').all(),
    ]);
    return c.json({ bundles: bundles.results, examSites: examSites.results });
  } catch (e: any) {
    return c.json({ error: 'Failed to read bundle registry', message: e.message }, 500);
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

// POST /api/admin/extraction-prompt/register — ARCH-MIG-01 slice 4b.
// Idempotently stores the assembled extraction prompt (currently v3.0.1) in the
// system_prompts table for the audit trail (KI-26) — version comes from
// prompt.ts (PROMPT_VERSION), so each stored version is a separate row. It is
// stored `is_active = 0` and NEVER activated here — the live Triage page keeps
// v2.3.0 until slice 10
// (Do-not list). The extraction service loads the prompt from the versioned json
// artefact, not from this row; this row is history + `performed_by` attribution.
app.post('/api/admin/extraction-prompt/register', requireAccess, async (c) => {
  const db = c.env.DB;
  const { PROMPT_VERSION, EQUIVALENCE_LIST_VERSION, CONTRACT_VERSION, assembleSystemPrompt } = await import('./prompt');
  const version = `v${PROMPT_VERSION}`;
  const now = new Date().toISOString();
  const actor = actorFrom(c);
  const instruction_text = assembleSystemPrompt();
  const changelog = `CRR extraction prompt ${version} — replaces system prompt v2.3.0 in full (extraction only). Contract ${CONTRACT_VERSION}; equivalence list ${EQUIVALENCE_LIST_VERSION}. Stored inactive: the extraction service loads the versioned json artefact; the live Triage page keeps v2.3.0 until slice 10.`;
  try {
    const existing: any = await db.prepare('SELECT version, is_active FROM system_prompts WHERE version = ?').bind(version).first();
    if (existing) {
      return c.json({ success: true, version, alreadyRegistered: true, isActive: existing.is_active });
    }
    const result = await db.prepare(
      'INSERT INTO system_prompts (version, label, instruction_text, changelog, created_at, created_by, is_active) VALUES (?, ?, ?, ?, ?, ?, 0)'
    ).bind(version, 'CRR extraction prompt', instruction_text, changelog, now, actor).run();
    await db.prepare(
      'INSERT INTO system_prompt_audit (action, prompt_version, performed_at, performed_by, reason) VALUES (?, ?, ?, ?, ?)'
    ).bind('create', version, now, actor, changelog).run();
    return c.json({ success: true, version, id: result.meta.last_row_id, isActive: 0 }, 201);
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

// ── ARCH-MIG-01 bundle registry — admin routes (slice 2) ──────────────────

// Recomputes the logic hash exactly as tooling/criteria-bundle/tooling/publish.mjs
// does, so a bundle produced there validates identically here (AD-02).
async function computeLogicHash(site: any, population: any): Promise<string> {
  const enc = new TextEncoder();
  const bytes = enc.encode(JSON.stringify(site) + (population ? JSON.stringify(population) : ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return 'sha256:' + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// POST /api/admin/bundles/publish — accepts a bundle produced by publish.mjs
// (the local-registry JSON, uploaded as the request body); validates it with
// the same checks as `check --bundle`, then writes KV + D1 + an audit row.
app.post('/api/admin/bundles/publish', requireAccess, async (c) => {
  const db = c.env.DB;
  const kv = c.env.KV;
  let bundle: any;
  try {
    bundle = await c.req.json();
  } catch (e: any) {
    return c.json({ error: 'Body is not valid JSON', message: e.message }, 400);
  }

  const problems: string[] = [];
  // `kind: 'national'` is the national red-flag / ACC layer (AD-19): Library ELM +
  // the national Questionnaire, no PlanDefinition. examSite must be
  // `national-redflags`.
  const isNationalBundle = bundle.kind === 'national';
  const requiredKeys = ['examSite', 'version', 'state', 'vocabularyVersion', 'source', 'logicHash', 'publishedAt', 'library', 'questionnaire', 'testResults'];
  if (!isNationalBundle) requiredKeys.push('planDefinition');
  for (const key of requiredKeys) {
    if (!(key in bundle)) problems.push(`missing required key "${key}"`);
  }
  if (isNationalBundle && bundle.examSite !== 'national-redflags') {
    problems.push(`kind "national" bundle must have examSite "national-redflags", got "${bundle.examSite}"`);
  }
  if (isNationalBundle && bundle.planDefinition) {
    problems.push('kind "national" bundle must not carry a PlanDefinition');
  }
  if (bundle.state && !['transcribed', 'signed-off'].includes(bundle.state)) {
    problems.push(`state "${bundle.state}" must be "transcribed" or "signed-off" (a bundle only becomes "published" via the state-transition route)`);
  }
  if (bundle.source) {
    if (!['pdf', 'approved-draft'].includes(bundle.source.type)) problems.push(`source.type "${bundle.source.type}" is not "pdf" or "approved-draft"`);
    const hasPageRef = bundle.source.type === 'pdf' ? !!bundle.source.pages : !!(bundle.source.pages || bundle.source.draftRef);
    if (!hasPageRef) problems.push('source carries neither a page nor a draft reference');
  }
  if (bundle.library?.site) {
    const recomputed = await computeLogicHash(bundle.library.site, bundle.library.population);
    if (recomputed !== bundle.logicHash) problems.push(`logicHash mismatch: bundle says ${bundle.logicHash}, recomputed is ${recomputed}`);
  }
  // linkId resolution: every PlanDefinition action input must resolve to a
  // Questionnaire item in this same bundle (same check as `check --bundle`).
  if (bundle.questionnaire && bundle.planDefinition) {
    const qLinkIds = new Set<string>();
    (function walk(items: any[]) { for (const i of items || []) { qLinkIds.add(i.linkId); walk(i.item); } })(bundle.questionnaire.item);
    (function walkPd(actions: any[]) { for (const a of actions || []) {
      for (const inp of a.input || []) for (const p of inp.profile || []) {
        const id = String(p).split('#')[1];
        if (id && !qLinkIds.has(id)) problems.push(`PlanDefinition action ${a.id}: linkId "${id}" not in this bundle's Questionnaire`);
      }
      walkPd(a.action);
    } })(bundle.planDefinition.action);
  }
  if (problems.length) return c.json({ error: 'Bundle failed validation', problems }, 422);

  // AD-02: the major version segment must change iff the logic hash changed,
  // relative to the most recent existing row for this bundle key.
  const previous: any = await db.prepare(
    'SELECT version, logic_hash FROM bundles WHERE exam_site = ? ORDER BY id DESC LIMIT 1'
  ).bind(bundle.examSite).first();
  if (previous) {
    const newMajor = Number(String(bundle.version).split('.')[0]);
    const prevMajor = Number(String(previous.version).split('.')[0]);
    const hashUnchanged = previous.logic_hash === bundle.logicHash;
    const isMajorBump = newMajor > prevMajor;
    if (hashUnchanged && isMajorBump) {
      return c.json({ error: `Refusing: logic hash unchanged from ${previous.version} but ${bundle.version} is a major bump. Use a minor/patch version.` }, 422);
    }
    if (!hashUnchanged && !isMajorBump) {
      return c.json({ error: `Refusing: logic hash changed from ${previous.version} but ${bundle.version} is not a major bump. A logic change must be a major version.` }, 422);
    }
  }

  const kvKey = `bundle:${bundle.examSite}:${bundle.version}`;
  const existing = await kv.get(kvKey);
  if (existing) return c.json({ error: `${kvKey} already exists — a published bundle is never rewritten` }, 409);

  await kv.put(kvKey, JSON.stringify(bundle));

  const now = new Date().toISOString();
  const signoffRef = bundle.state === 'signed-off' ? `tooling/criteria-bundle/sites/${bundle.examSite}/signoff.md` : null;
  await db.prepare(
    `INSERT INTO bundles (exam_site, version, state, logic_hash, vocabulary_version, source_type, signoff_ref, test_summary, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(bundle.examSite, bundle.version, bundle.state, bundle.logicHash, bundle.vocabularyVersion, bundle.source.type, signoffRef, JSON.stringify(bundle.testResults ?? null), now).run();

  await db.prepare(
    'INSERT INTO audit_log (action, entity_type, entity_id, changes, performed_by, performed_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind('publish', 'bundle', `${bundle.examSite}:${bundle.version}`, JSON.stringify({ state: bundle.state, logicHash: bundle.logicHash, vocabularyVersion: bundle.vocabularyVersion }), actorFrom(c), now).run();

  return c.json({ success: true, examSite: bundle.examSite, version: bundle.version, state: bundle.state }, 201);
});

// POST /api/admin/bundles/:examSite/state — body: { toState, signoffRef? }.
// Only two transitions exist: transcribed -> signed-off (requires signoffRef),
// and signed-off -> published (requires the bundle to already be in KV; sets
// bundle:<examSite>:latest-published). No other transition is legal (AD-10).
app.post('/api/admin/bundles/:examSite/state', requireAccess, async (c) => {
  const db = c.env.DB;
  const kv = c.env.KV;
  const examSite = c.req.param('examSite');
  const body = await c.req.json().catch(() => ({}));
  const toState = body.toState;

  const row: any = await db.prepare(
    'SELECT id, version, state FROM bundles WHERE exam_site = ? ORDER BY id DESC LIMIT 1'
  ).bind(examSite).first();
  if (!row) return c.json({ error: `No bundle found for "${examSite}"` }, 404);

  const legal: Record<string, string> = { transcribed: 'signed-off', 'signed-off': 'published' };
  if (legal[row.state] !== toState) {
    return c.json({ error: `Illegal transition: "${row.state}" -> "${toState}". Only ${row.state} -> "${legal[row.state] ?? '(none — already published)'}" is allowed.` }, 422);
  }
  if (toState === 'signed-off' && !body.signoffRef) {
    return c.json({ error: 'toState "signed-off" requires signoffRef in the request body' }, 400);
  }
  if (toState === 'published') {
    const kvKey = `bundle:${examSite}:${row.version}`;
    const existing = await kv.get(kvKey);
    if (!existing) return c.json({ error: `${kvKey} not found in KV — publish the bundle before marking it published` }, 409);
    await kv.put(`bundle:${examSite}:latest-published`, row.version);
  }

  const now = new Date().toISOString();
  await db.prepare('UPDATE bundles SET state = ?, signoff_ref = COALESCE(?, signoff_ref), published_by = CASE WHEN ? = \'published\' THEN ? ELSE published_by END, published_at = CASE WHEN ? = \'published\' THEN ? ELSE published_at END WHERE id = ?')
    .bind(toState, body.signoffRef ?? null, toState, actorFrom(c), toState, now, row.id).run();

  await db.prepare(
    'INSERT INTO audit_log (action, entity_type, entity_id, changes, performed_by, performed_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind('state', 'bundle', `${examSite}:${row.version}`, JSON.stringify({ from: row.state, to: toState }), actorFrom(c), now).run();

  return c.json({ success: true, examSite, version: row.version, state: toState });
});

// ══════════════════════════════════════════════════════════════
//  ARCH-MIG-01 RULES ENGINE (slice 3)
// ══════════════════════════════════════════════════════════════
//
// POST /api/assess/evaluate — internal. Deterministic rule evaluation of one
// QuestionnaireResponse against the national red-flag library and each selected
// exam/site bundle. No model, no PII handling, no extraction — those are slices
// 4b and 5. The heavy CQL runtime (cql-execution + ELM) is in ./engine.ts and
// imported lazily so it is off the cold-start path of every other route.
//
// Reachability: this route is internal-only — it requires the `x-assess-internal`
// shared secret set by the main worker's forward AND ASSESS_PIPELINE_ENABLED on
// this worker (403 / 404 otherwise), so it is not usable from the public
// workers.dev origin. Rate-limited like the other public routes.
//
// Relationship to FHIR PlanDefinition/$apply (AD-21, AD-15 — kept adapter-
// compatible, not adopting the operation):
//   request  { questionnaireResponse }          -> $apply `data` Bundle (the QR is input data)
//            { requestedExamSite,                -> selects which PlanDefinition(s) $apply is invoked for
//              candidateExamSites[] }               (the national PlanDefinition is always first — AD-03)
//            { parameters.documentationStandard } -> $apply `parameters` (Parameters resource, one CQL parameter)
//   response requestedExam.advisory.determination -> $apply output: a RequestGroup/CarePlan action
//            requestedExam.advisory.priorityCode     with an activity code + `priority`
//            alternatives[]                       -> additional output actions (cross-exam recommendations)
//            national (fired red flags / ACC)     -> the national PlanDefinition's applicability + actions
//   NOT mapped into $apply output — a separate reporting artefact by design (AD-21b):
//            advisory.ruleTrace, advisory.missingInformation, unconfirmedExclusions.
// A thin adapter could translate both directions without changing this contract;
// the field mapping to an IG package is in AD-21's table.

// Resolves a published exam/site id to the ELM the engine evaluates. Returns a
// `not-available` marker (never a fallback — invariant 3) when the id is unknown,
// has no bundle, or its bundle is not in an evaluable state.
async function resolveExamForEngine(
  db: D1Database,
  kv: KVNamespace,
  id: string,
  allowSignedOff: boolean,
): Promise<any> {
  const row: any = await db.prepare('SELECT bundle_key FROM exam_sites WHERE id = ?').bind(id).first();
  if (!row) return { id, state: 'not-available' };
  const evaluable = allowSignedOff ? ['published', 'signed-off'] : ['published'];
  const placeholders = evaluable.map(() => '?').join(',');
  const bundleRow: any = await db.prepare(
    `SELECT version, state, vocabulary_version FROM bundles WHERE exam_site = ? AND state IN (${placeholders}) ORDER BY (state = 'published') DESC, id DESC LIMIT 1`
  ).bind(row.bundle_key, ...evaluable).first();
  if (!bundleRow) return { id, state: 'not-available' };
  const bundle = await loadBundle(kv, row.bundle_key, bundleRow.version);
  if (!bundle || !bundle.library?.site) return { id, state: 'not-available' };
  return {
    id,
    state: bundleRow.state,
    version: bundleRow.version,
    vocabularyVersion: bundleRow.vocabulary_version ?? bundle.vocabularyVersion ?? null,
    siteElm: bundle.library.site,
  };
}

// Resolves the national red-flag / ACC layer (bundle key `national-redflags`,
// AD-19). Returns `null` when there is no evaluable published version — the
// engine then fails closed (SR-13). The key IS the bundle key: no `exam_sites`
// row, it is not a site.
async function resolveNationalRedFlags(
  db: D1Database,
  kv: KVNamespace,
  allowSignedOff: boolean,
): Promise<{ version: string; elm: any } | null> {
  const evaluable = allowSignedOff ? ['published', 'signed-off'] : ['published'];
  const placeholders = evaluable.map(() => '?').join(',');
  const bundleRow: any = await db.prepare(
    `SELECT version, state FROM bundles WHERE exam_site = 'national-redflags' AND state IN (${placeholders}) ORDER BY (state = 'published') DESC, id DESC LIMIT 1`
  ).bind(...evaluable).first();
  if (!bundleRow) return null;
  const bundle = await loadBundle(kv, 'national-redflags', bundleRow.version);
  if (!bundle || !bundle.library?.site) return null;
  return { version: bundleRow.version, elm: bundle.library.site };
}

// Purge job for assessment_notes (Cron Trigger, see the default export's
// scheduled handler). Deletes rows older than `retentionDays`. This table only —
// `assessments` (structured, no note text) is never purged here.
export async function purgeExpiredNotes(db: D1Database, retentionDays: number): Promise<number> {
  const days = Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 180;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const res = await db.prepare('DELETE FROM assessment_notes WHERE created_at < ?').bind(cutoff).run();
  return res.meta?.changes ?? 0;
}

// SD-11 — `/api/assess/*` is internal-only. It is reached only via the main
// worker's CRR_API service binding, which sets `x-assess-internal` from a shared
// secret; it is NOT usable from the API worker's public *.workers.dev origin.
// Two gates: (1) ASSESS_PIPELINE_ENABLED must be 'true' on this worker (default
// off — 404 otherwise, so the route is invisible until slice 10 cut-over);
// (2) x-assess-internal must equal ASSESS_INTERNAL_KEY (a configured secret).
// Returns a Response to send back, or null when the request may proceed.
function guardInternalAssess(c: any): Response | null {
  if (c.env.ASSESS_PIPELINE_ENABLED !== 'true') return c.json({ error: 'Not found' }, 404);
  const key = c.env.ASSESS_INTERNAL_KEY;
  if (!key || c.req.header('x-assess-internal') !== key) {
    return c.json({ error: 'This endpoint is internal — reachable only through the assessment pipeline' }, 403);
  }
  return null;
}

// Per-IP rate limit: 200/hour (mirrors /api/triage/usage-log). The main worker
// forwards CF-Connecting-IP so this is the end user's IP. Returns a 429 Response
// when the limit is hit, else null.
async function assessRateLimit(c: any, bucket: string): Promise<Response | null> {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const hour = new Date().toISOString().slice(0, 13);
  const rlKey = `ratelimit:${bucket}:${ip}:${hour}`;
  try {
    const countRaw = await c.env.KV.get(rlKey);
    const count = countRaw ? parseInt(countRaw) : 0;
    if (count >= 200) return c.json({ error: 'Rate limit exceeded' }, 429);
    await c.env.KV.put(rlKey, String(count + 1), { expirationTtl: 3600 });
  } catch (_) { /* fail-open on rate-limit KV errors */ }
  return null;
}

app.post('/api/assess/evaluate', async (c) => {
  const guard = guardInternalAssess(c);
  if (guard) return guard;
  const rl = await assessRateLimit(c, 'assess');
  if (rl) return rl;

  let body: any;
  try {
    body = await c.req.json();
  } catch (e: any) {
    return c.json({ error: 'Body is not valid JSON', message: e.message }, 400);
  }

  const qr = body.questionnaireResponse;
  if (!qr || typeof qr !== 'object' || qr.resourceType !== 'QuestionnaireResponse') {
    return c.json({ error: 'questionnaireResponse (a FHIR QuestionnaireResponse) is required' }, 400);
  }
  // AD-20: the requested exam/site is explicit; candidateExamSites[] carries any
  // other exam the note indicated (gap §4). No positional convention.
  const requestedExamSite: string | undefined = typeof body.requestedExamSite === 'string' && body.requestedExamSite.length ? body.requestedExamSite : undefined;
  if (!requestedExamSite) {
    return c.json({ error: 'requestedExamSite (a published exam/site id) is required' }, 400);
  }
  const candidateExamSites: string[] = Array.isArray(body.candidateExamSites)
    ? body.candidateExamSites.filter((x: any) => typeof x === 'string' && x.length && x !== requestedExamSite)
    : [];

  const engine = await import('./engine');
  const docStd = engine.isDocumentationStandard(body.parameters?.documentationStandard)
    ? body.parameters.documentationStandard
    : 'strict';
  const allowSignedOff = c.env.ASSESS_ALLOW_SIGNED_OFF === 'true';

  // Fail closed (AD-19, SR-13): the national red-flag / ACC layer must be a
  // published bundle. No published version -> no assessment, no audit row.
  const nationalLibrary = await resolveNationalRedFlags(c.env.DB, c.env.KV, allowSignedOff);
  if (!nationalLibrary) {
    return c.json({
      error: 'national-redflags-unavailable',
      message: 'The national red-flag / ACC safety library has no published bundle; assessment cannot proceed (AD-19 / SR-13).',
    }, 503);
  }

  let result: any;
  try {
    const requested = await resolveExamForEngine(c.env.DB, c.env.KV, requestedExamSite, allowSignedOff);
    const candidates = [];
    for (const id of candidateExamSites) candidates.push(await resolveExamForEngine(c.env.DB, c.env.KV, id, allowSignedOff));
    result = await engine.runAssessment({ questionnaireResponse: qr, nationalLibrary, requested, candidates, documentationStandard: docStd });
  } catch (e: any) {
    if (e?.code === 'national-redflags-unavailable') {
      return c.json({ error: 'national-redflags-unavailable', message: e.message }, 503);
    }
    return c.json({ error: 'Engine evaluation failed', message: e.message }, 500);
  }

  // Audit row (SD-12, gap §6). Structured; no note text. The id and created_at
  // are the only non-deterministic parts of what leaves this route.
  const assessmentId = crypto.randomUUID();
  const now = new Date().toISOString();
  const performedBy = c.req.header('x-assess-identity') || c.req.header('cf-access-authenticated-user-email') || (typeof body.performedBy === 'string' ? body.performedBy : null);
  try {
    await c.env.DB.prepare(
      `INSERT INTO assessments (id, created_at, bundle_versions, engine_version, vocabulary_version, prompt_version, model_id, documentation_standard, questionnaire_response, advisory, discrepancies, validation_failures, performed_by, regression_run_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      assessmentId, now,
      JSON.stringify(result.bundleVersions), result.engineVersion, result.vocabularyVersion ?? null,
      typeof body.promptVersion === 'string' ? body.promptVersion : null,
      typeof body.modelId === 'string' ? body.modelId : null,
      docStd,
      JSON.stringify(qr), JSON.stringify(result),
      body.discrepancies != null ? JSON.stringify(body.discrepancies) : null,
      body.validationFailures != null ? JSON.stringify(body.validationFailures) : null,
      performedBy,
      typeof body.regressionRunId === 'string' ? body.regressionRunId : null,
    ).run();

    if (c.env.AUDIT_STORE_REDACTED_NOTE === 'true' && typeof body.noteRedacted === 'string' && body.noteRedacted.trim().length) {
      await c.env.DB.prepare(
        'INSERT INTO assessment_notes (assessment_id, note_redacted, created_at) VALUES (?, ?, ?)'
      ).bind(assessmentId, body.noteRedacted, now).run();
    }
  } catch (e: any) {
    return c.json({ error: 'Assessment evaluated but the audit write failed', message: e.message }, 500);
  }

  return c.json({ assessmentId, ...result });
});

// ══════════════════════════════════════════════════════════════
//  ARCH-MIG-01 EXTRACTION SERVICE (slice 4b)
// ══════════════════════════════════════════════════════════════
//
// POST /api/assess/extract — internal (same gating as evaluate, SD-11). Turns a
// free-text referral note into a FHIR QuestionnaireResponse + an exam/site
// selection. The model EXTRACTS; it never decides (invariant 1). Flow:
//   PII gate (server-side, before any model call — pii.ts)
//     -> prompt assembly (prompt.ts; parts + Questionnaires items-only + exam list)
//     -> provider (provider.ts; forced call to the v3.0.1 output tool)
//     -> read the tool call: flat answers [{linkId,value,status,quote}] + examSites[]
//     -> build the FHIR QuestionnaireResponse + answer-evidence extensions here
//        (buildQuestionnaireResponse — the model no longer hand-writes FHIR, SR-09)
//     -> validation gate (gate.ts; contract §gate + AD-17; rejects the WHOLE response)
//     -> inject age/sex from context as documented answers (structured input)
// No audit row here — the pipeline route (slice 5) writes it after merge.
//
// Relationship to FHIR: this is the "populate a Questionnaire from narrative"
// step; a $extract-style operation would map onto it, but the evidence extension
// (status + quote) and the exam/site selection are CRR-specific (AD-21).

// The national Questionnaire, from the `national-redflags` bundle (fail closed —
// AD-19). Returns the Questionnaire resource or null.
async function loadNationalQuestionnaire(db: D1Database, kv: KVNamespace, allowSignedOff: boolean): Promise<any | null> {
  const evaluable = allowSignedOff ? ['published', 'signed-off'] : ['published'];
  const placeholders = evaluable.map(() => '?').join(',');
  const row: any = await db.prepare(
    `SELECT version FROM bundles WHERE exam_site = 'national-redflags' AND state IN (${placeholders}) ORDER BY (state = 'published') DESC, id DESC LIMIT 1`
  ).bind(...evaluable).first();
  if (!row) return null;
  const bundle = await loadBundle(kv, 'national-redflags', row.version);
  return bundle?.questionnaire ?? null;
}

// One selected exam/site's Questionnaire, by version. Null when the id is unknown
// or its bundle is not in an evaluable state (never a fallback — invariant 3).
async function loadExamSiteQuestionnaire(db: D1Database, kv: KVNamespace, id: string, allowSignedOff: boolean): Promise<{ version: string; questionnaire: any } | null> {
  const siteRow: any = await db.prepare('SELECT bundle_key FROM exam_sites WHERE id = ?').bind(id).first();
  if (!siteRow) return null;
  const evaluable = allowSignedOff ? ['published', 'signed-off'] : ['published'];
  const placeholders = evaluable.map(() => '?').join(',');
  const row: any = await db.prepare(
    `SELECT version FROM bundles WHERE exam_site = ? AND state IN (${placeholders}) ORDER BY (state = 'published') DESC, id DESC LIMIT 1`
  ).bind(siteRow.bundle_key, ...evaluable).first();
  if (!row) return null;
  const bundle = await loadBundle(kv, siteRow.bundle_key, row.version);
  if (!bundle?.questionnaire) return null;
  return { version: row.version, questionnaire: bundle.questionnaire };
}

// The published exam/site list — ids and titles only (AD-01). All 53.
async function loadExamSiteList(db: D1Database): Promise<{ id: string; title: string }[]> {
  const rows = await db.prepare('SELECT id, title FROM exam_sites ORDER BY id').all();
  return (rows.results as any[]).map((r) => ({ id: r.id, title: r.title }));
}

// Strip ```json fences / prose the model may wrap the object in.
function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first === -1 || last === -1 || last < first) return candidate;
  return candidate.slice(first, last + 1);
}

// Adds patient.age / patient.sex / patient.ageMonths from the calling-app context
// as `documented` answers with NO evidence extension — they are structured input,
// not extraction (contract rule 7; the model was told not to answer them). Context
// wins over any answer the model produced for the same linkId.
function injectContextAnswers(qr: any, context: any): any {
  const out = JSON.parse(JSON.stringify(qr || { resourceType: 'QuestionnaireResponse', status: 'completed', item: [] }));
  out.item = Array.isArray(out.item) ? out.item : [];
  const injected: { linkId: string; answer: any[] }[] = [];
  if (typeof context?.age === 'number') injected.push({ linkId: 'patient.age', answer: [{ valueInteger: context.age }] });
  if (typeof context?.ageMonths === 'number') injected.push({ linkId: 'patient.ageMonths', answer: [{ valueDecimal: context.ageMonths }] });
  if (typeof context?.sex === 'string' && context.sex) injected.push({ linkId: 'patient.sex', answer: [{ valueCoding: { system: 'http://hl7.org/fhir/administrative-gender', code: context.sex } }] });
  if (!injected.length) return out;
  const injectedIds = new Set(injected.map((i) => i.linkId));
  // remove any model-supplied answer for these linkIds
  const prune = (items: any[]): any[] => (items || []).filter((i) => {
    if (i.linkId && injectedIds.has(i.linkId)) return false;
    if (Array.isArray(i.item)) i.item = prune(i.item);
    return true;
  });
  out.item = prune(out.item);
  let group = out.item.find((g: any) => g.linkId === 'patient');
  if (!group) { group = { linkId: 'patient', item: [] }; out.item.unshift(group); }
  group.item = Array.isArray(group.item) ? group.item : [];
  group.item.push(...injected);
  return out;
}

const ANSWER_EVIDENCE_EXT_URL = 'http://crr.health.nz/fhir/StructureDefinition/answer-evidence';

// v3.0.1: the model returns a flat answer list `{ linkId, value, status, quote }`;
// the service builds the FHIR QuestionnaireResponse and attaches the
// answer-evidence extension to EVERY answer — so gate rule 3 (evidence present)
// is guaranteed by construction and can only fail on a service bug, never on
// model output (SR-09). Grouping is by linkId prefix, matching
// injectContextAnswers and how the engine reads the QR. The value key comes from
// the Questionnaire item type; an unknown linkId falls through as valueString and
// the gate then rejects it (contract rule 2), which is the intended behaviour.
export function buildQuestionnaireResponse(
  answers: any[],
  itemIndex: Map<string, string>,
  typeToValueKey: Record<string, string>,
): any {
  const groups = new Map<string, any[]>();
  for (const a of Array.isArray(answers) ? answers : []) {
    if (!a || typeof a.linkId !== 'string' || !a.linkId) continue;
    const itemType = itemIndex.get(a.linkId);
    const valueKey = (itemType && typeToValueKey[itemType]) || 'valueString';
    const answerObj: any = valueKey === 'valueCoding'
      ? { valueCoding: { system: 'http://hl7.org/fhir/administrative-gender', code: String(a.value) } }
      : { [valueKey]: a.value };
    answerObj.extension = [{
      url: ANSWER_EVIDENCE_EXT_URL,
      extension: [
        { url: 'status', valueCode: a.status },
        { url: 'quote', valueString: a.quote },
      ],
    }];
    const groupId = a.linkId.split('.')[0];
    if (!groups.has(groupId)) groups.set(groupId, []);
    groups.get(groupId)!.push({ linkId: a.linkId, answer: [answerObj] });
  }
  return {
    resourceType: 'QuestionnaireResponse',
    questionnaire: 'http://crr.health.nz/fhir/Questionnaire/CRR-National',
    status: 'completed',
    subject: { reference: 'Patient/extracted' },
    item: [...groups.entries()].map(([linkId, item]) => ({ linkId, item })),
  };
}

// The shared extraction core: PII gate -> Questionnaires -> prompt -> provider ->
// build QR -> validation gate. Used by BOTH `/api/assess/extract` (which then
// injects context for its standalone response) and the `/api/assess` pipeline
// (which passes the pre-injection QR to merge). It writes no audit row and sends
// no response — the caller does. `context` is only forwarded to the prompt's
// context block here; it is not merged into the QR (that is merge.ts / the
// pipeline, or `injectContextAnswers` for the standalone route).
type ExtractionMeta = {
  promptVersion: string;
  equivalenceListVersion: string;
  contractVersion: string;
  requestedExamSiteQuestionnaireVersion: string | null;
  modelId: string | null;
  provider: string | null;
  redaction: { patternsHit: string[] };
};

type ExtractionCore =
  | {
      ok: true;
      redacted: string;
      builtQr: any;
      modelExamSites: any[];
      questionnaires: any[];
      attestationLinkIds: Set<string>;
      itemIndex: Map<string, string>;
      examSiteList: { id: string; title: string }[];
      meta: ExtractionMeta;
    }
  | { ok: false; kind: 'gate'; status: 422; meta: ExtractionMeta; failures: string[]; redacted: string }
  | { ok: false; kind: 'error'; status: number; body: any };

async function runExtractionCore(
  c: any,
  opts: { note: string; context: any; requestedExamSite?: string },
): Promise<ExtractionCore> {
  const allowSignedOff = c.env.ASSESS_ALLOW_SIGNED_OFF === 'true';
  const pii = await import('./pii');
  const promptMod = await import('./prompt');
  const gateMod = await import('./gate');
  const providerMod = await import('./provider');

  // 1. PII gate — before prompt assembly and any model call.
  const { redacted, patternsHit } = pii.redact(opts.note);
  if (pii.residualNhi(redacted).length) {
    return { ok: false, kind: 'error', status: 422, body: { error: 'pii-residual', message: 'An NHI-shaped value survived redaction — the request was not sent.', redaction: { patternsHit } } };
  }
  if (pii.isInsufficientAfterRedaction(redacted)) {
    return { ok: false, kind: 'error', status: 422, body: { error: 'insufficient-after-redaction', message: 'After removing patient-identifiable information there is not enough clinical detail to extract.', redaction: { patternsHit } } };
  }

  // 2. Questionnaires — national (fail closed, AD-19) + the requested exam/site.
  const nationalQ = await loadNationalQuestionnaire(c.env.DB, c.env.KV, allowSignedOff);
  if (!nationalQ) {
    return { ok: false, kind: 'error', status: 503, body: { error: 'national-redflags-unavailable', message: 'The national Questionnaire has no published bundle; extraction cannot proceed (AD-19 / SR-13).' } };
  }
  let requestedQ: any = null;
  let requestedQVersion: string | null = null;
  if (opts.requestedExamSite) {
    const r = await loadExamSiteQuestionnaire(c.env.DB, c.env.KV, opts.requestedExamSite, allowSignedOff);
    if (r) { requestedQ = r.questionnaire; requestedQVersion = r.version; }
  }
  const examSiteList = await loadExamSiteList(c.env.DB);

  // 3. Strip attestation-category items (AD-17) so the model never sees them.
  const attestationLinkIds = new Set<string>(promptMod.ATTESTATION_LINK_IDS);
  const questionnaires = [promptMod.stripAttestationItems(nationalQ, attestationLinkIds)];
  if (requestedQ) questionnaires.push(promptMod.stripAttestationItems(requestedQ, attestationLinkIds));

  // 4. Assemble and call the provider (forced call to the output tool).
  const system = promptMod.assembleSystemPrompt();
  const userContent = promptMod.assembleUserContent({ redactedNote: redacted, questionnaires, examSiteList, context: opts.context });
  const maxTokens = Number(c.env.EXTRACTION_MAX_TOKENS ?? 8000) || 8000;
  let modelResult: any;
  try {
    const provider = providerMod.makeProvider(c.env);
    modelResult = await provider.extract({ system, messages: [{ role: 'user', content: userContent }], maxTokens, tool: promptMod.OUTPUT_TOOL });
  } catch (e: any) {
    if (e?.code === 'provider-not-configured') return { ok: false, kind: 'error', status: 503, body: { error: 'provider-not-configured', message: e.message } };
    return { ok: false, kind: 'error', status: 502, body: { error: 'provider-call-failed', message: e.message } };
  }

  // 5. Read the tool call.
  let toolInput: any = modelResult.toolInput;
  if (!toolInput) {
    try { toolInput = JSON.parse(extractJsonObject(modelResult.text)); } catch (_) { toolInput = null; }
  }
  const truncated = providerMod.isTruncated(modelResult.stopReason);
  const meta: ExtractionMeta = {
    promptVersion: promptMod.PROMPT_VERSION,
    equivalenceListVersion: promptMod.EQUIVALENCE_LIST_VERSION,
    contractVersion: promptMod.CONTRACT_VERSION,
    requestedExamSiteQuestionnaireVersion: requestedQVersion,
    modelId: modelResult.modelId,
    provider: modelResult.provider,
    redaction: { patternsHit },
  };

  // 6. Build the FHIR QR, then run the gate on it (evidence extension by
  //    construction — SR-09).
  const itemIndex = gateMod.buildItemIndex(questionnaires);
  if (!toolInput || typeof toolInput !== 'object') {
    return { ok: false, kind: 'gate', status: 422, meta, redacted, failures: [`model did not return a ${promptMod.OUTPUT_TOOL.name} tool call${truncated ? ' (response was truncated)' : ''}`] };
  }
  const builtQr = buildQuestionnaireResponse(toolInput.answers, itemIndex, gateMod.TYPE_TO_VALUE_KEY);
  const modelExamSites = Array.isArray(toolInput.examSites) ? toolInput.examSites : [];
  const gateResult = gateMod.runGate({
    response: { examSites: modelExamSites, questionnaireResponse: builtQr },
    redactedNote: redacted,
    questionnaires,
    publishedExamSiteIds: examSiteList.map((e) => e.id),
    attestationLinkIds,
    truncated,
  });
  if (!gateResult.passed) {
    return { ok: false, kind: 'gate', status: 422, meta, redacted, failures: gateResult.failures };
  }

  return { ok: true, redacted, builtQr, modelExamSites, questionnaires, attestationLinkIds, itemIndex, examSiteList, meta };
}

function examSiteSelectionOf(modelExamSites: any[], requestedExamSite?: string) {
  const requestedEntry = modelExamSites.find((e: any) => e?.requested === true);
  return {
    requestedExamSite: requestedEntry?.id ?? requestedExamSite ?? null,
    candidateExamSites: modelExamSites.filter((e: any) => e?.requested === false).map((e: any) => e.id),
  };
}

app.post('/api/assess/extract', async (c) => {
  const guard = guardInternalAssess(c);
  if (guard) return guard;
  const rl = await assessRateLimit(c, 'extract');
  if (rl) return rl;

  let body: any;
  try {
    body = await c.req.json();
  } catch (e: any) {
    return c.json({ error: 'Body is not valid JSON', message: e.message }, 400);
  }
  const note = typeof body.note === 'string' ? body.note : '';
  if (!note.trim()) return c.json({ error: 'note (the free-text referral note) is required' }, 400);
  const context = body.context && typeof body.context === 'object' ? body.context : {};
  const requestedExamSite: string | undefined = typeof body.requestedExamSite === 'string' && body.requestedExamSite ? body.requestedExamSite : undefined;

  const core = await runExtractionCore(c, { note, context, requestedExamSite });
  if (!core.ok) {
    if (core.kind === 'gate') return c.json({ ...core.meta, validation: { passed: false, failures: core.failures } }, 422);
    return c.json(core.body, core.status as any);
  }

  // Standalone route: inject age/sex from context as documented answers.
  const questionnaireResponse = injectContextAnswers(core.builtQr, context);
  const examSiteSelection = examSiteSelectionOf(core.modelExamSites, requestedExamSite);
  return c.json({ questionnaireResponse, examSiteSelection, ...core.meta, validation: { passed: true, failures: [] } });
});

// ══════════════════════════════════════════════════════════════
//  ARCH-MIG-01 ASSESSMENT PIPELINE (slice 5)
// ══════════════════════════════════════════════════════════════
//
// POST /api/assess — internal (same gating as evaluate/extract, SD-11), forwarded
// same-origin by the main worker's CRR_API binding behind ASSESS_PIPELINE_ENABLED.
// One call, one assessment, one audit row. Flow:
//   PII gate -> extract (runExtractionCore) -> merge (merge.ts; context + referrer
//   attestations + [population, slice 8]) -> evaluate (engine.ts; requested +
//   candidateExamSites[]) -> Advisory -> write ONE `assessments` row -> respond.
// The model EXTRACTS only (invariant 1); the engine decides. No free-text field
// anywhere in the request or the response. A gate rejection or a fail-closed
// national bundle is a typed error AND still writes an `assessments` row with
// `validation_failures` populated and no Advisory (the failure is part of the
// record).

// The one INSERT. `fields` is already JSON-ready (objects, not strings).
async function writeAssessmentRow(db: D1Database, env: Bindings, f: {
  bundleVersions: any; engineVersion: string | null; vocabularyVersion: string | null;
  promptVersion: string | null; equivalenceListVersion: string | null;
  modelId: string | null; modelProvider: string | null; documentationStandard: string;
  questionnaireResponse: any; advisory: any; discrepancies: any; validationFailures: any;
  redactionPatterns: string[] | null; attestations: any; examSiteSelection: any;
  performedBy: string | null; regressionRunId: string | null; noteRedacted?: string | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const J = (v: any) => (v == null ? null : JSON.stringify(v));
  await db.prepare(
    `INSERT INTO assessments (id, created_at, bundle_versions, engine_version, vocabulary_version, prompt_version, model_id, documentation_standard, questionnaire_response, advisory, discrepancies, validation_failures, performed_by, regression_run_id, equivalence_list_version, model_provider, redaction_patterns, attestations, exam_site_selection)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, now,
    JSON.stringify(f.bundleVersions ?? {}), f.engineVersion, f.vocabularyVersion,
    f.promptVersion, f.modelId, f.documentationStandard,
    JSON.stringify(f.questionnaireResponse ?? {}), JSON.stringify(f.advisory ?? null),
    J(f.discrepancies), J(f.validationFailures), f.performedBy, f.regressionRunId,
    f.equivalenceListVersion, f.modelProvider, J(f.redactionPatterns), J(f.attestations), J(f.examSiteSelection),
  ).run();
  if (env.AUDIT_STORE_REDACTED_NOTE === 'true' && typeof f.noteRedacted === 'string' && f.noteRedacted.trim().length) {
    await db.prepare('INSERT INTO assessment_notes (assessment_id, note_redacted, created_at) VALUES (?, ?, ?)')
      .bind(id, f.noteRedacted, now).run();
  }
  return id;
}

app.post('/api/assess', async (c) => {
  const guard = guardInternalAssess(c);
  if (guard) return guard;
  const rl = await assessRateLimit(c, 'assess');
  if (rl) return rl;

  let body: any;
  try {
    body = await c.req.json();
  } catch (e: any) {
    return c.json({ error: 'Body is not valid JSON', message: e.message }, 400);
  }
  const note = typeof body.note === 'string' ? body.note : '';
  if (!note.trim()) return c.json({ error: 'note (the free-text referral note) is required' }, 400);
  const requestedExamSite: string | undefined = typeof body.requestedExamSite === 'string' && body.requestedExamSite ? body.requestedExamSite : undefined;
  if (!requestedExamSite) return c.json({ error: 'requestedExamSite (a published exam/site id) is required' }, 400);
  const context = body.context && typeof body.context === 'object' ? body.context : {};
  const attestations = body.attestations && typeof body.attestations === 'object' ? body.attestations : {};

  const engine = await import('./engine');
  const docStd = engine.isDocumentationStandard(body.documentationStandard) ? body.documentationStandard : 'strict';
  const allowSignedOff = c.env.ASSESS_ALLOW_SIGNED_OFF === 'true';
  const performedBy = c.req.header('x-assess-identity') || c.req.header('cf-access-authenticated-user-email') || (typeof body.performedBy === 'string' ? body.performedBy : null);
  const regressionRunId = typeof body.regressionRunId === 'string' ? body.regressionRunId : null;

  const core = await runExtractionCore(c, { note, context, requestedExamSite });

  // Extraction failed. PII / provider errors: typed error, no audit row (nothing
  // was assessed and a PII-residual note must not be stored). Gate rejection and
  // fail-closed national bundle: typed error + an audit row with
  // validation_failures and no Advisory.
  if (!core.ok) {
    if (core.kind === 'gate') {
      const assessmentId = await writeAssessmentRow(c.env.DB, c.env, {
        bundleVersions: {}, engineVersion: engine.ENGINE_VERSION, vocabularyVersion: null,
        promptVersion: core.meta.promptVersion, equivalenceListVersion: core.meta.equivalenceListVersion,
        modelId: core.meta.modelId, modelProvider: core.meta.provider, documentationStandard: docStd,
        questionnaireResponse: null, advisory: null, discrepancies: null,
        validationFailures: { stage: 'extract-gate', failures: core.failures },
        redactionPatterns: core.meta.redaction.patternsHit, attestations: null, examSiteSelection: null,
        performedBy, regressionRunId, noteRedacted: core.redacted,
      });
      return c.json({ assessmentId, advisory: null, versions: versionsBlock(core.meta, engine.ENGINE_VERSION, null, {}), examSiteSelection: null, discrepancies: [], validation: { passed: false, failures: core.failures } }, 422);
    }
    if (core.body?.error === 'national-redflags-unavailable') {
      const assessmentId = await writeAssessmentRow(c.env.DB, c.env, {
        bundleVersions: {}, engineVersion: engine.ENGINE_VERSION, vocabularyVersion: null,
        promptVersion: null, equivalenceListVersion: null, modelId: null, modelProvider: null, documentationStandard: docStd,
        questionnaireResponse: null, advisory: null, discrepancies: null,
        validationFailures: { stage: 'extract', error: 'national-redflags-unavailable' },
        redactionPatterns: null, attestations: null, examSiteSelection: null,
        performedBy, regressionRunId,
      });
      return c.json({ assessmentId, error: 'national-redflags-unavailable', message: core.body.message, advisory: null, validation: { passed: false, failures: ['national-redflags-unavailable'] } }, 503);
    }
    return c.json(core.body, core.status as any);
  }

  // Merge: extracted QR + context + referrer attestations (+ population, slice 8).
  const mergeMod = await import('./merge');
  let mergeRes;
  try {
    mergeRes = mergeMod.merge({
      extractedResponse: core.builtQr,
      context,
      attestations,
      attestationLinkIds: core.attestationLinkIds,
      itemIndex: core.itemIndex,
    });
  } catch (e: any) {
    return c.json({ error: 'merge-failed', message: e.message }, 500);
  }

  // Evaluate: national layer first (fail closed, AD-19), then the requested exam
  // and the extractor's candidate exam/sites (AD-20).
  const nationalLibrary = await resolveNationalRedFlags(c.env.DB, c.env.KV, allowSignedOff);
  const candidateIds: string[] = core.modelExamSites.filter((e: any) => e?.requested === false && typeof e?.id === 'string' && e.id !== requestedExamSite).map((e: any) => e.id);
  if (!nationalLibrary) {
    const assessmentId = await writeAssessmentRow(c.env.DB, c.env, {
      bundleVersions: {}, engineVersion: engine.ENGINE_VERSION, vocabularyVersion: null,
      promptVersion: core.meta.promptVersion, equivalenceListVersion: core.meta.equivalenceListVersion,
      modelId: core.meta.modelId, modelProvider: core.meta.provider, documentationStandard: docStd,
      questionnaireResponse: mergeRes.questionnaireResponse, advisory: null, discrepancies: mergeRes.discrepancies,
      validationFailures: { stage: 'evaluate', error: 'national-redflags-unavailable' },
      redactionPatterns: core.meta.redaction.patternsHit, attestations: mergeRes.attestationsApplied,
      examSiteSelection: examSiteSelectionOf(core.modelExamSites, requestedExamSite),
      performedBy, regressionRunId, noteRedacted: core.redacted,
    });
    return c.json({ assessmentId, error: 'national-redflags-unavailable', message: 'The national red-flag / ACC safety library has no published bundle; assessment cannot proceed (AD-19 / SR-13).', advisory: null, discrepancies: mergeRes.discrepancies, validation: { passed: false, failures: ['national-redflags-unavailable'] } }, 503);
  }

  let engineResult: any;
  try {
    const requested = await resolveExamForEngine(c.env.DB, c.env.KV, requestedExamSite, allowSignedOff);
    const candidates = [];
    for (const id of candidateIds) candidates.push(await resolveExamForEngine(c.env.DB, c.env.KV, id, allowSignedOff));
    engineResult = await engine.runAssessment({ questionnaireResponse: mergeRes.questionnaireResponse, nationalLibrary, requested, candidates, documentationStandard: docStd });
  } catch (e: any) {
    if (e?.code === 'national-redflags-unavailable') return c.json({ error: 'national-redflags-unavailable', message: e.message }, 503);
    return c.json({ error: 'Engine evaluation failed', message: e.message }, 500);
  }

  const examSiteSelection = examSiteSelectionOf(core.modelExamSites, requestedExamSite);
  const versions = versionsBlock(core.meta, engineResult.engineVersion, engineResult.vocabularyVersion ?? null, engineResult.bundleVersions);

  const assessmentId = await writeAssessmentRow(c.env.DB, c.env, {
    bundleVersions: engineResult.bundleVersions, engineVersion: engineResult.engineVersion, vocabularyVersion: engineResult.vocabularyVersion ?? null,
    promptVersion: core.meta.promptVersion, equivalenceListVersion: core.meta.equivalenceListVersion,
    modelId: core.meta.modelId, modelProvider: core.meta.provider, documentationStandard: docStd,
    questionnaireResponse: mergeRes.questionnaireResponse, advisory: engineResult, discrepancies: mergeRes.discrepancies,
    validationFailures: null, redactionPatterns: core.meta.redaction.patternsHit, attestations: mergeRes.attestationsApplied,
    examSiteSelection, performedBy, regressionRunId, noteRedacted: core.redacted,
  });

  return c.json({
    assessmentId,
    advisory: engineResult,
    versions,
    examSiteSelection,
    discrepancies: mergeRes.discrepancies,
    attestationsApplied: mergeRes.attestationsApplied,
    unmappedContext: mergeRes.unmappedContext,
    validation: { passed: true, failures: [] },
  });
});

function versionsBlock(meta: ExtractionMeta, engineVersion: string | null, vocabularyVersion: string | null, bundleVersions: any) {
  return {
    engine: engineVersion,
    vocabulary: vocabularyVersion,
    prompt: meta.promptVersion,
    equivalenceList: meta.equivalenceListVersion,
    contract: meta.contractVersion,
    model: meta.modelId,
    provider: meta.provider,
    bundles: bundleVersions ?? {},
  };
}

export default {
  fetch: (req: Request, env: Bindings, ctx: any) => app.fetch(req, env as any, ctx),
  // Cron Trigger (wrangler.json triggers.crons): purge expired assessment_notes.
  scheduled: async (_event: any, env: Bindings, ctx: any) => {
    ctx.waitUntil(purgeExpiredNotes(env.DB, Number(env.AUDIT_NOTE_RETENTION_DAYS ?? 180)));
  },
};
