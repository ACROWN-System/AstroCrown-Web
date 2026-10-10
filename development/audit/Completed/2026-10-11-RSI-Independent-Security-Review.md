# Completed Security Review — RSI Approval Gates and Sandbox Timeout Cleanup

**Date:** 2026-10-11  
**Status:** TARGETED REVIEW AND REMEDIATION COMPLETED; independent sandbox/security approval remains BLOCKED  
**Objective:** Close two fail-open/resource-cleanup weaknesses in the RSI benchmark dispatcher and candidate Docker execution boundary without activating RSI.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. RSI remains a means of supporting the collective and cannot self-authorize its own readiness.

The review followed the [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md) and the [RSI Capability Benchmark Protocol](../../nova-recursive-self-improvement/CAPABILITY-BENCHMARK-PROTOCOL.md). This is a targeted code review and test-backed remediation, not a claim that an independent third party has certified the full sandbox.

## Findings and remediation

### RSI-SEC-001 — Dispatcher did not enforce review-state metadata

**Original condition:** A profile could pass based on exact path scope, command, and `enabled: true` even if the profile or registry still carried an unapproved review status.

**Remediation:** `benchmark_dispatcher.resolve_profile` now requires all of the following before selecting a profile:
- registry status exactly `INDEPENDENT_REVIEW_APPROVED`;
- profile review status exactly `INDEPENDENT_REVIEW_APPROVED`;
- `enabled: true`;
- an exact match of the complete candidate changed-file set;
- an exact command match to the selected profile;
- a unique matching profile and well-formed configuration.

Missing, malformed, unknown, or unapproved states return `BLOCKED`. Regression tests cover registry-unapproved and profile-unapproved cases, and retain the exact-match/negative scope tests.

**Important limitation:** These strings are fail-closed control-plane gates, not cryptographic proof of independent review. They must not be set based only on a code change or a passing test. An actual review trail and supporting evidence remain necessary.

### RSI-SEC-002 — Cleanup could miss a container if Docker had not written its cidfile

**Original condition:** On timeout or output-limit breach, the client process could be killed before the Docker daemon's container ID had been written to the cidfile. Cleanup relying only on that file could therefore miss a daemon-managed container.

**Remediation:** Each sandbox run now receives a unique, validated 32-character lowercase-hex run ID, recorded as Docker label `nova.rsi.run_id=<run_id>`. Cleanup uses the cidfile when available and independently queries Docker for containers carrying the unique label, then issues kill/remove operations for IDs found through either path. The output-limit path also passes the run ID through cleanup.

Added unit tests cover:
- invalid run IDs;
- cleanup through a valid cidfile;
- label-based discovery when the cidfile is missing;
- label-based discovery when the cidfile is malformed.

The real Docker smoke test now launches a sleeping container command, confirms the command started, triggers the timeout, and verifies that no container remains with the unique run label.

## Changes merged

AstroCrown-Web [PR #62](https://github.com/ACROWN-System/AstroCrown-Web/pull/62) was merged on 2026-10-11 local date.

- Merge commit: `87b2e016c22af9ef2a0020adfa03aa4337e65356`
- Tested PR head: `0db2a40c0793f003ed9f0fe34556ddb1316a8ec1`
- Main policy blob after merge: `e1377abf9b8d0dd972a424faad9c6d6136a820b5`
- Files changed: protected benchmark dispatcher, sandbox runtime, relevant unit-test fixtures and regression tests, benchmark protocol, RSI README, and this audit trail.

## Verification evidence

GitHub Actions run [#38088902382](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38088902382) completed successfully.

Observed checks:
- immutable Docker image digest and expected local image ID: PASS;
- `python -m compileall -q development`: PASS;
- RSI unittest suite: **56 tests passed**;
- Docker isolation smoke test: PASS, including read-only workspace, host-sentinel path separation, network denial, and timeout cleanup;
- smoke-test output contained `sandbox-smoke-pass` and confirmed `timed-out container was discovered by run label and removed`.

One earlier CI attempt failed two existing evaluator benchmark tests because their mocked registry/profile fixtures lacked the newly required approved states. The production code correctly returned BLOCKED; the test fixtures were updated to model an approved test-only profile, and the subsequent full CI run passed. No production registry approval state was changed to accomplish this.

## Readiness and authorization invariant — verified after merge

The current main policy still records:
- `implementation_readiness.status = INCOMPLETE`;
- `promotion.allow_main = false`.

The production benchmark registry remains `CANDIDATE_REGISTRY_NOT_INDEPENDENTLY_APPROVED`; profile `context-packing-v1` remains `enabled: false` and `BLOCKED_PENDING_INDEPENDENT_BENCHMARK_AND_EXECUTION_REVIEW`.

No AI provider calls were made. No secrets, credentials, billing configuration, or workflow permissions were changed. RSI was not activated.

## Follow-up hardening after the initial review

Two additional findings were remediated and independently exercised through CI after this initial review record was completed:

- [Sandbox cleanup verification](./2026-10-11-RSI-Sandbox-Cleanup-Verification.md): PR #71, merge `088643ed4b2a984670bfd1eed0009de4f1d8403e`; 85 unit tests and the real Docker timeout-cleanup smoke test passed. Cleanup now checks for all labelled containers even when a cidfile exists, attempts removal, and blocks if absence cannot be confirmed.
- [Executable-mode consistency](./2026-10-11-RSI-Executable-Mode-Consistency.md): PR #72, merge `866923a9fbcb173ba90adb508048faa4248b2690`; 86 unit tests and the real Docker timeout-cleanup smoke test passed. The evaluator now rejects changed executable files at evaluation time, matching retention verification.

These are test-backed engineering remediations; they do not constitute independent third-party certification of the overall sandbox or benchmark.

## Remaining blockers and residual risks

This targeted review does **not** close the independent security approval gate. Remaining work includes an independent threat-model and configuration review covering at least:
- Docker daemon and host-kernel boundary / container escape risk;
- runner and Docker CLI trust, daemon access and privilege boundary;
- supply-chain provenance and patch/refresh strategy for the pinned image;
- residual process, filesystem, side-channel and denial-of-service risks;
- end-to-end evaluator integrity and benchmark corpus adequacy;
- proof that the human review trail is external to, and not self-issued by, the benchmark registry state.

The context-packing benchmark remains narrow and unapproved. Passing its tests is not a general-intelligence result and must not qualify unrelated candidate types.

## Impact Analysis

**IF modified:** an unapproved benchmark cannot become selectable merely by toggling its enabled flag, and timeout/output-limit cleanup has an independent discovery path when Docker's cidfile is absent or malformed.

**IF not modified:** approval metadata could be ignored by the dispatcher, and a container created before cidfile completion could be missed during cleanup, leaking runtime resources after a bounded evaluation fails.

## Handoff

- Keep RSI implementation readiness `INCOMPLETE`.
- Keep `promotion.allow_main = false`.
- Keep the context-packing profile disabled and unapproved.
- Require genuine independent review evidence before setting any review-state label to approved or reconsidering RSI readiness.
