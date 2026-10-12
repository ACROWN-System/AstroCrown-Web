# Active Navigation Plan — Human-Gated RSI Cadence and API-Key Heartbeats

**Date:** 2026-10-12  
**Status:** ACTIVE — implementation and verification in progress  
**Objective:** Separate on-demand human-in-the-loop Weak RSI from a once-monthly, gate-protected Strong RSI attempt; ensure GitHub-managed authentication is not mistaken for LLM inference; and persist secret-safe live health observations for eligible API credentials through the existing LLM/GPU heartbeat workflows.

## Mode and source of truth

**Mode:** Workflow/policy design, implementation, security review, automated tests, and operational verification.  
**Repositories:**  
- https://github.com/ACROWN-System/AstroCrown-Web  
- https://github.com/ACROWN-System/NOVA

**Source of truth:** Current main-branch workflow/policy files, provider API evidence, recorded user decisions, and test results. The current repository inspection did not find the previously referenced repository-level navigation protocol/template; use the available development/Prompt-Guide.md, development/DEVELOPMENT-AND-AUDIT-CONVENTION.md, and established development/audit/Active/ plan format rather than claiming a missing protocol was followed.

## Objectives and acceptance criteria

1. GitHub Actions GITHUB_TOKEN / Codex authorization is treated as GitHub integration access, not model inference. Do not use a separate GitHub_Token secret test against /user as evidence of AI-provider health. A 403 from that endpoint is not enough to conclude Codex or the GitHub integration is broken.
2. Weak RSI is manually triggered only. It may analyze bounded, approved context and return a proposal/report, but cannot commit, open/merge a PR, run candidate code, alter workflow/policy/evaluators, or change readiness. A human must decide if/when a candidate is implemented.
3. Strong RSI has exactly one scheduled attempt per UTC month, with no manual dispatch path. It remains fail-closed behind implementation-readiness, commercial/data-use eligibility, the approved task-appropriate benchmark, provider secret readiness, immutable sandbox, strict non-degradation checks, and evidence verification.
4. Strong RSI never commits directly to main; any qualified candidate is retained as a PR for normal human review. Auto-merge remains disabled. If evidence is incomplete, quality/regression gates are inconclusive, or no strict improvement is established, Strong RSI records BLOCKED, FAIL, or NO_CHANGE and makes no production change.
5. A candidate is accepted only when every mandatory protected regression/security/quality criterion passes and a task-matched benchmark demonstrates a real improvement. No model request may be described as guaranteed degradation-free; the fail-closed policy must make the safer outcome no change unless evidence supports improvement.
6. The existing LLM heartbeat performs bounded, low-cost live probes for supported configured LLM credentials, including diagnostic-only requalification for deferred keys at the user's explicit request, and persists sanitized observations to NOVA/health_state.json on nova-operational-state.
7. The existing GPU heartbeat remains distinct: it records presence/configuration state for every registered GPU candidate, and performs live provider checks only after a provider-specific API adapter and approved compute test are configured. Missing adapters/keys are UNCONFIGURED/BLOCKED, never false GPU failure or proof of capacity.
8. Heartbeat health observations never activate a deferred provider, remove a persisted down marker, change routing policy, create/rotate credentials, change billing, or print secret values/raw provider response bodies.
9. Tests cover mode/event gating, monthly rate limits, secret absence, no-write permissions, regression fail-closed decisions, heartbeat candidate coverage, and the distinction between API-key presence, API response health, and GPU allocation.
10. Update documentation to distinguish architecture readiness from actual operation and public claims. Do not state Strong RSI is operational until the required gates have passed in evidence.

## Navigation targets

- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/.github/workflows/nova-rsi.yml
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/rsi_policy.json
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/README.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/STRONG-RSI-AND-COLLECTIVE-RESILIENCE.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/preflight.py
- https://github.com/ACROWN-System/NOVA/blob/main/.github/workflows/nova_heartbeat.yml
- https://github.com/ACROWN-System/NOVA/blob/main/.github/workflows/nova_GPU_heartbeat.yml
- https://github.com/ACROWN-System/NOVA/blob/main/NOVA/provider_qualification.py
- https://github.com/ACROWN-System/NOVA/blob/main/NOVA/gpu_heartbeat.py
- https://github.com/ACROWN-System/NOVA/blob/main/NOVA/operational_state.py
- https://github.com/ACROWN-System/NOVA/blob/main/NOVA/health_state.json

## Scope and preservation

**In scope**
- Add a dedicated manual-only Weak RSI report workflow.
- Restrict Strong RSI to a once-monthly scheduled attempt and a monthly execution budget.
- Keep direct main writes, auto-merge, policy self-modification, evaluator self-modification, and unreviewed promotion prohibited.
- Remove GitHub PAT validation from AI-provider health qualification and report GitHub-managed authentication separately.
- Extend the existing six-hour LLM heartbeat to run bounded diagnostics and persist credential/API observations without changing routing.
- Extend the GPU heartbeat's empty-roster state to enumerate GPU candidate credential configuration without treating key presence as actual GPU health.
- Add tests and docs, submit PRs, inspect checks and changed-file scope.

**Out of scope**
- Marking current RSI implementation as READY or enabling the benchmark by fiat.
- Automatically accepting/model-merging code changes.
- Treating all providers as no-card/free merely because a probe returned HTTP 200.
- Activating Mistral or Cerebras in production; Mistral is diagnostic-only and remains DEFERRED, Cerebras remains deferred by payment-method eligibility.
- Using the GitHub PAT as a model provider or as a replacement for the ephemeral Actions token.
- Claiming the current GPU roster has live compute or satisfies the project's 86,400 GPU-minutes/month target.
- Secret creation/rotation, account setting/billing changes, or any payment-method registration.

## Impact Analysis

**IF modified:** human-requested Weak RSI becomes a separate, non-mutating proposal process; Strong RSI is no more frequent than monthly and remains fully blocked unless its exact evaluation/sandbox/provider requirements are satisfied; NOVA stores current, auditable observations for supported LLM credentials and GPU candidate readiness without conflating them with production routing.

**IF not modified:** manual requests could reach the same lifecycle as scheduled autonomous RSI; scheduled Strong RSI remains weekly and manually dispatchable; GitHub authentication status can be confused with inference availability; the empty GPU heartbeat can hide candidate-key configuration state, and operational telemetry may not show key health across cycles.

## Verification and handoff

- Validate workflow YAML and JSON policies, compile Python, run all unit tests and CodeQL.
- Confirm monthly Strong RSI has a single scheduled trigger and no workflow_dispatch event.
- Confirm Weak RSI is workflow_dispatch-only and has no write, pull-request, or merge permissions.
- Confirm readiness remains INCOMPLETE and auto-merge remains off until separate evidence justifies a change.
- Confirm heartbeats persist only safe diagnostic fields to the operational-state branch, and do not alter active/deferred roster entries or persisted down markers.
- Keep this plan active until both PRs pass; do not mark public Strong RSI as operational merely because its schedule/configuration has merged.
