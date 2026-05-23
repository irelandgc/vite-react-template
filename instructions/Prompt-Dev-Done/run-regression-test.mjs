/**
 * Triage Advisor v1.1.0 Regression Test Runner
 * Replicates buildCriteriaBlock() + buildSystemPrompt() logic from triage/index.html
 * and calls /api/triage/assess for each test case.
 */

const API_BASE = 'https://crr-criteria-api.fk4dsrmq5r.workers.dev';

const TEST_CASES = [
  {
    case_id: 'RP-001',
    exam: 'CT Chest/Abdomen/Pelvis',
    clinical_note: '65yo male w/ unexplained wt loss 5% over past 6/12 with no localising symptoms or signs. Hb mildly low. Ex-smoker.',
    expected_change: "Should accept 'Hb mildly low' as meeting 'low Hb' criterion (rule 1d). Should still flag only one abnormal blood result documented (need 2+).",
  },
  {
    case_id: 'RP-002',
    exam: 'Ultrasound Abdomen',
    clinical_note: '61yo european male newly diagnosed autoimmune hepatitis – liver edge felt just below RCM. Screen for HCC, cirrhosis',
    expected_change: "Should accept on hepatomegaly pathway. HCC surveillance gateway noted as advisory only (rule 7a), not as reason to decline.",
  },
  {
    case_id: 'RP-003',
    exam: 'CT Head',
    clinical_note: '64yo f w/ sudden onset R facial numbness + diplopia, lasting 10min. O/E: reduced sensation R face cf L, FROEM without diplopia. Obs OK, pulse regular. ?TIA',
    expected_change: "Should accept on focal neurological signs pathway. ?TIA noted as advisory differential with unmet gateway requirements (rule 7b).",
  },
  {
    case_id: 'RP-004',
    exam: 'CT Head',
    clinical_note: '48yo m w/ 8/52 h/o progressive HA – bilateral – sometimes associated nausea – dizziness and vertigo over this period (normal hearing + vision testing). ?SOL',
    expected_change: "'Progressive' should satisfy 'change in pattern with progressive increase in frequency or severity' (rule 1e). Should proceed without flagging pattern change as missing.",
  },
  {
    case_id: 'RP-006',
    exam: 'Renal Ultrasound',
    clinical_note: '75yo m w/ new AKI, eGFR 3 (normally 55). No clear cause.',
    expected_change: "Should surface all matching pathways — P1 48hr AKI indication, P2 acute renal function deterioration, and alternative management. Should flag conflicting dispositions in notes (rule 7c).",
  },
];

const DOC_MODE_STRICT = '2. DOCUMENTATION STANDARD — STRICT: Only count information as documented if EXPLICITLY STATED in the note. Do NOT infer. "No AF" (no atrial fibrillation) does NOT imply not anticoagulated. Age and sex must be explicitly stated. This mirrors how a triage radiologist reads a referral cold.\n\n';

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

function buildSystemPrompt(instructionText, criteriaBlock) {
  const preamble = 'You are a clinical decision support assistant for the New Zealand Community Referred Radiology (CRR) programme. Your role is to tell the GP clearly whether their referral will proceed, is at risk, or will be declined — and exactly what to document to fix it.\n\n';
  const withDocMode = instructionText.replace('{{DOC_MODE_INSTRUCTION}}', DOC_MODE_STRICT);
  return preamble + withDocMode
    + 'CRITERIA (National Primary Care Referral Criteria for Imaging, April 2026 reissue):\n\n'
    + criteriaBlock
    + JSON_SCHEMA;
}

