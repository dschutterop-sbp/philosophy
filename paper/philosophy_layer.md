> Copyright © 2026 Daniel Schutterop  
> Licensed under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/).

# Abstract

Most AI-assisted systems are built from two components: **context** (the facts available to the system) and a **skill** (structured instructions defining what the system may do and which constraints must be enforced).

Facts establish what is true. Skills determine what is valid. Neither answers the question that matters most whenever multiple technically acceptable outputs exist: *what is appropriate?*

This paper introduces the **Philosophy layer**: a structured, versioned representation of organisational intent, audience, character and decision principles, executed as an explicit interpretation step between verified context and deterministic execution.

The Philosophy layer does not make a language model better at interpretation than at generation. The interpreter is the same class of model and remains subject to the same failure modes. What the layer does is make interpretation **inspectable, testable, versionable and rejectable** before any artefact exists. The value is architectural, not magical: judgement becomes a reviewable pipeline stage instead of an invisible property of the output.

This is an architectural position paper. It defines the mechanism, its boundaries and a path to empirical evaluation rather than claiming validated performance gains.

---

# 1. The Problem

The idea emerged from a small automation problem: generating an Instagram Story for Il Tiratore, my son's ice cream cart, in response to a real-world trigger: the cart opens, the weather improves, a product becomes available.

The obvious architecture:

```text
Trigger → Context → Content generation → Validation → Human approval → Publication
```

The skill contains the obvious constraints: verified products and prices only, no invented opening hours, correct dimensions, mandatory notices, maximum one emoji and no publication without approval.

Given this factual context:

```json
{
  "event": "cart_opened",
  "weather": "sunny",
  "temperature_c": 25,
  "available_products": ["Aperol Spritz Sorbet", "Limoncello Spritz Sorbet"],
  "price": "€5",
  "contains_alcohol": true
}
```

a fully compliant result might be:

> Sunny today.
> Come and enjoy a refreshing sorbet.
> Aperol Spritz and Limoncello Spritz · €5
> Contains alcohol · 18+

Factually correct. Rule-compliant. Interchangeable with content from almost any hospitality business on earth.

The structural gap:

```text
Facts answer:    What is true?
Skills answer:   What is allowed and technically valid?
Neither answers: What is relevant here?
```

Without that third answer, generative systems fall back on category patterns. Warm weather produces sunshine language. Availability produces urgency. A social post produces a call to action. Statistically plausible, contextually empty.

The relevant interpretation of a warm Sunday is not "it is sunny, so mention the sun." It is: *people are already outside, engaged in leisure and receptive to spontaneous small pleasures; the product can become a natural part of an afternoon already in progress.* That interpretation leads to a different class of output:

> One more good thing for the afternoon.

The specific wording is unimportant. What matters is that an interpretation was **selected before generation began**.

---

# 2. The Philosophy Layer

**The Philosophy layer is a versioned decision layer that transforms verified context into an explicit interpretation of relevance, intent and appropriate action before execution begins.**

It contains the stable organisational knowledge needed to decide what factual context *means* before an artefact is generated:

* why the organisation exists;
* who it serves, described as **people in situations**, not demographic segments;
* its character, defined positively and negatively, including what it refuses to be: sentimental, desperate for attention or dependent on clichés;
* which opportunities are worth communicating;
* when silence is preferable to output.

The Philosophy is normative rather than merely descriptive. It represents how the organisation intends to judge situations, not simply how it has behaved in the past.

It is not a tone-of-voice guide. Tone determines how something sounds. The Philosophy layer helps determine whether something is worth saying at all and which part of the situation carries the meaning.

Its first output is not a caption or a creative concept. It is a machine-readable interpretation:

