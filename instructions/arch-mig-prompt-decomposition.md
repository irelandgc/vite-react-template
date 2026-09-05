# ARCH-MIG-01 — System prompt decomposition (v2.3.0 → extraction contract + rules)

**Brief:** ARCH-MIG-01 v1.0.0 · **Phase:** 1 · **Date:** 5 September 2026 · **Status:** for review
**Sources:** `instructions/system-prompt-v2.3.0.txt` (live prompt, D1 `system_prompts` v2.3.0, activated 2026-05-24 per SD-07); client-assembled parts in `public/crr-criteria/triage/index.html` — preamble, `{{DOC_MODE_INSTRUCTION}}` (≈1660), paediatric note, `buildCriteriaBlock()` (1585), JSON output schema (≈1680–1695), `FALLBACK_INSTRUCTION_TEXT` (≈1612–1656).

**Categories:** (a) extraction instruction — survives into the extraction contract; (b) criteria logic — moves into CQL per exam/site; (c) safety / redirect logic — moves into CQL precedence or a national red-flag library; (d) output formatting — moves to the Advisory renderer; (e) judgement — retired, the engine does it.

**Headline:** of 41 clauses, 11 survive as extraction rules (mostly rewritten to split *documented* from *inferred*), 12 become CQL, 7 become precedence/redirect logic, 5 become renderer behaviour, and 6 are retired outright. The clause that caused the fabrication finding is a category (a) clause whose *effect* was category (e): "accept clinical shorthand … note the inference in the notes field" let an inference establish a criterion.

---

## 1. Clause-by-clause

