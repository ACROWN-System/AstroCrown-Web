# Candidate Evaluation Template

## Candidate

Name:

Type:

Version / commit / release:

Source:

## Requirement

What problem must the candidate solve?

Requirement identifier(s):

## Mandatory Criteria

| ID | Criterion | Result | Evidence |
|---|---|---|---|
| C-001 | Requirement satisfaction |  |  |
| C-002 | Security |  |  |
| C-003 | Required compatibility |  |  |
| C-004 | Verification reproducibility |  |  |
| C-005 | Unnecessary complexity avoided |  |  |

Add or remove criteria only when justified by the actual requirement.

## Optional Criteria

| ID | Criterion | Result | Evidence |
|---|---|---|---|
| C-101 | Maintainability |  |  |
| C-102 | Performance |  |  |
| C-103 | Operational simplicity |  |  |

## Result State Definitions

- PASS — tested and evidence supports satisfaction.
- FAIL — tested and evidence demonstrates non-satisfaction.
- N/A — genuinely not applicable; record why.
- BLOCKED — could not be verified because required evidence, capability, or environment was unavailable.

## Test Method

Describe exactly how the candidate was tested.

## Evidence

Record the evidence required to reproduce or verify the result.

## Findings

Record failures, limitations, unexpected behavior, or unresolved questions.

## Eligibility

Mandatory criteria:

- Any mandatory FAIL: candidate is not eligible.
- Any mandatory BLOCKED: acceptance is BLOCKED until resolved.
- Mandatory N/A: justification required.
- All mandatory PASS: candidate is eligible for implementation consideration.

Do not use numerical scores, weighted averages, rankings, tiers, or compensating scores.

## Decision

Decision:

Reason:

## Implementation

If selected for implementation, record the implementation change and affected files/components.

## Re-test

Repeat the relevant verification after implementation.

Result:

Evidence:

## Closure

State why the candidate evaluation is closed or what remains unresolved.
