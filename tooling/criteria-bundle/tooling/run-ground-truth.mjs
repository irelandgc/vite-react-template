// Proves the extraction benchmark's ground truth is sound before any model is involved.
// For each case in benchmark/ground-truth/:
//   1. every quote is a verbatim span of the case's note   (validation-gate rule 1)
//   2. every linkId is answerable                          (validation-gate rule 2)
//   3. every expectedAbsent linkId is genuinely unanswered  (the false-positive set)
//   4. the expected answers, run through the engine, produce the case's expected Advisory
//   5. that Advisory agrees with the scenario of the same name in tests/scenarios.mjs
// A benchmark whose ground truth disagrees with the rules measures nothing, so this runs in
// `npm test` alongside the scenario suites.
// Usage (from tooling/): node run-ground-truth.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cql from "cql-execution";
import cqlfhir from "cql-exec-fhir";
import { scenarios, toQuestionnaireResponse } from "../tests/scenarios.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const gtDir = path.join(root, "benchmark", "ground-truth");

const elm = JSON.parse(fs.readFileSync(path.join(root, "elm", "CRR_CTChestAbdomenPelvis_Adult.json"), "utf8"));
const helpers = JSON.parse(fs.readFileSync(path.join(root, "elm", "FHIRHelpers-4.0.1.json"), "utf8"));
const lib = new cql.Library(elm, new cql.Repository({ FHIRHelpers: helpers }));

// Every linkId the model may answer: the union of the national and CT CAP Questionnaires.
const answerable = new Set();
for (const f of ["Questionnaire-CRR-National.json", "Questionnaire-CRR-CT-CAP-Adult.json"]) {
  const q = JSON.parse(fs.readFileSync(path.join(root, "fhir", f), "utf8"));
  (function walk(items) { for (const i of items || []) { if (i.type !== "group") answerable.add(i.linkId); walk(i.item); } })(q.item);
}

const normalise = s => s.replace(/\s+/g, " ").trim().toLowerCase();
const sameSet = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort());

const files = fs.readdirSync(gtDir).filter(f => f.endsWith(".json") && f !== "manifest.json").sort();
const results = [];

for (const file of files) {
  const c = JSON.parse(fs.readFileSync(path.join(gtDir, file), "utf8"));
  const fails = [];
  const note = normalise(c.note);

  // 1 + 2: the ground truth must itself pass the validation gate.
  for (const [linkId, e] of Object.entries(c.expected)) {
    if (!answerable.has(linkId)) fails.push(`${linkId}: not an item in the national or CT CAP Questionnaire`);
    if (!e.quote) fails.push(`${linkId}: no quote`);
    else if (!note.includes(normalise(e.quote))) fails.push(`${linkId}: quote "${e.quote}" is not a verbatim span of the note (gate rule 1)`);
    if (!["documented", "inferred"].includes(e.status)) fails.push(`${linkId}: status "${e.status}" is not documented|inferred on the model path`);
  }
  for (const q of c.examSites || []) {
    if (q.requested === false && !q.quote) fails.push(`examSites ${q.id}: a candidate must carry a quote (gate rule 5)`);
    if (q.quote && !note.includes(normalise(q.quote))) fails.push(`examSites ${q.id}: quote "${q.quote}" is not in the note`);
  }

  // 3: the false-positive set must not overlap the answered set.
  for (const linkId of Object.keys(c.expectedAbsent || {})) {
    if (linkId in c.expected) fails.push(`${linkId}: listed in both expected and expectedAbsent`);
  }

  // 4: run the expected answers through the engine.
  const answers = Object.fromEntries(Object.entries(c.expected).map(([linkId, e]) => [linkId, { v: e.value, status: e.status, quote: e.quote }]));
  const qr = toQuestionnaireResponse({ id: c.id, answers });
  const ps = cqlfhir.PatientSource.FHIRv401();
  ps.loadBundles([{ resourceType: "Bundle", type: "collection", entry: [{ resource: { resourceType: "Patient", id: c.id } }, { resource: qr }] }]);
  const adv = (await new cql.Executor(lib, new cql.CodeService({}), {}).exec(ps)).patientResults[c.id].Advisory;

  const exp = c.engineExpectation;
  if (exp.determination !== undefined && adv.determination !== exp.determination) fails.push(`determination ${adv.determination} != ${exp.determination}`);
  if (exp.priorityCode !== undefined && adv.priorityCode !== exp.priorityCode) fails.push(`priorityCode ${adv.priorityCode} != ${exp.priorityCode}`);
  if (exp.missing !== undefined && !sameSet(adv.missingInformation, exp.missing)) fails.push(`missing ${JSON.stringify(adv.missingInformation)} != ${JSON.stringify(exp.missing)}`);
  if (exp.redirects !== undefined && !sameSet(adv.activeRedirects, exp.redirects)) fails.push(`redirects ${JSON.stringify(adv.activeRedirects)} != ${JSON.stringify(exp.redirects)}`);

  // 5: and must agree with the scenario it was derived from.
  const scenario = scenarios.find(s => s.id === c.scenarioId);
  if (!scenario) fails.push(`scenarioId "${c.scenarioId}" is not in tests/scenarios.mjs`);
  else {
    if (scenario.expect.determination !== undefined && adv.determination !== scenario.expect.determination) fails.push(`disagrees with scenario ${c.scenarioId}: ${adv.determination} != ${scenario.expect.determination}`);
    if (scenario.expect.missing !== undefined && !sameSet(adv.missingInformation, scenario.expect.missing)) fails.push(`disagrees with scenario ${c.scenarioId} on missingInformation`);
    if (scenario.expect.redirects !== undefined && !sameSet(adv.activeRedirects, scenario.expect.redirects)) fails.push(`disagrees with scenario ${c.scenarioId} on redirects`);
    if (scenario.note && normalise(scenario.note) !== note) fails.push(`note differs from scenario ${c.scenarioId}'s note`);
  }

  results.push({ id: c.id, ok: fails.length === 0, fails, adv, c });
}

