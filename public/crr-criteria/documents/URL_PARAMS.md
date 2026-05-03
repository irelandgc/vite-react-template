# CRR Criteria — URL Parameters & API Reference

**Last updated:** 2026-05-04  
**Viewer version:** v5.2.0  
**Criteria version:** v4.0.0 (April 2026 release)

---

## Viewer URL Parameters

**Base URL:**  
`https://vite-react-template.fk4dsrmq5r.workers.dev/crr-criteria/viewer/crr-criteria-viewer-v5.2.html`

### Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `exam` | exam ID (see below) | none | Pre-selects an exam type |
| `sites` | site ID(s), comma-separated | none | Pre-ticks one or more anatomical sites |
| `region` | region key (see below) | `aucklandregion` | Sets HealthPathways region and persists to `localStorage` |
| `mode` | `interactive` \| `passive` | `interactive` | Fixes the view mode. If omitted, mode toggle buttons are shown in the header |
| `popup` | `1` | unset | Marks the tool as opened from a referral form. Changes "Copy & Close" button to "Copy + Close tab" with `window.close()` behaviour |

### Combined example

```
?exam=ct&sites=ct_head,ct_chest&region=canterbury&mode=interactive
?exam=xr&sites=xr_knee&popup=1
?exam=us&sites=us_pelvis&region=midland&mode=passive
```

---

### Valid `exam` and `site` values

#### CT — `exam=ct`

| `sites=` value | Label |
|----------------|-------|
| `ct_head` | Head |
| `ct_cap` | Chest/Abdomen/Pelvis |
| `ct_chest` | Chest |
| `ct_colonography` | Colonography (CTC) |
| `ct_ivu` | IVU / CT Renal |
| `ct_kub` | KUB |
| `ct_sinus` | Sinus |
| `ct_other` | Other (incl. CT Abdo/Pelvis) |

#### Ultrasound — `exam=us`

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

#### X-Ray — `exam=xr`

| `sites=` value | Label | New in v4.0.0 |
|----------------|-------|---------------|
| `xr_chest` | Chest | |
| `xr_abdomen` | Abdomen | |
| `xr_ankle_foot` | Ankle / Foot | |
| `xr_elbow` | Elbow | |
| `xr_knee` | Knee | |
| `xr_pelvis_hip` | Pelvis / Hip | |
| `xr_shoulder` | Shoulder | |
| `xr_spine` | Spine | |
| `xr_wrist_hand` | Wrist / Hand | |
| `xr_humerus` | Humerus | ✓ |
| `xr_forearm` | Forearm | ✓ |
| `xr_femur` | Femur | ✓ |
| `xr_tibia_fibula` | Tibia / Fibula | ✓ |

#### MRI — `exam=mri_lumbar`

Single-site exam — no `sites=` parameter needed.

---

### Paediatric exams

Paediatric mode is toggled via the **Paediatric Criteria** button in the header — it cannot currently be activated via a URL parameter. The `?exam=` and `?sites=` parameters only apply to adult exams.

Paediatric exam/site IDs for reference (used in `COPY_TEXTS` and `EMBEDDED_DATA`):

| Modality | Site ID | Label |
|----------|---------|-------|
| CT Paed | `ct_head_paed` | Head |
| US Paed | `us_abdomen_paed` | Abdomen |
| US Paed | `us_hip_paed` | Hip (DDH) |
| US Paed | `us_renal_paed` | Renal |
| US Paed | `us_scrotum_paed` | Scrotum / Testis |
| US Paed | `us_soft_tissue_paed` | Soft Tissue |
| XR Paed | `xr_abdomen_paed` | Abdomen |
| XR Paed | `xr_chest_paed` | Chest |
| XR Paed | `xr_elbow_paed` | Elbow |
| XR Paed | `xr_feet_paed` | Feet |
| XR Paed | `xr_knee_paed` | Knee |
| XR Paed | `xr_pelvis_hip_paed` | Pelvis / Hip |
| XR Paed | `xr_shoulder_paed` | Shoulder |
| XR Paed | `xr_spine_paed` | Spine |
| XR Paed | `xr_wrist_hand_paed` | Wrist / Hand |
| XR Paed | `xr_humerus_paed` | Humerus |
| XR Paed | `xr_forearm_paed` | Forearm |
| XR Paed | `xr_femur_paed` | Femur |
| XR Paed | `xr_tibia_fibula_paed` | Tibia / Fibula |

---

### Valid `region` values

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