```json
{
  "observation": "A warm afternoon is drawing people outdoors.",
  "context_evidence": ["cart_opened", "weather:sunny", "temperature_c:25"],
  "principles_applied": [
    "audience.already_in_a_good_moment",
    "character.calm",
    "communication.no_forced_urgency"
  ],
  "organisational_relevance": "The product fits naturally into spontaneous leisure moments.",
  "recommendation": "develop_direction",
  "decision_class": "audience_moment_extension",
  "semantic_direction": "Treat the product as a natural addition to an afternoon already underway.",
  "rejected_frames": ["heat_relief", "urgency"],
  "avoid": ["generic summer language", "discount messaging", "forced category clichés"]
}
```

Creative Direction can then explore one or more concrete expressions within those semantic boundaries. The Skill Executor converts the selected direction into a valid artefact.

Some practical reasoning principles that belong in this layer:

* **The event is not always the story.** A trigger reports change; it does not decide which aspect of the change matters.
* **Human behaviour matters more than raw conditions.** Weather, time and availability are usually relevant because of what they make people *do*.
* **A specific observation beats generic enthusiasm.** "People are already outside" is more useful than "What a beautiful day."
* **Silence is a valid result.**

## 2.1 A Philosophy in Practice: The Il Tiratore Excerpt

Abstract descriptions of the layer invite a fair objection: perhaps writing a good Philosophy is no easier than writing a good prompt, in which case the judgement burden has merely been relocated onto a document author. The honest answer is that the burden *is* relocated (that is the design), but it lands in a short, stable and reviewable document rather than in a per-request prompt or in the head of whoever last edited the system. The excerpt below is the core of the actual Il Tiratore Philosophy, lightly edited for publication:

> **How we began.** The initiative began in 2021 as a first job for my son: a safe setting in which to learn how a business works while making people happy with proper ice cream. It escalated when I took up ice-cream making as a very over-engineered hobby. Today the cart sells only what is made in the home workshop. The operating rule is simple: zero room for error in production and 100% room for fun at the cart.
>
> **Who we serve.** Cyclists, walkers and people in small boats passing through a shrinking village and pausing at the canal. We serve people who are already in the middle of a good moment outdoors. We do not summon people to one. A scoop is a small pleasure added to an afternoon by the water in the sun. We facilitate that because we know how good it is to sit here.
>
> **Who we are not.** The loud gelateria with a singing showman behind the scoop.
>
> **On the name.** *Il Tiratore* literally means "the marksman". Internally it is a wink at aiming true: exactness. Externally we tell exactly one story: precision. No weapons. No explanation.
>
> **Character: what we are.** An artisan workshop. Laboratory precision. High-grade ingredients and materials. Calm, space and trust.
>
> **Character: what we refuse to be.** Childish or shouty Italian cliché. Vintage-retro styling. Stock-photo cheerfulness.

Three properties of this document do the operational work.

First, the audience is described as **people in situations**, not demographics. "People already in the middle of a good moment" is an interpretive instruction: it tells the interpreter to look for what the audience is *doing*. It also forbids rescue framings. The audience is not suffering, waiting or in need of persuasion.

Second, the **anti-patterns are executable**. Return to the compliant-but-empty caption "Beat the heat with our ice-cold treats." It violates no skill constraint, yet this Philosophy rejects it on three independent grounds: heat-relief urgency contradicts *calm*; the phrasing is textbook stock-photo cheerfulness; it frames the audience as overheated people needing relief rather than people whose afternoon is already good. Meanwhile "One more good thing for the afternoon" survives every clause. A one-page document performs a semantic filtering task that no format validator can.

Third, the document can hold **asymmetric knowledge**. The internal meaning of the name is available to the interpreter as identity context, while the external rule ("one story: precision, no explanation") prevents it from surfacing in output. Internal language may also be warmer than published copy. "A small pleasure" can guide interpretation without requiring sentimental language in the artefact. A monolithic prompt can express these distinctions, but it cannot isolate, test and version them as an independent decision layer.

The excerpt is deliberately small. A Philosophy that needs fifty pages has usually absorbed context, Strategy or tone-of-voice material that belongs elsewhere (§9).

