import { conformanceCheck, createDirections, interpret, validateArtefact } from "../src/pipeline.js";

// Ablation scaffold for the review-process study (§7.1).
//
// The paper's ladder separates three treatments a single step would confound:
//   A   Context + Skill only
//   B   + identical Philosophy content in one monolithic prompt, emitting only the final
//       artefact or an explicit silence decision (any reasoning stays internal)
//   B′  As B, but the model's interpretive reasoning is surfaced as free-text prose:
//       visible, but unstructured, unversioned, non-persisted
//   C   As B′, but the interpretation is a typed, persisted artefact produced before
//       generation, inspectable and rejectable at the early checkpoint
//   D   C + bounded Creative Direction
//   E   D + deterministic validation + Semantic Conformance + exact-state approval
//
// This module is a STRUCTURAL scaffold, not the outcome study. The outcome study needs the
// live model and human reviewers. What is computable deterministically is what each
// condition EXPOSES to a reviewer: the review objects available, whether an interpretation
// can be rejected before generation, and the review-object load. The load-bearing contrast
// the paper stakes itself on — B′ vs C, isolating typed/persisted/rejectable STRUCTURE from
// the mere VISIBILITY of reasoning — is represented explicitly so an outcome harness can be
// layered on top without redefining the conditions.

function chainFor(context) {
  const interpretation = interpret(context);
  const generative = interpretation.recommendation === "develop_direction";
  const directions = generative ? createDirections(context, interpretation) : [];
  const checked = directions.map((direction) => ({ direction, validation: validateArtefact(context, direction), conformance: conformanceCheck(direction, interpretation) }));
  return { interpretation, directions, checked };
}

// For each condition: which review objects a reviewer sees, and the properties the paper
// claims for that condition.
export const CONDITIONS = {
  A: { reasoningVisible: false, reasoningStructured: false, interpretationPersisted: false, rejectableBeforeGeneration: false, hasDirections: false, hasConformance: false },
  B: { reasoningVisible: false, reasoningStructured: false, interpretationPersisted: false, rejectableBeforeGeneration: false, hasDirections: false, hasConformance: false },
  "B'": { reasoningVisible: true, reasoningStructured: false, interpretationPersisted: false, rejectableBeforeGeneration: false, hasDirections: false, hasConformance: false },
  C: { reasoningVisible: true, reasoningStructured: true, interpretationPersisted: true, rejectableBeforeGeneration: true, hasDirections: false, hasConformance: false },
  D: { reasoningVisible: true, reasoningStructured: true, interpretationPersisted: true, rejectableBeforeGeneration: true, hasDirections: true, hasConformance: false },
  E: { reasoningVisible: true, reasoningStructured: true, interpretationPersisted: true, rejectableBeforeGeneration: true, hasDirections: true, hasConformance: true },
};

// Count the review objects a reviewer must inspect in each condition (review-object load, §7).
function reviewObjectLoad(condition, chain) {
  let load = 1; // the final artefact or silence decision is always present
  if (condition.reasoningVisible) load += 1; // prose or structured rationale
  if (condition.hasDirections) load += chain.directions.length;
  if (condition.hasConformance) load += chain.checked.length;
  return load;
}

export function ablateScenario(scenario) {
  const chain = chainFor(scenario.context);
  const rows = Object.entries(CONDITIONS).map(([name, condition]) => ({
    condition: name,
    ...condition,
    reviewObjectLoad: reviewObjectLoad(condition, chain),
  }));
  return { scenario: scenario.id, recommendation: chain.interpretation.recommendation, rows };
}

// The single contrast the paper says can refute the design most cleanly (§7.1): isolate
// structure (C) from visibility (B′). Returns the properties that differ between them.
export function loadBearingContrast() {
  const b = CONDITIONS["B'"];
  const c = CONDITIONS.C;
  const differs = Object.keys(c).filter((key) => b[key] !== c[key]);
  return { from: "B'", to: "C", isolates: differs, claim: "typed, persisted, rejectable structure beyond mere visibility of reasoning" };
}
