# CRR Triage Advisor — PII Detection and Auto-Redaction Specification
## Version 0.1 · April 2026

---

## 1. Purpose and Security Rationale

The CRR Triage Advisor processes free-text clinical notes to assess them against the National Radiology Access Criteria. These notes are submitted by primary care clinicians who may inadvertently include patient-identifiable information (PII) — particularly when copy-pasting from their PMS.

If the PII detection and auto-redaction layer can demonstrably prevent patient-identifiable information from reaching the Anthropic API, the tool's data classification changes fundamentally:

| Scenario | Data Classification | Security Posture |
|----------|---------------------|------------------|
| PII reaches API | Identifiable health information | Requires health data residency, privacy impact assessment, data processing agreement, HIPC compliance |
| PII blocked/redacted before API | De-identified clinical scenario | Equivalent to clinical reference tool (HealthPathways, UpToDate, Google search of clinical question) |

**The argument:** A clinical note stripped of NHI, patient name, DOB, address, and contact details is a clinical scenario description — the same category of information found in a medical textbook case study. No reasonable person could re-identify the patient from "65-year-old male, 3-week history of progressive headache with morning vomiting, no focal neurology." The security and privacy requirements for processing de-identified clinical scenarios are materially lower than for identifiable health information.

**What this simplifies:**
- Data residency requirements (de-identified scenarios are not subject to the same jurisdictional constraints as identifiable health information)
- The case for Azure OpenAI migration becomes less urgent (though may still be desirable for other reasons)
- Privacy Impact Assessment scope narrows significantly
- The tool sits alongside other clinical reference tools in the HNZ security landscape, not alongside clinical information systems

---

## 2. Architecture — Three Layers of Defence

```
┌────────────────────────────────────────────────────────────────┐
│  LAYER 1: USER EDUCATION                                       │
│  Privacy banner · Usage policy · "Do not enter PII" messaging  │
│  ► First line of defence — sets user expectation               │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  LAYER 2: CLIENT-SIDE PII DETECTION + AUTO-REDACTION           │
│  Runs in the browser before any data leaves the client         │
│  ► Scans text for PII patterns                                 │
│  ► Auto-redacts detected PII (replaces with [REDACTED])        │
│  ► Shows redacted version to user for review                   │
│  ► User confirms redacted text before submission               │
│  ► Logs detection event (pattern type only, not content)       │
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

## 3. PII Detection Rules

### 3.1 NHI Number Detection

Two NHI formats coexist indefinitely. Both must be detected. Letters I and O are excluded from all alpha positions. Each letter is assigned a numeric value based on its ordinal position in the reduced alphabet (A=1, B=2, ... H=8, J=9, K=10, ... N=13, P=14, ... Z=24).

#### Old format: AAANNNC (e.g., ABC1235)
- 3 alpha + 3 numeric + 1 numeric check digit
- Issued until 30 June 2026; all existing NHIs use this format

**Check digit algorithm (Modulus 11):**
1. Convert each of the 7 characters to a numeric value (alpha → ordinal, numeric → face value)
2. Multiply the first six values by descending weights: 7, 6, 5, 4, 3, 2
3. Sum the six products
4. Calculate: check = 11 − (sum mod 11)
5. If check equals 10, convert to 0
6. If check equals 11 (i.e., sum mod 11 = 0), the NHI is invalid
7. The check digit (7th character) must equal the calculated value

**Detection regex:**
```
/\b[A-HJ-NP-Z]{3}\d{4}\b/gi
```

#### New format: AAANNAX (e.g., ALU18KZ)
- 3 alpha + 2 numeric + 1 alpha + 1 alpha check character
- Issuing from 1 July 2026 (weeks away at time of writing)

**Check character algorithm (Modulus 23):**

The algorithm was revised from modulus 24 to modulus 23 after a collision weakness was identified in the original implementation. The modulus 24 version had a ~7% failure rate for single character transposition detection; modulus 23 reduces this to ~0.2%.

1. Convert each of the 7 characters to a numeric value (alpha → ordinal as above, numeric → face value)
2. Multiply the first six values by descending weights: 7, 6, 5, 4, 3, 2
3. Sum the six products
4. Calculate: index = 23 − (sum mod 23)
5. If index equals 0, the NHI is invalid and cannot be used
6. The check character (7th character, alpha) must have an ordinal value equal to the calculated index

**Detection regex:**
```
/\b[A-HJ-NP-Z]{3}\d{2}[A-HJ-NP-Z]{2}\b/gi
```

#### Combined detection approach

For any 7-character candidate match:
1. First check if it matches the old format pattern (3 alpha + 4 numeric) → validate with modulus 11
2. If not, check if it matches the new format pattern (3 alpha + 2 numeric + 2 alpha) → validate with modulus 23
3. If either validation passes, flag as NHI

**Also detect:**
- NHI with spaces or hyphens: `ABC 1234`, `ABC-1234`, `ALU 18KZ`, `ALU-18KZ`
- NHI preceded by label: `NHI: ABC1234`, `NHI ABC1234`, `NHI#ABC1234`, `NHI: ALU18KZ`
- Case-insensitive matching (clinicians may type lowercase)
- Z-prefix NHIs (reserved for testing) — still flag these, as they indicate a test NHI was pasted from a test system

