# NOVA Control Plane, AstroCrown Runtime, and Paid-Host Handover

**Status:** PORTABILITY PLAN RECORDED / ACTIVE HEARTBEAT REMAINS IN NOVA / NO SECOND SCHEDULER AUTHORIZED  
**Review date:** 2026-11-08  
**AstroCrown-Web baseline:** `706f873e460f3c82f42659b43de79462146416b7`  
**NOVA source baseline:** `ACROWN-System/NOVA@9297a50c5f05e2f540af3ff226542311c5c5a68a`  
**NOVA operational-state baseline:** `ACROWN-System/NOVA@nova-operational-state` at `76c142c397a6d48965c93a75aaf232a88b9d7bd7`

## 1. Decision: one product repository, one active NOVA control plane

AstroCrown-Web is the authoritative repository for the AstroCrown product runtime and its deployment package:

- public website, frontend assets, and public-test notice;
- Worker/API backend and D1 schema migrations;
- account lifecycle, passkeys, recovery, sessions, role governance, and dashboards;
- product integrations, and future payments/treasury components when implemented and qualified;
- build, local qualification, staging deployment, and future paid-host deployment manifests.

NOVA remains the authoritative control plane for NOVA itself while the current GitHub-hosted operating environment is in use:

- provider/model routing and health observations;
- GPU-provider readiness and capacity observations;
- health policy, provider rosters, alerts, reasoning, and operational state;
- the active heartbeat and opportunistic probe scheduler;
- the manually invoked Weak RSI report workflow.

This separation is deliberate. NOVA is not just a frontend/backend folder, and GitHub Actions workflow YAML is not the actual AstroCrown application backend. The AstroCrown Worker/D1 runtime is independently owned by AstroCrown-Web.

## 2. Verified current automation in NOVA

The following workflows are active in `ACROWN-System/NOVA` at the source baseline above:

| Workflow | Current trigger | Purpose |
|---|---|---|
| `nova_heartbeat.yml` | Every 6 hours; manual dispatch; selected main-branch code changes | Provider/model health probe, reasoning over new operational annotations, provider qualification, state publication |
| `nova_GPU_heartbeat.yml` | Every 6 hours; manual dispatch; selected main-branch code changes | Read-only GPU-provider credential/capacity observations and state publication |
| `nova_probe_scheduler.yml` | Every 5 minutes; manual dispatch | Decides whether a due/opportunistic probe should run |
| `nova-weak-rsi.yml` | Manual dispatch only | One bounded provider call and a report-only artifact, with a human decision required |
| `nova-provider-qualification.yml` | Manual dispatch and selected code changes | Bounded provider qualification probes |
| `nova_health_tests.yml` | Push and pull request | Health/observer test suite |
| `nova_validation.yml` | Manual dispatch and selected code changes | Unit tests and credential-presence qualification |
| `nova_cloudflare_smoke_test.yml` | Manual dispatch only | Cloudflare Workers AI/token smoke test |
| `astrocrown-cloudflare-image-qualification.yml` | Manual dispatch only | AstroCrown image-provider qualification |

The two six-hour heartbeats and the five-minute scheduler share the `nova-operational-state-writer` concurrency group where they write state. The scheduler also shares the `nova-heartbeat` workflow-level concurrency group. Do not copy these schedules into AstroCrown-Web's active `.github/workflows/` directory while they remain enabled in NOVA: doing so would create a second controller, duplicated provider calls, competing state writers, and potentially unexpected usage.

## 3. Verified operational state and what must be migrated

`NOVA/operational_state.py` declares exactly two persisted state paths:

- `NOVA/health_state.json`
- `NOVA/roster.json`

The active heartbeat workflows load these from the dedicated `nova-operational-state` branch before probing and publish updates back to that branch afterwards. The loader validates the JSON structure and merges only previously persisted provider DOWN markers over the current source-controlled roster.

The health module documents that provider secrets are never persisted; it stores credential environment-variable names and sanitized observations. This does not mean every operational-state field is necessarily appropriate for public release. Before migration, validate the exact state snapshot, retain its provenance, and move only the validated operational state into the new durable store.

A complete handover must preserve both:
1. the versioned source/configuration and its tests; and
2. the latest validated operational-state snapshot.

Copying only the main branch is not enough to preserve the most recent provider-health history and roster DOWN markers.

## 4. RSI boundary: what is operational and what is suspended

The RSI implementation and its tests are already present in AstroCrown-Web under `development/nova-recursive-self-improvement/`. Its CI workflow is test-only. The NOVA manual Weak RSI workflow clones the public AstroCrown-Web source and runs `weak_rsi_report.py` from that repository.

Current governance boundaries are retained:

