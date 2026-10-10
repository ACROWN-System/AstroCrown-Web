# NOVA RSI Capability Benchmark Protocol

This document defines the interface required before an RSI candidate may be accepted as an actual capability improvement.

## Purpose

Code execution success is not enough. The benchmark must compare the candidate against the exact baseline used for the RSI cycle and determine whether the claimed capability improved.

## Environment

The evaluator supplies:

- `RSI_BASELINE_COMMIT` — baseline Git commit;
- `RSI_CANDIDATE_COMMIT` — candidate Git commit;
- the candidate repository checkout as the current working directory.

The benchmark receives no proposer API key, GitHub token, or other repository credential. The protected evaluator supplies the exact baseline and candidate commit identifiers through `RSI_BASELINE_COMMIT` and `RSI_CANDIDATE_COMMIT`.

## Command

Configure the protected repository variable:

`RSI_BENCHMARK_COMMAND`

The value is executed by the protected evaluator inside the candidate environment.

## Output contract

The command must emit only a JSON object containing at least:

`candidate_better: true`

It should also provide machine-readable evidence sufficient to explain the comparison, for example:

```json
{
  "candidate_better": true,
  "baseline": {"quality": 0.91, "latency_ms": 420},
  "candidate": {"quality": 0.94, "latency_ms": 390},
  "evidence": "held-out workload result"
}
```

The actual metrics are task-dependent. A benchmark must not manufacture improvement by changing the direction of a metric without documenting the intended interpretation. The protected evaluator accepts PASS only when the command exits successfully and `candidate_better` is the boolean value `true`.

## Baseline comparison

The benchmark must evaluate both:

- the baseline identified by `RSI_BASELINE_COMMIT`;
- the candidate identified by `RSI_CANDIDATE_COMMIT`.

Any temporary baseline checkout required for comparison must remain isolated from the active repository and must not receive credentials.

## Quality requirement

The benchmark should measure the property the candidate claims to improve.

Examples:

- routing change → held-out task quality plus call/latency efficiency;
- context compression → task accuracy plus token reduction and information-retention checks;
- code optimization → correctness plus performance;
- retrieval change → retrieval relevance plus downstream task quality;
- model replacement → quality, reliability, latency, resource use, and applicable commercial eligibility.

A benchmark that only measures syntax, execution, or file presence does not establish intelligence improvement.

## Regression requirement

A candidate must not be accepted solely because one metric improves.

Mandatory regressions in correctness, security, privacy, reliability, provenance, or other protected requirements must cause rejection.

## Evidence

Benchmark output becomes part of the RSI evidence package and must be retained with the candidate cycle.

## Initial workload implementation candidate

A narrow, deterministic workload is being developed for query-aware repository context packing at:

- Runner: `benchmarks/run_context_packing_benchmark.py`
- Fixed synthetic corpus: `benchmarks/context-packing-cases.json`
- Implementation candidate: `../nova-context-memory-optimization/context_packer.py`
- Conformance tests: `tests/test_context_packing_benchmark.py`

The workload compares the exact baseline and candidate versions of `context_packer.py` using `RSI_BASELINE_COMMIT` and `RSI_CANDIDATE_COMMIT`. It measures retrieval of required complete records under fixed character budgets, and validates provenance metadata and non-truncation. Its workload includes synthetic examples for provider-rotation rules, temporal supersession, and RSI readiness/isolation caveats.

A positive result means only that the candidate improved this defined context-packing workload without losing required-evidence coverage per case, increasing unrequired records per case, exceeding the budget, or altering record content/provenance. It is not a general-intelligence benchmark or approval for unrelated candidate types.

**Status: IMPLEMENTED CANDIDATE / INDEPENDENT REVIEW REQUIRED.** Do not configure or rely on this workload as the approved `RSI_BENCHMARK_COMMAND` until its integrity, corpus adequacy, baseline behavior, and execution isolation have been independently reviewed. A successful unit-test run is necessary but not sufficient. The protected RSI readiness gate remains `INCOMPLETE`.

## Current status

Status: **first workload candidate implemented / independent review required**

The repository now includes a deterministic context-packing workload candidate and fixed synthetic cases. This closes the absence of an executable workload for that narrow capability area, but does not constitute independent approval or establish general intelligence improvement.

The protected evaluator still returns `BLOCKED` while implementation readiness is `INCOMPLETE`. This PR does not configure `RSI_BENCHMARK_COMMAND`.

## Benchmark implementation status

The evaluator contract is implemented, including exact baseline/candidate commit propagation and strict JSON validation. The initial workload compares versions of the query-aware context packer against fixed synthetic cases and validates required-record coverage, provenance, non-truncation, and hard character budgets.

The remaining gates include independent review of the benchmark's integrity and adequacy, confirmation that its scope matches the candidate's claimed capability, and an acceptable execution-isolation decision. Other capability claims may require distinct, task-appropriate workloads; this workload is not a universal substitute.

A syntax check, unit-test pass, or improvement on this one workload is not sufficient to establish general intelligence improvement or overall RSI readiness. Keep the benchmark command unconfigured until the workload and remaining gates have been independently reviewed.
