# NOVA RSI Independent Readiness Review Package

**Status:** REVIEW MATERIAL — NOT AN APPROVAL, CERTIFICATION, OR READINESS DECLARATION  
**Current policy:** implementation_readiness.status = INCOMPLETE; promotion.allow_main = false  
**Benchmark state:** registry unapproved; context-packing-v1 disabled  
**Prepared against main at:** cc15f84d49f2e1ba7c1cf67f5799ec21bc7f5033  
**Live gate observation:** [workflow run #38100396216](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38100396216)

## 1. Purpose and decision requested

This package makes the remaining independent review work concrete and reproducible. It does not ask a reviewer to approve “RSI in general” based on documentation or green CI. The requested decision is whether the specific implementation and limited proposed use satisfy the mandatory gates listed below, what remains unverified, and what must change before a readiness decision can be reconsidered.

The current run is evidence that the repeat-state diagnostic executes. It reported **NO_REPEAT_IN_WINDOW** with only one state record available. This is not evidence of capability improvement and does not establish that a cycle is absent. The workflow then stopped at the expected **INCOMPLETE** readiness gate before candidate generation or evaluation.

## 2. Independence and review integrity

The reviewer should be independent of the implementation and should have relevant competence for the gate they review, especially container/runner security for Gate A and benchmark/evaluator validity for Gate B/C.

The final record must identify:
- the exact full Git commit SHA reviewed;
- the scope of the review and the reviewer’s relevant competence;
- whether the reviewer is independent of the implementation and has any material conflict of interest;
- reproducible steps and evidence actually inspected;
- the result for each gate using PASS, FAIL, BLOCKED, or justified N/A;
- findings, impact, remediation requirements, and any retest result.

A model-generated review, this package, an automated test pass, the presence of the string INDEPENDENT_REVIEW_APPROVED, or a review written by the same implementation process does **not** count as independent approval. Preserve an actual, externally attributable review trail, such as a review by a qualified independent reviewer on a pinned-commit pull request or a signed report linked from the repository.

## 3. Gate A — candidate execution isolation and security boundary

### Primary components

- [Docker sandbox adapter](sandbox_runtime.py)
- [Protected evaluator](evaluator.py)
- [Protected RSI policy](rsi_policy.json)
- [RSI workflow](../../.github/workflows/nova-rsi.yml)
- [CI workflow](../../.github/workflows/nova-rsi-ci.yml)
- [Docker isolation audit record](../audit/Completed/2026-10-11-RSI-Docker-Isolation.md)
- [Cleanup and supervision audit records](../audit/Completed/2026-10-11-RSI-Evaluator-Supervisor-Cleanup.md), [sandbox cleanup verification](../audit/Completed/2026-10-11-RSI-Sandbox-Cleanup-Verification.md), and [supervisor I/O failure cleanup](../audit/Completed/2026-10-11-RSI-Supervisor-IO-Failure-Cleanup.md)

### Required review questions

1. Is candidate-controlled compilation, unit-test code, and benchmark execution confined to the intended Docker boundary, with no silent fallback to host execution?
2. Are image identity and platform validated against the protected digest and expected image ID, and is the supply-chain trust decision adequate?
3. Are workspace and benchmark mounts read-only where intended, network access disabled, credentials excluded, the process non-root, capabilities dropped, no-new-privileges applied, and CPU/memory/PID/time/output/file limits effective?
4. Can candidate code exploit Docker daemon access, the host kernel, the runner, the Docker CLI, mounts, filesystem paths, processes, side channels, or resource exhaustion to escape the intended boundary or affect later jobs?
5. Are timeout, output-limit, evaluator-exit, and workflow-finalizer cleanup paths independently effective? Could a failed cleanup leave a candidate-controlled process or container running?
6. Are pinned GitHub Actions and other build/runtime inputs sufficiently controlled for this threat model?
7. Given the actual GitHub-hosted runner and Docker configuration, is the isolation boundary acceptable for the specific candidate code that would be executed? If not, what narrower scope or different isolation is required?

### Evidence and limitation

The repository records passing automated checks for image identity, compile/test execution, and a real Docker smoke test for the configured filesystem/network constraints. These are supporting evidence only. They do not prove that container escape, kernel/daemon vulnerabilities, runner compromise, or supply-chain attacks are impossible.

**Gate A result:** reviewer to complete. Do not infer PASS from the existing smoke test.

## 4. Gate B — trusted evaluator, policy, and evidence integrity

### Primary components

- [RSI engine](rsi_engine.py)
- [Evaluator](evaluator.py)
- [Benchmark dispatcher](benchmark_dispatcher.py)
- [Evidence verifier](evidence_verifier.py)
- [Sandbox adapter](sandbox_runtime.py)
- [Repeat-state diagnostic](cycle_detector.py)
- [Candidate/evaluator and evidence hardening records](../audit/Completed/2026-10-11-RSI-Trusted-Evaluator-Control-Plane.md), [candidate tree binding](../audit/Completed/2026-10-11-RSI-Candidate-Tree-Binding.md), and [evidence commit binding](../audit/Completed/2026-10-11-RSI-Evidence-Commit-Binding.md)

### Required review questions

1. Does the evaluator/control plane execute from the trusted baseline rather than from candidate-controlled source? Is the policy and benchmark registry taken from the trusted source used for the decision?
2. Are the exact baseline and candidate commits bound to the benchmark output and evidence?
3. Is the evaluated candidate Git tree exactly the tree later staged and retained? Do mode changes, unexpected files, patches, or staged/unstaged differences block retention?
4. Can a candidate modify its acceptance criteria, test suite, dispatcher, policy, evidence verifier, sandbox, or reviewer instructions and then have those altered files judge the same candidate?
5. Can malformed, missing, stale, contradictory, or fabricated evidence be interpreted as PASS? Are unknown states fail-closed?
6. Does the workflow enforce the intended protected branch, least-privilege token permissions, budget, secret boundary, cleanup, and PR-only retention authority?
7. Is the independent review trail verifiable and external to the code/registry being reviewed?

A passing test suite proves only the covered behaviors. Inspect implementation and negative tests, and add adversarial cases where the current evidence does not cover a plausible bypass.

**Gate B result:** reviewer to complete.

## 5. Gate C — context-packing benchmark validity and scope

### Primary components

- [Capability benchmark protocol](CAPABILITY-BENCHMARK-PROTOCOL.md)
- [Benchmark registry](benchmark_profiles.json)
- [Task-specific dispatcher](benchmark_dispatcher.py)
- [Benchmark runner](benchmarks/run_context_packing_benchmark.py)
- [Fixed synthetic cases](benchmarks/context-packing-cases.json)
- [Context-packing workload audit record](../audit/Completed/2026-10-11-Context-Packing-Benchmark-Workload.md)

### Required review questions

1. Does the workload measure the claimed narrow capability—selecting complete, query-relevant records under a hard character budget while preserving provenance and temporal status—or does it accidentally reward an unrelated behavior?
2. Is the baseline a fair, explicit comparator, and does the runner compare code from the exact baseline/candidate commits rather than the current checkout by accident?
3. Are case-level requirements and regression rules explicit enough to prevent an aggregate gain from hiding a required-evidence loss, provenance corruption, truncation, over-budget output, or other protected regression?
4. Is the synthetic corpus broad and adversarial enough for the limited claim? What important cases are missing, and how could selection overfit to visible cases?
5. Are results deterministic and reproducible? Can a candidate influence the cases, expected labels, comparator, metric direction, acceptance criterion, or report interpretation?
6. Are benchmark inputs and implementation snapshots isolated from candidate control and protected against tampering?
7. Does the dispatcher restrict use to the exact approved changed-file scope and command? Are unrelated or mixed-scope candidate changes blocked instead of judged by this one narrow benchmark?
8. What additional held-out cases, tests, or independent test material are required before the profile can be considered fit for its limited purpose?

### Scope rule

Even if the context-packing workload passes an independent review, that approval can apply **only** to its specified context-packing capability and candidate scope. It is not a general-intelligence benchmark and does not approve RSI changes to the evaluator, orchestration, provider routing, memory system, security boundary, or unrelated subsystems.

**Gate C result:** reviewer to complete. Keep RSI_BENCHMARK_COMMAND unconfigured until the required decisions are evidenced.

## 6. Gate D — operational authority, workflow and evidence lifecycle

Review [the RSI workflow](../../.github/workflows/nova-rsi.yml), [RSI CI](../../.github/workflows/nova-rsi-ci.yml), [protected policy](rsi_policy.json), [implementation runbook](IMPLEMENTATION.md), and [provider egress boundary record](../audit/Completed/2026-10-11-RSI-Provider-Egress-Boundary.md).

Confirm that:
- sensitive jobs originate only from the protected main branch;
- the proposer receives only the intended secret, and candidate-controlled code never inherits that credential;
- the daily budget and candidate limits fail closed;
- all candidate-controlled execution has a timeout and applicable resource limits;
- cleanup is attempted and independently verified even after failure;
- evidence is tied to the exact baseline/candidate and retained before any write-capable action;
- retention creates a candidate branch/PR and does not permit automatic main promotion;
- failure, unavailable infrastructure, ambiguous evidence, or incomplete review remains BLOCKED, not PASS.

**Gate D result:** reviewer to complete.

## 7. Reproduction and evidence guide

Reviewers should first pin the exact commit being reviewed and record it in the report. Then:

1. Inspect the source and tests linked above at that exact commit.
2. Reproduce the repository’s documented CI checks where the required environment is available. The RSI CI workflow is the canonical automated verification entry point; see [successful verification run #38099322686](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38099322686) for the previously reported compile, unit-test, immutable-image, and Docker-smoke results.
3. Inspect the actual logs, not just run badges. The live run [#38100396216](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38100396216) shows that the repeat-state diagnostic ran, returned NO_REPEAT_IN_WINDOW with only one available state record, and then the readiness gate stopped the workflow.
4. Record any failed reproduction, environment difference, missing evidence, untested claim, or alternative explanation.
5. Do not enable the benchmark, add/replace provider credentials, or alter protected readiness/approval flags as a way to run the review.

If any test needs a dependency, permission, runner feature, or evidence source that is unavailable, record BLOCKED and specify exactly what would unblock it.

## 8. Review result form

Copy this section into an independent review issue/report and complete it. Link the report here only after it exists; do not pre-fill a favourable result.

- **Reviewed full commit SHA:**
- **Review date (UTC):**
- **Reviewer / public review identity:**
- **Relevant competence and review scope:**
- **Independence from implementation confirmed:** YES / NO / UNCLEAR
- **Conflict of interest or limitation:**
- **Environment and reproduction steps:**

| Gate | Result (PASS / FAIL / BLOCKED / justified N/A) | Evidence inspected | Findings / required action |
|---|---|---|---|
| A — execution isolation and security boundary | | | |
| B — evaluator, policy and evidence integrity | | | |
| C — context-packing benchmark validity and scope | | | |
| D — operational authority and workflow lifecycle | | | |

### Findings

For each finding, record the affected component, observed condition, expected condition, reproduction/evidence, plausible impact, required remediation, and retest evidence. State severity only with an identified severity method; do not use intuition-only labels.

### Reviewer conclusion

- **Permitted scope, if any:**
- **Mandatory unresolved blockers:**
- **Conditions for re-review:**
- **Reviewer conclusion:** APPROVE LIMITED SCOPE / REJECT / BLOCKED / NEEDS MORE EVIDENCE
- **Signature, signed commit, or attributable review link:**

## 9. Readiness decision after review

No status flag is changed by completing this package. A readiness reconsideration requires actual review evidence for all mandatory gates, remediation and retesting of findings, a clear permitted candidate scope, and a separate authorized decision against the protected policy. A favourable review of one gate cannot compensate for another gate that is FAIL or BLOCKED.

Until the required evidence exists:
- implementation_readiness.status stays INCOMPLETE;
- promotion.allow_main stays false;
- context-packing-v1 stays disabled and unapproved;
- no autonomous proposer/evaluator cycle or candidate promotion is authorized.

**Core rule:** external review can reduce uncertainty; this document cannot certify itself.
