import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Deterministic, key-order-independent JSON so two semantically identical
// manifests always hash to the same value regardless of construction order.
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((sorted, key) => { sorted[key] = canonicalize(value[key]); return sorted; }, {});
  }
  return value;
}

export function canonicalHash(manifest) {
  return createHash("sha256").update(JSON.stringify(canonicalize(manifest))).digest("hex");
}

function sign(hash, signingKey) {
  return createHmac("sha256", signingKey).update(hash).digest("hex");
}

// approval_token = sign(canonical_hash(approval_manifest))
export function issueApprovalToken(manifest, signingKey) {
  const hash = canonicalHash(manifest);
  return { canonicalHash: hash, approvalToken: sign(hash, signingKey) };
}

export function verifyApprovalToken(manifest, approvalToken, signingKey) {
  const { canonicalHash: hash, approvalToken: expected } = issueApprovalToken(manifest, signingKey);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(String(approvalToken), "hex");
  const valid = a.length === b.length && timingSafeEqual(a, b);
  return { valid, canonicalHash: hash };
}
