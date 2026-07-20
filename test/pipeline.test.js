import test from "node:test";
import assert from "node:assert/strict";
import { assessOpeningDecision, conformanceCheck, createDirections, interpret, validateArtefact } from "../src/pipeline.js";
import { config } from "../server/config.js";

const liveEnvKeys = ["OPENAI_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "APPROVAL_SIGNING_KEY", "WEATHER_LATITUDE", "WEATHER_LONGITUDE"];
const liveCredentials = { OPENAI_API_KEY: "key", GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret", GOOGLE_REFRESH_TOKEN: "token", APPROVAL_SIGNING_KEY: "production-test-signing-key" };

function withEnv(overrides, fn) {
  const original = Object.fromEntries(liveEnvKeys.map((key) => [key, process.env[key]]));
  try {
    for (const key of liveEnvKeys) delete process.env[key];
    Object.assign(process.env, overrides);
    return fn();
  } finally {
    for (const key of liveEnvKeys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
}

const context = {
  day: "Saturday", temperatureC: 23, forecastC: 24, blockingEvents: 0,
  opensAt: "13:30", closesAt: "18:00", products: ["Aperol Spritz Sorbet", "Limoncello Spritz Sorbet"],
};

test("opening decision requires every operating metric", () => {
  assert.equal(assessOpeningDecision(context).isOpen, true);
  assert.equal(assessOpeningDecision({ ...context, blockingEvents: 1 }).isOpen, false);
});

test("opening policy is configurable and recorded with the decision", () => {
  const result = assessOpeningDecision({ ...context, temperatureC: 19, forecastC: 19 }, 20);
  assert.equal(result.isOpen, false);
  assert.equal(result.policy.minimumTemperature, 20);
});

test("routine communication can explicitly select silence", () => {
  const result = interpret({ ...context, recentPosts: 2 });
  assert.equal(result.recommendation, "do_not_publish");
  assert.match(result.reason, /recent/i);
});

test("interpreter produces a bounded audience-moment interpretation", () => {
  const result = interpret(context);
  assert.equal(result.recommendation, "develop_direction");
  assert.deepEqual(result.rejectedFrames, ["heat_relief", "urgency", "generic_seasonal_framing"]);
});

test("an iteration produces a distinct but equally bounded interpretation", () => {
  const initial = interpret(context);
  const next = interpret({ ...context, iteration: 2 });
  assert.notEqual(next.semanticDirection, initial.semanticDirection);
  assert.deepEqual(next.rejectedFrames, initial.rejectedFrames);
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

test("conformance reports the named approved boundary it evaluated", () => {
  const result = conformanceCheck({ concept: "retro postcard", caption: "Today, 13:30-18:00\nAperol Spritz Sorbet · Limoncello Spritz Sorbet", fit: "afternoon" }, interpret(context));
  assert.equal(result.conforms, false);
  assert.ok(result.checks.some((check) => check.boundary === "vintage-retro styling" && !check.passed));
});

test("config flags empty (but present) weather coordinates as missing for live mode", () => {
  const settings = withEnv({ ...liveCredentials, WEATHER_LATITUDE: "", WEATHER_LONGITUDE: "" }, () => config());
  assert.equal(settings.liveReady, false);
  assert.ok(settings.missingLive.includes("WEATHER_LATITUDE/WEATHER_LONGITUDE"));
});

test("config flags absent weather coordinates as missing for live mode", () => {
  const settings = withEnv(liveCredentials, () => config());
  assert.equal(settings.liveReady, false);
  assert.ok(settings.missingLive.includes("WEATHER_LATITUDE/WEATHER_LONGITUDE"));
});

test("config never permits live mode with the demo approval key", () => {
  const settings = withEnv({ ...liveCredentials, APPROVAL_SIGNING_KEY: "", WEATHER_LATITUDE: "52.37", WEATHER_LONGITUDE: "4.89" }, () => config());
  assert.equal(settings.liveReady, false);
  assert.ok(settings.missingLive.includes("APPROVAL_SIGNING_KEY"));
});

test("config is live-ready once credentials and numeric coordinates are set", () => {
  const settings = withEnv({ ...liveCredentials, WEATHER_LATITUDE: "52.37", WEATHER_LONGITUDE: "4.89" }, () => config());
  assert.equal(settings.liveReady, true);
  assert.deepEqual(settings.missingLive, []);
  assert.equal(settings.latitude, 52.37);
  assert.equal(settings.longitude, 4.89);
});
