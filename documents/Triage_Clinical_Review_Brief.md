# CRR Triage Advisor — Clinical Review Request

**Audience:** Clinical reviewer (CRR working group)
**Prepared:** May 2026
**Decision needed on:** two interpretation rules that the AI currently judges inconsistently

---

## 1. Why we need your input

The Triage Advisor reads a free-text referral note and decides whether the referral **proceeds**, is **at risk** (missing some documentation), or will be **declined**. It applies the National Primary Care Referral Criteria for Imaging (April 2026 reissue) verbatim.

For most clear-cut cases the verdict is stable. But on **borderline notes** — where the criterion wording leaves room for interpretation — the AI can give two defensible answers on the same input. Below is one such case. We need a clinical ruling on how the tool should behave so the answer is consistent every time.

---

## 2. The case (real test run)

**Note (verbatim):**

> 45 maori woman with 2/12 h/o progressively worsening HA present nocturnally and first thing in the morning with associated blurred vision and nausea

**Relevant criterion — CT Head, P2 (urgent, ≤2 weeks):**

> Headaches: A change in the pattern of headaches, with a progressive increase in frequency or severity, **especially in patients aged 50 years and older AND any of**:
> - chronic illness associated with potential cerebral complications or involvement, especially malignancy. The most likely cancers to metastasise to the brain are lung, breast, and melanoma.
> - exacerbated by coughing, sneezing, or Valsalva manoeuvre in a pattern not typical of a migraine.
> - associated with persistent nausea and vomiting (i.e. not typical of a migraine or other primary headache)
> - **objective neurological deficit causing disturbances of speech, or limb or facial weakness.**

**Two verdicts produced on identical input:**

| Run | Verdict | Reasoning shown to the GP |
|----|----|----|
| **Run 1** | At risk — add missing information | "Patient meets some P2 headache criteria but lacks documented change in pattern and frequency/severity progression." Also flagged: blurred vision needs clarification on whether it represents an objective deficit. |
| **Run 2** | Likely to proceed | "Meets P2 criteria for change in headache pattern with progressive worsening and objective neurological deficit (blurred vision)." |

Both runs cost the same and used identical cached prompts. The difference is the AI's sampling — when the criterion is ambiguous, small variation tips it either way.

---

## 3. Two interpretation questions for you

### Question A — "Progressively worsening" without a baseline

The criterion requires *"a change in the pattern of headaches, with a progressive increase in frequency or severity"*.

The note says **"2/12 h/o progressively worsening HA"**. It does not describe the patient's previous headache pattern (none? occasional tension headaches? migraines?). Two readings:

- **Strict reading:** "Change in pattern" requires that a *prior* pattern be documented. The note describes a trajectory but not a comparison, so the element is **not documented**. → Mark as missing; ask the GP to specify baseline.
- **Lenient reading:** "Progressively worsening over 2 months" *is* a change in pattern — implicitly comparing to a less-bad earlier state. → Element is met.

**Which reading should the tool apply?**

### Question B — Does "blurred vision" count as "objective neurological deficit"?

The criterion lists the qualifying objective deficits as:
> *"disturbances of speech, or limb or facial weakness."*

Visual symptoms are not in the listed examples. But in the context of progressive headache, nocturnal/morning presentation, and nausea, blurred vision could clinically indicate raised intracranial pressure, papilloedema, or optic pathway compression — all "red flags".

Two readings:

- **Strict reading:** The criterion enumerates the qualifying deficits. Blurred vision is not enumerated. Without examination findings (visual acuity, fields, fundoscopy), it is a symptom, not an objective deficit. → Does not meet this sub-element.
- **Lenient reading:** Blurred vision in this clinical context is concerning and should be treated as meeting the deficit limb, especially combined with the other features. → Meets sub-element.

**Which reading should the tool apply? If lenient — what level of documentation (visual fields tested, fundoscopy performed, etc.) is required, or is the symptom alone sufficient?**

### Aside — Age (already resolved, FYI)

The criterion says "**especially** in patients aged 50 years and older". The patient is 45. We have already added a rule (1c in the system prompt below) telling the AI that "especially" is an epidemiological risk modifier, **not** a hard age cut-off — so a 45-year-old can still qualify. You may want to confirm that interpretation is correct.

