// Constraints, preferences and authorised override (§5.3).
//
// The architecture separates two things a single precedence list conflates:
//
//   * HARD ADMISSIBILITY BOUNDARIES — conjunctive. Together they define the valid
//     decision space. A conflict between them is not resolved by ranking; it is an
//     invalid state that must fail closed or escalate to the owning governance process.
//
//   * PREFERENCE ORDERING — ranks only options that already satisfy every hard boundary.
//     A preference never overrides a hard boundary.
//
// This module is the single place those two lists live, so the rest of the pipeline
// can reference them by name rather than re-encoding an ad-hoc precedence.

// Conjunctive hard boundaries. Order is presentational only; none outranks another.
export const HARD_ADMISSIBILITY_BOUNDARIES = [
  "safety_law_and_non_overridable_governance",
  "verified_context_constraints",
  "hard_skill_constraints",
  "philosophy_invariants_and_explicit_prohibitions",
];

// Preference ordering inside the valid space. Index 0 outranks index n.
export const PREFERENCE_ORDER = [
  "authorised_human_instruction",
  "time_bounded_strategy_objectives",
  "philosophy_defaults_and_positive_preferences",
  "overrideable_skill_execution_defaults",
  "model_creativity",
];

// A severity of `major` (or a `hard` boundary_type) is treated as a hard-boundary
// violation: non-compensatory, un-overridable by an ordinary prompt-level instruction.
export function isHardBoundaryFinding(finding) {
  return finding?.boundaryType === "hard" || finding?.severity === "major";
}

// A human may override or dismiss only SOFT findings, and only with a recorded reason
// and role (§5.2). Hard boundaries require a governance action, not a prompt.
export function humanMayOverride(finding) {
  return !isHardBoundaryFinding(finding);
}

// Rank a set of admissible options by the first preference tier on which they differ.
// `tiersFor(option)` must return a map from preference name to a comparable score
// (higher is stronger). Options are assumed already admissible.
export function rankByPreference(options, tiersFor) {
  return [...options].sort((a, b) => {
    const sa = tiersFor(a);
    const sb = tiersFor(b);
    for (const tier of PREFERENCE_ORDER) {
      const diff = (sb[tier] || 0) - (sa[tier] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}
