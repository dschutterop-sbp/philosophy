import { readFile } from "node:fs/promises";

// The Philosophy and each Skill are kept as separate prompt files under ./prompts
// so they can be reviewed and edited independently of the request/response plumbing.
const promptsDir = new URL("./prompts/", import.meta.url);
const readPrompt = async (file) => (await readFile(new URL(file, promptsDir), "utf8")).trim();
const [philosophy, skillInterpret, skillDirections, skillConformance] = await Promise.all([
  readPrompt("philosophy.md"),
  readPrompt("skill-interpret.md"),
  readPrompt("skill-directions.md"),
  readPrompt("skill-conformance.md"),
]);

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
  return structured(settings, "il_tiratore_interpretation", interpretationSchema, skillInterpret, context);
}
export async function directions(settings, context, interpretation) {
  return structured(settings, "il_tiratore_directions", directionsSchema, skillDirections, { context, interpretation });
}
export async function conformance(settings, direction, interpretation) {
  return structured(settings, "il_tiratore_conformance", conformanceSchema, skillConformance, { direction, interpretation });
}
