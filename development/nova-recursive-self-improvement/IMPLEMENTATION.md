# NOVA RSI Implementation Runbook

## Implemented components

- `rsi_engine.py` — autonomous candidate proposal, bounded context/output generation, patch validation, isolated worktree execution, and evidence generation.
- `evaluator.py` — protected evaluator using the protected policy and enforcing machine-verifiable benchmark evidence rather than candidate-controlled evaluation code.
- `sandbox_runtime.py` — fail-closed Docker adapter for candidate-controlled compilation, unit tests, and benchmark execution, using an immutable image pin, no network, read-only source mounts, a strict environment allowlist, resource limits, timeout, bounded output, and explicit container cleanup.
- `rsi_policy.json` — protected scope, evaluation, promotion, and resource-budget policy.
- `candidate.schema.json` — candidate payload contract.
- `tests/test_rsi_engine.py` — deterministic tests for candidate parsing, protected-path enforcement, secret-pattern rejection, usage accounting, and decision precedence.
- `tests/test_evaluator.py` — protected benchmark-contract tests, including baseline/candidate commit propagation and machine-verifiable success/failure.
- `.github/workflows/nova-rsi.yml` — scheduled/manual autonomous cycle with a separate read-only evaluation phase and write-capable candidate-retention phase.

## Runtime flow

Baseline
→ AI proposal
→ patch scope validation
→ detached candidate worktree
→ candidate commit
→ protected evaluator
→ deterministic checks
→ capability benchmark
→ evidence
→ PASS / FAIL / BLOCKED
→ qualified-candidate branch and pull request when PASS

The protected evaluator, benchmark dispatcher, sandbox adapter, RSI policy, and benchmark profile registry are copied from the trusted workflow checkout into a separate read-only control directory outside the candidate worktree. The evaluator is launched from that trusted control directory and receives explicit paths to the trusted policy and registry; it does not import its control logic or acceptance policy from the candidate worktree. The candidate worktree remains the inspected/evaluated subject. Candidate-controlled Python compilation, unit tests, and benchmark code execute inside the pinned Docker runtime with networking disabled, a read-only workspace, no inherited credentials, a non-root identity, dropped capabilities, no-new-privileges, resource limits, bounded output, and forced container termination on timeout. The benchmark receives only SHA-labelled baseline/candidate source snapshots through a separate read-only mount; it does not need the host Git database.

The candidate worktree remains detached and has no inherited provider key or GitHub token. Docker availability, image digest/ID, and container execution must all verify; there is no host-execution fallback.

## RSI resource budget

The protected rsi_policy.json currently enforces:

- maximum 1 proposer API call per RSI cycle;
- maximum 1 candidate attempt per cycle;
- maximum 24,000 repository-context characters sent to the proposer;
- maximum 1,536 requested output tokens from the proposer;
- maximum 8,000 reported total tokens per cycle;
- required OpenAI-compatible usage telemetry so the cycle cannot silently bypass token accounting;
- maximum 1 RSI workflow cycle per UTC day.

The daily limit is enforced before proposal generation by querying the workflow's own GitHub Actions run history. Because the default scheduler runs weekly, the default autonomous cadence remains low; a manual run cannot be repeated without limit.

These controls protect RSI from becoming an uncontrolled consumer of NOVA's AI allowance. They bound RSI itself; they do not claim to know unrelated API usage performed by other NOVA subsystems through the same provider account.

## Required GitHub configuration

Repository secret:

`NOSANA_LLM_API_KEY_01`

Repository variables:

- `RSI_AI_BASE_URL` — OpenAI-compatible chat-completions endpoint used by the proposer.
- `RSI_AI_MODEL` — model identifier used for candidate generation.
- `RSI_AI_COMMERCIAL_ELIGIBILITY` — must be exactly `PASS` before the workflow will invoke the configured proposer.
- `RSI_BENCHMARK_COMMAND` — protected benchmark command supplied by repository configuration.

The actual API key must never be committed to the repository.

## Implementation readiness gate

The autonomous RSI path is intentionally **not operational while implementation is incomplete**.

The protected `rsi_policy.json` currently declares `implementation_readiness.status = INCOMPLETE`. This state is enforced at three layers:

- the workflow refuses to start the proposer/evaluation lifecycle;
- `rsi_engine.py` stops before making an AI proposer call;
- `evaluator.py` returns `BLOCKED` rather than PASS.

The readiness state must remain `INCOMPLETE` until all mandatory RSI implementation components have been implemented and independently verified. Changing the readiness field to `READY` is therefore a release/readiness decision, not a candidate-generated result.

## Benchmark requirement

The capability benchmark is mandatory in the current policy. Because the repository does not yet have an approved NOVA capability benchmark, an RSI cycle without `RSI_BENCHMARK_COMMAND` is intentionally recorded as `BLOCKED` rather than accepted as an improvement.