function stripFencesAndExtract(text) {
  let clean = text
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/\s*```[\s\S]*/, '')
    .trim();
  // Depth-counting extraction — finds matching } for first {
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
    + '\n\nIMPORTANT: Respond with ONLY the JSON object as specified. No preamble, no explanation, no commentary.';

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

function assessChange(tc, ai) {
  if (!ai.parseSuccess) return { change_observed: false, notes: `Parse failed: ${ai.parseError}` };

  const r = ai.parsed;
  const caseId = tc.case_id;
  const met = (r.met_criteria || []).join(' ').toLowerCase();
  const miss = (r.missing_criteria || []).join(' ').toLowerCase();
  const notes_field = (r.notes || '').toLowerCase();

  if (caseId === 'RP-001') {
    // Expect: verdict at_risk (not declined), Hb accepted without numeric, flags only 1 blood result
    const hbAccepted = met.includes('hb') || met.includes('haemoglobin') || met.includes('anaemia');
    const noHbNumericDemand = !miss.includes('hb value') && !miss.includes('haemoglobin value') && !miss.includes('specific hb');
    const change_observed = hbAccepted && noHbNumericDemand;
    return { change_observed, notes: `Hb in met_criteria: ${hbAccepted}. Numeric Hb demanded in missing: ${!noHbNumericDemand}. Verdict: ${r.verdict}.` };
  }

  if (caseId === 'RP-002') {
    // Expect: proceeds on hepatomegaly; HCC gateway advisory not blocking
    const hepatomegalyMet = met.includes('hepatomeg') || met.includes('liver') || met.includes('hepatitis');
    const notDeclinedForHcc = r.verdict !== 'declined' || !miss.some?.(m => m.toLowerCase().includes('gastroenterol'));
    const change_observed = hepatomegalyMet && r.verdict !== 'declined';
    return { change_observed, notes: `Verdict: ${r.verdict}. Hepatomegaly in met: ${hepatomegalyMet}. Notes field: ${r.notes?.substring(0,120) || 'null'}.` };
  }

  if (caseId === 'RP-003') {
    // Expect: proceeds on focal neuro signs; TIA gateway advisory only
    const focalNeuroMet = met.includes('focal') || met.includes('numbness') || met.includes('diplopia') || met.includes('sensory') || met.includes('neurolog');
    const tiaAdvisory = notes_field.includes('tia') || notes_field.includes('gateway') || notes_field.includes('bpac');
    const change_observed = r.verdict !== 'declined' && focalNeuroMet;
    return { change_observed, notes: `Verdict: ${r.verdict}. Focal neuro in met: ${focalNeuroMet}. TIA noted as advisory: ${tiaAdvisory}.` };
  }

  if (caseId === 'RP-004') {
    // Expect: proceeds; 'progressive' accepted as meeting pattern-change element
    const progressiveMet = met.includes('progressive') || met.includes('pattern') || met.includes('frequenc') || met.includes('severit');
    const patternNotMissing = !miss.includes('change in pattern') && !miss.includes('pattern change');
    const change_observed = r.verdict === 'proceeds' && progressiveMet && patternNotMissing;
    return { change_observed, notes: `Verdict: ${r.verdict}. Progressive in met: ${progressiveMet}. Pattern change flagged missing: ${!patternNotMissing}.` };
  }

  if (caseId === 'RP-006') {
    // Expect: proceeds; surfaces P1 and P2; conflicting dispositions noted
    const p1Mentioned = (r.priority || '').toLowerCase().includes('acute') || notes_field.includes('p1') || notes_field.includes('48hr') || notes_field.includes('aki');
    const p2Mentioned = notes_field.includes('p2') || notes_field.includes('acute renal') || (r.priority || '').toLowerCase().includes('p2');
    const altMgmt = (r.redirect || '') + notes_field;
    const change_observed = r.verdict !== 'declined' && (p1Mentioned || p2Mentioned);
    return { change_observed, notes: `Verdict: ${r.verdict}. Priority: ${r.priority}. P1/AKI surfaced: ${p1Mentioned}. P2 surfaced: ${p2Mentioned}. Alt mgmt: ${(r.redirect || r.notes || '').substring(0,100)}.` };
  }

  return { change_observed: false, notes: 'No assessment logic for this case.' };
}

async function main() {
  console.log('Fetching active system prompt from live API...');
  const spResp = await fetch(`${API_BASE}/api/system-prompt`);
  if (!spResp.ok) throw new Error(`system-prompt fetch failed: ${spResp.status}`);
  const sp = await spResp.json();
  console.log(`Active prompt: v${sp.version} (${sp.instruction_text.length} chars)`);

  console.log('Fetching criteria (match-data) from live API...');
  const mdResp = await fetch(`${API_BASE}/api/match-data`);
  if (!mdResp.ok) throw new Error(`match-data fetch failed: ${mdResp.status}`);
  const matchData = await mdResp.json();
  const siteIndex = matchData.index || [];
  console.log(`Loaded ${siteIndex.length} site entries`);

  const criteriaBlock = buildCriteriaBlock(siteIndex);
  const systemPrompt = buildSystemPrompt(sp.instruction_text, criteriaBlock);
  console.log(`System prompt assembled: ${systemPrompt.length} chars\n`);

  const results = [];

  for (const tc of TEST_CASES) {
    process.stdout.write(`Running ${tc.case_id} (${tc.exam})... `);
    try {
      const ai = await runCase(tc, systemPrompt);
      const { change_observed, notes } = assessChange(tc, ai);
      const r = ai.parsed || {};
      results.push({
        case_id: tc.case_id,
        exam: tc.exam,
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
        } : { parse_error: ai.parseError, raw_response: ai.raw },
        expected_change: tc.expected_change,
        change_observed,
        assessment_notes: notes,
      });
      console.log(change_observed ? '✓ change observed' : '✗ change NOT observed');
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      results.push({
        case_id: tc.case_id,
        exam: tc.exam,
        clinical_note: tc.clinical_note,
        ai_response: { error: e.message },
        expected_change: tc.expected_change,
        change_observed: false,
        assessment_notes: `Error: ${e.message}`,
      });
    }
    // Small delay between calls to be polite to the API
    await new Promise(r => setTimeout(r, 1500));
  }

  // ── Write JSON results ──────────────────────────────────────────────────────
  const output = {
    test_run: {
      date: new Date().toISOString(),
      prompt_version: sp.version,
      model: 'claude-sonnet-4-20250514',
      mode: 'strict',
    },
    results,
  };

  const { writeFileSync } = await import('fs');
  writeFileSync(
    '/Users/garyireland/vite-react-template/instructions/prompt-v1.1.0-test-results.json',
    JSON.stringify(output, null, 2)
  );
  console.log('\n✓ JSON results saved to instructions/prompt-v1.1.0-test-results.json');

  // ── Write markdown summary ──────────────────────────────────────────────────
  let md = `# Triage Advisor v1.1.0 Regression Test Results\n\n`;
  md += `**Date:** ${output.test_run.date}\n`;
  md += `**Prompt version:** ${output.test_run.prompt_version}\n`;
  md += `**Model:** ${output.test_run.model}\n`;
  md += `**Mode:** ${output.test_run.mode}\n\n`;

  const passed = results.filter(r => r.change_observed).length;
  md += `## Summary: ${passed}/${results.length} expected changes observed\n\n`;

  for (const r of results) {
    const status = r.change_observed ? '✅' : '❌';
    md += `---\n\n### ${status} ${r.case_id} — ${r.exam}\n\n`;
    md += `**Clinical note:** \`${r.clinical_note}\`\n\n`;
    md += `**Expected change:** ${r.expected_change}\n\n`;
    if (r.ai_response.error) {
      md += `**Error:** ${r.ai_response.error}\n\n`;
    } else if (r.ai_response.parse_error) {
      md += `**Parse error:** ${r.ai_response.parse_error}\n\nRaw response:\n\`\`\`\n${r.ai_response.raw_response?.substring(0, 500)}\n\`\`\`\n\n`;
    } else {
      const ai = r.ai_response;
      md += `**Verdict:** ${ai.verdict_title || ai.verdict} | Priority: ${ai.priority || 'n/a'}\n\n`;
      md += `**Summary:** ${ai.verdict_summary}\n\n`;
      if (ai.met_criteria?.length) md += `**Met criteria:**\n${ai.met_criteria.map(c => `- ${c}`).join('\n')}\n\n`;
      if (ai.missing_criteria?.length) md += `**Missing criteria:**\n${ai.missing_criteria.map(c => `- ${c}`).join('\n')}\n\n`;
      if (ai.safety_alert) md += `**Safety alert:** ${ai.safety_alert}\n\n`;
      if (ai.redirect) md += `**Redirect:** ${ai.redirect}\n\n`;
      if (ai.notes) md += `**Notes:** ${ai.notes}\n\n`;
    }
    md += `**Change observed:** ${r.change_observed ? 'YES' : 'NO'}\n`;
    md += `**Assessment:** ${r.assessment_notes}\n\n`;
  }

  writeFileSync(
    '/Users/garyireland/vite-react-template/instructions/prompt-v1.1.0-test-results.md',
    md
  );
  console.log('✓ Markdown summary saved to instructions/prompt-v1.1.0-test-results.md');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
