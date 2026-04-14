# CRR Triage Advisor — PII Detection and Auto-Redaction Specification
## Version 0.2 · April 2026 · Reflects implemented system (v2.1.1)

---

## 1. Purpose and Security Rationale

The CRR Triage Advisor processes free-text clinical notes to assess them against the National Radiology Access Criteria. These notes are submitted by primary care clinicians who may inadvertently include patient-identifiable information (PII) — particularly when copy-pasting from their PMS.

If the PII detection and auto-redaction layer can demonstrably prevent patient-identifiable information from reaching the Anthropic API, the tool's data classification changes fundamentally:

| Scenario | Data Classification | Security Posture |
|----------|---------------------|------------------|
| PII reaches API | Identifiable health information | Requires health data residency, privacy impact assessment, data processing agreement, HIPC compliance |
| PII blocked/redacted before API | De-identified clinical scenario | Equivalent to clinical reference tool (HealthPathways, UpToDate, Google search of clinical question) |

**The argument:** A clinical note stripped of NHI, patient name, DOB, address, and contact details is a clinical scenario description — the same category of information found in a medical textbook case study. No reasonable person could re-identify the patient from "74M with sore knee, frozen shoulder. Intense pain. 3 weeks duration." The security and privacy requirements for processing de-identified clinical scenarios are materially lower than for identifiable health information.

**What this simplifies:**
- Data residency requirements (de-identified scenarios are not subject to the same jurisdictional constraints as identifiable health information)
- The case for Azure OpenAI migration becomes less urgent (though may still be desirable for other reasons)
- Privacy Impact Assessment scope narrows significantly
- The tool sits alongside other clinical reference tools in the HNZ security landscape, not alongside clinical information systems

---

## 2. Architecture — Four-Stage Client-Side Pipeline + Server Gate

```
┌────────────────────────────────────────────────────────────────┐
│  LAYER 1: USER EDUCATION                                       │
│  Privacy banner · Usage policy · "Do not enter PII" messaging  │
│  ► First line of defence — sets user expectation               │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  LAYER 2: CLIENT-SIDE PII PIPELINE (runs in browser)           │
│                                                                │
│  Stage 1 — PRE-CORRECTION                                      │
│  Fix common misspellings that would cause PII patterns to be   │
│  missed (street type typos, label typos, city name typos).     │
│  Only corrects PII-relevant terms; clinical text untouched.    │
│                                                                │
│  Stage 2 — PII DETECTION + AUTO-REDACTION                      │
│  Scans corrected text for PII patterns across 7 categories.    │
│  Auto-replaces detected PII with [TYPE REDACTED] markers.      │
│                                                                │
│  Stage 3 — REVIEW                                              │
│  Shows redacted version to user with highlighted changes.      │
│  User confirms, edits, or cancels. No data leaves browser      │
│  until user confirms the redacted version.                     │
│                                                                │
│  Stage 4 — SUBMISSION                                          │
│  Only the confirmed redacted text is transmitted.               │
│  Original un-redacted text is never sent.                      │
│  Detection event logged (pattern types only, not content).     │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  LAYER 3: SERVER-SIDE PII GATE (Cloudflare Worker)             │
│  Runs in the Hono Worker before forwarding to Anthropic API    │
│  ► Same detection rules as client-side (belt and braces)       │
│  ► If PII detected: rejects request with 422 status            │
│  ► Does NOT auto-redact (server should never see PII)          │
│  ► Logs rejection event for audit (pattern type only)          │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  ANTHROPIC API                                                  │
│  Receives de-identified clinical scenario text only             │
│  No patient data · No NHI · No names · No addresses            │
└────────────────────────────────────────────────────────────────┘
```

**Why auto-redact at client but reject at server:**

The client-side layer is the primary UX-facing control. It auto-redacts and shows the user what was changed, giving them a chance to review and confirm. This is the cooperative interaction — "we've cleaned your note for you."

