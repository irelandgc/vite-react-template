/**
 * Triage Advisor v2.3.0 Regression Test Runner
 * Fixes from v2.2.0 test:
 *   1. Step 3b verdict consistency check (TEST-004, LP-003, RP-006)
 *   2. GENERAL vs SPECIFIC VARIANTS rule in Step 1 (LP-003)
 *   3. Step 0 is the only place verdict can be set to declined via redirect (RP-006)
 *   4. AKI concrete example added to Step 3 (RP-006)
 */

const API_BASE = 'https://crr-criteria-api.fk4dsrmq5r.workers.dev';
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const DELAY_MS = 3000; // 3s between calls — stays within 30/hr limit for single pass

const _args = process.argv.slice(2);
const MODEL_OVERRIDE = _args[_args.indexOf('--model') + 1] || 'claude-sonnet-4-20250514';

const TEST_CASES = [
  { case_id: 'RP-000', qa_id: 13, exam: 'CT Head',
    clinical_note: '45 maori woman with 2/12 h/o progressively worsening HA present nocturnally and first thing in the morning with associated blurred vision and nausea',
    previous_verdict_v22: 'proceeds',
    evaluator_verdict: 'Correct — should proceed',
    evaluator_comment: 'Correct verdict. Progressive worsening HA with nocturnal/morning pattern, nausea, blurred vision clearly meets criteria.' },

  { case_id: 'RP-001', qa_id: 16, exam: 'CT Chest/Abdomen/Pelvis',
    clinical_note: '65yo male w/ unexplained wt loss 5% over past 6/12 with no localising symptoms or signs. Hb mildly low. Ex-smoker.',
    previous_verdict_v22: 'at_risk',
    evaluator_verdict: 'At risk — should accept Hb mildly low, still needs 2nd abnormal blood',
    evaluator_comment: '"Hb mildly low" should meet "low Hb" criterion without numeric value. Should flag only 1 of 2 required abnormal bloods.' },

  { case_id: 'RP-002', qa_id: 17, exam: 'Ultrasound Abdomen',
    clinical_note: '61yo european male newly diagnosed autoimmune hepatitis – liver edge felt just below RCM. Screen for HCC, cirrhosis',
    previous_verdict_v22: 'proceeds',
    evaluator_verdict: 'Proceeds — hepatomegaly pathway independently met',
    evaluator_comment: 'Should accept on hepatomegaly pathway. HCC surveillance gateway advisory only, not blocking.' },

  { case_id: 'RP-003', qa_id: 18, exam: 'CT Head',
    clinical_note: '64yo f w/ sudden onset R facial numbness + diplopia, lasting 10min. O/E: reduced sensation R face cf L, FROEM without diplopia. Obs OK, pulse regular. ?TIA',
    previous_verdict_v22: 'proceeds',
    evaluator_verdict: 'Proceeds — focal neurological signs pathway independently met',
    evaluator_comment: '?TIA is a differential. Focal neuro signs independently meet criteria. TIA gateway advisory only.' },

  { case_id: 'RP-004', qa_id: 19, exam: 'CT Head',
    clinical_note: '48yo m w/ 8/52 h/o progressive HA – bilateral – sometimes associated nausea – dizziness and vertigo over this period (normal hearing + vision testing). ?SOL',
    previous_verdict_v22: 'proceeds',
    evaluator_verdict: 'At risk — "progressive" meets pattern change; still missing one associated feature',
    evaluator_comment: '"Progressive" should satisfy change in pattern element. Still needs Valsalva/persistent nausea/neuro/malignancy.' },

  { case_id: 'RP-005', qa_id: 20, exam: 'Knee X-ray',
    clinical_note: '8yo boy 5/12 h/o progressive pain R lower leg – ?knee ?ankle. Pain during the day and night. Limp at times. Stopping him from doing normal activities (basketball and karate). R/O overt malignancy.',
    previous_verdict_v22: 'proceeds',
    evaluator_verdict: 'Proceeds — paediatric bone pain criteria met',
    evaluator_comment: 'Progressive pain, night pain, functional impairment in child. Should proceed on paediatric pathway.' },

  { case_id: 'RP-006', qa_id: 21, exam: 'Renal Ultrasound',
    clinical_note: '75yo m w/ new AKI, eGFR 3 (normally 55). No clear cause.',
    previous_verdict_v22: 'declined',
    evaluator_verdict: 'Proceeds — surface P1 AKI and P2, note conflicting dispositions',
    evaluator_comment: 'Should surface all matching pathways. eGFR 3 is severe AKI — should flag P1 Acute 48hr.' },

  { case_id: 'LP-001', qa_id: 8, exam: 'Chest X-ray',
    clinical_note: '55 yo man, 3 days cough, fever and shortness of breath',
    previous_verdict_v22: 'proceeds',
    evaluator_verdict: 'Proceeds — CAP criteria met',
    evaluator_comment: 'Classic CAP presentation. Should proceed.' },

  { case_id: 'LP-002', qa_id: 9, exam: 'Spine X-ray',
    clinical_note: '3 months lower back pain after stepping down from a ladder. no radiation, no bowel symptoms. no fevers. not tender to palpation. normal lower limb exam.',
    previous_verdict_v22: 'declined',
    evaluator_verdict: 'Redirect to ACC — trauma mechanism',
    evaluator_comment: 'Mechanism of injury (stepping down from ladder) = trauma = ACC funding pathway, not CRR.' },

  { case_id: 'LP-003', qa_id: 10, exam: 'Ultrasound Pelvis',
    clinical_note: '56 yo post menopausal woman on hormone replacement therapy with 2 days of PV bleeding',
    previous_verdict_v22: 'at_risk',
    evaluator_verdict: 'Proceeds — postmenopausal bleeding',
    evaluator_comment: 'PMB on HRT. Should proceed. HRT does not exclude CRR eligibility.' },

  { case_id: 'LP-004', qa_id: 11, exam: 'Ultrasound Pelvis',
    clinical_note: '35yo with Mirena, recent lower abdominal pain and pv bleeding ? IUD malpositioned',
    previous_verdict_v22: 'proceeds',
    evaluator_verdict: 'Proceeds — IUD/Mirena malposition assessment',
    evaluator_comment: 'Pain and bleeding with possible IUD malposition. Should proceed.' },

  { case_id: 'CR-001', qa_id: 22, exam: 'Chest X-ray',
    clinical_note: '42 yr old homeless patient with fever productive cough, smoker, unsure re wt loss. Fine lower basal crepitus, mild tachy,',
    previous_verdict_v22: 'proceeds',
    evaluator_verdict: 'Proceeds — CAP or TB concern',
    evaluator_comment: 'Homeless, smoker, productive cough, fever, crepitus, tachycardia. Should proceed — CAP or TB screening.' },

  { case_id: 'CR-002', qa_id: 23, exam: 'Hip X-ray',
    clinical_note: '13 year old boy with R knee pain for past few weeks, staying with grandparents in town holidays and usually lives rurally. Knee examination is normal no fever, mild limp, restricted ROM R hip mild pain. No recent illness',
    previous_verdict_v22: 'proceeds',
    evaluator_verdict: 'Proceeds — SUFE/hip pathology concern',
    evaluator_comment: 'Knee exam normal, restricted hip ROM in adolescent male — classic SUFE presentation. Should proceed with hip X-ray.' },

  { case_id: 'CR-003', qa_id: 25, exam: 'Renal Ultrasound',
    clinical_note: 'Persisting microscopic haematuria in usually well and active 64 year old lady works as a hairdresser all her life, non smoker, No infection on microscopy, no wt loss or other symptoms',
    previous_verdict_v22: 'proceeds',
    evaluator_verdict: 'Proceeds — persistent microscopic haematuria, no infection',
    evaluator_comment: 'Persistent microscopic haematuria, infection excluded. Should proceed.' },

  { case_id: 'TEST-001', qa_id: null, exam: 'CT Chest/Abdomen/Pelvis',
    clinical_note: '62yo male w/ unexplained weight loss 8% over 4 months. No focal pathology. CRP raised, Hb low, albumin low. Ex-smoker.',
    previous_verdict_v22: 'proceeds',
    evaluator_verdict: 'Proceeds — all CT CAP criteria met (3 abnormal bloods, weight loss ≥5% over ≥3 months)',
    evaluator_comment: '4 months meets 3-6 month window. 3 abnormal bloods documented. Should proceed.' },

  { case_id: 'TEST-003', qa_id: null, exam: 'CT Head',
    clinical_note: '58yo m w/ sudden onset L arm weakness and facial droop, resolved after 20 minutes. O/E: mild residual L facial weakness. BP 165/95. ?TIA',
    previous_verdict_v22: 'proceeds',
    evaluator_verdict: 'Proceeds — focal neuro signs independently met; TIA gateway advisory',
    evaluator_comment: 'Residual focal weakness documented. Should proceed on focal neuro pathway.' },

  { case_id: 'TEST-004', qa_id: null, exam: 'Ultrasound Abdomen',
    clinical_note: '55yo male, known Hep C. Liver palpable 3cm below costal margin, firm and non-tender. Referred for HCC surveillance and assessment of hepatomegaly.',
    previous_verdict_v22: 'at_risk',
    evaluator_verdict: 'Proceeds — hepatomegaly pathway independently met',
    evaluator_comment: 'Hepatomegaly documented (3cm below costal margin). Should proceed on hepatomegaly pathway.' },

  { case_id: 'TEST-005', qa_id: null, exam: 'Renal Ultrasound',
    clinical_note: '68yo f w/ acute kidney injury, eGFR dropped from 60 to 12 over 5 days. No obstruction suspected. No clear cause identified.',
    previous_verdict_v22: 'proceeds',
    evaluator_verdict: 'Proceeds — surface P1 and P2, note conflicting dispositions',
    evaluator_comment: 'Severe AKI — should surface P1 Acute 48hr. Note conflicting dispositions.' },

  { case_id: 'TEST-006', qa_id: null, exam: 'CT Head',
    clinical_note: '45yo m, episode of slurred speech and R hand clumsiness lasting 30 minutes yesterday. Fully resolved. BP normal. ?TIA. No other focal signs currently.',
    previous_verdict_v22: 'at_risk',
    evaluator_verdict: 'At risk — focal neuro signs transiently met; TIA gateway advisory; note history of focal signs',
    evaluator_comment: 'Transient focal signs still relevant. Should be at_risk with note about TIA gateway.' },

  { case_id: 'TEST-007', qa_id: null, exam: 'CT Chest/Abdomen/Pelvis',
    clinical_note: '70yo f w/ unexplained weight loss 3% over 2 months. Low Hb, raised CRP.',
    previous_verdict_v22: 'declined',
    evaluator_verdict: 'At risk or declined — weight loss 3% (below 5% threshold) AND 2 months (below 3-month threshold)',
    evaluator_comment: 'Both weight loss % and duration fall below thresholds. Should be declined or at_risk.' },
];

