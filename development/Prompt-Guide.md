# AstroCrown Prompt Guide

## 1. Purpose

This document is a standalone development guide for creating, evaluating, refining, preserving, and reusing high-quality prompts.

It is intentionally separate from `development/HOMEPAGE-REQUIREMENTS.md`.

`Prompt-Guide.md` answers:

- how to construct a strong prompt;
- how to select prompting techniques;
- how to combine techniques without unnecessary complexity;
- how to use external prompt-engineering research responsibly;
- how to evaluate prompt quality;
- how to preserve useful prompt discoveries;
- how to create prompts that remain effective across models, tools, contexts, and future conversations;
- how to make prompt generation itself systematic and increasingly efficient.

`HOMEPAGE-REQUIREMENTS.md` remains the authoritative homepage specification, including homepage-specific requirements, discoveries, candidate states, source findings, and decisions.

This document must not silently become a homepage requirement document.

## 2. Status and Evidence Model

Prompt techniques documented here are **research/evaluation assets**, not mandatory instructions for every prompt.

Use explicit states where applicable:

- **TECHNIQUE** — a recognized prompting method documented for reuse.
- **CANDIDATE** — potentially useful but not yet selected for a task.
- **SELECTED** — selected for a specific prompt/task.
- **TESTING** — undergoing comparative evaluation.
- **VERIFIED USE** — evidence supports usefulness for a defined task/model/context.
- **MODEL-SPECIFIC** — applicability materially depends on model behavior.
- **CONTEXT-SPECIFIC** — usefulness depends materially on task/context.
- **SUPERSEDED** — replaced by a later method while historically preserved.
- **DEFERRED** — intentionally not used now.
- **REJECTED** — evaluated and not suitable for the relevant purpose.
- **UNKNOWN** — insufficient evidence.
- **BLOCKED** — evaluation cannot be completed because required evidence, access, model, tool, or test environment is unavailable.

These states describe evidence and lifecycle state. They are not permanent quality rankings.

## 3. Core Prompt Principle

A high-quality prompt should optimize for the **task outcome**, not for prompt complexity.

A longer prompt is not inherently better.

A shorter prompt is not inherently better.

A technique should be included when evidence or task requirements indicate that it improves a relevant outcome such as correctness, grounding, completeness, consistency, tool use, efficiency, safety, reproducibility, or human usability.

Prompt construction should therefore follow:

**Objective → Context → Constraints → Task → Method → Tools/Information → Verification → Output → Preservation**

Not every prompt needs every component.

## 4. Prompt Creation Workflow

### Step 1 — Define the objective

State what must ultimately be accomplished.

Good objectives identify the actual outcome rather than only the immediate action.

Weak:

`Analyze this.`

Stronger:

`Determine whether the proposed homepage hero-card data model is feasible using currently accessible sources, identify evidence gaps, preserve unresolved alternatives, and produce a decision-ready comparison.`

### Step 2 — Define the operating mode

Explicitly distinguish:

- research;
- repository audit;
- analysis;
- design;
- candidate generation;
- implementation;
- verification;
- remediation;
- review;
- handoff.

Do not leave an important action boundary implicit.

### Step 3 — Identify the source of truth

Tell the model which source is authoritative.

Examples:

- repository;
- named file;
- current commit/ref;
- supplied dataset;
- external standard;
- current official documentation.

When multiple sources exist, define their precedence.

### Step 4 — Provide only relevant context, but do not omit context needed for correctness

Context should explain:

- what is already known;
- what is uncertain;
- relevant prior decisions;
- constraints;
- dependencies;
- affected systems;
- historical conditions;
- expected users/output.

Do not force a model to reconstruct critical context unnecessarily.

### Step 5 — Identify constraints and preservation requirements

Separate:

- hard requirements;
- preferences;
- prohibitions;
- scope boundaries;
- evidence requirements;
- preservation requirements;
- uncertainty requirements;
- security constraints;
- authority boundaries.

Do not encode preferences as mandatory constraints unless that is intended.

### Step 6 — Define the task

Use an explicit verb and a concrete result.

Examples:

- inspect;
- compare;
- classify;
- retrieve;
- verify;
- synthesize;
- calculate;
- implement;
- test;
- explain;
- propose;
- preserve.

### Step 7 — Select prompting techniques

Select techniques according to the problem.

Do not stack techniques merely because they are available.

### Step 8 — Define tools and information sources

When tools are available, specify:

- which tools are relevant;
- when they should be used;
- what source they should query;
- what evidence they should capture;
- when parallel calls are appropriate;
- which actions require sequential dependency;
- what the model must not infer from a tool failure.

A tool-use prompt should never encourage false claims of access or successful retrieval.

### Step 9 — Define verification

For factual, technical, financial, legal, security, repository, or other evidence-sensitive work, specify how the output will be checked.

Possible requirements include:

- source verification;
- cross-source comparison;
- calculation verification;
- schema/format validation;
- negative/boundary testing;
- historical regression;
- independent review;
- execution/test evidence;
- uncertainty reporting.

