# Completed Navigation Plan — Context Packing Benchmark and RSI Workload

**Date:** 2026-10-11  
**Status:** COMPLETED — this Active-path copy is retained as a detailed archival mirror; independent benchmark approval remains BLOCKED  
**Canonical completed record:** [Completed context-packing benchmark plan](../Completed/2026-10-11-Context-Packing-Benchmark-Workload.md)  
**Objective:** Close part of the RSI capability-benchmark gap by implementing and testing one deterministic, zero-cost workload for query-aware context packing that preserves complete source records, provenance, temporal status, and hard character budgets.

## Mode and source of truth

**Mode:** Implementation, test, benchmark design, and evidence-led review.  
**Repository:** https://github.com/ACROWN-System/AstroCrown-Web  
**Canonical mission:** https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md  
**Existing protocol:** https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/CAPABILITY-BENCHMARK-PROTOCOL.md  
**Method:** `development/Prompt-Guide.md` and `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`.

## Findings

- RSI's evaluator already passes exact baseline/candidate commit identifiers and requires machine-verifiable JSON with a boolean `candidate_better`.
- The documented remaining benchmark gap is an evidence-backed workload, not transport of the result.
- NOVA's context/memory subsystem currently records architecture and candidates but has no executable context-packing implementation.
- RSI readiness must remain `INCOMPLETE`; an initial narrow workload does not independently validate all evaluator integrity or execution isolation.

## Scope

1. Implement a deterministic, dependency-free context packer that selects complete source records under a hard character budget.
2. Preserve item identifiers, source provenance, observation date, status/uncertainty metadata, and full content. Never truncate an individual record to force it into budget.
3. Add a fixed, synthetic, non-sensitive benchmark corpus covering query relevance, temporal supersession, and RSI readiness/isolation evidence.
4. Add a commit-aware benchmark runner that compares the exact baseline and candidate versions, checks output integrity/budget/provenance, and only reports strict improvement without per-case required-evidence regression.
5. Add deterministic unit tests and protect the benchmark runner, corpus, protocol, and tests from automated RSI candidate patches.
6. Document the narrow scope, known limits, reproducible command, and blocked approval status.

## Out of scope

- Marking the workload independently approved or changing RSI readiness.
- Configuring `RSI_BENCHMARK_COMMAND` to run autonomously before independent review.
- Running an RSI cycle, making provider calls, needing credentials, modifying billing, or enabling candidate promotion.
- Claiming this measures general intelligence, fully validates the evaluator, or proves an OS-level sandbox.
- Modifying runtime/public website behavior.

## Navigation targets

- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-context-memory-optimization/README.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/CAPABILITY-BENCHMARK-PROTOCOL.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/evaluator.py
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/rsi_policy.json
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/tests/
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/DEVELOPMENT-AND-AUDIT-CONVENTION.md
- https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md

## Acceptance criteria

- Packer output never exceeds the requested character budget.
- Selected records are never truncated, duplicated, or stripped of source/date/status metadata.
- Selection is deterministic for fixed items, query, and budget.
- Malformed records, duplicate IDs, invalid budgets, and metadata with line breaks are rejected.
- The fixed workload shows the context-aware packer improves required-evidence coverage over a documented input-order first-fit reference without per-case regressions.
- Benchmark reads both exact commit versions; missing commit objects/code produce BLOCKED output rather than fabricated evidence.
- Every benchmark result has machine-verifiable baseline/candidate commit identifiers, aggregate metrics, per-case results, and provenance/budget integrity status.
- Benchmark artifacts, corpus, protocol, and RSI tests are protected against automatic candidate modifications.
- `implementation_readiness.status` remains `INCOMPLETE` and `promotion.allow_main` remains `false`.

- Do not set this workload as the global RSI benchmark while candidate proposals can target multiple subsystems; require a validated context-packing scope or an independently reviewed task-specific benchmark dispatcher.

## Execution outcome

- AstroCrown-Web PR [#56](https://github.com/ACROWN-System/AstroCrown-Web/pull/56) merged as `12d49fe8d85ddc8d53617e38208f4d8feb752d7a`.
- The CI run compiled all development Python and passed all 34 RSI unit tests, including nine new context-packing tests.
- The Jekyll build, build-status report, and deployment jobs also completed successfully on the merge commit.
- Verified that `implementation_readiness.status` remains `INCOMPLETE`, `promotion.allow_main` remains `false`, and the benchmark runner/corpus/protocol are protected from automatic RSI candidate modifications.
- The workload remains an unapproved, narrow context-packing benchmark candidate. The protected `RSI_BENCHMARK_COMMAND` was not configured and autonomous RSI was not enabled.
- No provider calls, secrets, billing changes, runtime application changes, or permission changes were made.

## Impact Analysis

**IF modified:** the project gains a narrow executable workload for a real capability-producing mechanism, a reproducible baseline comparison, and guardrails against context compression that drops required evidence. This makes one part of the benchmark gap actionable without external cost or provider access.

**IF not modified:** the evaluator continues to have a strict result interface but no repository-owned task workload, so actual capability improvement remains blocked.

## Verification and handoff

- Run the existing RSI CI workflow through the changed RSI path.
- Review the changed-file scope and benchmark/test diffs.
- If tests pass, merge the implementation as a *candidate benchmark workload*, not as a declaration that the workload has independent approval.
- Keep the RSI readiness gate blocked until independent integrity validation and acceptable execution isolation are separately evidenced.
