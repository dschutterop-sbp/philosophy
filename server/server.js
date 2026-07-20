import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { config } from "./config.js";
import { liveContext } from "./live-context.js";
import { conformance as liveConformance, directions as liveDirections, interpret as liveInterpret, philosophyVersion, strategyVersion, skillVersion } from "./openai.js";
import { assessOpeningDecision, conformanceCheck, createDirections, interpret as staticInterpret, validateArtefact } from "../src/pipeline.js";
import { issueApprovalToken, verifyApprovalToken } from "./approval.js";
import { AuditLog, DraftStore } from "./store.js";

const settings = config();
const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const indexFile = resolve(repoRoot, "index.html");
const srcDir = resolve(repoRoot, "src") + sep;
const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const store = new DraftStore();
const audit = new AuditLog(new URL("../data/audit.jsonl", import.meta.url));
await audit.init();
const versions = { philosophy: philosophyVersion, strategy: strategyVersion, skill: skillVersion, conformancePolicy: skillVersion, template: "story-1.0.0" };
const mediaHash = (dataUrl) => createHash("sha256").update(dataUrl || "reference-placeholder-v1").digest("hex");
const mime = (path) => contentTypes[Object.keys(contentTypes).find((ext) => path.endsWith(ext))] || "application/octet-stream";
async function body(request) { let raw = ""; for await (const chunk of request) { raw += chunk; if (raw.length > 7_000_000) throw new Error("Request body exceeds 7MB."); } return JSON.parse(raw || "{}"); }
function send(response, status, value) { response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); response.end(JSON.stringify(value)); }
function publicFile(pathname) { try { const target = resolve(repoRoot, decodeURIComponent(pathname)); return target === indexFile || target.startsWith(srcDir) ? target : null; } catch { return null; } }
function actor() { return settings.reviewer; } // Production: replace this adapter with authenticated identity and role claims.
function assertPublisher() { if (actor().role !== "publisher") throw new Error("Current reviewer is not authorised to approve publication."); }
function publicDraft(draft) { return { draftId: draft.id, mode: draft.mode, createdAt: draft.createdAt, state: draft.state, context: draft.context, media: { filename: draft.media.filename, hash: draft.media.hash }, opening: draft.opening, interpretation: draft.interpretation, directions: draft.directions, versions: draft.versions, actor: actor() }; }
function demoContext(input) {
  const observedAt = new Date().toISOString();
  return { date: observedAt.slice(0, 10), day: input.day, temperatureC: input.temperatureC, forecastC: input.forecastC, blockingEvents: input.blockingEvents, opensAt: input.opensAt, closesAt: input.closesAt, products: input.products, recentPosts: input.recentPosts || 0, provenance: { scenario: { source: "reviewer-supplied demo scenario", observedAt, fields: ["day", "temperatureC", "forecastC", "blockingEvents", "opensAt", "closesAt", "products", "recentPosts"] } } };
}
async function prepare(input) {
  const mode = input.mode === "live" ? "live" : "demo";
  if (mode === "live" && !settings.liveReady) throw new Error(`Live mode needs configuration: ${settings.missingLive.join(", ")}.`);
  const context = mode === "live" ? await liveContext(settings) : demoContext(input);
  const opening = assessOpeningDecision(context, settings.minimumTemperature);
  const interpretation = !opening.isOpen ? { recommendation: "do_not_publish", reason: "The operating gate is closed.", decisionClass: "operational_closure", observation: "Conditions do not support opening.", contextEvidence: [], organisationalRelevance: "No communication is warranted.", semanticDirection: "Do not create an artefact.", rejectedFrames: ["mandatory_output"], avoid: ["forced urgency"], principlesApplied: ["operations.opening_gate"] } : mode === "live" ? await liveInterpret(settings, context) : staticInterpret(context);
  const media = { filename: input.media?.filename || "reference-placeholder.svg", hash: mediaHash(input.media?.dataUrl), mimeType: input.media?.mimeType || "image/svg+xml" };
  const draft = store.create({ mode, createdAt: new Date().toISOString(), context, media, opening, interpretation, versions });
  await audit.append({ at: draft.createdAt, event: "draft_prepared", draftId: draft.id, mode, context, media: { ...media, dataUrl: undefined }, opening, interpretation, versions, actor: actor() });
  return publicDraft(draft);
}
async function generateDirections(draft) {
  if (draft.state !== "interpretation_approved") throw new Error("Approve the interpretation before creative direction runs.");
  const raw = draft.mode === "live" ? (await liveDirections(settings, draft.context, draft.interpretation)).directions : createDirections(draft.context, draft.interpretation);
  const directions = await Promise.all(raw.map(async (direction) => ({ ...direction, validation: validateArtefact(draft.context, direction), semanticConformance: draft.mode === "live" ? await liveConformance(settings, direction, draft.interpretation) : conformanceCheck(direction, draft.interpretation) })));
  const next = store.update(draft.id, { directions, state: "artefact_pending" });
  await audit.append({ at: new Date().toISOString(), event: "directions_generated", draftId: draft.id, directionIds: directions.map((d) => d.id), actor: actor() });
  return publicDraft(next);
}

