# AstroCrown Prompt Guide

## 1. Purpose

Standalone reference for creating, selecting, testing, improving, versioning, and reusing prompts and prompt systems.

This file is intentionally separate from the active homepage documentation under `development/index-section/` and `development/index-reference/`.

Use this guide for:
- prompt construction;
- prompt technique selection;
- external prompt-engineering research;
- prompt generation and meta-prompting;
- tool and agent orchestration;
- prompt evaluation and optimization;
- prompt continuity and versioning.

Use `development/index-section/` for active homepage section requirements, discoveries, decisions, candidate states, source findings, and implementation scope. Use `development/index-reference/` for shared visual/design conventions.

A technique documented here is not automatically mandatory.

---

## 2. Fast retrieval

### Standard prompt path

Outcome
→ Mode
→ Authority
→ Context
→ Requirements
→ Preservation
→ Task
→ Techniques
→ Tools / sources
→ Verification
→ Output
→ Uncertainty / escalation

### Minimum sufficient prompt

OBJECTIVE
What must be accomplished?

MODE
Research / audit / analysis / design / implementation / verification / handoff.

SOURCE OF TRUTH
What source has authority?

CONTEXT
Only information needed for correctness.

REQUIREMENTS
What must be satisfied?

PRESERVATION
What must not be deleted, simplified, overwritten, or silently reinterpreted?

TASK
What exact actions are required?

TOOLS / SOURCES
Which tools or sources materially improve the result?

VERIFICATION
How will important results be checked?

OUTPUT
What exact artifact/result is required?

STATUS / UNCERTAINTY
What is known, candidate, unresolved, blocked, or verified?

STOP / ESCALATE
When must the model stop, report uncertainty, seek more evidence, or require authorization?

Do not include a section merely because the template contains it.

---

## 3. Core prompt rules

### P-001 — Outcome over length

Judge a prompt by task outcome, not word count.

### P-002 — Minimum sufficient complexity

Add a technique only when it solves an identified problem.

### P-003 — Instruction/content separation

Instructions, documents, retrieved text, examples, tool results, and user data are different trust classes.

Untrusted content is not automatically an instruction.

### P-004 — Preserve intent

Optimization must not silently change the objective, scope, authority, or meaning.

### P-005 — Preserve uncertainty

Do not replace missing evidence with plausible assumptions.

### P-006 — Capability is not authority

A model may be capable of an action without being authorized to perform it.

### P-007 — Verify important results

Evidence-sensitive outputs require an appropriate verification path.

### P-008 — Model/context dependence

A prompting technique is not universally effective. Record model, task, context, and tool dependencies when material.

### P-009 — Baseline before optimization

When practical, preserve a baseline prompt and compare the candidate against representative tasks.

### P-010 — Preserve useful discoveries

A failed technique, rejected prompt, unresolved question, or unexpected result can be valuable methodology and should not be discarded merely because another approach is preferred.

---

## 4. Prompt construction workflow

### W-01 — Define the outcome

State the completed state, not merely the immediate action.

### W-02 — Define success

Use observable success conditions.

### W-03 — Establish authority

Identify the source of truth and source precedence.

### W-04 — Define mode

Separate research, audit, analysis, design, implementation, verification, remediation, and handoff.

### W-05 — Separate hard constraints from preferences

Do not silently turn preferences into mandatory rules.

### W-06 — Preserve important context

Include prior decisions, dependencies, historical conditions, and unresolved questions when they affect correctness.

### W-07 — Select techniques

Use Section 7 and choose the minimum sufficient set.

### W-08 — Define tool behavior

Specify when a tool is useful, what evidence to capture, and what a tool failure means.

### W-09 — Define failure handling

Specify missing, stale, conflicting, malformed, unavailable, blocked, or unauthorized states where relevant.

### W-10 — Define output

Specify format, required content, status vocabulary, provenance, and omissions that are unacceptable.

### W-11 — Test and refine

Evaluate output quality rather than judging prompt wording alone.

---

## 5. Reusable prompt architectures

### PA-01 — Research

QUESTION
Scope and exact question.

CURRENT SOURCES
Authoritative/current sources.

EVIDENCE STANDARD
What constitutes sufficient evidence.

