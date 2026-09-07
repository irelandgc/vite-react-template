// ARCH-MIG-01 slice 6 — criteria structure renderer.
//
// resolveCriteria + criteriaHtml are presentation-only and carry no criteria
// content of their own: every string they DISPLAY comes from the bundle artefacts
// (PlanDefinition / Questionnaire / overlay) or from the fixed CHROME_STRINGS.
// This is the same "every displayed string comes from an artefact" contract the
// Advisory renderer holds (advisory-render.test.ts).
import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain .js ESM module, no type declarations
import { resolveCriteria, criteriaHtml, buildQuestionnaireResponse, CHROME_STRINGS } from "../../shared/criteria-render.js";
import ctCapQ from "../../../../tooling/criteria-bundle/fhir/Questionnaire-CRR-CT-CAP-Adult.json";
import ctCapPd from "../../../../tooling/criteria-bundle/fhir/PlanDefinition-CRR-CT-CAP-Adult.json";
import ctCapOverlay from "../../../../tooling/criteria-bundle/fhir/RegionalOverlay-CRR-CT-CAP-Adult-te-waipounamu.json";
import regionsConfig from "../../../../tooling/criteria-bundle/fhir/regions.json";

const bundle = { planDefinition: ctCapPd, questionnaire: ctCapQ, overlays: [ctCapOverlay] };

// Word-level "no invented content" check: every WORD the renderer displays must
// appear in the bundle artefacts, or be one of the renderer's fixed chrome
// words, or be numeric. Concatenation order is not the point - invented
// vocabulary is (invariant 3).
function wordSet(...strings: string[]): Set<string> {
  const set = new Set<string>();
  for (const s of strings) {
    for (const w of String(s).toLowerCase().split(/[^a-z0-9%/+&.-]+/i)) {
      const t = w.replace(/^[.-]+|[.-]+$/g, "");
      if (t) set.add(t);
    }
  }
  return set;
}
const ARTEFACT_WORDS = wordSet(JSON.stringify(ctCapPd), JSON.stringify(ctCapQ), JSON.stringify(ctCapOverlay), JSON.stringify(regionsConfig));
const CHROME_WORDS = wordSet(CHROME_STRINGS.join(" "));

function visibleText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&#8226;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function untraceable(html: string): string[] {
  const toks = visibleText(html).toLowerCase().split(/[^a-z0-9%/+&.-]+/i)
    .map((w) => w.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((w) => w.length > 0 && !/^[0-9]+([.-][0-9]+)*$/.test(w));
  return [...new Set(toks)].filter((w) => !ARTEFACT_WORDS.has(w) && !CHROME_WORDS.has(w));
}

describe("criteria-render — every displayed string traces to a bundle artefact", () => {
  for (const ctx of ["referrer", "triager"] as const) {
    for (const layout of ["indication", "urgency", "vocabulary"] as const) {
      it(`${ctx} / ${layout}`, () => {
        const model = resolveCriteria(bundle, {
          context: ctx, layout, region: "te-waipounamu", regionsConfig,
          sourceLine: { title: ctCapPd.title, pages: "10-11" },
        });
        const bad = untraceable(criteriaHtml(model));
        expect(bad).toEqual([]);
      });
    }
  }
});

