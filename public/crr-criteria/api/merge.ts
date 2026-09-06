// ══════════════════════════════════════════════════════════════
//  ARCH-MIG-01 slice 5 — merge: one QuestionnaireResponse from four sources
// ══════════════════════════════════════════════════════════════
//
// The pipeline (`POST /api/assess`) gathers answers from up to four places and
// has to produce ONE QuestionnaireResponse for the engine (AD-15). This module
// does only that join. It has no criteria logic (invariant 3): it never decides
// what an answer means, only which source's answer for a linkId wins and what
// disagreed.
//
// Sources, lowest precedence first:
//   1. extracted  — the validated QuestionnaireResponse from the extraction gate
//                   (gate.ts). Answers carry the answer-evidence extension
//                   (status documented|inferred, quote).
//   2. context    — structured values the calling application already holds
//                   (age, sex, ageMonths, and lab entries the caller has already
//                   mapped to linkIds — gap analysis §3). `status: documented`,
//                   NO evidence extension. Context overrides extracted for the
//                   same linkId (contract / TA-005).
//   3. attested   — attestations for attestation-category indicators (AD-17).
//                   `status: documented` plus an evidence sub-extension
//                   { source, attestedBy }. Two modes, distinguished in `source`:
//                     'referrer-attestation'  — the referrer attests (referrer view)
//                     'triager-from-referral' — the triager answers from the letter
//                   No new status value; the engine is unchanged.
//   4. retrieved  — the population stage (slice 8). INTERFACE ONLY here:
//                   `POPULATION_ENABLED` is off, so `population` is a typed no-op.
//
// Precedence per the extraction contract, extended with `attested`:
//   retrieved  ›  attested  ›  context  ›  documented  ›  inferred
// Every time a higher-precedence source supersedes a linkId a lower one also
// answered, it is recorded in `discrepancies[]` with both values, statuses and
// sources. Nothing is silently dropped (contract §"Validation gate" rule 6 in
// spirit; gap analysis §3).

export const ANSWER_EVIDENCE_EXT_URL = "http://crr.health.nz/fhir/StructureDefinition/answer-evidence";
export const ADMIN_GENDER_SYSTEM = "http://hl7.org/fhir/administrative-gender";

export type Provenance = "extracted" | "context" | "attested" | "retrieved";

// Higher wins. `inferred` extracted answers rank below `documented` extracted
// answers, but the extraction QR only ever carries one answer per linkId, so the
// split matters only for the discrepancy record's readability, not for the join.
const PROVENANCE_RANK: Record<Provenance, number> = {
  extracted: 1,
  context: 2,
  attested: 3,
  retrieved: 4,
};

export interface MergeContext {
  age?: number;
  ageMonths?: number;
  sex?: string;
  // Lab / structured values the calling application holds. An entry is used only
  // when it carries a `linkId` — the lab-name → linkId table is a governed
  // artefact this slice does not author (TA-005, "labs mapping new"); an entry
  // without a linkId is skipped and listed in `unmappedContext`.
  labs?: Array<{ linkId?: string; name?: string; value?: unknown; unit?: string; flag?: string }>;
}

export type AttestationMode = "referrer" | "triager";

export interface Attestation {
  value: boolean;
  attestedBy: string;
  // 'referrer' (default) — the referrer attests; 'triager' — the triager answers
  // from the referral letter. Recorded in the evidence sub-extension `source` as
  // 'referrer-attestation' / 'triager-from-referral'. The extraction model never
  // answers these items in either mode (AD-17).
  mode?: AttestationMode;
}

export const ATTESTATION_SOURCE: Record<AttestationMode, string> = {
  referrer: "referrer-attestation",
  triager: "triager-from-referral",
};

// Slice 8. Declared so the pipeline route's signature is stable; the field is a
// no-op until `POPULATION_ENABLED` and the population stage land.
export interface PopulationAnswers {
  readonly enabled?: false;
  readonly answers?: readonly never[];
}

export interface MergeInput {
  extractedResponse: any;
  context?: MergeContext;
  attestations?: Record<string, Attestation>;
  // The vocabulary's `attestationIndicators` (AD-17). Category linkIds are set
  // ONLY from `attestations`; the merge asserts the extractor did not answer one
  // (the gate already rejects that — this is a guard, not a second handler).
  attestationLinkIds: Iterable<string>;
  // linkId -> FHIR item type, from gate.buildItemIndex over the same
  // Questionnaires. Used to pick the value key when emitting the merged QR.
  itemIndex: Map<string, string>;
  population?: PopulationAnswers;
  subjectReference?: string;
}

