# RSI Canonical Candidate-Path Validation — Navigation Plan

**Date:** 2026-10-11  
**Status:** ACTIVE — consistent path interpretation across proposal, evaluator and benchmark dispatcher under verification  
**Objective:** Ensure every RSI control-plane layer interprets candidate file paths identically and fails closed for alternate separators or quoted/ambiguous path forms.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. Candidate scope and protected boundaries must not depend on platform-specific path interpretation or parser ambiguity.

Method: [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md) and the [RSI independent security review](../Completed/2026-10-11-RSI-Independent-Security-Review.md).

## Findings

1. The proposer-side path normalizer replaced two consecutive backslashes, while the evaluator-side normalizer replaced a single backslash. This created inconsistent path interpretation for mixed-separator paths.
2. Git patch headers can encode or quote paths containing special characters. The path-selection logic must not normalize quoted path forms into an apparently approved path.
3. The benchmark dispatcher validated traversal and absolute paths but needed to reject alternate separators/quotes consistently in both candidate paths and protected profile paths.

## Scope

1. Both proposer and evaluator accept canonical Git forward-slash paths only; paths containing a backslash or quote delimiter fail closed.
2. The dispatcher applies the same rejection to candidate changed paths and profile exact-path definitions.
3. Add regression tests for mixed separators, quoted patch headers, and malformed profile scopes.
4. Keep existing exact changed-file set matching and protected path policy unchanged.

## Out of scope

- Expanding allowed candidate scope or adding benchmark profiles.
- Changing RSI readiness, promotion, benchmark approval, secrets, credentials, provider settings, or workflow permissions.

## Acceptance criteria

- Proposer and evaluator path normalizers reject backslashes and quote-delimited path strings consistently.
- Patch path parsing produces an unsafe-path finding for a quoted path form.
- Dispatcher blocks candidate paths and profile path definitions containing backslashes or quotes.
- Full RSI CI passes compilation, all unit tests, pinned-image verification and real Docker isolation/finalizer smoke tests.
- Readiness remains INCOMPLETE, main promotion remains disabled, and the context-packing profile remains unapproved/disabled.