### Step 10 — Define the output contract

Specify:

- required sections;
- required fields;
- status vocabulary;
- citation/provenance requirements;
- file format;
- length/depth;
- what must not be omitted;
- whether alternatives must be preserved.

Structured output can make machine processing more reliable when the task requires predictable fields.

### Step 11 — Evaluate and refine

Compare the prompt's result against a baseline.

Do not optimize a prompt merely because its wording appears elegant.

Measure the outcome that matters.

## 5. Recommended Prompt Architecture

A reusable high-quality prompt can use the following structure:

```text
OBJECTIVE
<What must be achieved>

OPERATING MODE
<Research / Audit / Analysis / Implementation / Verification / etc.>

SOURCE OF TRUTH
<Authoritative files, data, refs, standards, URLs>

CONTEXT
<Relevant current state and prior decisions>

REQUIREMENTS
<What must be satisfied>

PRESERVATION
<What must not be lost, simplified, overwritten, or silently inferred>

UNCERTAINTY
<What remains unknown, candidate, blocked, or unresolved>

TASK
<Exact actions to perform>

METHOD
<Candidate methodology or technique; allow the model to choose if intentionally open>

TOOLS / SOURCES
<Relevant tools and source-use expectations>

VERIFICATION
<How correctness/evidence must be checked>

OUTPUT
<Exact deliverable and structure>

STATUS RULES
<How to classify PASS / FAIL / BLOCKED / UNKNOWN / etc.>

STOP / ESCALATION CONDITIONS
<When to stop, report uncertainty, or request/perform additional verification>
```

This is a template, not a requirement that every prompt use all headings.

## 6. Prompt Composition Principles

### 6.1 Clear and direct instructions

Instructions should be explicit about the desired action and output.

Current guidance from Microsoft, Anthropic, and Google all emphasizes clear instructions, explicit output requirements, and structured prompts. The details and effectiveness vary by model and workload.

Sources:
- Microsoft Foundry Prompt Engineering Techniques: https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/prompt-engineering
- Anthropic Prompting Best Practices: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prompt-templates-and-variables
- Google Gemini Prompt Design Strategies: https://ai.google.dev/gemini-api/docs/prompting-strategies

### 6.2 Explicit context and motivation

Useful context can improve task alignment when it explains why a constraint or objective matters.

Do not add background that does not affect the decision.

### 6.3 Delimit mixed content

When a prompt mixes instructions, documents, data, examples, source material, and user input, use clear boundaries such as Markdown headings or XML-style tags.

The exact delimiter is a candidate technique, not a universal requirement.

### 6.4 Prefer positive task descriptions when they are clearer

State what should be produced rather than relying exclusively on long prohibition lists.

Negative constraints remain useful where a prohibited action is important, but excessive prohibition text can obscure the primary task.

### 6.5 Separate authoritative instructions from untrusted content

Documents, webpages, logs, emails, code, retrieved data, and tool results may contain instructions that are not authoritative.

Prompts should define the trust boundary explicitly:

**instructions are not the same thing as quoted/retrieved content**

This is especially important for tool-using and retrieval-grounded agents.

### 6.6 Avoid hidden assumptions

Explicitly identify important undefined terms.

Examples:

- "consensus";
- "complete";
- "current";
- "independent";
- "best";
- "secure";
- "available";
- "legal";
- "real-time".

A prompt should tell the model to clarify, investigate, or preserve ambiguity rather than silently selecting a convenient interpretation when that interpretation matters.

## 7. Classification of External Prompt-Engineering Techniques

This section classifies techniques identified in external vendor guidance and research literature.

The taxonomy is intentionally modular. New techniques must receive new IDs and may be appended without rewriting previous technique records.

### Technique family A — Instruction and Structure

#### PT-A001 — Direct / explicit instruction

**Purpose:** Make the task and desired behavior clear.

**Mechanism:** State the objective, constraints, actions, and expected result explicitly.

**Useful when:** The task is underspecified or multiple interpretations are possible.

**Advantages:** Low complexity; broadly applicable.

**Limitations:** Additional wording does not guarantee better reasoning.

**Evidence:** Current Microsoft, Anthropic, and Google guidance consistently emphasizes clear and specific instructions.

**Status:** TECHNIQUE.

#### PT-A002 — Role / responsibility framing

**Purpose:** Establish relevant domain responsibility, perspective, or behavior.

**Mechanism:** Briefly describe the role or expertise relevant to the task.

**Useful when:** The task benefits from a defined perspective or workflow responsibility.

**Limitations:** A role statement does not create real-world expertise, authority, credentials, or permissions.

**Status:** TECHNIQUE.

#### PT-A003 — Delimited structured prompt

**Purpose:** Separate instructions, context, examples, inputs, documents, and output requirements.

**Mechanism:** Use stable Markdown sections, XML tags, or another explicit delimiter system.

**Useful when:** Prompts contain multiple content types or large contexts.

**Limitations:** More structure can add unnecessary tokens for simple tasks.

