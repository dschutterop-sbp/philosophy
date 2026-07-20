export const PAPER_SOURCE = "paper/philosophy_layer.md";

const section = (anchor, label, description) => ({
  href: `${PAPER_SOURCE}#${anchor}`,
  label,
  description,
});

// Keep these references semantic rather than line-based: headings are stable when
// prose is edited, while a line number would silently become misleading.
export const paperReferences = Object.freeze({
  context: section("paper-architecture", "Paper §5", "Architecture: verified context and layer boundaries"),
  interpretation: section("paper-philosophy-layer", "Paper §2", "The Philosophy layer and its interpretation output"),
  creativeDirection: section("paper-creative-direction", "Paper §5.1", "Creative Direction as bounded exploration"),
  validation: section("paper-architecture", "Paper §5", "Architecture: deterministic validation"),
  conformance: section("paper-semantic-conformance", "Paper §5.2", "Semantic Conformance"),
  humanGate: section("paper-precedence", "Paper §5.3", "Authorised human review and override"),
  approval: section("paper-semantic-conformance", "Paper §5.2", "Exact-state approval binding"),
  audit: section("paper-architecture", "Paper §5", "Architecture: complete decision-chain audit"),
  silence: section("paper-silence", "Paper §6", "Silence as a decision"),
  versions: section("paper-versioning", "Paper §5.4", "Versioning the decision chain"),
  evaluation: section("paper-testing", "Paper §7", "Testing and evaluation"),
});

export function referenceFor(key) {
  return paperReferences[key] || paperReferences.audit;
}
