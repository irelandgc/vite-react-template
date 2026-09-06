// ══════════════════════════════════════════════════════════════
//  ARCH-MIG-01 slice 4b — extraction prompt assembly
// ══════════════════════════════════════════════════════════════
//
// `prompt-v3.0.2.json` is canonical (the .md is a rendering of it; `npm run
// check` fails if they drift). The service joins `parts[].text` with a blank
// line and sends the result as the SYSTEM prompt, and passes `outputTool` as the
// sole tool with a forced `tool_choice`. Everything else is supplied per request
// in the USER slot and never baked in (invariant 3):
//   - the PII-redacted note (the only attacker-influenced content — kept last,
//     furthest from the instructions, and never cached)
//   - the national Questionnaire + one Questionnaire per selected exam/site,
//     loaded by version from the registry, ITEMS ONLY (no criteria text)
//   - the published exam/site list — ids and titles only (from `exam_sites`)
//   - a context block: age / sex / labs the calling application already holds
//
// The model returns a `submit_extraction` tool call: a flat list of answers
// `{ linkId, value, status, quote }` plus `examSites[]` (v3.0.2). The route builds
// the FHIR QuestionnaireResponse and the answer-evidence extensions from that
// list — the model no longer hand-writes FHIR (SR-09, prompt-v3.0.2.md).
//
// Attestation-category items (AD-17) are stripped from the Questionnaires here
// so the model is never shown them and cannot answer them; the referrer answers
// them directly in the Triage Advisor (slice 5). The gate rejects one anyway.

import promptV3 from "../../../tooling/criteria-bundle/extraction/prompt-v3.0.2.json";
import indicatorVocab from "../../../tooling/criteria-bundle/vocabulary/indicators.json";
import type { ContentBlock } from "./provider";

export const PROMPT_VERSION: string = (promptV3 as any).version;
export const EQUIVALENCE_LIST_VERSION: string = (promptV3 as any).equivalenceListVersion;
export const CONTRACT_VERSION: string = (promptV3 as any).contractVersion;

// The output tool (v3.0.2). Passed to the provider as the sole tool with a forced
// tool_choice; its input_schema pins the shape (linkId/value/status/quote all
// required, status enum, additionalProperties:false).
export const OUTPUT_TOOL: { name: string; description: string; input_schema: any } = (promptV3 as any).outputTool;

// Startup health check (KI-28): the prompt must load and parse, or the module —
// and therefore every route that imports it — fails visibly. No fallback prompt
// (`FALLBACK_INSTRUCTION_TEXT` is retired; prompt-v3.0.2.md "What is deliberately
// not in it").
if (!PROMPT_VERSION || !EQUIVALENCE_LIST_VERSION || !Array.isArray((promptV3 as any).parts) || !(promptV3 as any).parts.length) {
  throw new Error("extraction prompt failed to load — prompt-v3.0.2.json is missing version, equivalenceListVersion or parts[]");
}
if (!OUTPUT_TOOL || !OUTPUT_TOOL.name || !OUTPUT_TOOL.input_schema) {
  throw new Error("extraction prompt failed to load — prompt-v3.0.2.json is missing outputTool.name / outputTool.input_schema");
}

// AD-17 — the indicators the extraction model must never answer. Read from the
// vocabulary (`attestationIndicators`); the service strips these from the
// Questionnaires it sends the model and the gate rejects any answer to one.
export const ATTESTATION_LINK_IDS: string[] = (indicatorVocab as any).attestationIndicators ?? [];
export const NATIONAL_QUESTIONNAIRE_URL = "http://crr.health.nz/fhir/Questionnaire/CRR-National";

// The base system prompt: parts joined with a blank line (prompt-v3.0.0.md
// "How it is assembled"). Deterministic — no per-request content.
export function assembleSystemPrompt(): string {
  const parts = (promptV3 as any).parts as { text: string }[];
  return parts.map((p) => p.text).join("\n\n");
}

export interface ExamSiteListEntry {
  id: string;
  title: string;
}

export interface AssessmentContext {
  age?: number;
  ageMonths?: number;
  sex?: string;
  labs?: { name: string; value?: string | number; unit?: string; flag?: string }[];
}

// Removes any item whose linkId is in `attestationLinkIds`, recursively. Returns
// a deep-ish copy safe to serialise (the input registry object is not mutated).
export function stripAttestationItems(questionnaire: any, attestationLinkIds: Set<string>): any {
  function walk(items: any[]): any[] {
    const out: any[] = [];
    for (const item of items || []) {
      if (item.linkId && attestationLinkIds.has(item.linkId)) continue;
      const copy = { ...item };
      if (Array.isArray(item.item)) copy.item = walk(item.item);
      out.push(copy);
    }
    return out;
  }
  return { ...questionnaire, item: walk(questionnaire.item) };
}

