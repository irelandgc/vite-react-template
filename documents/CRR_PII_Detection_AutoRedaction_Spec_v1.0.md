# CRR — PII Detection and Auto-Redaction Specification

**Version 1.0 · September 2026 · ARCH-MIG-01 slice 4b**
**Supersedes:** v0.2 (April 2026). v0.2 described a client-only redaction pipeline plus a server gate that *rejected* on PII. In the two-stage architecture the extraction route is internal and receives a note that may not have been through the client courtesy pipeline (KI-32), so **the server now redacts** and only hard-rejects on a residual NHI.

**Implemented by:** `public/crr-criteria/api/pii.ts` · **Tests:** `public/crr-criteria/api/test/pii.test.ts` · **Consumed by:** `POST /api/assess/extract`

---

## 1. Where it runs

```
calling application ──► POST /api/assess/extract (internal, SD-11)
                          │
                          ▼
              ┌───────────────────────────────┐
              │ pii.ts — SERVER-SIDE GATE     │
              │  1. pre-correct PII-relevant  │
              │     typos (street/label/city) │
              │  2. detect + redact 7 categories
              │  3. residual scan: NHI still   │
              │     present  ─►  422, NOT SENT │
              │  4. < 30 chars of clinical     │
              │     detail left  ─►  422       │
              └───────────────┬───────────────┘
                              │  redacted note only
                              ▼
              prompt assembly ─► model provider
```

The **redacted note is the only text the model sees** and the only text the
validation gate checks quotes against. The client-side pipeline
(`triage/index.html`) is retained as a courtesy (KI-32) — it gives the clinician
a review step — but is never relied on.

## 2. Difference from v0.2

| | v0.2 | v1.0 |
|---|---|---|
| Client pipeline | primary control, auto-redacts + review UX | unchanged, now a courtesy layer only (KI-32) |
| Server behaviour | reject with 422 if PII detected, no redaction | **redact**; reject (422) only if an NHI survives redaction, or < 30 chars of clinical detail remain |
| Rationale for server redaction | — | the internal extract route may receive an un-redacted note; the model must still get a clean note |
| Residual policy | n/a | `residualNhi()` re-scans the redacted text; an old-format NHI candidate or a check-valid new-format one that survived → **hard reject, request not sent** |

Soft categories (name, address, DOB, phone, email, referrer) that slip a pattern
are a residual risk covered by user education + Anthropic zero-retention + no
storage (v0.2 §7.3), not a hard reject — the same position as v0.2.

## 3. Pattern coverage (≥ the client pipeline)

Ported verbatim from `triage/index.html` `detectAndRedactPII` and the NHI
validators (`_validateNHIOld` / `_validateNHINew`). Rule order is preserved:
earlier rules consume matches before later rules see them.

| Stage / category | Patterns | Positive tests | Negative tests |
|---|---|---|---|
| **1 Pre-correction** | street-type typos (Stree→Street, …), NZ city typos, label typos (Patinet→Patient, Adress→Address, Surnam→Surname) | address test asserts a corrected typo still matches | — |
| **2 NHI** | labelled (`NHI:` / `NHI #` / `NHI`, any format); old `AAANNNC` on pattern alone (a mistyped NHI is still PII); new `AAANNAX` unlabelled requires a valid check character (mod-23 **and** mod-24 legacy) | labelled ×3; old-format ×3; new-format valid (`ALU18KZ`) | new-format invalid-check `XYZ99AB` NOT redacted; clinical numeric runs (`CRP 45`, `Hb 98`, `eGFR 52`) untouched |
| **2 Name** | PMS header labels (line-consuming); `Re:`/`Dear Dr … re:`; salutation + 1–2 caps (title consumed); bare `Firstname Lastname` + clinical-context verb, with a 50-term clinical-adjective exclusion list | header ×2; salutation ×2; bare name ×2 | `Lateral Epicondylitis is suspected`, `Frozen Shoulder is confirmed`, `Progressive Weakness has worsened` untouched |
| **3 DOB** | labelled (`DOB:` / `Date of Birth` / `Born` / `D.O.B.`); date + age combo (age preserved) | labelled ×2; date+age preserves `(67 years)` | isolated clinical date `symptoms started 15/03/2026` untouched |
| **4 Address** | labelled (`Address:` / `Street:` / `Suburb:` / `City:`); NZ street pattern + optional trailing city; `lives in`/`from`/`resides in`/`based in`/`of` + ~130 NZ places | labelled; street+city; place context; typo-corrected street | — |
| **5 Contact** | NZ phone (`02x` / `0x` / `+64`); email | phone ×2; email ×1 | — |
| **6 Referrer** | labelled (`Referrer:` / `Referring Doctor:` / `GP:` / `Practice:` / `Provider:` / `Clinic:`); `HPI:` + 6-char HPI | referrer label ×1; HPI ×1 | — |
| **residual** | `residualNhi()` post-redaction re-scan | markers ignored; a bare surviving `ABC1234` flagged | — |
| **insufficiency** | `isInsufficientAfterRedaction()` — < 30 chars of non-marker text | over-redacted note flagged; a normal clinical note not | — |

**Test file: 22 tests, all passing.** Known limitation carried from the client
pattern: NZ landlines with a single-digit area code followed by a space
(`03 555 1234`) are not matched by the ported phone regex — recorded, not fixed
in this slice (a client-pattern change, out of scope; the client and server must
stay identical).

## 4. What is NOT redacted, deliberately

- Age (preserved when a DOB is redacted — clinically relevant, non-identifying)
- Clinical dates, lab values, weights, medication names — never touched
- The pre-correction pass only rewrites PII-relevant tokens; the model still
  receives the original spelling of everything clinical (the corrected text is
  used only for the scan).

## 5. Residual risk

Unchanged from v0.2 §7.3: pattern-based detection cannot guarantee 100 % recall.
A clinician could describe a patient identifiably without triggering a pattern.
Mitigations: user-education banner, no storage of note text by default
(`AUDIT_STORE_REDACTED_NOTE` off — SD-12), Anthropic zero-retention, the
three-layer architecture. The **new** mitigation in v1.0 is that the server no
longer trusts the client to have redacted.

## 6. Governance

- The server pipeline and the client pipeline must carry the **same** patterns.
  A change to one is a change to both, in the same PR.
- The Azure OpenAI residency path (NFR-009) does not change this spec — redaction
  happens before the provider is chosen.
