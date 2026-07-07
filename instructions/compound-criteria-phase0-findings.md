# Compound Criteria — Phase 0 Findings Report

**Brief:** CC-DESIGN-01 v1.1.0 · **Phase:** 0 (Discovery) · **Date:** 4 July 2026
**Status:** STOP — awaiting Gary's review before any design work
**Author:** Claude Fable 5 (design session, no production changes made)

---

## Headline findings that contradict the brief's assumptions

Three findings materially change the brief's framing. Read these before the detail.

### ⚠ 1. The count is not 26 items / 13 sites — it is ~60 items / 23 sites

The "26 items across 13 exam sites" figure comes from a prior analysis
(`~/Downloads/compound-criteria-analysis.json`, 26 entries, 13 exams, patterns
`all`×13 / `mandatory_plus_any`×12 / `any`×1). That analysis:

- counted **PDF-level criteria**, some of which the extraction has already split
  into multiple JSON items (see finding 2);
- covered only **1 of the 21 paediatric sites** (US Hip); my sweep found compound
  logic in 7 paediatric sites;
- missed several adult items whose logic markers are lower-case or
  colon-introduced (e.g. `cth_p2_2` cognitive impairment + 6-feature any-of,
  `ctsin_em_1` red-flag any-of, `usnt_p4_2` three-condition all-of).

My census (item-by-item review of all 473 items, full table in Appendix A):
**~60 genuinely compound items across 23 sites** (52 adult / 8 paediatric), plus
~11 borderline items I classified as *not* compound with reasons. The three
named logic types still cover almost everything — the shape census (finding
"Pattern census" below) is the good news.

### ⚠ 2. The extraction already denormalised some compound criteria into repeated flat items

Three item families show the PDF's compound structure flattened by repetition:

| Family | Items | What happened |
|---|---|---|
| CT Colonography | `ctcol_p2_1..4`, `ctcol_p3_1..7` (11 items) | Each item = one presenting indication **AND** the same repeated gate text ("able to tolerate bowel prep… no colonoscopy/CTC within 5 years…"). In the PDF this is one shared mandatory gate over an any-of list. |
| CT CAP | `ctcap_p2_1..3` (3 items) | The mandatory stem ("strong suspicion of malignancy, no focal pathology, after full workup") is repeated verbatim in items 1–2. In the PDF: one mandatory stem + pick-one-of-three. |
| XR Chest lung cancer | `xrch_48_1..12` (12 items) | Every item repeats the stem "One or more of the following symptoms or signs concerning for lung cancer:" followed by a single symptom. In the PDF: one any-of criterion with 12 options. |

This matters for the design: "migrate compound items to structured form" is not
only a per-item decomposition — for these families it is a **re-normalisation
decision** (keep N items with duplicated stems, or collapse to one structured
item?). Collapsing changes item IDs and counts, which touches the Viewer's
`INDICATION_THEME_MAP`, usage-log exam references, and QA data continuity.
This is a clinical/content decision as much as a technical one.

### ⚠ 3. The Triage Advisor's LLM does not consume the published criteria — it consumes a stale, separately-maintained match-data blob

- `buildCriteriaBlock()` (triage/index.html:1614) serialises `SITE_INDEX`/`PAED_INDEX`,
  which come from `GET /api/match-data` (KV key `criteria:match-data`).
- That blob has **39 sites / 336 items with its own item IDs** (e.g. `cth_a1`)
  and condensed labels — it is not derived from the published v4.1.0 set
  (53 sites / 473 items). 14 published sites are absent from it entirely
  (`ct_other`, `us_fna_biopsy`, `xr_femur`, `xr_humerus`, `xr_forearm`,
  `xr_tibia_fibula`, and 8 paediatric sites incl. `ct_head_paed`, `us_pelvis_paed`).
- The publish pipeline **cannot** regenerate it: `transformToMatchFormat()` in
  `api/worker.ts:690` is a placeholder returning `{synonyms:{}, index:[], paed_index:[]}`.
  The live blob was written via the direct-publish path (`body.matchData`) at
  some earlier point and has not tracked subsequent criteria publishes.

Consequence for this design: any schema that structures compound logic in the
criteria data will not reach the LLM until the match-data path is either
regenerated from published criteria or retired. The design's "Triage Advisor
consumer contract" section must decide this — it is the single biggest
architectural gap found in Phase 0.

---

## Finding 1 — Current D1 schema

From `public/crr-criteria/api/schema.sql` (confirmed structurally consistent with
the live API responses):

- **`criteria`** — one row per exam/site: `id` (TEXT PK, e.g. `ct-head`), `title`,
  `modality`, `type` ('singlesite'|'multisite'), `population` ('adult'|'paediatric'),
  **`data` JSON** (the full criteria object — groups, items, guidance),
  `updated_at`, `updated_by`.
- **`versions`** — snapshot table: `version_label`, `criteria_snapshot` JSON
  (full criteria at publish), `status` ('draft'|'published'), timestamps/actors.
