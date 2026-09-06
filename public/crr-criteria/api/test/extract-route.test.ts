// ARCH-MIG-01 slice 4b — POST /api/assess/extract route tests (AD-13 harness).
//
// The model call is stubbed (no real credentials, never in CI). Covers: the
// internal-only gating (SD-11), the PII gate (redact + residual reject), the
// provider abstraction (Anthropic stubbed live, Azure -> 503), the v3.0.1 wire
// format (the model calls the `submit_extraction` tool with a flat answer list;
// the service builds the FHIR QuestionnaireResponse), a gate-passing extraction,
// a gate-failing extraction (422 with failures), age/sex injection from context,
// and the buildQuestionnaireResponse helper.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { env, SELF } from "cloudflare:test";
import { buildQuestionnaireResponse } from "../worker";
import { buildItemIndex, TYPE_TO_VALUE_KEY } from "../gate";
import nationalQ from "../../../../tooling/criteria-bundle/fhir/Questionnaire-CRR-National.json";
import ctCapQ from "../../../../tooling/criteria-bundle/fhir/Questionnaire-CRR-CT-CAP-Adult.json";
// @ts-expect-error -- ?raw import
import nationalBundleRaw from "../../../../tooling/criteria-bundle/registry/national-redflags/1.0.0.json?raw";
// @ts-expect-error -- ?raw import
import ctCapBundleRaw from "../../../../tooling/criteria-bundle/registry/ct-chest-abdomen-pelvis-adult/1.0.0.json?raw";

const INTERNAL_KEY = "test-internal-key";
const GT_NOTE = "65yo male w/ unexplained wt loss 5% over past 6/12 with no localising symptoms or signs. Hb mildly low. Ex-smoker.";

// A gate-passing flat answer list against GT_NOTE (patient.age/sex omitted — the
// context block supplies them, prompt rule 8).
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

let lastRequestBody: any = null;

