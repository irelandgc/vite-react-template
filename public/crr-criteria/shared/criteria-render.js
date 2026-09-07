// ══════════════════════════════════════════════════════════════
//  ARCH-MIG-01 slice 6 — criteria structure renderer (one module, two surfaces)
// ══════════════════════════════════════════════════════════════
//
// A shared, presentation-only module. It renders ONE published criteria bundle's
// structure — the PlanDefinition (grouping, published wording, timeframe, badges,
// guidance, redirects, not-funded, sources), the Questionnaire (item text and
// answer options for the tick-list), and, for a chosen region, a regional overlay
// (delivery notes only) — into DOM.
//
//   - The Criteria Viewer uses it to render an exam/site that has a published
//     bundle (slice 6 D3); it falls back to the legacy JSON path for sites that
//     do not yet have one.
//   - The Triage page's reference column uses it on the same bundle artefacts the
//     assessment pipeline returns (TA-018) — referrer context, so no priority
//     codes (GEN-004).
//
// Invariant 3: every string this module DISPLAYS comes from the bundle artefacts
// (PlanDefinition / Questionnaire / overlay) or from the small, fixed set of
// structural labels of the renderer's own chrome, listed in CHROME_STRINGS.
// `criteria-render.test.ts` asserts exactly that.
//
// Usage:
//   import { resolveCriteria, criteriaHtml } from './criteria-render.js';
//   const model = resolveCriteria(
//     { planDefinition, questionnaire, overlays },
//     { context: 'referrer', layout: 'indication', region: 'te-waipounamu',
//       regionsConfig, ticks: {}, sourceLine: { title, pages } });
//   container.innerHTML = criteriaHtml(model);

const BADGE_SYS   = "http://crr.health.nz/fhir/CodeSystem/criteria-badge";
const BLOCK_SYS   = "http://crr.health.nz/fhir/CodeSystem/criteria-block";
const PRIORITY_SYS = "http://crr.health.nz/fhir/CodeSystem/priority-code";
const THEME_EXT   = "http://crr.health.nz/fhir/StructureDefinition/indication-theme";
const SOURCE_PAGE_EXT = "http://crr.health.nz/fhir/StructureDefinition/source-page";
const HP_PAGE_ID_EXT  = "http://crr.health.nz/fhir/StructureDefinition/healthpathways-page-id";
const OVERLAY_TARGET_EXT = "http://crr.health.nz/fhir/StructureDefinition/overlay-target-action";
const SDC_INITIAL_EXPR = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression";

// Structural chrome — the ONLY displayed strings that do not come from an
// artefact. The test allows exactly these (plus a bare integer after "page").
export const CHROME_STRINGS = [
  "Guidance",
  "Refer for acute assessment — without initial imaging",
  "All of the following:",
  "One or more of the following:",
  "Any of the following:",
  "Alternative management / redirect",
  "Not routinely funded",
  "Notes",
  "Regional delivery",
  "Local HealthPathways",
  "page",
];

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function codingsOf(action, system) {
  return (action.code || []).flatMap((c) => c.coding || []).filter((cd) => cd.system === system);
}
function blockCode(action) {
  return (codingsOf(action, BLOCK_SYS)[0] || {}).code || null;
}
function priorityOf(action) {
  const p = codingsOf(action, PRIORITY_SYS)[0];
  return p ? { code: p.code, display: p.display || null } : null;
}
function badgesOf(action) {
  // display verbatim from the code (MANDATORY / GATEWAY / LAB VALUE REQUIRED)
  return codingsOf(action, BADGE_SYS).map((cd) => ({ code: cd.code, display: cd.display || cd.code }));
}
function themeOf(action) {
  const e = (action.extension || []).find((x) => x.url === THEME_EXT);
  const c = e && e.valueCodeableConcept && e.valueCodeableConcept.coding && e.valueCodeableConcept.coding[0];
  return c ? { code: c.code, display: c.display || c.code } : null;
}
function pageOf(node) {
  for (const d of (node.documentation || [])) {
    for (const e of (d.extension || [])) {
      if (e.url === SOURCE_PAGE_EXT && typeof e.valueInteger === "number") return e.valueInteger;
    }
  }
  return null;
}
// documentation entries that are plain notes (a `display`, no source-page) — footnotes.
function notesOf(node) {
  return (node.documentation || [])
    .filter((d) => typeof d.display === "string" && d.display && !(d.extension || []).some((e) => e.url === SOURCE_PAGE_EXT))
    .map((d) => d.display);
}
function linkIdsOf(action) {
  const ids = [];
  for (const inp of (action.input || [])) {
    for (const p of (inp.profile || [])) {
      const id = String(p).split("#")[1];
      if (id) ids.push(id);
    }
  }
  return ids;
}
// A leaf a referrer ticks with one click: exactly ONE input linkId, that item is
// a `boolean` in the Questionnaire, and it is not a not-funded row (GEN-005). A
// compound action with several heterogeneous inputs (e.g. CT CAP's B1 — age +
// sex + weight-loss % + period) renders as a plain criterion row, never a single
// checkbox: there is nothing sound for one tick to set (transcription-template
// finding — see the slice 6 report).
function tickableLinkId(action, blockKind, qType) {
  if (blockKind === "not-funded") return null;
  const ids = linkIdsOf(action);
  if (ids.length !== 1) return null;
  return qType.get(ids[0]) === "boolean" ? ids[0] : null;
}

