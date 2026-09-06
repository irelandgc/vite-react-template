// ARCH-MIG-01 slice 3 — rules-engine route tests (AD-13 harness, workers-vitest).
//
// Exercises POST /api/assess/evaluate against real D1 + KV: the internal-only
// gating (ASSESS_PIPELINE_ENABLED + the x-assess-internal shared secret), the
// national red-flag precedence (AD-03), per-exam bundle evaluation reproducing
// tests/scenarios.mjs over HTTP, multi-bundle aggregation (gap §4, AD-20),
// version stamping (invariant 8), determinism (NFR-014), and the assessment
// audit record (SD-12) incl. the off-by-default redacted-note store and its
// purge job.
import { beforeAll, describe, expect, it } from "vitest";
import { env, SELF } from "cloudflare:test";
import { purgeExpiredNotes } from "../worker";
// @ts-expect-error -- ?raw import, no type declaration
import ctCapBundleRaw from "../../../../tooling/criteria-bundle/registry/ct-chest-abdomen-pelvis-adult/1.0.0.json?raw";
// @ts-expect-error -- ?raw import, no type declaration
import nationalBundleRaw from "../../../../tooling/criteria-bundle/registry/national-redflags/1.0.0.json?raw";
import altElm from "./fixtures/CRR_TestAltSite.elm.json";
// @ts-expect-error -- plain .mjs, no type declarations
import { scenarios, toQuestionnaireResponse } from "../../../../tooling/criteria-bundle/tests/scenarios.mjs";
// @ts-expect-error -- plain .mjs, no type declarations
import { scenarios as redflagScenarios, toQuestionnaireResponse as toRedflagQr } from "../../../../tooling/criteria-bundle/tests/scenarios-redflags.mjs";

const INTERNAL_KEY = "test-internal-key";
const ctCapBundle = () => JSON.parse(ctCapBundleRaw);
const nationalBundle = () => JSON.parse(nationalBundleRaw);

