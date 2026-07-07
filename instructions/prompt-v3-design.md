# TA-PROMPT-01 Phase 1 — System Prompt v3 Architecture Design

**Brief:** TA-PROMPT-01 v1.0.0 (DESIGN ONLY)
**Date:** 7 July 2026
**Depends on:** `instructions/prompt-v3-phase0-audit.md` (Phase 0, signed off 7 Jul 2026)
**Status:** DESIGN. No prompt version created, nothing written to D1/KV, nothing deployed. This document specifies structure + the fabrication-remedy section drafted in full; full v3 instruction-text authoring is the implementation exercise (per brief constraint).

> **Deployment reality (restated):** any v3 prompt deploys only after the TA-SRC-01 cutover is complete and measured, via TA-009 versioned-prompt machinery, activation through the admin API only, behind its own regression run with pre-registered predictions. v3's baseline is the **post-switch** run, never the current one. A prompt restructure during/after evaluation is a Tim-visible change, same governance class as a model change.

---

## Reading order

The clinical headline is §3 (fabrication remedy). It is drafted in full and can be read standalone. §1–§2 give the structure it sits in; §4–§8 handle gaps, documentation mode, regression, rollout, and non-goals. Every design choice cites a Phase 0 row (`P0#n`), a named finding, or a stated principle.

---

## 1. Structure — the v3 prompt architecture

### 1.1 Design principles

