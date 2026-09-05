// Composes one immutable bundle JSON per exam/site: Library ELM (site + population,
// full; national red-flags library, by reference only - it's shared, not duplicated),
// PlanDefinition, Questionnaire, regional overlays, vocabularyVersion, last test
// results, source provenance, state, a content hash, and publishedAt.
//
// Usage: node publish.mjs <examSite> [--state transcribed|signed-off] [--version <semver>] [--registry <dir>]
//
// A published bundle file is never rewritten - a re-publish is a new version.
// Bundle version is independent of the FHIR resources' own `version` field; pass
// --version explicitly once a site has publish history (see below). Publishing a
// major version bump is refused when the compiled logic (ELM) hasn't changed since
// the previous published version - that's a metadata-only republish, not a new
// major version.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

// Per-examSite artefact manifest. Only CT CAP exists today (the pilot template,
// which predates the tooling/criteria-bundle/sites/<examSite>/ convention slice 7's
// transcription protocol establishes for every site after it). Future sites are
// expected under sites/<examSite>/ - add their manifests here as they're transcribed.
const MANIFESTS = {
  "ct-chest-abdomen-pelvis-adult": {
    cql: "cql/CRR_CTChestAbdomenPelvis_Adult.cql",
    elm: "elm/CRR_CTChestAbdomenPelvis_Adult.json",
    populationCql: "cql/CRR_CTCAP_Population.cql",
    populationElm: "elm/CRR_CTCAP_Population.json",
    planDefinition: "fhir/PlanDefinition-CRR-CT-CAP-Adult.json",
    questionnaire: "fhir/Questionnaire-CRR-CT-CAP-Adult.json",
    overlayGlobPrefix: "fhir/RegionalOverlay-CRR-CT-CAP-Adult-",
    // Source provenance (plan §2 slice 1 "Source provenance for approved drafts"; this
    // site is `type: 'pdf'`, not a draft). Pages per ARCH-MIG-01-S1's derived page map
    // (tooling/criteria-bundle/vocabulary/transcription-notes.md §3, finding F-09) -
    // the contents-page numbers are off by one throughout the source document; this
    // map is the corrected one.
    source: {
      type: "pdf",
      title: "National Community Referral Criteria for Imaging (Part I)",
      identifier: "National ID 15372, Version 2.0",
      date: "2026-04-09",
      pages: "10-11",
    },
  },
};

// The KV/admin-route target (`bundle:<examSite>:<version>` in the API worker's KV,
// per the plan §2 slice 2) is explicitly NOT this session's work - slice 2 is registry
// and runtime loading, a separate branch/PR. This is a named stub, not an
// implementation: it does nothing, on purpose, so the gap is visible in the code
// rather than silently absent.
function publishToKvStub(_bundle) {
  // Slice 2: POST to the API worker's admin route, which writes
  // KV `bundle:<examSite>:<version>` (immutable) and `bundle:<examSite>:latest-published`,
  // plus a D1 `bundles` row (publish record). Not implemented here.
}

function usageError(msg) {
  console.error(msg);
  console.error("Usage: node publish.mjs <examSite> [--state transcribed|signed-off] [--version <semver>] [--registry <dir>]");
  process.exit(1);
}

const args = process.argv.slice(2);
const examSite = args[0];
if (!examSite || examSite.startsWith("--")) usageError("Missing <examSite>.");
let state = null;
let versionOverride = null;
let registryDir = path.join(root, "registry");
for (let i = 1; i < args.length; i++) {
  if (args[i] === "--state") state = args[++i];
  else if (args[i] === "--version") versionOverride = args[++i];
  else if (args[i] === "--registry") registryDir = path.resolve(args[++i]);
  else usageError(`Unrecognised argument "${args[i]}".`);
}
if (state && !["transcribed", "signed-off"].includes(state)) usageError(`--state must be "transcribed" or "signed-off", got "${state}".`);
if (versionOverride && !/^\d+\.\d+\.\d+$/.test(versionOverride)) usageError(`--version must be semver (X.Y.Z), got "${versionOverride}".`);

const manifest = MANIFESTS[examSite];
if (!manifest) usageError(`No publish manifest for examSite "${examSite}". Known: ${Object.keys(MANIFESTS).join(", ")}`);

const signoffPath = path.join(root, "sites", examSite, "signoff.md");
const hasSignoff = fs.existsSync(signoffPath);

