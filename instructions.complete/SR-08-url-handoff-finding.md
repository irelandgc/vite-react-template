# SR-08 — demonstration harness passes clinical note via URL query string

Two artefacts below: a register entry to append to `SECURITY_DECISIONS.md`, and replacement wording for the PTA integration section.

---

## 1. Register entry (append to the SR table)

| ID | Risk | Severity | Status | Mitigation / what unblocks | Gates |
|----|------|----------|--------|-----------------------------|-------|
| **SR-08** | **Demonstration harness passes the referral note to the Triage Advisor as a URL query parameter.** `hl/index.html` opens the Triage Advisor via `window.open()` with the note in the query string, URL-encoded only (`encodeURIComponent` — escaping, not encryption; the note is readable by eye anywhere the URL appears). Three exposure paths, all of which occur **before** the client-side redaction pipeline runs: (1) the unredacted note is written to browser history and back/forward state in both windows and persists there; (2) the handoff is a real HTTP GET, so the full query string reaches the server and lands in any request logging on the zone — a transmission path distinct from the Worker API call that the PII pipeline governs; (3) referrer leakage to cross-origin resources (Google Fonts) is currently prevented only by the browser default `strict-origin-when-cross-origin`, with no explicit `Referrer-Policy` set. Popup mode hides the address bar, which conceals the note visually but does not remove it from history. **Exercised to date only with synthetic notes in the demonstration harness; no evidence of real patient data on this path** *(to be confirmed)*. | Medium — High if ever used with real referral content | Open | Replace the URL handoff with a message-passing mechanism (`postMessage`, matching the existing `crr-output` return path) or `sessionStorage`, so clinical text never enters a URL. Redacting on the calling side before building the URL is **not** an adequate fix: it still places clinical text in history and server logs, and duplicates redaction logic in a second place where it can drift. Additionally, set an explicit `Referrer-Policy` rather than relying on browser defaults. | Any integration carrying real referral content. Fix before the harness is demonstrated further, since a demonstration pattern tends to become the implemented pattern. |

**Related decision to record once the fix is made:**

| ID | Date | Decision | Why | Status |
|----|------|----------|-----|--------|
| **SD-09** | *(date of fix)* | Inbound clinical content is passed to the Triage Advisor by message-passing, never by URL query parameter. An explicit `Referrer-Policy` is set on both the harness and the tool. | Closes SR-08. Establishes the pattern any future PMS or referral-platform integration must follow, and keeps the demonstration consistent with it. | *(pending)* |

---

## 2. Replacement PTA wording

### Replace in "Programme context (background only)", second paragraph

> These tools sit alongside that process as an optional aid, and are not part of the referral pathway itself. They do not receive, transmit, route or action a referral, and they hold no connection to any live PMS, RIS or e-referral system. A clinician types or pastes text into the tool and reads advice back; nothing is submitted onward. A demonstration harness simulating a referral form has been built to illustrate how integration might work, and is described below. This assessment is limited to the tools.

### Replace the whole "Integration with referral systems" section

> **Integration with referral systems**
>
> The tools are designed to be usable from within a referral workflow as well as standalone. Three mechanisms are relevant to privacy.
>
> **Built, and low impact.** The Criteria Viewer can return text a user has assembled to a calling referral form via a browser message (`postMessage`). What is sent is criteria wording the clinician has just selected — national criteria shorthand, not patient information. The Viewer can also be launched with parameters identifying exam, anatomical site and region, none of which are personal information.
>
> **Built as a demonstration, and the subject of a finding.** A harness simulating a HealthLink referral form has been built to illustrate what integration with a referral platform could look like. It launches the Triage Advisor with the referral note passed across. Reviewing this mechanism identified that the note was being passed as a URL query parameter, which places clinical text into browser history and server request logs before the tool's redaction step runs — that step operates in the page after it has loaded, so it cannot protect a value that travelled in the URL to get there. The harness has been exercised only with synthetic notes and has never been connected to a live clinical system. The handoff is being changed to a message-passing mechanism so that clinical content never enters a URL. We record it because the finding establishes a constraint for any future integration, and because a demonstration pattern tends to become the implemented pattern.
>
> **Not built, and excluded from this assessment.** A production integration passing referral content — note text, age, sex, laboratory values — from a PMS or referral platform into the Triage Advisor. This would materially change the privacy position: information would flow from a clinical system rather than being entered deliberately by a clinician, and the assurance that no patient-identifiable information reaches the AI service would rest on what the integration passes and how reliably it is filtered, not on the clinician's judgement. It requires assessment before it proceeds.
>
> **Design constraint applying to all of the above.** Clinical free text must not be passed into the tools through URL query parameters. URLs persist in browser history, server access logs, proxy logs and referrer headers, none of which are under the tools' control, and URL-encoding is not protection — the content remains readable to anything that sees the URL. Any inbound transfer of clinical content must use a mechanism that does not place that content in a URL.

---

## 3. Before this is committed

- **Confirm no real patient data has traversed the harness path.** If it has, this becomes an incident to disclose rather than a finding, and the PTA wording and Lee's briefing both change. Worth establishing definitively rather than assuming.
- **Check whether request logging is actually enabled** on the Cloudflare zone serving the harness. If it is, the notes are already in logs and a retention question follows; if not, exposure path (2) is latent rather than realised.
- Once fixed, add **SD-09** and move SR-08 to closed with the commit reference, in the same form as SR-04.

---

## 4. Effect on documents already drafted

- **NAIAEAG briefing §8** remains accurate as written — it describes automatic integration as a future direction that changes the privacy analysis, which is still true. No change needed before sending.
- **BRD TA-005** (receive referral from calling application) should carry the constraint: content must not be passed by URL query parameter.
- **Lee Brownlie's review** — worth mentioning this finding directly rather than leaving him to spot it, as evidence the review process is working.
