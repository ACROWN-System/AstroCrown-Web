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

A JavaScript/TypeScript Worker using `@simplewebauthn/server` is now the leading runtime candidate for a qualification spike. The current SimpleWebAuthn v14.x package information says the server package works with Cloudflare Workers, Node.js, Deno and Bun; the current v14.0.x JSR listing identifies v14.0.3. However, the separate SimpleWebAuthn PQC/ML-DSA guide currently lists only Node 24.7.0+ and Deno 2.8.2+ as supported PQC runtimes, not Cloudflare Workers. Cloudflare Workers independently exposes ML-DSA-44/65/87 through the opt-in `webcrypto_modern_algorithms` compatibility flag. Those facts mean that ordinary WebAuthn library compatibility and native ML-DSA primitive availability are promising, but do not establish that SimpleWebAuthn's complete registration and authentication verification path supports ML-DSA on Workers. The Worker proof must check the library's runtime PQC detection, native sign/verify for all three variants, actual registration parsing, persisted COSE algorithm identification and subsequent assertion verification. Until that exact integration passes, Worker-hosted ML-DSA remains UNQUALIFIED; do not claim or silently assume PQC credentials.

Cloudflare Containers are excluded under the strict $0 rule: the current documentation makes Containers available on the Workers Paid plan, whose minimum charge is $5/month. GitHub Pages is also not a backend option because it publishes static files and does not run Python server-side code.

### Live login staging implementation sequence

The target is a real browser-accessible staging website that serves the AstroCrown homepage and the live passkey-first account UI against a deployed account API and isolated durable database. A static HTML preview, a localhost tunnel, or a UI that stores account state only in memory does not satisfy this target.

1. **Runtime qualification spike:** Build a small, isolated Worker/D1 proof using an exact pinned SimpleWebAuthn version. Confirm the deployed/runtime request model, exact Host/Origin/RP ID validation, D1 persistence and migrations, session-cookie behavior, free-tier CPU/quota behavior, and ML-DSA support status. This stage is not yet the user-facing account website.
2. **Account-service port:** Port the approved account lifecycle to the qualified runtime/storage adapter: discoverable passkey registration and sign-in, one-time offline recovery-key creation and rotation, previous credential/session revocation, account status, persistent challenges/rate limits, and security audit records. Preserve the Python implementation as the reference until equivalent behavior and regression coverage are demonstrated. Do not implement only the happy-path login while omitting recovery or session security.
3. **Website integration:** Serve the intended homepage, account modal, User dashboard and applicable account assets from the same deployed origin as the API. Use environment-specific origin/RP settings, a separate staging D1 database, independent staging secrets, synthetic fixture data and a staging-only access gate. Never share production identifiers, credentials, sessions or data.
4. **Real browser qualification:** Test registration, discoverable sign-in, sign-out, recovery, recovery-key rotation, replay rejection, expired challenges, session revocation, wrong origin/RP, multiple browsers/devices and failure behavior against the deployed staging origin. Verify the actual stored credential algorithm rather than treating advertised options as credential evidence.
5. **Promotion and cleanup:** Freeze an immutable release candidate, run the three cleanup passes and the provider-specific retention quarantine, then promote the same artifact only after all blockers are cleared and explicit release authorization is given.

A public test URL is not to be announced until the runtime has actually been deployed, its account API and database are reachable, and the real-browser acceptance tests have passed. Deploying to a connected provider account requires separate authorization and must not activate any paid plan, billing method or paid resource.

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

## 8. Public interactive staging and mandatory first-visit safety notice

**Owner clarification — 2026-11-08:** The intended shared environment is the actual browser-accessible AstroCrown staging application, not the GitHub HTML preview proxy and not a local server exposed through a temporary tunnel. A person who discovers the staging website should be able to understand its test-only status before interacting with it. The first screen must therefore be the main safety notice, not a browser-level shared-password prompt or an ordinary sign-in form.

### 8.1 Mandatory first-screen notice

The production-parity staging build must transform the current visual-preview notice into a staging-specific notice. Do not add a second competing popup. Reuse the existing accessible `#development-notice` modal and its explicit acknowledgement control, but change its copy for the environment.

The notice must state, in clear language and before any account or wallet interaction, that:

- This is a public **staging/test environment**, not the production AstroCrown service. Features may be incomplete, experimental, inaccurate, simulated, interrupted or changed without notice.
- Test accounts are temporary test identities, not permanent customer accounts. Accounts, passkeys registered for the staging origin, test recovery keys, sessions, profiles, posts and other test records may be reset or deleted at any time. Do not rely on their continued existence or use them as the only copy of important information.
- No personal, identifying, sensitive, confidential or otherwise private information should be submitted. Users must assume that anything entered, posted, uploaded or transmitted may be accessible to other testers or service operators, may be publicly visible depending on the feature, and may be present in operational/security logs or provider-retained backups. Do not assume private messages, profile fields, account metadata or uploaded material are confidential in this staging environment.
- Only explicitly supported blockchain **test networks** and valueless test tokens may be used. Never use mainnet, real assets, real funds, real payments, valuable approvals or a wallet holding assets of value. Use a separate disposable test wallet and obtain test tokens only from appropriate testnet faucets. Never provide a seed phrase, private key, production recovery material or production wallet authorization.
- Account registration must use a passkey created specifically for the staging origin and a staging-only recovery key. Never reuse a production credential, passkey, recovery key or wallet.
- The environment is offered for testing and evaluation, without production-service, availability, data-retention or account-persistence guarantees.

