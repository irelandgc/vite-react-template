// SR-14 — the main worker's admin/assess proxy must reach the crr-criteria-api
// worker over the CRR_API service binding (the LOCAL API worker under two-worker
// `wrangler dev`), never a hard-coded public URL. This is the layer that made
// the recorded near miss possible: a dev `wrangler dev` forwarding an admin
// write to the production API worker.
import { describe, expect, it, vi } from "vitest";
import { dispatchToApi } from "../src/worker/index";

describe("SR-14 — proxy dispatch stays on the service binding", () => {
  it("with no API_BASE, forwards via env.CRR_API.fetch and never calls global fetch", async () => {
    let bindingCalls = 0;
    let seenUrl = "";
    const env = {
      CRR_API: {
        fetch: async (req: Request) => {
          bindingCalls++;
          seenUrl = new URL(req.url).pathname;
          return new Response("from-binding");
        },
      },
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await dispatchToApi(env as any, "/api/admin/bundles/publish?x=1", { method: "POST" });

    expect(bindingCalls).toBe(1);
    expect(seenUrl).toBe("/api/admin/bundles/publish");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await res.text()).toBe("from-binding");

    fetchSpy.mockRestore();
  });

  it("API_BASE is an escape hatch only — it is honoured when explicitly set, so it must never appear in dev/prod config", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("from-escape-hatch"));
    const bindingThatMustNotBeCalled = {
      fetch: async () => {
        throw new Error("service binding was used despite API_BASE being set");
      },
    };

    const res = await dispatchToApi(
      { API_BASE: "https://example.invalid", CRR_API: bindingThatMustNotBeCalled } as any,
      "/api/version",
      { method: "GET" },
    );

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][0]).toBe("https://example.invalid/api/version");
    expect(await res.text()).toBe("from-escape-hatch");

    fetchSpy.mockRestore();
  });
});
