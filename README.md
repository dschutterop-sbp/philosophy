# Il Tiratore - Philosophy Layer prototype

A local, dependency-free prototype of the first human review gate for an Instagram Story.

## Run locally

Copy `.env.example` to `.env`, fill in the secrets and location, then start the container:

```sh
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). Upload a quay photo, confirm the opening facts, and select **Prepare review**. Set `STORY_PORT` to use another local port.

### Demo vs. live mode

A toggle at the top of the page switches how the Philosophy layer runs:

- **Demo · static data** — the deterministic Philosophy engine in `src/pipeline.js` runs against the values you type into the form. No external calls are made, so this works with no credentials at all.
- **Live · agentic** — the server reads real weather (Open-Meteo) and same-day calendar events (Google Calendar), then sends only that verified context to the OpenAI Responses API, which applies the Philosophy prompt agentically to produce the interpretation, directions and semantic conformance checks (`server/openai.js`). This requires `OPENAI_API_KEY`, the Google OAuth credentials and `WEATHER_LATITUDE`/`WEATHER_LONGITUDE` in `.env`; `/api/prepare` returns a 400 naming what's missing if you select live mode without them.

Both modes share the same deterministic gate (`assessOpeningDecision`) and artefact validation (`validateArtefact`), so the two paths are directly comparable — demo mode is a faithful stand-in for what live mode does, not a separate toy.

## Test

```sh
npm test
```

## Delivery pipeline

GitHub Actions runs the domain tests on each pull request and push to `main`. A separate job validates the Compose file and builds the production Nginx image. The workflow intentionally does not publish an image: registry publishing needs a chosen registry and credentials, which should be added as a separate deployment decision.

The deterministic opening and artefact rules are isolated in `src/pipeline.js`:

1. verified operating context;
2. Philosophy interpretation;
3. bounded creative directions;
4. deterministic validation and semantic conformance;
5. the human decision: iterate, publish or cancel.

## Live providers

The server gets current temperature and daily forecast from Open-Meteo, reads same-day blocking events from Google Calendar using a server-side refresh token, and sends only the verified context to the OpenAI Responses API. Google access is read-only (`calendar.events.readonly`). The generated interpretation, directions and negative-first semantic checks are schema-constrained and each prepared draft is appended to the Docker volume as an audit record.