function contextBlock(ctx: AssessmentContext): string {
  const lines: string[] = [];
  // Only the demographic items the caller actually supplies are off-limits to the
  // model (prompt v3.0.2, EVIDENCE rule 8). A supplied lab does NOT suppress
  // age/sex — the model still extracts those so the calling application can
  // pre-fill and the referrer can confirm them (merge.ts then lets a confirmed
  // context value override, recording a discrepancy).
  const suppress: string[] = [];
  if (ctx.age != null) { lines.push(`age (years): ${ctx.age}`); suppress.push("patient.age"); }
  if (ctx.ageMonths != null) { lines.push(`age (months): ${ctx.ageMonths}`); suppress.push("patient.ageMonths"); }
  if (ctx.sex) { lines.push(`sex: ${ctx.sex}`); suppress.push("patient.sex"); }
  if (ctx.labs?.length) {
    for (const l of ctx.labs) {
      const v = [l.value, l.unit].filter((x) => x != null && x !== "").join(" ");
      lines.push(`lab ${l.name}: ${v || "(no value)"}${l.flag ? ` [${l.flag}]` : ""}`);
    }
  }
  if (!lines.length) return "CONTEXT: none supplied by the calling application. Answer patient.age / patient.sex from the note where it states them (documented, with a quote).";
  const suppressLine = suppress.length
    ? `Do NOT answer ${suppress.join(" / ")} from this — the calling application holds ${suppress.length > 1 ? "those values" : "that value"}. `
    : "";
  return (
    `CONTEXT — supplied by the calling application, already recorded. ${suppressLine}Use the labs only for reasoning. Answer any demographic item NOT listed here from the note (documented, with a quote).\n` +
    lines.join("\n")
  );
}

export interface UserContentInput {
  redactedNote: string;
  // national Questionnaire first, then one per selected exam/site — items already
  // stripped of attestation items by the caller.
  questionnaires: any[];
  examSiteList: ExamSiteListEntry[];
  context: AssessmentContext;
}

// The user message as Anthropic content blocks. The stable bulk (Questionnaires,
// exam list, context) is one cache-controlled block; the note is a separate,
// uncached, trailing block (PROMPT_DECISION_RECORD §5).
export function assembleUserContent(input: UserContentInput): ContentBlock[] {
  const examList =
    "PUBLISHED EXAM/SITE LIST (ids and titles only):\n" +
    input.examSiteList.map((e) => `${e.id}\t${e.title}`).join("\n");

  const questionnaires =
    "QUESTIONNAIRES (answer items against these; a linkId shared between them is answered once):\n" +
    input.questionnaires.map((q) => JSON.stringify(q)).join("\n\n");

  const stable = [questionnaires, examList, contextBlock(input.context)].join("\n\n---\n\n");

  return [
    { type: "text", text: stable, cache_control: { type: "ephemeral" } },
    { type: "text", text: "REFERRAL NOTE (redacted):\n" + input.redactedNote },
  ];
}

// The four criteria-content shapes `check` (AD-16) forbids in the prompt body —
// mirrored here so the RUNTIME assembly is held to the same rule, not just the
// static json. A worker test runs this over `assembleSystemPrompt()`.
export const CRITERIA_CONTENT_PATTERNS: [string, RegExp][] = [
  ["a numeric threshold", /\b(more than|greater than|less than|at least|≥|>=)\s*\d/i],
  ["a priority code", /\bP[1-4]\b|\bAcute 48\s?hr\b/],
  ["a named analyte", /\b(ALP|GGT|bilirubin|ferritin|Ca-?125|D-dimer|eGFR|creatinine)\b/i],
  ["a redirect destination", /\b(ED|111|ACC|emergency department)\b/],
];

// Returns any criteria-content leak found in `text`. `forbiddenTitles` are
// PlanDefinition action titles (which must not appear verbatim in the prompt).
export function findCriteriaLeaks(text: string, forbiddenTitles: string[] = []): string[] {
  const leaks: string[] = [];
  for (const [label, re] of CRITERIA_CONTENT_PATTERNS) {
    const m = text.match(re);
    if (m) leaks.push(`${label}: "${m[0]}"`);
  }
  const hay = text.toLowerCase();
  for (const t of forbiddenTitles) {
    const needle = String(t || "").trim().toLowerCase();
    if (needle.length > 12 && hay.includes(needle)) leaks.push(`PlanDefinition action title: "${t}"`);
  }
  return leaks;
}
