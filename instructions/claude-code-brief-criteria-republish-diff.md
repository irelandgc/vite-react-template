# Claude Code Brief — Investigate the 23 July Criteria Republish (v4.1.0 → v4.1.2)

**Status:** READ-ONLY. Investigation and report only. Do not publish, republish, edit criteria data, roll back, or modify any tool. This runs in parallel with the DOC-AUDIT-2026-09 Part 4 tidy-up and does not breach the no-system-changes gate, because it changes nothing.

**Priority:** Ahead of the audit's other "Needs Gary" items. If the finding below holds, this is a clinical content integrity issue affecting live users, not a documentation issue.

## Why

`DOC-AUDIT-2026-09` §3.1 recorded, as an incidental observation, that live published criteria moved from `v4.1.0` to `v4.1.2` on 2026-07-23 with **no release-log entry**, and that the live adult item count dropped from **331 to 320** while paediatric stayed at 142 and site counts were unchanged (31 adult / 22 paediatric).

Reconciling against the authoritative source: `pdf-criteria-all.json` is documented as 53 sites / **473 items**. Pre-republish, 331 + 142 = 473 — an exact match. Post-republish, 320 + 142 = **462**, which is 11 short.

**This reconciliation is an inference, not an established fact — verifying or refuting it is the first job of this brief.** If it holds, then 11 adult criteria items present in the national criteria are absent from what the Criteria Viewer has been serving clinicians since 23 July, and referrers cannot tick criteria that are not displayed.

Three reasons this matters beyond tidiness:

1. **Criteria fidelity** is a stated BRD design principle (§6) and GEN-001 makes the PDF the single source of truth. A silent divergence breaches both.
2. **Silent under-matching** is the same failure class as the `ct_other` gap — referrals fail to match criteria that should be available.
3. **Evaluation evidence integrity.** Assessments run before 23 July used a different criteria set from those run after. With 111 distinct clinician submissions heading into NAIAEAG engagement, an undocumented mid-evaluation content change is a foreseeable question from that group and needs a defensible answer.

---

## Part 1 — Establish the ground truth

1. Locate `pdf-criteria-all.json` and report its actual current counts: total sites, total items, adult vs paediatric split. **Do not assume 53/473** — confirm it from the file, and flag if the file itself has been modified since the counts were originally recorded (check `git log` on it).
2. Fetch live published criteria (`GET /api/criteria`, public read-only) and report the same counts.
3. Fetch `GET /api/version` and confirm the current published version and publish timestamp.
4. State plainly whether the 462-vs-473 gap is real, and if the numbers differ from those above, report the actual figures rather than forcing them to fit.

## Part 2 — Identify exactly what is missing

If a gap exists:

1. Produce the **full list of item IDs present in `pdf-criteria-all.json` but absent from live published criteria**, grouped by exam and anatomical site.
2. For each missing item, report: item ID, site, the criterion text, its priority tier, and whether it carries gateway / lab-value / not-funded flags.
3. Report the inverse too — any item **live but not in the source file**. An 11-item net drop could mask a larger two-way divergence (e.g. 15 removed, 4 added), and the net figure would hide that.
4. Flag specifically whether any missing item is a **P1/urgent-tier or safety-relevant criterion**, since the clinical consequence of a missing urgent criterion is materially worse than a missing routine one.

## Part 3 — Establish what happened on 23 July

1. Query the D1 audit log (`AD-008` records every edit/publish/delete with who, when, what) for all events between the `v4.1.0` publish and 2026-07-23 inclusive. Report what was recorded.
2. Check whether `v4.1.1` ever existed as a published version, or whether the sequence skipped it — and what that implies about how the publish was performed.
3. Check `git log` around 2026-07-23 for any repo-side change to criteria data, the load scripts, or the publish route that coincides.
4. Check whether **regionalisation data** survived: the 28 HealthPathways URLs and 86 region overrides. A reload that drops items may also have dropped these (this is the exact failure mode `AD-013` exists to prevent).
5. Check for `imp_`-prefixed IDs and confirm paediatric items still carry the `_p` suffix — i.e. whether this publish was a clean load or something ad hoc.

**Do not speculate about intent.** Report what the audit log and git history show. If the audit log has no entry for the publish, say so explicitly — that absence is itself an important finding about whether AD-008 is actually capturing publish events.

## Part 4 — Assess the blast radius

1. **Which tools are affected?** Confirm whether the Criteria Viewer reads live published criteria (and so has been serving the reduced set), and confirm whether the Triage Advisor is still on its compile-time embedded blob (TA-SRC-01 — if so, the Advisor is unaffected by this specific change but for the separate reason that it was never reading published data at all). State both clearly, since they have different implications.
2. **Evaluation data:** query D1 for the count of assessments logged before vs after 2026-07-23, so Gary knows how much of the evaluation corpus sits either side of the change.
3. Do **not** attempt to determine whether any specific evaluator assessment was affected — that requires clinical judgement, not a query.

---

## Output

Write to `documents/CRITERIA-REPUBLISH-2026-07-23-INVESTIGATION.md`:

- **Top of file: a one-paragraph plain statement** of whether items are missing from live criteria, how many, and whether any are urgent/safety-tier. If nothing is missing, say that just as plainly — a clean result is a good outcome and must not be dressed up as a finding.
- The full missing-item table (Part 2).
- What the audit log and git history show about the 23 July publish (Part 3), including explicit note of anything the log failed to capture.
- Blast radius (Part 4).
- A short "what this does not tell us" section — anything requiring Gary's knowledge or a clinical judgement, listed as questions.

## Constraints

- Read-only throughout. No publish, no rollback, no data edit, no deployment. **Even if you identify the fix, do not apply it** — remediation is a separate decision, and the tidy-up gate is still in force for system changes.
- Public read-only API endpoints only for live checks; do not call admin write endpoints.
- Evidence for every claim: item IDs, log rows, commit hashes. Where evidence is absent, say "not established" rather than inferring.
- If the 462-vs-473 premise turns out to be wrong, say so directly and stop — do not go looking for a different problem to justify the exercise.
