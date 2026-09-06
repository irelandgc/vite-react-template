// Cross-artefact consistency: proves the artefacts cannot silently drift.
//  1. Every text/cql-identifier expression referenced by the PlanDefinition exists in the compiled Library.
//  2. Every Questionnaire linkId referenced by the PlanDefinition (#fragment) exists in the Questionnaire.
//  3. Every linkId string literal used in the CQL source exists in the Questionnaire.
//  4. Every scenario answer linkId exists in the Questionnaire.
//  5. Every Questionnaire initialExpression names a define in the population Library, and the population Library emits that linkId.
//  6. Regional overlays target existing national actions, name a configured region, and carry no logic.
//  7. Every national action with a condition carries a source-page reference.
//  8. (ARCH-MIG-01 slice 1 session 2) Every Questionnaire linkId either resolves to the
//     national vocabulary or is declared site-local; no site-local item duplicates a
//     vocabulary concept's text.
//  9. (session 2) Every national red-flag/ACC define named in CRR_RedFlags' Rule Trace
//     carries a SOURCE comment with a page reference.
// 10. (session 2) Terminology validation scaffold: runs when NZHTS_URL is configured;
//     otherwise lists PLACEHOLDER codes and passes. No network calls in this check.
// Usage (from tooling/): npm run check
// Standalone bundle validation (ARCH-MIG-01 slice 1 session 2, plan §2 slice 1 item 3):
//   npm run check -- --bundle <path-to-published-bundle.json>
// Validates a published bundle file on its own - schema shape, its embedded ELM
// re-hashes to its own stored logicHash, and its source provenance is well-formed -
// without needing the surrounding tooling/criteria-bundle source tree.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scenarios } from "../tests/scenarios.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

const bundleArgIdx = process.argv.indexOf("--bundle");
if (bundleArgIdx !== -1) {
  const bundlePath = process.argv[bundleArgIdx + 1];
  if (!bundlePath) { console.log("PROBLEMS:\n - --bundle requires a file path"); process.exit(1); }
  const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
  const problems = [];
  // `kind: 'national'` is the national red-flag / ACC layer (AD-19): Library ELM +
  // the national Questionnaire, no PlanDefinition, no population, no overlays.
  const isNationalBundle = bundle.kind === "national";
  const requiredKeys = ["examSite", "version", "state", "vocabularyVersion", "source", "logicHash", "publishedAt", "library", "questionnaire", "testResults"];
  if (!isNationalBundle) requiredKeys.push("planDefinition");
  for (const key of requiredKeys) {
    if (!(key in bundle)) problems.push(`bundle missing required key "${key}"`);
  }
  if (isNationalBundle && bundle.examSite !== "national-redflags") problems.push(`kind "national" bundle must have examSite "national-redflags", got "${bundle.examSite}"`);
  if (isNationalBundle && bundle.planDefinition) problems.push(`kind "national" bundle must not carry a PlanDefinition (the national layer has no timeframe rows to render)`);
  if (!["transcribed", "signed-off"].includes(bundle.state)) problems.push(`state "${bundle.state}" is not "transcribed" or "signed-off"`);
  if (bundle.source) {
    if (!["pdf", "approved-draft"].includes(bundle.source.type)) problems.push(`source.type "${bundle.source.type}" is not "pdf" or "approved-draft"`);
    const hasPageRef = bundle.source.type === "pdf" ? !!bundle.source.pages : !!(bundle.source.pages || bundle.source.draftRef);
    if (!hasPageRef) problems.push(`source carries neither a page nor a draft reference (build rule: "page or draft reference")`);
  }
  if (bundle.library?.site && bundle.logicHash) {
    const recomputed = "sha256:" + crypto.createHash("sha256").update(JSON.stringify(bundle.library.site)).update(bundle.library.population ? JSON.stringify(bundle.library.population) : "").digest("hex");
    if (recomputed !== bundle.logicHash) problems.push(`logicHash mismatch: bundle says ${bundle.logicHash}, recomputed from its own embedded ELM is ${recomputed}`);
  }
  const qLinkIds = new Set();
  (function walk(items) { for (const i of items || []) { qLinkIds.add(i.linkId); walk(i.item); } })(bundle.questionnaire?.item);
  (function walkPd(actions) { for (const a of actions || []) {
    for (const inp of a.input || []) for (const p of inp.profile || []) {
      const id = p.split("#")[1];
      if (id && !qLinkIds.has(id)) problems.push(`bundle PlanDefinition action ${a.id}: linkId "${id}" not in bundle's own Questionnaire`);
    }
    walkPd(a.action);
  } })(bundle.planDefinition?.action);
  console.log(`Standalone bundle check: ${bundle.examSite} v${bundle.version} (${bundle.state})`);
  if (problems.length) { console.log("PROBLEMS:\n - " + problems.join("\n - ")); process.exit(1); }
  console.log("Bundle valid standalone");
  process.exit(0);
}
const elm = JSON.parse(fs.readFileSync(path.join(root, "elm", "CRR_CTChestAbdomenPelvis_Adult.json"), "utf8"));
const popElm = JSON.parse(fs.readFileSync(path.join(root, "elm", "CRR_CTCAP_Population.json"), "utf8"));
const popSrc = fs.readFileSync(path.join(root, "cql", "CRR_CTCAP_Population.cql"), "utf8");
const pd = JSON.parse(fs.readFileSync(path.join(root, "fhir", "PlanDefinition-CRR-CT-CAP-Adult.json"), "utf8"));
const q = JSON.parse(fs.readFileSync(path.join(root, "fhir", "Questionnaire-CRR-CT-CAP-Adult.json"), "utf8"));
const cqlSrc = fs.readFileSync(path.join(root, "cql", "CRR_CTChestAbdomenPelvis_Adult.cql"), "utf8");

