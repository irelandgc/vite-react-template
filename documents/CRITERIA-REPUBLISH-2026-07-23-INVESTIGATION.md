# Investigation — 23 July Criteria Republish (v4.1.0 → v4.1.2)

**Date:** 2026-09-05 · **Method:** Read-only. Public `GET` endpoints only (`/api/version`, `/api/criteria`, `/api/regions`), read-only `SELECT` queries against the live `crr-criteria` D1 database via `npx wrangler d1 execute --remote` (no admin write endpoints called), direct file/git inspection. No publish, rollback, edit, or deployment performed.

---

**The 11-item gap is real, but it is not silent data loss and not a bug. It is a deliberate, self-documented content edit by Gary on 2026-07-23 (D1 `versions` rows: v4.1.1 "Removal of CT Colonography", v4.1.2 "Update to the CT Colonography") that removed all 11 tickable items from exactly one site — CT Colonography (`ct_colonography`) — and replaced them with a not-funded advisory reflecting a real access-policy change (FIT testing / single point of referral for lower GI symptoms). None of the 11 are P1; 4 are P2 (urgent, 2-week tier) and 7 are P3 (6-week tier) — so this did remove urgent-tier content, but as an intentional policy change, not an accidental one. The separate, real problem this investigation found: (1) the audit log has no `criteria`/`update` entry for this edit at all — a genuine AD-008 gap, not just an absent release-log entry — so the "who/what changed" trail exists only in the version notes, not the structured audit log; and (2) the Triage Advisor's compile-time embedded data still carries the old, pre-removal CTC guidance and will keep offering it to referrers as a live option, while the Criteria Viewer (reading published data) correctly shows it as removed — a concrete, current instance of the TA-SRC-01 gap, not a hypothetical one.**

---

## Part 1 — Ground truth

| Check | Result |
|---|---|
| `documents/reference/pdf-criteria-all.json` counts (confirmed from file, not assumed) | 53 sites / 473 items = 31 adult sites / 331 adult items + 22 paediatric sites / 142 paediatric items. Internal `version` field: `v5.0.0-pdf`, dated 2026-05-14, "PDF rebuild (preview, unpublished)", source "National Primary Care Referral Criteria for Imaging, Version 2.0, Published 09/04/2026, National ID 15372" |
| Has the source file changed since these counts were recorded? | No. `git log --follow` on this file shows one commit (`e97ec50`, 2026-07-07, a documentation merge) — unchanged since before the 23 July republish |
| Live `GET /api/criteria` counts | 53 sites / 462 items = 31 adult sites / **320** adult items + 22 paediatric sites / 142 paediatric items. Sites unchanged both tiers; only adult item count differs |
| Live `GET /api/version` | `{"version":"v4.1.2","publishedAt":"2026-07-23T05:14:51.316Z","publishedBy":"gary.ireland@email.com","criteriaCount":31}` |
| Is the 462-vs-473 gap real? | **Yes — confirmed, exactly 11 adult items, 0 paediatric items, 0 site-count change.** A full item-ID diff (not just a count comparison) confirms it's a clean one-way subtraction: 11 IDs present in source, absent from live; **zero** IDs present live but absent from source (no two-way divergence masked by a net figure) |

## Part 2 — What is missing

All 11 missing items belong to **one site**: `ct_colonography` (CT — Colonography (CTC)). No other site lost or gained anything.

| Item ID | Priority tier | Criterion (short label) | Gateway/lab-value/not-funded flags |
|---|---|---|---|
| `ctcol_p2_1` | **P2 — urgent, within 2 weeks** | Altered bowel habit >6 weeks plus rectal bleeding, aged >50 | None on the item itself |
| `ctcol_p2_2` | **P2 — urgent, within 2 weeks** | Rectal bleeding with iron deficiency anaemia | None |
| `ctcol_p2_3` | **P2 — urgent, within 2 weeks** | Known/suspected CRC, pre-op to rule out synchronous pathology | None |
| `ctcol_p2_4` | **P2 — urgent, within 2 weeks** | Specialist/radiologist advises urgent CTC | None |
| `ctcol_p3_1` | P3 — within 6 weeks | Altered bowel habit >6 weeks, aged 50+ | None |
| `ctcol_p3_2` | P3 — within 6 weeks | Altered bowel habit >6 weeks plus rectal bleeding, aged 40–50 | None |
| `ctcol_p3_3` | P3 — within 6 weeks | Unexplained rectal bleeding, aged 50+ | None |
| `ctcol_p3_4` | P3 — within 6 weeks | Unexplained iron deficiency anaemia | None |
| `ctcol_p3_5` | P3 — within 6 weeks | NZGG Cat 2 family history with bowel symptoms, aged 40+ | None |
| `ctcol_p3_6` | P3 — within 6 weeks | NZGG Cat 3 family history with bowel symptoms, aged 25+ | None |
| `ctcol_p3_7` | P3 — within 6 weeks | Specialist/radiologist advises non-urgent CTC | None |

