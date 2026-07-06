# TA-SRC-01 Phase 1 — Design and Implementation Plan

**Brief:** TA-SRC-01 v1.0.0 · **Phase:** 1 (Design) · **Date:** 6 July 2026
**Inputs:** `ta-src-phase0-findings.md` (accepted), review decisions 1–5 (6 July 2026), CC-DESIGN-01 §4.1/§4.2
**Status:** ACCEPTED (Gary, 6 July 2026), including the §4.3 guidance refinement and §3.4 `criteria_version` logging. This was a Fable session — no production Worker routes, deployed assets, or prompts were modified. Implementation happens in a separate session against the checklist in §10.

> **Deployment gate (unchanged):** nothing in this design ships before the TA-REG-01 baseline run exists against the CURRENT source. The one exception approved at review is the §6.1 footgun no-op, which changes no behaviour on any code path in actual use.

---

## 1. Review decisions incorporated

| # | Decision | Where designed |
|---|---|---|
| 1 | Add site-level `page` to published data; check pdf-criteria-all.json first, backfill from PDF if absent; citations stay, no prompt change | §5.1 — pdf-criteria-all.json has **no** page data; backfill table from PDF v2.0 TOC provided |
| 2 | `inlineGuidance \|\| exam.guidance` confirmed, with a check on the 28 inlineGuidance sites for safety-relevant exam.guidance | §4.3 — audit done: no safety content anywhere in exam.guidance; refinement proposed |
| 3 | Carry `sin_p3_1` mandatory flag into published data as a content edit | §5.2 — target identified: `ctsin_p3_1` (0.99 label match) |
| 4 | Freeze-then-retire approved incl. no-op'ing `transformToMatchFormat()` + snapshot-publish write as an early standalone change | §6 |
| 5 | Delivery = runtime fetch of `criteria:published`; fetch failure blocks assessment with visible "criteria unavailable" state; no silent fallback; criteria version displayed with every assessment | §3 |

**Discovery note (decision 1):** `pdf-criteria-all.json` was not in the working tree — the latest copy was recovered from git commit `cc82cca` (deleted by `4d46833`) and restored to **`documents/reference/pdf-criteria-all.json`** so the authoritative PDF extract no longer exists only in git history. It is a v5.0.0-pdf *preview rebuild* ("v5.0.0-pdf — PDF rebuild (preview, unpublished)", criteriaSource = "National Primary Care Referral Criteria for Imaging, Version 2.0, Published 09/04/2026, National ID 15372") covering the same 53 sites as published v4.1.0 with non-identical content. It contains **zero page numbers** (all "page" strings are HealthPathways URL parameters), so decision 1 falls to the PDF backfill path.

---

## 2. Target architecture

```
Publish (Admin) ──► KV criteria:published ──► GET /api/criteria (Cache-Control: no-store)
                                                    │
                                   (same-origin proxy added, §3.3)
                                                    ▼
                      Triage Advisor page load: fetch → PUBLISHED_CRITERIA + version
                                                    │
                              ┌─────────────────────┴─────────────────────┐
                              ▼                                           ▼
                    buildCriteriaBlockV2()                     fetch failed →
                    (published source, §4)                     "criteria unavailable" state,
                              │                                assessment BLOCKED (§3.2)
                              ▼
                    buildSystemPrompt() → /api/triage/assess
                    (version shown with every assessment, §3.4)

FROZEN (unchanged, read-only): EMBEDDED_MATCH_DATA → rule-based matcher (TA-002),
criteria reference panel (column 3), paediatric auto-detect. Retirement = TA-SRC-02 (§9).
```

## 3. Delivery: runtime fetch, fail-closed

### 3.1 Fetch

- On page load, `loadTriageData()` fetches **`/api/criteria`** (relative URL, same pattern as the existing `/api/triage/assess` call). Response is the published envelope `{version, publishedAt, publishedBy, data}`; stored in a new global (`PUBLISHED_CRITERIA`), never merged into `MATCH_DATA`.
- The existing dead `if (API_BASE)` match-data fetch block (triage/index.html:688–703) is deleted, not repaired.
- `EMBEDDED_MATCH_DATA` **stays** — it continues to feed `SYNONYMS`/`SITE_INDEX`/`PAED_INDEX` for the rule-based matcher and the column-3 reference panel (freeze, §6). It is never used to build the LLM block after the switch.