// Questionnaire linkId -> item text / type / unit (questionnaire-unit) / answer options.
const QUESTIONNAIRE_UNIT_EXT = "http://hl7.org/fhir/StructureDefinition/questionnaire-unit";
function questionnaireMaps(q) {
  const text = new Map();
  const type = new Map();
  const unit = new Map();
  const options = new Map();
  (function walk(items) {
    for (const i of (items || [])) {
      if (i && i.linkId) {
        if (typeof i.text === "string") text.set(i.linkId, i.text);
        if (i.type) type.set(i.linkId, i.type);
        const u = (i.extension || []).find((e) => e.url === QUESTIONNAIRE_UNIT_EXT);
        if (u && u.valueCoding && (u.valueCoding.display || u.valueCoding.code)) {
          unit.set(i.linkId, u.valueCoding.display || u.valueCoding.code);
        }
        if (Array.isArray(i.answerOption) && i.answerOption.length) {
          options.set(i.linkId, i.answerOption
            .map((o) => (o.valueCoding
              ? { code: o.valueCoding.code, display: o.valueCoding.display || o.valueCoding.code }
              : { code: String(o.valueString ?? ""), display: String(o.valueString ?? "") }))
            .filter((o) => o.code));
        }
      }
      walk(i && i.item);
    }
  })(q && q.item);
  return { text, type, unit, options };
}

// The regional overlay for `region` (bundle carries `overlays[]`); target action id -> overlay action.
function overlayIndex(overlays, region) {
  const idx = new Map();
  if (!Array.isArray(overlays) || !region) return idx;
  const ov = overlays.find((o) => (o.useContext || []).some((u) => (u.valueCodeableConcept && u.valueCodeableConcept.text || "") === `region: ${region}`));
  if (!ov) return idx;
  (function walk(actions) {
    for (const a of (actions || [])) {
      const t = (a.extension || []).find((e) => e.url === OVERLAY_TARGET_EXT);
      if (t && t.valueString) idx.set(t.valueString, a);
      walk(a.action);
    }
  })(ov.action);
  return idx;
}

// HealthPathways page id — the PlanDefinition's `relatedArtifact` documentation entry.
function healthPathwaysPageId(pd) {
  for (const r of (pd.relatedArtifact || [])) {
    for (const e of (r.extension || [])) {
      if (e.url === HP_PAGE_ID_EXT && e.valueString) return e.valueString;
    }
  }
  return null;
}
function healthPathwaysUrl(pageId, region, regionsConfig, regionLegacyId) {
  if (!pageId || !regionsConfig) return null;
  const r = (regionsConfig.regions || []).find((x) => x.code === region);
  if (!r) return null;
  // One HNZ region can be served by several HealthPathways instances (AD-29).
  // Use the instance for the selected legacy region id; else the first with a
  // real (non-TBC) domain; else the first. Back-compatible with the flat
  // `{ code, healthPathwaysDomain }` shape.
  const insts = r.instances || (r.healthPathwaysDomain ? [{ healthPathwaysDomain: r.healthPathwaysDomain }] : []);
  const pick =
    (regionLegacyId && insts.find((i) => i.legacyRegionId === regionLegacyId)) ||
    insts.find((i) => i.healthPathwaysDomain && !/^TBC\b/i.test(i.healthPathwaysDomain)) ||
    insts[0];
  if (!pick || !pick.healthPathwaysDomain) return null;
  const tmpl = regionsConfig.healthPathwaysUrlTemplate || "https://{domain}/{pageId}";
  return tmpl.replace("{domain}", pick.healthPathwaysDomain).replace("{pageId}", pageId);
}

