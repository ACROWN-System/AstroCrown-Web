# Root-Cause Record — Cloud-First Execution Drift During Account Staging Preparation

**Date:** 2026-11-06  
**Status:** OPEN — immediate process cause established; project documentation and hosted workflow controls added; universal execution-policy enforcement remains BLOCKED  
**Scope:** AstroCrown-Web account staging preparation in the conversation/task that created the Cloudflare Workers placeholder and prepared the passkey-first account Worker deployment path  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Working branch:** `docs/provider-independent-wallet-auth-plan-2026-10-20`  
**Related pull request:** [#141 — Passkey-first account foundation; optional wallet backup (draft)](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)

## 1. Expected outcome

The owner had already established GitHub-hosted/cloud-based development as the normal operating direction for NOVA and AstroCrown. The local workstation was not intended to become the default dependency-installation, build, test, or deployment environment.

For this account-staging task, the expected execution path was therefore:

1. inspect the existing repository, task checkpoint, workflows and connected GitHub capabilities;
2. use GitHub-hosted Actions for dependency installation, tests, website build, Worker dry-run and browser qualification wherever supported;
3. use protected, manually authorized hosted execution for remote Cloudflare operations once the reviewed deployment workflow is available;
4. ask for local execution only for a demonstrated device-specific or otherwise irreducibly local test, explaining the reason and limiting the owner's action.

The owner did not introduce a new cloud-first preference during this incident. The deviation was failure to apply the established direction.

## 2. Observed deviation and impact

The assistant instructed the owner to prepare Node.js/npm on Windows and then to clone/switch branches locally, despite an existing GitHub-hosted Worker qualification workflow and available GitHub repository/Actions tools.

The resulting owner-local work included:

- repeated Node.js/npm detection and PATH troubleshooting;
- an initial recommendation to use a Windows installer even though the owner had previously exhausted installer attempts and reported that it did not work;
- switching to a portable Node.js ZIP, then re-establishing a session-scoped PATH after a new PowerShell session;
- repeated command invocation because PowerShell selected the blocked `npm.ps1` launcher instead of `npm.cmd`;
- a Git branch checkout failure because Windows could not materialize several deeply nested immutable backup paths;
- enabling Git's `core.longpaths` setting locally and restoring the missing working-tree backup paths from the checked-out branch.

The owner successfully restored the backup working tree. The final reported Git status was clean on `docs/provider-independent-wallet-auth-plan-2026-10-20`. No backup/history rewrite or remote deletion was performed. The failed checkout did not mean GitHub had deleted those files; it was a local Windows materialization limitation.

The avoidable cost was owner time and attention, operational friction, and exposure to a local checkout failure that was unrelated to the account feature being developed. It also increased the chance that work would be interrupted or delayed by environment-specific problems.

## 3. Evidence and chronology

### 3.1 Existing hosted capability

Before the local setup was requested, the branch already contained:

- `.github/workflows/account-staging-worker-qualification.yml`, which runs on GitHub-hosted `ubuntu-24.04` and sets up Node.js 22;
- dependency installation, Worker invariant tests, restricted website build, Wrangler bundle dry-run, local D1 migration, local Worker HTTP checks and headless Chrome virtual-authenticator qualification;
- separate PR/push workflow execution paths and explicit fail-closed checks for the remote deployment configuration.

The account Worker qualification had already passed on the implementation branch before this incident's local preparation. The latest recorded prior implementation evidence included runs #77 and #78 on commit `8567b39ad7d5157777a4f8e3d93b0e80bd854573`.

### 3.2 Existing local-oriented implementation cues

Before this correction, the Worker README presented a `Local qualification` section before its remote staging section. The remote deployment script expected a local checkout and local ignored `.wrangler/` state. The README instructed the operator to set Cloudflare credentials in the same local terminal and run `npm install` and `npm run deploy:staging`.

Those implementation/documentation choices explain why a local route appeared convenient. They did not establish that the owner had to run it locally: the qualification workflow was already hosted, and the deployment script could be adapted for a protected GitHub environment.

### 3.3 Owner-local execution results

- Portable Node.js 22.23.4 and npm 10.9.9 were ultimately verified using the ZIP distribution; Git 2.55.0 was present.
- The local branch switch hit Windows `Filename too long` errors while materializing deeply nested files under `backup/`.
- The owner set `core.longpaths=true` locally and restored `backup/` from the checked-out branch.
- The final status output was clean and showed the correct branch tracking its origin branch.

These are observations of the local detour, not evidence that local execution was technically required.

### 3.4 Hosted correction evidence

The branch was updated to provide a manual, main-branch-only GitHub-hosted Cloudflare staging deployment path. The guarded script accepts protected GitHub environment secrets, withholds the staging access code from logs, and supports persistent D1 identity across ephemeral runners. The deployment workflow requires separate free/no-card confirmation and explicit staging-deployment authorization inputs.

The Worker qualification workflow was updated to include the deployment workflow in its path filters and parse its YAML. On branch head `ad7154a08f9c8b7289c5750b9f314efb0db6b4e6`, the following hosted evidence was retrieved:

- [Account Staging Worker Qualification #95](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42066980560) — PASS; all job steps succeeded, including invariant tests, restricted build, Wrangler dry-run, local D1 migration, HTTP/browser smoke test, deployment-workflow parsing and fail-closed sentinel verification.
- [Account Staging Worker Qualification #94](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42066974747) — PASS.
- [Local Wallet Authentication Prototype Tests #648](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42066980743) — PASS.
- [External Review Pipeline CI #923](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42066980446) — PASS.
- [NOVA RSI Engine CI #1411](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42066980418) — PASS.
- [NOVA RSI CodeQL Security Analysis #944](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/42066980514) — PASS.

The separate push-event records for `account-continuity-prototype-tests.yml` #639 and `python-ci-lock-refresh.yml` #113 reported failure with zero jobs. They are not treated as successful Python reference-suite execution. That reference path remains UNVERIFIED/BLOCKED.

## 4. Root-cause analysis

### 4.1 Immediate cause — VERIFIED

The assistant selected a local execution path and began issuing owner-local setup instructions without first checking the already available GitHub-hosted workflows and connected GitHub capabilities for the required operations.

It treated the local-checkout assumptions in the existing deployment script as if they were a requirement for the owner to operate locally, rather than as a limitation to remove from the automation. It also failed to carry forward the established cloud-first operating direction when choosing the next action.

### 4.2 Enabling/systemic causes — VERIFIED

1. **Pre-action environment selection was skipped.** The work did not begin with an explicit decision about which operations belonged in repository tools, GitHub-hosted runners, Cloudflare, or the owner's machine.
2. **Repository inspection was incomplete at the point of instruction.** The existing Worker qualification workflow was not examined before the assistant asked the owner to install Node.js.
3. **Implementation cues conflicted with the established operating direction.** The README and deployment script had local-first assumptions, while a hosted qualification workflow already existed. No deployment workflow yet bridged hosted CI to protected remote deployment.
4. **A script limitation was transferred to the owner instead of being addressed in the script.** The deployment script's local state and secret-file assumptions were treated as operator prerequisites.
5. **Known local friction was not respected.** The assistant recommended a Windows installer after the owner had already experienced repeated installer failure. The ZIP/PATH and PowerShell launcher issues then produced additional repeated steps.
6. **No enforceable pre-action guard stopped the deviation.** The project had a cloud-first owner direction, and development standards already required inspecting workflows and alternatives, but no deterministic check required the assistant/work plan to state why local execution was necessary before asking the owner to perform it.

### 4.3 Broader architecture limitation — VERIFIED

NOVA's `NOVA/ROOT-CAUSE-PREVENTION-AND-SHARED-KNOWLEDGE-GOVERNANCE.md` identifies universal root-cause enforcement as a **proposed architecture**, not an implemented gate across all assistant, CLI, API, UI and tool entry points. The proposal itself says prompt-only or model-only compliance is insufficient.

Accordingly, this record does not claim that the new documentation section or an assistant memory statement universally enforces the rule. Durable project guidance and CI checks improve recurrence resistance, but universal NOVA enforcement remains a separate implementation task.

## 5. Missed controls

| Expected control | Observed gap |
|---|---|
| Inspect existing workflows before asking for local setup | Not done before Node.js instructions |
| Honour the established cloud-first direction | Not applied to the immediate execution plan |
| Compare materially different authorized execution paths | GitHub-hosted route not evaluated first |
| Treat local tooling failures as a reason to re-evaluate the route | Repeated local troubleshooting continued |
| Keep the owner's required actions minimal | Unnecessary installation, PATH and checkout tasks were delegated |
| Durable work plan records execution location and exception reason | No such field/gate was applied |
| Use prior CI evidence where exact commit/scope matches | Existing hosted qualification was not consulted at the start |

## 6. Recurrence-prevention controls added

The following changes were made on the draft account branch:

1. **Development convention:** Section 20, “Execution-Environment Selection and Cloud-First Operations,” now requires an explicit execution-location decision before substantive work, makes the established hosted path the default for this workstream, defines narrow local exceptions, and requires a reason for local setup.
2. **Worker README:** Hosted GitHub Actions qualification is now the documented primary path. Local qualification is labelled optional diagnostics and requires a specific reason.
3. **Hosted deployment workflow:** `.github/workflows/cloudflare-staging-deployment.yml` is manual-only and restricted to `main`. It separates free/no-card confirmation from explicit staging deployment authorization, uses the `cloudflare-staging` protected environment, and never deploys from PR/push CI.
4. **Deployment script:** Protected GitHub environment secrets are required on GitHub-hosted runs; staging access secrets are masked and withheld from output; the non-secret D1 UUID is reported immediately and must be pinned for subsequent ephemeral-runner deployments.
5. **Regression tests:** Deployment guard tests check protected-secret use, D1 UUID continuity, manual-only workflow configuration and main-branch restriction. Worker qualification now runs when the deployment workflow changes and parses that workflow.
6. **PR evidence:** The changes and remaining limits were recorded in PR #141.

## 7. Verification status and remaining blockers

**PASS — first hosted recurrence controls:** The hosted Worker qualification and related PR checks listed above passed against the exact recorded branch head. The new workflow was parsed during Worker qualification, and the remote staging sentinels remained fail-closed.

**BLOCKED — workflow activation:** PR #141 remains open, draft, unmerged. The new `workflow_dispatch` deployment workflow is not available on the default branch until the reviewed change is approved and merged by an authorized maintainer. This record does not authorize merge.

**BLOCKED — remote Cloudflare deployment:** The Cloudflare API token has been created and saved by the owner but has not been installed into the GitHub `cloudflare-staging` environment. No remote D1 database has been created by the guarded workflow; no AstroCrown account Worker version has been deployed; no paid plan or payment method has been enabled. The dashboard-created Worker remains a Hello World placeholder.

**BLOCKED — remote account qualification:** A successful hosted local-Worker test is not evidence of deployed Cloudflare runtime behavior. Real remote browser registration, discoverable sign-in, recovery, session revocation, actual stored ML-DSA-44 credential assertion, quota/CPU measurements and provider-retention checks remain required.

**UNVERIFIED/BLOCKED — Python reference suite:** The two zero-job push-event workflow failures do not prove the Python account-continuity reference suite passed.

**BLOCKED — universal enforcement:** The pre-action environment-selection rule is documented, and the account deployment path has hosted automation, but no NOVA deterministic control yet intercepts every assistant/tool entry point and prevents a local-first instruction. The broader root-cause prevention architecture remains proposed until implemented and tested.

## 8. Closure criteria

Keep this record OPEN until all applicable items below are evidenced:

1. The documentation and hosted workflow changes pass exact-head qualification and remain part of the reviewed account branch.
2. The deployment workflow is present on `main` only after normal PR review/approval; no draft or PR workflow can reach remote Cloudflare credentials.
3. The protected `cloudflare-staging` environment is configured and restricted to `main` before any remote run.
4. The first remote deployment preserves and records D1 identity; subsequent runs verify and reuse only that exact identity.
5. The owner is not asked to perform local setup unless the work record explains why a specific operation is irreducibly local.
6. The future NOVA enforcement design is implemented at the relevant execution boundary or its remaining unintegrated entry points remain explicitly BLOCKED from claiming universal enforcement.
7. A recurrence test or review demonstrates that the same local-first decision pattern is detected before owner instructions are issued.

## 9. Impact analysis

**If the controls are applied:** owner time is reserved for decisions, domain-specific review and genuinely device-dependent testing. GitHub-hosted runners perform repeatable dependency, build, test and browser work; remote deployment occurs only through a protected, manually authorized workflow.

**If the controls are not applied:** an assistant or operator can again follow the easiest local script path, disregard the established hosted direction, and shift tool installation and environment troubleshooting to the owner. A written preference alone cannot prevent that if the execution path is not checked before action.

**Non-negotiable recurrence rule:** For this project workstream, do not ask the owner to install or troubleshoot local development tooling until the available GitHub-hosted/remote path has been inspected and a specific, evidence-based reason for local execution has been recorded.
