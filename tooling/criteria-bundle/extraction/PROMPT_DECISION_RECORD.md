# Extraction prompt v3.0.0 — decision record

**Date:** 6 September 2026 · **Slice:** ARCH-MIG-01 4a · **Prompt:** `prompt-v3.0.0.json` (canonical), `prompt-v3.0.0.md` (rendering)
**Supersedes:** system prompt v2.3.0 (D1 `system_prompts` v2.3.0, activated 2026-05-24 per SD-07)
**Source of the clause numbering:** `instructions/arch-mig-prompt-decomposition.md` §1 — 41 clauses. This record says where each one ended up *in the prompt*, which the decomposition (written before the prompt existed) could only predict.
**Status: NOT CLINICALLY REVIEWED.**

---

## 1. Clause-to-disposition

`part` names the section of `prompt-v3.0.0.json` the clause survives in. **—** means the clause
is not in the prompt at all; the "Where it went" column then names what owns it.

| # | v2.3.0 clause (condensed) | Cat. | Part | Where it went |
|---|---|---|---|---|
| 1 | "Tell the GP whether their referral will proceed, is at risk or will be declined" | (e) | — | **Retired.** `role` says the opposite in its first line: "You extract. You do not assess." |
| 2 | STEP 0(a) six emergencies → ED/111, verdict declined, stop | (c) | `redflags` (partially) | The *concepts* become `redflag.*` items on the national Questionnaire; the *consequence* becomes `CRR_RedFlags.cql` precedence (AD-03). The prompt tells the model to answer the items and adds "Never state what a flag means". **One of the six (thunderclap → SAH) has no published source and is dropped** — AD-05 / KI-45, open governance decision D1. |
| 3 | STEP 0(b) recent trauma → ACC | (c) | `redflags` (item only) | `funding.accTrauma` on the national Questionnaire; the redirect is CQL `ACC_PATHWAY`. The prompt never mentions ACC — the `check` rule for "redirect destination" would now fail if it did. |
| 4 | STEP 0(c) "wrong pathway" | (e) | — | **Retired as a model judgement.** Its only published statement is CT CAP's own `excl.urgentAdmissionRequired` row (Q5). |
| 5 | "Step 0 is the only place a redirect can set the verdict" | (c) | — | Fixed precedence in `Determination`. |
| 6 | Identify ALL matching pathways | (e) | — | Engine evaluates every pathway define unconditionally. |
| 7 | `?TIA`-style markers are a possibility, not an assertion | (a) | `examsite` | Kept, in the exact form the decomposition specified: a `?` marker may support a candidate exam/site id but never answers a condition-present item as `documented`. |
| 8 | Same condition under multiple entries → identify all | (e) | — | Engine; multi-bundle evaluation. |
| 9 | Gender-specific pathway filtering | (b) | — | `patient.sex` item + CQL sex conditions. The prompt does not mention gender. |
| 10 | General vs specific variant pathways are independent | (b) | — | Separate defines composed with `or`. |
| 11 | Numeric thresholds are strict minimums | (b) | — | CQL comparisons per site. **The prompt states no threshold at all**, and `check` rule 13 fails if one appears. |
| 12 | Epidemiological modifiers are not thresholds | (b) | — | Transcription rule (AD-11); never encoded, so never something the model can misread. |
| 13 | Qualitative lab terms accepted; numeric thresholds still need a value | (a)+(b) | `evidence` rule 6 | Kept as the (a) half only: a qualitative abnormal statement answers the **boolean flag** as documented, and "it gives no number". The (b) half (which criteria need a value) is per-site CQL. KI-06. |
| 14 | Clinical shorthand equivalence + "note the inference in the notes field" | (a) → **root cause** | `equivalence` | **Rewritten as a closed list.** The open licence is gone; three named equivalences earn `documented`, everything else is `inferred`. The "note the inference" instruction is replaced by the `status` field, which the engine acts on. See §3. |
| 15 | Compound criteria: decompose and evaluate each sub-element | (b) | `redflags` (partially) | The model answers atoms; CQL composes. The only trace in the prompt is the compound-red-flag sentence, which tells the model *not* to resolve a compound. |
| 16 | Temporal ambiguity: flag rather than assume | (a) | `evidence` rule 5 | Strengthened: "Ambiguous -> omit", merged with the numeric-literalism rule (clause 20's typo case, KI-10). |
| 17 | Gateways are mandatory within their pathway only | (b) | — | Gateway indicators sit inside their pathway's define (KI-07). |
| 18 | Lab requirements table (7 exam rows) | (b)+(c) | — | **Retired.** Per-site indicators and CQL. This table is where the prompt–criteria drift lived (its CT CAP row lists ALP/GGT/ALT/bilirubin; published CT CAP is CRP/Hb/calcium/platelets/ALP/albumin). `check` rule 13's analyte-name guard exists specifically so it cannot come back. |
| 19 | Missing lab → specific `add_to_note` item | (d) | — | Renderer, from `missingInformation` linkIds → published item text. |
| 20 | Doc mode **strict**: only explicit information; age and sex must be explicit | (a) | `evidence` rules 1, 2, 8 | Split: "only what the note supports" and the `documented` definition are rules 1–2; the age/sex half is rule 8. |
| 21 | Doc mode **inferred**: reasonable clinical inferences allowed | (a) | `evidence` rules 2, 4 | **The two doc-mode prompts collapse into one.** The model always extracts inferences and always labels them; whether they count is the engine parameter `Documentation Standard` (TA-010). This halves the regression matrix. |
| 22 | Any fully-met pathway → proceeds; highest priority wins | (e) | — | Engine `Determination` + priority ordering. |
| 23 | "One met pathway = proceeds" + four worked examples | (e) | — | Engine. The four examples become per-site scenarios (decomposition §3). |
| 24 | at_risk if partially met; declined if nothing matches | (e) | — | `INSUFFICIENT_INFORMATION` (null) vs `CRITERIA_NOT_MET` (false) — a sharper distinction. |
| 25 | Advisory notes for non-deciding pathways | (d) | — | Rule trace + renderer. |
| 26 | Conflicting dispositions → report all, apply highest accepting | (e) | — | Engine precedence. |
| 27 | STEP 3b CHECK 1–5 (verdict consistency) | (e) | — | **Retired entirely.** They existed because the model computed the verdict; the engine cannot be inconsistent with itself. ~1,400 characters of the old prompt, gone. |
| 28 | Not-funded vs redirected distinction | (c)+(d) | — | Separate determinations + renderer wording. |
| 29 | `met_criteria` always populated | (d) | `output` (as a prohibition) | Rule trace lists every true define. The prompt names `met/missing lists` among the fields that void the response. |
| 30 | `missing_criteria` scoping rules | (d) | `output` (as a prohibition) | `missingInformation` computed per pathway relevance. |
| 31 | `add_to_note`: specific sentences | (d) | `output` (as a prohibition) | Renderer template (D6). |
| 32 | `suggested_wording`: complete rewritten note | (e) | `output` (as a prohibition) | **Dropped (D6).** Generated clinical prose is the highest fabrication surface. |
| 33 | `[pXX]` page references | (d) | — | `source-page` on PlanDefinition actions; renderer attaches them. |
| 34 | Paediatric note: "use ONLY the paediatric criteria" | (b) | — | `Is Adult` define + bundle routing. The prompt's only age instruction is rule 8, which forbids the model from deciding what "paediatric" means (MW-008, KI-09). |
| 35 | CRITERIA block (all sites serialised) | — | — | **Retired.** ≈21,000 tokens. The model receives Questionnaires, not criteria. |
| 36 | `interpreted_note` (model's corrected note) | (e) | `output` (as a prohibition) | **Retired** (KI-10). Reinforced by `evidence` rule 5's "no correcting typos". |
| 37 | `exam`, `modality` | (a) | `examsite` | Becomes `examSites[]`: candidate ids from the supplied published list, each with a quote (TA-002, TA-006). |
| 38 | `verdict`, `priority`, `criteria_page`, `not_funded_flag`, … | (e)/(d) | `output` (as a prohibition) | Engine + renderer. |
| 39 | `safety_alert`, `redirect` | (c) | `output` (as a prohibition) | Red-flag / redirect indicators + precedence. |
| 40 | `notes` (free text) | (e) | `output` (as a prohibition) | **Retired** (KI-12). |
| 41 | `FALLBACK_INSTRUCTION_TEXT` (hard-coded older rule set) | — | — | **Retired.** No silent fallback: the extraction service fails visibly if the prompt version cannot be loaded, the same principle as bundles (KI-15/KI-19). |

**Tally.** 41 clauses: **9 survive in the prompt** as extraction rules (7, 13, 14, 16, 20, 21, 37, plus the item-answering halves of 2 and 3); **10 appear only as prohibitions** in the `output` part (29–32, 36, 38–40 and the consequence halves of 2, 39); **22 are not in the prompt at all** — 12 became CQL, 5 renderer behaviour, 5 retired outright.

The decomposition predicted "11 survive as extraction rules". The prompt has 9, because clauses 2
and 3 survive only as *items on a Questionnaire* rather than as prompt text — the prompt never
names a single red flag or the ACC pathway. That is a tighter result than predicted, and it is
the reason `check` rule 13 can assert that no redirect destination appears in the prompt at all.

## 2. New rules with no v2.3.0 ancestor

Three prompt rules are not dispositions of any clause. They exist because the target
architecture has parts v2.3.0 did not.

| Rule | Why it is new |
|---|---|
| `evidence` 2 — every answer carries `status` and a verbatim `quote` | The whole basis of the validation gate and of the indicator-level benchmark. v2.3.0 had no concept of per-answer evidence; that absence is KI-01. |
| `evidence` 9 — a shared linkId is answered once | Only meaningful once more than one Questionnaire is in play (contract rule 9). |
| `redflags` — omission is expected; answer the stem, omit the qualifiers | AD-04. Needed because a model told to answer red-flag items will otherwise answer all ~78 of them, most of them `false`, which is rule 1's forbidden move at scale. |

## 3. The clause that caused the finding, and what replaced it

v2.3.0 clause 14 ended: *"Accept and note the inference in the notes field rather than marking
the element as missing."* Three failures compounded in that sentence:

1. **The model decided what counted as equivalent.** "Standard clinical shorthand that inherently implies a criteria element" is an open licence, so the boundary moved with the model version (KI-27).
2. **The inference was recorded in prose**, in a `notes` field nothing downstream read, so it could not be acted on, tested or counted.
3. **The element was then treated as met** — an inference established a criterion, which is exactly the fabrication finding (KI-01, RP-007/INT-002) and the "made information up again" finding (KI-04, DG-003).

v3.0.0 breaks all three:

1. The equivalence set is **closed, listed and versioned** (`concept-equivalence-v1.md`, three live entries), and the prompt says "this is the whole list".
2. The inference is recorded in a **typed field** (`status: inferred`) with a quote, not prose.
3. Under the default `strict` standard the engine **excludes** inferred answers from establishing a criterion and lists them in `inferredExcludedByStrictStandard` for the referrer to confirm.

The failure mode is not eliminated — a model can still mislabel an inference as `documented` —
but it is converted from silent to measurable: the benchmark scores status per indicator
(`../benchmark/ground-truth/`), and a mislabelled answer is a scored error rather than an
invisible one.

## 4. What was dropped, and the risk of dropping it

| Dropped | Risk accepted | Mitigation / owner |
|---|---|---|
| Thunderclap / worst-ever headache → possible SAH (clause 2) | A presentation the current tool redirects to ED will, under v3.0.0, be assessed against CT Head criteria instead. This is a **real behaviour change** on a safety item. | Not a prompt decision. AD-05 / KI-45: the concept has no source in the published document, so retaining it needs a governed safety addendum. **Open — review pack D1, owner Gary / NAIAEAG.** Scenario `RF-S38` pins the current behaviour so the change is visible, and the Criteria Viewer's independent copy of the same idea (KI-51) must be resolved with it, not separately. |
| Unqualified "suspected pneumothorax → ED" (clause 2) | Narrower than today: only a *large* pneumothorax with the published features fires. | The published reading (KI-46, Q2). Scenario `RF-S36`. **Open — clinical ruling.** |
| `suggested_wording` (clause 32) | Referrers lose a ready-made rewritten note, which evaluators liked. | D6, already decided. The renderer still emits "what to add" from published item text. |
| The STEP 3b consistency checks (clause 27) | None identified — they patched a failure mode that cannot occur. | — |
| `FALLBACK_INSTRUCTION_TEXT` (clause 41) | An outage in prompt loading now fails the assessment rather than silently degrading it. | Intended. Silent degradation is KI-15's failure. |
| The two doc-mode prompt variants (clauses 20/21) | A strict/inferred behaviour difference now depends on the engine parameter being passed correctly rather than on the prompt sent. | Testable as a parameter (TA-010); the existing scenario S06 already covers both readings. |

## 5. Proposed model parameters

**These are a proposal. The service owns them (slice 4b) and may not adopt them unchanged.**

| Parameter | Proposed | Reasoning |
|---|---|---|
| `max_tokens` | 8000 | The output is a QuestionnaireResponse. CT CAP + national is ~120 answerable items; a fully-answered response with evidence extensions on every answer measures ~6k tokens, and multi-bundle selection can add a second site's items. Truncation would be indistinguishable from "the note did not support it" — the most dangerous possible failure under rule 1 — so the headroom is deliberate. **The service must treat a truncated response as a gate failure, not as a sparse answer.** |
| `temperature` | omit — send no `temperature` at all | Two reasons. (a) Extraction wants determinism, but KI-28 records that newer Sonnet versions reject `temperature: 0.1` outright (400), a latent failure the current tool carries. Omitting the parameter takes the provider default and removes the failure mode. (b) Verdict determinism no longer depends on it: the engine is deterministic, and residual extraction variance is now *measured* per indicator by the benchmark rather than suppressed by a setting (KI-14). If the benchmark shows unacceptable variance, that is evidence for setting it, gathered properly. |
| `model` | **unchanged from the production setting** | Governance-controlled (CLAUDE.md). This slice proposes no model change; a change is a benchmark-gated release with an SD entry (KI-27, SR-09). |
| response format | JSON, validated by the gate | The prompt says "one JSON object, no other text". If the provider offers a structured-output mode, prefer it — but the gate still runs: provider-side schema validation cannot check that a quote appears in the note. |
| `system` vs `user` | prompt in the system slot; note, Questionnaires, exam list and context block in the user slot | Keeps the instruction/data boundary explicit, and the note — the only attacker-influenced content — furthest from the instructions (KI-33: the browser can no longer compose a request at all). |
| prompt caching | cache the system prompt and the Questionnaires; never the note | The ≈21,000-token criteria block that made caching valuable is gone, so the win is smaller; the Questionnaires are the stable bulk now. |

## 6. Open items this record does not close

| Item | Where it is tracked |
|---|---|
| Thunderclap/SAH and the Viewer's parallel safety list | AD-05, KI-45, KI-51 — review pack **D1** |
| Pneumothorax narrowing | KI-46 — review pack **D2**, Q2 |
| Whether a qualitative renal statement satisfies a numeric threshold (tension with `evidence` rule 6) | **Q7b** — literal reading encoded, contract §11 |
| Whether red flags should be exempt from the documentation standard | AD-04, **Q21** — not exempt, encoded |
| Whether "clothes loose" is definitional or a reasoning step | `concept-equivalence-v1.md` E-03 — the live question in the equivalence review |
| Clinical review of the equivalence list as a whole | `concept-equivalence-v1.md` §"Review checklist" |
