# TA-PROMPT-01 Phase 0 — System Prompt v2.3.0 Provenance Audit

**Brief:** TA-PROMPT-01 v1.0.0 (DESIGN ONLY)
**Date:** 7 July 2026
**Status:** STOP — awaiting review. No design, no prompt versions created, nothing written to D1/KV, nothing deployed.

---

## 0. Scope, sources, and verification notes

**What was audited.** The active production system prompt v2.3.0 — both the D1-versioned `instruction_text` and the code-assembled parts of the full prompt (`buildSystemPrompt()`: preamble, `{{DOC_MODE_INSTRUCTION}}` injection, paediatric note, criteria block header, JSON output schema), since the model sees all of them as one prompt. Read-only throughout.

**Deployed-text verification.** Fetched the active prompt from the production API worker (`GET https://crr-criteria-api…workers.dev/api/system-prompt`, read-only): version 2.3.0, label "Verdict consistency check + general-vs-specific pathway rule + clinical severity override fix", created 2026-05-24. The `instruction_text` is **byte-identical** to the repo copy `instructions/system-prompt-v2.3.0.txt`. All row references below cite the repo copy's line numbers.

**Sources.**

| Source | Used for |
|---|---|
| `instructions/system-prompt-v2.3.0.txt` + live D1 copy | The audited text |
| `instructions/Prompt-Dev-Done/system-prompt-v2.{0,1,2}.0.txt` (diffed pairwise) | Exact version-of-introduction per clause |
| `documents/Triage_Clinical_Review_Brief.md` §4 | Verbatim v1.0-era prompt (= today's `FALLBACK_INSTRUCTION_TEXT`) |
| `documents/CRR_Test_Case_Results_Matrix_REG02.xlsx` (4 sheets extracted) | Evaluator findings verbatim: RP/LP/CR/DG/MW/CB/INT/EQ cases; DG case texts; Structured Re-Eval expected values (30 cases) |
| `scripts/reg02-results.json` (run 2026-06-22) | Current pass/fail state per case, v2.2.0 vs v2.3.0 raw on Sonnet 4.6, fabrication auto-flags |
| Prompt test-result docs v1.1.0 → v2.3.0 (`instructions/` + `Prompt-Dev-Done/`) | Finding → fix → regression chains |
| `instructions/claude-code-brief-post-processing-validation.md` | Client-side override (interacts with Step 3b) |
| `instructions/ta-src-phase0-findings.md`, `instructions/ta-src-design.md` | Post-switch statuses |
| `instructions/compound-criteria-design.md` §4.1 | Compound serialisation contract |
| `instructions.complete/claude-code-brief-TA-009-system-prompt-versioning.md` | Versioning machinery |
| `public/crr-criteria/triage/index.html` | `buildSystemPrompt()`, `FALLBACK_INSTRUCTION_TEXT`, `detectPaediatric()`, `postProcessingValidation` context |

**Provenance from operator memory (flagged per instruction at review, 7 Jul 2026):** **SP-01** = the Step 0 redirect/exclusion logic (emergency/ACC/compound); **SP-02** = temporal ambiguity flagging (TA-014). Neither has a repo artefact — these origins were supplied by Gary from memory and are marked `[op-mem]` in the table. **Process gap:** SP-01 and SP-02 should have had findings documents at the time, the way CC-DESIGN-01 and TA-SRC-01 now do. Recommend a one-page retro-findings note for each be written and committed, so the next audit doesn't depend on memory.

**Regression-suite state (matters for every "Protected by" cell).** The current suite is the REG02 30-case set (Structured Re-Eval sheet). The REG02 run (22 Jun) completed **configs A (v2.2.0 raw) and B (v2.3.0 raw) only — config C (override ON) never ran**, the spreadsheet copy was never populated, and no summary markdown was written. Consequences used below:
- "Protected" status is judged against config B (v2.3.0 raw, Sonnet 4.6, 3 runs/case) plus the Re-Eval expected values.
- The override's actual contribution remains **unmeasured** (the C2-vs-C3 delta the REG02 brief was designed to produce does not exist).
- **The TEST-001…TEST-007 synthetic cases were dropped from the 30-case suite.** Several instructions whose only protection was a TEST case are now unprotected — flagged per row and collected in §5.
- Two Re-Eval expected values **flip the sign of v2.3.0 changes**: LP-003 expected is now `at_risk` (Louise's own rating — she deliberately submitted a weak referral), so v2.3.0's proceeds-3/3 is now a *fail* even though it was scored an *improvement* in the June test; LP-004 expected is now `at_risk`, so v2.3.0's at_risk-3/3 (scored a *regression* in June) is now a *pass*. See row 10 and §6.2.

REG02 config-B failures for reference: DG-001 (proceeds 3/3, expected declined — fabrication case), DG-004 (at_risk, expected declined), LP-003 (proceeds, expected at_risk), RP-007/INT-002 (proceeds, expected at_risk), INT-001 (at_risk, expected declined+redirect), MW-008 (at_risk, expected proceeds-adult), RP-004 (proceeds — REVIEW borderline per Rhys), DG-005 (declined/declined/at_risk — unstable, and the expected "flag the contradiction" behaviour is ungraded), INT-AKI (proceeds/declined/proceeds — unstable, REVIEW pending clinical input), CR-002 (proceeds/proceeds/at_risk — unstable).

---

## 1. Traceability table

One row per distinct behavioural clause. **Location** = line(s) in `system-prompt-v2.3.0.txt` unless marked *(code)* = assembled in `buildSystemPrompt()` (triage/index.html:1687–1725). **Origin** names the finding/case that created the clause and the prompt version that introduced it. **Protected by** = regression case(s) that would catch its removal, with current REG02-B status (✓ passing / ✗ failing / ~ unstable / REVIEW). **Post-switch** = status once TA-SRC-01 lands (UNCHANGED / PARTIALLY REDUNDANT / REDUNDANT / WRONG).

### Step 0 — redirect and exclusion (lines 1–22)

| # | Instruction | Origin | Protected by | Post-switch | Interactions |
|---|---|---|---|---|---|
| 1 | Step 0 gate: scan before any criteria assessment; if redirect/emergency applies → verdict `declined`, STOP, even if note has CRR-eligible elements (L4–6) | **SP-01** `[op-mem]`, v1.0.0; carried into v2.0.0 Step structure | INT-SAH ✓ (declined 3/3), INT-TORSION ✓, LP-002 ✓ | UNCHANGED — data-independent rule | Rows 5, 21 (the only decline-after-criteria exception); client override deliberately preserves Step-0-pattern redirects by regex ("111", "ED", "ACC"…) — **prompt wording and client regex are coupled**: rewording Step 0 language can break override preservation |
| 2 | (a) Emergency list: thunderclap/SAH, cauda equina, testicular torsion, ruptured AAA, massive haemoptysis, pneumothorax (L8–14) | **SP-01** `[op-mem]`, v1.0.0 | SAH: INT-SAH ✓. Torsion: INT-TORSION ✓. **Cauda equina, AAA, haemoptysis, pneumothorax: UNPROTECTED** | UNCHANGED as text; note published data carries `alternativeManagement` on 47/53 sites (vs 24/39) — hardcoded list increasingly duplicates per-site REDIRECT lines; overlap unaudited | Rows 1, 25; criteria-block REDIRECT lines |
| 3 | (b) Funding redirect: recent trauma mechanism → ACC (L16–17) | **SP-01** `[op-mem]`, v1.0.0; validated by LP-002 (Louise, explicit-mechanism case) | LP-002 ✓ — but LP-002 is the *easy* case (mechanism explicitly stated). **No case tests implicit/buried trauma**; Michaela's overall finding: "Correctly flag cases for ED or ACC — **ED yes — ACC no**" (email 1 Jun 2026, in REG02 sheet) | UNCHANGED | Gap G1 (§3); Step 4 NOT-FUNDED vs REDIRECTED (row 25) |
| 4 | (c) Wrong pathway: needs specialist before imaging, none involved (L19–20) | **SP-01** `[op-mem]`, v1.0.0 | **UNPROTECTED** — no case targets it; nearest is CB-001 (✓ on verdict, but Campbell's actual concern — advice defaulting to admission — is ungraded) | UNCHANGED | Vague clause; historically the vehicle for severity-based declines (RP-006 v2.2.0 regression reasoned this way); in tension with row 5 |
| 5 | "STEP 0 IS THE ONLY PLACE where a redirect or safety concern can set verdict to declined"; post-Step-0 severity → advisory notes only; tool assesses criteria as written (L22) | RP-006 v2.2.0 regression (eGFR-3 AKI declined as "requires admission") + TEST-005 same pattern; **v2.3.0** ("clinical severity override fix") | RP-006 ✓ (proceeds 3/3), INT-AKI ~ (2/3, REVIEW — the criteria themselves conflict; working-group question pending per Rhys) | UNCHANGED as logic. Category-B caution: us_renal/ct_kub territory rewritten in v4.1.0 — the AKI ground truth may shift | Rows 4, 21, 24; Step 3b CHECK 4; safety_alert field (RP-006 v2.3.0 correctly adds 111 advisory while proceeding) |

### Step 1 — pathway identification (lines 24–35)

| # | Instruction | Origin | Protected by | Post-switch | Interactions |
|---|---|---|---|---|---|
| 6 | Identify EVERY matching pathway; don't stop at first match (L25–27) | RP-002/RP-003 (gateway overrode independently-met pathway; Rhys, Significant); v1.1.0 rules 7a/7b → **v2.0.0** Step structure | RP-002 ✓, RP-003 ✓, TEST-003/TEST-004 (dropped from suite) | UNCHANGED | Rows 17, 20–22 |
| 7 | Differential markers: ?TIA/?SOL/?SUFE = possibility raised, not pathway invocation; also identify simpler pathways (L29) | RP-003 (Rhys: "?TIA … seems to have overridden this"); v1.1.0 rule 7b → v2.0.0; worked example trimmed in v2.3.0 | RP-003 ✓ | UNCHANGED | Row 22 TIA example |
| 8 | Same condition, multiple entries with different priorities/dispositions → identify ALL (L31) | RP-006 (Rhys: "accepted and a declined option for AKI … didn't seem to recognise"); v1.1.0 rule 7c → v2.0.0; example text trimmed in v2.3.0 | RP-006 ✓ / INT-AKI ~ REVIEW | UNCHANGED | Row 24 |
| 9 | Gender-specific pathway filtering: gender-restricted criteria only for that gender; don't list inapplicable ones (L33) | CR-003 (female haematuria declined against male-only criteria); **v2.1.0**; worked example trimmed in v2.3.0 | CR-003 ✓ (proceeds 3/3 on Sonnet 4.6; the 2 Jun v2.3.0-on-4.6 run had regressed it by demanding explicit sex for "lady" — resolved in REG02-B) | UNCHANGED | DOC_MODE strict "Age and sex must be explicitly stated" (row 19) is the clause the CR-003 regression rode in on; client override Check 2 duplicates this filtering |
| 10 | General vs specific variants: independent pathways; general can be fully met while specific variant unmet (L35) | LP-003 (PMB on HRT held at_risk pending MHT details); **v2.3.0** | LP-003 — **but the protection is inverted**: Re-Eval expected is now `at_risk` (Louise's own rating of her deliberately weak referral), and v2.3.0-B returns proceeds 3/3 = ✗ | UNCHANGED as logic | **Clinical re-examination needed**: the rule was added to make LP-003 proceed; the re-evaluated ground truth now says at_risk was right. Either the expected value or the rule is wrong — a v3 design input, not resolvable here |

### Step 2 — interpretation rules (lines 37–79)

| # | Instruction | Origin | Protected by | Post-switch | Interactions |
|---|---|---|---|---|---|
| 11 | Numeric thresholds are strict minimums; never round up (L44–49) | v1.0.0 instruction 0. Specific originating finding **UNKNOWN** — predates the QA-review record (pre-evaluator internal testing era); TEST-007 was later *authored to protect it* | **UNPROTECTED as of REG02** — TEST-007 dropped from the 30-case suite. TEST-001 (4 months meets 3–6) also dropped | UNCHANGED | Row 12 is its exception. **The v1.x explicit precedence declaration ("THIS OVERRIDES 0 AND 1b") was lost in the v2.0.0 rewrite** — in v2.3.0 the exception is scoped purely by adjacency, the exact "scoped by position rather than intent" problem named in the brief |
| 12 | Epidemiological modifiers ("especially", "particularly"…) are NOT thresholds; hard requirement only for unqualified language (L51) | RP-000 (Rhys, Wrong: 45yo declined against "especially aged 50+"; fixed v1.0.0 as rule 1c) | RP-000 ✓ (proceeds 3/3) | UNCHANGED | Row 11; v2.3.0 trimmed the "Particularly in smokers"/"postmenopausal" worked examples that v2.2.0 carried |
| 13 | Qualitative criteria matching: accept qualitative descriptions ("Hb mildly low" meets "low Hb"); numeric only where criteria specify a number (L53) | RP-001 (Rhys, Minor: tool demanded numeric Hb); v1.1.0 rule 1d → v2.0.0 | RP-001 ✓ (at_risk 3/3, correctly still requiring 2nd abnormal blood) | UNCHANGED | Row 18; v2.2.0-INFER run showed inferred mode paradoxically *demanding more* numbers on TEST-001 — mode interaction untested on v2.3.0 |
| 14 | Clinical shorthand equivalence: "progressive headache" = pattern change; "post-menopausal" = >12mo amenorrhoea; note the inference in notes (L55–60) | RP-004 (v1.1.0 rule 1e "progressive"); "postmenopausal" added **v2.2.0** for LP-003; IUD shorthand cited in v2.2.0 changelog for LP-004 | RP-004 REVIEW (Rhys: "progressive is enough" — criteria-wording ambiguity, not tool error); LP-003 ✗ (see row 10) | UNCHANGED | **This rule instructs the model to accept-and-note inferences — the legitimised-inference pathway §2 identifies as one root of fabrication.** Also in tension with DOC_MODE strict (row 19): "do not infer" vs "accept shorthand inference" is unreconciled in the text |
| 15 | Compound criteria: decompose AND/OR logic, evaluate each sub-element, report each missing sub-element (L62) | v1.0.0 instruction 1 (headache compound decomposition, RP-000/RP-004 era). The CT-Head worked example survives only in `FALLBACK_INSTRUCTION_TEXT`; v2.x carries the rule without the example | Indirectly by every multi-element case (RP-000 ✓, RP-001 ✓, DG-002 ✓) | **PARTIALLY REDUNDANT — but not at switch time.** CC-DESIGN-01 §4.1 blocks make decomposition explicit in the data, but zero published items carry `logic` at cutover (ta-src Phase 0 §3); redundancy arrives progressively as CC migration tiers land. Retire-by-stages, not at v3 launch | §4.1 serialisation; row 29 (missing sub-element reporting feeds suggested_wording) |
| 16 | Temporal ambiguity: flag rather than assume; flag in missing_criteria when timing is the crux (L64) | **SP-02 = TA-014** `[op-mem]`, v1.0.0 | **UNPROTECTED** — no current case hinges on it (MW-001 duration-unclear is adjacent but graded on verdict only). v2.3.0 silently trimmed the "one week resolved" worked examples v2.2.0 carried — drift already happening unprotected | UNCHANGED | DOC_MODE (timing inference in inferred mode untested); DG-005 contradiction flagging is the same "flag, don't resolve" family (gap G4) |
| 17 | Gateways mandatory within their pathway ONLY; unmet gateway doesn't block other pathways (L66) | RP-002/RP-003/TEST-003/TEST-004 chain (v1.1.0 rule 7a → v2.0.0 → strengthened v2.2.0). Counterweight to the v1.x TIA-gateway rule 1a (1a itself did not survive into v2.x as a standalone; TIA gateway now appears only in row 22's example) | RP-002 ✓, RP-003 ✓ (TEST-003/004 dropped) | UNCHANGED as logic; **the gateway examples are data-coupled** — see row 22 | Rows 6, 21, 22 |
| 18 | Lab results/test scores checklist per exam (ALP/GGT, Hb/ferritin, Wells/D-dimer, eGFR, Ca-125 ≥35, HCG >1000, TSH, CT KUB creatinine>160/eGFR<45→admit) (L68–77) | v1.0.0 instruction 2. Originating finding **UNKNOWN** — reads as a design-time distillation of the criteria PDF, no evaluator case traces to its creation | CB-002 ✓ partially (ALP path); otherwise **UNPROTECTED**. Campbell's usability finding (don't require referrer to state ULN) is OPEN | **VERIFY REQUIRED / RISK OF WRONG**: hardcoded thresholds duplicate criteria content that v4.1.0 rewrote — CT KUB acute group is wholly unmapped (all `kub_acute_*` rewritten), us_pelvis acute groups rewritten. Any clause here that disagrees with v4.1.0 text post-switch is a live contradiction inside one prompt | Row 5 (KUB admit threshold is a severity-decline rule outside Step 0!); criteria block content |
| 19 | `{{DOC_MODE_INSTRUCTION}}` — STRICT (default): only count explicitly stated; age/sex must be explicit. INFERRED: reasonable clinical inferences allowed *(placeholder L79; texts in code, triage/index.html:1689–1691)* | TA-010 requirement; strict/inferred framing put to clinical review May 2026 (Triage_Clinical_Review_Brief §5 — default question **never answered in any repo artefact**) | v2.2.0 STRICT-vs-INFER comparison run only (4/20 verdicts differ). **No inferred-mode run exists for v2.3.0**; REG02 all-strict. UNPROTECTED in inferred mode | UNCHANGED | Strict's "age and sex must be explicitly stated" collided with row 9 (CR-003 'lady' regression). Strict "do NOT infer" vs row 14 "accept shorthand inference" — unresolved precedence, currently settled by model judgement, not text. Phase 1 item 5 (TA-010) must make this boundary clean |

### Step 3 / 3b — verdict (lines 81–121)

| # | Instruction | Origin | Protected by | Post-switch | Interactions |
|---|---|---|---|---|---|
| 20 | (a) Any pathway fully met → MEETS CRITERIA at that pathway's priority; multiple met → highest priority (P1 > Acute 48hr > P2 > P3 > P4) (L86) | v2.0.0 structure; priority-ordering from RP-006 (P1/P2 conflict) | Broad: every proceeds case | UNCHANGED (priority ladder omits Acute 24hr and S1–S3, which the JSON enum allows — latent incoherence, minor) | Rows 21, 24 |
| 21 | CRITICAL — ONE MET PATHWAY = PROCEEDS; never downgrade after Step 0 for: other pathways' gateways, severity, redirect suggestions, specific-variant gaps (L88–92) | v2.1.0 (LP-003-shaped rule) + **v2.3.0** expansion adding severity/redirect bullets (RP-006, TEST-005) | RP-002 ✓, RP-006 ✓, TEST-004 (dropped) | UNCHANGED | The load-bearing verdict rule. Client override Check 1/Check 3/Check 4 are its deterministic shadow (unmeasured, §6.3); Step 3b re-states it |
| 22 | Concrete examples: focal-neuro vs TIA gateway (BPAC), hepatomegaly vs HCC, PMB general vs MHT, AKI severity (L94–98) | v2.2.0 (RP-002, RP-003, TEST-003, LP-003); AKI example added **v2.3.0** (RP-006) | Same cases as rows 17/21 | **WRONG (partially) post-switch**: the TIA example asserts the gateway is "BPAC tool" — v4.1.0 restructured the TIA gateway conditions (old `cth_a1` "BPAC TIA tool… OR unable to access rapid specialist care" → new `cth_a48_1` "no high-risk features *1 and assessed as suitable…"; ta-src Phase 0 §2). Hepatomegaly/PMB wording also revised. Examples citing superseded criteria text inside the same prompt as the new criteria block = internal contradiction | Rows 7, 17, 21; §4.1 (structured blocks may eventually replace worked examples wholesale) |
| 23 | (b) partial → at_risk with what's missing; (c) no match → declined (L100–102) | v2.0.0 | Broad (LP-004 ✓, CB-001 ✓, MW-001 ✓) | UNCHANGED | Row 29 (at_risk/declined triggers suggested_wording generation — the fabrication surface) |
| 24 | Advisory notes for non-deciding pathways in notes, never in missing_criteria; conflicting dispositions all reported, highest accepting pathway wins (L104–106) | RP-006 (rule 7c lineage); tightened v2.1.0→v2.3.0 | RP-006 ✓ / INT-AKI ~ REVIEW | UNCHANGED | Step 3b CHECK 3; DG-004 (Danielle: notes/missing/wording duplication — UX fixed, text rule unchanged) |
| 24b | **Step 3b — verdict consistency self-check, CHECKs 1–5** (L109–121): notes-say-met→proceeds; met-with-no-missing→proceeds; missing only from deciding pathway; post-Step-0 redirect can't change verdict; priority-set-but-not-proceeds→re-examine | Stochastic verdict/reasoning contradictions: TEST-004 (notes said "fully met", verdict at_risk), RP-002 stochastic misses, CR-003; **v2.3.0**. Same finding class independently spawned the client-side `postProcessingValidation()` (brief 1 Jun 2026) | TEST-004 dropped; RP-002 ✓ indirectly. CHECK 5 has no case. Effectively **thinly protected** | UNCHANGED | **Duplicates the client override checks 1–4 almost clause-for-clause** (belt-and-braces by design, but the braces' contribution was never measured — REG02 config C unrun). CHECK 3 ("missing_criteria must be empty if proceeds") leaves no slot for DG-005-style contradiction flags on a proceeds verdict (gap G4) |

### Step 4 — output contract (lines 123–137)

| # | Instruction | Origin | Protected by | Post-switch | Interactions |
|---|---|---|---|---|---|
| 25 | NOT-FUNDED vs REDIRECTED distinction (L127) | v1.0.0 instruction 4. Originating finding **UNKNOWN** | **UNPROTECTED** (MW-006 TOP-redirect was the natural case; not in the 30-case suite) | UNCHANGED; published data has richer `notFundedDetail`/`alternativeManagement` coverage — overlap unaudited | `not_funded_flag` in schema; Viewer not-funded display rules |
| 26 | met_criteria: ALWAYS populate, even when declined; list every documented sub-element (L129) | v1.0.0 instruction 8. Originating finding **UNKNOWN** (predates the QA record; the fuller v1.x text explains intent: "The GP needs to see what they got right") | **UNPROTECTED** — no grader checks met_criteria population or grounding | UNCHANGED | **Fabrication-implicated** (§2): population pressure with no grounding requirement. The v1.x tail — "Never return an empty met_criteria array without explicitly checking each criterion sub-element" — pushes the model to *find* met items |
| 27 | missing_criteria: specific elements only; no epi modifiers, no gender-inapplicable, no non-deciding-pathway elements (L131) | Accreted: v1.0.0 core + v2.1.0 (gender, CR-003) + v2.1.0/v2.3.0 (non-deciding, RP-002/LP-003) | RP-000 ✓, CR-003 ✓ | UNCHANGED | Step 3b CHECK 3 |
| 28 | add_to_note: specific sentences only, not generic advice (L133) | v1.0.0 instruction 6. Originating finding **UNKNOWN** | **UNPROTECTED** | UNCHANGED | Fabrication-adjacent: DG-002 (Danielle: "prompting you to add something that may not apply … if they add it (even if it is not true) will get it accepted") |
| 29 | **suggested_wording: "Complete finished note with all required sub-elements explicitly documented"** (L135) | v1.0.0 instruction 5. Originating finding **UNKNOWN** — a design-era contract, never revisited despite being the subject of the most serious evaluator findings | Fabrication is a first-class REG02 column, but auto-flags are mostly REVIEW (ungraded pending Gary) — **effectively UNPROTECTED as a pass/fail gate** | UNCHANGED by the switch — the mechanism is architectural, not data | **The fabrication engine — see §2.** DG-002, DG-003 directly; DG-004 records the evaluator-preferred alternative |
| 30 | Page references [pXX] from the National Criteria (April 2026 reissue) in met/missing (L137) | v1.0.0 instruction 9. Design-era (auditability); no finding | None (REG02 treats page-only diffs as noise) | **Currently WRONG, FIXED by the switch**: production block today carries superseded-edition page numbers while the instruction claims the April 2026 reissue (ta-src-design §5.1 latent-defect note); TA-SRC-01 backfills v2.0 pages. Instruction itself carries forward UNCHANGED | `criteria_page` schema field; TA-SRC-01 decision 1 |

### Code-assembled prompt parts (not in D1 `instruction_text`)

| # | Part | Origin | Protected by | Post-switch | Interactions |
|---|---|---|---|---|---|
| 31 | Preamble: "…tell the GP clearly whether their referral will proceed… and exactly what to document to fix it" (index.html:1699) | v1.0.0 design | **UNPROTECTED** | UNCHANGED | Frames the *referrer* as the only audience (triagers are actual users — DG evaluator is a triager); "exactly what to document to fix it" primes the wording-generation behaviour §2 dissects. Role-aware variants are a named non-goal for v3, but the preamble is where they'd land |
| 32 | Paediatric note: "This patient is PAEDIATRIC. Use ONLY the paediatric criteria below." gated by `detectPaediatric()` (index.html:1703, 967–979) | RP-005/CR-002 (paed cases initially declined as not-funded; "FIXED (paed detection)") | RP-005 ✓ (but fabrication auto-flag YES 3/3 — needs review); CR-002 ~ (2/3) | Paed criteria set switches `paed_index` → `paedExams` (8 new paed sites become visible; paed block +143% tokens) | MW-008 (Sonnet 4 assessed a 24-year-old as paediatric): note contains "(age 12.5)" for menarche — `detectPaediatric()` pattern `/\baged?\s+([0-9]|1[0-5])\b/` **matches "age 12.5"** (hypothesis, verifiable in 5 min) → the misclassification may be client-side, not model. REG02 forced adult for all 30 cases, so the suite does not test the detection path at all |
| 33 | Criteria block + header "(April 2026 reissue)" (index.html:1704) | TA-SRC-01 territory | TA-REG-01 baseline (pending) | The switch itself. Header claim becomes true (it is currently false — block is v-old data) | Everything |
| 34 | JSON output schema incl. `suggested_wording`, `criteria_page`, `safety_alert`, `redirect`, `notes` (index.html:1706–1724) | v1.0.0 design | Parse-success implicitly (REG02 parseSuccess true throughout) | UNCHANGED | v3 non-goal "no schema change **unless a mapped behaviour requires it**" — flag now: every §2 remedy candidate short of pure prose-tweaking touches this schema (new fields or changed field semantics). Expect to trip this non-goal loudly in Phase 1 |
| 35 | `FALLBACK_INSTRUCTION_TEXT` (index.html:1640–1685) — verbatim v1.0.0-era instructions, used silently if the prompt fetch fails | TA-009 rollout kept a hardcoded fallback | Nothing tests the fallback path | See §4.2 — flagged for retirement/fail-closed alignment | Three major versions stale (no Step 3b, no gender filtering, no general-vs-specific, retains dead 1a TIA gateway); silently substitutable for the active prompt — the exact silent-fallback class TA-SRC-01 decision 5 forbids for criteria data |

---

## 2. Fabrication architecture analysis (DG-001/002/003/005, RP-007/INT-002)

**The case texts (verbatim from the suite):**

- **DG-001** — note: `21y man, headche, known hx of met mel.` → AI met_criteria included **"cognitive impairment"**; verdict proceeds. Danielle: "the referral doesn't state anything about cognitive impairment, it is a headache referral."
- **DG-002** — note: `64y girl with 2/12 headche, differentn to usual headache, not responding to meds` → suggested wording asserted **"progressively worsening"**. Danielle: "I did not state that the patient's symptoms were progressively worsening — this has been made up by the AI… if they add it (even if it is not true) [it] will get it accepted. And there is no way for me as the triager to know if it is true or not."
- **DG-003** — note: `21y man, frontal headche 6/12, not responding to saline rinses` → met_criteria claimed **"moderate to severe symptoms persisting daily despite daily nasal saline irrigation"** (verdict declined — correctly — but fabricated on the way). Danielle: "we are essentially telling them what to write on the form to get their patient their CT, irrespective of whether the patient meets the actual criteria."
- **DG-005** — note: `21y old girl, PMB, on COC` → AI resolved the age/PMB contradiction (assumed AUB) instead of flagging that the referral doesn't make sense.
- **RP-007/INT-002** — note documents a **15cm epigastric mass**; the model listed **"no focal pathology"** as met — a criteria element asserted against direct contradiction in the note. The suite's Sonnet-4-vs-4.6 framing (IDs 359, 361; "Sonnet 4.6 resolves") is `[op-mem]` from the earlier Sonnet 4 comparison testing and is **contradicted by REG02**: config B (Sonnet 4.6, 3 runs) carries "no focal pathology" language in all three (run 2 uncaveated: "Strong suspicion of malignancy with no focal pathology yet confirmed"), verdict proceeds 3/3, fabrication REVIEW. Sonnet 4.6 does **not** clear this on the current suite.

**Current status:** REG02 config B (v2.3.0 raw, Sonnet 4.6) shows DG-001 still returns proceeds 3/3 with a fabrication auto-flag — **neither the v2.3.0 instruction accretion nor the Sonnet 4.6 upgrade fixed the DG-001 class**. RP-007's "no focal pathology" inversion **also survives on Sonnet 4.6** — config B carries the phrase in all 3 runs (proceeds 3/3, fabrication REVIEW); the sheet's "Sonnet 4.6 resolves" note is `[op-mem]` from the earlier Sonnet 4 testing and is not borne out by the current suite. Fabrication auto-flags also fired on RP-005 (3/3), CR-002 (2/3), CR-001, RP-001, RP-006, DG-004 — unreviewed; the auto-flagger errs toward flagging by design.

**Mechanism hypothesis — three mutually reinforcing permissions in the current structure:**

1. **The wording contract demands invention.** Instruction 5 / Step 4 (row 29): suggested_wording must be a "complete finished note with **all required sub-elements explicitly documented**." For an at_risk/declined note, the required sub-elements are by definition *not in the source note* — the only way to satisfy the contract is to assert them. The nearest source of correct-sounding language is the criteria block itself, which is why DG-003's fabricated met_criteria is near-verbatim criteria text ("moderate to severe symptoms persisting daily despite daily nasal saline irrigation" ≈ the CT Sinus criterion wording). The prompt does not anywhere say the wording may only *name* what to document rather than *assert* it.
2. **met_criteria has population pressure and no grounding requirement.** Instruction 8 (row 26) demands met_criteria always be populated and every documented sub-element found; nothing anywhere requires a met_criteria item to be traceable to a span of the note. Meanwhile rows 13/14 (qualitative matching, shorthand equivalence) and inferred mode legitimise non-literal matching — the documented/implied/needed boundary is progressively blurred by instructions that were each individually reasonable. DG-001's "cognitive impairment" and RP-007's "no focal pathology" are criteria-block phrases imported into met_criteria; the model is doing retrieval from the wrong text.
3. **Single-pass generation blends three tasks.** One completion simultaneously (a) extracts what the note documents, (b) computes the gap against criteria, and (c) drafts persuasive wording to close the gap. Task (c) is conditioned on the criteria (what's needed), not the note (what's present), and there is no structural boundary stopping (c)-language leaking into (a)-fields. Temperature 0.1 stochasticity then makes the leak intermittent (INT-002: 2 of 5 runs), which is worse than deterministic failure — it evades single-run testing.

DG-005 is the same family seen from the other side: where the note *contradicts itself*, the generation contract (produce a coherent assessment) forces silent resolution, because no output field or instruction exists for "this referral is internally inconsistent — clarify before assessing."

Note also that DG-001's verdict was wrong independently of fabrication (headache + cancer-history accepted without the qualifying associated features) — a compound-decomposition failure on the same criterion family as RP-000/RP-004. A fabrication remedy alone would not have fixed DG-001's verdict.

**Candidate structural remedies (analysis only — no design commitment):**

- **R1 — Grounding contract for met_criteria:** each met item must quote or minimally paraphrase a note span ("met because note states: '…'"); anything inferred is labelled as inference. Verifiable post-hoc by code (n-gram overlap check) — a deterministic fabrication detector could then gate output, the way `postProcessingValidation()` gates verdicts.
- **R2 — Hard separation of extraction from advice:** structure the response (or the assessment process) so "documented findings" are fixed before gap analysis, and wording guidance is generated *from the gap list*, not from the criteria directly.
- **R3 — Re-scope suggested_wording to name-what-to-document:** "Document whether symptoms are moderate-to-severe and occur daily" rather than a finished note asserting they are. This is precisely the distinction Danielle herself drew: she objected to DG-002/003 wording but praised DG-004's ("prompts them to think of things that they could add in, but without telling them the exact words to use"). The evaluator-preferred behaviour already exists in the corpus.
- **R4 — Contradiction flag (feeds gap G4):** an explicit output slot + instruction for internally inconsistent referrals, so DG-005-class notes are flagged, not repaired.
- **R5 — Code-side fabrication gate:** complement, not substitute — the REG02 auto-flagger logic (criteria-language-in-met-criteria not present in note) moved into post-processing as a display-time warning.

Any of R1–R4 changes output semantics and likely the JSON schema — colliding with the "no schema change" non-goal, which Phase 1 must resolve loudly (row 34).

---

## 3. Gap list — behaviours the evaluation showed are needed, with no instruction providing them

Listed only; NOT designed here.

| # | Gap | Evidence | Regression case today? | New cases needed? |
|---|---|---|---|---|
| G1 | **ACC detection beyond explicit mechanism** | Michaela (email 1 Jun 2026): "Correctly flag cases for ED or ACC — ED yes — **ACC no**" | LP-002 only — explicit "stepping down from a ladder", the easy case, ✓ | Yes: implicit/buried trauma mechanisms, trauma-plus-eligible-elements compounds |
| G2 | **Telehealth / no-examination detection** | Named in TA-PROMPT-01 brief (provenance: operator memory — no repo artefact located; nearest is MW-001's "Pelvic exam not done", which the tool handled well on verdict) | No | Yes: telehealth consult note, exam findings absent, criteria requiring examination findings |
| G3 | **"CT Other" defer-don't-decline / exam-type eligibility routing** | RP-007 (real case; two PCRLs accepted under CT Other — "This should have been assessed under CT Other, not CT chest/abdo/pelvis"); INT-001 (Sonnet 4 missed female-under-35 CT KUB→Renal US redirect; sheet: "exam-type eligibility check needed in prompt"). Flagged as a separate brief | RP-007/INT-002 ✗ (proceeds vs expected at_risk), INT-001 ✗ (at_risk vs expected declined+redirect) — both currently failing | Cases exist; expectations must be re-registered post-switch (ct_other and us_fna_biopsy become visible — TA-SRC-01 §9 Category A predicts these very cases change) |
| G4 | **Contradiction flagging (DG-005 class)** | DG-005: "This should be declined as the referral info does not make sense", not silently repaired | DG-005 present but REVIEW — "flags the contradiction" is not auto-gradable, and 1 of 3 runs verdict-diverged | Grading rubric needed more than new cases; an output slot decision belongs to the fabrication remedy (R4) |
| G5 | **Clinical-advice boundary (no admission advice without severity basis)** | CB-001 (Campbell): "advice was to admit to hospital without any understanding of the severity… I'd rather see advice to review Health Pathways" — OPEN | CB-001 ✓ on verdict; the concerning behaviour (notes content) ungraded | Yes: grade notes/redirect content, not just verdict |
| G6 | **Standard NZ lab reference-range knowledge (ULN)** | CB-002 (Campbell): "Please do not require the referrer to enter the ULN for ALP or other tests" — OPEN | CB-002 ✓ on verdict (at_risk) but the behaviour Campbell objects to is the *reason* it's at_risk | Borderline prompt-vs-criteria-data question; note for Phase 1 gap decisions |
| G7 | **Paediatric/adult boundary robustness** | MW-008: 24-year-old assessed as paediatric (Sonnet 4); §1 row 32 hypothesis says the trigger is the client-side regex matching "(age 12.5)" | MW-008 in suite but REG02 forced `isPaed=false` — the detection path is untested; and MW-008 ✗ anyway (at_risk vs proceeds) on pure adult-criteria strictness (PID-exclusion demand) | Yes: suite must exercise detection (don't force isPaed); plus a "menarche age N" adult case |
| G8 | **Equity-provision citation discipline** | EQ-001 expects the Māori/Pacific AUB provision cited; EQ-002 expects it NOT cited (NZ-European) — currently emergent behaviour, no instruction governs it | EQ-001 ✓, EQ-002 ✓ (both proceed; citation content ungraded) | Grading of citation presence/absence needed; low urgency while passing |

---

## 4. Redundancy candidates from TA-SRC-01 — assessed

**4.1 Decomposition examples/instruction vs §4.1 structured blocks (row 15).** Not redundant at switch time: zero published items carry `logic` when the cutover lands (ta-src Phase 0 §3, confirmed in ta-src-design §4.2 "dormant path"). Redundancy accrues per CC-DESIGN-01 §6.2 migration tier as compound items are hand-authored. Verdict: **KEEP at v3 launch; retire progressively, tied to migration tiers, with an explicit trigger** ("when tier-1 sites carry logic, drop the prose decomposition rule for those sites" is a v3 design question, not a Phase 0 decision). The worked CT-Head decomposition example only exists in the fallback text (4.2), not in v2.3.0 — nothing to retire in the active prompt on that score.

**4.2 `FALLBACK_INSTRUCTION_TEXT` (triage/index.html:1640) (row 35).** Three major versions stale; missing every v2.x behaviour with a regression case behind it (gender filtering, one-met-pathway, Step 3b); retains the retired v1.x TIA-gateway rule 1a that v2.x deliberately superseded. It engages *silently* on any prompt-fetch failure — and this audit's live checks found the failure mode is real: the repo working-tree page fetches relative `/api/system-prompt`, which the currently deployed main-site worker does not route (the deployed asset uses an absolute URL to the API worker; the repo copy would silently fall back if deployed before the worker route ships). TA-SRC-01 decision 5 already established the project position: fail closed, no silent fallback, for criteria. The same logic applies with more force to the instructions. Verdict: **RETIRE the silent fallback as part of v3 rollout design (Phase 1 §7 rollout sketch) — either fail-closed like criteria, or a loud degraded-mode banner.** Not actioned here.

**4.3 Instruction 9 page citations (row 30).** Inverse of redundant: the instruction survives unchanged, and the switch *repairs* it — production currently cites superseded-edition pages while claiming the April 2026 reissue; TA-SRC-01 decision 1 backfills correct v2.0 pages. Verdict: **CARRY unchanged; note for the v3 regression plan that pre/post-switch page-ref diffs are expected noise (TA-SRC-01 §9 Category C).**

**4.4 ct_other compensation.** Audited the full v2.3.0 text: **no explicit ct_other compensation wording exists** — no mention of CT Other, no "nearest-exam" fallback rule. The compensation lives outside the prompt, in the regression *expectations* (RP-007/INT-002 expected at_risk, INT-001 expected declined+redirect — both shaped by what the AI could not see). Verdict: **nothing to retire in the prompt text; the expectations must be re-registered post-switch** (already pre-registered as TA-SRC-01 §9 Category A). The underlying behaviour question is gap G3.

---

## 5. UNPROTECTED × load-bearing matrix

Instructions with **no regression case that would catch their removal** ranked by clinical load. These are the riskiest part of any restructure: they can be dropped or reworded in v3 and every test would still pass.

| Rank | Instruction (row) | Clinical load if silently lost | Note |
|---|---|---|---|
| 1 | Step 0(a) emergency items: **cauda equina, ruptured AAA, massive haemoptysis, pneumothorax** (row 2) | Emergency presentation sent to community imaging | Only SAH and torsion have cases (INT-SAH/INT-TORSION). Four of six list entries unprotected |
| 2 | **suggested_wording contract** (row 29) | The DG fabrication/gaming surface — currently the *harm-doing* clause, and equally unprotected against a well-meaning "fix" that breaks something else | Fabrication column exists but is REVIEW-heavy, not a gate |
| 3 | **Numeric thresholds are hard minimums** (row 11) | Under-threshold referrals accepted (criteria integrity) | Was protected by TEST-007/TEST-001; both dropped in the REG02 suite consolidation. Protection *lapsed*, not never-existed |
| 4 | **Temporal ambiguity flagging** (row 16, SP-02/TA-014) | Timing-crux eligibility silently assumed | Already drifting: v2.3.0 trimmed its worked examples unprotected and nobody noticed until this audit |
| 5 | **met_criteria always populate** (row 26) | GP loses "what you got right"; and any v3 grounding remedy (R1) modifies this exact clause — with no case to confirm the old value survives | Fabrication-implicated *and* unprotected: the most dangerous combination in the table |
| 6 | **Lab results checklist** (row 18) | Missing-lab referrals proceed / wrong admit-threshold advice | Also the highest post-switch WRONG risk (hardcoded thresholds vs rewritten v4.1.0 groups) |
| 7 | Step 0(c) wrong-pathway (row 4) | Specialist-first presentations imaged | Vague enough that its removal might improve behaviour — but nobody would know either way |
| 8 | NOT-FUNDED vs REDIRECTED (row 25) | Wrong patient messaging (self-fund vs other pathway) | MW-006 exists in the sheet but not the suite — cheap to add |
| 9 | DOC_MODE inferred variant (row 19) | Unknown — no v2.3.0 inferred-mode run has ever been done | TA-010 default question also still formally unanswered |
| 10 | Preamble framing (row 31) | Tone/audience drift | Low, but it's where role-aware variants will land — worth a case before touching |

Also lapsed with the TEST-case drop: TEST-005/TEST-006 (AKI conflict-surfacing and transient-focal-signs at_risk nuances) — partially covered by INT-AKI (REVIEW) and nothing, respectively.

---

## 6. Additional findings surfaced by the audit (not in the brief's checklist, reported for completeness)

**6.1 The suite consolidation silently dropped protections.** The move from the 20-case v2.x suite to the REG02 30-case suite added the DG/MW/INT/EQ/CB cases but dropped all seven TEST-* cases. TEST-004 (Step 3b's origin case) and TEST-007 (numeric thresholds) were load-bearing. Any v3 regression plan should either restore the TEST cases or replace them with equivalents (they are synthetic — no sign-off burden beyond authorship).

**6.2 Two origin cases have flipped expectations.** LP-003 (row 10): the general-vs-specific rule was added in v2.3.0 to make it proceed; the Structured Re-Eval now expects at_risk (Louise's own rating). LP-004 mirror-image (June "regression" is now correct behaviour). The LP-003 conflict needs a clinical ruling before v3 carries the rule forward — it is the only v2.3.0 rule whose justifying case now testifies against it.

**6.3 The override's contribution is unmeasured.** Step 3b (prompt) and `postProcessingValidation()` (client) are deliberate belt-and-braces for the same failure class. REG02 config C — the measurement of what the braces actually do on the current model — never ran. If v3 restructures Step 3b, that measurement (or a decision it isn't needed) should come first; the checkpoint file suggests the C run can resume rather than restart (`scripts/reg02-checkpoint.json`).

**6.4 Prompt-fetch fallback is a silent-degrade path** (§4.2) — and the repo working tree currently differs from the deployed triage asset (relative vs absolute prompt-fetch URL; repo page is 362 lines ahead of deployed). Not a Phase 0 action; noted so the v3 rollout sketch treats "which prompt actually loaded" as a first-class, visible fact (it already displays `v{version}` in the provenance modal — but only on success; failure shows nothing).

**6.5 Housekeeping.** `instructions.complete/claude-code-brief-TA-009-system-prompt-versioning.md` has an uncommitted stray "r" typo on line 1 (working tree); `instructions/compound-criteria-design.md` also carries uncommitted modifications. Left untouched.

---

## Acceptance criteria status (Phase 0 items)

- [x] Every v2.3.0 instruction in the traceability table (35 rows incl. code-assembled parts); origins honest — 7 marked UNKNOWN (rows 11, 18, 25, 26, 28, 29 finding-level; row 31 design-era), 2 marked operator-memory (SP-01, SP-02) with process-gap note
- [x] UNPROTECTED × load-bearing instructions named (§5, ranked)
- [x] Fabrication mechanism hypothesis stated with reference to the DG case texts (§2, verbatim quotes; remedy candidates R1–R5, analysis only)
- [x] Post-switch redundancy assessed for all four named candidates (§4)
- [x] Gap list with regression-case status (§3, G1–G8)
- [ ] Phase 1 items — not started (STOP gate)
- [x] Nothing deployed, written to D1, or published — all API access read-only; only this file written

**STOP.** Awaiting review before Phase 1 (`instructions/prompt-v3-design.md`).