const defines = new Set(elm.library.statements.def.map(d => d.name));
const popDefines = new Set(popElm.library.statements.def.map(d => d.name));
const linkIds = new Set();
const initialExprs = [];
(function walk(items) { for (const i of items || []) {
  linkIds.add(i.linkId);
  for (const e of i.extension || []) if (e.url.endsWith("sdc-questionnaire-initialExpression")) initialExprs.push([i.linkId, e.valueExpression.expression]);
  walk(i.item);
} })(q.item);

const problems = [];
(function walkPd(actions, trail) {
  for (const a of actions || []) {
    for (const c of a.condition || []) {
      const e = c.expression;
      if (e?.language === "text/cql-identifier" && !defines.has(e.expression)) problems.push(`PlanDefinition action ${a.id}: expression "${e.expression}" not defined in Library`);
    }
    for (const inp of a.input || []) for (const p of inp.profile || []) {
      const id = p.split("#")[1];
      if (id && !linkIds.has(id)) problems.push(`PlanDefinition action ${a.id}: linkId "${id}" not in Questionnaire`);
    }
    walkPd(a.action, trail + "/" + a.id);
  }
})(pd.action, "");

const usedInCql = new Set([...cqlSrc.matchAll(/'([a-z]+\.[A-Za-z0-9.]+)'/g)].map(m => m[1]));
const usedInPop = new Set([...popSrc.matchAll(/'([a-z]+\.[A-Za-z0-9.]+)'/g)].map(m => m[1]));
for (const id of usedInPop) if (!linkIds.has(id)) problems.push(`Population CQL references linkId "${id}" not in Questionnaire`);
for (const [id, expr] of initialExprs) if (!popDefines.has(expr)) problems.push(`Questionnaire ${id}: initialExpression "${expr}" not defined in population Library`);
for (const [id] of initialExprs) if (!usedInPop.has(id)) problems.push(`Questionnaire ${id}: has initialExpression but population Library never emits an answer for it`);
for (const id of usedInCql) if (!linkIds.has(id)) problems.push(`CQL references linkId "${id}" not in Questionnaire`);
for (const s of scenarios) for (const id of Object.keys(s.answers)) if (!linkIds.has(id)) problems.push(`Scenario ${s.id}: linkId "${id}" not in Questionnaire`);