The server-side layer is the safety net. If PII somehow bypasses the client (e.g., JavaScript disabled, modified client, API called directly), the server rejects the request outright. It does NOT auto-redact because the purpose of this layer is to prevent PII from being processed at all — not to provide a usable experience.

---

## 3. Stage 1 — Pre-Correction Pass

Before PII detection runs, the system corrects common misspellings that would cause PII patterns to be missed. Only PII-relevant terms are corrected; clinical text is left untouched.

### 3.1 Street Type Misspellings

| Misspelling | Corrected to |
|------------|-------------|
| Stree, Streeet, Sreet, Stret | Street |
| Raod, Roda | Road |
| Aveune, Avnue | Avenue |
| Drvie, Drve | Drive |
| Plce, Palce | Place |
| Cresent, Crecsent | Crescent |
| Terace | Terrace |
| Cort | Court |
| Clsoe, Colse | Close |

### 3.2 NZ City/Town Misspellings

Common misspellings of major NZ cities are corrected to ensure the "lives in [City]" detection (Section 4.4) can match them. Examples: Hamilotn → Hamilton, Wellingotn → Wellington, Christchuch → Christchurch, Auckand → Auckland, Masteron → Masterton, Dunedni → Dunedin.

### 3.3 PII Label Misspellings

| Misspelling | Corrected to |
|------------|-------------|
| Patinet | Patient |
| Adress, Addres | Address |
| Surnam | Surname |

### 3.4 Design Principle

The pre-correction pass exists solely to improve PII detection accuracy. It does not attempt to correct clinical text, drug names, or medical terminology — those are not relevant to PII pattern matching and correcting them could introduce clinical errors. The corrected text is used only for PII scanning; the original text (with typos) is what the user sees in the redaction review panel, with the PII items replaced by redaction markers.

---

## 4. Stage 2 — PII Detection Rules

Detection rules are applied in a specific order. Earlier rules consume matches before later rules can see them, preventing double-detection.

### 4.1 NHI Number Detection

Two NHI formats coexist indefinitely. Both must be detected. Letters I and O are excluded from all alpha positions. Each letter is assigned a numeric value based on its ordinal position in the reduced alphabet (A=1, B=2, ... H=8, J=9, K=10, ... N=13, P=14, ... Z=24).

#### Labelled NHI (detected first, highest priority)

Any text matching `NHI:`, `NHI #`, or `NHI` followed by either format is redacted unconditionally. This catches both valid and invalid NHIs when explicitly labelled.

#### Old format: AAANNNC (e.g., ABC1235)
- 3 alpha + 3 numeric + 1 numeric check digit
- Issued until 30 June 2026; all existing NHIs use this format
- **Detected on pattern match alone — check digit validation is NOT required**

A mistyped NHI (e.g., `ZZZ0094` which fails check digit validation) is still patient-identifiable information. The detection flags any 7-character string matching the format `[A-HJ-NP-Z]{3}\d{4}` regardless of whether the check digit validates. False positive risk is low because the constrained character set (excluding I and O) combined with the specific 3-alpha + 4-numeric structure is uncommon in clinical text.

**Check digit algorithm (Modulus 11) — used for validation functions elsewhere, not for PII detection gating:**
1. Convert each character to a numeric value (alpha → ordinal, numeric → face value)
2. Multiply the first six values by descending weights: 7, 6, 5, 4, 3, 2
3. Sum the six products
4. Calculate: check = 11 − (sum mod 11)
5. If check equals 10, convert to 0
6. If check equals 11 (i.e., sum mod 11 = 0), the NHI is invalid
7. The check digit (7th character) must equal the calculated value

#### New format: AAANNAX (e.g., ALU18KZ)
- 3 alpha + 2 numeric + 1 alpha + 1 alpha check character
- Issuing from 1 July 2026
- **Detected on pattern match + check digit validation**

Unlike the old format, the new format pattern (`AAA12BB`) has higher false positive risk in clinical text (abbreviations followed by codes). Therefore, unlabelled new-format candidates require check digit validation before redaction.

