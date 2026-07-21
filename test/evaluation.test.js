import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { interpret } from "../src/pipeline.js";

test("scenario corpus replays valid interpretation spaces", async () => {
  const scenarios = JSON.parse(await readFile(new URL("../evaluation/scenarios.json", import.meta.url), "utf8"));
  for (const scenario of scenarios) {
    const result = interpret(scenario.context);
    assert.ok(scenario.required.includes(result.recommendation) || scenario.required.includes(result.decisionClass), `${scenario.id}: required interpretation missing`);
    for (const prohibited of scenario.mustReject) assert.ok(result.rejectedFrames.includes(prohibited), `${scenario.id}: required rejection missing for ${prohibited}`);
    // Evidence and inference must stay separate, and a develop_direction interpretation
    // must carry a mandatory positive_fit_condition (paper §2, §5.2).
    assert.equal(typeof result.interpretiveInference, "string", `${scenario.id}: interpretive inference missing`);
    assert.ok(Array.isArray(result.missingEvidence) && Array.isArray(result.unresolvedQuestions), `${scenario.id}: uncertainty fields missing`);
    if (result.recommendation === "develop_direction") assert.ok(result.positiveFitCondition, `${scenario.id}: develop_direction needs a positive fit condition`);
    else assert.equal(result.positiveFitCondition, null, `${scenario.id}: non-generative recommendation must not assert a positive fit condition`);
  }
});
