// ARCH-MIG-01 slice 5 — Advisory renderer (one object, two views).
//
// resolveAdvisory + advisoryHtml are presentation-only (SD-01) and carry no
// criteria content: every displayed string traces to the Advisory, the
// PlanDefinition or a Questionnaire item text. Tests:
//   - referrer view HTML contains no priority code string (GEN-004)
//   - "what to add" text equals the Questionnaire item text byte-for-byte
//   - triager view shows every rule-trace item, the priority code, versions
import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain .js ESM module, no type declarations
import { resolveAdvisory, advisoryHtml } from "../../shared/advisory-render.js";
import ctCapQ from "../../../../tooling/criteria-bundle/fhir/Questionnaire-CRR-CT-CAP-Adult.json";
import ctCapPd from "../../../../tooling/criteria-bundle/fhir/PlanDefinition-CRR-CT-CAP-Adult.json";

const bundleArtefacts = { ct_cap: { questionnaire: ctCapQ, planDefinition: ctCapPd } };

// linkId -> text, straight from the Questionnaire (the byte-for-byte oracle).
const Q = new Map<string, string>();
(function walk(items: any[]) {
  for (const i of items || []) {
    if (i.linkId && typeof i.text === "string") Q.set(i.linkId, i.text);
    if (Array.isArray(i.item)) walk(i.item);
  }
})((ctCapQ as any).item);

function insufficientResponse(missing: string[]) {
  return {
    assessmentId: "a1",
    advisory: {
      determination: "INSUFFICIENT_INFORMATION",
      stoppedAtNational: false,
      national: { determination: "NO_NATIONAL_REDIRECT", firedRedFlags: [] },
      requestedExam: {
        id: "ct_cap",
        state: "published",
        evaluated: true,
        advisory: {
          exam: "CT Chest, Abdomen and Pelvis - Adult",
          criteriaVersion: "2.0 (published 09/04/2026)",
          determination: "INSUFFICIENT_INFORMATION",
          priorityCode: null,
          priorityTimeframe: null,
          activeRedirects: [],
          unconfirmedExclusions: ["excl.recentCTCAP12m"],
          missingInformation: missing,
          inferredIndicators: ["workup.bloods"],
          inferredExcludedByStrictStandard: ["workup.bloods"],
          ruleTrace: { isAdult: true, criterionA: null, pathwayB1: false, meetsP2Literal: null },
        },
      },
      alternatives: [],
    },
    versions: { engine: "1.0.0", prompt: "3.0.1", model: "claude-sonnet-4-6", provider: "anthropic", bundles: { ct_cap: "1.0.0", "national-redflags": "1.0.0" } },
    examSiteSelection: { requestedExamSite: "ct_cap", candidateExamSites: [] },
    bundleArtefacts,
    discrepancies: [{ linkId: "patient.age", kept: { value: 65, provenance: "context" }, superseded: { value: 61, provenance: "extracted" }, valuesMatch: false }],
  };
}

describe("resolveAdvisory / advisoryHtml — referrer view", () => {
  const missing = ["workup.bloods", "workup.urinalysis", "weightloss.percent"];
  const model = resolveAdvisory(insufficientResponse(missing), "referrer");
  const html = advisoryHtml(model);

  it('"what to add" text equals the Questionnaire item text byte-for-byte', () => {
    expect(model.whatToAdd.map((w: any) => w.linkId)).toEqual(missing);
    for (const w of model.whatToAdd) {
      expect(w.text).toBe(Q.get(w.linkId));
      expect(html).toContain(Q.get(w.linkId)!.replace(/&/g, "&amp;"));
    }
  });

  it("contains no priority code string (GEN-004)", () => {
    expect(model.determination.priorityCode).toBeNull();
    expect(html).not.toMatch(/\bP[1-4]\b/);
    expect(html).not.toContain("Priority code");
  });

  it("does not render the rule trace, evidence, discrepancies or versions", () => {
    expect(html).not.toContain("Rule trace");
    expect(html).not.toContain("Discrepancies");
    expect(html).not.toContain("Versions");
    expect(model.trace).toBeUndefined();
  });

  it("determination text is the humanized bundle code when no PlanDefinition action carries it", () => {
    expect(model.determination.plain).toBe("Insufficient information");
    expect(html).toContain("Insufficient information");
  });
});

