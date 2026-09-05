// Pipeline stages 4 (population) and 5 (merge).
//
// populate(bundle, params): runs CRR_CTCAP_Population over the patient's FHIR bundle
//   and returns answers as QuestionnaireResponse items, each carrying the
//   answer-evidence extension with status 'retrieved' and one 'source' per resource.
//
// merge(noteQR, retrievedItems): produces the single QuestionnaireResponse the
//   criteria library evaluates. Precedence: retrieved > documented > inferred.
//   When the note (documented/inferred) and the record (retrieved) disagree on a
//   value, the retrieved value wins and the disagreement is returned in
//   `discrepancies` for the triager view. Nothing is silently overwritten.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cql from "cql-execution";
import cqlfhir from "cql-exec-fhir";

const here = path.dirname(fileURLToPath(import.meta.url));
const elmDir = path.join(here, "..", "elm");
export const EVIDENCE_URL = "http://crr.health.nz/fhir/StructureDefinition/answer-evidence";

let popLib;
function lib() {
  if (!popLib) {
    const elm = JSON.parse(fs.readFileSync(path.join(elmDir, "CRR_CTCAP_Population.json"), "utf8"));
    const helpers = JSON.parse(fs.readFileSync(path.join(elmDir, "FHIRHelpers-4.0.1.json"), "utf8"));
    popLib = new cql.Library(elm, new cql.Repository({ FHIRHelpers: helpers }));
  }
  return popLib;
}

function toAnswer(a) {
  const ans = {};
  if (a.type === "boolean") ans.valueBoolean = a.valueBoolean;
  else if (a.type === "decimal") ans.valueDecimal = a.valueDecimal;
  else if (a.type === "quantity") ans.valueQuantity = { value: a.valueQuantity.value, unit: a.valueQuantity.unit };
  ans.extension = [{
    url: EVIDENCE_URL,
    extension: [
      { url: "status", valueCode: "retrieved" },
      ...[...new Set(a.sources || [])].map(s => ({ url: "source", valueReference: { reference: s } }))
    ]
  }];
  return ans;
}

/** Run the population library. Returns [{linkId, answer}] for every derivable indicator. */
export async function populate(bundle, params = {}) {
  const ps = cqlfhir.PatientSource.FHIRv401();
  ps.loadBundles([bundle]);
  const exec = new cql.Executor(lib(), new cql.CodeService({}), params);
  const res = await exec.exec(ps);
  const pid = Object.keys(res.patientResults)[0];
  const answers = res.patientResults[pid]["Populated Answers"] || [];
  return answers.map(a => ({ linkId: a.linkId, answer: toAnswer(a) }));
}

function flatItems(qr) {
  const out = [];
  (function walk(items) { for (const i of items || []) { if (i.answer) out.push(i); walk(i.item); } })(qr.item);
  return out;
}
function answerValue(ans) {
  if ("valueBoolean" in ans) return ans.valueBoolean;
  if ("valueDecimal" in ans) return ans.valueDecimal;
  if ("valueInteger" in ans) return ans.valueInteger;
  if ("valueQuantity" in ans) return ans.valueQuantity.value;
  if ("valueString" in ans) return ans.valueString;
  if ("valueCoding" in ans) return ans.valueCoding.code;
  return undefined;
}
function evidenceStatus(ans) {
  const ev = (ans.extension || []).find(e => e.url === EVIDENCE_URL);
  return ev ? (ev.extension.find(s => s.url === "status") || {}).valueCode : "documented";
}

/** Merge retrieved items into the note-derived QuestionnaireResponse. */
export function merge(noteQR, retrievedItems) {
  const qr = JSON.parse(JSON.stringify(noteQR));
  const discrepancies = [];
  const byLink = new Map(flatItems(qr).map(i => [i.linkId, i]));
  for (const r of retrievedItems) {
    const existing = byLink.get(r.linkId);
    if (existing) {
      const noteVal = answerValue(existing.answer[0]);
      const recVal = answerValue(r.answer);
      if (noteVal !== recVal) {
        discrepancies.push({ linkId: r.linkId, note: noteVal, noteStatus: evidenceStatus(existing.answer[0]), record: recVal, sources: r.answer.extension[0].extension.filter(s => s.url === "source").map(s => s.valueReference.reference) });
      }
      existing.answer = [r.answer]; // retrieved wins
    } else {
      const group = r.linkId.split(".")[0];
      let g = (qr.item || []).find(i => i.linkId === group);
      if (!g) { g = { linkId: group, item: [] }; (qr.item ||= []).push(g); }
      const item = { linkId: r.linkId, answer: [r.answer] };
      g.item.push(item);
      byLink.set(r.linkId, item);
    }
  }
  return { qr, discrepancies };
}