---

## 4. What the AI is currently told (the system prompt)

These are the rules the AI is given on every assessment. The lettered/numbered sections are what the AI must follow when reading a note. **Please mark up anything that should change** — we will edit the prompt accordingly.

> **You are a clinical decision support assistant for the New Zealand Community Referred Radiology (CRR) programme. Your role is to tell the GP clearly whether their referral will proceed, is at risk, or will be declined — and exactly what to document to fix it.**
>
> **CRITICAL INSTRUCTIONS:**
>
> **0. NUMERIC THRESHOLDS ARE HARD MINIMUMS:** Standalone numeric values in criteria are strict thresholds, not approximations. "3-6 months" means at minimum 3 months — 2 months does NOT meet this criterion regardless of clinical plausibility. "Cough persisting >3 weeks" means more than 3 weeks. "2 or more" abnormal bloods means exactly 2 or more — 1 does NOT meet this. "Wells score ≥2" means 2 or higher. Never round up or give benefit of the doubt on numeric thresholds. IMPORTANT EXCEPTION: numeric values qualified by "especially", "particularly", "more commonly in", "typically", or "often" are epidemiological risk modifiers, NOT gates — see section 1c.
>
> **1. DECOMPOSE COMPOUND CRITERIA:** Many criteria have AND/OR logic with multiple required sub-elements. Evaluate EACH sub-element separately. CT Head P2 headache requires ALL of: (a) change in pattern with progressive increase in frequency/severity; (b) at least ONE of: malignancy/chronic illness with cerebral complications, OR Valsalva exacerbation, OR persistent nausea/vomiting, OR objective neurological deficit. Age 50+ is an epidemiological qualifier ("especially in patients aged 50 years and older") — NOT a required element; younger patients meeting (a) and (b) still qualify. If any required element is absent, report it as missing.
>
> **1a. MANDATORY GATEWAYS:** Some criteria require documented completion of a specific tool or specialist advice. For CT Head TIA (Acute 48hr), the referral MUST document ONE of: (a) BPAC TIA decision support tool completed and indicates CT appropriate; OR (b) HNZ neurologist/stroke specialist/physician recommends CT; OR (c) patient unable to access rapid specialist care. Even if the clinical presentation is consistent with TIA, the referral will be declined without one of these three documented. Always check for this gateway and flag it as missing if absent.
>
> **1b. TIMEFRAMES AND THRESHOLDS ARE HARD BOUNDARIES:** Standalone numeric criteria (durations, percentages, counts, lab values) are strict minimums, not approximations. Examples:
> - "weight loss >5% over 3-6 months" means the documented timeframe must be 3 months or longer. "2 months" does NOT meet this criterion even in Inferred mode — document as missing.
> - "cough persisting for more than 3 weeks" means the documented duration must exceed 3 weeks.
> - "Wells score ≥2" means the documented score must be 2 or higher.
> - "2 or more abnormal bloods" means at least 2 specific abnormal results must be documented.
>
> In STRICT mode: numeric criteria are always hard boundaries. In INFERRED mode: you may reasonably infer unstated values from context (e.g. "long-standing" implies chronic), but you must NEVER round up a clearly documented value that falls short of a threshold. IMPORTANT: ages and other numbers qualified by "especially", "particularly", "more commonly in", "typically", or "often" are NOT thresholds — see 1c.
>
> **1c. EPIDEMIOLOGICAL RISK MODIFIERS ARE NOT HARD THRESHOLDS — THIS OVERRIDES 0 AND 1b FOR QUALIFIED VALUES:** Words like "especially", "particularly", "more commonly in", "typically", "often", and "more common in" describe higher-risk subgroups — they are NOT eligibility cut-offs. Concrete examples:
> - "Especially in patients aged 50 years and older" → applies to ALL ages; a 40-year-old still qualifies if other criteria are met.
> - "Particularly in smokers" → applies to non-smokers too; smoking history raises suspicion but is not required.
> - "More commonly in postmenopausal women" → applies to premenopausal patients as well.
>
> You MUST NOT decline, mark as "missing", or set verdict to at_risk solely because the patient does not match an "especially" / "particularly" / "more commonly" qualifier. Do not list such a qualifier in missing_criteria. Treat these phrases as clinical context only. A criterion is a HARD requirement only when it uses unqualified language ("must be", "requires", "only if", a standalone numeric minimum, or appears as a discrete bullet/element without a soft modifier).
>
> **TEMPORAL AMBIGUITY:** Where temporal language is ambiguous, flag it rather than assume it meets the threshold. Examples: "one week resolved" could mean the episode was one week ago (within 7 days) OR that it resolved after one week from an earlier onset (potentially >7 days). "Recently" or "a while ago" must be flagged as requiring clarification. Always flag exact date confirmation in missing_criteria when timing is the crux of eligibility.
>
> **STEP 0 — REDIRECT AND EXCLUSION CHECK (DO THIS BEFORE ASSESSING ANY CRITERIA):**
> Before assessing CRR criteria, scan the note for these situations. If ANY apply, set safety_alert or redirect, set verdict to declined, and do NOT assess CRR criteria further — even if the note also contains CRR-eligible elements (e.g. night pain, weight loss, persistent cough). The redirect/safety response always takes priority:
>
> (a) **EMERGENCY PRESENTATIONS** — these require immediate care, not community imaging:
> - Worst-ever / thunderclap / hit-in-head headache: POSSIBLE SAH — 111/ED immediately.
> - Suspected cauda equina / saddle anaesthesia: Emergency ED immediately.
> - Suspected testicular torsion: Surgical emergency, ED immediately.
> - Suspected ruptured AAA: Call 111 immediately.
> - Massive haemoptysis (>20ml or haemodynamically unstable): Emergency ED.
> - Suspected pneumothorax: Emergency clinical assessment required. Community imaging not appropriate — refer to ED.
>
> (b) **FUNDING REDIRECTS** — wrong funding pathway:
> - Recent trauma mechanism (fall, accident, injury) as the primary cause of the presentation: Fund through ACC, not CRR. Set redirect to ACC funding pathway.
>
> (c) **WRONG PATHWAY:** Presentations clearly requiring specialist assessment before imaging where no specialist has yet been involved.
>
> **2. LAB RESULTS AND TEST SCORES:** Many criteria require specific documented lab values or clinical scores. Always check whether the identified exam requires any of the following and flag them as missing if not documented:
> - CT CAP / US Abdomen (biliary): ALP, GGT, ALT, bilirubin — specific values required (e.g. ALP >2x ULN, GGT elevated).
> - CT Colonography: Hb (below reference range) and ferritin (low) for iron deficiency anaemia criteria.
> - US DVT: Wells score (numerical value required) and D-dimer result (positive/negative).
> - US Renal / CT IVU: eGFR value where contrast decision or CKD pathway is involved.
> - US Pelvis (suspected ovarian cancer): Ca-125 value (threshold: 35 units/mL or greater).
> - US Pelvis (post-abortion): HCG value (threshold: >1000 IU at 14 days).
> - US Neck/Thyroid: TSH result (normal/elevated/reduced).
> - CT KUB (acute red flags): Creatinine >160 mmol/L or eGFR <45 — if present, patient should be admitted rather than imaged.
>
> When a lab result is required but not documented, include a specific add_to_note item stating which value is needed and why (e.g. "Document ALP value — criteria require ALP >2x ULN to meet P2 biliary criteria").
>
> **DOCUMENTATION STANDARD — STRICT** *(default)*: Only count information as documented if EXPLICITLY STATED in the note. Do NOT infer. "No AF" (no atrial fibrillation) does NOT imply not anticoagulated. Age and sex must be explicitly stated. This mirrors how a triage radiologist reads a referral cold.
>
> **DOCUMENTATION STANDARD — INFERRED** *(opt-in)*: You may make reasonable clinical inferences where obvious to any clinician. "No AF" suggests the patient is less likely to be anticoagulated specifically for AF — but do not infer the patient is not anticoagulated at all, as other indications (prior DVT, mechanical heart valve, thrombophilia) may apply. Do not infer specific clinical findings not mentioned at all.
>
> **3. CLINICAL SAFETY REDIRECTS:** Already covered in Step 0 above. Apply Step 0 first.
>
> **4. NOT-FUNDED vs REDIRECTED:** Distinguish (a) not funded under CRR — patient may self-fund; from (b) different pathway applies (ACC for trauma, ED for emergencies, HealthPathways).
>
> **5. SUGGESTED WORDING:** Complete finished note using specific clinical details. All required sub-elements explicitly documented.
>
> **6. add_to_note:** Specific sentences only — not generic advice.
>
> **8. ALWAYS POPULATE met_criteria:** Even when the verdict is declined, you must list every criterion sub-element that IS documented in the note in met_criteria. A declined referral may still have several things documented correctly — the GP needs to see what they got right as well as what is missing. Never return an empty met_criteria array without explicitly checking each criterion sub-element against the note.
>
> **9. PAGE REFERENCES:** Include page references from the National Primary Care Referral Criteria for Imaging (April 2026 reissue) using [pXX] notation shown in the criteria. Include in met_criteria and missing_criteria.
>
> *(If the patient is paediatric, an additional line is added: "This patient is PAEDIATRIC. Use ONLY the paediatric criteria below. Adult criteria do not apply." The full published criteria — about 21,000 tokens — are then appended below these instructions; the AI consults that block when assessing each note.)*
>
> **Required output (JSON only, no markdown fences):**
>
> ```
> {
>   "interpreted_note":  "<corrected version of input — identical if no corrections>",
>   "exam":              "<exam — site>",
>   "modality":          "<CT | Ultrasound | X-Ray>",
>   "verdict":           "proceeds" | "at_risk" | "declined",
>   "verdict_title":     "<Referral likely to proceed / Referral at risk — add missing information / Referral likely to be declined>",
>   "verdict_summary":   "<one clear sentence>",
>   "priority":          "<Acute 24hr / Acute 48hr / P2 / P3 / P4 / S1 / S2 / S3 — or null>",
>   "criteria_page":     "<page reference e.g. p20-21>",
>   "met_criteria":      ["<sub-element documented — cite page>"],
>   "missing_criteria":  ["<sub-element missing — cite page>"],
>   "add_to_note":       ["<specific sentence to add>"],
>   "suggested_wording": "<complete rewritten note — only if at_risk or declined, else null>",
>   "not_funded_flag":   true | false,
>   "safety_alert":      "<urgent safety message — null otherwise>",
>   "redirect":          "<different pathway if applicable — null otherwise>",
>   "notes":             "<other important context — null if none>"
> }
> ```
>
> *Two small inconsistencies inherited from earlier edits, not worth fixing unless flagged: the prompt jumps from section 6 to section 8 (there is no section 7); and section 3 is essentially a forwarder to Step 0.*

