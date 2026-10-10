# RSI Candidate Tree Binding — Navigation Plan

**Date:** 2026-10-11  
**Status:** ACTIVE — staged-tree reproduction and commit binding under verification  
**Objective:** Prove that the candidate tree evaluated in the isolated worktree is exactly the staged Git tree that the write-capable retention job will commit.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. A retention result must be tied to the exact source tree that was evaluated, not only to a patch filename set or self-generated evidence manifest.

Method: [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md) and the [RSI independent security review](../Completed/2026-10-11-RSI-Independent-Security-Review.md).

## Finding

The prior evidence hardening cross-checked cycle and evaluator candidate commit IDs, but both records were assembled by the same engine process. The write-capable retention job applied the same candidate patch to a clean checkout and checked changed paths/modes, but did not compare the resulting staged Git tree with the tree that had been evaluated. A patch/tree mismatch could therefore escape a comparison based on paths alone.

## Scope

1. Record the exact candidate Git tree SHA (HEAD tree object) in both protected evaluator evidence and the cycle result.
2. Require cycle and evaluator candidate tree SHAs to be valid, full lowercase 40-character Git tree IDs and exactly equal.
3. Return the verified candidate tree SHA from the evidence verifier.
4. In the retention job, apply the candidate patch, stage the intended development changes, and run the applied-worktree verifier before committing.
5. The verifier must reject unstaged modifications and require the staged Git index tree to equal the independently evaluated candidate tree SHA.
6. Add tests for evaluator/cycle tree mismatch, valid/mismatched staged trees, evaluator evidence tree recording, and workflow ordering.
7. Preserve all existing policy, profile, sandbox, and credential gates.

## Out of scope

- Enabling RSI or the context-packing benchmark.
- Treating tree equality alone as proof that an evaluation is correct; it only closes a provenance consistency gap.
- Changing credentials, secrets, billing, workflow permissions, or runtime providers.

## Acceptance criteria

- Cycle and evaluator evidence independently state a matching candidate commit and tree.
- The retention verifier compares the staged index tree with the evaluated tree before the commit/push step.
- A different staged tree or any unstaged modification is BLOCKED.
- Regression tests pass for mismatch and exact match.
- Full RSI CI passes compilation, all tests, immutable image verification and real Docker isolation/finalizer smoke tests.
- RSI readiness remains INCOMPLETE, promotion.allow_main remains false, and the context-packing benchmark remains disabled/unapproved.