const SEL_LABEL = {
  all: "All of the following:",
  "one-or-more": "One or more of the following:",
  any: "Any of the following:",
};

// ── resolve ──────────────────────────────────────────────────────────────────
export function resolveCriteria(bundle, opts) {
  opts = opts || {};
  const pd = (bundle && bundle.planDefinition) || {};
  const q = (bundle && bundle.questionnaire) || {};
  const isTriager = opts.context === "triager";
  // "indication" — pathways grouped by indication-theme (default).
  // "urgency" — pathways in printed order under each timeframe block (CV-027).
  // "vocabulary" — printed order + the Questionnaire's own groups (flagged).
  const layout = opts.layout === "vocabulary" || opts.layout === "urgency" ? opts.layout : "indication";
  const ticks = opts.ticks || {};
  const { text: qText, type: qType, unit: qUnit, options: qOptions } = questionnaireMaps(q);
  const overlays = overlayIndex(bundle && bundle.overlays, opts.region);

  // Build a renderable row for an action, recursively.
  function row(action, blockKind, depth) {
    const linkIds = linkIdsOf(action);
    const tickLinkId = tickableLinkId(action, blockKind, qType);
    const ov = overlays.get(action.id);
    // A compound action (CT CAP's B1, B3) — several input linkIds, or one
    // non-boolean input, and no sub-actions — renders one typed control per
    // input, inline (AD-27): number for integer/decimal/quantity (label + unit
    // from the Questionnaire item), select for choice (from answerOption),
    // checkbox for boolean, text for string. Not for a not-funded / acute row.
    const compoundInputs = !tickLinkId && linkIds.length >= 1 && !(action.action || []).length
      && blockKind !== "not-funded" && blockKind !== "acute-assessment"
      ? linkIds.map((id) => ({
          linkId: id,
          type: qType.get(id) || "string",
          text: qText.get(id) || id,
          unit: qUnit.get(id) || null,
          options: qOptions.get(id) || null,
          value: ticks[id],
        }))
      : [];
    return {
      id: action.id,
      // published wording verbatim: the action title (Questionnaire text is the
      // fallback where an action is purely structural).
      text: action.title || (linkIds.length === 1 ? qText.get(linkIds[0]) : "") || "",
      description: action.description || null,
      selection: action.selectionBehavior ? (SEL_LABEL[action.selectionBehavior] || null) : null,
      selectionKind: action.selectionBehavior || null,
      badges: badgesOf(action),
      priority: priorityOf(action),
      page: pageOf(action),
      notes: notesOf(action),
      linkId: tickLinkId,
      linkIds,
      inputs: compoundInputs,
      ticked: tickLinkId ? !!ticks[tickLinkId] : false,
      theme: themeOf(action),
      hasCondition: Array.isArray(action.condition) && action.condition.length > 0,
      delivery: ov ? { title: ov.title || null, description: ov.description || null, notes: notesOf(ov), hpPageId: (ov.documentation || []).flatMap((d) => (d.extension || [])).find((e) => e.url === HP_PAGE_ID_EXT)?.valueString || null } : null,
      depth,
      children: (action.action || []).map((c) => row(c, blockKind, depth + 1)),
    };
  }

  const topActions = (pd.action || []).map((a) => ({ a, kind: blockCode(a) }));

  const guidanceAction = topActions.find((x) => x.kind === "guidance");
  const acuteActions = topActions.filter((x) => x.kind === "acute-assessment");
  const indicationActions = topActions.filter((x) => x.kind === "indication");
  const altAction = topActions.find((x) => x.kind === "alternative-management");
  const notFundedAction = topActions.find((x) => x.kind === "not-funded");

  const hpPageId = healthPathwaysPageId(pd);
  const hpUrl = healthPathwaysUrl(hpPageId, opts.region, opts.regionsConfig, opts.regionLegacyId);

  const model = {
    context: opts.context === "triager" ? "triager" : "referrer",
    readOnly: !!opts.readOnly,
    layout,
    sourceLine: opts.sourceLine ? { title: opts.sourceLine.title || null, pages: opts.sourceLine.pages || null } : null,
    guidance: guidanceAction ? {
      text: guidanceAction.a.description || guidanceAction.a.title || "",
      page: pageOf(guidanceAction.a),
      hpUrl,
      delivery: null,
    } : (hpUrl ? { text: null, page: null, hpUrl } : null),
    acuteBanner: acuteActions.length ? {
      rows: acuteActions.flatMap((x) => flattenLeaves(row(x.a, "acute-assessment", 0))),
    } : null,
    indicationBlocks: indicationActions.map((x) => {
      const r = row(x.a, "indication", 0);
      return {
        id: r.id,
        title: r.text,
        description: r.description,
        priority: isTriager ? r.priority : null,
        // referrer-safe: strip a leading "P<n>" token from the title (the code is triager-only, GEN-004)
        titleForContext: isTriager ? r.text : r.text.replace(/^P[1-4]\s*[:\-–]?\s*/i, ""),
        page: r.page,
        selection: r.selection,
        notes: r.notes,
        delivery: r.delivery,
        themes: groupByTheme(r.children, layout, x.a),
        children: r.children, // urgency/vocabulary layout renders these directly
      };
    }),
    redirects: altAction ? {
      title: altAction.a.title || "",
      page: pageOf(altAction.a),
      notes: notesOf(altAction.a),
      delivery: (function () { const ov = overlays.get(altAction.a.id); return ov ? { title: ov.title || null, description: ov.description || null } : null; })(),
      rows: (altAction.a.action || []).map((a) => ({ text: a.title || "", page: pageOf(a), notes: notesOf(a) })),
    } : null,
    notFunded: notFundedAction ? {
      title: notFundedAction.a.title || "",
      page: pageOf(notFundedAction.a),
      notes: notesOf(notFundedAction.a),
      rows: (notFundedAction.a.action || []).map((a) => ({ text: a.title || "" })),
    } : null,
  };

  // vocabulary layout: also expose the Questionnaire groups (top-level groups
  // with their leaf item text) for the flagged alternative view.
  if (layout === "vocabulary") {
    model.vocabularyGroups = (q.item || [])
      .filter((g) => g.type === "group")
      .map((g) => ({ text: g.text, items: (g.item || []).map((i) => ({ linkId: i.linkId, text: i.text })) }));
  }

  return model;

  function flattenLeaves(r) {
    if (!r.children.length) return [{ text: r.text, page: r.page }];
    return r.children.flatMap(flattenLeaves);
  }
}

