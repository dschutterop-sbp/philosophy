import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { buildConformance } from "../src/pipeline.js";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

// The Philosophy and each Skill are kept as separate prompt files under ./prompts
// so they can be reviewed and edited independently of the request/response plumbing.
// Each file opens with a `version:` frontmatter block; it is parsed out here and
// never forwarded to the model, so version tracking cannot influence agent behaviour.
const promptsDir = new URL("./prompts/", import.meta.url);

function parsePrompt(raw, file) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${file} is missing its version frontmatter.`);
  const version = match[1].match(/^version:\s*(\S+)\s*$/m)?.[1];
  if (!version) throw new Error(`${file} frontmatter has no version.`);
  return { version, body: match[2].trim() };
}

async function readPrompt(file) {
  return parsePrompt(await readFile(new URL(file, promptsDir), "utf8"), file);
}

const [philosophyPrompt, strategyPrompt, skillInterpretPrompt, skillDirectionsPrompt, skillConformancePrompt] = await Promise.all([
  readPrompt("philosophy.md"),
  readPrompt("strategy.md"),
  readPrompt("skill-interpret.md"),
  readPrompt("skill-directions.md"),
  readPrompt("skill-conformance.md"),
]);

const skillVersions = new Set([skillInterpretPrompt.version, skillDirectionsPrompt.version, skillConformancePrompt.version]);
if (skillVersions.size > 1) throw new Error(`Skill prompt files disagree on version (${[...skillVersions].join(", ")}); bump them together.`);

export const philosophyVersion = philosophyPrompt.version;
export const strategyVersion = strategyPrompt.version;
export const skillVersion = skillInterpretPrompt.version;
export const interpretationSchemaVersion = "1.0.0";

// Content hashes of the governed documents, so an approval bundle can bind the exact
// philosophy/strategy/skill text that produced a decision, not merely a version label (§5.2.1).
export const philosophyHash = sha256(philosophyPrompt.body);
export const strategyHash = sha256(strategyPrompt.body);
export const skillHash = sha256([skillInterpretPrompt.body, skillDirectionsPrompt.body, skillConformancePrompt.body].join("\n---\n"));

const philosophy = philosophyPrompt.body;
const strategy = strategyPrompt.body;
const skillInterpret = skillInterpretPrompt.body;
const skillDirections = skillDirectionsPrompt.body;
const skillConformance = skillConformancePrompt.body;

const interpretationSchema = { type: "object", additionalProperties: false, required: ["recommendation", "reason", "decisionClass", "observation", "contextEvidence", "interpretiveInference", "organisationalRelevance", "semanticDirection", "positiveFitCondition", "rejectedFrames", "avoid", "principlesApplied", "missingEvidence", "unresolvedQuestions"], properties: {
  recommendation: { type: "string", enum: ["develop_direction", "do_not_publish", "request_more_context", "defer", "escalate"] }, reason: { type: ["string", "null"] }, decisionClass: { type: "string" }, observation: { type: "string" }, contextEvidence: { type: "array", items: { type: "string" } }, interpretiveInference: { type: "string" }, organisationalRelevance: { type: "string" }, semanticDirection: { type: "string" }, positiveFitCondition: { type: ["string", "null"] }, rejectedFrames: { type: "array", items: { type: "string" } }, avoid: { type: "array", items: { type: "string" } }, principlesApplied: { type: "array", items: { type: "string" } }, missingEvidence: { type: "array", items: { type: "string" } }, unresolvedQuestions: { type: "array", items: { type: "string" } },
} };
const directionsSchema = { type: "object", additionalProperties: false, required: ["directions"], properties: { directions: { type: "array", minItems: 1, maxItems: 3, items: { type: "object", additionalProperties: false, required: ["id", "concept", "caption", "fit", "nearestAvoid", "riskNote"], properties: { id: { type: "string" }, concept: { type: "string" }, caption: { type: "string" }, fit: { type: "string" }, nearestAvoid: { type: "string" }, riskNote: { type: "string" } } } } } };
// The model reports per-boundary findings (pass/fail/indeterminate) and whether the
// mandatory positive fit is met. The disposition and `conforms` verdict are computed
// server-side from these via buildConformance, so the model does not self-certify (§5.2, §7.2).
const conformanceSchema = { type: "object", additionalProperties: false, required: ["checks", "positiveFit", "advisoryFit"], properties: { checks: { type: "array", items: { type: "object", additionalProperties: false, required: ["boundary", "passed", "finding"], properties: { boundary: { type: "string" }, passed: { type: "boolean" }, finding: { type: "string", enum: ["pass", "fail", "indeterminate"] } } } }, positiveFit: { type: "boolean" }, advisoryFit: { type: "boolean" } } };

function outputText(response) {
  if (response.output_text) return response.output_text;
  const item = response.output?.flatMap((entry) => entry.content || []).find((content) => content.type === "output_text");
  if (!item?.text) throw new Error("OpenAI returned no structured text output.");
  return item.text;
}

async function structured(settings, name, schema, instructions, payload, model = settings.openaiModel) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${settings.openaiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model, instructions: `${philosophy}\n\n${strategy}\n\n${instructions}`, input: JSON.stringify(payload), text: { format: { type: "json_schema", name, strict: true, schema } } }),
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
  // Run the conformance judge (optionally on a decorrelated model, §7.2) then apply the
  // non-compensatory disposition policy server-side rather than trusting the model's verdict.
  const raw = await structured(settings, "il_tiratore_conformance", conformanceSchema, skillConformance, { direction, interpretation }, settings.conformanceModel);
  const checks = raw.checks.map((check) => ({ boundary: check.boundary, passed: check.finding === "pass", finding: check.finding }));
  return buildConformance({ checks, positiveFit: raw.positiveFit, interpretation, advisoryFit: raw.advisoryFit, detector: "llm_conformance" });
}
