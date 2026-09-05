# CRR Tool Suite — Security Decisions & Risk Register

**Purpose:** a single, durable record of security-relevant design decisions and open risks for the CRR Clinical Decision Support Tool Suite, so they don't live only in chat history or one person's memory.

**How to use this file:**
- Append-only. Don't rewrite past entries — supersede them (set status to `Superseded by SD-xx`).
- `SD-xx` = a decision made. `SR-xx` = an open risk or gate.
- When a production change is gated on a risk, the decision references the `SR-xx` ID.
- Both Gary and Claude Code add entries here whenever a security-relevant call is made. (Point CLAUDE.md at this file so Code maintains it as part of normal work.)

---

## Standing security posture (baseline — defined elsewhere)

These are the existing programme positions; this register tracks *deltas* against them, not duplicates. Source: Business Requirements §9 NFRs.

- **NFR-004** — Admin Tool behind Cloudflare Access + API-key header.
- **NFR-005** — Criteria Viewer and Triage Advisor are **public / unauthenticated** for pilot. *(This is the constraint that drives SD-02.)*
- **NFR-006** — LLM API keys server-side only; never in client code; calls proxied through a worker.
- **NFR-007** — No patient-identifiable information stored in any DB, cache, or log; referral text processed in-session only.
- **NFR-008** — NHI auto-redaction before any API call/storage (modulus 11 / 23).
- **NFR-009** — Production AI calls to an HNZ-approved residency endpoint (Azure OpenAI, Australia East approved as alternative).

---

## Decision log (SD)

| ID | Date | Decision | Why | Status |
|----|------|----------|-----|--------|
| **SD-01** | 2026-06-25 | Role-aware display built as a **presentation-only** transform — no change to system prompt, assessment request/response contract, schema, or D1. | Keep blast radius minimal and fully reversible; one assessment → one D1 audit row regardless of role. | Active — branch `feature/role-aware-view`, not merged. |
| **SD-02** | 2026-06-25 | Public Triage Advisor API calls routed **same-origin** through a **new public proxy** (`/api/*` → `proxyPublic` on the main worker), **not** through the Access-gated `/crr-api/*` admin proxy. | `/crr-api/*` is CF Access gated (confirmed: unauthenticated `GET /crr-api/api/system-prompt` → HTTP 302 to Access login). Triage must stay public per NFR-005; routing it via `/crr-api/*` would bounce GPs to a login. | Active on branch/preview. **Production deploy gated — see SR-01, SR-02.** |
| **SD-03** | 2026-06-25 | `proxyPublic` strips inbound credential/identity headers before forwarding: `x-admin-key`, `cf-access-jwt-assertion`, `cf-access-authenticated-user-email`, and the `CF_Authorization` cookie. | This public route must never carry an admin key or an Access identity to the API worker. The public/authenticated separation is the entire reason it exists apart from the admin proxy. | Active. |
| **SD-04** | 2026-06-25 | `proxyPublic` strips upstream CORS headers (`access-control-allow-*`) from the returned response. | Calls are now same-origin; relaying the API worker's `iteratio.nz` allowlist header would be conflicting/noise. | Active. |
| **SD-05** | 2026-06-25 | Production deployment of the public proxy is gated on **explicit security sign-off**, separate from design approval. | It adds a new **public, unauthenticated ingress to the model-calling assessment endpoint** (`/api/triage/assess`) on the primary domain. That is a security change, not a plumbing tweak. | Open gate — not deployed. |
| **SD-06** | 2026-07-12 | **Incident recorded:** Triage Advisor criteria source staleness (three broken layers — see Incident detail below). Remediation is TA-SRC-01 (accepted 6 Jul); deployment gated on the TA-REG-01 baseline run. Footgun no-op (see SR-04) approved to precede the baseline. | All evaluator assessments (May–Jun 2026) ran against criteria differing from the published Apr 2026 release in coverage and, for a minority of items, content. Effective criteria version per assessment is reconstructable from git deploy history. Disclosure added to the evaluator report. | Active — remediation designed, not yet implemented. |
| **SD-07** | 2026-07-12 | **Governance gap recorded and rationale recovered:** system prompt v2.3.0 was promoted to production on 2026-05-24; the contemporaneous release-log entry wrongly stated v2.2.0 was active, and no decision record was made at the time. The promotion was deliberate: it was activated via the admin API in the same working session that compared Sonnet 4 vs Sonnet 4.6 (regression: 18/20 on 4.6 vs 16/20 on 4), on the strength of the aggregate improvement, with the two failing cases accepted as known cost. Those two failures are consistent with the LP-004/CR-003 regressions later flagged (not independently confirmed against the original run output). Provenance: operator recollection (Gary, 12 Jul) corroborated by the session record of the activation. | Question raised 21 Jun (VERIFICATION-2026-06-21) and unanswered since; closed with a recovered, evidence-consistent account. The gap was record-keeping, not decision-making. Go-forward rule: prompt activations are Tim-visible governance events, admin-API only (CLAUDE.md, Production Safety), recorded here at the time. TA-PROMPT-01's regression plan treats current production as an imperfect baseline accordingly. | Recorded — rationale recovered; go-forward rule in force. |
| **SD-09** | 2026-08-24 | Inbound clinical text is handed from the two integration harnesses (`hl/index.html`, `crr-demo.html`) to the Triage Advisor (`triage/index.html`) via `sessionStorage` (key `crr-triage-note`), never a URL query parameter. An explicit `Referrer-Policy: no-referrer` is set on all three pages. | Closes SR-08. `window.open()`-created windows and same-origin iframes both inherit a copy of the opener's `sessionStorage`, so the note survives the handoff without ever being written into a URL, browser history, or a server access log. `no-referrer` removes reliance on the browser's undocumented default (`strict-origin-when-cross-origin`) for the cross-origin Google Fonts request. Establishes the pattern any future PMS/referral-platform integration (BRD TA-005) must follow — see the design constraint added to the PTA wording. | Active. PTA "Integration with referral systems" section updated 2026-08-24 to record the finding as closed and state the design constraint (sessionStorage handoff, no-referrer, no clinical content in URLs). PTA is maintained externally, not tracked in this repo. |

