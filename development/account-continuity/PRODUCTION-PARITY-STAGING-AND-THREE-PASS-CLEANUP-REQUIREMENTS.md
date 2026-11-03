# Production-Parity Staging and Three-Pass Cleanup Requirements

**Decision date:** 2026-11-04  
**Status:** OWNER-ACCEPTED ARCHITECTURAL DIRECTION / HOSTING RUNTIME NOT YET QUALIFIED  
**Scope:** AstroCrown public website and passkey-first account subsystem

## 1. Accepted architectural direction

AstroCrown's shared browser-test website is to be built as a **production-shaped staging deployment**. A temporary local server plus HTTPS tunnel can help diagnose an origin/ceremony issue, but it is not the principal development or release-validation environment.

The purpose of staging is to expose deployment, runtime, persistence, security, migration, origin, browser and operational defects while they are still inexpensive to correct. The staging deployment should therefore reproduce the public deployment architecture rather than approximate it through a different server or temporary network path.

This decision accepts the architectural principle. It does **not** select Cloudflare, GitHub Pages, a particular Worker runtime, D1, a production domain or any paid service. The hosting/runtime decision remains blocked until the exact stack is tested against the adopted passkey requirements and the strict $0/no-card constraint.

## 2. Environment model

Maintain three explicit, separate operating contexts:

| Environment | Purpose | Data | Access |
|---|---|---|---|
| Local development | Unit tests, deterministic integration tests, developer debugging | Synthetic fixtures only | Local operator |
| Staging | Deployed browser and end-to-end validation of the public architecture | Synthetic, disposable records and credentials only | Explicitly authorized testers |
| Production | Real public service after release approval | Real user records under approved policy | Public users under production controls |

Staging and production must use the same:
- application source and application artifact format;
- server/runtime framework and API handling model;
- database engine, data-access layer, schema and migration scripts;
- same-origin routing topology and HTTPS assumptions;
- WebAuthn library/verification implementation and challenge lifecycle;
- session issuance, cookie attributes, CSRF/origin checks, rate limits and security headers;
- deployment tooling, build steps, artifact provenance, rollback strategy and operational health checks;
- logging/redaction rules, security event schema and alerting controls.

The intended differences are limited to explicit environment values and isolated resources:
- staging hostname, HTTPS origin and WebAuthn RP ID versus production hostname/origin/RP ID;
- a distinct staging database and a distinct production database;
- independently generated staging secrets and production secrets;
- a staging-only access gate, clearly identified staging environment label and synthetic test fixtures;
- environment-appropriate telemetry/retention settings;
- resource limits appropriate to staging and production, without changing security semantics.

No staging runtime, account, database, passkey, recovery key, wallet key, session or secret may be shared with production. Staging must never be configured to fall back to production bindings or credentials if its own setting is missing. Missing staging configuration must fail closed.

## 3. Build and promotion parity

1. Build one immutable candidate artifact from a reviewed commit.
2. Test that artifact locally, then deploy the same artifact to staging without rebuilding it with different source or dependency versions.
3. Record the commit, dependency-lock hashes, build artifact digest, schema migration version, environment configuration version and deployment identifier.
4. Run the complete API, database, browser, recovery, negative-security and operational tests against staging.
5. Apply the three-pass cleanup protocol when a test cycle or release-candidate cycle is complete.
6. Promote the same artifact and approved migration set to production only after explicit release authorization. Production secrets, database identifiers, RP ID and origin are injected from production-only secret/configuration stores at deploy time; they are never embedded in the artifact.
7. Keep staging/production rollback targets and database migration compatibility explicit. A code rollback must not silently roll back or corrupt account data.

A staging access gate is an additional protection, not a replacement for the account's actual WebAuthn authentication and authorization. The public production build must not accidentally inherit a shared staging password or test-only bypass.

## 4. Test-data and key separation

Only invented, non-identifying, synthetic records may be used in staging. The following are prohibited in staging:
- real user's personal details or production account identifiers;
- production passkeys, recovery keys or recovery phrases;
- any production signing, encryption, session, deployment, API or database credential;
- personal wallet private keys, seed phrases, live asset balances or real transaction authority;
- real payment or identity-provider credentials.

Generate disposable test passkeys and recovery keys specifically for the staging RP ID. Generate dedicated test-only administrator wallet keys only when administrator flow tests are separately authorized; use no mainnet funds, no valuable approvals and no shared personal wallet. Revoke all staging admin credentials at test-cycle closure.

