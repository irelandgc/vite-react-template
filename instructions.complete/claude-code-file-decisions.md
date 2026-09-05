> **[COMPLETE — 2026-09-05]** Filed `ARCHITECTURE_DECISIONS.md`; updated `CLAUDE.md`,
> `arch-mig-known-issues.md` (KI-45–50), `arch-mig-plan.md` (AD-01/AD-02 citations, 38/53
> site count, redflag Questionnaire note), `arch-mig-gap-analysis.md` (E7); filed the S1/S2
> session briefs as complete.
> Verification: verified — `npm run check` from `tooling/criteria-bundle/tooling` confirmed
> clean (nothing under the bundle tree touched); PR opened.
> Filed by: Claude Code

# Claude Code instruction: file the ARCH-MIG-01 architecture decisions register

**Model:** Sonnet · **Branch:** `chore/arch-mig-decisions` from main (after PR #3 merges) · **Scope:** documentation only; no code, no bundle content.

1. Add `documents/ARCHITECTURE_DECISIONS.md` (supplied). Do not edit its entries.
2. In `CLAUDE.md`, under "Target architecture (ARCH-MIG-01)", add after the invariants: "Design decisions are recorded in `documents/ARCHITECTURE_DECISIONS.md` (AD-xx), append-only, same rules as `SECURITY_DECISIONS.md`. Add an entry whenever a design call is made; cite AD ids in briefs and PR descriptions."
3. In `instructions/arch-mig-known-issues.md`, append the six items listed under "Items raised to other registers" as new KI rows with the next available numbers, in the section they belong to (A for the three clinical ones, B for the three source/content ones). Status for each: OPEN; Target fix: cite the AD id or review-pack decision id given.
4. In `instructions/arch-mig-plan.md`: add the `examSites` mapping to slice 2's bullets citing AD-01; add "Questionnaire for the national `redflag.*` indicators" to slice 4 citing S1 transcription-notes §7; change slice 7's site count to 38 bundles / 53 published IDs citing AD-01 and re-state the wave sizing as "to be re-sized"; add the version rule to slice 1's publish bullet citing AD-02. Tracked in the commit message, not as prose rewrites.
5. In `instructions/arch-mig-gap-analysis.md` §10, add a row: "E7 | Bundle key: PDF section (38) with published IDs mapped, or published ID (53) | Decided: AD-01 — section".
6. Mark `instructions/arch-mig-01-s1-content-brief.md` and `instructions/arch-mig-01-s2-tooling-brief.md` complete per the instruction-file lifecycle in `CLAUDE.md` (filing tag; `git mv` to `instructions.complete/`), citing PR #2 and PR #3 as verification. Leave `arch-mig-01-brief.md` in place — slices 2–11 remain.
7. Run `npm run check` from `tooling/criteria-bundle/tooling` to confirm nothing under the bundle tree was touched. Open a PR. Stop.