// Group an indication block's child rows by their nearest indication-theme.
// In "indication" layout: one group per theme, in first-seen order (the block
// action's own theme extension order is not used — first-seen on the children).
// In any other layout: a single pseudo-group preserving printed order.
function groupByTheme(childRows, layout, blockAction) {
  if (layout !== "indication") {
    return [{ theme: null, display: null, rows: childRows }];
  }
  const order = [];
  const byTheme = new Map();
  const inherit = (rows, parentTheme) => {
    for (const r of rows) {
      const t = r.theme || parentTheme;
      if (t && !byTheme.has(t.code)) { byTheme.set(t.code, { theme: t.code, display: t.display, rows: [] }); order.push(t.code); }
      // A themed row that has themed/structural children keeps its subtree.
      if (t) byTheme.get(t.code).rows.push({ ...r, theme: t });
      else inherit(r.children, parentTheme);
    }
  };
  inherit(childRows, themeOf(blockAction));
  return order.map((c) => byTheme.get(c));
}

// ── render ───────────────────────────────────────────────────────────────────
export function criteriaHtml(model) {
  const out = [];
  const pageRef = (p) => (p != null ? ` <span class="cr-page">page ${esc(p)}</span>` : "");
  const notesHtml = (notes) => (notes && notes.length)
    ? `<div class="footnote-block"><div class="footnote-hd">Notes</div>${notes.map((n) => `<div class="cr-note">${esc(n)}</div>`).join("")}</div>`
    : "";
  const deliveryHtml = (d) => {
    if (!d || (!d.title && !d.description && !(d.notes && d.notes.length))) return "";
    return `<div class="cr-delivery"><div class="cr-delivery-hd">Regional delivery</div>` +
      (d.description ? `<div>${esc(d.description)}</div>` : "") +
      (d.notes && d.notes.length ? d.notes.map((n) => `<div>${esc(n)}</div>`).join("") : "") +
      `</div>`;
  };

  if (model.sourceLine && (model.sourceLine.title || model.sourceLine.pages)) {
    out.push(`<div class="cr-source-line">${esc(model.sourceLine.title || "")}${model.sourceLine.pages ? ` <span class="cr-page">page ${esc(model.sourceLine.pages)}</span>` : ""}</div>`);
  }

  // Acute-assessment banner — above the criteria, wording from the bundle.
  if (model.acuteBanner && model.acuteBanner.rows.length) {
    out.push(
      `<div class="emergency-block"><div class="emergency-block-hd">Refer for acute assessment — without initial imaging</div>` +
      `<div class="emergency-block-body">${model.acuteBanner.rows.map((r) => `<div class="emergency-item"><span class="emergency-item-bullet">&#8226;</span><span class="emergency-item-text">${esc(r.text)}${pageRef(r.page)}</span></div>`).join("")}</div></div>`,
    );
  }

  // Guidance
  if (model.guidance && (model.guidance.text || model.guidance.hpUrl)) {
    out.push(
      `<div class="local-info-box"><div class="cr-guidance-hd">Guidance</div>` +
      (model.guidance.text ? `<div class="cr-guidance-text">${esc(model.guidance.text).replace(/\n/g, "<br>")}</div>` : "") +
      (model.guidance.page != null ? `<div>${pageRef(model.guidance.page)}</div>` : "") +
      (model.guidance.hpUrl ? `<div><a class="cr-hp-link" href="${esc(model.guidance.hpUrl)}" target="_blank" rel="noopener">Local HealthPathways</a></div>` : "") +
      `</div>`,
    );
  }

  // Indication blocks
  for (const block of model.indicationBlocks) {
    let hd = `<div class="cr-block-hd"><span class="cr-block-title">${esc(block.titleForContext)}</span>`;
    if (model.context === "triager" && block.priority && block.priority.code) {
      hd += ` <span class="priority-badge ${priorityClass(block.priority.code)}">${esc(block.priority.code)}${block.priority.display ? " — " + esc(block.priority.display) : ""}</span>`;
    }
    hd += pageRef(block.page) + `</div>`;
    let body = "";
    if (block.description) body += `<div class="cr-block-desc">${esc(block.description)}</div>`;
    if (model.layout === "indication") {
      for (const g of block.themes) {
        if (g.display) body += `<div class="theme-group-hd">${esc(g.display)}</div>`;
        body += g.rows.map((r) => renderRow(r, model.context, model.readOnly)).join("");
      }
    } else {
      if (block.selection) body += `<div class="cr-sel">${esc(block.selection)}</div>`;
      body += block.children.map((r) => renderRow(r, model.context, model.readOnly)).join("");
    }
    body += notesHtml(block.notes) + deliveryHtml(block.delivery);
    out.push(`<div class="cr-block">${hd}<div class="cr-block-body">${body}</div></div>`);
  }

  // Vocabulary-group layout (flagged): the Questionnaire's own groups
  if (model.layout === "vocabulary" && model.vocabularyGroups) {
    out.push(`<div class="cr-block"><div class="cr-block-body">` +
      model.vocabularyGroups.map((g) =>
        `<div class="group-hd">${esc(g.text)}</div>` +
        g.items.map((i) => `<div class="criteria-item" data-linkid="${esc(i.linkId)}">${esc(i.text)}</div>`).join(""),
      ).join("") + `</div></div>`);
  }

  // Redirects — "as today": a box, each row with its page reference.
  if (model.redirects && model.redirects.rows.length) {
    out.push(
      `<div class="alt-mgmt-block"><div class="alt-mgmt-hd">Alternative management / redirect</div>` +
      `<ul class="cr-list">${model.redirects.rows.map((r) => `<li>${esc(r.text)}${pageRef(r.page)}</li>`).join("")}</ul>` +
      notesHtml(model.redirects.notes) + deliveryHtml(model.redirects.delivery) + `</div>`,
    );
  }

  // Not funded — never tickable (GEN-005)
  if (model.notFunded && (model.notFunded.title || model.notFunded.rows.length)) {
    out.push(
      `<div class="not-funded-block"><div class="not-funded-hd">Not routinely funded</div>` +
      (model.notFunded.title ? `<div>${esc(model.notFunded.title)}</div>` : "") +
      (model.notFunded.rows.length ? `<ul class="cr-list">${model.notFunded.rows.map((r) => `<li>${esc(r.text)}</li>`).join("")}</ul>` : "") +
      pageRef(model.notFunded.page ? `${model.notFunded.page}` : null).trim() +
      notesHtml(model.notFunded.notes) + `</div>`,
    );
  }

  return out.join("");
}

