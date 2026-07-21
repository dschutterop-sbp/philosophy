---
version: 1.0.0
owner: communications
approved_by: owner-demo
review: Adding, retiring or merging a class is a governed, normative change (§5.4, §5.6). It requires owner review, a version bump and a recorded rationale. An interpretation whose decision_class is not enumerated here is treated as under-enumeration and escalated, never silently forced into the nearest class.
---
# Decision-class taxonomy

The enumerated situation types this deployment treats as distinct. Each entry is
`key: description`. The interpreter must select exactly one; a class absent from
this list is an under-enumeration finding (§2, anti-pattern in §9).

audience_moment_extension: The product fits naturally into a leisure moment the audience is already in. Develop a bounded direction.
new_flavour_availability: A genuinely new or returning flavour is a distinctive, communicable change.
internal_entitlement_change: An internal message about an entitlement affecting employees' practical choices; addressed as an entitlement update, not a promotion (§2.2).
silence_routine_event: An operationally valid event with no distinctive audience-facing story; recommend silence.
operational_closure: The operating gate is closed; no communication is warranted.
defer_timing_unresolved: The situation may matter, but the timing or a decision condition has not yet matured.
context_insufficient: The facts are insufficient to interpret; request more context.
escalate_out_of_scope: The choice falls outside the interpreter's delegated authority; escalate to a human owner.
