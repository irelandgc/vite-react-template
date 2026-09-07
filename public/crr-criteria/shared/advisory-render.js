// ══════════════════════════════════════════════════════════════
//  ARCH-MIG-01 slice 5 — Advisory renderer (one object, two views)
// ══════════════════════════════════════════════════════════════
//
// A shared, presentation-only module (SD-01). It renders ONE engine Advisory in
// two views. It contains NO criteria content (invariant 3): every string it
// displays comes from the Advisory itself, the bundle's PlanDefinition, or the
// bundle's Questionnaire item text — all delivered in the `/api/assess` response
// as `advisory` + `bundleArtefacts`. The only literals here are the section
// labels of the renderer's own chrome ("What to add", "Rule trace", …).
//
//   referrer view — determination in plain words; red flags / redirects in
//     published wording; "what to add" = each missingInformation linkId rendered
//     as the published Questionnaire item text (D6: no suggested wording, no
//     prose); cross-exam recommendations from alternatives[]; page references;
//     the AD-17 attestation questions, each with the answer the referrer gave
//     ("— you answered Yes / No / Not assessed"). When a redirect was driven by
//     an attested exclusion the redirect is preceded by "Because you indicated:
//     <published item text>"; every attested-Yes item gets "State this in your
//     referral." The ONLY strings this view shows that do not come from the
//     bundle / Advisory / Questionnaire are the section labels of the renderer's
//     own chrome and these three connectives: "you answered", "Because you
//     indicated:", "State this in your referral." NO priority codes (GEN-004).
//   triager view — all of the above, plus priority codes, the rule trace,
//     evidence status + quote per indicator, discrepancies,
//     inferredExcludedByStrictStandard, unconfirmed exclusions and version stamps;
//     the attestation rows also show the answer and who attested it.
//
// Usage:
//   import { resolveAdvisory, advisoryHtml } from './advisory-render.js';
//   const model = resolveAdvisory(assessResponse, 'referrer', { attestationQuestions, attestationAnswers, mergedResponse });
//   container.innerHTML = advisoryHtml(model);

const PRIORITY_CODE_SYSTEM = "http://crr.health.nz/fhir/CodeSystem/priority-code";
const SOURCE_PAGE_EXT = "http://crr.health.nz/fhir/StructureDefinition/source-page";
const EVIDENCE_URL = "http://crr.health.nz/fhir/StructureDefinition/answer-evidence";

