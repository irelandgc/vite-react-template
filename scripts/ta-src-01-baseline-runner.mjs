#!/usr/bin/env node
// TA-SRC-01 Baseline Runner — deployment-gate artefact
// Node.js ES module (Node 18+, built-in fetch)
//
// Captures a baseline run of the full 30-case regression suite against the
// CURRENT production state (v2.3.0 prompt, current model, current match-data
// criteria source) BEFORE the TA-SRC-01 criteria-source switch. Per
// instructions/ta-src-01-brief.md and instructions/ta-src-design.md §8/§9,
// the switch must not deploy until this baseline exists.
//
// Adapted from scripts/reg02-runner.mjs — same Worker-API routing, prompt
// verification, checkpointing, override, and fabrication-grading logic.
// Differences from REG02 (single-config, not A/B):
//   - One config only: v2.3.0 prompt (the only prompt version this baseline
//     cares about — no v2.2.0 comparison, no admin key required).
//   - Distinct run-ID format: reg_baseline_ta-src-01_YYYYMMDD_NN.
//   - Distinct checkpoint/results filenames, derived from the run ID, so
//     they cannot be confused with reg02-*.
//   - Results file carries an explicit gate-artefact header and a coverage
//     note (see COVERAGE_NOTE below).
//
// Usage:
//   node scripts/ta-src-01-baseline-runner.mjs [--dry-run] [--source match-data|published]
//
// --dry-run          Run 3 synthetic cases only (9 API calls, 3 runs each).
//                     Proves D1 tagging, checkpoint resume, and override logic
//                     before the full 90-call run.
// --source           match-data (default) builds the LLM block from
//                     GET /api/match-data via buildCriteriaBlock() — the
//                     CURRENT production source, pre-switch. published builds
//                     it from GET /api/criteria via buildCriteriaBlockV2()
//                     (ta-src-design.md §4) — the POST-switch target. Per §9,
//                     the cutover decision compares a match-data run and a
//                     published run captured on the SAME day (paired run) —
//                     a match-data baseline from an earlier day is a temporal
//                     anchor only, not itself the switch measurement (the
//                     model behind claude-sonnet-4-6 is an alias with no
//                     dated snapshot and can drift day to day — see
//                     borderlineNote).
//
// Checkpoint: scripts/<runId>-checkpoint.json
//   Saved after every successful API call. On restart, skips completed tuples.
//   Key: "{caseId}|r{run}"

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Constants ─────────────────────────────────────────────────────────────────

const ASSESS_URL       = 'https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/triage/assess';
const USAGE_LOG_URL    = 'https://crr-criteria-api.fk4dsrmq5r.workers.dev/api/triage/usage-log';
const API_BASE         = 'https://crr-criteria-api.fk4dsrmq5r.workers.dev/api';
const MODEL            = 'claude-sonnet-4-6';
const TEMPERATURE      = 0.1;
const MAX_TOKENS       = 2400;
const RATE_LIMIT_MS    = 125_000; // 125s between calls → ~28.8/hr, safely under the 30/hr cap
const RUNS_PER_CASE    = 3;       // stability check — a 1-run baseline can't separate switch
                                   // effects from run-to-run noise (see REG02 DG-005 instability)
const SPREADSHEET_FILE = path.join(ROOT, 'documents', 'CRR_Test_Case_Results_Matrix_v2.xlsx');
const RUN_DATE          = new Date().toISOString().slice(0, 10).replace(/-/g, '');

const IS_DRY_RUN = process.argv.includes('--dry-run');

// --source published|match-data (default match-data). See ta-src-design.md §9:
// "the runner needs one addition: a --source published mode... Same cases,
// same prompt version, same model, same worker endpoint."
const SOURCE_ARG_IDX = process.argv.indexOf('--source');
const SOURCE = SOURCE_ARG_IDX !== -1 ? process.argv[SOURCE_ARG_IDX + 1] : 'match-data';
if (SOURCE !== 'match-data' && SOURCE !== 'published') {
  console.error(`ERROR: --source must be "match-data" or "published", got "${SOURCE}".`);
  process.exit(1);
}

const COVERAGE_NOTE = '12 of the 14 previously-invisible sites (ct_other, us_fna_biopsy, '
  + 'xr_femur, xr_forearm, xr_humerus, xr_tibia_fibula + 6 paediatric) have no case in this '
  + 'suite. Post-switch predictions are pre-registered only for RP-007/INT-002 and RP-001 per '
  + 'ta-src-design.md §9. This baseline\'s silence on the other 12 sites is not evidence of '
  + 'anything — those sites were never assessed under either source in this suite. Adding '
  + 'cases for them is deferred to the synthetic-case batch pending clinical sign-off.';

function gateArtefactNote(source) {
  const sourceClause = source === 'published'
    ? 'Post-switch comparator run against the PUBLISHED criteria source (buildCriteriaBlockV2, ta-src-design.md §4) — the paired half of the TA-SRC-01 cutover measurement'
    : 'Baseline captured against the CURRENT criteria source (match-data blob, pre-switch) so the post-switch run can be diffed against it';
  return `TA-SRC-01 deployment gate. ${sourceClause}. Do not confuse with `
    + 'scripts/reg02-results.json (TA-REG-02), which measures prompt version × override '
    + 'contribution, not criteria source.';
}

const CRITERIA_COVERAGE = {
  adultSites: 25, adultItems: 247,
  paedCombinations: 14, paedItems: 89,
  combinedBlobSites: 39, combinedBlobItems: 336,
  note: 'This baseline\'s LLM criteria block loads only the adult site index '
    + '(25 sites / 247 items) — buildCriteriaBlock() is always called with isPaed=false '
    + 'because all 30 suite cases are adult, matching production\'s per-assessment '
    + 'SITE_INDEX-vs-PAED_INDEX selection. The paediatric index (14 combinations / 89 items) '
    + 'was never loaded by this run — no suite case triggers it. The "39 sites / 336 items" '
    + 'figure cited elsewhere (e.g. ta-src-phase0-findings.md) is the combined adult+paediatric '
    + 'match-data blob; this baseline exercised only its adult half.',
};

