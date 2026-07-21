# CONFORMANCE.md — paper ⇄ implementation reconciliation

Binds *The Philosophy Layer* (paper-spec-v1.0) to the reference implementation
at commit `9a9af8bcaacfeca3d47382fb4cb70744e12e8a92` — the current freeze point.
The `server/`, `src/`, `evaluation/` and `governance/` modules cited below are
mapped to that committed implementation snapshot. This is the conformance matrix
required by paper §7.1. It is the authoritative reconciliation surface:
[README.md](README.md) and [LIMITATIONS.md](LIMITATIONS.md) point here; the paper itself
([paper/philosophy_layer.md](paper/philosophy_layer.md)) stays a pure position
paper and contains none of this.

Every testable claim in the paper (§2–§7.2) appears below exactly once,
classified on one of three axes. The axes are different kinds of claim and are
never averaged into a single number.

## Axes

- **M — Mechanism / feasibility.** Provable by construction + replay: the
  mechanism instantiates and behaves as specified. This is all the code can
  establish (paper §7.1, "feasibility evidence").
- **E — §10 empirical.** The falsifiable core: that typed, persisted, rejectable
  structure makes judgement faults easier to detect/localise/correct than a
  monolithic step (the B′-vs-C contrast). Requires the human-subject studies of
  §7.1. **Code cannot establish this.**
- **B — Boundary.** Claims the paper makes *negatively* (§1.1, §7.2). Reproduced
  and exposed, not solved. "Proving" these means the implementation honours the
  limit rather than hiding it.

## Status vocabulary

- `proven` — construction + replay; trace ref given.
- `proven*` — proven **only under stated assumptions** (single-process,
  non-adversarial, v1.0 / commit
  `9a9af8bcaacfeca3d47382fb4cb70744e12e8a92`). Scope note, not a gap.
- `honoured` — axis B: the limit is reproduced/exposed, not removed.
- `scaffolded` — axis E: harness exists and runs on the deterministic reference /
  mock content; the human-subject study is **not run**.
- `not-run` — axis E: requires a live model + human reviewers; absent here.

## Trace refs

The executable demonstrations that back a `proven` status. There is **no
`traces/` directory** — the demonstrations are Node test files (run with
`node --test`) plus the harnesses under `evaluation/`.

- **(a)** exact-state binding & approval-token integrity — `server/approval.js`
  (`canonicalHash`, `issueApprovalToken`, `verifyApprovalToken`),
  `server/adapter.js#verifyForSubmission`; `test/approval.test.js`,
  `test/modules.test.js`.
- **(b)** an injected fault localises to the correct layer —
  `evaluation/fault-injection.js` (`FAULTS`, `localise`, `scoreLocalisation`);
  `test/evaluation-harness.test.js` ("each locatable injected fault…").
- **(c)** confabulation is honestly `unlocated` (the axis-B limit) —
  `evaluation/fault-injection.js` (`FAULTS.INTERPRETER_CONFABULATION`);
  `test/evaluation-harness.test.js` ("confabulation is honestly unlocatable").
- **(d)** a hard boundary / prohibited frame / failed positive fit cannot be
  cancelled — `src/pipeline.js` (`disposition`, `buildConformance`,
  `conformanceCheck`), `server/policy.js` (`humanMayOverride`); `test/pipeline.test.js`,
  `test/modules.test.js`.
- **(e)** an unenumerated `decision_class` escalates — `server/taxonomy.js`
  (`isEnumeratedClass`), `governance/decision-classes.md`; `test/modules.test.js`
  ("taxonomy enumerates known classes and rejects unknown ones").
- **(f)** typed fail-closed failure & governed human-only fallback —
  `server/failures.js` (`FAILURE_CODES`, `humanOnlyFallbackRecord`);
  `test/modules.test.js` ("typed failure…", "human-only fallback…").
- **(g)** silence is persisted and the silence rate is auditable —
  `src/pipeline.js#interpret` (`do_not_publish`), `server/server.js`
  (`GET /api/metrics/silence`), `server/store.js`; `test/pipeline.test.js`
  ("routine communication can explicitly select silence").

See [LIMITATIONS.md §2](LIMITATIONS.md) for the two `proven*` rows.

---

## §2 — The Philosophy layer