**Redaction:** Replace with `[NHI REDACTED]`

**False positive risk:** Low for old format — modulus 11 on a constrained character set is highly specific. Slightly higher for new format — the AAANNAA pattern is more common in general text (e.g., abbreviations followed by codes), but modulus 23 validation eliminates most false matches. The combined approach of pattern match + check digit/character validation keeps false positives very low.

**Implementation note:** Both algorithms must be maintained permanently. There is no sunset date for old-format NHIs — they remain valid identifiers for the lifetime of the patient.

### 3.2 Patient Name Detection

Patient names are the hardest PII category to detect reliably without knowing the patient's actual name. The approach uses structural patterns rather than name dictionaries.

**Detect PMS header patterns:**
Many clinical notes pasted from PMS contain a header block with patient demographics. Detect and redact common patterns:
```
Patient:\s*.+
Patient Name:\s*.+
Name:\s*.+
Surname:\s*.+
Given Name:\s*.+
First Name:\s*.+
Re:\s*[A-Z][a-z]+\s+[A-Z][a-z]+    (Re: Firstname Lastname)
Dear Dr\s+.+regarding\s+.+          (letter header patterns)
```

**Detect salutation + name patterns:**
```
Mr\.?\s+[A-Z][a-z]+
Mrs\.?\s+[A-Z][a-z]+
Ms\.?\s+[A-Z][a-z]+
Miss\s+[A-Z][a-z]+
Master\s+[A-Z][a-z]+
```

**Redaction:** Replace matched name portion with `[NAME REDACTED]`. Preserve the label where useful: `Patient: [NAME REDACTED]`

**False positive risk:** Moderate — clinical text sometimes includes clinician names (e.g., "Discussed with Dr Smith"), drug names that look like surnames, or anatomical terms that match name patterns. The detection should be tuned to favour false positives (unnecessary redaction) over false negatives (PII leaking through).

**Mitigation:** The user reviews the redacted text before submission. If a clinician name or drug name was incorrectly redacted, the user can manually restore it — but the tool errs on the side of caution.

### 3.3 Date of Birth Detection

**Detect labelled date patterns:**
```
DOB:\s*\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}
Date of Birth:\s*\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}
Born:\s*\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}
D\.O\.B\.?\s*\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}
```

**Detect age + date combination:**
```
\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4}\s*\(\d{1,3}\s*(?:years?|yrs?|y/?o)\)
```
This catches patterns like "15/03/1958 (67 years)" which are common in PMS-generated headers.

**Redaction:** Replace with `[DOB REDACTED]`. Preserve any associated age: `[DOB REDACTED] (67 years)` — age is clinically relevant and not identifying on its own.

