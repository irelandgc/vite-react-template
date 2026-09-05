> **[COMPLETE — 2026-09-05]** Storage (D1 migrations 0006–0008, catch-up + bundle
> registry), API worker routes (2 public GET, 2 admin POST, `/api/criteria/:id`
> resolving through `exam_sites`), runtime loading (`loadBundle`,
> `loadForExamSiteId`), read-only Admin Bundles tab, and the AD-01 `check` rule
> delivered. One real design call made mid-session, recorded as AD-12 (KV
> content is immutable; `state` lives in D1 and is overlaid on GET). CT CAP
> exercised through the full `transcribed → signed-off → published` lifecycle
> live against `wrangler dev` with real local D1/KV — every scenario in the
> Done gate proven, including both AD-02 guard directions and the unresolved-
> linkId rejection.
> Verification: verified for all route behaviour (19 live request/response
> pairs against `wrangler dev`, both positive and negative cases, recorded in
> the PR). **Not independently verified: automated Vitest coverage.**
> `@cloudflare/vitest-pool-workers` 0.22.0 fails to inject the `cloudflare:test`
> module for any worker whose wrangler config declares D1/KV bindings —
> reproduced in isolation against a trivial worker with zero application code,
> so this is a tooling-version issue, not a defect in this session's code. The
> Admin Bundles tab is new UI verified only by close mirroring of the existing,
> working `ViewerUsageTab` pattern and a manual JS bracket-balance check — not
> rendered in a real browser this session.
> Filed by: Claude Code

# Claude Code Brief: ARCH-MIG-01 slice 2 — Bundle registry and runtime loading

**Model:** Claude Sonnet · **Branch:** `feature/arch-mig-slice2-registry` from main · **Scope:** plan slice 2 only. Sonnet is right for this: it is plumbing against a settled design; every design question is already answered in `documents/ARCHITECTURE_DECISIONS.md`.

**Gate to start:** PR #3 (publish tooling) and the decisions-filing PR are merged; `instructions/arch-mig-plan.md` slice 0 is filed complete with SR-10 (cql-execution under `nodejs_compat`) closed. If slice 0 is not filed complete, stop and report.

## Read first

1. `CLAUDE.md` — target-architecture invariants and the instruction-file lifecycle.
2. `documents/ARCHITECTURE_DECISIONS.md` — **AD-01** (exam/site IDs map onto 38 bundles), **AD-02** (versioning), **AD-08** (provenance), **AD-09** (cross-bundle dependencies), **AD-10** (review gate). Cite AD ids in code comments and the PR.
3. `instructions/arch-mig-plan.md` — slice 2, plus §4 interims and §5 register entries (KI-23, KI-37).
4. `instructions/arch-mig-gap-analysis.md` §5 (publish states) and §2 Gap 2 (working-copy editor stays on JSON for the pilot).
5. `documents/SECURITY_DECISIONS.md` — SD-02/SD-05 (public proxy pattern the service binding will replace in slice 3) and NFR-004 (admin routes behind Access + API key).
6. `tooling/criteria-bundle/tooling/publish.mjs` and the local registry it writes (`registry/<examSite>/<version>.json`, `index.json`) — the bundle JSON and index shapes are the contract; do not redesign them.
7. The API worker (`public/crr-criteria/`) and its D1 migrations; `src/worker/index.ts` for how the main worker fronts it today.

## Deliverables

### 1. Storage
- KV: `bundle:<examSite>:<version>` (immutable — a write to an existing key is refused) and `bundle:<examSite>:latest-published`.
- D1 migration adding `bundles` (exam_site, version, state, logic_hash, vocabulary_version, source_type, signoff_ref, published_by, published_at, test_summary JSON) and `exam_sites` (id, title, bundle_key, live) — the AD-01 mapping. Seed `exam_sites` from the current published exam/site list (53 rows) with `bundle_key` per the section map in `tooling/criteria-bundle/vocabulary/transcription-notes.md` §F-09; only CT CAP's row is `live` for the engine.
- `schema.sql` regenerated from migrations (KI-37).

