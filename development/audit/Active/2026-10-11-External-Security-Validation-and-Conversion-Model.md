# Active Navigation Plan — External Security Validation and Conversion Model

**Date:** 2026-10-11  
**Status:** ACTIVE — automated security-analysis routes and conversion tool merged; OSS Scanner eligibility inquiry still awaits maintainer send/response  
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

## Execution outcome — 2026-10-11

- PR [#89](https://github.com/ACROWN-System/AstroCrown-Web/pull/89) merged to `main` as `4b3a490b35df1cad9ad9bda9fe4193f416d56fd9`.
- PR [#91](https://github.com/ACROWN-System/AstroCrown-Web/pull/91) merged as `572b27f2a64eb987a8dbdf58e27615585b085942`: added root `SECURITY.md`, weekly GitHub Actions Dependabot, safer default RSI workflow token permissions, and job-scoped CodeQL write permission.
- PR [#97](https://github.com/ACROWN-System/AstroCrown-Web/pull/97) merged as `932a611411bab8c9a81ccb7538ec88cd1031c0b2`: made RSI CI, external-review pipeline CI, and scoped CodeQL run on every pull request to stabilize contexts for required checks; push triggers remain path-filtered.
- External-review pipeline CI passed on the PR head: [run #38109356010](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38109356010). Its tests cover unresolved-outreach handling, conditional stage denominators, evidence-gated candidate fit scores, and low-sample uncertainty; no calibrated probability is manufactured from the single pending email.
- RSI compile, unit tests, immutable image verification, and Docker isolation smoke tests passed on the PR head: [run #38109356016](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38109356016).
- CodeQL analysis passed on the PR head: [run #38109356050](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38109356050).
- On the merged `main` commit after PR #89, external-review CI passed [run #38109541006](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38109541006), RSI CI passed [run #38109541016](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38109541016), CodeQL passed [run #38109541012](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38109541012), and Scorecard completed with SARIF upload [run #38109541051](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38109541051).
- Added a dependency-free evidence-fit and conversion tool with factor weights, known-outcome denominators, Wilson intervals, low-sample warnings, and prospective forecast error tracking. The user's 0.0001% estimate is stored as an unvalidated scenario only.
- Official Anthropic OSS Scanner guidance was checked. The contact route for eligibility questions is published on its official page; enrollment was not submitted because current evidence does not demonstrate that AstroCrown-Web meets the established-project/critical-impact criteria. The eligibility inquiry was prepared for the maintainer to send; no direct Gmail connection is available here.
- Verified after merge that protected RSI readiness remains `INCOMPLETE`, `promotion.allow_main` remains `false`, and the context-packing benchmark remains disabled/unapproved.
- After PR #91, Scorecard [run #38109929326](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38109929326) no longer emitted prior TokenPermissions or DependencyUpdateTool findings, detected `SECURITY.md` at 4/10, and detected SAST on 22/30 commits (9/10).
- After PR #97, main-branch RSI CI passed [run #38110250889](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38110250889), external-review CI passed [run #38110251049](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38110251049), CodeQL passed [run #38110250981](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38110250981), and Scorecard completed with SARIF upload [run #38110251043](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38110251043). The latest Scorecard no longer emitted SecurityPolicy, TokenPermissions, or DependencyUpdateTool findings; SAST coverage was 27/30 recent commits (9/10).
- The active `Protect main` ruleset still has no required status checks and requires zero approvals; code-owner review and stale-approval dismissal remain disabled. The integration cannot mutate that ruleset. Required check contexts are now produced on every PR, but the maintainer must select them manually in [Protect main Settings](https://github.com/ACROWN-System/AstroCrown-Web/rules/23728412).
- After audit PR #98 merged, the newest main-branch external-review pipeline passed [run #38110463999](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38110463999), CodeQL passed [run #38110463911](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38110463911), and Scorecard completed with SARIF upload [run #38110463977](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/38110463977). The Scorecard continued to show the branch-protection gap; it no longer emitted SecurityPolicy, TokenPermissions, or DependencyUpdateTool findings. It detected SAST on 27/30 recent commits (9/10), no license, no recognized fuzzing integration, no OpenSSF Best Practices badge, 0/5 approved changesets, and CI checks on 4/5 merged PRs.

## Verification and handoff

Repository implementation is merged and the core validation routes passed. The plan remains ACTIVE because the external eligibility branch is unresolved, not because repository code is waiting to merge.

- [ ] Maintainer opens and sends the prefilled OSS Scanner eligibility inquiry from their own Gmail account.
- [ ] Record Anthropic's actual response and update eligibility only from that evidence.
- [ ] If the project is considered eligible, prepare a project-specific build Dockerfile and threat model, validate locally with the OSS Scanner project's own tools, then ask the maintainer to review and submit the separate enrollment PR/terms checklist.
- [ ] If ineligible, retain the free CodeQL and OpenSSF Scorecard routes and seek other structured external programs without treating their reports as human approval.
- [ ] Continue to preserve `implementation_readiness.status = INCOMPLETE`, `promotion.allow_main = false`, and the disabled/unapproved benchmark until all required independent gates are satisfied.
