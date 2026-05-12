# CLAUDE.md

## Project Overview
Vite/React project hosting the CRR (Community Radiology Referral) clinical decision support tools. Main application code lives in `public/crr-criteria/`. Supporting documents in `documents/` and `instructions/`.

See @README.md for project overview. See @documents/CRR_Architecture_Briefing.md for architecture.

## Behavioural Rules — ALWAYS FOLLOW

1. **State assumptions explicitly.** Before writing code, list every assumption about function signatures, API shapes, data structures, or clinical logic. Ask for confirmation if uncertain. NEVER guess silently.

2. **Write minimum code.** Implement only what was requested. No speculative additions, no "while I'm here" refactors, no future-proofing unless explicitly asked.

3. **Make surgical changes.** Do not modify code outside the scope of the request. If adjacent code needs changing, flag it and ask first. NEVER refactor files you weren't asked to touch.

4. **Define success criteria before writing code.** State what "done" looks like. If tests exist, run them. If they don't, suggest what to test.

5. **When you hit an error twice, STOP.** Explain the issue and your failed approaches. Do not keep trying variations. Let me redirect.

6. **Ask before creating new abstractions, modules, or files.** Don't reorganise file structure without approval.

7. **Ask before installing new dependencies.**

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
Preserve: list of modified files, current task status, any pending constraints discussed in this session.
