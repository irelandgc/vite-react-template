// ══════════════════════════════════════════════════════════════
//  ARCH-MIG-01 slice 5 — attestation questions (AD-17 / AD-23)
// ══════════════════════════════════════════════════════════════
//
// Attestation-category indicators (AD-17) rest on the referrer's judgement, not
// on a fact stated in the note. The extraction model NEVER answers them (the
// gate rejects any answer; the extraction service strips them from the
// Questionnaires it sends the model). Instead the Triage page asks an explicit
// question and records the answer with the assessment (merge.ts `attested`).
//
// AD-23: each such indicator has TWO wordings, one per role-aware view:
//   referrer — the referrer attests
//              ("Does this referral follow full clinical assessment, with a
//               strong suspicion of malignancy?")
//   triager  — the triager answers from the referral letter
//              ("Does the referral state a strong suspicion of malignancy
//               following full clinical assessment?")
// The audit record distinguishes the two in the evidence sub-extension `source`
// ('referrer-attestation' / 'triager-from-referral', merge.ts).
//
// The wordings live on the versioned vocabulary (`attestationWording`), stamped
// on every assessment as `vocabularyVersion` — the renderer takes them from
// there, never from page code (invariant 3). When a site bundle is next
// republished the wording rides into its Questionnaire item as an extension;
// until then the vocabulary is the versioned source.

import indicatorVocab from "../../../tooling/criteria-bundle/vocabulary/indicators.json";

export const VOCABULARY_VERSION: string = (indicatorVocab as any).version;

const ATTESTATION_IDS: Set<string> = new Set((indicatorVocab as any).attestationIndicators ?? []);
const BY_LINKID: Map<string, any> = new Map(
  ((indicatorVocab as any).indicators ?? []).map((i: any) => [i.linkId, i]),
);

export interface AttestationQuestion {
  linkId: string;
  text: string; // the canonical published words (vocabulary text)
  wording: { referrer: string; triager: string };
  sourcePages: string[];
}

// Collects every attestation-category linkId that appears on any of the supplied
// Questionnaires (pass the UN-stripped Questionnaires), with its two mode
// wordings. `forBundleKeys` narrows the source-page list to the relevant site(s).
export function attestationQuestionsFor(questionnaires: any[], forBundleKeys?: string[]): AttestationQuestion[] {
  const present = new Set<string>();
  const walk = (items: any[]) => {
    for (const i of items || []) {
      if (i?.linkId) present.add(i.linkId);
      if (Array.isArray(i?.item)) walk(i.item);
    }
  };
  for (const q of questionnaires) walk(q?.item ?? []);

  const out: AttestationQuestion[] = [];
  for (const linkId of ATTESTATION_IDS) {
    if (!present.has(linkId)) continue;
    const ind = BY_LINKID.get(linkId);
    const w = ind?.attestationWording;
    if (!w?.referrer || !w?.triager) continue; // check-consistency guarantees this in a valid build
    const pages = (ind.sites ?? [])
      .filter((s: any) => !forBundleKeys || forBundleKeys.includes(s.examSite))
      .map((s: any) => s.page)
      .filter(Boolean);
    out.push({
      linkId,
      text: ind.text,
      wording: { referrer: w.referrer, triager: w.triager },
      sourcePages: [...new Set<string>(pages)],
    });
  }
  return out.sort((a, b) => a.linkId.localeCompare(b.linkId));
}
