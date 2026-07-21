import { canonicalHash } from "../server/approval.js";
import { conformanceCheck, createDirections, interpret, validateArtefact } from "../src/pipeline.js";
import { isEnumeratedClass } from "../server/taxonomy.js";

// Fault-injection harness for error-localisation testing (§7, "Fault Injection").
//
// Natural production failures rarely provide an uncontested ground truth for which layer
// was responsible. This harness builds a full decision chain, injects exactly one known
// fault, and asks a localiser — which sees only the chain, not the injection — to name the
// faulty layer. Localisation accuracy is then measured against the injected ground truth.
//
// The harness is deliberately honest about the limit in §3/§7.2: a confabulated (but
// internally clean) interpretation is UNLOCATABLE, because the recorded rationale looks
// healthy while the operative reason was never recorded. That case is expected to localise
// to "unlocated", not to a layer.

export function runChain(context) {
  const interpretation = interpret(context);
  const [direction] = createDirections(context, interpretation);
  const validation = validateArtefact(context, direction);
  const conformance = conformanceCheck(direction, interpretation);
  const payload = { media: "media-hash-reference", text: direction.caption, direction: { id: direction.id, concept: direction.concept, caption: direction.caption } };
  return { context, interpretation, direction, validation, conformance, payload, approvedPayloadHash: canonicalHash(payload) };
}

// Canonical expectations a healthy chain must satisfy. The interpreter fault removes one
// of these rejected frames; the philosophy/strategy faults (which in the live pipeline live
// in separate documents) manifest here at the interpretation layer, which is noted where
// they are modelled.
const EXPECTED_REJECTED_FRAMES = ["heat_relief", "urgency"];

export const FAULTS = {
  // Change one verified context fact so a required field is no longer present.
  CONTEXT_FACT_CORRUPTED: { layer: "context", apply: (chain) => ({ ...chain, context: { ...chain.context, products: [] } }) },
  // Modify the interpreter so it drops a prohibited frame AND leaks heat framing.
  INTERPRETER_PROHIBITED_FRAME: { layer: "interpretation", apply: (chain) => ({ ...chain, interpretation: { ...chain.interpretation, rejectedFrames: chain.interpretation.rejectedFrames.filter((frame) => frame !== "heat_relief"), semanticDirection: "Beat the heat with a cold treat." } }) },
  // Executor ignores one avoid criterion: heat language enters the caption.
  EXECUTOR_IGNORES_AVOID: { layer: "execution", apply: (chain) => { const direction = { ...chain.direction, caption: `Beat the heat! ${chain.direction.caption}` }; return { ...chain, direction, validation: validateArtefact(chain.context, direction), conformance: conformanceCheck(direction, chain.interpretation) }; } },
  // A deterministic validation rule is corrupted so it reports pass on a failing artefact.
  VALIDATION_TAMPERED: { layer: "validation", apply: (chain) => { const direction = { ...chain.direction, caption: `Beat the heat! ${chain.direction.caption}` }; return { ...chain, direction, validation: { valid: true, missing: [], violations: [] }, conformance: conformanceCheck(direction, chain.interpretation) }; } },
  // A conformance result is replaced with an incorrect pass.
  CONFORMANCE_TAMPERED: { layer: "conformance", apply: (chain) => { const direction = { ...chain.direction, caption: `Beat the heat! ${chain.direction.caption}` }; return { ...chain, direction, validation: validateArtefact(chain.context, direction), conformance: { ...chain.conformance, conforms: true, dispositionOutcome: "accept", violations: [], findings: [] } }; } },
  // The approved payload is mutated before publication.
  PAYLOAD_MUTATED: { layer: "payload", apply: (chain) => ({ ...chain, payload: { ...chain.payload, text: `${chain.payload.text} (edited after approval)` } }) },
  // The §3/§7.2 limit: a fluent, internally clean rationale that is not the operative reason.
  // Nothing in the recorded chain is inconsistent, so it is expected to be UNLOCATABLE.
  INTERPRETER_CONFABULATION: { layer: "unlocated", apply: (chain) => ({ ...chain, interpretation: { ...chain.interpretation, interpretiveInference: "A fluent but non-operative rationale that reads as principled." } }) },
};

// The localiser sees only the chain. It walks the pipeline in order and attributes the fault
// to the first layer whose contract is violated. It distinguishes a tampered check (stored
// verdict disagrees with a fresh recomputation) from a genuinely bad artefact that the
// checks correctly flag (verdicts agree, fault is upstream in execution).
export function localise(chain) {
  const required = ["day", "opensAt", "closesAt"];
  if (required.some((field) => !chain.context?.[field]) || !(chain.context?.products?.length)) return { layer: "context", evidence: "required context field missing or empty" };
  if (!isEnumeratedClass(chain.interpretation.decisionClass)) return { layer: "interpretation", evidence: "decision_class not enumerated" };
  if (chain.interpretation.recommendation === "develop_direction" && !chain.interpretation.positiveFitCondition) return { layer: "interpretation", evidence: "missing mandatory positive_fit_condition" };
  if (!EXPECTED_REJECTED_FRAMES.every((frame) => chain.interpretation.rejectedFrames.includes(frame))) return { layer: "interpretation", evidence: "a canonical rejected frame is absent" };

  const freshValidation = validateArtefact(chain.context, chain.direction);
  if (chain.validation.valid !== freshValidation.valid) return { layer: "validation", evidence: "stored validation verdict disagrees with recomputation" };
  const freshConformance = conformanceCheck(chain.direction, chain.interpretation);
  if (chain.conformance.conforms !== freshConformance.conforms) return { layer: "conformance", evidence: "stored conformance verdict disagrees with recomputation" };
  if (!freshValidation.valid || !freshConformance.conforms) return { layer: "execution", evidence: "artefact fails checks that themselves agree — fault is upstream in execution" };

  if (canonicalHash(chain.payload) !== chain.approvedPayloadHash) return { layer: "payload", evidence: "payload hash differs from the approved hash" };
  return { layer: "unlocated", evidence: "chain is internally consistent; any fault is not recorded (see §7.2)" };
}

// Run every fault once and score localisation against ground truth.
export function scoreLocalisation(context) {
  const baseline = runChain(context);
  const results = Object.entries(FAULTS).map(([name, fault]) => {
    const injected = fault.apply(baseline);
    const located = localise(injected);
    return { fault: name, expected: fault.layer, located: located.layer, correct: located.layer === fault.layer, evidence: located.evidence };
  });
  const correct = results.filter((result) => result.correct).length;
  return { results, correct, total: results.length, accuracy: correct / results.length };
}
