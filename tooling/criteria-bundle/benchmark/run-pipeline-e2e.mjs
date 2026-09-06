// ARCH-MIG-01 slice 5 (D7) — end-to-end pipeline proof.
//
// MANUAL. Never in CI (it makes real model calls). Runs the four CT CAP
// ground-truth notes through POST /api/assess in the TWO-WORKER `wrangler dev`
// (main worker forwards to the API worker over the CRR_API service binding,
// SD-11), plus one demonstration case that proves the AD-17 attestation
// mechanism: S01's note reaches P2_URGENT ONLY when the referrer attests
// `workup.strongSuspicionMalignancy` (the extraction model may never answer it).
//
// For each call it checks: the engine determination against the scenario
// expectation, that one `assessments` row was written with every field the gap
// analysis §6 lists populated, and — for the demonstration case — that the merged
// QuestionnaireResponse carries the attested answer with
// `source: referrer-attestation` + `attestedBy`, and that the row's `attestations`
// column records it.
//
//   # seed a local API worker (one time):
//   #   - local D1: schema.sql + migrations 0008/0009/0010
//   #   - publish national-redflags:1.0.0 and ct-chest-abdomen-pelvis-adult:1.0.0
//   #     to local KV + a `bundles` row at state 'published'
//   #   - public/crr-criteria/.dev.vars: ANTHROPIC_API_KEY, ASSESS_INTERNAL_KEY,
//   #     ASSESS_PIPELINE_ENABLED=true
//   #   - repo-root .dev.vars: ASSESS_PIPELINE_ENABLED=true + the SAME
//   #     ASSESS_INTERNAL_KEY (the main worker injects x-assess-internal)
//   # then:
//   npx wrangler dev -c wrangler.json -c public/crr-criteria/wrangler.json --port 8787
//   # and from repo root:
//   ASSESS_URL=http://localhost:8787 node tooling/criteria-bundle/benchmark/run-pipeline-e2e.mjs
//
// Writes benchmark/results/<date>-pipeline-e2e-<modelId>.md.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, "..", "..", "..");
const gtDir = path.join(here, "ground-truth");
const resultsDir = path.join(here, "results");
const BASE = process.env.ASSESS_URL || "http://localhost:8787";
const D1_CONFIG = "public/crr-criteria/wrangler.json";

// Fields every complete pipeline row must carry (gap analysis §6 / brief D2).
const REQUIRED_ROW_FIELDS = [
  "bundle_versions", "engine_version", "vocabulary_version", "prompt_version",
  "model_id", "model_provider", "documentation_standard", "questionnaire_response",
  "advisory", "equivalence_list_version", "redaction_patterns", "exam_site_selection",
  "performed_by",
];

// The demonstration case: S01's note (rich, full work-up documented in prose) —
// the pathway to P2 is reachable ONLY with the attestation.
const DEMO = {
  id: "DEMO-S01-attestation",
  title: "AD-17 proof: S01 note reaches P2_URGENT only when workup.strongSuspicionMalignancy is attested",
  note: "62M. 4/12 hx unintentional weight loss, 84kg -> 77kg (8%) on scales. Tired. Exam NAD, no masses. FBC/CRP/LFT/Ca/UA/CXR all done and unremarkable. Strongly suspect occult malignancy.",
  examSite: "ct_cap",
  context: { age: 62, sex: "male" },
  runs: [
    { label: "no attestation", attestations: {}, expect: "not P2_URGENT" },
    { label: "workup.strongSuspicionMalignancy attested true", attestations: { "workup.strongSuspicionMalignancy": { value: true, attestedBy: "Dr E2E (GP)", mode: "referrer" } }, expect: "P2_URGENT" },
  ],
};

