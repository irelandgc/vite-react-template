#!/usr/bin/env node
// TA-REG-02 Regression Runner
// Node.js ES module (Node 18+, built-in fetch)
//
// Usage:
//   CRR_ADMIN_KEY=xxx node scripts/reg02-runner.mjs [--dry-run]
//
// --dry-run   Run 3 synthetic cases only (18 API calls). Proves D1 tagging,
//             checkpoint resume, and override logic before the full 180-call run.
//
// Environment:
//   CRR_ADMIN_KEY  required  Admin key for fetching non-active prompt versions from D1
//
// Checkpoint: scripts/reg02-checkpoint.json
//   Saved after every successful API call. On restart, skips completed tuples.
//   Key: "{caseId}|{config}|{run}" — config is 'A' (v2.2.0) or 'B' (v2.3.0)

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
const CHECKPOINT_FILE  = path.join(__dirname, 'reg02-checkpoint.json');
const RESULTS_FILE     = path.join(__dirname, 'reg02-results.json');
const SPREADSHEET_FILE = path.join(ROOT, 'documents', 'CRR_Test_Case_Results_Matrix_REG02.xlsx');
const RUN_DATE         = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const REG_RUN_ID_A     = `TA-REG-02-A-${RUN_DATE}`;
const REG_RUN_ID_B     = `TA-REG-02-B-${RUN_DATE}`;

const IS_DRY_RUN   = process.argv.includes('--dry-run');
const ADMIN_KEY    = process.env.CRR_ADMIN_KEY;

// ── Preflight checks ──────────────────────────────────────────────────────────

if (!ADMIN_KEY) {
  console.error('ERROR: CRR_ADMIN_KEY is required. The admin API is the authoritative prompt source.');
  console.error('  Run with: CRR_ADMIN_KEY=your-key node scripts/reg02-runner.mjs ...');
  process.exit(1);
}

// ── 3 synthetic dry-run cases (from TA-REG-02 brief §Part 2) ─────────────────

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

// ── Borderline cases (from brief §Part 4 — mark REVIEW, not pass/fail) ────────

const BORDERLINE_CASE_IDS = new Set(['RP-004', 'RP-006', 'INT-AKI', 'EQ-002', 'DG-005']);

// ── Checkpoint ────────────────────────────────────────────────────────────────

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT_FILE)) return { results: {} };
  try {
    return JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8'));
  } catch {
    console.warn('Warning: checkpoint file unreadable, starting fresh.');
    return { results: {} };
  }
}

function saveCheckpoint(cp) {
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2), 'utf8');
}