### 3.2 Fail-closed (no silent fallback of any kind)

- If the fetch fails (network error, non-200, JSON parse failure, or an envelope missing `data.exams`), the tool enters a **"criteria unavailable"** state:
  - A visible banner in the assessment column: "National access criteria could not be loaded — AI assessment is unavailable. [Retry]". Retry re-runs the fetch.
  - "Check Referral" is disabled (button disabled + guard in `runAI()` so a stale enabled button still cannot submit).
  - The rule-based reference panel may continue to render (it runs on the frozen embedded data and is clearly a reference surface), but **no AI assessment can fire**.
- `buildSystemPrompt()` gains a hard guard: if `PUBLISHED_CRITERIA` is null it throws rather than assembling a prompt — belt and braces so no code path can assemble a block from missing or fallback data.
- If "Check Referral" is clicked while the initial fetch is still in flight, the click awaits the in-flight fetch rather than failing (single-flight promise), then proceeds or lands in the unavailable state.

### 3.3 Same-origin proxy addition (main-site worker)

`/api/criteria` is currently **not** in the main-site worker's public proxy whitelist (`src/worker/index.ts:168–172` lists only `system-prompt`, `triage/assess`, `triage/usage-log`, `qa-review`, `releases/latest-id`). Production pages at `iteratio.nz/crr-criteria/triage/` use relative URLs, so implementation must add:

```ts
app.all("/api/criteria", (c) => proxyPublic(c));
```

one line alongside the existing whitelist entries. Without it the fetch 404s in production and the tool would permanently sit in the unavailable state (the fail-closed design makes this misconfiguration loud, which is correct). The `/crr-api/*` route is not usable here — it is CF-Access-gated and the Triage Advisor is a public tool.

### 3.4 Version display

- The provenance modal and the assessment result header both show `Criteria: {version} (published {publishedAt date})` from the fetched envelope — e.g. "Criteria: v4.1.0 (published 14 May 2026)". Rendered with every assessment result, not just once.
- **ACCEPTED at design review:** include `criteria_version` in the `/api/triage/usage-log` payload so every logged assessment records which criteria snapshot the AI saw. Whether this needs a new nullable D1 column (vs riding in an existing JSON field) is determined in the implementation session — **if a schema change is needed, the implementation session proposes it to Gary and does not execute it unilaterally.** Without this field, post-hoc auditability of "which criteria produced this verdict" depends on timestamps alone.

## 4. Block builder — `buildCriteriaBlockV2()`

Client-side (triage/index.html), replacing `buildCriteriaBlock()`'s role for the LLM block only. Input: `PUBLISHED_CRITERIA.data`, `isPaed`. Iterates `data.exams` or `data.paedExams`; for each exam, `exam.type === 'multisite' ? exam.sites : [exam]`.

### 4.1 Per-site serialisation

```
=== {exam.title} — {site.label} ({exam.modality}) [p{site.page}] ===
Guidance: {guidance rule, §4.3}
Background: {site.guidanceNarrative}
[{group.title}]
{items — §4.2}
OUT OF CRITERIA: {site.outOfCriteriaNote}
REDIRECT: {site.alternativeManagement}
NOT ROUTINELY FUNDED: {site.notFundedDetail}
DEFINITIONS AND SUB-CRITERIA: {site.footnotes}
(blank line)
```

- Every conditional line is emitted only when the field is non-empty (matches current behaviour).
- `[p{site.page}]` emitted only when `site.page` present — but §5.1 backfills all 53 sites before cutover, so absence is a content defect, not a rendering branch.
- Ordering is exactly the array order of the published snapshot — deterministic, byte-stable across sessions, preserving the single `cache_control` breakpoint economics (the block only changes when a publish changes it).

### 4.2 Item serialisation — CC-DESIGN-01 §4.1 contract

- Flat item, no `logic` key: `- {label}`, or `* MANDATORY: {label}` when `item.mandatory` is true (carried over from the current serialiser; one item will carry it post-§5.2).
- Item with `logic` (none exist at switch time; the code path ships dormant per the brief):

