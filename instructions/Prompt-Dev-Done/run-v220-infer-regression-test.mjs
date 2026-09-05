/**
 * Triage Advisor v2.2.0 — INFERRED mode regression test
 * Same 20 cases as v2.2.0 strict test. Results compared against strict baseline.
 */

const API_BASE = 'https://crr-criteria-api.fk4dsrmq5r.workers.dev';
const DELAY_MS = 3000;

const TEST_CASES = [
  { case_id: 'RP-000', exam: 'CT Head',
    clinical_note: '45 maori woman with 2/12 h/o progressively worsening HA present nocturnally and first thing in the morning with associated blurred vision and nausea',
    strict_verdict: 'proceeds',
    evaluator_verdict: 'Correct — should proceed' },

  { case_id: 'RP-001', exam: 'CT Chest/Abdomen/Pelvis',
    clinical_note: '65yo male w/ unexplained wt loss 5% over past 6/12 with no localising symptoms or signs. Hb mildly low. Ex-smoker.',
    strict_verdict: 'at_risk',
    evaluator_verdict: 'At risk — should accept Hb mildly low, still needs 2nd abnormal blood' },

  { case_id: 'RP-002', exam: 'Ultrasound Abdomen',
    clinical_note: '61yo european male newly diagnosed autoimmune hepatitis – liver edge felt just below RCM. Screen for HCC, cirrhosis',
    strict_verdict: 'proceeds',
    evaluator_verdict: 'Proceeds — hepatomegaly pathway independently met' },

  { case_id: 'RP-003', exam: 'CT Head',
    clinical_note: '64yo f w/ sudden onset R facial numbness + diplopia, lasting 10min. O/E: reduced sensation R face cf L, FROEM without diplopia. Obs OK, pulse regular. ?TIA',
    strict_verdict: 'proceeds',
    evaluator_verdict: 'Proceeds — focal neurological signs pathway independently met' },

  { case_id: 'RP-004', exam: 'CT Head',
    clinical_note: '48yo m w/ 8/52 h/o progressive HA – bilateral – sometimes associated nausea – dizziness and vertigo over this period (normal hearing + vision testing). ?SOL',
    strict_verdict: 'proceeds',
    evaluator_verdict: 'At risk — "progressive" meets pattern change; still missing one associated feature' },

  { case_id: 'RP-005', exam: 'Knee X-ray',
    clinical_note: '8yo boy 5/12 h/o progressive pain R lower leg – ?knee ?ankle. Pain during the day and night. Limp at times. Stopping him from doing normal activities (basketball and karate). R/O overt malignancy.',
    strict_verdict: 'proceeds',
    evaluator_verdict: 'Proceeds — paediatric bone pain criteria met' },

  { case_id: 'RP-006', exam: 'Renal Ultrasound',
    clinical_note: '75yo m w/ new AKI, eGFR 3 (normally 55). No clear cause.',
    strict_verdict: 'declined',
    evaluator_verdict: 'Proceeds — surface P1 AKI and P2, note conflicting dispositions' },

  { case_id: 'LP-001', exam: 'Chest X-ray',
    clinical_note: '55 yo man, 3 days cough, fever and shortness of breath',
    strict_verdict: 'proceeds',
    evaluator_verdict: 'Proceeds — CAP criteria met' },

  { case_id: 'LP-002', exam: 'Spine X-ray',
    clinical_note: '3 months lower back pain after stepping down from a ladder. no radiation, no bowel symptoms. no fevers. not tender to palpation. normal lower limb exam.',
    strict_verdict: 'declined',
    evaluator_verdict: 'Redirect to ACC — trauma mechanism' },

  { case_id: 'LP-003', exam: 'Ultrasound Pelvis',
    clinical_note: '56 yo post menopausal woman on hormone replacement therapy with 2 days of PV bleeding',
    strict_verdict: 'at_risk',
    evaluator_verdict: 'Proceeds — postmenopausal bleeding' },

  { case_id: 'LP-004', exam: 'Ultrasound Pelvis',
    clinical_note: '35yo with Mirena, recent lower abdominal pain and pv bleeding ? IUD malpositioned',
    strict_verdict: 'proceeds',
    evaluator_verdict: 'Proceeds — IUD/Mirena malposition assessment' },

  { case_id: 'CR-001', exam: 'Chest X-ray',
    clinical_note: '42 yr old homeless patient with fever productive cough, smoker, unsure re wt loss. Fine lower basal crepitus, mild tachy,',
    strict_verdict: 'proceeds',
    evaluator_verdict: 'Proceeds — CAP or TB concern' },

  { case_id: 'CR-002', exam: 'Hip X-ray',
    clinical_note: '13 year old boy with R knee pain for past few weeks, staying with grandparents in town holidays and usually lives rurally. Knee examination is normal no fever, mild limp, restricted ROM R hip mild pain. No recent illness',
    strict_verdict: 'proceeds',
    evaluator_verdict: 'Proceeds — SUFE/hip pathology concern' },

  { case_id: 'CR-003', exam: 'Renal Ultrasound',
    clinical_note: 'Persisting microscopic haematuria in usually well and active 64 year old lady works as a hairdresser all her life, non smoker, No infection on microscopy, no wt loss or other symptoms',
    strict_verdict: 'proceeds',
    evaluator_verdict: 'Proceeds — persistent microscopic haematuria, no infection' },

  { case_id: 'TEST-001', exam: 'CT Chest/Abdomen/Pelvis',
    clinical_note: '62yo male w/ unexplained weight loss 8% over 4 months. No focal pathology. CRP raised, Hb low, albumin low. Ex-smoker.',
    strict_verdict: 'proceeds',
    evaluator_verdict: 'Proceeds — all CT CAP criteria met (3 abnormal bloods, weight loss ≥5% over ≥3 months)' },

  { case_id: 'TEST-003', exam: 'CT Head',
    clinical_note: '58yo m w/ sudden onset L arm weakness and facial droop, resolved after 20 minutes. O/E: mild residual L facial weakness. BP 165/95. ?TIA',
    strict_verdict: 'proceeds',
    evaluator_verdict: 'Proceeds — focal neuro signs independently met; TIA gateway advisory' },

  { case_id: 'TEST-004', exam: 'Ultrasound Abdomen',
    clinical_note: '55yo male, known Hep C. Liver palpable 3cm below costal margin, firm and non-tender. Referred for HCC surveillance and assessment of hepatomegaly.',
    strict_verdict: 'at_risk',
    evaluator_verdict: 'Proceeds — hepatomegaly pathway independently met' },

  { case_id: 'TEST-005', exam: 'Renal Ultrasound',
    clinical_note: '68yo f w/ acute kidney injury, eGFR dropped from 60 to 12 over 5 days. No obstruction suspected. No clear cause identified.',
    strict_verdict: 'proceeds',
    evaluator_verdict: 'Proceeds — surface P1 and P2, note conflicting dispositions' },

  { case_id: 'TEST-006', exam: 'CT Head',
    clinical_note: '45yo m, episode of slurred speech and R hand clumsiness lasting 30 minutes yesterday. Fully resolved. BP normal. ?TIA. No other focal signs currently.',
    strict_verdict: 'at_risk',
    evaluator_verdict: 'At risk — focal neuro signs transiently met; TIA gateway advisory' },

  { case_id: 'TEST-007', exam: 'CT Chest/Abdomen/Pelvis',
    clinical_note: '70yo f w/ unexplained weight loss 3% over 2 months. Low Hb, raised CRP.',
    strict_verdict: 'declined',
    evaluator_verdict: 'At risk or declined — weight loss 3% (below 5% threshold) AND 2 months (below 3-month threshold)' },
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

const INFER_INSTRUCTION = '2. DOCUMENTATION STANDARD — INFERRED: You may make reasonable clinical inferences where obvious to any clinician. "No AF" (no atrial fibrillation) suggests the patient is less likely to be anticoagulated specifically for AF — but do not infer the patient is not anticoagulated at all, as other indications (prior DVT, mechanical heart valve, thrombophilia) may apply. Do not infer specific clinical findings not mentioned at all.\n\n';

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
  const withDocMode = instructionText.replace('{{DOC_MODE_INSTRUCTION}}', INFER_INSTRUCTION);
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

async function runCase(tc, systemPrompt) {
  const userMsg = 'Documentation standard: INFERRED — reasonable clinical context is allowed.'
    + '\n\nNote: silently correct any obvious typos or voice-to-text errors before assessing, include in interpreted_note.'
    + '\n\nAssess this referral note:\n\n' + tc.clinical_note
    + '\n\nIMPORTANT: Respond with ONLY the JSON object as specified.';

  for (let attempt = 1; attempt <= 4; attempt++) {
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
      next.setUTCMinutes(0, 0, 0);
      next.setUTCHours(next.getUTCHours() + 1);
      const waitMs = (next - now) + 5000;
      console.log(`\n  [429] Rate limited. Waiting ${Math.ceil(waitMs / 1000)}s for reset...`);
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
      return { parsed: JSON.parse(clean), raw: text, ok: true };
    } catch (e) {
      return { parsed: null, raw: text, ok: false, parseError: e.message };
    }
  }
  throw new Error('Max retries exceeded');
}

