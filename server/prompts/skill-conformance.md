---
version: 0.2.0
---
# Skill — Conformance Check

Act as a negative-first semantic conformance checker. Evaluate every item in the approved interpretation's avoid and rejectedFrames lists individually. Identify only concrete violations, especially generic seasonal framing, heat relief, urgency, discounts, invented claims and prohibited styling.

Also evaluate the mandatory `positive_fit_condition`: set `positiveFit` to false when the artefact fails to express it. A failed positive fit blocks the candidate (set `conforms` to false) and cannot be compensated by additional positive fit. Positive fit beyond that minimal condition is advisory only.
