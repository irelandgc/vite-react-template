// Usage: node translate.mjs <file.cql> [out.json]
import "./polyfill.mjs";
import fs from "node:fs";
import { NamespaceManager } from "@cqframework/cql/cql";
import { DefaultModelInfoProvider, DefaultLibrarySourceProvider, stringAsPath, ModelManager, LibraryManager, CqlTranslator, CqlCompilerOptions, createUcumService } from "@cqframework/cql/cql-to-elm";
const nm = new NamespaceManager();
const mm = new ModelManager(nm);
mm.modelInfoLoader.registerModelInfoProvider(new DefaultModelInfoProvider(stringAsPath("./models")));
// Minimal UCUM service: validates unit syntax only (no conversion). Sufficient for unit-annotated literals.
const ucum = createUcumService((v,from,to)=>{ if(from===to) return v; throw new Error("unit conversion not supported: "+from+"->"+to); }, (u)=>null, (a,b)=>a, (a,b)=>a);
const lm = new LibraryManager(mm, undefined, undefined, ucum);
lm.librarySourceLoader.registerProvider(new DefaultLibrarySourceProvider(stringAsPath("./libraries")));
// Cross-bundle includes (ARCH-MIG-01 slice 1 session 2, plan §2 slice 1 "Cross-bundle
// references"): a site library may `include CRR_<Other>_Adult` and reference its
// determination define. Resolve those from the sibling cql/ directory, and from the
// test fixtures directory so the throwaway proof library in tests/fixtures/ compiles
// without polluting cql/ with non-shipping content.
lm.librarySourceLoader.registerProvider(new DefaultLibrarySourceProvider(stringAsPath("../cql")));
lm.librarySourceLoader.registerProvider(new DefaultLibrarySourceProvider(stringAsPath("../tests/fixtures")));
const cql = fs.readFileSync(process.argv[2], "utf8");
const t = CqlTranslator.fromText(cql, lm);
const json = t.toJson();
const elm = JSON.parse(json);
const errs = (elm.library.annotation||[]).filter(a=>a.type==="CqlToElmError");
for (const e of errs) console.error(`${e.errorSeverity} L${e.startLine}:${e.startChar} ${e.message}`);
if (process.argv[3]) fs.writeFileSync(process.argv[3], json);
console.log(errs.filter(e=>e.errorSeverity==="error").length ? "FAILED" : "OK", "-", elm.library.statements?.def?.length ?? 0, "definitions");
