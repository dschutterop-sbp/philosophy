import test from "node:test";
import assert from "node:assert/strict";
import { canonicalHash, issueApprovalToken, verifyApprovalToken } from "../server/approval.js";

test("canonicalHash is stable regardless of key order", () => {
  assert.equal(canonicalHash({ b: 1, a: 2 }), canonicalHash({ a: 2, b: 1 }));
});

test("canonicalHash is stable regardless of nested object key order", () => {
  const a = canonicalHash({ direction: { id: "x", caption: "hi" }, mode: "demo" });
  const b = canonicalHash({ mode: "demo", direction: { caption: "hi", id: "x" } });
  assert.equal(a, b);
});

test("canonicalHash changes when content changes", () => {
  assert.notEqual(canonicalHash({ decision: "publish" }), canonicalHash({ decision: "cancel" }));
});

test("issueApprovalToken produces a 64-char hex hash and a token verifiable with the same key", () => {
  const manifest = { draftId: "abc123", decision: "publish" };
  const { canonicalHash: hash, approvalToken } = issueApprovalToken(manifest, "test-key");
  assert.equal(hash.length, 64);
  assert.match(approvalToken, /^[0-9a-f]+$/);
  const result = verifyApprovalToken(manifest, approvalToken, "test-key");
  assert.equal(result.valid, true);
  assert.equal(result.canonicalHash, hash);
});

test("verifyApprovalToken rejects a tampered manifest", () => {
  const manifest = { draftId: "abc123", decision: "publish" };
  const { approvalToken } = issueApprovalToken(manifest, "test-key");
  const result = verifyApprovalToken({ ...manifest, decision: "cancel" }, approvalToken, "test-key");
  assert.equal(result.valid, false);
});

test("verifyApprovalToken rejects a token signed with a different key", () => {
  const manifest = { draftId: "abc123", decision: "publish" };
  const { approvalToken } = issueApprovalToken(manifest, "key-one");
  const result = verifyApprovalToken(manifest, approvalToken, "key-two");
  assert.equal(result.valid, false);
});

test("verifyApprovalToken rejects a malformed token without throwing", () => {
  const manifest = { draftId: "abc123", decision: "publish" };
  const result = verifyApprovalToken(manifest, "not-a-hex-token", "test-key");
  assert.equal(result.valid, false);
});

test("verifyApprovalToken rejects an otherwise valid expired approval", () => {
  const manifest = { draftId: "abc123", expiry: "2020-01-01T00:00:00.000Z" };
  const { approvalToken } = issueApprovalToken(manifest, "test-key");
  const result = verifyApprovalToken(manifest, approvalToken, "test-key");
  assert.equal(result.valid, false);
  assert.equal(result.expired, true);
});
