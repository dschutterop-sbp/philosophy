# Security policy

## Reporting a vulnerability

Please do not report security vulnerabilities in a public issue. Use GitHub's
private vulnerability-reporting feature in this repository's **Security** tab.
If it is not enabled, contact the repository owner directly through their
GitHub profile.

Include reproduction steps, impact, and any suggested mitigation. Do not
include live credentials in a report.

## Scope

This repository is a reference implementation. Its demo identity adapter,
in-memory draft store, and demo signing key are intentionally not production
security controls. A public deployment must use real authentication, durable
access-controlled storage, and `APPROVAL_SIGNING_KEY`.
