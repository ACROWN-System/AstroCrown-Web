# Systemic Engineering Quality — Investigation Plan

**Date:** 2026-10-12  
**Status:** ACTIVE — evidence collection and root-cause analysis  
**Objective:** Determine why recent custom implementation work failed and define controls that reduce recurrence across current and future AstroCrown / NOVA development.

## Scope

- Primary incident: NOVA Cloudflare Workers AI smoke test and the associated changes to `NOVA/router.py`, `NOVA/tests/test_router.py`, and `.github/workflows/nova_cloudflare_smoke_test.yml`.
- Process scope: development prompts, external API/model integration, dependency and SDK selection, unit/integration test design, diagnostics, CI workflows, merge/promotion discipline, evidence handling, and remediation/re-test.
- Repository scope: `ACROWN-System/NOVA` and `ACROWN-System/AstroCrown-Web`; extract reusable controls for other repositories without claiming those repositories have been audited.
- Preserve all incident commits, logs, tests, reports, and operational history. No deletion or rewriting of historical evidence.

## Source of truth and authority

1. Exact Git commits, source files, automated test results, and GitHub Actions logs for the incident.
2. Current official Cloudflare Workers AI documentation and maintained implementation/SDK examples.
3. Existing AstroCrown Web Development & Audit Convention, Prompt Guide, audit templates, and existing NOVA research/verification conventions.
4. Authoritative software-development references such as NIST SP 800-218 (SSDF) and GitHub's documentation for CI/branch protection.
5. Unverified claims and hypotheses must remain labelled UNKNOWN, BLOCKED, or CANDIDATE.

**Protocol limitation:** The canonical `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` are not present in the current active AstroCrown-Web file tree; the prior cross-repository audit also recorded that they could not be located. This plan uses the existing `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` and `development/audit/templates/AUDIT-RECORD.md` as the available fallback. This is not represented as compliance with the unavailable canonical protocol.

## Investigation questions

1. Which assumptions in the Cloudflare integration were unsupported by evidence at the time they were encoded?
2. Why did local unit tests pass while live behavior differed, and what kinds of tests were missing?
3. Did duplicated or hand-written request/response logic create drift from provider-supported interfaces or from production code?
4. Did logs expose the minimum safe evidence needed to classify a failure without exposing secrets or losing diagnostic value?
5. Which existing project controls already address these risks, and where are they missing, not enforced, or not applied to this class of change?
6. What low-cost, enforceable controls can apply to future code, workflows, prompts, UI, provider integrations, and cross-repository changes?

## Method

1. Reconstruct the incident timeline from exact commits and workflow runs.
2. Separate confirmed facts from root-cause hypotheses.
3. Review production code, test code, workflow code, current CI trigger coverage, and existing project conventions.
4. Verify external contract and capability claims against provider-maintained documentation, SDKs, and examples.
5. Map each finding to a preventive/detective control, an enforceable gate, evidence required, and a regression test.
6. Minimize additional custom infrastructure; prefer existing SDKs, native CI controls, maintained linters/test tools, and explicit versioned provider capability records.
7. Record finding severity from demonstrated impact, and state residual uncertainties instead of inferring a cause.

## Constraints

- Keep all work $0 and no-payment-method compatible.
- Do not call live paid endpoints, alter provider credentials/secrets, or repeat unnecessary live API probes.
- Do not weaken health validation merely to make a check pass.
- Do not change production routing or provider model until the documented capability/request contract supports the change.
- Do not claim branch-protection state is verified: the GitHub integration returned 403 for both repositories' branch-protection endpoints.
- Do not merge or deploy any production change as part of this investigation unless independently justified, reviewed, and explicitly included in a later implementation scope.

## Expected outputs

- Evidence-based postmortem with verified timeline, proximate causes, contributing process failures, impact, and remaining unknowns.
- Cross-repository quality-gate proposal that extends existing conventions rather than creating duplicate governance.
- Prioritized remediation matrix across prompt/source research, SDK reuse, automated verification, integration fixtures, diagnostics, CI, main-branch safety, and regression prevention.
- Acceptance criteria that can be objectively tested; every proposed control will distinguish enforced from advisory.
- Impact Analysis using `IF modified` / `IF not modified`.

## Acceptance criteria

- Every causal statement is linked to a commit, file, test output, workflow log, or authoritative source.
- Facts, inferences, candidates, and blocked items are clearly separated.
- The postmortem identifies both code-level failure modes and the process that allowed them through.
- Recommendations reuse existing tools and governance where feasible, do not depend on paid services, and apply to future development workflows.
- Any remediation is verified against the original failure and relevant regression tests; changing code alone does not close a finding.

## Impact Analysis

**IF this investigation is completed:** The team can introduce enforceable controls at the earliest point where unsupported assumptions can enter development, test the controls against this incident, and reuse them across current and future projects.

**IF this investigation is not completed:** Similar assumptions may continue to be encoded as custom code, pass mocked unit tests, fail at provider/runtime boundaries, and consume user time through repeated manual diagnosis and remediation.

## Current status

- Initial incident evidence retrieved.
- Current provider documentation confirms that structured output capability is model-specific; configured GLM-4.7-Flash is absent from Cloudflare's published JSON Mode supported-model list.
- Branch-protection configuration is BLOCKED for this audit because GitHub API access returned 403.
- No broad remediation policy or production routing change has yet been applied.
