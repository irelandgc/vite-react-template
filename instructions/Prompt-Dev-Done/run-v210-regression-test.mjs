/**
 * Triage Advisor v2.1.0 Regression Test Runner
 * Fixes from v2.0.0 test:
 *   1. Paediatric detection — uses paed_index for under-16 patients (fixes RP-005, CR-002)
 *   2. Tests against v2.1.0 prompt (gender-exclusive criteria fix + one-pathway-met rule)
 */

const API_BASE = 'https://crr-criteria-api.fk4dsrmq5r.workers.dev';
const ADMIN_KEY = process.env.ADMIN_KEY || '';

const TEST_CASES = [
  { case_id: 'RP-000', qa_id: 13, exam: 'CT Head',
    clinical_note: '45 maori woman with 2/12 h/o progressively worsening HA present nocturnally and first thing in the morning with associated blurred vision and nausea',
    previous_verdict_v1: 'Proceeds — P2 headache pathway met',
    evaluator_verdict: 'Correct — should proceed',
    evaluator_comment: 'Correct verdict. Progressive worsening HA with nocturnal/morning pattern, nausea, blurred vision clearly meets criteria.' },

  { case_id: 'RP-001', qa_id: 16, exam: 'CT Chest/Abdomen/Pelvis',
    clinical_note: '65yo male w/ unexplained wt loss 5% over past 6/12 with no localising symptoms or signs. Hb mildly low. Ex-smoker.',
    previous_verdict_v1: 'Declined — demanded specific Hb numeric value',
    evaluator_verdict: 'At risk — should accept Hb mildly low, still needs 2nd abnormal blood',
    evaluator_comment: '"Hb mildly low" should meet "low Hb" criterion without numeric value. Should flag only 1 of 2 required abnormal bloods.' },

  { case_id: 'RP-002', qa_id: 17, exam: 'Ultrasound Abdomen',
    clinical_note: '61yo european male newly diagnosed autoimmune hepatitis – liver edge felt just below RCM. Screen for HCC, cirrhosis',
    previous_verdict_v1: 'Declined — HCC surveillance gateway blocked hepatomegaly acceptance',
    evaluator_verdict: 'Proceeds — hepatomegaly pathway independently met',
    evaluator_comment: 'Should accept on hepatomegaly pathway. HCC surveillance gateway advisory only, not blocking.' },

  { case_id: 'RP-003', qa_id: 18, exam: 'CT Head',
    clinical_note: '64yo f w/ sudden onset R facial numbness + diplopia, lasting 10min. O/E: reduced sensation R face cf L, FROEM without diplopia. Obs OK, pulse regular. ?TIA',
    previous_verdict_v1: 'Declined — ?TIA triggered mandatory gateway, overrode focal neuro signs',
    evaluator_verdict: 'Proceeds — focal neurological signs pathway independently met',
    evaluator_comment: '?TIA is a differential. Focal neuro signs independently meet criteria. TIA gateway advisory only.' },

  { case_id: 'RP-004', qa_id: 19, exam: 'CT Head',
    clinical_note: '48yo m w/ 8/52 h/o progressive HA – bilateral – sometimes associated nausea – dizziness and vertigo over this period (normal hearing + vision testing). ?SOL',
    previous_verdict_v1: 'At risk — "change in pattern" flagged as not clearly documented despite "progressive"',
    evaluator_verdict: 'At risk — "progressive" meets pattern change; still missing one associated feature',
    evaluator_comment: '"Progressive" should satisfy change in pattern element. Still needs Valsalva/persistent nausea/neuro/malignancy.' },

  { case_id: 'RP-005', qa_id: 20, exam: 'Knee X-ray',
    clinical_note: '8yo boy 5/12 h/o progressive pain R lower leg – ?knee ?ankle. Pain during the day and night. Limp at times. Stopping him from doing normal activities (basketball and karate). R/O overt malignancy.',
    previous_verdict_v1: 'Proceeds — paediatric pathway met',
    evaluator_verdict: 'Proceeds — paediatric bone pain criteria met',
    evaluator_comment: 'Progressive pain, night pain, functional impairment in child. Should proceed on paediatric pathway.' },

  { case_id: 'RP-006', qa_id: 21, exam: 'Renal Ultrasound',
    clinical_note: '75yo m w/ new AKI, eGFR 3 (normally 55). No clear cause.',
    previous_verdict_v1: 'Proceeds P2 — found P2 only, missed P1 and conflicting dispositions',
    evaluator_verdict: 'Proceeds — surface P1 AKI and P2, note conflicting dispositions',
    evaluator_comment: 'Should surface all matching pathways. eGFR 3 is severe AKI — should flag P1 Acute 48hr.' },

  { case_id: 'LP-001', qa_id: 8, exam: 'Chest X-ray',
    clinical_note: '55 yo man, 3 days cough, fever and shortness of breath',
    previous_verdict_v1: 'Proceeds — community acquired pneumonia criteria met',
    evaluator_verdict: 'Proceeds — CAP criteria met',
    evaluator_comment: 'Classic CAP presentation. Should proceed.' },

  { case_id: 'LP-002', qa_id: 9, exam: 'Spine X-ray',
    clinical_note: '3 months lower back pain after stepping down from a ladder. no radiation, no bowel symptoms. no fevers. not tender to palpation. normal lower limb exam.',
    previous_verdict_v1: 'Redirect — trauma mechanism should go through ACC',
    evaluator_verdict: 'Redirect to ACC — trauma mechanism',
    evaluator_comment: 'Mechanism of injury (stepping down from ladder) = trauma = ACC funding pathway, not CRR.' },

  { case_id: 'LP-003', qa_id: 10, exam: 'Ultrasound Pelvis',
    clinical_note: '56 yo post menopausal woman on hormone replacement therapy with 2 days of PV bleeding',
    previous_verdict_v1: 'Proceeds — postmenopausal bleeding criteria met',
    evaluator_verdict: 'Proceeds — postmenopausal bleeding',
    evaluator_comment: 'PMB on HRT. Should proceed. HRT does not exclude CRR eligibility.' },

  { case_id: 'LP-004', qa_id: 11, exam: 'Ultrasound Pelvis',
    clinical_note: '35yo with Mirena, recent lower abdominal pain and pv bleeding ? IUD malpositioned',
    previous_verdict_v1: 'Proceeds — IUD assessment criteria met',
    evaluator_verdict: 'Proceeds — IUD/Mirena malposition assessment',
    evaluator_comment: 'Pain and bleeding with possible IUD malposition. Should proceed.' },

  { case_id: 'CR-001', qa_id: 22, exam: 'Chest X-ray',
    clinical_note: '42 yr old homeless patient with fever productive cough, smoker, unsure re wt loss. Fine lower basal crepitus, mild tachy,',
    previous_verdict_v1: 'Proceeds — CAP/TB concern criteria met',
    evaluator_verdict: 'Proceeds — CAP or TB concern',
    evaluator_comment: 'Homeless, smoker, productive cough, fever, crepitus, tachycardia. Should proceed — CAP or TB screening.' },

  { case_id: 'CR-002', qa_id: 23, exam: 'Hip X-ray',
    clinical_note: '13 year old boy with R knee pain for past few weeks, staying with grandparents in town holidays and usually lives rurally. Knee examination is normal no fever, mild limp, restricted ROM R hip mild pain. No recent illness',
    previous_verdict_v1: 'Proceeds — referred knee pain with restricted hip ROM — SUFE concern',
    evaluator_verdict: 'Proceeds — SUFE/hip pathology concern',
    evaluator_comment: 'Knee exam normal, restricted hip ROM in adolescent male — classic SUFE presentation. Should proceed with hip X-ray.' },

  { case_id: 'CR-003', qa_id: 25, exam: 'Renal Ultrasound',
    clinical_note: 'Persisting microscopic haematuria in usually well and active 64 year old lady works as a hairdresser all her life, non smoker, No infection on microscopy, no wt loss or other symptoms',
    previous_verdict_v1: 'Proceeds — microscopic haematuria criteria met',
    evaluator_verdict: 'Proceeds — persistent microscopic haematuria, no infection',
    evaluator_comment: 'Persistent microscopic haematuria, infection excluded. Should proceed.' },

  { case_id: 'TEST-001', qa_id: null, exam: 'CT Chest/Abdomen/Pelvis',
    clinical_note: '62yo male w/ unexplained weight loss 8% over 4 months. No focal pathology. CRP raised, Hb low, albumin low. Ex-smoker.',
    previous_verdict_v1: 'Declined or at_risk — 4 months may have been flagged as below 6-month threshold',
    evaluator_verdict: 'Proceeds — all CT CAP criteria met (3 abnormal bloods, weight loss ≥5% over ≥3 months)',
    evaluator_comment: '4 months meets 3-6 month window. 3 abnormal bloods documented. Should proceed.' },

  { case_id: 'TEST-003', qa_id: null, exam: 'CT Head',
    clinical_note: '58yo m w/ sudden onset L arm weakness and facial droop, resolved after 20 minutes. O/E: mild residual L facial weakness. BP 165/95. ?TIA',
    previous_verdict_v1: 'Declined — TIA gateway required; no residual focal signs',
    evaluator_verdict: 'Proceeds — focal neuro signs independently met; TIA gateway advisory',
    evaluator_comment: 'Residual focal weakness documented. Should proceed on focal neuro pathway.' },

  { case_id: 'TEST-004', qa_id: null, exam: 'Ultrasound Abdomen',
    clinical_note: '55yo male, known Hep C. Liver palpable 3cm below costal margin, firm and non-tender. Referred for HCC surveillance and assessment of hepatomegaly.',
    previous_verdict_v1: 'Declined — HCC gateway blocked',
    evaluator_verdict: 'Proceeds — hepatomegaly pathway independently met',
    evaluator_comment: 'Hepatomegaly documented (3cm below costal margin). Should proceed on hepatomegaly pathway.' },

  { case_id: 'TEST-005', qa_id: null, exam: 'Renal Ultrasound',
    clinical_note: '68yo f w/ acute kidney injury, eGFR dropped from 60 to 12 over 5 days. No obstruction suspected. No clear cause identified.',
    previous_verdict_v1: 'Proceeds P2 — missed P1 and conflicting dispositions',
    evaluator_verdict: 'Proceeds — surface P1 and P2, note conflicting dispositions',
    evaluator_comment: 'Severe AKI — should surface P1 Acute 48hr. Note conflicting dispositions.' },

  { case_id: 'TEST-006', qa_id: null, exam: 'CT Head',
    clinical_note: '45yo m, episode of slurred speech and R hand clumsiness lasting 30 minutes yesterday. Fully resolved. BP normal. ?TIA. No other focal signs currently.',
    previous_verdict_v1: 'Declined — TIA gateway required; no residual focal signs',
    evaluator_verdict: 'At risk — focal neuro signs transiently met; TIA gateway advisory; note history of focal signs',
    evaluator_comment: 'Transient focal signs still relevant. Should be at_risk with note about TIA gateway.' },

  { case_id: 'TEST-007', qa_id: null, exam: 'CT Chest/Abdomen/Pelvis',
    clinical_note: '70yo f w/ unexplained weight loss 3% over 2 months. Low Hb, raised CRP.',
    previous_verdict_v1: 'Declined or at_risk — 3% and 2 months both below threshold',
    evaluator_verdict: 'At risk or declined — weight loss 3% (below 5% threshold) AND 2 months (below 3-month threshold)',
    evaluator_comment: 'Both weight loss % and duration fall below thresholds. Should be declined or at_risk.' },
];