---

# 3. What This Solves and What It Does Not

The Philosophy Interpreter is itself a language model. A model that writes clichéd captions can write clichéd interpretations with equal fluency. Separating interpretation from generation does not, by itself, make the interpretation better. **The judgement problem is not solved; it is moved one layer up, into the open.**

That relocation is the contribution. It buys four concrete things:

**Inspectability.** A reviewer can reject an interpretation before any design, rendering or copywriting effort is spent. "The system thinks this event is about heat relief" is visible and refutable; the same assumption buried inside a finished Story is not.

**Error localisation.** A weak output may stem from incorrect facts, weak interpretation, poor execution, an unsuitable template or failed validation. Without separation, all of these collapse into "the AI generated something bad." With separation, feedback updates the correct layer.

**Constraint at the semantic level.** Traditional guardrails exclude invalid output. The Philosophy layer adds a **semantic guardrail** that can reject output which is valid in form but weak in meaning. The sentence "Beat the heat with our ice-cold treats" violates no policy, yet the Philosophy of §2.1 rules out the entire heat-relief framing before it is written.

**Versionable intent.** Organisational judgement becomes an artefact under version control, testable in isolation, rather than folklore distributed across prompts.

The system's outputs are not guaranteed to be good. The architecture makes them accountable. Accountable systems can be improved deliberately rather than through undirected prompt-tinkering.

## 3.1 Cost Boundary and Deployment Assumptions

An explicit interpretation stage adds a model call per trigger, a reviewable artefact per event and a governed document with an owner and an approval path. The architecture therefore introduces real cost in inference, latency, review effort and operational complexity. This paper does not attempt to prove that the trade is favourable in every domain.

In the reference domain, there are only a handful of triggers per day. Marginal inference cost is small compared with the reputational cost of publishing generic or incorrect material under the organisation's name. In that low-frequency and high-stakes setting, cost is unlikely to dominate the deployment decision.

That calculus is a property of the domain, not of the architecture. The generalisations in §8, including customer support, incident communication and scheduling, can operate at orders of magnitude more triggers. Added latency, an extra call per event and human review load must then be priced against the accountability benefit. Whether the trade remains favourable in high-frequency settings is part of the evaluation agenda, not an assumed result.

---

# 4. Related Work

The idea has neighbours. It is worth being precise about where it sits.

**Constitutional AI** uses an explicit set of principles to steer model behaviour through critique and revision [1]. The Philosophy layer borrows the core move of externalising principles rather than leaving behaviour wholly implicit. It applies that move to *organisational* rather than *ethical* judgement and at the level of an application pipeline rather than model training.

**Chain-of-thought approaches** show that eliciting intermediate reasoning can change model performance on some tasks [2]. The Philosophy layer uses a domain-specific and schema-constrained reason-then-generate pattern. The persisted interpretation is not presented as a faithful transcript of private model cognition. It is an operational rationale that can be reviewed, tested and rejected.

**Deliberative Alignment** trains models to recall and reason over explicit safety specifications before answering [5]. This is a closer neighbour than generic chain-of-thought because both approaches separate specification-aware interpretation from final response production. The distinction is one of scope and mechanism. Deliberative Alignment is a training method for model-level safety behaviour. The Philosophy layer is an application-time architecture for organisation-specific judgement, with a persisted decision artefact, independent versioning, human approval and downstream conformance checking.

**Model constitutions and behavioural specifications** provide explicit descriptions of intended model behaviour. OpenAI's Model Spec defines intended behaviour and an instruction hierarchy [6]. Anthropic's 2026 Claude Constitution describes values, character and behavioural principles at model level [7]. These documents resemble a Philosophy in their normative content, but they govern a general-purpose model. The Philosophy layer is narrower: it represents the intent of one organisation or system and participates directly in a runtime decision chain.

