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
    organisationalRelevance: "Avoid adding noise to an afternoon already well served.", semanticDirection: "Do not create an artefact.",
    rejectedFrames: ["mandatory_output"], avoid: ["repetition", "forced urgency"], principlesApplied: ["communication.silence_is_valid"],
  };
  const alternative = (context.iteration || 1) > 1;
  return {
    recommendation: "develop_direction", reason: null, decisionClass: "audience_moment_extension",
    observation: alternative ? "People passing the quay can encounter a small, well-made pause without changing their plans." : "A good afternoon is already drawing people to the canal and the road.",
    contextEvidence: ["cart_opened", `day:${context.day.toLowerCase()}`, `temperature_c:${context.temperatureC}`, `forecast_c:${context.forecastC}`, `opening_hours:${context.opensAt}-${context.closesAt}`, ...context.products.map((product) => `product:${product}`)],
    principlesApplied: ["audience.already_in_a_good_moment", "character.calm", "communication.no_forced_urgency", "character.precision"],
    organisationalRelevance: alternative ? "The cart rewards an existing route rather than asking people to make a special trip." : "The cart is a small, exact addition to an afternoon already underway.",
    semanticDirection: alternative ? "Treat the cart as a quiet discovery along an afternoon route, not a destination call." : "Present the cart as a calm, natural stop in an afternoon by the water.",
    rejectedFrames: ["heat_relief", "urgency", "generic_seasonal_framing"],
    avoid: ["generic summer language", "discount messaging", "forced category cliches", "vintage-retro styling"],
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
    return { boundary, passed: !match || !match[1].test(text) };
  });
}

export function conformanceCheck(direction, interpretation) {
  const checks = checksFor(interpretation, `${direction.concept} ${direction.caption}`);
  const violations = checks.filter((check) => !check.passed).map((check) => `Violates approved boundary: ${check.boundary}`);
  return { conforms: violations.length === 0, violations, checks, advisoryFit: /afternoon|outdoors|water/i.test(direction.fit), interpretationId: interpretation.decisionClass };
}
