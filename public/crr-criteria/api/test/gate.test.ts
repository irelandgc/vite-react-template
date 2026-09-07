// ARCH-MIG-01 slice 4b — validation gate tests.
//
// Every 4a gate vector (tooling/criteria-bundle/extraction/gate-vectors/) runs
// through runGate: the pass vector passes, every reject vector rejects the WHOLE
// response. Plus the AD-17 attestation rejection and the truncation rule.
import { describe, expect, it } from "vitest";
import { runGate } from "../gate";
import nationalQ from "../../../../tooling/criteria-bundle/fhir/Questionnaire-CRR-National.json";
import ctCapQ from "../../../../tooling/criteria-bundle/fhir/Questionnaire-CRR-CT-CAP-Adult.json";
// @ts-expect-error -- ?raw import, no type declaration
import v01 from "../../../../tooling/criteria-bundle/extraction/gate-vectors/01-valid-pass.json?raw";
// @ts-expect-error
import v02 from "../../../../tooling/criteria-bundle/extraction/gate-vectors/02-unquotable-value.json?raw";
// @ts-expect-error
import v03 from "../../../../tooling/criteria-bundle/extraction/gate-vectors/03-unknown-linkid.json?raw";
// @ts-expect-error
import v04 from "../../../../tooling/criteria-bundle/extraction/gate-vectors/04-type-mismatch.json?raw";
// @ts-expect-error
import v05 from "../../../../tooling/criteria-bundle/extraction/gate-vectors/05-missing-evidence-extension.json?raw";
// @ts-expect-error
import v06 from "../../../../tooling/criteria-bundle/extraction/gate-vectors/06-retrieved-status-from-model.json?raw";
// @ts-expect-error
import v07 from "../../../../tooling/criteria-bundle/extraction/gate-vectors/07-verdict-shaped-field.json?raw";

const vectors = [v01, v02, v03, v04, v05, v06, v07].map((s) => JSON.parse(s as string));
const questionnaires = [nationalQ, ctCapQ];
const PUBLISHED = ["ct_cap", "us_abdomen", "ct_head"];
const ATTESTATION = new Set(["workup.strongSuspicionMalignancy", "excl.urgentAdmissionRequired"]);

function gate(vec: any, extra: Partial<Parameters<typeof runGate>[0]> = {}) {
  return runGate({
    response: vec.response,
    redactedNote: vec.note,
    questionnaires,
    publishedExamSiteIds: PUBLISHED,
    attestationLinkIds: ATTESTATION,
    truncated: false,
    examSuppliedByCaller: true,
    ...extra,
  });
}

const NOTE = "65yo male w/ unexplained wt loss 5% over past 6/12 with no localising symptoms or signs. Hb mildly low. Requesting CT chest abdomen pelvis.";
const QR_OK = { resourceType: "QuestionnaireResponse", item: [] };

describe("validation gate — 4a vectors", () => {
  for (const vec of vectors) {
    it(`${vec.id} -> ${vec.expect}${vec.gateRule ? ` (rule ${vec.gateRule})` : ""}`, () => {
      const res = gate(vec);
      if (vec.expect === "pass") {
        expect(res.failures).toEqual([]);
        expect(res.passed).toBe(true);
      } else {
        expect(res.passed).toBe(false);
        expect(res.failures.length).toBeGreaterThan(0);
      }
    });
  }
});

describe("validation gate — AD-17 attestation rejection", () => {
  it("rejects the whole response when the model answers an attestation indicator", () => {
    const base = JSON.parse(v01 as string);
    // add a well-formed answer to workup.strongSuspicionMalignancy
    base.response.questionnaireResponse.item.push({
      linkId: "workup",
      item: [
        {
          linkId: "workup.strongSuspicionMalignancy",
          answer: [
            {
              valueBoolean: true,
              extension: [
                {
                  url: "http://crr.health.nz/fhir/StructureDefinition/answer-evidence",
                  extension: [
                    { url: "status", valueCode: "documented" },
                    { url: "quote", valueString: "unexplained wt loss" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const res = gate(base);
    expect(res.passed).toBe(false);
    expect(res.failures.some((f) => f.includes("attestation-category") && f.includes("workup.strongSuspicionMalignancy"))).toBe(true);
  });
});

describe("validation gate — truncation", () => {
  it("a truncated response is a failure even if otherwise well-formed", () => {
    const res = gate(JSON.parse(v01 as string), { truncated: true });
    expect(res.passed).toBe(false);
    expect(res.failures.some((f) => f.includes("truncated"))).toBe(true);
  });
});

describe("validation gate — KI-53 requested entry without a verbatim quote (no-exam path)", () => {
  const run = (examSites: any[], examSuppliedByCaller: boolean) =>
    runGate({
      response: { examSites, questionnaireResponse: QR_OK },
      redactedNote: NOTE,
      questionnaires,
      publishedExamSiteIds: PUBLISHED,
      attestationLinkIds: ATTESTATION,
      truncated: false,
      examSuppliedByCaller,
    });

  it("branch 1 — requested:true with a verbatim quote stays requested, no downgrade", () => {
    const examSites = [{ id: "ct_cap", requested: true, quote: "CT chest abdomen pelvis" }];
    const res = run(examSites, false);
    expect(res.passed).toBe(true);
    expect(res.downgrades).toEqual([]);
    expect(examSites[0].requested).toBe(true);
  });

  it("branch 2 — requested:true with quote null is cleared to a candidate and recorded", () => {
    const examSites = [{ id: "ct_cap", requested: true, quote: null }];
    const res = run(examSites, false);
    expect(res.passed).toBe(true); // soft — not a whole-response rejection
    expect(res.failures).toEqual([]);
    expect(res.downgrades).toEqual(["ct_cap"]);
    expect(examSites[0].requested).toBe(false); // mutated in place
  });

  it("branch 2 — requested:true with a quote that is not in the note is also downgraded", () => {
    const examSites = [{ id: "ct_cap", requested: true, quote: "MRI whole spine" }];
    const res = run(examSites, false);
    expect(res.passed).toBe(true);
    expect(res.downgrades).toEqual(["ct_cap"]);
    expect(examSites[0].requested).toBe(false);
  });

  it("caller supplied the exam — a null quote on the requested entry is left alone (contract)", () => {
    const examSites = [{ id: "ct_cap", requested: true, quote: null }];
    const res = run(examSites, true);
    expect(res.passed).toBe(true);
    expect(res.downgrades).toEqual([]);
    expect(examSites[0].requested).toBe(true);
  });

  it("a downgraded entry is not then hard-failed as a quoteless candidate", () => {
    const examSites = [{ id: "ct_cap", requested: true, quote: null }];
    const res = run(examSites, false);
    expect(res.failures).toEqual([]);
  });
});
