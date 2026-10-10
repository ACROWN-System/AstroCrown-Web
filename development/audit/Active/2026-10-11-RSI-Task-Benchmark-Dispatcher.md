# Active Navigation Plan — Task-Specific RSI Benchmark Dispatcher

**Date:** 2026-10-11  
**Status:** ACTIVE — dispatcher candidate; no benchmark profile approved or enabled  
**Objective:** Prevent a narrow benchmark from being applied to an unrelated RSI candidate. Introduce a protected dispatcher that accepts only an exact approved changed-file scope and matching benchmark command, while leaving the current context-packing profile disabled pending independent review.

## Mission and source of truth

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. RSI serves the collective mission and does not gain authority from its own claimed performance.

Primary protocol: development/nova-recursive-self-improvement/CAPABILITY-BENCHMARK-PROTOCOL.md.  
Implementation: the protected RSI evaluator, benchmark runner and policy.  
Method: development/Prompt-Guide.md and development/DEVELOPMENT-AND-AUDIT-CONVENTION.md.

## Findings

- The only current workload is a narrow context-packing comparison.
- RSI may eventually propose changes across multiple subsystems; a single universal benchmark would misrepresent untested candidate capabilities.
- The Docker runner and evaluator are implemented as a candidate but require independent security review.
- RSI readiness remains INCOMPLETE; main promotion remains disabled.

## Scope

1. Add a pure dispatcher that resolves a benchmark profile only when the exact changed-file set and configured command match.
2. Add a protected JSON profile registry.
3. Define one disabled candidate profile for the context packer only.
4. Return BLOCKED for unknown scope, multiple-file/mixed-scope candidates, disabled profiles, missing configuration, or command mismatch.
5. Integrate the dispatcher into the protected evaluator before executing benchmark commands.
6. Add deterministic tests covering exact match, profile disabled, unrelated/mixed scope, missing profile, malformed config, and command mismatch.
7. Protect the dispatcher and profile registry from candidate modification.

## Out of scope

- Enabling the context-packing profile.
- Configuring RSI_BENCHMARK_COMMAND.
- Changing RSI readiness, provider settings, secrets, billing, runtime permissions, or the Docker sandbox.
- Claiming that the context-packing benchmark measures general intelligence or qualifies unrelated changes.

## Acceptance criteria

- No benchmark runs unless an enabled profile matches the complete changed-file set.
- Unknown, mixed, or broader candidate scopes return BLOCKED.
- The executable command must exactly match the selected profile's approved command.
- The context-packing profile remains disabled and carries an explicit independent-review requirement.
- Tests verify that a synthetic enabled profile matches only its exact scope; production configuration still blocks.
- implementation_readiness.status remains INCOMPLETE and promotion.allow_main remains false.

## Impact Analysis

**IF modified:** task-specific benchmark selection becomes explicit and fail-closed. The first workload cannot be represented as evidence for unrelated routing, model, orchestration, provider, or security changes.

**IF not modified:** a single configured command could be applied to candidates whose claimed capabilities differ from what the workload measures.

## Verification and handoff

- Run all development Python compilation and RSI tests.
- Verify the dispatcher/profile files are protected.
- Verify the context-packing profile remains disabled.
- Merge only if tests pass; independent approval remains required before any profile is enabled or readiness is reconsidered.
