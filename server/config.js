// Only demo mode (static data, no external calls) can run without these; live mode needs all of them.
const liveRequired = ["OPENAI_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "APPROVAL_SIGNING_KEY"];
// Approval signing works out of the box in every mode, using an openly-labelled demo
// key unless a real one is configured. Never treat the fallback as a secret.
const demoSigningKey = "demo-signing-key-not-for-production-use";

export function config() {
  const latitude = Number(process.env.WEATHER_LATITUDE);
  const longitude = Number(process.env.WEATHER_LONGITUDE);
  const missingLive = liveRequired.filter((name) => !process.env[name]);
  if (!process.env.WEATHER_LATITUDE || !process.env.WEATHER_LONGITUDE || !Number.isFinite(latitude) || !Number.isFinite(longitude)) missingLive.push("WEATHER_LATITUDE/WEATHER_LONGITUDE");
  return {
    timezone: process.env.TIMEZONE || "Europe/Amsterdam",
    latitude, longitude,
    minimumTemperature: Number(process.env.OPENING_MIN_TEMPERATURE_C || 18),
    openaiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || "gpt-5.6-terra",
    conformanceModel: process.env.OPENAI_CONFORMANCE_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-terra",
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    liveReady: missingLive.length === 0,
    missingLive,
    approvalSigningKey: process.env.APPROVAL_SIGNING_KEY || demoSigningKey,
    usingDefaultSigningKey: !process.env.APPROVAL_SIGNING_KEY,
    openingHours: process.env.OPENING_HOURS || "13:30-18:00",
    products: (process.env.AVAILABLE_PRODUCTS || "Aperol Spritz Sorbet,Limoncello Spritz Sorbet").split(",").map((item) => item.trim()).filter(Boolean),
    recentPosts: Number(process.env.RECENT_POSTS || 0),
    reviewer: { id: process.env.DEMO_REVIEWER_ID || "demo-publisher", role: process.env.DEMO_REVIEWER_ROLE || "publisher" },
    // Silence-as-signal (§6): persist suppressed interpretations and route every Nth for review.
    silenceReviewSampleEvery: Number(process.env.SILENCE_REVIEW_SAMPLE_EVERY || 5),
    // Risk-aware: consequential domains may require explicit human approval of a silence/defer.
    requireApprovalForSilence: process.env.REQUIRE_APPROVAL_FOR_SILENCE === "true",
    // Publication adapter deployment identity (§5.2.2).
    destination: process.env.PUBLICATION_DESTINATION || "instagram:account_07",
    accountId: process.env.PUBLICATION_ACCOUNT_ID || "instagram-story-reference",
    adapterVersion: "reference-review-only:1.0.0",
  };
}