---

## Open risks & production gates (SR)

| ID | Risk | Severity | Status | Mitigation / what unblocks | Gates |
|----|------|----------|--------|-----------------------------|-------|
| **SR-01** | **Unauthenticated cost sink.** `/api/triage/assess` invokes Claude (~NZ$0.05–0.15/call). A new public proxy with no effective rate limit is an open-ended cost and abuse vector. | High | Open | Confirm/add a rate limit on `assess` that is effective for proxied traffic (depends on SR-02). | SD-05 production deploy. |
| **SR-02** | **[Superseded 2026-09-05 — original description did not describe a deployed component; see corrected description below.]** ~~Proxy masks client IP. The API worker sees the proxy's egress IP, not the end user's, so any per-IP limit collapses into one shared bucket for all users — one abuser starves everyone and runs up cost.~~ **Why superseded:** this described `feature/role-aware-view`'s `proxyPublic` route, which was never merged — confirmed via direct inspection of `src/worker/index.ts` (DOC-AUDIT-2026-09 §3.1, disagreement 3) that no `/api/*` public-proxy route exists in deployed code, only `/crr-api/*` (CF-Access gated). **Corrected description:** the Triage Advisor (`triage/index.html`) calls the `crr-criteria-api` worker directly, cross-origin, at `crr-criteria-api.fk4dsrmq5r.workers.dev`. Per-IP rate limiting (30/hr on `assess`) is therefore intact — nothing masks client IPs on this path — but the endpoint has no Cloudflare Access, no Turnstile challenge, and no daily budget cap. SR-01's cost-sink risk stands on its own merits; SR-02 as originally described does not apply to any deployed component. **Note:** the SR-01/SR-02 sign-off gate must be assessed against this corrected description — signing off against the superseded wording would approve a risk that isn't the one running in production. | High (compounds SR-01) | Open | Confirm CF Access, Turnstile, or a daily budget cap on the direct cross-origin `assess` endpoint before this gate can close. | SD-05 production deploy. |
| **SR-03** | **Origin/referer gate beyond CORS.** If the API worker enforces an Origin/Referer check on `assess` beyond CORS, worker-to-worker proxied calls have no `Origin` header and may be rejected or silently bypass the check. | Low–Medium | Open — to confirm | Confirm whether such a gate exists on the `assess` endpoint and its intended behaviour. | SD-05 production deploy. |
| **SR-04** | **Snapshot-publish route can blank the match-data KV blob.** The unused snapshot-publish path, if ever invoked, would overwrite `criteria:match-data` with an empty structure. Production TA would not notice (it reads the embedded constant — SD-06), but the regression runner reads that blob and would silently lose its data source. | Medium | **Closed — deployed 2026-07-12, commit `2cc1f38`** | `transformToMatchFormat()` call, the `kv.put('criteria:match-data', ...)` write, and the stub function itself removed from `POST /api/admin/versions/:id/publish` (worker.ts). Deployed via `wrangler deploy --config public/crr-criteria/wrangler.json` (version `491f5751-236d-490f-bc20-a869fefc7dd1`); confirmed no other writer of the key is a stub (`GET /api/seed?key=match-data` and `POST /api/admin/publish`'s conditional `body.matchData` write both require an authenticated caller to supply real data). `GET /api/match-data` verified byte-identical pre/post deploy (sha256 `20cf2327…`). | None — closed. |
| **SR-05** | **Model alias drift.** Production model `claude-sonnet-4-6` cannot be version-pinned; behaviour can change without a decision record (observed: DG-003, INT-001 divergence between 22 Jun and 12 Jul under identical config). | Medium | Open | Same-day paired source runs for the TA-SRC-01 measurement; minimise elapsed time between paired comparisons generally; longer-term, a pinnable endpoint (Azure OpenAI dated deployments, NFR-009) removes the risk. | Nothing — measurement-design mitigation in force. |
| **SR-08** | **Demonstration harness passed the referral note to the Triage Advisor as a URL query parameter.** `hl/index.html` and `crr-demo.html` (the latter found during the fix — not in the original finding) opened the Triage Advisor via `window.open()`/iframe with the note in `?presentation=`, URL-encoded only (`encodeURIComponent` — escaping, not encryption). Three exposure paths, all occurring **before** the client-side redaction pipeline runs: (1) the unredacted note written to browser history/back-forward state in both windows; (2) the handoff is a real HTTP GET, so the full query string reaches the server and would land in any request logging on the zone; (3) referrer leakage to cross-origin resources (Google Fonts) relied on the unset browser default rather than an explicit policy. | Medium — High if ever used with real referral content | **Closed — deployed 2026-08-24, commit `12cd585`** | `sessionStorage.setItem('crr-triage-note', ...)` replaces `&presentation=...` in `buildTriageUrl()` (hl/index.html) and `buildToolUrl()` (crr-demo.html); `triage/index.html` reads and immediately clears the same key on load instead of `getParam('presentation')`. `<meta name="referrer" content="no-referrer">` added to all three pages. Deployed via root `wrangler deploy` **before** commit `12cd585` (Cloudflare Workers assets deploy is independent of git; deployment version `d3a754c9-fc28-4e0e-bd37-231659f99869`, confirmed live 2026-08-24 by diffing the 3 uploaded assets byte-for-byte against the committed source). Finding doc moved to `instructions.complete/SR-08-url-handoff-finding.md`. | **Outstanding, not yet actioned:** (a) confirm no real patient data ever traversed the old URL-param path — DB has no field distinguishing harness-origin from direct-entry assessments, so this needs a human/operator answer, not a query; (b) check whether Cloudflare request/Logpush logging is enabled on the `iteratio.nz` zone — if so, historical logs may already contain unredacted note text and a retention question follows. Neither blocks this fix (which prevents recurrence); both were listed as pre-commit checks in the original finding and are unresolved. |

---

## Incident detail — SD-06 (Triage Advisor criteria staleness)

**Discovered:** 4–6 July 2026 (CC-DESIGN-01 Phase 0; TA-SRC-01 Phase 0). Full evidence: `instructions/ta-src-phase0-findings.md`.

Three independent layers were broken — no single fix would have sufficed:

1. **Pipeline:** `transformToMatchFormat()` in the API worker is an empty stub — no publish has ever regenerated the `criteria:match-data` KV blob.
2. **Publish route:** the Admin tool's publish never sends match-data, so the "Viewer and Triage Advisor updated" toast overstated what publish did.
3. **Fetch:** `API_BASE = ""` in `triage/index.html` makes the KV fetch dead code — production assessments run entirely off `EMBEDDED_MATCH_DATA`, a compile-time constant frozen at HTML build time (39 sites / 336 items vs the published 53 / 473).

**Related defects found in the same investigation:**
- Production page citations reference the superseded PDF edition (fix rides with TA-SRC-01 decision 1, page backfill).
- Snapshot-publish blanking footgun — logged as SR-04.

**Go-forward rule (in CLAUDE.md):** every consumer of published criteria reads it at runtime from the publish pipeline or fails visibly — no silent embedded fallbacks. `criteria_version` logged on every assessment (TA-SRC-01 §3.4).

---

## Notes

- **Preview vs production exposure:** the preview origin (`*.workers.dev`) is not behind CF Access, which is why SD-02's routing works there and why SR-01/SR-02 are *invisible on preview*. Do not infer production safety from a working preview.
- **Step-two (structured output) is not a security item** but is logged separately as a feature prerequisite (temporal/ambiguity flags need a discrete field).