// The manifest must describe the cases that are actually here.
const manifest = JSON.parse(fs.readFileSync(path.join(gtDir, "manifest.json"), "utf8"));
const manifestIds = new Set(manifest.cases.map(m => m.id));
const caseIds = new Set(results.map(r => r.id));
const manifestProblems = [
  ...[...caseIds].filter(id => !manifestIds.has(id)).map(id => `case ${id} is not listed in manifest.json`),
  ...[...manifestIds].filter(id => !caseIds.has(id)).map(id => `manifest.json lists ${id}, which has no case file`)
];
for (const m of manifest.cases) if (!m.source) manifestProblems.push(`manifest entry ${m.id} has no provenance source (KI-30: a case with no provenance does not belong in the set)`);

let md = "# Extraction benchmark - ground-truth engine check\n\n";
md += "Generated by `tooling/run-ground-truth.mjs`. Proves each ground-truth response is gate-valid and that running it through the CT CAP engine reproduces the case's expected Advisory and the scenario it was derived from. No model is involved.\n\n";
md += "| Case | Matrix id | Indicators | Absent | Determination | Result |\n|---|---|---|---|---|---|\n";
for (const r of results) {
  md += `| ${r.id} | ${r.c.matrixId} | ${Object.keys(r.c.expected).length} | ${Object.keys(r.c.expectedAbsent || {}).length} | ${r.adv.determination} | ${r.ok ? "PASS" : "FAIL: " + r.fails.join("; ")} |\n`;
}
md += "\n## Full advisory per case\n\n";
for (const r of results) md += `### ${r.id}\n\n${r.c.title}\n\n> ${r.c.note}\n\n\`\`\`json\n${JSON.stringify(r.adv, null, 2)}\n\`\`\`\n\n`;
fs.writeFileSync(path.join(root, "benchmark", "ground-truth-results.md"), md);

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.id.padEnd(32)} -> ${r.adv.determination}${r.fails.length ? "  [" + r.fails.join("; ") + "]" : ""}`);
for (const p of manifestProblems) console.log(`FAIL  manifest: ${p}`);
const failed = results.filter(r => !r.ok).length + manifestProblems.length;
console.log(`\n${results.length - results.filter(r => !r.ok).length}/${results.length} ground-truth cases consistent with the engine${manifestProblems.length ? `; ${manifestProblems.length} manifest problem(s)` : "; manifest consistent"}`);
process.exit(failed ? 1 : 0);
