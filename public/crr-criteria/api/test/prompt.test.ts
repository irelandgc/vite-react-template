// ARCH-MIG-01 slice 4b — prompt assembly tests.
import { describe, expect, it } from "vitest";
import {
  PROMPT_VERSION,
  EQUIVALENCE_LIST_VERSION,
  ATTESTATION_LINK_IDS,
  OUTPUT_TOOL,
  assembleSystemPrompt,
  assembleUserContent,
  stripAttestationItems,
  findCriteriaLeaks,
} from "../prompt";
import promptV3 from "../../../../tooling/criteria-bundle/extraction/prompt-v3.0.1.json";
import nationalQ from "../../../../tooling/criteria-bundle/fhir/Questionnaire-CRR-National.json";
import ctCapQ from "../../../../tooling/criteria-bundle/fhir/Questionnaire-CRR-CT-CAP-Adult.json";
import ctCapPd from "../../../../tooling/criteria-bundle/fhir/PlanDefinition-CRR-CT-CAP-Adult.json";

describe("prompt — versions and assembly", () => {
  it("version constants come from prompt-v3.0.1.json", () => {
    expect(PROMPT_VERSION).toBe("3.0.1");
    expect(PROMPT_VERSION).toBe((promptV3 as any).version);
    expect(EQUIVALENCE_LIST_VERSION).toBe((promptV3 as any).equivalenceListVersion);
  });

  it("OUTPUT_TOOL is the versioned output tool with the shape schema", () => {
    expect(OUTPUT_TOOL.name).toBe("submit_extraction");
    expect(OUTPUT_TOOL.input_schema.additionalProperties).toBe(false);
    const ans = OUTPUT_TOOL.input_schema.properties.answers.items;
    expect(ans.required.sort()).toEqual(["linkId", "quote", "status", "value"]);
    expect(ans.additionalProperties).toBe(false);
    expect(ans.properties.status.enum).toEqual(["documented", "inferred"]);
  });

  it("assembleSystemPrompt joins parts[].text with a blank line, deterministically", () => {
    const a = assembleSystemPrompt();
    const b = assembleSystemPrompt();
    expect(a).toBe(b);
    const parts = (promptV3 as any).parts as { text: string }[];
    expect(a).toBe(parts.map((p) => p.text).join("\n\n"));
    // sanity: it contains the role line and the output rule
    expect(a).toContain("You extract. You do not assess.");
    expect(a).toContain("Call the submit_extraction tool");
    expect(a).toContain("Never submit: a verdict");
  });
});

describe("prompt — no criteria content (AD-16 at the assembled level)", () => {
  it("the assembled system prompt contains no numeric threshold, priority code, named analyte, redirect, or PlanDefinition action title", () => {
    const actionTitles: string[] = [];
    (function walk(actions: any[]) {
      for (const a of actions || []) {
        if (a.title) actionTitles.push(a.title);
        walk(a.action);
      }
    })((ctCapPd as any).action);
    const leaks = findCriteriaLeaks(assembleSystemPrompt(), actionTitles);
    expect(leaks).toEqual([]);
  });
});

describe("prompt — attestation items are stripped (AD-17)", () => {
  it("ATTESTATION_LINK_IDS is read from the vocabulary and is non-empty", () => {
    expect(ATTESTATION_LINK_IDS).toContain("workup.strongSuspicionMalignancy");
    expect(ATTESTATION_LINK_IDS).toContain("excl.urgentAdmissionRequired");
  });

  it("stripAttestationItems removes those linkIds from the CT CAP Questionnaire", () => {
    const before = JSON.stringify(ctCapQ);
    const stripped = stripAttestationItems(ctCapQ, new Set(ATTESTATION_LINK_IDS));
    const allLinkIds = (function collect(items: any[], acc: string[] = []): string[] {
      for (const i of items || []) {
        if (i.linkId) acc.push(i.linkId);
        if (Array.isArray(i.item)) collect(i.item, acc);
      }
      return acc;
    })(stripped.item);
    for (const id of ATTESTATION_LINK_IDS) expect(allLinkIds).not.toContain(id);
    // at least one attestation item was actually present to remove
    expect(before).toContain("workup.strongSuspicionMalignancy");
    // input object not mutated
    expect(JSON.stringify(ctCapQ)).toBe(before);
  });
});

describe("prompt — user content", () => {
  it("puts the stable bulk in a cache-controlled block and the note last, uncached", () => {
    const blocks = assembleUserContent({
      redactedNote: "65yo male w/ unexplained wt loss.",
      questionnaires: [nationalQ, ctCapQ],
      examSiteList: [{ id: "ct_cap", title: "CT — Chest/Abdomen/Pelvis" }],
      context: { age: 65, sex: "male" },
    });
    expect(blocks).toHaveLength(2);
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" });
    expect(blocks[0].text).toContain("PUBLISHED EXAM/SITE LIST");
    expect(blocks[0].text).toContain("Do NOT answer patient.age");
    expect(blocks[1].cache_control).toBeUndefined();
    expect(blocks[1].text).toContain("REFERRAL NOTE (redacted):");
    expect(blocks[1].text).toContain("unexplained wt loss");
  });
});
