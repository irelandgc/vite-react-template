// ══════════════════════════════════════════════════════════════
//  ARCH-MIG-01 slice 3 — rules engine
// ══════════════════════════════════════════════════════════════
//
// Evaluates compiled CQL (ELM) against one QuestionnaireResponse and produces
// the Advisory the tools render. No model is involved: this is deterministic
// rule evaluation (SR-10 proved cql-execution runs under Workers nodejs_compat;
// this module is the production version of test/cql-nodejs-compat.smoke.test.ts).
//
// Precedence (AD-03): the national red-flag / ACC library is evaluated FIRST for
// every assessment. ACUTE_ASSESSMENT_REQUIRED or ACC_PATHWAY stops the pipeline —
// no exam library runs. Otherwise each selected exam/site bundle is evaluated
// against the same QuestionnaireResponse (AD-15) and the results are aggregated
// per gap analysis §4: the requested exam plus alternatives[] (a candidate that
// reaches a priority determination while the requested exam does not).
//
// Where the ELM comes from (AD-19):
//   - site + population ELM: the published bundle, loaded by version from KV
//     (worker.ts loadBundle). Those are the 38 artefacts that vary, are
//     transcribed and published independently, and carry per-version sign-off
//     state — "loaded by version at runtime" (invariant 3) is about them.
//   - the national red-flag library and FHIRHelpers: imported build artefacts of
//     the slice-1 CQL, deployed with the engine. The red-flag layer is one
//     artefact, changes rarely, must run on every assessment, and a missing KV
//     publish of a safety layer would fail silently — deploy-time inclusion is
//     the safer choice. Its version is read from the ELM identifier and stamped
//     (invariant 8). If it ever needs to change without an engine redeploy it
//     moves into the registry under the stable key `national-redflags`.

// cql-execution / cql-exec-fhir are CJS Node packages with no type declarations;
// SR-10 verified they load under Workers nodejs_compat.
// @ts-expect-error - no types
import cql from "cql-execution";
// @ts-expect-error - no types
import cqlfhir from "cql-exec-fhir";
import fhirHelpersElm from "../../../tooling/criteria-bundle/elm/FHIRHelpers-4.0.1.json";
import redFlagsElm from "../../../tooling/criteria-bundle/elm/CRR_RedFlags.json";

export const ENGINE_VERSION = "1.0.0";

// The national red-flag library's version, from its ELM identifier (invariant 8).
export const RED_FLAGS_LIBRARY_VERSION: string =
  (redFlagsElm as any).library?.identifier?.version ?? "unknown";

const DOC_STANDARDS = ["strict", "inferred"] as const;
export type DocumentationStandard = (typeof DOC_STANDARDS)[number];

export function isDocumentationStandard(v: unknown): v is DocumentationStandard {
  return typeof v === "string" && (DOC_STANDARDS as readonly string[]).includes(v);
}

// A determination that means "this exam is warranted with a priority" — the
// trigger for a cross-exam recommendation (gap §4). Exam libraries emit P2_URGENT
// today; P1/P3 are allowed for. ACUTE only comes from the national library, which
// stops the pipeline before any exam runs, so it is not an exam-level value here.
function isPriorityDetermination(determination: string | undefined | null): boolean {
  return typeof determination === "string" && /^P\d/.test(determination);
}

const helpersLib = fhirHelpersElm as unknown;

function patientIdOf(qr: any): string {
  const ref: string = qr?.subject?.reference ?? "";
  const id = ref.split("/").pop();
  return id && id.length ? id : "p";
}

// Runs one compiled library over a single QuestionnaireResponse and returns its
// `Advisory` define. `params` maps the engine's documentation standard onto the
// CQL parameter every CRR library declares.
async function runLibrary(elm: unknown, qr: any, documentationStandard: DocumentationStandard): Promise<any> {
  const lib = new cql.Library(elm, new cql.Repository({ FHIRHelpers: helpersLib }));
  const pid = patientIdOf(qr);
  const bundle = {
    resourceType: "Bundle",
    type: "collection",
    entry: [
      { resource: { resourceType: "Patient", id: pid } },
      { resource: qr },
    ],
  };
  const ps = cqlfhir.PatientSource.FHIRv401();
  ps.loadBundles([bundle]);
  const executor = new cql.Executor(lib, new cql.CodeService({}), {
    "Documentation Standard": documentationStandard,
  });
  const res = await executor.exec(ps);
  const patientResult = res.patientResults[pid];
  if (!patientResult || patientResult.Advisory == null) {
    throw new Error("library produced no Advisory for the supplied QuestionnaireResponse");
  }
  return patientResult.Advisory;
}

