# Defer Mistral Free API from Runtime Health Checks

**Date:** 2026-10-10  
**Status:** COMPLETED — PR #58 merged; offline CI passed 57 tests; no live provider calls made  
**Branch:** `chore/defer-mistral-free-health-probes`

## Navigation-process limitation

The repository's required `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not found in the earlier repository investigation documented in `NOVA/research/Completed/2026-10-09-Provider-Diagnostics-and-Credential-Gaps.md`. This plan records the same blocker; it does not claim those documents were reviewed. Keep the work limited to the explicitly requested supplier-roster and health-workflow change.

## Objective

Temporarily remove Mistral Free API from NOVA's active provider roster and automated LLM health/failover environment, without deleting historical evidence or deciding whether Mistral's future paid service is suitable.

## Evidence and decision

- The user has decided to pause Mistral following repeated HTTP 429 / code 1300 failures under negligible successful usage and the support chatbot's Free-mode capacity-prioritization explanation.
- The cause of the individual rejection is not proven; this change is a reversible supplier-risk decision, not a finding of misconduct.
- Mistral must no longer be treated as dependable free-tier runtime capacity or included in scheduled live heartbeat/failover checks.
- Preserve historical Mistral probe records, issue links, diagnostic documentation and mocked offline regression tests. They must not trigger live provider requests.

## Scope

1. Remove the `mistral` provider from `NOVA/roster.json`'s active `providers` list and record it as deferred, not as active free capacity.
2. Remove `MISTRAL_API_KEY_01` from `.github/workflows/nova_heartbeat.yml` and `.github/workflows/nova_probe_scheduler.yml`, so neither live LLM health/failover workflow receives the secret.
3. Remove Mistral from the current minimum free-development provider list and the minimum live-LLM configuration checklist in `NOVA/DEVELOPMENT-RESOURCE-READINESS.md`; preserve the dated historical incident evidence and annotate the deferred decision.
4. Reclassify Mistral in `NOVA/PROVIDER-ACQUISITION-READINESS.md` as deferred pending explicit requalification.
5. Update scheduler unit-test fixtures so they do not simulate Mistral as an active rotating provider. Keep the mocked Mistral HTTP-header regression tests because they are deterministic offline tests and do not call the provider.
6. Add a deterministic regression assertion that Mistral is absent from the active runtime roster and both live health workflows' secret environments.
7. Inspect and validate the resulting patch and run the existing offline test workflow.

## Explicit exclusions

- Do not delete or rotate GitHub secrets; secret values are not exposed to the repository file API and are unnecessary once the workflow no longer injects the variable.
- Do not change billing, provider credentials, payment settings, provider policies, other providers, or GPU configuration.
- Do not erase Mistral's historical health-state, issues, support evidence, or past diagnostics.
- Do not claim Mistral's paid API has been rejected or that misconduct was proven.
- Do not run live provider probes as part of validation.

## Impact analysis

**If modified:** scheduled LLM heartbeat and fallback cannot select Mistral from the active roster and the workflow no longer injects its key. Automated tests and readiness documents match the user's current decision, while historical evidence remains available.

**If not modified:** Mistral remains in NOVA's active rotation and the heartbeat continues injecting its key, risking repeated failures and avoidable distraction while the supplier is deferred.

## Verification and completion criteria

- Confirm valid JSON in `NOVA/roster.json`.
- Confirm no Mistral provider exists in the active roster.
- Confirm `MISTRAL_API_KEY_01` is absent from both blocks in `.github/workflows/nova_heartbeat.yml`.
- Confirm documentation no longer classifies Mistral as required/current free-tier capacity and instead marks it deferred.
- Confirm offline scheduler fixtures no longer model Mistral as active and the new guard regression test covers roster/workflow exclusion.
- Run repository CI and inspect its result. Live-only Mistral diagnostics remain historical and out of scope.
- Keep the plan Active until the implementation stage is reviewed and automated checks pass; then move this plan to `NOVA/research/Completed/` if that workflow is supported.


## Completion record

- Pull request [#58](https://github.com/ACROWN-System/NOVA/pull/58) merged into `main` as commit `448ab60da10ca777cd9f1a5681b2c17391093d8d`.
- NOVA Health Tests run [37991457070](https://github.com/ACROWN-System/NOVA/actions/runs/37991457070) passed compilation and all 57 offline tests, including the new deferral guard test.
- No provider API was called by validation. Historical Mistral health observations and mocked diagnostic regression tests remain preserved.
- Mistral Free API is deferred from active free-tier capacity and live health/failover workflows. Requalification requires explicit user authorization and evidence of suitability.
- The missing repository-level navigation protocol/template remains an unresolved governance gap.