The benchmark must compare the candidate against an explicit baseline and return a machine-verifiable JSON result containing boolean `candidate_better`. The evaluator supplies `RSI_BASELINE_COMMIT` and `RSI_CANDIDATE_COMMIT`; a benchmark that does not produce a valid JSON object with `candidate_better: true` on successful execution cannot yield PASS. It should test the capability that the candidate claims to improve rather than merely checking whether the candidate code runs.

The protected evaluator resolves the configured command through `benchmark_dispatcher.py` and the protected `benchmark_profiles.json` before execution. Only an exact match to a reviewed profile's entire changed-file set and command may proceed. The only registered profile is the context-packing workload, scoped to a single source file, and it remains disabled pending independent review. Mixed-scope and unknown candidates are BLOCKED rather than evaluated against a misleading benchmark. Do not enable a profile by changing a registry flag alone; profile enablement requires documented workload adequacy, independent evaluator-integrity review, and acceptable isolation.

## Promotion behavior

The current workflow retains a PASS candidate on an `rsi/candidate-<run-id>` branch and opens a pull request to `main`.

Automatic direct modification of `main` is intentionally disabled in the initial implementation.

This means the first implementation can run the proposal, experiment, verification, evidence, and retention cycle without requiring a human to participate in each candidate evaluation, while still preserving the repository's controlled promotion boundary.

## Protected files

Candidate patches may not modify:

- `.github/`;
- `development/nova-recursive-self-improvement/evaluator.py`;
- `development/nova-recursive-self-improvement/rsi_engine.py`;
- `development/nova-recursive-self-improvement/rsi_policy.json`;
- `development/nova-recursive-self-improvement/candidate.schema.json`;
- `development/nova-recursive-self-improvement/tests/`.
- `development/nova-recursive-self-improvement/benchmark_dispatcher.py`.
- `development/nova-recursive-self-improvement/benchmark_profiles.json`.

Candidate patches are also restricted by the protected `rsi_policy.json` scope and are rejected if they delete tracked files or contain configured sensitive path or content indicators. The engine and protected evaluator load the policy rather than maintaining separate copies of the candidate scope and protected-path lists.

## Security limitation

The current implementation uses a detached Git worktree plus a sanitized process environment. This prevents the candidate evaluator from inheriting the proposer API key or GitHub token and removes the worktree's Git write remote before candidate-controlled code runs.

A pinned Docker isolation adapter is now implemented and exercised by CI smoke tests. This is a meaningful OS-level boundary candidate, not an assertion that all container-escape, kernel, Docker-daemon, or supply-chain risks have been eliminated. Independent security review of the threat model, Docker runner permissions, residual kernel/runtime risks, and actual RSI integration remains mandatory. The protected readiness gate stays `INCOMPLETE` until that review and all other required gates pass.

## Development status

Status: **incomplete / implementation-gated candidate engine**

The autonomous proposal, isolation, evaluation, evidence, and candidate-retention mechanics are partially implemented, but the autonomous RSI lifecycle is intentionally blocked while required implementation work remains incomplete.

Full autonomous operation and promotion of an intelligence improvement cannot be considered operational until all mandatory RSI components are implemented, independently verified, and the protected policy is explicitly advanced to READY.

## Provider adapter and preflight

The provider access layer is implemented in `provider_client.py` and is intentionally dependency-free. It supports the OpenAI-compatible model-list and chat-completions endpoints, enforces HTTPS except for localhost tests, caps response size, and never exposes the credential through normal object representation or provider error text.

`preflight.py` is non-mutating. It checks implementation readiness first, then validates the base URL, model configuration, explicit commercial-eligibility state, and required benchmark command. Only after those checks does it inspect whether `NOSANA_LLM_API_KEY_01` exists; it does not print or transmit the secret.

The engine removes `NOSANA_LLM_API_KEY_01` from its own process environment immediately after the proposer request and launches protected candidate evaluation with a separate sanitized environment. Candidate-controlled tests therefore do not inherit the provider credential.

## Credential boundary

The intended GitHub Actions boundary is the dedicated `provider-secret-boundary` job. The preceding `configuration-preflight` job is secretless. Only after readiness and non-secret configuration pass does GitHub Actions inject `NOSANA_LLM_API_KEY_01` into the boundary job; the key is then made available to the proposer job and never stored in repository source. In addition, the workflow's first job requires `github.ref == 'refs/heads/main'`. Because each later job depends on that readiness job, manual dispatch from a feature/candidate branch is skipped before the provider-secret boundary.

No real provider key has been added by this implementation. The first sensitive external value still required for an actual proposer request is the provider API key.

## Remaining evidence-dependent readiness gates

The protected policy intentionally remains `INCOMPLETE`. The following cannot be honestly converted into PASS merely by code compilation:

- an approved capability benchmark/workload that can establish an actual intelligence or capability improvement;
- independent validation that the protected evaluation remains trustworthy for the actual NOVA workloads;
- independent review and acceptance of the pinned Docker execution boundary, including residual host/kernel/runtime risks, plus a verified task-specific benchmark scope or independently reviewed benchmark dispatcher.

Until those conditions are independently verified, the proposer/evaluator lifecycle remains blocked even when a provider credential is available.