export async function evaluateNational(qr: any, documentationStandard: DocumentationStandard) {
  return runLibrary(redFlagsElm, qr, documentationStandard);
}

export async function evaluateExam(siteElm: unknown, qr: any, documentationStandard: DocumentationStandard) {
  return runLibrary(siteElm, qr, documentationStandard);
}

// One resolved (or unresolved) entry from the input examSites[] list.
export type ExamResolution =
  | { id: string; state: "published" | "signed-off"; version: string; vocabularyVersion: string; siteElm: unknown }
  | { id: string; state: "not-available" };

export interface AssessmentInput {
  questionnaireResponse: any;
  // First entry is the requested exam; the rest are candidates (gap §4).
  resolutions: ExamResolution[];
  documentationStandard: DocumentationStandard;
}

// The aggregated engine result. Deterministic: no timestamps, ids or random
// values — the same input produces a byte-identical body (NFR-014). The caller
// (worker.ts) adds the audit row (which does carry an id and timestamp).
export async function runAssessment(input: AssessmentInput) {
  const { questionnaireResponse: qr, resolutions, documentationStandard } = input;

  const national = await evaluateNational(qr, documentationStandard);
  const bundleVersions: Record<string, string> = { "national-redflags": RED_FLAGS_LIBRARY_VERSION };

  const nationalStops =
    national.determination === "ACUTE_ASSESSMENT_REQUIRED" ||
    national.determination === "ACC_PATHWAY";

  const requested = resolutions[0] ?? null;
  const candidates = resolutions.slice(1);

  let vocabularyVersion: string | null = null;

  if (nationalStops) {
    // AD-03: pipeline stops, no exam library runs.
    return {
      engineVersion: ENGINE_VERSION,
      vocabularyVersion,
      documentationStandard,
      bundleVersions,
      determination: national.determination,
      priorityCode: null,
      stoppedAtNational: true,
      national,
      requestedExam: requested ? { id: requested.id, state: requested.state, evaluated: false, advisory: null } : null,
      alternatives: [],
      candidatesEvaluated: candidates.map((c) => ({ id: c.id, state: c.state, evaluated: false, advisory: null })),
      notAvailable: resolutions.filter((r) => r.state === "not-available").map((r) => ({ id: r.id })),
    };
  }

  async function evalResolution(r: ExamResolution) {
    if (r.state === "not-available") {
      return { id: r.id, state: r.state, evaluated: false, advisory: null };
    }
    bundleVersions[r.id] = r.version;
    if (vocabularyVersion == null) vocabularyVersion = r.vocabularyVersion;
    const advisory = await evaluateExam(r.siteElm, qr, documentationStandard);
    return { id: r.id, state: r.state, evaluated: true, advisory };
  }

  const requestedResult = requested ? await evalResolution(requested) : null;
  const candidateResults = [];
  for (const c of candidates) candidateResults.push(await evalResolution(c));

  const requestedIsPriority = isPriorityDetermination(requestedResult?.advisory?.determination);

  // gap §4: a candidate that reaches a priority determination while the requested
  // exam does not becomes a cross-exam recommendation.
  const alternatives = candidateResults
    .filter((c) => c.evaluated && !requestedIsPriority && isPriorityDetermination(c.advisory?.determination))
    .map((c) => ({ id: c.id, advisory: c.advisory }));

  return {
    engineVersion: ENGINE_VERSION,
    vocabularyVersion,
    documentationStandard,
    bundleVersions,
    determination: requestedResult?.advisory?.determination ?? national.determination,
    priorityCode: requestedResult?.advisory?.priorityCode ?? null,
    stoppedAtNational: false,
    national,
    requestedExam: requestedResult,
    alternatives,
    candidatesEvaluated: candidateResults,
    notAvailable: resolutions.filter((r) => r.state === "not-available").map((r) => ({ id: r.id })),
  };
}
