// ARCH-MIG-01 slice 2 — bundle registry route tests. Ports the 19 scenarios
// manually verified live against `wrangler dev` in PR #5 into a CI-runnable
// suite (chore/arch-mig-test-harness). See vitest.config.ts for why this
// uses @cloudflare/vitest-plugin, not @cloudflare/vitest-pool-workers.
import { describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";
// @ts-expect-error -- ?raw import, no type declaration
import realBundleJson from "../../../../tooling/criteria-bundle/registry/ct-chest-abdomen-pelvis-adult/1.0.0.json?raw";

const AUTH = { "x-admin-email": "test@example.com" };
const realBundle = () => JSON.parse(realBundleJson);

async function publish(bundle: unknown) {
  return SELF.fetch("http://worker/api/admin/bundles/publish", {
    method: "POST",
    headers: { "content-type": "application/json", ...AUTH },
    body: JSON.stringify(bundle),
  });
}

// 1-3: empty-registry baseline
describe("empty registry", () => {
  it("1. GET /api/bundles returns the 53-row exam_sites seed and no bundles", async () => {
    const res = await SELF.fetch("http://worker/api/bundles");
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.bundles).toEqual([]);
    expect(body.examSites).toHaveLength(53);
    expect(body.examSites.find((e: any) => e.id === "ct_cap").live).toBe(1);
  });

  it("2. GET /api/bundle/:examSite/:version 404s when nothing published", async () => {
    const res = await SELF.fetch("http://worker/api/bundle/ct-chest-abdomen-pelvis-adult/1.0.0");
    expect(res.status).toBe(404);
  });

  it("3. GET /api/criteria/xr_elbow falls through (no legacy KV data in this test env)", async () => {
    const res = await SELF.fetch("http://worker/api/criteria/xr_elbow");
    expect(res.status).toBe(404);
  });
});