// A canned Anthropic /v1/messages reply. By default returns `toolInput` as a
// tool_use block (the v3.0.1 path); { asText: true } returns it as assistant
// text instead (the fallback path); { stop } overrides stop_reason.
function stubAnthropic(toolInput: any, opts: { stop?: string; asText?: boolean } = {}) {
  lastRequestBody = null;
  vi.stubGlobal("fetch", async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("api.anthropic.com")) {
      lastRequestBody = init?.body ? JSON.parse(init.body) : null;
      const content = opts.asText
        ? [{ type: "text", text: typeof toolInput === "string" ? toolInput : JSON.stringify(toolInput) }]
        : [{ type: "tool_use", id: "tu_1", name: "submit_extraction", input: toolInput }];
      return new Response(
        JSON.stringify({
          model: "claude-sonnet-4-6",
          stop_reason: opts.stop ?? (opts.asText ? "end_turn" : "tool_use"),
          content,
          usage: { input_tokens: 1200, output_tokens: 400, cache_read_input_tokens: 0, cache_creation_input_tokens: 900 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    throw new Error("unexpected fetch to " + url);
  });
}

function extract(body: unknown, opts: { internal?: string | false } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const internal = opts.internal === undefined ? INTERNAL_KEY : opts.internal;
  if (internal !== false) headers["x-assess-internal"] = internal;
  return SELF.fetch("http://worker/api/assess/extract", { method: "POST", headers, body: JSON.stringify(body) });
}

beforeAll(async () => {
  (env as any).ASSESS_PIPELINE_ENABLED = "true";
  (env as any).ASSESS_INTERNAL_KEY = INTERNAL_KEY;
  (env as any).ANTHROPIC_API_KEY = "test-key";
  (env as any).EXTRACTION_PROVIDER = "anthropic";
  await seedBundle("national-redflags", nationalBundleRaw as string);
  await seedBundle("ct-chest-abdomen-pelvis-adult", ctCapBundleRaw as string);
});

afterEach(() => vi.unstubAllGlobals());

describe("buildQuestionnaireResponse — flat answers -> FHIR (v3.0.1)", () => {
  const idx = buildItemIndex([nationalQ as any, ctCapQ as any]);

  it("groups by linkId prefix, sets the value key from the item type, and attaches the evidence extension to every answer", () => {
    const qr = buildQuestionnaireResponse(GOOD_ANSWERS, idx, TYPE_TO_VALUE_KEY);
    expect(qr.resourceType).toBe("QuestionnaireResponse");
    const groups = Object.fromEntries(qr.item.map((g: any) => [g.linkId, g.item]));
    expect(Object.keys(groups).sort()).toEqual(["lab", "weightloss", "workup"]);
    const percent = groups.weightloss.find((i: any) => i.linkId === "weightloss.percent").answer[0];
    expect(percent.valueDecimal).toBe(5);
    const present = groups.weightloss.find((i: any) => i.linkId === "weightloss.present").answer[0];
    expect(present.valueBoolean).toBe(true);
    // evidence extension on EVERY answer
    for (const g of qr.item) for (const i of g.item) {
      const ev = i.answer[0].extension.find((e: any) => e.url.endsWith("answer-evidence"));
      expect(ev).toBeTruthy();
      expect(ev.extension.find((s: any) => s.url === "status").valueCode).toMatch(/documented|inferred/);
      expect(typeof ev.extension.find((s: any) => s.url === "quote").valueString).toBe("string");
    }
  });

  it("wraps a sex answer as valueCoding with the administrative-gender system", () => {
    const qr = buildQuestionnaireResponse(
      [{ linkId: "patient.sex", value: "male", status: "documented", quote: "65yo male" }],
      idx, TYPE_TO_VALUE_KEY,
    );
    const ans = qr.item[0].item[0].answer[0];
    expect(ans.valueCoding).toEqual({ system: "http://hl7.org/fhir/administrative-gender", code: "male" });
  });

  it("an unknown linkId falls through as valueString (the gate then rejects it)", () => {
    const qr = buildQuestionnaireResponse(
      [{ linkId: "made.up", value: "x", status: "documented", quote: "x" }],
      idx, TYPE_TO_VALUE_KEY,
    );
    expect(qr.item[0].item[0].answer[0].valueString).toBe("x");
  });
});

describe("POST /api/assess/extract — gating (SD-11)", () => {
  it("403 without x-assess-internal", async () => {
    const res = await extract({ note: GT_NOTE }, { internal: false });
    expect(res.status).toBe(403);
  });
  it("404 when ASSESS_PIPELINE_ENABLED is off", async () => {
    const prev = env.ASSESS_PIPELINE_ENABLED;
    try {
      (env as any).ASSESS_PIPELINE_ENABLED = "false";
      const res = await extract({ note: GT_NOTE });
      expect(res.status).toBe(404);
    } finally {
      (env as any).ASSESS_PIPELINE_ENABLED = prev;
    }
  });
  it("400 without a note", async () => {
    const res = await extract({ context: {} });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/assess/extract — PII gate", () => {
  it("redacts before the model call; patternsHit reported", async () => {
    stubAnthropic(GOOD_TOOL_INPUT);
    const res = await extract({ note: "Mr Kerry Smith, 74M. " + GT_NOTE, requestedExamSite: "ct_cap" });
    const body: any = await res.json();
    expect(body.redaction.patternsHit).toContain("NAME");
  });

  it("422 insufficient-after-redaction when almost everything was PII", async () => {
    stubAnthropic(GOOD_TOOL_INPUT);
    const res = await extract({ note: "Patient Name: Kerry Smith. NHI: ZZZ0094." });
    expect(res.status).toBe(422);
    const body: any = await res.json();
    expect(body.error).toBe("insufficient-after-redaction");
  });
});

describe("POST /api/assess/extract — provider abstraction (NFR-009)", () => {
  it("Azure OpenAI provider -> 503 provider-not-configured", async () => {
    const prev = env.EXTRACTION_PROVIDER;
    try {
      (env as any).EXTRACTION_PROVIDER = "azure-openai";
      const res = await extract({ note: GT_NOTE, requestedExamSite: "ct_cap" });
      expect(res.status).toBe(503);
      const body: any = await res.json();
      expect(body.error).toBe("provider-not-configured");
    } finally {
      (env as any).EXTRACTION_PROVIDER = prev;
    }
  });

  it("the request forces the output tool (tools + tool_choice)", async () => {
    stubAnthropic(GOOD_TOOL_INPUT);
    await extract({ note: GT_NOTE, requestedExamSite: "ct_cap" });
    expect(lastRequestBody.tools?.[0]?.name).toBe("submit_extraction");
    expect(lastRequestBody.tool_choice).toEqual({ type: "tool", name: "submit_extraction" });
    expect(lastRequestBody.tools[0].input_schema.required).toEqual(["answers", "examSites"]);
  });
});

describe("POST /api/assess/extract — extraction + gate (v3.0.1)", () => {
  it("a gate-passing tool call returns the built QuestionnaireResponse + selection + stamps", async () => {
    stubAnthropic(GOOD_TOOL_INPUT);
    const res = await extract({ note: GT_NOTE, requestedExamSite: "ct_cap", context: { age: 65, sex: "male" } });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.validation.passed).toBe(true);
    expect(body.promptVersion).toBe("3.0.2");
    expect(body.equivalenceListVersion).toBe("concept-equivalence-v1.2");
    expect(body.modelId).toBe("claude-sonnet-4-6");
    expect(body.provider).toBe("anthropic");
    expect(body.examSiteSelection.requestedExamSite).toBe("ct_cap");
    // the service built the evidence extension for every model answer
    const wl = body.questionnaireResponse.item.find((g: any) => g.linkId === "weightloss");
    const pct = wl.item.find((i: any) => i.linkId === "weightloss.percent");
    expect(pct.answer[0].valueDecimal).toBe(5);
    expect(pct.answer[0].extension.some((e: any) => e.url.endsWith("answer-evidence"))).toBe(true);
    // age/sex injected from context as answers with NO evidence extension
    const patientGroup = body.questionnaireResponse.item.find((g: any) => g.linkId === "patient");
    const age = patientGroup.item.find((i: any) => i.linkId === "patient.age");
    expect(age.answer[0].valueInteger).toBe(65);
    expect(age.answer[0].extension).toBeUndefined();
  });

  it("a bad quote fails the gate -> 422 with the failure and no QR", async () => {
    stubAnthropic({
      answers: [{ linkId: "weightloss.percent", value: 5, status: "documented", quote: "a quote that is definitely not in the note" }],
      examSites: [{ id: "ct_cap", requested: true, quote: null }],
    });
    const res = await extract({ note: GT_NOTE, requestedExamSite: "ct_cap" });
    expect(res.status).toBe(422);
    const body: any = await res.json();
    expect(body.validation.passed).toBe(false);
    expect(body.validation.failures.some((f: string) => f.includes("not a verbatim span"))).toBe(true);
    expect(body.questionnaireResponse).toBeUndefined();
  });

  it("a truncated tool call is a gate failure", async () => {
    stubAnthropic(GOOD_TOOL_INPUT, { stop: "max_tokens" });
    const res = await extract({ note: GT_NOTE, requestedExamSite: "ct_cap" });
    expect(res.status).toBe(422);
    const body: any = await res.json();
    expect(body.validation.failures.some((f: string) => f.includes("truncated"))).toBe(true);
  });

  it("no tool block, no parseable text -> gate failure naming the tool", async () => {
    stubAnthropic("the model wrote prose instead of calling the tool", { asText: true });
    const res = await extract({ note: GT_NOTE, requestedExamSite: "ct_cap" });
    expect(res.status).toBe(422);
    const body: any = await res.json();
    expect(body.validation.failures.some((f: string) => f.includes("submit_extraction"))).toBe(true);
  });

  it("national bundle absent -> 503 (fail closed, AD-19)", async () => {
    await env.DB.prepare("UPDATE bundles SET state='transcribed' WHERE exam_site='national-redflags'").run();
    await env.KV.delete("bundle:national-redflags:latest-published");
    try {
      stubAnthropic(GOOD_TOOL_INPUT);
      const res = await extract({ note: GT_NOTE, requestedExamSite: "ct_cap" });
      expect(res.status).toBe(503);
      expect((await res.json() as any).error).toBe("national-redflags-unavailable");
    } finally {
      await env.DB.prepare("UPDATE bundles SET state='published' WHERE exam_site='national-redflags'").run();
      await env.KV.put("bundle:national-redflags:latest-published", JSON.parse(nationalBundleRaw as string).version);
    }
  });
});

describe("POST /api/admin/extraction-prompt/register", () => {
  it("stores the current prompt version inactive, idempotently", async () => {
    const res = await SELF.fetch("http://worker/api/admin/extraction-prompt/register", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-email": "test@example.com" },
    });
    expect([200, 201]).toContain(res.status);
    const row: any = await env.DB.prepare("SELECT version, is_active, instruction_text FROM system_prompts WHERE version = 'v3.0.2'").first();
    expect(row.is_active).toBe(0);
    expect(row.instruction_text).toContain("You extract. You do not assess.");
    const again = await SELF.fetch("http://worker/api/admin/extraction-prompt/register", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-email": "test@example.com" },
    });
    const body: any = await again.json();
    expect(body.alreadyRegistered).toBe(true);
  });
});