| Paper claim (§) | Axis | Locus | Status |
|---|---|---|---|
| Typed interpretation artefact, evidence/inference separated (§2) | M | `src/pipeline.js#interpret` — `observation`/`contextEvidence` vs `interpretiveInference`; `server/prompts/skill-interpret.md` | proven (b, c) |
| Controlled `recommendation` vocabulary + baseline set (§2) | M | `src/pipeline.js#interpret` values (`develop_direction`/`do_not_publish`/`request_more_context`/`defer`/`escalate`); `server/failures.js#FAILURE_CODES.NON_GENERATIVE_RECOMMENDATION` | proven |
| `missingEvidence` / `unresolvedQuestions` over a confidence score (§2) | M | `src/pipeline.js#interpret` fields | proven |
| Mandatory `positiveFitCondition` (§2) | M | `src/pipeline.js` field + `buildConformance` positive-fit gate | proven (d) |
| Early checkpoint, non-authorising (§2, §5.1) | M | `server/server.js` draft state machine (`interpretation_pending` → approved/rejected/iterated), no submission authority at the gate; `server/store.js#DraftStore` | proven |
| `decision_class` per-deployment, under-enum → escalate (§2, §5.6) | M | `server/taxonomy.js#isEnumeratedClass`, `governance/decision-classes.md`; `evaluation/fault-injection.js#localise` | proven (e) |
| §2.1 / §2.2 worked examples (gelato cart, entitlement update) | M | `evaluation/scenarios.json` + deterministic `src/pipeline.js#interpret`; `internal_entitlement_change` in `governance/decision-classes.md` | proven (feasibility only) |

## §3 — What this solves

| Paper claim (§) | Axis | Locus | Status |
|---|---|---|---|
| Interpretation is inspectable/rejectable before generation (§3) | M | `server/server.js` checkpoint + persisted draft (`server/store.js`) | proven |
| Inspection/rejection *improves review outcomes* (§3) | E | outcome + review-process study | not-run |
| Mechanism can localise a traceable fault (§3) | M | `evaluation/fault-injection.js` | proven (b) |
| Localisation *helps reviewers* vs monolith (§3) | E | review-process study | not-run |
| Semantic-level constraint rules out valid-but-weak output (§3) | M | `src/pipeline.js` conformance `avoid` / positive-fit checks | proven (d) |
| Versionable intent under version control (§3) | M | `server/prompts/philosophy.md` + `strategy.md`, `spec-versions.json`, versions bound into the approval manifest (§5.4) | proven |
| Localisation reliable only to artefact granularity, not cognition (§3) | B | `evaluation/fault-injection.js#localise` → `unlocated` | honoured (c) |
| Representational asymmetry (interpretation smaller/typed) (§3.1) | M | interpretation artefact vs generated artefact (`src/pipeline.js`) | proven |
| Asymmetry *yields more correct review* (§3.1) | E | §7 agenda | not-run |
| Cost boundary / deployment economics (§3.2) | B | out of code scope (argument) | honoured (n/a) |

## §5 — Architecture

