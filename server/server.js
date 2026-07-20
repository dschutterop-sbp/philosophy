import { createHash } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { config } from "./config.js";
import { liveContext } from "./live-context.js";
import { conformance as liveConformance, directions as liveDirections, interpret as liveInterpret } from "./openai.js";
import { assessOpeningDecision, conformanceCheck, createDirections, interpret as staticInterpret, validateArtefact } from "../src/pipeline.js";

const settings = config();
const root = new URL("../", import.meta.url);
const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const mime = (path) => contentTypes[Object.keys(contentTypes).find((ext) => path.endsWith(ext))] || "application/octet-stream";
async function body(request) { let raw = ""; for await (const chunk of request) raw += chunk; return JSON.parse(raw || "{}"); }
function send(response, status, value) { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(value)); }
async function audit(record) { await mkdir(new URL("../data", import.meta.url), { recursive: true }); await appendFile(new URL("../data/audit.jsonl", import.meta.url), `${JSON.stringify(record)}\n`); }
const closedInterpretation = (reason) => ({ recommendation: "do_not_publish", reason });

// Demo: the Philosophy layer runs locally against the supplied static data, no external calls.
async function prepareDemo({ day, temperatureC, forecastC, blockingEvents, opensAt, closesAt, products }) {
  const context = { date: new Date().toISOString().slice(0, 10), day, temperatureC, forecastC, blockingEvents, opensAt, closesAt, products };
  const opening = assessOpeningDecision(context);
  if (!opening.isOpen) return { context, opening, interpretation: closedInterpretation("The supplied static conditions do not support opening."), directions: [] };
  const interpretation = staticInterpret(context);
  const generated = createDirections(context, interpretation);
  const checked = generated.map((direction) => ({ ...direction, validation: validateArtefact(context, direction), semanticConformance: conformanceCheck(direction, interpretation) }));
  return { context, opening, interpretation, directions: checked };
}

// Live: verified real-world context is read, then Philosophy is applied agentically via the OpenAI Responses API.
async function prepareLive(supplied) {
  const context = await liveContext(settings, supplied);
  const opening = assessOpeningDecision(context);
  if (!opening.isOpen) return { context, opening, interpretation: closedInterpretation("The live operating conditions do not support opening."), directions: [] };
  const interpretation = await liveInterpret(settings, context);
  if (interpretation.recommendation === "do_not_publish") return { context, opening, interpretation, directions: [] };
  const generated = (await liveDirections(settings, context, interpretation)).directions;
  const checked = await Promise.all(generated.map(async (direction) => ({ ...direction, validation: validateArtefact(context, direction), semanticConformance: await liveConformance(settings, direction, interpretation) })));
  return { context, opening, interpretation, directions: checked };
}

createServer(async (request, response) => {
  try {
    if (request.url === "/api/health") return send(response, 200, { ok: true });
    if (request.method === "POST" && request.url === "/api/prepare") {
      const supplied = await body(request);
      const mode = supplied.mode === "live" ? "live" : "demo";
      if (mode === "live" && !settings.liveReady) return send(response, 400, { error: `Live mode needs configuration: ${settings.missingLive.join(", ")}. Use demo mode or complete .env.` });
      const result = mode === "live" ? await prepareLive(supplied) : await prepareDemo(supplied);
      const draftId = createHash("sha256").update(JSON.stringify(result)).digest("hex").slice(0, 16);
      await audit({ at: new Date().toISOString(), draftId, mode, ...result });
      return send(response, 200, { draftId, mode, ...result });
    }
    if (request.method === "GET") {
      const pathname = request.url === "/" ? "index.html" : request.url.slice(1);
      const path = new URL(`../${pathname}`, import.meta.url);
      const file = await import("node:fs/promises").then(({ readFile }) => readFile(path));
      response.writeHead(200, { "content-type": mime(pathname) }); response.end(file); return;
    }
    send(response, 404, { error: "Not found" });
  } catch (error) { send(response, 500, { error: error.message }); }
}).listen(process.env.PORT || 8080, () => console.log(`Story service listening on ${process.env.PORT || 8080}`));
