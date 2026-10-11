# Active Navigation Plan — External Security Validation and Conversion Model

**Date:** 2026-10-11  
**Status:** ACTIVE — official program eligibility assessed; implementation and verification in progress  
**Objective:** Establish the best zero-cost external security-validation routes available to NOVA RSI, add an independently operated static-analysis path that can run now, and make reviewer outreach evidence-led with measurable conversion tracking.

## Mode and source of truth

**Mode:** External program research, repository security improvement, audit documentation, and workflow verification.  
**Repository:** https://github.com/ACROWN-System/AstroCrown-Web  
**Primary scope:** `development/nova-recursive-self-improvement/` and the GitHub Actions security workflow.  
**Method:** `development/Prompt-Guide.md`, `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, and the available audit-plan conventions.

The expected standalone `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not found in the active repository paths examined. This plan records that gap and follows the available Prompt Guide, development/audit convention, and established Active/Completed plan format instead.

## Objective and completion conditions

1. Verify the current official eligibility, workflow, disclosure, and agreement conditions for Anthropic OSS Scanner.
2. Avoid an enrollment PR if current evidence does not support the program's established-project/critical-impact criteria; do not state or imply a qualification that has not been evidenced.
3. Do not publish the maintainer's personal email in a public enrollment file or accept program terms on the maintainer's behalf.
4. Add a scoped, no-cost CodeQL workflow for the RSI Python subsystem and an OpenSSF Scorecard workflow for repository-level security posture as automated-analysis supplements. Do not characterize CodeQL as an independent human review or a proof of sandbox isolation.
5. Add an evidence-led external-review route and conversion method distinguishing discovery score, response probability, task acceptance, completion, and qualified independent evidence.
6. Preserve `implementation_readiness.status = INCOMPLETE`, `promotion.allow_main = false`, and the disabled/unapproved benchmark profile.
7. Link the route/method document from the RSI entry point, submit via a pull request, verify test/security workflow outcomes, and record limitations accurately.
8. Prepare (but do not send) a one-click Gmail draft asking OSS Scanner staff to clarify eligibility. The user must send it from their own account because no usable Gmail connector is available here.

## Navigation targets

- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/Prompt-Guide.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/DEVELOPMENT-AND-AUDIT-CONVENTION.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/INDEPENDENT-REVIEW-PACKAGE.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-recursive-self-improvement/rsi_policy.json
- https://github.com/anthropics/oss-scanner
- https://red.anthropic.com/oss-scanner/
- https://red.anthropic.com/oss-scanner/terms/
- https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning
- https://github.com/github/codeql-action/releases

## Existing-state findings

- RSI is a development-stage, implementation-gated system. Its protected policy explicitly blocks autonomous proposal/evaluation/promotion until the required readiness review is complete.
- Anthropic OSS Scanner is free and performs periodic model-generated security scans, but the published criteria target established projects with critical infrastructure/user-security impact. The stated factors include remote-attack exposure and number of users or dependent projects. The service retains discretion to decline a project and the reports are not human-reviewed.
- The repository evidence reviewed so far does not establish a broad deployed user base or dependent-project footprint for AstroCrown-Web. Therefore eligibility is **BLOCKED pending evidence or written guidance**, not assumed.
- The user's reported prior for a complete unsolicited pro-bono review is approximately 0.0001%. This is a planning prior, not a measured rate and not automatically transferable to formal programs, task-scoped reviews, or automated scanning channels.
- The repository has RSI compile/unit/sandbox smoke checks, but no scoped CodeQL or OpenSSF Scorecard workflow was found in the inspected workflows.

## Scope and preservation

**In scope**
- Official OSS Scanner eligibility review and a transparent go/no-go decision.
- A scoped CodeQL workflow and query-path configuration for the RSI Python subsystem.
- A route register and evidence-based candidate/outreach conversion method.
- Additive documentation and a reviewable pull request.
- Drafting a direct eligibility inquiry for the user to send.

**Out of scope**
- Submitting AstroCrown-Web to OSS Scanner before eligibility is supportable or acknowledged.
- Publishing the user's personal email in a repository configuration.
- Agreeing to an external service's legal terms on the user's behalf.
- Treating automated scans, assistant analysis, or passing CI as independent human approval.
- Changing any protected readiness/benchmark/promotion flag, adding credentials, paying for services, or enabling autonomous RSI.

## Decision rule

The OSS Scanner enrollment remains BLOCKED unless at least one of the following becomes true:
1. Credible public evidence supports the established-project and critical-impact criteria; or
2. OSS Scanner staff confirm that the project is in scope despite its current adoption stage.

If neither condition is met, do not submit an enrollment PR. Keep using free automated/static analysis and scoped technical evidence while the independent human review remains a separately tracked blocker.

## Impact Analysis

**IF modified:** the repository will gain an actionable free security-analysis path and a reproducible model for prioritizing reviewer/community routes, without confusing automated findings with independent approval or making unsupported conversion claims.

**IF not modified:** the project remains dependent on a low-probability unsolicited volunteer request, misses a no-cost automated analysis channel available now, and continues to lack a repeatable mechanism for selecting and measuring outreach routes.

## Verification and handoff

- Validate the new workflow YAML and CodeQL configuration.
- Verify workflow action references are pinned to a full commit SHA.
- Confirm only the RSI subsystem is included, with backup snapshots excluded.
- Confirm CodeQL and OpenSSF Scorecard run successfully on the public repository; treat environment/permission failures as BLOCKED rather than PASS.
- Confirm existing RSI tests and Docker isolation smoke tests still pass.
- Confirm readiness remains INCOMPLETE, main promotion remains disabled, and the context-packing profile remains disabled/unapproved.
- Record the exact PR/commit/run results; move this plan to Completed only when repository actions are finished. The external-program eligibility inquiry remains pending until the user sends the prepared message and a reply is received.