- **`audit_log`** — every create/update/delete/publish with diff JSON.
- Other tables (usage log, QA reviews, system_prompts, releases) do not store
  criteria structure.

**Key architectural fact: item structure lives entirely inside the `data` JSON
blob.** There is no per-item row, no item table, no schema-level constraint on
item shape. "Schema changes" for compound logic therefore means **JSON shape
changes** flowing through the existing snapshot → publish → KV pipeline
(KV keys: `criteria:published`, `criteria:match-data`, `criteria:regions`) —
no D1 DDL is required to represent sub-elements. This is favourable: the
publish/version/rollback flow is structure-agnostic.

## Finding 2 — pdf-criteria-all.json structure

The file is not in the working tree; recovered from git (`cc82cca`, deleted in
`4d46833`, both 2026-05-15). Version block: `v5.0.0-pdf — PDF rebuild (preview,
unpublished)`, source "National Primary Care Referral Criteria for Imaging v2.0,
09/04/2026, National ID 15372".

Shape: `{version, exams[3], paedExams[3]}` → exam `{id, title, modality, type,
active, population, guidance, healthPathwaysUrl, sites[]}` → site `{id, label,
inlineGuidance, guidanceNarrative, groups[], outOfCriteriaNote, outOfCriteriaStyle,
healthPathwaysUrl, alternativeManagement, notFundedDetail, footnotes, examId,
examTitle}` → group `{title, items[]}` → item:

```json
{ "type": "cb", "id": "ctcap_p2_1", "label": "<full criterion prose>", "shortLabel": "<summary>" }
```

- **53 sites, 473 items. Every item is `type:"cb"`** — four fields, no logic
  attribute, no mandatory flag, no page reference at item level.
- All compound logic is embedded in `label` prose (AND/OR/any of/one of/
  semicolon lists/run-on lists).
- Group titles carry priority (`P2 Urgent: …`) — priority is positional, not an
  item attribute.
- Footnotes (`*1`, `*2`…) live in `site.footnotes` as one text blob; several
  compound items reference sub-criteria lists that exist only there
  (e.g. `xrph_p2_4_p` "Risk factors*1 for DDH", `uspv_p2_5` "risk factors*5").

**Important:** the published live data (v4.1.0, published 2026-05-14) is
**item-for-item identical** to this JSON — same 53 sites, 473 items, identical
IDs and label text. See Finding 7.

## Finding 3 & 4 — Compound item census and pattern census

