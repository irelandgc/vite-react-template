// ARCH-MIG-01 — two-phase assessment (AD-25).
//
// `POST /api/assess/propose` runs a NATIONAL-ONLY extraction, writes a 'proposed'
// row, and returns the exam proposal (candidates with quotes) + the attestation
// questions for the leading candidate. `POST /api/assess/complete` runs the FULL
// extraction once (scoped to the confirmed exam), merges + evaluates, and UPDATEs
// the SAME row to 'completed'. Two model calls in the no-exam flow; zero re-runs
// in a retry. Model call stubbed (pass 1 then pass 2); real D1 + KV + engine.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { env, SELF } from "cloudflare:test";
import { purgeExpiredProposals } from "../worker";
// @ts-expect-error -- ?raw import
import nationalBundleRaw from "../../../../tooling/criteria-bundle/registry/national-redflags/1.0.0.json?raw";
// @ts-expect-error -- ?raw import
import ctCapBundleRaw from "../../../../tooling/criteria-bundle/registry/ct-chest-abdomen-pelvis-adult/1.0.0.json?raw";

const INTERNAL_KEY = "test-internal-key";
// The note names the exam being requested (KI-53: a requested candidate must
// carry the verbatim requesting words on the no-exam path).
const NOTE = "65yo male w/ unexplained wt loss 5% over past 6/12 with no localising symptoms or signs. Hb mildly low. Ex-smoker. Request CT chest abdomen pelvis.";

const SITE_ANSWERS = [
  { linkId: "weightloss.present", value: true, status: "documented", quote: "unexplained wt loss 5%" },
  { linkId: "weightloss.percent", value: 5, status: "documented", quote: "wt loss 5%" },
  { linkId: "weightloss.periodMonths", value: 6, status: "documented", quote: "over past 6/12" },
  { linkId: "workup.localisingFeatures", value: false, status: "documented", quote: "no localising symptoms or signs" },
  { linkId: "lab.hb.low", value: true, status: "documented", quote: "Hb mildly low" },
];
// Phase 1: national-only — no site answers, two exam candidates (ct_cap + xr_knee).
const PASS1 = {
  answers: [],
  examSites: [
    { id: "ct_cap", requested: true, quote: "CT chest abdomen pelvis" },
    { id: "xr_knee", requested: false, quote: "wt loss" },
  ],
};
// KI-53 branch 2: the model marked ct_cap requested but returned no quote.
const PASS1_NO_QUOTE = {
  answers: [],
  examSites: [{ id: "ct_cap", requested: true, quote: null }],
};
// Phase 2: full site extraction, scoped to the confirmed exam.
const PASS2 = { answers: SITE_ANSWERS, examSites: [{ id: "ct_cap", requested: true, quote: null }] };

async function seedBundle(key: string, raw: string) {
  const b = JSON.parse(raw);
  await env.KV.put(`bundle:${key}:${b.version}`, JSON.stringify(b));
  await env.KV.put(`bundle:${key}:latest-published`, b.version);
  await env.DB.prepare(
    "INSERT OR IGNORE INTO bundles (exam_site, version, state, logic_hash, vocabulary_version, source_type, created_at) VALUES (?, ?, 'published', 'x', '1.0.0', 'pdf', '2026-01-01')",
  ).bind(key, b.version).run();
  await env.DB.prepare("UPDATE bundles SET state='published' WHERE exam_site=?").bind(key).run();
}