**LLM-as-judge** evaluates outputs after generation. The Philosophy layer front-loads a related mechanism by constraining the interpretation space before generation. The same principle document later serves as the rubric for semantic conformance (§5.2) and automated evaluation (§7). Known LLM-judge biases remain relevant, including sensitivity to fluency, position and self-enhancement [3].

**AI Policy Projector** introduces a concept layer that helps policy designers make the behavioural regions covered by a policy explicit [8]. It is related in its effort to expose policy choices that would otherwise remain implicit. The Philosophy layer focuses on runtime interpretation of verified context rather than interactive policy authoring, but both treat conceptual structure as a governed object rather than incidental prompt wording.

**Policy and mechanism separation** is a longstanding systems design principle: mechanism provides capability while policy determines how that capability should be used [4]. The Philosophy layer follows the same architectural instinct, but addresses a narrower distinction. A policy or Skill determines which actions are permitted and executable. A Philosophy helps select which permitted action is appropriate in a particular situation.

**Brand guidelines and system prompts** are the obvious incumbent. Functionally, the Philosophy layer is prompt content. There is no exotic mechanism. A monolithic system prompt can express stable principles, temporary context, output rules and operational data. Its weakness is that these concerns are mixed into one artefact and cannot be independently versioned, evaluated, approved or traced through the pipeline. The distinction is architectural, not conceptual.

The contribution is not a new model capability. It is a disciplined architecture for exposing, testing and governing interpretation.

---

# 5. Architecture

```text
1.  Trigger                  A relevant event occurs.
2.  Context Builder          Verified facts are collected. No interpretation.
3.  Philosophy Interpreter   Determines what the event means and whether action is warranted.
4.  Creative Direction       Explores expressions of that meaning. No final artefacts yet.
5.  Skill Executor           Converts the selected direction into a valid artefact.
6.  Deterministic Validation Checks format, facts, policy and required elements.
7.  Semantic Conformance     Checks that the artefact stayed inside the approved interpretation.
8.  Human Review             Approves interpretation and artefact together.
9.  Publication              Publishes the exact approved artefact, unmodified.
10. Audit                    Records the complete decision chain.
```

Responsibilities stay separated. The Context Builder introduces no creativity. The interpreter modifies no facts. The Philosophy layer determines what the situation means, whether action is warranted and which semantic boundaries apply. Creative Direction explores how that meaning might be expressed. The Skill should minimise discretionary judgement. It owns executable constraints and operational validity, while the Philosophy owns stable principles for choosing among valid actions.

The boundaries can be stated compactly:

| Layer | Primary question | Typical rate of change |
|---|---|---|
| Context | What is true now? | Per event |
| Philosophy | What does this mean and what is appropriate? | Rarely |
| Strategy | What are we currently trying to achieve? | Per campaign or operating period |
| Skill | What can and must be executed validly? | When capability or policy changes |
| Creative Direction | How can this approved meaning be expressed? | Per artefact |

The boundaries are not claims that any layer is value-free. A Skill still encodes choices about validity, approval and required notices. The separation concerns the *kind* of judgement each layer is allowed to exercise.

## 5.1 Creative Direction Is a Bounded Exploration, Not a Hidden Judge

Earlier drafts left this stage underspecified, which risked reintroducing exactly the invisible judgement the architecture exists to eliminate. The stage is therefore defined as strictly as its neighbours.

**Input** is a single approved interpretation. **Output** is one to three candidate directions, each a small structured artefact of its own:

```json
{
  "direction_id": "dir_002",
  "concept": "A single scoop photographed on the cart's counter, canal in the background, caption addressed to an afternoon already in progress.",
  "fit": "Expresses 'natural addition to an afternoon underway' without naming the weather.",
  "nearest_avoid": "generic summer language",
  "risk_note": "Canal imagery must not drift into vintage-retro styling."
}
```