**Reverse check (live but not in source):** none. This is a clean subtraction, not a masked two-way edit.

**P1/urgent-tier/safety flag:** No P1 items are affected (none existed for this site in the source). **4 of the 11 are P2 (urgent, 2-week tier)** — this is the highest-severity content actually removed.

**What replaced the 11 items, live today** (`ct_colonography.groups` is now `[]`):
- `inlineGuidance`: *"As of xxx date CT Colonography (CTC) has been removed as a first line investigation."* (the literal "xxx date" placeholder is still live, unfilled)
- `notFundedDetail`: explains the FIT-test/single-point-of-referral pathway, directs to the Colorectal Symptoms HealthPathway
- `outOfCriteriaStyle: "warning"`

The source file's version of this site (still the April 2026 PDF extract) has full clinical guidance for who CTC is appropriate for and no not-funded framing at all — **the source file itself has not been updated to reflect this policy change**, so a future "reload from PDF" would silently reinstate the 11 items and erase the not-funded note, undoing this edit.

## Part 3 — What happened on 23 July

**D1 audit log (`audit_log` table), full query from 2026-05-14 to 2026-07-24 inclusive:**

- Rows 1–127: the 2026-05-14 full rebuild (v4.0.3 → v4.1.0, individual `create`/`update` rows per site) and the 2026-05-16/05-24 `release`-entity housekeeping. Last row before the gap: id 127, 2026-05-24T19:07:49Z.
- **Row 128**: `publish` / `version` / `v4.1.1`, performed by `gary.ireland@email.com`, `2026-07-23T05:10:48.928Z`.
- **Row 129**: `publish` / `version` / `v4.1.2`, performed by `gary.ireland@email.com`, `2026-07-23T05:14:51.316Z` — four minutes later.
- **There is no `entity_type='criteria'` row (`create`/`update`) anywhere between row 127 (24 May) and row 128 (23 July).** The audit log captures that two publishes happened and who published them, but **not what changed** in either one. This is stated explicitly per the brief's instruction: **the audit log has no entry for the underlying content edit — only for the publish action itself.** AD-008 is not capturing this class of edit (whatever admin-tool path was used bypassed the per-criteria audit write that the 14 May rebuild went through).

**`versions` table — this is where the actual account lives, and it's a complete one:**

| id | version_label | notes | created/published_by | timestamp |
|---|---|---|---|---|
| 14 | v4.1.0 | "Full rebuild from National Primary Care Referral Criteria for Imaging v2.0 (April 2026)... All 53 sites (31 adult + 22 paed) extracted verbatim from PDF..." | admin | 2026-05-14T13:36:49Z |
| 15 | **v4.1.1** | **"Removal of CT Colonography"** | gary.ireland@email.com | 2026-07-23T05:10:48Z |
| 16 | **v4.1.2** | **"Update to the CT Colonography"** | gary.ireland@email.com | 2026-07-23T05:14:51Z |