// Serves `first` on the first Anthropic call, `rest` (default `first`) after.
function stubAnthropic(first: any, rest?: any) {
  let n = 0;
  vi.stubGlobal("fetch", async (input: any) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("api.anthropic.com")) {
      const toolInput = n++ === 0 ? first : (rest ?? first);
      return new Response(
        JSON.stringify({
          model: "claude-sonnet-4-6",
          stop_reason: "tool_use",
          content: [{ type: "tool_use", id: "tu_1", name: "submit_extraction", input: toolInput }],
          usage: { input_tokens: 1000, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 800 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    throw new Error("unexpected fetch to " + url);
  });
}

function post(path: string, body: unknown, opts: { internal?: string | false } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const internal = opts.internal === undefined ? INTERNAL_KEY : opts.internal;
  if (internal !== false) headers["x-assess-internal"] = internal;
  return SELF.fetch("http://worker" + path, { method: "POST", headers, body: JSON.stringify(body) });
}
const propose = (body: unknown, opts?: any) => post("/api/assess/propose", body, opts);
const complete = (body: unknown, opts?: any) => post("/api/assess/complete", body, opts);

const rowById = (id: string) => env.DB.prepare("SELECT * FROM assessments WHERE id = ?").bind(id).first<any>();

beforeAll(async () => {
  (env as any).ASSESS_PIPELINE_ENABLED = "true";
  (env as any).ASSESS_INTERNAL_KEY = INTERNAL_KEY;
  (env as any).ANTHROPIC_API_KEY = "test-key";
  (env as any).EXTRACTION_PROVIDER = "anthropic";
  await seedBundle("national-redflags", nationalBundleRaw as string);
  await seedBundle("ct-chest-abdomen-pelvis-adult", ctCapBundleRaw as string);
  // A second published bundle for an exam phase 1 does not surface, so the
  // referrer-exam-override discrepancy can be exercised without tripping the
  // criteria-not-published 409 (content reused — the test only asserts the
  // override discrepancy and a 200).
  await seedBundle("us-abdomen-adult", ctCapBundleRaw as string);
});

afterEach(() => vi.unstubAllGlobals());

describe("gating parity with the other assess routes", () => {
  it("403 without x-assess-internal, 404 when the flag is off", async () => {
    expect((await propose({ note: NOTE }, { internal: false })).status).toBe(403);
    expect((await complete({ assessmentId: "x", confirmedExamSite: "ct_cap" }, { internal: false })).status).toBe(403);
    const prev = env.ASSESS_PIPELINE_ENABLED;
    try {
      (env as any).ASSESS_PIPELINE_ENABLED = "false";
      expect((await propose({ note: NOTE })).status).toBe(404);
      expect((await complete({ assessmentId: "x", confirmedExamSite: "ct_cap" })).status).toBe(404);
    } finally {
      (env as any).ASSESS_PIPELINE_ENABLED = prev;
    }
  });
  it("400 without a note", async () => {
    expect((await propose({})).status).toBe(400);
  });
  it("400 without assessmentId / confirmedExamSite", async () => {
    expect((await complete({ confirmedExamSite: "ct_cap" })).status).toBe(400);
    expect((await complete({ assessmentId: "x" })).status).toBe(400);
  });
});

describe("POST /api/assess/propose", () => {
  it("no exam supplied -> proposed row, candidates with quotes, attestation questions, no Advisory", async () => {
    stubAnthropic(PASS1);
    const res = await propose({ note: NOTE, context: { age: 65, sex: "male" }, performedBy: "Dr P (GP)" });
    expect(res.status).toBe(200);
    const body: any = await res.json();

    expect(body.assessmentId).toMatch(/[0-9a-f-]{36}/);
    expect(body.advisory).toBeUndefined();
    expect(body.validation).toEqual({ passed: true, failures: [] });
    expect(body.redaction.patternsHit).toEqual(expect.any(Array));

    const cand = body.examSiteSelection.candidates;
    expect(cand.find((x: any) => x.id === "xr_knee").quote).toBe("wt loss");
    expect(cand.find((x: any) => x.id === "ct_cap").leading).toBe(true);

    expect(Array.isArray(body.attestationQuestions)).toBe(true);
    if (body.attestationQuestions.length) {
      expect(body.attestationQuestions[0].wording).toMatchObject({ referrer: expect.any(String), triager: expect.any(String) });
    }

    const row = await rowById(body.assessmentId);
    expect(row.status).toBe("proposed");
    expect(row.advisory).toBe("null");
    expect(row.performed_by).toBe("Dr P (GP)");
    const proposal = JSON.parse(row.proposal);
    expect(proposal.modelExamSites.length).toBe(2);
    expect(proposal.questionnaireResponse.resourceType).toBe("QuestionnaireResponse"); // phase-1 QR kept
  });

  it("requestedExamSite supplied -> it is the examSiteSelection.requestedExamSite", async () => {
    stubAnthropic(PASS1);
    const body: any = await (await propose({ note: NOTE, requestedExamSite: "ct_cap" })).json();
    expect(body.examSiteSelection.requestedExamSite).toBe("ct_cap");
  });

  it("gate rejection -> 422 + a proposed row with validation_failures", async () => {
    stubAnthropic({
      answers: [{ linkId: "symptom.backPain", value: true, status: "documented", quote: "not a span of the note" }],
      examSites: [{ id: "ct_cap", requested: true, quote: null }],
    });
    const res = await propose({ note: NOTE });
    expect(res.status).toBe(422);
    const body: any = await res.json();
    expect(body.validation.passed).toBe(false);
    const row = await rowById(body.assessmentId);
    expect(row.status).toBe("proposed");
    expect(JSON.parse(row.validation_failures).stage).toBe("extract-gate");
  });

  // KI-53 — a requested candidate on the no-exam path must carry the verbatim
  // requesting words; branch 1 (valid quote -> most likely) is covered above.
  it("KI-53 branch 2 — requested:true with quote null is shown as a candidate, not most likely, and recorded", async () => {
    stubAnthropic(PASS1_NO_QUOTE);
    const res = await propose({ note: NOTE, performedBy: "Dr P (GP)" });
    expect(res.status).toBe(200);
    const body: any = await res.json();

    const ctCap = body.examSiteSelection.candidates.find((x: any) => x.id === "ct_cap");
    expect(ctCap.requested).toBe(false);
    expect(ctCap.leading).toBe(false);
    expect(body.examSiteSelection.requestedExamSite).toBeNull();
    // attestation questions are still served for the exam the card defaults to
    expect(Array.isArray(body.attestationQuestions)).toBe(true);

    const row = await rowById(body.assessmentId);
    expect(row.status).toBe("proposed");
    const vf = JSON.parse(row.validation_failures);
    expect(vf.stage).toBe("extract");
    expect(vf.softFailures.join(" ")).toMatch(/exam-candidate-no-quote.*ct_cap/);
    // the phase-1 record keeps the (downgraded) candidate
    expect(JSON.parse(row.proposal).modelExamSites[0].requested).toBe(false);
  });
});

describe("POST /api/assess/complete", () => {
  async function proposeOk() {
    stubAnthropic(PASS1);
    const body: any = await (await propose({ note: NOTE, context: { age: 65, sex: "male" }, performedBy: "Dr P (GP)" })).json();
    vi.unstubAllGlobals();
    return body.assessmentId as string;
  }

  it("runs the site-scoped extraction, evaluates, and UPDATEs the same row to completed", async () => {
    const assessmentId = await proposeOk();
    stubAnthropic(PASS2);
    const res = await complete({
      assessmentId, confirmedExamSite: "ct_cap", note: NOTE,
      attestations: { "workup.strongSuspicionMalignancy": { value: true, attestedBy: "Dr P (GP)" } },
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();

    expect(body.assessmentId).toBe(assessmentId);
    expect(body.advisory.requestedExam.advisory.determination).toBeTruthy();
    expect(body.validation).toEqual({ passed: true, failures: [] });
    expect(body.versions).toMatchObject({ model: "claude-sonnet-4-6", provider: "anthropic", bundles: { "national-redflags": "1.0.0", ct_cap: "1.0.0" } });
    expect(body.bundleArtefacts.ct_cap.questionnaire.resourceType).toBe("Questionnaire");
    expect(body.attestationsApplied).toEqual([
      { linkId: "workup.strongSuspicionMalignancy", value: true, attestedBy: "Dr P (GP)", mode: "referrer" },
    ]);

    const row = await rowById(assessmentId);
    expect(row.status).toBe("completed");
    expect(row.proposal).not.toBeNull(); // phase-1 record kept
    expect(row.performed_by).toBe("Dr P (GP)"); // kept from propose
    expect(row.validation_failures).toBeNull();
    expect(JSON.parse(row.bundle_versions)).toMatchObject({ ct_cap: "1.0.0" });
    expect(JSON.parse(row.attestations)[0].linkId).toBe("workup.strongSuspicionMalignancy");
    const qr = JSON.parse(row.questionnaire_response); // the MERGED phase-2 QR
    const patient = qr.item.find((g: any) => g.linkId === "patient");
    expect(patient.item.find((i: any) => i.linkId === "patient.age").answer[0].valueInteger).toBe(65);

    const n = await env.DB.prepare("SELECT COUNT(*) n FROM assessments WHERE id = ?").bind(assessmentId).first<any>();
    expect(n.n).toBe(1);
  });

  it("a second complete on the same id -> 409", async () => {
    const assessmentId = await proposeOk();
    stubAnthropic(PASS2);
    expect((await complete({ assessmentId, confirmedExamSite: "ct_cap", note: NOTE })).status).toBe(200);
    expect((await complete({ assessmentId, confirmedExamSite: "ct_cap", note: NOTE })).status).toBe(409);
  });

  it("unknown assessmentId -> 404", async () => {
    stubAnthropic(PASS2);
    expect((await complete({ assessmentId: "does-not-exist", confirmedExamSite: "ct_cap", note: NOTE })).status).toBe(404);
  });

  it("missing note (and none stored) -> 400", async () => {
    const assessmentId = await proposeOk();
    stubAnthropic(PASS2);
    expect((await complete({ assessmentId, confirmedExamSite: "ct_cap" })).status).toBe(400);
  });

  it("an attestation not on the confirmed exam's Questionnaire -> 422, row stays proposed", async () => {
    const assessmentId = await proposeOk();
    stubAnthropic(PASS2);
    const res = await complete({ assessmentId, confirmedExamSite: "ct_cap", note: NOTE, attestations: { "not.a.real.indicator": { value: true, attestedBy: "Dr P" } } });
    expect(res.status).toBe(422);
    const body: any = await res.json();
    expect(body.validation.failures[0]).toMatch(/not\.a\.real\.indicator/);
    expect((await rowById(assessmentId)).status).toBe("proposed");
  });

  it("a confirmed exam phase 1 did not surface (but IS published) -> referrer-exam-override discrepancy", async () => {
    const assessmentId = await proposeOk();
    // us_abdomen is published in beforeAll but is not one of PASS1's candidates
    // (ct_cap + xr_knee) — the override discrepancy is recorded.
    stubAnthropic({ answers: [], examSites: [{ id: "us_abdomen", requested: true, quote: null }] });
    const res = await complete({ assessmentId, confirmedExamSite: "us_abdomen", note: NOTE });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    const d = body.discrepancies.find((x: any) => x.source === "referrer-exam-override");
    expect(d).toBeTruthy();
    expect(d.kept.value).toBe("us_abdomen");
    expect(d.superseded.value).toEqual(expect.arrayContaining(["ct_cap", "xr_knee"]));
    expect(JSON.parse((await rowById(assessmentId)).discrepancies).some((x: any) => x.source === "referrer-exam-override")).toBe(true);
  });

  it("confirmedExamSite with no published bundle -> 409 criteria-not-published, no row update", async () => {
    const assessmentId = await proposeOk();
    stubAnthropic(PASS2);
    // xr_knee resolves to a bundle key that is not seeded/published in this suite.
    const res = await complete({ assessmentId, confirmedExamSite: "xr_knee", note: NOTE });
    expect(res.status).toBe(409);
    const body: any = await res.json();
    expect(body.error).toBe("criteria-not-published");
    expect(body.examSite).toBe("xr_knee");
    // the assessment is untouched — still completable against a published exam
    expect((await rowById(assessmentId)).status).toBe("proposed");
  });

  it("a phase-2 gate rejection -> 422, row becomes completed with validation_failures", async () => {
    const assessmentId = await proposeOk();
    stubAnthropic({
      answers: [{ linkId: "weightloss.percent", value: 5, status: "documented", quote: "not a span of the note" }],
      examSites: [{ id: "ct_cap", requested: true, quote: null }],
    });
    const res = await complete({ assessmentId, confirmedExamSite: "ct_cap", note: NOTE });
    expect(res.status).toBe(422);
    const row = await rowById(assessmentId);
    expect(row.status).toBe("completed");
    expect(JSON.parse(row.validation_failures).stage).toBe("extract-gate");
  });
});

describe("purgeExpiredProposals", () => {
  it("deletes stale proposed rows + their notes; keeps completed and recent proposed", async () => {
    const old = new Date(Date.now() - 200 * 86400000).toISOString();
    const recent = new Date(Date.now() - 5 * 86400000).toISOString();
    const ins = (id: string, created: string, status: string) =>
      env.DB.prepare("INSERT INTO assessments (id, created_at, bundle_versions, engine_version, documentation_standard, questionnaire_response, advisory, status) VALUES (?,?,?,?,?,?,?,?)")
        .bind(id, created, "{}", "1.0.0", "strict", "{}", "null", status).run();
    await ins("p-old", old, "proposed");
    await ins("p-new", recent, "proposed");
    await ins("c-old", old, "completed");
    await env.DB.prepare("INSERT INTO assessment_notes (assessment_id, note_redacted, created_at) VALUES (?,?,?)").bind("p-old", "redacted", old).run();

    const deleted = await purgeExpiredProposals(env.DB, 180);
    expect(deleted).toBeGreaterThanOrEqual(1);
    expect((await rowById("p-old"))).toBeNull();
    expect((await rowById("p-new")).status).toBe("proposed");
    expect((await rowById("c-old")).status).toBe("completed");
    const note = await env.DB.prepare("SELECT COUNT(*) n FROM assessment_notes WHERE assessment_id='p-old'").first<any>();
    expect(note.n).toBe(0);
  });
});
