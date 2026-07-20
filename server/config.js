// Only demo mode (static data, no external calls) can run without these; live mode needs all of them.
const liveRequired = ["OPENAI_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"];
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
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    liveReady: missingLive.length === 0,
    missingLive,
    approvalSigningKey: process.env.APPROVAL_SIGNING_KEY || demoSigningKey,
    usingDefaultSigningKey: !process.env.APPROVAL_SIGNING_KEY,
  };
}
