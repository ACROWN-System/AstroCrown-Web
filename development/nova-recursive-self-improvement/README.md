# NOVA Recursive Self-Improvement

This directory contains the development-only architecture for autonomous recursive self-improvement (RSI) of NOVA.

The target is a system that can inspect its own implementation and operational behavior, discover improvement opportunities, create and evaluate candidate changes, and retain qualified improvements without requiring a human to participate in each improvement cycle.

## Strategic extension

See [Strong RSI and Collective Resilience](STRONG-RSI-AND-COLLECTIVE-RESILIENCE.md) for the proposed extension toward cooperative recursive improvement, legitimacy resilience, protective persuasion, shared human–AI sovereignty, and the remaining readiness gates. This document records a research and architecture direction; it does not mean the autonomous RSI lifecycle is operational.

## Scope

The subsystem may cover self-analysis and improvement of:

- source code and software architecture;
- algorithms and internal workflows;
- prompts and reasoning procedures;
- AI model and provider selection;
- routing and orchestration policies;
- distillation and arbitration strategies;
- context and memory optimization;
- caching and retrieval strategies;
- testing and evaluation mechanisms;
- performance and resource utilization;
- security and defensive mechanisms;
- reliability and fault handling;
- tool use and automation;
- other capability-producing mechanisms that can be evaluated objectively.

The subsystem is not limited to code changes. A change to configuration, model selection, workflow, prompt, algorithm, evaluator, or other capability-producing mechanism may qualify as a self-improvement candidate when it can be evaluated against a protected baseline.

## Objective

The objective is not to maximize the number of self-modifications.

The objective is to continuously discover and retain changes that provide demonstrable improvement in one or more required dimensions while preserving protected constraints.

Relevant dimensions may include:

- intelligence quality;
- task success;
- factual reliability;
- evidence quality;
- reasoning quality;
- robustness;
- security;
- privacy;
- reliability;
- latency;
- token efficiency;
- external AI call reduction;
- GPU/compute efficiency;
- maintainability;
- compatibility.

An optimization that improves one metric while materially degrading a mandatory property is not an improvement.

## Autonomous Operating Model

RSI should be able to operate without a human participating in each individual cycle.

A representative cycle is:

Observe
→ Diagnose
→ Generate improvement hypothesis
→ Create isolated candidate
→ Execute candidate
→ Evaluate against baseline
→ Run protected regression checks
→ Run security and integrity checks
→ Evaluate resource and operational impact
→ Decide automatically
→ Retain or discard
→ Record evidence
→ Repeat

Human participation is therefore not a required runtime step for qualifying changes.

Human review may occur retrospectively, but the operational RSI loop must not depend on a human being available to approve every iteration.

## Candidate Generation

NOVA may propose candidates by analyzing:

- failing tests;
- performance regressions;
- inefficient token/context usage;
- excessive external AI calls;
- model/provider benchmark changes;
- stale or weak routing decisions;
- repeated errors;
- security findings;
- reliability incidents;
- code complexity;
- duplicated mechanisms;
- unmet project requirements;
- newly available eligible models or capabilities;
- weaknesses discovered during previous evaluation cycles.

Candidates should identify a testable hypothesis.

A candidate should state, where practical:

- current baseline;
- observed weakness;
- proposed change;
- expected improvement;
- risks and dependencies;
- required verification;
- rollback method.

## Isolated Experimentation

A candidate must be tested outside the active production baseline before promotion.

The experimentation environment should support, as applicable:

- separate branch or commit;
- isolated runtime;
- dependency isolation;
- controlled inputs;
- reproducible benchmark;
- resource limits;
- timeout limits;
- filesystem/network restrictions;
- preserved baseline artifacts;
- candidate artifacts;
- complete execution evidence.

A failed or inconclusive experiment must not alter the active baseline.

## Baseline and Protected Evaluation

Every self-improvement candidate must be compared against an explicit baseline.

Evaluation should use the strongest available objective or independently derived evidence appropriate to the change.

Evaluation sources may include:

- deterministic tests;
- unit and integration tests;
- historical regression suites;
- held-out workloads;
- benchmark corpora;
- formal verification where applicable;
- static analysis;
- dynamic testing;
- security checks;
- resource measurements;
- multiple independent AI evaluators;
- external task evaluators;
- adversarial testing.

The candidate must not be allowed to redefine its own acceptance criterion within the same improvement cycle.

## Evaluator Independence and Integrity

The evaluation system is a protected part of the RSI architecture.

NOVA must not be able to make a candidate appear successful simply by:

- weakening a test;
- deleting failing cases;
- changing thresholds after observing results;
- modifying the evaluator and candidate together without independent validation;
- excluding inconvenient workloads;
- suppressing failures;
- changing result interpretation solely to produce PASS.

Where an evaluator itself is improved, the evaluator change must pass an independent evaluator-integrity test and preserve or strengthen the protected benchmark set before it can influence subsequent RSI decisions.

Protected or hidden evaluation sets should be used where practical so that optimization does not overfit to visible tests.

## Automatic Decision Gate