const REG02_KEY_SHAPE_NOTE = 'scripts/reg02-results.json\'s cases object has flat '
  + '{caseId}|{config}|{run} checkpoint keys mixed in alongside the aggregated {caseId} '
  + 'keys (210 entries for 30 cases) — the same aliasing bug this baseline runner\'s '
  + 'aggregation had until it was fixed here. REG02 is an accepted, cited artefact and was '
  + 'not regenerated (would change cited bytes for no informational gain) — expect that key '
  + 'shape there. This file\'s cases object contains only clean {caseId} keys.';

const BORDERLINE_NOTE = 'Two cases show pre-existing run-to-run instability under the '
  + 'CURRENT source, with no confirmed cause: INT-AKI (declined/proceeds/proceeds — '
  + 'previously flagged in TA-REG-02) and CR-002 (proceeds/proceeds/declined — newly '
  + 'observed in this run). Any verdict change on these two cases in the post-switch run '
  + 'must be evaluated against this baseline instability, not assumed attributable to the '
  + 'criteria-source switch. Separately, DG-003 and INT-001 show cross-run divergence '
  + 'between REG02-B (22 Jun) and this baseline (12 Jul) under a nominally identical '
  + 'config — environment/model drift, not switch-attributable; this baseline (12 Jul) is '
  + 'the sole comparator for the post-switch diff. claude-sonnet-4-6 is an alias with no '
  + 'dated snapshot; the model behind it can change without notice (consistent with the '
  + 'DG-003/INT-001 cross-run divergence). Therefore the authoritative switch measurement '
  + 'is the same-day paired run at cutover (see §9 --source modes); this baseline serves '
  + 'as the temporal anchor.';

const PUBLISHED_SOURCE_NOTE = 'This run used --source published: the LLM criteria block was '
  + 'built by buildCriteriaBlockV2() (ported per ta-src-design.md §4) from GET /api/criteria, '
  + 'not the match-data blob. Same case set, same prompt version, same model, same worker '
  + 'endpoint as the match-data baseline — the only variable is the criteria source. Compare '
  + 'against a match-data-sourced run captured on the SAME day for the TA-SRC-01 cutover '
  + 'decision; a match-data run from a different day conflates the source switch with '
  + 'ordinary model/environment drift (see borderlineNote).';

// ── 3 synthetic dry-run cases (shared with TA-REG-02) ─────────────────────────

const DRY_RUN_CASES = [
  {
    id: 'INT-SAH',
    group: 'INT',
    exam: 'CT Head',
    expected: 'declined — ED redirect (suspected SAH)',
    note: '44yo woman, sudden severe occipital headache that hit maximum intensity within seconds while exercising ~2 hours ago. Describes "worst headache of my life." Associated vomiting, neck stiffness, photophobia. Pain persistent. No prior similar.',
    synthetic: true,
  },
  {
    id: 'INT-TORSION',
    group: 'INT',
    exam: 'US Scrotum',
    expected: 'declined — ED redirect (suspected torsion)',
    note: '18yo man, sudden onset severe L testicular pain 3 hours ago, woke him from sleep. Associated nausea and vomiting. O/E: testis high-riding and exquisitely tender, cremasteric reflex absent.',
    synthetic: true,
  },
  {
    id: 'INT-AKI',
    group: 'INT',
    exam: 'Renal US',
    expected: 'proceeds (acute renal deterioration) + safety alert',
    note: '72yo man, 1/52 malaise and reduced urine output. New AKI — eGFR 8, baseline 62 three months ago. No catheter, no obvious precipitant, not on nephrotoxics. BP 158/94, otherwise obs stable.',
    synthetic: true,
  },
];

// ── Borderline cases (from TA-REG-02 brief §Part 4 — mark REVIEW, not pass/fail) ─

const BORDERLINE_CASE_IDS = new Set(['RP-004', 'RP-006', 'INT-AKI', 'EQ-002', 'DG-005', 'CR-002']);

// ── Run-ID resolution ─────────────────────────────────────────────────────────
// Format: reg_baseline_ta-src-01_YYYYMMDD_NN (match-data, unchanged) or
// reg_baseline_ta-src-01_published_YYYYMMDD_NN (--source published, kept out
// of the match-data NN sequence so the two sources never collide). Resumes an
// in-progress NN for today if its checkpoint isn't yet complete; otherwise
// picks the next unused NN so a completed run is never overwritten.

function resolveRunId(totalCalls, source) {
  const prefix = source === 'published'
    ? `reg_baseline_ta-src-01_published_${RUN_DATE}_`
    : `reg_baseline_ta-src-01_${RUN_DATE}_`;
  for (let nn = 1; nn <= 99; nn++) {
    const id = `${prefix}${String(nn).padStart(2, '0')}`;
    const cpFile = path.join(__dirname, `${id}-checkpoint.json`);
    if (!existsSync(cpFile)) return id;
    try {
      const cp = JSON.parse(readFileSync(cpFile, 'utf8'));
      const doneCount = Object.keys(cp.results || {}).length;
      if (doneCount < totalCalls) return id; // in-progress — resume this NN
    } catch {
      return id; // unreadable checkpoint — treat as usable/fresh
    }
  }
  throw new Error('Too many baseline runs for today (NN exhausted at 99).');
}

// ── Checkpoint ────────────────────────────────────────────────────────────────

function loadCheckpoint(checkpointFile) {
  if (!existsSync(checkpointFile)) return { results: {} };
  try {
    return JSON.parse(readFileSync(checkpointFile, 'utf8'));
  } catch {
    console.warn('Warning: checkpoint file unreadable, starting fresh.');
    return { results: {} };
  }
}

function saveCheckpoint(checkpointFile, cp) {
  writeFileSync(checkpointFile, JSON.stringify(cp, null, 2), 'utf8');
}

function checkpointKey(caseId, run) {
  return `${caseId}|r${run}`;
}

// ── Sleep ─────────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function msUntilNextHour() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next - now;
}

// ── calcCostNzd — ported verbatim from triage/index.html lines 2575–2586 ──────

function calcCostNzd(usage, model) {
  var isOpus = model && model.indexOf('opus') !== -1;
  var inputTokens = (usage.input_tokens || 0) - (usage.cache_read_input_tokens || 0) - (usage.cache_creation_input_tokens || 0);
  if (inputTokens < 0) inputTokens = 0;
  var cacheRead = usage.cache_read_input_tokens || 0;
  var cacheWrite = usage.cache_creation_input_tokens || 0;
  var output = usage.output_tokens || 0;
  // USD/M tokens — Sonnet: in $3, cw $3.75, cr $0.30, out $15; Opus: in $5, cw $6.25, cr $0.50, out $25
  var ip = isOpus ? 5.0 : 3.0, cw = isOpus ? 6.25 : 3.75, cr = isOpus ? 0.50 : 0.30, op = isOpus ? 25.0 : 15.0;
  var costUsd = (inputTokens * ip + cacheWrite * cw + cacheRead * cr + output * op) / 1000000;
  return Math.round(costUsd * 1.67 * 10000) / 10000;
}

