# Validation-gate test vectors

Hand-written extraction responses for the validation gate (`extraction-contract.md` §"Validation
gate"). **Slice 4b's gate tests consume these**: glob `*.json`, run the gate over each
`response` with its `note`, and assert the outcome named in `expect`.

| Field | Meaning |
|---|---|
| `expect` | `"pass"` (the gate must accept unchanged) or `"reject"` (the gate must reject the **whole** response) |
| `gateRule` | which numbered gate rule catches it, or `null` for the passing vector |
| `why` | what failure mode the vector pins, and why rejecting the whole response is the right behaviour |
| `note` | the redacted note the quotes are checked against |
| `response` | the extraction envelope exactly as the model would return it |

Every vector uses the same note (the RM-RP-001 results-matrix case) so that a failure is
attributable to the mutation and not to the note.

| Vector | Expect | Rule | Pins |
|---|---|---|---|
| `01-valid-pass` | pass | - | Every quote appears in the note, every linkId is in one of the supplied Questionnaires, every value type matches its item type, every answer carries the evidence extension, and no forbidden field is present. |
| `02-unquotable-value` | reject | 1 | weightloss.percent claims the quote 'documented 5% loss on scales', which is not in the note. |
| `03-unknown-linkid` | reject | 2 | weightloss.kilogramsLost is in no supplied Questionnaire and in no vocabulary. |
| `04-type-mismatch` | reject | 2 | patient.age is an integer item answered with valueString, and weightloss.percent is a decimal item answered with valueBoolean. |
| `05-missing-evidence-extension` | reject | 3 | lab.hb.low is answered with no answer-evidence extension. |
| `06-retrieved-status-from-model` | reject | 4 | lab.hb.low is labelled status 'retrieved'. |
| `07-verdict-shaped-field` | reject | 4 | The envelope carries verdict, priority and suggested_wording, and the response carries a free-text note. |

**The rule these vectors exist to hold:** a failure rejects the *whole* response. A gate that
dropped the offending answer and continued would turn a fabrication into an
`INSUFFICIENT_INFORMATION` — the failure would still be silent, which is the thing the
architecture is built to stop.

Vectors 02-07 are one mutation each, applied to vector 01. Adding a vector means adding a
failure mode, not a variation on one already covered.