A representative promotion gate is:

Candidate
→ quality comparison
→ mandatory regression
→ security/integrity verification
→ resource/operational verification
→ eligibility checks
→ evidence completeness
→ PASS / FAIL / BLOCKED / N/A

Only a candidate that satisfies all mandatory criteria may be promoted.

A BLOCKED result is not an approval.

A candidate that improves average performance while introducing a mandatory regression is rejected.

## Adaptive Evaluation

The evaluation effort should match the change.

A small low-risk routing change may need a narrower benchmark.

A change to core orchestration, memory, evaluators, security, or self-modification authority should trigger broader and stronger evaluation.

Where evaluation reveals uncertainty, the system should escalate the evaluation depth rather than declaring success.

## Canarying and Rollback

Where an improvement can affect live operation, promotion should support:

- controlled deployment;
- canary execution;
- monitored post-promotion checks;
- automatic rollback on protected regression;
- retained prior known-good baseline;
- versioned improvement lineage.

Every promoted change must have a recoverable predecessor.

## RSI of External AI Selection

Provider and model evolution is part of the self-improvement problem.

When an eligible provider or model changes, NOVA may:

Discover
→ verify availability
→ verify licensing/commercial eligibility
→ benchmark against the current participant
→ compare quality/reliability/latency/cost
→ test against protected workloads
→ adopt, reject, or defer

This allows NOVA to adapt as externally available AI capability changes without requiring a manual rewrite of its participant roster for every model release.

## Relationship to NOVA AI Orchestration

`development/nova-ai-orchestration/` provides multi-AI orchestration, comparison, arbitration, and distillation.

This subsystem uses those capabilities to investigate and evaluate improvements to NOVA itself.

Conceptually:

NOVA
→ self-analysis
→ improvement candidate
→ NOVA AI Orchestration and other evaluators
→ protected evaluation
→ promotion decision
→ improved NOVA
→ next cycle

The orchestration layer and RSI layer therefore remain separate responsibilities.

## Relationship to Context and Memory Optimization

`development/nova-context-memory-optimization/` provides established techniques for reducing unnecessary context, memory retrieval, repeated computation, external AI calls, and token usage.

RSI may improve those mechanisms, evaluate alternative implementations, and select better candidates.

A memory or compression optimization must still prove that information quality, freshness, provenance, and task performance remain acceptable.

## Relationship to GPU Infrastructure

`development/gpu-infrastructure/` provides compute infrastructure that may be used for experiments, benchmarks, local AI models, and other RSI workloads.

RSI must not assume that a particular GPU provider is permanent.

## Security and Credential Boundaries

Self-improvement must not expose credentials or protected configuration to untrusted candidate code.

Credentials should remain outside tracked source files and follow the project's secure secret-handling model.

Candidate execution should use least privilege and restricted capabilities.

The RSI system must protect at least:

- credentials and tokens;
- evaluator integrity;
- protected benchmarks;
- baseline versions;
- audit evidence;
- rollback mechanisms;
- repository integrity;
- deployment authority.

## Evidence and Provenance

Every improvement cycle should preserve enough evidence to reconstruct the decision, including applicable:

- candidate identifier;
- baseline version;
- candidate version;
- hypothesis;
- change description;
- test/evaluation versions;
- workloads;
- evaluator identities or versions;
- metrics;
- failures;
- resource measurements;
- security results;
- decision;
- promotion result;
- rollback information.

The system must not claim improvement without evidence supporting the comparison.

## Improvement Quality

Self-improvement should be judged against the full applicable requirement set.

Examples:

A faster model that is less reliable is not automatically better.

A smaller prompt that loses important evidence is not an improvement.

A code optimization that weakens security is not an improvement.

A stronger model that cannot be used commercially may be ineligible for the intended workload.

A benchmark gain that disappears on held-out workloads is insufficient evidence of general improvement.

## Strong RSI Target

The intended direction is stronger than ordinary automated maintenance.

The system should eventually be able to improve:

1. its own operational behavior;
2. the algorithms and workflows that produce its behavior;
3. the efficiency of its intelligence acquisition and reasoning;
4. the mechanisms used to evaluate improvements;
5. the process by which subsequent improvement candidates are discovered.

This recursive property is what distinguishes the target from one-time optimization.

The system must nevertheless preserve protected evaluation and integrity boundaries so that self-improvement cannot become self-approval.

## Current Research and Technology Status

Current research demonstrates meaningful progress in autonomous self-modification and recursive improvement, including systems that modify code and retain improvements through automated evaluation.

These results do not establish open-ended or indefinitely accelerating general intelligence improvement.

Accordingly, this repository treats strong RSI as an engineering target subject to evidence, not as a guaranteed capability.

## Development Status

Status: **incomplete / implementation-gated**

The subsystem boundary and autonomous RSI objective are established, but the implementation is not yet complete.

Specific self-modification mechanisms, evaluator hardening, benchmark suites, sandbox technologies, deployment mechanisms, and automation policies remain incomplete or candidate-stage until evaluated against project requirements. The protected RSI policy explicitly blocks autonomous operation and promotion while implementation readiness remains incomplete.

