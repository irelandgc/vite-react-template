// ARCH-MIG-01 slice 4b — server-side PII gate tests.
//
// Coverage ≥ the client pipeline: every pattern in
// CRR_PII_Detection_AutoRedaction_Spec (§3, §4) has a positive case, plus the
// negative cases (clinical numbers that look like NHIs, clinical dates that are
// not DOBs). The residual-NHI scan is the hard-reject path.
import { describe, expect, it } from "vitest";
import { redact, residualNhi, validateNhiOld, validateNhiNew, isInsufficientAfterRedaction } from "../pii";

const r = (s: string) => redact(s).redacted;
const hits = (s: string) => redact(s).patternsHit.sort();

describe("PII — NHI", () => {
  it("labelled NHI (any format, valid or not)", () => {
    expect(r("NHI: ZZZ0094 presented")).toContain("[NHI REDACTED]");
    expect(r("nhi ABC 1234")).toContain("[NHI REDACTED]");
    expect(r("NHI# ALU18KZ")).toContain("[NHI REDACTED]");
  });
  it("old format AAANNNC — pattern alone, even a mistyped one", () => {
    expect(r("ZZZ0094 Mr X")).toContain("[NHI REDACTED]");
    expect(r("ABC1235, 74M")).toContain("[NHI REDACTED]");
    expect(r("DEF-5678 sore knee")).toContain("[NHI REDACTED]");
  });
  it("new format AAANNAX — unlabelled requires a valid check character", () => {
    // ALU18KZ is an HNZ-published sample (mod-24 valid)
    expect(validateNhiNew("ALU18KZ")).toBe(true);
    expect(r("Patient ALU18KZ today")).toContain("[NHI REDACTED]");
    // an invalid-check candidate is NOT redacted unlabelled (false-positive risk)
    expect(validateNhiNew("XYZ99AB")).toBe(false);
    expect(r("code XYZ99AB on the form")).toContain("XYZ99AB");
  });
  it("old-format check digit validates (for downstream use, not detection gating)", () => {
    expect(validateNhiOld("ZZZ0094")).toBe(false); // mistyped — still PII, still redacted above
  });
  it("NEGATIVE — clinical numbers that resemble NHI numeric runs are not the old-format shape", () => {
    // "CRP 45" / "Hb 98" / "eGFR 52" — no 3-alpha + 4-digit block
    expect(hits("CRP 45, Hb 98, eGFR 52, weight 84kg")).toEqual([]);
  });
  it("residualNhi flags an old-format run that survived, ignores redaction markers", () => {
    expect(residualNhi("74M [NHI REDACTED] sore knee")).toEqual([]);
    expect(residualNhi("ref ABC1234 on chart")).toEqual(["ABC1234"]);
  });
});

describe("PII — name", () => {
  it("PMS header labels consume the rest of the line", () => {
    expect(r("Patient Name: Kerry Smith\n74M sore knee")).toContain("Patient Name: [NAME REDACTED]");
    expect(r("Surname: Wilson-Brown")).toContain("Surname: [NAME REDACTED]");
  });
  it("salutation + name, title consumed", () => {
    expect(r("Mr Kerry Smith has a sore knee")).toBe("[NAME REDACTED] has a sore knee");
    expect(r("Mrs Jane Wilson-Brown presented")).toBe("[NAME REDACTED] presented");
  });
  it("bare Firstname Lastname + clinical context verb", () => {
    expect(r("Kerry Smith is a 74M")).toBe("[NAME REDACTED] is a 74M");
    expect(r("Kerry Smith, 74M with sore knee")).toBe("[NAME REDACTED] 74M with sore knee");
  });
  it("NEGATIVE — compound clinical terms in the adjective exclusion list are left alone", () => {
    expect(r("Lateral Epicondylitis is suspected")).toBe("Lateral Epicondylitis is suspected");
    expect(r("Frozen Shoulder is confirmed")).toBe("Frozen Shoulder is confirmed");
    expect(hits("Progressive Weakness has worsened")).toEqual([]);
  });
});

describe("PII — DOB", () => {
  it("labelled DOB", () => {
    expect(r("DOB: 15/03/1958\n67M")).toContain("DOB: [DOB REDACTED]");
    expect(r("D.O.B. 1.4.1960")).toContain("[DOB REDACTED]");
  });
  it("date + age combo preserves the age", () => {
    expect(r("15/03/1958 (67 years) with knee pain")).toContain("[DOB REDACTED] (67 years)");
  });
  it("NEGATIVE — an isolated clinical date is not a DOB", () => {
    expect(hits("symptoms started 15/03/2026, worse since")).toEqual([]);
  });
});

describe("PII — address", () => {
  it("labelled address", () => {
    expect(r("Address: 23 Some Street, Hamilton")).toContain("Address: [ADDRESS REDACTED]");
  });
  it("NZ street pattern + trailing city", () => {
    expect(r("lives at 23 Some Street, Hamilton and works nearby")).toContain("[ADDRESS REDACTED]");
  });
  it("location context + NZ place", () => {
    expect(r("74M, lives in Hamilton, sore knee")).toContain("[ADDRESS REDACTED]");
  });
  it("pre-correction fixes a misspelled street type so the pattern still matches", () => {
    const out = redact("23 Some Stree, Hamilton");
    expect(out.redacted).toContain("[ADDRESS REDACTED]");
    expect(out.preCorrections).toBeGreaterThan(0);
  });
});

describe("PII — contact + referrer", () => {
  it("phone (NZ)", () => {
    // formats the ported client pattern matches (mobile, international)
    expect(r("call 021 234 5678")).toContain("[PHONE REDACTED]");
    expect(r("ph +64 21 555 1234")).toContain("[PHONE REDACTED]");
  });
  it("email", () => {
    expect(r("email kerry.smith@example.co.nz")).toContain("[EMAIL REDACTED]");
  });
  it("referrer / practice labels and HPI", () => {
    expect(r("GP: Dr A Jones, Anytown Medical")).toContain("GP: [REFERRER REDACTED]");
    expect(r("HPI: ABCD12")).toContain("HPI: [REFERRER REDACTED]");
  });
});

describe("PII — pipeline behaviour", () => {
  it("multiple categories, reported in patternsHit", () => {
    const out = redact("NHI: ZZZ0094 Mr Kerry Smith, 74M. Lives in 23 Some Street, Hamilton. ph 021 234 5678");
    expect(out.patternsHit).toEqual(expect.arrayContaining(["NHI", "NAME", "ADDRESS", "PHONE"]));
    expect(out.redacted).not.toContain("Kerry");
    expect(out.redacted).not.toContain("ZZZ0094");
  });
  it("isInsufficientAfterRedaction when little clinical detail remains", () => {
    const out = redact("Mr Kerry Smith. NHI ZZZ0094.");
    expect(isInsufficientAfterRedaction(out.redacted)).toBe(true);
    expect(isInsufficientAfterRedaction("74M, 4/12 unintentional weight loss, full work-up done, strong suspicion malignancy")).toBe(false);
  });
});