// 4-7: auth and validation
describe("publish validation", () => {
  it("4. rejects publish with no admin identity", async () => {
    const res = await SELF.fetch("http://worker/api/admin/bundles/publish", { method: "POST", body: "{}" });
    expect(res.status).toBe(401);
  });

  it("5. rejects a bundle missing required keys", async () => {
    const res = await publish({ examSite: "x" });
    expect(res.status).toBe(422);
    const body: any = await res.json();
    expect(body.problems.length).toBeGreaterThan(0);
  });

  it("6. rejects a logicHash that doesn't match the recomputed hash", async () => {
    const b = realBundle();
    b.logicHash = "sha256:" + "0".repeat(64);
    const res = await publish(b);
    expect(res.status).toBe(422);
    const body: any = await res.json();
    expect(body.problems.some((p: string) => p.includes("logicHash mismatch"))).toBe(true);
  });

  it("7. rejects an unresolved PlanDefinition linkId", async () => {
    const b = realBundle();
    b.version = "1.0.0-linkid-test";
    b.planDefinition = { ...b.planDefinition, action: [{ id: "fake", input: [{ profile: ["http://x#not.a.real.linkid"] }] }] };
    // Recompute the real hash (site + population unchanged) so only the linkId problem is reported.
    const enc = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", enc.encode(JSON.stringify(b.library.site) + JSON.stringify(b.library.population)));
    b.logicHash = "sha256:" + [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
    const res = await publish(b);
    expect(res.status).toBe(422);
    const body: any = await res.json();
    expect(body.problems.some((p: string) => p.includes("not in this bundle") && p.includes("not.a.real.linkid"))).toBe(true);
  });
});

// 8-11: real publish, immutability, both AD-02 guard directions
describe("publish lifecycle: immutability and AD-02", () => {
  it("8. accepts the real CT CAP bundle", async () => {
    const res = await publish(realBundle());
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body).toMatchObject({ success: true, examSite: "ct-chest-abdomen-pelvis-adult", version: "1.0.0", state: "transcribed" });
  });

  it("9. refuses a re-publish of the same version (immutability)", async () => {
    await publish(realBundle());
    const res = await publish(realBundle());
    expect(res.status).toBe(409);
  });

  it("10. AD-02: refuses a major bump with an unchanged logic hash", async () => {
    await publish(realBundle());
    const b = realBundle();
    b.version = "2.0.0";
    const res = await publish(b);
    expect(res.status).toBe(422);
    expect((await res.json() as any).error).toMatch(/major bump/);
  });

  it("11. AD-02: refuses a non-major bump with a changed logic hash", async () => {
    await publish(realBundle());
    const b = realBundle();
    b.version = "1.1.0";
    b.library.site = { ...b.library.site, __test_marker: true };
    const enc = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", enc.encode(JSON.stringify(b.library.site) + JSON.stringify(b.library.population)));
    b.logicHash = "sha256:" + [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
    const res = await publish(b);
    expect(res.status).toBe(422);
    expect((await res.json() as any).error).toMatch(/not a major bump/);
  });
});

// 12-19: state transitions and the full lifecycle
describe("state transitions", () => {
  it("12. rejects an illegal transition (transcribed -> published)", async () => {
    await publish(realBundle());
    const res = await SELF.fetch("http://worker/api/admin/bundles/ct-chest-abdomen-pelvis-adult/state", {
      method: "POST", headers: { "content-type": "application/json", ...AUTH }, body: JSON.stringify({ toState: "published" }),
    });
    expect(res.status).toBe(422);
  });

  it("13. rejects signed-off without a signoffRef", async () => {
    await publish(realBundle());
    const res = await SELF.fetch("http://worker/api/admin/bundles/ct-chest-abdomen-pelvis-adult/state", {
      method: "POST", headers: { "content-type": "application/json", ...AUTH }, body: JSON.stringify({ toState: "signed-off" }),
    });
    expect(res.status).toBe(400);
  });

  it("14-19. transcribed -> signed-off -> published, and GET /api/criteria/ct_cap switches over only once published", async () => {
    await publish(realBundle());

    // 14. transcribed -> signed-off
    let res = await SELF.fetch("http://worker/api/admin/bundles/ct-chest-abdomen-pelvis-adult/state", {
      method: "POST", headers: { "content-type": "application/json", ...AUTH },
      body: JSON.stringify({ toState: "signed-off", signoffRef: "tooling/criteria-bundle/sites/ct-chest-abdomen-pelvis-adult/signoff.md" }),
    });
    expect(res.status).toBe(200);

    // 15. still signed-off (not published) -> /api/criteria/ct_cap still falls through
    res = await SELF.fetch("http://worker/api/criteria/ct_cap");
    expect(res.status).toBe(404);

    // 16. signed-off -> published
    res = await SELF.fetch("http://worker/api/admin/bundles/ct-chest-abdomen-pelvis-adult/state", {
      method: "POST", headers: { "content-type": "application/json", ...AUTH }, body: JSON.stringify({ toState: "published" }),
    });
    expect(res.status).toBe(200);

    // 17. GET /api/criteria/ct_cap now resolves via the bundle
    res = await SELF.fetch("http://worker/api/criteria/ct_cap");
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.examSite).toEqual({ id: "ct_cap", title: "CT — Chest/Abdomen/Pelvis" });
    expect(body.bundle.key).toBe("ct-chest-abdomen-pelvis-adult");
    expect(body.planDefinition).toBeTruthy();
    expect(body.questionnaire).toBeTruthy();

    // 18. xr_elbow (live=0, no published bundle for its key) stays on the legacy fallback
    res = await SELF.fetch("http://worker/api/criteria/xr_elbow");
    expect(res.status).toBe(404);

    // 19. GET /api/bundle/.../latest reflects the live D1 state, not the frozen KV value (AD-12)
    res = await SELF.fetch("http://worker/api/bundle/ct-chest-abdomen-pelvis-adult/latest");
    const bundleBody: any = await res.json();
    expect(bundleBody.state).toBe("published");
  });
});