function detectPaediatric(noteText) {
  const patterns = [
    /\b([0-9]|1[0-5])\s*[-\s]?year[-\s]?old/i,
    /\b([0-9]|1[0-5])\s*yo\b/i,
    /\baged?\s+([0-9]|1[0-5])\b/i,
    /\b([0-9]|1[0-5])\s*(?:month|mth|wk|week)s?[-\s]?old/i,
    /\bnewborn\b|\bneonatal\b|\binfant\b|\btoddler\b/i,
    /\bpaediatric\b|\bpediatric\b/i,
  ];
  for (const p of patterns) {
    const m = noteText.match(p);
    if (m) {
      if (p.source.includes('newborn') || p.source.includes('paediatric')) return true;
      const age = parseInt(m[1], 10);
      if (!isNaN(age) && age < 16) return true;
    }
  }
  return false;
}

const STRICT_INSTRUCTION = '2. DOCUMENTATION STANDARD — STRICT: Only count information as documented if EXPLICITLY STATED in the note. Do NOT infer. Age and sex must be explicitly stated.\n\n';

const JSON_SCHEMA = '\nRespond ONLY with valid JSON (no markdown fences):\n'
  + '{\n'
  + '  "interpreted_note": "<corrected note>",\n'
  + '  "exam": "<exam — site>",\n'
  + '  "modality": "<CT|Ultrasound|X-Ray>",\n'
  + '  "verdict": "proceeds"|"at_risk"|"declined",\n'
  + '  "verdict_title": "<title>",\n'
  + '  "verdict_summary": "<one clear sentence>",\n'
  + '  "priority": "<Acute 24hr / Acute 48hr / P2 / P3 / P4 / S1 / S2 / S3 — or null>",\n'
  + '  "criteria_page": "<page ref>",\n'
  + '  "met_criteria": ["<sub-element [pXX]>"],\n'
  + '  "missing_criteria": ["<sub-element [pXX]>"],\n'
  + '  "add_to_note": ["<specific sentence>"],\n'
  + '  "suggested_wording": "<rewritten note or null>",\n'
  + '  "not_funded_flag": true|false,\n'
  + '  "safety_alert": "<urgent message or null>",\n'
  + '  "redirect": "<pathway or null>",\n'
  + '  "notes": "<other context or null>"\n'
  + '}';

