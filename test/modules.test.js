import test from "node:test";
import assert from "node:assert/strict";
import { IntentStore, PublicationAdapter, SubmissionError, verifyForSubmission } from "../server/adapter.js";
import { issueApprovalToken } from "../server/approval.js";
import { isEnumeratedClass, decisionClassKeys } from "../server/taxonomy.js";
import { disposition, buildConformance } from "../src/pipeline.js";
import { toProvDocument, redactAuditEvent } from "../server/provenance.js";
import { humanOnlyFallbackRecord, PipelineFailure, typedFailure } from "../server/failures.js";
import { humanMayOverride, isHardBoundaryFinding, rankByPreference } from "../server/policy.js";

const KEY = "test-signing-key";
const deployment = { destination: "instagram:account_07", accountId: "acct", adapterVersion: "reference-review-only:1.0.0" };
function bundle(overrides = {}) {
  const payload = { text: "one more good thing for the afternoon" };
  const manifest = { idempotencyKey: "instagram:pubintent_1", destination: deployment.destination, accountId: deployment.accountId, publicationAdapterVersion: deployment.adapterVersion, scheduledTime: null, expiry: "2999-01-01T00:00:00.000Z", artefactPayloadHash: undefined, ...overrides };
  const { approvalToken } = issueApprovalToken(manifest, KEY);
  return { manifest, approvalToken, payload };
}

// -- Publication adapter / submission state machine (§5.2.2) ------------------------------

test("intent store transitions unused → claimed → terminal", () => {
  const store = new IntentStore();
  assert.equal(store.state("k"), "unused");
  store.claim("k", { mode: "single_intent", maxAttempts: 1 });
  assert.equal(store.state("k"), "claimed");
  store.finalize("k", { requestId: "r" });
  assert.equal(store.state("k"), "terminal");
});

test("single-intent tokens cannot be replayed", () => {
  const store = new IntentStore();
  store.claim("k", { mode: "single_intent", maxAttempts: 1 });
  assert.throws(() => store.claim("k", { mode: "single_intent", maxAttempts: 1 }), /already/);
});

test("adapter submits once and records approved/submitted/platform state", () => {
  const store = new IntentStore();
  const adapter = new PublicationAdapter(store, deployment);
  const { manifest, approvalToken, payload } = bundle();
  const result = adapter.submit({ approvalManifest: manifest, approvalToken, signingKey: KEY, now: Date.parse("2026-07-19T14:05:00Z"), submittedPayload: payload });
  assert.ok(result.submittedState.requestId);
  assert.equal(store.state(manifest.idempotencyKey), "terminal");
  assert.ok(result.platformState.note.includes("observed"));
});

test("adapter refuses a submission for a mismatched destination", () => {
  const { manifest, approvalToken, payload } = bundle({ destination: "instagram:other" });
  assert.throws(() => verifyForSubmission({ approvalManifest: manifest, approvalToken, signingKey: KEY, deployment, now: Date.now(), submittedPayload: payload }), (error) => error instanceof SubmissionError && error.code === "destination_mismatch");
});

test("adapter refuses submission before the scheduled time", () => {
  const { manifest, approvalToken, payload } = bundle({ scheduledTime: "2999-01-01T00:00:00.000Z" });
  assert.throws(() => verifyForSubmission({ approvalManifest: manifest, approvalToken, signingKey: KEY, deployment, now: Date.parse("2026-01-01T00:00:00Z"), submittedPayload: payload }), /before the approved scheduled time/);
});

// -- Decision-class taxonomy (§5.4/§5.6) -------------------------------------------------

test("taxonomy enumerates known classes and rejects unknown ones", () => {
  assert.ok(isEnumeratedClass("audience_moment_extension"));
  assert.ok(!isEnumeratedClass("made_up_class"));
  assert.ok(decisionClassKeys.includes("escalate_out_of_scope"));
});

// -- Weighted disposition (§5.2) ---------------------------------------------------------