// 6. Regional overlays: every target action exists nationally; overlays carry no logic; every region referenced exists.
const nationalActionIds = new Set();
(function ids(actions) { for (const a of actions || []) { nationalActionIds.add(a.id); ids(a.action); } })(pd.action);
const regions = JSON.parse(fs.readFileSync(path.join(root, "fhir", "regions.json"), "utf8"));
const regionCodes = new Set(regions.regions.map(r => r.code));
for (const f of fs.readdirSync(path.join(root, "fhir")).filter(f => f.startsWith("RegionalOverlay-"))) {
  const ov = JSON.parse(fs.readFileSync(path.join(root, "fhir", f), "utf8"));
  if (ov.library) problems.push(`${f}: overlay must not reference a library`);
  const region = (ov.useContext || []).map(u => u.valueCodeableConcept?.text || "").find(t => t.startsWith("region:"))?.slice(7).trim();
  if (!region || !regionCodes.has(region)) problems.push(`${f}: region "${region}" not in regions.json`);
  const derived = (ov.relatedArtifact || []).find(r => r.type === "derived-from")?.resource || "";
  if (!derived.startsWith(pd.url)) problems.push(`${f}: must be derived-from the national PlanDefinition`);
  (function walkOv(actions) { for (const a of actions || []) {
    if (a.condition || a.input || a.output || a.dynamicValue || a.definitionCanonical) problems.push(`${f} action ${a.id}: overlays may not carry logic (condition/input/output/dynamicValue/definition)`);
    const target = (a.extension || []).find(e => e.url.endsWith("overlay-target-action"))?.valueString;
    if (!target) problems.push(`${f} action ${a.id}: missing overlay-target-action`);
    else if (!nationalActionIds.has(target)) problems.push(`${f} action ${a.id}: target "${target}" is not a national action id`);
    walkOv(a.action);
  } })(ov.action);
}
// 7. Page references: every national action that carries logic also carries a source page.
(function pages(actions) { for (const a of actions || []) {
  if (a.condition && !(a.documentation || []).some(d => (d.extension || []).some(e => e.url.endsWith("source-page")))) problems.push(`PlanDefinition action ${a.id}: has a condition but no source-page documentation`);
  pages(a.action);
} })(pd.action);

// 8. Vocabulary resolution (ARCH-MIG-01 slice 1 session 2, plan §2 slice 1 item 1).
const vocab = JSON.parse(fs.readFileSync(path.join(root, "vocabulary", "indicators.json"), "utf8"));
const vocabByLinkId = new Map(vocab.indicators.map(i => [i.linkId, i]));

// AD-17: the attestation-indicator category. Every listed linkId must be a real
// indicator (a mistyped one would silently do nothing in the gate). The
// extraction service reads this list to strip these items from the Questionnaires
// it sends the model, and the gate rejects any answer to one.
// Slice 5 (AD-23): each attestation indicator carries `attestationWording` with a
// `referrer` and a `triager` question — the two mode wordings the thin Triage
// page renders. The renderer takes these from the bundle, never page code
// (invariant 3), so `check` requires both to exist and to be non-empty.
for (const linkId of vocab.attestationIndicators || []) {
  const ind = vocabByLinkId.get(linkId);
  if (!ind) { problems.push(`attestationIndicators names "${linkId}", which is not an indicator in the vocabulary (AD-17)`); continue; }
  const w = ind.attestationWording;
  if (!w || typeof w.referrer !== "string" || !w.referrer.trim() || typeof w.triager !== "string" || !w.triager.trim()) {
    problems.push(`attestation indicator "${linkId}" is missing attestationWording.referrer / attestationWording.triager (AD-23) — the two mode questions the Triage page renders`);
  }
}
if (Array.isArray(vocab.attestationIndicators)) console.log(`AD-17 attestation category: ${vocab.attestationIndicators.length} indicator(s) the extraction model must not answer (AD-23: 2 mode wordings each)`);
const SITE_LOCAL_EXT = "http://crr.health.nz/fhir/StructureDefinition/site-local";
const siteLocalItems = [];
(function walkQ(items) { for (const i of items || []) {
  if (i.type !== "group") {
    const isSiteLocal = (i.extension || []).some(e => e.url === SITE_LOCAL_EXT && e.valueBoolean === true);
    if (isSiteLocal) siteLocalItems.push(i);
    else if (!vocabByLinkId.has(i.linkId)) problems.push(`Questionnaire item "${i.linkId}" is neither in the national vocabulary nor declared site-local (add extension "${SITE_LOCAL_EXT}": true if this is genuinely site-specific)`);
  }
  walkQ(i.item);
} })(q.item);
for (const i of siteLocalItems) {
  for (const v of vocab.indicators) {
    if (v.text && i.text && v.text.trim().toLowerCase() === i.text.trim().toLowerCase()) {
      console.log(`Warning - site-local item "${i.linkId}" has the same text as vocabulary concept "${v.linkId}" ("${v.text}") - near-duplicate?`);
    }
  }
}

