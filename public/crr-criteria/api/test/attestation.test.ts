// ARCH-MIG-01 slice 5 — attestation questions (AD-17 / AD-23).
import { beforeAll, describe, expect, it } from "vitest";
import { env, SELF } from "cloudflare:test";
import { attestationQuestionsFor, VOCABULARY_VERSION } from "../attestation";
import nationalQ from "../../../../tooling/criteria-bundle/fhir/Questionnaire-CRR-National.json";
import ctCapQ from "../../../../tooling/criteria-bundle/fhir/Questionnaire-CRR-CT-CAP-Adult.json";
// @ts-expect-error -- ?raw import
import nationalBundleRaw from "../../../../tooling/criteria-bundle/registry/national-redflags/1.0.0.json?raw";
// @ts-expect-error -- ?raw import
import ctCapBundleRaw from "../../../../tooling/criteria-bundle/registry/ct-chest-abdomen-pelvis-adult/1.0.0.json?raw";

const INTERNAL_KEY = "test-internal-key";

async function seedBundle(key: string, raw: string) {
  const b = JSON.parse(raw);
  await env.KV.put(`bundle:${key}:${b.version}`, JSON.stringify(b));
  await env.KV.put(`bundle:${key}:latest-published`, b.version);
  await env.DB.prepare(
    "INSERT OR IGNORE INTO bundles (exam_site, version, state, logic_hash, vocabulary_version, source_type, created_at) VALUES (?, ?, 'published', 'x', '1.0.0', 'pdf', '2026-01-01')",
  ).bind(key, b.version).run();
  await env.DB.prepare("UPDATE bundles SET state='published' WHERE exam_site=?").bind(key).run();
}

beforeAll(async () => {
  (env as any).ASSESS_PIPELINE_ENABLED = "true";
  (env as any).ASSESS_INTERNAL_KEY = INTERNAL_KEY;
  await seedBundle("national-redflags", nationalBundleRaw as string);
  await seedBundle("ct-chest-abdomen-pelvis-adult", ctCapBundleRaw as string);
});

describe("attestationQuestionsFor", () => {
  it("returns the CT CAP attestation indicators with both mode wordings and a source page", () => {
    const qs = attestationQuestionsFor([nationalQ as any, ctCapQ as any], ["ct-chest-abdomen-pelvis-adult"]);
    const ids = qs.map((q) => q.linkId);
    expect(ids).toContain("workup.strongSuspicionMalignancy");
    expect(ids).toContain("excl.urgentAdmissionRequired");
    const ssm = qs.find((q) => q.linkId === "workup.strongSuspicionMalignancy")!;
    expect(ssm.text).toMatch(/strong suspicion/i);
    expect(ssm.wording.referrer).toMatch(/\?$/);
    expect(ssm.wording.triager).toMatch(/\?$/);
    expect(ssm.wording.referrer).not.toBe(ssm.wording.triager);
    expect(ssm.sourcePages).toContain("p10");
  });

  it("returns nothing for a Questionnaire with no attestation items", () => {
    expect(attestationQuestionsFor([nationalQ as any])).toEqual([]);
  });
});

describe("GET /api/assess/attestation-questions", () => {
  it("403 without the internal key; 400 without requestedExamSite", async () => {
    expect((await SELF.fetch("http://worker/api/assess/attestation-questions?requestedExamSite=ct_cap")).status).toBe(403);
    const res = await SELF.fetch("http://worker/api/assess/attestation-questions", { headers: { "x-assess-internal": INTERNAL_KEY } });
    expect(res.status).toBe(400);
  });

  it("returns the questions + vocabularyVersion for ct_cap", async () => {
    const res = await SELF.fetch("http://worker/api/assess/attestation-questions?requestedExamSite=ct_cap", {
      headers: { "x-assess-internal": INTERNAL_KEY },
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.vocabularyVersion).toBe(VOCABULARY_VERSION);
    expect(body.questions.map((q: any) => q.linkId).sort()).toEqual(
      ["excl.urgentAdmissionRequired", "workup.strongSuspicionMalignancy"],
    );
    for (const q of body.questions) {
      expect(typeof q.wording.referrer).toBe("string");
      expect(typeof q.wording.triager).toBe("string");
    }
  });
});