describe("resolveAdvisory / advisoryHtml — triager view", () => {
  const model = resolveAdvisory(insufficientResponse(["workup.bloods"]), "triager", {
    mergedResponse: {
      item: [
        { linkId: "weightloss", item: [{ linkId: "weightloss.present", answer: [{ valueBoolean: true, extension: [{ url: "http://crr.health.nz/fhir/StructureDefinition/answer-evidence", extension: [{ url: "status", valueCode: "documented" }, { url: "quote", valueString: "wt loss" }] }] }] }] },
      ],
    },
  });
  const html = advisoryHtml(model);

  it("shows every rule-trace item", () => {
    for (const k of Object.keys(model.trace)) expect(html).toContain(k);
  });

  it("shows the evidence table with the quote, the discrepancies, and the version stamps", () => {
    expect(html).toContain("weightloss.present");
    expect(html).toContain("wt loss");
    expect(html).toContain("patient.age"); // discrepancy row
    expect(html).toContain("claude-sonnet-4-6"); // versions
    expect(html).toContain("Inferred — not counted under the strict standard");
    expect(html).toContain("workup.bloods"); // the inferred-excluded indicator
  });

  it("shows priority code section only when there is one", () => {
    expect(html).not.toContain("Priority code"); // this case is INSUFFICIENT, no priority
  });
});

describe("resolveAdvisory — P2_URGENT resolves the PlanDefinition action wording", () => {
  const res = insufficientResponse([]);
  res.advisory.determination = "P2_URGENT";
  res.advisory.requestedExam.advisory.determination = "P2_URGENT";
  res.advisory.requestedExam.advisory.priorityCode = "P2";
  res.advisory.requestedExam.advisory.priorityTimeframe = "Complete within 2 weeks of receiving referral";

  it("referrer sees the timeframe wording but not the code; triager sees both", () => {
    const ref = advisoryHtml(resolveAdvisory(res, "referrer"));
    expect(ref).toContain("Complete within 2 weeks of receiving referral");
    expect(ref).not.toMatch(/\bP2\b/); // GEN-004 — no priority code in the referrer view

    const tri = advisoryHtml(resolveAdvisory(res, "triager"));
    expect(tri).toContain("Priority code: P2");
    // referrer plain wording is the published P2 row title with the code stripped
    const t = resolveAdvisory(res, "referrer");
    expect(t.determination.plain).toBe("Urgent: non-deferrable imaging or intervention that must be completed within 2 weeks of receiving referral");
    expect(t.determination.page).toBe(10);
    // the triager keeps the code in the plain wording
    expect(resolveAdvisory(res, "triager").determination.plain).toMatch(/^P2 Urgent/);
  });
});

describe("resolveAdvisory — national stop", () => {
  const res: any = insufficientResponse([]);
  res.advisory.stoppedAtNational = true;
  res.advisory.determination = "ACUTE_ASSESSMENT_REQUIRED";
  res.advisory.national = { determination: "ACUTE_ASSESSMENT_REQUIRED", firedRedFlags: ["Painful jaundice (US Abdomen - Adult, p30)"], indeterminateRedFlags: [] };
  res.advisory.requestedExam.evaluated = false;
  res.advisory.requestedExam.advisory = null;

  it("both views show the fired red flag wording and nothing about the exam determination", () => {
    for (const view of ["referrer", "triager"] as const) {
      const html = advisoryHtml(resolveAdvisory(res, view));
      expect(html).toContain("Painful jaundice (US Abdomen - Adult, p30)");
      expect(html).not.toContain("What to add");
      expect(html).not.toContain("Insufficient information");
    }
  });
});