- **Weak RSI:** manual, report-only, at most one provider call per invocation, no source edits, no candidate execution, no branch/PR creation, no merge.
- **Strong RSI:** SUSPENDED. Its previous monthly workflow is stored under `development/nova-recursive-self-improvement/suspended/`, outside the active GitHub workflow directory. Its policy readiness remains INCOMPLETE, provider calls while suspended are zero, and automatic merge is disabled.
- A portability copy must not reactivate the suspended workflow, relax the independent benchmark or eligibility gates, or grant an RSI agent write/merge access.

The NOVA heartbeat is operational; Strong RSI is not. These are separate capabilities and must not be described or deployed as if they were the same.

## 5. Credential inventory and repository boundaries

GitHub repository secrets are scoped to their repository/environment. They are not automatically shared between NOVA and AstroCrown-Web, and secret values cannot be recovered through source files or the repository API. Add or rotate values through the relevant GitHub secret manager; never put them in commits, workflow summaries, issues, or chat.

### 5.1 NOVA control-plane credentials

The active NOVA workflows reference these manually managed repository secrets:

| Secret | Current use |
|---|---|
| `GROQ_API_KEY_01` | NOVA routing/heartbeat, provider qualification, manual Weak RSI |
| `GEMINI_API_KEY_01` | NOVA routing/heartbeat, provider qualification, manual Weak RSI |
| `CLOUDFLARE_API_KEY_01` | NOVA Cloudflare/Workers AI smoke and AstroCrown image qualification |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account selection for NOVA Cloudflare probes |
| `TWILIO_ACCOUNT_SID` | Optional NOVA alert delivery |
| `TWILIO_AUTH_TOKEN` | Optional NOVA alert delivery |
| `TWILIO_FROM_NUMBER` | Optional NOVA alert delivery |
| `TWILIO_TO_NUMBER` | Optional NOVA alert delivery |
| `NOSANA_GPU_API_KEY_01` | NOVA GPU heartbeat |
| `HF_ZEROGPU_TOKEN_01` | NOVA GPU heartbeat |

`GITHUB_TOKEN` is supplied automatically by GitHub Actions with the permissions declared by each job; it is not a provider secret to copy. The list above is the workflow reference inventory, not a claim that every secret is currently present, valid, eligible, or funded.

### 5.2 AstroCrown-Web staging deployment credentials

The `cloudflare-staging` GitHub Environment used by `.github/workflows/cloudflare-staging-deployment.yml` requires:

| Type | Name | Purpose |
|---|---|---|
| Environment secret | `CLOUDFLARE_API_TOKEN_02` | Dedicated scoped token for deploying the staging Worker and provisioning/using staging D1 |
| Environment secret | `ASTROCROWN_RATE_LIMIT_HMAC_KEY` | Secret key for public-staging rate limiting and signed notice acknowledgement |
| Environment variable | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |
| Environment variable, after first database creation | `ASTROCROWN_STAGING_D1_DATABASE_ID` | Pins subsequent deployments to the already-created staging D1 database |

These are not interchangeable with NOVA's `CLOUDFLARE_API_KEY_01`. Keep the staging deployment token narrowly scoped and separate from NOVA's provider/inference credential. The D1 database ID is configuration, not a secret. Do not enable billing, attach a payment card, or select a paid plan to satisfy this workflow.

### 5.3 AstroCrown-Web RSI/readiness configuration

The existing `.github/workflows/nova-credential-readiness.yml` checks for these repository-level values:

- Secrets: `GROQ_API_KEY_01`, `GEMINI_API_KEY_01`, `CLOUDFLARE_API_KEY_01`, `NOVA_RSI_APP_PRIVATE_KEY`.
- Variables: `CLOUDFLARE_ACCOUNT_ID`, `NOVA_RSI_APP_CLIENT_ID`, `NOVA_RSI_AUTOMERGE_ENABLED`, `RSI_AI_BASE_URL`, `RSI_AI_MODEL`, `RSI_AI_COMMERCIAL_ELIGIBILITY`, `RSI_BENCHMARK_COMMAND`.

The Cloudflare account ID is an identifier, not an API credential. The readiness workflow has been aligned to read it from a repository variable; that same repository variable can be consumed by the `cloudflare-staging` deployment job, unless an environment-scoped variable intentionally overrides it.

The provider credentials should only be duplicated into AstroCrown-Web where an AstroCrown workflow/component actually consumes them. If the NOVA control plane is later moved into AstroCrown-Web, then the NOVA-only credentials above must also be provisioned there (or, preferably, replaced with purpose-scoped credentials for that deployment).

The GitHub App private key/client ID and the Strong-RSI benchmark/eligibility settings are not needed for the present public staging Worker deployment. Do not create/activate Strong RSI credentials, mark commercial eligibility PASS, enable auto-merge, or invent a benchmark command merely to make the readiness report look complete. Those remain subject to the existing suspended/incomplete gates.