// ── buildCriteriaBlock — ported verbatim from triage/index.html lines 1583–1606 ─
// (current production source: match-data blob, pre-switch)

function buildCriteriaBlock(siteIndex) {
  // siteIndex = MATCH_DATA.index fetched from /api/match-data
  // isPaed always false for this runner — all 30 cases are adult
  var lines = [];
  siteIndex.forEach(function(site) {
    var pageRef = site.page ? ' [p' + site.page + ']' : '';
    lines.push('=== ' + site.exam_title + ' — ' + site.site_label + ' (' + site.modality + ')' + pageRef + ' ===');
    if (site.guidance) lines.push('Guidance: ' + site.guidance);
    if (site.guidanceNarrative) lines.push('Background: ' + site.guidanceNarrative);
    site.groups.forEach(function(g) {
      lines.push('[' + g.title + ']');
      g.items.forEach(function(it) {
        lines.push((it.mandatory ? '* MANDATORY: ' : '- ') + it.label);
      });
    });
    if (site.outOfCriteriaNote) lines.push('OUT OF CRITERIA: ' + site.outOfCriteriaNote);
    if (site.alternativeManagement) lines.push('REDIRECT: ' + site.alternativeManagement);
    if (site.notFundedDetail) lines.push('NOT ROUTINELY FUNDED: ' + site.notFundedDetail);
    if (site.footnotes) lines.push('DEFINITIONS AND SUB-CRITERIA: ' + site.footnotes);
    lines.push('');
  });
  return lines.join('\n');
}

// ── buildCriteriaBlockV2 — implements ta-src-design.md §4 (target contract) ────
// buildCriteriaBlockV2() does not exist in deployed code yet (TA-SRC-01
// implementation checklist item 5 is unstarted) — this is a from-spec build,
// not a port. Input: exams array from GET /api/criteria envelope's data.exams
// (adult only — isPaed always false here, matching all 30 suite cases and the
// match-data builder's scope). §4.1 per-site serialisation, §4.2 item
// serialisation (flat + dormant compound-logic path per CC-DESIGN-01 §4.1),
// §4.3 guidance rule (adult exam.guidance fallback suppressed).
//
// PARITY GUARD REQUIRED AT CUTOVER: once triage/index.html ships its own
// buildCriteriaBlockV2(), diff this function against the deployed version
// line-for-line and STOP on mismatch before running the --source published
// leg of the paired comparison — same practice as the match-data leg's guard
// against index.html (this script's buildCriteriaBlock() was verified
// line-for-line against production earlier in the TA-SRC-01 baseline
// session). Until then this function has no deployed counterpart to diff
// against — it is a from-spec build, not yet a verified port. See
// ta-src-design.md §10 item 10.

function guidanceForV2(site) {
  // §4.3: Guidance: site.inlineGuidance || exam.guidance — refined to suppress
  // the adult exam.guidance fallback entirely (this runner is adult-only, so
  // that fallback never fires). Strip a leading "Guidance: " prefix some
  // inlineGuidance strings already carry, to avoid "Guidance: Guidance: …".
  if (!site.inlineGuidance) return null;
  return site.inlineGuidance.replace(/^Guidance:\s*/i, '');
}

function serializeItemV2(lines, item) {
  if (!item.logic) {
    lines.push((item.mandatory ? '* MANDATORY: ' : '- ') + item.label);
    return;
  }
  // Dormant path — no published item carries `logic` at switch time (Phase 0
  // confirmed). Implemented per CC-DESIGN-01 §4.1 / ta-src-design.md §4.2 so
  // the serialiser has a tested shape ready before any item exercises it.
  var headline = item.shortLabel || item.label;
  var logic = item.logic;
  var letterFor = function(cond) { return cond.id.slice(cond.id.lastIndexOf('_') + 1); };
  if (logic.type === 'mandatory_plus_any') {
    var required = logic.conditions.filter(function(c) { return c.required; });
    var optional = logic.conditions.filter(function(c) { return !c.required; });
    lines.push('- [' + item.id + '] ' + headline + ' — REQUIRED:');
    required.forEach(function(c) { lines.push('    (' + letterFor(c) + ') ' + c.text); });
    lines.push('  PLUS AT LEAST ONE OF:');
    optional.forEach(function(c) { lines.push('    (' + letterFor(c) + ') ' + c.text); });
  } else {
    var header = logic.type === 'all' ? 'ALL OF THE FOLLOWING:' : 'ANY OF THE FOLLOWING:';
    lines.push('- [' + item.id + '] ' + headline + ' — ' + header);
    logic.conditions.forEach(function(c) { lines.push('    (' + letterFor(c) + ') ' + c.text); });
  }
}

function buildCriteriaBlockV2(exams) {
  var lines = [];
  exams.forEach(function(exam) {
    var sites = exam.type === 'multisite' ? exam.sites : [exam];
    sites.forEach(function(site) {
      var pageRef = site.page ? ' [p' + site.page + ']' : '';
      lines.push('=== ' + exam.title + ' — ' + site.label + ' (' + exam.modality + ')' + pageRef + ' ===');
      var guidance = guidanceForV2(site);
      if (guidance) lines.push('Guidance: ' + guidance);
      if (site.guidanceNarrative) lines.push('Background: ' + site.guidanceNarrative);
      site.groups.forEach(function(g) {
        lines.push('[' + g.title + ']');
        g.items.forEach(function(it) { serializeItemV2(lines, it); });
      });
      if (site.outOfCriteriaNote) lines.push('OUT OF CRITERIA: ' + site.outOfCriteriaNote);
      if (site.alternativeManagement) lines.push('REDIRECT: ' + site.alternativeManagement);
      if (site.notFundedDetail) lines.push('NOT ROUTINELY FUNDED: ' + site.notFundedDetail);
      if (site.footnotes) lines.push('DEFINITIONS AND SUB-CRITERIA: ' + site.footnotes);
      lines.push('');
    });
  });
  return lines.join('\n');
}

