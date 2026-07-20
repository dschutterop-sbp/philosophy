function localDate(timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function weekday(date, timezone) {
  return new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long" }).format(new Date(`${date}T12:00:00Z`));
}

async function googleAccessToken(settings) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: settings.googleClientId, client_secret: settings.googleClientSecret, refresh_token: settings.googleRefreshToken, grant_type: "refresh_token" }),
  });
  if (!response.ok) throw new Error(`Google token refresh failed (${response.status}).`);
  return (await response.json()).access_token;
}

async function weather(settings) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({ latitude: String(settings.latitude), longitude: String(settings.longitude), current: "temperature_2m", daily: "temperature_2m_max", forecast_days: "1", timezone: settings.timezone });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Weather provider failed (${response.status}).`);
  const payload = await response.json();
  return { temperatureC: payload.current.temperature_2m, forecastC: payload.daily.temperature_2m_max[0] };
}

async function calendar(settings, date) {
  const token = await googleAccessToken(settings);
  const start = `${date}T00:00:00`;
  const next = new Date(`${date}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
  const nextDate = next.toISOString().slice(0, 10);
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(settings.calendarId)}/events`);
  url.search = new URLSearchParams({ timeMin: `${start}Z`, timeMax: `${nextDate}T00:00:00Z`, singleEvents: "true", orderBy: "startTime", timeZone: settings.timezone });
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Google Calendar query failed (${response.status}).`);
  const payload = await response.json();
  const blockingEvents = (payload.items || []).filter((event) => event.status !== "cancelled" && event.transparency !== "transparent");
  return { blockingEvents: blockingEvents.length, calendarChecked: true };
}

export async function liveContext(settings) {
  const date = localDate(settings.timezone);
  const [conditions, agenda] = await Promise.all([weather(settings), calendar(settings, date)]);
  const observedAt = new Date().toISOString();
  const [opensAt, closesAt] = settings.openingHours.split("-");
  return {
    date, day: weekday(date, settings.timezone), opensAt, closesAt, products: settings.products, recentPosts: settings.recentPosts, ...conditions, ...agenda,
    provenance: {
      weather: { source: "Open-Meteo", observedAt, validUntil: `${date}T23:59:59`, fields: ["temperatureC", "forecastC"] },
      calendar: { source: `Google Calendar:${settings.calendarId}`, observedAt, validUntil: `${date}T23:59:59`, fields: ["blockingEvents"] },
      operations: { source: "deployment configuration", observedAt, fields: ["opensAt", "closesAt", "products", "recentPosts"] },
    },
  };
}
