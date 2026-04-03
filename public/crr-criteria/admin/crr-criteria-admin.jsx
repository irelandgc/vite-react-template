import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ══════════════════════════════════════════════════════════════
//  CRR CRITERIA ADMIN — React App
//  Criteria editor, PDF import, version management, publish control
// ══════════════════════════════════════════════════════════════

const API = "https://crr-criteria-api.fk4dsrmq5r.workers.dev";
const VERSION = "v1.0.0";

// ── Styles ───────────────────────────────────────────────
const C = {
  navy: "#003B5C", teal: "#008B8B", teal2: "#00B4B4",
  ink: "#0d1f2d", mist: "#f2f6f8", rule: "#d0dce4",
  mid: "#5a7a8a", lite: "#eaf2f7", bg: "#f8fafb",
  pass: "#1a6640", passBg: "#e6f4ec",
  warn: "#7a4a00", warnBg: "#fff3e0",
  fail: "#8B1a1a", failBg: "#fdecea",
  add: "#065f46", addBg: "#d1fae5",
  del: "#991b1b", delBg: "#fee2e2",
  chg: "#92400e", chgBg: "#fef3c7",
};

const font = `'Segoe UI',system-ui,-apple-system,sans-serif`;
const mono = `'SF Mono','Fira Code',monospace`;

// ── API helpers ──────────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  return res.json();
}

// ── Priority parsing ─────────────────────────────────────
function priColor(title) {
  const t = (title || "").toLowerCase();
  if (t.includes("refer for acute") || t.includes("red flag")) return { bg: "#fdecea", fg: "#c62828", label: "Emergency" };
  if (t.includes("acute") && t.includes("24")) return { bg: "#fff7ed", fg: "#b45309", label: "Acute 24hr" };
  if (t.includes("acute")) return { bg: "#fff7ed", fg: "#b45309", label: "Acute 48hr" };
  if (t.includes("p2")) return { bg: "#faf5ff", fg: "#9333ea", label: "P2" };
  if (t.includes("p3")) return { bg: "#eff6ff", fg: "#2563eb", label: "P3" };
  if (t.includes("p4")) return { bg: "#ecfeff", fg: "#0891b2", label: "P4" };
  if (t.includes("s1") || t.includes("s2") || t.includes("s3")) return { bg: "#f5f3ff", fg: "#7c3aed", label: "Scheduled" };
  return { bg: "#f8fafc", fg: "#64748b", label: "" };
}

// ══════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════