**Evidence:** Anthropic recommends XML structuring for complex prompts; Google and Microsoft also recommend clear syntax/delimiters.

**Status:** TECHNIQUE.

#### PT-A004 — Output-schema / structured-output prompting

**Purpose:** Make the output predictable and machine-processable.

**Mechanism:** Specify fields, data types, ordering, allowed status values, or a formal schema.

**Useful when:** Another machine/process will consume the output or exact completeness matters.

**Limitations:** A schema improves shape, not factual correctness.

**Status:** TECHNIQUE.

### Technique family B — Example-Based Steering

#### PT-B001 — Zero-shot prompting

**Purpose:** Solve a task without task-specific examples.

**Mechanism:** Provide instructions and context without demonstrations.

**Useful when:** The task is well-defined or examples would be expensive/unhelpful.

**Advantages:** Minimal prompt size and preparation.

**Limitations:** Can be less reliable for unusual formats or subtle classification tasks.

**Status:** TECHNIQUE.

#### PT-B002 — Few-shot / multishot prompting

**Purpose:** Demonstrate the desired task, format, decision boundary, or behavior.

**Mechanism:** Include representative input/output examples.

**Useful when:** The desired output pattern or classification boundary is difficult to express only with prose.

**Advantages:** Strong control over examples of intended behavior.

**Limitations:** Poor examples can teach the wrong pattern; examples consume context; examples may encode accidental bias.

Anthropic currently identifies carefully chosen few-shot examples as a reliable method for steering output format and behavior and recommends relevant, diverse, structured examples. Microsoft also documents few-shot learning as a core technique. citeturn162791search0turn112547search0

**Status:** TECHNIQUE.

#### PT-B003 — Positive/negative contrast examples

**Purpose:** Clarify boundaries between acceptable and unacceptable outputs.

**Mechanism:** Provide contrasting examples rather than only positive examples.

**Useful when:** Classification or compliance boundaries are difficult to express.

**Limitations:** Requires careful coverage of edge cases.

**Status:** CANDIDATE.

### Technique family C — Grounding and Information Access

#### PT-C001 — Context grounding

**Purpose:** Anchor the response in supplied source material rather than unsupported model memory.

**Mechanism:** Provide authoritative documents/data and specify how they should be used.

**Useful when:** The task is source-sensitive or current.

**Limitations:** Supplied context can be incomplete, stale, contradictory, or malicious.

**Status:** TECHNIQUE.

#### PT-C002 — Retrieval-augmented prompting

**Purpose:** Use retrieved external information to improve factual grounding.

**Mechanism:** Retrieve relevant sources before or during generation and incorporate the retrieved evidence into the task.

**Useful when:** Current, external, large, or domain-specific information is required.

**Limitations:** Retrieval quality becomes part of overall system quality.

**Status:** TECHNIQUE.

#### PT-C003 — Affordance/tool-assisted prompting

**Purpose:** Encourage the model to use an external capability rather than relying only on internal knowledge.

**Mechanism:** Define when search, file access, calculators, code execution, APIs, browser tools, or other affordances should be used.

**Useful when:** External information, precise calculation, repository state, or execution evidence is required.

Microsoft explicitly identifies search and other "affordances" as ways to improve grounding and reduce unsupported answers. citeturn112547search0

**Status:** TECHNIQUE.

#### PT-C004 — Source hierarchy prompting

**Purpose:** Tell the model which sources take precedence when sources conflict.

**Mechanism:** Define source classes and precedence rules.

**Example:** Current official repository state > current official documentation > independent secondary source > model memory.

**Useful when:** Multiple sources have different authority or freshness.

**Limitations:** A hierarchy can be wrong if the authority assumptions are wrong.

**Status:** CANDIDATE / HIGH VALUE FOR ASTROCROWN.

### Technique family D — Decomposition and Orchestration

#### PT-D001 — Task decomposition

**Purpose:** Split a complex task into manageable subproblems.

**Mechanism:** Break one large objective into explicit sub-tasks.

**Useful when:** The task has multiple independent or sequential dimensions.

**Advantages:** Reduces omitted work and clarifies verification.

**Limitations:** Poor decomposition can add overhead or fragment context.

Google currently recommends breaking complex prompts into components and separating sequential work when useful. citeturn162791search1

**Status:** TECHNIQUE.

#### PT-D002 — Prompt chaining

**Purpose:** Turn a complex workflow into multiple sequential prompts.

**Mechanism:** The output from one stage becomes input to the next.

**Useful when:** Stages have distinct objectives or benefit from intermediate validation.

**Limitations:** Errors can propagate between stages; latency/token cost increases.

Google documents prompt chaining for complex sequential tasks. citeturn162791search1

**Status:** TECHNIQUE.

#### PT-D003 — Parallel task decomposition

**Purpose:** Perform independent analyses simultaneously.

**Mechanism:** Give separate tasks to separate calls/agents and combine results.

**Useful when:** Workstreams are independent.

**Advantages:** Can reduce elapsed time and increase diversity.