// This plugin config does not isolate D1/KV per test (state accumulates within a
// file — the slice-2 suite is written the same way), so every seed here is
// idempotent and every assessments assertion is a before/after delta.
async function seedBundleRow(examSiteKey: string, version: string, state: string) {
  await env.DB.prepare(
    "INSERT OR IGNORE INTO bundles (exam_site, version, state, logic_hash, vocabulary_version, source_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(examSiteKey, version, state, "sha256:test", "1.0.0", "pdf", "2026-01-01T00:00:00Z").run();
  await env.DB.prepare("UPDATE bundles SET state = ? WHERE exam_site = ? AND version = ?").bind(state, examSiteKey, version).run();
}

// The real published CT CAP bundle (its ELM is what the engine evaluates), keyed
// into KV and given a D1 row in the requested state (AD-12: state lives in D1).
async function publishCtCap(state = "published") {
  const b = ctCapBundle();
  await env.KV.put(`bundle:${b.examSite}:${b.version}`, JSON.stringify(b));
  if (state === "published") await env.KV.put(`bundle:${b.examSite}:latest-published`, b.version);
  await seedBundleRow(b.examSite, b.version, state);
}

// The real national red-flag / ACC bundle (AD-19). The engine fails closed if it
// has no published version — most tests need it published; the fail-closed test
// flips its state.
async function publishNationalRedFlags(state = "published", version?: string) {
  const b = nationalBundle();
  if (version) b.version = version;
  await env.KV.put(`bundle:national-redflags:${b.version}`, JSON.stringify(b));
  if (state === "published") await env.KV.put(`bundle:national-redflags:latest-published`, b.version);
  await seedBundleRow("national-redflags", b.version, state);
}

// The throwaway alt-site fixture (different rule from CT CAP) under us_abdomen.
async function publishAltSite(state = "published", version = "1.0.0") {
  const key = "us-abdomen-adult";
  const bundle = {
    examSite: key,
    version,
    state,
    vocabularyVersion: "1.0.0",
    source: { type: "pdf", title: "fixture", identifier: "fixture", date: "2026-01-01", pages: "1" },
    logicHash: "sha256:test",
    publishedAt: "2026-01-01T00:00:00Z",
    library: { site: altElm, population: null, redFlags: { name: "CRR_RedFlags", version: "1.0.0", byReference: true } },
    planDefinition: { resourceType: "PlanDefinition", action: [] },
    questionnaire: { resourceType: "Questionnaire", item: [] },
    overlays: [],
    testResults: {},
    dependencies: [],
  };
  await env.KV.put(`bundle:${key}:${version}`, JSON.stringify(bundle));
  if (state === "published") await env.KV.put(`bundle:${key}:latest-published`, version);
  await seedBundleRow(key, version, state);
}

// Calls the route the way the main worker's service binding does: with the
// x-assess-internal shared secret. Pass `{ internal: false }` to omit it, or an
// explicit string to send a wrong one.
function evaluate(body: unknown, opts: { internal?: string | false } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const internal = opts.internal === undefined ? INTERNAL_KEY : opts.internal;
  if (internal !== false) headers["x-assess-internal"] = internal;
  return SELF.fetch("http://worker/api/assess/evaluate", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

// A minimal completed QR wrapping linkId -> value, grouped like the real extractor.
function makeQr(answers: Record<string, any>, id = "p1") {
  const groups: Record<string, any[]> = {};
  for (const [linkId, v] of Object.entries(answers)) {
    const g = linkId.split(".")[0];
    let answer: any;
    if (typeof v === "boolean") answer = { valueBoolean: v };
    else if (linkId === "patient.sex") answer = { valueCoding: { system: "http://hl7.org/fhir/administrative-gender", code: v } };
    else if (linkId === "patient.age") answer = { valueInteger: v };
    else if (typeof v === "number") answer = { valueDecimal: v };
    else answer = { valueString: v };
    (groups[g] ||= []).push({ linkId, answer: [answer] });
  }
  return {
    resourceType: "QuestionnaireResponse",
    status: "completed",
    subject: { reference: `Patient/${id}` },
    item: Object.entries(groups).map(([g, items]) => ({ linkId: g, item: items })),
  };
}

const sorted = (a: any) => JSON.stringify([...(a || [])].sort());

beforeAll(async () => {
  (env as any).ASSESS_PIPELINE_ENABLED = "true";
  (env as any).ASSESS_INTERNAL_KEY = INTERNAL_KEY;
  await publishNationalRedFlags("published");
  await publishCtCap("published");
  await publishAltSite("published");
});

describe("POST /api/assess/evaluate — national red-flag layer is a published bundle (AD-19, SR-13)", () => {
  it("bundleVersions['national-redflags'] is the KV bundle version", async () => {
    const s01 = scenarios.find((s: any) => s.id === "S01-b1-p2");
    const res = await evaluate({ questionnaireResponse: toQuestionnaireResponse(s01), requestedExamSite: "ct_cap" });
    const body: any = await res.json();
    expect(body.bundleVersions["national-redflags"]).toBe(nationalBundle().version);
  });

  it("503 fail-closed when national-redflags has no published version — no audit row", async () => {
    const before: any = await env.DB.prepare("SELECT COUNT(*) n FROM assessments").first();
    await env.DB.prepare("UPDATE bundles SET state = 'transcribed' WHERE exam_site = 'national-redflags'").run();
    await env.KV.delete("bundle:national-redflags:latest-published");
    try {
      const s01 = scenarios.find((s: any) => s.id === "S01-b1-p2");
      const res = await evaluate({ questionnaireResponse: toQuestionnaireResponse(s01), requestedExamSite: "ct_cap" });
      expect(res.status).toBe(503);
      const body: any = await res.json();
      expect(body.error).toBe("national-redflags-unavailable");
      const after: any = await env.DB.prepare("SELECT COUNT(*) n FROM assessments").first();
      expect(after.n).toBe(before.n);
    } finally {
      await env.DB.prepare("UPDATE bundles SET state = 'published' WHERE exam_site = 'national-redflags'").run();
      await env.KV.put("bundle:national-redflags:latest-published", nationalBundle().version);
    }
  });

  it("a different published national-redflags version is reflected in bundleVersions", async () => {
    await publishNationalRedFlags("published", "1.1.0");
    try {
      const s01 = scenarios.find((s: any) => s.id === "S01-b1-p2");
      const res = await evaluate({ questionnaireResponse: toQuestionnaireResponse(s01), requestedExamSite: "ct_cap" });
      const body: any = await res.json();
      expect(body.bundleVersions["national-redflags"]).toBe("1.1.0");
    } finally {
      await env.DB.prepare("DELETE FROM bundles WHERE exam_site = 'national-redflags' AND version = '1.1.0'").run();
      await env.KV.delete("bundle:national-redflags:1.1.0");
      await env.KV.put("bundle:national-redflags:latest-published", nationalBundle().version);
    }
  });
});

describe("POST /api/assess/evaluate — internal-only gating", () => {
  const qr = () => makeQr({ "patient.age": 60 });

  it("403s a call with no x-assess-internal header (not usable from the public origin)", async () => {
    const res = await evaluate({ questionnaireResponse: qr(), requestedExamSite: "ct_cap" }, { internal: false });
    expect(res.status).toBe(403);
  });

  it("403s a call with the wrong internal key", async () => {
    const res = await evaluate({ questionnaireResponse: qr(), requestedExamSite: "ct_cap" }, { internal: "nope" });
    expect(res.status).toBe(403);
  });

  it("404s when ASSESS_PIPELINE_ENABLED is not 'true', even with the header", async () => {
    const prev = env.ASSESS_PIPELINE_ENABLED;
    try {
      (env as any).ASSESS_PIPELINE_ENABLED = "false";
      const res = await evaluate({ questionnaireResponse: qr(), requestedExamSite: "ct_cap" });
      expect(res.status).toBe(404);
    } finally {
      (env as any).ASSESS_PIPELINE_ENABLED = prev;
    }
  });
});

describe("POST /api/assess/evaluate — validation", () => {
  it("400s on a missing questionnaireResponse", async () => {
    const res = await evaluate({ requestedExamSite: "ct_cap" });
    expect(res.status).toBe(400);
  });
  it("400s on a missing requestedExamSite", async () => {
    const res = await evaluate({ questionnaireResponse: makeQr({ "patient.age": 60 }) });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/assess/evaluate — CT CAP scenarios reproduced over HTTP", () => {
  const cases = scenarios.filter((s: any) => !s.record && !s.runWith);

  for (const s of cases) {
    it(`${s.id} -> ${s.expect.determination}`, async () => {
      const res = await evaluate({
        questionnaireResponse: toQuestionnaireResponse(s),
        requestedExamSite: "ct_cap",
        parameters: { documentationStandard: "strict" },
      });
      expect(res.status).toBe(200);
      const body: any = await res.json();
      const adv = body.requestedExam.advisory;
      expect(adv.determination).toBe(s.expect.determination);
      if (s.expect.priorityCode !== undefined) expect(adv.priorityCode ?? null).toBe(s.expect.priorityCode ?? null);
      if (s.expect.missing !== undefined) expect(sorted(adv.missingInformation)).toBe(sorted(s.expect.missing));
      // the aggregated top-level determination mirrors the requested exam here
      expect(body.determination).toBe(s.expect.determination);
      expect(body.stoppedAtNational).toBe(false);
    });

    if (s.expectInferredMode) {
      it(`${s.id} (inferred) -> ${s.expectInferredMode.determination}`, async () => {
        const res = await evaluate({
          questionnaireResponse: toQuestionnaireResponse(s),
          requestedExamSite: "ct_cap",
          parameters: { documentationStandard: "inferred" },
        });
        const body: any = await res.json();
        expect(body.requestedExam.advisory.determination).toBe(s.expectInferredMode.determination);
      });
    }
  }
});

describe("POST /api/assess/evaluate — national red-flag precedence (AD-03)", () => {
  it("a fired red flag stops the pipeline — no exam library runs", async () => {
    const rf = redflagScenarios.find((s: any) => s.id === "RF-S01-massive-haemoptysis");
    const res = await evaluate({ questionnaireResponse: toRedflagQr(rf), requestedExamSite: "ct_cap" });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.stoppedAtNational).toBe(true);
    expect(body.determination).toBe("ACUTE_ASSESSMENT_REQUIRED");
    expect(body.national.firedRedFlags.length).toBeGreaterThan(0);
    expect(body.requestedExam.evaluated).toBe(false);
    expect(body.requestedExam.advisory).toBeNull();
    expect(body.bundleVersions["ct_cap"]).toBeUndefined();
    expect(body.bundleVersions["national-redflags"]).toBe("1.0.0");
  });

  it("the ACC redirect stops the pipeline", async () => {
    const rf = redflagScenarios.find((s: any) => s.id === "RF-S31-acc-trauma");
    const res = await evaluate({ questionnaireResponse: toRedflagQr(rf), requestedExamSite: "ct_cap" });
    const body: any = await res.json();
    expect(body.determination).toBe("ACC_PATHWAY");
    expect(body.stoppedAtNational).toBe(true);
  });

  it("no national redirect -> the exam library is evaluated", async () => {
    const rf = redflagScenarios.find((s: any) => s.id === "RF-S32-fall-through");
    const res = await evaluate({ questionnaireResponse: toRedflagQr(rf), requestedExamSite: "ct_cap" });
    const body: any = await res.json();
    expect(body.national.determination).toBe("NO_NATIONAL_REDIRECT");
    expect(body.stoppedAtNational).toBe(false);
    expect(body.requestedExam.evaluated).toBe(true);
    expect(body.requestedExam.advisory.determination).toBeTruthy();
  });
});

describe("POST /api/assess/evaluate — multi-bundle aggregation (gap §4, AD-20)", () => {
  it("a candidate that reaches a priority determination while the requested exam does not -> alternatives[]", async () => {
    // workup.bloods=true meets the alt fixture but not CT CAP (needs weight loss etc.)
    const qr = makeQr({ "patient.age": 60, "patient.sex": "male", "workup.bloods": true });
    const res = await evaluate({ questionnaireResponse: qr, requestedExamSite: "ct_cap", candidateExamSites: ["us_abdomen"] });
    const body: any = await res.json();
    expect(body.requestedExam.advisory.determination).toBe("INSUFFICIENT_INFORMATION");
    expect(body.alternatives).toHaveLength(1);
    expect(body.alternatives[0].id).toBe("us_abdomen");
    expect(body.alternatives[0].advisory.determination).toBe("P2_URGENT");
    expect(body.bundleVersions).toMatchObject({ "national-redflags": "1.0.0", ct_cap: "1.0.0", us_abdomen: "1.0.0" });
  });

  it("no alternative when the requested exam is itself a priority determination", async () => {
    const s01 = scenarios.find((s: any) => s.id === "S01-b1-p2");
    const res = await evaluate({ questionnaireResponse: toQuestionnaireResponse(s01), requestedExamSite: "ct_cap", candidateExamSites: ["us_abdomen"] });
    const body: any = await res.json();
    expect(body.requestedExam.advisory.determination).toBe("P2_URGENT");
    expect(body.alternatives).toHaveLength(0);
    expect(body.candidatesEvaluated.find((c: any) => c.id === "us_abdomen").evaluated).toBe(true);
  });

  it("a candidate id equal to the requested id is ignored", async () => {
    const s01 = scenarios.find((s: any) => s.id === "S01-b1-p2");
    const res = await evaluate({ questionnaireResponse: toQuestionnaireResponse(s01), requestedExamSite: "ct_cap", candidateExamSites: ["ct_cap"] });
    const body: any = await res.json();
    expect(body.candidatesEvaluated).toHaveLength(0);
  });
});

describe("POST /api/assess/evaluate — unavailable bundles", () => {
  it("a requested id with no published bundle -> not-available, never a fallback", async () => {
    const res = await evaluate({ questionnaireResponse: makeQr({ "patient.age": 60 }), requestedExamSite: "ct_head" });
    const body: any = await res.json();
    expect(body.requestedExam.id).toBe("ct_head");
    expect(body.requestedExam.state).toBe("not-available");
    expect(body.requestedExam.evaluated).toBe(false);
    expect(body.notAvailable.map((x: any) => x.id)).toContain("ct_head");
  });

  it("an unknown id -> not-available", async () => {
    const res = await evaluate({ questionnaireResponse: makeQr({ "patient.age": 60 }), requestedExamSite: "not_a_real_exam" });
    const body: any = await res.json();
    expect(body.requestedExam.state).toBe("not-available");
  });

  it("a signed-off bundle is not evaluated unless ASSESS_ALLOW_SIGNED_OFF is on", async () => {
    await seedBundleRow("ct-head-adult", "1.0.0", "signed-off");
    await env.KV.put("bundle:ct-head-adult:1.0.0", JSON.stringify({ ...ctCapBundle(), examSite: "ct-head-adult" }));

    let res = await evaluate({ questionnaireResponse: makeQr({ "patient.age": 60 }), requestedExamSite: "ct_head" });
    let body: any = await res.json();
    expect(body.requestedExam.state).toBe("not-available");

    const prev = env.ASSESS_ALLOW_SIGNED_OFF;
    try {
      (env as any).ASSESS_ALLOW_SIGNED_OFF = "true";
      res = await evaluate({ questionnaireResponse: makeQr({ "patient.age": 60 }), requestedExamSite: "ct_head" });
      body = await res.json();
      expect(body.requestedExam.state).toBe("signed-off");
      expect(body.requestedExam.evaluated).toBe(true);
    } finally {
      (env as any).ASSESS_ALLOW_SIGNED_OFF = prev;
    }
  });
});

describe("POST /api/assess/evaluate — stamping, determinism, audit", () => {
  it("stamps engine, vocabulary and bundle versions", async () => {
    const s01 = scenarios.find((s: any) => s.id === "S01-b1-p2");
    const res = await evaluate({ questionnaireResponse: toQuestionnaireResponse(s01), requestedExamSite: "ct_cap" });
    const body: any = await res.json();
    expect(body.engineVersion).toBe("1.0.0");
    expect(body.vocabularyVersion).toBe("1.0.0");
    expect(body.documentationStandard).toBe("strict");
    expect(body.bundleVersions).toEqual({ "national-redflags": "1.0.0", ct_cap: "1.0.0" });
  });

  it("is deterministic — same input, byte-identical body apart from assessmentId", async () => {
    const s01 = scenarios.find((s: any) => s.id === "S01-b1-p2");
    const payload = { questionnaireResponse: toQuestionnaireResponse(s01), requestedExamSite: "ct_cap" };
    const a: any = await (await evaluate(payload)).json();
    const b: any = await (await evaluate(payload)).json();
    delete a.assessmentId;
    delete b.assessmentId;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("writes one assessments row per call; no note by default", async () => {
    const before: any = await env.DB.prepare("SELECT COUNT(*) n FROM assessments").first();
    const s01 = scenarios.find((s: any) => s.id === "S01-b1-p2");
    const res = await evaluate({ questionnaireResponse: toQuestionnaireResponse(s01), requestedExamSite: "ct_cap", noteRedacted: "62M weight loss" });
    const body: any = await res.json();
    const after: any = await env.DB.prepare("SELECT COUNT(*) n FROM assessments").first();
    expect(after.n).toBe(before.n + 1);
    const row: any = await env.DB.prepare("SELECT * FROM assessments WHERE id = ?").bind(body.assessmentId).first();
    expect(row.engine_version).toBe("1.0.0");
    expect(row.documentation_standard).toBe("strict");
    expect(JSON.parse(row.bundle_versions).ct_cap).toBe("1.0.0");
    expect(row.prompt_version).toBeNull();
    const noteRow: any = await env.DB.prepare("SELECT COUNT(*) n FROM assessment_notes WHERE assessment_id = ?").bind(body.assessmentId).first();
    expect(noteRow.n).toBe(0);
  });

  it("stores the redacted note only when AUDIT_STORE_REDACTED_NOTE is on", async () => {
    const prev = env.AUDIT_STORE_REDACTED_NOTE;
    try {
      (env as any).AUDIT_STORE_REDACTED_NOTE = "true";
      const s01 = scenarios.find((s: any) => s.id === "S01-b1-p2");
      const res = await evaluate({ questionnaireResponse: toQuestionnaireResponse(s01), requestedExamSite: "ct_cap", noteRedacted: "62M unintentional weight loss" });
      const body: any = await res.json();
      const noteRow: any = await env.DB.prepare("SELECT note_redacted FROM assessment_notes WHERE assessment_id = ?").bind(body.assessmentId).first();
      expect(noteRow.note_redacted).toBe("62M unintentional weight loss");
    } finally {
      (env as any).AUDIT_STORE_REDACTED_NOTE = prev;
    }
  });
});

describe("purgeExpiredNotes — Cron purge job", () => {
  it("deletes assessment_notes older than the retention window, nothing else", async () => {
    const old = new Date(Date.now() - 200 * 86400000).toISOString();
    const recent = new Date(Date.now() - 5 * 86400000).toISOString();
    await env.DB.prepare("INSERT INTO assessments (id, created_at, bundle_versions, engine_version, documentation_standard, questionnaire_response, advisory) VALUES (?,?,?,?,?,?,?)")
      .bind("a-old", old, "{}", "1.0.0", "strict", "{}", "{}").run();
    await env.DB.prepare("INSERT INTO assessments (id, created_at, bundle_versions, engine_version, documentation_standard, questionnaire_response, advisory) VALUES (?,?,?,?,?,?,?)")
      .bind("a-new", recent, "{}", "1.0.0", "strict", "{}", "{}").run();
    await env.DB.prepare("INSERT INTO assessment_notes (assessment_id, note_redacted, created_at) VALUES (?,?,?)").bind("a-old", "old note", old).run();
    await env.DB.prepare("INSERT INTO assessment_notes (assessment_id, note_redacted, created_at) VALUES (?,?,?)").bind("a-new", "new note", recent).run();

    const deleted = await purgeExpiredNotes(env.DB, 180);
    expect(deleted).toBeGreaterThanOrEqual(1);
    const gone: any = await env.DB.prepare("SELECT COUNT(*) n FROM assessment_notes WHERE assessment_id = 'a-old'").first();
    expect(gone.n).toBe(0);
    const kept: any = await env.DB.prepare("SELECT COUNT(*) n FROM assessment_notes WHERE assessment_id = 'a-new'").first();
    expect(kept.n).toBe(1);
    // assessments themselves are never touched by the purge
    const assessKept: any = await env.DB.prepare("SELECT COUNT(*) n FROM assessments WHERE id IN ('a-old','a-new')").first();
    expect(assessKept.n).toBe(2);
  });
});