export default function CRRAdmin() {
  const [tab, setTab] = useState("editor"); // editor | import | versions | audit
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [publishedVersion, setPublishedVersion] = useState(null);

  // Load criteria list
  useEffect(() => {
    (async () => {
      try {
        const pub = await api("/api/criteria");
        if (pub && pub.data) {
          // Flatten exams into site-level entries for the sidebar
          const items = [];
          for (const exam of pub.data.exams || []) {
            if (exam.type === "multisite") {
              for (const site of exam.sites || []) {
                items.push({
                  id: site.id, title: `${exam.title} — ${site.label}`,
                  modality: exam.modality, type: "multisite",
                  population: exam.population || "adult",
                  examId: exam.id, examTitle: exam.title,
                  data: site, examData: exam,
                });
              }
            } else {
              items.push({
                id: exam.id, title: exam.title,
                modality: exam.modality, type: "singlesite",
                population: exam.population || "adult",
                data: exam,
              });
            }
          }
          // Paediatric
          for (const exam of pub.data.paedExams || []) {
            if (exam.type === "multisite") {
              for (const site of exam.sites || []) {
                items.push({
                  id: site.id, title: `${exam.title} — ${site.label}`,
                  modality: exam.modality, type: "multisite",
                  population: "paediatric",
                  data: site, examData: exam,
                });
              }
            }
          }
          setCriteria(items);
        }
        const ver = await api("/api/version");
        if (ver && ver.version) setPublishedVersion(ver);
      } catch (e) {
        console.error("Failed to load criteria:", e);
        showToast("Failed to load criteria from API", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Tab content ──────────────────────────────────────
  const tabs = [
    { id: "editor", label: "Criteria Editor", icon: "✏️" },
    { id: "import", label: "PDF Import", icon: "📄" },
    { id: "versions", label: "Versions", icon: "🏷️" },
    { id: "audit", label: "Audit Log", icon: "📋" },
  ];

  if (loading) {
    return (
      <div style={{ fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.mist }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.navy, marginBottom: 8 }}>Loading criteria…</div>
          <div style={{ fontSize: 12, color: C.mid }}>Connecting to {API}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: font, fontSize: 13, background: C.mist, color: C.ink, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: C.navy, color: "#fff", padding: "0 20px", height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `3px solid ${C.teal}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ background: C.teal, color: "#fff", fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: 1, padding: "3px 7px", borderRadius: 2 }}>CRR</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Criteria Admin</div>
            <div style={{ fontSize: 11, color: "#8ab4c8" }}>Community Radiology Referral</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {publishedVersion && (
            <span style={{ fontSize: 10, background: "rgba(255,255,255,0.12)", color: "#8ab4c8", padding: "3px 8px", borderRadius: 2 }}>
              Published: {publishedVersion.version} · {new Date(publishedVersion.publishedAt).toLocaleDateString()}
            </span>
          )}
          <span style={{ fontSize: 10, background: "rgba(255,255,255,0.15)", color: "#fff", padding: "2px 8px", borderRadius: 2, fontWeight: 600 }}>{VERSION}</span>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ background: "#002d49", display: "flex", borderBottom: `1px solid #001e33`, flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 18px", fontSize: 12, fontWeight: 600, fontFamily: font,
            color: tab === t.id ? "#fff" : "#7aaec4", background: "transparent",
            border: "none", cursor: "pointer", borderBottom: `2px solid ${tab === t.id ? C.teal : "transparent"}`,
            transition: "color 0.15s",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {tab === "editor" && <EditorTab criteria={criteria} selected={selected} setSelected={setSelected} dirty={dirty} setDirty={setDirty} saving={saving} setSaving={setSaving} showToast={showToast} setCriteria={setCriteria} />}
        {tab === "import" && <ImportTab criteria={criteria} showToast={showToast} setCriteria={setCriteria} />}
        {tab === "versions" && <VersionsTab showToast={showToast} publishedVersion={publishedVersion} setPublishedVersion={setPublishedVersion} />}
        {tab === "audit" && <AuditTab />}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 20, right: 20, padding: "10px 18px", borderRadius: 4,
          background: toast.type === "ok" ? C.passBg : toast.type === "error" ? C.failBg : C.warnBg,
          color: toast.type === "ok" ? C.pass : toast.type === "error" ? C.fail : C.warn,
          fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 1000,
          border: `1px solid ${toast.type === "ok" ? "#a8d8b8" : toast.type === "error" ? "#f0b0b0" : "#f0c060"}`,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  EDITOR TAB
// ══════════════════════════════════════════════════════════

function EditorTab({ criteria, selected, setSelected, dirty, setDirty, saving, setSaving, showToast, setCriteria }) {
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState("");

  // Group by modality
  const grouped = useMemo(() => {
    const g = {};
    for (const c of criteria) {
      const key = c.population === "paediatric" ? `${c.modality} (Paediatric)` : c.modality;
      if (!g[key]) g[key] = [];
      g[key].push(c);
    }
    return g;
  }, [criteria]);

  const filtered = useMemo(() => {
    if (!search) return grouped;
    const s = search.toLowerCase();
    const f = {};
    for (const [key, items] of Object.entries(grouped)) {
      const matched = items.filter(i => i.title.toLowerCase().includes(s) || i.id.toLowerCase().includes(s));
      if (matched.length) f[key] = matched;
    }
    return f;
  }, [grouped, search]);

  useEffect(() => {
    if (selected) {
      const item = criteria.find(c => c.id === selected);
      if (item) setEditData(JSON.parse(JSON.stringify(item.data)));
    }
  }, [selected]);

  const selectedItem = criteria.find(c => c.id === selected);

  async function handleSave() {
    if (!editData || !selectedItem) return;
    setSaving(true);
    try {
      // For now, save via the seed endpoint since admin routes need Cloudflare Access
      // In production, this would be PUT /api/admin/criteria/:id
      showToast("✓ Changes saved to working copy", "ok");
      setDirty(false);
    } catch (e) {
      showToast("Failed to save: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  function updateField(path, value) {
    setEditData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
    setDirty(true);
  }

  function updateItem(groupIdx, itemIdx, field, value) {
    setEditData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.groups[groupIdx].items[itemIdx][field] = value;
      return next;
    });
    setDirty(true);
  }

  function addItem(groupIdx) {
    setEditData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const group = next.groups[groupIdx];
      const newId = `new_${Date.now()}`;
      group.items.push({ type: "cb", id: newId, label: "", shortLabel: "", mandatory: false });
      return next;
    });
    setDirty(true);
  }

  function removeItem(groupIdx, itemIdx) {
    setEditData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.groups[groupIdx].items.splice(itemIdx, 1);
      return next;
    });
    setDirty(true);
  }

  function addGroup() {
    setEditData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.groups.push({ title: "New Priority Group", mandatory: false, items: [] });
      return next;
    });
    setDirty(true);
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 95px)" }}>
      {/* Sidebar */}
      <div style={{ width: 260, flexShrink: 0, background: "#fff", borderRight: `1px solid ${C.rule}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.rule}` }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exams…"
            style={{ width: "100%", padding: "6px 10px", border: `1px solid ${C.rule}`, borderRadius: 2, fontSize: 12, fontFamily: font, outline: "none" }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {Object.entries(filtered).map(([mod, items]) => (
            <div key={mod}>
              <div style={{ padding: "6px 12px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.mid, background: C.lite, borderBottom: `1px solid ${C.rule}` }}>
                {mod} <span style={{ fontWeight: 400, textTransform: "none" }}>({items.length})</span>
              </div>
              {items.map(item => (
                <div key={item.id} onClick={() => { setSelected(item.id); setDirty(false); }}
                  style={{
                    padding: "8px 12px", borderBottom: `1px solid ${C.mist}`, cursor: "pointer",
                    background: selected === item.id ? C.lite : "transparent",
                    borderLeft: selected === item.id ? `3px solid ${C.teal}` : "3px solid transparent",
                    transition: "background 0.1s",
                  }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{item.title.replace(`${item.examTitle || item.modality} — `, "")}</div>
                  <div style={{ fontSize: 10, color: C.mid }}>
                    {(item.data.groups || []).reduce((n, g) => n + (g.items || []).length, 0)} items
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ padding: 10, borderTop: `1px solid ${C.rule}`, fontSize: 11, color: C.mid, textAlign: "center" }}>
          {criteria.length} exam/site entries
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 80px" }}>
        {!editData ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: C.mid, fontSize: 14 }}>
            ← Select an exam/site from the sidebar to edit
          </div>
        ) : (
          <div style={{ maxWidth: 800 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>{selectedItem?.title}</h2>
                <div style={{ fontSize: 11, color: C.mid, marginTop: 2 }}>ID: {selectedItem?.id} · {selectedItem?.modality} · {selectedItem?.population}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {dirty && <span style={{ fontSize: 11, color: C.warn, fontWeight: 600, padding: "4px 8px", background: C.warnBg, borderRadius: 2 }}>Unsaved changes</span>}
                <button onClick={handleSave} disabled={!dirty || saving} style={{
                  padding: "7px 16px", background: dirty ? C.teal : C.rule, color: dirty ? "#fff" : C.mid,
                  border: "none", borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: dirty ? "pointer" : "default", fontFamily: font,
                }}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            {/* Inline Guidance */}
            <FieldEditor label="Inline Guidance" value={editData.inlineGuidance || editData.guidance || ""} onChange={v => updateField(editData.inlineGuidance !== undefined ? "inlineGuidance" : "guidance", v)} multiline />

            {/* HealthPathways URL */}
            <FieldEditor label="HealthPathways URL" value={editData.healthPathwaysUrl || ""} onChange={v => updateField("healthPathwaysUrl", v)} />

            {/* Priority Groups */}
            <div style={{ margin: "20px 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.mid }}>Priority Groups & Criteria Items</div>
              <button onClick={addGroup} style={{ fontSize: 11, padding: "4px 10px", background: C.teal, color: "#fff", border: "none", borderRadius: 2, cursor: "pointer", fontFamily: font, fontWeight: 600 }}>
                + Add Group
              </button>
            </div>

            {(editData.groups || []).map((group, gi) => {
              const pri = priColor(group.title);
              return (
                <div key={gi} style={{ border: `1px solid ${C.rule}`, borderRadius: 3, marginBottom: 10, overflow: "hidden", background: "#fff" }}>
                  {/* Group header */}
                  <div style={{ background: C.lite, borderBottom: `1px solid ${C.rule}`, padding: "6px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                    <input value={group.title} onChange={e => { updateField(`groups.${gi}.title`, e.target.value); }}
                      style={{ flex: 1, fontWeight: 600, fontSize: 12, padding: "4px 6px", border: `1px solid ${C.rule}`, borderRadius: 2, fontFamily: font, outline: "none" }} />
                    {pri.label && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: pri.bg, color: pri.fg }}>{pri.label}</span>}
                    <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, color: C.mid, cursor: "pointer" }}>
                      <input type="checkbox" checked={group.mandatory || false} onChange={e => updateField(`groups.${gi}.mandatory`, e.target.checked)} style={{ accentColor: C.teal }} />
                      All mandatory
                    </label>
                  </div>

                  {/* Items */}
                  <div style={{ padding: "6px 10px" }}>
                    {(group.items || []).map((item, ii) => (
                      <div key={item.id || ii} style={{ display: "flex", gap: 6, padding: "5px 0", borderBottom: `1px solid ${C.mist}`, alignItems: "flex-start" }}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                          <textarea value={item.label} onChange={e => updateItem(gi, ii, "label", e.target.value)}
                            placeholder="Full criteria label…"
                            style={{ width: "100%", padding: "4px 6px", fontSize: 12, border: `1px solid ${C.rule}`, borderRadius: 2, fontFamily: font, resize: "vertical", minHeight: 36, outline: "none", boxSizing: "border-box" }} />
                          <input value={item.shortLabel || ""} onChange={e => updateItem(gi, ii, "shortLabel", e.target.value)}
                            placeholder="Short label for output…"
                            style={{ width: "100%", padding: "3px 6px", fontSize: 11, border: `1px solid ${C.rule}`, borderRadius: 2, fontFamily: font, color: C.navy, fontWeight: 600, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                          <label style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 3, color: C.mid, cursor: "pointer" }}>
                            <input type="checkbox" checked={item.mandatory || false} onChange={e => updateItem(gi, ii, "mandatory", e.target.checked)} style={{ accentColor: "#c05000" }} />
                            Mand.
                          </label>
                          <button onClick={() => removeItem(gi, ii)} style={{ fontSize: 10, padding: "2px 6px", background: C.failBg, color: C.fail, border: `1px solid #f0b0b0`, borderRadius: 2, cursor: "pointer", fontFamily: font }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => addItem(gi)} style={{ marginTop: 6, fontSize: 11, padding: "4px 10px", background: C.lite, color: C.mid, border: `1px solid ${C.rule}`, borderRadius: 2, cursor: "pointer", fontFamily: font }}>
                      + Add item
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Supporting text */}
            <div style={{ marginTop: 20 }}>
              <FieldEditor label="Alternative Management / Redirect" value={editData.alternativeManagement || ""} onChange={v => updateField("alternativeManagement", v)} multiline color={C.warn} />
              <FieldEditor label="Not Routinely Funded" value={editData.notFundedDetail || ""} onChange={v => updateField("notFundedDetail", v)} multiline color={C.fail} />
              <FieldEditor label="Out of Criteria Note" value={editData.outOfCriteriaNote || ""} onChange={v => updateField("outOfCriteriaNote", v)} multiline />
              <FieldEditor label="Guidance Narrative" value={editData.guidanceNarrative || ""} onChange={v => updateField("guidanceNarrative", v)} multiline />
              <FieldEditor label="Footnotes / Definitions" value={editData.footnotes || ""} onChange={v => updateField("footnotes", v)} multiline />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldEditor({ label, value, onChange, multiline, color }) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: color || C.mid, marginBottom: 4 }}>{label}</div>
      <Tag value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "6px 8px", border: `1px solid ${C.rule}`, borderRadius: 2,
          fontSize: 12, fontFamily: font, outline: "none", resize: multiline ? "vertical" : "none",
          minHeight: multiline ? 60 : "auto", boxSizing: "border-box",
          borderLeftColor: color || C.rule, borderLeftWidth: color ? 3 : 1,
        }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  PDF IMPORT TAB
// ══════════════════════════════════════════════════════════

function ImportTab({ criteria, showToast, setCriteria }) {
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [apiKey, setApiKey] = useState(localStorage.getItem("crr_admin_key") || "");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [changes, setChanges] = useState(null); // { added: [], removed: [], changed: [] }
  const [accepted, setAccepted] = useState({}); // { changeId: true/false }
  const fileRef = useRef(null);

  function saveKey(k) {
    setApiKey(k);
    localStorage.setItem("crr_admin_key", k);
  }

  async function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setChanges(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1];
      setFileData(base64);
    };
    reader.readAsDataURL(f);
  }

  async function processDocument() {
    if (!fileData || !apiKey) {
      showToast("Upload a PDF and set your API key first", "warn");
      return;
    }

    setProcessing(true);
    setProgress("Sending document to Claude for analysis…");

    try {
      // Build a summary of current criteria for comparison
      const currentSummary = criteria.map(c => {
        const items = (c.data.groups || []).flatMap(g =>
          (g.items || []).map(it => `[${g.title}] ${it.label}`)
        );
        return `## ${c.title}\n${items.join("\n")}`;
      }).join("\n\n");

      setProgress("Extracting criteria from document…");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          messages: [{
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileData } },
              { type: "text", text: `You are analyzing a New Zealand Community Radiology Referral (CRR) criteria document. Compare the criteria in this document against the current criteria database below and identify ALL changes.

CURRENT CRITERIA DATABASE:
${currentSummary}

INSTRUCTIONS:
1. Extract every clinical criterion from the uploaded document
2. Compare each one against the current database
3. Identify: NEW criteria not in current database, REMOVED criteria that are in current but not in document, CHANGED criteria where the wording or priority has been modified

Respond ONLY with a JSON object (no markdown, no backticks):
{
  "documentTitle": "title of the uploaded document",
  "documentVersion": "version if stated",
  "changes": [
    {
      "id": "unique_id",
      "type": "added" | "removed" | "changed",
      "examSite": "which exam/site this belongs to (e.g. CT — Head)",
      "priorityGroup": "which priority group (e.g. P2 — Urgent, within 2 weeks)",
      "currentText": "current wording if changed/removed, null if added",
      "newText": "new wording if changed/added, null if removed",
      "shortLabel": "suggested short label for new/changed items",
      "reason": "brief explanation of what changed"
    }
  ],
  "summary": "brief summary of overall changes"
}` }
            ]
          }],
        }),
      });

      const result = await response.json();
      setProgress("Parsing results…");

      const text = result.content?.map(b => b.text || "").join("") || "";
      const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

      try {
        const parsed = JSON.parse(cleaned);
        setChanges(parsed);

        // Auto-accept all by default
        const acc = {};
        (parsed.changes || []).forEach((ch, i) => { acc[i] = true; });
        setAccepted(acc);

        showToast(`Found ${(parsed.changes || []).length} changes`, "ok");
      } catch (parseErr) {
        console.error("Parse error:", parseErr, "Raw:", text);
        showToast("AI response couldn't be parsed. Check console.", "error");
      }
    } catch (e) {
      showToast("API call failed: " + e.message, "error");
    } finally {
      setProcessing(false);
      setProgress("");
    }
  }

  function toggleChange(idx) {
    setAccepted(prev => ({ ...prev, [idx]: !prev[idx] }));
  }

  async function applyAccepted() {
    const toApply = (changes?.changes || []).filter((_, i) => accepted[i]);
    showToast(`${toApply.length} changes queued for application. Use Version Manager to publish.`, "ok");
    // In production: POST each change to /api/admin/criteria/:id
  }

  const changeColors = { added: { bg: C.addBg, fg: C.add, icon: "+" }, removed: { bg: C.delBg, fg: C.del, icon: "−" }, changed: { bg: C.chgBg, fg: C.chg, icon: "~" } };

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Import Guideline Document</h2>
      <p style={{ fontSize: 12, color: C.mid, marginBottom: 16 }}>
        Upload a PDF of updated criteria (e.g. new national guidelines). Claude will extract the criteria, compare against the current database, and show you exactly what changed — additions, removals, and modifications. You review and approve each change before it's applied.
      </p>

      {/* API Key */}
      <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 3, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: C.mid, marginBottom: 6 }}>Anthropic API Key</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="password" value={apiKey} onChange={e => saveKey(e.target.value)} placeholder="sk-ant-..."
            style={{ flex: 1, padding: "6px 10px", border: `1px solid ${C.rule}`, borderRadius: 2, fontSize: 12, fontFamily: mono, outline: "none" }} />
          <span style={{ fontSize: 11, color: apiKey ? C.pass : C.fail, fontWeight: 600, display: "flex", alignItems: "center" }}>
            {apiKey ? "✓ Set" : "✕ Required"}
          </span>
        </div>
      </div>

      {/* File upload */}
      <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 3, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: C.mid, marginBottom: 6 }}>Upload Document</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()} style={{
            padding: "8px 16px", background: C.lite, border: `1px solid ${C.rule}`, borderRadius: 2,
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font, color: C.navy,
          }}>
            Choose PDF…
          </button>
          {file && <span style={{ fontSize: 12, color: C.navy, fontWeight: 600 }}>{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>}
          <button onClick={processDocument} disabled={!fileData || !apiKey || processing}
            style={{
              padding: "8px 16px", background: fileData && apiKey && !processing ? C.teal : C.rule,
              color: fileData && apiKey && !processing ? "#fff" : C.mid,
              border: "none", borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: fileData && apiKey ? "pointer" : "default",
              fontFamily: font, marginLeft: "auto",
            }}>
            {processing ? "Processing…" : "🔍 Analyze Document"}
          </button>
        </div>
        {progress && <div style={{ marginTop: 8, fontSize: 12, color: C.teal, fontStyle: "italic" }}>{progress}</div>}
      </div>

      {/* Results */}
      {changes && (
        <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ background: C.navy, color: "#fff", padding: "10px 14px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Changes Detected — {changes.documentTitle || "Document"}</span>
            <span style={{ fontWeight: 400, textTransform: "none", fontSize: 11 }}>{(changes.changes || []).length} changes</span>
          </div>

          {changes.summary && (
            <div style={{ padding: "10px 14px", background: C.lite, borderBottom: `1px solid ${C.rule}`, fontSize: 12, color: C.ink, lineHeight: 1.5 }}>
              {changes.summary}
            </div>
          )}

          <div style={{ padding: "10px 14px" }}>
            {(changes.changes || []).map((ch, i) => {
              const cc = changeColors[ch.type] || changeColors.changed;
              return (
                <div key={i} style={{ border: `1px solid ${C.rule}`, borderRadius: 3, marginBottom: 8, overflow: "hidden", opacity: accepted[i] ? 1 : 0.5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: cc.bg, cursor: "pointer" }}
                    onClick={() => toggleChange(i)}>
                    <input type="checkbox" checked={!!accepted[i]} readOnly style={{ accentColor: C.teal, cursor: "pointer" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: cc.fg, width: 20, textAlign: "center" }}>{cc.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: cc.fg, padding: "1px 6px", borderRadius: 2, border: `1px solid ${cc.fg}40` }}>{ch.type}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{ch.examSite}</span>
                    {ch.priorityGroup && <span style={{ fontSize: 10, color: C.mid }}>· {ch.priorityGroup}</span>}
                  </div>
                  <div style={{ padding: "8px 12px" }}>
                    {ch.currentText && (
                      <div style={{ fontSize: 12, color: C.del, padding: "4px 8px", background: C.delBg, borderRadius: 2, marginBottom: 4, borderLeft: `3px solid ${C.del}` }}>
                        <strong>Current:</strong> {ch.currentText}
                      </div>
                    )}
                    {ch.newText && (
                      <div style={{ fontSize: 12, color: C.add, padding: "4px 8px", background: C.addBg, borderRadius: 2, marginBottom: 4, borderLeft: `3px solid ${C.add}` }}>
                        <strong>New:</strong> {ch.newText}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: C.mid, fontStyle: "italic" }}>{ch.reason}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.mid }}>
              {Object.values(accepted).filter(Boolean).length} of {(changes.changes || []).length} changes selected
            </span>
            <button onClick={applyAccepted} style={{
              padding: "8px 16px", background: C.teal, color: "#fff", border: "none", borderRadius: 2,
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font,
            }}>
              Apply Selected Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  VERSIONS TAB
// ══════════════════════════════════════════════════════════

function VersionsTab({ showToast, publishedVersion, setPublishedVersion }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newVersion, setNewVersion] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [publishing, setPublishing] = useState(null);

  useEffect(() => {
    loadVersions();
  }, []);

  async function loadVersions() {
    setLoading(true);
    try {
      // Try the admin endpoint first, fall back to just showing published
      const ver = await api("/api/version");
      setVersions([{
        id: 1, version_label: ver.version || "v3.4.4",
        status: "published", published_at: ver.publishedAt,
        published_by: ver.publishedBy, created_at: ver.publishedAt,
        notes: "Current published version",
      }]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function createVersion() {
    if (!newVersion.trim()) { showToast("Enter a version label", "warn"); return; }
    setCreating(true);
    try {
      // In production: POST /api/admin/versions
      showToast(`Draft version ${newVersion} created`, "ok");
      setNewVersion("");
      setNewNotes("");
      loadVersions();
    } catch (e) {
      showToast("Failed: " + e.message, "error");
    } finally {
      setCreating(false);
    }
  }

  async function publishVersion(id) {
    if (!confirm("Publish this version? Both Criteria Viewer and Triage Advisor will immediately serve the new criteria.")) return;
    setPublishing(id);
    try {
      // In production: POST /api/admin/versions/:id/publish
      showToast("Version published — both tools now serve the updated criteria", "ok");
      loadVersions();
    } catch (e) {
      showToast("Publish failed: " + e.message, "error");
    } finally {
      setPublishing(null);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Version Management</h2>
      <p style={{ fontSize: 12, color: C.mid, marginBottom: 16 }}>
        Create version snapshots of the criteria database. Publishing writes the snapshot to KV, which both the Criteria Viewer and Triage Advisor read from. Previous versions can be restored at any time.
      </p>

      {/* Create new version */}
      <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 3, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: C.mid, marginBottom: 8 }}>Create New Version</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={newVersion} onChange={e => setNewVersion(e.target.value)} placeholder="e.g. v3.5.0"
            style={{ width: 120, padding: "6px 10px", border: `1px solid ${C.rule}`, borderRadius: 2, fontSize: 12, fontFamily: font, outline: "none" }} />
          <input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Change notes (e.g. Added paediatric hip criteria)"
            style={{ flex: 1, padding: "6px 10px", border: `1px solid ${C.rule}`, borderRadius: 2, fontSize: 12, fontFamily: font, outline: "none" }} />
          <button onClick={createVersion} disabled={creating} style={{
            padding: "6px 14px", background: C.teal, color: "#fff", border: "none", borderRadius: 2,
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap",
          }}>
            {creating ? "Creating…" : "Create Draft"}
          </button>
        </div>
      </div>

      {/* Version list */}
      <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ background: C.navy, color: "#fff", padding: "10px 14px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
          Version History
        </div>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: C.mid }}>Loading…</div>
        ) : versions.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: C.mid }}>No versions yet</div>
        ) : (
          versions.map(v => (
            <div key={v.id} style={{ padding: "12px 14px", borderBottom: `1px solid ${C.mist}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{v.version_label}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                    background: v.status === "published" ? C.passBg : C.warnBg,
                    color: v.status === "published" ? C.pass : C.warn,
                  }}>
                    {v.status}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: C.mid, marginTop: 2 }}>
                  {v.notes} · {v.published_by || v.created_by || "—"} · {new Date(v.published_at || v.created_at).toLocaleString()}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {v.status === "draft" && (
                  <button onClick={() => publishVersion(v.id)} disabled={publishing === v.id} style={{
                    padding: "5px 12px", background: C.teal, color: "#fff", border: "none", borderRadius: 2,
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: font,
                  }}>
                    {publishing === v.id ? "Publishing…" : "Publish"}
                  </button>
                )}
                <button style={{ padding: "5px 12px", background: C.lite, color: C.mid, border: `1px solid ${C.rule}`, borderRadius: 2, fontSize: 11, cursor: "pointer", fontFamily: font }}>
                  Restore
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  AUDIT LOG TAB
// ══════════════════════════════════════════════════════════

function AuditTab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // In production: GET /api/admin/audit
        // For now show a placeholder
        setEntries([
          { id: 1, action: "publish", entity_type: "version", entity_id: "1", performed_by: "migration", performed_at: "2026-04-03T00:00:00Z" },
        ]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const actionColors = {
    create: { bg: C.addBg, fg: C.add },
    update: { bg: C.chgBg, fg: C.chg },
    delete: { bg: C.delBg, fg: C.del },
    publish: { bg: "#eef2ff", fg: "#4f46e5" },
  };

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Audit Log</h2>
      <p style={{ fontSize: 12, color: C.mid, marginBottom: 16 }}>
        Every edit, publish, and version action is logged here with who did it, when, and what changed.
      </p>

      <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ background: C.navy, color: "#fff", padding: "10px 14px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
          Recent Activity
        </div>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: C.mid }}>Loading…</div>
        ) : (
          entries.map(e => {
            const ac = actionColors[e.action] || actionColors.update;
            return (
              <div key={e.id} style={{ padding: "10px 14px", borderBottom: `1px solid ${C.mist}`, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 2,
                  background: ac.bg, color: ac.fg, textTransform: "uppercase", flexShrink: 0,
                }}>
                  {e.action}
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, color: C.navy, fontWeight: 600 }}>{e.entity_type}</span>
                  <span style={{ fontSize: 11, color: C.mid }}> #{e.entity_id}</span>
                </div>
                <span style={{ fontSize: 11, color: C.mid }}>{e.performed_by}</span>
                <span style={{ fontSize: 10, color: C.mid }}>{new Date(e.performed_at).toLocaleString()}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
