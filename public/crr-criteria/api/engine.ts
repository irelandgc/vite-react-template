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
// Where the ELM comes from (AD-19, Accepted):
//   - every CRR library — the national red-flag / ACC layer (`national-redflags`)
//     and each site — is a published bundle loaded by version from KV (worker.ts
//     `resolveExamForEngine` / `resolveNationalRedFlags`). "Criteria logic loaded
//     by version at runtime" (invariant 3) is about all of them equally.
//   - the engine FAILS CLOSED: if `national-redflags` has no published version,
//     `runAssessment` throws `NationalLibraryUnavailableError` and no assessment
//     runs. It never falls back to an imported copy (SR-13).
//   - FHIRHelpers stays a build import — it is CQL plumbing, not criteria, and a
//     fixed dependency of the runtime (the same file `run-tests.mjs` and the
//     SR-10 smoke test use).

// cql-execution / cql-exec-fhir are CJS Node packages with no type declarations;
// SR-10 verified they load under Workers nodejs_compat.
// @ts-expect-error - no types
import cql from "cql-execution";
// @ts-expect-error - no types
import cqlfhir from "cql-exec-fhir";
import fhirHelpersElm from "../../../tooling/criteria-bundle/elm/FHIRHelpers-4.0.1.json";

export const ENGINE_VERSION = "1.0.0";

// Thrown when the national red-flag / ACC layer cannot be located (AD-19, SR-13).
// The route maps it to a 503 and writes no audit row — nothing was assessed.
export class NationalLibraryUnavailableError extends Error {
  readonly code = "national-redflags-unavailable";
  constructor(message = "The national red-flag / ACC safety library has no published bundle; assessment cannot proceed") {
    super(message);
    this.name = "NationalLibraryUnavailableError";
  }
}

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

export async function evaluateNational(nationalElm: unknown, qr: any, documentationStandard: DocumentationStandard) {
  return runLibrary(nationalElm, qr, documentationStandard);
}

export async function evaluateExam(siteElm: unknown, qr: any, documentationStandard: DocumentationStandard) {
  return runLibrary(siteElm, qr, documentationStandard);
}

// One resolved (or unresolved) exam/site entry.
export type ExamResolution =
  | { id: string; state: "published" | "signed-off"; version: string; vocabularyVersion: string; siteElm: unknown }
  | { id: string; state: "not-available" };

// The national red-flag / ACC layer, resolved from the `national-redflags` bundle.
// `null` means no published version — the engine fails closed (SR-13).
export type NationalResolution = { version: string; elm: unknown } | null;

export interface AssessmentInput {
  questionnaireResponse: any;
  // The national layer (AD-03) — required; a null/absent value is fail-closed.
  nationalLibrary: NationalResolution;
  // The requested exam/site (AD-20) and any candidates the note also indicated.
  requested: ExamResolution;
  candidates: ExamResolution[];
  documentationStandard: DocumentationStandard;
}

// The aggregated engine result. Deterministic: no timestamps, ids or random
// values — the same input produces a byte-identical body (NFR-014). The caller
// (worker.ts) adds the audit row (which does carry an id and timestamp).
export async function runAssessment(input: AssessmentInput) {
  const { questionnaireResponse: qr, nationalLibrary, requested, candidates, documentationStandard } = input;
  const resolutions = [requested, ...candidates];

  // Fail closed (AD-19, SR-13): no national layer -> no assessment. Never an import.
  if (!nationalLibrary || !nationalLibrary.elm) {
    throw new NationalLibraryUnavailableError();
  }

  const national = await evaluateNational(nationalLibrary.elm, qr, documentationStandard);
  const bundleVersions: Record<string, string> = { "national-redflags": nationalLibrary.version };

  const nationalStops =
    national.determination === "ACUTE_ASSESSMENT_REQUIRED" ||
    national.determination === "ACC_PATHWAY";

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
      requestedExam: { id: requested.id, state: requested.state, evaluated: false, advisory: null },
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

  const requestedResult = await evalResolution(requested);
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