Each candidate declares which prohibited direction it sits closest to. That inverts the usual creative brief: instead of hiding risk, the stage surfaces its own most likely failure mode for the reviewer and the conformance check downstream.

**Selection semantics** are explicit. By default a human selects among candidates; this is a cheap decision made on short structured texts, not on rendered artefacts. A configuration may allow automatic selection for low-stakes, high-frequency use, but only with the semantic conformance check active and the unselected candidates logged, so the choice remains auditable rather than silent.

**Boundaries.** Creative Direction inherits the interpretation's `semantic_direction` and `avoid` list verbatim and may not weaken them. It may not introduce facts, products, prices or claims absent from verified context. It decides *how* meaning is expressed; it never revisits *whether* or *why*.

## 5.2 Semantic Conformance: Closing the Gap Between Interpretation and Artefact

An approved interpretation constrains generation only if something verifies that the artefact stayed inside it. Deterministic validation cannot do this by definition: it checks format, facts, policy and required elements. An executor that ignores the interpretation and produces a perfectly formatted sunshine cliché would pass step 6 untouched. Without a conformance check, the pipeline approves one rationale and publishes something else. Hidden judgement has merely returned through the back door.

The conformance stage checks the artefact against the interpretation that produced it, using the asymmetry established in §7: **negative criteria first**. Questions such as "Does this artefact use generic seasonal framing?" and "Does it introduce urgency?" define narrower and more tractable classification tasks than the open-ended question "Is this artefact good?" The `avoid` list of the interpretation and the anti-patterns of the Philosophy are evaluated as individual violation checks. A confirmed violation blocks the artefact and returns it to step 4 or 5 with the violation named. Positive fit with the `semantic_direction` is advisory signal only. An authorised human reviewer remains the authority on quality.

Human review then sees the interpretation and the artefact **side by side**, with the conformance result attached. The reviewer approves a pair, not a caption.

The approval token binds that pair to a canonical approval manifest:

```json
{
  "draft_id": "draft_0042",
  "interpretation_hash": "sha256:...",
  "media_hash": "sha256:...",
  "text_hash": "sha256:...",
  "account_id": "account_07",
  "scheduled_time": "2026-07-19T14:00:00+02:00",
  "approver_role": "publisher",
  "expiry": "2026-07-19T15:00:00+02:00"
}
```

```text
approval_token = sign(canonical_hash(approval_manifest))
```

If the artefact changes, the approval is invalid. If the interpretation changes, the approval is equally invalid. The system cannot present one rationale for review and publish under another. This extends the original guarantee from "the exact artefact" to "the exact artefact for the exact reason" without pretending that this paper specifies a complete cryptographic protocol.
## 5.3 Precedence and Authorised Override

When layers conflict:

```text
1. safety, law and non-overridable governance controls
2. verified facts
3. hard Skill constraints for security, compliance and system integrity
4. authorised human instruction
5. overrideable Skill defaults
6. Philosophy principles
7. model creativity
```

A Philosophy may favour visual simplicity, but it may not remove a legally required warning. A creative direction may be strong, but it may not invent availability. Interpretation begins after reality has been established.

Human authority is role-bound rather than absolute. An authorised person may override operational defaults, Philosophy recommendations and model choices. They may not override safety, law, verified facts or hard governance controls merely by issuing a prompt. Changing those controls requires the appropriate governance action, permissions and audit trail.

The operational success metric of a well-specified Philosophy is that authorised overrides become *rarer*, never that they become impossible. An override also remains subject to exact-state approval. Changing the artefact or its rationale invalidates the existing token, after which the resulting pair must be approved as a new state. Authorised human control and exact-state binding are complementary, not in tension.
## 5.4 Versioning

Every published artefact records the versions that produced it:

```json
{
  "philosophy_version": "1.2.0",
  "strategy_version": "2026-summer-03",
  "skill_version": "0.4.1",
  "template_version": "2.1.0",
  "conformance_policy_version": "0.3.0",
  "interpretation_id": "interp_0042",
  "direction_id": "dir_002",
  "draft_id": "draft_0042"
}
```