**Limitations:** Parallel results still require synthesis and consistency checking.

**Status:** TECHNIQUE.

#### PT-D004 — Response aggregation / synthesis

**Purpose:** Combine multiple outputs into a single result.

**Mechanism:** Aggregate outputs from parallel prompts/models/sources under an explicit synthesis rule.

Google documents aggregation of parallel responses as a complex-prompt strategy. citeturn162791search1

**Status:** TECHNIQUE.

### Technique family E — Deliberation and Search

#### PT-E001 — Self-consistency

**Purpose:** Improve reliability by sampling multiple candidate reasoning paths/answers and selecting a consistent result.

**Mechanism:** Generate multiple candidate trajectories and aggregate/select their answers under a consistency rule.

**Useful when:** Multiple independent reasoning paths can expose instability.

**Limitations:** Increases computation and can amplify correlated errors; consistency is not proof of truth.

The self-consistency research introduced this as a decoding strategy that samples diverse reasoning paths and selects the most consistent answer; reported gains were benchmark-specific. citeturn309074academia48

**Status:** TECHNIQUE / RESEARCH-BACKED.

#### PT-E002 — Tree of Thoughts

**Purpose:** Explore multiple candidate solution paths with evaluation and possible backtracking.

**Mechanism:** Generate candidate intermediate states, evaluate them, expand promising branches, and search over alternatives.

**Useful when:** The task requires planning, search, strategic alternatives, or backtracking.

**Limitations:** Higher complexity and compute cost; not justified for routine tasks.

The original Tree of Thoughts work frames this as deliberate search over multiple coherent intermediate states with evaluation and backtracking. citeturn309074academia49

**Status:** TECHNIQUE / RESEARCH-BACKED.

#### PT-E003 — ReAct-style reasoning/action loop

**Purpose:** Interleave analysis with external actions such as information retrieval or tool calls.

**Mechanism:** The model alternates between considering what is needed and taking an external action, then uses the result to continue the task.

**Useful when:** The task requires dynamic information gathering and action.

**Advantages:** Connects reasoning with evidence acquisition.

**Limitations:** Tool errors, tool choice errors, and action costs become part of the system.

ReAct research reported benefits from interleaving reasoning and actions and using external sources to gather information. citeturn309074academia50

**Status:** TECHNIQUE / RESEARCH-BACKED.

### Technique family F — Evaluation and Self-Improvement

#### PT-F001 — Self-check / criteria verification

**Purpose:** Catch errors before final output.

**Mechanism:** Give explicit criteria and require a verification pass against them.

**Useful when:** The task has checkable requirements.

**Limitations:** Self-checking is not independent verification and can reproduce the same error.

Anthropic currently recommends explicit self-checking in many workloads while also warning that some newer reasoning models may over-verify when excessive verification language is used. citeturn162791search0

**Status:** TECHNIQUE.

#### PT-F002 — Critique-and-revise

**Purpose:** Improve a draft through a separate critique stage.

**Mechanism:** Produce a candidate, evaluate it against explicit criteria, then revise.

**Useful when:** The first draft is likely to contain quality or completeness issues.

**Limitations:** Can increase latency and may lead to unnecessary rewriting.

**Status:** TECHNIQUE.

#### PT-F003 — Independent evaluator / judge

**Purpose:** Add a second evaluation process to assess output quality.

**Mechanism:** A separate model, rule system, test suite, or evaluator assesses the generated result.

**Useful when:** High-stakes or objectively testable criteria exist.

**Limitations:** The evaluator can be wrong or biased; same-model evaluation is not fully independent.

**Status:** TECHNIQUE.

#### PT-F004 — Evaluation-driven prompt optimization

**Purpose:** Automatically search/refine prompts against a measurable objective.

**Mechanism:** Generate prompt candidates, run them against a dataset/task set, score outputs using an explicit metric, and iterate.

**Useful when:** Repeated tasks and measurable outcomes justify optimization.

**Limitations:** Optimizes the chosen metric; weak metrics produce weak prompts; can overfit.

DSPy currently provides prompt/program optimizers that can synthesize examples, generate/refine instructions, and optimize prompts against metrics. citeturn309074search5

**Status:** TECHNIQUE / CANDIDATE FOR FUTURE AUTOMATION.

### Technique family G — Multi-Agent / Multi-Model Synthesis

#### PT-G001 — Independent model ensemble

**Purpose:** Obtain multiple perspectives or candidate solutions.

**Mechanism:** Send the same or decomposed task to multiple models/configurations and synthesize the outputs.

**Useful when:** Models have complementary strengths or independent error patterns.

**Limitations:** More cost/latency; models may share biases or upstream information; agreement does not guarantee correctness.

**Status:** TECHNIQUE / CANDIDATE.

#### PT-G002 — Role-specialized multi-agent workflow

**Purpose:** Assign different tasks to separate agents.

**Mechanism:** Example roles include researcher, verifier, critic, implementer, tester, and synthesizer.

**Useful when:** Work can be cleanly separated and parallelized.

