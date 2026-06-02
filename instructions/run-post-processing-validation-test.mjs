/**
 * Post-Processing Validation Test
 * Tests the postProcessResult checks against specific cases from the brief.
 *
 * Cases:
 *   RP-002 ×5 — hepatomegaly; override should fire when AI returns wrong verdict
 *   CR-003 ×5 — female haematuria; gender filter should fire if male criteria listed
 *   LP-001 ×1 — CAP; no override expected
 *   LP-002 ×1 — ACC redirect; Step-0 must NOT be overridden
 *   THUNDERCLAP ×1 — emergency; Step-0 must NOT be overridden
 */

import { readFileSync } from 'fs';

const API_BASE = 'https://crr-criteria-api.fk4dsrmq5r.workers.dev';
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const DELAY_MS = 3500;

const TEST_CASES = [
  { case_id: 'RP-002', runs: 5, exam: 'Ultrasound Abdomen',
    clinical_note: '61yo european male newly diagnosed autoimmune hepatitis – liver edge felt just below RCM. Screen for HCC, cirrhosis',
    expected_verdict: 'proceeds',
    check: 'notes_say_met or non_deciding_pathway_missing',
    must_not_override: false },

  { case_id: 'CR-003', runs: 5, exam: 'Renal Ultrasound',
    clinical_note: 'Persisting microscopic haematuria in usually well and active 64 year old lady works as a hairdresser all her life, non smoker, No infection on microscopy, no wt loss or other symptoms',
    expected_verdict: 'proceeds',
    check: 'gender_inapplicable_criteria',
    must_not_override: false },

  { case_id: 'LP-001', runs: 1, exam: 'Chest X-ray',
    clinical_note: '55 yo man, 3 days cough, fever and shortness of breath',
    expected_verdict: 'proceeds',
    check: null,
    must_not_override: true },

  { case_id: 'LP-002', runs: 1, exam: 'Spine X-ray',
    clinical_note: '3 months lower back pain after stepping down from a ladder. no radiation, no bowel symptoms. no fevers. not tender to palpation. normal lower limb exam.',
    expected_verdict: 'declined+redirect',
    check: null,
    must_not_override: true },

  { case_id: 'THUNDERCLAP', runs: 1, exam: 'CT Head',
    clinical_note: '42yo woman with sudden thunderclap headache, worst of her life, onset while at rest 2 hours ago. No prior headache history. GCS 15, no neck stiffness on exam but she is very distressed.',
    expected_verdict: 'safety_redirect',
    check: null,
    must_not_override: true },

  { case_id: 'NECK-SCREW', runs: 1, exam: 'Cervical Spine X-ray',
    clinical_note: '68yo male, had C5/C6 ACDF 4 months ago with screw fixation. Now has new onset neck pain. GP requesting cervical spine XR to check screw position and hardware integrity.',
    expected_verdict: 'declined',
    check: null,
    must_not_override: true },
];

