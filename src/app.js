import { referenceFor } from "./paper-references.js";
import { showPaperReference } from "./paper-viewer.js";

const $ = (selector) => document.querySelector(selector);
let mode = "demo", draft = null, selected = null, photo = null, approval = null;
const placeholder = "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1920'><rect width='100%' height='100%' fill='#26352f'/><text x='540' y='930' text-anchor='middle' fill='#e6dfcf' font-family='serif' font-size='54'>IL TIRATORE</text><text x='540' y='1000' text-anchor='middle' fill='#e6dfcf' font-family='sans-serif' font-size='25'>REFERENCE STORY MEDIA</text></svg>");

function safePayload(value) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map(safePayload);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (key === "dataUrl" && typeof item === "string") return [key, { omitted: "binary media", bytes: item.length }];
    if (/authorization|secret|key/i.test(key)) return [key, "[not exposed]"];
    return [key, safePayload(item)];
  }));
  return value;
}

const traceReference = {
  "API request": "audit", "Server state": "audit", "API rejected": "audit",
  "Mode selected": "context", "Media staged": "approval", "Interpretation ready": "interpretation",
  "Directions ready": "creativeDirection", "Context builder": "context", "Silence decision": "silence",
  "Human gate one": "humanGate", "Human gate two": "humanGate", "Direction selected": "creativeDirection",
  "Approval token issued": "approval", "Token verification": "approval", "Reference ready": "audit",
};
function sourceLink(key, className = "source-link") {
  const reference = referenceFor(key);
  const link = document.createElement("a");
  link.className = className;
  link.href = reference.href;
  link.dataset.paperReference = key;
  link.textContent = reference.label;
  link.title = reference.description;
  link.setAttribute("aria-label", `${reference.label}: ${reference.description}`);
  link.addEventListener("click", (event) => { event.preventDefault(); showPaperReference(key); });
  return link;
}
function attachSourceReference(selector, key) {
  const container = $(selector);
  if (container) container.append(sourceLink(key, "card-source-link"));
}
function trace(title, detail, kind = "system", payload) {
  const item = document.createElement("li"); item.className = `trace-event ${kind}`;
  const toggle = document.createElement("button"); toggle.type = "button"; toggle.className = "trace-toggle"; toggle.setAttribute("aria-expanded", "false");
  const heading = document.createElement("strong"); heading.textContent = title;
  const description = document.createElement("span"); description.textContent = detail;
  const panel = document.createElement("pre"); panel.className = "trace-payload"; panel.hidden = true; panel.textContent = JSON.stringify(safePayload(payload ?? { event: title, detail }), null, 2);
  toggle.append(heading, description); toggle.addEventListener("click", () => { const expanded = toggle.getAttribute("aria-expanded") === "true"; toggle.setAttribute("aria-expanded", String(!expanded)); panel.hidden = expanded; });
  item.append(toggle, sourceLink(traceReference[title] || "audit", "trace-source-link"), panel); $("#trace").prepend(item);
}
async function api(url, payload = {}) {
  trace("API request", `POST ${url}`, "api", { request: { method: "POST", url, headers: { "content-type": "application/json" }, body: payload } });
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) { trace("API rejected", data.error, "error", { response: { status: response.status, body: data } }); throw new Error(data.error); }
  trace("Server state", `${data.state || "verified"} · draft ${data.draftId || "—"}`, "system", { response: { status: response.status, body: data } }); return data;
}
async function withBusy(button, label, task) { if (button.disabled) return; const original = button.textContent; button.disabled = true; button.textContent = label; try { await task(); } finally { button.disabled = false; button.textContent = original; } }
function resetDraftView() { draft = null; selected = null; approval = null; $("#interpretation-stage").classList.add("hidden"); $("#artefact-stage").classList.add("hidden"); $("#approval-record").classList.add("hidden"); $("#verify-result").textContent = ""; $("#directions").innerHTML = ""; $("#checks").innerHTML = ""; $("#story-caption").textContent = ""; }
function context() { return { mode, day: $("#day").value, temperatureC: +$("#temperature").value, forecastC: +$("#forecast").value, blockingEvents: +$("#events").value, recentPosts: +$("#recent-posts").value, opensAt: $("#opens-at").value, closesAt: $("#closes-at").value, products: $("#products").value.split(",").map((item) => item.trim()).filter(Boolean), media: photo }; }
function setMode(next) { mode = next; document.querySelectorAll(".mode-option").forEach((button) => { const active = button.dataset.mode === mode; button.classList.toggle("selected", active); button.setAttribute("aria-checked", String(active)); }); const live = mode === "live"; ["#day", "#temperature", "#forecast", "#events", "#recent-posts", "#opens-at", "#closes-at", "#products"].forEach((selector) => { $(selector).disabled = live; }); $("#mode-description").textContent = live ? "Live reads weather, calendar and configured operations. Browser fields are deliberately ignored." : "Demo keeps its provenance visible: these are supplied scenario values, not live facts."; trace("Mode selected", live ? "Live source adapters will run." : "Deterministic reference engine will run.", "system", { mode, sources: live ? ["Open-Meteo", "Google Calendar", "deployment configuration"] : ["reviewer-supplied scenario"] }); }
document.querySelectorAll(".mode-option").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
$("#photo").addEventListener("change", (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { photo = { filename: file.name, mimeType: file.type, dataUrl: reader.result }; $("#story-image").src = reader.result; trace("Media staged", `${file.name}; its SHA-256 will bind approval.`, "system", { media: { filename: file.name, mimeType: file.type, bytes: reader.result.length } }); }; reader.readAsDataURL(file); });
function showInterpretation() { const interpretation = draft.interpretation; $("#interpretation-stage").classList.remove("hidden"); $("#observation").textContent = interpretation.observation; $("#relevance").textContent = interpretation.organisationalRelevance; $("#semantic-direction").textContent = interpretation.semanticDirection; $("#evidence").textContent = interpretation.contextEvidence.join(" · "); $("#rejected-frames").textContent = interpretation.rejectedFrames.join(" · "); $("#avoid").textContent = interpretation.avoid.join(" · "); $("#version-badge").textContent = `Attempt ${draft.interpretationAttempt || 1} · Philosophy ${draft.versions.philosophy} · Strategy ${draft.versions.strategy}`; trace("Interpretation ready", `Structured rationale attempt ${draft.interpretationAttempt || 1} is awaiting the first human gate.`, "model", { modelCall: { stage: "philosophy_interpretation", mode: draft.mode, input: { context: draft.context, versions: { philosophy: draft.versions.philosophy, strategy: draft.versions.strategy } }, output: interpretation } }); }
function renderChecks(direction) { const validation = direction.validation, conformance = direction.semanticConformance; $("#checks").innerHTML = `<p class="${validation.valid ? "pass" : "fail"}"><strong>Deterministic validation</strong> ${validation.valid ? "passed" : [...validation.missing, ...validation.violations].join(" · ")}</p><p class="${conformance.conforms ? "pass" : "fail"}"><strong>Semantic conformance</strong> ${conformance.conforms ? "passed" : conformance.violations.join(" · ")}</p><ul>${(conformance.checks || []).map((check) => `<li>${check.passed ? "✓" : "×"} ${check.boundary}</li>`).join("")}</ul>`; $("#approve-artefact").disabled = !(validation.valid && conformance.conforms); }
function renderDirections() { $("#artefact-stage").classList.remove("hidden"); $("#artefact-badge").textContent = `Skill ${draft.versions.skill} · Conformance ${draft.versions.conformancePolicy}`; const area = $("#directions"); area.innerHTML = ""; draft.directions.forEach((direction, index) => { const button = document.createElement("button"); button.type = "button"; button.className = "direction"; button.innerHTML = `<strong>0${index + 1} · ${direction.id}</strong><span>${direction.concept}</span><small>Nearest avoid: ${direction.nearestAvoid} · Risk: ${direction.riskNote}</small>`; button.onclick = () => { selected = direction; document.querySelectorAll(".direction").forEach((element) => element.classList.toggle("selected", element === button)); $("#story-caption").textContent = direction.caption; $("#story-image").src = photo?.dataUrl || placeholder; renderChecks(direction); trace("Direction selected", `${direction.id}; server-generated candidate retained in the immutable draft.`, "human", { selectedDirection: direction }); }; area.append(button); if (!index) button.click(); }); trace("Directions ready", "Creative stage ran only after interpretation approval.", "model", { modelCall: { stage: "creative_direction_and_conformance", input: { context: draft.context, interpretation: draft.interpretation }, output: draft.directions } }); }
$("#prepare").onclick = () => withBusy($("#prepare"), "Preparing…", async () => { try { resetDraftView(); $("#status").textContent = "Preparing…"; const input = context(); trace("Context builder", mode === "live" ? "Calling weather, calendar, operations, and publishing-history sources." : "Recording supplied scenario provenance.", "api", { contextBuilder: { mode, input } }); draft = await api("/api/prepare", input); $("#status").textContent = draft.opening.isOpen ? "Context verified. Review the interpretation." : "Operating gate closed; silence recorded."; if (!draft.opening.isOpen || draft.interpretation.recommendation === "do_not_publish") { trace("Silence decision", draft.interpretation.reason, "system", { interpretation: draft.interpretation }); return; } showInterpretation(); } catch (error) { $("#status").textContent = error.message; } });
$("#approve-interpretation").onclick = () => withBusy($("#approve-interpretation"), "Generating…", async () => { try { const request = { decision: "approve", reason: "Reviewer approved the stated relevance." }; draft = await api(`/api/drafts/${draft.draftId}/interpretation/approve`, request); trace("Human gate one", "Publisher approved interpretation; creative work is now authorised.", "human", { decision: request, draftId: draft.draftId }); draft = await api(`/api/drafts/${draft.draftId}/directions`); renderDirections(); } catch (error) { $("#status").textContent = error.message; } });
$("#iterate-interpretation").onclick = () => withBusy($("#iterate-interpretation"), "Iterating…", async () => { try { draft = await api(`/api/drafts/${draft.draftId}/interpretation/iterate`); trace("Human gate one", "Reviewer requested another bounded interpretation before authorising creative work.", "human", { action: "iterate_interpretation", draftId: draft.draftId }); showInterpretation(); } catch (error) { $("#status").textContent = error.message; } });
$("#stop").onclick = () => withBusy($("#stop"), "Recording…", async () => { try { const request = { decision: "do_not_publish", reason: "Reviewer chose silence." }; draft = await api(`/api/drafts/${draft.draftId}/interpretation/approve`, request); $("#status").textContent = "Silence recorded."; trace("Human gate one", "Reviewer rejected interpretation and stopped execution.", "human", { decision: request, draftId: draft.draftId }); } catch (error) { $("#status").textContent = error.message; } });
$("#cancel").onclick = () => withBusy($("#cancel"), "Cancelling…", async () => { try { const request = { reason: "Reviewer cancelled artefact." }; draft = await api(`/api/drafts/${draft.draftId}/cancel`, request); $("#status").textContent = "Cancellation recorded."; trace("Human gate two", "Artefact cancelled; no approval token exists.", "human", { decision: request, draftId: draft.draftId }); } catch (error) { $("#status").textContent = error.message; } });
$("#approve-artefact").onclick = () => withBusy($("#approve-artefact"), "Approving…", async () => { try { const request = { directionId: selected.id }; approval = await api(`/api/drafts/${draft.draftId}/artefact/approve`, request); $("#approval-record").classList.remove("hidden"); $("#approval-hash").textContent = approval.canonicalHash; $("#approval-token").textContent = approval.approvalToken; $("#media-hash").textContent = approval.approvalManifest.mediaHash; trace("Approval token issued", "Server signed its stored interpretation, media, text, version and reviewer state.", "human", { signing: { algorithm: "HMAC-SHA256(canonical_hash(manifest))", approvalManifest: approval.approvalManifest, canonicalHash: approval.canonicalHash, approvalToken: approval.approvalToken } }); } catch (error) { $("#status").textContent = error.message; } });
$("#verify-token").onclick = () => withBusy($("#verify-token"), "Verifying…", async () => { try { const request = { approvalManifest: approval.approvalManifest, approvalToken: approval.approvalToken }; const result = await api("/api/verify", request); $("#verify-result").textContent = result.valid ? "Verified: exact stored state matches the token." : result.expired ? "Not verified: approval has expired." : "Verification failed."; trace("Token verification", result.valid ? "HMAC matches canonical manifest." : result.expired ? "Signature matches but approval has expired." : "Signature mismatch.", result.valid ? "system" : "error", { verification: { request, result } }); } catch (error) { $("#verify-result").textContent = error.message; } });
const architectureStages = [
  ["Context → facts + provenance", "context"], ["Philosophy → interpretation", "interpretation"],
  ["Human gate → approve relevance", "humanGate"], ["Creative Skill → candidates", "creativeDirection"],
  ["Validation + conformance", "conformance"], ["Human gate → exact-state approval", "approval"],
  ["Audit → hash-chained events", "audit"],
];
$("#architecture").innerHTML = architectureStages.map(([label, key]) => {
  const reference = referenceFor(key);
  return `<div>${label}<a href="${reference.href}" data-paper-reference="${key}" title="${reference.description}">${reference.label}</a></div>`;
}).join("");
$("#architecture").addEventListener("click", (event) => {
  const link = event.target.closest("a[data-paper-reference]");
  if (!link) return;
  event.preventDefault();
  showPaperReference(link.dataset.paperReference);
});
attachSourceReference("#setup", "context");
attachSourceReference("#interpretation-stage", "interpretation");
attachSourceReference("#artefact-stage", "conformance");
$("#paper-reader-close").addEventListener("click", () => $("#paper-reader").close());
$("#story-image").src = placeholder; setMode("demo"); trace("Reference ready", "Choose a mode and prepare a decision.", "system", { reference: "Philosophy Layer", supportedStages: ["context", "interpretation", "directions", "validation", "conformance", "approval", "audit"] });