export interface DiscrepancySide {
  value: unknown;
  status: string;
  provenance: Provenance;
}

export interface Discrepancy {
  linkId: string;
  kept: DiscrepancySide;
  superseded: DiscrepancySide;
  valuesMatch: boolean;
}

export interface MergeResult {
  questionnaireResponse: any;
  discrepancies: Discrepancy[];
  attestationsApplied: Array<{ linkId: string; value: unknown; attestedBy: string; mode: AttestationMode }>;
  unmappedContext: Array<{ name?: string; reason: string }>;
}

const TYPE_TO_VALUE_KEY: Record<string, string> = {
  boolean: "valueBoolean",
  integer: "valueInteger",
  decimal: "valueDecimal",
  string: "valueString",
  text: "valueString",
  choice: "valueCoding",
  "open-choice": "valueCoding",
  quantity: "valueQuantity",
  date: "valueDate",
  dateTime: "valueDateTime",
};

interface Candidate {
  linkId: string;
  value: unknown;
  status: "documented" | "inferred";
  provenance: Provenance;
  quote?: string;
  attestedBy?: string;
  attestationMode?: AttestationMode;
}

// ── read the extracted QuestionnaireResponse into flat candidates ──────────────
function candidatesFromExtracted(qr: any): Candidate[] {
  const out: Candidate[] = [];
  const walk = (items: any[]) => {
    for (const item of items || []) {
      if (Array.isArray(item?.item)) walk(item.item);
      if (!Array.isArray(item?.answer) || !item.linkId) continue;
      const answer = item.answer[0] || {};
      const valueKey = Object.keys(answer).find((k) => k.startsWith("value"));
      let value: unknown = valueKey ? answer[valueKey] : undefined;
      if (value && typeof value === "object" && "code" in (value as any)) value = (value as any).code;
      const ev = (answer.extension || []).find((e: any) => e.url === ANSWER_EVIDENCE_EXT_URL);
      let status: "documented" | "inferred" = "documented";
      let quote: string | undefined;
      for (const s of ev?.extension || []) {
        if (s.url === "status" && (s.valueCode === "documented" || s.valueCode === "inferred")) status = s.valueCode;
        if (s.url === "quote" && typeof s.valueString === "string") quote = s.valueString;
      }
      out.push({ linkId: item.linkId, value, status, provenance: "extracted", quote });
    }
  };
  walk(qr?.item ?? []);
  return out;
}

function candidatesFromContext(ctx: MergeContext | undefined, unmapped: MergeResult["unmappedContext"]): Candidate[] {
  const out: Candidate[] = [];
  if (!ctx) return out;
  if (typeof ctx.age === "number") out.push({ linkId: "patient.age", value: ctx.age, status: "documented", provenance: "context" });
  if (typeof ctx.ageMonths === "number") out.push({ linkId: "patient.ageMonths", value: ctx.ageMonths, status: "documented", provenance: "context" });
  if (typeof ctx.sex === "string" && ctx.sex) out.push({ linkId: "patient.sex", value: ctx.sex, status: "documented", provenance: "context" });
  for (const lab of ctx.labs || []) {
    if (typeof lab?.linkId === "string" && lab.linkId && lab.value !== undefined && lab.value !== null) {
      out.push({ linkId: lab.linkId, value: lab.value, status: "documented", provenance: "context" });
    } else {
      unmapped.push({ name: lab?.name, reason: lab?.linkId ? "no value" : "no linkId — caller must map lab name to a linkId (TA-005)" });
    }
  }
  return out;
}

function candidatesFromAttestations(
  attestations: Record<string, Attestation> | undefined,
  attestationLinkIds: Set<string>,
  applied: MergeResult["attestationsApplied"],
): Candidate[] {
  const out: Candidate[] = [];
  for (const [linkId, att] of Object.entries(attestations || {})) {
    if (!att || typeof att.value !== "boolean" || typeof att.attestedBy !== "string" || !att.attestedBy) continue;
    if (!attestationLinkIds.has(linkId)) {
      // Only category indicators are attested. A non-category linkId in the
      // attestations map is a caller error — ignore it rather than let a
      // referrer tick set an arbitrary indicator.
      continue;
    }
    const mode: AttestationMode = att.mode === "triager" ? "triager" : "referrer";
    out.push({ linkId, value: att.value, status: "documented", provenance: "attested", attestedBy: att.attestedBy, attestationMode: mode });
    applied.push({ linkId, value: att.value, attestedBy: att.attestedBy, mode });
  }
  return out;
}