test("disposition tiers follow the non-compensatory policy", () => {
  assert.equal(disposition([], true, true).outcome, "accept");
  assert.equal(disposition([{ finding: "fail", severity: "minor", boundaryType: "soft" }], true, true).outcome, "warning");
  assert.equal(disposition([{ finding: "fail", severity: "moderate", boundaryType: "soft" }], true, true).outcome, "human_disposition");
  assert.equal(disposition([{ finding: "fail", severity: "moderate", boundaryType: "soft" }, { finding: "fail", severity: "moderate", boundaryType: "soft" }, { finding: "fail", severity: "moderate", boundaryType: "soft" }], true, true).outcome, "reject");
  assert.equal(disposition([{ finding: "fail", severity: "major", boundaryType: "hard" }], true, true).outcome, "reject");
  assert.equal(disposition([], false, true).outcome, "reject", "failed mandatory positive fit blocks");
  assert.equal(disposition([{ finding: "indeterminate", severity: "minor", boundaryType: "soft" }], true, true).outcome, "human_disposition", "indeterminate never passes");
});

test("buildConformance applies the policy server-side from raw checks", () => {
  const interpretation = { decisionClass: "audience_moment_extension", positiveFitCondition: "must read as an afternoon already underway" };
  const report = buildConformance({ checks: [{ boundary: "heat_relief", passed: false, finding: "fail" }], positiveFit: true, interpretation, detector: "llm_conformance" });
  assert.equal(report.conforms, false);
  assert.equal(report.dispositionOutcome, "reject");
  assert.equal(report.detector, "llm_conformance");
});

// -- Policy: constraints & override authority (§5.3) -------------------------------------

test("hard findings cannot be overridden, soft findings can", () => {
  assert.ok(!humanMayOverride({ boundaryType: "hard", severity: "major" }));
  assert.ok(humanMayOverride({ boundaryType: "soft", severity: "moderate" }));
  assert.ok(isHardBoundaryFinding({ severity: "major" }));
});

test("preference ranking respects tier order", () => {
  const options = [{ id: "a" }, { id: "b" }];
  const ranked = rankByPreference(options, (option) => (option.id === "b" ? { authorised_human_instruction: 1 } : { model_creativity: 1 }));
  assert.equal(ranked[0].id, "b");
});

// -- Failures (§5.7) ---------------------------------------------------------------------

test("typed failure carries a code and status", () => {
  const failure = typedFailure("TIME_ORDERING_INVALID");
  assert.ok(failure instanceof PipelineFailure);
  assert.equal(failure.code, "TIME_ORDERING_INVALID");
  assert.equal(failure.status, 409);
});

test("human-only fallback requires unavailable controls, a responsible human and a reason", () => {
  assert.throws(() => humanOnlyFallbackRecord({ unavailableControls: [], responsibleHuman: { id: "u", role: "publisher" }, reason: "outage" }));
  const record = humanOnlyFallbackRecord({ unavailableControls: ["semantic_conformance"], responsibleHuman: { id: "u", role: "publisher" }, reason: "conformance service outage" });
  assert.equal(record.requiresNewApproval, true);
});

// -- Provenance & privacy (§4, §7.2) -----------------------------------------------------

test("provenance export produces PROV entities, activities and agents", () => {
  const events = [
    { at: "t1", event: "draft_prepared", draftId: "d1", interpretation: { decisionClass: "audience_moment_extension", recommendation: "develop_direction" }, actor: { id: "u", role: "publisher" } },
    { at: "t2", event: "artefact_approved", draftId: "d1", canonicalHash: "h", approvalManifest: { approvalId: "a1" }, actor: { id: "u", role: "publisher" } },
  ];
  const doc = toProvDocument(events);
  assert.ok(Object.keys(doc.entity).length >= 2);
  assert.ok(Object.keys(doc.activity).length >= 2);
  assert.ok(doc.relations.some((relation) => relation["prov:wasGeneratedBy"]));
});

test("redaction removes sensitive payloads below full access", () => {
  const event = { at: "t", event: "draft_prepared", draftId: "d1", context: { secret: true }, interpretation: { recommendation: "do_not_publish" }, actor: { id: "u", role: "publisher" }, eventHash: "h" };
  assert.equal(redactAuditEvent(event, "full").context.secret, true);
  assert.equal(redactAuditEvent(event, "investigator").context, "[redacted:investigator]");
  assert.equal(redactAuditEvent(event, "operational").context, undefined);
  assert.equal(redactAuditEvent(event, "operational").eventHash, "h");
});