**Note:** Isolated dates in clinical context (e.g., "symptoms started 15/03/2026", "CT performed 01/02/2026") should NOT be redacted — they are clinically relevant dates, not DOBs. The detection targets labelled DOB patterns and date + age combinations specifically.

### 3.4 Address Detection

**Detect NZ address patterns:**
```
\d{1,4}\s+[A-Z][a-z]+\s+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Place|Pl|Crescent|Cres|Terrace|Tce|Way|Lane|Ln|Close|Cl|Court|Ct|Boulevard|Blvd)\b
```

**Detect labelled address patterns:**
```
Address:\s*.+
Street:\s*.+
Suburb:\s*.+
City:\s*.+
```

**Detect NZ postcode patterns (4 digits, often following a city name):**
Context-dependent — only flag when appearing after a suburb/city pattern or address label.

**Redaction:** Replace with `[ADDRESS REDACTED]`

**False positive risk:** Moderate — clinical notes sometimes mention locations ("fell at 42 Main Street", "workplace at 15 Industrial Drive"). These are legitimate redactions in most cases — the location of an accident is potentially identifying.

### 3.5 Contact Information

**Phone numbers:**
```
(?:\+?64|0)\s*[2-9]\d{1,2}[\s\-]?\d{3,4}[\s\-]?\d{3,4}
```
Covers NZ mobile (02x), landline (0x), and international format (+64).

**Email addresses:**
```
[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}
```

**Redaction:** Replace with `[PHONE REDACTED]` or `[EMAIL REDACTED]`

**False positive risk:** Low — phone numbers and email addresses are unambiguous patterns.

### 3.6 Referring Clinician / Practice Details

PMS-generated notes often include the referring clinician's details in a header block. While clinician identity is not patient PII, it could be used in combination with other information to narrow identification. More importantly, it's not clinically relevant to the criteria assessment.

**Detect labelled clinician patterns:**
```
Referrer:\s*.+
Referring Doctor:\s*.+
GP:\s*.+
Practice:\s*.+
Provider:\s*.+
Clinic:\s*.+
HPI:\s*[A-Z]{4}\d{2}    (Health Provider Index number)
```

**Redaction:** Replace with `[REFERRER REDACTED]`

**Rationale for including this:** Even though clinician details aren't patient PII, removing them strengthens the de-identification argument. The text reaching the API contains nothing that could identify the patient, the clinician, or the practice — it's a pure clinical scenario.

---

## 4. Auto-Redaction UX Flow

### 4.1 User Submits Clinical Note

The clinician types or pastes their clinical note into the Triage Advisor text area.

### 4.2 PII Scan Triggers

The PII scan runs when the clinician clicks the assessment button (not on every keystroke — running complex regex on every keypress would be sluggish and distracting).

### 4.3 If No PII Detected

Proceed directly to the assessment (rule-based or AI). No additional interaction required.

### 4.4 If PII Detected — Auto-Redaction Flow

**Step 1:** The system displays a notification panel:

> ⚠️ **Patient-identifiable information detected**
>
> We've found information that may identify a patient. This has been automatically redacted below. Please review the redacted version and confirm before proceeding.
>
> The assessment will use the redacted text only. No patient-identifiable information will leave your browser.

**Step 2:** The system displays the redacted text in a review panel, with redacted items highlighted (e.g., yellow background on `[NHI REDACTED]`, `[NAME REDACTED]`, etc.). The original text remains in the input field so the user can compare.

**Step 3:** The user has three options:

- **"Use redacted text"** — proceeds with the auto-redacted version. This is the primary action (large, prominent button).
- **"Edit and retry"** — returns focus to the original text field so the user can manually remove PII and resubmit. The PII scan runs again on the next submission.
- **"Cancel"** — abandons the assessment.

**Step 4:** On "Use redacted text", the redacted version is what gets sent to the rule-based engine and/or Anthropic API. The original (un-redacted) text is never transmitted.

### 4.5 Visual Design

