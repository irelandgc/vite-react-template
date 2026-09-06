// ══════════════════════════════════════════════════════════════
//  ARCH-MIG-01 slice 4b — server-side PII gate
// ══════════════════════════════════════════════════════════════
//
// Ports the client pipeline (`public/crr-criteria/triage/index.html`
// `detectAndRedactPII` + the NHI validators) to the worker. In the two-stage
// architecture the extraction route may receive an un-redacted note (the client
// courtesy pipeline — KI-32 — cannot be relied on), so the server redacts here,
// BEFORE prompt assembly and before any model call. The redacted note is the
// only text the model sees and the only text quotes are validated against.
//
// Residual policy: after redaction, if a hard pattern (an NHI) is still present,
// the caller must REJECT the request with a visible reason — never send. Soft
// categories (name/address/etc.) that slip a pattern are a residual risk covered
// by user education + zero-retention (v1.0 spec §7); an NHI is not.
//
// Supersedes CRR_PII_Detection_AutoRedaction_Spec_v0.2 (which had the server
// reject rather than redact) — see the v1.0 spec.

export type PiiCategory = "NHI" | "NAME" | "DOB" | "ADDRESS" | "PHONE" | "EMAIL" | "REFERRER";

export interface RedactionResult {
  redacted: string;
  patternsHit: PiiCategory[];
  counts: Record<string, number>;
  preCorrections: number;
}

// ── NHI check digits (used for the new-format validation and the residual scan) ──
const NHI_ORD: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // I and O excluded
  for (let i = 0; i < letters.length; i++) m[letters[i]] = i + 1;
  return m;
})();

function nhiVal(ch: string): number | null {
  const c = ch.toUpperCase();
  return c >= "0" && c <= "9" ? parseInt(c, 10) : NHI_ORD[c] ?? null;
}

export function validateNhiOld(s: string): boolean {
  const c = s.toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-HJ-NP-Z]{3}\d{4}$/.test(c)) return false;
  const v: number[] = [];
  for (let i = 0; i < 7; i++) {
    const n = nhiVal(c[i]);
    if (n === null) return false;
    v.push(n);
  }
  let sum = 0;
  const w = [7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 6; i++) sum += v[i] * w[i];
  let chk = 11 - (sum % 11);
  if (chk === 11) return false;
  if (chk === 10) chk = 0;
  return v[6] === chk;
}

// New format AAANNAX — dual validation (mod-23 production, mod-24 legacy samples).
export function validateNhiNew(s: string): boolean {
  const c = s.toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-HJ-NP-Z]{3}\d{2}[A-HJ-NP-Z]{2}$/.test(c)) return false;
  const v: number[] = [];
  for (let i = 0; i < 7; i++) {
    const n = nhiVal(c[i]);
    if (n === null) return false;
    v.push(n);
  }
  let sum = 0;
  const w = [7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 6; i++) sum += v[i] * w[i];
  const idx23 = 23 - (sum % 23);
  if (idx23 !== 0 && v[6] === idx23) return true;
  const idx24 = 24 - (sum % 24);
  if (idx24 !== 0 && v[6] === idx24) return true;
  return false;
}

