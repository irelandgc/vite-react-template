// Cross-artefact consistency: proves the three artefacts cannot silently drift.
//  1. Every text/cql-identifier expression referenced by the PlanDefinition exists in the compiled Library.
//  2. Every Questionnaire linkId referenced by the PlanDefinition (#fragment) exists in the Questionnaire.
//  3. Every linkId string literal used in the CQL source exists in the Questionnaire.
//  4. Every scenario answer linkId exists in the Questionnaire.
//  5. Every Questionnaire initialExpression names a define in the population Library, and the population Library emits that linkId.
//  6. Regional overlays target existing national actions, name a configured region, and carry no logic.
//  7. Every national action with a condition carries a source-page reference.
// Usage (from tooling/): npm run check
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scenarios } from "../tests/scenarios.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
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

const unusedLinkIds = [...linkIds].filter(id => id.includes(".") && !usedInCql.has(id));
console.log(`Library defines: ${defines.size}; population defines: ${popDefines.size}; Questionnaire linkIds: ${linkIds.size}; used in criteria CQL: ${usedInCql.size}; populatable: ${initialExprs.length}`);
if (unusedLinkIds.length) console.log(`Info - Questionnaire items not used by logic (documentation only): ${unusedLinkIds.join(", ")}`);
if (problems.length) { console.log("PROBLEMS:\n - " + problems.join("\n - ")); process.exit(1); }
console.log("Consistency OK");
