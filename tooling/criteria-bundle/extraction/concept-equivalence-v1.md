# Concept equivalence list v1

**Status: NEEDS CLINICAL REVIEW.** No entry below has been confirmed by a clinician.
**Owner:** clinical. **Versioned with:** extraction prompt **v3.0.0 only** (`prompt-v3.0.0.json` names `equivalenceListVersion`). Prompt v3.0.1 and later use `concept-equivalence-v1.1.md`, which carries E-01–E-03 unchanged and adds E-04/E-05.
**Replaces:** system prompt v2.3.0 STEP 2 "CLINICAL SHORTHAND EQUIVALENCE" (decomposition clause 14) — the clause that caused the fabrication finding (KI-01, KI-04).

---

## What this list is

The extraction model answers a Questionnaire item from the note. Sometimes the note's words
are not the item's words. This list is the **closed set** of phrase-to-item equivalences that
still earn `documented`.

The rule the list exists to enforce:

> An equivalence is **definitional** — the phrase and the item are the same fact stated in
> different words, and no clinician could read the phrase and doubt the item. Anything that
> requires a clinical reasoning step is `inferred`, is not on this list, and (under the
> default `strict` documentation standard) does not establish a criterion.

Why a list rather than a rule: v2.3.0 gave the model an open licence ("standard clinical
shorthand that inherently implies a criteria element should be accepted … accept and note the
inference in the notes field"). The model decided what counted, and the notes field made an
inference look like a finding. Here the model still labels every answer, and the set of
phrases that may be labelled `documented` on grounds of equivalence is finite, reviewed and
versioned.

**This list never adds a fact.** It only says that two forms of words are the same fact. If the
note does not state the concept in *any* form, the item is omitted (contract rule 1).

## What is not on this list, and why

| Not here | Because |
|---|---|
| Qualitative lab statements ("Hb mildly low" → `lab.hb.low`) | Contract rule 9 (KI-06). A property of the indicator's type, not of a phrase — every boolean lab flag behaves this way, so it is a rule, not an entry. |
| Calculations ("80 kg → 74 kg" → 7.5 %) | Contract rule 3: `inferred`, always. |
| Negations ("no localising signs" → `false`) | Contract rule 6: already `documented`; not an equivalence. |
| Abbreviations that are the item's own words (`wt loss`, `SOB`, `abdo pain`) | Not equivalences — the same term abbreviated. Contract rule 2's "trivially rephrased fact" covers them. |
| Anything diagnostic ("ex-smoker with weight loss" → suspicion of malignancy) | A reasoning step. `inferred` at best; usually omit. |

---

## Live entries

Each entry binds a phrase to a Questionnaire item that exists **today** in the national
vocabulary (`vocabulary/indicators.json` v1.0.0). The quote recorded with the answer is the
note's phrase, not the item's text.

### E-01 — "tired all the time" ⇒ fatigue

| | |
|---|---|
| **Phrase forms** | "tired all the time", "TATT", "always tired", "exhausted", "no energy" |
| **Item** | `symptom.fatigue` — "Fatigue" |
| **Value / status** | `true` / `documented` |
| **Why definitional** | Fatigue *is* the clinical term for the state the phrase describes. There is no intermediate proposition; a clinician reading "TATT" has not deduced fatigue, they have read it. "TATT" is the standard NZ primary-care abbreviation for exactly this. |
| **Does not earn** | Any severity, duration or cause. Nothing about `weightloss.*`. |

### E-02 — "worsening" / "progressive" ⇒ increasing

| | |
|---|---|
| **Phrase forms** | "progressive", "worsening", "getting worse", "increasing" |
| **Item** | any item whose published text uses "progressive" or "increasing" of the same symptom — today: `symptom.persistentAbdominal` ("Persistent or progressive abdominal symptoms") |
| **Value / status** | `true` / `documented` |
| **Why definitional** | The words are synonyms in this register: "worsening abdominal pain" and "progressive abdominal symptoms" assert the same trajectory of the same symptom. No inference about cause, severity or duration is involved. |
| **Does not earn** | The *symptom* itself if the note names a different one ("worsening headache" does not answer an abdominal item). Any duration — "progressive over months" does not answer a `periodMonths` item (contract rule 5). |
| **Reviewer note** | v2.3.0 applied this to CT Head's "change in pattern of headaches with progressive increase in frequency or severity". That item does not exist yet (CT Head is transcribed at slice 7). When it does, confirm whether "progressive headache" alone answers a compound item that also requires *change in pattern* — this list must not be used to satisfy the other half of a compound. |

### E-03 — "clothes loose" ⇒ unintentional weight loss present

| | |
|---|---|
| **Phrase forms** | "clothes are loose", "clothes hanging off", "trousers falling down", "had to take belt in" |
| **Item** | `weightloss.present` — "Unintentional, unexplained weight loss" |
| **Value / status** | `true` / `documented` |
| **Why definitional** | Carried over from the existing contract (rule 4), which already states this equivalence. |
| **Does not earn** | `weightloss.percent`, `weightloss.periodMonths` or `weightloss.measured` — never. Loose clothing carries no number and is explicitly *not* a recorded weight (contract rule 4 and the existing example). |
| **⚠ THE ENTRY TO SCRUTINISE FIRST** | This is the weakest entry in the list and the one most likely to be wrong. The others restate a fact in different words; this one reasons from an observation to a cause. Loose clothing can follow resolving oedema, a different garment, or a change in posture. **Reviewer question:** is "clothes loose" a lay *description* of weight loss (definitional, keep) or *evidence from which weight loss is concluded* (a reasoning step — move to `inferred` and drop from this list)? If it moves, contract rule 4's example changes with it. The programme has no preference; the encoded reading is "keep", inherited, not chosen. |

---

## Held entries — not live, no item to bind to yet

These are on the v2.3.0 list and are expected to become live entries when the exam/site that
publishes the item is transcribed (slice 7). They are recorded here so the transcription
session does not have to rediscover them, and so a reviewer sees the whole intended set. **The
prompt does not carry them; the model must not apply them.**

| # | Phrase | Item it will bind to | Blocked on | Note for the transcription session |
|---|---|---|---|---|
| H-01 | "post-menopausal", "postmenopausal", "PMB" (for the menopausal state, not the bleeding) | the US Pelvis - Adult item published as "> 12 months amenorrhoea around the expected age of menopause" (p44–p49) | US Pelvis - Adult transcription | The strongest candidate in the whole list: the published item text is the *definition* of the term, so the equivalence is a dictionary lookup. Confirm the "around the expected age of menopause" half is not lost — a 32-year-old described as post-menopausal is a different clinical situation and may need the item left unanswered. |
| H-02 | "expanding mass", "growing lump" | a soft-tissue mass item using "increasing in size" | US Soft Tissue Mass transcription | Same shape as E-02. Watch for `redflag.paedSoftTissueMassSuspiciousFeatures`, whose published text already includes "rapidly growing" — that is a red flag with its own judgement, and this equivalence must not be used to fire it. |

---

## Review checklist

1. Is each live entry **definitional**, or does it require a clinical reasoning step? (E-03 is the live question.)
2. Are the phrase forms complete enough to be useful, and narrow enough that none of them could be written about a *different* patient state?
3. Does any entry earn an item beyond the one named — particularly a numeric or duration item? (It must not.)
4. Should any held entry be dropped rather than carried to its transcription session?
5. Is a phrase missing that evaluators saw in real notes and the tool got wrong? (The four benchmark ground-truth cases in `../benchmark/ground-truth/` are the only real notes this list has been read against.)

## Change control

An entry is added, changed or removed only with a clinical ruling recorded against it. Any
change is a new version of this file **and** of the prompt that names it: the prompt's
`equivalenceListVersion` and this file's version move together, so an assessment's stamped
prompt version identifies exactly which equivalences were in force (invariant 8).
