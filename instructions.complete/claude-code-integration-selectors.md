# Viewer Integration Mode — Show Modality/Site Selectors

## Context

When the Criteria Viewer is launched from a referral platform (HealthLink, BPAC, ERMS) via URL parameters, it currently hides the modality radio buttons and exam site checkboxes in interactive mode, showing only the criteria panel for the pre-selected exam. This prevents GPs from exploring other exams without closing and relaunching the viewer.

## What to change

When the viewer is launched in integration mode (URL params present specifying modality and/or site), **show the modality and site selectors** instead of hiding them. The integration-specified site(s) should be pre-checked.

### Specific behaviour

1. **Modality radio buttons** — visible, with the integration-specified modality pre-selected. The GP can switch modalities to explore other options.

2. **Exam site checkboxes** — visible, with the integration-specified site(s) pre-checked. The GP can check additional sites or uncheck the pre-selected one.

3. **"From referral" indicator** — add a small, subtle tag or badge next to any site checkbox that was pre-selected by the integration URL params. Something like a small pill badge saying "from referral" in the muted text style (10px, uppercase, light background). This distinguishes "selected by the referral form" from "I ticked this myself." The badge is purely informational — it doesn't affect behaviour.

4. **Criteria panel** — continues to show criteria for all checked sites, exactly as it does in standalone mode. If the GP checks additional sites, the criteria panel expands to include those sites too.

5. **Search bar** — should remain visible in integration mode (if it isn't already).

### What NOT to change

- Do NOT change standalone mode behaviour — this only affects integration mode (when URL params are present)
- Do NOT change the URL parameter handling — the same params still pre-select the modality and site
- Do NOT change the criteria panel rendering, copy/send output, or any other functionality
- Do NOT change passive integration mode — this change is for interactive integration mode only
- Do NOT remove the single-column layout option — if the viewer is embedded in an iframe or narrow panel where two columns won't fit, it should still fall back to single-column. The selector visibility change applies to both layouts

## File to modify

`public/crr-criteria/viewer/index.html`

## Testing

1. Launch viewer with integration params (e.g. `?modality=ct&site=ct_chest&region=3d`) — modality and site selectors should be visible with CT and Chest pre-checked
2. The "from referral" badge should appear next to the Chest checkbox
3. GP can check additional sites (e.g. also check CT CAP) — criteria panel shows both
4. GP can switch modality — site checkboxes update accordingly
5. Standalone mode (no URL params) — no change in behaviour, no "from referral" badges