Method: keyword sweep over all 473 item labels (AND/OR/all of/any of/one of/
both/at least/plus/either/semicolons) flagged 62 candidates; a second sweep for
lower-case and colon-introduced lists flagged a further ~10 genuine suspects
among 125 mostly-benign hits (the bulk being "Secondary care clinician or PCRL
or radiologist advises…" single-condition items). Every candidate's full text
was read and adjudicated. Full table: Appendix A.

**Census: 60 compound items, 23 sites** (16 adult, 7 paediatric).

**Pattern census — the distinct logical shapes that actually exist:**

| # | Shape | Count | Notes |
|---|-------|-------|-------|
| 1 | `all` — all N sub-conditions required (N = 2–6) | 29 | Includes the 11-item ctcol family (indication AND shared gate) |
| 2 | `any` — any one of N options | 4 | e.g. `xrch_em_1_p`; plus the denormalised xrch_48 family at PDF level |
| 3 | `mandatory_plus_any` — mandatory stem(s) + at least one of N options | 24 | minOptional = 1 in every case |
| 4 | Mixed / one-level nesting | 2 | `usca_48_1` (mandatory + all-of + any-of, the most complex item in the set); `ctcap_p2_2` (all-of with a nested **at-least-2-of-6** lab list) |
| 5 | Footnote-carried sub-list | 1 | `xrph_p2_4_p` — the option list lives in `site.footnotes`, referenced by `*1` |

Additionally, **6 items have one level of nesting** inside an option
(`ctcap_p2_2`, `cth_a48_1`, `cth_p2_3`, `usca_48_1`, `usst_p3_1`, `uspv_p2_5`) —
an option that is itself an all-of pair, or an at-least-K sub-count. No item
nests deeper than one level. No other logical shape exists in the data.

**Minimum viable model implication:** the three named types cover the top level
of all 60 items. The design must decide how to handle (a) exactly one level of
nesting in 6 items, (b) one `at_least: 2` sub-count in one item, and
(c) footnote-referenced option lists — and nothing more. There is no case for
arbitrary-depth trees or a generic expression language.

**Data-quality issues found during the census** (for the migration plan, and
some may warrant fixing regardless):
- `cth_p2_3` — text corruption: the clause "clear history, and low risk* or MRI
  not available" is duplicated within the item.
- `cth_p2_2`, `ctsin_em_1`, `ctkub_em_1` — option lists are run-on prose with no
  separators (extraction lost the PDF's line breaks), so even the *prose* is
  hard to read today.
- `ushp_p2_2_p` — appears to be two distinct PDF criteria merged into one item.
- `xrph_p2_3_p` — three clinical signs with no stated connective; whether any-of
  or all-of is clinically ambiguous → needs clinical ruling at migration time.
- Borderline items excluded from the census with reasons are listed in
  Appendix A part 2 (e.g. `uspv_s2_1` "both pre- and post-menopausal" is
  population scope, not logic; `xrkn_p3_5_p` "+/- any of" list is optional
  supporting features, not gating logic).

## Finding 5 — Phase 1 mockup (`public/crr-criteria/compound-mockup.html`)

The mockup (937 lines, v0.1, working interaction model on CT Chest exemplar
data) implies this item-level data model:

```js
item = {
  id, text /* summary line */, priority, timeframe,
  logic: null | {
    type: 'all' | 'any' | 'mandatory_plus_any',
    minOptional?: number,          // mandatory_plus_any only
    conditions: [{ id, text, required? /* mandatory_plus_any only */ }]
  }
}
```

Display behaviour it demonstrates:
- `logic: null` → current simple card, unchanged (backwards compatibility is
  designed in from the start).
- `all` → parent "verify all" checkbox + one checkbox per sub-condition; header
  "ALL OF THE FOLLOWING"; parent auto-checks when all subs checked.
- `mandatory_plus_any` → mandatory rows tagged "Required", divider "PLUS AT
  LEAST ONE OF THE FOLLOWING", optional rows; met-state shown by a dot, not a
  parent checkbox.
- `any` → **radio buttons** (pick one), met-dot.
- An `evaluateCompound(logic, checkedIds)` function computes item-met state —
  "met" for output purposes = the logic expression evaluates true, answering
  CV-015's "what does 2-of-3 ticked mean" at the interaction level.
- Three modes rendered: interactive (above), passive (sub-elements listed with
  AND/OR connector rows, no inputs), and a triage view showing per-sub-element
  met/unmet against a note.

Two caveats: (1) the mockup's exemplar regroups the real ct_chest items into
shapes that don't match the current flat data one-for-one (e.g. it merges
`ctch_p2_3/p2_4` + a specialist option into one `mandatory_plus_any` item) — it
demonstrates the *rendering*, not the migration mapping; (2) it has no
representation for the nested-option or at-least-2 cases.

## Finding 6 — How the Triage Advisor system prompt consumes criteria

- `buildSystemPrompt()` (triage/index.html:1687) = preamble + instruction text
  (fetched from `/api/system-prompt`; active version is **v2.3.0**) + criteria
  block + JSON output contract.
- `buildCriteriaBlock()` (triage/index.html:1614) serialises each site as plain
  text: `=== <exam> — <site> (<modality>) [pNN] ===`, `Guidance:`/`Background:`
  lines, then `[<group title>]` and one line per item: `- <label>` (or
  `* MANDATORY: <label>` — the match-data index has a per-item `mandatory`
  boolean, currently set on exactly **1 of 336 items**). Site-level
  `OUT OF CRITERIA / REDIRECT / NOT ROUTINELY FUNDED / DEFINITIONS AND
  SUB-CRITERIA (footnotes)` lines follow. This is the ~21k-token cached block.
- **Compound logic reaches the model as unstructured prose inside a single `-`
  line.** The active prompt v2.3.0 compensates with instructions: "COMPOUND
  CRITERIA: Many criteria have AND/OR logic. Decompose and evaluate each
  sub-element separately" plus hand-written pathway examples (CT Head TIA
  gateway, headache sub-elements) baked into the prompt text.
- Output contract: `met_criteria[]` / `missing_criteria[]` are free-text strings
  with page citations — there are no sub-element IDs anywhere in the loop.
- Data source caveat: the block is built from match-data, not published
  criteria — see headline finding 3.

Design implication (to develop in Phase 1, not resolved here): a structured
serialisation (explicit ALL OF / ANY OF / REQUIRED+PLUS-ONE-OF markers per item)
would shift decomposition from prompt-instruction burden to data, and could
carry sub-element IDs into `met_criteria`/`missing_criteria` — but any prompt
text change is out of scope for this brief and would be a separate exercise.

## Finding 7 — Wipe-and-reload sequencing: the reload has ALREADY HAPPENED

The brief asks whether the reload should land in the new compound-aware schema
or happen first with migration second. **This question is moot: the reload
described in `claude-code-data-load-instructions.md` was executed and published
as v4.1.0 on 2026-05-14.** Evidence:

- Live `GET /api/version` → `v4.1.0, publishedAt 2026-05-14, criteriaCount 31`.
- The load instructions' final step is "Publish new version. Bump the data
  version to `v4.1.0`" — matching what is live.
- Live published data is item-for-item identical to the (Part-1-fixed)
  `pdf-criteria-all.json`: same 473 item IDs, zero label differences, paediatric
  `_p` suffixes present.