// Refuses without signoff.md unless --state transcribed|signed-off is given.
if (!state && !hasSignoff) usageError(`No signoff.md at ${path.relative(root, signoffPath)} and no --state given. Pass --state transcribed (pre-review) or --state signed-off (requires a filled signoff.md).`);
if (state === "signed-off") {
  if (!hasSignoff) usageError(`--state signed-off requires ${path.relative(root, signoffPath)} to exist.`);
  const signoffText = fs.readFileSync(signoffPath, "utf8");
  const signedOffLine = signoffText.match(/^Signed off by:\s*(.*)$/m);
  const dated = signoffText.match(/^State → signed-off\s+\(publish on:\s*([^,)]+)/m);
  const blank = (v) => !v || /^_+$/.test(v.trim()) || v.trim() === "";
  if (!signedOffLine || blank(signedOffLine[1]) || !dated || blank(dated[1])) {
    usageError(`${path.relative(root, signoffPath)} exists but its sign-off block is not filled in (no --state signed-off without a completed signoff.md).`);
  }
}
const resolvedState = state || "transcribed";

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8")); }
function readText(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

const elm = readJson(manifest.elm);
const populationElm = manifest.populationElm ? readJson(manifest.populationElm) : null;
const planDefinition = readJson(manifest.planDefinition);
const questionnaire = readJson(manifest.questionnaire);
const vocabulary = readJson("vocabulary/indicators.json");

const overlays = fs.readdirSync(path.join(root, "fhir"))
  .filter((f) => f.startsWith(path.basename(manifest.overlayGlobPrefix)))
  .map((f) => readJson(path.join("fhir", f)));

// Content hash covers only the compiled logic (site ELM + population ELM), not
// metadata (source/state/publishedAt) - so re-provenancing a bundle (e.g. an
// approved-draft bundle re-pointed at the published PDF once it's issued) can be
// verified as a version bump with no logic change: same hash, different source.
const logicHash = crypto.createHash("sha256")
  .update(JSON.stringify(elm))
  .update(populationElm ? JSON.stringify(populationElm) : "")
  .digest("hex");

// Last test results: summarised from tests/results.md's own generated table, not
// re-run here (publish composes a bundle from what's already been built and tested;
// it does not re-verify - `npm run build && npm test && npm run check` is the gate
// that must already be green, per the plan's own gate ordering).
function summariseResults(rel) {
  if (!fs.existsSync(path.join(root, rel))) return { file: rel, summary: "not found - run npm test first" };
  const rows = readText(rel).split("\n").filter((l) => /^\|\s*(?:S\d|RF-S\d|RM-)/.test(l));
  const pass = rows.filter((l) => / PASS \|$/.test(l)).length;
  return { file: rel, summary: rows.length ? `${pass}/${rows.length} passed` : "see file" };
}
const testResults = {
  ctCap: summariseResults("tests/results.md"),
  redFlags: summariseResults("tests/results-redflags.md"),
};

// Bundle version is a publish-history concept, independent of the FHIR resource's own
// `version` field (PlanDefinition.version tracks the *template's* iteration, not how
// many times it's been published as a bundle - conflating the two produced a real bug:
// the first-ever bundle publish inherited "2.0.0" from the PlanDefinition and looked
// like a second major release when it was the first). Default to the PlanDefinition's
// version only when there's no publish history yet; otherwise --version is required
// to make a deliberate choice instead of drifting off whatever the FHIR resource says.
const siteDir = path.join(registryDir, examSite);
const indexPath = path.join(siteDir, "index.json");
const existingIndex = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, "utf8")) : null;
const previous = existingIndex?.versions?.[existingIndex.versions.length - 1] ?? null;
if (!versionOverride && previous) usageError(`${examSite} has a previous published version (${previous.version}) - pass --version explicitly (a minor/patch bump if logic is unchanged, per the major-bump guard below).`);
const bundleVersion = versionOverride ?? planDefinition.version;

// Refuse a major version bump when the compiled logic hasn't changed. A same-hash
// republish is metadata-only (vocabularyVersion, source, state, etc.) and must be a
// minor/patch bump, never a major one - a major bump asserts a logic change happened.
if (previous) {
  const newMajor = Number(bundleVersion.split(".")[0]);
  const prevMajor = Number(previous.version.split(".")[0]);
  if (previous.logicHash === `sha256:${logicHash}` && newMajor > prevMajor) {
    usageError(`Refusing to publish ${bundleVersion}: the compiled logic (site + population ELM) is byte-identical to ${previous.version} (${previous.logicHash}), but ${bundleVersion} is a major bump over it. A major version asserts a logic change. Use a minor or patch version instead (e.g. ${prevMajor}.${Number(previous.version.split(".")[1]) + 1}.0), or if the logic genuinely changed, something is wrong with this check - do not work around it, report it.`);
  }
}

const bundle = {
  examSite,
  version: bundleVersion,
  state: resolvedState,
  vocabularyVersion: vocabulary.version,
  source: manifest.source,
  logicHash: `sha256:${logicHash}`,
  publishedAt: new Date().toISOString(),
  library: {
    site: elm,
    population: populationElm,
    redFlags: { name: "CRR_RedFlags", version: readText("cql/CRR_RedFlags.cql").match(/^library CRR_RedFlags version '([^']+)'/m)?.[1] ?? null, byReference: true },
  },
  planDefinition,
  questionnaire,
  overlays,
  testResults,
  dependencies: [...readText(manifest.cql).matchAll(/^include\s+(CRR_\w+)\s+version\s+'([^']+)'/gm)]
    .map(([, name, version]) => ({ name, version }))
    .filter((d) => d.name !== "FHIRHelpers"),
};

const bundlePath = path.join(siteDir, `${bundle.version}.json`);
if (fs.existsSync(bundlePath)) usageError(`${path.relative(root, bundlePath)} already exists. A published bundle is never rewritten - publish a new version (--version) instead.`);

fs.mkdirSync(siteDir, { recursive: true });
fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));
publishToKvStub(bundle);

const index = existingIndex ?? { examSite, versions: [] };
index.versions.push({ version: bundle.version, state: bundle.state, publishedAt: bundle.publishedAt, logicHash: bundle.logicHash, dependencies: bundle.dependencies });
index.latestPublished = bundle.version;
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

console.log(`Published ${examSite} v${bundle.version} (state: ${bundle.state}) -> ${path.relative(root, bundlePath)}`);
console.log(`  vocabularyVersion ${bundle.vocabularyVersion} · logicHash ${bundle.logicHash.slice(0, 15)}... · source ${bundle.source.type} ${bundle.source.pages ? "p" + bundle.source.pages : bundle.source.draftRef ?? ""}`);
console.log(`  dependencies: ${bundle.dependencies.length ? bundle.dependencies.map((d) => d.name).join(", ") : "none"}`);
console.log(`  test results: CT CAP ${bundle.testResults.ctCap.summary}; red-flags ${bundle.testResults.redFlags.summary}`);
