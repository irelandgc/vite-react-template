// ARCH-MIG-01 slice 5 (D6) — compare-extraction mode + GET /api/assess/status.
//
// compare-extract runs the SAME extraction contract through two providers/models
// and reports the per-indicator diff and the engine determination for each. When
// the two extracted responses are identical the engine results must be identical
// (TA-022–024). The Azure provider is a stub: that run is reported as `error`,
// visibly, and does not fail the request.
import { beforeAll, afterEach, describe, expect, it, vi } from "vitest";
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

function stubAnthropicPerModel(inputByModel: (model: string) => any) {
  vi.stubGlobal("fetch", async (input: any, init: any) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("api.anthropic.com")) {
      const reqModel = JSON.parse(init.body).model;
      return new Response(
        JSON.stringify({
          model: reqModel,
          stop_reason: "tool_use",
          content: [{ type: "tool_use", id: "tu_1", name: "submit_extraction", input: inputByModel(reqModel) }],
          usage: { input_tokens: 1000, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 800 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    throw new Error("unexpected fetch to " + url);
  });
}

const post = (path: string, body: unknown, internal: string | false = INTERNAL_KEY) => {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (internal !== false) headers["x-assess-internal"] = internal;
  return SELF.fetch("http://worker" + path, { method: "POST", headers, body: JSON.stringify(body) });
};

beforeAll(async () => {
  (env as any).ASSESS_PIPELINE_ENABLED = "true";
  (env as any).ASSESS_INTERNAL_KEY = INTERNAL_KEY;
  (env as any).ANTHROPIC_API_KEY = "test-key";
  (env as any).EXTRACTION_PROVIDER = "anthropic";
  await seedBundle("national-redflags", nationalBundleRaw as string);
  await seedBundle("ct-chest-abdomen-pelvis-adult", ctCapBundleRaw as string);
});
afterEach(() => vi.unstubAllGlobals());

describe("GET /api/assess/status", () => {
  it("200 with versions when the pipeline is on", async () => {
    const res = await SELF.fetch("http://worker/api/assess/status", { headers: { "x-assess-internal": INTERNAL_KEY } });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.enabled).toBe(true);
    expect(body.compareExtraction).toBe(true);
    expect(body.versions.engine).toBe("1.0.0");
    expect(body.versions.prompt).toBe("3.0.1");
  });
  it("403 without the internal key", async () => {
    expect((await SELF.fetch("http://worker/api/assess/status")).status).toBe(403);
  });
  it("404 when the flag is off", async () => {
    const prev = env.ASSESS_PIPELINE_ENABLED;
    try {
      (env as any).ASSESS_PIPELINE_ENABLED = "false";
      expect((await SELF.fetch("http://worker/api/assess/status", { headers: { "x-assess-internal": INTERNAL_KEY } })).status).toBe(404);
    } finally {
      (env as any).ASSESS_PIPELINE_ENABLED = prev;
    }
  });
});

describe("POST /api/assess/compare-extract", () => {
  it("identical extractions -> answersIdentical and engineResultsIdentical, no audit row", async () => {
    stubAnthropicPerModel(() => GOOD_TOOL_INPUT);
    const before = await env.DB.prepare("SELECT COUNT(*) n FROM assessments").first<any>();
    const res = await post("/api/assess/compare-extract", {
      note: NOTE, requestedExamSite: "ct_cap", context: { age: 65, sex: "male" },
      providers: [{ provider: "anthropic", model: "claude-sonnet-4-6" }, { provider: "anthropic", model: "claude-opus-4-8" }],
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.runs).toHaveLength(2);
    expect(body.runs[0].ok).toBe(true);
    expect(body.runs[1].ok).toBe(true);
    expect(body.runs[0].model).toBe("claude-sonnet-4-6");
    expect(body.runs[1].model).toBe("claude-opus-4-8");
    expect(body.answersIdentical).toBe(true);
    expect(body.mergedIdentical).toBe(true);
    expect(body.engineResultsIdentical).toBe(true);
    expect(body.diff.every((d: any) => d.agree)).toBe(true);
    // no merged QR leaks into the response
    expect(body.runs[0].mergedResponse).toBeUndefined();
    const after = await env.DB.prepare("SELECT COUNT(*) n FROM assessments").first<any>();
    expect(after.n).toBe(before.n);
  });

  it("differing extractions -> a per-indicator diff that flags the disagreement", async () => {
    stubAnthropicPerModel((model) =>
      model.includes("opus")
        ? { answers: [...GOOD_ANSWERS.slice(0, 3), { linkId: "lab.hb.low", value: false, status: "documented", quote: "Hb mildly low" }], examSites: [{ id: "ct_cap", requested: true, quote: null }] }
        : GOOD_TOOL_INPUT,
    );
    const res = await post("/api/assess/compare-extract", {
      note: NOTE, requestedExamSite: "ct_cap",
      providers: [{ provider: "anthropic", model: "claude-sonnet-4-6" }, { provider: "anthropic", model: "claude-opus-4-8" }],
    });
    const body: any = await res.json();
    const row = body.diff.find((d: any) => d.linkId === "lab.hb.low");
    expect(row.agree).toBe(false);
    expect(row.a.value).toBe(true);
    expect(row.b.value).toBe(false);
    expect(body.answersIdentical).toBe(false);
  });

  it("the Azure stub run is reported as an error, visibly, without failing the request", async () => {
    stubAnthropicPerModel(() => GOOD_TOOL_INPUT);
    const res = await post("/api/assess/compare-extract", { note: NOTE, requestedExamSite: "ct_cap" });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.runs[0].ok).toBe(true);
    expect(body.runs[1].ok).toBe(false);
    expect(body.runs[1].provider).toBe("azure-openai");
    expect(body.runs[1].error).toBe("provider-not-configured");
    expect(body.engineResultsIdentical).toBe(false);
  });

  it("400 without a note or a requestedExamSite; 403 without the internal key", async () => {
    expect((await post("/api/assess/compare-extract", { requestedExamSite: "ct_cap" })).status).toBe(400);
    expect((await post("/api/assess/compare-extract", { note: NOTE })).status).toBe(400);
    expect((await post("/api/assess/compare-extract", { note: NOTE, requestedExamSite: "ct_cap" }, false)).status).toBe(403);
  });
});