// Detect paediatric from note text (replicates browser detectPaediatric() without DOM)
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
  for (const pattern of patterns) {
    const m = note.match(pattern);
    if (m) {
      if (pattern.source.includes('newborn') || pattern.source.includes('paediatric')) return true;
      const age = parseInt(m[1], 10);
      if (!isNaN(age) && age < 16) return true;
    }
  }
  return false;
}

const STRICT_INSTRUCTION = '2. DOCUMENTATION STANDARD — STRICT: Only count information as documented if EXPLICITLY STATED in the note. Do NOT infer. "No AF" (no atrial fibrillation) does NOT imply not anticoagulated. Age and sex must be explicitly stated. This mirrors how a triage radiologist reads a referral cold.\n\n';

const JSON_SCHEMA = '\nRespond ONLY with valid JSON (no markdown fences):\n'
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

function buildCriteriaBlock(siteIndex) {
  const lines = [];
  siteIndex.forEach(site => {
    const pageRef = site.page ? ` [p${site.page}]` : '';
    lines.push(`=== ${site.exam_title} — ${site.site_label} (${site.modality})${pageRef} ===`);
    if (site.guidance) lines.push(`Guidance: ${site.guidance}`);
    if (site.guidanceNarrative) lines.push(`Background: ${site.guidanceNarrative}`);
    (site.groups || []).forEach(g => {
      lines.push(`[${g.title}]`);
      (g.items || []).forEach(it => {
        lines.push((it.mandatory ? '* MANDATORY: ' : '- ') + it.label);
      });
    });
    if (site.outOfCriteriaNote) lines.push(`OUT OF CRITERIA: ${site.outOfCriteriaNote}`);
    if (site.alternativeManagement) lines.push(`REDIRECT: ${site.alternativeManagement}`);
    if (site.notFundedDetail) lines.push(`NOT ROUTINELY FUNDED: ${site.notFundedDetail}`);
    if (site.footnotes) lines.push(`DEFINITIONS AND SUB-CRITERIA: ${site.footnotes}`);
    lines.push('');
  });
  return lines.join('\n');
}