**Recommendation:** treat v4.1.0 published data as the migration baseline —
i.e. the effective sequencing is *reload-then-migrate*, already half done.
The compound migration becomes: v4.1.0 flat items → structured items → new
version snapshot → publish. This is the lowest-risk path because the version/
rollback pipeline already exists and is structure-agnostic (Finding 1), giving
a one-step rollback to the flat v4.1.0 snapshot. The brief's reference to a
"v4.0.5 → full reload plan" appears to predate the 14 May publish; if another
reload is still planned that I'm not seeing evidence of, that changes this
recommendation and I'd want to know before Phase 1.

## Finding 8 — CQL draft assessment (`CRRCriteria_v2_0.cql`)

Located at `~/Downloads/Misc/To Review/CRRCriteria_v2_0.cql` (1,118 lines,
289 parameters, 89 defines; header self-describes as machine-generated draft,
never validated).

**Well-formed?** Syntactically consistent, yes. Structurally it is **boolean
flag algebra dressed as CQL**: it declares `using FHIR '4.0.1'` but contains no
FHIR data retrieval, terminology bindings, or value sets — every input is a
hand-named `parameter X Boolean`. As a computable FHIR artifact it is a shell;
as a logic-shape vocabulary it is readable and consistent.

**Consistent with the census?** At the *pattern* level, yes — it independently
converges on the same three shapes (e.g. `CT_CAP_P2_Criteria` = mandatory stems
AND (pathway-A OR pathway-B); `US_Carotid_Acute` = all-of with nested any-of;
`US_DVT_Acute48h` = mandatory + (Wells≥2 OR Wells<2+D-dimer)). This corroborates
the three-type vocabulary.

**At the *content* level, no — it has clinical fidelity divergences:**
- Paediatric sections are coarse inventions that contradict the actual criteria.
  Example: `Paed_XrayChest_Acute_Criteria` includes `SuspectedPneumonia` as a
  qualifying criterion, while the actual criterion (`xrch_24_1_p`) says chest
  x-ray is *rarely required* in suspected CAP and lists narrow exceptions.
  `Paed_USSpine_Criteria` bears no resemblance to the sacral-dimple six-feature
  list in `usspp_p2_1_p`.
- It folds site-level guidance into item logic (e.g. `CT_CAP_NoClearReferralPathway`
  as a mandatory condition — that text is site `inlineGuidance`, not part of the
  criterion).
- It appends `or AnySpecialistAdvised` to nearly every define, collapsing what
  the data models as separate specialist-endorsed items (often with different
  priorities) into each criterion.

**Verdict: set aside as reference-only.** Its logic-type vocabulary usefully
corroborates the census patterns, but it must not be used as a source of
truth for any migration mapping — its content diverges from the criteria in
ways that would fail clinical review. (This also indirectly validates NFR-013:
a faithful CQL serialisation *from* structured criteria data would be
straightforward to generate later, and better than this draft.)

---

## What Phase 1 needs decided by Gary before starting