### 2. API worker routes
- `GET /api/bundle/:examSite/:version` and `/latest` — serves the immutable bundle JSON; ETag = logic hash; `Cache-Control` long for versioned, short for latest.
- `GET /api/bundles` — states for all bundles and the `exam_sites` mapping (the Admin bundle-state view's data source).
- `GET /api/criteria/:id` **resolves through `exam_sites`** (AD-01): `xr_elbow` returns the upper-limb bundle's PlanDefinition/Questionnaire when that bundle is `published`, otherwise the current published JSON unchanged (gap analysis §5 interim). Response includes `examSite: { id, title }` and `bundle: { key, version, sectionTitle, pages }` so the Viewer can head the page with the chosen exam and show the PDF section as the source line.
- `POST /api/admin/bundles/publish` — accepts a bundle produced by `publish.mjs`; validates it with the same checks as `check --bundle` (schema, logic hash, linkId resolution, page-or-draft reference, AD-02 version rule against the previous version); writes KV + D1 + an audit row (KI-23). Behind Access + API key.
- `POST /api/admin/bundles/:examSite/state` — `transcribed → signed-off` requires a `signoff_ref`; `signed-off → published` requires the bundle to exist in KV and sets `latest-published`. No other transitions. Audit row on each.

### 3. Runtime loading
- A `loadBundle(examSite, version | 'latest')` module in the API worker with per-isolate cache keyed by logic hash; fails visibly (typed error, no fallback to embedded criteria — invariant 3) when a bundle is missing.
- `loadForExamSiteId(id)` that resolves via `exam_sites` and returns `{ examSite, bundle }`. Slice 3's engine route will call this.

### 4. Admin Tool
- Read-only "Bundles" tab: exam/site → bundle key, version, state, logic hash (short), vocabulary version, source type, sign-off ref, published by/at, test summary. No editing (AD-10; plan §4 interim).

### 5. Checks
- `check` (tooling) gains the AD-01 rule: every id in `exam_sites` resolves to exactly one bundle key present in the registry or planned in the section map; every bundle key is referenced by at least one id.
- Vitest: publish route rejects a re-publish of an existing version, a major bump with unchanged hash, a minor bump with changed hash (AD-02), and a bundle with an unresolved linkId; state route rejects illegal transitions; `GET /api/criteria/xr_elbow` resolves to the upper-limb bundle key; `loadBundle` throws on a missing bundle.

## Done (from the plan, adjusted by AD-02 and AD-10)
CT CAP `v1.0.0` is in KV and D1 in state **`transcribed`** and loadable by version; the `transcribed → signed-off → published` path is exercised in tests against a scratch namespace only. The real transition of CT CAP to `signed-off` waits on the clinical review (AD-10). The plan allows Gary to act as interim signatory; that is Gary's call and Gary's action, not this session's. Admin Tool shows the Bundles tab. `npm run build && npm test && npm run check` (tooling) and Vitest green; `wrangler dev` round trip for the four GET routes.

## Do not
- Do not touch bundle content, the vocabulary, CQL, or `publish.mjs`'s bundle shape.
- Do not implement the engine route, the service binding, or the audit record beyond the publish/state rows — those are slice 3.
- Do not enable any new public route in production config; the Viewer keeps serving current JSON until slice 6 flips it.
- Do not migrate or delete existing `criteria.data` rows; the JSON working copy stays (Gap 2).
- Same error twice: stop and report.

## Report
Migration and route list; the `exam_sites` seed with any id that had no obvious section (there should be none — 53 ids, 38 keys); test output; anything in the current API worker that conflicted with the design; a new AD entry if you had to make a design call. File this brief per the lifecycle in `CLAUDE.md`. Stop.
