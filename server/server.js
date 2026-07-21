import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, sep } from "node:path";
import { config } from "./config.js";
import { liveContext } from "./live-context.js";
import { conformance as liveConformance, directions as liveDirections, interpret as liveInterpret, philosophyVersion, strategyVersion, skillVersion, interpretationSchemaVersion, philosophyHash, strategyHash, skillHash } from "./openai.js";
import { assessOpeningDecision, buildConformance, conformanceCheck, createDirections, disposition, interpret as staticInterpret, validateArtefact } from "../src/pipeline.js";
import { canonicalHash, issueApprovalToken, verifyApprovalToken } from "./approval.js";
import { AuditLog, DraftStore } from "./store.js";
import { decisionClassKeys, isEnumeratedClass, taxonomyHash, taxonomyVersion } from "./taxonomy.js";
import { IntentStore, PublicationAdapter, SubmissionError } from "./adapter.js";
import { FAILURE_CODES, PipelineFailure, humanOnlyFallbackRecord, typedFailure } from "./failures.js";
import { redactAuditEvent, toProvDocument } from "./provenance.js";
import { humanMayOverride } from "./policy.js";

const settings = config();
const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const indexFile = resolve(repoRoot, "index.html");
const srcDir = resolve(repoRoot, "src") + sep;
const paperDir = resolve(repoRoot, "paper") + sep;
const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".md": "text/markdown; charset=utf-8" };
const store = new DraftStore();
const audit = new AuditLog(new URL("../data/audit.jsonl", import.meta.url));
await audit.init();
const templateVersion = "story-1.0.0";
const versions = { philosophy: philosophyVersion, strategy: strategyVersion, skill: skillVersion, conformancePolicy: skillVersion, template: templateVersion, interpretationSchema: interpretationSchemaVersion, taxonomy: taxonomyVersion };
// Content hashes of the governed documents bound into every approval bundle (§5.2.1).
// The template has no separate source file yet, so its version string stands in.
const governedHashes = { philosophy: philosophyHash, strategy: strategyHash, skill: skillHash, template: canonicalHash({ template: templateVersion }), taxonomy: taxonomyHash };
// Publication adapter and its append-only intent store (§5.2.2). Held in memory in the
// reference; production needs a durable, access-controlled append-only sink.
const intents = new IntentStore();
const adapter = new PublicationAdapter(intents, { destination: settings.destination, accountId: settings.accountId, adapterVersion: settings.adapterVersion });
const contentHash = (value) => canonicalHash({ value: value || "reference-placeholder-v1" });
// Component-attached regression reason codes (§7). Only a label attached to the relevant
// component becomes authoritative regression evidence for that component.
const REASON_CODES = ["CONTEXT_INVALID", "INTERPRETATION_INVALID", "DIRECTION_MISALIGNED", "EXECUTION_FAILURE", "DETERMINISTIC_VALIDATION_FAILURE", "CONFORMANCE_FALSE_POSITIVE", "CONFORMANCE_FALSE_NEGATIVE", "APPROVAL_CONTEXT_CHANGED"];
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const mime = (path) => contentTypes[Object.keys(contentTypes).find((ext) => path.endsWith(ext))] || "application/octet-stream";
async function body(request) { let raw = ""; for await (const chunk of request) { raw += chunk; if (raw.length > 7_000_000) throw new Error("Request body exceeds 7MB."); } return JSON.parse(raw || "{}"); }
function send(response, status, value) { response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); response.end(JSON.stringify(value)); }
function publicFile(pathname) { try { const target = resolve(repoRoot, decodeURIComponent(pathname)); return target === indexFile || target.startsWith(srcDir) || target.startsWith(paperDir) ? target : null; } catch { return null; } }
function actor() { return settings.reviewer; } // Production: replace this adapter with authenticated identity and role claims.
function assertPublisher() { if (actor().role !== "publisher") throw new HttpError(403, "Current reviewer is not authorised to approve publication."); }
function publicDraft(draft) { return { draftId: draft.id, mode: draft.mode, createdAt: draft.createdAt, state: draft.state, context: draft.context, media: { filename: draft.media.filename, hash: draft.media.hash }, opening: draft.opening, interpretation: draft.interpretation, interpretationAttempt: draft.interpretationAttempt || 1, directions: draft.directions, versions: draft.versions, actor: actor() }; }
// Guard against under-enumeration (§2, §5.4, §9): a decision_class the organisation never
// enumerated is not silently forced into the nearest class. It is flagged and escalated so
// a human owner extends the taxonomy through the governed review path rather than the model
// quietly narrowing what the system can distinguish.
function applyTaxonomyGate(interpretation) {
  if (isEnumeratedClass(interpretation.decisionClass)) return { ...interpretation, taxonomyStatus: "enumerated" };
  return {
    ...interpretation,
    taxonomyStatus: "under_enumeration",
    recommendation: "escalate",
    reason: `decision_class '${interpretation.decisionClass}' is not in the governed taxonomy; escalated for taxonomy review.`,
    positiveFitCondition: null,
  };
}
// A suppressed / non-generative interpretation is persisted like any other (§6) and a
// deterministic proportion is flagged for periodic review, so silence is an auditable
// signal rather than an invisible absence.
function isNonGenerative(interpretation) { return interpretation.recommendation !== "develop_direction"; }
function demoContext(input) {
  const observedAt = new Date().toISOString();
  return { date: observedAt.slice(0, 10), day: input.day, temperatureC: input.temperatureC, forecastC: input.forecastC, blockingEvents: input.blockingEvents, opensAt: input.opensAt, closesAt: input.closesAt, products: input.products, recentPosts: input.recentPosts || 0, provenance: { scenario: { source: "reviewer-supplied demo scenario", observedAt, fields: ["day", "temperatureC", "forecastC", "blockingEvents", "opensAt", "closesAt", "products", "recentPosts"] } } };
}
async function prepare(input) {
  const mode = input.mode === "live" ? "live" : "demo";
  if (mode === "live" && !settings.liveReady) throw new Error(`Live mode needs configuration: ${settings.missingLive.join(", ")}.`);
  const context = mode === "live" ? await liveContext(settings) : demoContext(input);
  const opening = assessOpeningDecision(context, settings.minimumTemperature);
  let interpretation;
  if (!opening.isOpen) {
    interpretation = { recommendation: "do_not_publish", reason: "The operating gate is closed.", decisionClass: "operational_closure", observation: "Conditions do not support opening.", contextEvidence: [], interpretiveInference: "A closed operating gate leaves nothing for an audience to act on.", organisationalRelevance: "No communication is warranted.", semanticDirection: "Do not create an artefact.", positiveFitCondition: null, rejectedFrames: ["mandatory_output"], avoid: ["forced urgency"], principlesApplied: ["operations.opening_gate"], missingEvidence: [], unresolvedQuestions: [] };
  } else if (mode === "live") {
    interpretation = await liveInterpret(settings, context);
  } else {
    interpretation = staticInterpret(context);
  }
  interpretation = applyTaxonomyGate(interpretation);
  const media = { filename: input.media?.filename || "reference-placeholder.svg", hash: contentHash(input.media?.dataUrl), mimeType: input.media?.mimeType || "image/svg+xml" };
  const draft = store.create({ mode, createdAt: new Date().toISOString(), context, media, opening, interpretation, interpretationAttempt: 1, versions });
  // Silence signal (§6): flag non-generative outcomes, and deterministically sample every
  // Nth of them for periodic human review so an over-silencing Philosophy stays visible.
  const nonGenerative = isNonGenerative(interpretation);
  const priorNonGenerative = audit.all().filter((event) => event.event === "draft_prepared" && event.nonGenerative).length;
  const flaggedForReview = nonGenerative && settings.silenceReviewSampleEvery > 0 && priorNonGenerative % settings.silenceReviewSampleEvery === 0;
  await audit.append({ at: draft.createdAt, event: "draft_prepared", draftId: draft.id, mode, context, media: { ...media, dataUrl: undefined }, opening, interpretation, versions, nonGenerative, flaggedForReview, actor: actor() });
  return publicDraft(draft);
}
async function iterateInterpretation(draft) {
  if (draft.state !== "interpretation_pending") throw new Error("Only a pending interpretation can be iterated.");
  // Live mode receives a fresh bounded model call. The deterministic reference engine
  // records a fresh attempt too, so the review/audit state machine is identical.
  const interpretation = draft.mode === "live" ? await liveInterpret(settings, { ...draft.context, iteration: (draft.interpretationAttempt || 1) + 1 }) : staticInterpret({ ...draft.context, iteration: (draft.interpretationAttempt || 1) + 1 });
  const next = store.update(draft.id, { interpretation, interpretationAttempt: (draft.interpretationAttempt || 1) + 1 }, draft.revision);
  if (!next) throw new HttpError(409, "Interpretation changed while this iteration was running; review the latest attempt.");
  await audit.append({ at: new Date().toISOString(), event: "interpretation_iterated", draftId: draft.id, attempt: next.interpretationAttempt, interpretation, actor: actor() });
  return publicDraft(next);
}
async function generateDirections(draft) {
  if (draft.state !== "interpretation_approved") throw new Error("Approve the interpretation before creative direction runs.");
  const raw = draft.mode === "live" ? (await liveDirections(settings, draft.context, draft.interpretation)).directions : createDirections(draft.context, draft.interpretation);
  const directions = await Promise.all(raw.map(async (direction) => ({ ...direction, validation: validateArtefact(draft.context, direction), semanticConformance: draft.mode === "live" ? await liveConformance(settings, direction, draft.interpretation) : conformanceCheck(direction, draft.interpretation) })));
  const next = store.update(draft.id, { directions, state: "artefact_pending" }, draft.revision);
  if (!next) throw new HttpError(409, "Draft changed while directions were being generated; review the latest state.");
  await audit.append({ at: new Date().toISOString(), event: "directions_generated", draftId: draft.id, directionIds: directions.map((d) => d.id), actor: actor() });
  return publicDraft(next);
}

