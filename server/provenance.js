// W3C PROV-DM profile for the decision chain (§4, §12 target) and audit-trail privacy
// controls (§7.2).
//
// The paper positions the Philosophy interpretation as one typed entity within a
// provenance graph rather than a replacement for one. This module maps the audit event
// stream to a PROV-JSON-shaped document:
//   entities   — context snapshots, philosophy/strategy versions, interpretations,
//                interpretation reviews, directions, artefacts, approval manifests
//   activities — model calls, reviews, publication attempts
//   agents     — humans, the organisation, software components
// It is a domain-specific profile, not a formal PROV-DM mapping, but PROV is the
// interoperability target the export is shaped toward.

const ns = (kind, id) => `phil:${kind}/${id}`;

// Map one audit event to PROV fragments. Returns { entities, activities, agents, relations }.
function eventToProv(event) {
  const out = { entities: {}, activities: {}, agents: {}, relations: [] };
  const draft = event.draftId || "unknown";
  const agentId = event.actor?.id ? ns("agent", event.actor.id) : null;
  if (event.actor?.id) out.agents[agentId] = { "prov:type": "prov:Person", role: event.actor.role };

  switch (event.event) {
    case "draft_prepared": {
      const ctx = ns("context", draft);
      const interp = ns("interpretation", draft);
      const act = ns("activity", `interpret-${draft}`);
      out.entities[ctx] = { "prov:type": "context_snapshot", at: event.at };
      out.entities[interp] = { "prov:type": "interpretation", decisionClass: event.interpretation?.decisionClass, recommendation: event.interpretation?.recommendation };
      out.activities[act] = { "prov:type": "model_call", at: event.at };
      out.relations.push({ "prov:used": { activity: act, entity: ctx } });
      out.relations.push({ "prov:wasGeneratedBy": { entity: interp, activity: act } });
      if (agentId) out.relations.push({ "prov:wasAssociatedWith": { activity: act, agent: agentId } });
      break;
    }
    case "interpretation_approved":
    case "interpretation_rejected":
    case "interpretation_iterated": {
      const review = ns("review", `${draft}-${event.attempt || 0}`);
      const act = ns("activity", `review-${draft}-${event.event}`);
      out.entities[review] = { "prov:type": "interpretation_review", outcome: event.event };
      out.activities[act] = { "prov:type": "human_review", at: event.at };
      out.relations.push({ "prov:wasGeneratedBy": { entity: review, activity: act } });
      if (agentId) out.relations.push({ "prov:wasAssociatedWith": { activity: act, agent: agentId } });
      break;
    }
    case "directions_generated": {
      const act = ns("activity", `direct-${draft}`);
      out.activities[act] = { "prov:type": "model_call", at: event.at };
      for (const id of event.directionIds || []) {
        const dir = ns("direction", `${draft}-${id}`);
        out.entities[dir] = { "prov:type": "direction" };
        out.relations.push({ "prov:wasGeneratedBy": { entity: dir, activity: act } });
      }
      break;
    }
    case "artefact_approved": {
      const approval = ns("approval", event.approvalManifest?.approvalId || draft);
      const artefact = ns("artefact", draft);
      const act = ns("activity", `approve-${draft}`);
      out.entities[artefact] = { "prov:type": "artefact" };
      out.entities[approval] = { "prov:type": "approval_manifest", canonicalHash: event.canonicalHash };
      out.activities[act] = { "prov:type": "human_review", at: event.at };
      out.relations.push({ "prov:wasGeneratedBy": { entity: approval, activity: act } });
      if (agentId) out.relations.push({ "prov:wasAssociatedWith": { activity: act, agent: agentId } });
      break;
    }
    case "artefact_submitted": {
      const act = ns("activity", `submit-${draft}`);
      out.activities[act] = { "prov:type": "publication_attempt", at: event.at };
      if (agentId) out.relations.push({ "prov:wasAssociatedWith": { activity: act, agent: agentId } });
      break;
    }
    default:
      break;
  }
  return out;
}

export function toProvDocument(events) {
  const doc = { prefix: { phil: "https://schutterop.example/philosophy-layer#", prov: "http://www.w3.org/ns/prov#" }, entity: {}, activity: {}, agent: {}, relations: [] };
  const org = ns("agent", "organisation");
  doc.agent[org] = { "prov:type": "prov:Organization" };
  for (const event of events) {
    const frag = eventToProv(event);
    Object.assign(doc.entity, frag.entities);
    Object.assign(doc.activity, frag.activities);
    Object.assign(doc.agent, frag.agents);
    doc.relations.push(...frag.relations);
  }
  return doc;
}

// Audit-trail privacy (§7.2). A complete decision chain can contain internal principles,
// third-party context, rejected frames, strategic priorities and reviewer identities, so a
// maximally complete but indiscriminately accessible record is not accountable by default.
// Redaction is applied by access level. `full` is the unredacted record (auditor role);
// `investigator` keeps structure and hashes but drops raw content; `operational` keeps only
// non-sensitive envelope fields.
const SENSITIVE_FIELDS = ["context", "interpretation", "approvalManifest", "media", "reason"];
export function redactAuditEvent(event, accessLevel = "full") {
  if (accessLevel === "full") return event;
  const redacted = { ...event };
  if (accessLevel === "investigator") {
    // Keep the shape and identifiers; replace sensitive payloads with a marker so the
    // chain remains navigable without exposing content.
    for (const field of SENSITIVE_FIELDS) if (field in redacted) redacted[field] = "[redacted:investigator]";
    if (redacted.actor) redacted.actor = { role: redacted.actor.role };
    return redacted;
  }
  // operational: envelope only.
  return { at: event.at, event: event.event, draftId: event.draftId, previousEventHash: event.previousEventHash, eventHash: event.eventHash };
}
