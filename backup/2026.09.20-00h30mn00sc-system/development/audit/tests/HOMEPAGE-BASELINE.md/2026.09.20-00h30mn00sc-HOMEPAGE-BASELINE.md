# Homepage Baseline Verification Matrix

## Purpose

Translate the homepage requirements into concrete verification work before substantive implementation.

## Requirement-to-Test Matrix

| Test ID | Requirement | Verification method | Stage |
|---|---|---|---|
| HT-001 | R-001 | Source inspection plus HTML validation. | Foundation |
| HT-002 | R-002 | Manual visual inspection against approved identity/assets. | Visual |
| HT-003 | R-003 | Requirements review, navigation inspection, keyboard interaction test. | Functional |
| HT-004 | R-004 | Content/structure review against the approved homepage requirement baseline. | Structural |
| HT-005 | R-005 | Source inspection for declared colors plus visual inspection of rendered states. | Visual |
| HT-006 | R-006 | Desktop viewport verification followed by later responsive verification. | Responsive |
| HT-007 | R-007 | Black-box functional tests for every implemented interactive element, including relevant negative/edge cases. | Functional |
| HT-008 | R-008 | Semantic/source inspection plus keyboard and rendered accessibility checks. | Accessibility |
| HT-009 | R-009 | Static inspection, dependency review, secret scan, and applicable web security scanning. | Security |
| HT-010 | R-010 | Code review focused on redundant mechanisms and unnecessary complexity. | Quality |
| HT-011 | R-011 | Audit-record review confirming evidence exists for applicable requirements and blocking findings are resolved. | Release |

## NIST IR 8397 Applicability

NIST IR 8397 identifies threat modeling, automated testing, static analysis, hardcoded-secret review, built-in checks/protections, black-box tests, structural tests, historical bug tests, fuzzing, web-application scanning where applicable, and included-software verification as minimum verification techniques. The project will record applicability rather than silently omitting a technique.

| Technique | Current status | Reason |
|---|---|---|
| Threat modeling | REQUIRED when interactive/data-bearing architecture is introduced | Not meaningful to fully perform against the empty HTML foundation. |
| Automated testing | REQUIRED | Establish repeatable checks as implementation grows. |
| Static analysis | REQUIRED when executable/CSS complexity exists | Apply to actual implementation rather than the empty foundation. |
| Hardcoded-secret review | REQUIRED when configuration/scripts/dependencies exist | No secrets are currently present. |
| Built-in checks/protections | REQUIRED where applicable | Apply to actual executable/browser behavior. |
| Black-box tests | REQUIRED for implemented behavior | No substantive behavior exists yet. |
| Structural/code-based tests | REQUIRED when implementation becomes non-trivial | Apply to actual code paths and structure. |
| Historical bug regression tests | REQUIRED when a relevant previous bug exists | The retired site contains known historical issues; relevant regressions must be captured when the corresponding behavior is rebuilt. |
| Fuzzing | CONDITIONAL | Apply when inputs or parsers create meaningful fuzzing targets. |
| Web application scanner | CONDITIONAL | Apply once the development site exposes a meaningful web application surface. |
| Included software verification | CONDITIONAL | Apply if libraries, packages, services, or other third-party components are introduced. |

## Evidence Rule

A test result must identify evidence sufficient to reproduce or understand the verification. A missing verification method is not treated as PASS.

Allowed result states:

- PASS
- FAIL
- N/A — with reason
- BLOCKED — with reason
