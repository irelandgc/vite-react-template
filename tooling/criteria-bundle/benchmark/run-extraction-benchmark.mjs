// ARCH-MIG-01 slice 4b deliverable 6 — the extraction benchmark run.
//
// MANUAL. Never in CI (it makes real model calls). Run by hand against a running
// worker with real credentials, and commit the result.
//
//   # 1. seed a local worker (see the slice-4b brief / the slice-3 round-trip notes):
//   #    schema.sql + 0008 + 0009, publish national-redflags + ct_cap to KV/D1,
//   #    .dev.vars with ANTHROPIC_API_KEY + ASSESS_INTERNAL_KEY + ASSESS_PIPELINE_ENABLED=true
//   # 2. npx wrangler dev --config public/crr-criteria/wrangler.json --port 8787 --persist-to ./.wrangler/state
//   # 3. from repo root:
//   ASSESS_URL=http://localhost:8787 ASSESS_INTERNAL_KEY=<key> \
//     node tooling/criteria-bundle/benchmark/run-extraction-benchmark.mjs [--runs N]
//
// --runs N (default 3): each ground-truth note is extracted N times. The report
// records per-case gate consistency, per-indicator agreement across the N runs
// (value / status / quote / answered), expectedAbsent false positives, and the
// engine determination per run. Model output is non-deterministic — one run is a
// sample, not a rate. A miss is a FINDING, not a failure of the slice.
//
// Writes benchmark/results/<date>-<provider>-<modelId>.md.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const gtDir = path.join(here, "ground-truth");
const resultsDir = path.join(here, "results");

const BASE = process.env.ASSESS_URL || "http://localhost:8787";
const KEY = process.env.ASSESS_INTERNAL_KEY;
if (!KEY) {
  console.error("Set ASSESS_INTERNAL_KEY (the x-assess-internal shared secret the worker expects).");
  process.exit(1);
}

const runsArgIdx = process.argv.indexOf("--runs");
const RUNS = Math.max(1, Number(runsArgIdx !== -1 ? process.argv[runsArgIdx + 1] : process.env.BENCH_RUNS) || 3);

const normalise = (s) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

function collectAnswers(qr) {
  const out = new Map();
  const walk = (items) => {
    for (const i of items || []) {
      if (Array.isArray(i.item)) walk(i.item);
      if (!Array.isArray(i.answer)) continue;
      const a = i.answer[0] || {};
      const vk = Object.keys(a).find((k) => k.startsWith("value"));
      let value = vk ? a[vk] : undefined;
      if (value && typeof value === "object" && "code" in value) value = value.code;
      const ev = (a.extension || []).find((e) => e.url.endsWith("answer-evidence"));
      const sub = {};
      for (const s of ev?.extension || []) {
        if (s.url === "status") sub.status = s.valueCode;
        if (s.url === "quote") sub.quote = s.valueString;
      }
      out.set(i.linkId, { value, status: sub.status, quote: sub.quote });
    }
  };
  walk(qr.item);
  return out;
}

