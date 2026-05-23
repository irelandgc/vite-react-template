# Claude Code Brief: Criteria Data Chain Verification and Fix

**Date:** 23 May 2026  
**Priority:** HIGH — 4 of 6 regressions in v2.0.0 prompt testing are caused by missing criteria data, not prompt logic  
**Context:** Regression testing of prompt v2.0.0 revealed 4 cases where the AI correctly found no matching criteria in the data — but evaluators expected matches. We need to trace each failure through the full data chain (PDF → JSON → D1 → SITE_INDEX) to find where the gap is, fix it, and then verify the fix didn't introduce new gaps elsewhere.

---

## The 4 data gap cases

### Case 1: Paediatric knee/bone pain (RP-005)
- **Clinical note:** 8yo boy, progressive lower leg pain, night pain, limp
- **Exam type:** Knee X-ray
- **AI said:** "CRR X-ray pathways specifically exclude children under 16 years"
- **Evaluator expected:** Proceeds — paediatric bone pain criteria met (p104)
- **Suspected layer:** JSON → DB load (known paediatric ID collision — 61 items without `_p` suffix)

### Case 2: Paediatric hip / SUFE (CR-002)
- **Clinical note:** 13yo boy, knee pain, restricted hip ROM, limp
- **Exam type:** Hip X-ray
- **AI said:** No paediatric hip criteria found, redirected to SUFE assessment
- **Evaluator expected:** Proceeds — hip pathology in adolescent
- **Suspected layer:** Same as Case 1 — paediatric ID collision

### Case 3: IUCD / Mirena malposition (LP-004)
- **Clinical note:** 35yo, Mirena, lower abdo pain, PV bleeding, ?IUD malpositioned
- **Exam type:** Ultrasound Pelvis
- **AI said:** "IUD position assessment is not covered under CRR criteria"
- **Evaluator expected:** Proceeds — IUCD malposition criteria met (p46)
- **Note:** v1.0.0 handled this case correctly for Louise (rated "accurate") — so the data was available at some point

### Case 4: Female microscopic haematuria (CR-003)
- **Clinical note:** 64yo female, persisting microscopic haematuria, no infection
- **Exam type:** Renal Ultrasound
- **AI said:** "Microscopic haematuria in female patients of any age is not routinely funded under CRR criteria"
- **Evaluator expected:** Proceeds — microscopic haematuria, female, any age (p53)
- **Note:** The AI explicitly listed met criteria including "Microscopic haematuria — female patient [p53]" but then said the criteria only apply to males. Need to check whether the criteria text genuinely restricts this to males or the AI is misreading.

---

## Verification process

For EACH of the 4 cases, trace the data through every layer. Document findings at each layer before proceeding to the next.

### Layer 1: PDF source (reference only)
We can't read the PDF programmatically, but we have `pdf-criteria-all.json` as the authoritative extraction. Note the relevant page references (p104, p46, p53, p71) for manual PDF cross-check later if needed.

### Layer 2: JSON source file
Search `pdf-criteria-all.json` for each case:

**Case 1 & 2 (paediatric):**
- Search for items on p104, p106, p71 that relate to paediatric knee, hip, bone pain
- Search for any items with "paediatric", "child", "pediatric", "SUFE"
- Check whether item IDs have `_p` suffix or not
- List all paediatric items found and their IDs

**Case 3 (IUCD):**
- Search for items on p46 relating to IUCD, IUD, Mirena, intrauterine
- List items found, their IDs, and which exam site they're mapped to

**Case 4 (haematuria):**
- Search for items on p53 relating to microscopic haematuria
- Check whether criteria text specifies gender restrictions
- List the exact criteria text for haematuria items — does it say "male" or is it gender-neutral?

### Layer 3: D1 database
For each item found in Layer 2, query D1 to check:
- Does the item exist in the database?
- Is the item ID correct (check for `_p` suffix on paediatric items)?
- Is it mapped to the correct exam site?
- Is the criteria text complete and accurate?
- Are there ID collisions (same ID used for adult and paediatric items)?

