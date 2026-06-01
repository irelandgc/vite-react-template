# Claude Code Brief: Post-Processing Verdict Validation

**Date:** 1 June 2026  
**Priority:** HIGH — addresses stochastic verdict inconsistency that no prompt change can reliably fix  
**Scope:** Add a deterministic validation layer after the AI returns its JSON, before displaying to the user

---

## IMPORTANT: Do not modify the system prompt. This is a code-only change.

---

## Problem

The AI sometimes reasons correctly in its notes/met_criteria but sets the wrong verdict. For example, it writes "hepatomegaly pathway meets P3 criteria" in the notes field, lists the criterion in met_criteria with no corresponding missing_criteria for that pathway, then sets verdict to "declined" or "at_risk". This happens stochastically — same prompt and input produce different verdicts on different runs.

This affects cases RP-002, TEST-004, CR-003, and potentially any case where multiple pathways exist.

---

## Solution

After the AI returns its JSON response and it has been parsed, run the following validation checks before displaying the result. If any check triggers, override the verdict, log the override, and display the corrected result.

### Check 1: Notes say "met" but verdict disagrees

Scan the `notes` field for phrases indicating a pathway is fully met:
- "fully met"
- "meets criteria"
- "meets P1 criteria" / "meets P2 criteria" / "meets P3 criteria" / "meets P4 criteria"
- "meets acute" / "meets urgent"
- "pathway is met"
- "pathway is fully met"
- "sufficient for acceptance"
- "criteria are met"

If any of these phrases are found AND verdict is not "proceeds", override verdict to "proceeds".

If the notes also contain a priority reference (P1, P2, P3, P4, Acute 48hr, Urgent, Non-deferrable, Routine), set the priority from the first match if priority is currently null.

### Check 2: Gender-inapplicable criteria in missing

Detect patient gender from the clinical note or interpreted_note (look for "female", "male", "woman", "man", "girl", "boy", and standard abbreviations "F", "M" when used as gender identifiers).

Scan `missing_criteria` for gender-specific terms:
- If patient is female: remove any missing_criteria items containing "male patient", "in men", "male,", "male older than"
- If patient is male: remove any missing_criteria items containing "female patient", "in women", "female,", "female of any age"

After removal, if `missing_criteria` is now empty AND `met_criteria` is not empty, override verdict to "proceeds".

### Check 3: Missing criteria only from non-deciding pathways

If verdict is "at_risk" or "declined" AND met_criteria contains items with page references, AND missing_criteria contains items with different page references or different pathway indicators than the met items — check whether the met items alone constitute a complete pathway.

This is harder to do deterministically. A simpler proxy: if the notes field mentions a pathway being "fully met" or "independently met" but missing_criteria is populated with items from a different pathway, move those missing items to the notes field and set verdict to "proceeds".

### Check 4: Post-Step-0 redirect overriding met criteria

If `redirect` is populated AND `met_criteria` is not empty AND the redirect does NOT match Step 0 patterns (emergency, ACC, trauma), move the redirect content to the notes field as advisory and set verdict to "proceeds".

Step 0 redirect patterns to preserve (do NOT override these):
- Contains "111" or "ED" or "emergency"
- Contains "ACC" and "trauma" or "injury" or "accident"
- Contains "cauda equina" or "testicular torsion" or "ruptured AAA" or "pneumothorax"

Any redirect that doesn't match these patterns is a post-Step-0 advisory redirect and should not override a met criterion.

---

## Implementation

### Where to add it

In the shared assessment function (post-BUG-002 refactor), after JSON parsing and before returning the result to the UI. Both standard mode and compare mode must use the same validation.

```
API call → JSON parse (with code fence stripping) → POST-PROCESSING VALIDATION → display to user
```

### Logging

When any override is applied, add an `_overrides` array to the response object:

```json
{
  "_overrides": [
    {
      "check": "notes_say_met",
      "original_verdict": "declined",
      "new_verdict": "proceeds",
      "trigger": "notes contain 'hepatomegaly pathway meets P3 criteria'",
      "timestamp": "2026-06-01T..."
    }
  ]
}
```

This array should be:
- Visible in the usage log (so we can track how often overrides happen)
- Visible in the admin tool usage view
- NOT visible to the end user — they just see the corrected verdict

### Edge cases

- If multiple checks trigger, apply all of them. Log each override separately.
- If Check 1 triggers but the notes also contain a Step 0 redirect phrase (emergency, ACC), do NOT override — Step 0 takes precedence.
- If the AI returned verdict "proceeds" already, skip all checks — no override needed.
- Do not override if met_criteria is empty — an empty met_criteria with "meets criteria" in the notes is likely a hallucination.

---

## Testing

After implementation, run the following cases and verify the override triggers correctly:

1. **RP-002** (US Abdomen, hepatomegaly + HCC) — run 5 times. On runs where the AI returns "declined" or "at_risk" but notes say hepatomegaly is met, the override should fire and correct to "proceeds".

2. **CR-003** (Renal US, female haematuria) — run 5 times. On runs where the AI lists male-only criteria as missing for a female patient, Check 2 should remove them and correct to "proceeds".

3. **LP-001** (CXR, CAP) — run once. Should NOT trigger any override — already correct.

4. **LP-002** (Spine XR, trauma) — run once. Should NOT trigger any override — ACC redirect is a Step 0 redirect and must be preserved.

5. **Thunderclap headache** — run once. Should NOT trigger any override — emergency redirect is Step 0.

Report results including how many overrides fired across the 5x runs of RP-002 and CR-003.

---

## What NOT to do

- Do not modify the system prompt
- Do not change the AI model or temperature
- Do not iterate on this — implement, test, report results. No autonomous fixes.