// ── postProcessResult — ported VERBATIM from triage/index.html lines 2648–2755 ─
// DO NOT modify this function. It must remain byte-for-byte equivalent to the
// deployed production version. If the deployed version changes, update this too.
// Source: public/crr-criteria/triage/index.html lines 2648–2755

function postProcessResult(result, note) {
  if (!result || result.verdict === 'proceeds') return;
  var metItems = result.met_criteria;
  var hasMet = Array.isArray(metItems) && metItems.length > 0;
  if (!hasMet) return; // never override without at least one met criterion
  var overrides = result._overrides || [];
  var noteText = (result.notes || '').toLowerCase();
  var inputText = (note || result.interpreted_note || '').toLowerCase();
  var now = new Date().toISOString();

  var MET_PHRASES = ['fully met','meets criteria','meets p1','meets p2','meets p3','meets p4',
    'meets acute','meets urgent','meet criteria','meet p1','meet p2','meet p3','meet p4',
    'meet acute','meet urgent','pathway is met','pathway is fully met',
    'sufficient for acceptance','criteria are met','criteria met independently','criteria met'];

  function isStep0(text) {
    var t = (text || '').toLowerCase();
    return /\b111\b/.test(t) || /\bed\b/.test(t) || /\bemergency\b/.test(t) ||
           (/\bacc\b/.test(t) && /\btrauma\b|\binjury\b|\baccident\b/.test(t)) ||
           /cauda equina/i.test(t) || /testicular torsion/i.test(t) ||
           /ruptured aaa/i.test(t) || /pneumothorax/i.test(t);
  }

  function applyProceedsDisplay(r) {
    r.verdict_title = 'Referral likely to proceed';
    var sentences = (r.notes || '').replace(/([.!?])\s+/g, '$1\n').split('\n')
      .map(function(s){ return s.trim(); }).filter(Boolean);
    for (var i = 0; i < sentences.length; i++) {
      var sl = sentences[i].toLowerCase();
      for (var j = 0; j < MET_PHRASES.length; j++) {
        if (sl.indexOf(MET_PHRASES[j]) !== -1) {
          var s = sentences[i];
          r.verdict_summary = s.length > 160 ? s.slice(0, 157) + '…' : s;
          return;
        }
      }
    }
    r.verdict_summary = Array.isArray(r.met_criteria) && r.met_criteria.length > 0
      ? 'Criteria met: ' + r.met_criteria[0]
      : 'Referral criteria met.';
  }

  if (isStep0(result.safety_alert) || isStep0(noteText)) return;

  var matchedPhrase = null;
  for (var pi = 0; pi < MET_PHRASES.length; pi++) {
    if (noteText.indexOf(MET_PHRASES[pi]) !== -1) { matchedPhrase = MET_PHRASES[pi]; break; }
  }
  if (matchedPhrase) {
    var ov1 = result.verdict;
    result.verdict = 'proceeds';
    if (Array.isArray(result.missing_criteria) && result.missing_criteria.length > 0) {
      result.notes = (result.notes || '') + '\n\nOther requirements not met (advisory — not blocking this referral): ' + result.missing_criteria.join('; ');
      result.missing_criteria = [];
    }
    applyProceedsDisplay(result);
    if (!result.priority) {
      var prioMatch = noteText.match(/\b(p[1-4]|acute 48hr|urgent|non.deferrable|routine)\b/i);
      if (prioMatch) result.priority = prioMatch[1].replace(/\b\w/g, function(c){ return c.toUpperCase(); });
    }
    overrides.push({ check:'notes_say_met', original_verdict:ov1, new_verdict:'proceeds',
      trigger:'notes contain \'' + matchedPhrase + '\'', timestamp:now });
  }

  var isFemale = /\bfemale\b|\bwoman\b|\bwomen\b|\bgirl\b/.test(inputText) || /\b\d+\s*f\b/.test(inputText);
  var isMale   = /\bmale\b|\bman\b|\bmen\b|\bboy\b/.test(inputText) || /\b\d+\s*m\b/.test(inputText);
  if ((isFemale || isMale) && Array.isArray(result.missing_criteria) && result.missing_criteria.length > 0) {
    var before = result.missing_criteria.length;
    result.missing_criteria = result.missing_criteria.filter(function(item) {
      var t = (item || '').toString().toLowerCase();
      if (isFemale && (/\bmale patient\b/.test(t) || /\bin men\b/.test(t) || /\bmale,/.test(t) || /\bmale older than\b/.test(t))) return false;
      if (isMale  && (/\bfemale patient\b/.test(t) || /\bin women\b/.test(t) || /\bfemale,/.test(t) || /\bfemale of any age\b/.test(t))) return false;
      return true;
    });
    var removed = before - result.missing_criteria.length;
    if (removed > 0) {
      var gender = isFemale ? 'female' : 'male';
      if (result.missing_criteria.length === 0 && result.verdict !== 'proceeds') {
        var ov2 = result.verdict;
        result.verdict = 'proceeds';
        applyProceedsDisplay(result);
        overrides.push({ check:'gender_inapplicable_criteria', original_verdict:ov2, new_verdict:'proceeds',
          trigger:'removed ' + removed + ' gender-inapplicable missing criteria for ' + gender + ' patient; missing_criteria now empty', timestamp:now });
      } else {
        overrides.push({ check:'gender_inapplicable_criteria', original_verdict:result.verdict, new_verdict:result.verdict,
          trigger:'removed ' + removed + ' gender-inapplicable missing criteria for ' + gender + ' patient', timestamp:now });
      }
    }
  }

  if (overrides.length > 0 && result.verdict === 'proceeds' &&
      Array.isArray(result.missing_criteria) && result.missing_criteria.length > 0) {
    result.notes = (result.notes || '') + '\n\nOther requirements not met (advisory — not blocking this referral): ' + result.missing_criteria.join('; ');
    result.missing_criteria = [];
  }

  if (overrides.length > 0) result._overrides = overrides;
}

// ── gradeFabrication ──────────────────────────────────────────────────────────
// Compares met_criteria assertions against the clinical note.
//
// Returns:
//   'NO'     — met_criteria is empty; nothing was claimed met → nothing to fabricate
//   'YES'    — met_criteria contains quoted or parenthetical clinical language
//              that is absent from the note (explicit literal fabrication detected)
//   'REVIEW' — cannot determine; needs Gary's manual inspection
//
// Catches: quoted assertions ("cognitive impairment confirmed") and parenthetical
// clinical findings "(progressively worsening)" where that exact text is absent
// from the note. Does NOT catch paraphrasing or semantic fabrication — those
// fall through to REVIEW.

