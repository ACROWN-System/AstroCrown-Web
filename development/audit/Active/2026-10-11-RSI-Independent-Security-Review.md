# RSI Independent Security Review — Hardening Plan

**Date:** 2026-10-11  
**Status:** ACTIVE — targeted fail-closed remediations; independent security approval remains BLOCKED  
**Objective:** Close two review findings in the protected RSI control plane: enforce the benchmark registry's approval state, and make timeout/output-limit container cleanup resilient to a Docker client/container-ID-file race. Keep the benchmark disabled and RSI readiness INCOMPLETE.

## Mission and source of truth

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. RSI is a means serving the collective; it does not gain authority from self-evaluation.

Primary implementation: `development/nova-recursive-self-improvement/`.  
Method: `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` and the protected capability benchmark protocol.

## Preliminary findings

1. **Finding RSI-SEC-001 — Approval metadata is not enforced by the dispatcher.** `benchmark_dispatcher.resolve_profile` checks only the profile's `enabled` value, exact changed-file scope, and command. It does not enforce the registry-level `status` or require an approved `review_status`. The currently configured profile remains disabled, but a registry entry could be marked enabled while its surrounding review status still says unapproved.
2. **Finding RSI-SEC-002 — Container cleanup can miss a timed-out run.** `sandbox_runtime._run_bounded` kills the Docker CLI on timeout/output overflow, then cleanup depends on reading the Docker `--cidfile`. If the daemon created the container but the client had not finished writing the ID file, cleanup can miss a still-running container. This is a resource-leak/availability risk, not evidence of host escape.
3. **Residual risk — Docker/kernel/daemon and image supply-chain exposure remains.** These fixes do not establish complete sandbox security or replace independent threat-model review.

## Scope

1. Make benchmark profile selection fail closed unless the registry and selected profile carry explicit approved states.
2. Add tests proving enabled-but-unapproved, missing/malformed approval, and approved exact-match cases are handled correctly.
3. Give every sandbox invocation a unique protected label and discover matching containers by that label during cleanup, even when the ID file is absent or malformed.
4. Add tests for ID-file cleanup and label-based fallback cleanup, covering timeout/output-limit cleanup paths.
5. Document the findings, remediations, tests, and unresolved threat-model points in a completed review record after verification.
6. Preserve the policy and profile safety gates; no profile enabling, RSI activation, provider calls, or secret/permission/billing changes.

## Out of scope

- Enabling `context-packing-v1` or setting its review status to approved.
- Changing `implementation_readiness.status = INCOMPLETE` or `promotion.allow_main = false`.
- Calling external AI providers, modifying secrets, billing, credentials, runtime permissions, or workflow privileges.
- Claiming that unit tests prove complete Docker isolation.

## Acceptance criteria

- Dispatcher returns `BLOCKED` unless the registry has the explicit accepted status and the selected profile has an accepted review status, in addition to the existing exact-scope, unique-profile, enabled, and command checks.
- Production registry/profile stay unapproved and disabled; a matching candidate remains blocked.
- Container runs have a unique cleanup label; on timeout or output-limit breach, cleanup attempts the cidfile and independently discovers all containers with that run label, then kills/removes them.
- Tests demonstrate both cleanup discovery paths and approval-state fail-closed behavior.
- RSI CI passes compilation, unit tests, immutable-image verification, and actual sandbox smoke testing.
- The final record clearly distinguishes automated test evidence from independent security approval and lists remaining residual risks.
