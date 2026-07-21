# Limitations

This document is the single in-repo place where scope and caveats live. The
README links here; keep this file authoritative and let other surfaces echo it.

## 1. Axis separation — what this repo does and does not show

This implementation is **axis-1 feasibility evidence** (§7.1). It demonstrates
that the paper's mechanisms instantiate, behave as specified, and replay.

It is **not** evidence for the paper's central empirical claim (§10 — the
B′-vs-C fault-localisation contrast): that isolating interpretation into a
typed, rejectable artefact makes judgement faults easier to detect, localise,
and correct than a monolithic step. That claim requires a human-subject study
(outcome + review-process) which this repository does not contain or run.

In particular, the fault-localisation traces show that the mechanism *can*
localise a traceable fault. They do **not** show that localisation helps a
human reviewer. Do not cite any listing, trace, or figure here as support
for §10.

## 2. Scope assumptions on proven mechanisms

Two mechanisms are proven only under stated assumptions, as of vX / commit Y:

- **Exact-state binding (§5.2.1)** — demonstrated single-process. The
  invalidation logic and ordering are shown correct, but not hardened for
  distributed or adversarial deployment.
- **Submission state machine (§5.2.2)** — at-most-one and the
  approved/submitted/platform split hold single-process and non-adversarial.

These are scope notes, not gaps: the mechanisms behave as specified within
these assumptions. Running outside them (multi-process, adversarial,
distributed) is outside proven scope and guarded by a runtime assertion.

## 3. Honoured boundary claims (unprovable by construction)

The following are reproduced, not solved (§1.1, §7.2):

- Does not make the model wiser or more correct.
- Establishes no legal accountability or legitimacy.
- Confabulation is unlocatable — the fault-injector localises it to
  `UNLOCATED` rather than pinning it to a step.
- Adversarial context is not addressed.
- External byte-identity is not guaranteed.

## 4. Versioning

The assumptions in §2 are bound to vX / commit Y. If the implementation is
later made distributed or adversarial-resistant, update this file, the README
scope note, and the affected paper sections (§5.2.1–5.2.2, §7.2) together —
the caveat must not silently expire.
