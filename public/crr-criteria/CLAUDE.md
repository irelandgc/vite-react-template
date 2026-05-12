# CLAUDE.md — CRR Criteria Tools

## Tool Suite
Three web tools: Criteria Viewer (`viewer/`), Triage Advisor (`triage/`), Admin Tool (`admin/`).
Demo harness: `crr-demo-harness.html` simulates referral platform integrations.
Deployed at: iteratio.nz/crr-criteria (development)

See @../../instructions/crr-business-rules.md for business rules.
See @../../documents/CRR_Architecture_Briefing.md for architecture.

## Infrastructure — PRESERVE EXACTLY
- Worker API: crr-criteria-api.fk4dsrmq5r.workers.dev
- D1 database ID: 1a8307f9-69e9-4315-a8f3-7f6737dd9c55
- KV namespace ID: d8e1a512828d4dd7981d7b241213f396
- Framework: Hono; auth: `x-admin-key` header
- Seed KV via `POST /api/seed?key=` — CLI puts hit the wrong namespace
- HTML files in this folder are directly accessible without URL prefix

## Visual Design
- Triage Advisor is the design reference — Viewer should converge toward it
- Use shared `shared/crr-design-system.css` for cross-tool consistency
- Check both Viewer and Triage Advisor for regressions after CSS changes

## Clinical Rules — NON-NEGOTIABLE
- Priority codes (P2, P3) must NEVER appear in referrer-facing UI. Use timeframe language only: "Urgent (within two weeks)", "Non-deferrable (within six weeks)"
- Copy/send output always uses shorthand criteria text
- Passive mode disables checkboxes entirely
- Not-funded items must never appear as tickable criteria
- Indication-first display transform applies to criteria presentation
- NHI validation: legacy = modulus 11, new format = modulus 23 (NOT 24)
- For criteria data changes, confirm with Tim/James/Alex before reimporting — structural merges may be intentional clinical decisions

## Security — NON-NEGOTIABLE
- NEVER expose API keys in browser-facing code
- No PII should reach the Anthropic API — maintain client-side PII pre-flight check
- Triage Advisor uses Cloudflare Workers to proxy Anthropic API (key stays server-side)
- Two-layer PII detection: client-side pre-flight + server-side gate; auto-redaction preferred over blocking
- Auth changes (`x-admin-key` header pattern) require explicit approval

## Triage Advisor Specifics
- Default model: Claude Sonnet 4 via Cloudflare Workers
- Compare Models mode: Sonnet 4 vs Opus 4.6 side-by-side
- System prompts: SP-01 (redirect/exclusion check) and SP-02 (temporal ambiguity flagging)
- If modifying system prompts, show the full before/after diff

## Demo Harness
- Two-mode toggle: Explore Tools / Integration Demo
- Uses `postMessage` cross-window communication
- `sendButton=on` URL parameter activates send button in integration mode