The redaction review panel should be visually distinct from the assessment results panel. Use:
- Amber/yellow treatment for the redaction notification (consistent with "caution" — not red/error, not green/success)
- Inline highlighting on redacted spans so the user can quickly scan what was changed
- A summary line: "3 items redacted: 1 NHI, 1 name, 1 date of birth"
- The redacted text should be displayed in a monospace or slightly different font to visually distinguish it from the original

### 4.6 Edge Cases

**What if the entire note is PII?** (e.g., the user pasted a full patient demographics block with no clinical content)
- After redaction, if the remaining text is too short or contains no clinical content, display: "After removing patient-identifiable information, there isn't enough clinical detail to assess. Please enter the clinical indication and relevant history without patient-identifying details."

**What if redaction removes clinically relevant information?**
- DOB is redacted but age is preserved (age is clinically relevant)
- Address is redacted entirely (not clinically relevant in most cases; if the location of an injury is relevant, the user can describe it without the specific address)
- Clinician name is redacted (not relevant to criteria assessment)
- NHI is redacted (never relevant to criteria assessment)

**What if the user disagrees with a redaction?**
- "Edit and retry" lets them modify the text and resubmit. If they remove the redaction markers and type something that no longer triggers detection, it will proceed. The system cannot prevent a determined user from circumventing detection — but it demonstrates reasonable technical safeguards.

---

## 5. Server-Side Gate (Cloudflare Worker)

The Hono Worker that proxies requests to the Anthropic API runs the same detection rules as the client-side layer.

### 5.1 Implementation

```javascript
// In the Hono Worker POST /assess endpoint
app.post('/assess', async (c) => {
  const { note } = await c.req.json();
  
  // Run PII detection on the submitted note text
  const piiFindings = detectPII(note);
  
  if (piiFindings.length > 0) {
    // Log the detection event (pattern types only, NOT the content)
    console.log(`PII gate triggered: ${piiFindings.map(f => f.type).join(', ')}`);
    
    // Reject the request
    return c.json({
      error: 'PII_DETECTED',
      message: 'Patient-identifiable information detected in submission. Please remove before resubmitting.',
      types: piiFindings.map(f => f.type)  // e.g., ['NHI', 'NAME', 'DOB']
    }, 422);
  }
  
  // No PII detected — proceed to Anthropic API
  // ...
});
```

### 5.2 Why Reject Rather Than Auto-Redact at Server

- If PII reaches the server, the client-side layer has been bypassed or has failed. This is an exceptional case.
- Auto-redacting at the server would mean the server is processing PII (even briefly) — which undermines the data classification argument.
- A hard rejection at the server ensures PII is never forwarded to Anthropic under any circumstances.
- The 422 response triggers a client-side error display that instructs the user to remove PII and retry.

### 5.3 Logging

The server logs detection events for audit purposes:
- Timestamp
- Pattern types detected (e.g., `['NHI', 'DOB']`)
- NOT the content of the matched text
- NOT the clinical note text
- Originating IP / session identifier (for abuse detection)

This log provides evidence for security review that the PII gate is actively functioning and catching submissions that bypass the client layer.

---

## 6. Updated Security Architecture Framing

### 6.1 Revised Data Classification

With the three-layer PII prevention system in place:

| Data Element | Classification | Handling |
|-------------|---------------|----------|
| National Radiology Access Criteria content | Public reference data | Stored in D1/KV, served to any authenticated user |
| HealthPathways links and localised guidance | Public reference data | Stored in D1/KV, region-specific |
| De-identified clinical scenario text | Non-identifiable clinical information | Processed transiently by Anthropic API, not stored by CRR tools |
| PII detection event logs | Operational metadata | Pattern types and timestamps only, no clinical content |
| Usage analytics | Operational metadata | Aggregated, non-identifiable |

**Key classification change:** The clinical note text submitted to the Triage Advisor is classified as "non-identifiable clinical information" rather than "identifiable health information" because:
1. The user is instructed not to include PII (Layer 1)
2. PII is auto-detected and auto-redacted before submission (Layer 2)
3. PII is rejected at the server if it somehow bypasses the client (Layer 3)
4. Even if all three layers fail, no data is stored — processing is transient and session-only

