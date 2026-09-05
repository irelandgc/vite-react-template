/*
  ARCH-MIG-01 slice 1 session 2 — throwaway proof library.

  Not a real site. Proves the `include CRR_<Other>` cross-bundle mechanism
  (plan §2 slice 1 "Cross-bundle references") resolves and compiles: a future
  site (e.g. CT AP, slice 7) needs to `include` another site's library and
  reference its determination define ("patients who meet the criteria for
  CT CAP" is an exclusion in CT AP). This library does exactly that against
  the real CT CAP library, so the include-resolution path is proven against
  real ELM, not a mock.

  Exercised by tooling/test-cross-bundle-include.mjs. Never published,
  never referenced by check-consistency's site inventory.
*/
library CRR_TestIncludesCTCAP version '0.0.1'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers
include CRR_CTChestAbdomenPelvis_Adult version '2.0.0' called CTCAP

context Patient

// Proof of resolution: reference an included library's define directly.
define "CT CAP Determination":
  CTCAP."Determination"

// Proof of composition: a plausible real shape for a dependent site's
// exclusion — "excluded if the patient meets CT CAP's criteria" — using one
// of CT CAP's own real Determination values (see CRR_CTChestAbdomenPelvis_Adult.cql).
define "Excluded By CT CAP Determination":
  CTCAP."Determination" = 'P2_URGENT'