function priorityClass(code) {
  const m = { P1: "pri-emergency", P2: "pri-p2", P3: "pri-p3", P4: "pri-p4", S1: "pri-s1", S2: "pri-s2", S3: "pri-s3" };
  return m[code] || "pri-p2";
}

function renderRow(r, context, readOnly) {
  const badges = r.badges.map((b) => `<span class="${badgeClass(b.code)}">${esc(b.display)}</span>`).join(" ");
  const page = r.page != null ? ` <span class="cr-page">page ${esc(r.page)}</span>` : "";
  const sel = (r.selectionKind && r.children.length) ? `<div class="cr-sel">${esc(SEL_LABEL[r.selectionKind] || "")}</div>` : "";
  const childHtml = r.children.map((c) => renderRow(c, context, readOnly)).join("");
  const del = (r.delivery && (r.delivery.description || (r.delivery.notes && r.delivery.notes.length)))
    ? `<div class="cr-delivery"><div class="cr-delivery-hd">Regional delivery</div>${r.delivery.description ? `<div>${esc(r.delivery.description)}</div>` : ""}${(r.delivery.notes || []).map((n) => `<div>${esc(n)}</div>`).join("")}</div>`
    : "";
  const notes = (r.notes && r.notes.length) ? `<div class="footnote-block"><div class="footnote-hd">Notes</div>${r.notes.map((n) => `<div class="cr-note">${esc(n)}</div>`).join("")}</div>` : "";

  if (r.linkId && !readOnly) {
    // tickable leaf (checkbox rendered by the host page; the module emits the row)
    return `<label class="crit-card${r.ticked ? " ticked" : ""}${badgeCardClass(r.badges)}" data-linkid="${esc(r.linkId)}">` +
      `<div class="crit-card-header"><input type="checkbox" class="crit-card-check" data-linkid="${esc(r.linkId)}"${r.ticked ? " checked" : ""}>` +
      `<span class="crit-card-label">${esc(r.text)}${badges ? " " + badges : ""}${page}</span></div>${notes}${del}</label>`;
  }
  if (r.linkId) {
    // read-only reference (Triage reference column): the same wording, no checkbox
    return `<div class="cr-row" data-linkid="${esc(r.linkId)}"><div class="cr-row-title">${esc(r.text)}${badges ? " " + badges : ""}${page}</div>${notes}${del}</div>`;
  }
  // compound-input row (AD-27): the criterion wording, then one typed control
  // per input linkId (or, read-only, the value)
  if (r.inputs && r.inputs.length) {
    const inputsHtml = r.inputs.map((inp) => renderInput(inp, readOnly)).join("");
    return `<div class="cr-row cr-inputs-row" data-action="${esc(r.id)}"><div class="cr-row-title">${esc(r.text)}${badges ? " " + badges : ""}${page}</div>${sel}<div class="cr-inputs">${inputsHtml}</div>${notes}${del}</div>`;
  }
  // structural / compound row
  return `<div class="cr-row" data-action="${esc(r.id)}"><div class="cr-row-title">${esc(r.text)}${badges ? " " + badges : ""}${page}</div>${sel}${childHtml}${notes}${del}</div>`;
}

