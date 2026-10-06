# NOVA RSI Implementation Runbook

## Implemented components

- `rsi_engine.py` — autonomous candidate proposal, bounded context/output generation, patch validation, isolated worktree execution, and evidence generation.
- `evaluator.py` — protected evaluator used from the baseline evaluator/policy rather than candidate-controlled evaluation code.
- `rsi_policy.json` — protected scope, evaluation, promotion, and resource-budget policy.
- `candidate.schema.json` — candidate payload contract.
- `tests/test_rsi_engine.py` — deterministic tests for candidate parsing, protected-path enforcement, secret-pattern rejection, and decision precedence.
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

Candidate execution receives a sanitized environment and does not receive the proposer API key or GitHub token.

Before candidate-controlled checks run, the evaluator removes the candidate worktree's Git remote and inherited credential helper.

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

`RSI_AI_API_KEY`

Repository variables:

- `RSI_AI_BASE_URL` — OpenAI-compatible chat-completions endpoint used by the proposer.
- `RSI_AI_MODEL` — model identifier used for candidate generation.
- `RSI_AI_COMMERCIAL_ELIGIBILITY` — must be exactly `PASS` before the workflow will invoke the configured proposer.
- `RSI_BENCHMARK_COMMAND` — protected benchmark command supplied by repository configuration.

The actual API key must never be committed to the repository.

## Benchmark requirement

The capability benchmark is mandatory in the current policy. Because the repository does not yet have an approved NOVA capability benchmark, an RSI cycle without `RSI_BENCHMARK_COMMAND` is intentionally recorded as `BLOCKED` rather than accepted as an improvement.

The benchmark must compare the candidate against an explicit baseline and return a machine-verifiable success result. It should test the capability that the candidate claims to improve rather than merely checking whether the candidate code runs.

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

Candidate patches are also restricted by the protected `rsi_policy.json` scope and are rejected if they delete tracked files or contain configured sensitive path or content indicators. The engine and protected evaluator load the policy rather than maintaining separate copies of the candidate scope and protected-path lists.

## Security limitation

The current implementation uses a detached Git worktree plus a sanitized process environment. This prevents the candidate evaluator from inheriting the proposer API key or GitHub token and removes the worktree's Git write remote before candidate-controlled code runs.

This is not an OS-level security sandbox. Stronger filesystem, process, network, and syscall isolation should be added before executing untrusted or high-risk self-modification candidates.

## Development status

Status: **implemented / benchmark-gated candidate engine**

The autonomous proposal, isolation, evaluation, evidence, and candidate-retention mechanics are implemented.

Full autonomous promotion of an intelligence improvement cannot be considered operational until a protected NOVA capability benchmark is implemented and validated.
