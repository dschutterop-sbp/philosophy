const forbiddenPatterns = [
  ["heat_relief", /beat the heat|heat relief/i],
  ["urgency", /limited time|hurry|don't miss|now!/i],
  ["generic_seasonal_framing", /sunny day|summer vibes|summer/i],
  ["discount_messaging", /discount|deal|sale/i],
];

export function assessOpeningDecision(context, minimumTemperature = 18) {
  const checks = [
    { label: "Saturday", passed: context.day === "Saturday" },
    { label: `Temperature ≥ ${minimumTemperature}°C`, passed: context.temperatureC >= minimumTemperature },
    { label: `Forecast ≥ ${minimumTemperature}°C`, passed: context.forecastC >= minimumTemperature },
    { label: "No blocking calendar events", passed: context.blockingEvents === 0 },
  ];
  return { checks, isOpen: checks.every((check) => check.passed), policy: { minimumTemperature } };
}

export function interpret(context) {
  if ((context.recentPosts || 0) >= 2) return {
    recommendation: "do_not_publish", reason: "Recent communication already covers this routine opening.", decisionClass: "silence_routine_event",
    observation: "The cart may open, but there is no distinct audience-facing change.", contextEvidence: ["recent_posts:2"],
    // The event (an opening) is verified; the judgement that it carries no fresh
    // meaning is an inference kept separate from the fact, per §2.
    interpretiveInference: "A routine opening after recent posts adds no new reason for the audience to hear from us.",
    organisationalRelevance: "Avoid adding noise to an afternoon already well served.", semanticDirection: "Do not create an artefact.",
    positiveFitCondition: null,
    rejectedFrames: ["mandatory_output"], avoid: ["repetition", "forced urgency"], principlesApplied: ["communication.silence_is_valid"],
    missingEvidence: [], unresolvedQuestions: [],
  };
  const alternative = (context.iteration || 1) > 1;
  return {
    recommendation: "develop_direction", reason: null, decisionClass: "audience_moment_extension",
    observation: alternative ? "People passing the quay can encounter a small, well-made pause without changing their plans." : "A good afternoon is already drawing people to the canal and the road.",
    contextEvidence: ["cart_opened", `day:${context.day.toLowerCase()}`, `temperature_c:${context.temperatureC}`, `forecast_c:${context.forecastC}`, `opening_hours:${context.opensAt}-${context.closesAt}`, ...context.products.map((product) => `product:${product}`)],
    // Verified facts (weather, time, opening) on one side; what those facts are taken
    // to mean about the audience on the other. The boundary must stay visible (§2).
    interpretiveInference: "These conditions are likely to place more people outdoors in an unhurried leisure context.",
    principlesApplied: ["audience.already_in_a_good_moment", "character.calm", "communication.no_forced_urgency", "character.precision"],
    organisationalRelevance: alternative ? "The cart rewards an existing route rather than asking people to make a special trip." : "The cart is a small, exact addition to an afternoon already underway.",
    semanticDirection: alternative ? "Treat the cart as a quiet discovery along an afternoon route, not a destination call." : "Present the cart as a calm, natural stop in an afternoon by the water.",
    // Mandatory minimal condition the artefact must satisfy to conform (§2, §5.2).
    positiveFitCondition: "The artefact must read as addressed to an afternoon already in progress, must not announce, summon or persuade, and must not name the weather as the reason.",
    rejectedFrames: ["heat_relief", "urgency", "generic_seasonal_framing"],
    avoid: ["generic summer language", "discount messaging", "forced category cliches", "vintage-retro styling"],
    missingEvidence: [], unresolvedQuestions: [],
  };
}

export function createDirections(context, interpretation) {
  if (interpretation.recommendation !== "develop_direction") return [];
  const flavourLine = context.products.join(" · ");
  return [
    { id: "canal-pause", concept: "The cart at the quay, with the water and passing afternoon held quietly in frame.", caption: `A small stop by the water.\n\nToday, ${context.opensAt}-${context.closesAt}\n${flavourLine}`, fit: "Makes the cart part of an afternoon already in progress.", nearestAvoid: "vintage-retro styling", riskNote: "Keep the canal incidental: no nostalgic filter or postcard treatment." },
    { id: "precision-scoop", concept: "A close crop of the cart and a precisely served scoop; the surroundings remain present but quiet.", caption: `Made for a good afternoon.\n\nOpen ${context.opensAt}-${context.closesAt}\n${flavourLine}`, fit: "Expresses workshop precision without explaining the name or becoming clinical.", nearestAvoid: "forced category cliches", riskNote: "Do not turn the scoop into a stock-photo hero image." },
    { id: "on-the-way", concept: "A wider image of the cart in its real setting, as something encountered while walking or cycling.", caption: `If you're passing the quay this afternoon.\n\n${context.opensAt}-${context.closesAt}\n${flavourLine}`, fit: "Addresses people already outdoors without summoning or pressuring them.", nearestAvoid: "generic summer language", riskNote: "Avoid weather descriptions, emojis and an urgency call-to-action." },
  ];
}

export function validateArtefact(context, direction) {
  const text = `${direction.concept} ${direction.caption}`.toLowerCase();
  const required = [context.opensAt, context.closesAt, ...context.products];
  const missing = required.filter((value) => !text.includes(value.toLowerCase()));
  const violations = forbiddenPatterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => `Forbidden framing: ${name}`);
  return { valid: missing.length === 0 && violations.length === 0, missing, violations };
}