describe("criteria-render — referrer view (GEN-004)", () => {
  const html = criteriaHtml(resolveCriteria(bundle, { context: "referrer", layout: "indication" }));
  it("shows no priority code", () => {
    expect(html).not.toMatch(/\bP[1-4]\b/);
    expect(html).not.toContain("priority-badge");
  });
  it("strips the leading P2 token from the timeframe row title", () => {
    expect(html).toContain("Urgent: non-deferrable imaging or intervention that must be completed within 2 weeks");
    expect(html).not.toContain("P2 Urgent: non-deferrable");
  });
  it("groups the P2 pathways by indication-theme", () => {
    expect(html).toContain("Suspected occult malignancy");
    expect(html).toContain("Specialist-endorsed referral");
    expect(html.indexOf("Suspected occult malignancy")).toBeLessThan(html.indexOf("Specialist-endorsed referral"));
  });
  it("renders compound selectionBehavior labels", () => {
    expect(html).toContain("All of the following:");
    expect(html).toContain("One or more of the following:");
  });
  it("renders badges from action codes, verbatim", () => {
    expect(html).toContain("MANDATORY");
    expect(html).toContain("GATEWAY");
    expect(html).toContain("LAB VALUE REQUIRED");
  });
  it("renders the redirects as a list with page references", () => {
    expect(html).toContain("Alternative management / redirect");
    expect(html).toContain("Presentation requiring urgent admission or urgent secondary care assessment");
    expect(html).toMatch(/page 11/);
  });
  it("not-funded is present but never tickable (GEN-005)", () => {
    expect(html).toContain("Not routinely funded");
    expect(html).toContain("Patient is unfit for treatment or unwilling");
    // funding.unfitOrUnwilling never gets a checkbox / data-linkid
    expect(html).not.toContain('data-linkid="funding.unfitOrUnwilling"');
  });
  it("single-boolean leaves are checkboxes; a compound criterion (B1, B3) is not one tick but a typed input per linkId (AD-27)", () => {
    // criterion-A's five boolean leaves + the six lab booleans are single-tick cards
    for (const id of ["workup.bloods", "workup.urinalysis", "workup.cxr", "workup.strongSuspicionMalignancy", "workup.localisingFeatures", "lab.crp.raised", "lab.hb.low", "lab.alp.high"]) {
      expect(html).toContain(`<input type="checkbox" class="crit-card-check" data-linkid="${id}"`);
    }
    // B1 / B3 are never a single tick over the whole criterion
    expect(html).not.toContain('data-linkid="b1"');
    expect(html).not.toContain('data-linkid="b3"');
    // B1: number for age, select for sex, checkbox for present/measured, number for weights/period/percent
    expect(html).toMatch(/<input type="number"[^>]*data-linkid="patient\.age"/);
    expect(html).toMatch(/<select data-linkid="patient\.sex">/);
    expect(html).toContain('<option value="male">Male</option>');
    expect(html).toMatch(/<input type="checkbox" data-linkid="weightloss\.present"/);
    expect(html).toMatch(/<input type="checkbox" data-linkid="weightloss\.measured"/);
    for (const id of ["weightloss.weightBefore", "weightloss.weightNow", "weightloss.periodMonths", "weightloss.percent"]) {
      expect(html).toMatch(new RegExp(`<input type="number"[^>]*data-linkid="${id.replace(".", "\\.")}"`));
    }
    // the fallback (percent) is the last of the weight-loss inputs (PlanDefinition order)
    expect(html.indexOf('data-linkid="weightloss.weightBefore"')).toBeLessThan(html.indexOf('data-linkid="weightloss.percent"'));
    // B3: checkbox for the advice boolean, text for the adviser name/role
    expect(html).toMatch(/<input type="checkbox" data-linkid="advice\.urgentCTRecommended"/);
    expect(html).toMatch(/<input type="text" data-linkid="advice\.adviserNameRole"/);
    // published wording of the criterion still leads the row
    expect(html).toContain("Male over 50 years of age or female over 60 years");
    // unit chips come from the Questionnaire's questionnaire-unit extension
    expect(html).toContain('<span class="cr-unit">kg</span>');
    expect(html).toContain('<span class="cr-unit">years</span>');
  });

  it("read-only (Triage reference column): compound inputs show the value from the merged QR, no entry", () => {
    const ro = criteriaHtml(resolveCriteria(bundle, {
      context: "referrer", layout: "indication", readOnly: true,
      ticks: { "patient.age": 62, "patient.sex": "male", "weightloss.weightBefore": 84, "weightloss.weightNow": 77, "weightloss.periodMonths": 4, "weightloss.present": true },
    }));
    expect(ro).not.toContain('<input type="number"');
    expect(ro).not.toContain("<select");
    expect(ro).toContain('<span class="cr-input-value">84 kg</span>');
    expect(ro).toContain('<span class="cr-input-value">62 years</span>');
    expect(ro).toContain('<span class="cr-input-value">Male</span>');
    // a boolean shows a disabled checked box, not editable
    expect(ro).toMatch(/<input type="checkbox" disabled checked>/);
  });
});