// Determinations that resolve to a top-level PlanDefinition action by its CQL
// condition define name.
const DETERMINATION_TO_DEFINE = {
  P2_URGENT: "Meets P2 Criteria",
  ALTERNATIVE_MANAGEMENT: "Alternative Management Recommended",
  NOT_ROUTINELY_FUNDED: "Not Routinely Funded",
};

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function humanizeCode(code) {
  // A deterministic transform of a bundle-produced determination code, used only
  // when no PlanDefinition action carries wording for it (INSUFFICIENT_INFORMATION,
  // CRITERIA_NOT_MET, PAEDIATRIC_CRITERIA_APPLY, ACUTE_ASSESSMENT_REQUIRED, …).
  const s = String(code ?? "").toLowerCase().replace(/_/g, " ");
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

// Walk a Questionnaire's items into linkId -> text.
function questionnaireText(questionnaire) {
  const map = new Map();
  const walk = (items) => {
    for (const i of items || []) {
      if (i && i.linkId && typeof i.text === "string") map.set(i.linkId, i.text);
      if (Array.isArray(i && i.item)) walk(i.item);
    }
  };
  walk(questionnaire && questionnaire.item);
  return map;
}

// Find the top-level PlanDefinition action whose condition names `defineName`,
// returning its title, priority-code display, and source page.
function planActionFor(planDefinition, defineName) {
  if (!planDefinition || !Array.isArray(planDefinition.action)) return null;
  for (const a of planDefinition.action) {
    const names = (a.condition || []).map((c) => c && c.expression && c.expression.expression);
    if (!names.includes(defineName)) continue;
    const prio = (a.code || [])
      .flatMap((c) => c.coding || [])
      .find((cd) => cd.system === PRIORITY_CODE_SYSTEM);
    return {
      title: a.title || "",
      priorityCode: prio ? prio.code : null,
      priorityDisplay: prio ? prio.display || null : null,
      page: pageOf(a),
      description: a.description || "",
    };
  }
  return null;
}

function pageOf(node) {
  for (const d of (node && node.documentation) || []) {
    for (const e of d.extension || []) {
      if (e.url === SOURCE_PAGE_EXT && typeof e.valueInteger === "number") return e.valueInteger;
    }
  }
  return null;
}

// Merged QuestionnaireResponse -> [{ linkId, value, status, quote, source, attestedBy }]
function evidenceRows(mergedResponse) {
  const rows = [];
  const walk = (items) => {
    for (const i of items || []) {
      if (Array.isArray(i && i.item)) walk(i.item);
      if (!Array.isArray(i && i.answer) || !i.linkId) continue;
      const ans = i.answer[0] || {};
      const vk = Object.keys(ans).find((k) => k.startsWith("value"));
      let value = vk ? ans[vk] : undefined;
      if (value && typeof value === "object" && "code" in value) value = value.code;
      const ev = (ans.extension || []).find((e) => e.url === EVIDENCE_URL);
      const sub = {};
      for (const s of (ev && ev.extension) || []) {
        if (s.url === "status") sub.status = s.valueCode;
        if (s.url === "quote") sub.quote = s.valueString;
        if (s.url === "source") sub.source = s.valueCode;
        if (s.url === "attestedBy") sub.attestedBy = s.valueString;
      }
      rows.push({ linkId: i.linkId, value, status: sub.status || (ev ? undefined : "documented"), quote: sub.quote, source: sub.source, attestedBy: sub.attestedBy });
    }
  };
  walk(mergedResponse && mergedResponse.item);
  return rows;
}

// ── resolve ──────────────────────────────────────────────────────────────────
// `response` is the /api/assess body. `opts.mergedResponse` is the merged
// QuestionnaireResponse (triager evidence table); `opts.attestationQuestions`
// comes from GET /api/assess/attestation-questions (the page fetched it before
// the assessment). Neither is required for the referrer determination line.
export function resolveAdvisory(response, view, opts) {
  opts = opts || {};
  const isTriager = view === "triager";
  const agg = (response && response.advisory) || {};
  const requestedId = (agg.requestedExam && agg.requestedExam.id) || (response.examSiteSelection && response.examSiteSelection.requestedExamSite) || null;
  const artefacts = (response && response.bundleArtefacts) || {};
  const requestedArtefact = requestedId ? artefacts[requestedId] : null;
  const exam = (agg.requestedExam && agg.requestedExam.advisory) || null;

  const qText = requestedArtefact ? questionnaireText(requestedArtefact.questionnaire) : new Map();

  // Determination line
  const detCode = agg.determination || (exam && exam.determination) || null;
  const action = requestedArtefact && DETERMINATION_TO_DEFINE[detCode]
    ? planActionFor(requestedArtefact.planDefinition, DETERMINATION_TO_DEFINE[detCode])
    : null;
  // The published P2 row title leads with the code ("P2 Urgent: …"). GEN-004
  // forbids showing the code to referrers, so strip a leading `P<n>` token from
  // the plain wording for the referrer view (the timeframe line still carries
  // the urgency); the triager sees the code in its own line.
  let plain = (action && action.title) || humanizeCode(detCode);
  if (!isTriager) plain = plain.replace(/^P[1-4]\s*[:\-–]?\s*/i, "");
  const determination = {
    code: detCode,
    plain,
    page: action ? action.page : null,
    // referrer-safe timeframe language (GEN-004: the code is triager-only, the
    // timeframe words are for both)
    priorityTimeframe: (exam && exam.priorityTimeframe) || (action && action.priorityDisplay) || null,
    priorityCode: isTriager ? ((exam && exam.priorityCode) || (action && action.priorityCode) || null) : null,
  };

  // National layer
  const nat = agg.national || {};
  const national = {
    stopped: !!agg.stoppedAtNational,
    determination: agg.stoppedAtNational ? nat.determination || null : null,
    determinationPlain: agg.stoppedAtNational ? humanizeCode(nat.determination) : null,
    firedRedFlags: Array.isArray(nat.firedRedFlags) ? nat.firedRedFlags.slice() : [],
    indeterminateRedFlags: Array.isArray(nat.indeterminateRedFlags) ? nat.indeterminateRedFlags.slice() : [],
  };

  // Redirects (published wording, already strings in the Advisory)
  const redirects = exam && Array.isArray(exam.activeRedirects) ? exam.activeRedirects.slice() : [];

  // "What to add" — every missingInformation linkId as the published item text
  const missing = exam && Array.isArray(exam.missingInformation) ? exam.missingInformation : [];
  const whatToAdd = missing.map((linkId) => ({ linkId, text: qText.get(linkId) || linkId }));

  // Cross-exam recommendations
  const alternatives = Array.isArray(agg.alternatives)
    ? agg.alternatives.map((alt) => {
        const altArtefact = artefacts[alt.id];
        const altDet = alt.advisory && alt.advisory.determination;
        const altAction = altArtefact && DETERMINATION_TO_DEFINE[altDet]
          ? planActionFor(altArtefact.planDefinition, DETERMINATION_TO_DEFINE[altDet])
          : null;
        return {
          id: alt.id,
          determination: altDet,
          plain: (altAction && altAction.title) || humanizeCode(altDet),
          page: altAction ? altAction.page : null,
        };
      })
    : [];

  // linkId -> { source, attestedBy } from the merged QR (AD-23), for the triager
  // attestation rows and for detecting an attestation-driven redirect.
  const attEvidence = new Map();
  for (const r of evidenceRows(opts.mergedResponse)) {
    if (r.source || r.attestedBy) attEvidence.set(r.linkId, { source: r.source, attestedBy: r.attestedBy });
  }
  const answers = (opts && opts.attestationAnswers) || {};
  const ANSWER_LABEL = { yes: "Yes", no: "No", "not-assessed": "Not assessed" };

  const attestationQuestions = Array.isArray(opts.attestationQuestions)
    ? opts.attestationQuestions.map((q) => {
        const raw = answers[q.linkId] || null;
        return {
          linkId: q.linkId,
          // one wording per view — the renderer never shows both
          text: (q.wording && (isTriager ? q.wording.triager : q.wording.referrer)) || q.text,
          // the plain published item text (used for "Because you indicated: …")
          canonicalText: q.text || (q.wording && q.wording.referrer) || q.linkId,
          sourcePages: q.sourcePages || [],
          answer: raw,                                   // 'yes' | 'no' | 'not-assessed' | null
          answerLabel: raw ? ANSWER_LABEL[raw] || raw : null,
          attestedBy: (attEvidence.get(q.linkId) || {}).attestedBy || null,
        };
      })
    : [];

  // An exclusion the referrer attested "Yes" that produced a redirect — the
  // referrer view prefaces the redirect list with the published item text.
  const drivingExclusion = redirects.length
    ? (attestationQuestions.find((q) => q.linkId.indexOf("excl.") === 0 && q.answer === "yes") || null)
    : null;

  const model = {
    view,
    exam: exam ? { name: exam.exam, criteriaVersion: exam.criteriaVersion } : null,
    determination,
    national,
    redirects,
    // published item text of the attested exclusion that drove the redirect
    // (referrer view only); null when no redirect or none was attestation-driven.
    attestationDrivenReason: !isTriager && drivingExclusion ? drivingExclusion.canonicalText : null,
    whatToAdd,
    alternatives,
    attestationQuestions,
    unconfirmedExclusions: exam && Array.isArray(exam.unconfirmedExclusions) ? exam.unconfirmedExclusions.slice() : [],
  };

  if (isTriager) {
    model.trace = (exam && exam.ruleTrace) || {};
    model.evidence = evidenceRows(opts.mergedResponse);
    model.discrepancies = Array.isArray(response.discrepancies) ? response.discrepancies : [];
    model.inferredExcludedByStrictStandard = exam && Array.isArray(exam.inferredExcludedByStrictStandard) ? exam.inferredExcludedByStrictStandard.slice() : [];
    model.inferredIndicators = exam && Array.isArray(exam.inferredIndicators) ? exam.inferredIndicators.slice() : [];
    model.versions = response.versions || null;
    model.assessmentId = response.assessmentId || null;
  }

  return model;
}

// ── render ───────────────────────────────────────────────────────────────────
export function advisoryHtml(model) {
  const out = [];
  const section = (label, body) => { if (body) out.push(`<section class="adv-section"><h3>${esc(label)}</h3>${body}</section>`); };
  const list = (items) => items.length ? `<ul>${items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "";
  const pageRef = (p) => (p ? ` <span class="adv-page">page ${esc(p)}</span>` : "");

  if (model.national.stopped) {
    section(
      "This referral is not for community imaging",
      `<p class="adv-determination">${esc(model.national.determinationPlain)}</p>` + list(model.national.firedRedFlags),
    );
    if (model.national.indeterminateRedFlags.length) section("Red flags needing more information", list(model.national.indeterminateRedFlags));
    return out.join("");
  }

  // Determination
  let detBody = `<p class="adv-determination">${esc(model.determination.plain)}${pageRef(model.determination.page)}</p>`;
  if (model.determination.priorityTimeframe) detBody += `<p class="adv-timeframe">${esc(model.determination.priorityTimeframe)}</p>`;
  if (model.view === "triager" && model.determination.priorityCode) detBody += `<p class="adv-priority-code">Priority code: ${esc(model.determination.priorityCode)}</p>`;
  section("Determination", detBody);

  if (model.redirects.length) {
    const because = model.attestationDrivenReason
      ? `<p class="adv-because">Because you indicated: ${esc(model.attestationDrivenReason)}</p>`
      : "";
    section("Alternative management / redirect", because + list(model.redirects));
  }

  if (model.whatToAdd.length) {
    section(
      "What to add",
      `<ul>${model.whatToAdd.map((w) => `<li data-linkid="${esc(w.linkId)}">${esc(w.text)}</li>`).join("")}</ul>`,
    );
  }

  if (model.alternatives.length) {
    section(
      "Other exams the note may indicate",
      `<ul>${model.alternatives.map((a) => `<li>${esc(a.id)}: ${esc(a.plain)}${pageRef(a.page)}</li>`).join("")}</ul>`,
    );
  }

  if (model.attestationQuestions.length) {
    const li = (q) => {
      if (model.view === "triager") {
        const ans = q.answerLabel ? ` — ${esc(q.answerLabel)}` : "";
        const by = q.attestedBy ? ` (attested by ${esc(q.attestedBy)})` : "";
        return `<li data-linkid="${esc(q.linkId)}">${esc(q.text)}${ans}${by}</li>`;
      }
      // referrer — the published question, the answer, and a call to record a Yes
      const ans = q.answerLabel ? ` — <span class="adv-attn-answer">you answered ${esc(q.answerLabel)}</span>` : "";
      const say = q.answer === "yes" ? ` <span class="adv-attn-say">State this in your referral.</span>` : "";
      return `<li data-linkid="${esc(q.linkId)}">${esc(q.text)}${ans}${say}</li>`;
    };
    section("Referrer attestation", `<ul>${model.attestationQuestions.map(li).join("")}</ul>`);
  }

  if (model.view === "triager") {
    if (model.evidence && model.evidence.length) {
      section(
        "Evidence",
        `<table class="adv-evidence"><thead><tr><th>indicator</th><th>value</th><th>status</th><th>quote / source</th></tr></thead><tbody>${model.evidence
          .map((e) => `<tr><td>${esc(e.linkId)}</td><td>${esc(e.value)}</td><td>${esc(e.status || "")}</td><td>${esc(e.quote || (e.source ? `${e.source}${e.attestedBy ? " · " + e.attestedBy : ""}` : ""))}</td></tr>`)
          .join("")}</tbody></table>`,
      );
    }
    if (model.inferredExcludedByStrictStandard && model.inferredExcludedByStrictStandard.length) {
      section("Inferred — not counted under the strict standard", list(model.inferredExcludedByStrictStandard));
    }
    if (model.discrepancies && model.discrepancies.length) {
      section(
        "Discrepancies",
        `<ul>${model.discrepancies
          .map((d) => `<li>${esc(d.linkId)}: kept ${esc(d.kept.value)} (${esc(d.kept.provenance)}), superseded ${esc(d.superseded.value)} (${esc(d.superseded.provenance)})${d.valuesMatch ? " — values agree" : ""}</li>`)
          .join("")}</ul>`,
      );
    }
    if (model.unconfirmedExclusions.length) section("Unconfirmed exclusions", list(model.unconfirmedExclusions));
    if (model.trace && Object.keys(model.trace).length) {
      section(
        "Rule trace",
        `<table class="adv-trace"><tbody>${Object.entries(model.trace)
          .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v === null ? "unknown" : String(v))}</td></tr>`)
          .join("")}</tbody></table>`,
      );
    }
    if (model.versions) {
      section(
        "Versions",
        `<dl class="adv-versions">${Object.entries(model.versions)
          .filter(([k]) => k !== "bundles")
          .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
          .join("")}${Object.entries(model.versions.bundles || {})
          .map(([k, v]) => `<div><dt>bundle ${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
          .join("")}</dl>`,
      );
    }
  }

  return out.join("");
}