**Check character algorithm — dual validation (Modulus 23 + Modulus 24):**

The production algorithm uses modulus 23 (corrected from modulus 24 after a collision weakness was identified — the mod-24 version had ~7% failure rate for character substitution detection; mod-23 reduces this to ~0.2%). However, some test/sample NHIs (including HNZ-published examples like `ALU18KZ`) were generated under the original modulus 24 algorithm. The detection validates against both:

1. Convert each character to a numeric value (alpha → ordinal, numeric → face value)
2. Multiply the first six values by descending weights: 7, 6, 5, 4, 3, 2
3. Sum the six products
4. Check modulus 23: index = 23 − (sum mod 23). If index ≠ 0 and equals the 7th character's ordinal → valid
5. Check modulus 24: index = 24 − (sum mod 24). If index ≠ 0 and equals the 7th character's ordinal → valid
6. If either check passes, flag as NHI

**Also detect (both formats):**
- NHI with spaces or hyphens: `ABC 1234`, `ABC-1234`, `ALU 18KZ`
- Case-insensitive matching
- Z-prefix NHIs (reserved for testing) — still flag these

**Redaction:** Replace with `[NHI REDACTED]`

**Implementation note:** Both formats and all three algorithms (mod-11 for old, mod-23 and mod-24 for new) must be maintained permanently.

### 4.2 Patient Name Detection

Names are detected through three complementary mechanisms, applied in order:

#### PMS header patterns (highest specificity)
Clinical notes pasted from PMS often contain structured header blocks. The following labelled patterns consume the entire line after the label:
- `Patient Name:`, `Patient:`, `Surname:`, `Given Name:`, `First Name:`, `Name:` — redact everything after the label to end of line
- `Re: [Capitalised] [Capitalised]` — referral letter subject pattern
- `Dear Dr ... regarding/re: ...` — referral letter salutation pattern

**Redaction:** Preserve label, redact content: `Patient: [NAME REDACTED]`

#### Salutation + name (high specificity)
Detect `Mr/Mrs/Ms/Miss/Master` followed by one or two capitalised words, including hyphenated surnames. The entire match including the salutation is consumed.

**Redaction:** The full match becomes `[NAME REDACTED]` — the salutation is not preserved, as leaving "Mr" behind signals a name was present.

Examples:
- `Mr Kerry Smith has a sore knee` → `[NAME REDACTED] has a sore knee`
- `Mrs Jane Wilson-Brown presented` → `[NAME REDACTED] presented`
- `Ms Sarah presented today` → `[NAME REDACTED] presented today`

#### Bare Firstname Lastname (moderate specificity)
Detect two adjacent capitalised words (1–12 chars + 1–10 chars) followed by a clinical context indicator, when appearing at the start of a line or after a prior redaction marker. An optional comma is allowed between the name and the verb.

**Clinical context indicators (lookahead):** `is`, `ia` (common typo for "is"), `has`, `was`, `had`, `presents`, `presenting`, `presented`, `aged`, `a [digit]`, `[digits]M/F` (age+sex shorthand), `with`

**Clinical adjective exclusion list:** To prevent false positives on compound clinical terms that happen to match the two-capitalised-words pattern, the first word is checked against an exclusion list: Lateral, Frozen, Acute, Chronic, Severe, Bilateral, Anterior, Posterior, Superior, Inferior, Medial, Proximal, Distal, Central, Primary, Secondary, Recurrent, Progressive, Persistent, Suspected, Possible, Probable, Confirmed, Known, Previous, Recent, Initial, Early, Late, Advanced, Mild, Moderate, Marked, Significant, Gross, Minor, Major, Upper, Lower, Right, Left, Deep, High, Low.