**Limitations:** Coordination overhead; role definitions can introduce artificial fragmentation.

**Status:** CANDIDATE.

#### PT-G003 — Debate / adversarial comparison

**Purpose:** Expose weaknesses by having competing analyses challenge each other.

**Mechanism:** Generate independent positions, objections, rebuttals, and synthesis under explicit evidence rules.

**Useful when:** The problem contains plausible competing explanations or decisions.

**Limitations:** Debate can generate persuasive but unsupported arguments; rhetorical victory is not evidence.

**Status:** CANDIDATE.

#### PT-G004 — Multi-source consensus with evidence weighting

**Purpose:** Synthesize multiple model/source outputs while preserving disagreement and provenance.

**Mechanism:** Collect independent outputs, assess source independence/reliability and evidence, detect contradictions, then synthesize without assuming majority correctness.

**Useful when:** The objective is evidence synthesis rather than simple answer generation.

**Limitations:** Requires explicit independence and weighting methodology.

**Status:** CANDIDATE / HIGH VALUE FOR ASTROCROWN.

### Technique family H — Meta-Prompting and Prompt Generation

#### PT-H001 — Meta-prompting

**Purpose:** Ask a model to generate, analyze, or improve another prompt.

**Mechanism:** Provide the task, success criteria, constraints, and evaluation context, then ask the model to construct candidate prompts.

**Useful when:** Human prompt design is itself the problem.

**Limitations:** The generated prompt inherits the model's assumptions; prompt optimization without testing is not evidence.

**Status:** TECHNIQUE.

#### PT-H002 — Prompt critic

**Purpose:** Find weaknesses in a candidate prompt before use.

**Mechanism:** Evaluate ambiguity, contradictions, missing context, excessive complexity, untestable requirements, unsafe tool behavior, and output gaps.

**Useful when:** Prompts become long or critical.

**Status:** TECHNIQUE / CANDIDATE.

#### PT-H003 — Prompt compiler / optimizer

**Purpose:** Convert high-level task intent into optimized prompts or prompt programs.

**Mechanism:** Use automated search/evaluation to generate candidate instructions/examples or program structure.

**Useful when:** Prompt optimization is repeated enough to justify tooling.

**Limitations:** Requires representative evaluation data and meaningful metrics.

**Status:** TECHNIQUE / CANDIDATE.

### Technique family I — Context and Long-Task Management

#### PT-I001 — Long-context structured prompting

**Purpose:** Improve handling of large documents or datasets.

**Mechanism:** Organize large context with stable document boundaries, metadata, source labels, and a clearly separated final task.

**Useful when:** Large repositories, reports, codebases, or multi-document evidence are supplied.

Anthropic and Google both provide current guidance on structured long-context prompting and placing instructions/query elements strategically around long context. citeturn162791search0turn162791search2

**Status:** TECHNIQUE.

#### PT-I002 — Context compression / state summarization

**Purpose:** Preserve essential task state when context becomes too large.

**Mechanism:** Create a controlled summary/state record containing decisions, unresolved items, evidence, and next actions.

**Useful when:** Work spans large contexts or multiple sessions.

**Limitations:** Compression can delete important nuance; summaries must be treated as derived state rather than unquestionable source truth.

**Status:** TECHNIQUE / HIGH VALUE FOR ASTROCROWN.

#### PT-I003 — Externalized state / progress artifacts

**Purpose:** Persist important working state outside the prompt.

**Mechanism:** Use files, task records, tests, logs, or structured state artifacts.

**Useful when:** Long-horizon development or agentic work requires continuity.

**Limitations:** State files must themselves be kept current and trustworthy.

**Status:** TECHNIQUE / HIGH VALUE FOR ASTROCROWN.

## 8. Techniques That Should Not Be Applied Automatically

### 8.1 Chain-of-thought extraction

A prompt should not assume that requesting a model to reveal private/internal reasoning is necessary for high-quality work.

Current Microsoft guidance specifically notes that chain-of-thought prompting is not recommended for current reasoning models such as GPT-5 and o-series models. OpenAI's current API documentation instead exposes configurable reasoning effort for supported reasoning models. citeturn112547search0turn577218search4

For AstroCrown prompt design, prefer observable outputs such as:

- conclusions;
- evidence;
- assumptions;
- calculations;
- tests;
- verification status;
- concise rationale;
- unresolved questions.

The objective is **auditable work**, not forced exposure of private reasoning.

### 8.2 Excessive instruction stacking

Adding more rules is not a substitute for resolving ambiguity.

A prompt containing many overlapping requirements can become internally contradictory and harder for both humans and models to follow.

### 8.3 Technique accumulation

Do not combine few-shot + chain + debate + self-consistency + Tree of Thoughts + multiple agents + multiple critics merely because each technique is potentially useful.

Select the smallest set of techniques that provides sufficient evidence and quality.

### 8.4 Persona inflation

Do not rely on exaggerated role descriptions such as "world's greatest expert" as a substitute for source grounding, tools, evidence, and verification.