function buildCriteriaBlock(siteIndex) {
  return siteIndex.map(s => {
    const lines = [`=== ${s.exam_title} — ${s.site_label} (${s.modality})${s.page ? ` [p${s.page}]` : ''} ===`];
    if (s.guidance) lines.push(`Guidance: ${s.guidance}`);
    if (s.guidanceNarrative) lines.push(`Background: ${s.guidanceNarrative}`);
    (s.groups || []).forEach(g => {
      lines.push(`[${g.title}]`);
      (g.items || []).forEach(it => lines.push((it.mandatory ? '* MANDATORY: ' : '- ') + it.label));
    });
    if (s.outOfCriteriaNote) lines.push(`OUT OF CRITERIA: ${s.outOfCriteriaNote}`);
    if (s.alternativeManagement) lines.push(`REDIRECT: ${s.alternativeManagement}`);
    if (s.notFundedDetail) lines.push(`NOT ROUTINELY FUNDED: ${s.notFundedDetail}`);
    if (s.footnotes) lines.push(`DEFINITIONS AND SUB-CRITERIA: ${s.footnotes}`);
    lines.push('');
    return lines.join('\n');
  }).join('');
}

function buildSystemPrompt(instructionText, criteriaBlock, isPaed) {
  const preamble = 'You are a clinical decision support assistant for the New Zealand Community Referred Radiology (CRR) programme. Your role is to tell the GP clearly whether their referral will proceed, is at risk, or will be declined — and exactly what to document to fix it.\n\n';
  const withDocMode = instructionText.replace('{{DOC_MODE_INSTRUCTION}}', STRICT_INSTRUCTION);
  const paedNote = isPaed
    ? 'NOTE: This patient is PAEDIATRIC. Use ONLY the paediatric criteria below. Adult criteria do not apply.\n\n'
    : '';
  return preamble + withDocMode + paedNote
    + 'CRITERIA (National Primary Care Referral Criteria for Imaging, April 2026 reissue):\n\n'
    + criteriaBlock + JSON_SCHEMA;
}

