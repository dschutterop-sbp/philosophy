const philosophy = `You are the Philosophy Interpreter for Il Tiratore, an artisan ice-cream cart. Its audience is cyclists, walkers and people in small boats who are already in a good moment outdoors, passing a canal in a small village. The cart adds a small pleasure; it does not summon, rescue or pressure people. Character: laboratory precision, high-grade ingredients, calm, space and trust. Never use loud Italian clichés, childishness, vintage-retro styling, stock-photo cheerfulness, heat-relief framing, discount messaging or forced urgency. The internal meaning of the name is precision; do not explain it. Facts are authoritative and must never be invented.`;

const interpretationSchema = { type: "object", additionalProperties: false, required: ["recommendation", "observation", "organisationalRelevance", "semanticDirection", "rejectedFrames", "avoid", "principlesApplied"], properties: {
  recommendation: { type: "string", enum: ["develop_direction", "do_not_publish"] }, observation: { type: "string" }, organisationalRelevance: { type: "string" }, semanticDirection: { type: "string" }, rejectedFrames: { type: "array", items: { type: "string" } }, avoid: { type: "array", items: { type: "string" } }, principlesApplied: { type: "array", items: { type: "string" } },
} };
const directionsSchema = { type: "object", additionalProperties: false, required: ["directions"], properties: { directions: { type: "array", minItems: 1, maxItems: 3, items: { type: "object", additionalProperties: false, required: ["id", "concept", "caption", "fit", "nearestAvoid", "riskNote"], properties: { id: { type: "string" }, concept: { type: "string" }, caption: { type: "string" }, fit: { type: "string" }, nearestAvoid: { type: "string" }, riskNote: { type: "string" } } } } } };
const conformanceSchema = { type: "object", additionalProperties: false, required: ["conforms", "violations", "advisoryFit"], properties: { conforms: { type: "boolean" }, violations: { type: "array", items: { type: "string" } }, advisoryFit: { type: "boolean" } } };

function outputText(response) {
  if (response.output_text) return response.output_text;
  const item = response.output?.flatMap((entry) => entry.content || []).find((content) => content.type === "output_text");
  if (!item?.text) throw new Error("OpenAI returned no structured text output.");
  return item.text;
}

async function structured(settings, name, schema, instructions, payload) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${settings.openaiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: settings.openaiModel, instructions: `${philosophy}\n\n${instructions}`, input: JSON.stringify(payload), text: { format: { type: "json_schema", name, strict: true, schema } } }),
  });
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status}): ${await response.text()}`);
  return JSON.parse(outputText(await response.json()));
}

export async function interpret(settings, context) {
  return structured(settings, "il_tiratore_interpretation", interpretationSchema, "Determine what this verified opening context means. Return do_not_publish when no distinctive audience-facing reason exists. Do not write a caption or invent a fact.", context);
}
export async function directions(settings, context, interpretation) {
  return structured(settings, "il_tiratore_directions", directionsSchema, "Create 1-3 Story directions within the approved interpretation. Captions must include only verified facts when they state facts. Keep copy concise. Do not introduce weather clichés, urgency or facts absent from the context.", { context, interpretation });
}
export async function conformance(settings, direction, interpretation) {
  return structured(settings, "il_tiratore_conformance", conformanceSchema, "Act as a negative-first semantic conformance checker. Identify only concrete violations of the approved interpretation, especially generic seasonal framing, heat relief, urgency, discounts, invented claims and prohibited styling. Positive fit is advisory.", { direction, interpretation });
}
