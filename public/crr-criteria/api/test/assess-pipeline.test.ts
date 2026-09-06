// ARCH-MIG-01 slice 5 — POST /api/assess pipeline route tests.
//
// The full pipeline over real D1 + KV, with the model call stubbed: PII gate ->
// extract -> merge -> evaluate (real CT CAP + national ELM) -> ONE assessments
// row -> response. Covers the happy path, attestations, a gate rejection (422 +
// audit row, no Advisory), fail-closed national bundle (503 + audit row), and a
// context override recorded as a discrepancy.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { env, SELF } from "cloudflare:test";
// @ts-expect-error -- ?raw import
import nationalBundleRaw from "../../../../tooling/criteria-bundle/registry/national-redflags/1.0.0.json?raw";
// @ts-expect-error -- ?raw import
import ctCapBundleRaw from "../../../../tooling/criteria-bundle/registry/ct-chest-abdomen-pelvis-adult/1.0.0.json?raw";

const INTERNAL_KEY = "test-internal-key";
const NOTE = "65yo male w/ unexplained wt loss 5% over past 6/12 with no localising symptoms or signs. Hb mildly low. Ex-smoker.";

const GOOD_ANSWERS = [
  { linkId: "weightloss.present", value: true, status: "documented", quote: "unexplained wt loss 5%" },
  { linkId: "weightloss.percent", value: 5, status: "documented", quote: "wt loss 5%" },
  { linkId: "weightloss.periodMonths", value: 6, status: "documented", quote: "over past 6/12" },
  { linkId: "workup.localisingFeatures", value: false, status: "documented", quote: "no localising symptoms or signs" },
  { linkId: "lab.hb.low", value: true, status: "documented", quote: "Hb mildly low" },
];
const GOOD_TOOL_INPUT = { answers: GOOD_ANSWERS, examSites: [{ id: "ct_cap", requested: true, quote: null }] };

async function seedBundle(key: string, raw: string) {
  const b = JSON.parse(raw);
  await env.KV.put(`bundle:${key}:${b.version}`, JSON.stringify(b));
  await env.KV.put(`bundle:${key}:latest-published`, b.version);
  await env.DB.prepare(
    "INSERT OR IGNORE INTO bundles (exam_site, version, state, logic_hash, vocabulary_version, source_type, created_at) VALUES (?, ?, 'published', 'x', '1.0.0', 'pdf', '2026-01-01')",
  ).bind(key, b.version).run();
  await env.DB.prepare("UPDATE bundles SET state='published' WHERE exam_site=?").bind(key).run();
}