### 6.2 Comparison with Similar Tools

| Tool | Data Handled | PII Controls | Deployment |
|------|-------------|-------------|------------|
| HealthPathways search | Clinician types clinical keywords | None — assumed de-identified by user behaviour | Web-hosted, no special security |
| UpToDate / BMJ Best Practice | Clinician searches clinical scenarios | None — assumed de-identified by user behaviour | Web-hosted, no special security |
| Google / PubMed search | Clinician types clinical queries | None | Public internet |
| **CRR Triage Advisor** | **Clinician submits clinical note** | **Three-layer PII detection with auto-redaction** | **Cloudflare Workers, access-controlled** |

The CRR Triage Advisor has materially stronger PII controls than any of the clinical reference tools routinely used by NZ primary care clinicians. This positions it as a clinical reference tool with enhanced privacy safeguards, not as a clinical information system.

### 6.3 Residual Risk

**Risk:** PII detection is pattern-based and cannot guarantee 100% detection. A clinician could describe a patient in a way that is identifying without triggering any pattern (e.g., "the mayor's wife who was in last week's car accident on the harbour bridge").

**Mitigations:**
- This is a residual risk accepted by all clinical reference tools (clinicians can and do Google identifying clinical scenarios)
- The privacy banner and usage policy establish the user's responsibility
- No data is stored — even if identifying text is processed, it is not retained
- Anthropic's data handling policies (zero data retention on API) provide an additional safeguard
- The three-layer architecture demonstrates reasonable technical safeguards for a security review

**Risk acceptance position:** The PII detection system provides reasonable and proportionate technical controls for a clinical reference tool. It does not claim to guarantee zero PII transmission, but it demonstrably reduces the risk to a level consistent with other clinical reference tools in the HNZ landscape — and provides stronger controls than most.

### 6.4 Impact on Azure OpenAI Migration Decision

If the PII prevention architecture is accepted by HNZ cybersecurity:
- The Anthropic API is processing de-identified clinical scenarios, not identifiable health information
- Data residency requirements for de-identified data are materially less restrictive
- The migration to Azure OpenAI (Sydney) may still be desirable for vendor relationship alignment, but is no longer a blocking security/privacy requirement
- This gives the programme optionality: continue with Anthropic (known good performance on CRR criteria assessment, particularly the SP-01 redirect/exclusion logic) while Azure migration is evaluated on its merits rather than as a compliance imperative

---

## 7. Implementation Checklist

### Client-Side (Triage Advisor HTML/JS)

- [ ] Implement `detectPII(text)` function with all detection rules (Section 3)
- [ ] Implement `redactPII(text, findings)` function that replaces matches with redaction markers
- [ ] Build redaction review UI panel (Section 4)
- [ ] Wire PII scan into the assessment submission flow (scan on button click, before any API call)
- [ ] Preserve age when redacting DOB
- [ ] Add detection event logging (pattern types to console/analytics, not content)
- [ ] Handle edge case: entirely redacted text / insufficient clinical content
- [ ] Test with sample PMS-generated notes containing typical header blocks
- [ ] Test NHI check digit validation against known valid and invalid NHIs

### Server-Side (Cloudflare Hono Worker)

- [ ] Implement same `detectPII()` function in Worker
- [ ] Add PII gate before Anthropic API forwarding
- [ ] Return 422 with pattern types on detection
- [ ] Add audit logging (pattern types + timestamp only)
- [ ] Test that client-side redaction means server-side gate never triggers in normal use

### Documentation and Review

- [ ] Update CRR Tool Suite Security Architecture document (v0.2) with PII auto-redaction layer
- [ ] Prepare test evidence pack: sample notes before/after redaction, NHI validation results
- [ ] Draft data classification memo: "The CRR Triage Advisor processes de-identified clinical scenarios"
- [ ] Submit to HNZ cybersecurity for review