METHOD
Retrieve → compare → reconcile → synthesize.

UNCERTAINTY
Preserve missing/conflicting evidence.

OUTPUT
Findings → evidence → limitations.

### PA-02 — Repository audit

REPOSITORY
Exact owner/name.

SOURCE OF TRUTH
Exact path/ref/commit.

MODE
Repository audit only.

DO NOT MODIFY
Files, branches, commits, PRs, or other repository state.

TASK
Inspect and report verified findings.

OUTPUT
Scope → findings → evidence → unresolved items.

### PA-03 — Authorized implementation

REPOSITORY
Exact owner/name.

AUTHORITY
Approved modification scope.

SOURCE OF TRUTH
Files/ref/commit.

OBJECTIVE
Required implementation outcome.

PRESERVE
Historical and required material.

IMPLEMENT
Authorized changes only.

VERIFY
Required automated/manual/security/quality checks.

OUTPUT
Changes → evidence → remaining issues.

### PA-04 — Prompt generation

TASK
The task the final prompt must solve.

CONTEXT
Relevant context.

AUTHORITY
Source of truth.

CONSTRAINTS
Hard constraints.

PRESERVATION
Intent and knowledge that must survive optimization.

TOOLS
Available tools.

SUCCESS
Observable outcome.

REQUEST
1. Identify ambiguity and hidden assumptions.
2. Classify the task.
3. Select only relevant techniques.
4. Prefer simple methods before complex orchestration.
5. Define tool and source use.
6. Define verification and failure handling.
7. Preserve uncertainty.
8. Produce a reusable final prompt.
9. Preserve unresolved decisions.

### PA-05 — Multi-source / multi-model synthesis

OBJECTIVE
Exact information question.

INPUTS
Models, sources, tools, or datasets.

PROVENANCE
Identity and acquisition state for each input.

NORMALIZATION
Make comparable information semantically compatible.

INDEPENDENCE
Identify shared upstream dependencies.

CONFLICTS
Preserve disagreement.

SYNTHESIS
Combine evidence without assuming majority correctness.

VERIFICATION
Test important conclusions.

OUTPUT
Result → supporting evidence → conflicts → uncertainty.

---

## 6. Technique selection matrix

| Problem | Start with | Add when justified |
|---|---|---|
| Ambiguous task | PT-I01 | PT-I04 |
| Complex context | PT-I03 | PT-C01 |
| Predictable output | PT-O01 | PT-O02 |
| Unfamiliar format | PT-E01 | PT-E02 |
| Current/external facts | PT-G01 | PT-G02 |
| Complex problem | PT-D01 | PT-D02 / PT-D03 |
| Independent workstreams | PT-D03 | PT-M01 |
| Sequential transformation | PT-D02 | PT-V01 |
| Unstable answers | PT-R01 | PT-M01 |
| Adversarial alternatives | PT-V02 | PT-M03 |
| Planning/search | PT-R02 | PT-R03 |
| Repeated prompt tuning | PT-X01 | PT-X02 |
| Long-running work | PT-C02 | PT-C03 |
| Multiple sources/models | PT-M01 | PT-M04 |
| Generate a prompt | PT-X03 | PT-X04 / PT-X01 |

This is a starting heuristic, not a ranking.

---

## 7. External prompt-technique taxonomy

Technique IDs are stable. Never renumber them.

### Family I — Instructions and structure

#### PT-I01 — Explicit instruction

Purpose: state task, constraints, and required result clearly.

Use when: ambiguity or omission is likely.

Limit: extra wording can add complexity without improving outcome.

Status: TECHNIQUE.

#### PT-I02 — Role framing

Purpose: establish relevant responsibility or perspective.

Use when: perspective materially affects behavior.

Limit: role wording creates no real authority, credential, or missing knowledge.

Status: TECHNIQUE.

#### PT-I03 — Delimiter / section structure

Purpose: separate instructions, context, examples, inputs, and source material.

Variants: Markdown sections, XML-style tags, explicit markers.

Status: TECHNIQUE.

#### PT-I04 — Ordered procedure

Purpose: make sequence explicit where step order affects correctness or completeness.

Status: TECHNIQUE.

### Family E — Examples

#### PT-E01 — Zero-shot