1. **Census acceptance** — is ~60 items / 23 sites accepted as the design
   target (vs the brief's 26/13)? The three-type model still holds; the delta
   is scope of migration and clinical review effort, not model complexity.
2. **Denormalised families** — should the ctcol/ctcap/xrch_48 families be
   re-normalised (collapsed) during migration, or kept as-is with structure
   added per item? (Clinical/content call with ID-stability consequences.)
3. **Match-data gap** — confirm the Phase 1 design should specify how the
   Triage Advisor serialisation moves onto published criteria (or a regenerated
   match-data), since compound structure otherwise never reaches the LLM.
4. **Reload assumption** — confirm no further wipe-and-reload is planned beyond
   the already-published v4.1.0 (per Finding 7).

---

## Appendix A — Full compound item enumeration

Legend: **A** = all (all sub-conditions), **B** = any (any one qualifies),
**C** = mandatory_plus_any (stem + ≥1 option), **M** = mixed/nested,
**F** = footnote-carried options. ⚑ = data-quality flag (detail in Finding 3/4).

### Part 1 — Compound items (60)

| # | Site | Item | Pattern | Sub-structure (from actual text) |
|---|------|------|---------|----------------------------------|
| 1 | ct_cap | ctcap_p2_1 | A(2) | malignancy-suspicion stem AND (M>50/F>60 + weight loss >5%/3–6mo) ⚑ stem duplicated across family |
| 2 | ct_cap | ctcap_p2_2 | M | stem AND (M>40/F>50 + weight loss) AND **at least 2 of 6** abnormal labs (CRP, Hb, Ca, platelets, ALP, albumin) |
| 3 | ct_chest | ctch_p2_2 | A(3) | age>55 current smoker AND ≥1 concerning symptom 6wks AND unexplained after CXR+bloods |
| 4 | ct_chest | ctch_p2_3 | A(2) | indeterminate CXR abnormality AND CT recommended in radiology report |
| 5 | ct_chest | ctch_p2_4 | A(2) | persistent consolidation on 6wk follow-up CXR AND CT recommended in report |
| 6 | ct_chest | ctch_p2_5 | A(2) | specialist advises staging CT AND CT is advised next step on HealthPathway |
| 7 | ct_chest | ctch_p3_1 | A(2) | isolated nodule not confirmed benign AND CT recommended in report |
| 8–18 | ct_colonography | ctcol_p2_1..4, ctcol_p3_1..7 | A(2) ×11 | one presenting indication AND shared gate (tolerates prep + no colonoscopy/CTC in 5yrs) ⚑ gate duplicated ×11; several indications internally conjunctive (habit + bleeding + age) |
| 19 | ct_head | cth_a48_1 | B(3), nested | TIA≤7d+specialist rec OR (no high-risk features AND BPAC tool indicates CT) OR unable to access rapid specialist care |
| 20 | ct_head | cth_p2_1 | C(1+4) | headache pattern change AND any of: malignancy/chronic illness, Valsalva exacerbation, persistent N&V, objective neuro deficit |
| 21 | ct_head | cth_p2_2 | C(1+6) | cognitive impairment AND ≥1 SOL feature (rapid decline, focal signs, falls, anticoagulants, gait ataxia/incontinence, cancer history) ⚑ run-on list, no separators |
| 22 | ct_head | cth_p2_3 | M | first seizure ≥21y AND ((clear history AND low risk) OR MRI unavailable) ⚑ duplicated clause in text |
| 23 | ct_ivu | ctivu_p2_1 | A(2) | macroscopic haematuria (UTI excluded/persists) AND age 40–85 |
| 24 | ct_ivu | ctivu_p2_2 | A(3) | haematuria gate AND age<40 AND normal initial investigations with persistence |
| 25 | ct_kub | ctkub_em_1 | C(1+5) | suspected renal colic AND any of: Cr>160/eGFR<45, solitary kidney, temp>38, peritonitis/sepsis, bilateral stones ⚑ run-on list |
| 26 | ct_sinus | ctsin_em_1 | C(1+3) | rhinosinusitis AND any red flag: severe frontal headache, severe systemic symptoms, visual change/diplopia ⚑ run-on list |
| 27 | ct_sinus | ctsin_p3_1 | A(3) | suspected CRS AND 12wks saline+INCS failed AND no previous CT sinus |
| 28 | us_abdomen | usab_p3_3 | A(3) | initial ALP>2×ULN AND repeat ALP>ULN AND repeat GGT>ULN (3mo apart) |
| 29 | us_abdomen | usab_p3_4 | A(3) | ALT>120 AND conservative methods failed AND no clinical features of concern |
| 30 | us_carotid | usca_em_1 | C(1+2) | suspected TIA AND ≥1 of: high 7-day stroke risk, neck pain/headache |
| 31 | us_carotid | usca_48_1 | M | suspected TIA AND ALL of 6 (incl. 4 negatives) AND any one of 3 (specialist rec / BPAC tool / tool unavailable but suitable) — most complex item in the set |
| 32 | us_dvt | usdvt_48_1 | C(1+2) | suspected lower limb DVT AND ≥1 of: Wells≥2, Wells<2 + positive D-dimer |
| 33 | us_dvt | usdvt_s1_1 | A(3) | no DVT on initial US AND suspicion remains high AND Wells≥2 |
| 34 | us_neck_thyroid | usnt_p2_3 | A(3) | neck mass: >3wks AND >1cm AND no obvious cause |
| 35 | us_neck_thyroid | usnt_p4_1 | C(2+3) | ITN on CT/MR + TSH normal/elevated AND either: >10mm & <35y, >15mm & ≥35y, any size with adverse features |
| 36 | us_neck_thyroid | usnt_p4_2 | A(3) | multiple ITNs AND TSH normal/elevated AND ≥1 nodule ≥20mm |
| 37 | us_pelvis | uspv_48_1 | C(1+2) | ongoing pregnancy >14d post-abortion/miscarriage AND either: HCG>1000 at 14d, serial bHCG remains high |
| 38 | us_pelvis | uspv_p2_4 | A(2) | persistent symptoms warranting ovarian ca consideration AND Ca-125 ≥35 |
| 39 | us_pelvis | uspv_p2_5 | C(1+2), nested | AUB + non-uterine excluded AND either: (≥2 risk factors*5 for EH/EC) OR suspected pelvic mass unimaged |
| 40 | us_pelvis | uspv_p3_4 | A(3) | perimenopausal on MHT with irregular bleeding AND increased-progestogen trial AND >6mo since starting MHT |
| 41 | us_pelvis | uspv_p3_5 | C(1+3) | benign endometrial cells on smear AND ≥1 of: post-menopausal, symptomatic, ≥1 EC/EH risk factor*5 |
| 42 | us_pelvis | uspv_p3_6 | A(2) | new abdo/pelvic symptoms >6wks persistent AND not recently investigated |
| 43 | us_pelvis | uspv_p3_7 | C(1+2) | suspected ovarian cyst AND either: unilateral pain>4wks/tenderness, mass with low cancer suspicion |
| 44 | us_renal | usrn_em_1 | C(1+2) | pyelonephritis presentation AND either: no antibiotic response 72h + abscess consideration, flank pain not improving 24h IV/48h oral |
| 45 | us_renal | usrn_p2_2 | A(3) | macroscopic haematuria AND age 40–85 AND unable to have IV contrast (4 enumerated reasons) |
| 46 | us_renal | usrn_p3_2 | C(1+4) | new CKD diagnosis AND any of: eGFR<30, eGFR<45+diabetes, eGFR<60+progression, ACR>250 |
| 47 | us_soft_tissue | usst_p2_1 | C(1+5) | new lump AND any of: deep/fixed/hard/irregular, >5cm, rapid change, painful, recurrence post-sarcoma |
| 48 | us_soft_tissue | usst_p3_1 | C(1+2), nested | new lump AND either: (superficial+mobile+>5cm+uncertain) OR (<5cm + uncertain fascia depth) |
| 49 | xr_chest | xrch_p3_1 | C(1+3) | non-acute asthma AND any of: unclear diagnosis, poor control, frequent exacerbations |
| 50 | xr_chest | xrch_s2_1 | C(1+3) | 6wk post-infection follow-up AND any of: ongoing symptoms, suspicious radiology + follow-up recommended, specialist recommends |
| 51 | xr_spine | xrsp_em_2 | C(1+5) | suspected cauda equina: acute back pain AND any of: sphincter disturbance, gait disturbance, saddle anaesthesia, bowel/bladder, abnormal reflexes/weakness |
| 52 | xr_spine | xrsp_p2_1 | C(1+2) | acute localised back pain + suspected osteoporotic fracture AND either: known osteoporosis, risk factors incl. corticosteroids |
| 53 | us_hip_paed | ushp_p2_2_p | C, ⚑ | abnormal examination <5mo; risk-factor any-of (breech, family history, packaging problems) ⚑ appears to be two PDF criteria merged into one item |
| 54 | us_spine_paed | usspp_p2_1_p | C(1+6) | child <6wks with sacral dimple AND any one of 6 features |
| 55 | xr_abdomen_paed | xrabd_em_1_p | C(1+4) | foreign body ingestion AND any of: oesophageal obstruction, button battery, multiple magnets, large object |
| 56 | xr_chest_paed | xrch_em_1_p | B(4) | refer without imaging if any of: respiratory distress, SpO2≤92%, acute severe asthma, inhaled foreign body |
| 57 | xr_chest_paed | xrch_24_1_p | B(3) | CXR in CAP only if any of: diagnostic uncertainty, not progressing + complications, recurrent pneumonia |
| 58 | xr_feet_paed | xrft_p3_2_p | C(1+3) | pes planus AND any of: rigid, progressively painful, significant bony deformity |
| 59 | xr_pelvis_hip_paed | xrph_p2_3_p | B(3)? ⚑ | suspected DDH >4mo with: limited abduction; leg length discrepancy; abnormal gait — connective (any/all) clinically ambiguous |
| 60 | xr_pelvis_hip_paed | xrph_p2_4_p | F | risk factors *1 (list lives in `site.footnotes`) AND not previously imaged AND ≥4mo |

### Part 2 — Reviewed and excluded (not compound), with reasons

| Site | Item | Reason excluded |
|------|------|-----------------|
| us_pelvis | uspv_24_1 | "including:" list is illustrative examples of one condition, not gating options |
| us_pelvis | uspv_p3_3 | "at least three months" is a duration threshold, not multi-element logic |
| us_pelvis | uspv_p4_1 | "only one of the three Rotterdam criteria fulfilled" is a single assertable scenario (an exactly-1-of-3 count, but the referrer asserts it as one fact) |
| us_pelvis | uspv_s2_1, uspv_s3_1 | "both pre- and post-menopausal" = population scope, not logic |
| xr_abdomen | xrab_p3_1 | "both a pre- and post-void US and KUB" = two tests ordered, not logic; condition itself is single-scenario prose |
| us_renal_paed | usrep_p3_2_p | "urine calcium excretion OR calcium creatinine ratio" = alternative lab measures of the same thing |
| us_soft_tissue_paed | usstp_em_2_p | "especially if red flags:" list is emphasis/illustration, not a gate |
| xr_chest_paed | xrch_p3_1_p | "for example:" list is illustrative |
| xr_knee_paed | xrkn_p3_5_p | "+/- any of:" list is optional supporting features — criterion met without them |
| us_hip_paed | ushp_p2_1_p | single scenario + management instruction |
| xr_chest | xrch_48_1..12 | each item is a single symptom; the repeated "One or more of the following…" stem is a denormalisation artifact (headline finding 2), handled as a family decision, not per-item logic |
| (all sites) | "Secondary care clinician or PCRL or radiologist advises…" (~40 items) | enumerated actor alternatives within one condition |

### Part 3 — Reconciliation with the prior analysis (26 items)

All 13 exams in `compound-criteria-analysis.json` appear in my census. The
differences: (a) it counted PDF-level criteria where the JSON has split
families (ctcol counted as ~4 patterns vs 11 items; ctcap as 1 vs 3);
(b) it omitted 10 census sites entirely (ct_kub, us_renal, us_soft_tissue,
xr_chest adult, and 6 paediatric sites); (c) it included a few items I
classify as prose (its `all`-pattern entries for two-condition items match
mine). Its three-pattern vocabulary (`all` / `any` / `mandatory_plus_any`)
is confirmed and adopted for the census.

---

**STOP.** Phase 0 complete. No design work has been started. Awaiting review of
this report — in particular the four decisions listed under "What Phase 1 needs
decided" — before proceeding to `compound-criteria-design.md`.

---

## Decisions recorded (Gary, 5 July 2026)

Spot-check: 10 items (seed 42) reviewed and accepted; supplementary 5 (seed 43,
ctcol family and previously-verified items excluded) drawn — Phase 1 authorised
on their acceptance.

1. **Census accepted at ~60 items / 23 sites.** The two-condition all(2) tier
   stays IN the census — capability ≠ obligation to migrate (see 5).
2. **Denormalised families** (ctcol ×11, ctcap ×3, xrch_48 ×12): design for
   collapse as **target state**, staged per family; each family's collapse
   requires clinical sign-off before migration — not a done deal.
3. **Triage Advisor consumer contract** must specify moving the LLM criteria
   serialisation onto published criteria and retiring the `criteria:match-data`
   blob. The pipeline fix itself is a separate implementation brief.
4. **v4.1.0 is the migration baseline.** No further wipe-and-reload planned.
5. **Migration tiers by value**, not uniformly: denormalised families and
   complex/nested items (M-pattern, one-level nesting) first; trivial all(2)
   items last, with the explicit option that they remain flat indefinitely.
6. **`xrph_p2_3_p` working assumption: any-of** (each sign independently
   sufficient grounds for DDH imaging >4 months) — but marked **REQUIRES
   CLINICAL RULING** in the migration plan's clinical sign-off list; not
   decided by us.
7. **Region overrides (Phase 1 scope addition):** item-level region overrides
   are placeholder data and may be discarded at migration. Only **site-level
   HealthPathways URLs** must be preserved. No preservation machinery for
   item-level overrides is to be designed.
8. **Forward note for the Viewer implementation brief (not this design):**
   sub-element tick events are to be included in usage telemetry (CV-025).

---

## Appendix B — Spot-check verification record

Both draws are reproducible: `random.seed(N); random.sample(sorted(pool), k)`
over the census item IDs.

### B.1 — Primary spot-check (seed 42, pool = all 60 census items) — REVIEWED AND ACCEPTED

| # | Item | Classification | Source text (v4.1.0 `label`, verbatim) | Review note |
|---|------|----------------|----------------------------------------|-------------|
| 1 | `uspv_p3_4` | all(3) | Perimenopausal woman, on combined cyclical MHT, with ongoing irregular bleeding, or bleeding outside the time of progestogen withdrawal, AND despite a trial of increased progestogen, AND it has been more than 6 months since starting MHT. | Internal "or" in condition 1 = intra-condition alternatives, not a 4th element. Accepted as clinically correct. |
| 2 | `ctcol_p2_1` | all(2), family | Refer for consideration of P2 colonoscopy vs. CTC for all patients presenting with any of: Altered bowel habit (looser and/or more frequent) > six weeks duration plus unexplained rectal bleeding (benign anal causes treated or excluded**), aged >50 years. AND are able to tolerate bowel prep and the procedure and possible further treatment and have not had a previous colonoscopy or CTC within the last 5 years unless there is a clear indication to repeat the procedure. | Indication internally conjunctive; becomes one option in the collapsed family. |
| 3 | `ctcap_p2_2` | Mixed/nested | Consider direct referral for CT chest, Abdomen and Pelvis if: Following full clinical assessment and examination and initial investigations (bloods, urinalysis and CX-RAY), the primary care practitioner has a strong suspicion of underlying malignancy but no focal pathology or localising signs/symptoms or potential biopsy site has been identified AND Male over 40 years of age or female over 50 years of age, and there is unintentional, unexplained, documented weight loss of more than 5 % of usual body weight over 3-6 months (+/- yellow flag symptoms of abdominal pain, fatigue, nausea) AND two or more of following abnormal lab test results, which are unexplained, and persistent on repeat testing after three weeks: raised CRP, low haemoglobin raised calcium, high platelet count, high alkaline phosphatase, low albumin. | The one at-least-K item (K=2 of 6 labs). |
| 4 | `usspp_p2_1_p` | mandatory_plus_any(1+6) | Child younger than 6 weeks with a sacral dimple or pit where any one of the below features applies: the base of the dimple cannot be visualised; the dimple is more than 5mm in diameter; the dimple is more than 2.5cm above the anal margin; there is an associated cutaneous marking, hairy patch, skin tag, or fatty lump; there is a duplicated gluteal cleft; there is more than one dimple | Explicit "any one of the below" in source. |
| 5 | `ctcol_p3_7` | all(2), family | Refer for consideration of P3 colonoscopy vs. CTC all patients presenting with one of: Secondary care clinician or Radiologist advises referral for non-urgent CTC. AND can tolerate bowel prep and the procedure and possible further treatment and have not had a previous colonoscopy or CTC within the last 5 years unless there is a clear indication to repeat the procedure | Even the specialist-endorsement item carries the gate — evidence the gate applies family-wide, supporting collapse. Accepted as clinically correct. |
| 6 | `ctcol_p3_5` | all(2), family | Refer for consideration of P3 colonoscopy vs. CTC all patients presenting with one of: New Zealand Guidelines Group (NZGG) Category 2 family history plus one or more of altered bowel habit (looser and/or more frequent) for more than six weeks' duration plus unexplained rectal bleeding (benign and anal causes treated or excluded), aged 40 years or older *1. AND can tolerate bowel prep and the procedure and possible further treatment and have not had a previous colonoscopy or CTC within the last 5 years unless there is a clear indication to repeat the procedure | Family member; footnote *1 reference in indication. |
| 7 | `ctcol_p3_4` | all(2), family | Refer for consideration of P3 colonoscopy vs. CTC all patients presenting with one of: Unexplained iron deficiency anaemia (i.e. Haemoglobin below local reference range in conjunction with low ferritin) AND can tolerate bowel prep and the procedure and possible further treatment and have not had a previous colonoscopy or CTC within the last 5 years unless there is a clear indication to repeat the procedure | Family member. |
| 8 | `ctcol_p2_2` | all(2), family | Refer for consideration of P2 colonoscopy vs. CTC for all patients presenting with any of: Unexplained rectal bleeding (benign anal causes treated or excluded**) with iron deficiency anaemia (haemoglobin below the reference range in conjunction with low ferritin) AND are able to tolerate bowel prep and the procedure and possible further treatment and have not had a previous colonoscopy or CTC within the last 5 years unless there is a clear indication to repeat the procedure. | Family member. |
| 9 | `xrph_p2_3_p` | any(3), flagged ⚑ | Suspected DDH on examination*3 in child over 4 months of age with Limited hip abduction; Leg length discrepancy; Abnormal, waddling gait | No stated connective in source. **Decision 6:** working assumption any-of; REQUIRES CLINICAL RULING at migration. |
| 10 | `ctch_p3_1` | all(2) | Isolated, pulmonary nodule identified on a chest x-ray and cannot be confirmed as benign from x-ray appearances alone AND referral for CT chest is recommended in the Radiology report | Boundary-of-census tier. **Decision 5:** stays in census; migrates last or remains flat. |

*Draw note: 5 of 10 fell in the ctcol family (11/60 of the pool) — statistically
fair but only six distinct classifications verified, prompting the supplementary
draw below.*

### B.2 — Supplementary spot-check (seed 43) — REVIEWED AND ACCEPTED (Gary, 5 July 2026)

Pool: 44 items = 60 census minus the 11-item ctcol family minus the 5
non-family items already verified in B.1.

Clinical confirmations recorded with acceptance:
- **`usdvt_48_1`** — intra-option handling confirmed clinically correct:
  "Wells<2 + positive D-dimer" is a single qualifying pathway per standard DVT
  decision rules, not two separable elements. This confirms the census-wide
  rule that intra-option conjunctions remain prose.
- **`usnt_p4_2`** — confirmed as three independent conditions (all-of).

| # | Item | Classification | Source text (v4.1.0 `label`, verbatim) | Note |
|---|------|----------------|----------------------------------------|------|
| 1 | `ctch_p2_3` | all(2) | Indeterminate abnormality on chest x-ray which raises the possibility of a lung cancer (e.g. bulky hilum), AND CT chest is recommended in the Radiology report. | Trivial all(2) tier — may remain flat indefinitely per Decision 5. |
| 2 | `usdvt_48_1` | mandatory_plus_any(1+2) | Clinically suspected lower limb DVT and one or more of the following: Well's score of 2 or greater 1; Well's score less than 2 and positive D-dimer 1 | Option 2 internally conjunctive (Wells<2 AND D-dimer+) = intra-option structure. Stray "1" after each option is a footnote-marker extraction artifact ⚑. |
| 3 | `ctivu_p2_1` | all(2) | Macroscopic haematuria, if: UTI excluded or haematuria persists after treating the UTI AND patient is aged between 40 and 85 years | Intra-condition "or" (UTI excluded / persists after treating) — same handling as `uspv_p3_4` in B.1. |
| 4 | `uspv_p3_7` | mandatory_plus_any(1+2) | Suspected ovarian cyst and either: unilateral pelvic pain for more than four weeks and/or unilateral tenderness, or pelvic mass and low suspicion of cancer. | Both options internally compound — kept as intra-option prose per census rule. |
| 5 | `usnt_p4_2` | all(3) | Multiple incidental thyroid nodules on CT or MR imaging, and TSH is normal or elevated, and one or more nodules measures 20mms or more in longest diameter | Lowercase "and" chain — missed entirely by the prior 26-item analysis. |
