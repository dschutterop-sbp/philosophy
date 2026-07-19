import { createHash } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { config } from "./config.js";
import { liveContext } from "./live-context.js";
import { conformance, directions, interpret } from "./openai.js";
import { assessOpeningDecision, validateArtefact } from "../src/pipeline.js";

const settings = config();
const root = new URL("../", import.meta.url);
const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const mime = (path) => contentTypes[Object.keys(contentTypes).find((ext) => path.endsWith(ext))] || "application/octet-stream";
async function body(request) { let raw = ""; for await (const chunk of request) raw += chunk; return JSON.parse(raw || "{}"); }
function send(response, status, value) { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(value)); }
async function audit(record) { await mkdir(new URL("../data", import.meta.url), { recursive: true }); await appendFile(new URL("../data/audit.jsonl", import.meta.url), `${JSON.stringify(record)}\n`); }

createServer(async (request, response) => {
  try {
    if (request.url === "/api/health") return send(response, 200, { ok: true });
    if (request.method === "POST" && request.url === "/api/prepare") {
      const supplied = await body(request);
      const context = await liveContext(settings, supplied);
      const opening = assessOpeningDecision(context);
      if (!opening.isOpen) return send(response, 200, { context, opening, interpretation: { recommendation: "do_not_publish", reason: "The live operating conditions do not support opening." }, directions: [] });
      const interpretation = await interpret(settings, context);
      if (interpretation.recommendation === "do_not_publish") return send(response, 200, { context, opening, interpretation, directions: [] });
      const generated = (await directions(settings, context, interpretation)).directions;
      const checked = await Promise.all(generated.map(async (direction) => ({ ...direction, validation: validateArtefact(context, direction), semanticConformance: await conformance(settings, direction, interpretation) })));
      const draftId = createHash("sha256").update(JSON.stringify({ context, interpretation, checked })).digest("hex").slice(0, 16);
      await audit({ at: new Date().toISOString(), draftId, context, opening, interpretation, directions: checked });
      return send(response, 200, { draftId, context, opening, interpretation, directions: checked });
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