function gradeFabrication(result, note) {
  const metItems = result?.met_criteria || [];

  // Nothing claimed met — nothing to fabricate
  if (metItems.length === 0) return 'NO';

  const searchText = ((note || '') + ' ' + (result?.interpreted_note || '')).toLowerCase();

  for (const item of metItems) {
    // Quoted phrases — strongest fabrication signal
    const quoted = [...item.matchAll(/"([^"]{3,60})"/g)];
    for (const m of quoted) {
      const phrase = m[1].toLowerCase().trim();
      if (phrase.length >= 4 && !searchText.includes(phrase)) return 'YES';
    }

    // Parenthetical content describing clinical findings (not page refs)
    const parens = [...item.matchAll(/\(([^)]{4,50})\)/g)];
    for (const m of parens) {
      const p = m[1].toLowerCase().trim();
      // Skip page refs: (p.7), (p. 20-21), (page 7), (see criteria), etc.
      if (/^p[\d\s\.\-]|^page\s+\d|criteria|footnote|^see |^per /i.test(p)) continue;
      // Only flag if the content contains clinical assessment language
      if (/\b(impairment|worsening|deficit|diagnosed|progressive|absent|bilateral|unilateral|severe|moderate|mild|daily|documented|confirmed|present)\b/.test(p)) {
        if (!searchText.includes(p)) return 'YES';
      }
    }
  }

  return 'REVIEW';
}

// ── assembleSystemPrompt ──────────────────────────────────────────────────────
// Mirrors buildSystemPrompt() in triage/index.html lines 1656–1693.
// instructionText: the instruction_text field from /api/system-prompt

function assembleSystemPrompt(instructionText, criteriaBlock) {
  // docMode is always 'inferred' for the regression runner
  var docModeInstruction = '2. DOCUMENTATION STANDARD — INFERRED: You may make reasonable clinical inferences where obvious to any clinician. "No AF" (no atrial fibrillation) suggests the patient is less likely to be anticoagulated specifically for AF — but do not infer the patient is not anticoagulated at all, as other indications (prior DVT, mechanical heart valve, thrombophilia) may apply. Do not infer specific clinical findings not mentioned at all.\n\n';

  var instructionFilled = instructionText.replace('{{DOC_MODE_INSTRUCTION}}', docModeInstruction);

  var preamble = 'You are a clinical decision support assistant for the New Zealand Community Referred Radiology (CRR) programme. Your role is to tell the GP clearly whether their referral will proceed, is at risk, or will be declined — and exactly what to document to fix it.\n\n';

  var jsonFormat = '\nRespond ONLY with valid JSON (no markdown fences):\n'
    + '{\n'
    + '  "interpreted_note": "<your corrected version of the input note — identical to input if no corrections needed>",\n'
    + '  "exam": "<exam — site>",\n'
    + '  "modality": "<CT|Ultrasound|X-Ray>",\n'
    + '  "verdict": "proceeds"|"at_risk"|"declined",\n'
    + '  "verdict_title": "<Referral likely to proceed / Referral at risk — add missing information / Referral likely to be declined>",\n'
    + '  "verdict_summary": "<one clear sentence>",\n'
    + '  "priority": "<Acute 24hr / Acute 48hr / P2 / P3 / P4 / S1 / S2 / S3 — or null>",\n'
    + '  "criteria_page": "<page reference e.g. p20-21>",\n'
    + '  "met_criteria": ["<sub-element documented — cite page>"],\n'
    + '  "missing_criteria": ["<sub-element missing — cite page>"],\n'
    + '  "add_to_note": ["<specific sentence to add>"],\n'
    + '  "suggested_wording": "<complete rewritten note — only if at_risk or declined, else null>",\n'
    + '  "not_funded_flag": true|false,\n'
    + '  "safety_alert": "<urgent safety message — null otherwise>",\n'
    + '  "redirect": "<different pathway if applicable — null otherwise>",\n'
    + '  "notes": "<other important context — null if none>"\n'
    + '}';

  return preamble
    + instructionFilled
    + 'CRITERIA (National Primary Care Referral Criteria for Imaging, April 2026 reissue):\n\n'
    + criteriaBlock
    + jsonFormat;
}

// ── buildUserMessage ──────────────────────────────────────────────────────────
// Mirrors the userMsg construction in triage/index.html lines 2762–2769

function buildUserMessage(note) {
  var docModeStr = 'Documentation standard: INFERRED — reasonable clinical context allowed.';
  return docModeStr
    + '\n\nNote: silently correct any obvious typos or voice-to-text errors in the note (e.g. "vison"→"vision", "irsk"→"risk") before assessing, and include the corrected version in your response as "interpreted_note".'
    + '\n\nAssess this referral note:\n\n' + note
    + '\n\nIMPORTANT: Respond with ONLY the JSON object as specified. No preamble, no explanation, no commentary — even for safety alerts or redirects. Express urgency through the safety_alert and redirect fields in the JSON.';
}

// ── fetch + parse response (mirrors callTriageAPI logic) ─────────────────────

