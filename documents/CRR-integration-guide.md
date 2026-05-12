# CRR Criteria Tools — Integration Guide

**Last updated:** 2026-05-12
**Criteria Viewer:** v5.3.0
**Triage Advisor:** v2.1.1
**Criteria dataset:** v4.0.1 (April 2026)

This document covers everything needed to embed or link to the CRR Criteria tools from a referral system, patient management system, or clinical portal. Share freely with vendors and developers.

---

## Tool URLs

| Tool | URL |
|------|-----|
| Criteria Viewer | `https://iteratio.nz/crr-criteria/viewer/` |
| Triage Advisor | `https://iteratio.nz/crr-criteria/triage/` |

Both tools load criteria data from the API at runtime and require no local installation.

---

## Criteria Viewer

The Viewer displays the published referral criteria for a given exam/site. It can operate standalone or be embedded in a referral workflow.

### URL Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `exam` | exam ID (see below) | none | Pre-selects an exam modality |
| `sites` | site ID(s), comma-separated | none | Pre-ticks one or more anatomical sites |
| `region` | region key (see below) | `aucklandregion` | Sets the HealthPathways region; persists to `localStorage` on visit |
| `mode` | `interactive` \| `passive` | `interactive` | Fixes the view mode. If omitted, mode toggle is shown in-page |
| `embed` | `modal` | unset | Marks the tool as embedded in a modal iframe — hides the disclaimer banner and compact header |
| `sendButton` | `on` | unset | Shows a **Send to Form** button (only active when opened via `window.open()` or as a modal). On click, posts the selected criteria text back to the opener via `postMessage` and closes the window |

### Receiving the `postMessage` from `sendButton`

When `?sendButton=on` is set and the user clicks **Send to Form**, the viewer posts to `window.opener`:

```javascript
{ type: 'crr-output', text: '<selected criteria text>', source: 'viewer' }
```

Listen in your referral form page:

```javascript
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'crr-output') {
    document.getElementById('referralNotes').value = event.data.text;
  }
});
```

### Opening as a popup from a referral form

```javascript
window.open(
  'https://iteratio.nz/crr-criteria/viewer/'
  + '?exam=ct&sites=ct_head&region=aucklandregion&sendButton=on',
  'crr-viewer',
  'width=960,height=720,resizable=yes,scrollbars=yes'
);
```

The `?sendButton=on` flag enables **Send to Form** behaviour — after selecting criteria, the user clicks the button to push the text back to your form and close the window.

### Example URLs

```
# Open to CT Head for Auckland clinicians
?exam=ct&sites=ct_head&region=aucklandregion

# Open to CT Chest + CT Abdomen/Pelvis together, Canterbury region
?exam=ct&sites=ct_chest,ct_cap&region=canterbury

# Pre-select knee X-ray, passive (read-only) view
?exam=xr&sites=xr_knee&mode=passive

# Embedded in referral form modal, send-back enabled
?exam=us&sites=us_pelvis&region=midland&embed=modal&sendButton=on
```

---

## Triage Advisor

The Triage Advisor takes a free-text clinical referral note and returns an AI-assisted criteria assessment — identifying which criteria are met and suggesting referral wording.

### URL Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `presentation` | URL-encoded clinical text | none | Pre-populates the referral note field. When set, the tool auto-runs an assessment on load |
| `sendButton` | `on` | unset | Shows a **Send to Form** button in the assessment result. Posts `suggested_wording` back to the opener via `postMessage` and closes the window |

### Receiving the `postMessage` from `sendButton`

The Triage Advisor posts the same message format as the Viewer:

```javascript
{ type: 'crr-output', text: '<suggested wording>', source: 'triage' }
```

### Opening as a popup from a referral form

```javascript
var noteText = document.getElementById('referralNote').value;
window.open(
  'https://iteratio.nz/crr-criteria/triage/'
  + '?presentation=' + encodeURIComponent(noteText) + '&sendButton=on',
  'crr-triage',
  'width=1100,height=760,resizable=yes,scrollbars=yes'
);
```

This passes the GP's existing note text into the Triage Advisor, which immediately runs an assessment. The clinician can review it and click **Send to Form** to push the improved wording back to the referral.

---

## Valid `exam` and `sites` values

### CT — `exam=ct`

| `sites=` value | Label |
|----------------|-------|
| `ct_head` | Head |
| `ct_cap` | Chest / Abdomen / Pelvis |
| `ct_chest` | Chest |
| `ct_colonography` | Colonography (CTC) |
| `ct_ivu` | IVU / CT Renal |
| `ct_kub` | KUB |
| `ct_sinus` | Sinus |
| `ct_other` | Other (incl. CT Abdo/Pelvis) |

### Ultrasound — `exam=us`

