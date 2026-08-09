# Verification Pass — BRD v3.1.1 statuses and evaluation counts

**Type:** Read-only investigation. **Do not change any code, data, or documents.**
**Output:** A single markdown report at `instructions/verification-report-2026-08.md`.
**Model note:** Methodical evidence-gathering. Take the time to check rather than infer.

---

## Why this exists

The status column in `CRR_Tool_Suite_Business_Requirements_DRAFT_v3_1_1.docx` was populated from knowledge of the build, **not** from testing against the running tools. Some entries are wrong. Separately, an evaluation figure ("138 assessments") has been used in governance material and conflates several different populations of assessment.

Both feed documents going to a national AI governance group and the HNZ Privacy Office, so every answer must be **evidence-backed**: cite the file and line, the query and its output, or the observed behaviour. Where you cannot establish something, write "not established" and say what would settle it. **Do not guess, and do not soften a negative finding.**

---

## Part A — D1 evaluation counts

Environment: Mac/zsh. Always use `npx wrangler`, never bare `wrangler`. D1 ID `1a8307f9-69e9-4315-a8f3-7f6737dd9c55`.

**A1. Establish the schema first.** Do not assume column names.

```
npx wrangler d1 execute <DB_NAME> --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```
Then `PRAGMA table_info(<table>);` for the assessment/audit table and any QA review table.

Report the actual schema before running anything else.

**A2. Total assessments logged**, and the min/max row id. (Context: the results matrix references ids from 27 up to at least 366, so the true total is expected to exceed 138 — establish what 138 actually referred to, if determinable.)

**A3. Breakdown by source/type.** Using the real column names, group assessments into:
- clinician evaluation sessions
- compare-mode runs
- internal/test runs by Gary Ireland
- regression/automated runs
- anything else, and anything with a null/blank evaluator

**A4. By evaluator**, excluding internal and regression runs. Report evaluator name, role if present, and count.

**A5. Compare-mode double-counting — important.** Determine whether a compare-mode submission writes **one** row or **two** (one per model). Report which, with evidence. If two, give clinician counts both ways: assessments logged, and distinct submissions.

**A6. Distinct cases vs assessments.** Re-runs of the same note inflate assessment counts. If there is any case identifier or a way to group by note text, report distinct cases alongside total assessments.

**A7. QA reviews.** How many structured QA reviews were submitted, by how many distinct reviewers?

State plainly which populations can and cannot be cleanly separated with the data as stored.

---

## Part B — Verify BRD statuses against the running tools

For each item: state **✓ implemented / Partial / Not implemented / Not established**, with evidence (file:line, or observed behaviour at the deployed URL). Where Partial, say precisely what works and what doesn't.

### B1. PII protection — highest priority
- **GEN-003 (PII auto-redaction) and NFR-008 (NHI detection).** Find the client-side PII code. Report exactly what it does: does it **detect and warn**, **block submission**, or **auto-redact before transmission**? These are materially different and the distinction matters.
- Is NHI validation implemented, and does it cover both legacy (mod-11) and new (mod-23) formats, or pattern-matching only?
- Is there any **server-side** PII gate in the Worker, or is the check client-side only? (A client-side-only control can be bypassed by calling the API directly — state clearly whether that is the case.)
- What is the code's test coverage for this? Are there test cases, and do they pass?

### B2. What is actually stored (GEN-002 / NFR-007 / TA-026)
- Confirm from the code and the D1 schema exactly what the assessment audit log stores. Does it store the full referral note text verbatim?
- Is any redaction applied **before** the log write, or is the raw submitted text stored?
- Is there any retention or purge mechanism, or does data persist indefinitely?

### B3. Publishing (GEN-008 / TA-033)
- Trace the publish path. Does a single publish action update **both** the Criteria Viewer and the Triage Advisor?
- Confirm whether the Triage Advisor currently reads criteria at runtime from the published source, or uses an embedded/bundled copy. (This is TA-SRC-01 / TA-033. Report the current state, not the intended state.)

### B4. Model and prompt governance (TA-035 / TA-036)
- Is the system prompt stored in D1 with version history and a working rollback path? Demonstrate the mechanism exists, don't just find the table.
- Is the model pinned to an explicit version string in code/config? Where?
- Do regression tests route through the Worker API (so runs land in D1 with correct prompt/model/temperature), or do they call the vendor API directly? Check the actual test runner.

### B5. Items flagged as uncertain — confirm each
- **CV-019** send-to-referral-form (postMessage/callback): implemented and working?
- **CV-024** QA review submission from the Viewer
- **TA-010** documentation standard setting (strict vs inferred), and whether it is configurable without a code change
- **AD-002** click-to-edit and drag-and-drop in the Admin tool
- **AD-003** change review/approval before publication
- **AD-007** version restore, including regionalisation data
- **GEN-010** attribution — what branding do the deployed tools actually display? Any personal attribution anywhere in the UI or page metadata?

### B6. Safety logic (TA-012)
- **ACC redirect**: is trauma-mechanism detection implemented in the current system prompt? Quote the relevant prompt section. Assess whether "Partial" is fair.

### B7. Public endpoint hardening (NFR-014 / SR-01 / SR-02)
- Confirm the current state of the model-calling endpoints: authenticated or public?
- Is Turnstile, rate limiting, or a daily budget guard deployed in any form?
- Check `SECURITY_DECISIONS.md` and `instructions/SR-01-SR-02-hardening-brief.md` still exist and are current; note any drift between what they record and the deployed reality.

---

## Report format

For each item, one short block:

```
### GEN-003 — PII auto-redaction
Status: Partial
Evidence: src/lib/pii.js:41-118 — detects NHI patterns and bare names, shows a
warning banner and requires user confirmation; does not redact or block.
Server-side: no equivalent gate found in worker/index.js.
Gap: auto-redaction (as specified) not implemented; client-side only.
```

End with three short lists:
1. **Statuses that should change in the BRD** (item, current, corrected)
2. **Not established** — what couldn't be determined and what would settle it
3. **Anything found that nobody asked about** but which affects a governance or privacy claim

Do not edit the BRD. Report only.
