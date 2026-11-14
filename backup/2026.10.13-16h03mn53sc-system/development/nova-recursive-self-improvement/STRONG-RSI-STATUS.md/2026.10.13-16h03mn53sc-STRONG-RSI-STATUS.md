# Strong RSI Status — Suspended Until Fully Operational

**Decision date:** 2026-10-12  
**Lifecycle:** `SUSPENDED`  
**Implementation readiness:** `INCOMPLETE`  
**Active GitHub Actions workflow:** No. The monthly workflow template is preserved in `suspended/STRONG-RSI-MONTHLY-WORKFLOW.yml`, outside `.github/workflows/`.

## Why Strong RSI is suspended

A monthly workflow that always exits at an incomplete-readiness gate is not the requested Strong RSI capability. It does not establish a real self-improvement result, and a scheduled blocked run still consumes runner time. Therefore the workflow is removed from active GitHub Actions discovery until the entire Strong RSI lifecycle is ready to run with meaningful, reviewable evidence.

No provider call, cycle, candidate generation, candidate execution, branch creation, or candidate PR should be initiated by Strong RSI during suspension. The protected engine and evaluator remain available for development and testing, but no automation should call the Strong cycle.

## Confirmed readiness gaps at suspension

The post-merge credential-readiness report for AstroCrown-Web dated 2026-10-12 reported:
- `GROQ_API_KEY_01`: `MISSING` in AstroCrown-Web Actions secrets (NOVA's separate repository key does not automatically exist in this repo).
- `NOVA_RSI_APP_CLIENT_ID`: `MISSING`.
- `NOVA_RSI_APP_PRIVATE_KEY`: `MISSING`.
- `RSI_AI_COMMERCIAL_ELIGIBILITY`: `NOT_PASS`.
- `RSI_BENCHMARK_COMMAND`: `MISSING`.
- `implementation_readiness`: `INCOMPLETE`.

These are repository-scoped states and must be freshly rechecked before reactivation. Adding a secret or variable by itself is not sufficient.

## Requirements before reactivation

1. **Capability readiness:** every mandatory Strong RSI component is implemented, tested, reviewed, and explicitly accepted by a readiness decision; deterministic code-health checks alone are not a capability benchmark.
2. **Provider readiness:** the exact provider/key/model is configured in AstroCrown-Web; a secret-safe probe confirms live authentication and valid response; the provider's current model limits and available budget are accounted for. The workflow must not assume that a NOVA secret is shared with AstroCrown-Web.
3. **Data-use and commercial eligibility:** current provider terms, data handling, training/use of submitted content, commercial eligibility, and any scope limits are reviewed for the exact context and recorded; never set the eligibility flag merely to bypass the gate.
4. **Independent task benchmark:** benchmark adequacy, workload and corpus provenance, evaluator integrity, baseline reproducibility and profile selection are independently reviewed and evidenced. The context-packing candidate currently remains disabled/unapproved and cannot be promoted simply because its test runs.
5. **Sandbox:** pinned image and expected digest verified; isolation boundaries, no-network behavior, no inherited secrets, read-only candidate-control plane, resource limits, termination/cleanup behavior, and remaining runner/Docker risks independently assessed.
6. **Non-degradation:** all mandatory protected checks pass with zero regressions; task-matched benchmark demonstrates strict measurable improvement against the exact full baseline SHA; missing, inconclusive, failed, or anomalous evidence maps to `BLOCKED`/no candidate.
7. **Evidence integrity:** manifest, exact file scope, source patch, benchmark outputs, provider usage/budget accounting, baseline SHA and actually applied worktree are verified by trusted control-plane code not editable by the candidate.
8. **Retention and human decision:** least-privilege repository-scoped GitHub App credentials are configured; the verified candidate PR is successfully created; required branch protections/status checks are effective; direct main writes and auto-merge remain disabled; human review and explicit merge decision remain required.
9. **Operational proof:** end-to-end dry run and then a controlled real attempt produce a dated evidence package with status, latency/token usage, safety results, benchmark baseline/candidate results, resource use, cleanup result, and rollback route.
10. **Public claim review:** public wording describes exactly what was tested and proven. Do not claim globally optimal, guaranteed zero degradation, or fully autonomous operation beyond the validated evidence.

## Reactivation procedure

1. Complete the requirements above and update linked evidence, not just this checklist.
2. Re-run protected CI, security review, provider readiness and exact benchmark checks against the candidate activation commit.
3. Review the protected policy, this document, and the activation diff as a human.
4. Only after explicit authorization, move the preserved YAML back to `.github/workflows/nova-rsi.yml`, update tests and docs, and verify that branch rules and candidate-retention permissions remain fail-closed.
5. Verify the actual activated schedule and perform an explicitly controlled end-to-end attempt with observable evidence. If any requirement fails or remains uncertain, return to `SUSPENDED`.

Weak RSI is separate: it remains manually triggered and report-only, and it does not count as Strong RSI readiness or operation.