| Paper claim (§) | Axis | Locus | Status |
|---|---|---|---|
| 11-step pipeline instantiated (§5) | M | `server/server.js` staged orchestration + `src/pipeline.js` deterministic reference | proven |
| Context Builder adds no framing; interpreter alters no facts (§5) | M | `server/live-context.js` (provenance-tagged facts); `src/pipeline.js#interpret` (evidence vs inference) | proven |
| Creative Direction bounded; inherits `semanticDirection`/`avoid` verbatim, may not weaken (§5.1) | M | `src/pipeline.js#createDirections` + `conformanceCheck` (weakened output rejected); `server/prompts/skill-directions.md` | proven (d) |
| Selection/publication authority in one human approval; checkpoint cannot select or authorise (§5.1) | M | `server/server.js` state machine; approval issued only at the artefact gate (`server/approval.js`) | proven |
| Conformance checks artefact against its interpretation (§5.2) | M | `src/pipeline.js#conformanceCheck` / `buildConformance`; `server/openai.js` (`llm_conformance` detector) | proven (d) |
| Negative-first, non-compensatory decision policy (§5.2) | M | `src/pipeline.js#disposition`; `server/policy.js` | proven (d) |
| Detector vs decision authority recorded separately (§5.2) | M | `src/pipeline.js#buildConformance` finding `detector` field; policy applied server-side | proven |
| Hard block un-cancellable by positive fit or prompt (§5.2) | M | `src/pipeline.js#disposition` (`hardBlock`); `server/policy.js#humanMayOverride` | proven (d) |
| `indeterminate` never passes; fails closed (§5.2) | M | `src/pipeline.js#disposition` | proven |
| Exact-state binding: any bound change invalidates token (§5.2.1) | M | `server/approval.js#verifyApprovalToken` (canonical hash) | proven (a), tested |
| Time-ordering constraint on bundle (§5.2.1) | M | `server/adapter.js#verifyForSubmission` (`too_early`); `server/failures.js#FAILURE_CODES.TIME_ORDERING_INVALID` | proven (a) |
| Does not prove rationale caused model behaviour (§5.2.1) | B | — | honoured |
| Does not prevent privileged out-of-band bypass (§5.2.1) | B | — | honoured |
| Submission SM: unused→claimed→terminal, at-most-one, no replay (§5.2.2) | M | `server/adapter.js#IntentStore` | proven* (single-process) |
| approved / submitted / platform state split (§5.2.2) | M | `server/adapter.js#PublicationAdapter.submit` | proven |
| External byte-identity not guaranteed (§5.2.2) | B | `server/adapter.js` platform note (state = observed only) | honoured |
| Security claim conditional (atomic store, auth time, keys…) (§5.2.2) | B | `server/adapter.js` / `server/approval.js` — assumptions asserted, not a full protocol | honoured / proven* |
| Hard admissibility conjunctive; conflict fails closed (§5.3) | M | `server/policy.js#HARD_ADMISSIBILITY_BOUNDARIES` | proven |
| Preference ordering ranks only inside valid space (§5.3) | M | `server/policy.js#rankByPreference` / `PREFERENCE_ORDER` | proven |
| Hard boundaries un-overridable by prompt (§5.3) | M | `server/policy.js#humanMayOverride` | proven (d) |
| Override still bound by exact-state approval (§5.3) | M | `server/approval.js` binding on the override bundle | proven (a) |
| Audit record binds versions/hashes (§5.4) | M | `server/approval.js` manifest; `server/store.js#AuditLog`; `spec-versions.json` | proven |
| Versioning narrows fault sources (§5.4) | M | versions bound in manifest → candidate layers (`evaluation/fault-injection.js`) | proven |
| Versioning does not prove causal attribution (§5.4) | B | — | honoured |
| Schema-vs-vocabulary seam; change classified by semantic effect (§5.4) | M | `server/taxonomy.js` (version/owner/hash of `governance/decision-classes.md`) | proven |
| Strategy separately versioned; ranks, doesn't authorise; expires (§5.5) | M | `server/prompts/strategy.md`; `server/policy.js#PREFERENCE_ORDER` (`time_bounded_strategy_objectives`) | proven |
| Strategy outranks Philosophy defaults, not invariants (§5.5) | M | `server/policy.js` — strategy tier above defaults, below hard boundaries | proven |
| Governance: owner, approval path, provenance per change (§5.6) | M | `governance/decision-classes.md` frontmatter + `server/taxonomy.js` (process parts noted) | proven (tooling) |
| Role-based access to Philosophy/audit (§5.6, §7.2) | M | `server/provenance.js#redactAuditEvent`; `server/server.js` `GET /api/audit?level=` | proven |
| Fail-closed; typed failure taxonomy (§5.7) | M | `server/failures.js#FAILURE_CODES` | proven (f) |
| Governed human-only fallback is a separate mode, not a bypass (§5.7) | M | `server/failures.js#humanOnlyFallbackRecord` | proven (f) |
| Recovery never reuses a stale token (§5.7) | M | `server/approval.js#verifyApprovalToken` re-check; `server/failures.js` `requiresNewApproval` | proven (a) |

## §6 — Silence is a decision

| Paper claim (§) | Axis | Locus | Status |
|---|---|---|---|
| Non-generative outcomes persisted (`do_not_publish` etc.) (§6) | M | `src/pipeline.js#interpret` + `server/store.js` | proven (g) |
| Suppressed interpretations persisted; proportion reviewed (§6) | M | `server/server.js` silence store + sampler | proven (g) |
| Silence rate auditable; rising rate is a finding (§6) | M | `server/server.js` `GET /api/metrics/silence` | proven (metric); reading it = analysis |
| Risk-aware silence (approval required in consequential domains) (§6) | M | `server/server.js` deployment policy flag | proven |

## §7 — Testing and evaluation