Examples:
- `Kerry Smith is a 74M` → `[NAME REDACTED] is a 74M` ✓
- `Kerry Smith, 74M with sore knee` → `[NAME REDACTED] 74M with sore knee` ✓
- `Lateral Epicondylitis is suspected` → unchanged (excluded) ✓
- `Frozen Shoulder is confirmed` → unchanged (excluded) ✓

### 4.3 Date of Birth Detection

**Labelled date patterns:** `DOB:`, `Date of Birth:`, `Born:`, `D.O.B.` followed by a date in DD/MM/YYYY or similar format.

**Date + age combination:** A date followed by an age in parentheses, e.g., `15/03/1958 (67 years)`. The age portion is preserved as it is clinically relevant and non-identifying.

**Redaction:** `[DOB REDACTED]`. If age was present: `[DOB REDACTED] (67 years)`.

**Not redacted:** Isolated dates in clinical context (e.g., "symptoms started 15/03/2026") — these are clinically relevant and are not DOBs.

### 4.4 Address Detection

Three mechanisms, applied in order:

#### Labelled address patterns
`Address:`, `Street:`, `Suburb:`, `City:` — redact everything after the label to end of line.

#### NZ street pattern + trailing city
Detect `[number] [word] [street type]` followed by an optional comma and one or two capitalised words (city/suburb name). Street types include: Street, St, Road, Rd, Avenue, Ave, Drive, Dr, Place, Pl, Crescent, Cres, Terrace, Tce, Way, Lane, Ln, Close, Cl, Court, Ct, Boulevard, Blvd.

The pre-correction pass (Section 3) ensures misspelled street types are fixed before this pattern runs.

**Redaction:** The entire match including trailing city becomes `[ADDRESS REDACTED]`.

Example: `23 Some Street, Hamilton` → `[ADDRESS REDACTED]`

#### Location context + NZ city/town name
Detect phrases like "lives in", "from", "resides in", "based in", "of" followed by a recognised NZ city, town, or suburb name (~100 locations covered, including all major urban centres and common suburbs).

Example: `lives in Hamilton` → `[ADDRESS REDACTED]`

### 4.5 Contact Information

**Phone numbers:** NZ mobile (02x), landline (0x), and international (+64) patterns. Redacted as `[PHONE REDACTED]`.

**Email addresses:** Standard email pattern. Redacted as `[EMAIL REDACTED]`.

### 4.6 Referring Clinician / Practice Details

**Labelled patterns:** `Referrer:`, `Referring Doctor:`, `GP:`, `Practice:`, `Provider:`, `Clinic:` — redact content after label.

**HPI number:** `HPI:` followed by the 6-character Health Provider Index format.

**Redaction:** `[REFERRER REDACTED]`

**Rationale:** Even though clinician details aren't patient PII, removing them strengthens the de-identification argument and removes information not relevant to criteria assessment.

---

## 5. Stage 3 — Auto-Redaction UX Flow

### 5.1 Trigger
The PII pipeline runs when the clinician clicks the assessment button, not on every keystroke.

### 5.2 If No PII Detected
Proceed directly to assessment. No additional interaction required.

### 5.3 If PII Detected

**Notification panel** (amber/yellow treatment):
- Warning icon + "Patient-identifiable information detected"
- Explanatory text: "We've found information that may identify a patient. This has been automatically redacted below. Please review and confirm before proceeding."
- Summary line: "3 items redacted: 1 NHI, 1 name, 1 address"

**Redacted text review panel** (monospace font, yellow highlights on redacted spans):
- Shows the text as it will be submitted, with `[TYPE REDACTED]` markers highlighted
- Original text remains visible in the input field for comparison

**Three user actions:**
- **"Use redacted text ✓"** (primary, prominent button) — submits the redacted version
- **"Edit and retry"** — returns to input field for manual editing; PII scan runs again on next submission
- **"Cancel"** — abandons the assessment

### 5.4 Edge Cases

**Insufficient content after redaction:** If the remaining text after redaction is less than 30 characters, display: "After removing patient-identifiable information, there isn't enough clinical detail to assess."

