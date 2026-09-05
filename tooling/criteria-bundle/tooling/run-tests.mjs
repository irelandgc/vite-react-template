// Runs every scenario through the pipeline and checks expectations.
//   note answers -> QuestionnaireResponse                     (stages 2-3, simulated)
//   record resources -> population library -> retrieved items (stage 4, only when the scenario has a record)
//   merge (retrieved > documented > inferred)                  (stage 5)
//   criteria library -> Advisory                               (stage 6)
// Usage (from tooling/): npm test
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cql from "cql-execution";
import cqlfhir from "cql-exec-fhir";
import { scenarios, toQuestionnaireResponse, toRecordBundle, toRecordResources } from "../tests/scenarios.mjs";
import { populate, merge } from "./populate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const elmDir = path.join(here, "..", "elm");
const testsDir = path.join(here, "..", "tests");
const elm = JSON.parse(fs.readFileSync(path.join(elmDir, "CRR_CTChestAbdomenPelvis_Adult.json"), "utf8"));
const helpers = JSON.parse(fs.readFileSync(path.join(elmDir, "FHIRHelpers-4.0.1.json"), "utf8"));
const lib = new cql.Library(elm, new cql.Repository({ FHIRHelpers: helpers }));

async function runScenario(s, params) {
  let qr = toQuestionnaireResponse(s);
  let discrepancies = [];
  if (s.record) {
    const retrieved = await populate(toRecordBundle(s));
    ({ qr, discrepancies } = merge(qr, retrieved));
  }
  const bundle = { resourceType: "Bundle", type: "collection", entry: [{ resource: { resourceType: "Patient", id: s.id } }, { resource: qr }] };
  const ps = cqlfhir.PatientSource.FHIRv401();
  ps.loadBundles([bundle]);
  const res = await new cql.Executor(lib, new cql.CodeService({}), params).exec(ps);
  const adv = res.patientResults[s.id].Advisory;
  adv.discrepancies = discrepancies;
  return { adv, qr };
}

const sameSet = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort());

function check(s, adv, exp, label) {
  const f = [];
  if (exp.determination !== undefined && adv.determination !== exp.determination) f.push(`determination ${adv.determination} != ${exp.determination}`);
  if (exp.priorityCode !== undefined && adv.priorityCode !== exp.priorityCode) f.push(`priorityCode ${adv.priorityCode} != ${exp.priorityCode}`);
  if (exp.missing !== undefined && !sameSet(adv.missingInformation, exp.missing)) f.push(`missing ${JSON.stringify(adv.missingInformation)} != ${JSON.stringify(exp.missing)}`);
  if (exp.redirects !== undefined && !sameSet(adv.activeRedirects, exp.redirects)) f.push(`redirects ${JSON.stringify(adv.activeRedirects)}`);
  if (exp.inferredExcluded !== undefined && !sameSet(adv.inferredExcludedByStrictStandard, exp.inferredExcluded)) f.push(`inferredExcluded ${JSON.stringify(adv.inferredExcludedByStrictStandard)}`);
  if (exp.unconfirmedExclusions !== undefined && !sameSet(adv.unconfirmedExclusions, exp.unconfirmedExclusions)) f.push(`unconfirmedExclusions ${JSON.stringify(adv.unconfirmedExclusions)}`);
  if (exp.retrieved !== undefined && !sameSet(adv.retrievedIndicators, exp.retrieved)) f.push(`retrieved ${JSON.stringify(adv.retrievedIndicators)} != ${JSON.stringify(exp.retrieved)}`);
  if (exp.discrepancies !== undefined && !sameSet(adv.discrepancies.map(d => d.linkId), exp.discrepancies)) f.push(`discrepancies ${JSON.stringify(adv.discrepancies)}`);
  return { id: s.id, label, ok: f.length === 0, fails: f, adv };
}

const results = [];
const mergedQRs = [];
for (const s of scenarios) {
  const base = s.runWith || {};
  const { adv, qr } = await runScenario(s, base);
  results.push(check(s, adv, s.expect, s.runWith ? JSON.stringify(s.runWith) : "strict/literal"));
  mergedQRs.push(qr);
  if (s.expectInferredMode) results.push(check(s, (await runScenario(s, { ...base, "Documentation Standard": "inferred" })).adv, s.expectInferredMode, "inferred/literal"));
  if (s.expectAlternativeReading) results.push(check(s, (await runScenario(s, { ...base, "P2 Structure Reading": "alternative" })).adv, s.expectAlternativeReading, "strict/alternative"));
}

let md = "# CT CAP Adult - scenario results\n\n| Scenario | Run | Determination | Missing information | Retrieved | Result |\n|---|---|---|---|---|---|\n";
for (const r of results) {
  md += `| ${r.id} | ${r.label} | ${r.adv.determination}${r.adv.priorityCode ? " (" + r.adv.priorityCode + ")" : ""} | ${(r.adv.missingInformation || []).join(", ") || "-"} | ${(r.adv.retrievedIndicators || []).length || "-"} | ${r.ok ? "PASS" : "FAIL: " + r.fails.join("; ")} |\n`;
}
md += "\n## Full advisory output per scenario\n\n";
for (const r of results) md += `### ${r.id} (${r.label})\n\n${scenarios.find(s => s.id === r.id).title}\n\n\`\`\`json\n${JSON.stringify(r.adv, null, 2)}\n\`\`\`\n\n`;
fs.writeFileSync(path.join(testsDir, "results.md"), md);
fs.writeFileSync(path.join(testsDir, "scenarios-bundle.json"), JSON.stringify({
  resourceType: "Bundle", type: "collection",
  entry: scenarios.flatMap((s, i) => [{ resource: { resourceType: "Patient", id: s.id } }, { resource: mergedQRs[i] }, ...toRecordResources(s).map(r => ({ resource: r }))])
}, null, 2));

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.id.padEnd(36)} ${r.label.padEnd(22)} -> ${r.adv.determination}${r.fails.length ? "  [" + r.fails.join("; ") + "]" : ""}`);
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
