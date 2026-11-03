# Passkey-First Account Implementation Status and Release Boundary

**Review date:** 2026-11-04  
**Status:** CURRENT DEVELOPMENT IMPLEMENTATION / LOOPBACK-ONLY / NOT PRODUCTION  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Pull request:** [#141 — Passkey-first account foundation; optional wallet backup](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)

## 1. Governing account decision

The only active account-authentication and recovery design is [Passkey-First Account Authentication and Recovery Requirements](../../account-continuity/PASSKEY-FIRST-ACCOUNT-AUTHENTICATION-AND-RECOVERY-REQUIREMENTS.md).

- WebAuthn passkeys are the primary account authenticator for ordinary users and administrators.
- Discoverable passkey sign-in does not require an email address, username prompt or password.
- Account recovery uses a high-entropy, user-held, single-use offline recovery key followed by replacement-passkey registration.
- Email addresses, email verification, email password-reset, SMS and hosted identity providers are not part of account registration, sign-in or recovery.
- Wallet authentication remains separate. The current EVM/SIWE implementation is used for administrator wallet enrollment and short-lived privileged step-up; it is not the ordinary account authenticator. Optional ordinary-account wallet backup remains unimplemented.
- Account identity, sessions, roles and permissions are independent of wallet addresses and passkey credential identifiers.

## 2. Current local prototype capabilities

The loopback prototype under `development/account-continuity/prototype/` currently includes:

- WebAuthn discoverable registration and sign-in, server-side challenge lifecycle, origin/RP checks, user-verification requirements and credential signature verification through the pinned open-source relying-party library.
- A one-time 256-bit offline recovery key, shown once; only a salted one-way verifier is stored. Successful recovery consumes the previous key, requires a replacement passkey, revokes prior passkeys and sessions, rotates the recovery key and records an audit event.
- Stable account identifiers, local sessions, the common User dashboard, server-owned roles and permissions, and a separate Administrator dashboard.
- Administrator wallet enrollment and privileged step-up through the isolated EVM/SIWE proof-of-control path.
- Private in-app Alerts and Messages, with recipient-scoped retrieval, acknowledgement/read state, bounded pagination and permission/audit controls. These are in-app communications, not email delivery.

The prototype is not an online public account service. It binds to loopback and uses a local SQLite database.

## 3. Experimental ML-DSA boundary

The local WebAuthn implementation negotiates ML-DSA algorithms ahead of classical fallbacks and can verify ML-DSA signatures on the server. Automated backend tests generate ephemeral ML-DSA keys and exercise genuine signature verification, including rejection of invalid challenges and modified signatures.

This is **not proof of browser, operating-system, platform-authenticator, synced-passkey or hardware-key interoperability**. The WebAuthn/CTAP ML-DSA mapping remains an Internet-Draft. Registration options advertising ML-DSA do not prove the authenticator selected it. A credential may be described as post-quantum only after a real authenticator registers an ML-DSA public key, the server verifies the ceremony, stores the actual algorithm and verifies a later authentication assertion with that key. Classical fallback credentials must be reported as classical.

## 4. Explicit exclusions and residual code boundary

No account-authentication or recovery behavior may depend on email, password, email verification, password-reset email, SMS, newsletter delivery, SMTP or a third-party identity provider. No production email sender is configured or selected.

Dormant email-oriented test/legacy code remains isolated in the development branch only; it is not a supported account feature and must not be enabled or configured for public users. Its removal is a separate code-pruning task with a dedicated regression review.


Astro-Wallet, custody, seed-phrase collection, generic multichain signing, payment/transaction execution, MPC/TSS, a production account API, public database, production session infrastructure and public onboarding are outside the current prototype's implemented scope.

## 5. Production-parity staging architecture — accepted direction

The next shared browser-test website is to be built as a **production-shaped staging deployment**, not by exposing the loopback server through a temporary tunnel. Staging and production must use the same application architecture, runtime, database technology/schema/migrations, same-origin API topology, HTTPS policy, WebAuthn verification implementation, session/cookie controls, security headers, rate limits, build artifact and deployment method. Differences are limited to the exact host/origin/RP ID, isolated database and secrets, test-only access gate, environment label, synthetic dataset and controlled test observability.

The staging environment must be independently deletable and must never read from, write to, or share credentials/secrets with production. Passkeys and recovery keys created for staging are disposable and cannot be migrated to the production RP ID. The same source/build is promoted through an auditable pipeline; environment-specific settings must be explicit, not inferred or silently defaulted.

### Platform qualification boundary

Cloudflare Workers Free + static assets + D1 is a **candidate**, not an approved provider decision. Published free limits currently include 100,000 Worker requests/day and 10 ms CPU time per invocation; D1 Free currently permits 10 databases per account, 500 MB per database, 5 GB aggregate account storage, 5 million rows read/day, 100,000 rows written/day and 7 days of Time Travel retention. Exceeding free D1 daily quotas causes queries to fail rather than automatically upgrading the plan. These are current published limits, not guarantees of future availability or account eligibility.

Before selecting it, the team must prove the real account flows against this runtime. The present Python server is a local ThreadingHTTPServer process using sqlite3 on a local file; it cannot be deployed unchanged as a Worker. A Worker implementation would need a request-handler/runtime adapter and an asynchronous D1 persistence layer while preserving the same account, challenge, session, recovery and audit contracts. The free 10 ms CPU allowance must be benchmarked against real passkey verification, including large ML-DSA signatures.

The current Python WebAuthn dependency uses cryptography and pyOpenSSL; Python Workers execute through Pyodide and document support for pure-Python/PyEmscripten packages. Package compatibility and the required versions have not been proven. A JavaScript/TypeScript Worker using SimpleWebAuthn is another candidate, but its current ML-DSA guide lists Node 24.7+ and Deno 2.8.2+ as supported runtimes, not Cloudflare Workers. Cloudflare Workers separately exposes ML-DSA-44/65/87 through an opt-in Web Crypto compatibility flag; that primitive-level support does not prove that the complete WebAuthn library/runtime combination verifies the project's exact profile. The actual deployed Worker must pass real ML-DSA registration and subsequent assertion tests before this path can be approved.

Cloudflare Containers are excluded under the strict $0 rule: the current documentation makes Containers available on the Workers Paid plan, whose minimum charge is $5/month. GitHub Pages is also not a backend option because it publishes static files and does not run Python server-side code.

### Required technical proof before platform selection

1. Deploy a minimal non-production Worker using the exact free plan and record the account's billing state and any payment-method requirements.
2. Serve the AstroCrown frontend and same-origin account API from one deployed origin.
3. Prove separate staging and production-like database bindings with the same migration set and no cross-environment access.
4. Run account registration, discoverable sign-in, recovery-key replacement, session revocation and negative-origin tests from a real browser.
5. Verify actual ML-DSA-44, -65 and -87 credentials through registration, persistent storage, reload and subsequent assertion verification. Classical fallback must be reported as classical.
6. Measure CPU time, Worker request use, database row reads/writes and storage under realistic test flows; confirm the application fails closed at free limits and cannot incur paid usage.
7. Review vendor-managed log, backup, point-in-time recovery and deletion retention before claiming residual-zero cleanup.

### Three-pass zero-residual cleanup requirement

Before public-production promotion, run three separately recorded and independently checked cleanup passes. Each must return **zero** for all project-controlled residual test secrets, test recovery material, test sessions/tokens, test passkey records, synthetic personal-like data, stale environment variables and test-only credentials:

1. **Source and build pass:** scan current source, all tracked files, Git history, branch refs, deployment manifests, CI logs/artifacts/caches, generated bundles, source maps and environment configuration. Rotate/revoke any value that could have been exposed; deleting a file is never a substitute for revocation. Never put production secrets in staging.
2. **Runtime and storage pass:** delete disposable staging accounts/credentials/challenges/sessions, revoke staged keys, clear caches and test objects, remove the staging database/resource when the test cycle ends, and inspect application/provider logs and provider-managed snapshots/backups against published retention rules. Resource deletion is not proof that every provider-managed backup copy is instantly erased.
3. **Independent evidence pass:** repeat secret scanning independently against the release artifact and deployed staging endpoint; verify that no test session or credential remains valid; inspect database/log/cache/backup state and retention expiry; compare exact artifact hashes and deployment configuration; record evidence, timestamp, scope and result. A surface that cannot be inspected or whose deletion/retention cannot yet be proven is UNVERIFIABLE/BLOCKED, never silently counted as zero.

The three passes must each independently show zero across the surfaces we control. They are not three repetitions of the same narrow repository scan. Provider-held logs, backups and point-in-time recovery copies remain subject to documented retention; do not claim immediate erasure where the platform does not provide evidence. The safest invariant is that only synthetic, non-identifying test data and test-only secrets ever enter staging.

### Immutable backup and Git-history boundary

Do not modify, delete, rewrite, rename, relocate or compact immutable historical NOVA/AstroCrown backup snapshots to satisfy cleanup. If a test-only secret ever appears in an immutable backup or old Git object, preserve the backup/history as governed but revoke/rotate that secret and record the residual as retained historical material; never misreport it as erased.

### Production-parity staging acceptance

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

## 6. Production readiness blockers

Before any real-user onboarding, the project still requires:

1. A verified public HTTPS deployment origin and exact production WebAuthn RP ID/origin policy.
2. Durable shared account storage, protected secrets, tested backup/restore and a documented incident/availability process.
3. Complete multi-authenticator enrollment/removal, session viewing/revocation, bounded session lifetimes and production cookie/CSRF/security-header controls.
4. A separately approved optional wallet-backup design, if retained, with chain-specific proof and recovery tests.
5. Approved Terms of Use and Privacy Policy, retention/export/deletion behavior, accessibility and cross-browser/device testing.
6. A threat-model review, independent security testing and an explicit production promotion decision.
7. Evidence that the chosen hosting and operating model can remain within the strict $0/no-card constraint without promising unsupported uptime or capacity.

## 7. Verification record

The implementation and its browser/API regression tests are maintained in PR #141. Current exact-head workflow results must be read from the PR's Checks tab and the linked GitHub Actions runs; a previous green result must not be carried forward to a later commit without checking that exact commit.

This is the current implementation/status summary. Earlier account-flow, email-provider and hosting experiments are not current product requirements or provider selections.