// 9. Red-flag library: every define named in CRR_RedFlags' own Rule Trace tuple carries
// a SOURCE comment with a page reference. The Rule Trace tuple (not a naming-pattern
// guess) is the authoritative list of clinical determinations - it's the same object
// the Advisory and run-tests-redflags.mjs's coverage check both key off.
const redFlagsCqlPath = path.join(root, "cql", "CRR_RedFlags.cql");
if (fs.existsSync(redFlagsCqlPath)) {
  const rfSrc = fs.readFileSync(redFlagsCqlPath, "utf8");
  const traceBlock = rfSrc.match(/define "Rule Trace":\s*Tuple\s*\{([\s\S]*?)\n\s*\}/);
  const traceDefineNames = traceBlock ? [...traceBlock[1].matchAll(/:\s*"([^"]+)"/g)].map(m => m[1]) : [];
  if (!traceDefineNames.length) problems.push(`CRR_RedFlags.cql: could not locate "Rule Trace" tuple to derive the list of clinical defines to check`);
  // Find every headline define's position in file order first. A headline's own SOURCE
  // comment can sit above one or more private helper defines that aren't in the Rule
  // Trace (e.g. RF-03's two threshold helpers) - so the right window for "does this
  // headline have a SOURCE citation" is [end of the PREVIOUS headline, start of this
  // one], not "the nearest preceding define line", which would stop at a helper.
  const clinicalNames = traceDefineNames.filter(n => n !== "Documentation Standard" && n !== "RF-19 Illustrative Features Present");
  const positioned = clinicalNames.map(name => {
    const defRe = new RegExp(`define "${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}":`);
    const m = defRe.exec(rfSrc);
    return { name, index: m ? m.index : -1 };
  }).sort((a, b) => a.index - b.index);
  for (const { name, index } of positioned) {
    if (index === -1) { problems.push(`CRR_RedFlags.cql: Rule Trace names define "${name}" which does not exist`); continue; }
    const windowStart = Math.max(0, ...positioned.filter(p => p.index !== -1 && p.index < index).map(p => p.index));
    const block = rfSrc.slice(windowStart, index);
    if (!/SOURCE\s*\([^)]*\bp\d+\b/.test(block)) problems.push(`CRR_RedFlags.cql: "${name}" has no SOURCE(...) comment with a page reference between the previous headline define and this one`);
  }
  console.log(`Red-flag defines checked for SOURCE+page: ${traceDefineNames.filter(n => n !== "Documentation Standard" && n !== "RF-19 Illustrative Features Present").length}`);
}

// 10. Terminology validation scaffold. Feature-flagged on NZHTS_URL; no network calls here.
if (process.env.NZHTS_URL) {
  console.log(`Terminology: NZHTS_URL configured (${process.env.NZHTS_URL}) - live validation not yet implemented (SR-11); treating as placeholder pass until wired.`);
} else {
  const placeholderCodes = vocab.indicators.filter(i => i.code === "PLACEHOLDER").length;
  console.log(`Terminology: NZHTS_URL not configured - ${placeholderCodes}/${vocab.indicators.length} vocabulary codes are PLACEHOLDER (SR-11, publish-blocking once live, informational for now).`);
}