Region selection persists to `localStorage` (`crr-region`) and is applied on subsequent visits.

---

### `?mode=` behaviour

| Value | Effect |
|-------|--------|
| `interactive` | Default. Expandable criterion cards with checkboxes, decision panel, copy buttons, output preview. Mode toggle buttons hidden. |
| `passive` | Read-only reference view. Full-width single-column layout. No checkboxes, no copy buttons, no decision panel. Mode toggle buttons hidden. |
| *(omitted)* | Defaults to `interactive`. Mode toggle buttons shown in header so user can switch. |

### `?popup=1` behaviour

When `?popup=1` is present:
- The copy-and-close button label changes to **"Copy + Close tab"**
- After copying, `window.close()` is attempted (works when the tool was opened via `window.open()` from a referral form)
- If `window.close()` is blocked by the browser, a status message reads "Copied. You can now close this tab."

When `?popup=1` is absent:
- The button shows as **"Copy"** (no close behaviour)

---

## API Reference

**API Base URL:** `https://crr-criteria-api.fk4dsrmq5r.workers.dev`

### Public endpoints (no authentication)

| Method | Endpoint | Parameters | Description |
|--------|----------|------------|-------------|
| `GET` | `/api/criteria` | — | Returns full published criteria dataset (exams, paedExams, version) |
| `GET` | `/api/criteria/:id` | `:id` = exam or site ID | Returns a single exam or site's criteria |
| `GET` | `/api/version` | — | Returns current published version metadata |
| `GET` | `/api/match-data` | — | Returns NLP match data for the Triage Advisor (cached 5 min) |
| `GET` | `/api/regions` | — | Returns region override data (HealthPathways URL customisation) |
| `GET` | `/api/health` | — | Health check — returns `{ status: "ok" }` |
| `POST` | `/api/triage/assess` | Body: Anthropic messages API payload | Proxies assessment requests to Anthropic API (server-side key) |

### Admin endpoints (authentication required)

Require either:
- `x-admin-key: <key>` header, or
- Cloudflare Access JWT (`cf-access-jwt-assertion` header)

| Method | Endpoint | Query params / Body | Description |
|--------|----------|---------------------|-------------|
| `GET` | `/api/admin/criteria` | — | All criteria from D1 working copy |
| `GET` | `/api/admin/criteria/:id` | `:id` = criteria record ID | Single criteria record |
| `PUT` | `/api/admin/criteria/:id` | Body: updated criteria JSON | Update a criteria record |
| `POST` | `/api/admin/criteria` | Body: new criteria JSON | Create a new criteria record |
| `DELETE` | `/api/admin/criteria/:id` | — | Delete a criteria record |
| `GET` | `/api/admin/versions` | — | List all saved versions |
| `POST` | `/api/admin/versions` | Body: version payload | Save a new version snapshot |
| `POST` | `/api/admin/versions/:id/publish` | `:id` = version ID | Publish a saved version to KV (makes it live) |
| `POST` | `/api/admin/publish` | Body: criteria data | Publish working copy directly to KV |
| `POST` | `/api/admin/versions/:id/rollback` | `:id` = version ID | Restore a past version to KV |
| `GET` | `/api/admin/audit` | `?limit=N` (default 50) | Audit log of all publish/update/rollback actions |
| `GET` | `/api/admin/regions` | — | All region override records |
| `PUT` | `/api/admin/regions/:regionId` | Body: region override data | Update a region's HealthPathways URL overrides |
| `POST` | `/api/admin/extract-pdf` | Body: `{ pdf: base64, currentCriteria, chunkInfo, mode }` | Server-side PDF processing via Anthropic API (`mode`: `diff` or `replace`) |
| `GET` | `/api/debug` | — | Debug info (KV keys, env vars present) |
| `GET` | `/api/debug/seed` | — | Check seed data status |
| `POST` | `/api/seed` | `?key=published\|match-data\|version` | Write seed data to KV |

---

## Referral form integration example

To open the viewer as a popup from a referral form (e.g. BPAC, HealthLink):

```javascript
window.open(
  'https://vite-react-template.fk4dsrmq5r.workers.dev/crr-criteria/viewer/crr-criteria-viewer-v5.2.html'
  + '?exam=ct&sites=ct_head&region=aucklandregion&popup=1',
  'crr-viewer',
  'width=900,height=700,resizable=yes,scrollbars=yes'
);
```

The `?popup=1` flag enables "Copy + Close tab" behaviour so the user can copy their selected indicators and return to the referral form in one click.