Consistently generic output points to an underspecified Philosophy. Right principles but wrong angles point to the interpreter. Appropriate directions producing non-conforming artefacts point to the executor. Appropriate content failing validation points to the skill. Without versioning, these distinct failures collapse into "the AI produced poor content."

## 5.5 Governance and Ownership

The Philosophy layer contains normative organisational judgement, so changing it is a governance action rather than ordinary prompt maintenance.

Every Philosophy should have an explicit owner, a documented approval path and provenance for each change. Production feedback may generate a proposed amendment, but it should not silently rewrite the Philosophy. Human decisions are evidence for principle formation, not automatically correct principles. The same decisions can still be authoritative regression labels after review and adjudication, as described in §7.

Stable organisational principles belong in the Philosophy. Temporary campaign objectives, local operating targets and short-lived preferences belong in context or a separately versioned Strategy layer. This prevents tactical choices from quietly becoming institutional values.

In larger organisations, access should be role-based. Material changes should record who proposed them, who approved them, the rationale and the historical scenarios used to test the new version. Conflicts between teams should be resolved through explicit ownership, documented adjudication and the precedence model rather than by whichever prompt was edited last.

---

# 6. Silence Is a Decision

Automation biases towards action: a trigger fires, so the system must produce something. Otherwise the trigger feels wasted.

That assumption is harmful in communication systems. A trigger means something changed, not that the change is worth an audience's attention. The Philosophy layer must therefore be allowed to return:

```json
{
  "recommendation": "do_not_publish",
  "reason": "Operationally valid event, no meaningful audience-facing story."
}
```

Routine events, recently covered ground, poor timing and having nothing distinctive to say are all legitimate reasons. A system that can only generate is not exercising judgement; it is executing throughput.

The mirror principle applies to the Philosophy itself: **anti-patterns are first-class inputs**. What the organisation refuses to become is often more operationally useful than what it aspires to be because generative models reproduce category conventions with ruthless efficiency. A Philosophy that cannot reject anything provides no value.

---

# 7. Testing and Evaluation

This is the hardest part of the design. It deserves a direct answer rather than a gesture.

Skills can be tested against exact outputs. Interpretations cannot, because several valid interpretations may exist for one scenario. Testing therefore targets a **valid interpretation space**, defined per scenario by required characteristics and prohibited directions:

```json
{
  "scenario": { "weather": "sunny", "temperature_c": 25, "business_status": "open" },
  "required": [
    "focuses on audience behaviour rather than weather description",
    "permits but does not require publication"
  ],
  "prohibited": [
    "urgency without evidence",
    "generic seasonal framing",
    "discount messaging"
  ]
}
```

Who judges whether an interpretation falls inside that space? Three mechanisms are used, in order of authority:

1. **Human review provides the authoritative regression label.** Every reviewed production approval or rejection can become a labelled example. Reviewer identity, rationale and disagreement should be recorded. Conflicting labels require adjudication rather than silent majority voting. The corpus accumulates from real decisions, which keeps it anchored to organisational practice rather than a spec author's imagination. The same decisions carry a weaker status for *principle formation*: there they are evidence that must pass the governance path of §5.5 before changing the Philosophy. Authoritative for regression and advisory for norms is a deliberate asymmetry.

2. **An LLM judge handles regression at scale.** It scores candidate interpretations against required and prohibited criteria. This inherits the known weaknesses of LLM-as-judge, so the judge must be versioned, calibrated against the human-labelled corpus and prevented from overriding adjudicated labels. It detects candidate regressions between Philosophy versions. It does not define correctness.

3. **Prohibited directions provide the narrowest automated signal.** "Does this interpretation introduce urgency?" is more tractable than "Is this interpretation good?" Negative checks can therefore carry more automated weight in testing and runtime conformance (§5.2). Positive quality remains primarily a human judgement until the claim has stronger empirical support.