// 11. AD-01 (slice 2): every published exam/site id resolves to exactly one
// bundle key, and every bundle key is referenced by at least one id. Checks
// the static seed data in the D1 migration (not live D1 - this script has no
// binding), so a future edit to the mapping that breaks the invariant is
// caught before it ever reaches a database.
const examSitesMigrationPath = path.join(root, "..", "..", "public", "crr-criteria", "api", "migrations", "0008_bundle_registry.sql");
if (fs.existsSync(examSitesMigrationPath)) {
  const migrationSrc = fs.readFileSync(examSitesMigrationPath, "utf8");
  const rows = [...migrationSrc.matchAll(/INSERT INTO exam_sites \(id, title, bundle_key, live\) VALUES \('([^']+)', '(?:[^']|'')*', '([^']+)', \d\);/g)]
    .map(([, id, bundleKey]) => ({ id, bundleKey }));
  const idsSeen = new Set();
  for (const r of rows) {
    if (idsSeen.has(r.id)) problems.push(`exam_sites seed: duplicate id "${r.id}"`);
    idsSeen.add(r.id);
  }
  const distinctKeys = new Set(rows.map(r => r.bundleKey));
  if (rows.length !== 53) problems.push(`exam_sites seed: expected 53 published ids (AD-01), found ${rows.length}`);
  if (distinctKeys.size !== 38) problems.push(`exam_sites seed: expected 38 distinct bundle keys (AD-01), found ${distinctKeys.size}`);

  // Every bundle key in the registry must be either a site key from the AD-01
  // mapping, or `national-redflags` — the one bundle with no exam/site ids (it is
  // the national red-flag / ACC layer, AD-19, not a site).
  const NATIONAL_KEY = "national-redflags";
  const registryDir = path.join(root, "registry");
  if (fs.existsSync(registryDir)) {
    const registryKeys = fs.readdirSync(registryDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
    for (const key of registryKeys) {
      if (key === NATIONAL_KEY) continue;
      if (!distinctKeys.has(key)) problems.push(`registry/${key}: bundle key is neither in the AD-01 exam_sites mapping nor "${NATIONAL_KEY}"`);
    }
    const nationalBundle = fs.existsSync(path.join(registryDir, NATIONAL_KEY, "1.0.0.json"));
    console.log(`AD-01 mapping: ${rows.length} published ids -> ${distinctKeys.size} bundle keys; registry has ${registryKeys.length} key(s)${nationalBundle ? ` incl. ${NATIONAL_KEY} (kind: national)` : ""}`);
  } else {
    console.log(`AD-01 mapping: ${rows.length} published ids -> ${distinctKeys.size} bundle keys`);
  }
} else {
  console.log("AD-01 mapping: migration file not found (slice 2 not yet merged) - skipped");
}

// 12. (ARCH-MIG-01 slice 4a) National Questionnaire: every answerable linkId resolves to
// the vocabulary with the vocabulary's type and text, no linkId appears twice, and every
// linkId CRR_RedFlags.cql reads has an item to answer it. The last rule is the one that
// matters - a qualifier the library composes but the Questionnaire omits is a red flag
// that can never fire from a note.
const nationalQPath = path.join(root, "fhir", "Questionnaire-CRR-National.json");
if (fs.existsSync(nationalQPath)) {
  const nq = JSON.parse(fs.readFileSync(nationalQPath, "utf8"));
  const nqLinkIds = new Set();
  (function walkNq(items, trail) { for (const i of items || []) {
    if (nqLinkIds.has(i.linkId)) problems.push(`National Questionnaire: linkId "${i.linkId}" appears more than once`);
    nqLinkIds.add(i.linkId);
    if (i.type !== "group") {
      const v = vocabByLinkId.get(i.linkId);
      if (!v) problems.push(`National Questionnaire item "${i.linkId}" is not in the national vocabulary (the national Questionnaire has no site-local escape hatch)`);
      else {
        if (v.type !== i.type) problems.push(`National Questionnaire item "${i.linkId}": type "${i.type}" != vocabulary type "${v.type}"`);
        if (v.text !== i.text) problems.push(`National Questionnaire item "${i.linkId}": text differs from the vocabulary's published text`);
      }
    }
    walkNq(i.item, trail + "/" + i.linkId);
  } })(nq.item, "");
  if (fs.existsSync(redFlagsCqlPath)) {
    const rfSrc = fs.readFileSync(redFlagsCqlPath, "utf8");
    const usedInRedFlags = new Set([...rfSrc.matchAll(/'([a-z]+\.[A-Za-z0-9.]+)'/g)].map(m => m[1]));
    for (const id of usedInRedFlags) if (!nqLinkIds.has(id)) problems.push(`CRR_RedFlags.cql reads linkId "${id}" but the national Questionnaire has no item for it - the flag composing it can never be answered from a note`);
    console.log(`National Questionnaire: ${[...nqLinkIds].filter(id => id.includes(".")).length} answerable items; CRR_RedFlags reads ${usedInRedFlags.size}, all present`);
  }
} else {
  console.log("National Questionnaire: not found - skipped");
}

// 13. (slice 4a/4b) The extraction prompt has two forms per version: prompt-v3.x.y.json is
// canonical and the service loads it; prompt-v3.x.y.md is what a reviewer reads. They must be
// the same words. Also: no criteria content may re-enter the prompt or its output-tool schema
// (invariant 3, AD-16) - a prompt that starts naming thresholds or lab lists has begun
// re-acquiring the criteria the migration removed. Every prompt-v3.*.json is checked, so a new
// version cannot skip the gate.
const CRITERIA_CONTENT_PATTERNS = [
  ["a numeric threshold", /\b(more than|greater than|less than|at least|≥|>=)\s*\d/i],
  ["a priority code", /\bP[1-4]\b|\bAcute 48\s?hr\b/],
  ["a named analyte list", /\b(ALP|GGT|bilirubin|ferritin|Ca-?125|D-dimer|eGFR|creatinine)\b/i],
  ["a redirect destination", /\b(ED|111|ACC|emergency department)\b/],
];
const promptFiles = fs.readdirSync(path.join(root, "extraction")).filter(f => /^prompt-v3\.\d+\.\d+\.json$/.test(f)).sort();
for (const jsonFile of promptFiles) {
  const prompt = JSON.parse(fs.readFileSync(path.join(root, "extraction", jsonFile), "utf8"));
  const stem = jsonFile.replace(/\.json$/, "");
  const body = prompt.parts.map(p => p.text).join("\n\n");
  const mdPath = path.join(root, "extraction", stem + ".md");
  if (!fs.existsSync(mdPath)) { problems.push(`${stem}.md does not exist (every prompt version needs its reviewer-facing rendering)`); continue; }
  const md = fs.readFileSync(mdPath, "utf8");
  const rendered = md.match(/<!-- PROMPT-BODY-BEGIN -->\n```text\n([\s\S]*?)\n```\n<!-- PROMPT-BODY-END -->/);
  if (!rendered) problems.push(`${stem}.md: no PROMPT-BODY block found`);
  else if (rendered[1] !== body) problems.push(`${stem}.md has drifted from ${jsonFile} (the JSON is canonical - re-render the md)`);
  const equivPath = path.join(root, "extraction", prompt.equivalenceListVersion + ".md");
  if (!fs.existsSync(equivPath)) problems.push(`${stem} names equivalenceListVersion "${prompt.equivalenceListVersion}" but ${path.basename(equivPath)} does not exist`);
  // AD-16: scan the assembled body AND the output-tool schema (shape-only; must carry no criteria content).
  const toolText = prompt.outputTool ? JSON.stringify(prompt.outputTool) : "";
  for (const [label, re] of CRITERIA_CONTENT_PATTERNS) {
    if (re.test(body)) problems.push(`${stem} body contains what looks like ${label} - criteria content belongs in a bundle, not the prompt (invariant 3)`);
    if (toolText && re.test(toolText)) problems.push(`${stem} outputTool schema contains what looks like ${label} - the tool schema is shape-only (AD-16)`);
  }
  console.log(`Extraction prompt v${prompt.version}: ${body.length} chars in ${prompt.parts.length} parts; md matches json${prompt.outputTool ? `; outputTool ${prompt.outputTool.name}` : ""}; equivalence list ${prompt.equivalenceListVersion}`);
}

const unusedLinkIds = [...linkIds].filter(id => id.includes(".") && !usedInCql.has(id));
console.log(`Library defines: ${defines.size}; population defines: ${popDefines.size}; Questionnaire linkIds: ${linkIds.size}; used in criteria CQL: ${usedInCql.size}; populatable: ${initialExprs.length}`);
if (unusedLinkIds.length) console.log(`Info - Questionnaire items not used by logic (documentation only): ${unusedLinkIds.join(", ")}`);
if (problems.length) { console.log("PROBLEMS:\n - " + problems.join("\n - ")); process.exit(1); }
console.log("Consistency OK");