async function post(pathname, body) {
  const res = await fetch(BASE + pathname, {
    method: "POST",
    headers: { "content-type": "application/json", "x-assess-internal": KEY },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const files = fs.readdirSync(gtDir).filter((f) => f.endsWith(".json") && f !== "manifest.json").sort();
const cases = [];
let provider = "?";
let modelId = "?";

for (const file of files) {
  const gt = JSON.parse(fs.readFileSync(path.join(gtDir, file), "utf8"));
  const noteNorm = normalise(gt.note);
  const runs = [];

  for (let r = 0; r < RUNS; r++) {
    const ex = await post("/api/assess/extract", {
      note: gt.note,
      requestedExamSite: gt.examSites?.[0]?.id,
      context: {},
    });
    if (ex.json.provider) provider = ex.json.provider;
    if (ex.json.modelId) modelId = ex.json.modelId;

    const run = { status: ex.status, gatePassed: ex.json.validation?.passed === true, failures: ex.json.validation?.failures || [], answers: null, examSel: ex.json.examSiteSelection || null, determination: null };
    if (run.gatePassed && ex.json.questionnaireResponse) {
      run.answers = collectAnswers(ex.json.questionnaireResponse);
      const ev = await post("/api/assess/evaluate", {
        questionnaireResponse: ex.json.questionnaireResponse,
        requestedExamSite: gt.examSites?.[0]?.id,
      });
      run.determination = ev.json?.requestedExam?.advisory?.determination ?? ev.json?.determination ?? null;
    }
    runs.push(run);
  }

  // per-indicator agreement across runs
  const indicators = [];
  for (const [linkId, expected] of Object.entries(gt.expected || {})) {
    let answered = 0, valueOk = 0, statusOk = 0, quoteOk = 0;
    const seenValues = new Set();
    for (const run of runs) {
      const g = run.answers?.get(linkId);
      if (!g) continue;
      answered++;
      seenValues.add(`${g.value}/${g.status}`);
      if (String(g.value) === String(expected.value)) valueOk++;
      if (g.status === expected.status) statusOk++;
      if (typeof g.quote === "string" && noteNorm.includes(normalise(g.quote))) quoteOk++;
    }
    indicators.push({ linkId, expected, answered, valueOk, statusOk, quoteOk, distinct: [...seenValues] });
  }

  // expectedAbsent false positives across runs
  const absent = [];
  for (const linkId of Object.keys(gt.expectedAbsent || {})) {
    const hits = runs.filter((run) => run.answers?.has(linkId)).length;
    absent.push({ linkId, hits });
  }

  // quote validity across every answered indicator in every gate-passing run
  let quotesTotal = 0, quotesValid = 0;
  for (const run of runs) {
    if (!run.answers) continue;
    for (const g of run.answers.values()) {
      if (g.quote === undefined) continue; // context-injected answers carry no quote
      quotesTotal++;
      if (typeof g.quote === "string" && noteNorm.includes(normalise(g.quote))) quotesValid++;
    }
  }

  cases.push({
    id: gt.id,
    matrixId: gt.matrixId,
    title: gt.title,
    note: gt.note,
    runs,
    gatePass: runs.filter((r) => r.gatePassed).length,
    indicators,
    absent,
    expectedExamSites: gt.examSites,
    engineExpected: gt.engineExpectation?.determination ?? null,
    quotesTotal,
    quotesValid,
  });
}

// ── report ──
const date = new Date().toISOString().slice(0, 10);
const tick = (n, d) => `${n}/${d}${n === d ? " ✓" : n === 0 ? " ✗" : ""}`;

let md = `# Extraction benchmark — ${date} — ${provider} / ${modelId}\n\n`;
md += `Generated by \`tooling/criteria-bundle/benchmark/run-extraction-benchmark.mjs\` against \`${BASE}\`, **${RUNS} run(s) per case**. `;
md += `Each note goes through \`/api/assess/extract\` (prompt v3.0.1 — flat tool output, the service builds the FHIR response) then, on a gate pass, through \`/api/assess/evaluate\`. Model output is non-deterministic: the per-run split is a sample, not a stable rate. A miss is a finding.\n\n`;

const totalQuotes = cases.reduce((s, c) => s + c.quotesTotal, 0);
const totalQuotesValid = cases.reduce((s, c) => s + c.quotesValid, 0);
const totalGatePass = cases.reduce((s, c) => s + c.gatePass, 0);
md += `## Summary\n\n`;
md += `| | value |\n|---|---|\n`;
md += `| cases | ${cases.length} |\n`;
md += `| runs per case | ${RUNS} |\n`;
md += `| gate PASS | ${totalGatePass}/${cases.length * RUNS} run(s) |\n`;
md += `| quote validity (all answered indicators, all gate-passing runs) | ${totalQuotesValid}/${totalQuotes}${totalQuotes ? ` (${Math.round((totalQuotesValid / totalQuotes) * 100)}%)` : ""} |\n\n`;

for (const c of cases) {
  md += `## ${c.id} — ${c.matrixId}\n\n`;
  md += `${c.title}\n\n`;
  md += `> ${c.note}\n\n`;
  md += `- gate: **${c.gatePass}/${RUNS}** run(s) PASS\n`;
  c.runs.forEach((run, i) => {
    md += `  - run ${i + 1}: HTTP ${run.status}, gate ${run.gatePassed ? "PASS" : "FAIL"}`;
    if (!run.gatePassed && run.failures.length) md += ` — ${run.failures.join("; ")}`;
    if (run.gatePassed) md += ` — engine ${run.determination}`;
    md += `\n`;
  });
  md += `\n`;

  if (c.indicators.length) {
    md += `**Per-indicator agreement across ${RUNS} run(s)** (expected value/status, then how many runs matched):\n\n`;
    md += `| linkId | expected | answered | value | status | quote | distinct value/status seen |\n|---|---|---|---|---|---|---|\n`;
    for (const ind of c.indicators) {
      md += `| ${ind.linkId} | ${ind.expected.value} / ${ind.expected.status} | ${tick(ind.answered, RUNS)} | ${tick(ind.valueOk, RUNS)} | ${tick(ind.statusOk, RUNS)} | ${tick(ind.quoteOk, RUNS)} | ${ind.distinct.join(", ") || "—"} |\n`;
    }
    md += `\n`;
  }

  if (c.absent.length) {
    md += `**expectedAbsent** (runs that wrongly answered — a false positive is a fabrication):\n\n`;
    for (const a of c.absent) md += `- \`${a.linkId}\`: ${tick(a.hits === 0 ? RUNS : RUNS - a.hits, RUNS)} clean${a.hits ? ` — **answered in ${a.hits}/${RUNS}**` : ""}\n`;
    md += `\n`;
  }

  const dets = c.runs.filter((r) => r.gatePassed).map((r) => r.determination);
  md += `**engine determination:** ${dets.length ? `[${dets.join(", ")}]` : "— (no gate-passing run)"} · expected ${c.engineExpected} — ${dets.length && dets.every((d) => d === c.engineExpected) ? "MATCH (all runs)" : dets.length ? "DIVERGES" : "n/a"}\n\n`;

  const gotSel = c.runs.find((r) => r.examSel)?.examSel;
  md += `**exam/site selection:** expected ${JSON.stringify(c.expectedExamSites)} · got ${JSON.stringify(gotSel ?? null)}\n\n`;
}

fs.mkdirSync(resultsDir, { recursive: true });
const outPath = path.join(resultsDir, `${date}-${provider}-${modelId}.md`.replace(/[^a-zA-Z0-9.\-]/g, "_"));
fs.writeFileSync(outPath, md);
console.log(`Wrote ${path.relative(path.join(here, "..", ".."), outPath)} (${RUNS} run(s) per case, ${cases.length} cases)`);