async function handlePrepare(request, response) {
  return send(response, 200, await prepare(await body(request)));
}

async function handleApproveInterpretation(request, response, id) {
  assertPublisher();
  const draft = store.get(id);
  if (!draft) return send(response, 404, { error: "Unknown draft." });
  if (draft.state !== "interpretation_pending") return send(response, 409, { error: "Interpretation is no longer awaiting approval." });
  const { decision = "approve", reason = "", reasonCodes = [] } = await body(request);
  // Reason codes are the authoritative, component-attached regression labels of §7.
  const labels = Array.isArray(reasonCodes) ? reasonCodes.filter((code) => REASON_CODES.includes(code)) : [];
  // Only a develop_direction recommendation can be approved to continue. do_not_publish,
  // request_more_context, defer and escalate are all non-authorising outcomes (§2, §5.7):
  // the reviewer may record them, but they cannot open the creative-direction stage.
  if (draft.interpretation.recommendation !== "develop_direction" && decision === "approve") return send(response, 400, { error: `This interpretation recommends '${draft.interpretation.recommendation}' and cannot authorise creative direction.` });
  if (decision === "do_not_publish") {
    const cancelled = store.update(draft.id, { state: "cancelled" }, draft.revision);
    await audit.append({ at: new Date().toISOString(), event: "interpretation_rejected", draftId: draft.id, reason, reasonCodes: labels, component: "interpretation", actor: actor() });
    return send(response, 200, publicDraft(cancelled));
  }
  const next = store.update(draft.id, { state: "interpretation_approved", approvedInterpretation: { by: actor(), at: new Date().toISOString(), reason, reasonCodes: labels } }, draft.revision);
  await audit.append({ at: new Date().toISOString(), event: "interpretation_approved", draftId: draft.id, reason, reasonCodes: labels, actor: actor() });
  return send(response, 200, publicDraft(next));
}