```
- [{item.id}] {label headline} — REQUIRED:
    (a) {condition text}
  PLUS AT LEAST ONE OF:
    (b) {condition}
    (c) {condition}
```

  with `ALL OF THE FOLLOWING:` / `ANY OF THE FOLLOWING:` headers for `all` / `any` logic types, and `(a)(b)…` condition IDs, exactly per CC-DESIGN-01 §4.1. Implementation should port the rendering from the §4.1 spec text, unit-testable as a pure function (string in → string out) so the dormant path has a test before it has data.

### 4.3 Guidance rule

Confirmed rule: `Guidance: site.inlineGuidance || exam.guidance`.

**Audit result (the Phase 1 check decision 2 asked for):** the six distinct `exam.guidance` values in v4.1.0 contain **no safety-relevant clinical content**. Adult exams (ct/us/xr) all carry pure UI boilerplate — "Select the anatomical site(s) being requested, then complete the clinical indicators for each site…" — and the three paediatric exams carry generic "Paediatric {modality} — discuss with secondary care specialist where appropriate." No site warrants emitting both.

**Refinement — ACCEPTED at design review:** suppress the adult `exam.guidance` fallback entirely — for the 25 adult sites without `inlineGuidance` it would inject a form-navigation instruction that is meaningless to the LLM (and mildly confusing: the model has no site selector). Keep the paediatric fallback (the "discuss with secondary care" line is clinically apt). Token impact ≈ −800 adult / paed unchanged.

**Normalisation — ACCEPTED (serialiser-side):** several paediatric `inlineGuidance` strings already begin with `"Guidance: "` (e.g. us_hip_paed "Guidance: Developmental Dysplasia of the Hip") — the serialiser strips a leading `/^Guidance:\s*/i` before prefixing, to avoid emitting "Guidance: Guidance: …". Alternatively fix the four-or-so strings as content edits; serialiser-side normalisation is preferred because it also protects future edits.

## 5. Content edits to published data (before cutover; via Admin editor / admin API + publish — never raw SQL)

### 5.1 Page backfill (decision 1)

Source of truth: **`reference/National Primary Care Referral Criteria for Imaging.pdf`** — Version 2.0, National ID 15372, Published 09/04/2026, 105 pages ("September 2025 (Updated April 2026)"). This is the "(April 2026 reissue)" the system prompt already names.

