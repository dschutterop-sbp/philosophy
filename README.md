# Il Tiratore - Philosophy Layer

A containerised Instagram Story review service. It has a local demo mode and a live, agentic mode; both stop at the first human gate.

## Start locally

Copy the environment template once:

```sh
cp .env.example .env
```

Demo mode needs no secrets. For live mode, complete the settings below and start the service:

```sh
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080), upload a quay photo, select **Live · agentic**, then choose **Prepare review**. Set `STORY_PORT` before starting Compose to use a different host port.

### Demo vs. live mode

A toggle at the top of the page switches how the Philosophy layer runs:

- **Demo · static data** — the deterministic Philosophy engine in `src/pipeline.js` runs against the values you type into the form. No external calls are made, so this works with no credentials at all.
- **Live · agentic** — the server reads real weather (Open-Meteo) and same-day calendar events (Google Calendar), then sends only verified context to the OpenAI Responses API. The model creates the interpretation, directions and semantic-conformance checks in separate structured steps (`server/openai.js`). This requires the settings in the next section. `/api/prepare` returns HTTP 400 naming missing settings instead of falling back to demo data.

Both modes share the same deterministic gate (`assessOpeningDecision`) and artefact validation (`validateArtefact`), so the two paths are directly comparable — demo mode is a faithful stand-in for what live mode does, not a separate toy.

### Prompt files

Live mode's prompts live as plain markdown under `server/prompts/`, one file per concept, so each can be reviewed or edited without touching request/response code:

- `philosophy.md` — the persistent brand voice, audience and forbidden framing.
- `skill-interpret.md`, `skill-directions.md`, `skill-conformance.md` — task-specific instructions for the three structured OpenAI calls.

`server/openai.js` loads all four once at startup and prepends `philosophy.md` to whichever skill instructions a given call needs.

Each file opens with a `version:` frontmatter block (e.g. `---\nversion: 1.1.0\n---`). `openai.js` parses that out and never forwards it to the model, so bumping a version cannot influence agent behaviour — it only changes what the app reports. The three `skill-*.md` files are versioned together as one Skill; the server refuses to start if they disagree, so a coordinated edit means bumping all three. `/api/prepare` returns the real versions that produced each draft (`response.versions`), and the review screen's `Philosophy · v…` / `Skill · v…` badges and the Publish confirmation are driven by that response rather than a fixed constant. Demo mode reuses these same versions rather than tracking its own — it's a different execution engine for the same Philosophy and Skill, not a separately versioned artifact — so a version bump in `philosophy.md` shows up in both modes' badges after the server restarts and picks up the file.

## Settings for live agentic mode

Put these values in the local `.env` file only. `.env` is ignored by Git; commit neither API keys nor OAuth tokens.

| Setting | Required | Purpose |
| --- | --- | --- |
| `WEATHER_LATITUDE` | Yes | Latitude of the cart's actual location. |
| `WEATHER_LONGITUDE` | Yes | Longitude of the cart's actual location. |
| `TIMEZONE` | Yes | Local decision timezone; default is `Europe/Amsterdam`. |
| `OPENING_MIN_TEMPERATURE_C` | Yes | Deterministic minimum for the opening decision; default is `18`. |
| `OPENAI_API_KEY` | Yes | Server-only OpenAI API credential. |
| `OPENAI_MODEL` | Yes | Model for the interpreter, creative-direction and conformance calls; default is `gpt-5.6-terra`. |
| `GOOGLE_CALENDAR_ID` | Yes | Calendar to evaluate; `primary` is the authenticated account's primary calendar. |
| `GOOGLE_CLIENT_ID` | Yes | OAuth 2.0 client ID from the Google Cloud project. |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth 2.0 client secret from the Google Cloud project. |
| `GOOGLE_REFRESH_TOKEN` | Yes | Long-lived refresh token belonging to the chosen calendar user. |

### Google Calendar setup

1. Create or select a Google Cloud project and enable the Google Calendar API.
2. Configure an OAuth consent screen and create an OAuth client for the environment that will run this service.
3. Authorise that client once with the least-privileged scope `https://www.googleapis.com/auth/calendar.events.readonly` and request offline access so Google returns a refresh token.
4. Set `GOOGLE_CALENDAR_ID=primary`, or set the ID of a calendar the authorised account may read.
5. Copy the client ID, client secret and refresh token into `.env`.

The service exchanges the refresh token server-side, requests same-day events with `singleEvents=true`, and counts non-cancelled, non-transparent events as blocking. It never exposes Google credentials, event details or the OpenAI key to the browser.

### Agentic boundaries

Live mode is assisted, not autonomous publication. The server owns verified facts, the deterministic opening decision, validation, versions and audit records. The model may interpret verified context and explore copy only within the Philosophy; it may not alter opening hours, invent availability or publish. **Iterate**, **Publish** and **Cancel** remain human decisions.

Each prepared run appends its context, interpretation, directions and checks to `story_audit`, the named Docker volume. Treat that volume as operational data: retain it deliberately and restrict host access.

### Pre-flight checklist

Before using live mode, confirm:

- the weather coordinates are the cart's exact location;
- the Google Calendar API is enabled and the refresh token has the read-only event scope;
- the chosen calendar contains only events that should block the opening decision, or transparent events are used for non-blocking entries;
- the OpenAI key is valid and has access to the configured model;
- `.env` exists locally and is not staged for Git.

### Branded vs. unbranded

A second toggle in the masthead switches the visible identity between **Il Tiratore branded** and **Unbranded**. This only swaps display labels — the page title, eyebrow, the Story's credit line, and the name shown on the placeholder photo — so the same Philosophy engine (audience, character, forbidden framing) can be demonstrated as a generic, reusable review layer rather than something specific to this one brand. It's independent of the demo/live toggle and doesn't affect the interpretation itself.

## Test

```sh
npm test
```

## Delivery pipeline

GitHub Actions runs the domain tests on each pull request and push to `main`. A separate job validates Compose and builds the production Node image. The workflow intentionally does not publish an image: registry publishing needs a chosen registry and credentials, which should be added as a separate deployment decision.

The deterministic opening and artefact rules are isolated in `src/pipeline.js`:

1. verified operating context;
2. Philosophy interpretation;
3. bounded creative directions;
4. deterministic validation and semantic conformance;
5. the human decision: iterate, publish or cancel.