function checksFor(interpretation, text) {
  const candidates = [
    ["heat_relief", /heat|beat the heat/i], ["urgency", /hurry|limited|don't miss|now!/i],
    ["generic_seasonal_framing", /sunny|summer/i], ["discount messaging", /discount|deal|sale/i],
    ["vintage-retro styling", /vintage|retro|postcard/i], ["forced category cliches", /best gelato|authentic italian/i],
    ["repetition", /as always|again today/i], ["mandatory_output", /must post/i],
  ];
  return [...new Set([...interpretation.rejectedFrames, ...interpretation.avoid])].map((boundary) => {
    const match = candidates.find(([name]) => name === boundary || boundary.includes(name));
    return { boundary, passed: !match?.[1].test(text) };
  });
}

// Ordinal severity for the negative-first, non-compensatory policy (§5.2).
// Values are deployment policy, not empirical probabilities.
export const SEVERITY_WEIGHT = { major: 30, moderate: 10, minor: 3 };
function severityOf(boundary) {
  if (/heat|urgency|hurry|limited|discount|deal|sale|invent|mandatory/i.test(boundary)) return "major";
  if (/vintage|retro|postcard|styling|cliche/i.test(boundary)) return "moderate";
  return "minor";
}

// A major severity (equivalently a `hard` boundary type) is a hard-boundary violation:
// non-compensatory and not cancellable by any positive-fit score. Kept in sync with
// server/policy.js#isHardBoundaryFinding; duplicated here so the reference engine has
// no dependency on the server module.
function isHardFinding(finding) {
  return finding.boundaryType === "hard" || finding.severity === "major";
}

// The negative-first, non-compensatory decision policy of §5.2:
//   1. any hard-boundary violation, or a failed mandatory positive fit → reject
//   2. an indeterminate finding never counts as a pass → human_disposition
//   3. soft violations use ordinal weights: ≥30 reject, 10-29 human_disposition, <10 warning
// `conforms` is true only for outcomes a machine may accept without a human (accept/warning);
// human_disposition and reject both require the human gate and so report conforms=false.
export function disposition(findings, positiveFit, positiveFitRequired) {
  const hardBlock = findings.some((finding) => finding.finding === "fail" && isHardFinding(finding)) || (positiveFitRequired && !positiveFit);
  const indeterminate = findings.some((finding) => finding.finding === "indeterminate");
  const softScore = findings
    .filter((finding) => finding.finding === "fail" && !isHardFinding(finding))
    .reduce((total, finding) => total + (SEVERITY_WEIGHT[finding.severity] || 0), 0);
  if (hardBlock) return { outcome: "reject", softScore };
  if (indeterminate) return { outcome: "human_disposition", softScore };
  if (softScore >= 30) return { outcome: "reject", softScore };
  if (softScore >= 10) return { outcome: "human_disposition", softScore };
  if (softScore > 0) return { outcome: "warning", softScore };
  return { outcome: "accept", softScore };
}

// Assemble a full, disposition-scored conformance report from a set of individual
// boundary checks. Both the deterministic reference engine and the live LLM path build
// their report through this function, so detector source differs but the decision policy
// (§5.2) is identical and applied server-side rather than trusted from the model.
export function buildConformance({ checks, positiveFit, interpretation, advisoryFit = false, detector = "deterministic" }) {
  const positiveFitRequired = Boolean(interpretation.positiveFitCondition);
  const positiveFitMet = !positiveFitRequired || positiveFit;
  const violations = checks.filter((check) => !check.passed).map((check) => `Violates approved boundary: ${check.boundary}`);
  const findings = checks.filter((check) => !check.passed).map((check) => ({
    criterionId: check.boundary, boundaryType: severityOf(check.boundary) === "major" ? "hard" : "soft",
    severity: severityOf(check.boundary), detector, finding: check.finding || "fail", disposition: "unresolved",
  }));
  if (positiveFitRequired && !positiveFitMet) findings.push({ criterionId: "positive_fit_condition", boundaryType: "hard", severity: "major", detector, finding: "fail", disposition: "unresolved" });
  const score = findings.reduce((total, finding) => total + (SEVERITY_WEIGHT[finding.severity] || 0), 0);
  const { outcome, softScore } = disposition(findings, positiveFitMet, positiveFitRequired);
  return {
    // Only accept/warning are machine-acceptable without a human; human_disposition and reject
    // require the human gate.
    conforms: outcome === "accept" || outcome === "warning",
    dispositionOutcome: outcome, softScore,
    violations, checks,
    positiveFit: positiveFitMet, positiveFitCondition: interpretation.positiveFitCondition || null,
    findings, score, advisoryFit,
    interpretationId: interpretation.decisionClass, detector,
  };
}

export function conformanceCheck(direction, interpretation) {
  const text = `${direction.concept} ${direction.caption} ${direction.fit || ""}`;
  const checks = checksFor(interpretation, text);
  // Mandatory minimal positive fit: the artefact must express the interpretation's
  // semantic direction. do_not_publish interpretations set no condition.
  const positiveFit = /afternoon|outdoors|water|quay|canal|passing/i.test(text);
  return buildConformance({ checks, positiveFit, interpretation, advisoryFit: /afternoon|outdoors|water/i.test(direction.fit || ""), detector: "deterministic" });
}