### 8.5 Unsupported certainty instructions

Do not tell a model to "always be confident," "never say you don't know," or otherwise suppress uncertainty when the task requires factual accuracy.

### 8.6 Tool-use coercion without purpose

Do not instruct a model to call every available tool.

Tool selection should depend on whether the tool adds relevant evidence or execution capability.

Current Anthropic guidance also warns that excessive tool-triggering instructions can cause over-triggering on newer models. citeturn162791search0

## 9. Technique Selection Framework

Before selecting a technique, answer:

**What problem are we trying to solve?**

Examples:

- ambiguity → direct instruction / structured prompt;
- unfamiliar output pattern → few-shot;
- external facts → retrieval/tool grounding;
- complex task → decomposition;
- independent workstreams → parallelization;
- sequential transformation → chaining;
- unstable answers → self-consistency / ensemble;
- planning/search → Tree of Thoughts;
- information + actions → ReAct-style workflow;
- quality assurance → critique/evaluator;
- repeated optimization → evaluation-driven optimizer;
- large context → structured long-context/state management;
- multi-source evidence → ensemble/synthesis with independence analysis.

Then ask:

**What is the cheapest technique that can solve that problem adequately?**

Cost includes:

- tokens;
- latency;
- API calls;
- model calls;
- tool calls;
- implementation complexity;
- maintenance;
- cognitive complexity;
- failure surface.

## 10. Prompt Evaluation Framework

A prompt should be evaluated against a representative task set whenever practical.

Candidate evaluation dimensions:

### Task success

Did the output accomplish the intended task?

### Correctness

Were claims, calculations, transformations, or implementation results correct?

### Evidence quality

Were important claims grounded in appropriate evidence?

### Completeness

Were required components addressed without unjustified omissions?

### Constraint adherence

Were hard requirements followed?

### Uncertainty calibration

Did the output distinguish known, inferred, uncertain, blocked, and unavailable information?

### Tool efficiency

Did tool use materially improve the result rather than add unnecessary calls?

### Robustness

Does the prompt continue to work across representative inputs and edge cases?

### Model portability

Does the method depend on one model's specific behavior?

### Context efficiency

Does the prompt use context economically without omitting information needed for correctness?

### Reproducibility

Can the task be repeated with enough consistency to evaluate the method?

### Security and authority

Does the prompt correctly separate authoritative instructions from untrusted external content and avoid encouraging unsafe or unauthorized actions?

### Maintainability

Can future humans understand and update the prompt without reconstructing hidden assumptions?

## 11. Baseline and Comparative Testing

When refining a prompt, preserve a baseline.

A useful experiment compares:

**Baseline prompt**

versus

**Candidate prompt**

against the same representative task set.

Record:

- prompt version;
- model/version;
- relevant parameters/settings;
- input set;
- tools available;
- expected outcome;
- observed result;
- failures;
- evidence;
- cost/latency where relevant;
- conclusion;
- limitations.

Do not conclude that a prompt is superior because one example worked better.

A candidate should be tested against representative conditions.

## 12. Prompt Robustness Testing

Where relevant, vary:

- wording of the user request;
- input length;
- document order;
- source order;
- missing data;
- conflicting data;
- malformed data;
- irrelevant information;
- adversarial/untrusted content;
- tool failure;
- empty tool result;
- stale information;
- changed source schema;
- model version;
- context size.

A prompt that only works under ideal conditions should not be treated as robust.

## 13. Prompt Security

Prompts are part of the application's control surface when they govern tools, files, external information, or actions.

Consider:

- prompt injection;
- instruction hierarchy confusion;
- untrusted retrieved content;
- malicious documents;
- tool-output manipulation;
- unauthorized action requests;
- secret exposure;
- sensitive-data leakage;
- excessive autonomy;
- unsafe external side effects.

A retrieved document may contain instructions. Unless the prompt explicitly establishes that the document is authoritative, treat those instructions as **content to analyze**, not commands to follow.

For tool-using agents, define:

**What the model may read**

**What the model may write**

**What the model may execute**

**What requires explicit authorization**

**What actions are irreversible**

**What actions require additional verification**

## 14. Human-AI Collaboration Principle

The prompt should not attempt to replace human governance where authority is required.

Separate:

- capability;
- knowledge;
- evidence;
- judgment;
- authority;
- governance;
- execution.

A model can be asked to investigate alternatives, identify risks, compare evidence, or generate implementation candidates without being given implicit authority to perform irreversible actions.

Autonomy should be proportional to:

- consequence;
- reversibility;
- uncertainty;
- external impact;
- security sensitivity.

## 15. Repository / Development Prompt Pattern

For AstroCrown repository work, a strong prompt should normally identify:

**Repository**

Exact owner/name.

**Authoritative source**

Exact path(s), branch/ref, or commit.

**Mode**

For example:

- repository audit only;
- research only;
- candidate analysis;
- apply to repository.

**Preservation**

What must remain untouched, including historical files and rejected alternatives where relevant.