// One control for a compound action's input linkId. Entry (Viewer) or, read-only
// (Triage reference column), the value from the merged QuestionnaireResponse.
// Every displayed string is the Questionnaire item text, an answerOption display,
// or the questionnaire-unit — no renderer constants.
function renderInput(inp, readOnly) {
  const label = `<span class="cr-input-label">${esc(inp.text)}</span>`;
  const has = inp.value !== undefined && inp.value !== null && inp.value !== "";
  const isNum = inp.type === "integer" || inp.type === "decimal" || inp.type === "quantity";

  if (readOnly) {
    let shown;
    if (inp.type === "boolean") {
      shown = `<input type="checkbox" disabled${inp.value === true ? " checked" : ""}>`;
    } else if (inp.type === "choice") {
      const o = (inp.options || []).find((x) => x.code === String(inp.value));
      shown = `<span class="cr-input-value">${o ? esc(o.display) : (has ? esc(String(inp.value)) : "")}</span>`;
    } else {
      shown = `<span class="cr-input-value">${has ? esc(String(inp.value)) + (inp.unit ? " " + esc(inp.unit) : "") : ""}</span>`;
    }
    return `<div class="cr-input" data-linkid="${esc(inp.linkId)}">${label}${shown}</div>`;
  }

  if (inp.type === "boolean") {
    return `<label class="cr-input" data-linkid="${esc(inp.linkId)}"><input type="checkbox" data-linkid="${esc(inp.linkId)}"${inp.value === true ? " checked" : ""}>${label}</label>`;
  }
  if (inp.type === "choice") {
    const opts = `<option value=""></option>` + (inp.options || [])
      .map((o) => `<option value="${esc(o.code)}"${String(inp.value) === o.code ? " selected" : ""}>${esc(o.display)}</option>`).join("");
    return `<label class="cr-input" data-linkid="${esc(inp.linkId)}">${label}<select data-linkid="${esc(inp.linkId)}">${opts}</select></label>`;
  }
  if (isNum) {
    const step = inp.type === "integer" ? "1" : "any";
    return `<label class="cr-input" data-linkid="${esc(inp.linkId)}">${label}<span class="cr-input-field">` +
      `<input type="number" step="${step}" inputmode="decimal" data-linkid="${esc(inp.linkId)}" value="${has ? esc(String(inp.value)) : ""}">` +
      (inp.unit ? `<span class="cr-unit">${esc(inp.unit)}</span>` : "") + `</span></label>`;
  }
  // string / text
  return `<label class="cr-input" data-linkid="${esc(inp.linkId)}">${label}<input type="text" data-linkid="${esc(inp.linkId)}" value="${has ? esc(String(inp.value)) : ""}"></label>`;
}