async function main() {
  const { readFileSync, writeFileSync } = await import('fs');

  const promptText = readFileSync('instructions/Prompt-Dev-Done/system-prompt-v2.2.0.txt', 'utf8');
  console.log(`v2.2.0 prompt: ${promptText.length} chars`);

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

  for (const tc of TEST_CASES) {
    const isPaed = detectPaediatric(tc.clinical_note);
    const sp = isPaed ? paedPrompt : adultPrompt;
    process.stdout.write(`[${tc.case_id}]${isPaed ? ' [P]' : ''} ${tc.exam}... `);

    try {
      const ai = await runCase(tc, sp);
      const r = ai.parsed || {};
      const v = ai.ok ? r.verdict : 'ERROR';
      const changed = v !== tc.strict_verdict;

      console.log(`${changed ? '◆ DIFFERS' : '= same'} — infer: ${v} / strict: ${tc.strict_verdict}`);

      results.push({
        case_id: tc.case_id,
        exam: tc.exam,
        paediatric: isPaed,
        clinical_note: tc.clinical_note,
        strict_verdict: tc.strict_verdict,
        infer_verdict: v,
        verdict_changed: changed,
        evaluator_verdict: tc.evaluator_verdict,
        ai_response: ai.ok ? {
          verdict: r.verdict,
          verdict_title: r.verdict_title,
          verdict_summary: r.verdict_summary,
          priority: r.priority,
          met_criteria: r.met_criteria,
          missing_criteria: r.missing_criteria,
          add_to_note: r.add_to_note,
          suggested_wording: r.suggested_wording,
          safety_alert: r.safety_alert,
          redirect: r.redirect,
          notes: r.notes,
        } : { parse_error: ai.parseError, raw: ai.raw?.substring(0, 500) },
      });
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      results.push({
        case_id: tc.case_id, exam: tc.exam, paediatric: isPaed,
        clinical_note: tc.clinical_note,
        strict_verdict: tc.strict_verdict, infer_verdict: 'ERROR',
        verdict_changed: false, evaluator_verdict: tc.evaluator_verdict,
        ai_response: { error: e.message },
      });
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  const changed = results.filter(r => r.verdict_changed);
  const same    = results.filter(r => !r.verdict_changed);
  console.log(`\nDone: ${changed.length} cases differ / ${same.length} cases same`);

  const output = {
    test_run: {
      date: new Date().toISOString(),
      prompt_version: '2.2.0',
      doc_mode: 'inferred',
      model: 'claude-sonnet-4-20250514',
      paediatric_detection: 'enabled',
      baseline: 'v2.2.0 strict mode',
    },
    summary: { total: results.length, verdict_changed: changed.length, verdict_same: same.length },
    results,
  };

  const jsonPath = 'instructions/prompt-v2.2.0-infer-test-results.json';
  writeFileSync(jsonPath, JSON.stringify(output, null, 2));
  console.log(`JSON saved to ${jsonPath}`);

  // Markdown report
  const ev = (s) => s.replace('Correct — should proceed','Correct').replace('Proceeds — ','').replace(' criteria met','').replace(' pathway met','').substring(0, 35);

  const lines = [
    `# Triage Advisor v2.2.0 — INFERRED Mode vs STRICT Mode`,
    ``,
    `**Date:** ${output.test_run.date}`,
    `**Prompt:** v2.2.0 | **Mode:** INFERRED | **Model:** ${output.test_run.model}`,
    `**Baseline:** v2.2.0 STRICT mode results`,
    ``,
    `## Summary: ${changed.length} cases differ / ${same.length} cases same`,
    ``,
    `| Case | Exam | Strict | Infer | Evaluator Expects | Changed? |`,
    `|------|------|--------|-------|-------------------|----------|`,
  ];

  for (const r of results) {
    const flag = r.verdict_changed ? '◆ **DIFFERS**' : '= same';
    lines.push(`| ${r.case_id}${r.paediatric?' [P]':''} | ${r.exam} | ${r.strict_verdict} | ${r.infer_verdict} | ${ev(r.evaluator_verdict)} | ${flag} |`);
  }
  lines.push('');

  if (changed.length > 0) {
    lines.push('## Cases Where Infer Differs From Strict', '');
    for (const r of changed) {
      const ar = r.ai_response || {};
      const strictCorrect = r.strict_verdict === r.evaluator_verdict.toLowerCase().replace(/.*proceed.*/, 'proceeds').replace(/.*at.risk.*/, 'at_risk').replace(/.*declin.*/, 'declined').replace(/.*redirect.*/, 'declined');
      lines.push(`### ${r.case_id} — ${r.exam}`);
      lines.push(`**Note:** \`${r.clinical_note}\``);
      lines.push(`**Strict:** ${r.strict_verdict} → **Infer:** ${r.infer_verdict} | **Evaluator expects:** ${r.evaluator_verdict}`);
      if (ar.verdict_summary) lines.push(`**Infer summary:** ${ar.verdict_summary}`);
      if (ar.met_criteria?.length) lines.push(`**Met (infer):** ${ar.met_criteria.join(' · ')}`);
      if (ar.missing_criteria?.length) lines.push(`**Missing (infer):** ${ar.missing_criteria.join(' · ')}`);
      if (ar.notes) lines.push(`**Notes:** ${ar.notes}`);
      lines.push('');
    }
  }

  if (same.length > 0) {
    lines.push('## Cases Where Infer = Strict', '');
    lines.push('| Case | Verdict | Evaluator Expects |');
    lines.push('|------|---------|-------------------|');
    for (const r of same) {
      lines.push(`| ${r.case_id}${r.paediatric?' [P]':''} | ${r.infer_verdict} | ${ev(r.evaluator_verdict)} |`);
    }
    lines.push('');
  }

  const mdPath = 'instructions/prompt-v2.2.0-infer-test-results.md';
  writeFileSync(mdPath, lines.join('\n'));
  console.log(`Markdown saved to ${mdPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