```sql
-- Example queries
SELECT * FROM criteria_items WHERE id LIKE '%p104%' OR page_ref = 'p104';
SELECT * FROM criteria_items WHERE criteria_text LIKE '%IUCD%' OR criteria_text LIKE '%IUD%' OR criteria_text LIKE '%Mirena%';
SELECT * FROM criteria_items WHERE criteria_text LIKE '%haematuria%' AND page_ref = 'p53';
SELECT * FROM criteria_items WHERE criteria_text LIKE '%paediatric%' OR criteria_text LIKE '%child%';
-- Check for ID collisions
SELECT id, COUNT(*) as cnt FROM criteria_items GROUP BY id HAVING cnt > 1;
```

Adjust queries to match actual table/column names in the schema.

### Layer 4: SITE_INDEX build
For each item that exists in D1, verify it appears in the SITE_INDEX data served to the Triage Advisor:
- Call `GET /crr-api/site-index` (or however SITE_INDEX is built/served)
- Check whether the items appear under the correct exam type key
- For paediatric items, check whether they appear under the paediatric exam variant or the adult exam variant

### Layer 5: Triage Advisor prompt assembly
For each exam type involved, check what criteria text `buildSystemPrompt()` assembles. The criteria may be in D1 and SITE_INDEX but not included in the prompt for the specific exam the evaluator selected.

---

## Output: Verification report

Save to `instructions/criteria-data-verification-report.md` with this structure:

For each case:
```
### Case N: [description]

**Layer 2 (JSON):** Found / Not found. Item IDs: [list]. Details: [what was found]
**Layer 3 (D1):** Found / Not found / ID collision. Details: [query results]
**Layer 4 (SITE_INDEX):** Found / Not found. Mapped to exam: [exam type]. Details: [what was found]
**Layer 5 (Prompt assembly):** Included / Not included for exam type [X]. Details: [what was found]

**Root cause:** [which layer is the gap]
**Fix required:** [specific fix]
```

---

## Fix implementation

After the verification report identifies the root cause for each case, implement fixes:

### If Layer 2 (JSON) is the gap:
- Items missing from `pdf-criteria-all.json` need manual addition. Flag for Gary to cross-check against the PDF source and add.

### If Layer 3 (D1 load) is the gap:
- For paediatric ID collisions: implement the `_p` suffix fix per the existing data load instructions (`claude-code-data-load-instructions.md`). This is the known fix for 61 colliding items.
- For other missing items: investigate the load script to determine why items present in JSON weren't loaded.

### If Layer 4 (SITE_INDEX) is the gap:
- Fix the SITE_INDEX build query to include the missing items under the correct exam type.
- Check `INDICATION_THEME_MAP` for missing mappings.

### If Layer 5 (Prompt assembly) is the gap:
- Fix `buildSystemPrompt()` or the criteria text builder to include the items for the relevant exam type.

---

## Post-fix verification

After implementing fixes:

1. Re-run the Layer 3 and Layer 4 checks to confirm items are now present
2. Re-run the 4 regression test cases (RP-005, CR-002, LP-004, CR-003) using prompt v2.0.0 against the fixed data
3. Also re-run ALL other evaluator cases to confirm no new regressions from the data fix
4. Save results to `instructions/criteria-data-fix-verification-results.md`

---

## Additional: full data quality audit

While investigating these 4 specific cases, run a broader check:

1. **Paediatric ID collisions:** List all items in `pdf-criteria-all.json` that have paediatric equivalents. Confirm all 61 known collisions. Verify the `_p` suffix fix resolves all of them.

2. **Exam site mapping completeness:** For every item in `pdf-criteria-all.json`, verify it maps to at least one exam type in SITE_INDEX. List any orphaned items.

3. **Gender-specific criteria:** List all criteria items that include gender qualifiers ("male", "female", "men", "women"). This helps identify other potential cases like CR-003 where gender restrictions may be misapplied.

4. **Item count reconciliation:** Compare total item counts: JSON file → D1 → SITE_INDEX. Any drop between layers indicates lost items.

Save the audit results to `instructions/criteria-data-quality-audit.md`.