## Verification

Changes follow the repository development and audit convention:

Requirement
→ Design / decision
→ Implementation
→ Automated verification
→ Manual verification where appropriate
→ Security verification
→ Quality verification
→ Evidence
→ Finding or pass
→ Remediation
→ Re-test
→ Promotion

For autonomous RSI, the most important additional requirement is that the system must be able to demonstrate improvement against a protected baseline without relying on its own unverified assertion that it improved.

## Core Rule

**NOVA may propose and test changes to NOVA, but a change earns the right to become the new NOVA only through evidence that is sufficiently independent of the change being tested.**

## Provider destination and redirect controls

The provider client validates the URL against the protected `provider.allowed_hosts` list before any request. The current list contains only `inference.nosana.com`, matching the current Nosana credential boundary. An alternative provider must be reviewed and explicitly added to that allowlist rather than selected only through a repository variable. URLs with embedded user-info, query strings, fragments, or non-standard remote HTTPS ports are rejected. HTTP redirects are not followed, preventing an endpoint's redirect response from changing the credential destination. Local HTTP is supported only through an explicit test-only opt-in.

These controls reduce accidental or malicious bearer-token exfiltration through misconfiguration and redirects. They do not replace GitHub secret access controls, provider trust review, or an independent review of RSI readiness.

## Provider integration and credential boundary

The RSI runtime uses a dependency-free OpenAI-compatible provider client. The current external provider candidate is Nosana's LLM inference API because its documented interface is OpenAI-compatible and exposes a dynamic model list. Provider selection remains a candidate decision and is not permanent architecture.

Current technical defaults:
- base URL: `https://inference.nosana.com/v1`;
- model: configurable, with `auto` discovery supported;
- credential environment name: `NOSANA_LLM_API_KEY_01`.

The actual credential is never stored in tracked source. A configuration preflight validates readiness and non-secret configuration before accepting the secret boundary.

Nosana's current documentation describes the inference service as credit-metered rather than an unlimited free resource. Any free credits or promotional access must be verified at the time of use rather than assumed as an architectural property.

## Candidate execution isolation

`sandbox_runtime.py` provides a fail-closed Docker isolation adapter candidate for candidate-controlled compilation, unit tests, and benchmark commands. It requires the immutable image digest and expected image ID in the protected policy, uses a read-only workspace and benchmark-input mount, disables container networking, drops capabilities, enables no-new-privileges, runs as a non-root UID, and applies resource/output/time limits. Every run has a unique Docker label; timeout/output-limit cleanup checks both the cidfile and labelled-container inventory, attempts to stop/remove discovered IDs, and verifies that no container remains with the run label. If cleanup cannot be confirmed, evaluation is blocked rather than silently continuing.

CI pulls and verifies the pinned image before running a smoke test for read-only workspace, host-path separation, and network denial. This is implementation evidence for the configured boundary, not a claim that container escape, kernel, Docker-daemon, or supply-chain risks are eliminated. Independent security review is still required; RSI readiness remains `INCOMPLETE`.

## Task-specific benchmark dispatcher

The protected evaluator uses [`benchmark_dispatcher.py`](benchmark_dispatcher.py) and the protected [`benchmark_profiles.json`](benchmark_profiles.json) registry to select a workload only when the candidate's complete changed-file set and configured command match a specific profile exactly. Mixed, unknown, malformed, disabled, or command-mismatched scopes return `BLOCKED`. The registry and selected profile must both explicitly carry `INDEPENDENT_REVIEW_APPROVED`; unknown or missing approval states are also `BLOCKED`.

Those state strings are fail-closed gates, not cryptographic evidence that an independent review occurred. An actual repository review trail and security evidence are still required. The only registered profile is the context-packing candidate, scoped to a single source file; it remains unapproved and disabled. New capability profiles require their own suitable workload and documented review.

## Initial context-packing workload

A first bounded benchmark workload is being implemented for provenance-preserving context packing. See the protected [Capability Benchmark Protocol](CAPABILITY-BENCHMARK-PROTOCOL.md), [workload runner](benchmarks/run_context_packing_benchmark.py), and fixed [synthetic case set](benchmarks/context-packing-cases.json). It evaluates one defined retrieval/context-budget capability and must not be represented as a general-intelligence benchmark.

The current implementation is a candidate. Do not configure it as the approved `RSI_BENCHMARK_COMMAND` until benchmark adequacy, evaluator integrity, and execution isolation have been independently reviewed. RSI readiness remains `INCOMPLETE`.

## Current implementation boundary

The provider adapter, protected preflight, dedicated provider-secret boundary, secret isolation, candidate validation, evaluator isolation, and automated tests are implemented.

The autonomous RSI lifecycle remains blocked because the protected policy is still explicitly `INCOMPLETE`. In particular, an approved capability workload/corpus that demonstrates actual NOVA intelligence improvement has not yet been established. Deterministic code-health tests are not treated as a substitute for that benchmark.

The repository therefore stops before autonomous provider use and before changing the readiness state to `READY`.
