# Changelog

All notable changes to this reference implementation are documented here.

## 1.0.0 - 2026-07-23

- Establishes the paper frontmatter as the canonical project version.
- Adds consistency checking and synchronisation for package, lockfile and
  citation metadata.
- Names PDF, generated TeX and arXiv artifacts using the `<artefact>_vMAJOR.MINOR.PATCH`
  convention.

## 0.2.0 - 2026-07-21

Broadens the reference to cover the full set of paper mechanisms.

- **Interpretation artefact (§2):** adds `interpretiveInference`, mandatory
  `positiveFitCondition`, `missingEvidence`, `unresolvedQuestions`, and the full
  recommendation vocabulary (`develop_direction`, `do_not_publish`,
  `request_more_context`, `defer`, `escalate`).
- **Conformance (§5.2):** severity-scored, non-compensatory tiered disposition
  (reject / human disposition / warning); mandatory positive-fit block; indeterminate
  never passes; server-side disposition for the live path; human soft-override endpoint.
- **Approval bundle (§5.2.1):** binds context snapshot, governed-document content hashes,
  interpretation review, direction, validation/conformance reports, artefact payload, a
  single publication intent + idempotency key, adapter version and approver role, and
  enforces the `latest_bound_input ≤ approved ≤ scheduled ≤ expiry` invariant.
- **Publication adapter (§5.2.2):** append-only intent store (`unused → claimed →
  terminal`), pre-submission verification, at-most-one submission, and explicit
  approved / submitted / platform state.
- **Governance:** owned, versioned decision-class taxonomy (§5.4/§5.6) with
  under-enumeration escalation; constraints-vs-preferences policy module (§5.3).
- **Failure & recovery (§5.7):** typed fail-closed failures and a governed human-only
  fallback mode.
- **Silence as a signal (§6):** persisted suppressed interpretations, review sampling,
  and a silence-rate metric endpoint.
- **Provenance & privacy (§4, §7.2):** W3C PROV-DM profile export and access-level audit
  redaction.
- **Evaluation (§7, §7.1, §7.2):** fault-injection localisation harness, interpreter
  faithfulness perturbation probes, A/B/B′/C/D/E ablation scaffold, reason-code regression
  labels, and frozen spec identifiers (`spec-versions.json`).

## 0.1.0 - 2026-07-20

- Initial public reference implementation of the Philosophy Layer architecture.
- Includes explicit interpretation, two human gates, semantic conformance,
  exact-state approval records, audit events, and evaluation scenarios.