| Paper claim (§) | Axis | Locus | Status |
|---|---|---|---|
| Valid-interpretation-space harness (required/prohibited) (§7) | M | `evaluation/scenarios.json`; `test/evaluation.test.js` | proven (harness) |
| Human reviewer reason-code schema (§7) | M | interpretation-review outcomes + recorded dismissal reason/role (`server/server.js`, `server/provenance.js`) | partial — see deviation **D-1** |
| Authoritative human regression labels (§7) | E | human-labelled corpus | not-run |
| LLM judge, versioned + calibrated to human corpus (§7) | E (harness M) | `server/openai.js` (`llm_conformance` path, `OPENAI_CONFORMANCE_MODEL`), `src/pipeline.js#buildConformance`; calibration | scaffolded / calibration not-run |
| Prohibited-direction checks as narrowest signal (§7) | M | `src/pipeline.js#checksFor` / `validateArtefact` (negative checks) | proven |
| A/B/B′/C/D/E ablation scaffold (§7.1) | M | `evaluation/ablation.js` | scaffolded |
| Outcome study (§7.1) | E | — | not-run |
| Review-process study (§7.1) | E | — | not-run |
| Fault-injection harness (§7.1) | M | `evaluation/fault-injection.js` | proven (harness) (b, c) |
| Reviewability measures (time-to-premise, localisation acc…) (§7.1) | E | require human subjects | not-run |
| **Central claim: B′-vs-C, structure beyond visibility (§7.1, §10)** | E | `evaluation/ablation.js#loadBearingContrast` isolates it; the thesis | **not-run** |
| Spec freeze + immutable ids + this matrix (§7.1) | M | `spec-versions.json` (`paper-spec-v1.0` …) + this file | proven |

## §7.2 — Threats to validity (all axis B unless noted)

| Paper claim (§7.2) | Axis | Locus | Status |
|---|---|---|---|
| Correlated model failure → containment, not prevention | B | layer isolation + bound versions (`server/policy.js`, approval manifest) | honoured |
| Decorrelated judge (different provider/family) | M (opt.) | `OPENAI_CONFORMANCE_MODEL` (`server/config.js`, `server/openai.js`) | proven (optional) |
| Adversarial context unaddressed in generalised domains | B | verified-context boundary only (`server/live-context.js`) | honoured |
| Rationale laundering: rationale may not be operative reason | B | — | honoured |
| Confabulation is unlocatable | B | `evaluation/fault-injection.js` → `unlocated` | honoured (c) |
| Perturbation probes falsify *some* unfaithfulness | E (harness M) | `evaluation/perturbation.js` | scaffolded / not-run |
| Reviewer drift / Philosophy ambiguity / governance capture / eval leakage | B | exposed, not solved | honoured |
| Audit-trail privacy (minimisation, redaction, retention) | M + B | `server/provenance.js#redactAuditEvent` (M); privacy-by-default not guaranteed (B) | proven (redaction) / honoured |

---

## Summary by axis

- **M — mechanism:** every row instantiates, behaves as specified and replays.
  Two rows are `proven*` (single-process, non-adversarial): the §5.2.2
  submission state machine (`server/adapter.js#IntentStore`) and the
  §5.2.1/§5.2.2 hardening logic (`server/adapter.js` / `server/approval.js`). See
  [LIMITATIONS.md §2](LIMITATIONS.md).
- **E — §10 empirical:** the harnesses exist and run on the deterministic
  reference (`scaffolded`); **no human-subject study is run** (`not-run`). The
  central B′-vs-C claim is unproven by design — it is the agenda, not a result.
- **B — boundary:** honoured, not solved. The implementation reproduces each
  limit (most visibly: confabulation localises to `unlocated`) rather than
  masking it.

Any deviation from `paper-spec-v1.0`, `interpretation-schema-v1.0` or
`evaluation-protocol-v1.0` (see `spec-versions.json`) must be recorded here
before result analysis and reported as a deviation (§7.1), not silently absorbed.

## Recorded deviations

Deviations from the frozen specification, recorded per §7.1 before any result
analysis. A deviation is a scoped, acknowledged gap — not a silent one.

### D-1 — Reviewer reason-code schema is narrower than §7 specifies

**Spec:** §7 enumerates a component-level reviewer reason-code set —
`CONTEXT_INVALID`, `INTERPRETATION_INVALID`, `DIRECTION_MISALIGNED`,
`EXECUTION_FAILURE`, `DETERMINISTIC_VALIDATION_FAILURE`,
`CONFORMANCE_FALSE_POSITIVE`, `CONFORMANCE_FALSE_NEGATIVE`,
`APPROVAL_CONTEXT_CHANGED` — so a regression label attaches to the specific
faulty component (context, interpretation, direction, execution, validation,
conformance or a changed approval condition).

**Implementation:** the reference records interpretation-review outcomes
(approved / rejected / iterated) and a free-text dismissal reason plus role
(`server/server.js`, `server/provenance.js`). It does **not** yet implement the
enumerated, component-scoped reason-code vocabulary, so a rejection is not bound
to one of the eight components as authoritative regression evidence.

**Effect:** the human-labelled regression corpus of §7 cannot be assembled with
component-level attribution from this reference as-is. This bounds the axis-E
evaluation, not the axis-M mechanism.

**Resolution:** either implement the eight-code schema on the interpretation and
conformance review paths, or keep this deviation recorded until the evaluation
protocol is exercised. Tracked against `evaluation-protocol-v1.0`.