const NZ_PLACES =
  "(?:Auckland|Hamilton|Wellington|Christchurch|Tauranga|Napier|Hastings|Dunedin|Palmerston\\s+North|Nelson|Rotorua|New\\s+Plymouth|Whangarei|Invercargill|Whanganui|Gisborne|Blenheim|Timaru|Masterton|Levin|Tokoroa|Ashburton|Greymouth|Taupo|Thames|Whakatane|Cambridge|Te\\s+Awamutu|Pukekohe|Paraparaumu|Kapiti|Porirua|Hutt|Lower\\s+Hutt|Upper\\s+Hutt|Petone|Kilbirnie|Johnsonville|Karori|Newtown|Mt\\s+Albert|Mt\\s+Roskill|Manukau|Papakura|Takapuna|Henderson|Waitakere|Manurewa|Otahuhu|Panmure|Onehunga|Remuera|Ellerslie|Pakuranga|Howick|Botany|Flatbush|Mangere|Otara|Papatoetoe|Waiuku|Turangi|Te\\s+Kuiti|Matamata|Morrinsville|Huntly|Ngaruawahia|Raglan|Dargaville|Kaikohe|Kerikeri|Kaitaia|Warkworth|Orewa|Silverdale|Hibiscus\\s+Coast|Rangiora|Kaiapoi|Rolleston|Lincoln|Oamaru|Balclutha|Gore|Queenstown|Wanaka|Alexandra|Cromwell|Hokitika|Westport|Motueka|Richmond|Stoke|Picton|Kaikoura|Wairoa|Dannevirke|Waipukurau|Feilding|Marton|Bulls|Taihape|Ohakune|Carterton|Greytown|Featherston|Martinborough)";

const CLIN_ADJ =
  /^(?:Lateral|Frozen|Acute|Chronic|Severe|Bilateral|Anterior|Posterior|Superior|Inferior|Medial|Proximal|Distal|Central|Primary|Secondary|Recurrent|Progressive|Persistent|Suspected|Possible|Probable|Confirmed|Known|Previous|Recent|Initial|Early|Late|Advanced|Mild|Moderate|Marked|Significant|Gross|Minor|Major|Upper|Lower|Right|Left|Deep|High|Low)$/i;

// Stage 1 — pre-correction of PII-relevant typos only (never clinical text).
function preCorrect(text: string): { text: string; corrections: number } {
  let t = text;
  let corrections = 0;
  const apply = (re: RegExp, to: string) => {
    t = t.replace(re, () => {
      corrections++;
      return to;
    });
  };
  const streetFixes: [RegExp, string][] = [
    [/\bStree\b/g, "Street"], [/\bStreeet\b/g, "Street"], [/\bSreet\b/g, "Street"], [/\bStret\b/g, "Street"],
    [/\bSt\b(?=\s*[,.]?\s*[A-Z])/g, "Street"],
    [/\bRaod\b/g, "Road"], [/\bRoda\b/g, "Road"],
    [/\bAveune\b/gi, "Avenue"], [/\bAvnue\b/gi, "Avenue"],
    [/\bDrvie\b/g, "Drive"], [/\bDrve\b/g, "Drive"],
    [/\bPlce\b/g, "Place"], [/\bPalce\b/g, "Place"],
    [/\bCresent\b/g, "Crescent"], [/\bCrecsent\b/g, "Crescent"],
    [/\bTerace\b/g, "Terrace"],
    [/\bBoulevrad\b/gi, "Boulevard"], [/\bBouelvard\b/gi, "Boulevard"],
    [/\bCort\b/g, "Court"],
    [/\bClsoe\b/g, "Close"], [/\bColse\b/g, "Close"],
  ];
  for (const [re, to] of streetFixes) apply(re, to);
  const cityFixes: [RegExp, string][] = [
    [/\bHamilotn\b/gi, "Hamilton"], [/\bHamitlon\b/gi, "Hamilton"],
    [/\bWellingotn\b/gi, "Wellington"], [/\bWellingon\b/gi, "Wellington"],
    [/\bChristchuch\b/gi, "Christchurch"], [/\bChristchruch\b/gi, "Christchurch"],
    [/\bAuckand\b/gi, "Auckland"], [/\bAuckalnd\b/gi, "Auckland"],
    [/\bMasteron\b/gi, "Masterton"], [/\bMastetron\b/gi, "Masterton"],
    [/\bDunedni\b/gi, "Dunedin"], [/\bDunedn\b/gi, "Dunedin"],
    [/\bTauragnaa\b/gi, "Tauranga"],
    [/\bPalmerston Noth\b/gi, "Palmerston North"], [/\bPalmerstn North\b/gi, "Palmerston North"],
  ];
  for (const [re, to] of cityFixes) apply(re, to);
  apply(/\bPatinet\b/gi, "Patient");
  apply(/\bAdress\b/gi, "Address");
  apply(/\bAddres\b/gi, "Address");
  apply(/\bSurnam\b/gi, "Surname");
  return { text: t, corrections };
}

