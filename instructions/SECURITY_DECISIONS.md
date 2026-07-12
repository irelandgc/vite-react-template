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

---

## Open risks & production gates (SR)

| ID | Risk | Severity | Status | Mitigation / what unblocks | Gates |
|----|------|----------|--------|-----------------------------|-------|
| **SR-01** | **Unauthenticated cost sink.** `/api/triage/assess` invokes Claude (~NZ$0.05–0.15/call). A new public proxy with no effective rate limit is an open-ended cost and abuse vector. | High | Open | Confirm/add a rate limit on `assess` that is effective for proxied traffic (depends on SR-02). | SD-05 production deploy. |
| **SR-02** | **Proxy masks client IP.** The API worker sees the proxy's egress IP, not the end user's, so any per-IP limit collapses into one shared bucket for all users — one abuser starves everyone and runs up cost. | High (compounds SR-01) | Open | Forward the real client IP from `proxyPublic` via `CF-Connecting-IP` (already used server-side in the stack) so the API worker can limit per end user — or enforce the limit at the proxy layer keyed on `CF-Connecting-IP`. | SD-05 production deploy. |
| **SR-03** | **Origin/referer gate beyond CORS.** If the API worker enforces an Origin/Referer check on `assess` beyond CORS, worker-to-worker proxied calls have no `Origin` header and may be rejected or silently bypass the check. | Low–Medium | Open — to confirm | Confirm whether such a gate exists on the `assess` endpoint and its intended behaviour. | SD-05 production deploy. |
| **SR-04** | **Snapshot-publish route can blank the match-data KV blob.** The unused snapshot-publish path, if ever invoked, would overwrite `criteria:match-data` with an empty structure. Production TA would not notice (it reads the embedded constant — SD-06), but the regression runner reads that blob and would silently lose its data source. | Medium | Open — fix approved | No-op the route's KV write (`transformToMatchFormat()` deletion + write removal), specced in TA-SRC-01 §6.1 as a standalone early change, approved to precede the TA-REG-01 baseline. Until deployed: do not invoke snapshot-publish. | None (fix pre-approved); closes with the TA-SRC-01 footgun commit. |

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
