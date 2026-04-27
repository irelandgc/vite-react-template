# URL Parameters

## Viewer (`viewer/index.html` and `viewer/popup.html`)

| Parameter | Example | Description |
|-----------|---------|-------------|
| `exam` | `?exam=ct` | Pre-selects an exam type by ID (e.g. `ct`, `us`, `xr`, `mri_lumbar`, `mri_shoulder`) |
| `sites` | `?sites=ct_head,ct_chest` | Pre-ticks one or more anatomical sites (comma-separated IDs) |
| `region` | `?region=waikato` | Pre-selects an NZ health region and persists to `localStorage` |

Parameters can be combined:
```
?exam=ct&sites=ct_head,ct_chest&region=canterbury
```

### Valid `region` values
`aucklandregion`, `northland`, `waikato`, `bayofplenty`, `hawkesbay`, `3d`, `midcentral`, `whanganui`, `canterbury`, `southern`

---

## API (`api/worker.ts`)

| Parameter | Endpoint | Example | Description |
|-----------|----------|---------|-------------|
| `key` | `POST /api/seed` | `?key=published` | KV key to write seed data to (`published`, `match-data`, `version`) |
| `limit` | `GET /api/admin/audit` | `?limit=100` | Max audit log entries to return (default: 50) |
1chec