Use separate randomly generated secret values for each environment. Staging secrets must be revocable and replaceable without affecting production. Keep secrets out of Git, Git history, source maps, HTML, logs, screenshots, CI output, pull-request descriptions and downloadable test reports. Deployment credentials must be least-privilege and may be supplied through a local authenticated CLI or a separately approved CI secret; never store provider master/API keys in the repository.

## 5. Candidate $0 platform — qualification only

Cloudflare Workers Free plus static assets and D1 is a candidate for a deployed, same-origin staging architecture. The present published limits are useful for a small test system but are not permanent guarantees:

- Workers Free: 100,000 requests/day and 10 ms CPU time per invocation. Static asset requests are listed separately as free/unlimited in current pricing documentation.
- D1 Free: 10 databases per account, up to 500 MB per database, 5 GB aggregate storage, 5 million rows read/day, 100,000 rows written/day and 7 days of Time Travel retention.
- Exceeding D1 daily read/write quotas causes D1 queries to fail until the quota resets; the app must handle this as a service-capacity failure, not as a reason to switch to paid billing.
- Cloudflare Workers pricing says Workers Free is available by default; this proposal does not authorize enabling Workers Paid, adding a payment method or enabling any billable product.

Official references:
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/d1/reference/faq/

### 5.1 Material blockers before selecting Workers + D1

The current account backend is not Worker-ready unchanged: it is a Python ThreadingHTTPServer, opens a local sqlite3 file and contains process-oriented lifecycle assumptions. A Worker implementation requires an HTTP fetch/request handler and an asynchronous binding-backed data adapter (for D1 or another approved store). Existing domain rules, API contracts and schema semantics should be preserved, but runtime and storage adapters must be made explicit and tested.

The current Python WebAuthn verifier is pinned to webauthn 3.0.1 with cryptography and pyOpenSSL dependencies. Cloudflare Python Workers execute through Pyodide and document support for pure-Python and PyEmscripten packages. Package compatibility and the required versions have not been proven. Do not assume that a regular CPython Linux wheel can be used in the Worker runtime.

A JavaScript/TypeScript Worker and SimpleWebAuthn is another candidate, but its current ML-DSA guide lists Node 24.7+ and Deno 2.8.2+ as supported runtimes, not Cloudflare Workers. Cloudflare Workers separately exposes ML-DSA-44/65/87 through an opt-in Web Crypto compatibility flag; that primitive-level support does not prove that the complete WebAuthn library/runtime combination verifies the project's exact profile. The actual deployed Worker must pass real ML-DSA registration and subsequent assertion tests before this path can be approved.

Cloudflare Containers are excluded under the strict $0 rule: the current documentation makes Containers available on the Workers Paid plan, whose minimum charge is $5/month. GitHub Pages is also not a backend option because it publishes static files and does not run Python server-side code.

### Required technical proof before platform selection

1. Deploy a minimal non-production Worker using the exact free plan and record the account's billing state and any payment-method requirements.
2. Serve the AstroCrown frontend and same-origin account API from one deployed origin.
3. Prove separate staging and production-like database bindings with the same migration set and no cross-environment access.
4. Run account registration, discoverable sign-in, recovery-key replacement, session revocation and negative-origin tests from a real browser.
5. Verify actual ML-DSA-44, -65 and -87 credentials through registration, persistent storage, reload and subsequent assertion verification. Classical fallback must be reported as classical.
6. Measure CPU time, Worker request use, database row reads/writes and storage under realistic test flows; confirm the application fails closed at free limits and cannot incur paid usage.
7. Review vendor-managed log, backup, point-in-time recovery and deletion retention before claiming residual-zero cleanup.

## 6. Three-pass zero-residual cleanup requirement

Before public-production promotion, run three separately recorded and independently checked cleanup passes. Each must return zero for all project-controlled residual test secrets, test recovery material, test sessions/tokens, test passkey records, synthetic personal-like data, stale environment variables and test-only credentials.

### Pass 1 — Source and build artifacts

Scan current source, all tracked files, Git history, branch refs, deployment manifests, CI logs/artifacts/caches, generated bundles, source maps and environment configuration. Rotate/revoke any value that could have been exposed; deleting a file is never a substitute for revocation. Never put production secrets in staging.

### Pass 2 — Runtime and storage surfaces

Delete disposable staging accounts/credentials/challenges/sessions, revoke staged keys, clear caches and test objects, remove the staging database/resource when the test cycle ends, and inspect application/provider logs and provider-managed snapshots/backups against published retention rules. Resource deletion is not proof that every provider-managed backup copy is instantly erased.

### Pass 3 — Independent verification