// ── emit one answer object for the merged QR ──────────────────────────────────
function answerObject(c: Candidate, itemType: string | undefined): any {
  const valueKey = (itemType && TYPE_TO_VALUE_KEY[itemType]) || "valueString";
  const obj: any =
    valueKey === "valueCoding"
      ? { valueCoding: { system: ADMIN_GENDER_SYSTEM, code: String(c.value) } }
      : { [valueKey]: c.value };

  if (c.provenance === "context") return obj; // structured input — no evidence extension (engine treats as documented)

  const sub: any[] = [{ url: "status", valueCode: c.status }];
  if (c.provenance === "attested") {
    sub.push({ url: "source", valueCode: ATTESTATION_SOURCE[c.attestationMode ?? "referrer"] });
    if (c.attestedBy) sub.push({ url: "attestedBy", valueString: c.attestedBy });
  } else if (c.provenance === "extracted" && typeof c.quote === "string") {
    sub.push({ url: "quote", valueString: c.quote });
  }
  obj.extension = [{ url: ANSWER_EVIDENCE_EXT_URL, extension: sub }];
  return obj;
}

export function merge(input: MergeInput): MergeResult {
  const attestationLinkIds = new Set<string>(input.attestationLinkIds);
  const discrepancies: Discrepancy[] = [];
  const attestationsApplied: MergeResult["attestationsApplied"] = [];
  const unmappedContext: MergeResult["unmappedContext"] = [];

  const extracted = candidatesFromExtracted(input.extractedResponse);

  // Guard (not a second handler): the gate rejects any extractor answer to an
  // attestation-category indicator, so one must never reach here.
  const leaked = extracted.filter((c) => attestationLinkIds.has(c.linkId));
  if (leaked.length) {
    throw new Error(
      `merge: extracted response answers attestation-category indicator(s) ${leaked
        .map((c) => c.linkId)
        .join(", ")} — the extraction gate must have rejected this (AD-17)`,
    );
  }

  const context = candidatesFromContext(input.context, unmappedContext);
  const attested = candidatesFromAttestations(input.attestations, attestationLinkIds, attestationsApplied);
  // retrieved: population stage (slice 8) — no-op.
  const retrieved: Candidate[] = [];

  // Merge in ascending precedence; a higher-rank source overwrites and records a
  // discrepancy against whatever it superseded.
  const merged = new Map<string, Candidate>();
  for (const source of [extracted, context, attested, retrieved]) {
    for (const c of source) {
      const existing = merged.get(c.linkId);
      if (existing && PROVENANCE_RANK[c.provenance] > PROVENANCE_RANK[existing.provenance]) {
        discrepancies.push({
          linkId: c.linkId,
          kept: { value: c.value, status: c.status, provenance: c.provenance },
          superseded: { value: existing.value, status: existing.status, provenance: existing.provenance },
          valuesMatch: String(existing.value) === String(c.value),
        });
      }
      if (!existing || PROVENANCE_RANK[c.provenance] >= PROVENANCE_RANK[existing.provenance]) {
        merged.set(c.linkId, c);
      }
    }
  }

  // Emit grouped by linkId prefix (matches buildQuestionnaireResponse and how the
  // engine reads the QR).
  const groups = new Map<string, any[]>();
  for (const c of merged.values()) {
    const groupId = c.linkId.split(".")[0];
    if (!groups.has(groupId)) groups.set(groupId, []);
    groups.get(groupId)!.push({ linkId: c.linkId, answer: [answerObject(c, input.itemIndex.get(c.linkId))] });
  }

  const questionnaireResponse = {
    resourceType: "QuestionnaireResponse",
    questionnaire: "http://crr.health.nz/fhir/Questionnaire/CRR-National",
    status: "completed",
    subject: { reference: input.subjectReference || "Patient/assessed" },
    item: [...groups.entries()].map(([linkId, item]) => ({ linkId, item })),
  };

  return { questionnaireResponse, discrepancies, attestationsApplied, unmappedContext };
}