| `sites=` value | Label |
|----------------|-------|
| `us_abdomen` | Abdomen |
| `us_carotid` | Carotid |
| `us_dvt` | DVT |
| `us_msk` | Musculoskeletal (incl. Shoulder) |
| `us_neck_thyroid` | Neck / Thyroid |
| `us_pelvis` | Pelvis |
| `us_renal` | Renal |
| `us_scrotum` | Scrotum |
| `us_soft_tissue` | Soft Tissue |

### X-Ray — `exam=xr`

| `sites=` value | Label |
|----------------|-------|
| `xr_chest` | Chest |
| `xr_abdomen` | Abdomen |
| `xr_ankle_foot` | Ankle / Foot |
| `xr_elbow` | Elbow |
| `xr_knee` | Knee |
| `xr_pelvis_hip` | Pelvis / Hip |
| `xr_shoulder` | Shoulder |
| `xr_spine` | Spine |
| `xr_wrist_hand` | Wrist / Hand |
| `xr_humerus` | Humerus |
| `xr_forearm` | Forearm |
| `xr_femur` | Femur |
| `xr_tibia_fibula` | Tibia / Fibula |

### MRI — `exam=mri_lumbar`

Single-site exam — no `sites=` parameter needed.

---

### Paediatric exams

Paediatric mode cannot be activated via URL parameter; it is toggled in-page by the user. Paediatric exam/site IDs are listed below for reference only.

| Modality | Site ID | Label |
|----------|---------|-------|
| CT | `ct_head_paed` | Head |
| US | `us_abdomen_paed` | Abdomen |
| US | `us_hip_paed` | Hip (DDH) |
| US | `us_renal_paed` | Renal |
| US | `us_scrotum_paed` | Scrotum / Testis |
| US | `us_soft_tissue_paed` | Soft Tissue |
| XR | `xr_abdomen_paed` | Abdomen |
| XR | `xr_chest_paed` | Chest |
| XR | `xr_elbow_paed` | Elbow |
| XR | `xr_feet_paed` | Feet |
| XR | `xr_knee_paed` | Knee |
| XR | `xr_pelvis_hip_paed` | Pelvis / Hip |
| XR | `xr_shoulder_paed` | Shoulder |
| XR | `xr_spine_paed` | Spine |
| XR | `xr_wrist_hand_paed` | Wrist / Hand |
| XR | `xr_humerus_paed` | Humerus |
| XR | `xr_forearm_paed` | Forearm |
| XR | `xr_femur_paed` | Femur |
| XR | `xr_tibia_fibula_paed` | Tibia / Fibula |

---

## Valid `region` values

| `region=` value | Label | HealthPathways domain |
|-----------------|-------|-----------------------|
| `aucklandregion` | Auckland Region | aucklandregion.communityhealthpathways.org |
| `northland` | Northland | northland.communityhealthpathways.org |
| `midland` | Midland | midland.communityhealthpathways.org |
| `hawkesbay` | Hawke's Bay | hawkesbay.communityhealthpathways.org |
| `3d` | Central (3D) | 3d.communityhealthpathways.org |
| `canterbury` | Waitaha Canterbury | canterbury.communityhealthpathways.org |
| `southern` | Southern | southern.communityhealthpathways.org |
| `ccp` | Whanganui & MidCentral CHP | ccp.communityhealthpathways.org |

Region selection persists to `localStorage` (key: `crr-region`) and is applied on subsequent visits.

---

## Public API

**Base URL:** `https://crr-criteria-api.fk4dsrmq5r.workers.dev`

No authentication required for the following endpoints.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/criteria` | Full published criteria dataset (exams, paedExams, version) |
| `GET` | `/api/criteria/:id` | Single exam or site criteria record |
| `GET` | `/api/version` | Current published version metadata |
| `GET` | `/api/match-data` | NLP match data for the Triage Advisor (cached 5 min) |
| `GET` | `/api/regions` | Region-specific HealthPathways URL overrides |
| `GET` | `/api/health` | Health check — returns `{ status: "ok", version: "..." }` |
| `POST` | `/api/triage/assess` | Proxies AI assessment requests to Anthropic (server-side key) |
| `POST` | `/api/qa-review` | Submit a Triage Advisor QA evaluation (rate-limited: 100/hr/IP) |
| `POST` | `/api/qa-viewer-review` | Submit a Criteria Viewer QA evaluation (rate-limited: 100/hr/IP) |

### `POST /api/triage/assess`

Accepts an Anthropic Messages API payload and returns the model response. The API key is held server-side and never exposed to the browser.

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 2400,
  "system": [{ "type": "text", "text": "<system prompt>" }],
  "messages": [{ "role": "user", "content": "<referral note>" }]
}
```

---

## `?mode=` behaviour reference

| Value | Effect |
|-------|--------|
| `interactive` | Default. Expandable criterion cards with checkboxes, decision panel, copy buttons. |
| `passive` | Read-only reference view. No checkboxes, no copy buttons, no decision panel. Full-width single-column layout. |
| *(omitted)* | Defaults to `interactive`. Mode toggle shown in-page. |