async function assess(body) {
  const res = await fetch(BASE + "/api/assess", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function rowById(id) {
  const out = execFileSync("npx", [
    "wrangler", "d1", "execute", "crr-criteria", "--local", "--config", D1_CONFIG,
    "--json", "--command", `SELECT * FROM assessments WHERE id = '${id}'`,
  ], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const parsed = JSON.parse(out);
  return parsed?.[0]?.results?.[0] ?? null;
}

function checkRow(row) {
  if (!row) return { ok: false, missing: ["<no row written>"] };
  const missing = REQUIRED_ROW_FIELDS.filter((f) => row[f] === null || row[f] === undefined || row[f] === "");
  return { ok: missing.length === 0, missing };
}

function missingInformationOf(json) {
  return json?.advisory?.requestedExam?.advisory?.missingInformation ?? [];
}

function attestationEvidence(qr, linkId) {
  let found = null;
  const walk = (items) => {
    for (const i of items || []) {
      if (Array.isArray(i.item)) walk(i.item);
      if (i.linkId !== linkId || !Array.isArray(i.answer)) continue;
      const ev = (i.answer[0].extension || []).find((e) => e.url.endsWith("answer-evidence"));
      const sub = {};
      for (const s of ev?.extension || []) sub[s.url] = s.valueCode ?? s.valueString;
      found = sub;
    }
  };
  walk(qr?.item);
  return found;
}

const gtFiles = fs.readdirSync(gtDir).filter((f) => f.endsWith(".json") && f !== "manifest.json").sort();
const cases = [];
let modelId = "?", promptVersion = "?", equivVersion = "?";

for (const file of gtFiles) {
  const gt = JSON.parse(fs.readFileSync(path.join(gtDir, file), "utf8"));
  const body = { note: gt.note, requestedExamSite: gt.examSites?.[0]?.id, context: {}, performedBy: "Dr E2E (GP)" };
  const { status, json } = await assess(body);
  const v = json.versions || {};
  modelId = v.model || modelId; promptVersion = v.prompt || promptVersion; equivVersion = v.equivalenceList || equivVersion;
  const determination = json.advisory?.determination ?? null;
  const row = json.assessmentId ? rowById(json.assessmentId) : null;
  cases.push({
    id: gt.id, matrixId: gt.matrixId, title: gt.title, note: gt.note,
    status, assessmentId: json.assessmentId ?? null,
    determination, expected: gt.engineExpectation?.determination ?? null,
    match: determination === (gt.engineExpectation?.determination ?? null),
    validation: json.validation ?? null,
    row: checkRow(row),
    discrepancies: (json.discrepancies || []).length,
  });
}

// Demonstration case
const demoRuns = [];
for (const r of DEMO.runs) {
  const body = { note: DEMO.note, requestedExamSite: DEMO.examSite, context: DEMO.context, attestations: r.attestations, performedBy: "Dr E2E (GP)" };
  const { status, json } = await assess(body);
  const row = json.assessmentId ? rowById(json.assessmentId) : null;
  const mergedQr = json.mergedQuestionnaireResponse;
  demoRuns.push({
    label: r.label, expect: r.expect, status,
    assessmentId: json.assessmentId ?? null,
    determination: json.advisory?.determination ?? null,
    missingNamesAttestation: missingInformationOf(json).includes("workup.strongSuspicionMalignancy"),
    attestationsApplied: json.attestationsApplied ?? [],
    evidence: Object.keys(r.attestations).length ? attestationEvidence(mergedQr, "workup.strongSuspicionMalignancy") : null,
    rowAttestations: row?.attestations ? JSON.parse(row.attestations) : null,
    row: checkRow(row),
  });
}

// ── report ──
const date = new Date().toISOString().slice(0, 10);
const allMatch = cases.every((c) => c.match);
const allRowsOk = cases.every((c) => c.row.ok) && demoRuns.every((r) => r.row.ok);
const demoProves = demoRuns[0].determination !== "P2_URGENT"
  && demoRuns[0].missingNamesAttestation
  && demoRuns[1].determination === "P2_URGENT"
  && !demoRuns[1].missingNamesAttestation
  && demoRuns[1].evidence?.source === "referrer-attestation"
  && demoRuns[1].evidence?.attestedBy === "Dr E2E (GP)"
  && Array.isArray(demoRuns[1].rowAttestations) && demoRuns[1].rowAttestations.length === 1;

let md = `# Pipeline end-to-end — ${date} — ${modelId}\n\n`;
md += `Generated by \`tooling/criteria-bundle/benchmark/run-pipeline-e2e.mjs\` against the two-worker \`wrangler dev\` at \`${BASE}\` `;
md += `(\`POST /api/assess\` through the main worker's \`CRR_API\` forward — SD-11). Prompt **v${promptVersion}**, equivalence list **${equivVersion}**, engine per the response.\n\n`;
md += `Model output is non-deterministic — one run is a sample, not a rate. A determination miss is a FINDING (extraction drift, SR-09), not a slice failure; the pipeline wiring is what this proves.\n\n`;
md += `## Result\n\n`;
md += `| check | outcome |\n|---|---|\n`;
md += `| 4 ground-truth notes: engine determination == scenario expectation | ${allMatch ? "MATCH (all 4)" : "DIVERGES — see below"} |\n`;
md += `| one complete \`assessments\` row per call (all §6 fields populated) | ${allRowsOk ? "yes" : "NO — see below"} |\n`;
md += `| AD-17: S01 reaches P2_URGENT only with the attestation, recorded with source + attestedBy | ${demoProves ? "proven" : "NOT proven — see below"} |\n\n`;

md += `## Ground-truth notes\n\n`;
for (const c of cases) {
  md += `### ${c.id} — ${c.matrixId}\n\n`;
  md += `${c.title}\n\n> ${c.note}\n\n`;
  md += `- HTTP ${c.status} · assessmentId \`${c.assessmentId ?? "—"}\`\n`;
  md += `- engine determination: **${c.determination ?? "—"}** · expected **${c.expected ?? "—"}** — ${c.match ? "MATCH" : "**DIVERGES**"}\n`;
  md += `- validation: ${c.validation ? JSON.stringify(c.validation) : "—"}\n`;
  md += `- discrepancies recorded: ${c.discrepancies}\n`;
  md += `- audit row: ${c.row.ok ? "complete" : "**incomplete — missing " + c.row.missing.join(", ") + "**"}\n\n`;
}

md += `## AD-17 attestation demonstration — ${DEMO.id}\n\n`;
md += `${DEMO.title}\n\n> ${DEMO.note}\n\n`;
for (const r of demoRuns) {
  md += `### ${r.label}\n\n`;
  md += `- HTTP ${r.status} · assessmentId \`${r.assessmentId ?? "—"}\` · expected ${r.expect}\n`;
  md += `- determination: **${r.determination ?? "—"}**\n`;
  md += `- attestationsApplied: \`${JSON.stringify(r.attestationsApplied)}\`\n`;
  md += `- Advisory missing-information names \`workup.strongSuspicionMalignancy\`: ${r.missingNamesAttestation ? "yes" : "no"}\n`;
  if (r.evidence) md += `- merged QR evidence on \`workup.strongSuspicionMalignancy\`: \`${JSON.stringify(r.evidence)}\`\n`;
  if (r.rowAttestations) md += `- row \`attestations\` column: \`${JSON.stringify(r.rowAttestations)}\`\n`;
  md += `- audit row: ${r.row.ok ? "complete" : "**incomplete — missing " + r.row.missing.join(", ") + "**"}\n\n`;
}

fs.mkdirSync(resultsDir, { recursive: true });
const outPath = path.join(resultsDir, `${date}-pipeline-e2e-${modelId}.md`.replace(/[^a-zA-Z0-9.\-]/g, "_"));
fs.writeFileSync(outPath, md);
console.log(`Wrote ${path.relative(repoRoot, outPath)}`);
console.log(`  determinations: ${allMatch ? "all match" : "DIVERGES"} · rows: ${allRowsOk ? "all complete" : "INCOMPLETE"} · AD-17 demo: ${demoProves ? "proven" : "NOT proven"}`);