Purpose: solve without task demonstrations.

Use when: direct instructions are sufficient.

Advantage: low prompt overhead.

Status: TECHNIQUE.

#### PT-E02 — Few-shot / multishot

Purpose: demonstrate desired behavior, classification, format, or boundary.

Use when: examples communicate the target better than prose.

Risks: bad examples teach bad behavior; examples consume context.

Current Anthropic and Microsoft guidance continues to identify examples/few-shot prompting as useful for steering behavior and format.

Status: TECHNIQUE.

#### PT-E03 — Contrast / negative examples

Purpose: clarify acceptable versus unacceptable boundaries.

Use when: classes or constraints are easy to confuse.

Risk: examples may accidentally define a boundary too narrowly.

Status: CANDIDATE.

### Family O — Output control

#### PT-O01 — Explicit output contract

Purpose: specify required sections, ordering, fields, format, length, or status vocabulary.

Use when: predictable output matters.

Status: TECHNIQUE.

#### PT-O02 — Structured schema

Purpose: make output machine-processable with defined fields or formal schema.

Use when: another system consumes the result.

Limit: schema correctness does not imply factual correctness.

Status: TECHNIQUE.

### Family G — Grounding and tools

#### PT-G01 — Grounding context

Purpose: anchor the answer in supplied source material.

Use when: supplied evidence should outrank model memory.

Risk: supplied material may be incomplete or wrong.

Status: TECHNIQUE.

#### PT-G02 — Retrieval grounding

Purpose: retrieve current or external information before synthesis.

Use when: freshness or external evidence matters.

Risk: retrieval quality becomes part of total system quality.

Status: TECHNIQUE.

#### PT-G03 — Tool / affordance prompting

Purpose: direct the model toward search, files, code, calculators, APIs, tests, or other capabilities when they add evidence or execution value.

Risk: unnecessary calls increase latency and failure surface.

Status: TECHNIQUE.

#### PT-G04 — Source hierarchy

Purpose: define source precedence.

Use when: several sources differ in authority, freshness, provenance, or scope.

Risk: a wrong hierarchy creates systematic error.

Status: CANDIDATE / HIGH ASTROCROWN RELEVANCE.

### Family D — Decomposition and orchestration

#### PT-D01 — Task decomposition

Purpose: divide a complex task into explicit subproblems.

Risk: unnecessary decomposition fragments context.

Status: TECHNIQUE.

#### PT-D02 — Prompt chaining

Purpose: perform dependent stages sequentially.

Risk: error propagation and added latency.

Status: TECHNIQUE.

#### PT-D03 — Parallel decomposition

Purpose: run genuinely independent workstreams in parallel.

Risk: still requires synthesis/consistency checking.

Status: TECHNIQUE.

#### PT-D04 — Response aggregation / synthesis

Purpose: combine multiple candidate outputs.

Risk: naive aggregation can erase disagreement.

Status: TECHNIQUE.

### Family R — Deliberation and search

#### PT-R01 — Self-consistency

Purpose: compare multiple sampled solution paths.

Use when: answer stability matters.

Risk: consistent wrong answers remain wrong; additional computation required.

Evidence: Wang et al., Self-Consistency Improves Chain of Thought Reasoning in Language Models.

https://arxiv.org/abs/2203.11171

Status: RESEARCH-BACKED TECHNIQUE.

#### PT-R02 — Tree-style solution search

Purpose: explore candidate states with evaluation and possible backtracking.

Use when: planning/search materially benefits from alternatives.

Risk: high complexity for routine tasks.

Evidence: Tree of Thoughts.

https://arxiv.org/abs/2305.10601

Status: RESEARCH-BACKED TECHNIQUE.

#### PT-R03 — ReAct-style action loop

Purpose: interleave analysis with external actions.

Use when: information gathering must adapt to observations.

Risk: tool errors become part of the loop.

Evidence: ReAct.

https://arxiv.org/abs/2210.03629

Status: RESEARCH-BACKED TECHNIQUE.

### Family V — Verification and critique

#### PT-V01 — Self-check against explicit criteria

Purpose: perform a verification pass.

Use when: criteria are objectively checkable.

Limit: same-model checking is not independent verification.