describe("criteria-render — by-urgency layout (CV-027)", () => {
  const html = criteriaHtml(resolveCriteria(bundle, { context: "referrer", layout: "urgency" }));
  it("does not theme-group and does not append the Questionnaire vocabulary groups", () => {
    expect(html).not.toContain("theme-group-hd");
    // the vocabulary-group dump (only for layout: 'vocabulary')
    expect(html).not.toContain("Yellow flag symptoms (context only; do not affect eligibility)");
  });
  it("still renders the timeframe block and the compound selection labels, in printed order", () => {
    expect(html).toContain("Urgent: non-deferrable imaging or intervention that must be completed within 2 weeks");
    expect(html).toContain("All of the following:");
    expect(html).toContain("One or more of the following:");
    // criterion A wording precedes B3 wording (PlanDefinition order)
    expect(html.indexOf("Following full clinical assessment")).toBeLessThan(html.indexOf("advises referral for urgent CT Chest"));
  });
});

describe("criteria-render — triager view", () => {
  const html = criteriaHtml(resolveCriteria(bundle, { context: "triager", layout: "indication" }));
  it("shows the priority code on the timeframe row", () => {
    expect(html).toContain("priority-badge");
    expect(html).toContain("P2");
    expect(html).toContain("P2 Urgent: non-deferrable imaging");
  });
});

describe("criteria-render — region overlay (delivery info only)", () => {
  const withRegion = criteriaHtml(resolveCriteria(bundle, { context: "referrer", layout: "indication", region: "te-waipounamu", regionsConfig }));
  const noRegion = criteriaHtml(resolveCriteria(bundle, { context: "referrer", layout: "indication" }));
  it("shows the overlay's delivery notes only when a region is selected", () => {
    expect(withRegion).toContain("Regional delivery");
    expect(withRegion).toContain("Submit via ERMS to the regional CRR Hub");
    expect(noRegion).not.toContain("Regional delivery");
  });
  it("builds a HealthPathways link from the page id + regional domain (first real instance when no legacy id given)", () => {
    expect(withRegion).toContain("Local HealthPathways");
    expect(withRegion).toMatch(/href="https:\/\/canterbury\.communityhealthpathways\.org\/TBC-page-id"/);
  });
  it("uses the instance for the selected legacy region id (AD-29)", () => {
    const southern = criteriaHtml(resolveCriteria(bundle, {
      context: "referrer", layout: "indication", region: "te-waipounamu", regionLegacyId: "southern", regionsConfig,
    }));
    expect(southern).toMatch(/href="https:\/\/southern\.communityhealthpathways\.org\/TBC-page-id"/);
  });
});

describe("criteria-render — ticks -> QuestionnaireResponse (CV-015)", () => {
  it("builds a QR grouped by linkId prefix from the ticked boxes", () => {
    const qr = buildQuestionnaireResponse(ctCapQ, { "workup.bloods": true, "weightloss.percent": 8, "funding.unfitOrUnwilling": true });
    const workup = qr.item.find((g: any) => g.linkId === "workup");
    expect(workup.item.find((i: any) => i.linkId === "workup.bloods").answer[0].valueBoolean).toBe(true);
    const wl = qr.item.find((g: any) => g.linkId === "weightloss");
    expect(wl.item.find((i: any) => i.linkId === "weightloss.percent").answer[0].valueDecimal).toBe(8);
  });
});

describe("criteria-render — source line (AD-01)", () => {
  it("renders the exam title and section pages passed by the host", () => {
    const html = criteriaHtml(resolveCriteria(bundle, { context: "referrer", layout: "indication", sourceLine: { title: "CT Chest, Abdomen and Pelvis - Adult", pages: "10-11" } }));
    expect(html).toContain("CT Chest, Abdomen and Pelvis - Adult");
    expect(html).toContain("page 10-11");
  });
});