The wording must not falsely say that all transactions are prohibited: qualified testnet interactions are permitted only after the relevant network and transaction controls have actually passed qualification. If testnet functionality is not yet deployed/qualified, the notice and UI must state that it is unavailable rather than imply that it works.

### 8.2 Enforced acknowledgement and interaction order

- Show the notice automatically on every fresh homepage load/session, before any other interactive control can be used. Do not permanently remember acceptance across unrelated future visits; the notice must be shown again on a new visit and whenever its version materially changes.
- Require an explicit unchecked-by-default acknowledgement checkbox and a separate Continue action. Continue remains disabled until the checkbox is checked.
- Prevent dismissal through Escape, backdrop click, browser navigation into an interactive sub-route, or other UI bypass. Provide a clear way to leave the site.
- Keep account sign-up, sign-in, recovery, wallet connection, testnet transaction initiation, posting, messaging, uploads and other state-changing interactions unavailable until the notice has been acknowledged.
- Enforce the acknowledgement/version at the relevant server-side state-changing endpoints as well as in the frontend. A client-side modal alone is not an authorization or security boundary; direct API requests must not bypass the required safety acknowledgement.
- Keep a persistent, unmistakable staging label visible after acknowledgement and retain a footer link that reopens the notice.
- Verify mobile/desktop layouts, keyboard navigation, focus management, screen-reader labels, and every supported entry route. Add browser tests that prove users cannot interact before acknowledgement and that the notice reappears on a fresh visit.

### 8.3 Public discovery and access-control model

**Owner clarification — 2026-11-08:** The desired test website is genuinely public-facing. Visitors in different countries must be able to open the AstroCrown homepage directly, see the mandatory first-screen notice, acknowledge it, and then use the account features that are actually enabled. They must not need a shared browser Basic Authentication password. This is a live public staging/test service, not production or a promise that every planned feature is complete.

The Worker and deployment candidate now support an explicit `STAGING_ACCESS_MODE=public` setting:
- In public mode, the homepage and allowlisted static assets are reachable without a shared password.
- Public mode fails closed with HTTP 503 if the protected `RATE_LIMIT_HMAC_KEY` is missing or too short.
- All staging API routes other than the acknowledgement endpoint require a valid signed acknowledgement cookie. The acknowledgement endpoint requires exact same-origin validation and is rate-limited by client IP.
- The acknowledgement cookie is version-bound, short-lived (12 hours), signed with HMAC using a protected staging secret, and set `HttpOnly; Secure; SameSite=Strict`.
- Existing passkey registration, sign-in, recovery and administrator-authentication paths retain their route-specific IP/account rate limits. Exact Host/Origin/RP checks, same-origin request rules, session protections and server-owned authorization remain active.
- A staging configuration that does not explicitly select public mode continues to use the previous restricted access gate. No implicit public exposure occurs from a missing setting.

The public model is limited to the currently enabled application surface. It is not a blanket claim that all future social, payment or blockchain APIs are implemented or safe for public use. No public post, file-upload, direct-message, testnet-transfer or payment feature may be advertised as operational until its own permissions, privacy, abuse controls, data lifecycle and end-to-end tests have passed.

The existing per-endpoint rate limits and Cloudflare Free quotas are initial controls, not proof of unlimited abuse resistance. Public-staging load, registration abuse, D1 write/read limits, storage growth and edge request usage must be monitored. Missing secrets, wrong origins and exhausted platform quotas must fail closed; there must be no automatic paid fallback. Additional provider-edge bot/WAF controls may be evaluated if real usage shows they are necessary, subject to the $0/no-card rule.

A public website is not the same as public disclosure of every data field. The visitor notice establishes a default-to-public rule for submitted content: anything entered into an area not explicitly identified and qualified as private must be treated as openly accessible to anyone on the internet, including visitors without accounts. Public content can be copied, indexed, archived or redistributed. Account credentials, passkeys, recovery keys and other authentication secrets must never be published. Technical logs and provider backups are separate processing/retention surfaces and must not be misdescribed as public-feed content.

This design does not authorize remote deployment by itself. The workflow remains manual and restricted to the reviewed default branch, with a separate confirmation that the actual provider account uses free/no-card resources and a second explicit staging-deployment authorization.
### 8.4 Staging build and verification requirements