function badgeClass(code) {
  return { gateway: "gateway-tag", "lab-value": "lab-tag", mandatory: "mandatory-tag" }[code] || "mandatory-tag";
}
function badgeCardClass(badges) {
  if (badges.some((b) => b.code === "gateway")) return " gateway-card";
  if (badges.some((b) => b.code === "lab-value")) return " lab-card";
  return "";
}

// The tick-list a Viewer collects → a QuestionnaireResponse against the bundle's
// Questionnaire (CV-015). `ticks` is linkId -> value (boolean checkboxes, or a
// number/string for a value item). Grouped by linkId prefix, matching how the
// engine reads a QR.
export function buildQuestionnaireResponse(questionnaire, ticks) {
  const typeOf = new Map();
  (function walk(items) { for (const i of (items || [])) { if (i.linkId && i.type) typeOf.set(i.linkId, i.type); walk(i.item); } })(questionnaire && questionnaire.item);
  const KEY = { boolean: "valueBoolean", integer: "valueInteger", decimal: "valueDecimal", string: "valueString", text: "valueString", choice: "valueCoding", quantity: "valueQuantity" };
  const groups = new Map();
  for (const [linkId, value] of Object.entries(ticks || {})) {
    if (value === undefined || value === null || value === false || value === "") continue;
    const t = typeOf.get(linkId) || "boolean";
    const key = KEY[t] || "valueBoolean";
    const answer = key === "valueCoding"
      ? { valueCoding: { system: "http://hl7.org/fhir/administrative-gender", code: String(value) } }
      : { [key]: t === "boolean" ? true : value };
    const g = linkId.split(".")[0];
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({ linkId, answer: [answer] });
  }
  return {
    resourceType: "QuestionnaireResponse",
    questionnaire: (questionnaire && questionnaire.url) || null,
    status: "completed",
    item: [...groups.entries()].map(([linkId, item]) => ({ linkId, item })),
  };
}