async function handleIterateInterpretation(request, response, id) {
  const draft = store.get(id);
  if (!draft) return send(response, 404, { error: "Unknown draft." });
  return send(response, 200, await iterateInterpretation(draft));
}

async function handleDirections(request, response, id) {
  const draft = store.get(id);
  if (!draft) return send(response, 404, { error: "Unknown draft." });
  return send(response, 200, await generateDirections(draft));
}

async function handleApproveArtefact(request, response, id) {
  assertPublisher();
  const draft = store.get(id);
  if (!draft) return send(response, 404, { error: "Unknown draft." });
  if (draft.state !== "artefact_pending") return send(response, 409, { error: "Artefact is not awaiting approval." });
  const { directionId } = await body(request);
  const direction = draft.directions.find((item) => item.id === directionId);
  if (!direction) return send(response, 400, { error: "Selected direction is not part of this draft." });
  if (!direction.validation.valid || !direction.semanticConformance.conforms) return send(response, 400, { error: "Selected direction did not pass required checks." });
  const approvedAt = new Date().toISOString();
  const scheduledTime = null;
  const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  // The bundle binds every reviewed entity (§5.2.1): context snapshot, each governed
  // document, the interpretation and its review, the selected direction and both check
  // reports, alongside media, text, destination, versions and a single submission intent.
  const { validation, semanticConformance, ...directionCore } = direction;
  const publicationIntentId = `pubintent_${draft.id}_${direction.id}`;
  const approvalManifest = {
    approvalSchemaVersion: "1.0.0", draftId: draft.id, decision: "approve_for_publication",
    contextSnapshotHash: canonicalHash(draft.context),
    philosophyHash: governedHashes.philosophy, strategyHash: governedHashes.strategy, skillHash: governedHashes.skill, templateHash: governedHashes.template,
    interpretationHash: canonicalHash(draft.interpretation),
    interpretationReviewHash: canonicalHash(draft.approvedInterpretation),
    directionHash: canonicalHash(directionCore),
    validationReportHash: canonicalHash(validation),
    conformanceReportHash: canonicalHash(semanticConformance),
    mediaHash: draft.media.hash, textHash: contentHash(direction.caption), artefactPayloadHash: canonicalHash({ media: draft.media.hash, text: direction.caption, direction: directionCore }),
    directionId: direction.id, accountId: settings.accountId, destination: settings.destination,
    publicationIntentId, idempotencyKey: `instagram:${publicationIntentId}`,
    submissionPolicy: { mode: "single_intent", maxAttempts: 1 }, publicationAdapterVersion: "reference-review-only:1.0.0",
    scheduledTime, approver: actor(), approverRole: actor().role, approvedAt, expiry, versions: draft.versions,
  };
  // Enforce the time-ordering invariant: latest bound input ≤ approved ≤ scheduled ≤ expiry (§5.2.1).
  const latestBoundInput = [draft.createdAt, draft.approvedInterpretation?.at].filter(Boolean).map((value) => Date.parse(value));
  const ordered = [...latestBoundInput, Date.parse(approvedAt), ...(scheduledTime ? [Date.parse(scheduledTime)] : []), Date.parse(expiry)];
  if (ordered.some((value, index) => index > 0 && value < ordered[index - 1])) throw typedFailure("TIME_ORDERING_INVALID");
  const submittedPayload = { media: draft.media.hash, text: direction.caption, direction: directionCore };
  const signed = issueApprovalToken(approvalManifest, settings.approvalSigningKey);
  const next = store.update(draft.id, { state: "approved_for_publication", approval: { approvalManifest, submittedPayload, ...signed } }, draft.revision);
  if (!next) return send(response, 409, { error: "Draft changed while approval was being created; review the latest state." });
  await audit.append({ at: approvedAt, event: "artefact_approved", draftId: draft.id, directionId, approvalManifest, canonicalHash: signed.canonicalHash, actor: actor() });
  return send(response, 200, { ...publicDraft(next), approvalManifest, ...signed, usingDefaultSigningKey: settings.usingDefaultSigningKey });
}