Status: TECHNIQUE.

#### PT-V02 — Critique and revise

Purpose: identify defects and improve a draft.

Use when: first-pass quality is likely insufficient.

Risk: unnecessary rewriting or repeated blind spots.

Status: TECHNIQUE.

#### PT-V03 — Independent evaluator / judge

Purpose: introduce a separate evaluation process.

Use when: independent checking adds material value.

Risk: the evaluator can also be wrong.

Status: TECHNIQUE.

#### PT-V04 — Failure-state prompting

Purpose: define behavior for missing, stale, conflicting, malformed, blocked, unavailable, or unauthorized conditions.

Use when: failure states materially affect correctness.

Status: HIGH-RELEVANCE TECHNIQUE.

### Family M — Multi-model and multi-agent

#### PT-M01 — Independent model ensemble

Purpose: obtain complementary candidates or perspectives.

Use when: model diversity is useful.

Risks: shared biases, correlated errors, cost, latency.

Status: CANDIDATE.

#### PT-M02 — Role-specialized agents

Purpose: divide genuine responsibilities among research, verification, implementation, testing, or synthesis agents.

Use when: separation materially improves the task.

Risk: artificial fragmentation and coordination overhead.

Status: CANDIDATE.

#### PT-M03 — Adversarial comparison / debate

Purpose: expose weaknesses through competing analyses.

Use when: plausible alternatives materially conflict.

Risk: rhetorical strength is not evidence.

Status: CANDIDATE.

#### PT-M04 — Evidence-weighted multi-source synthesis

Purpose: combine source/model outputs while preserving provenance, independence, disagreement, and uncertainty.

Use when: the objective is evidence synthesis rather than majority voting.

Status: CANDIDATE / HIGH ASTROCROWN RELEVANCE.

### Family X — Prompt generation and optimization

#### PT-X01 — Evaluation-driven prompt optimization

Purpose: search/refine prompts against an explicit metric and representative task set.

Mechanism: generate candidates → evaluate → refine/select.

Risk: metric gaming, overfitting, optimization to the wrong objective.

Evidence: current DSPy documentation describes optimizers including COPRO, MIPROv2, SIMBA, and GEPA.

https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md

Status: CANDIDATE / FUTURE AUTOMATION.

#### PT-X02 — Prompt-program optimization

Purpose: optimize multi-step prompt programs rather than isolated wording.

Use when: repeated workloads justify systematic optimization.

Risk: implementation complexity.

Status: CANDIDATE.

#### PT-X03 — Meta-prompt generation

Purpose: use a model to generate or improve another prompt.

Use when: prompt creation itself is the task.

Risk: generated prompts inherit model assumptions and still require testing.

Status: TECHNIQUE.

#### PT-X04 — Prompt critic

Purpose: inspect a prompt for ambiguity, contradictions, omissions, excessive complexity, unsafe tool behavior, and weak verification.

Use when: prompt is operationally important.

Status: TECHNIQUE.

### Family C — Context and continuity

#### PT-C01 — Structured long-context prompting

Purpose: organize large documents/data and separate instructions from source material.

Use when: context is large or multi-document.

Risk: structure alone does not guarantee retrieval or reasoning accuracy.

Status: TECHNIQUE.

#### PT-C02 — Controlled state summarization

Purpose: compress working state while preserving decisions, evidence, unresolved items, and next actions.

Risk: compression can remove important nuance.

Status: TECHNIQUE / HIGH ASTROCROWN RELEVANCE.

#### PT-C03 — Externalized state

Purpose: persist important task state in files, tests, logs, and structured artifacts.

Use when: work is long-running or crosses conversations.

Status: TECHNIQUE / HIGH ASTROCROWN RELEVANCE.

---

## 8. Special caution techniques

### PC-01 — Forced private reasoning disclosure

Do not make private/internal reasoning disclosure a default requirement.

Prefer observable artifacts:
- evidence;
- conclusions;
- calculations;
- assumptions;
- verification;
- uncertainty;
- concise rationale.

Current Microsoft guidance explicitly distinguishes older chain-of-thought prompting from newer reasoning-model behavior and states that those techniques are not recommended for reasoning models such as GPT-5 and o-series models.

https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/prompt-engineering