1. **Safety is positional, not incidental.** Phase 0 found the sole decline-gate (P0#1) protected only by SAH/torsion cases while four emergency items (cauda equina, AAA, haemoptysis, pneumothorax — P0#2) are unprotected. v3 makes the safety gate the first titled section and the only place a redirect can decline — a structural invariant, not a rule buried mid-prompt.
2. **Extraction precedes judgement precedes advice — in emission order, not just instruction order.** The fabrication mechanism (Phase 0 §2) is a single pass blending three tasks. v3 orders them as explicit stages with a one-way information flow: what the note *says* → what the criteria *need* → what to *tell the GP*. Because the criteria block is in-context, telling the model to "extract first" only bites if the grounded findings are *emitted* before the verdict — the force is autoregressive commitment: once the model has written the grounded findings, later tokens (verdict, wording) are conditioned on them rather than free to drift back to the criteria text. This drives the emitted-field ordering in §3.1.
3. **Every clause states its own scope.** Phase 0's central defect is exception-by-adjacency (the epidemiological-modifier rule P0#11/#12 lost its explicit "THIS OVERRIDES 0 AND 1b" in the v2.0.0 rewrite). v3 clauses name what they override/are-overridden-by inline, so position carries no hidden meaning.
4. **Data-owned facts live in the data, not the prompt.** Where v4.1.0 published criteria carry a fact (page numbers, redirect text, lab thresholds), the prompt references the block rather than hardcoding a duplicate that can silently contradict it (P0#18, #22, #30).
5. **Minimum viable change to the output contract.** The client parses the JSON (non-goal §8). The fabrication remedy is designed to work through *conventions on existing fields* first; schema changes are isolated, flagged, and deferred (§3.5, §8).

### 1.2 Section order (v3)

```
§A  ROLE & AUDIENCE            (was: preamble, P0#31)
§S  SAFETY GATE                (was: Step 0, P0#1–5) — the only decline-by-redirect gate
§E  DOCUMENTED FINDINGS         (NEW — extraction stage; fabrication remedy core, §3)
§P  PATHWAY IDENTIFICATION      (was: Step 1, P0#6–10)
§M  MATCHING & INTERPRETATION   (was: Step 2 interpretation rules, P0#11–19)
§V  VERDICT                     (was: Step 3 + 3b, P0#20–24b)
§O  OUTPUT & GUIDANCE           (was: Step 4, P0#25–30; re-scoped wording §3)
{criteria block}                (unchanged position; TA-SRC-01 source)
{JSON schema}                   (unchanged, P0#34)
```

Rationale for the one structural addition (**§E DOCUMENTED FINDINGS**): the audit shows fabrication is not a wording bug but an ordering bug — met_criteria is populated in the same breath as suggested_wording is drafted, and criteria-block language leaks into both. Inserting an extraction stage *before* pathway identification forces the model to commit to "what the note actually contains" before it has seen which criteria it is trying to satisfy. This is the pivot the remedy turns on; it earns a section.

Everything else is a re-titling and de-accretion of existing Steps — no reordering of the assessment logic itself, so the post-switch regression can attribute changes to the remedy rather than to a reshuffle.

### 1.3 What each section is for (one line each)

- **§A Role & audience** — who the tool serves and the honesty stance (§3.4). Structured so a future role-aware variant slots in here without re-architecting (non-goal §8).
- **§S Safety gate** — emergency / ACC / wrong-pathway; declines and stops; the *only* redirect-decline gate.
- **§E Documented findings** — extract and ground what the note states, before criteria are consulted (§3.1).
- **§P Pathway identification** — enumerate every candidate pathway (differentials, multi-entry, gender filter, general-vs-specific).
- **§M Matching & interpretation** — the numeric/qualitative/shorthand/gateway/lab rules, each with explicit scope.
- **§V Verdict** — one-met-pathway-proceeds, with the consistency self-check folded in as the section's closing invariants (not a bolt-on Step 3b).
- **§O Output & guidance** — field-by-field contract; the re-scoped `suggested_wording` and the contradiction path.

---

## 2. Behaviour mapping — every Phase 0 row accounted for

**Legend:** CARRIED (moves to the named section, wording essentially intact) · RESTRUCTURED (kept but reshaped — how/why noted) · RETIRED (removed — safety argued). **Zero silent drops.**

| P0# | Behaviour | Disposition | v3 home / reasoning |
|---|---|---|---|
| 1 | Step 0 is the only decline-by-redirect gate | CARRIED | §S opening invariant; stated as a structural rule, not prose |
| 2 | Emergency list (6 items) | RESTRUCTURED | §S; **each item gets a one-line "why ED/111"** so the four unprotected items (cauda equina/AAA/haemoptysis/pneumothorax) are legible; §6 adds a regression case per item |
| 3 | Trauma → ACC | CARRIED + strengthened | §S; §M gains an explicit "mechanism may be implicit" cue → addresses gap G1 (Michaela "ACC no") |
| 4 | Wrong-pathway (specialist-first) | RESTRUCTURED | §S; narrowed wording so it can no longer be read as a general severity-decline licence (was the vehicle for the RP-006 v2.2.0 severity decline). Explicitly scoped: "applies only where imaging cannot be interpreted without prior specialist step, not to severity." |
| 5 | Step 0 is the only decline-gate; post-gate severity → advisory | CARRIED | §S + §V invariant; the AKI safety-advisory-while-proceeding behaviour (RP-006 v2.3.0) preserved via `safety_alert` on a proceeds verdict |
| 6 | Identify every matching pathway | CARRIED | §P |
| 7 | Differential markers (?TIA) not pathway invocation | CARRIED | §P |
| 8 | Same condition, multiple entries | CARRIED | §P |
| 9 | Gender-specific pathway filtering | CARRIED | §P; **decoupled from DOC_MODE** — see P0#19 note (the "age/sex must be explicit" clause that caused the CR-003 regression moves out of gender filtering) |
| 10 | General vs specific variants | CARRIED — **pending clinical ruling** | §P; flagged in §4 gap decisions — its origin case LP-003 now expects at_risk (Phase 0 §6.2). Carried structurally but the LP-003 regression prediction is held for a ruling, not asserted |
| 11 | Numeric thresholds hard minimums | RESTRUCTURED | §M; **explicit precedence restored**: "hard unless the value carries an epidemiological qualifier (see §M-modifiers)" — repairs the lost "THIS OVERRIDES 0 AND 1b" (Phase 0 §1 headline defect). §6 restores a numeric-threshold case (TEST-007 replacement) |
| 12 | Epidemiological modifiers not thresholds | RESTRUCTURED | §M; states its own scope ("overrides the numeric-minimum rule for qualified values") rather than relying on adjacency; worked examples restored (trimmed since v2.2.0) |
| 13 | Qualitative criteria matching | CARRIED | §M |
| 14 | Clinical shorthand equivalence | RESTRUCTURED | §M; **the "accept and note the inference" clause is reworded to route through §E grounding** — an accepted inference must be labelled as inference in Documented Findings, not silently promoted to a met fact. This is the seam between a legitimate shorthand and a fabrication (§3.2) |
| 15 | Compound decomposition | CARRIED — staged retirement | §M; kept at v3 launch (zero `logic` items at cutover, TA-SRC-01 §3). §4 defines the retirement trigger tied to CC migration tiers |
| 16 | Temporal ambiguity flagging (SP-02/TA-014) | CARRIED | §M; worked examples restored (drifted away unprotected). §6 adds a timing-crux case |
| 17 | Gateways within-pathway only | CARRIED | §M |
| 18 | Lab results/scores checklist | RESTRUCTURED — **de-hardcoded** | §M; the checklist becomes "check whether the *criteria block for the identified exam* names a required value" rather than a hardcoded threshold list. Removes the post-switch WRONG risk (v4.1.0 rewrote CT KUB/us_pelvis acute groups). Standard-ULN knowledge (gap G6) decided in §4 |
| 19 | DOC_MODE strict/inferred | RESTRUCTURED | §M + §3.4; strict's "age and sex must be explicitly stated" separated from gender filtering (caused CR-003 regression); strict-vs-inferred boundary made clean per TA-010 (§3.4) |
| 20 | Fully-met → priority ladder | CARRIED | §V; ladder corrected to include Acute 24hr and note S1–S3 (minor incoherence flagged P0#20) |
| 21 | One met pathway = proceeds | CARRIED | §V; the load-bearing verdict invariant |
| 22 | Worked verdict examples (TIA/hepatomegaly/PMB/AKI) | RESTRUCTURED — **de-data-coupled** | §V; examples reworded to be criteria-text-agnostic (the v2.3.0 TIA example cites the superseded "BPAC tool" gateway that v4.1.0 restructured — Phase 0 P0#22 WRONG-post-switch). v3 examples state the *principle* ("an unmet gateway on a non-deciding pathway is advisory") without quoting specific criteria wording |
| 23 | Partial→at_risk; no match→declined | CARRIED | §V |
| 24 | Advisory notes / conflicting dispositions | CARRIED | §V |
| 24b | Step 3b consistency checks 1–5 | RESTRUCTURED | §V closing invariants (not a separate step); CHECK 3 relaxed to leave room for the contradiction flag on non-proceeds verdicts (§3.3). Interaction with client override documented (§7) |
| 25 | NOT-FUNDED vs REDIRECTED | CARRIED | §O; §6 adds the MW-006 TOP-redirect case (was in sheet, not suite) |
| 26 | met_criteria always populate | RESTRUCTURED | §O + §E; **the fabrication fix** — population requirement retained, but every item must be grounded per §3.1. The v1.x "never return empty… explicitly checking each" tail is dropped (it created find-something pressure); replaced by "list every *grounded* sub-element" |
| 27 | missing_criteria specific-only | CARRIED | §O |
| 28 | add_to_note specific sentences | RESTRUCTURED | §O; merged conceptually with the re-scoped suggested_wording (§3.3) — both become "name what to document," de-duplicating the DG-004 complaint |
| 29 | suggested_wording = complete finished note | **RESTRUCTURED — the headline change** | §O + §3.3; re-scoped from "assert the findings" to "name what to document." See §3 |
| 30 | Page references [pXX] | CARRIED | §O; unchanged text; the switch repairs the stale-page defect (TA-SRC-01 decision 1). §6 marks page-only diffs as expected noise |
| 31 | Preamble/audience framing | RESTRUCTURED | §A; broadened to name both referrers and triagers (the DG evaluator is a triager); role-aware hook noted for future (non-goal §8) |
| 32 | Paediatric note + detection | CARRIED (prompt) / FLAGGED (code) | §A note carried; the `detectPaediatric()` "(age 12.5)" misfire (gap G7, P0#32) is a **code** fix outside prompt scope — logged §4/§9 |
| 33 | Criteria block + reissue header | CARRIED | Position unchanged; TA-SRC-01 makes the header true |
| 34 | JSON output schema | CARRIED — fields reordered, not changed | §O; `met_criteria`/`missing_criteria` emitted before `verdict` (parse-neutral key reorder, §3.1(a) — not a schema change). No field added/removed/renamed. Structured `documented_findings` deferred to TA-PROMPT-02 (§3.5/§8) |
| 35 | FALLBACK_INSTRUCTION_TEXT | **RETIRED as a silent path** | §7 rollout; replaced by fail-closed or loud degraded-mode, per TA-SRC-01 decision 5 (no silent fallback). The stale v1.x text is not carried into v3 at all |

No row is dropped without a line. The only outright RETIREs are P0#35 (silent fallback — replaced by fail-closed, §7) and the two v1.x tails inside P0#26 and P0#4's over-broad reading — each argued above.

---

## 3. Fabrication remedy — designed in full

**This is the clinical headline of v3.** It answers the DG findings structurally, not with another patch. Drafted here in full (prompt text included) because it is the part needing review; the rest of the v3 text is skeleton (§1–§2, §4–§8).

### 3.0 What we are fixing (from Phase 0 §2, verbatim cases)

- **DG-001** (`21y man, headche, known hx of met mel.`) — in the original evaluation run (DB 178, v1.1.0/Sonnet 4), met_criteria asserted "cognitive impairment," absent from the note; proceeds. **The verdict failure and fabrication flag persist on v2.3.0 + Sonnet 4.6** (REG02-B proceeds 3/3, expected declined): the phrase now surfaces as a notes-field pathway-name reference rather than a direct met_criteria assertion, but the underlying grounding gap and the wrong verdict are unchanged. Neither prompt accretion nor the model upgrade fixed it.
- **DG-002** (`64y girl … differentn to usual headache …`) — suggested_wording asserted "progressively worsening," never stated. Danielle: "if they add it (even if it is not true) [it] will get it accepted."
- **DG-003** (`21y man, frontal headche 6/12, not responding to saline rinses`) — met_criteria claimed "moderate to severe symptoms persisting daily despite daily nasal saline irrigation" (verbatim criteria-block language), none of it in the note; verdict correctly declined but fabricated en route.
- **DG-005** (`21y old girl, PMB, on COC`) — the age/PMB contradiction was silently resolved (assumed AUB) instead of flagged.
- **RP-007/INT-002** (15cm epigastric mass) — model asserted "no focal pathology," contradicting the documented mass. The "Sonnet 4.6 clears this inversion" claim is `[op-mem]` from the earlier Sonnet 4 comparison testing and is **not supported by REG02**: config B (Sonnet 4.6, 3 runs) carries the phrase in all three (run 2 uncaveated), proceeds 3/3, fabrication REVIEW. The inversion survives on the current model, so the remedy is required for this case too — not merely a residual of an old model.

Mechanism (Phase 0 §2): three reinforcing permissions — (1) the wording contract *demands* invention for at_risk/declined notes; (2) met_criteria has population pressure and no grounding requirement, and criteria-block phrases are the nearest correct-sounding text; (3) one pass blends extraction, gap analysis, and persuasive drafting, so criteria-language leaks into the findings fields, intermittently (temperature 0.1 → INT-002 fabricated on 2 of 5 runs, evading single-run tests).

### 3.1 Remedy R1 — Documented-findings grounding contract (§E)

A new, first-substantive section instructs the model to extract what the note contains **before** it sees which criteria it is trying to satisfy, and to bind every later "met" claim to that extraction.

Draft §E text:

> **§E — DOCUMENTED FINDINGS (do this before identifying pathways).**
> Before you consult the criteria, list what THIS NOTE actually states. This list is your only source of "documented" facts for the rest of the assessment.
> - For each clinical fact, record it in the form: `finding — "<short quote or close paraphrase from the note>"`.
> - Mark anything you infer rather than read as `INFERRED: <fact> (from: <what the note literally says>)`. An inference is permitted only where any clinician would draw it from the words present (e.g. "post-menopausal" ⇒ >12 months amenorrhoea). It is never permitted to satisfy a severity, frequency, duration, or examination-finding element that the note does not state.
> - Do NOT add findings that "would make this referral succeed." If the note does not contain it, it is not a documented finding.
> **A criterion may be listed as met in Step §O ONLY if it maps to an entry in Documented Findings.** If the mapping relies on an INFERRED entry, the met_criteria item must carry the word "(inferred)".

Why this works on the cases:
- **DG-001** "cognitive impairment" never appears in `21y man, headche, known hx of met mel.` → cannot enter Documented Findings → cannot be a met criterion. (The verdict also decouples: headache + cancer-history without qualifying associated features fails compound decomposition P0#15 → declined, matching the expected value.)
- **DG-003** "moderate to severe … daily" is criteria-block language, not note text → excluded from Documented Findings → cannot appear in met_criteria even though the verdict is (correctly) declined.
- **RP-007** "no focal pathology" contradicts the stated 15cm mass → not a documented finding → §E grounding blocks it. This is the enforceable path (the phrase survives on Sonnet 4.6 per REG02, so there is no model fix to lean on).

**Emission order (the mechanism, not just the instruction).** The criteria block sits in-context, so a "do §E first" instruction is only enforceable if the grounded findings are actually *emitted* before the verdict — autoregressive commitment is what stops later tokens drifting back to criteria-block language (§1.1 principle 2). Two consequences for v3:

- **(a) Reorder the emitted JSON fields so `met_criteria` (grounded) precedes `verdict`.** Currently the schema emits `verdict`/`verdict_title`/`verdict_summary` first and `met_criteria` several fields later — i.e. the model commits to a verdict *before* writing its grounded evidence. v3 moves `met_criteria` (and `missing_criteria`) ahead of `verdict` in the emitted object so the grounded findings are on the page first. **JSON key order is parse-neutral for the client** (the client reads by key, not position), so this is a field-*ordering* change, **not a schema change** — it adds/removes/renames nothing. It is the cheapest lever that makes §E's autoregressive force real.
- **(b) Without an emitted findings field, the met_criteria grounding convention IS §E's enforceable mechanism.** §E's Documented Findings list is a *reasoning* step; there is no schema field to emit it into (adding a structured `documented_findings` array is TA-PROMPT-02, §3.5/§8). So at v3 the binding contract is the met_criteria grounding convention (each item quotes the note or carries "(inferred)"). §E is the discipline; grounded met_criteria is the auditable trace of it. The structured array would make the trace first-class — deferred, not required.

Grounding is then **machine-checkable**: because met items either quote the note or carry "(inferred)," a post-processing check (§7) can flag any ungrounded, non-inferred met item — turning the REG02 fabrication auto-flagger into a deterministic display-time signal without a prompt round-trip.

**Implementation note — the grounding gate flags, it does not block.** Grounding tolerates paraphrase (a met item may legitimately compress a note span rather than quote it verbatim), so an n-gram/overlap check will produce false positives. The gate is therefore a **display-time flag for review**, never an automatic verdict override or a suppressed output — unlike the verdict-level `postProcessingValidation()` override, which acts. Treating it as a block would trade fabrication risk for false-negative-verdict risk on legitimate paraphrase. It surfaces suspect met items for a human (evaluator, or the referrer as a "check this is documented" nudge); it does not gate the assessment.

### 3.2 Remedy R2 — the shorthand/inference seam (§M ↔ §E)

The existing shorthand-equivalence rule (P0#14) is the legitimate cousin of fabrication: "progressive headache" *should* satisfy "change in pattern." v3 keeps it but routes it through §E: an accepted shorthand becomes an **INFERRED** Documented Finding, labelled, and its met_criteria item carries "(inferred)." This draws the exact line Danielle's feedback implies — a defensible clinical inference is visible as an inference; an invented severity/frequency is blocked because §E forbids inferring elements the note doesn't state. No general "accept and note" licence survives ungoverned.

### 3.3 Remedy R3 — re-scope `suggested_wording` to name-what-to-document (§O)

The single most direct fix. The v2.3.0 contract (P0#29) — "complete finished note with all required sub-elements explicitly documented" — is the instruction that *requires* invention. v3 replaces it:

> **suggested_wording** — Only when verdict is at_risk or declined. State **what the referrer needs to document**, phrased as instructions to check and record, NEVER as asserted findings. Do not write a finished referral that presents unconfirmed facts as true.
> - Write: "Document whether the headache is progressively worsening and any associated persistent nausea/vomiting or neurological deficit."
> - Never write: "Patient has progressively worsening headache with persistent nausea." (asserting facts not in the note)
> If a required element is a value or finding the referrer must obtain (e.g. a lab result, an examination finding), say so explicitly: "Obtain and document [value]; criteria require [threshold]."

This is precisely the behaviour Danielle *praised* in DG-004: "prompts them to think of things that they could add in, but without telling them the exact words to use to get the referral accepted." The evaluator-preferred behaviour already exists in the corpus — v3 makes it the contract. `add_to_note` (P0#28) merges into this stance, removing the DG-004 duplication complaint.

Effect: DG-002's "progressively worsening" and DG-003's severity/frequency language can no longer appear as asserted wording — only as "document whether…" prompts. The gaming vector Danielle named ("telling them what to write … to get their patient their CT") closes: the tool names the *questions*, the referrer supplies the *answers*.

### 3.4 Remedy R4 — contradiction flag (§O; addresses gap G4 / DG-005)

DG-005 is fabrication's mirror: forced coherence over an incoherent referral. v3 adds an explicit path:

> **Internal contradiction.** If the note contains facts that cannot both be true (e.g. an age that contradicts a stated clinical state), do NOT resolve the contradiction by choosing one reading. Set verdict to declined, name the contradiction in `notes`, and in `suggested_wording` ask the referrer to clarify. Example: "The stated age (21) is inconsistent with post-menopausal bleeding; please confirm the patient's age and menopausal status before this referral can be assessed."

This uses **existing fields** (verdict=declined + notes + suggested_wording) — no schema change. It also requires relaxing Step 3b CHECK 3 (P0#24b), which currently forces missing_criteria empty on non-proceeds without leaving room for a "clarify contradiction" state; v3's §V invariant is reworded to permit it.

### 3.5 Schema impact — kept to zero, flagged where a fuller version would want more

The four remedies are deliberately designed to ride on **existing schema fields** (non-goal §8, client parses JSON):
- Grounding (R1): met_criteria items gain a quote/"(inferred)" convention *inside the existing string* — no new field.
- Re-scoped wording (R3) and contradiction (R4): reuse suggested_wording/notes/verdict semantics.

**Flagged loudly (per brief non-goal instruction):** a *cleaner* implementation would add a structured `documented_findings` array and a boolean `contradiction_flag` to the schema, and the deterministic grounding gate (§7) is easier against a structured field than against a string convention. That is a schema + client-parser change and is therefore **out of v3-prompt scope** — deferred to a named follow-up (TA-PROMPT-02, §4). v3 achieves the behaviour with string conventions; the structured upgrade is an enhancement, not a prerequisite. This is the one place v3 brushes the schema non-goal, and it is resolved by staying on conventions.

### 3.6 Per-DG regression predictions (pre-registered; baseline = post-switch run)

| Case | Current (v2.3.0-B, Sonnet 4.6) | v3 prediction | Gradeable how |
|---|---|---|---|
| DG-001 | proceeds 3/3, fabrication flagged | **declined 3/3, no fabrication** — "cognitive impairment" blocked by §E; verdict decoupled via compound decomposition | verdict = declined AND met_criteria contains no ungrounded item |
| DG-002 | at_risk (fabrication in wording) | **at_risk, wording names-what-to-document** — no asserted "progressively worsening" | suggested_wording contains no asserted severity/progression fact; deterministic string check |
| DG-003 | declined 3/3, fabricated met_criteria | **declined 3/3, met_criteria grounded** — no "moderate/severe/daily" | verdict stable; met_criteria items all quote the note |
| DG-005 | declined/declined/at_risk (unstable), contradiction resolved silently | **declined 3/3, contradiction named in notes, stable** | notes names the age/PMB contradiction; verdict stable |
| RP-007/INT-002 | "no focal pathology" present 3/3 on Sonnet 4.6; proceeds 3/3 (expected at_risk); fabrication REVIEW | **§E grounding expected to block the phrase** (it contradicts the documented 15cm mass) → no "no focal pathology" in met_criteria. **Verdict is the exam-routing gap G3, not fabrication** — the v3 remedy is not expected to fix CT-Other routing (deferred, §4) | met_criteria carries no "no focal pathology" item; any verdict change tracked under G3, not this remedy |

**Honest limit:** the remedy targets fabrication and contradiction. It does *not* by itself fix verdict errors whose cause is elsewhere (exam-type routing G3, the LP-003 clinical-ruling question). Those are tracked separately (§4) so a post-switch diff attributes each change to the right cause.

---

## 4. Gap decisions (Phase 0 §3, G1–G8)

| Gap | Decision | Reasoning / home |
|---|---|---|
| **G1 ACC beyond explicit mechanism** | **INCLUDE in v3** | Strong candidate per brief; §S is its natural home. Add "mechanism may be implicit or buried" cue + §6 cases (implicit trauma, trauma+eligible-element). Directly answers Michaela "ACC no" |
| **G2 Telehealth / no-examination** | **DEFER** (named follow-up) | Provenance is operator-memory only (no repo artefact); no case exists; designing it now would be speculative (CLAUDE.md: no speculative additions). Log as candidate; needs an evaluator case first |
| **G3 CT-Other / exam-type routing** | **DEFER to the named separate brief** | Already flagged as its own brief; interacts with TA-SRC-01 §9 Category A (ct_other/us_fna_biopsy become visible post-switch). v3 must not pre-empt it. Note the interaction so the post-switch diff doesn't misattribute RP-007/INT-001 changes to v3 |
| **G4 Contradiction flagging** | **INCLUDE in v3** | Part of the fabrication remedy (R4, §3.4); DG-005 evidence; uses existing fields |
| **G5 Clinical-advice boundary** | **INCLUDE (light)** | §S/§O: "do not advise admission/ED without a stated severity basis; prefer HealthPathways where criteria aren't met." Campbell CB-001. Low cost, clear behaviour. §6 grades notes/redirect content, not just verdict |
| **G6 Standard NZ lab ULN knowledge** | **REJECT for the prompt; route to data** | Campbell CB-002. Hardcoding ULNs in the prompt is exactly the P0#18 de-hardcoding this design removes. Correct home is the criteria data (a reference-range field) or the Viewer — a data/Admin follow-up, not prompt text. Rejecting keeps the prompt from re-accreting facts that belong in the block |
| **G7 Paed/adult boundary** | **CODE fix + regression, not prompt** | The MW-008 misfire is `detectPaediatric()` matching "(age 12.5)" (P0#32 hypothesis). Prompt carries the paed note unchanged; the fix is code. §6/§9: stop forcing isPaed in the suite; add a "menarche age N adult" case |
| **G8 Equity-provision citation** | **DEFER (grading only)** | EQ-001/EQ-002 pass; behaviour is emergent and correct. Add citation-presence grading to the suite; no instruction needed yet. Revisit only if a regression appears |

**Held for clinical ruling (not a gap, a conflict):** the general-vs-specific rule (P0#10) — LP-003's expected value flipped to at_risk (Phase 0 §6.2). v3 carries the rule structurally, but its regression prediction is **withheld pending a working-group ruling** on whether LP-003 should proceed or be at_risk. Naming it here so it's a decision, not a silent carry.

---

## 5. Documentation standard (TA-010) in the v3 structure

The strict/inferred setting exists; its default is a clinical decision that **remains formally unanswered in any repo artefact** (Phase 0 P0#19; the May-2026 clinical review asked and got no recorded answer). v3 does not decide the default — it makes the mode boundary *clean* so the decision, whenever taken, has a single lever:

1. **One injection point.** The mode text stays a single `{{DOC_MODE_INSTRUCTION}}` slot, positioned in **§M** (interpretation), not scattered. Strict and inferred differ only in whether §E permits inference beyond clinician-obvious shorthand.
2. **Boundary stated as a rule, not examples.** Strict = "§E INFERRED entries are limited to definitional equivalences (post-menopausal ⇒ amenorrhoea); no inference of severity, frequency, duration, examination findings, or values." Inferred = "§E INFERRED entries may extend to what any clinician would read from context, but never to a value that falls short of a numeric threshold (P0#11 still binds) and never to an unstated examination finding."
3. **Decoupled from gender filtering.** The strict clause "age and sex must be explicitly stated" (which rode in on the CR-003 regression, P0#9/#19) is removed from strict mode — gender filtering (§P) does not require the note to spell out sex where it is clinically unambiguous ("lady" ⇒ female). This closes the CR-003 regression path at the structural level.
4. **The mode never touches §S or §V.** Safety and verdict logic are mode-invariant. Only §E/§M inference latitude changes. This is what "clean boundary" means: the mode cannot alter what declines a referral or what counts as met beyond the labelled inference set.

Recommendation (flagged, not decided): keep **strict** as default for a point-of-referral GP tool — it mirrors cold triage-radiologist reading and is the safer failure direction (under-accept, not over-accept). But this is the working group's call; v3's structure makes flipping it a one-slot change with no safety-logic entanglement.

---

## 6. Regression plan — pre-registered predictions

**Baseline is the post-TA-SRC-01-switch run, not the current one.** v3 is measured against v2.3.0-on-published-criteria (Sonnet 4.6), so the source-switch changes (new pages, 53 sites, rewritten groups) are already in the baseline and don't contaminate the v3 delta.

**Cases that SHOULD change (v3 is doing its job):**
- **DG-001** → declined (was proceeds); no fabrication. *The point of v3.*
- **DG-002, DG-003** → fabrication cleared in wording/met_criteria; verdicts stable (at_risk / declined).
- **DG-005** → stable declined + contradiction named (was unstable, silently resolved).

**Cases that MUST NOT change (every currently-passing safety case):**
- INT-SAH, INT-TORSION (Step 0 emergencies) → declined, unchanged.
- LP-002 (ACC) → declined, unchanged; G1 additions must not break it.
- RP-000, RP-001, RP-002, RP-003, RP-006, CR-003 → verdicts unchanged (the fabrication remedy must not disturb correct proceeds).
- EQ-001, EQ-002 → proceed, unchanged; equity citations still emitted.

**New cases the gap inclusions require (synthetic — flag for Tim/James sign-off):**
- G1: implicit-trauma ACC case; trauma-plus-eligible-element compound.
- G4: a second contradiction case beyond DG-005 (e.g. stated sex vs gender-specific finding).
- G5: a note that would previously have drawn "admit" advice → expect HealthPathways-style guidance.
- P0#2 restoration: one case per unprotected emergency item (cauda equina, AAA, haemoptysis, pneumothorax).
- P0#11/#16 restoration: replacements for the dropped TEST-007 (numeric threshold) and a timing-crux case.
- G7: "menarche age 12.5" 24-year-old **without forcing isPaed** — tests detection + adult assessment together.

**Expected noise (do not count as changes):** all `[pXX]` citations (superseded → v2.0 pages, TA-SRC-01 §9 Category C) — the diff tool must treat page-only differences as noise or the verdict signal drowns.

**Held predictions (clinical ruling first):** LP-003 (general-vs-specific, §4) — do not pre-register a direction until the working group rules.

**Grading additions vs the current suite:** fabrication becomes a **hard gate** (deterministic grounding check per §3.1), not a REVIEW column; notes/redirect *content* is graded for G5, not just verdict. Restore or replace the dropped TEST-* cases (Phase 0 §6.1).

**Measure the override first (Phase 0 §6.3):** before v3 restructures the Step-3b/client-override pair, run REG02 config C (resume from `scripts/reg02-checkpoint.json`) so the override's contribution is known. If it corrects zero cases that the prompt doesn't, §7's simplification (drop the redundant client checks) is justified by data.

---

## 7. Rollout sketch

- **Versioning:** author v3 as a new `system_prompts` row via TA-009 machinery (version e.g. `3.0.0`, label, changelog referencing this design). Do **not** activate on creation.
- **Activation:** admin API only (`POST /api/admin/versions/:id/publish`-class path / prompt-activate endpoint) — **never raw SQL** (CLAUDE.md: raw writes bypass the KV publish step; the stale-prompt incident). Confirm the KV `system_prompt:active` cache updated and the tool's provenance modal shows `v3.0.0` post-activation.
- **Fail-closed prompt fetch (retires P0#35):** as part of rollout, replace the silent `FALLBACK_INSTRUCTION_TEXT` substitution with the TA-SRC-01 decision-5 stance — if the active-prompt fetch fails, show a visible "assessment unavailable" state, not a silent three-versions-stale fallback. The provenance modal must show which prompt actually loaded on *failure* too, not only success (Phase 0 §6.4).
- **Override reconciliation:** based on the §6 config-C measurement, either keep the client `postProcessingValidation()` as belt-and-braces (documented as intentional redundancy with §V invariants) or remove the checks v3's structure makes dead. Do not restructure §V and the client override in the same deploy without the measurement.
- **Grounding gate is flag-for-display, not block** (§3.1): the deterministic met_criteria grounding check surfaces suspect items for review; it must not override the verdict or suppress output. Paraphrase tolerance guarantees false positives, so a blocking gate would harm legitimate assessments. This is a distinct mechanism from the verdict override (which acts) — implement it as a display flag / evaluator signal only.
- **Rollback:** revert activation to v2.3.0 via the admin API (one prompt-activate call; KV re-publishes). Prompt rollback is independent of the TA-SRC-01 asset rollback — they are separate levers.
- **Governance:** a prompt restructure during/after evaluation is **Tim-visible, same class as a model change** (brief). The new synthetic regression cases (§6) need Tim/James sign-off before the pack is finalised. Activation waits on: TA-SRC-01 cutover complete and measured; v3 regression run green against the post-switch baseline; pre-registered predictions met or explained.

---

## 8. Non-goals

- **No model change.** Sonnet 4.6 stays (governance-controlled per CLAUDE.md; DG-001 evidence shows the remedy is needed regardless of model). v3 must not touch the model default.
- **No temperature change.** 0.1 stays. (The remedy reduces fabrication's *opportunity* structurally; it does not rely on lowering variance. Note: some newer Sonnet versions reject temperature 0.1 — not relevant unless the model changes, which it must not.)
- **No output JSON schema change.** The fabrication remedy is designed onto existing fields via conventions (§3.5). Reordering emitted fields so `met_criteria` precedes `verdict` (§3.1(a)) is **not** a schema change — JSON key order is parse-neutral for the client (it reads by key), and no field is added, removed, or renamed. **Flagged loudly:** a structured `documented_findings` array + `contradiction_flag` boolean would be cleaner and would make the grounding check simpler — but it is a client-parser change and is therefore deferred to **TA-PROMPT-02**, not taken in v3. If, in implementation, any mapped behaviour is found to *require* an actual schema change (new/renamed field), stop and surface it (it changes what the client parses).
- **No role-aware variants.** Working-group dependency (feature/role-aware-view is a separate line). **How v3 accommodates them later without another restructure:** §A (Role & audience) is a single, isolated section; a role-aware variant swaps §A's audience framing and, at most, §O's guidance tone, leaving §S/§E/§P/§M/§V — the entire clinical core — untouched. The mode-injection pattern (§5) is the template: one slot, no safety entanglement.
- **No criteria-content change.** v3 is prompt-only; criteria fidelity is TA-SRC-01/CC-DESIGN-01 territory.
- **No exam-type routing (G3).** Explicitly out of scope — its own brief. v3 must not add CT-Other logic; doing so would collide with that brief and with TA-SRC-01 §9.

This non-goals section earns its place on three counts: it holds the schema line that the fabrication remedy naturally pushes against (the substantive tension), it keeps the model/temperature governance boundary that CLAUDE.md mandates, and it prevents v3 from absorbing the adjacent CT-Other and role-aware work that has its own briefs.

---

## Acceptance criteria mapping (brief Phase 1)

- Structure with per-section rationale; safety architecturally prominent → §1 (§S first, sole decline-gate)
- Behaviour mapping, zero silent drops → §2 (all 35 P0 rows; only RETIREs argued)
- Fabrication remedy designed, own section, mechanism + per-DG effect + regression predictions → §3
- Gap decisions (include/defer/reject) incl. ACC as v3 candidate → §4
- TA-010 documentation-standard boundary clean → §5
- Regression plan, pre-registered, post-switch baseline, must-change/must-not-change/new cases → §6
- Rollout: TA-009, admin-API activation, rollback, Tim-visible governance → §7
- Non-goals earning their place: no model/temp/schema/role-aware change, with role-aware accommodation stated → §8
- Nothing deployed, written to D1, or published — design document only

**Ready for review.** No prompt version created; nothing activated.
