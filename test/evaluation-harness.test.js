import test from "node:test";
import assert from "node:assert/strict";
import { FAULTS, localise, runChain, scoreLocalisation } from "../evaluation/fault-injection.js";
import { probeFaithfulness } from "../evaluation/perturbation.js";
import { CONDITIONS, ablateScenario, loadBearingContrast } from "../evaluation/ablation.js";

const context = { day: "Saturday", temperatureC: 23, forecastC: 24, blockingEvents: 0, opensAt: "13:30", closesAt: "18:00", products: ["Aperol Spritz Sorbet", "Limoncello Spritz Sorbet"], recentPosts: 0 };

test("a healthy chain localises to no layer", () => {
  assert.equal(localise(runChain(context)).layer, "unlocated");
});

test("each locatable injected fault is attributed to the correct layer", () => {
  const { results } = scoreLocalisation(context);
  for (const result of results) {
    assert.equal(result.located, result.expected, `${result.fault}: expected ${result.expected}, got ${result.located}`);
  }
});

test("confabulation is honestly unlocatable (the §7.2 limit)", () => {
  const baseline = runChain(context);
  const injected = FAULTS.INTERPRETER_CONFABULATION.apply(baseline);
  assert.equal(localise(injected).layer, "unlocated");
});

test("localisation accuracy over the full fault set is reported", () => {
  const { accuracy, correct, total } = scoreLocalisation(context);
  assert.equal(correct, total);
  assert.equal(accuracy, 1);
});

test("faithfulness probe: null mutations are stable, relevant mutations respond", () => {
  const { stability, responsiveness } = probeFaithfulness(context);
  assert.equal(stability, 1, "frame must be stable under semantically-null mutation");
  assert.equal(responsiveness, 1, "frame must respond to a semantically-relevant mutation");
});

test("ablation exposes the B'→C load-bearing contrast", () => {
  const contrast = loadBearingContrast();
  assert.deepEqual(contrast.isolates.sort(), ["interpretationPersisted", "reasoningStructured", "rejectableBeforeGeneration"].sort());
});

test("ablation review-object load grows with condition richness", () => {
  const { rows } = ablateScenario({ id: "warm-saturday", context });
  const byName = Object.fromEntries(rows.map((row) => [row.condition, row]));
  assert.ok(byName.A.reviewObjectLoad <= byName["B'"].reviewObjectLoad);
  assert.ok(byName["B'"].reviewObjectLoad <= byName.E.reviewObjectLoad);
  assert.equal(byName.A.reasoningVisible, false);
  assert.equal(byName.C.reasoningStructured, true);
});
