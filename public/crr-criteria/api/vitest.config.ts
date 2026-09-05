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
  plugins: [
    cloudflareTest({
      wrangler: { configPath: path.join(here, "..", "wrangler.json") },
    }),
  ],
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: [path.join(here, "test/apply-schema.ts")],
  },
});