Additional test dimensions include consistency across similar scenarios, stability under small context perturbations, reviewer agreement and replay of the historical corpus after every Philosophy version bump to detect silent behaviour shifts.

## 7.1 Ablation Evaluation

The first empirical test should compare several systems over the same scenario corpus rather than bundling all architectural changes into one A/B test:

```text
A. Context + monolithic prompt + generation
B. Context + explicit Philosophy interpretation + generation
C. Context + Philosophy interpretation + Creative Direction + generation
D. Full pipeline with Skill execution + deterministic validation + Semantic Conformance
```

Where practical, the systems should use the same base model, comparable sampling settings and a controlled total token budget. This will not remove every confound, but it reduces the risk of mistaking extra inference or a longer prompt for architectural benefit.

Reviewers who do not know which system produced which result should score:

* factual correctness;
* relevance to the audience's situation;
* distinctiveness from category clichés;
* consistency with organisational principles;
* appropriate use of silence;
* number and type of human corrections required;
* review time per accepted artefact;
* false rejection rate for acceptable artefacts.

The interpretation artefacts should also be scored separately. This reveals whether a stronger final result came from better judgement or merely better wording. The experiment should additionally measure:

* **error localisation accuracy:** whether reviewers identify the responsible layer correctly;
* **interpretation-to-artefact divergence:** how often execution escapes the approved semantic direction;
* **semantic conformance rejection rate:** how often the conformance stage catches such divergence;
* **override frequency:** how often an authorised human changes the recommendation or rationale;
* **correction depth:** how many pipeline stages must be repeated before approval.

The experiment would not prove universal superiority. It would test the paper's central architectural claim: separating interpretation makes judgement more inspectable, makes failures easier to localise and supports more deliberate improvement.

This is not a solved evaluation problem. It is tractable because the layer's output is small, structured and semantically narrow, which makes it easier to judge than a finished creative artefact.

## 7.2 Threats to Validity

Several failure modes could make the architecture look more accountable without making it more correct.

**Correlated model failure.** If the interpreter, executor and conformance judge use the same model family, they may share the same blind spots and approve one another's mistakes.

**Rationale laundering.** A fluent interpretation can make an arbitrary choice appear principled after the fact. Persisted rationale is an operational decision record, not proof that it caused the model's internal decision.

**Reviewer drift.** Human reviewers may become inconsistent over time or adapt their judgement to the system's recurring outputs. Versioned reviewer guidance, disagreement tracking and periodic recalibration are therefore necessary.

**Philosophy ambiguity.** A vague Philosophy can produce apparently compliant interpretations that point in conflicting directions. The architecture exposes this problem but does not solve normative disagreement.

**Governance capture.** A formally governed Philosophy may still encode the preferences of the most powerful editor rather than the organisation as a whole. Provenance and approval records make this visible, but visibility is not legitimacy.

**Evaluation leakage.** A system tuned repeatedly against a small historical corpus may overfit its reviewers while failing on genuinely new situations. Holdout scenarios and prospective evaluation are required.

---

# 8. Beyond Social Media: A Hypothesis

The pattern plausibly applies wherever a system must choose among several valid actions: customer support, where procedural accuracy competes with generous resolution; incident communication, where technical detail competes with acknowledgement or silence until facts are verified; scheduling, where focus time competes with responsiveness; recommendations, where several options satisfy the same criteria but embody different trade-offs.

These are hypotheses, not results. The evidence in this paper covers one small system in one domain. The generalisation argument is structural: the valid-versus-appropriate gap exists in all of these settings. Whether the same architecture closes that gap elsewhere remains unverified. Whether its cost profile survives high-frequency domains is a separate open question of equal importance. Those are the obvious next experiments.

---

# 9. Anti-Patterns

