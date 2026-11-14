# RSI Strict Schema-Type Validation — Navigation Plan

**Date:** 2026-10-11  
**Status:** ACTIVE — strict malformed-configuration handling under verification  
**Objective:** Ensure the benchmark dispatcher and evidence manifest verifier reject non-integer schema versions rather than accepting JSON booleans or floating-point numbers that compare equal to integer version 1 in Python.

## Mission and method

HAAN's [Foundational Mission and Collective Preservation](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/HAAN-FOUNDATIONAL-MISSION-AND-COLLECTIVE-PRESERVATION.md) governs this work. Protected control-plane and evidence formats must fail closed on malformed inputs.

Method: [AstroCrown Web Development & Audit Convention](../../DEVELOPMENT-AND-AUDIT-CONVENTION.md).

## Finding

Python treats `True == 1` as true, and floating-point `1.0 == 1` is also true. The dispatcher and evidence manifest verifier previously compared JSON schema versions with `!= 1` without requiring an actual integer type. A malformed configuration could therefore pass that schema-version comparison.

This did not bypass current readiness/promotion gates, and the production benchmark remains disabled; this change tightens malformed-input behavior and test accuracy.

## Scope

1. Require the schema version to be an actual integer type (not bool and not float) in the benchmark dispatcher.
2. Apply the same strict check to evidence manifest validation.
3. Add regression tests for boolean/floating registry schema versions and a boolean evidence-manifest schema version.
4. Preserve production review/readiness gates and the narrow benchmark scope.

## Acceptance criteria

- Registry schema versions other than the integer 1 return BLOCKED.
- Manifest schema versions other than the integer 1 raise an evidence verification error.
- All RSI tests, compilation, immutable-image verification, and Docker smoke test pass.
- RSI readiness remains INCOMPLETE, promotion stays disabled, and the context-packing profile remains disabled/unapproved.
