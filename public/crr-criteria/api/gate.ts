// ══════════════════════════════════════════════════════════════
//  ARCH-MIG-01 slice 4b — extraction validation gate
// ══════════════════════════════════════════════════════════════
//
// `extraction-contract.md` §"Validation gate" + AD-17. Runs on the model's
// response BEFORE the engine. A failure rejects the WHOLE response — dropping the
// offending answer and continuing would turn a fabrication into an
// INSUFFICIENT_INFORMATION, i.e. still silent (gate-vectors/README).
//
// Rules:
//  1. Every quote is a verbatim span of the redacted note (whitespace-normalised,
//     case-insensitive).
//  2. Every answered linkId is an item in one of the supplied Questionnaires;
//     every value type matches the item type.
//  3. Every answer carries the answer-evidence extension (LLM path).
//  4. No forbidden field anywhere (contract rule 14); no answer `status:"retrieved"`.
//  5. Every examSites[] id is in the supplied published list; every candidate
//     (requested:false) carries a quote; any quote present satisfies rule 1.
//  6. AD-17: no answer to an attestation-category indicator.
//  7. A truncated model response is a gate failure, not a sparse answer.

export const EVIDENCE_URL = "http://crr.health.nz/fhir/StructureDefinition/answer-evidence";

const FORBIDDEN_FIELDS = new Set([
  "verdict",
  "verdict_title",
  "verdict_summary",
  "priority",
  "criteria_page",
  "not_funded_flag",
  "met_criteria",
  "missing_criteria",
  "add_to_note",
  "suggested_wording",
  "interpreted_note",
  "notes",
  "note", // any free-text note on the envelope/QR is commentary the model must not emit (contract rule 14)
  "safety_alert",
  "redirect",
]);

// Exported: the route's QuestionnaireResponse builder (v3.0.1) uses the same
// item-type → value-key mapping and the same linkId index the gate validates
// against, so the built response and the gate cannot disagree on shape.
export const TYPE_TO_VALUE_KEY: Record<string, string> = {
  boolean: "valueBoolean",
  integer: "valueInteger",
  decimal: "valueDecimal",
  string: "valueString",
  choice: "valueCoding",
  "open-choice": "valueCoding",
  quantity: "valueQuantity",
  text: "valueString",
  date: "valueDate",
  dateTime: "valueDateTime",
};

export interface GateInput {
  response: any; // { examSites: [{id, requested, quote}], questionnaireResponse }
  redactedNote: string;
  questionnaires: any[]; // the supplied Questionnaires (national + selected sites)
  publishedExamSiteIds: string[];
  attestationLinkIds: Set<string>;
  truncated: boolean;
}

export interface GateResult {
  passed: boolean;
  failures: string[];
}

const normalise = (s: string) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

// linkId -> item type, over every supplied Questionnaire (union — AD-15).
export function buildItemIndex(questionnaires: any[]): Map<string, string> {
  const idx = new Map<string, string>();
  const walk = (items: any[]) => {
    for (const i of items || []) {
      if (i?.linkId && i.type && i.type !== "group") idx.set(i.linkId, i.type);
      if (Array.isArray(i?.item)) walk(i.item);
    }
  };
  for (const q of questionnaires) walk(q?.item ?? []);
  return idx;
}

function valueKeyOf(answer: any): string | null {
  for (const k of Object.keys(answer || {})) if (k.startsWith("value")) return k;
  return null;
}

function evidenceOf(answer: any): { status?: string; quote?: string } | null {
  const ext = (answer?.extension || []).find((e: any) => e.url === EVIDENCE_URL);
  if (!ext) return null;
  const sub: Record<string, any> = {};
  for (const s of ext.extension || []) {
    if (s.url === "status") sub.status = s.valueCode;
    if (s.url === "quote") sub.quote = s.valueString;
  }
  return sub;
}

