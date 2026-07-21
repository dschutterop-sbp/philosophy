import { canonicalHash, verifyApprovalToken } from "./approval.js";

// Publication Adapter and submission state machine (§5.2.2).
//
// The approval token authorises the adapter to act on ONE declared publication intent
// under ONE declared submission policy. This reference adapter is deliberately
// "review-only": it performs the full pre-submission verification and the atomic,
// append-only intent claim, then records a synthetic receipt instead of calling a real
// platform. It demonstrates the guarantee the architecture actually claims — at-most-one
// authorised adapter submission under the strict single-intent profile — and the explicit
// approved / submitted / platform state boundary. It does NOT claim exactly-once
// publication by an external platform.

class SubmissionError extends Error {
  constructor(message, code = "submission_rejected") {
    super(message);
    this.code = code;
  }
}

// Append-only intent-consumption store. Each idempotency key transitions
// unused → claimed → terminal and can never move backwards. A key that is already
// claimed or terminal cannot be replayed under the single_intent policy.
export class IntentStore {
  constructor() {
    this.intents = new Map();
    this.log = []; // append-only transition log
  }
  #record(key, from, to, detail) {
    const entry = { key, from, to, detail };
    this.log.push(entry);
    return entry;
  }
  state(key) {
    return this.intents.get(key)?.state || "unused";
  }
  // Atomically move unused → claimed. Throws on any non-unused prior state (replay).
  claim(key, policy, attemptCounter) {
    const current = this.intents.get(key);
    if (current && current.state !== "unused") {
      if (policy?.mode === "bounded_counter" && current.state === "claimed" && current.attempts < policy.maxAttempts) {
        current.attempts += 1;
        this.#record(key, "claimed", "claimed", { attempt: current.attempts });
        return current;
      }
      throw new SubmissionError(`Intent ${key} is already ${current.state}; single-intent tokens cannot be replayed.`, "intent_replayed");
    }
    const claimed = { state: "claimed", attempts: attemptCounter ?? 1, policy };
    this.intents.set(key, claimed);
    this.#record(key, "unused", "claimed", { attempt: claimed.attempts });
    return claimed;
  }
  finalize(key, terminalDetail) {
    const current = this.intents.get(key);
    if (!current || current.state !== "claimed") throw new SubmissionError(`Intent ${key} cannot be finalised from state ${current?.state || "unused"}.`, "invalid_transition");
    current.state = "terminal";
    current.terminal = terminalDetail;
    this.#record(key, "claimed", "terminal", terminalDetail);
    return current;
  }
}

// Verify the approval token and every bound submission parameter before consuming the
// intent. `deployment` describes the adapter's own identity and destination so a token
// approved for a different account, adapter version or a future scheduled time is refused.
export function verifyForSubmission({ approvalManifest, approvalToken, signingKey, deployment, now, submittedPayload }) {
  const token = verifyApprovalToken(approvalManifest, approvalToken, signingKey);
  if (!token.valid) throw new SubmissionError(token.expired ? "Approval token has expired." : "Approval signature is invalid.", token.expired ? "expired" : "bad_signature");
  if (approvalManifest.destination && deployment.destination && approvalManifest.destination !== deployment.destination) throw new SubmissionError("Destination differs from the approved bundle.", "destination_mismatch");
  if (approvalManifest.accountId && deployment.accountId && approvalManifest.accountId !== deployment.accountId) throw new SubmissionError("Account differs from the approved bundle.", "account_mismatch");
  if (approvalManifest.publicationAdapterVersion && deployment.adapterVersion && approvalManifest.publicationAdapterVersion !== deployment.adapterVersion) throw new SubmissionError("Adapter version differs from the approved bundle.", "adapter_version_mismatch");
  const scheduled = approvalManifest.scheduledTime ? Date.parse(approvalManifest.scheduledTime) : null;
  if (scheduled !== null && Number.isFinite(scheduled) && now < scheduled) throw new SubmissionError("Current time is before the approved scheduled time.", "too_early");
  if (submittedPayload !== undefined) {
    const recomputed = canonicalHash(submittedPayload);
    if (approvalManifest.artefactPayloadHash && recomputed !== approvalManifest.artefactPayloadHash) throw new SubmissionError("Submitted payload does not match the approved payload hash.", "payload_mismatch");
  }
  return token;
}

export class PublicationAdapter {
  constructor(store, deployment) {
    this.store = store;
    this.deployment = deployment; // { destination, accountId, adapterVersion }
  }
  // Submit one approved bundle. Returns the recorded submission (approved/submitted/platform
  // state). Throws SubmissionError on any verification, ordering or replay failure — the
  // pipeline is expected to fail closed and record a typed failure (§5.7).
  submit({ approvalManifest, approvalToken, signingKey, now, submittedPayload }) {
    verifyForSubmission({ approvalManifest, approvalToken, signingKey, deployment: this.deployment, now, submittedPayload });
    const key = approvalManifest.idempotencyKey;
    if (!key) throw new SubmissionError("Approval bundle has no idempotency key.", "missing_idempotency_key");
    this.store.claim(key, approvalManifest.submissionPolicy);
    const submittedPayloadHash = canonicalHash(submittedPayload);
    // Synthetic receipt: a real adapter would call the platform here. The request id is
    // derived deterministically from the bound state so the reference stays replay-free
    // without a clock- or random-based identifier.
    const requestId = canonicalHash({ key, submittedPayloadHash, now }).slice(0, 24);
    const receipt = { requestId, acceptedAt: new Date(now).toISOString(), platformNote: "Reference review-only adapter: no external platform was contacted. An external platform may compress, strip metadata or normalise content, so platform state is not guaranteed byte-identical." };
    this.store.finalize(key, { requestId, submittedPayloadHash });
    return {
      approvedState: { artefactPayloadHash: approvalManifest.artefactPayloadHash, approvalHash: canonicalHash(approvalManifest) },
      submittedState: { submittedPayloadHash, submissionTime: receipt.acceptedAt, requestId },
      platformState: { receipt, retrievedHash: null, note: "platform state is observed, not part of the approval" },
    };
  }
}

export { SubmissionError };
