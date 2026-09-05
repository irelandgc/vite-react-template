// ARCH-MIG-01 slice 0 — SR-10 smoke test.
//
// Proves (or disproves) that `cql-execution` can load and evaluate a real
// compiled CQL library (the CT CAP ELM from tooling/criteria-bundle/) inside
// the actual Workers runtime (workerd, via @cloudflare/vitest-pool-workers),
// under `nodejs_compat` — not just under plain Node, which is what
// tooling/criteria-bundle/tooling/run-tests.mjs already proves.
//
// This is the one thing slice 3 (the rules-engine route) depends on. If this
// fails, SR-10 is a blocker and the plan's documented fallback applies: a
// small dedicated Node service instead of running the engine in-Worker.
import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain .mjs, no type declarations; runtime-only import
import { scenarios, toQuestionnaireResponse } from "../tooling/criteria-bundle/tests/scenarios.mjs";
import elm from "../tooling/criteria-bundle/elm/CRR_CTChestAbdomenPelvis_Adult.json";
import fhirHelpers from "../tooling/criteria-bundle/elm/FHIRHelpers-4.0.1.json";
import cql from "cql-execution";
import cqlfhir from "cql-exec-fhir";

describe("SR-10 — cql-execution under Workers nodejs_compat", () => {
  it("evaluates the CT CAP library for a known scenario (S01-b1-p2 -> P2_URGENT)", async () => {
    const scenario = scenarios.find((s: { id: string }) => s.id === "S01-b1-p2");
    expect(scenario).toBeTruthy();

    const lib = new cql.Library(elm, new cql.Repository({ FHIRHelpers: fhirHelpers }));
    const qr = toQuestionnaireResponse(scenario);
    const bundle = {
      resourceType: "Bundle",
      type: "collection",
      entry: [{ resource: { resourceType: "Patient", id: scenario.id } }, { resource: qr }],
    };
    const ps = cqlfhir.PatientSource.FHIRv401();
    ps.loadBundles([bundle]);

    const res = await new cql.Executor(lib, new cql.CodeService({}), {}).exec(ps);
    const adv = res.patientResults[scenario.id].Advisory;

    expect(adv.determination).toBe(scenario.expect.determination);
    expect(adv.priorityCode).toBe(scenario.expect.priorityCode);
    expect(adv.missingInformation ?? []).toEqual(scenario.expect.missing ?? []);
  });
});
