// Runs every scenario in tests/scenarios-redflags.mjs through the compiled
// CRR_RedFlags library and checks expectations. Mirrors run-tests.mjs's shape
// for the national red-flag/ACC library (ARCH-MIG-01 slice 1 session 1's
// content, wired into the build/test/check gate by session 2).
// Usage (from tooling/): npm test
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cql from "cql-execution";
import cqlfhir from "cql-exec-fhir";
import { scenarios, toQuestionnaireResponse } from "../tests/scenarios-redflags.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const elmDir = path.join(here, "..", "elm");
const testsDir = path.join(here, "..", "tests");
const elm = JSON.parse(fs.readFileSync(path.join(elmDir, "CRR_RedFlags.json"), "utf8"));
const helpers = JSON.parse(fs.readFileSync(path.join(elmDir, "FHIRHelpers-4.0.1.json"), "utf8"));
const lib = new cql.Library(elm, new cql.Repository({ FHIRHelpers: helpers }));

async function runScenario(s, params) {
  const qr = toQuestionnaireResponse(s);
  const bundle = { resourceType: "Bundle", type: "collection", entry: [{ resource: { resourceType: "Patient", id: s.id } }, { resource: qr }] };
  const ps = cqlfhir.PatientSource.FHIRv401();
  ps.loadBundles([bundle]);
  const res = await new cql.Executor(lib, new cql.CodeService({}), params).exec(ps);
  return res.patientResults[s.id].Advisory;
}

const sameSet = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort());

function check(s, adv, exp, label) {
  const f = [];
  if (exp.determination !== undefined && adv.determination !== exp.determination) f.push(`determination ${adv.determination} != ${exp.determination}`);
  if (exp.fired !== undefined && (adv.firedRedFlags || []).length !== exp.fired) f.push(`fired ${(adv.firedRedFlags || []).length} != ${exp.fired}`);
  if (exp.indeterminate !== undefined && (adv.indeterminateRedFlags || []).length !== exp.indeterminate) f.push(`indeterminate ${(adv.indeterminateRedFlags || []).length} != ${exp.indeterminate}`);
  if (exp.missing !== undefined && !sameSet(adv.missingInformation, exp.missing)) f.push(`missing ${JSON.stringify(adv.missingInformation)} != ${JSON.stringify(exp.missing)}`);
  if (exp.inferredExcluded !== undefined && !sameSet(adv.inferredExcludedByStrictStandard, exp.inferredExcluded)) f.push(`inferredExcluded ${JSON.stringify(adv.inferredExcludedByStrictStandard)}`);
  if (exp.trace) for (const [k, v] of Object.entries(exp.trace)) {
    const actual = adv.ruleTrace[k];
    const match = Array.isArray(v) ? sameSet(actual, v) : actual === v;
    if (!match) f.push(`trace.${k} ${JSON.stringify(actual)} != ${JSON.stringify(v)}`);
  }
  return { id: s.id, label, ok: f.length === 0, fails: f, adv };
}

const results = [];
for (const s of scenarios) {
  const base = s.runWith || {};
  const adv = await runScenario(s, base);
  results.push(check(s, adv, s.expect, s.runWith ? JSON.stringify(s.runWith) : "strict"));
  if (s.expectInferredMode) results.push(check(s, await runScenario(s, { ...base, "Documentation Standard": "inferred" }), s.expectInferredMode, "inferred"));
}

let md = "# CRR_RedFlags - scenario results\n\n| Scenario | Run | Determination | Fired | Indeterminate | Missing information | Result |\n|---|---|---|---|---|---|---|\n";
for (const r of results) {
  md += `| ${r.id} | ${r.label} | ${r.adv.determination} | ${(r.adv.firedRedFlags || []).length} | ${(r.adv.indeterminateRedFlags || []).length} | ${(r.adv.missingInformation || []).join(", ") || "-"} | ${r.ok ? "PASS" : "FAIL: " + r.fails.join("; ")} |\n`;
}
md += "\n## Full advisory output per scenario\n\n";
for (const r of results) md += `### ${r.id} (${r.label})\n\n${scenarios.find(s => s.id === r.id).title}\n\n\`\`\`json\n${JSON.stringify(r.adv, null, 2)}\n\`\`\`\n\n`;
fs.writeFileSync(path.join(testsDir, "results-redflags.md"), md);

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.id.padEnd(36)} ${r.label.padEnd(10)} -> ${r.adv.determination}${r.fails.length ? "  [" + r.fails.join("; ") + "]" : ""}`);
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);

// Define coverage: every clinical determination in Rule Trace must be `true` in at
// least one scenario (slice 1's Done line: "red-flag library 100% scenario-covered").
const traceKeys = new Set();
for (const r of results) for (const k of Object.keys(r.adv.ruleTrace)) if (k !== "documentationStandard" && k !== "rf19IllustrativeFeatures") traceKeys.add(k);
const everTrue = new Set();
for (const r of results) for (const [k, v] of Object.entries(r.adv.ruleTrace)) if (v === true) everTrue.add(k);
const uncovered = [...traceKeys].filter(k => !everTrue.has(k));
console.log(`Define coverage: ${traceKeys.size - uncovered.length}/${traceKeys.size}${uncovered.length ? "  UNCOVERED: " + uncovered.join(", ") : "  (100%)"}`);

process.exit(failed || uncovered.length ? 1 : 0);