## 6. Required portability package inside AstroCrown-Web

The next implementation block should vendor a versioned, reproducible NOVA control-plane snapshot into AstroCrown-Web, rather than making the eventual paid host clone a second repository at runtime.

That package must include, at minimum:

1. NOVA's runtime Python modules and all transitive imports used by the AI heartbeat, GPU heartbeat, scheduler, provider qualification, reasoning, alerts, health, capacity, and operational-state commands.
2. The corresponding policy/configuration JSON, provider/GPU rosters, schemas, and sanitized initial state.
3. The complete NOVA unit-test suite and test fixtures needed to qualify the snapshot.
4. The active GitHub workflow definitions as **inactive templates** under the portability package, plus documented trigger/permission/secret contracts. They must not be placed at AstroCrown-Web's root `.github/workflows/` path while NOVA's copies remain active.
5. The NOVA operational runbooks, provider eligibility rules, $0/no-card constraints, state-restore instructions, alerting requirements, and rollback instructions.
6. A source manifest pinning the exact NOVA repository commit and recording the export date and checksums. A repeatable sync procedure must detect drift and update the snapshot through review.

Do not copy dated backup folders as authoritative code. Do not copy only selected files without dependency closure. Do not commit secret values or private operational credentials.

## 7. Paid-host portability work that must precede cutover

The current NOVA runtime is coupled to GitHub Actions in several ways. A paid-host release must not assume those services remain available:

- **Scheduler adapter:** replace GitHub cron/workflow dispatch with a host scheduler/worker queue while preserving the current cadence, concurrency, cancellation, and single-writer behavior.
- **State-store adapter:** replace `git fetch`, Git worktrees, and pushes to `nova-operational-state` with a durable, backed-up state store. Preserve schema validation, atomic writes, roster policy-vs-observed-state separation, and restore capability.
- **GitHub/alert adapter:** isolate operations that use `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, issue annotations, commits, or repository writes. A paid-host process must use a deliberate least-privilege integration or a host-neutral event/alert store; it must not assume the Actions-provided token exists.
- **Secrets adapter:** provide the same named configuration through the paid host's secret manager/environment, with separate least-privilege credentials per service and documented rotation. No secret belongs in Git.
- **AstroCrown runtime adapter:** preserve Worker routes, WebAuthn RP ID/origin, asset delivery, database migrations, rate limits, and security headers. If the selected paid host is not Cloudflare-compatible, explicitly port and re-qualify these instead of treating Wrangler configuration as portable.
- **Payments/treasury boundary:** keep future wallet, chain, RPC, treasury, and transaction-signing credentials separate from ordinary site and NOVA provider credentials. Do not include mainnet signing material in test staging.

A production migration package is incomplete until the selected host, runtime, persistent database/storage, backup and restore, secret store, scheduler, domain/TLS/WebAuthn origin, provider egress, alert route, and rollback method are all recorded and independently tested.

## 8. Safe cutover sequence

1. Pin and review the source commits for AstroCrown-Web, NOVA main, and the NOVA operational-state branch.
2. Export the complete NOVA runtime/dependency closure and test suite into the AstroCrown-Web portability package; verify file counts and checksums against the manifest.
3. Run the mirrored NOVA tests and the AstroCrown Worker/D1 tests from the AstroCrown-Web repository. Confirm no secret values enter artifacts/logs.
4. Implement and test the paid-host scheduler, state-store, GitHub/alert, and secrets adapters in shadow/dry-run mode. Do not send duplicate live provider probes during this stage.
5. Back up and validate the latest NOVA operational state, then restore it into the target state store and verify roster/health parity.
6. Perform a single-writer handover: stop/disable the old scheduled NOVA writers before enabling the new live scheduler, or use a verified fencing mechanism. Never allow two active writers to own the same state.
7. Run remote health, security, WebAuthn, account, database, backup/restore, alert, and rollback tests. Keep the old deployment recoverable until parity is demonstrated.
8. Only after the complete $0 qualification is finished may a separately authorized paid-host/domain/gas transition be considered, within the user's stated total cap of USDT 150. No paid resource or production deployment is authorized by this document.

## 9. Current non-goals and status

This document does not:
- deploy the AstroCrown Worker or create any Cloudflare resource;
- change or disable NOVA's existing schedules;
- copy or expose any credential value;
- activate Strong RSI or candidate-retention automation;
- authorize mainnet transactions, real funds, or a paid upgrade;
- declare the complete AstroCrown product or paid-host migration ready.

The objective is that AstroCrown-Web can eventually produce and operate the complete product plus its required NOVA integration from a reviewed, self-contained release package, without undocumented dependence on a second checkout or GitHub Actions-only runtime behavior.
