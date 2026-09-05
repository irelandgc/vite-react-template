// Minimal placeholder Worker, required only so wrangler/miniflare has a
// `main` entrypoint to resolve compatibility settings from for the
// SR-10 nodejs_compat smoke test (test/cql-nodejs-compat.smoke.test.ts).
// The smoke test itself does not call this handler — it imports and
// exercises `cql-execution` directly inside the same Workers runtime.
export default {
  async fetch(): Promise<Response> {
    return new Response("smoke-worker placeholder");
  },
};
