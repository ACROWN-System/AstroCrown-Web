# RSI Operating Modes and Safety Gates

**Status date:** 2026-10-12  
**Implementation status:** Cadence/policy changes under review; Strong RSI readiness remains INCOMPLETE.

## Weak RSI — manual, human-in-the-loop

Weak RSI is invoked only on explicit human demand through the NOVA workflow **NOVA Weak RSI — Manual Human-in-the-Loop Report**. Each invocation permits at most one request to the selected Groq or Gemini endpoint. The operator must select the provider and explicitly confirm after reviewing the provider's current data-use/commercial terms. With no approval or missing credential, the workflow emits a blocked report without making a provider call.

Weak RSI reads a fixed allowlist of development documents from the public AstroCrown-Web source at a logged baseline commit. It produces a decision-support artifact only. It cannot change files, create a candidate branch, execute candidate code, open a pull request, merge code, or modify the readiness policy. Its model-generated content is untrusted until a human reviews it. There is no automatic provider fallback or retry.

This manual review mode is deliberately independent of Strong RSI. It does not authorize Strong RSI, set its readiness status, or alter billing or provider lifecycle policy.

## Strong RSI — one scheduled, gated attempt per UTC month

The Strong RSI workflow is configured to run at 03:17 UTC on the first day of each month. It has no `workflow_dispatch` trigger and its protected budget allows at most one run per UTC month.

The current readiness policy is explicitly `INCOMPLETE`. Therefore the scheduled run is expected to record a blocked gate report and stop **before the provider secret boundary and before any model request**. A scheduled workflow alone is not evidence that autonomous RSI is operational.

If all prerequisites are eventually independently verified, Strong RSI may make one bounded proposal request, validate the candidate, run protected tests and the task-matched benchmark inside the immutable isolated sandbox, and preserve evidence. Only a candidate with strict measurable improvement and no mandatory regression may reach a separate candidate PR. It does not write directly to main; auto-merge remains disabled. A human review remains required before any production merge.

### Non-degradation policy

- Every mandatory security, privacy, correctness, compatibility, reliability, and operability requirement must pass.
- Any mandatory regression, unknown result, missing evidence, invalid usage telemetry, unavailable sandbox, unapproved benchmark, or uncertain eligibility blocks the candidate.
- A task-matched benchmark must be independently approved and show strict improvement against the exact baseline. Ordinary compilation/test success is not proof of capability improvement.
- A valid `NO_CHANGE` result is allowed when no defensible safe improvement is justified from the bounded evidence. It is a report, not an empty patch or candidate PR.
- Neither a model nor a finite benchmark can prove the system is globally optimal or guarantee zero degradation for all possible workloads. Public claims must state the tested scope and evidence rather than promising mathematical certainty.

## Authentication and heartbeats

GitHub-managed authentication is not an LLM API key. GitHub Actions issues a short-lived `GITHUB_TOKEN` for repository operations, while the Codex/GitHub integration uses its own authorized path. A separate GitHub PAT check against a single account endpoint is not used as evidence of model-inference health.

NOVA's six-hour LLM heartbeat records sanitized per-provider key/API observations separately from production provider routing. Mistral remains DEFERRED and can appear only in the dedicated diagnostic probe—not in normal routing. Cerebras remains excluded under the no-payment-method policy. The GPU heartbeat records read-only credential readiness for registered candidates, but a valid GPU token or credit-balance response does not prove actual available GPU capacity or quota.

## Public-status wording

Until all independent gates pass, accurately describe the Strong RSI work as a **monthly scheduled, fail-closed evaluation pipeline under development**. Do not advertise it as a proven, currently operational autonomous improvement capability. A public statement of completed operation requires a dated successful evidence package, verified non-degradation checks, approved workload, current provider/data-use eligibility, and reviewed candidate-retention outcome.
