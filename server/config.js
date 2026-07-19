const required = ["OPENAI_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"];

export function config() {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  const latitude = Number(process.env.WEATHER_LATITUDE);
  const longitude = Number(process.env.WEATHER_LONGITUDE);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error("WEATHER_LATITUDE and WEATHER_LONGITUDE must be numbers.");
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
  };
}