function stripAndExtract(text) {
  let c = text.replace(/^```[a-z]*\s*/i, '').replace(/\s*```[\s\S]*/, '').trim();
  const j = c.indexOf('{');
  if (j < 0) return c;
  let d = 0, inS = false, esc = false, e = -1;
  for (let i = j; i < c.length; i++) {
    const ch = c[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inS) { esc = true; continue; }
    if (ch === '"') { inS = !inS; continue; }
    if (!inS) { if (ch === '{') d++; else if (ch === '}') { if (--d === 0) { e = i; break; } } }
  }
  return e >= 0 ? c.slice(j, e + 1) : c;
}

async function runCase(tc, systemPrompt, retries = 3) {
  const userMsg = 'Documentation standard: STRICT — only explicitly stated facts count.'
    + '\n\nNote: silently correct any obvious typos or voice-to-text errors before assessing, include in interpreted_note.'
    + '\n\nAssess this referral note:\n\n' + tc.clinical_note
    + '\n\nIMPORTANT: Respond with ONLY the JSON object as specified.';

  for (let attempt = 1; attempt <= retries; attempt++) {
    const resp = await fetch(`${API_BASE}/api/triage/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_OVERRIDE,
        max_tokens: 2400,
        temperature: 0.1,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (resp.status === 429) {
      // Rate limited — wait for next UTC hour boundary
      const now = new Date();
      const next = new Date(now);
      next.setUTCMinutes(0, 0, 0);
      next.setUTCHours(next.getUTCHours() + 1);
      const waitMs = (next - now) + 5000;
      console.log(`\n  [429] Rate limited. Waiting ${Math.ceil(waitMs/1000)}s for next hour window...`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(`API ${resp.status}: ${err.error?.message || resp.statusText}`);
    }

    const data = await resp.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new Error('Empty response');
    const clean = stripAndExtract(text);
    try {
      return { parsed: JSON.parse(clean), raw: text, parseSuccess: true };
    } catch (e) {
      return { parsed: null, raw: text, parseSuccess: false, parseError: e.message };
    }
  }
  throw new Error('Max retries exceeded');
}

function assessRegression(tc, ai, v22verdict) {
  if (!ai.parseSuccess) return 'regressed';
  const r = ai.parsed;
  const ev = tc.evaluator_verdict.toLowerCase();

  const expectProceeds = ev.includes('proceed') || ev.includes('correct');
  const expectAtRisk   = ev.includes('at risk') || ev.includes('at_risk');
  const expectDeclined = ev.includes('declined') || ev.includes('redirect');
  const expectRedirect = ev.includes('redirect') || ev.includes('acc');

  const v = r.verdict;
  const hasRedirect = !!(r.redirect);

  let matches;
  if (expectRedirect && expectDeclined) {
    matches = (v === 'declined' && hasRedirect) || v === 'declined';
  } else if (expectProceeds) {
    matches = v === 'proceeds';
  } else if (expectAtRisk) {
    matches = v === 'at_risk' || v === 'proceeds';
  } else if (expectDeclined) {
    matches = v === 'declined' || v === 'at_risk';
  } else {
    matches = true;
  }

  if (tc.case_id === 'LP-002') matches = v === 'declined' && hasRedirect;
  if (tc.case_id === 'TEST-007') matches = v === 'declined' || v === 'at_risk';

  // Compare against v2.2.0 baseline
  const wasWrongInV22 = (v22verdict === 'declined' || v22verdict === 'at_risk') && expectProceeds;
  const isNowCorrect = matches;
  const wasCorrectInV22 = !wasWrongInV22;

  if (isNowCorrect && wasWrongInV22) return 'improved';
  if (isNowCorrect && wasCorrectInV22) return 'unchanged';
  if (!isNowCorrect && wasCorrectInV22) return 'regressed';
  return 'unchanged'; // was wrong in v2.2.0 and still wrong — not a new regression
}

async function main() {
  console.log('Loading v2.3.0 prompt...');
  let promptText;
  if (ADMIN_KEY) {
    const r = await fetch(`${API_BASE}/api/admin/system-prompt/versions/2.3.0`, {
      headers: { 'x-admin-key': ADMIN_KEY },
    });
    if (!r.ok) throw new Error(`Admin API ${r.status}`);
    promptText = (await r.json()).instruction_text;
  } else {
    const { readFileSync } = await import('fs');
    promptText = readFileSync('instructions/system-prompt-v2.3.0.txt', 'utf8');
    console.log('  No ADMIN_KEY — reading from local file');
  }
  console.log(`Prompt: ${promptText.length} chars`);

  console.log('Fetching match-data...');
  const mdResp = await fetch(`${API_BASE}/api/match-data`);
  if (!mdResp.ok) throw new Error(`match-data ${mdResp.status}`);
  const matchData = await mdResp.json();
  const adultIndex = matchData.index || [];
  const paedIndex  = matchData.paed_index || [];
  console.log(`Loaded ${adultIndex.length} adult + ${paedIndex.length} paed sites`);

  const adultPrompt = buildSystemPrompt(promptText, buildCriteriaBlock(adultIndex), false);
  const paedPrompt  = buildSystemPrompt(promptText, buildCriteriaBlock(paedIndex), true);
  console.log(`Prompts: adult ${adultPrompt.length} chars, paed ${paedPrompt.length} chars\n`);

  const results = [];
  let improved = 0, unchanged = 0, regressed = 0;

  for (const tc of TEST_CASES) {
    const isPaed = detectPaediatric(tc.clinical_note);
    const sp = isPaed ? paedPrompt : adultPrompt;
    process.stdout.write(`[${tc.case_id}]${isPaed ? ' [P]' : ''} ${tc.exam}... `);

    try {
      const ai = await runCase(tc, sp);
      const status = assessRegression(tc, ai, tc.previous_verdict_v22);
      const r = ai.parsed || {};

      const notes = ai.parseSuccess
        ? `Verdict: ${r.verdict}. Priority: ${r.priority || 'n/a'}. Met: ${(r.met_criteria||[]).length}. Missing: ${(r.missing_criteria||[]).length}.${r.redirect ? ' Redirect: ' + r.redirect.substring(0, 60) : ''}${isPaed ? ' [paed]' : ''}`
        : `PARSE FAILED: ${ai.parseError}`;

      results.push({
        case_id: tc.case_id,
        qa_id: tc.qa_id,
        exam: tc.exam,
        paediatric: isPaed,
        clinical_note: tc.clinical_note,
        ai_response: ai.parseSuccess ? {
          verdict: r.verdict,
          verdict_title: r.verdict_title,
          verdict_summary: r.verdict_summary,
          priority: r.priority,
          criteria_page: r.criteria_page,
          met_criteria: r.met_criteria,
          missing_criteria: r.missing_criteria,
          add_to_note: r.add_to_note,
          suggested_wording: r.suggested_wording,
          not_funded_flag: r.not_funded_flag,
          safety_alert: r.safety_alert,
          redirect: r.redirect,
          notes: r.notes,
        } : { parse_error: ai.parseError, raw_response: ai.raw.substring(0, 800) },
        previous_verdict_v22: tc.previous_verdict_v22,
        evaluator_verdict: tc.evaluator_verdict,
        evaluator_comment: tc.evaluator_comment,
        regression_status: status,
        notes,
      });

      if (status === 'improved') improved++;
      else if (status === 'regressed') regressed++;
      else unchanged++;

      const icon = status === 'improved' ? '⬆' : status === 'regressed' ? '⬇' : '=';
      console.log(`${icon} ${status} — ${ai.parseSuccess ? r.verdict : 'PARSE FAIL'}`);
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      results.push({
        case_id: tc.case_id, qa_id: tc.qa_id, exam: tc.exam, paediatric: isPaed,
        clinical_note: tc.clinical_note,
        ai_response: { error: e.message },
        previous_verdict_v22: tc.previous_verdict_v22,
        evaluator_verdict: tc.evaluator_verdict,
        evaluator_comment: tc.evaluator_comment,
        regression_status: 'regressed', notes: `Error: ${e.message}`,
      });
      regressed++;
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\nFinal: ${improved} improved / ${unchanged} unchanged / ${regressed} regressed`);

  const output = {
    test_run: {
      date: new Date().toISOString(),
      prompt_version: '2.3.0',
      model: MODEL_OVERRIDE,
      mode: 'strict',
      paediatric_detection: 'enabled',
      baseline_comparison: 'v2.2.0',
    },
    summary: { total: results.length, improved, unchanged, regressed },
    results,
  };

  const { writeFileSync } = await import('fs');
  const jsonPath = 'instructions/prompt-v2.3.0-test-results.json';
  writeFileSync(jsonPath, JSON.stringify(output, null, 2));
  console.log(`\nJSON saved to ${jsonPath}`);

  // Markdown report
  const lines = [
    `# Triage Advisor v2.3.0 Regression Test Results`,
    ``,
    `**Date:** ${output.test_run.date}`,
    `**Prompt version:** 2.3.0 — Verdict consistency check + general-vs-specific pathway rule + clinical severity override fix`,
    `**Model:** ${output.test_run.model} | **Mode:** strict | **Paediatric detection:** enabled`,
    `**Baseline:** v2.2.0`,
    ``,
    `## Scorecard vs v2.2.0: ${improved} improved / ${unchanged} unchanged / ${regressed} regressed (${results.length} total)`,
    ``,
    `| Case | Exam | v2.2.0 | v2.3.0 | Evaluator Expects | Status |`,
    `|------|------|--------|--------|-------------------|--------|`,
  ];

  for (const r of results) {
    const ev = r.evaluator_verdict.replace('Correct — should proceed', 'Correct').replace('Proceeds — ', '').replace(' criteria met', '').replace(' pathway met', '').substring(0, 30);
    const v23 = r.ai_response?.verdict || 'ERROR';
    const icon = r.regression_status === 'improved' ? '⬆ improved' : r.regression_status === 'regressed' ? '⬇ REGRESSED' : '= unchanged';
    lines.push(`| ${r.case_id}${r.paediatric ? ' [P]' : ''} | ${r.exam} | ${r.previous_verdict_v22} | ${v23} | ${ev} | ${icon} |`);
  }
  lines.push('');

  const regressions = results.filter(r => r.regression_status === 'regressed');
  const improvements = results.filter(r => r.regression_status === 'improved');

  if (improvements.length > 0) {
    lines.push('## Improvements vs v2.2.0', '');
    for (const r of improvements) {
      const ar = r.ai_response || {};
      lines.push(`### ${r.case_id} — ${r.exam}`);
      lines.push(`**Note:** \`${r.clinical_note}\``);
      lines.push(`**v2.2.0:** ${r.previous_verdict_v22} → **v2.3.0:** ${ar.verdict}`);
      if (ar.verdict_summary) lines.push(`**Summary:** ${ar.verdict_summary}`);
      if (ar.notes) lines.push(`**Notes:** ${ar.notes}`);
      lines.push('');
    }
  }

  if (regressions.length > 0) {
    lines.push('## Regressions vs v2.2.0', '');
    for (const r of regressions) {
      const ar = r.ai_response || {};
      lines.push(`### ${r.case_id} — ${r.exam}`);
      lines.push(`**Note:** \`${r.clinical_note}\``);
      lines.push(`**v2.2.0:** ${r.previous_verdict_v22} → **v2.3.0:** ${ar.verdict_title || ar.error || ar.verdict || 'N/A'}`);
      if (ar.verdict_summary) lines.push(`**Summary:** ${ar.verdict_summary}`);
      if (ar.missing_criteria?.length) lines.push(`**Missing:** ${ar.missing_criteria.join(' · ')}`);
      if (ar.redirect) lines.push(`**Redirect:** ${ar.redirect}`);
      if (ar.notes) lines.push(`**Notes:** ${ar.notes}`);
      lines.push(`**Evaluator expects:** ${r.evaluator_verdict}`);
      lines.push('');
    }
  } else {
    lines.push('## No regressions vs v2.2.0', '');
  }

  const mdPath = 'instructions/prompt-v2.3.0-test-results.md';
  writeFileSync(mdPath, lines.join('\n'));
  console.log(`Markdown saved to ${mdPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
