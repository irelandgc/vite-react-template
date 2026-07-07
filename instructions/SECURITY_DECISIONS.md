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

---

## Open risks & production gates (SR)

| ID | Risk | Severity | Status | Mitigation / what unblocks | Gates |
|----|------|----------|--------|-----------------------------|-------|
| **SR-01** | **Unauthenticated cost sink.** `/api/triage/assess` invokes Claude (~NZ$0.05–0.15/call). A new public proxy with no effective rate limit is an open-ended cost and abuse vector. | High | Open | Confirm/add a rate limit on `assess` that is effective for proxied traffic (depends on SR-02). | SD-05 production deploy. |
| **SR-02** | **Proxy masks client IP.** The API worker sees the proxy's egress IP, not the end user's, so any per-IP limit collapses into one shared bucket for all users — one abuser starves everyone and runs up cost. | High (compounds SR-01) | Open | Forward the real client IP from `proxyPublic` via `CF-Connecting-IP` (already used server-side in the stack) so the API worker can limit per end user — or enforce the limit at the proxy layer keyed on `CF-Connecting-IP`. | SD-05 production deploy. |
| **SR-03** | **Origin/referer gate beyond CORS.** If the API worker enforces an Origin/Referer check on `assess` beyond CORS, worker-to-worker proxied calls have no `Origin` header and may be rejected or silently bypass the check. | Low–Medium | Open — to confirm | Confirm whether such a gate exists on the `assess` endpoint and its intended behaviour. | SD-05 production deploy. |

---

## Notes

- **Preview vs production exposure:** the preview origin (`*.workers.dev`) is not behind CF Access, which is why SD-02's routing works there and why SR-01/SR-02 are *invisible on preview*. Do not infer production safety from a working preview.
- **Step-two (structured output) is not a security item** but is logged separately as a feature prerequisite (temporal/ambiguity flags need a discrete field).
