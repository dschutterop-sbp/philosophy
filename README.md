# The Philosophy Layer — reference implementation

[![Code license: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-blue.svg)](LICENSE)
[![Paper license: CC BY 4.0](https://img.shields.io/badge/paper-CC%20BY%204.0-lightgrey.svg)](PAPER-LICENSE.md)
[![Paper DOI: 10.5281/zenodo.21504906](https://zenodo.org/badge/DOI/10.5281/zenodo.21504906.svg)](https://doi.org/10.5281/zenodo.21504906)

This is an inspectable implementation of the paper’s decision chain. It is deliberately a review system, not a publisher: the final action is **Approve for publication**, which produces a short-lived, exact-state approval record for a separate publisher to verify.

## Paper source

The paper is maintained as the repository’s canonical, editable source at
[paper/philosophy_layer.md](paper/philosophy_layer.md). It is intentionally
versioned alongside this reference implementation so that interface evidence
and the paper’s decision-trace claims can evolve together. Its frontmatter
`version` is the canonical project version; `npm run version:sync` propagates
that value to package and citation metadata.
The running reference implementation links each review stage and decision-trace
event to its relevant paper section.

### Build the paper PDF

The styled, reproducible PDF build lives in
[`document-rendering`](document-rendering).
It always uses the canonical paper source above; it does not require a copied
Markdown file. After installing Pandoc and Typst (`brew install pandoc typst`
on macOS), build it with:

```sh
make -C document-rendering pdf
```

The generated file is
`document-rendering/build/philosophy_layer_v1.0.0.pdf`.
See the [document-rendering README](document-rendering/README.md)
for font, engine, output-path, and alternate-source options.

## Paper conformance and limitations

The mapping between the paper and this code lives in two companion documents, so
the paper source stays a pure position paper:

- [CONFORMANCE.md](CONFORMANCE.md) is the authoritative reconciliation matrix
  (paper §7.1). Every testable claim in §2–§7.2 appears exactly once, bound to a
  locus in the code and classified on one of three axes — **M** (mechanism /
  feasibility, provable by construction + replay), **E** (the §10 empirical core,
  which needs human-subject studies and is **not run** here), and **B**
  (boundaries the paper draws negatively, reproduced and exposed rather than
  solved).
- [LIMITATIONS.md](LIMITATIONS.md) is the plain-language companion: what this
  reference does **not** establish — the two conditional (`proven*`) guarantees,
  the unrun empirical core, the honoured boundaries, and the deployment caveats.

If you read only one line: this is *feasibility* evidence for the mechanism. The
central empirical claim (that typed, persisted, rejectable structure beats a
monolithic step for review) is the research agenda, not a result in this repo.

## License and citation

The reference implementation is licensed under [Apache License 2.0](LICENSE).
The paper source is licensed under
[CC BY 4.0](PAPER-LICENSE.md). The paper is archived at
[doi:10.5281/zenodo.21504906](https://doi.org/10.5281/zenodo.21504906).
See [CITATION.cff](CITATION.cff) for software and paper citation metadata. See
[PUBLICATION-CHECKLIST.md](PUBLICATION-CHECKLIST.md) before making a repository
public.

## What the interface demonstrates

The screen is divided into two synchronized views:

- **End-user view** — verified context, an interpretation gate, candidate Story directions, and an artefact gate.
- **Under the hood** — the API calls, source/model work, human gates, signing, and state transitions caused by each action.

The flow is intentionally staged:

`Context + provenance → Philosophy interpretation → human gate → Creative Skill → validation + semantic conformance → human gate → signed approval → hash-chained audit`

No creative directions are generated before a reviewer approves the interpretation. At the first gate, a reviewer can select silence, approve, or request another bounded interpretation attempt; each attempt is visible and audited. A reviewer can also cancel at the artefact gate.

## Architectural guarantees

- **Server-owned drafts.** The browser never submits an artefact manifest to be signed. It can select only a stored candidate from a stored draft.
- **Exact-state binding.** The approval manifest binds hashes of the context snapshot, each governed document (Philosophy, Strategy, Skill, template), the interpretation and its review, the selected direction, and the validation and conformance reports, alongside media, text and artefact payload; selected direction, account, reviewer role, a single publication intent and idempotency key, versions, timestamp, and expiry are also bound, and the `latest_bound_input ≤ approved ≤ scheduled ≤ expiry` ordering is enforced.
- **Provenance.** Live weather, calendar and configured operations facts contain source and observation metadata. Demo values are explicitly marked as reviewer-supplied scenarios.
- **Layer boundaries.** Philosophy and temporary Strategy are separate versioned documents. Context, Skill, conformance policy and template versions are recorded with every draft.
- **Negative-first, non-compensatory conformance.** Each approved `avoid` / rejected-frame boundary is checked individually and scored by severity (major/moderate/minor). A hard-boundary violation or a failed mandatory `positive_fit_condition` blocks the candidate; soft violations follow a tiered disposition (reject ≥30 / human disposition 10–29 / warning <10). Indeterminate never passes. Positive fit beyond the mandatory condition is advisory. A reviewer may dismiss only *soft* findings, with a recorded reason and role, which produces a new conformance report.
- **Full interpretation artefact.** The interpretation separates verified `observation`/`contextEvidence` from `interpretiveInference`, carries a mandatory `positiveFitCondition`, `missingEvidence` and `unresolvedQuestions`, and uses the full recommendation vocabulary (`develop_direction`, `do_not_publish`, `request_more_context`, `defer`, `escalate`).
- **Governed decision-class taxonomy.** `governance/decision-classes.md` is an owned, versioned enumeration. An interpretation whose class is not enumerated is flagged as under-enumeration and escalated, never silently forced into the nearest class.
- **Constraints vs preferences.** Hard admissibility boundaries (conjunctive) and preference ordering are kept separate (`server/policy.js`); a preference never overrides a hard boundary, and hard-boundary findings cannot be dismissed by a prompt-level action.
- **Publication adapter + submission state machine.** A review-only adapter consumes one signed publication intent through an append-only `unused → claimed → terminal` store, verifying signature, expiry, destination, adapter version, payload hash and time before an at-most-one submission. It records `approved` / `submitted` / `platform` state separately and never claims byte-identical publication by an external platform.
- **Typed fail-closed recovery.** Every stop is a typed failure (`server/failures.js`); a governed human-only fallback mode records the unavailable controls, the responsible human, the reason and a new approval state rather than acting as an implicit bypass.
- **Silence as a signal.** Routine events produce `do_not_publish` (deterministic demo: **Recent posts**). Suppressed interpretations are persisted and a proportion flagged for review; `GET /api/metrics/silence` reports the silence rate and reasons.
- **Auditability & provenance.** Every meaningful transition is a hash-chained JSONL event. `GET /api/provenance` exports a W3C PROV-DM profile of the decision chain; `GET /api/audit?level=full|investigator|operational` applies access-level redaction. For production, send the same events to an access-controlled append-only audit system.
- **Evaluation apparatus.** `evaluation/fault-injection.js` injects known faults and scores layer localisation (and is honest that a confabulated-but-clean rationale is unlocatable, §7.2); `evaluation/perturbation.js` probes interpreter faithfulness under null vs relevant mutations; `evaluation/ablation.js` scaffolds the A/B/B′/C/D/E conditions and isolates the B′→C structure-vs-visibility contrast.

The built-in reviewer identity is a reference adapter controlled by deployment configuration. Replace it with authenticated identity and role claims before treating this as a production authorisation system. Drafts are intentionally held in memory, so a restart invalidates in-flight review links; production needs durable, access-controlled draft storage.

## Run

```sh
cp .env.example .env
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). Demo mode requires no credentials. Live mode reads weather and calendar data and takes opening hours/products only from deployment configuration, never from the browser. Live mode refuses to start without a non-demo `APPROVAL_SIGNING_KEY`.

## Ubuntu deployment

On an Ubuntu host with Git, Docker Engine and the Docker Compose plugin, run
[scripts/serve-ubuntu.sh](scripts/serve-ubuntu.sh). It clones the repository
to `$HOME/philosophy` (or `$PHILOSOPHY_INSTALL_DIR`), fast-forwards the
selected branch, creates a demo-safe `.env` if one is absent, then builds and
starts the Compose service.

```sh
curl -fsSL https://raw.githubusercontent.com/dschutterop-sbp/philosophy/main/scripts/serve-ubuntu.sh | bash
```

Set `PHILOSOPHY_BRANCH`, `PHILOSOPHY_INSTALL_DIR`, or `STORY_PORT` before
running it to override the branch, checkout location, or exposed port. The
script never overwrites an existing `.env`.

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
pull request, then runs TruffleHog against the checked-out source for complementary provider-aware detection and verification, in [secret-scan.yml](/Users/daniel/Documents/Philosophy/.github/workflows/secret-scan.yml). It has read-only repository permission and receives no deployment credentials. Do not add broad allow-lists: rotate and remove any real credential reported by the scan.
