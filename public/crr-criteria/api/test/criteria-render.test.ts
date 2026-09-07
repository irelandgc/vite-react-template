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
    for (const layout of ["indication", "vocabulary"] as const) {
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
  it("builds a HealthPathways link from the page id + regional domain", () => {
    expect(withRegion).toContain("Local HealthPathways");
    expect(withRegion).toMatch(/href="https:\/\/TBC\.communityhealthpathways\.org\/TBC-page-id"/);
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