async function handleCancel(request, response, id) {
  const draft = store.get(id);
  if (!draft) return send(response, 404, { error: "Unknown draft." });
  const { reason = "" } = await body(request);
  const next = store.update(draft.id, { state: "cancelled" }, draft.revision);
  await audit.append({ at: new Date().toISOString(), event: "draft_cancelled", draftId: draft.id, reason, actor: actor() });
  return send(response, 200, publicDraft(next));
}

async function handleVerify(request, response) {
  const { approvalManifest, approvalToken } = await body(request);
  if (!approvalManifest || !approvalToken) return send(response, 400, { error: "approvalManifest and approvalToken are required." });
  return send(response, 200, verifyApprovalToken(approvalManifest, approvalToken, settings.approvalSigningKey));
}

// Publication Adapter submission (§5.2.2). Consumes the stored approval token for exactly
// one declared intent and fails closed on any verification, ordering or replay failure.
async function handleSubmit(request, response, id) {
  const draft = store.get(id);
  if (!draft) return send(response, 404, { error: "Unknown draft." });
  if (draft.state !== "approved_for_publication" || !draft.approval) throw typedFailure("APPROVAL_SIGNATURE_INVALID_OR_EXPIRED", "no approved bundle to submit", 409);
  try {
    const result = adapter.submit({ approvalManifest: draft.approval.approvalManifest, approvalToken: draft.approval.approvalToken, signingKey: settings.approvalSigningKey, now: Date.now(), submittedPayload: draft.approval.submittedPayload });
    const next = store.update(draft.id, { state: "submitted", submission: result }, draft.revision);
    await audit.append({ at: result.submittedState.submissionTime, event: "artefact_submitted", draftId: draft.id, submission: result, intentState: intents.state(draft.approval.approvalManifest.idempotencyKey), actor: actor() });
    return send(response, 200, { ...publicDraft(next), submission: result });
  } catch (error) {
    if (error instanceof SubmissionError) {
      await audit.append({ at: new Date().toISOString(), event: "submission_failed", draftId: draft.id, code: error.code, reason: error.message, actor: actor() });
      throw typedFailure(error.code === "intent_replayed" ? "PLATFORM_REJECTED_OR_AMBIGUOUS" : "DESTINATION_OR_ADAPTER_MISMATCH", error.message, 409);
    }
    throw error;
  }
}

