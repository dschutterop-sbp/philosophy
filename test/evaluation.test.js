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
  }
});
