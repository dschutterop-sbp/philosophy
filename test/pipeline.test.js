import test from "node:test";
import assert from "node:assert/strict";
import { assessOpeningDecision, conformanceCheck, createDirections, interpret, validateArtefact } from "../src/pipeline.js";

const context = {
  day: "Saturday", temperatureC: 23, forecastC: 24, blockingEvents: 0,
  opensAt: "13:30", closesAt: "18:00", products: ["Aperol Spritz Sorbet", "Limoncello Spritz Sorbet"],
};

test("opening decision requires every operating metric", () => {
  assert.equal(assessOpeningDecision(context).isOpen, true);
  assert.equal(assessOpeningDecision({ ...context, blockingEvents: 1 }).isOpen, false);
});

test("interpreter produces a bounded audience-moment interpretation", () => {
  const result = interpret(context);
  assert.equal(result.recommendation, "develop_direction");
  assert.deepEqual(result.rejectedFrames, ["heat_relief", "urgency", "generic_seasonal_framing"]);
});

test("directions stay valid and conform to the approved interpretation", () => {
  const interpretation = interpret(context);
  const direction = createDirections(context, interpretation)[0];
  assert.equal(validateArtefact(context, direction).valid, true);
  assert.equal(conformanceCheck(direction, interpretation).conforms, true);
});

test("conformance blocks a sunshine cliche despite valid hours", () => {
  const interpretation = interpret(context);
  const badDirection = { concept: "cart", caption: "Beat the heat! Open 13:30-18:00\\nAperol Spritz Sorbet · Limoncello Spritz Sorbet", fit: "" };
  assert.equal(validateArtefact(context, badDirection).valid, false);
  assert.equal(conformanceCheck(badDirection, interpretation).conforms, false);
});