// Human disposition of a SOFT conformance finding (§5.2). Hard boundaries cannot be
// overridden by a prompt-level action; they require a governance action. A dismissal
// records reason and role and produces a NEW conformance report, so the previous approval
// state cannot be reused.
async function handleConformanceOverride(request, response, id) {
  assertPublisher();
  const draft = store.get(id);
  if (!draft) return send(response, 404, { error: "Unknown draft." });
  if (draft.state !== "artefact_pending") return send(response, 409, { error: "Directions are not awaiting disposition." });
  const { directionId, criterionId, reason = "" } = await body(request);
  const direction = draft.directions.find((item) => item.id === directionId);
  if (!direction) return send(response, 400, { error: "Selected direction is not part of this draft." });
  const finding = (direction.semanticConformance.findings || []).find((item) => item.criterionId === criterionId);
  if (!finding) return send(response, 400, { error: "No such finding on this direction." });
  if (!humanMayOverride(finding)) return send(response, 403, { error: "A hard-boundary finding cannot be dismissed by a reviewer; it requires a governance action." });
  if (!reason) return send(response, 400, { error: "A dismissal must record a reason." });
  // Rebuild the report with the dismissed criterion treated as passing.
  const checks = direction.semanticConformance.checks.map((check) => (check.boundary === criterionId ? { ...check, passed: true, finding: "pass" } : check));
  const rebuilt = buildConformance({ checks, positiveFit: direction.semanticConformance.positiveFit, interpretation: draft.interpretation, advisoryFit: direction.semanticConformance.advisoryFit, detector: direction.semanticConformance.detector });
  rebuilt.override = { criterionId, reason, by: actor(), at: new Date().toISOString() };
  const directions = draft.directions.map((item) => (item.id === directionId ? { ...item, semanticConformance: rebuilt } : item));
  const next = store.update(draft.id, { directions }, draft.revision);
  if (!next) return send(response, 409, { error: "Draft changed while the override was recorded; review the latest state." });
  await audit.append({ at: rebuilt.override.at, event: "conformance_override", draftId: draft.id, directionId, criterionId, reason, component: "conformance", actor: actor() });
  return send(response, 200, publicDraft(next));
}

// Governed human-only fallback operating mode (§5.7): not an implicit bypass.
async function handleFallback(request, response, id) {
  assertPublisher();
  const draft = store.get(id);
  if (!draft) return send(response, 404, { error: "Unknown draft." });
  const { unavailableControls, reason } = await body(request);
  const record = humanOnlyFallbackRecord({ unavailableControls, responsibleHuman: actor(), reason });
  await audit.append({ at: new Date().toISOString(), event: "human_only_fallback_entered", draftId: draft.id, fallback: record, actor: actor() });
  return send(response, 200, { draftId: draft.id, fallback: record });
}

// Silence as an auditable signal (§6): rate, reasons and the sample flagged for review.
async function handleSilenceMetrics(request, response) {
  const prepared = audit.all().filter((event) => event.event === "draft_prepared");
  const byRecommendation = {};
  for (const event of prepared) { const key = event.interpretation?.recommendation || "unknown"; byRecommendation[key] = (byRecommendation[key] || 0) + 1; }
  const nonGenerative = prepared.filter((event) => event.nonGenerative);
  return send(response, 200, {
    totalPrepared: prepared.length,
    nonGenerative: nonGenerative.length,
    silenceRate: prepared.length ? nonGenerative.length / prepared.length : 0,
    byRecommendation,
    flaggedForReview: prepared.filter((event) => event.flaggedForReview).map((event) => ({ draftId: event.draftId, recommendation: event.interpretation?.recommendation, reason: event.interpretation?.reason })),
  });
}

