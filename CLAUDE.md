# CLAUDE.md

## Project Overview
Vite/React project hosting the CRR (Community Radiology Referral) clinical decision support tools. Main application code lives in `public/crr-criteria/`. Supporting documents in `documents/` and `instructions/`.

See @README.md for project overview. See @documents/CRR_Architecture_Briefing.md for architecture.

## Guiding Principle
**Code is liability.** Every line carries maintenance cost. Target the minimum structure a future developer can understand without original context. Every abstraction must trace to a concrete, existing need — never a speculative one. When in doubt, build less.

## Behavioural Rules — ALWAYS FOLLOW

1. **State assumptions explicitly.** Before writing code, list every assumption about function signatures, API shapes, data structures, or clinical logic. Ask for confirmation if uncertain. NEVER guess silently.

2. **Write minimum code.** Implement only what was requested. No speculative additions, no "while I'm here" refactors, no future-proofing unless explicitly asked.

3. **Make surgical changes.** Do not modify code outside the scope of the request. If adjacent code needs changing, flag it and ask first. NEVER refactor files you weren't asked to touch.

4. **Define success criteria before writing code.** State what "done" looks like. If tests exist, run them. If they don't, suggest what to test.

5. **When you hit an error twice, STOP.** Explain the issue and your failed approaches. Do not keep trying variations. Let me redirect.

6. **Ask before creating new abstractions, modules, or files.** Don't reorganise file structure without approval.

7. **Ask before installing new dependencies.**

## Design Briefs (briefs marked DESIGN ONLY)

- Produce markdown documents only — zero implementation code, zero schema changes
- Treat STOP gates literally: end the turn at a STOP and wait for review. Do not continue past a gate because the next phase seems obvious
- Every proposed schema feature or abstraction must trace to a specific, named item in the actual codebase or criteria data — cite it
- A thin "non-goals" section is a warning sign of over-design; state clearly what you decided NOT to build and why

## Model Boundaries

- Claude Fable 5 sessions: design work and complex data tasks only. Never modify production Worker routes, the deployed system prompt, or deployed assets in a Fable session
- The production Triage Advisor model is a governance-controlled setting. NEVER change it, even in dev/test code paths, without an explicit instruction referencing sign-off — changing models mid-evaluation affects evaluator attribution
- Note: newer Sonnet versions may reject `temperature: 0.1` (400 error) — flag, don't silently work around

## Production Safety — CRR-Specific

- **Prompt activation goes through the admin API endpoint, never raw SQL.** Raw SQL writes bypass the KV cache publish step and leave stale prompts live (this happened — evaluators unknowingly tested on an old version for days)
- **All regression and test assessments go through the Worker API endpoint**, never direct Anthropic API calls. Direct calls bypass the system prompt assembly, post-processing, and D1 audit logging — invalidating the run
- A single publish action updates KV for all consumer tools; if you change criteria data or prompts, confirm the publish step ran and verify what's live

## Clinical Data Rules

- **Criteria fidelity:** never alter clinical meaning when restructuring, migrating, or reformatting criteria data. If a transformation is ambiguous, stop and ask
- **Priority code suppression:** internal codes (P2, P3, S2 etc.) must never appear in referrer-facing UI or output text — timeframe language only
- **Not-funded items are never tickable/selectable** — informational display only
- No patient-identifiable data in any test fixture, log, example, or commit

## Environment
- macOS / zsh / Terminal.app (not VS Code integrated terminal)
- ALWAYS use `npx wrangler` — never bare `wrangler`
- Instruction files for Claude Code go in `instructions/` at project root (NOT inside `public/`)

## Code Style
- ES modules (import/export), not CommonJS
- Destructure imports when possible
- Prefer vanilla CSS — avoid CSS-in-JS
- When writing standalone HTML tools, keep CSS/JS in a single file unless complexity demands separation

## Before Committing
- Do not commit secrets, API keys, or credentials
- Do not commit node_modules or .wrangler directories

## When Compacting
Preserve: list of modified files, current task status, any pending constraints discussed in this session, and which STOP gate (if any) the session is holding at.