Repeat secret scanning independently against the release artifact and deployed staging endpoint; verify that no test session or credential remains valid; inspect database/log/cache/backup state and retention expiry; compare exact artifact hashes and deployment configuration; record evidence, timestamp, scope and result. A surface that cannot be inspected or whose deletion/retention cannot yet be proven is UNVERIFIABLE/BLOCKED, never silently counted as zero.

The three passes must each independently show zero across the surfaces we control. They are not three repetitions of the same narrow repository scan. Provider-held logs, backups and point-in-time recovery copies remain subject to documented retention; do not claim immediate erasure where the platform does not provide evidence. The safest invariant is that only synthetic, non-identifying test data and test-only secrets ever enter staging.

### Mandatory post-cleanup retention quarantine

**Owner decision — 2026-11-04:** For a platform with a documented seven-day recovery/undelete window, public production promotion must be separated from final staging closure by at least **eight complete 24-hour periods**. This is an intentional release gate, not an estimate of development duration.

For the current Cloudflare D1 Free candidate, the official documentation currently states:
- D1 Time Travel on Workers Free can restore a database to a point within the previous seven days.
- A deleted D1 database can be undeleted for up to seven days after deletion.
- D1 Free's published Time Travel duration is seven days.

References (recheck at qualification and release time because provider terms can change):
- https://developers.cloudflare.com/d1/reference/time-travel/
- https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/undelete/
- https://developers.cloudflare.com/d1/platform/limits/

The eight-day clock starts only after **both** of these events have occurred, using the later verified UTC timestamp as T0:
1. The final staging data/credential/session write or mutation has completed and staging writes are disabled.
2. The staging database/resource has been deleted successfully, with provider confirmation and a recorded deletion timestamp.

No staging restore, undelete, re-creation using the same retained data, or other operation that reintroduces the test dataset is permitted during the quarantine. Any such event invalidates the interval; cleanup must be repeated and a new T0 recorded. Development may continue on a separate working branch and isolated development resources, but the frozen release candidate and quarantined staging environment must not be changed.

The final independent cleanup pass must occur **after** the full eight-day interval. It must verify that the documented seven-day restore and undelete windows have expired, recheck all project-controlled source/build/runtime surfaces, and inspect provider deletion/retention evidence. The release record must include T0, the end timestamp, provider/account/resource identifiers in appropriately redacted form, evidence of deletion, and the independent verification result.

This interval proves only that the provider's documented seven-day recovery/undelete operations have passed their published availability window. It does **not** prove physical erasure of every provider-held storage replica, internal log, abuse/security record, or other retained copy. Those surfaces must be assessed separately against current provider documentation and available account-level evidence. Any retention that is longer, unclear, inaccessible or unverifiable remains UNVERIFIABLE/BLOCKED and prevents a zero-residual claim and production promotion. Never infer erasure solely from elapsed time.

If a different host or database is ultimately selected, calculate the quarantine against that platform's longest documented recovery, undelete, backup and relevant log-retention period, with an additional full 24-hour safety margin. Unknown or uninspectable retention is a blocker, not a reason to assume that eight days is sufficient.

### Immutable backup and Git-history boundary

Do not modify, delete, rewrite, rename, relocate or compact immutable historical NOVA/AstroCrown backup snapshots to satisfy cleanup. If a test-only secret ever appears in an immutable backup or old Git object, preserve the backup/history as governed but revoke/rotate that secret and record the residual as retained historical material; never misreport it as erased.

## 7. Production-parity staging acceptance

- One immutable build artifact and dependency inventory are recorded and promoted without rebuild.
- Staging/production use the same runtime, application logic, data schema/migrations, HTTP/API topology and security controls.
- The exact staging HTTPS Host, Origin and WebAuthn RP ID are verified; wrong-origin and wrong-RP tests fail.
- Real browser registration, sign-in, recovery and session revocation pass against the deployed staging service.
- ML-DSA is claimed only after a real credential is registered and a later assertion verifies under its actual stored algorithm.
- Staging and production have physically separate databases, secrets and access configuration; no production binding is reachable from staging.
- Logs do not contain passkeys, recovery keys, session cookies, secrets or request bodies.
- Free quota exhaustion and missing configuration fail closed without paid fallback or resource activation.
- All three cleanup passes show zero controlled residuals; vendor-retained surfaces are separately proven or labelled blocked.
- Rollback, migration compatibility, dependency provenance and release evidence are retained.

Passing CI alone is not sufficient. This document does not authorize a merge, paid service, provider lock-in, public deployment or public account onboarding.

