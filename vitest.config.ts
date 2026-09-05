import { defineConfig } from "vitest/config";
import { cloudflarePool } from "@cloudflare/vitest-pool-workers";

// Runs Worker tests inside the actual Workers runtime (workerd), via
// @cloudflare/vitest-pool-workers, against an isolated test-only wrangler
// config (test/wrangler.smoke.jsonc) — see ARCH-MIG-01 slice 0.
//
// Vitest 4 reworked custom pools: `test.pool` (a package-name string) is
// gone, replaced by `test.poolRunner` taking the initializer this package
// now exports directly (`cloudflarePool(...)`).
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    poolRunner: cloudflarePool({
      wrangler: { configPath: "./test/wrangler.smoke.jsonc" },
    }),
  },
});
