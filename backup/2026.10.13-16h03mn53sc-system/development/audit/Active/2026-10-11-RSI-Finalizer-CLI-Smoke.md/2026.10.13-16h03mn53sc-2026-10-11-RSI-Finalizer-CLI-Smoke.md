# RSI Workflow Cleanup CLI Smoke Test — Navigation Plan

**Date:** 2026-10-11  
**Status:** ACTIVE — end-to-end cleanup CLI smoke coverage under verification  
**Objective:** Validate the exact standalone cleanup command used by the GitHub Actions finalizer against a real Docker container, rather than testing only the underlying cleanup function.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. Verification should exercise the actual operational entry point wherever practical.

Method: [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md) and [workflow cleanup finalizer review](../Active/2026-10-11-RSI-Workflow-Cleanup-Finalizer.md).

## Finding

The actual Docker smoke test launched an evaluation-labelled container and called the underlying `cleanup_evaluation_containers` helper directly. The GitHub Actions finalizer invokes `sandbox_runtime.py --cleanup-evaluation-id`; the CLI was covered by a mocked unit test but not by an actual container smoke test.

## Scope

1. Launch a detached container with a unique evaluation ID label.
2. Invoke the exact standalone CLI entry point used by the workflow, with the same evaluation ID.
3. Require a successful structured result including `cleanup_confirmed: true`.
4. Independently query Docker for any remaining containers with the evaluation label.
5. On CLI error/timeout/invalid output, attempt best-effort cleanup and report smoke-test failure.
6. Preserve readiness, promotion, provider, credentials, and permissions unchanged.

## Acceptance criteria

- The Docker smoke test invokes `sys.executable sandbox_runtime.py --cleanup-evaluation-id ID`.
- CLI success alone is insufficient; the smoke test also verifies the Docker label inventory is empty.
- CI passes compilation, the full RSI test suite, immutable image verification, and actual Docker isolation/timeout/finalizer-CLI smoke tests.
- RSI readiness remains INCOMPLETE, `promotion.allow_main` remains false, and the benchmark registry/profile remain unapproved/disabled.
