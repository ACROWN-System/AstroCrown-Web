# Completed Navigation Plan — RSI Docker Isolation Candidate

**Date:** 2026-10-11  
**Status:** COMPLETED — this Active-path file is retained as an archival mirror; independent security verification remains BLOCKED  
**Canonical completed record:** [Completed RSI Docker Isolation plan](../Completed/2026-10-11-RSI-Docker-Isolation.md)  
**Objective:** Replace host execution of candidate-controlled RSI tests and benchmark commands with a fail-closed, resource-bounded Docker isolation boundary, while preserving independent control logic and the `INCOMPLETE` readiness state.

## Mission and source of truth

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. Isolation and recursive self-improvement are means of preserving and serving the collective, not permission to execute untrusted code without authorization.

Primary implementation: `development/nova-recursive-self-improvement/`.  
Method: `development/Prompt-Guide.md`, `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, the protected RSI policy, and the existing benchmark protocol.

## Current findings

- The evaluator currently executes compilation, unit tests, and the configured benchmark command as host subprocesses using a sanitized environment and OS resource limits.
- A sanitized environment and detached Git worktree do not constitute an OS-level sandbox.
- The initial context-packing workload is merged but remains an unapproved, task-specific benchmark candidate. It must not be used as the sole global benchmark for all possible RSI changes.
- The protected policy remains `implementation_readiness.status = INCOMPLETE` and `promotion.allow_main = false`.

## Scope

1. Add a Docker runner requiring an immutable image digest and expected image ID.
2. Apply `--network=none`, read-only container root, read-only candidate/benchmark mounts, non-root UID, no added capabilities, no-new-privileges, private IPC, CPU/memory/PID/CPU-time/file-size/file-descriptor limits, an isolated temporary filesystem, bounded output, and strict timeout.
3. Ensure candidate-controlled unit tests and benchmark commands run inside the container; keep trusted Git inspection and orchestration in the host-side protected evaluator.
4. Materialize the exact baseline and candidate context-packer source files outside the candidate mount, mount them read-only, and pass exact commit identifiers into the benchmark.
5. Add unit tests for command construction, environment allowlisting, digest validation, fail-closed behavior, and output limits.
6. Add a harmless runtime smoke test on the GitHub-hosted CI runner proving workspace writes, host sentinel access, and network access are blocked.
7. Pre-pull and verify the pinned image in a no-secret preflight job before the protected provider-secret boundary.
8. Keep the sandbox adapter, evaluator, benchmark runner/protocol, policy, and tests protected from automated candidate modification.

## Out of scope

- Setting RSI readiness to READY.
- Running a real RSI proposal cycle, invoking external model providers, or exposing provider/GitHub credentials inside the sandbox.
- Automatically approving the sandbox solely because unit tests pass.
- Treating a container as perfect protection against kernel/runtime vulnerabilities; residual risk and independent review must be recorded.
- Enabling the single context-packing benchmark globally while candidate proposals span multiple subsystems.

## Candidate immutable runtime

- Image: `python@sha256:34386ef0cb081344d7ec1c103ba398e6e9f64e9ab3a1509accc92a4e24a07258`
- Expected linux/amd64 image ID: `sha256:4f228bc1cbcfc794e4878312cfc241d368eff55a21c08d1e2bb263116c4ef524`
- Source metadata: https://github.com/docker-library/repo-info/blob/master/repos/python/remote/3.12.15-slim-bookworm.md

The image must be pulled and checked before untrusted execution. Runtime invocations use `--pull=never` and fail closed if the verified image is not present.

## Acceptance criteria

- No candidate-controlled test or benchmark command falls back to host execution if Docker/image validation fails.
- Only an explicit allowlist of non-secret variables enters the container.
- No provider key, GitHub token, host Docker config, host home, or host filesystem root is mounted into the container.
- The candidate workspace and benchmark inputs are read-only; only an ephemeral `/tmp` is writable.
- Network is disabled; Linux capabilities are dropped; no-new-privileges, non-root identity, private IPC, CPU/memory/PID and ulimit constraints are set.
- Process output is bounded, with timeout and forced termination.
- Baseline and candidate benchmark sources are materialized by the protected host evaluator for their exact full commit SHAs and mounted read-only; the in-container runner verifies SHA-labelled file names.
- CI smoke tests prove write/network/host-sentinel isolation on the actual runner.
- RSI readiness remains `INCOMPLETE`, and `promotion.allow_main` remains `false`.

## Execution outcome

- AstroCrown-Web PR [#58](https://github.com/ACROWN-System/AstroCrown-Web/pull/58) merged as `1ccd5df56abccf073a31f78ca39e284e9ac73737`.
- The pinned Docker image digest and expected image ID were verified in CI.
- The CI run compiled the development tree and passed all 41 RSI unit tests.
- The real Docker smoke test passed: the container could not write to the candidate workspace, could not see the host sentinel path, and could not reach the network target.
- The post-merge RSI test passed; the site build and build-status report passed. Site deployment was observed in progress at archive preparation.
- Verified that candidate-controlled compile, unit-test and benchmark commands use the fail-closed Docker adapter, and that the protected policy remains `INCOMPLETE` with `allow_main: false`.
- Residual risks remain: Docker/kernel/runtime and image supply-chain vulnerabilities require independent security review. The context-packing workload is not approved as a universal benchmark and must remain unconfigured until a task-specific scope/dispatcher and remaining readiness gates are reviewed.
- No provider calls, credentials, billing or permission changes were made.

## Impact Analysis

**IF modified:** candidate code and configured benchmark commands gain a meaningful OS-level execution boundary, reducing the risk that untrusted code can access host files, network endpoints, credentials, or other processes. Failure to establish the exact pinned runtime stops evaluation rather than silently weakening isolation.

**IF not modified:** candidate-controlled tests and benchmark commands continue to execute as host subprocesses; RSI remains correctly blocked, but this isolation blocker does not progress.

## Verification and handoff

- Run all existing and new tests and compile the development tree.
- Run the isolated Docker smoke tests in CI using the digest-verified image.
- Inspect the final PR diff and exact image pin.
- Record residual limitations and preserve the protected readiness gate.
- If checks pass, merge as a sandbox implementation candidate only; independent security review remains necessary before readiness can be reconsidered.
