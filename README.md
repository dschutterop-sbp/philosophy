# The Philosophy Layer — reference implementation

This is an inspectable implementation of the paper’s decision chain. It is deliberately a review system, not a publisher: the final action is **Approve for publication**, which produces a short-lived, exact-state approval record for a separate publisher to verify.

## What the interface demonstrates

The screen is divided into two synchronized views:

- **End-user view** — verified context, an interpretation gate, candidate Story directions, and an artefact gate.
- **Under the hood** — the API calls, source/model work, human gates, signing, and state transitions caused by each action.

The flow is intentionally staged:

`Context + provenance → Philosophy interpretation → human gate → Creative Skill → validation + semantic conformance → human gate → signed approval → hash-chained audit`

No creative directions are generated before a reviewer approves the interpretation. At the first gate, a reviewer can select silence, approve, or request another bounded interpretation attempt; each attempt is visible and audited. A reviewer can also cancel at the artefact gate.

## Architectural guarantees

- **Server-owned drafts.** The browser never submits an artefact manifest to be signed. It can select only a stored candidate from a stored draft.
- **Exact-state binding.** The approval manifest records hashes of the interpretation, media and text; selected direction, account, reviewer, versions, timestamp, and expiry are also bound.
- **Provenance.** Live weather, calendar and configured operations facts contain source and observation metadata. Demo values are explicitly marked as reviewer-supplied scenarios.
- **Layer boundaries.** Philosophy and temporary Strategy are separate versioned documents. Context, Skill, conformance policy and template versions are recorded with every draft.
- **Negative-first conformance.** Each approved `avoid` / rejected-frame boundary is checked and displayed individually; positive fit remains advisory.
- **Silence.** Routine events can produce `do_not_publish`, including in the deterministic demo via **Recent posts**.
- **Auditability.** Every meaningful transition is written as a hash-chained JSONL event. For production, send the same events to an access-controlled append-only audit system.

The built-in reviewer identity is a reference adapter controlled by deployment configuration. Replace it with authenticated identity and role claims before treating this as a production authorisation system. Drafts are intentionally held in memory, so a restart invalidates in-flight review links; production needs durable, access-controlled draft storage.

## Run

```sh
cp .env.example .env
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). Demo mode requires no credentials. Live mode reads weather and calendar data and takes opening hours/products only from deployment configuration, never from the browser.

## Live configuration

Live mode needs `WEATHER_LATITUDE`, `WEATHER_LONGITUDE`, OpenAI credentials, and Google Calendar OAuth credentials. `RECENT_POSTS` is the publishing-history input used by the silence decision; this reference accepts it from deployment configuration until it is connected to a publishing-history adapter. See [.env.example](/Users/daniel/Documents/Philosophy/.env.example) for all settings.

`OPENAI_CONFORMANCE_MODEL` can be set to a distinct model from `OPENAI_MODEL` to mitigate correlated interpreter/executor/judge failure. It is a mitigation, not proof of independence.

## Governance and evaluation

[philosophy.md](/Users/daniel/Documents/Philosophy/server/prompts/philosophy.md) is stable organisational intent; [strategy.md](/Users/daniel/Documents/Philosophy/server/prompts/strategy.md) is temporary operating direction. Changes to either should be reviewed, version-bumped, tested against historical scenarios, and approved by its owner. The reference keeps owner metadata in the Strategy frontmatter; production should integrate this with the organisation’s change-management system.

The test suite covers deterministic policy, silence, direction boundaries, approval signing, and server-owned draft transitions. [`evaluation/scenarios.json`](/Users/daniel/Documents/Philosophy/evaluation/scenarios.json) is a small, executable valid-interpretation-space corpus replayed in CI. It is intentionally a seed corpus; production evaluation should add human labels, reviewer disagreement/adjudication, holdouts, and the A/B/C/D ablation harness described in the paper.

## Test

```sh
node --test
```

## Secret scanning

GitHub Actions runs Gitleaks against the complete repository history and every
pull request in [secret-scan.yml](/Users/daniel/Documents/Philosophy/.github/workflows/secret-scan.yml). It has read-only repository permission and receives no deployment credentials. Do not add broad allow-lists: rotate and remove any real credential reported by the scan.
