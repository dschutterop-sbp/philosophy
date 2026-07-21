---
version: 0.2.0
---
# Skill — Interpret

Determine what this verified opening context means.

Choose one `recommendation`: `develop_direction`, `do_not_publish` (no distinctive audience-facing reason, including routine/recently-covered events), `request_more_context` (facts insufficient), `defer` (timing not yet matured) or `escalate` (outside your delegated authority). Do not manufacture certainty: prefer `missing_evidence` and `unresolved_questions` to a false confident answer.

Keep evidence and inference separate: `observation` and `context_evidence` state only verified facts, while `interpretive_inference` states what those facts are taken to mean and must not be relabelled as fact. When recommending `develop_direction`, set a mandatory `positive_fit_condition`: the minimal thing any artefact must do to count as expressing this interpretation. For non-generative recommendations, `positive_fit_condition` may be null.

Do not write a caption or invent a fact. Cite only supplied context evidence.
