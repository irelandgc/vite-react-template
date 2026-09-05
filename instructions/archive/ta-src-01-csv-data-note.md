> **[SUPERSEDED — 2026-09-05]** Cover note for `ta-src-id-mapping.csv` and
> `ta-src-published-unmatched.csv`, filed alongside them in this folder.
> Filed by: Claude Code

# TA-SRC-01 CSV data — not tagged in-file, on purpose

`ta-src-id-mapping.csv` and `ta-src-published-unmatched.csv` are moved to
`instructions/archive/` alongside the other TA-SRC-01 files (ARCH-MIG-01
retires the mechanism they were gathered for — see SD-10,
`documents/SECURITY_DECISIONS.md`), but their content is **not** prepended
with the usual filing tag: these are machine-readable CSVs, and a text banner
in row 1 would corrupt them for anything that still reads them as data.

**Both files are live inputs, not dead records.** `instructions/arch-mig-plan.md`
§2 Slice 7 Wave W5 names `ta-src-published-unmatched.csv` explicitly
("reconciliation — items present in published JSON but absent from the PDF
or vice versa (TA-SRC-01 §2 unmatched CSV)"). `ta-src-id-mapping.csv` (old
item ID → published item ID, with match confidence) is the same kind of
reconciliation aid for the same wave. Whoever runs W5 should read both files
directly from this folder rather than assume archived means stale.

Verification: verified — both files' relevance to slice 7 W5 is stated
explicitly in the approved Phase 2 plan, not inferred here.