**v4.1.1 did exist** — it was not skipped. It was published, then superseded four minutes later by v4.1.2 (most likely a same-session correction — e.g. the "xxx date" placeholder or wording pass — the version notes don't record the delta between the two, and no audit-log row does either, so the exact difference between v4.1.1 and v4.1.2's `ct_colonography` content is **not established** from what's queryable read-only here).

**This was a deliberate, human, self-documented edit — not a bug, not an accidental reload, and not unattributed.** The version notes name the action plainly. The gap is entirely in the *audit log's* coverage of it, not in accountability for it.

**Git history, 2026-07-20 to 2026-07-26 (all paths, not just docs):** zero commits. Expected — criteria content lives in D1, not git; nothing in the repo (load scripts, publish route code) changed alongside this edit. This further confirms it was a live Admin-tool content edit, not a code deploy or a script-driven reload.

**Regionalisation data:** confirmed intact. `GET /api/regions` (live): 6 regions, 86 total per-exam URL/text override entries — matches the brief's expected figure exactly. Notably, the `aucklandregion` override for `ct_colonography` carries region-specific override text that closely mirrors the base criteria's new `notFundedDetail` wording (FIT test / single point of referral) — this looks like the same policy change was applied in two places consistently, not overwritten or dropped. AD-013's failure mode (a reload silently dropping regionalisation) did **not** occur here.

**Data hygiene checks:** zero `imp_`-prefixed item IDs anywhere live (clean — no leftover import artefacts). All 142 live paediatric items carry the `_p` suffix (100%, consistent with the 14 May rebuild's own stated pre-load fix). Both checks indicate this was a targeted single-site edit on top of the clean 14 May base, not an ad hoc or partial reload.

## Part 4 — Blast radius

**Which tools are affected — and how:**

- **Criteria Viewer**: reads live published criteria at runtime (`GET /api/criteria`) — **has been serving the reduced set since 2026-07-23T05:14:51Z.** This is working as designed: it correctly reflects the not-funded policy change to both referrers and triagers.
- **Triage Advisor**: confirmed still entirely on its compile-time `EMBEDDED_MATCH_DATA` constant (`triage/index.html:647`, `API_BASE=""`, per TA-SRC-01/SD-06 — unchanged from July's finding). This republish therefore has **no effect** on the Advisor **for the same pre-existing reason already tracked** — it was never reading published data at all.
  - **But this is not a neutral "unaffected."** The embedded blob's `ct_colonography` entry still contains the **old, pre-removal guidance** — *"CTC may be appropriate where the patient is over 80, has co-morbidities... All referrals should go via secondary care single point of entry"* — plus active synonym/match-group keywords (`'colonoscopy','colonography','ctc','bowel cancer','colorectal'`) that will keep matching notes to this now-superseded pathway. **The Triage Advisor will actively continue offering CT Colonography as a live option to referrers, using outdated guidance, until TA-SRC-01 ships.** This is a concrete, currently-live instance of the gap SD-06/TA-SRC-01 already tracks in the abstract — worth naming explicitly rather than leaving it as a hypothetical.

**Evaluation data either side of the change:**

- Total `triage_usage_log` rows: 746 (id range unbroken, earliest 2026-05-12, latest 2026-08-27).
- **Before** 2026-07-23T05:14:51Z (the v4.1.2 publish): **733 rows.**
- **On/after** that timestamp: **13 rows.**
- Per the brief's own instruction, no attempt was made to determine whether any specific assessment was clinically affected by this change — that needs clinical judgement, not a query. Note also that since the Triage Advisor never read live criteria at all, this before/after split describes assessment volume around the timestamp, **not** exposure to the CTC change specifically — no triage assessment was affected by this republish, because none of them ever touched the published criteria path.

---

## What this does not tell us

- **The exact difference between v4.1.1 and v4.1.2.** Both are named around "CT Colonography"; the audit log has no row for either's content, so whether v4.1.2 was a wording fix, the "xxx date" placeholder being addressed (it wasn't — still live), or something else, is not established from the data available read-only. Gary would know from memory; it's not reconstructable from the repo or D1 alone.
- **Whether the "xxx date" placeholder in `inlineGuidance` was meant to be filled in before this went live**, or is a known stand-in. Worth a direct look regardless of the edit's legitimacy.
- **Whether `pdf-criteria-all.json` (the source-of-truth reference file) should be updated to reflect this policy change**, so a future full reload doesn't silently reinstate the 11 removed items. This is a decision, not a finding — flagging it because GEN-001 treats that file as the single source of truth and it currently disagrees with live/published reality.
- **Why this specific edit path didn't produce an `audit_log` row**, when the 14 May rebuild produced one per site. This needs someone who knows the Admin tool's internals (or the `worker.ts` publish route) to say which code path was used and why it doesn't write to `audit_log` — that's a code question, not something this read-only pass can settle from data alone.
- **Whether this is the only site edited via this untracked path.** This investigation only compared `ct_colonography` because that's where the count diff pointed. A full re-diff of every site (not just the one with a numeric mismatch) against `pdf-criteria-all.json` was not performed here — it's possible a same-count change (e.g. wording edited without changing item counts) exists elsewhere and wouldn't show up in a top-line count comparison. Worth deciding whether that fuller diff is wanted.