function buildSystemPrompt(instructionText, criteriaBlock, isPaed) {
  const preamble = 'You are a clinical decision support assistant for the New Zealand Community Referred Radiology (CRR) programme. Your role is to tell the GP clearly whether their referral will proceed, is at risk, or will be declined — and exactly what to document to fix it.\n\n';
  const withDocMode = instructionText.replace('{{DOC_MODE_INSTRUCTION}}', STRICT_INSTRUCTION);
  const paedNote = isPaed
    ? 'NOTE: This patient is PAEDIATRIC. Use ONLY the paediatric criteria below. Adult criteria do not apply.\n\n'
    : '';
  return preamble + withDocMode
    + paedNote
    + 'CRITERIA (National Primary Care Referral Criteria for Imaging, April 2026 reissue):\n\n'
    + criteriaBlock
    + JSON_SCHEMA;
}

function stripFencesAndExtract(text) {
  let clean = text
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/\s*```[\s\S]*/, '')
    .trim();
  const jStart = clean.indexOf('{');
  if (jStart !== -1) {
    let depth = 0, inStr = false, esc = false, jEnd = -1;
    for (let i = jStart; i < clean.length; i++) {
      const ch = clean[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (!inStr) {
        if (ch === '{') depth++;
        else if (ch === '}') { if (--depth === 0) { jEnd = i; break; } }
      }
    }
    if (jEnd !== -1) clean = clean.slice(jStart, jEnd + 1);
  }
  return clean;
}

async function runCase(tc, systemPrompt) {
  const userMsg = 'Documentation standard: STRICT — only explicitly stated facts count.'
    + '\n\nNote: silently correct any obvious typos or voice-to-text errors in the note before assessing, and include the corrected version in your response as "interpreted_note".'
    + '\n\nAssess this referral note:\n\n' + tc.clinical_note
    + '\n\nIMPORTANT: Respond with ONLY the JSON object as specified. No preamble, no explanation, no commentary — even for safety alerts or redirects. Express urgency through the safety_alert and redirect fields in the JSON.';

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

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`API ${resp.status}: ${err.error?.message || resp.statusText}`);
  }

  const data = await resp.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Empty response from API');

  const clean = stripFencesAndExtract(text);
  try {
    return { parsed: JSON.parse(clean), raw: text, parseSuccess: true };
  } catch (e) {
    return { parsed: null, raw: text, parseSuccess: false, parseError: e.message };
  }
}

function assessRegression(tc, ai) {
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

  const v1WasWrong = tc.previous_verdict_v1.toLowerCase().includes('declin') && expectProceeds
    || tc.previous_verdict_v1.toLowerCase().includes('blocked') && expectProceeds;

  if (matches && v1WasWrong) return 'improved';
  if (matches) return 'unchanged';
  return 'regressed';
}

async function main() {
  console.log('Fetching v2.1.0 system prompt from D1...');

  let promptText;
  if (ADMIN_KEY) {
    const r = await fetch(`${API_BASE}/api/admin/system-prompt/versions/2.1.0`, {
      headers: { 'x-admin-key': ADMIN_KEY },
    });
    if (!r.ok) throw new Error(`Admin API ${r.status}`);
    const d = await r.json();
    promptText = d.instruction_text;
  } else {
    const { readFileSync } = await import('fs');
    promptText = readFileSync('/Users/garyireland/vite-react-template/instructions/system-prompt-v2.1.0.txt', 'utf8');
    console.log('  No ADMIN_KEY — reading v2.1.0 from local file');
  }
  console.log(`Prompt: ${promptText.length} chars`);

  console.log('\nFetching criteria (match-data) from live API...');
  const mdResp = await fetch(`${API_BASE}/api/match-data`);
  if (!mdResp.ok) throw new Error(`match-data fetch failed: ${mdResp.status}`);
  const matchData = await mdResp.json();
  const adultIndex = matchData.index || [];
  const paedIndex = matchData.paed_index || [];
  console.log(`Loaded ${adultIndex.length} adult + ${paedIndex.length} paed site entries`);

  // Pre-build both system prompts (cached server-side by Anthropic for repeated use)
  const adultCriteriaBlock = buildCriteriaBlock(adultIndex);
  const paedCriteriaBlock = buildCriteriaBlock(paedIndex);
  const adultSystemPrompt = buildSystemPrompt(promptText, adultCriteriaBlock, false);
  const paedSystemPrompt = buildSystemPrompt(promptText, paedCriteriaBlock, true);
  console.log(`System prompts: adult ${adultSystemPrompt.length} chars, paed ${paedSystemPrompt.length} chars\n`);

  const results = [];
  let improved = 0, unchanged = 0, regressed = 0;

  for (const tc of TEST_CASES) {
    const isPaed = detectPaediatric(tc.clinical_note);
    const systemPrompt = isPaed ? paedSystemPrompt : adultSystemPrompt;
    const paedTag = isPaed ? ' [PAED]' : '';
    process.stdout.write(`[${tc.case_id}]${paedTag} ${tc.exam}... `);

    try {
      const ai = await runCase(tc, systemPrompt);
      const regression_status = assessRegression(tc, ai);
      const r = ai.parsed || {};

      const notes = ai.parseSuccess
        ? `Verdict: ${r.verdict}. Priority: ${r.priority || 'n/a'}. Met: ${(r.met_criteria||[]).length}. Missing: ${(r.missing_criteria||[]).length}.${r.redirect ? ' Redirect: ' + r.redirect.substring(0,60) : ''}${isPaed ? ' [paediatric criteria]' : ''}`
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
        previous_verdict_v2: tc.previous_verdict_v1,
        evaluator_verdict: tc.evaluator_verdict,
        evaluator_comment: tc.evaluator_comment,
        regression_status,
        notes,
      });

      if (regression_status === 'improved') improved++;
      else if (regression_status === 'regressed') regressed++;
      else unchanged++;

      const icon = regression_status === 'improved' ? '⬆' : regression_status === 'regressed' ? '⬇' : '=';
      console.log(`${icon} ${regression_status} — ${ai.parseSuccess ? r.verdict : 'PARSE FAIL'}`);
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      results.push({
        case_id: tc.case_id, qa_id: tc.qa_id, exam: tc.exam, paediatric: isPaed,
        clinical_note: tc.clinical_note,
        ai_response: { error: e.message },
        previous_verdict_v2: tc.previous_verdict_v1,
        evaluator_verdict: tc.evaluator_verdict,
        evaluator_comment: tc.evaluator_comment,
        regression_status: 'regressed', notes: `Error: ${e.message}`,
      });
      regressed++;
    }
    await new Promise(r => setTimeout(r, 1200));
  }

  console.log(`\nResult: ${improved} improved / ${unchanged} unchanged / ${regressed} regressed`);

  const output = {
    test_run: {
      date: new Date().toISOString(),
      prompt_version: '2.1.0',
      model: 'claude-sonnet-4-20250514',
      mode: 'strict',
      paediatric_detection: 'enabled',
    },
    summary: { total: results.length, improved, unchanged, regressed },
    results,
  };

  const { writeFileSync } = await import('fs');
  const jsonPath = '/Users/garyireland/vite-react-template/instructions/prompt-v2.1.0-test-results.json';
  writeFileSync(jsonPath, JSON.stringify(output, null, 2));
  console.log(`\nJSON saved to ${jsonPath}`);

  // Build markdown summary
  const lines = [
    `# Triage Advisor v2.1.0 Regression Test Results`,
    ``,
    `**Date:** ${output.test_run.date}`,
    `**Prompt version:** 2.1.0 — Data fix: gender-exclusive criteria + one-pathway-met=proceeds`,
    `**Model:** ${output.test_run.model} | **Mode:** strict | **Paediatric detection:** enabled`,
    ``,
    `## Scorecard: ${improved} improved / ${unchanged} unchanged / ${regressed} regressed (${results.length} total)`,
    ``,
    `| Case | Exam | v2.1.0 Verdict | Evaluator Expects | Status |`,
    `|------|------|----------------|-------------------|--------|`,
  ];

  for (const r of results) {
    const ev = r.evaluator_verdict.replace('Correct — should proceed', 'Correct').replace('Proceeds — ', '').replace(' criteria met', '').replace(' pathway met', '').substring(0, 35);
    const verdict = r.ai_response?.verdict || 'ERROR';
    const icon = r.regression_status === 'improved' ? '⬆ improved' : r.regression_status === 'regressed' ? '⬇ REGRESSED' : '= unchanged';
    const paedTag = r.paediatric ? ' [P]' : '';
    lines.push(`| ${r.case_id}${paedTag} | ${r.exam} | ${verdict} | ${ev} | ${icon} |`);
  }
  lines.push('');

  // Regressions detail
  const regressions = results.filter(r => r.regression_status === 'regressed');
  if (regressions.length > 0) {
    lines.push('## Regressions');
    lines.push('');
    for (const r of regressions) {
      const ar = r.ai_response || {};
      lines.push(`### ${r.case_id} — ${r.exam}`);
      lines.push(`**Note:** \`${r.clinical_note}\``);
      lines.push(`**v2.1.0 verdict:** ${ar.verdict_title || ar.error || 'N/A'}`);
      if (ar.verdict_summary) lines.push(`**Summary:** ${ar.verdict_summary}`);
      if (ar.missing_criteria?.length) lines.push(`**Missing:** ${ar.missing_criteria.join(' · ')}`);
      if (ar.redirect) lines.push(`**Redirect:** ${ar.redirect}`);
      if (ar.notes) lines.push(`**Notes:** ${ar.notes}`);
      lines.push(`**Evaluator expects:** ${r.evaluator_verdict}`);
      lines.push(`**Assessment:** ${r.notes}`);
      lines.push('');
    }
  }

  const mdPath = '/Users/garyireland/vite-react-template/instructions/prompt-v2.1.0-test-results.md';
  writeFileSync(mdPath, lines.join('\n'));
  console.log(`Markdown saved to ${mdPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
