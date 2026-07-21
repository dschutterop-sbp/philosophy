export const PAPER_SOURCE = "paper/philosophy_layer.md";

const section = (anchor, label, description, level = 1) => ({
  href: `${PAPER_SOURCE}#${anchor}`,
  label,
  description,
  level,
});

// Keep these references semantic rather than line-based: headings are stable when
// prose is edited, while a line number would silently become misleading.
export const paperReferences = Object.freeze({
  context: section("paper-architecture", "Paper §5", "Architecture: verified context and layer boundaries"),
  interpretation: section("paper-philosophy-layer", "Paper §2", "The Philosophy layer and its interpretation output"),
  creativeDirection: section("paper-creative-direction", "Paper §5.1", "Creative Direction as bounded exploration", 2),
  validation: section("paper-architecture", "Paper §5", "Architecture: deterministic validation"),
  conformance: section("paper-semantic-conformance", "Paper §5.2", "Semantic Conformance", 2),
  humanGate: section("paper-precedence", "Paper §5.3", "Authorised human review and override", 2),
  approval: section("paper-semantic-conformance", "Paper §5.2", "Exact-state approval binding", 2),
  audit: section("paper-architecture", "Paper §5", "Architecture: complete decision-chain audit"),
  strategy: section("paper-strategy", "Paper §5.5", "Temporary strategy within Philosophy invariants", 2),
  governance: section("paper-governance", "Paper §5.6", "Governance, ownership, and taxonomy review", 2),
  failures: section("paper-failures", "Paper §5.7", "Fail-closed recovery and human-only fallback", 2),
  silence: section("paper-silence", "Paper §6", "Silence as a decision"),
  versions: section("paper-versioning", "Paper §5.4", "Versioning the decision chain", 2),
  evaluation: section("paper-testing", "Paper §7", "Testing and evaluation"),
  references: section("paper-references", "References", "Sources and related work"),
});

export function referenceFor(key) {
  return paperReferences[key] || paperReferences.audit;
}
