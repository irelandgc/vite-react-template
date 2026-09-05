import { env } from "cloudflare:test";
// @ts-expect-error -- ?raw import, no type declaration
import schemaSql from "../schema.sql?raw";
// @ts-expect-error -- ?raw import, no type declaration
import bundleRegistrySeedSql from "../migrations/0008_bundle_registry.sql?raw";

// Applies the full schema (this repo's from-empty source of truth — see
// vitest.config.ts for why this isn't done via readD1Migrations) plus the
// exam_sites seed data, before each test file. D1's exec() requires every
// statement on a single line (documented D1 constraint) — strip comments,
// then flatten each multi-line CREATE TABLE/INSERT onto one line rather than
// just stripping `--` comments and leaving newlines mid-statement.
function strip(sql: string) {
  return sql
    .replace(/--.*$/gm, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ");
}

await env.DB.exec(strip(schemaSql));
await env.DB.exec(strip(bundleRegistrySeedSql));
