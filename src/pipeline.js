export const PHILOSOPHY_VERSION = "1.0.0";
export const SKILL_VERSION = "0.1.0";

const forbiddenPatterns = [
  /beat the heat/i,
  /limited time/i,
  /hurry/i,
  /don't miss/i,
  /sunny day/i,
  /summer vibes/i,
];

export function assessOpeningDecision(context) {
  const checks = [
    { label: "Saturday", passed: context.day === "Saturday" },
    { label: "Favourable temperature", passed: context.temperatureC >= 18 },
    { label: "Favourable forecast", passed: context.forecastC >= 18 },
    { label: "No blocking calendar events", passed: context.blockingEvents === 0 },
  ];
  return { checks, isOpen: checks.every((check) => check.passed) };
}

export function interpret(context) {
  const opening = assessOpeningDecision(context);
  if (!opening.isOpen) {
    return {
      recommendation: "do_not_publish",
      reason: "The cart is not opening under the supplied operating conditions.",
      contextEvidence: opening.checks.filter((check) => !check.passed).map((check) => check.label),
      principlesApplied: ["communication.silence_is_a_decision"],
      semanticDirection: null,
      avoid: [],
    };
  }

  return {
    recommendation: "develop_direction",
    decisionClass: "audience_moment_extension",
    observation: "A good afternoon is already drawing people to the canal and the road.",
    contextEvidence: [
      "cart_opened",
      `day:${context.day.toLowerCase()}`,
      `temperature_c:${context.temperatureC}`,
      `forecast_c:${context.forecastC}`,
      `opening_hours:${context.opensAt}-${context.closesAt}`,
      ...context.products.map((product) => `product:${product}`),
    ],
    principlesApplied: [
      "audience.already_in_a_good_moment",
      "character.calm",
      "communication.no_forced_urgency",
      "character.precision",
    ],
    organisationalRelevance: "The cart is a small, exact addition to an afternoon already underway.",
    semanticDirection: "Present the cart as a calm, natural stop in an afternoon by the water.",
    rejectedFrames: ["heat_relief", "urgency", "generic_seasonal_framing"],
    avoid: ["generic summer language", "discount messaging", "forced category cliches", "vintage-retro styling"],
  };
}

export function createDirections(context, interpretation) {
  if (interpretation.recommendation !== "develop_direction") return [];
  const flavourLine = context.products.join(" · ");
  return [
    {
      id: "canal-pause",
      concept: "The cart at the quay, with the water and passing afternoon held quietly in frame.",
      caption: "A small stop by the water.\n\nToday, 13:30-18:00\n" + flavourLine,
      fit: "Makes the cart part of an afternoon already in progress.",
      nearestAvoid: "vintage-retro styling",
      riskNote: "Keep the canal incidental: no nostalgic filter or postcard treatment.",
    },
    {
      id: "precision-scoop",
      concept: "A close crop of the cart and a precisely served scoop; the surroundings remain present but quiet.",
      caption: "Made for a good afternoon.\n\nOpen 13:30-18:00\n" + flavourLine,
      fit: "Expresses workshop precision without explaining the name or becoming clinical.",
      nearestAvoid: "forced category cliches",
      riskNote: "Do not turn the scoop into a stock-photo hero image.",
    },
    {
      id: "on-the-way",
      concept: "A wider image of the cart in its real setting, as something encountered while walking or cycling.",
      caption: "If you're passing the quay this afternoon.\n\n13:30-18:00\n" + flavourLine,
      fit: "Addresses people already outdoors without summoning or pressuring them.",
      nearestAvoid: "generic summer language",
      riskNote: "Avoid weather descriptions, emojis and an urgency call-to-action.",
    },
  ];
}

export function validateArtefact(context, direction) {
  const text = direction.caption.toLowerCase();
  const required = [context.opensAt, context.closesAt, ...context.products];
  const missing = required.filter((value) => !text.includes(value.toLowerCase()));
  const violations = forbiddenPatterns
    .filter((pattern) => pattern.test(direction.caption))
    .map((pattern) => `Forbidden framing: ${pattern.source}`);
  return { valid: missing.length === 0 && violations.length === 0, missing, violations };
}

export function conformanceCheck(direction, interpretation) {
  const text = `${direction.concept} ${direction.caption}`;
  const violations = [];
  if (/sunny|summer|heat/i.test(text)) violations.push("Uses generic seasonal or heat framing.");
  if (/hurry|limited|don't miss|now!/i.test(text)) violations.push("Introduces unsupported urgency.");
  if (/discount|deal|sale/i.test(text)) violations.push("Introduces discount messaging.");
  return {
    conforms: violations.length === 0,
    violations,
    advisoryFit: direction.fit.includes("afternoon") || direction.fit.includes("outdoors"),
    interpretationId: interpretation.decisionClass,
  };
}