**Objective**

The exact development outcome.

**Evidence**

What requires current inspection/search/testing.

**Tool use**

Tools/connectors that should be attempted before declaring a limitation.

**Scope**

Exact files or subsystems that may be affected.

**Decision state**

Approved / candidate / unresolved / blocked / historical / deferred / rejected.

**Verification**

Required automated/manual/security/accessibility/performance/repository checks.

**Deliverable**

Exact output or file update expected.

This structure is especially useful when continuing work across conversations.

## 16. Research Prompt Pattern

For research-heavy tasks:

1. define the question;
2. identify what would count as evidence;
3. identify authoritative/current sources;
4. retrieve or inspect sources;
5. distinguish source facts from interpretation;
6. compare independent sources;
7. preserve disagreements;
8. identify missing evidence;
9. synthesize;
10. report uncertainty and limitations.

The prompt should explicitly prohibit unsupported extrapolation where the task is evidence-sensitive.

## 17. Multi-Model / Multi-Source Distillation Pattern

For tasks where several models or sources are available, use:

**Independent generation**

→ **source/model provenance**

→ **normalization**

→ **contradiction detection**

→ **independence analysis**

→ **evidence evaluation**

→ **synthesis**

→ **verification**

→ **final result**

Do not use simple majority vote as the default definition of correctness.

A model or source can be uniquely correct even when other sources disagree.

Multiple models can also share training biases or external information and therefore may not be independent evidence.

## 18. Prompt Generation Prompt

A meta-prompt for generating a high-quality prompt should itself define the evaluation target.

Reusable pattern:

```text
OBJECTIVE
Create a production-quality prompt for the following task:
<TASK>

CONTEXT
<Relevant context>

AUTHORITATIVE SOURCES
<Files / sources / standards>

REQUIREMENTS
<Hard requirements>

PREFERENCES
<Non-mandatory preferences>

PRESERVATION
<What must not be omitted, simplified, or silently changed>

TOOLS
<Available tools and when they should be considered>

EVIDENCE
<What requires verification>

OUTPUT REQUIREMENTS
<Expected final result>

REQUEST
1. Identify ambiguities and hidden assumptions.
2. Determine which prompt techniques are relevant.
3. Consider simpler techniques before complex orchestration.
4. Generate one or more candidate prompt architectures.
5. Explain why each selected technique is relevant.
6. Identify technique-specific limitations and model dependencies.
7. Add verification and failure-state handling where justified.
8. Produce a final prompt that preserves the original objective and constraints.
9. Identify unresolved decisions rather than inventing them.

Do not optimize for prompt length.
Do not add techniques merely for complexity.
Do not convert candidates into requirements.
Do not claim that a prompt is validated unless it has been tested.
```

## 19. Prompt Improvement Loop

A mature prompt-development loop is:

**Problem**

→ **Baseline prompt**

→ **Observed failure**

→ **Hypothesis**

→ **Technique candidate**

→ **Candidate prompt**

→ **Representative test**

→ **Evidence**

→ **PASS / FAIL / BLOCKED / N/A**

→ **Revision**

→ **Re-test**

→ **Promotion / Rejection / Preservation**

This is preferable to repeatedly rewriting prompts based only on subjective preference.

## 20. Prompt Versioning and Future Addition Rules

This document is designed to grow without requiring changes to existing technique records.

### Stable IDs

Technique IDs must not be renumbered.

Use:

`PT-<FAMILY>-<NUMBER>`

Examples:

- `PT-A001`
- `PT-D005`
- `PT-G004`

When a new technique is discovered, assign the next unused number within the appropriate family.

If a genuinely new family is required, add a new family code and append its records.

### Append-only technique records

Do not rewrite an existing technique merely to make the document shorter.

If new evidence changes its applicability:

- preserve the original record;
- add a dated update;
- identify the new evidence;
- change its status if justified;
- preserve the relationship to previous versions.

### Technique record template

Future additions should use:

```markdown
#### PT-X000 — Technique name

**Purpose:**  
What problem does it solve?

**Mechanism:**  
How does it work?

**Useful when:**  
What conditions justify it?

**Advantages:**  
What can it improve?

**Limitations:**  
What can go wrong?

**Model applicability:**  
Which model types or capabilities may affect it?

**Tool/dependency requirements:**  
What does it require?

**Evidence:**  
Research, documentation, experiments, or benchmark evidence.

**AstroCrown relevance:**  
Why it may matter here.

**Status:**  
TECHNIQUE / CANDIDATE / TESTING / VERIFIED USE / etc.

**Added:** YYYY-MM-DD
```

### Evidence updates

If new evidence contradicts an earlier technique assessment, do not erase the earlier claim.

Add:

**Update YYYY-MM-DD —**

- what changed;
- evidence;
- affected models/contexts;
- resulting status;
- whether previous guidance remains valid in another context.

## 21. External Technique Research Register

The current external reference set includes:

### Vendor guidance

**Microsoft Foundry — Prompt Engineering Techniques**