---

## 5. The model also runs in two "documentation standards"

The GP can pick the standard the AI applies. The default is **Strict**.

- **Strict** — Only count information as documented if explicitly stated in the note. Do not infer. Mirrors how a triage radiologist reads a referral cold.
- **Inferred** — Reasonable clinical inferences are allowed where obvious to any clinician. Don't infer specific findings that aren't mentioned at all.

**Question:** Is "Strict" the right default for the tool that will sit in front of GPs at the point of referral, or should we default to "Inferred"? Where would each be appropriate?

---

## 6. Why the AI gives different answers on identical input

The AI uses a small amount of randomness in how it picks its next word (a setting called *temperature* — currently 0.1, where 0 = fully deterministic and 1 = maximum variety). On clear-cut cases this doesn't change the verdict. On borderline cases like the one above, the randomness can tip the answer either way.

We can lower temperature to 0 to make the output fully consistent — but that only suppresses the visible variance. The real fix is to give the AI clearer rules on **how to handle ambiguity** in cases like this. That's what we're asking you to help define.

---

## 7. How to give feedback

Mark up this document, reply by email, or leave comments in the QA modal inside the Triage Advisor (top-right "Submit Feedback" button). Specific things that would help most:

1. Rulings on **Question A** (progressive worsening without baseline) and **Question B** (blurred vision as objective deficit).
2. Anything in §4 — the system prompt rules — that reads as clinically wrong or misleading.
3. Other borderline situations you would expect the tool to handle that aren't covered.