function stubAnthropic(toolInput: any, opts: { stop?: string } = {}) {
  vi.stubGlobal("fetch", async (input: any) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("api.anthropic.com")) {
      return new Response(
        JSON.stringify({
          model: "claude-sonnet-4-6",
          stop_reason: opts.stop ?? "tool_use",
          content: [{ type: "tool_use", id: "tu_1", name: "submit_extraction", input: toolInput }],
          usage: { input_tokens: 1000, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 800 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    throw new Error("unexpected fetch to " + url);
  });
}

function assess(body: unknown, opts: { internal?: string | false } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const internal = opts.internal === undefined ? INTERNAL_KEY : opts.internal;
  if (internal !== false) headers["x-assess-internal"] = internal;
  return SELF.fetch("http://worker/api/assess", { method: "POST", headers, body: JSON.stringify(body) });
}

const rowById = (id: string) => env.DB.prepare("SELECT * FROM assessments WHERE id = ?").bind(id).first<any>();

beforeAll(async () => {
  (env as any).ASSESS_PIPELINE_ENABLED = "true";
  (env as any).ASSESS_INTERNAL_KEY = INTERNAL_KEY;
  (env as any).ANTHROPIC_API_KEY = "test-key";
  (env as any).EXTRACTION_PROVIDER = "anthropic";
  await seedBundle("national-redflags", nationalBundleRaw as string);
  await seedBundle("ct-chest-abdomen-pelvis-adult", ctCapBundleRaw as string);
});

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/assess — gating and validation", () => {
  it("403 without x-assess-internal", async () => {
    expect((await assess({ note: NOTE, requestedExamSite: "ct_cap" }, { internal: false })).status).toBe(403);
  });
  it("404 when ASSESS_PIPELINE_ENABLED is off", async () => {
    const prev = env.ASSESS_PIPELINE_ENABLED;
    try {
      (env as any).ASSESS_PIPELINE_ENABLED = "false";
      expect((await assess({ note: NOTE, requestedExamSite: "ct_cap" })).status).toBe(404);
    } finally {
      (env as any).ASSESS_PIPELINE_ENABLED = prev;
    }
  });
  it("400 without a note / without requestedExamSite", async () => {
    expect((await assess({ requestedExamSite: "ct_cap" })).status).toBe(400);
    expect((await assess({ note: NOTE })).status).toBe(400);
  });
});

describe("POST /api/assess — happy path", () => {
  it("returns one Advisory, a versions block, and writes one complete assessments row", async () => {
    stubAnthropic(GOOD_TOOL_INPUT);
    const before = await env.DB.prepare("SELECT COUNT(*) n FROM assessments").first<any>();
    const res = await assess({ note: NOTE, requestedExamSite: "ct_cap", context: { age: 65, sex: "male" }, performedBy: "Dr Test" });
    expect(res.status).toBe(200);
    const body: any = await res.json();

    expect(body.assessmentId).toMatch(/[0-9a-f-]{36}/);
    expect(body.advisory.requestedExam.advisory.determination).toBeTruthy();
    expect(body.validation).toEqual({ passed: true, failures: [] });
    expect(body.versions).toMatchObject({
      engine: "1.0.0",
      prompt: "3.0.2",
      equivalenceList: "concept-equivalence-v1.2",
      model: "claude-sonnet-4-6",
      provider: "anthropic",
      bundles: { "national-redflags": "1.0.0", ct_cap: "1.0.0" },
    });
    expect(body.examSiteSelection.requestedExamSite).toBe("ct_cap");

    // bundleArtefacts for the renderer (D4): the requested exam's Questionnaire +
    // PlanDefinition, plus the national Questionnaire.
    expect(body.bundleArtefacts.ct_cap.questionnaire.resourceType).toBe("Questionnaire");
    expect(body.bundleArtefacts.ct_cap.planDefinition.resourceType).toBe("PlanDefinition");
    expect(body.bundleArtefacts["national-redflags"].questionnaire.resourceType).toBe("Questionnaire");
    expect(body.bundleArtefacts["national-redflags"].planDefinition).toBeNull();

    const after = await env.DB.prepare("SELECT COUNT(*) n FROM assessments").first<any>();
    expect(after.n).toBe(before.n + 1);

    const row = await rowById(body.assessmentId);
    expect(JSON.parse(row.bundle_versions)).toMatchObject({ ct_cap: "1.0.0", "national-redflags": "1.0.0" });
    expect(row.engine_version).toBe("1.0.0");
    expect(row.prompt_version).toBe("3.0.2");
    expect(row.equivalence_list_version).toBe("concept-equivalence-v1.2");
    expect(row.model_id).toBe("claude-sonnet-4-6");
    expect(row.model_provider).toBe("anthropic");
    expect(row.documentation_standard).toBe("strict");
    expect(row.performed_by).toBe("Dr Test");
    expect(row.validation_failures).toBeNull();
    expect(JSON.parse(row.redaction_patterns)).toEqual(expect.any(Array));
    expect(JSON.parse(row.exam_site_selection).requestedExamSite).toBe("ct_cap");
    // the stored QuestionnaireResponse is the MERGED one — context age/sex present, no evidence extension
    const qr = JSON.parse(row.questionnaire_response);
    const patient = qr.item.find((g: any) => g.linkId === "patient");
    const age = patient.item.find((i: any) => i.linkId === "patient.age");
    expect(age.answer[0].valueInteger).toBe(65);
    expect(age.answer[0].extension).toBeUndefined();
    // the Advisory is stored
    expect(JSON.parse(row.advisory).requestedExam.advisory.determination).toBe(body.advisory.requestedExam.advisory.determination);
  });
});

describe("POST /api/assess — attestations (AD-17)", () => {
  it("applies a referrer attestation to a category indicator and records it on the row", async () => {
    stubAnthropic(GOOD_TOOL_INPUT);
    const res = await assess({
      note: NOTE,
      requestedExamSite: "ct_cap",
      context: { age: 65, sex: "male" },
      attestations: { "workup.strongSuspicionMalignancy": { value: true, attestedBy: "Dr Smith" } },
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.attestationsApplied).toEqual([
      { linkId: "workup.strongSuspicionMalignancy", value: true, attestedBy: "Dr Smith", mode: "referrer" },
    ]);
    const row = await rowById(body.assessmentId);
    expect(JSON.parse(row.attestations)).toEqual([
      { linkId: "workup.strongSuspicionMalignancy", value: true, attestedBy: "Dr Smith", mode: "referrer" },
    ]);
    const qr = JSON.parse(row.questionnaire_response);
    const workup = qr.item.find((g: any) => g.linkId === "workup");
    const att = workup.item.find((i: any) => i.linkId === "workup.strongSuspicionMalignancy");
    const ev = att.answer[0].extension.find((e: any) => e.url.endsWith("answer-evidence"));
    expect(ev.extension.find((s: any) => s.url === "source").valueCode).toBe("referrer-attestation");
    expect(ev.extension.find((s: any) => s.url === "attestedBy").valueString).toBe("Dr Smith");
  });
});

describe("POST /api/assess — failure paths still write the record", () => {
  it("a gate rejection -> 422, advisory null, an assessments row with validation_failures and no Advisory", async () => {
    stubAnthropic({
      answers: [{ linkId: "weightloss.percent", value: 5, status: "documented", quote: "not a span of the note" }],
      examSites: [{ id: "ct_cap", requested: true, quote: null }],
    });
    const before = await env.DB.prepare("SELECT COUNT(*) n FROM assessments").first<any>();
    const res = await assess({ note: NOTE, requestedExamSite: "ct_cap" });
    expect(res.status).toBe(422);
    const body: any = await res.json();
    expect(body.advisory).toBeNull();
    expect(body.validation.passed).toBe(false);
    expect(body.validation.failures.length).toBeGreaterThan(0);
    const after = await env.DB.prepare("SELECT COUNT(*) n FROM assessments").first<any>();
    expect(after.n).toBe(before.n + 1);
    const row = await rowById(body.assessmentId);
    expect(row.advisory).toBe("null");
    expect(JSON.parse(row.validation_failures).stage).toBe("extract-gate");
    expect(JSON.parse(row.validation_failures).failures.length).toBeGreaterThan(0);
  });

  it("fail-closed national bundle -> 503, an assessments row with validation_failures, no Advisory", async () => {
    await env.DB.prepare("UPDATE bundles SET state='transcribed' WHERE exam_site='national-redflags'").run();
    await env.KV.delete("bundle:national-redflags:latest-published");
    try {
      stubAnthropic(GOOD_TOOL_INPUT);
      const before = await env.DB.prepare("SELECT COUNT(*) n FROM assessments").first<any>();
      const res = await assess({ note: NOTE, requestedExamSite: "ct_cap" });
      expect(res.status).toBe(503);
      const body: any = await res.json();
      expect(body.error).toBe("national-redflags-unavailable");
      expect(body.advisory).toBeNull();
      const after = await env.DB.prepare("SELECT COUNT(*) n FROM assessments").first<any>();
      expect(after.n).toBe(before.n + 1);
      const row = await rowById(body.assessmentId);
      expect(JSON.parse(row.validation_failures).error).toBe("national-redflags-unavailable");
    } finally {
      await env.DB.prepare("UPDATE bundles SET state='published' WHERE exam_site='national-redflags'").run();
      await env.KV.put("bundle:national-redflags:latest-published", JSON.parse(nationalBundleRaw as string).version);
    }
  });
});

describe("POST /api/assess — merge discrepancy", () => {
  it("a context value overriding an extracted value is recorded as a discrepancy on the response and the row", async () => {
    stubAnthropic({
      answers: [
        ...GOOD_ANSWERS,
        { linkId: "patient.age", value: 61, status: "documented", quote: "65yo" }, // extractor answered age; context will override
      ],
      examSites: [{ id: "ct_cap", requested: true, quote: null }],
    });
    const res = await assess({ note: NOTE, requestedExamSite: "ct_cap", context: { age: 65, sex: "male" } });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    const d = body.discrepancies.find((x: any) => x.linkId === "patient.age");
    expect(d).toBeTruthy();
    expect(d.kept).toMatchObject({ value: 65, provenance: "context" });
    expect(d.superseded).toMatchObject({ value: 61, provenance: "extracted" });
    const row = await rowById(body.assessmentId);
    expect(JSON.parse(row.discrepancies).some((x: any) => x.linkId === "patient.age")).toBe(true);
  });
});