**Clinically relevant information redacted:** DOB is redacted but age preserved. Address and clinician details are redacted entirely (not clinically relevant to criteria assessment).

**User disagrees with a redaction:** "Edit and retry" allows manual modification and re-scan.

---

## 6. Layer 3 — Server-Side Gate (Cloudflare Worker)

The Hono Worker runs the same detection rules (without pre-correction, as the client should have already handled that) before forwarding to the Anthropic API.

**Behaviour:** If PII detected, reject with HTTP 422 and list of pattern types detected. Does NOT auto-redact — the server should never need to process PII.

**Logging:** Pattern types + timestamp only. No clinical content. No matched text.

**Purpose:** Defence in depth. In normal operation this gate should never trigger, because the client-side pipeline has already redacted any PII. If it does trigger, it indicates the client-side layer was bypassed.

---

## 7. Security Architecture Framing

### 7.1 Revised Data Classification

| Data Element | Classification | Handling |
|-------------|---------------|----------|
| National Radiology Access Criteria content | Public reference data | Stored in D1/KV |
| HealthPathways links and localised guidance | Public reference data | Stored in D1/KV, region-specific |
| De-identified clinical scenario text | Non-identifiable clinical information | Processed transiently by Anthropic API, not stored |
| PII detection event logs | Operational metadata | Pattern types and timestamps only |
| Usage analytics | Operational metadata | Aggregated, non-identifiable |

### 7.2 Comparison with Similar Tools

| Tool | Data Handled | PII Controls | Deployment |
|------|-------------|-------------|------------|
| HealthPathways search | Clinician types clinical keywords | None | Web-hosted |
| UpToDate / BMJ Best Practice | Clinician searches clinical scenarios | None | Web-hosted |
| Google / PubMed search | Clinician types clinical queries | None | Public internet |
| **CRR Triage Advisor** | **Clinician submits clinical note** | **Four-stage PII pipeline + server gate** | **Cloudflare Workers, access-controlled** |

### 7.3 Residual Risk

PII detection is pattern-based and cannot guarantee 100% detection. A clinician could describe a patient in a way that is identifying without triggering any pattern. Mitigations: privacy banner (user education), no data storage (transient processing only), Anthropic zero-retention API policy, three-layer architecture demonstrating reasonable technical safeguards.

### 7.4 Impact on Azure OpenAI Migration

If the PII prevention architecture is accepted, the Anthropic API is processing de-identified clinical scenarios, not identifiable health information. Data residency requirements for de-identified data are materially less restrictive. Migration to Azure OpenAI remains desirable for vendor alignment but is no longer a blocking compliance requirement.

---

## 8. Implementation Status

### Client-Side (v2.1.1) — Implemented ✓

- [x] Pre-correction pass for PII-relevant typos
- [x] NHI detection: old format (pattern match, no validation gate), new format (dual mod-23/mod-24 validation), labelled NHIs
- [x] Name detection: PMS header patterns, salutation + name (title consumed), bare Firstname Lastname with clinical adjective exclusion
- [x] DOB detection: labelled patterns, date + age combination (age preserved)
- [x] Address detection: labelled, street pattern + trailing city, "lives in [NZ City]" with ~100 locations
- [x] Phone (NZ formats), email, clinician/practice details, HPI number
- [x] Auto-redaction UX: amber notification, highlighted review panel, three-action buttons
- [x] Insufficient content detection after redaction
- [x] Detection event summary (pattern types and counts)

### Server-Side (Cloudflare Hono Worker) — Pending

- [ ] Implement same detection rules in Worker
- [ ] Add PII gate before Anthropic API forwarding
- [ ] Return 422 with pattern types on detection
- [ ] Add audit logging (pattern types + timestamp only)

### Documentation

- [x] PII Detection Specification (this document, v0.2)
- [ ] Update CRR Tool Suite Security Architecture document
- [ ] Prepare test evidence pack
- [ ] Submit to HNZ cybersecurity for review