// ── Replica of browser postProcessResult ─────────────────────────────────
function postProcessResult(result, note) {
  if (!result || result.verdict === 'proceeds') return [];
  const metItems = result.met_criteria;
  const hasMet = Array.isArray(metItems) && metItems.length > 0;
  if (!hasMet) return [];
  const overrides = [];
  const noteText = (result.notes || '').toLowerCase();
  const inputText = (note || result.interpreted_note || '').toLowerCase();
  const now = new Date().toISOString();

  const MET_PHRASES = ['fully met','meets criteria','meets p1','meets p2','meets p3','meets p4',
    'meets acute','meets urgent','meet criteria','meet p1','meet p2','meet p3','meet p4',
    'meet acute','meet urgent','pathway is met','pathway is fully met',
    'sufficient for acceptance','criteria are met','criteria met independently','criteria met'];

  function isStep0(text) {
    const t = (text || '').toLowerCase();
    return /\b111\b/.test(t) || /\bed\b/.test(t) || /\bemergency\b/.test(t) ||
           (/\bacc\b/.test(t) && /\btrauma\b|\binjury\b|\baccident\b/.test(t)) ||
           /cauda equina/i.test(t) || /testicular torsion/i.test(t) ||
           /ruptured aaa/i.test(t) || /pneumothorax/i.test(t);
  }

  function applyProceedsDisplay(r) {
    r.verdict_title = 'Referral likely to proceed';
    const sentences = (r.notes || '').replace(/([.!?])\s+/g, '$1\n').split('\n')
      .map(s => s.trim()).filter(Boolean);
    for (const s of sentences) {
      const sl = s.toLowerCase();
      if (MET_PHRASES.some(p => sl.includes(p))) {
        r.verdict_summary = s.length > 160 ? s.slice(0, 157) + '…' : s;
        return;
      }
    }
    r.verdict_summary = Array.isArray(r.met_criteria) && r.met_criteria.length > 0
      ? 'Criteria met: ' + r.met_criteria[0]
      : 'Referral criteria met.';
  }

  // Never override if a safety alert or the AI notes describe an emergency
  if (isStep0(result.safety_alert) || isStep0(noteText)) return [];

  // Check 1
  let matchedPhrase = null;
  for (const p of MET_PHRASES) { if (noteText.includes(p)) { matchedPhrase = p; break; } }
  if (matchedPhrase) {
    const ov = result.verdict;
    result.verdict = 'proceeds';
    if (Array.isArray(result.missing_criteria) && result.missing_criteria.length > 0) {
      result.notes = (result.notes || '') + '\n\nOther requirements not met (advisory — not blocking this referral): ' + result.missing_criteria.join('; ');
      result.missing_criteria = [];
    }
    applyProceedsDisplay(result);
    overrides.push({ check:'notes_say_met', original_verdict:ov, new_verdict:'proceeds',
      trigger:`notes contain '${matchedPhrase}'`, timestamp:now });
  }

  // Check 2
  const isFemale = /\bfemale\b|\bwoman\b|\bwomen\b|\bgirl\b/.test(inputText) || /\b\d+\s*f\b/.test(inputText);
  const isMale   = /\bmale\b|\bman\b|\bmen\b|\bboy\b/.test(inputText) || /\b\d+\s*m\b/.test(inputText);
  if ((isFemale || isMale) && Array.isArray(result.missing_criteria) && result.missing_criteria.length > 0) {
    const before = result.missing_criteria.length;
    result.missing_criteria = result.missing_criteria.filter(item => {
      const t = (item || '').toString().toLowerCase();
      if (isFemale && (/\bmale patient\b/.test(t) || /\bin men\b/.test(t) || /\bmale,/.test(t) || /\bmale older than\b/.test(t))) return false;
      if (isMale  && (/\bfemale patient\b/.test(t) || /\bin women\b/.test(t) || /\bfemale,/.test(t) || /\bfemale of any age\b/.test(t))) return false;
      return true;
    });
    const removed = before - result.missing_criteria.length;
    if (removed > 0) {
      const gender = isFemale ? 'female' : 'male';
      if (result.missing_criteria.length === 0 && result.verdict !== 'proceeds') {
        const ov = result.verdict;
        result.verdict = 'proceeds';
        applyProceedsDisplay(result);
        overrides.push({ check:'gender_inapplicable_criteria', original_verdict:ov, new_verdict:'proceeds',
          trigger:`removed ${removed} gender-inapplicable missing criteria for ${gender} patient; missing_criteria now empty`, timestamp:now });
      } else {
        overrides.push({ check:'gender_inapplicable_criteria', original_verdict:result.verdict, new_verdict:result.verdict,
          trigger:`removed ${removed} gender-inapplicable missing criteria for ${gender} patient`, timestamp:now });
      }
    }
  }

  // Final cleanup: if Check 1 or 2 set verdict to proceeds, move any remaining
  // missing_criteria to advisory notes — they cannot be requirements for a proceeding referral.
  if (overrides.length > 0 && result.verdict === 'proceeds' &&
      Array.isArray(result.missing_criteria) && result.missing_criteria.length > 0) {
    result.notes = (result.notes || '') + '\n\nOther requirements not met (advisory — not blocking this referral): ' + result.missing_criteria.join('; ');
    result.missing_criteria = [];
  }

  return overrides;
}