Covers clear instructions, few-shot learning, clear syntax, task decomposition, affordances/tool use, output structure, grounding context, and model-specific considerations.

https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/prompt-engineering

**Anthropic — Prompting Best Practices**

Covers clarity, context, examples, XML structuring, long-context prompting, output control, tool use, adaptive thinking, agentic workflows, parallel tool use, verification, and subagent orchestration.

https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prompt-templates-and-variables

**Google AI — Prompt Design Strategies**

Covers precise instructions, consistent structure, delimiters, context management, task decomposition, prompt chaining, and response aggregation.

https://ai.google.dev/gemini-api/docs/prompting-strategies

### Research literature

**Self-Consistency Improves Chain of Thought Reasoning in Language Models**

Introduces self-consistency as a multi-path sampling/selection strategy.

https://arxiv.org/abs/2203.11171

**Tree of Thoughts: Deliberate Problem Solving with Large Language Models**

Introduces structured exploration over multiple solution paths with evaluation and backtracking.

https://arxiv.org/abs/2305.10601

**ReAct: Synergizing Reasoning and Acting in Language Models**

Introduces interleaving model reasoning and external actions.

https://arxiv.org/abs/2210.03629

### Prompt optimization systems

**DSPy Optimizers**

Documents automated instruction/example optimization against explicit metrics, including COPRO, MIPROv2, SIMBA, and GEPA.

https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md

These are external references, not automatic prescriptions.

## 22. Current External Research Notes

### Current-model differences matter

Prompt techniques are not universally portable across model generations.

Microsoft currently distinguishes traditional prompt techniques from reasoning-model behavior and notes that chain-of-thought prompting is not recommended for reasoning models such as GPT-5 and o-series models. citeturn112547search0

Anthropic's current guidance similarly contains model-specific sections and notes that prompting practices can change as model capabilities change. citeturn162791search0

Google's current Gemini guidance states that prompting is iterative and that newer reasoning models may respond better to concise, direct instructions than to elaborate prompt engineering patterns designed for older models. citeturn162791search2turn577218search3

Therefore a technique must carry its **model/context applicability** rather than being documented as universally effective.

### Prompt engineering is empirical

A prompt recommendation should be considered a hypothesis until it produces evidence for the relevant workload.

External published results are evidence about the tested conditions, not guarantees for AstroCrown's exact task.

## 23. AstroCrown Prompt Design Principles

The following principles are especially relevant to AstroCrown development:

1. **Preserve intent.**
2. **Use the repository/source of truth before memory when available.**
3. **Discover available tools before claiming a capability is unavailable.**
4. **Search current sources when current or niche facts matter.**
5. **Separate discovery, candidate, decision, implementation, and verification.**
6. **Preserve rejected alternatives and unresolved questions when they may remain useful.**
7. **Use tools for evidence, not decoration.**
8. **Do not silently infer missing requirements.**
9. **Separate technical access, provider policy, contractual terms, and legal status.**
10. **Do not equate source count with evidence independence.**
11. **Prefer the simplest sufficient prompting technique.**
12. **Increase orchestration only when the task requires it.**
13. **Evaluate prompts against representative tasks.**
14. **Preserve prompt versions and evidence.**
15. **Do not let benchmark optimization override the actual task objective.**
16. **Treat tool failures, source failures, and model failures as different states.**
17. **Preserve uncertainty rather than forcing a confident output.**
18. **Make action/authority boundaries explicit for tool-using systems.**
19. **Use multi-model/multi-source synthesis when complementary evidence materially improves the task.**
20. **Re-verify model-specific prompting guidance as models change.**

## 24. Future Extension Areas

New research should be appended under new IDs rather than rewriting this document.

Potential future areas include:

- automatic prompt search and optimization;
- evolutionary prompt generation;
- metric-driven prompt compilation;
- prompt ensembles;
- model routing;
- adaptive technique selection;
- confidence-aware multi-path reasoning;
- retrieval strategy optimization;
- tool-selection prompting;
- context selection and compression;
- long-horizon agent state;
- subagent orchestration;
- multimodal prompt construction;
- adversarial prompt testing;
- prompt injection resistance;
- benchmark generation;
- synthetic example generation;
- human-in-the-loop prompt evaluation;
- cost/latency-aware prompt routing;
- prompt caching;
- reusable prompt components;
- prompt provenance and change tracking.

Each future addition should preserve:

**technique → mechanism → applicability → evidence → limitation → test → status**

## 25. Final Rule

A high-quality prompt is not the prompt with the greatest number of instructions or techniques.

It is the prompt—or prompt system—that produces the required outcome with sufficient correctness, grounding, completeness, verification, robustness, efficiency, security, and maintainability for the actual task.

When evidence is insufficient, preserve the uncertainty.

When a technique is useful only in a specific model/context, record that boundary.

When a simpler prompt works equally well, prefer the simpler prompt.

When a complex orchestration is justified by the task, preserve the methodology and evidence explaining why.

When a new technique is discovered, add it without destroying the historical knowledge that already exists.