createServer(async (request, response) => {
  try {
    if (request.url === "/api/health") return send(response, 200, { ok: true });
    if (request.method === "POST" && request.url === "/api/prepare") return send(response, 200, await prepare(await body(request)));
    const approveInterpretation = request.url?.match(/^\/api\/drafts\/([\w-]+)\/interpretation\/approve$/);
    if (request.method === "POST" && approveInterpretation) {
      assertPublisher(); const draft = store.get(approveInterpretation[1]); if (!draft) return send(response, 404, { error: "Unknown draft." });
      if (draft.state !== "interpretation_pending") return send(response, 409, { error: "Interpretation is no longer awaiting approval." });
      const { decision = "approve", reason = "" } = await body(request);
      if (draft.interpretation.recommendation === "do_not_publish" && decision !== "do_not_publish") return send(response, 400, { error: "This interpretation recommends silence and cannot authorise creative direction." });
      if (decision === "do_not_publish") { const next = store.update(draft.id, { state: "cancelled" }); await audit.append({ at: new Date().toISOString(), event: "interpretation_rejected", draftId: draft.id, reason, actor: actor() }); return send(response, 200, publicDraft(next)); }
      const next = store.update(draft.id, { state: "interpretation_approved", approvedInterpretation: { by: actor(), at: new Date().toISOString(), reason } });
      await audit.append({ at: new Date().toISOString(), event: "interpretation_approved", draftId: draft.id, reason, actor: actor() }); return send(response, 200, publicDraft(next));
    }
    const directions = request.url?.match(/^\/api\/drafts\/([\w-]+)\/directions$/);
    if (request.method === "POST" && directions) { const draft = store.get(directions[1]); if (!draft) return send(response, 404, { error: "Unknown draft." }); return send(response, 200, await generateDirections(draft)); }
    const approveArtefact = request.url?.match(/^\/api\/drafts\/([\w-]+)\/artefact\/approve$/);
    if (request.method === "POST" && approveArtefact) {
      assertPublisher(); const draft = store.get(approveArtefact[1]); if (!draft) return send(response, 404, { error: "Unknown draft." });
      if (draft.state !== "artefact_pending") return send(response, 409, { error: "Artefact is not awaiting approval." });
      const { directionId } = await body(request); const direction = draft.directions.find((item) => item.id === directionId);
      if (!direction) return send(response, 400, { error: "Selected direction is not part of this draft." });
      if (!direction.validation.valid || !direction.semanticConformance.conforms) return send(response, 400, { error: "Selected direction did not pass required checks." });
      const approvedAt = new Date().toISOString(); const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const approvalManifest = { draftId: draft.id, decision: "approve_for_publication", interpretationHash: mediaHash(JSON.stringify(draft.interpretation)), mediaHash: draft.media.hash, textHash: mediaHash(direction.caption), directionId: direction.id, accountId: "instagram-story-reference", scheduledTime: null, approver: actor(), approvedAt, expiry, versions: draft.versions };
      const signed = issueApprovalToken(approvalManifest, settings.approvalSigningKey); const next = store.update(draft.id, { state: "approved_for_publication", approval: { approvalManifest, ...signed } });
      await audit.append({ at: approvedAt, event: "artefact_approved", draftId: draft.id, directionId, approvalManifest, canonicalHash: signed.canonicalHash, actor: actor() });
      return send(response, 200, { ...publicDraft(next), approvalManifest, ...signed, usingDefaultSigningKey: settings.usingDefaultSigningKey });
    }
    const cancel = request.url?.match(/^\/api\/drafts\/([\w-]+)\/cancel$/);
    if (request.method === "POST" && cancel) { const draft = store.get(cancel[1]); if (!draft) return send(response, 404, { error: "Unknown draft." }); const { reason = "" } = await body(request); const next = store.update(draft.id, { state: "cancelled" }); await audit.append({ at: new Date().toISOString(), event: "draft_cancelled", draftId: draft.id, reason, actor: actor() }); return send(response, 200, publicDraft(next)); }
    if (request.method === "POST" && request.url === "/api/verify") { const { approvalManifest, approvalToken } = await body(request); if (!approvalManifest || !approvalToken) return send(response, 400, { error: "approvalManifest and approvalToken are required." }); return send(response, 200, verifyApprovalToken(approvalManifest, approvalToken, settings.approvalSigningKey)); }
    if (request.method === "GET") { const pathname = request.url === "/" ? "index.html" : request.url.slice(1).split("?")[0]; const target = publicFile(pathname); if (!target) return send(response, 404, { error: "Not found" }); try { const file = await readFile(target); response.writeHead(200, { "content-type": mime(pathname), "cache-control": "no-store" }); response.end(file); return; } catch (error) { if (error.code === "ENOENT") return send(response, 404, { error: "Not found" }); throw error; } }
    send(response, 404, { error: "Not found" });
  } catch (error) { send(response, 400, { error: error.message }); }
}).listen(process.env.PORT || 8080, () => console.log(`Story service listening on ${process.env.PORT || 8080}`));
