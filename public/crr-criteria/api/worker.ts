// ══════════════════════════════════════════════════════════════
//  CRR Criteria API — Hono Worker for Cloudflare
//  Serves published criteria to both Viewer and Triage Advisor
//  Version: v1.0.0
// ══════════════════════════════════════════════════════════════

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
app.use('*', cors({
  origin: '*',
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
      'Cache-Control': 'public, max-age=300',
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
// In production, replace with Cloudflare Access JWT verification
// For now, accepts either cf-access-jwt-assertion OR x-admin-key header
async function requireAccess(c: any, next: any) {
  const jwt = c.req.header('cf-access-jwt-assertion');
  const adminKey = c.req.header('x-admin-key');
  if (!jwt && !adminKey) {
    return c.json({ error: 'Unauthorized — set x-admin-key header or use Cloudflare Access' }, 401);
  }
  // When ADMIN_KEY secret is set, validate it; otherwise accept any non-empty value
  if (adminKey && c.env.ADMIN_KEY && adminKey !== c.env.ADMIN_KEY) {
    return c.json({ error: 'Unauthorized — invalid admin key' }, 401);
  }
  await next();
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
    body.updatedBy || 'admin',
    id
  ).run();

  // Audit log
  await db.prepare(
    'INSERT INTO audit_log (action, entity_type, entity_id, changes, performed_by, performed_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    'update', 'criteria', id,
    JSON.stringify({ before: existing?.data, after: body.data }),
    body.updatedBy || 'admin',
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
    body.createdBy || 'admin'
  ).run();

  // Audit log
  await db.prepare(
    'INSERT INTO audit_log (action, entity_type, entity_id, changes, performed_by, performed_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind('create', 'criteria', body.id, JSON.stringify(body), body.createdBy || 'admin', now)
  .run();

  return c.json({ success: true, id: body.id }, 201);
});

// DELETE /api/admin/criteria/:id — Soft-delete
app.delete('/api/admin/criteria/:id', requireAccess, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const now = new Date().toISOString();
  const email = c.req.header('cf-access-authenticated-user-email') || 'admin';

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
    body.createdBy || 'admin'
  ).run();

  return c.json({ success: true, versionLabel: body.versionLabel }, 201);
});

// POST /api/admin/versions/:id/publish — Publish a draft version
app.post('/api/admin/versions/:id/publish', requireAccess, async (c) => {
  const db = c.env.DB;
  const kv = c.env.KV;
  const versionId = c.req.param('id');
  const now = new Date().toISOString();
  const email = c.req.header('cf-access-authenticated-user-email') || 'admin';

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
  const email = c.req.header('x-admin-email') || 'admin';

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
  const email = c.req.header('x-admin-email') || 'admin';

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

// POST /api/triage/assess — Proxy Anthropic API calls for the Triage Advisor
// No admin auth — public endpoint; API key kept server-side
app.post('/api/triage/assess', async (c) => {
  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

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

// POST /api/admin/extract-pdf — Server-side PDF processing via Anthropic API
// Accepts { pdf: base64string, currentCriteria: string }
// Returns { documentTitle, changes, summary }
app.post('/api/admin/extract-pdf', requireAccess, async (c) => {
  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY not configured — run: npx wrangler secret put ANTHROPIC_API_KEY' }, 500);
  }

  const body = await c.req.json();
  const pdfBase64 = body.pdf;
  const currentCriteria = body.currentCriteria || '';
  const chunkInfo = body.chunkInfo || '';
  const mode = body.mode === 'replace' ? 'replace' : 'diff';

  if (!pdfBase64) return c.json({ error: 'pdf field required' }, 400);

  const chunkNote = chunkInfo ? `\n\nNote: ${chunkInfo}` : '';

  const prompt = mode === 'replace'
    ? `Extract ALL radiology referral criteria from this NZ CRR document.${chunkNote}
Output ONLY valid JSON:
{"documentTitle":"...","exams":[{"id":"snake_case_id","title":"Exam title","modality":"CT|MRI|US|XR|NM|IR|FL","type":"singlesite|multisite","population":"adult|paediatric","inlineGuidance":"...","healthPathwaysUrl":"","groups":[{"title":"Priority group label","mandatory":false,"items":[{"type":"cb","id":"unique_id","label":"Full criteria text","shortLabel":"3-5 word label","mandatory":false}]}]}]}
For multisite exams use "sites" array instead of "groups": "sites":[{"id":"examid_site","label":"Site name","groups":[...]}]
Include every complete exam/site you can see. Omit healthPathwaysUrl (leave empty string).`
    : `Analyze this NZ CRR criteria document. Compare against current exam/site list:\n\n${currentCriteria}${chunkNote}\n\nRespond ONLY with JSON:\n{"documentTitle":"...","changes":[{"id":"1","type":"added"|"removed"|"changed","examSite":"...","priorityGroup":"...","currentText":null,"newText":"...","shortLabel":"...","reason":"..."}],"summary":"..."}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: mode === 'replace' ? 32000 : 8000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return c.json({ error: 'Anthropic API error: ' + errText }, 502);
  }

  const result: any = await response.json();
  const text = (result.content || []).map((b: any) => b.text || '').join('');

  try {
    const parsed = JSON.parse(text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
    return c.json(parsed);
  } catch (_) {
    return c.json({ error: 'Failed to parse Claude response', raw: text.substring(0, 500) }, 500);
  }
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

// ── Health check ─────────────────────────────────────────

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'crr-criteria-api',
    version: '1.0.0',
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
app.post('/api/seed', async (c) => {
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


export default app;