// Stage 2 — detection + redaction. Rule order matters: earlier rules consume
// matches before later rules can see them (v1.0 spec §4).
export function redact(input: string): RedactionResult {
  const { text: pre, corrections } = preCorrect(input);
  let t = pre;
  const counts: Record<string, number> = {};
  const hit = (type: PiiCategory) => {
    counts[type] = (counts[type] || 0) + 1;
  };

  // NHI — labelled (any format, valid or not)
  t = t.replace(
    /\bNHI\s*[:#]?\s*([A-HJ-NP-Za-hj-np-z]{3}[\s-]?\d{4}|[A-HJ-NP-Za-hj-np-z]{3}[\s-]?\d{2}[\s-]?[A-HJ-NP-Za-hj-np-z]{2})\b/gi,
    () => {
      hit("NHI");
      return "[NHI REDACTED]";
    },
  );
  // NHI old format AAANNNC — any format match (a mistyped NHI is still PII)
  t = t.replace(/\b[A-HJ-NP-Za-hj-np-z]{3}[\s-]?\d{4}\b/g, () => {
    hit("NHI");
    return "[NHI REDACTED]";
  });
  // NHI new format AAANNAX — validate the check character for unlabelled matches
  t = t.replace(/\b[A-HJ-NP-Za-hj-np-z]{3}[\s-]?\d{2}[\s-]?[A-HJ-NP-Za-hj-np-z]{2}\b/g, (m) => {
    if (validateNhiNew(m)) {
      hit("NHI");
      return "[NHI REDACTED]";
    }
    return m;
  });

  // DOB — date + age combo (age preserved, clinically relevant)
  t = t.replace(
    /\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4}\s*\(\d{1,3}\s*(?:years?|yrs?|y\/o)\)/gi,
    (m) => {
      hit("DOB");
      const age = m.match(/\(\d{1,3}\s*(?:years?|yrs?|y\/o)\)/i);
      return "[DOB REDACTED] " + (age ? age[0] : "");
    },
  );
  // DOB — labelled
  t = t.replace(
    /\b(DOB|Date\s+of\s+Birth|Born|D\.O\.B\.?)\s*:?\s*\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}/gi,
    (_m, label) => {
      hit("DOB");
      return label + ": [DOB REDACTED]";
    },
  );

  // Name — PMS header patterns
  t = t.replace(
    /\b(Patient\s+Name|Patient|Surname|Given\s+Name|First\s+Name|Name)\s*:\s*[^\n\r]+/gi,
    (_m, label) => {
      hit("NAME");
      return label + ": [NAME REDACTED]";
    },
  );
  t = t.replace(/\bRe\s*:\s*[A-Z][a-z]+\s+[A-Z][a-z]+/g, () => {
    hit("NAME");
    return "Re: [NAME REDACTED]";
  });
  t = t.replace(/\bDear\s+Dr[^\n\r,]+(regarding|re:)[^\n\r]+/gi, () => {
    hit("NAME");
    return "[NAME REDACTED]";
  });
  // Name — salutation (title consumed)
  t = t.replace(
    /\b(?:Mr\.?|Mrs\.?|Ms\.?|Miss|Master)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+(?:\s*-[A-Z][a-z]+)?)?/g,
    () => {
      hit("NAME");
      return "[NAME REDACTED]";
    },
  );
  // Name — bare Firstname Lastname + clinical-context verb
  t = t.replace(
    /(^|[\n\r]|\]\s*)([A-Z][a-z]{1,12}\s+[A-Z][a-z]{1,10}(?:\s*-[A-Z][a-z]+)?)[,\s]+(?=is\s|ia\s|has\s|was\s|had\s|presents?\s|present(?:ing|ed)\s|aged?\s|a\s+\d|\d{1,3}\s*[MFmf]\b|with\s)/gm,
    (m, pre2, name) => {
      const first = String(name).split(/\s/)[0];
      if (CLIN_ADJ.test(first)) return m;
      hit("NAME");
      return pre2 + "[NAME REDACTED] ";
    },
  );

  // Address — labelled
  t = t.replace(/\b(Address|Street|Suburb|City)\s*:\s*[^\n\r]+/gi, (_m, label) => {
    hit("ADDRESS");
    return label + ": [ADDRESS REDACTED]";
  });
  // Address — NZ street pattern + optional trailing city
  t = t.replace(
    /\b\d{1,4}\s+[A-Z][a-z]+\s+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Place|Pl|Crescent|Cres|Terrace|Tce|Way|Lane|Ln|Close|Cl|Court|Ct|Boulevard|Blvd)\b(?:[,\s]+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)?/gi,
    () => {
      hit("ADDRESS");
      return "[ADDRESS REDACTED]";
    },
  );
  // Address — location context + NZ place
  t = t.replace(
    new RegExp("\\b(?:lives?\\s+in|from|resides?\\s+in|based\\s+in|of)\\s+" + NZ_PLACES + "\\b", "gi"),
    () => {
      hit("ADDRESS");
      return "[ADDRESS REDACTED]";
    },
  );

  // Phone (NZ formats)
  t = t.replace(/(?:\+?64|0)\s*[2-9]\d{1,2}[\s-]?\d{3,4}[\s-]?\d{3,4}/g, () => {
    hit("PHONE");
    return "[PHONE REDACTED]";
  });
  // Email
  t = t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, () => {
    hit("EMAIL");
    return "[EMAIL REDACTED]";
  });
  // Referrer / practice
  t = t.replace(
    /\b(Referrer|Referring\s+Doctor|GP|Practice|Provider|Clinic)\s*:\s*[^\n\r]+/gi,
    (_m, label) => {
      hit("REFERRER");
      return label + ": [REFERRER REDACTED]";
    },
  );
  t = t.replace(/\bHPI\s*:\s*[A-HJ-NP-Za-hj-np-z]{4}\d{2}/gi, () => {
    hit("REFERRER");
    return "HPI: [REFERRER REDACTED]";
  });

  const patternsHit = Object.keys(counts) as PiiCategory[];
  return { redacted: t, patternsHit, counts, preCorrections: corrections };
}

const REDACTION_MARKER = /\[(?:NHI|NAME|DOB|ADDRESS|PHONE|EMAIL|REFERRER) REDACTED\]/g;

// Residual hard-pattern scan: after redaction, is an NHI still present? An
// old-format NHI candidate (pattern alone) or a check-valid new-format one that
// survived is a hard reject — the request must not be sent.
export function residualNhi(redacted: string): string[] {
  const stripped = redacted.replace(REDACTION_MARKER, " ");
  const found: string[] = [];
  for (const m of stripped.matchAll(/\b[A-HJ-NP-Za-hj-np-z]{3}[\s-]?\d{4}\b/g)) found.push(m[0]);
  for (const m of stripped.matchAll(/\b[A-HJ-NP-Za-hj-np-z]{3}[\s-]?\d{2}[\s-]?[A-HJ-NP-Za-hj-np-z]{2}\b/g)) {
    if (validateNhiNew(m[0])) found.push(m[0]);
  }
  return found;
}

// Enough clinical content left to be worth sending? (v1.0 spec §5.4)
export function isInsufficientAfterRedaction(redacted: string): boolean {
  return redacted.replace(REDACTION_MARKER, "").trim().length < 30;
}
