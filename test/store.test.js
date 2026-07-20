import test from "node:test";
import assert from "node:assert/strict";
import { DraftStore } from "../server/store.js";

test("draft store retains server-owned state and only advances through updates", () => {
  const store = new DraftStore();
  const draft = store.create({ createdAt: "2026-07-20T10:00:00Z", context: { day: "Saturday" }, interpretation: { recommendation: "develop_direction" }, media: { hash: "media" }, mode: "demo", versions: {} });
  assert.equal(draft.state, "interpretation_pending");
  assert.equal(store.get(draft.id), draft);
  const next = store.update(draft.id, { state: "interpretation_approved" });
  assert.equal(store.get(draft.id).state, "interpretation_approved");
  assert.notEqual(next, draft);
});

test("draft store rejects stale compare-and-swap updates", () => {
  const store = new DraftStore();
  const draft = store.create({ createdAt: "2026-07-20T10:00:00Z", context: {}, interpretation: {}, media: { hash: "media" }, mode: "demo", versions: {} });
  assert.ok(store.update(draft.id, { state: "interpretation_approved" }, draft.revision));
  assert.equal(store.update(draft.id, { state: "cancelled" }, draft.revision), null);
});
