> **[SUPERSEDED — 2026-09-05]** ARCH-MIG-01 retires the TA-SRC-01 mechanism this findings
> report was gathered for (see `ta-src-01-brief.md`, superseded same date). The evidence
> itself is not discarded — the criteria-staleness facts this document establishes (embedded
> blob divergence, `ct_other`'s three-way split, the 14 invisible sites) are the evidence base
> cited by SD-10 (`documents/SECURITY_DECISIONS.md`) for the migration decision, and remain
> valid history; only the proposed fix (switching onto the old JSON/D1 read path) is retired.
> Verification: verified — SD-10 raised, citing this document.
> Filed by: Claude Code

# TA-SRC-01 Phase 0 Findings — Triage Advisor Criteria Source Switch

**Brief:** TA-SRC-01 v1.0.0
**Date:** 6 July 2026
**Status:** STOP — awaiting review. No design, no implementation, no deployment.

> **Deployment gate (restated per brief):** The source switch must NOT go live before the TA-REG-01 baseline run exists against the CURRENT stale source. Nothing in this Phase 0 changes production. The four token-measurement calls described in §4 went through the production Worker proxy but wrote nothing to KV, D1, or the usage log.

---

## Headline findings

1. **The deployed Triage Advisor does not read `criteria:match-data` from KV at all.** `triage/index.html` sets `API_BASE = ""` (line 676), so the `fetch(API_BASE + "/api/match-data")` path is dead code — the guard `if (API_BASE)` is never true. Every production assessment is built from `EMBEDDED_MATCH_DATA`, a JSON blob hard-coded into the HTML. Verified on the live deployment (https://iteratio.nz/crr-criteria/triage/): same `API_BASE = ""`, same embedded blob. The KV blob is byte-identical to the embedded blob (both seeded from the same source via `POST /api/seed`). So the LLM source is not "a stale KV blob" — it is a compile-time constant in the asset. The switch therefore changes the *data flow architecture*, not just the data source.

2. **`transformToMatchFormat()` is an empty placeholder stub** (`worker.ts:690`): it returns `{synonyms:{}, index:[], paed_index:[]}`. It has never generated real match-data. Worse, the D1 snapshot publish route (`POST /api/admin/versions/:id/publish`, worker.ts:284–339) calls it and writes the result to KV — if that route were ever used, it would **blank** `criteria:match-data`. It evidently has not been used for real publishes.

3. **No publish path in actual use touches match-data.** The Admin tool publishes via `POST /api/admin/publish` (admin/index.html:204) sending `{versionLabel, notes, data}` — no `matchData` field, and that route only writes match-data "if provided". Rollback (`/api/admin/versions/:id/rollback`) never touches it. The admin success toast — *"✓ Published … Viewer and Triage Advisor updated"* — is currently **false** for the Triage Advisor's assessment path.

4. **v4.1.0 was a content rewrite, not a re-key.** Only 62 of 336 old item IDs also exist in published data, and 55 of those 62 have *different* label text — ID collision does not mean same item. Item-level mapping must go by label, and ~25% of items have no confident label match (see §2).

---

## 1. Consumer inventory of `criteria:match-data`

Consumers of the blob's *content* (embedded copy and/or KV via `/api/match-data`):

| Consumer | Source used | Fields read | If blob retired | If blob frozen |
|---|---|---|---|---|
| **LLM criteria block** — `buildCriteriaBlock()`, triage/index.html:1614 | Embedded only | `index`/`paed_index`: `exam_title`, `site_label`, `modality`, `page`, `guidance`, `guidanceNarrative`, `groups[].title`, `items[].label`, `items[].mandatory`, `outOfCriteriaNote`, `alternativeManagement`, `notFundedDetail`, `footnotes` | This is the TA-SRC-01 switch itself | Status quo (stale AI source) |
| **Rule-based exam/site auto-detection (TA-002)** — triage/index.html:993–1000 | Embedded only | `synonyms` (106 groups), `items[].match_groups` (321/336 items), site index structure | **Breaks** — no replacement exists; published data carries no `match_groups`/synonyms (see §3) | Keeps working on stale 39-site data |
| **Criteria reference panel (column 3)** — triage/index.html:1806–2203 | Embedded only | Site index: labels, groups, items, notes; lookup by `site_id` | Breaks unless re-pointed at published data | Works, but post-switch shows 39 sites/old text while the AI assesses against 53 sites/new text — a visible inconsistency |
| **Paediatric switch** — `detectPaediatric()` selecting `paed_index` | Embedded only | `paed_index` | As above | As above |
| **Regression runners** — `scripts/reg02-runner.mjs:654` (fetches `${API_BASE}/match-data`) and 8 historical `instructions/*.mjs` runners | **KV via API** | Full `index`/`paed_index` (block building) | TA-REG-01 baseline must run before any retirement (deployment gate) | Fine |
| **Admin seed endpoint** — `POST /api/seed?key=match-data`, worker.ts:929 | KV (write) | Writes the blob; the only mechanism that has ever populated it | Remove key from map at decommission | No change |
| **Archive HTMLs** — `Archive/crr-triage-advisor-v1.2.3.*.html` | Embedded (own copies) | n/a — not deployed | None | None |

Checked and clean: Viewer (`viewer/index.html`), Admin tool, demo harness (`crr-demo.html`), `src/worker/` (main-site proxy), telemetry paths — none reference match-data.

**Key implication:** the KV blob and `/api/match-data` endpoint have **zero production consumers** — only regression scripts. The production consumers all read the embedded copy. Any switch plan must address the embedded blob and the three non-LLM consumers (matcher, reference panel, paed switch), not just the endpoint.

---

## 2. ID mapping (old → published)

Full table: `instructions/ta-src-id-mapping.csv` (336 rows). Reverse gaps: `instructions/ta-src-published-unmatched.csv` (226 rows).

**Sites:** clean. All 39 match-data `site_id`s exist verbatim in published data. The 14 published-only sites are exactly the expected missing set — adult: `ct_other`, `us_fna_biopsy`, `xr_femur`, `xr_forearm`, `xr_humerus`, `xr_tibia_fibula`; paediatric: `ct_head_paed`, `us_neck_thyroid_paed`, `us_pelvis_paed`, `us_spine_paed`, `xr_femur_paed`, `xr_forearm_paed`, `xr_humerus_paed`, `xr_tibia_fibula_paed`.

**Items:** messy. Matched within-site on normalised labels (page refs stripped, punctuation-insensitive), then fuzzy (difflib ratio):

| Confidence | Count | Meaning for interpreting historical D1 logs |
|---|---|---|
| Exact label match | 64 | Safe to map mechanically |
| Fuzzy ≥ 0.85 | 91 | Near-certain; wording tweaks only |
| Review 0.60–0.85 | 97 | Probable match, needs eyeball — many are pure ID re-keys (`ctc_p2_2` → `ctch_p2_2`) with rewording |
| Unmapped (< 0.60) | 84 | No confident counterpart — mostly genuine clinical rewrites/restructures |
| **Total** | **336** | |

- **Unmapped ≠ deleted.** Spot-check: old `cth_a1` (TIA gateway) scores only 0.33 against new `cth_a48_1`, yet they cover the same indication — the gateway conditions were restructured in v4.1.0 (old: "BPAC TIA tool indicates CT appropriate OR patient unable to access rapid specialist care"; new: "no high-risk features *1 and assessed as suitable…"). The 84 unmapped rows need clinical review, not mechanical mapping. Whole-site rewrites: `ct_colonography` (all 13 items unmapped), `ct_kub` acute group, `us_pelvis` acute groups, most paediatric emergency items.
- **Reverse direction:** 226 published items have no old counterpart — 79 in the 14 new sites (expected), **147 in shared sites** (v4.1.0 added/split/rewrote substantially). These 147 are content the AI has never seen; they are the behaviour-change surface for the regression diff, alongside the 14 new sites.
- No duplicate item IDs in either dataset.

---

## 3. Serialisation source audit

`buildCriteriaBlock()` (triage/index.html:1614–1637; ported verbatim in reg02-runner.mjs) emits per site:

```
=== {exam_title} — {site_label} ({modality}) [p{page}] ===
Guidance: {guidance}
Background: {guidanceNarrative}
[{group.title}]
- {item.label}            (or "* MANDATORY: {label}" when item.mandatory)
OUT OF CRITERIA: {outOfCriteriaNote}
REDIRECT: {alternativeManagement}
NOT ROUTINELY FUNDED: {notFundedDetail}
DEFINITIONS AND SUB-CRITERIA: {footnotes}
```

Element-by-element against the published snapshot (v4.1.0, `criteria:published`):

| Block element | Match-data field (non-empty count /39 sites) | Published equivalent (count /53 sites) | Gap? |
|---|---|---|---|
| Exam title | `exam_title` (39) | `site.examTitle` (53) | ✓ |
| Site label | `site_label` (39) | `site.label` (53) | ✓ |
| Modality | `modality` (39) | `exam.modality` (exam level; site carries none) | ✓ (builder needs exam context) |
| **Page ref `[pXX]`** | `page` (39/39) | **Absent — zero `page` fields or `[p` strings anywhere in published JSON** | **✗ GAP** |
| Guidance | `guidance` (39, per-site) | `exam.guidance` (53, per-exam-group) + `site.inlineGuidance` (28) | ⚠ mapping decision: which one, or both |
| Background | `guidanceNarrative` (25) | `guidanceNarrative` (28) | ✓ |
| Group title | `groups[].title` | `groups[].title` | ✓ |
| Item label | `items[].label` (336) | `items[].label` (473, all `type:"cb"`) | ✓ |
| **MANDATORY marker** | `items[].mandatory` (1 item: `ct_sinus`/`sin_p3_1`) | **No `mandatory` field on any published item** | **✗ GAP** (small: 1 item) |
| OUT OF CRITERIA | `outOfCriteriaNote` (37) | `outOfCriteriaNote` (33) | ✓ |
| REDIRECT | `alternativeManagement` (24) | `alternativeManagement` (47) | ✓ |
| NOT ROUTINELY FUNDED | `notFundedDetail` (36) | `notFundedDetail` (33) | ✓ |
| DEFINITIONS | `footnotes` (12) | `footnotes` (32) | ✓ |
| Paediatric split | `paed_index` array | `paedExams` array + `population` field | ✓ |
| *(not in block)* **match_groups** | `items[].match_groups` (321/336) | **Absent** | **✗ GAP** — blocks any regeneration of the rule-based matcher from published data |
| *(compound)* `logic` | absent | absent (all 473 items flat) | ✓ as expected — CC-DESIGN-01 §4.1 compound path will have nothing to render at switch time |

**The page-reference gap is the serious one.** System prompt v2.3.x instruction 9 requires `[pXX]` citations in `met_criteria`/`missing_criteria` and the JSON schema has a `criteria_page` field; the current block carries page on all 39 sites. Published data has none. Options (a decision for design phase, flagged here): drop page refs (prompt/output change — but the brief forbids prompt edits in TA-SRC-01, so this interacts with the separate prompt exercise), or add a `page` field to published criteria data via the Admin editor/schema. Published items also carry `shortLabel` (all 473) which the block doesn't use — no action needed.

---

## 4. Token and cost measurement (measured, not estimated)

**Method:** built the current block with a verbatim port of `buildCriteriaBlock()` over the embedded/KV match-data, and the projected block with the same serialisation over published v4.1.0 (assumptions: no page refs, no mandatory markers — the data isn't there; `Guidance:` = `inlineGuidance || exam.guidance`). Token counts measured via the production Worker proxy (`/api/triage/assess`, `max_tokens: 1`, model `claude-sonnet-4-6` — the current production model per triage/index.html:3436; the architecture briefing's "Sonnet 4 / claude-sonnet-4-20250514" is out of date, that ID is retired and 404s). Four calls, ~NZ$0.35 total, nothing logged to D1.

| Block | Current (match-data) | Projected (published) | Delta |
|---|---|---|---|
| Adult | **20,704** tokens | **30,679** tokens | **+9,975 (+48%)** |
| Paediatric | **4,599** tokens | **11,168** tokens | **+6,569 (+143%)** |

- The 20,704 figure validates the architecture briefing's "~21,000-token criteria block".
- Projected adult block is **under the ~35k flag threshold** — no site-scoping discussion forced, though note the full system prompt = block + instruction text (~3–4k) + preamble, so total input approaches ~35k.
- Whole system prompt sits under a single `cache_control: {type: "ephemeral"}` breakpoint (triage/index.html:3136ff), so per-assessment cost depends on cache state (5-min TTL).

**Cost per assessment, criteria block portion only** (claude-sonnet-4-6: $3.00/MTok input; cache write 1.25× = $3.75/MTok; cache hit ≈ 0.1× = $0.30/MTok; NZD at the app's rate of 1.65):

| Adult path | Current | Projected | Delta |
|---|---|---|---|
| Cache-write assessment (first in 5-min window) | US$0.078 / NZ$0.128 | US$0.115 / NZ$0.190 | **+NZ$0.062** |
| Cache-hit assessment | US$0.0062 / NZ$0.0102 | US$0.0092 / NZ$0.0152 | **+NZ$0.0049** |

Paediatric path deltas: +NZ$0.041 per cache-write, +NZ$0.0033 per cache-hit. At pilot volumes (single-digit assessments/day in the usage log) the cost impact is negligible — well under NZ$1/week.

---

## 5. `transformToMatchFormat()` disposition — recommendation: **freeze now, retire on a scheduled follow-up**

**Why not "regenerate":** regeneration from published data is currently *impossible*, not just unimplemented. The function is a stub, and published data lacks the two hand-curated ingredients the matcher needs — the `synonyms` table (106 groups) and per-item `match_groups` (321/336 items). Regeneration would require adding those fields to the published schema and Admin editor, re-keyed to published item IDs — which is blocked on the 84-unmapped-item clinical review from §2. That is a project, not a publish-pipeline fix.

**Why not "retire entirely" now:** retiring the blob means moving the rule-based matcher and the column-3 reference panel off it in the same change. The reference panel *should* move to published data (it can — it needs no synonyms), but the matcher cannot until the synonym layer is re-keyed. Bundling that into TA-SRC-01 expands a source switch into a matcher redesign and inflates the regression surface just when TA-REG-01 needs a clean before/after on the LLM source alone.

**Recommended shape of "freeze":**
1. TA-SRC-01 moves only the LLM block onto `criteria:published`. The embedded match-data blob stays, read-only, feeding the rule-based matcher, auto-detection, and (interim) the reference panel.
2. Delete or explicitly no-op `transformToMatchFormat()` and its call in the snapshot-publish route so an accidental snapshot publish can never blank the KV blob (worker.ts:304/319). KV `criteria:match-data` and `/api/match-data` are retained read-only for the regression runners until decommission is signed off (per the brief's rollback stance).
3. Log a follow-up work item ("TA-SRC-02" candidate): move the column-3 reference panel to published data (removes the user-visible 39-vs-53-site inconsistency that freeze creates), re-key the synonym/match_groups layer to published IDs after the clinical mapping review, then decommission the blob, the endpoint, and the seed key.
4. Fix the Admin publish toast so it stops claiming the Triage Advisor is updated until (after the switch) it actually is.

**Known cost of freeze (accepted, interim):** until the follow-up, the reference panel and exam auto-detection run on 39-site v-old data while the AI assesses against 53-site v4.1.0 — auto-detection will not recognise the 14 new sites, and panel text may disagree with AI citations. This inconsistency already exists today in hidden form (the AI and panel are both stale); freeze makes it visible. Flagged, not solved, in this brief.

---

## Acceptance criteria status

- [x] All match-data consumers inventoried (§1) — including the finding that production consumers read the embedded copy, not KV
- [x] ID mapping table produced with unmapped items flagged (§2 + `ta-src-id-mapping.csv`, `ta-src-published-unmatched.csv`)
- [x] Token/cost figures measured, not estimated (§4 — via production Worker proxy, production model)
- [x] transformToMatchFormat() disposition recommended with reasoning (§5 — freeze now, scheduled retire)
- [x] Serialisation gaps identified; compound (`logic`) confirmed absent in both datasets, so §4.1-format support is a design-phase concern with nothing to render at switch time (§3)
- [ ] Publish → LLM block automatic path — Phase 1 design item (KV-read-per-session vs cached, invalidation on publish)
- [ ] Rollback path — Phase 1 design item (old builder + retained blob makes this straightforward)
- [x] **Zero deployment before the TA-REG-01 baseline run exists — restated at the top of this report**

## Decisions needed at review

1. **Page references:** add `page` to published criteria data, or drop `[pXX]` citations (interacts with the separate prompt exercise — prompt text is out of scope for TA-SRC-01)?
2. **Guidance mapping:** confirm `inlineGuidance || exam.guidance` (the projection assumption) or a different combination — affects token count slightly and clinical framing per site
3. **Mandatory marker:** carry the single `sin_p3_1` mandatory flag into published data, or accept its loss (the TIA gateway is enforced via prompt instruction 1a, not this flag)?
4. **Disposition:** approve freeze-then-retire (§5) or direct otherwise
5. **Embedded blob:** confirm the switch should also change the *delivery* mechanism (fetch published from API with embedded fallback vs bake published data into the HTML at build/deploy) — Phase 1 will need this settled to design the "publish reaches LLM with no manual step" path (AD-006)

**STOP.** Awaiting review before Phase 1 design.
