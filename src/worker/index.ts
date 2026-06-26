import { Hono } from "hono";

type Bindings = {
  // Mirror of the API worker's ADMIN_KEY. Used to authenticate the proxy
  // when forwarding admin requests to crr-criteria-api. Set with:
  //   npx wrangler secret put ADMIN_KEY
  ADMIN_KEY: string;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

const API_BASE = "https://crr-criteria-api.fk4dsrmq5r.workers.dev";

app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

// ── Same-origin proxy to the CRR API worker ───────────────────────────────────
// The Admin tool calls /crr-api/... rather than crossing origins, so the
// Cloudflare Access cookie set for iteratio.nz/crr-criteria/admin/* travels
// with each request. Admin paths require a CF Access JWT or
// authenticated-user-email header — configure CF Access on iteratio.nz to
// cover /crr-api/api/admin/* so those headers are injected automatically.
// Public paths (criteria, regions, etc.) pass through with no auth check.

async function proxy(c: any, requireAdmin: boolean): Promise<Response> {
  const inUrl = new URL(c.req.url);
  const downstreamPath = inUrl.pathname.replace(/^\/crr-api/, "");
  const target = API_BASE + downstreamPath + inUrl.search;

  const email =
    c.req.header("cf-access-authenticated-user-email") ||
    c.req.header("x-admin-email");

  if (requireAdmin && !email) {
    return c.json(
      {
        error:
          "Admin endpoints require Cloudflare Access — sign in at the admin page first",
      },
      401,
    );
  }

  const fwdHeaders = new Headers();
  c.req.raw.headers.forEach((v: string, k: string) => {
    const lk = k.toLowerCase();
    if (
      lk === "host" ||
      lk === "connection" ||
      lk === "content-length" ||
      lk === "x-admin-key" // never trust an x-admin-key from the browser
    )
      return;
    fwdHeaders.set(k, v);
  });
  if (email) fwdHeaders.set("x-admin-email", email);
  if (requireAdmin && c.env.ADMIN_KEY) {
    fwdHeaders.set("x-admin-key", c.env.ADMIN_KEY);
  }

  const method = c.req.method;
  const init: RequestInit = { method, headers: fwdHeaders };
  if (method !== "GET" && method !== "HEAD") {
    init.body = c.req.raw.body;
    // @ts-expect-error — Cloudflare Workers requires duplex for streaming bodies
    init.duplex = "half";
  }

  const upstream = await fetch(target, init);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}

// ── Public pass-through for triage tool (no CF Access, no admin key) ─────────
// Used by the Triage Advisor's public fetch calls. This path is intentionally
// NOT behind Cloudflare Access — do NOT route admin calls here.
//
// Security invariants:
//   1. Inbound CF Access identity headers and the CF_Authorization cookie are
//      stripped before forwarding — this proxy must never carry an Access
//      identity to the API worker.
//   2. Upstream CORS headers are stripped from the response — calls are
//      same-origin after this proxy; relaying the API worker's cross-origin
//      allowlist would be wrong and conflicting.
//
// Production deploy of these routes requires a separate security sign-off:
// this adds a new public unauthenticated proxy to /api/triage/assess on
// iteratio.nz — rate-limit and abuse controls must be confirmed first.

const CF_ACCESS_STRIP_HEADERS = new Set([
  "cf-access-jwt-assertion",
  "cf-access-authenticated-user-email",
]);

function stripCFAuthCookie(cookieHeader: string): string {
  return cookieHeader
    .split(";")
    .map((c) => c.trim())
    .filter((c) => !c.toLowerCase().startsWith("cf_authorization="))
    .join("; ");
}

async function proxyPublic(c: any): Promise<Response> {
  const inUrl = new URL(c.req.url);
  const path = inUrl.pathname;

  // ── DIAGNOSTIC PROBES (remove before production deploy) ─────────────────
  // Probe 1 (/api/system-prompt): pure Hono response — no fetch at all.
  //   Tests whether Hono route registration works in the preview.
  if (path === "/api/system-prompt") {
    return c.json({ probe: 1, ok: true, path }, 200);
  }
  // Probe 2 (/api/qa-review): fetch a known-good third-party URL.
  //   Tests whether outbound fetch from the preview worker works at all.
  if (path === "/api/qa-review") {
    let status = -1;
    let err = "";
    try {
      const r = await fetch("https://example.com");
      status = r.status;
    } catch (e: any) {
      err = String(e);
    }
    return c.json({ probe: 2, exampleComStatus: status, fetchErr: err || null }, 200);
  }
  // ── END DIAGNOSTIC ────────────────────────────────────────────────────────

  const target = API_BASE + path + inUrl.search;

  const fwdHeaders = new Headers();
  c.req.raw.headers.forEach((v: string, k: string) => {
    const lk = k.toLowerCase();
    if (lk === "host" || lk === "connection" || lk === "content-length" || lk === "x-admin-key") return;
    if (CF_ACCESS_STRIP_HEADERS.has(lk)) return;
    if (lk === "cookie") {
      const cleaned = stripCFAuthCookie(v);
      if (cleaned) fwdHeaders.set("cookie", cleaned);
      return;
    }
    fwdHeaders.set(k, v);
  });

  const method = c.req.method;
  const init: RequestInit = { method, headers: fwdHeaders };
  if (method !== "GET" && method !== "HEAD") {
    init.body = c.req.raw.body;
    // @ts-expect-error — Cloudflare Workers requires duplex for streaming bodies
    init.duplex = "half";
  }

  const upstream = await fetch(target, init);

  const respHeaders = new Headers(upstream.headers);
  const corsKeys = [...respHeaders.keys()].filter((k) =>
    k.toLowerCase().startsWith("access-control-allow-"),
  );
  corsKeys.forEach((k) => respHeaders.delete(k));

  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

app.all("/api/system-prompt",        (c) => proxyPublic(c));
app.all("/api/triage/assess",        (c) => proxyPublic(c));
app.all("/api/triage/usage-log",     (c) => proxyPublic(c));
app.all("/api/qa-review",            (c) => proxyPublic(c));
app.all("/api/releases/latest-id",   (c) => proxyPublic(c));

app.all("/crr-api/api/admin/*", (c) => proxy(c, true));
// Admin endpoints that live outside the /api/admin/* namespace on the upstream
// worker. These are protected by requireAccess on the API and need x-admin-key
// injected by the proxy.
app.all("/crr-api/api/qa-reviews", (c) => proxy(c, true));
app.all("/crr-api/api/qa-viewer-reviews", (c) => proxy(c, true));
app.all("/crr-api/api/triage/usage-logs", (c) => proxy(c, true));
app.all("/crr-api/api/*", (c) => proxy(c, false));

// Fall through to static assets for everything the worker doesn't handle
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
