# Claude Code Brief — Triage Advisor Role-Aware Display (Step 1: presentation-only)

**Owner:** Gary Ireland · **Tool:** CRR Triage Advisor · **Status:** for clinician evaluation · **Reversibility:** required

---

## 1. Intent

Add a role-aware presentation of the Triage Advisor assessment so the **same** assessment renders one way for a **referrer** (GP/NP, pre-submission) and another for a **triager** (PCRL, assessing). This is a presentation transform over the output the tool **already produces**. It exists to test, with clinicians, whether the tool should present differently by role.

This is **step one only**: a front-end view layer. The assessment, the model, and the system prompt are untouched. One referral → one assessment → one D1 audit row, regardless of role.

---

## 2. Scope boundary — read before doing anything

**In scope:** the presentation/rendering layer of the assessment result, plus a role-selection mechanism and a feature flag.

**Out of scope — do NOT touch:**
- The system prompt (D1 or any local copy).
- The assessment request/response contract or output schema.
- D1 schema (no migrations).
- Model configuration (model, temperature, etc.).
- The "defer instead of decline / surface Other route" behaviour change — that is assessment logic, a **separate** brief.
- Deterministic / truth-preserving wording templating — that is **step two**, also separate.

If satisfying this brief appears to require any out-of-scope change, **stop and report** rather than proceeding.

---

## 3. Hard guardrails

- Work on a branch named `feature/role-aware-view`. **Do not merge. Do not deploy to production.**
- No edits to the system prompt anywhere.
- No changes to the assessment request/response contract. **Read existing fields only.**
- No D1 schema changes or migrations.
- No background or autonomous processes, no wakeup loops, no auto-running of anything.
- No fallback logic that alters data flow or source of truth.
- Stop point: branch pushed + Cloudflare Pages **preview URL** available. Then report back and await review.

---

## 4. Step 0 — Payload inspection gate (MANDATORY, before writing any renderer)

The achievable fidelity of a presentation-only role view depends entirely on how structured the current assessment output already is. So before any UI work, inspect and report:

1. The actual structure of the assessment object returned by the call and consumed by the result component (paste the TypeScript type/interface **and** a real example object).
2. Is "missing elements" a **structured array**, or **free-text prose**?
3. Are page references (e.g. `[p10]`) a **discrete field**, or inline inside strings?
4. Is the model's suggested wording (the `→ Add…` text) a **separate field**, or concatenated into the gap text?
5. Where do the verdict, matched criteria, safety alerts, and any temporal/ambiguity flags live in the object?

Then make a call:

- **If the output is structured enough** to drive a role transform without brittle string parsing → proceed to §5 and describe the field-to-view mapping you'll use.
- **If it is not** (e.g. page refs and suggested wording are baked into prose blobs) → **STOP. Do not force it with regex on prose.** Report exactly what's missing and state whether step two (structured assessment output) is a prerequisite. A clean step-one is preferable to a fragile one.

---

## 5. The two views (presentation only)

Same assessment object. Role selects rendering, using **only fields that already exist**.

**Referrer view** (action, pre-submission):
- Verdict reframed as progress: e.g. "Nearly ready — N things to add before submitting".
- Section label action-oriented: e.g. "To complete this referral".
- Show the model's existing suggested wording as-is.
- Hide / de-emphasise page references and internal criteria codes.

**Triager view** (assessment):
- Verdict as assessment: e.g. "Insufficient · N gaps · <exam> — <indication>".
- Section label observational: e.g. "Gap against criteria".
- Page references visible for audit.
- Hide the referrer-facing suggested wording, or collapse it behind a "what the referrer is advised" toggle.
- Surface temporal / ambiguity flags as explicit decision points (only if the object already carries them).

**Constant across both roles — non-negotiable:** safety alerts (emergency redirect, ACC redirect) are **never** hidden or down-weighted by role. Fail-safe overrides role presentation.

**Wording fidelity note:** in this step the suggested wording is still whatever the model produced. **Do not template, rewrite, or "fix" it.** Reframing here means show / hide / relabel only. Truth-preserving deterministic wording is step two and is out of scope.

---

## 6. Role selection mechanism

- `role` URL parameter: `?role=referrer` or `?role=triager`.
- **Default behaviour** (param absent or unrecognised) = **current tool, byte-identical.** This is the master revert.
- Standalone / evaluation mode: a visible toggle control so evaluators can flip role on the **same** assessment without re-running it. The toggle is presentation-only — it must **not** re-call the model.
- Launch context may pass the param (referral platform → `referrer`; PCRL console → `triager`), but **do not build platform integration here** — just read the param if present.

---

## 7. Revert layers

1. Param defaults to current behaviour — feature is off unless explicitly requested.
2. Branch is not merged until clinicians validate it.
3. Preview deploy isolates everything from production.
4. Additive-only — no schema touched, so there is nothing to roll back.

---

## 8. Acceptance criteria / definition of done

- With **no** role param, rendered output is identical to current production (verify side by side).
- `?role=referrer` and `?role=triager` render the **same single assessment** two ways per §5.
- **One** assessment call and **one** D1 audit row regardless of role; toggling role does **not** call the model again (verify no extra API calls or log rows).
- Safety alerts are visible in **both** roles.
- Diff is confined to presentation components + a role/view utility. No changes to prompt, schema, or assessment contract.
- Branch `feature/role-aware-view` pushed; Cloudflare Pages preview URL available.

---

## 9. Deliverables

1. Branch `feature/role-aware-view`, pushed (not merged).
2. The preview URL.
3. A short report: the assessment payload shape found (§4), the field-to-view mapping applied (§5), and anything that could not be done presentation-only.