// Deep scan for a forbidden key anywhere in the envelope.
function forbiddenFieldsIn(obj: any, path = "$"): string[] {
  const hits: string[] = [];
  if (obj && typeof obj === "object") {
    if (!Array.isArray(obj)) {
      for (const k of Object.keys(obj)) {
        if (FORBIDDEN_FIELDS.has(k)) hits.push(`${path}.${k}`);
        hits.push(...forbiddenFieldsIn(obj[k], `${path}.${k}`));
      }
    } else {
      obj.forEach((v, i) => hits.push(...forbiddenFieldsIn(v, `${path}[${i}]`)));
    }
  }
  return hits;
}

export function runGate(input: GateInput): GateResult {
  const failures: string[] = [];
  const note = normalise(input.redactedNote);
  const inNote = (q: unknown) => typeof q === "string" && q.length > 0 && note.includes(normalise(q));

  // 7. truncation
  if (input.truncated) failures.push("model response was truncated (stop reason max_tokens/length) — not a sparse answer");

  const resp = input.response;
  if (!resp || typeof resp !== "object") {
    return { passed: false, failures: ["response is not an object"] };
  }
  const qr = resp.questionnaireResponse;
  if (!qr || qr.resourceType !== "QuestionnaireResponse") {
    failures.push("response.questionnaireResponse is missing or not a QuestionnaireResponse");
  }

  // 4. forbidden fields anywhere
  for (const p of forbiddenFieldsIn(resp)) failures.push(`forbidden field present at ${p} (contract rule 14)`);

  const itemIndex = buildItemIndex(input.questionnaires);
  const publishedIds = new Set(input.publishedExamSiteIds);

  // Walk every answered leaf item.
  const walkAnswers = (items: any[]) => {
    for (const item of items || []) {
      if (Array.isArray(item?.item)) walkAnswers(item.item);
      if (!Array.isArray(item?.answer)) continue;
      const linkId: string = item.linkId;

      // 6. AD-17 — attestation category
      if (input.attestationLinkIds.has(linkId)) {
        failures.push(`answer to attestation-category indicator "${linkId}" (AD-17 — the model must not answer these)`);
      }

      // 2. linkId resolves + type match
      const itemType = itemIndex.get(linkId);
      if (!itemType) {
        failures.push(`unknown linkId "${linkId}" — not an item in any supplied Questionnaire (contract rule 2)`);
      }

      for (const answer of item.answer) {
        const vk = valueKeyOf(answer);
        if (itemType) {
          const expected = TYPE_TO_VALUE_KEY[itemType];
          if (expected && vk && vk !== expected) {
            failures.push(`type mismatch on "${linkId}": item is ${itemType} (expects ${expected}) but answer uses ${vk} (contract rule 2)`);
          }
        }

        // 3. evidence extension present
        const ev = evidenceOf(answer);
        if (!ev) {
          failures.push(`answer on "${linkId}" has no answer-evidence extension (contract rule 3)`);
          continue;
        }
        // 4. no model-path "retrieved"
        if (ev.status === "retrieved") {
          failures.push(`answer on "${linkId}" is status "retrieved" — the model never produces retrieved (contract rule 4)`);
        }
        // 1. quote in note
        if (!inNote(ev.quote)) {
          failures.push(`quote for "${linkId}" (${JSON.stringify(ev.quote)}) is not a verbatim span of the redacted note (contract rule 1)`);
        }
      }
    }
  };
  if (qr && Array.isArray(qr.item)) walkAnswers(qr.item);

  // 5. examSites[]
  const examSites = Array.isArray(resp.examSites) ? resp.examSites : [];
  if (!examSites.length) failures.push("response.examSites is missing or empty (contract rule 5 / §10)");
  for (const e of examSites) {
    if (!publishedIds.has(e?.id)) failures.push(`examSites entry "${e?.id}" is not in the supplied published exam/site list (contract rule 5)`);
    if (e?.requested === false && !e?.quote) failures.push(`examSites candidate "${e?.id}" carries no quote (contract rule 5 / §10)`);
    if (e?.quote && !inNote(e.quote)) failures.push(`examSites quote for "${e?.id}" (${JSON.stringify(e.quote)}) is not in the redacted note (contract rule 5)`);
  }

  return { passed: failures.length === 0, failures };
}