// PROV-DM profile export (§4).
async function handleProvenance(request, response) {
  return send(response, 200, toProvDocument(audit.all()));
}

// Redacted audit export (§7.2): access level via ?level=full|investigator|operational.
async function handleAuditExport(request, response, level) {
  const accessLevel = ["full", "investigator", "operational"].includes(level) ? level : "operational";
  return send(response, 200, { accessLevel, events: audit.all().map((event) => redactAuditEvent(event, accessLevel)) });
}

// Deployment metadata: versions, governed vocabularies and the frozen spec identifiers (§7.1).
async function handleMeta(request, response) {
  return send(response, 200, { versions, decisionClasses: decisionClassKeys, reasonCodes: REASON_CODES, failureCodes: Object.keys(FAILURE_CODES) });
}

async function handleStatic(request, response) {
  const pathname = request.url === "/" ? "index.html" : request.url.slice(1).split("?")[0];
  const target = publicFile(pathname);
  if (!target) return send(response, 404, { error: "Not found" });
  try {
    const file = await readFile(target);
    response.writeHead(200, { "content-type": mime(pathname), "cache-control": "no-store" });
    response.end(file);
  } catch (error) {
    if (error.code === "ENOENT") return send(response, 404, { error: "Not found" });
    throw error;
  }
}

// Method + URL-matcher → handler. A matcher returns the regex match (capture group 1 is
// the draft id) or a truthy sentinel for static URLs, else null.
const routes = [
  { method: "POST", match: (url) => (url === "/api/prepare" ? [] : null), handle: handlePrepare },
  { method: "POST", match: (url) => url.match(/^\/api\/drafts\/([\w-]+)\/interpretation\/approve$/), handle: handleApproveInterpretation },
  { method: "POST", match: (url) => url.match(/^\/api\/drafts\/([\w-]+)\/interpretation\/iterate$/), handle: handleIterateInterpretation },
  { method: "POST", match: (url) => url.match(/^\/api\/drafts\/([\w-]+)\/directions$/), handle: handleDirections },
  { method: "POST", match: (url) => url.match(/^\/api\/drafts\/([\w-]+)\/artefact\/approve$/), handle: handleApproveArtefact },
  { method: "POST", match: (url) => url.match(/^\/api\/drafts\/([\w-]+)\/artefact\/override$/), handle: handleConformanceOverride },
  { method: "POST", match: (url) => url.match(/^\/api\/drafts\/([\w-]+)\/submit$/), handle: handleSubmit },
  { method: "POST", match: (url) => url.match(/^\/api\/drafts\/([\w-]+)\/fallback$/), handle: handleFallback },
  { method: "POST", match: (url) => url.match(/^\/api\/drafts\/([\w-]+)\/cancel$/), handle: handleCancel },
  { method: "POST", match: (url) => (url === "/api/verify" ? [] : null), handle: handleVerify },
  { method: "GET", match: (url) => (url.split("?")[0] === "/api/metrics/silence" ? [] : null), handle: handleSilenceMetrics },
  { method: "GET", match: (url) => (url.split("?")[0] === "/api/provenance" ? [] : null), handle: handleProvenance },
  { method: "GET", match: (url) => { const m = url.split("?")[0] === "/api/audit"; return m ? [new URLSearchParams(url.split("?")[1] || "").get("level")] : null; }, handle: handleAuditExport },
  { method: "GET", match: (url) => (url.split("?")[0] === "/api/meta" ? [] : null), handle: handleMeta },
];

createServer(async (request, response) => {
  try {
    const url = request.url || "";
    if (url === "/api/health") return send(response, 200, { ok: true });
    for (const route of routes) {
      if (request.method !== route.method) continue;
      const match = route.match(url);
      if (match) return await route.handle(request, response, match[1]);
    }
    if (request.method === "GET") return await handleStatic(request, response);
    send(response, 404, { error: "Not found" });
  } catch (error) {
    if (error instanceof PipelineFailure) return send(response, error.status, { error: error.message, failureCode: error.code, detail: error.detail, typed: true });
    const status = error instanceof HttpError ? error.status : error instanceof SyntaxError ? 400 : 500;
    send(response, status, { error: status === 500 ? "The service could not complete this request." : error.message });
  }
}).listen(process.env.PORT || 8080, () => console.log(`Story service listening on ${process.env.PORT || 8080}`));
