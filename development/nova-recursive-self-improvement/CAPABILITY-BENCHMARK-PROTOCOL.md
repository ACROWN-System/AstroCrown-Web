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

## Current status

Status: **protocol defined / benchmark implementation required**

Until a protected benchmark command implementing this protocol exists, the RSI evaluator deliberately returns `BLOCKED`.