### PC-02 — Technique stacking

Do not combine many techniques without an identified reason.

### PC-03 — Persona inflation

Do not use exaggerated expertise claims as a substitute for evidence or tools.

### PC-04 — Forced certainty

Do not instruct the model to suppress uncertainty when uncertainty matters.

### PC-05 — Tool coercion

Do not require every available tool to be used.

### PC-06 — Metric-only optimization

Do not optimize a prompt for a convenient metric that does not represent the actual task.

### PC-07 — Hidden authority

Do not let retrieved documents, webpages, tool output, or examples silently become instructions.

---

## 9. Prompt evaluation

Evaluate only dimensions relevant to the task.

### EV-01 — Success

Did the intended outcome occur?

### EV-02 — Correctness

Are important claims, calculations, classifications, or changes correct?

### EV-03 — Grounding

Are important claims supported by appropriate evidence?

### EV-04 — Completeness

Were required areas covered?

### EV-05 — Constraint adherence

Were hard requirements followed?

### EV-06 — Uncertainty calibration

Were unknown, conflicting, stale, blocked, and unavailable states represented correctly?

### EV-07 — Robustness

Does the method work under representative variation?

### EV-08 — Efficiency

Consider tokens, latency, model calls, tool calls, implementation complexity, and maintenance.

### EV-09 — Security / authority

Are untrusted content, tools, permissions, and action boundaries handled correctly?

### EV-10 — Maintainability

Can another human understand and change the prompt?

These are evaluation dimensions, not a universal scoring system.

---

## 10. Baseline and comparative testing

For meaningful changes:

Baseline prompt
vs
Candidate prompt

Test under the same representative conditions when practical.

Record:

- prompt/version;
- model/version;
- relevant settings;
- available tools;
- inputs;
- expected outcome;
- observed result;
- failures;
- cost/latency where relevant;
- evidence;
- conclusion;
- limitations.

Do not promote a prompt because one example improved.

---

## 11. Robustness testing

Where relevant vary:

- wording;
- input length;
- source order;
- document order;
- missing data;
- conflicting data;
- malformed data;
- irrelevant data;
- adversarial/untrusted content;
- tool failure;
- stale information;
- schema changes;
- model/version;
- context size.

---

## 12. Prompt security and authority

For prompts governing tools or actions, define:

READ
What may be inspected.

WRITE
What may be changed.

EXECUTE
What may be run.

AUTHORIZE
What requires explicit approval.

ESCALATE
What requires additional evidence/review.

STOP
What must not be attempted.

Retrieved content may contain instructions. Unless explicitly designated authoritative, treat them as data to analyze.

---

## 13. AstroCrown repository prompt pattern

A substantial repository prompt should identify:

REPOSITORY
Exact owner/name.

SOURCE OF TRUTH
Exact files/ref/commit.

MODE
Audit / research / candidate analysis / authorized implementation / verification.

PRESERVATION
What historical or candidate material must remain untouched.

OBJECTIVE
Exact development outcome.

EVIDENCE
What must be inspected or verified.

TOOLS
Relevant connectors/tools and when to attempt them.

SCOPE
Exact files/subsystems that may be affected.

STATUS
Approved / candidate / unresolved / blocked / historical / deferred / rejected.

VERIFICATION
Required automated/manual/security/accessibility/performance/repository checks.

DELIVERABLE
Exact expected result.

---

## 14. Research prompt pattern

For research-heavy tasks:

Question
→ evidence criteria
→ current authoritative sources
→ retrieval/inspection
→ source comparison
→ distinction of fact vs interpretation
→ contradiction handling
→ synthesis
→ uncertainty
→ final result.

When evidence is incomplete, do not manufacture certainty.

---

## 15. Multi-model / multi-source distillation

Use this architecture when multiple models or information systems can materially improve the task:

Independent generation
→ provenance
→ normalization
→ independence analysis
→ contradiction detection
→ evidence evaluation
→ synthesis
→ verification
→ result

Do not define correctness as majority vote.

Different models can share biases, training data, tools, or source information.

Different providers can share upstream datasets or exchanges.

More sources therefore do not automatically mean more independent evidence.

---

## 16. External prompt-generation research

