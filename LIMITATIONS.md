# LIMITATIONS.md — what this reference does *not* establish

This file is the plain-language companion to
[CONFORMANCE.md](CONFORMANCE.md). The conformance matrix binds every testable
paper claim to a locus and a status; this file explains the three places where
the status is deliberately *less* than "proven", so a reader does not mistake
feasibility evidence for an empirical or security result. The paper itself
([paper/philosophy_layer.md](paper/philosophy_layer.md)) stays a position paper;
[README.md](README.md) describes what runs; this file states the limits.

The three axes are defined in [CONFORMANCE.md](CONFORMANCE.md#axes):

- **M** — mechanism / feasibility (all the code can establish),
- **E** — the falsifiable §10 empirical core (needs human subjects),
- **B** — boundaries the paper draws negatively (reproduced, not solved).

## 1. Scope of the mechanism evidence (axis M)

Every `proven` row in [CONFORMANCE.md](CONFORMANCE.md) is *feasibility evidence*
under paper §7.1: the mechanism instantiates and replays as specified
(`node --test`). It shows the architecture **can** be built and behaves as
described. It does **not** show the architecture improves human judgement — that
is axis E, and it is not run here (see §3).

## 2. Conditional guarantees (`proven*`)

Two rows in the matrix are `proven*` — proven only under stated assumptions
(v1.0 / commit `5ba0937`, single-process, non-adversarial). They are scope
notes, not gaps, but they must not be read as unconditional.

1. **Submission state machine (§5.2.2).**
   `server/adapter.js#IntentStore` transitions each idempotency key
   `unused → claimed → terminal` and refuses replay, giving **at-most-one**
   authorised adapter submission per intent. This holds **within one process**:
   the store is an in-memory `Map`, so the guarantee assumes a single-process,
   single-instance deployment. A multi-instance or restart-tolerant deployment
   must back this with an atomic, durable, append-only store; the exactly-once
   property does not survive a shared-nothing horizontal scale-out as written.

2. **Approval hardening (§5.2.1 / §5.2.2).**
   `server/approval.js` (HMAC over a canonical hash of the bound state) and
   `server/adapter.js#verifyForSubmission` (destination, account, adapter
   version, time-ordering and payload-hash checks) enforce exact-state binding
   and refuse a mismatched or expired bundle. The security claim is **conditional
   on**: a trustworthy, atomic intent store; a correct wall clock for expiry and
   `latest_bound_input ≤ approved ≤ scheduled ≤ expiry` ordering; and confidential
   custody of `APPROVAL_SIGNING_KEY`. It is a demonstrated mechanism, **not a
   full, audited publication-security protocol**, and it does not defend against
   a privileged out-of-band bypass (§5.2.1).

## 3. Not run — the empirical core (axis E)

The falsifiable claim of the paper — that typed, persisted, rejectable structure
makes judgement faults easier to detect, localise and correct than a monolithic
step (the **B′-vs-C** contrast, §7.1/§10) — is **not established here**. The
harnesses exist and run on the deterministic reference (`scaffolded`), but every
row that needs a live model and human reviewers is `not-run`:

- outcome study and review-process study (§7.1);
- authoritative human regression labels and the LLM-judge calibration to that
  corpus (§7);
- reviewability measures (time-to-premise, localisation accuracy…) (§7.1);
- the central B′-vs-C load-bearing contrast — `evaluation/ablation.js`
  represents it structurally so an outcome harness can layer on top, but the
  result itself is the research agenda, not a finding in this repository.

The perturbation probe (`evaluation/perturbation.js`) and fault-injection
harness (`evaluation/fault-injection.js`) *run* and pass on the deterministic
interpreter; that proves the harness, not the empirical claim about a live model.

## 4. Boundaries honoured, not solved (axis B)

The implementation reproduces each limit the paper draws negatively rather than
masking it. Most visibly, a fluent-but-non-operative rationale localises to
`unlocated` in `evaluation/fault-injection.js`: **confabulation is unlocatable**,
and the harness reports so instead of attributing the fault to a layer.
Rationale laundering, adversarial context in generalised domains, reviewer
drift, Philosophy ambiguity, governance capture, evaluation leakage, external
byte-identity of published content, and privacy-by-default of the audit trail
are all exposed as boundaries — see the §7.2 rows in
[CONFORMANCE.md](CONFORMANCE.md).

## 5. Deployment caveats

These are engineering limits of the *reference*, independent of the paper's
claims:

- **In-memory drafts and audit view.** `server/store.js` holds drafts and the
  in-memory audit view in process; a restart invalidates in-flight review links.
  Production needs durable, access-controlled draft storage and an
  access-controlled append-only audit sink.
- **Reference reviewer identity.** The built-in reviewer identity is a
  deployment-configured reference adapter, not authenticated identity/role
  claims. Replace it before treating this as a production authorisation system.
- **Configured inputs.** `RECENT_POSTS` (the silence input) is taken from
  deployment configuration until wired to a publishing-history adapter; live
  opening hours/products come only from configuration, never from the browser.
- **Decorrelated judge is a mitigation.** `OPENAI_CONFORMANCE_MODEL` can differ
  from `OPENAI_MODEL` to reduce correlated interpreter/judge failure. It is a
  mitigation, not proof of independence (§7.2).