* **Philosophy as a larger prompt.** Mixing stable principles with temporary context and operational data produces an artefact whose concerns cannot be independently tested, versioned or governed. Prices, stock, opening hours and campaign data belong in context or Strategy, not Philosophy.
* **Philosophy as tone of voice.** Tone is one component. It decides nothing about relevance or whether to communicate at all.
* **Philosophy as permission to invent.** Interpretation explains why facts matter. It may not create facts.
* **Philosophy as accumulated habit.** Repeated historical behaviour is evidence, not proof that the behaviour should become a principle.
* **Hidden interpretation.** If only the final artefact is visible, reviewers cannot distinguish poor reasoning from poor execution.
* **Approved interpretation, divergent artefact.** If nothing verifies that the executor stayed within the interpretation's boundaries, the pipeline approves reasoning and publishes something else. Semantic Conformance (§5.2) exists to close this gap. A pipeline without it has moved hidden judgement one stage downstream.
* **Mandatory output.** A Philosophy that cannot recommend silence is incomplete.
* **Static Philosophy without feedback.** If repeated human corrections never generate proposed amendments or test cases, the system repeats the same conceptual mistakes with perfect version hygiene.
* **Self-modifying Philosophy without governance.** Feedback may propose changes, but an operational model should not silently redefine organisational intent.
* **Universal human override.** Treating every human instruction as authorised control collapses governance into prompt injection. Overrides must be role-bound, auditable and limited by hard constraints.

---

# 10. Conclusion

The original problem looked like generating an Instagram Story. The deeper problem is representation: how can an AI system communicate on behalf of an organisation without reducing it to a tone-of-voice guide and a list of prohibitions?

Facts establish reality. Skills enforce execution. Guardrails prevent invalid behaviour. None of them select the appropriate output from the space of valid ones.

The Philosophy layer fills that gap, not by making the model wiser but by forcing its judgement into the open: a structured interpretation produced before generation, bound to versions, checked against the artefact it authorised, subject to review and free to conclude that the right output is none at all.

A warm day is not valuable because it justifies a sun emoji. It is valuable because it changes what people do. The Philosophy layer lets the system recognise that before the Skill writes a single word.

> A Skill creates the artefact.
> A Philosophy helps the system decide why the artefact should exist and records the rationale that authorised it, so a human can reject the decision before publication.

---

# References

1. Bai, Y. et al. (2022). *Constitutional AI: Harmlessness from AI Feedback*. arXiv:2212.08073. https://arxiv.org/abs/2212.08073
2. Wei, J. et al. (2022). *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*. Advances in Neural Information Processing Systems 35. arXiv:2201.11903. https://arxiv.org/abs/2201.11903
3. Zheng, L. et al. (2023). *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena*. Advances in Neural Information Processing Systems 36. arXiv:2306.05685. https://arxiv.org/abs/2306.05685
4. Levin, R., Cohen, E. S., Corwin, W. M., Pollack, F. J. and Wulf, W. A. (1975). *Policy/Mechanism Separation in Hydra*. Proceedings of the Fifth ACM Symposium on Operating Systems Principles, 132-140. https://doi.org/10.1145/800213.806531
5. Guan, M. Y. et al. (2024). *Deliberative Alignment: Reasoning Enables Safer Language Models*. arXiv:2412.16339. https://arxiv.org/abs/2412.16339
6. OpenAI. (2025). *Model Spec*. Version dated 18 December 2025. https://model-spec.openai.com/
7. Anthropic. (2026). *Claude's Constitution*. January 2026. https://www.anthropic.com/news/claude-new-constitution
8. Lam, M. S., Hohman, F., Moritz, D., Bigham, J. P., Holstein, K. and Kery, M. B. (2024). *AI Policy Projector: Grounding LLM Policy Design in Iterative Mapmaking*. arXiv:2409.18203. https://arxiv.org/abs/2409.18203