function checkpointKey(caseId, config, run) {
  return `${caseId}|${config}|${run}`;
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
// instructionText: the instruction_text field from /api/system-prompt or
//                  /api/admin/system-prompt/versions/:ver

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

async function logUsage(caseId, config, runNum, promptVersion, note, result, usage, parseSuccess, regRunId) {
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
    session_id: `reg02-${caseId}-${config}-r${runNum}`,
    user_name: 'TA-REG-02 Runner',
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
  console.log(`\nTA-REG-02 Regression Runner ${IS_DRY_RUN ? '[DRY-RUN — 3 cases]' : '[FULL RUN — 30 cases]'}`);
  console.log(`Model: ${MODEL}  Temperature: ${TEMPERATURE}  Rate limit: ~${Math.round(3600000 / RATE_LIMIT_MS)}/hr`);
  console.log(`Checkpoint: ${CHECKPOINT_FILE}\n`);

  // ── Prompt sourcing ───────────────────────────────────────────────────────
  // AUTHORITATIVE SOURCE: D1 via admin/public API. Local .txt files are used
  // only as a verification check — if they differ from D1, STOP and report.
  // Never substitute local files when the key is valid.

  const LOCAL_V220 = path.join(ROOT, 'instructions', 'Prompt-Dev-Done', 'system-prompt-v2.2.0.txt');
  const LOCAL_V230 = path.join(ROOT, 'instructions', 'system-prompt-v2.3.0.txt');

  // Fetch v2.2.0 from admin API (required — no fallback)
  console.log('Fetching system prompt v2.2.0 from admin API...');
  const resp22 = await fetch(`${API_BASE}/admin/system-prompt/versions/2.2.0`, {
    headers: { 'x-admin-key': ADMIN_KEY },
  });
  if (!resp22.ok) {
    console.error(`ERROR: Failed to fetch v2.2.0 prompt (${resp22.status}). Check CRR_ADMIN_KEY.`);
    process.exit(1);
  }
  const prompt22 = await resp22.json();
  console.log(`  D1 version: ${prompt22.version}  (${prompt22.instruction_text.length} chars)`);

  // Verify v2.2.0 against local file
  if (existsSync(LOCAL_V220)) {
    const local22 = readFileSync(LOCAL_V220, 'utf8').trimEnd();
    const api22   = prompt22.instruction_text.trimEnd();
    if (local22 === api22) {
      console.log('  Diff v2.2.0: MATCH — local file is byte-identical to D1.');
    } else {
      console.error('STOP: v2.2.0 prompt DIFFERS between D1 and local file.');
      console.error(`  D1 length: ${api22.length}  Local length: ${local22.length}`);
      // Find first differing position
      let firstDiff = 0;
      while (firstDiff < Math.min(api22.length, local22.length) && api22[firstDiff] === local22[firstDiff]) firstDiff++;
      console.error(`  First difference at char ${firstDiff}:`);
      console.error(`  D1:    ${JSON.stringify(api22.slice(Math.max(0, firstDiff-40), firstDiff+60))}`);
      console.error(`  Local: ${JSON.stringify(local22.slice(Math.max(0, firstDiff-40), firstDiff+60))}`);
      console.error('Local files are NOT a safe fallback. Resolve the drift before running.');
      process.exit(1);
    }
  } else {
    console.warn(`  Warning: local file ${LOCAL_V220} not found — skipping diff check.`);
  }

  // Fetch active prompt from public endpoint
  console.log('Fetching active system prompt from public API...');
  const resp23 = await fetch(`${API_BASE}/system-prompt`);
  if (!resp23.ok) {
    console.error(`ERROR: Failed to fetch active prompt (${resp23.status}).`);
    process.exit(1);
  }
  const prompt23 = await resp23.json();
  console.log(`  D1 active version: ${prompt23.version}  (${prompt23.instruction_text.length} chars)`);

  // Version guard — STOP if active prompt is not v2.3.0
  if (prompt23.version !== '2.3.0') {
    console.error(`STOP: Active prompt is v${prompt23.version}, not v2.3.0.`);
    console.error('The C2 baseline has shifted — the brief requires v2.3.0 as the active prompt.');
    console.error('Resolve this (promote v2.3.0 or update the brief) before running.');
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

  console.log('Prompt verification complete. Proceeding with D1 prompts.\n');

  // Fetch match data (criteria block)
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

  // Assemble system prompts
  const criteriaBlock = buildCriteriaBlock(siteIndex);
  const systemA = assembleSystemPrompt(prompt22.instruction_text, criteriaBlock); // Config A: v2.2.0
  const systemB = assembleSystemPrompt(prompt23.instruction_text, criteriaBlock); // Config B: v2.3.0

  // Load cases
  const cases = IS_DRY_RUN ? DRY_RUN_CASES : await loadCasesFromSpreadsheet();
  console.log(`Cases loaded: ${cases.length}\n`);

  // Load checkpoint
  const cp = loadCheckpoint();
  const allResults = cp.results || {};

  // Build work queue: (case, config, run) tuples not yet done
  const CONFIGS = [
    { key: 'A', system: systemA, promptVersion: '2.2.0', regRunId: REG_RUN_ID_A },
    { key: 'B', system: systemB, promptVersion: '2.3.0', regRunId: REG_RUN_ID_B },
  ];
  const queue = [];
  for (const c of cases) {
    for (const cfg of CONFIGS) {
      for (let run = 1; run <= 3; run++) {
        const key = checkpointKey(c.id, cfg.key, run);
        if (!cp.results[key]) {
          queue.push({ case: c, config: cfg, run, key });
        }
      }
    }
  }

  const total = cases.length * CONFIGS.length * 3;
  const done = total - queue.length;
  console.log(`Progress: ${done}/${total} tuples already complete. ${queue.length} remaining.`);
  if (queue.length === 0) {
    console.log('All calls complete. Running post-processing and output...');
  } else {
    const etaMin = Math.ceil(queue.length * RATE_LIMIT_MS / 60000);
    console.log(`Estimated time: ~${etaMin} min (${queue.length} calls × ${RATE_LIMIT_MS / 1000}s delay)\n`);
  }

  let callCount = 0;
  for (const item of queue) {
    const { case: c, config: cfg, run, key } = item;
    callCount++;
    process.stdout.write(`[${callCount}/${queue.length}] ${c.id} | Config ${cfg.key} (v${cfg.promptVersion}) | Run ${run}  `);

    // Rate limit delay (skip before very first call)
    if (callCount > 1) {
      process.stdout.write(`(waiting ${RATE_LIMIT_MS / 1000}s) `);
      await sleep(RATE_LIMIT_MS);
    }

    // Call with 429 retry
    let callResult;
    let retries = 0;
    while (true) {
      try {
        callResult = await callAssess(cfg.system, c.note);
      } catch (err) {
        console.error(`\n  ERROR calling assess: ${err.message}`);
        process.exit(1);
      }
      if (callResult.status !== 429) break;
      retries++;
      const waitMs = msUntilNextHour() + 5000; // wait until next hour + 5s buffer
      console.log(`\n  429 rate limit hit (retry ${retries}). Waiting ${Math.round(waitMs / 60000)} min until next hour window...`);
      await sleep(waitMs);
    }

    const { result, usage, parseSuccess } = callResult;

    // Config B: derive C3 (post-override) by applying postProcessResult to a deep copy
    let overrideResult = null;
    let overrideFired = false;
    if (cfg.key === 'B' && parseSuccess) {
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
      caseId: c.id, config: cfg.key, run,
      promptVersion: cfg.promptVersion,
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
    saveCheckpoint(cp);

    // Log to D1 usage table
    await logUsage(c.id, cfg.key, run, cfg.promptVersion, c.note, result, usage, parseSuccess, cfg.regRunId);
  }

  // Aggregate results by caseId for JSON output
  for (const [key, data] of Object.entries(cp.results)) {
    const { caseId, config, run } = data;
    if (!allResults[caseId]) allResults[caseId] = { A: [], B: [] };
    // Sort runs into correct position (0-indexed)
    allResults[caseId][config][run - 1] = data;
  }

  // Write JSON results (always)
  writeFileSync(RESULTS_FILE, JSON.stringify({ runDate: new Date().toISOString(), cases: allResults }, null, 2), 'utf8');
  console.log(`\nResults JSON: ${RESULTS_FILE}`);

  // Print summary
  console.log('\n── Summary ──────────────────────────────────────────────────');
  for (const c of cases) {
    const cRes = allResults[c.id] || {};
    const isBorderline = BORDERLINE_CASE_IDS.has(c.id);
    const configSummary = CONFIGS.map(cfg => {
      const runs = cRes[cfg.key] || [];
      const verdicts = runs.map(r => r?.rawVerdict || '?');
      const stable = new Set(verdicts).size <= 1 ? 'stable' : 'VARIES';
      return `C${cfg.key === 'A' ? 1 : 2}:[${verdicts.join('/')}] ${stable}`;
    }).join('  ');
    const borderlineTag = isBorderline ? ' [REVIEW]' : '';
    const syntheticTag = c.synthetic ? ' [SYNTHETIC]' : '';
    console.log(`  ${c.id.padEnd(14)} expected:${(c.expected || '?').slice(0, 20).padEnd(22)}  ${configSummary}${borderlineTag}${syntheticTag}`);
  }

  console.log('\nDone. Stop here and report to Gary before starting the full run.\n');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