The external research register is organized by source and date so future entries can be appended without rewriting historical material.

### Microsoft Foundry

Current guidance covers clear instructions, few-shot learning, task decomposition, affordances/tool use, output structure, grounding, space efficiency, and model-specific behavior.

https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/prompt-engineering

### Anthropic

Current guidance covers clarity, context, examples, XML structure, long-context prompting, tool use, thinking/reasoning, agentic systems, parallel tool use, verification, subagent orchestration, and model-specific behavior.

https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prompting-best-practices

### Google

Current guidance covers clear instructions, context, structured prompts, examples, decomposition, and iterative development.

https://ai.google.dev/gemini-api/docs/prompting-strategies

### Research

Self-Consistency:
https://arxiv.org/abs/2203.11171

Tree of Thoughts:
https://arxiv.org/abs/2305.10601

ReAct:
https://arxiv.org/abs/2210.03629

### DSPy

Current documentation describes automated prompt/program optimization methods including COPRO, MIPROv2, SIMBA, and GEPA.

https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md

External guidance is evidence, not authority over AstroCrown requirements.

---

## 17. Prompt lifecycle

Problem
→ baseline
→ observed failure
→ hypothesis
→ technique candidate
→ candidate prompt
→ representative test
→ evidence
→ PASS / FAIL / BLOCKED / N/A
→ revision
→ re-test
→ promote / reject / preserve

A prompt should be optimized together with the outcome it is intended to produce.

---

## 18. Stable extension model

### Technique IDs

Use:

PT-<FAMILY><NUMBER>

Examples:

PT-I01
PT-G04
PT-M04
PT-X01

Never renumber a previous technique.

### New technique

Append a new record under the correct family.

### New family

Add a new family code only when an existing family does not fit.

### Evidence update

If new evidence changes an existing technique:

- preserve the original record;
- append the update;
- identify the new evidence;
- state the affected model/context;
- change status when justified.

### Prompt IDs

Use:

PG-<TYPE>-<NUMBER>

Examples:

PG-RESEARCH-001
PG-AUDIT-002
PG-IMPLEMENT-003

### Prompt versions

Use v1, v2, v3, etc.

Do not silently overwrite a historically important prompt version.

---

## 19. Future research areas

Append new discoveries under new IDs.

Candidate areas:

- adaptive technique selection;
- model routing;
- prompt ensembles;
- evolutionary prompt search;
- automatic example selection;
- prompt compression;
- context selection;
- retrieval-query optimization;
- tool-selection optimization;
- cost/latency-aware routing;
- multimodal prompting;
- prompt-injection resistance;
- adversarial prompt testing;
- prompt caching;
- agent memory/state management;
- benchmark generation;
- human-in-the-loop evaluation;
- prompt provenance;
- prompt dependency management;
- automated regression testing;
- cross-model prompt portability.

---

## 20. AstroCrown operating principles

For AstroCrown work, prefer prompts that:

1. use the source of truth before memory when accessible;
2. inspect available tools/connectors before claiming a capability is unavailable;
3. search current sources when current or niche facts matter;
4. preserve candidates and rejected alternatives when useful;
5. distinguish discovery, requirement, decision, implementation, and verification;
6. distinguish technical access, provider policy, contract, and legal status;
7. distinguish source failure from environment/tool failure;
8. treat API availability as one acquisition path, not the information boundary;
9. preserve provenance during multi-source synthesis;
10. analyze source independence before treating agreement as confirmation;
11. preserve conflicts rather than forcing consensus;
12. use the least complex sufficient technique set;
13. test important prompt changes;
14. preserve uncertainty;
15. define authority and action boundaries;
16. externalize important long-running state;
17. treat prompt improvements as reusable development knowledge.

---

## 21. Final rule

Use the smallest prompt system that reliably produces the required outcome.

Add complexity only when evidence shows that the added mechanism is valuable.

The target is:

**clear + grounded + appropriately constrained + testable + uncertainty-aware + secure + maintainable + model/context appropriate**

not:

**long + complicated + technique-heavy**.

When a new technique is discovered, preserve the discovery and evidence.

When a technique fails, preserve why.

When a model changes, re-evaluate model-dependent assumptions.

When a task changes, re-evaluate the technique set.