| # | Location | Clause (condensed) | Cat. | Disposition in target |
|---|---|---|---|---|
| 1 | preamble (client) | "Your role is to tell the GP clearly whether their referral will proceed, is at risk, or will be declined — and exactly what to document to fix it." | (e) | **Retired.** The model's role is to fill the Questionnaire. The referrer view says this; the engine decides it. |
| 2 | STEP 0 (a) | Emergencies: thunderclap headache → SAH; cauda equina; testicular torsion; ruptured AAA; massive haemoptysis; pneumothorax → ED/111; set verdict declined and stop | (c) | **National red-flag library** (`CRR_RedFlags.cql`): indicators `redflag.*` extracted with quotes; `Determination` precedence evaluates red flags before any exam library (TA-011, TA-013). The list is criteria content — each entry cites the PDF row it comes from ("Refer for acute assessment without initial imaging", e.g. CT Chest p12). |
| 3 | STEP 0 (b) | Recent trauma mechanism as primary cause → ACC, not CRR | (c) | Indicator `funding.accTrauma` (documented, quote); precedence redirect `ACC_PATHWAY` before criteria (TA-012). |
| 4 | STEP 0 (c) | "Wrong pathway": presentations clearly requiring specialist assessment before imaging | (e) | **Retired as a model judgement.** Where the criteria say it (e.g. "Presentation requiring urgent admission or urgent secondary care assessment", CT CAP p11) it is a redirect indicator; where they don't, the tool must not invent it (KI-12). |
| 5 | STEP 0 | "Step 0 is the only place a redirect can set the verdict to declined; after that, severity concerns go to notes" | (c) | Encoded as fixed precedence in `Determination`; no free-text severity notes. |
| 6 | STEP 1 | Identify ALL matching pathways; do not stop at first | (e) | Engine evaluates every pathway define unconditionally (rule trace shows all). |
| 7 | STEP 1 | `?TIA`-style differential markers are the GP raising a possibility, not an assertion | (a) | **Contract rule:** a `?`-prefixed or "query" condition never answers a condition-present indicator as `documented`; it may answer an exam-selection hint. |
| 8 | STEP 1 | Same condition under multiple entries → identify all | (e) | Engine; multi-bundle evaluation (gap analysis §4). |
| 9 | STEP 1 | Gender-specific pathway filtering | (b) | `patient.sex` indicator; sex conditions in CQL (`Is Male`/`Is Female`). |
| 10 | STEP 1 | General vs specific variant pathways are independent | (b) | Separate defines composed with `or` (CT CAP B1/B2/B3 pattern). |
| 11 | STEP 2 | Numeric thresholds are strict minimums ("3-6 months means ≥3"; "2 or more" means ≥2; Wells ≥2) | (b) | CQL comparisons per site (`> 5.0`, `in Interval[3.0, 6.0]`, `>= 2`). Boundary readings are REVIEW questions (Q4, Q7). |
| 12 | STEP 2 | Epidemiological modifiers ("especially aged 50+") are not thresholds | (b) | Transcription rule: modifiers are not conditions; recorded in the transcription guide; per-site scenario (KI-05). |
| 13 | STEP 2 | Qualitative lab terms accepted ("Hb mildly low" meets "low Hb"); numeric thresholds still require a value | (a)+(b) | (a) contract: qualitative abnormal statements answer boolean flags as `documented`; (b) numeric-threshold criteria use value indicators (`lab.*.value`) — the split is per indicator type, decided at transcription. |
| 14 | STEP 2 | Clinical shorthand equivalence ("progressive headache" satisfies "change in pattern with progressive increase"; "post-menopausal" satisfies ">12 months amenorrhoea"); "accept and note the inference in the notes field rather than marking missing" | (a) → root cause | **Rewritten.** Same-concept rephrasings are `documented`; definitional equivalences (post-menopausal) are `documented` with the quote; anything requiring reasoning is `inferred`. The "note the inference" instruction is replaced by the status field; strict mode then excludes it (S06). |
| 15 | STEP 2 | Compound criteria: decompose and evaluate each sub-element | (b) | Questionnaire indicators + CQL composition; the model never evaluates compounds. |
| 16 | STEP 2 | Temporal ambiguity: flag rather than assume | (a) | **Contract rule 5:** omit the value ("a few months" → no `periodMonths`); the engine's null → INSUFFICIENT lists it (TA-014). |
| 17 | STEP 2 | Gateways are mandatory within their pathway only | (b) | Gateway indicators (`advice.*`, BPAC tool completion) sit inside their pathway's define (KI-07). |
| 18 | STEP 2 | Lab requirements table (CT CAP: ALP/GGT/ALT/bilirubin; CTC: Hb/ferritin; DVT: Wells/D-dimer; renal: eGFR; pelvis: Ca-125 ≥35; post-abortion hCG; thyroid TSH; KUB: creatinine >160 / eGFR <45 → admit) | (b)+(c) | Each row is a per-site indicator set and CQL condition; the KUB "admit" row is a redirect. The table itself is retired — it is regenerated from the bundles. Note: the CT CAP row in the prompt (ALP/GGT/ALT/bilirubin) does not match the published CT CAP criteria (CRP/Hb/Ca/platelets/ALP/albumin) — a prompt-vs-criteria drift the migration removes. |
| 19 | STEP 2 | "When a required lab result is not documented, include a specific add_to_note item" | (d) | Renderer: `missingInformation` linkIds → published item text. |
| 20 | `{{DOC_MODE_INSTRUCTION}}` strict | Only count information explicitly stated; "No AF" does not imply not anticoagulated; age and sex must be explicit | (a) | Contract: default extraction is literal; status `documented` requires the fact to be stated. Age/sex from calling app or explicit text (TA-005). |
| 21 | `{{DOC_MODE_INSTRUCTION}}` inferred | Reasonable clinical inferences allowed where obvious to any clinician | (a) | Contract: the model *always* extracts inferences, labelled `inferred`; whether they count is the engine parameter `Documentation Standard` (TA-010). The two prompts collapse into one. |
| 22 | STEP 3 (a) | Any fully-met pathway → proceeds; highest priority wins (P1 > Acute 48hr > P2 > P3 > P4) | (e) | Engine `Determination` + priority ordering across pathways/bundles. |
| 23 | STEP 3 | "One met pathway = proceeds; do not downgrade for other pathways' gaps, severity, redirects, or specific variants" (+ four worked examples) | (e) | Engine; the examples become per-site scenarios (CT Head focal neuro vs TIA gateway; US Abdomen hepatomegaly vs HCC; US Pelvis PMB vs MHT; renal deterioration). |
| 24 | STEP 3 (b)/(c) | at_risk if partially met; declined if nothing matches | (e) | `INSUFFICIENT_INFORMATION` (null) vs `CRITERIA_NOT_MET` (false) — a sharper distinction than at_risk/declined (S03 vs S04). |
| 25 | STEP 3 | Advisory notes for non-deciding pathways | (d) | Rule trace shows every pathway; renderer may list "other pathways considered". |
| 26 | STEP 3 | Conflicting dispositions → report all, apply highest accepting | (e) | Engine precedence; both dispositions appear in the trace. |
| 27 | STEP 3b CHECK 1–5 | Verdict consistency checks (notes vs verdict; met_criteria vs verdict; missing only from deciding pathway; late redirects; priority set implies met) | (e) | **Retired entirely.** They exist because the model was computing the verdict; the engine cannot be inconsistent with itself. |
| 28 | STEP 4 | Not-funded vs redirected distinction | (c)+(d) | Separate determinations `NOT_ROUTINELY_FUNDED` / `ALTERNATIVE_MANAGEMENT`; renderer wording from PlanDefinition rows. |
| 29 | STEP 4 | `met_criteria` always populated, even when declined | (d) | Rule trace lists every true define; renderer shows "documented and met". |
| 30 | STEP 4 | `missing_criteria`: specific elements only; no modifiers; no gender-inapplicable; only from deciding pathway | (d) | `missingInformation` is computed per pathway relevance (B2 labs only when B1 not met). |
| 31 | STEP 4 | `add_to_note`: specific sentences | (d) | Renderer template: linkId → "Document: <published item text>" (kept per D6 as advisory). |
| 32 | STEP 4 | `suggested_wording`: complete rewritten note | (e) | **Dropped (D6).** Generated clinical prose is the highest fabrication surface. |
| 33 | STEP 4 | `[pXX]` page references in met/missing | (d) | `source-page` on PlanDefinition actions; renderer attaches them. |
| 34 | client | Paediatric note: "use ONLY the paediatric criteria below" | (b) | `Is Adult` define; bundle routing by age band. |
| 35 | client | CRITERIA block (all sites serialised) | — | **Retired.** No criteria text in the prompt; the model receives the Questionnaire(s) for the selected exam/site(s). |
| 36 | JSON schema | `interpreted_note` (model's corrected version of the note) | (e) | **Retired** (KI-10). The note is never rewritten; the PII-redacted note is the record. |
| 37 | JSON schema | `exam`, `modality` | (a) | Exam/site selection output: list of candidate exam/site ids from the published list, each with a quote (TA-002, TA-006). |
| 38 | JSON schema | `verdict`, `verdict_title`, `verdict_summary`, `priority`, `criteria_page`, `not_funded_flag` | (e)/(d) | Engine + renderer. |
| 39 | JSON schema | `safety_alert`, `redirect` | (c) | Red-flag / redirect indicators + precedence. |
| 40 | JSON schema | `notes` (free text) | (e) | **Retired** (KI-12). |
| 41 | FALLBACK_INSTRUCTION_TEXT (client) | Hard-coded copy of an older rule set used if `/api/system-prompt` fails | — | **Retired.** No silent fallback: extraction service fails visibly if the prompt version cannot be loaded (same principle as bundles). |

## 2. The extraction prompt that survives (draft skeleton)

Roughly 20 % of the current prompt's length. Structure:

1. Role: fill the Questionnaire for the given exam/site(s) from the note; produce nothing else.
2. Evidence rules (contract rules 1–8 from `extraction-contract.md`): answer only what the note supports; status per answer; verbatim quote; calculations and interpretations are `inferred`; temporal ambiguity → omit; negation is `documented`; `?` markers are not assertions; do not answer age/sex if supplied.
3. Concept-equivalence guidance (from clause 14, rewritten): a short, reviewed list of definitional equivalences that count as `documented` (post-menopausal; progressive = increasing) — clinically owned, versioned with the prompt.
4. Exam/site selection: choose from the supplied published list; multiple allowed; quote the basis.
5. Red-flag indicators: answer the national `redflag.*` items from the note (quote).
6. Output: QuestionnaireResponse JSON only.

Everything else in v2.3.0 is either in the bundle or in the engine.

## 3. Things the decomposition surfaced that were not in the brief

- **Prompt–criteria drift:** the prompt's CT CAP lab list (ALP/GGT/ALT/bilirubin) is not the published CT CAP list (CRP, Hb, calcium, platelets, ALP, albumin) — it looks like the biliary US Abdomen row. Under the current architecture that drift is invisible; under the target it cannot occur because there is no prompt copy of criteria.
- **Two doc-mode prompts become one:** the model always labels; the engine decides what counts. That halves the regression matrix (no strict/inferred prompt pairs) and makes TA-010 a parameter with a test.
- **Cross-exam recommendation is real product behaviour** (MW-009, INT-001, RP-007) and needs the multi-bundle layer, not a prompt clause. Designed in the gap analysis §4.
- **The worked examples in STEP 3 are a scenario list**: CT Head (focal neuro vs TIA gateway), US Abdomen (hepatomegaly vs HCC surveillance), US Pelvis (PMB vs MHT variant), renal deterioration. They should be the first scenarios written for those sites.
