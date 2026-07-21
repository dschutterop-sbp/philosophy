// Failure and recovery semantics (§5.7).
//
// The reference architecture fails closed: no accepted interpretation → no executable
// direction; no valid bundle → no valid approval; no valid approval → no authorised
// submission. Every stop is a *typed* failure so the audit record localises where the
// chain halted rather than collapsing into "something went wrong".

export const FAILURE_CODES = Object.freeze({
  CONTEXT_MISSING_OR_UNVERIFIED: "required context evidence is missing or fails verification",
  INTERPRETATION_SCHEMA_INVALID: "the interpretation does not conform to its schema",
  INTERPRETATION_REJECTED_AT_CHECKPOINT: "the early checkpoint rejected the interpretation or left its disposition unresolved",
  NON_GENERATIVE_RECOMMENDATION: "the interpreter returned request_more_context, defer or escalate",
  DECISION_CLASS_UNENUMERATED: "the interpretation used a decision_class not in the governed taxonomy",
  CHECK_UNAVAILABLE: "deterministic validation or semantic conformance is unavailable or incomplete",
  BOUND_HASH_MISMATCH: "a bound hash no longer matches",
  APPROVAL_SIGNATURE_INVALID_OR_EXPIRED: "the approval signature cannot be verified or has expired",
  DESTINATION_OR_ADAPTER_MISMATCH: "the destination or adapter version differs from the approved bundle",
  PLATFORM_REJECTED_OR_AMBIGUOUS: "the platform rejected submission or returned an ambiguous receipt",
  TIME_ORDERING_INVALID: "the bound state violates latest_bound_input ≤ approved ≤ scheduled ≤ expiry",
});

export class PipelineFailure extends Error {
  constructor(code, detail = "", status = 409) {
    super(FAILURE_CODES[code] || detail || code);
    this.code = code;
    this.detail = detail;
    this.status = status;
    this.typed = true;
  }
}

export function typedFailure(code, detail = "", status = 409) {
  return new PipelineFailure(code, detail, status);
}

// A governed human-only fallback operating mode (§5.7). It is NOT an implicit bypass:
// entering it must record which controls are unavailable, the responsible human, the
// reason for proceeding and a fresh approval state. Recovery never reuses an approval
// token whose assumptions no longer hold.
export function humanOnlyFallbackRecord({ unavailableControls, responsibleHuman, reason }) {
  if (!Array.isArray(unavailableControls) || unavailableControls.length === 0) throw typedFailure("CHECK_UNAVAILABLE", "human-only fallback needs the list of unavailable controls", 400);
  if (!responsibleHuman?.id || !responsibleHuman?.role) throw typedFailure("CHECK_UNAVAILABLE", "human-only fallback needs a responsible human with id and role", 400);
  if (!reason) throw typedFailure("CHECK_UNAVAILABLE", "human-only fallback needs a recorded reason", 400);
  return {
    mode: "human_only_fallback",
    unavailableControls,
    responsibleHuman,
    reason,
    requiresNewApproval: true,
  };
}
