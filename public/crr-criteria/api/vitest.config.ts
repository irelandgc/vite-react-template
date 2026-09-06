import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-plugin";

const here = path.dirname(fileURLToPath(import.meta.url));

// ARCH-MIG-01 chore/arch-mig-test-harness — CI-runnable tests for the
// crr-criteria-api worker's bundle registry routes (slice 2), against real
// D1 + KV bindings.
//
// Uses @cloudflare/vitest-plugin (cloudflareTest, a Vite plugin), not the
// older @cloudflare/vitest-pool-workers (cloudflarePool, a custom pool
// runner): the older package fails to inject the `cloudflare:test` module
// for any worker whose wrangler config declares D1/KV bindings, confirmed by
// testing both packages against the identical, correctly-pathed config — the
// pool-based one fails, the plugin-based one works. See AD-13.
//
// Schema setup deliberately doesn't use Cloudflare's own readD1Migrations()/
// applyD1Migrations() pattern (see their d1 fixture): this repo's migrations/
// directory isn't a complete, from-empty sequence (0001-0005 predate this
// repo's own migration-file discipline — see KI-37), so replaying it from
// scratch doesn't reproduce a real environment. schema.sql is this repo's
// actual source of truth for a from-empty schema; test/apply-schema.ts
// applies it directly.
export default defineConfig({
  root: here,
  resolve: {
    alias: {
      // slice 3: cql-execution's CJS does `require("immutable")`; `immutable`
      // 5.x has no `exports` field and a dual main/module, and the plugin's
      // bundler resolves that to the ESM build whose interop leaves
      // `require("immutable")` undefined (-> "Cannot read properties of
      // undefined (reading 'Seq')"). Pin the CJS entry so the require resolves.
      immutable: "immutable/dist/immutable.js",
    },
  },
  plugins: [
    cloudflareTest({
      wrangler: { configPath: path.join(here, "..", "wrangler.json") },
      // Test-only bindings. `ADMIN_PROXY_KEY` lets the suite exercise the SR-14
      // admin-write gate's "arrived via the main-worker service binding" path
      // (production sets this as a secret on both workers; dev in .dev.vars).
      // `ADMIN_WRITES_ENABLED` is deliberately left UNSET so the test env
      // behaves like a dev deployment — the SR-14 refusal test depends on it.
      miniflare: { bindings: { ADMIN_PROXY_KEY: "test-admin-proxy-key" } },
    }),
  ],
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: [path.join(here, "test/apply-schema.ts")],
  },
});