- The staging asset builder must replace the visual-preview-specific title, description, transaction warning, acknowledgement text and button label with the staging-specific notice above. It must fail the build if the source notice changes and the transformation can no longer be verified; never silently publish the old misleading notice.
- The visual-only HTML preview may retain its separate preview notice. The staging artifact must clearly identify itself as staging and must not be confused with the `htmlpreview.github.io` page.
- Test the generated staging artifact itself, not only the source HTML. Automated tests must assert the required copy is present, obsolete "visual review only" copy is absent, and the modal is invoked before user interactions become available.
- Test direct API access without acknowledgement, mainnet-chain attempts, missing/invalid staging configuration, rate-limit exhaustion, database quota exhaustion and reset/deletion behavior. These must fail safely without paid fallback, production access or real-asset handling.
- Do not announce a public staging URL until the actual remote deployment, public-entry behavior, account API/database, testnet controls and real-browser acceptance checks have passed.

### 8.5 Current evidence-based status

**Implementation status after the 2026-11-08 public-staging work:**

Implemented in the current account-staging branch:
- The staging artifact transforms the visual-only preview into a clearly labelled **live public test environment**, not a production commercial service.
- The first-visit notice warns that accounts, passkeys, recovery keys, sessions and test records may be reset/deleted.
- The notice establishes a default-to-public rule: unless a field or channel is explicitly identified as private and its privacy behavior is qualified, submissions are openly accessible to anyone on the internet, including visitors without accounts. It names public posts, comments, profiles, community contributions, public chats, uploads and other public submissions; it warns that content may be copied, indexed, saved and redistributed. It separately identifies operator/provider logs and backups as additional retention surfaces, not the same thing as public-feed visibility.
- The notice distinguishes an enabled testnet feature from a wallet button or planned capability. It prohibits mainnet, real funds, production wallets, production credentials and secret disclosure. It does not falsely claim that testnet transaction execution is already implemented.
- The existing notice opens on every fresh homepage load, prevents Escape cancellation, requires an unchecked acknowledgement checkbox, keeps Continue disabled until checked, and has a footer re-open link.
- The staging popup posts the exact notice version to `POST /api/staging/acknowledge`. The Worker verifies the same-origin request, rate-limits acknowledgements, signs a 12-hour `HttpOnly; Secure; SameSite=Strict` cookie, and requires that cookie for other staging API requests. The static homepage remains reachable before acknowledgement.
- `STAGING_ACCESS_MODE=public` is explicitly present in the staging Wrangler environment. The Worker bypasses the shared Basic Auth gate only in this explicit mode and fails closed if `RATE_LIMIT_HMAC_KEY` is missing. The deployment candidate no longer requires `ASTROCROWN_STAGING_ACCESS_CODE`.
- Passkey registration, sign-in and recovery retain their existing route-specific per-IP/account limits; Host/Origin/RP checks and session protections remain in place.
- The staging builder's exact-once substitutions fail closed if source copy changes or is ambiguous.
- Automated checks were added/updated: `tests/staging-notice.test.mjs`, `tests/public-staging-access.test.mjs`, and deployment/configuration guards. Exact-commit GitHub Actions outcomes must be read below after the latest implementation commit; prior notice-only CI results do not qualify these later code changes.

Still not remotely qualified:
- The live public staging website has **not** been deployed. PR #141 remains draft/unmerged; the deployment workflow exists only on that branch until it is reviewed and merged to `main`.
- The actual Cloudflare account's Workers Free/D1 Free eligibility and no-card/no-billing condition remain unverified. Required protected GitHub environment values and Cloudflare credentials have not been confirmed here. The manual workflow requires both the free/no-card confirmation and a separate explicit staging deployment authorization.
- Even after initial deployment, a real remote browser must verify the first-screen notice, server acknowledgement cookie, registration, discoverable sign-in, recovery, session revocation, wrong-origin rejection, and real authenticator behavior on the deployed RP ID. Local Wrangler/Chrome virtual-authenticator tests are not remote qualification.
- The current staging Worker is an account/authentication slice integrated with the homepage. It does not yet implement the full social/community platform, public posts, chat, Council elections, customer payment system or blockchain transfer workflows. The first-administrator bootstrap and full User/Administrator dashboard parity remain incomplete.
- Testnet transaction execution is **not qualified or enabled by this Worker**. No supported chain allowlist, server-side mainnet rejection, transaction construction/signing flow, explorer reconciliation or faucet workflow is established here. The notice must never be interpreted as permission to transact until a specific network and feature are explicitly marked enabled.
- Public mode has route-specific rate limits and provider quotas, but this does not establish resistance to every distributed abuse or denial-of-service scenario. Monitor usage and maintain a safe mechanism to return the staging mode to restricted if the service is abused or quotas threaten essential tests. No paid fallback is permitted.

Accordingly, the live-public notice copy, explicit public staging mode and server-verified acknowledgement are **IMPLEMENTED IN THE DEVELOPMENT BRANCH**; their latest hosted CI and local runtime checks must pass before merge. The remote public staging deployment, cross-device browser qualification, testnet transaction capability and complete platform features remain **NOT DEPLOYED / NOT QUALIFIED**.