// ── Infrastructure ────────────────────────────────────────────────────────
function stripFencesAndExtract(text) {
  let clean = text.replace(/^```[a-z]*\s*/i, '').replace(/\s*```[\s\S]*/, '').trim();
  const jStart = clean.indexOf('{');
  if (jStart !== -1) {
    let depth = 0, inStr = false, esc = false, jEnd = -1;
    for (let ci = jStart; ci < clean.length; ci++) {
      const ch = clean[ci];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
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

function detectPaediatric(noteText) {
  const note = noteText.toLowerCase();
  const patterns = [
    /\b([0-9]|1[0-5])\s*[-\s]?year[-\s]?old/i,
    /\b([0-9]|1[0-5])\s*yo\b/i,
    /\baged?\s+([0-9]|1[0-5])\b/i,
    /\b([0-9]|1[0-5])\s*(?:month|mth|wk|week)s?[-\s]?old/i,
    /\bnewborn\b|\bneonatal\b|\binfant\b|\btoddler\b/i,
    /\bpaediatric\b|\bpediatric\b/i,
  ];
  for (const p of patterns) {
    const m = note.match(p);
    if (m) {
      if (p.source.includes('newborn') || p.source.includes('paediatric')) return true;
      const age = parseInt(m[1], 10);
      if (!isNaN(age) && age < 16) return true;
    }
  }
  return false;
}

const STRICT_INSTRUCTION = '2. DOCUMENTATION STANDARD — STRICT: Only count information as documented if EXPLICITLY STATED in the note. Do NOT infer.\n\n';
const JSON_SCHEMA = '\nRespond ONLY with valid JSON (no markdown fences):\n'
  + '{"interpreted_note":"...","exam":"...","modality":"...","verdict":"proceeds|at_risk|declined",'
  + '"verdict_title":"...","verdict_summary":"...","priority":"...","criteria_page":"...",'
  + '"met_criteria":["..."],"missing_criteria":["..."],"add_to_note":["..."],'
  + '"suggested_wording":"...","not_funded_flag":false,"safety_alert":null,"redirect":null,"notes":"..."}';

function buildSystemPrompt(promptText, criteriaBlock, isPaed) {
  const preamble = 'You are a clinical decision support assistant for the New Zealand Community Referred Radiology (CRR) programme.\n\n';
  const withDocMode = promptText.replace('{{DOC_MODE_INSTRUCTION}}', STRICT_INSTRUCTION);
  const paedNote = isPaed ? 'NOTE: This patient is PAEDIATRIC. Use ONLY the paediatric criteria below.\n\n' : '';
  return preamble + withDocMode + paedNote
    + 'CRITERIA (National Primary Care Referral Criteria for Imaging, April 2026 reissue):\n\n'
    + criteriaBlock + JSON_SCHEMA;
}

function buildCriteriaBlock(siteIndex) {
  return siteIndex.map(site => {
    const pageRef = site.page ? ` [p${site.page}]` : '';
    const lines = [`=== ${site.exam_title} — ${site.site_label} (${site.modality})${pageRef} ===`];
    if (site.guidance) lines.push(`Guidance: ${site.guidance}`);
    (site.groups || []).forEach(g => {
      lines.push(`[${g.title}]`);
      (g.items || []).forEach(it => lines.push((it.mandatory ? '* MANDATORY: ' : '- ') + it.label));
    });
    if (site.alternativeManagement) lines.push(`REDIRECT: ${site.alternativeManagement}`);
    if (site.footnotes) lines.push(`DEFINITIONS: ${site.footnotes}`);
    lines.push('');
    return lines.join('\n');
  }).join('\n');
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callAPI(systemPrompt, note) {
  const userMsg = 'Documentation standard: STRICT — only explicitly stated facts count.'
    + '\n\nAssess this referral note:\n\n' + note
    + '\n\nIMPORTANT: Respond with ONLY the JSON object as specified.';

  const resp = await fetch(`${API_BASE}/api/triage/assess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2400,
      temperature: 0.1,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (resp.status === 429) {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(next.getUTCHours() + 1, 1, 0, 0);
    const wait = Math.ceil((next - now) / 1000);
    console.log(`  429 rate limit — waiting ${wait}s for next UTC hour...`);
    await sleep(wait * 1000);
    return callAPI(systemPrompt, note);
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`API ${resp.status}: ${err.error?.message || resp.statusText}`);
  }

  const data = await resp.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Empty response');
  const clean = stripFencesAndExtract(text);
  try {
    return { parsed: JSON.parse(clean), raw: text, ok: true };
  } catch(e) {
    return { parsed: null, raw: text, ok: false, err: e.message };
  }
}

async function main() {
  console.log('=== Post-Processing Validation Test ===\n');

  // Fetch prompt
  let promptText;
  if (ADMIN_KEY) {
    const r = await fetch(`${API_BASE}/api/admin/system-prompt/versions/2.2.0`, {
      headers: { 'x-admin-key': ADMIN_KEY }
    });
    const d = await r.json();
    promptText = d.instruction_text;
  } else {
    promptText = readFileSync('/Users/garyireland/vite-react-template/instructions/Prompt-Dev-Done/system-prompt-v2.2.0.txt', 'utf8');
    console.log('(Using local v2.2.0 prompt)\n');
  }

  // Fetch criteria
  const mdResp = await fetch(`${API_BASE}/api/match-data`);
  const matchData = await mdResp.json();
  const adultIndex = matchData.index || [];
  const paedIndex = matchData.paed_index || [];

  const summary = [];

  for (const tc of TEST_CASES) {
    console.log(`\n──────────────────────────────────────────────`);
    console.log(`Case: ${tc.case_id}  (${tc.runs} run${tc.runs > 1 ? 's' : ''})`);
    console.log(`Note: ${tc.clinical_note.slice(0, 80)}…`);

    const isPaed = detectPaediatric(tc.clinical_note);
    const index = isPaed ? paedIndex : adultIndex;
    const criteriaBlock = buildCriteriaBlock(index);
    const systemPrompt = buildSystemPrompt(promptText, criteriaBlock, isPaed);

    const runResults = [];

    for (let run = 1; run <= tc.runs; run++) {
      if (run > 1) await sleep(DELAY_MS);
      process.stdout.write(`  Run ${run}/${tc.runs}: `);

      try {
        const ai = await callAPI(systemPrompt, tc.clinical_note);
        if (!ai.ok) {
          console.log(`PARSE FAIL — ${ai.err}`);
          runResults.push({ run, ok: false });
          continue;
        }

        const r = ai.parsed;
        const rawVerdict = r.verdict;
        const rawNotes = (r.notes || '').slice(0, 120);
        const rawMissing = (r.missing_criteria || []).length;
        const rawRedirect = r.redirect ? r.redirect.slice(0, 60) : null;

        // Apply post-processing (mutates r)
        const overrides = postProcessResult(r, tc.clinical_note);
        const finalVerdict = r.verdict;
        const overrideFired = overrides.length > 0;
        const overrideNames = overrides.map(o => o.check).join(', ');

        const status = overrideFired
          ? `RAW=${rawVerdict} → OVERRIDE → ${finalVerdict}  [${overrideNames}]`
          : `RAW=${rawVerdict} (no override)`;
        console.log(status);

        if (overrideFired) {
          overrides.forEach(o => console.log(`    trigger:       ${o.trigger}`));
          console.log(`    verdict_title: ${r.verdict_title || '(not set)'}`);
          console.log(`    verdict_sum:   ${(r.verdict_summary || '(not set)').slice(0, 100)}`);
          console.log(`    missing after: ${(r.missing_criteria || []).length} items`);
        }
        if (rawNotes) console.log(`    notes:    ${rawNotes}`);
        if (rawRedirect) console.log(`    redirect: ${rawRedirect}`);

        // Validate against expectations
        let pass;
        if (tc.must_not_override) {
          pass = !overrideFired;
          if (overrideFired) console.log(`    ❌ FAIL: override fired but must NOT override for this case`);
          else console.log(`    ✓ PASS: no override (correct)`);
        } else {
          // We expect override to fire ONLY when AI was wrong
          if (rawVerdict === 'proceeds') {
            pass = true;
            console.log(`    ✓ AI already correct (proceeds) — no override needed`);
          } else if (overrideFired && finalVerdict === 'proceeds') {
            pass = true;
            console.log(`    ✓ Override corrected verdict to proceeds`);
          } else {
            // Override didn't fire OR didn't correct to proceeds — check if it's a legitimate at_risk
            pass = false;
            console.log(`    ⚠  Override did not fire or did not correct to proceeds`);
          }
        }

        runResults.push({ run, rawVerdict, finalVerdict, overrideFired, overrideNames, pass });

      } catch(e) {
        console.log(`ERROR: ${e.message}`);
        runResults.push({ run, ok: false, err: e.message });
      }
    }

    const passed = runResults.filter(r => r.pass).length;
    const total = runResults.filter(r => r.ok !== false).length;
    const overrideCount = runResults.filter(r => r.overrideFired).length;
    console.log(`\n  ${tc.case_id} summary: ${passed}/${total} passed · ${overrideCount}/${total} overrides fired`);
    summary.push({ case_id: tc.case_id, passed, total, overrideCount, must_not_override: tc.must_not_override });
  }

  console.log('\n\n=== SUMMARY ===');
  console.log(`${'Case'.padEnd(12)} ${'Pass'.padEnd(8)} ${'Overrides'.padEnd(12)} Notes`);
  console.log('─'.repeat(60));
  for (const s of summary) {
    const overrideNote = s.must_not_override
      ? `must=0  actual=${s.overrideCount}`
      : `fired=${s.overrideCount}/${s.total}`;
    const tick = s.passed === s.total ? '✓' : '⚠';
    console.log(`${tick} ${s.case_id.padEnd(10)} ${String(s.passed+'/'+s.total).padEnd(8)} ${overrideNote}`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
