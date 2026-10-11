# RSI Independent Review Package — Active Plan

**Date:** 2026-10-11  
**Status:** ACTIVE — prepare independent review materials; no readiness approval implied  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Base commit:** `cc15f84d49f2e1ba7c1cf67f5799ec21bc7f5033`  
**Branch:** `rsi/independent-review-package-2026-10-11`

## Objective

Reduce the effort required for a qualified, independent reviewer to verify the outstanding NOVA RSI security, evaluator-integrity, and benchmark-readiness gates. This is readiness-support work, not a claim that an RSI capability improved and not a substitute for external review.

## Evidence and trigger

- The protected RSI workflow run [#38100396216](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38100396216) executed the repeat-state diagnostic but stopped at `implementation_readiness.status = INCOMPLETE`.
- The diagnostic had one available workflow-run state. It found no repeat within that bounded history; this is not evidence of improvement or proof that no loop exists.
- The protected benchmark registry remains unapproved, and `context-packing-v1` remains disabled.
- Current architecture records identify independent review of Docker/runner/kernel trust boundaries, evaluator integrity, benchmark corpus adequacy, and the review trail as outstanding gates.

## Scope

1. Prepare one reviewer-facing index of the relevant protected components, evidence, reproducible checks, and explicit residual risks.
2. Separate the required review decisions: execution isolation, evaluator/control-plane integrity, benchmark integrity and scope, and review-trail independence.
3. Define evidence fields and PASS / FAIL / BLOCKED / N/A outcomes, with findings and re-test requirements.
4. Make clear that a passing review of the narrow context-packing workload does not validate unrelated RSI candidate types or establish general intelligence improvement.
5. Keep `implementation_readiness.status = INCOMPLETE`, `promotion.allow_main = false`, and the production benchmark profile disabled/unapproved.

## Out of scope

- Executing the autonomous proposer or enabling its credentials.
- Changing readiness, approval, budget, promotion, secret, billing, or workflow-permission settings.
- Treating this internal package, an automated test pass, or model-generated opinion as independent review.
- Claiming that Docker isolation eliminates kernel, daemon, runner, or supply-chain risk.

## Verification criteria

- Every reviewer question links to the applicable source/protocol/evidence file.
- The reviewer can record the exact commit reviewed, reproduction steps, observed evidence, results, findings, limitations, and any conflicts of interest.
- Each gate has a distinct outcome; BLOCKED is not converted into PASS.
- The package explicitly forbids changing approval-state strings without an actual independent review trail.
- Documentation changes pass repository CI and do not change protected policy.

## Impact analysis

### IF modified

A reviewer receives a bounded, reproducible scope and a consistent way to record findings, reducing ambiguity and the risk that a passing unit test or an approval flag is mistaken for independent validation.

### IF not modified

The relevant evidence remains distributed across the implementation, protocol, workflow, tests, and completed audit records. A reviewer may need to reconstruct scope and review criteria manually, increasing review friction and the chance of incomplete coverage.

## Actions

1. [x] Inspect current main policy, benchmark registry, protocol, security boundary documentation, and the live readiness run.
2. [ ] Write the independent-review package with direct file and workflow links.
3. [ ] Cross-check all paths and claims against the current repository.
4. [ ] Run available automated checks appropriate for a documentation-only change.
5. [ ] Open a PR, leave readiness gates unchanged, and move this plan to Completed after verification.

## Handoff condition

Human participation is needed only to arrange or supply a genuinely independent review by an appropriately qualified reviewer. No internal self-approval can satisfy that gate.