function stripJsonFences(text) {
  var clean = text
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/\s*```[\s\S]*/, '')
    .trim();
  var jStart = clean.indexOf('{');
  if (jStart !== -1) {
    var depth = 0, inStr = false, escCh = false, jEnd = -1;
    for (var ci = jStart; ci < clean.length; ci++) {
      var ch = clean[ci];
      if (escCh) { escCh = false; continue; }
      if (ch === '\\' && inStr) { escCh = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (!inStr) {
        if (ch === '{') depth++;
        else if (ch === '}') { if (--depth === 0) { jEnd = ci; break; } }
      }
    }
    if (jEnd !== -1) clean = clean.slice(jStart, jEnd + 1);
  }
  return clean;
}

async function callAssess(systemPrompt, note) {
  const userMsg = buildUserMessage(note);
  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMsg }],
  };

  const resp = await fetch(ASSESS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (resp.status === 429) {
    return { status: 429 };
  }
  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    throw new Error(`Assess API error ${resp.status}: ${errBody?.error?.message || JSON.stringify(errBody)}`);
  }

  const data = await resp.json();
  const text = data.content && data.content[0] && data.content[0].text;
  if (!text) throw new Error('Empty response from assess API');

  const clean = stripJsonFences(text);
  let result;
  let parseSuccess = true;
  try {
    result = JSON.parse(clean);
  } catch {
    result = { verdict: null, _parseError: true, _rawText: clean };
    parseSuccess = false;
  }

  return { status: 200, result, usage: data.usage || {}, parseSuccess, rawText: clean };
}

// ── Usage log submission ──────────────────────────────────────────────────────

async function logUsage(caseId, runNum, promptVersion, note, result, usage, parseSuccess, regRunId) {
  const aiSummary = parseSuccess ? [
    result.verdict_title || result.verdict || '',
    result.verdict_summary || '',
    (result.met_criteria || []).length ? 'Met: ' + result.met_criteria.join('; ') : '',
    (result.missing_criteria || []).length ? 'Missing: ' + result.missing_criteria.join('; ') : '',
    result.safety_alert ? 'SAFETY: ' + result.safety_alert : '',
    result.redirect ? 'Redirect: ' + result.redirect : '',
  ].filter(Boolean).join('\n') : 'PARSE FAILED';

  const payload = {
    timestamp: new Date().toISOString(),
    session_id: `${regRunId}-${caseId}-r${runNum}`,
    user_name: 'TA-SRC-01 Baseline Runner',
    user_role: 'regression',
    exam_identified: result.exam || null,
    verdict: result.verdict || null,
    model_used: MODEL,
    documentation_standard: 'inferred',
    input_tokens: usage.input_tokens || 0,
    cache_read_tokens: usage.cache_read_input_tokens || 0,
    cache_write_tokens: usage.cache_creation_input_tokens || 0,
    output_tokens: usage.output_tokens || 0,
    cost_nzd: calcCostNzd(usage, MODEL),
    presentation_text: note,
    ai_response_summary: aiSummary,
    ai_response_json: parseSuccess ? JSON.stringify({
      verdict: result.verdict, verdict_title: result.verdict_title,
      verdict_summary: result.verdict_summary, priority: result.priority,
      criteria_page: result.criteria_page, interpreted_note: result.interpreted_note,
      met_criteria: result.met_criteria, missing_criteria: result.missing_criteria,
      add_to_note: result.add_to_note, suggested_wording: result.suggested_wording,
      notes: result.notes, redirect: result.redirect, safety_alert: result.safety_alert,
      overrides: result._overrides && result._overrides.length ? result._overrides : undefined,
    }) : null,
    prompt_version: promptVersion,
    parse_success: parseSuccess,
    temperature: TEMPERATURE,
    source: 'regression',
    regression_run_id: regRunId,
  };

  const resp = await fetch(USAGE_LOG_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    console.warn(`  Warning: usage-log failed (${resp.status}): ${err.error || 'unknown'}`);
  } else {
    const r = await resp.json();
    return r.id;
  }
}

// ── Load cases from spreadsheet (full run only) ───────────────────────────────

async function loadCasesFromSpreadsheet() {
  let xlsx;
  try {
    const req = createRequire(import.meta.url);
    xlsx = req('xlsx');
  } catch {
    throw new Error('xlsx not installed. Run: npm install xlsx');
  }

  const wb = xlsx.readFile(SPREADSHEET_FILE);

  // Sheet 1 "Test Case Results" — has Case ID (col 0), Clinical Note (col 6), Expected (col 12)
  const sheet1 = wb.Sheets['Test Case Results'];
  const rows1 = xlsx.utils.sheet_to_json(sheet1, { header: 1, defval: '' });
  const header1 = rows1[0];
  const noteColIdx = header1.indexOf('Clinical Note (verbatim)');
  const caseIdColIdx = 0; // Case ID is always col 0
  const expectedCol1Idx = header1.indexOf('Evaluator Expected');

  const notesMap = {};
  for (let i = 1; i < rows1.length; i++) {
    const row = rows1[i];
    const caseId = (row[caseIdColIdx] || '').toString().trim();
    const note = (row[noteColIdx] || '').toString().trim();
    const expected1 = (row[expectedCol1Idx] || '').toString().trim();
    if (caseId && note) notesMap[caseId] = { note, expected: expected1 };
  }

  // Sheet 3 "Structured Re-Eval" — authoritative expected values and full case list
  const sheet3 = wb.Sheets['Structured Re-Eval'];
  const rows3 = xlsx.utils.sheet_to_json(sheet3, { header: 1, defval: '' });
  const header3 = rows3[0];

  const cases = [];
  for (let i = 1; i < rows3.length; i++) {
    const row = rows3[i];
    const caseId = (row[0] || '').toString().trim();
    const group = (row[1] || '').toString().trim();
    const exam = (row[2] || '').toString().trim();
    const expected = (row[3] || '').toString().trim(); // Structured Re-Eval expected wins
    if (!caseId) continue;

    // Prefer Sheet 1 note; synthetic cases defined inline
    // For compound IDs like RP-007/INT-002, Sheet 1 may have each component as a separate row
    const fromSheet1 = notesMap[caseId]
      || (caseId.includes('/') && (notesMap[caseId.split('/')[0]] || notesMap[caseId.split('/')[1]]));
    const note = fromSheet1 ? fromSheet1.note : null;
    cases.push({ id: caseId, group, exam, expected, note, synthetic: !note });
  }

  // Inject verbatim notes for the 4 synthetic cases that are missing from the sheet
  const SYNTHETIC_NOTES = {
    'EQ-002':       '47yo NZ European woman, 5 months of heavy irregular menstrual bleeding with intermenstrual spotting. BMI 33. Type 2 diabetes on metformin. No prior pelvic imaging. First presentation. Not on hormonal contraception.',
    'INT-AKI':      '72yo man, 1/52 malaise and reduced urine output. New AKI — eGFR 8, baseline 62 three months ago. No catheter, no obvious precipitant, not on nephrotoxics. BP 158/94, otherwise obs stable.',
    'INT-SAH':      '44yo woman, sudden severe occipital headache that hit maximum intensity within seconds while exercising ~2 hours ago. Describes "worst headache of my life." Associated vomiting, neck stiffness, photophobia. Pain persistent. No prior similar.',
    'INT-TORSION':  '18yo man, sudden onset severe L testicular pain 3 hours ago, woke him from sleep. Associated nausea and vomiting. O/E: testis high-riding and exquisitely tender, cremasteric reflex absent.',
  };

  for (const c of cases) {
    if (!c.note && SYNTHETIC_NOTES[c.id]) {
      c.note = SYNTHETIC_NOTES[c.id];
      c.synthetic = true;
    }
  }

  const missing = cases.filter(c => !c.note);
  if (missing.length > 0) {
    console.error('ERROR: No clinical note found for cases:', missing.map(c => c.id).join(', '));
    process.exit(1);
  }

  return cases;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nTA-SRC-01 Baseline Runner ${IS_DRY_RUN ? '[DRY-RUN — 3 cases]' : '[FULL RUN — 30 cases]'} [--source ${SOURCE}]`);
  console.log(`Model: ${MODEL}  Temperature: ${TEMPERATURE}  Rate limit: ~${Math.round(3600000 / RATE_LIMIT_MS)}/hr  Runs/case: ${RUNS_PER_CASE}`);

  // Load cases first (no network dependency) so we know the total call count
  // before resolving the run ID / checkpoint filenames.
  const cases = IS_DRY_RUN ? DRY_RUN_CASES : await loadCasesFromSpreadsheet();
  console.log(`Cases loaded: ${cases.length}`);

  const totalCalls = cases.length * RUNS_PER_CASE;
  const REG_RUN_ID = resolveRunId(totalCalls, SOURCE);
  const CHECKPOINT_FILE = path.join(__dirname, `${REG_RUN_ID}-checkpoint.json`);
  const RESULTS_FILE     = path.join(__dirname, `${REG_RUN_ID}-results.json`);

  console.log(`Run ID: ${REG_RUN_ID}`);
  console.log(`Checkpoint: ${CHECKPOINT_FILE}\n`);

  // ── Prompt sourcing ───────────────────────────────────────────────────────
  // AUTHORITATIVE SOURCE: D1 via public API. Local .txt file is used only as
  // a verification check — if it differs from D1, STOP and report.

  const LOCAL_V230 = path.join(ROOT, 'instructions', 'system-prompt-v2.3.0.txt');

  console.log('Fetching active system prompt from public API...');
  const resp23 = await fetch(`${API_BASE}/system-prompt`);
  if (!resp23.ok) {
    console.error(`ERROR: Failed to fetch active prompt (${resp23.status}).`);
    process.exit(1);
  }
  const prompt23 = await resp23.json();
  console.log(`  D1 active version: ${prompt23.version}  (${prompt23.instruction_text.length} chars)`);

  // Version guard — STOP if active prompt is not v2.3.0. This baseline must
  // reflect CURRENT production state; if the active prompt has moved, the
  // baseline would silently target the wrong C2 state.
  if (prompt23.version !== '2.3.0') {
    console.error(`STOP: Active prompt is v${prompt23.version}, not v2.3.0.`);
    console.error('Current production state has shifted since this runner was written.');
    console.error('Resolve this before running — do not proceed on a stale assumption.');
    process.exit(1);
  }

  // Verify v2.3.0 against local file
  if (existsSync(LOCAL_V230)) {
    const local23 = readFileSync(LOCAL_V230, 'utf8').trimEnd();
    const api23   = prompt23.instruction_text.trimEnd();
    if (local23 === api23) {
      console.log('  Diff v2.3.0: MATCH — local file is byte-identical to D1.');
    } else {
      console.error('STOP: v2.3.0 prompt DIFFERS between D1 and local file.');
      console.error(`  D1 length: ${api23.length}  Local length: ${local23.length}`);
      let firstDiff = 0;
      while (firstDiff < Math.min(api23.length, local23.length) && api23[firstDiff] === local23[firstDiff]) firstDiff++;
      console.error(`  First difference at char ${firstDiff}:`);
      console.error(`  D1:    ${JSON.stringify(api23.slice(Math.max(0, firstDiff-40), firstDiff+60))}`);
      console.error(`  Local: ${JSON.stringify(local23.slice(Math.max(0, firstDiff-40), firstDiff+60))}`);
      console.error('Local files are NOT a safe fallback. Resolve the drift before running.');
      process.exit(1);
    }
  } else {
    console.warn(`  Warning: local file ${LOCAL_V230} not found — skipping diff check.`);
  }

  console.log('Prompt verification complete. Proceeding with D1 prompt.\n');

  // Fetch criteria (block source depends on --source)
  let criteriaBlock, criteriaSourceLabel, publishedVersion = null;
  if (SOURCE === 'published') {
    console.log('Fetching published criteria (buildCriteriaBlockV2 source)...');
    const respPub = await fetch(`${API_BASE}/criteria`);
    if (!respPub.ok) {
      console.error(`ERROR: Failed to fetch published criteria (${respPub.status}).`);
      process.exit(1);
    }
    const published = await respPub.json();
    const exams = published?.data?.exams || [];
    if (exams.length === 0) {
      console.error('ERROR: published criteria has no exams. Cannot build criteria block.');
      process.exit(1);
    }
    publishedVersion = { version: published.version, publishedAt: published.publishedAt };
    console.log(`  Published version: ${published.version} (published ${published.publishedAt})`);
    console.log(`  Criteria block: ${exams.length} exam groups\n`);
    criteriaBlock = buildCriteriaBlockV2(exams);
    criteriaSourceLabel = `published (${published.version})`;
  } else {
    console.log('Fetching match data (criteria block)...');
    const respMD = await fetch(`${API_BASE}/match-data`);
    if (!respMD.ok) {
      console.error(`ERROR: Failed to fetch match data (${respMD.status}).`);
      process.exit(1);
    }
    const matchData = await respMD.json();
    const siteIndex = matchData.index || [];
    if (siteIndex.length === 0) {
      console.error('ERROR: match-data index is empty. Cannot build criteria block.');
      process.exit(1);
    }
    console.log(`  Criteria block: ${siteIndex.length} sites\n`);
    criteriaBlock = buildCriteriaBlock(siteIndex);
    criteriaSourceLabel = 'match-data (current production, pre-switch)';
  }

  // Assemble system prompt (single config: v2.3.0 + selected criteria source)
  const system = assembleSystemPrompt(prompt23.instruction_text, criteriaBlock);

  // Load checkpoint
  const cp = loadCheckpoint(CHECKPOINT_FILE);
  cp.runId = REG_RUN_ID;

  // Build work queue: (case, run) tuples not yet done
  const queue = [];
  for (const c of cases) {
    for (let run = 1; run <= RUNS_PER_CASE; run++) {
      const key = checkpointKey(c.id, run);
      if (!cp.results[key]) {
        queue.push({ case: c, run, key });
      }
    }
  }

  const done = totalCalls - queue.length;
  console.log(`Progress: ${done}/${totalCalls} tuples already complete. ${queue.length} remaining.`);
  if (queue.length === 0) {
    console.log('All calls complete. Running post-processing and output...');
  } else {
    const etaMin = Math.ceil(queue.length * RATE_LIMIT_MS / 60000);
    console.log(`Estimated time: ~${etaMin} min (${queue.length} calls × ${RATE_LIMIT_MS / 1000}s delay)\n`);
  }

  let callCount = 0;
  for (const item of queue) {
    const { case: c, run, key } = item;
    callCount++;
    process.stdout.write(`[${callCount}/${queue.length}] ${c.id} | Run ${run}  `);

    // Rate limit delay (skip before very first call)
    if (callCount > 1) {
      process.stdout.write(`(waiting ${RATE_LIMIT_MS / 1000}s) `);
      await sleep(RATE_LIMIT_MS);
    }

    // Call with 429 retry
    let callResult;
    while (true) {
      try {
        callResult = await callAssess(system, c.note);
      } catch (err) {
        console.error(`\n  ERROR calling assess: ${err.message}`);
        process.exit(1);
      }
      if (callResult.status !== 429) break;
      const waitMs = msUntilNextHour() + 5000; // wait until next hour + 5s buffer
      console.log(`\n  429 rate limit hit. Waiting ${Math.round(waitMs / 60000)} min until next hour window...`);
      await sleep(waitMs);
    }

    const { result, usage, parseSuccess } = callResult;

    // Derive post-override result by applying postProcessResult to a deep copy
    // (v2.3.0 is the only config, and v2.3.0 always runs postProcessResult in production)
    let overrideResult = null;
    let overrideFired = false;
    if (parseSuccess) {
      overrideResult = JSON.parse(JSON.stringify(result)); // deep copy
      const beforeVerdict = overrideResult.verdict;
      postProcessResult(overrideResult, c.note);
      overrideFired = overrideResult.verdict !== beforeVerdict || !!(overrideResult._overrides && overrideResult._overrides.length);
    }

    const rawVerdict = result.verdict || null;
    const overrideVerdict = overrideResult ? overrideResult.verdict : null;

    process.stdout.write(`→ ${rawVerdict}${overrideResult ? ` (override: ${overrideVerdict})` : ''} [parse:${parseSuccess}]\n`);

    // Save to checkpoint
    cp.results[key] = {
      caseId: c.id, run,
      promptVersion: '2.3.0',
      model: MODEL,
      rawVerdict, overrideVerdict, overrideFired,
      fabrication: parseSuccess ? gradeFabrication(result, c.note) : 'REVIEW',
      parseSuccess,
      result: parseSuccess ? {
        verdict: result.verdict, verdict_title: result.verdict_title,
        verdict_summary: result.verdict_summary, priority: result.priority,
        met_criteria: result.met_criteria, missing_criteria: result.missing_criteria,
        notes: result.notes, safety_alert: result.safety_alert, redirect: result.redirect,
        suggested_wording: result.suggested_wording, add_to_note: result.add_to_note,
      } : { _parseError: true, _rawText: callResult.rawText },
      usage,
      cost_nzd: calcCostNzd(usage, MODEL),
    };
    saveCheckpoint(CHECKPOINT_FILE, cp);

    // Log to D1 usage table — tagged distinctly from TA-REG-02
    await logUsage(c.id, run, '2.3.0', c.note, result, usage, parseSuccess, REG_RUN_ID);
  }

  // Aggregate results by caseId for JSON output (fresh object — do not alias
  // cp.results, or the flat {caseId}|r{run} checkpoint keys leak into the
  // per-case output alongside the aggregated arrays)
  const allResults = {};
  for (const [key, data] of Object.entries(cp.results)) {
    const { caseId, run } = data;
    if (!allResults[caseId]) allResults[caseId] = [];
    allResults[caseId][run - 1] = data;
  }

  // Write JSON results (always) — with gate-artefact header + coverage note
  writeFileSync(RESULTS_FILE, JSON.stringify({
    gateArtefact: gateArtefactNote(SOURCE),
    coverageNote: COVERAGE_NOTE,
    borderlineNote: BORDERLINE_NOTE,
    reg02KeyShapeNote: REG02_KEY_SHAPE_NOTE,
    ...(SOURCE === 'published' ? { publishedSourceNote: PUBLISHED_SOURCE_NOTE } : {}),
    runId: REG_RUN_ID,
    runDate: new Date().toISOString(),
    promptVersion: '2.3.0',
    model: MODEL,
    criteriaSource: criteriaSourceLabel,
    ...(publishedVersion ? { publishedVersion } : {}),
    criteriaCoverage: SOURCE === 'published' ? undefined : CRITERIA_COVERAGE,
    runsPerCase: RUNS_PER_CASE,
    cases: allResults,
  }, null, 2), 'utf8');
  console.log(`\nResults JSON: ${RESULTS_FILE}`);

  // Print summary
  console.log('\n── Summary ──────────────────────────────────────────────────');
  for (const c of cases) {
    const runs = allResults[c.id] || [];
    const verdicts = runs.map(r => r?.rawVerdict || '?');
    const stable = new Set(verdicts).size <= 1 ? 'stable' : 'VARIES';
    const isBorderline = BORDERLINE_CASE_IDS.has(c.id);
    const borderlineTag = isBorderline ? ' [REVIEW]' : '';
    const syntheticTag = c.synthetic ? ' [SYNTHETIC]' : '';
    console.log(`  ${c.id.padEnd(14)} expected:${(c.expected || '?').slice(0, 20).padEnd(22)}  [${verdicts.join('/')}] ${stable}${borderlineTag}${syntheticTag}`);
  }

  console.log(`\n${gateArtefactNote(SOURCE)}\n`);
  console.log(`Coverage note: ${COVERAGE_NOTE}\n`);
  console.log('Done. Report to Gary for review before TA-SRC-01 implementation proceeds.\n');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