**The old match-data page numbers are stale against this edition and must not be copied** — spot checks: ct_head old p20 vs v2.0 p19; xr_chest old p65 vs p61; us_abdomen old p31 vs p29; paediatric sections shifted ~8–10 pages. (Latent defect worth noting: production today cites the superseded edition's pages while the prompt claims the April 2026 reissue — the backfill fixes this.)

Schema: add optional string `page` at **site level** (e.g. `"19-21"`), matching where the serialiser reads it. From the v2.0 table of contents (section start pages; end = next section start − 1):

| PDF section (pages) | Published site(s) |
|---|---|
| CT Chest Abdomen Pelvis 9–10 | ct_cap |
| CT Chest 11–15 | ct_chest |
| CT Colonography 16–18 | ct_colonography |
| CT Head 19–21 | ct_head |
| CT IVU / CT Renal 22–23 | ct_ivu |
| CT KUB 24–25 | ct_kub |
| CT Other 26 | ct_other |
| CT Sinus 27–28 | ct_sinus |
| US Abdomen 29–32 | us_abdomen |
| US Carotid 33–34 | us_carotid |
| US DVT 35–36 | us_dvt |
| US Guided FNA / Core Biopsy 37 | us_fna_biopsy |
| US MSK incl. Shoulder 38–39 | us_msk |
| US Neck/Thyroid 40–42 | us_neck_thyroid |
| US Pelvis 43–50 | us_pelvis |
| US Renal 51–54 | us_renal |
| US Scrotum/Testis 55–56 | us_scrotum |
| US Soft Tissue Mass 57–58 | us_soft_tissue |
| X-ray Abdomen 59–60 | xr_abdomen |
| X-ray Chest 61–64 | xr_chest |
| X-ray Shoulder & Upper Limb 65–67 | xr_shoulder, xr_humerus, xr_elbow, xr_forearm, xr_wrist_hand — **multi-site: pinpoint per-site pages within 65–67 during the edit** |
| X-ray Pelvis/Hip & Lower Limb 68–70 | xr_pelvis_hip, xr_femur, xr_knee, xr_tibia_fibula, xr_ankle_foot — **multi-site: pinpoint within 68–70** |
| X-ray Spine 71–73 | xr_spine |
| CT Head Paediatric 74 | ct_head_paed |
| US Abdomen Paed 75–76 | us_abdomen_paed |
| US Hip Paed 77–79 | us_hip_paed |
| US Neck/Thyroid Paed 80 | us_neck_thyroid_paed |
| US Pelvis Paed 81 | us_pelvis_paed |
| US Renal Paed 82–84 | us_renal_paed |
| US Scrotum/Testis Paed 85 | us_scrotum_paed |
| US Soft Tissue Paed 86–87 | us_soft_tissue_paed |
| US Spine Paed 88–89 | us_spine_paed |
| X-ray Abdomen Paed 90–91 | xr_abdomen_paed |
| X-ray Chest Paed 92–93 | xr_chest_paed |
| X-ray Shoulder & Upper Limb Paed 94–95 | xr_shoulder_paed, xr_humerus_paed, xr_elbow_paed, xr_forearm_paed, xr_wrist_hand_paed — **multi-site: pinpoint within 94–95** |
| X-ray Lower Limb Paed 96–97 | xr_femur_paed, xr_knee_paed, xr_tibia_fibula_paed, xr_feet_paed — **multi-site: pinpoint within 96–97** |
| X-ray Pelvis/Hip Paed 98–100 | xr_pelvis_hip_paed |
| X-ray Spine Paed 101 | xr_spine_paed |

The four multi-site X-ray sections need someone to open those PDF pages and note the start page per body part (≈15 minutes). All other sites take the range verbatim. **Criteria fidelity rule applies:** page values are additive metadata; no label or clinical text changes ride along with this edit.

The Admin Criteria Editor does not currently expose a `page` field — the backfill goes in as a scripted content edit through the admin API (working-copy update + publish), with Admin editor support for `page` logged as a follow-up so future edits don't regress it.

### 5.2 Mandatory flag (decision 3)

Single edit: published item `ctsin_p3_1` (site `ct_sinus`, group "P3 non-deferrable…") gains `mandatory: true`. Mapping confidence old `sin_p3_1` → `ctsin_p3_1` is 0.99 (same CRS + INCS 12-week criterion, reworded). Serialiser renders it `* MANDATORY: …` (§4.2). No other item carries the flag.

### 5.3 Sequencing

Both edits are published as one new criteria version (e.g. v4.2.0, notes referencing this design) **before** the cutover deploy, so the switch lands on data that already carries pages and the mandatory flag. This publish also exercises the §7 pipeline claim end-to-end. Per the deployment gate these edits can be *prepared* any time but the publish itself should ideally follow the TA-REG-01 baseline capture, since a publish changes the Viewer immediately (single source of truth) even before the Advisor switch.

## 6. Match-data freeze (decision 4)

### 6.1 Early standalone change — footgun removal (approved to ship ahead of the switch)

In `public/crr-criteria/api/worker.ts`:
- Snapshot publish route (`POST /api/admin/versions/:id/publish`): delete the `transformToMatchFormat(snapshot)` call (line 304) and the `kv.put('criteria:match-data', …)` (line 319).
- Delete the `transformToMatchFormat()` stub (lines 690–699) outright. (`transformToViewerFormat()`, also a stub used only by the same route, is out of TA-SRC-01 scope — flag it in the PR description; do not fix it silently.)
- Net effect: no code path can ever blank `criteria:match-data`. Behaviour change on routes in actual use: none.
- This is a production Worker change — implemented and deployed from a non-Fable implementation session, as its own commit/deploy with its own verification (`curl /api/match-data` before/after: identical).

### 6.2 Frozen state (interim, until TA-SRC-02)

- KV `criteria:match-data`, `GET /api/match-data`, and the `/api/seed?key=match-data` write path remain, read-only in practice — retained for the regression runners and rollback (brief requirement).
- `EMBEDDED_MATCH_DATA` remains in triage/index.html feeding the matcher, reference panel, and paed auto-detect.
- **Known accepted inconsistency:** auto-detection and column 3 run on 39-site old data while the AI assesses 53-site current data. Mitigation in this change: the version display (§3.4) makes the AI's source explicit. Removal of the inconsistency is TA-SRC-02 (§9).

### 6.3 Admin toast correction

After the switch, `admin/index.html` publish success toast ("✓ Published {v} — Viewer and Triage Advisor updated") becomes true for the Advisor's *AI assessment*; amend to "✓ Published {v} — Viewer and Triage Advisor (AI criteria) updated" to avoid over-claiming about the frozen reference panel. One-string change, rides with the cutover deploy.

## 7. Publish → LLM block pipeline (AD-006 confirmation)

- Publish (either admin route) writes KV `criteria:published`.
- `GET /api/criteria` reads KV per request and serves **`Cache-Control: no-store`** (worker.ts:64) — no HTTP cache layer to invalidate.
- The Advisor fetches per page load (§3.1). **KV read per session; no client-side persistence** (no localStorage cache — a cached copy would be a silent fallback, which decision 5 forbids).
- Publish-to-live latency = Cloudflare KV propagation (typically ≤60 s) + until the user's next page load. No manual step anywhere. AD-006 becomes true in practice.
- Anthropic prompt cache: a publish changes the block bytes → next assessment pays one cache write (~NZ$0.19 adult) then hits resume. No action needed; noted so a post-publish cost blip isn't misread.
- Already-open tabs keep their loaded snapshot until reload — acceptable (assessments remain internally consistent and version-labelled). Not adding mid-session re-fetch; it would create version ambiguity within a session.

## 8. Cutover and rollback

**Cutover — single deploy, no feature flag.** The deploy contains: triage/index.html (fetch + fail-closed state + builder V2 + version display), src/worker proxy line (§3.3), admin toast string (§6.3). A flag was considered and rejected: the fail-closed runtime fetch means the only meaningful "off" position is the previous asset, and a same-day `git revert` + build + deploy achieves that with less residual complexity than a flag that would itself need the old builder kept alive against the embedded blob.

Preconditions, in order:
1. TA-REG-01 baseline captured on current source (gate).
2. §6.1 footgun no-op deployed (may precede baseline; zero behaviour change).
3. v4.2.0 content publish (pages + mandatory flag) done and verified live (`/api/criteria` shows `version: v4.2.0`, spot-check `ct_head` has `page`).
4. Cutover deploy (root `npm run build && npx wrangler deploy` per project rules).
5. Post-deploy verification: load the tool → version chip shows v4.2.0; one live assessment cites new-edition pages; kill-switch check — temporarily unreachable `/api/criteria` (dev only) produces the unavailable state, not a fallback.

**Rollback.** `git revert` of the cutover commit(s), rebuild, redeploy — restores the old builder running on `EMBEDDED_MATCH_DATA`, which is untouched by every step above (the frozen blob is the rollback substrate; that is why freeze precedes retire). The worker proxy line and toast string are harmless to leave if only the asset is reverted. KV is not touched by rollback. Decommission of the blob only after TA-SRC-02 sign-off.

## 9. TA-REG-01 test plan hook

The regression suite runs **identically against both sources**; the runner needs one addition: a `--source published` mode that fetches `/api/criteria` and builds the block with a verbatim port of `buildCriteriaBlockV2()` (the current runner already ports the old builder verbatim; keep that for `--source match-data`). Same cases, same prompt version, same model, same worker endpoint.

**Pre-registered predictions — the diff is checked against these, not eyeballed:**

*Category A — correct pathway lives in one of the 14 previously-invisible sites (verdict/routing expected to change):*
- **RP-007/INT-002** — currently `at_risk` with the AI unable to settle the exam; its biopsy pathway (`us_fna_biopsy`, PDF p37) becomes visible. Expect routing to resolve and verdict to move.
- **RP-001** — note text references biopsy territory; same mechanism, weaker prediction.
- Procedure item: before the post-switch run, classify all ~30 suite cases against the 14-site list (`ct_other`, `us_fna_biopsy`, `xr_femur`, `xr_forearm`, `xr_humerus`, `xr_tibia_fibula` + 6 paediatric) and add any adult/paed limb or "CT other" cases to this category with a per-case predicted direction.

*Category B — shared-site content rewritten in v4.1.0 (84 unmapped old items; 147 new-in-shared-site items):*
- **INT-001** — CT KUB acute group was wholly rewritten (all `kub_acute_*` unmapped); the under-35 renal-colic redirect logic the current verdict rests on may be worded or gated differently. Predict: verdict stable (`declined`/redirect) but cited criteria change; watch for flip.
- **INT-SAH** (ct_head acute restructure — `cth_a1`/`cth_a2` unmapped), **INT-TORSION** (us_scrotum emergency), **INT-AKI** (us_renal/ct_kub territory), and any colonography/us_pelvis-acute cases: same treatment — predict stable verdicts with changed citations; any verdict flip in this category is a finding requiring clinical review, not automatically a regression.
- Procedure item: classify the full suite against the rewritten-site list (`ct_colonography`, `ct_kub`, `us_pelvis` acute, `xr_chest` 48hr, paed emergency groups — see `ta-src-id-mapping.csv` unmapped rows) with predicted direction per case.

*Category C — expected wholesale, not per-case:*
- Every `[pXX]` citation changes (old-edition pages → v2.0 pages). The diff tooling must treat page-ref-only differences in `met_criteria`/`missing_criteria`/`criteria_page` as expected noise, or verdict-level comparison drowns in it.
- Block token count rises ~48% adult / ~143% paed (measured, Phase 0 §4) — cost per case rises accordingly; not a defect.

**Acceptance for the post-switch run:** every verdict change is either pre-registered (A/B) or triaged to a named cause; unpredicted changes get clinical review before cutover is confirmed.

## 10. Implementation checklist (ordered; separate implementation session)

1. [ ] §6.1 footgun no-op in worker.ts — own commit, own deploy, curl-verify match-data unchanged *(may precede the baseline)*
2. [ ] TA-REG-01 baseline run on current source — **gate for everything below**
3. [ ] Pinpoint per-site pages in the four multi-site X-ray PDF sections (§5.1 table)
4. [ ] Content edit: `page` on all 53 sites + `mandatory: true` on `ctsin_p3_1`; publish as v4.2.0; verify live envelope
5. [ ] triage/index.html: published fetch, fail-closed state + `runAI()`/`buildSystemPrompt()` guards, `buildCriteriaBlockV2()` (incl. dormant §4.1 compound path + unit test), version display, delete dead match-data fetch
6. [ ] src/worker/index.ts: add `/api/criteria` to public proxy whitelist
7. [ ] admin/index.html: toast wording (§6.3)
8. [ ] §4.3 guidance refinement (adult boilerplate suppression + prefix strip) and §3.4 usage-log `criteria_version` — both ACCEPTED, implement; any D1 schema change is proposed to Gary first, not executed
9. [ ] Cutover deploy (root build+deploy); post-deploy verification per §8
10. [ ] TA-REG-01 post-switch run (`--source published`); evaluate against §9 predictions; clinical review of unpredicted changes
11. [ ] Log follow-ups (§11)

## 11. Follow-ups logged (out of TA-SRC-01 scope)

- **TA-SRC-02** — reference panel + exam auto-detect to published data; synonym/match_groups re-key to published IDs (blocked on clinical review of the 84 unmapped items); decommission `criteria:match-data`, `/api/match-data`, seed key, embedded blob.
- **Prompt exercise flag (per brief):** with §4.1 structure in the block and correct pages in data, prompt v2.3.x's hand-written decomposition examples (instruction 1) and the FALLBACK_INSTRUCTION_TEXT copy in triage/index.html become partially redundant — flagged, not edited.
- Admin Criteria Editor: expose site-level `page` field.
- `transformToViewerFormat()` stub (worker.ts:666) — same class of dead placeholder as the removed one; snapshot-publish route would mangle Viewer data if ever used. Assess in a worker-hygiene pass.
- Update `documents/CRR_Architecture_Briefing.md`: production model is `claude-sonnet-4-6` (not "Sonnet 4 / claude-sonnet-4-20250514"), and the Triage Advisor data-flow description should reflect the runtime-fetch architecture post-cutover.

## Acceptance criteria mapping (brief §Phase 1)

- New block builder reading `criteria:published`, §4.1 format, functions with all-flat data → §4
- Match-data disposition per Phase 0 recommendation → §6
- Publish reaches LLM block with no manual step; KV-read-per-session, no cache to invalidate → §7
- Cutover single deploy; rollback = revert to old builder, blob retained read-only → §8
- TA-REG-01 runs identically against both sources; predicted-change list incl. RP-007/INT-001 territory → §9
- Zero deployment before baseline → gate restated at top, sequenced in §10
