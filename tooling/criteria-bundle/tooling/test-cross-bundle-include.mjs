// Proves the cross-bundle `include` mechanism (plan §2 slice 1 "Cross-bundle
// references") against real ELM, not a mock: compiles
// tests/fixtures/CRR_TestIncludesCTCAP.cql (a throwaway library, not a real
// site — see its header) and executes it against the actual compiled CT CAP
// library, checking the included library's real define resolves at runtime.
//
// This is a proof that the mechanism works for a future dependent site (CT AP,
// slice 7); CT CAP itself has no cross-bundle dependencies today.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cql from "cql-execution";
import cqlfhir from "cql-exec-fhir";

const here = path.dirname(fileURLToPath(import.meta.url));
const scratch = path.join(os.tmpdir(), "crr-cross-bundle-include-proof.json");

execFileSync("node", ["translate.mjs", "../tests/fixtures/CRR_TestIncludesCTCAP.cql", scratch], { cwd: here, stdio: "inherit" });

const elm = JSON.parse(fs.readFileSync(scratch, "utf8"));
const helpers = JSON.parse(fs.readFileSync(path.join(here, "..", "elm", "FHIRHelpers-4.0.1.json"), "utf8"));
const ctcap = JSON.parse(fs.readFileSync(path.join(here, "..", "elm", "CRR_CTChestAbdomenPelvis_Adult.json"), "utf8"));
const lib = new cql.Library(elm, new cql.Repository({ FHIRHelpers: helpers, CRR_CTChestAbdomenPelvis_Adult: ctcap }));

const ps = cqlfhir.PatientSource.FHIRv401();
ps.loadBundles([{ resourceType: "Bundle", type: "collection", entry: [{ resource: { resourceType: "Patient", id: "p1" } }] }]);
const res = await new cql.Executor(lib, new cql.CodeService({}), {}).exec(ps);
const r = res.patientResults.p1;

fs.unlinkSync(scratch);

const ok = r["CT CAP Determination"] === "INSUFFICIENT_INFORMATION" && r["Excluded By CT CAP Determination"] === false;
console.log(ok ? "PASS" : "FAIL", " cross-bundle include: CT CAP's real Determination resolved through an include ->", JSON.stringify(r));
process.exit(ok ? 0 : 1);
