# RSI Operating Modes and Safety Gates

**Status date:** 2026-10-12  
**Implementation status:** Strong RSI workflow is SUSPENDED; implementation readiness remains INCOMPLETE.

## Weak RSI — manual, human-in-the-loop

Weak RSI is invoked only on explicit human demand through the NOVA workflow **NOVA Weak RSI — Manual Human-in-the-Loop Report**. Each invocation permits at most one request to the selected Groq or Gemini endpoint. The operator must select the provider and explicitly confirm after reviewing the provider's current data-use/commercial terms. With no approval or missing credential, the workflow emits a blocked report without making a provider call.

Weak RSI reads a fixed allowlist of development documents from the public AstroCrown-Web source at a logged baseline commit. It produces a decision-support artifact only. It cannot change files, create a candidate branch, execute candidate code, open a pull request, merge code, or modify the readiness policy. Its model-generated content is untrusted until a human reviews it. There is no automatic provider fallback or retry.

This manual review mode is deliberately independent of Strong RSI. It does not authorize Strong RSI, set its readiness status, or alter billing or provider lifecycle policy.

## Strong RSI — suspended until fully operational

Strong RSI is **inactive**. Its former once-monthly workflow has been moved out of `.github/workflows/` into `suspended/STRONG-RSI-MONTHLY-WORKFLOW.yml`. It has no active schedule, no manual trigger and no provider calls. This avoids consuming routine runner time for monthly runs that can only stop at an INCOMPLETE readiness gate.

The engine, evaluator, protected policies, tests and workflow template remain preserved for development. This is not a completed Strong RSI capability and must not be marketed as an operational autonomous improvement system.

The protected policy now records `strong_rsi_safety.lifecycle_status = SUSPENDED`; `implementation_readiness.status` remains `INCOMPLETE`. No one may reactivate the workflow simply by moving the YAML back or by setting an eligibility flag.

Reactivation requires satisfying every criterion in [Strong RSI Status](STRONG-RSI-STATUS.md), including an independently approved capability benchmark, current provider/data-use approval, configured and verified repository-scoped credentials, independently reviewed sandbox/evaluator integrity, exact-baseline evidence verification, zero mandatory regressions, strict task-matched improvement, verified PR-retention permissions and required checks, end-to-end operational proof, rollback procedure, and explicit human release decision.

## Non-degradation policy

- Every mandatory security, privacy, correctness, compatibility, reliability, and operability requirement must pass.
- Any mandatory regression, unknown result, missing evidence, invalid usage telemetry, unavailable sandbox, unapproved benchmark, or uncertain eligibility blocks the candidate.
- A task-matched benchmark must be independently approved and show strict improvement against the exact baseline. Ordinary compilation/test success is not proof of capability improvement.
- A valid `NO_CHANGE` result is allowed when no defensible safe improvement is justified from the bounded evidence. It is a report, not an empty patch or candidate PR.
- Neither a model nor a finite benchmark can prove the system is globally optimal or guarantee zero degradation for all possible workloads. Public claims must state the tested scope and evidence rather than promising mathematical certainty.

## Authentication and heartbeats

GitHub-managed authentication is not an LLM API key. GitHub Actions issues a short-lived `GITHUB_TOKEN` for repository operations, while the Codex/GitHub integration uses its own authorized path. A separate GitHub PAT check against a single account endpoint is not used as evidence of model-inference health.

NOVA's six-hour LLM heartbeat records sanitized per-provider key/API observations separately from production provider routing. Mistral remains DEFERRED and can appear only in the dedicated diagnostic probe—not in normal routing. Cerebras remains excluded under the no-payment-method policy. The GPU heartbeat records read-only credential readiness for registered candidates, but a valid GPU token or credit-balance response does not prove actual available GPU capacity or quota.

## Public-status wording

Until all independent gates pass, accurately describe Strong RSI as a **suspended implementation under development**. Its old monthly workflow template is inactive and does not execute. Do not advertise it as a proven, currently operational autonomous improvement capability. A public statement of completed operation requires a dated successful evidence package, verified non-degradation checks, approved workload, current provider/data-use eligibility, and reviewed candidate-retention outcome.
