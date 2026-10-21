# Active Architecture Decision — Separate Account Authentication from Wallet Access

**Decision date:** 2026-10-21  
**Status:** OWNER-APPROVED DIRECTION; implementation and technology selection remain BLOCKED pending requirements and evidence  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Working branch:** `docs/provider-independent-wallet-auth-plan-2026-10-20`  
**Related draft:** [PR #141 — authentication architecture and isolated optional-wallet lab](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)  
**Related editor draft:** [PR #140](https://github.com/ACROWN-System/AstroCrown-Web/pull/140)  
**Supporting roadmap:** [Account Continuity and Privacy-Preserving Access Roadmap](../../account-continuity/ACCOUNT-CONTINUITY-AND-PRIVACY-PRESERVING-ACCESS-ROADMAP.md)

## 1. Decision

AstroCrown will **separate ordinary account authentication from crypto-wallet access**.

- A normal AstroCrown account must not require connecting a crypto wallet merely to create an account, sign in, manage ordinary account settings, or use features that do not genuinely need proof of wallet control.
- Wallet authentication is an optional capability. It becomes required only within a clearly identified feature whose function genuinely requires proving control of a wallet, and the user must be told why before being prompted.
- A feature that requires a blockchain transaction is a separate case: explain the precise action and cost before requesting transaction approval. Do not disguise a transaction as login.
- Account identity, authenticators, wallet addresses, role authorization, person/benefit eligibility, and recovery are distinct records and concepts. A wallet address is not an account role, a personhood proof, or a default account identifier.
- Email, phone, centrally collected biometrics, a crypto wallet, and any single platform/provider must not be the sole mandatory route into an ordinary account.
- Public browsing should remain available without sign-in wherever the feature permits it.
- This decision sets the product/architecture direction; it does not approve a production authenticator, library, host, database, or deployment.

This decision **supersedes the wallet-first proposal** in the earlier sections of the 2026-10-20 architecture plan. The plan is revised to match this decision. The local SIWE implementation remains solely an isolated experiment for a wallet-specific capability, not AstroCrown's default sign-in.

## 2. Why this separation is required

A crypto wallet is familiar to some users but may be unfamiliar, intimidating or incorrectly associated with losing funds to others. Making wallet connection mandatory could reduce confidence and exclude users whose ordinary use does not involve crypto. Technical ability to verify a signature does not mean wallet-first login is the best user experience for every audience.

Separating concerns also limits the consequences of a compromised wallet: wallet ownership should not automatically grant an ordinary account, privileged editor role, payout destination, private-memory access or administrative authority. Conversely, loss of a crypto wallet should not automatically lock a person out of their AstroCrown account.

## 3. Ordinary account authentication: familiar entry first, candidate direction not final implementation

### 3.1 First candidate: WebAuthn/passkeys

Avoid making an unfamiliar authentication method the only first interaction. Provide a familiar sign-in/create-account interface and evaluate WebAuthn/passkeys as an optional additional or later sign-in method, rather than making a passkey the only available path. WebAuthn is a public-key credential standard; its use does not require AstroCrown to receive a user's private key. A local authenticator may be unlocked by a device PIN, password or optional biometric depending on the authenticator; AstroCrown must not demand facial recognition, fingerprint recognition or any centralized biometric template as the only access path.

The W3C published WebAuthn Level 3 as a Recommendation on 2026-08-25. This establishes the standards status, not our application's security, compatibility, accessibility, hosting or recovery readiness. Reference: https://www.w3.org/TR/2026/REC-webauthn-3-20260825/.

### 3.2 Do not replace wallet lock-in with passkey-provider lock-in

Passkeys can be synced through a platform/provider or be device-bound. Sync can help users replace a lost device, but it may depend on access to that provider's account and synchronization system. Device-bound keys can reduce that dependency but require users to maintain other authenticators. FIDO Alliance guidance recommends alternative authentication and recovery methods for both models: https://fidoalliance.org/wp-content/uploads/2024/05/Synced-Passkey-Deployment_-Emerging-Practices-for-Consumer-Use-Cases_2024-Final.pdf.

Therefore:
- Evaluate synced passkeys, device-bound passkeys, and roaming hardware security keys rather than assuming one solves all scenarios.
- Test at least two usable authenticators or a clearly explained fallback before encouraging a user to remove a working credential.
- Avoid relying exclusively on a single operating-system ecosystem, phone, browser, email account or external identity API.
- Do not state that all passkeys require biometrics. Verify the actual browser/authenticator UX and give users a non-biometric-compatible route.
- Keep standards-based WebAuthn as a candidate until the supported device matrix, accessibility and fallback flows pass explicit tests.
- If passkeys alone cannot serve the intended audience, evaluate a maintained non-wallet alternative such as password plus a suitable second factor. Do not build a custom cryptographic authentication scheme.

### 3.3 Familiar ordinary-account entry choices

**Proposed first screen, subject to actual provider and no-cost qualification:**

- “Continue with Google” using the official sign-in integration, after AstroCrown's real domain, privacy policy, consent/branding configuration and redirect path are verified.
- “Use username and password” as a recognizable route that does not require a social identity provider or mandatory email. A password is not an account identifier by itself: this route needs a unique username/handle or internal account identifier plus a password. If email is not collected, account recovery must rely on other registered authenticators and/or properly implemented recovery codes/ceremony.
- Offer passkey setup as an optional next step during account security setup, sign-in when it can help, or settings; do not force users to learn a novel sign-in method before they understand AstroCrown.
- Add other social-provider buttons only where the actual provider integration, brand usage, privacy scope, terms, operational maintenance and strict $0/no-card constraints have been checked. A “More options” area can hold providers we later qualify; do not display fake/inactive brand buttons.
- Do not show a wallet as a default ordinary-account sign-in choice. Request it in context when a wallet-dependent feature needs it.

For a single-factor password route, use the current NIST SP 800-63B guidance as an engineering reference: minimum 15 characters, allow long passphrases (at least 64-character maximum supported), support password managers/autofill/paste, block common/known-compromised passwords, avoid arbitrary composition rules and periodic resets absent compromise, and rate-limit attempts. These are to be evaluated against the project's security and usability requirements; NIST guidance is a reference, not a claim of certification. Reference: https://pages.nist.gov/800-63-4/sp800-63b.html.

### 3.4 Account and wallet records stay separate

An ordinary account should have a stable internal account ID independent of its wallet addresses. A wallet may be linked explicitly for a wallet-specific feature or, if later justified, as an additional optional authenticator. In either case:
- Linking requires reauthentication with an already registered ordinary-account authenticator and proof of control of the wallet being linked, or a separately reviewed recovery ceremony.
- Unlinking or replacing the final credential requires step-up checks and a safe recovery plan.
- No wallet gets Owner, Security Administrator, Publisher or Editor privileges merely because it signed in first or holds tokens.
- A user's public wallet address must not silently become a public account ID, cross-site tracking ID, or visible link between otherwise separate pseudonyms.
- Ordinary sign-in must continue when no wallet is installed, available, connected or supported.

## 4. Recovery model to evaluate

Recovery is an alternate way to authenticate and can become a takeover route if weaker than normal sign-in. Apply the existing Development & Audit Convention and the account-continuity roadmap; test both account loss and attacker abuse.

### 4.1 Ordinary-user recovery options

**A. Multiple registered authenticators — preferred first control.** Let the user register more than one passkey/authenticator, such as a second device and/or a roaming hardware security key. Ask them to test the second path before relying on it. Independence matters: two credentials available only through the same locked-out platform account or stored on the same lost device may not be independent recovery routes.

**B. Single-use recovery codes — candidate fallback.** Consider high-entropy codes generated for the user, displayed only once and stored by the service only in a non-reversible form. A code is a bearer secret: a copied code can be stolen, so use single-use semantics, attempt limits, clear offline storage advice, revocation/rotation after recovery, user notification where a channel exists, and extra safeguards for sensitive actions. Test that codes do not appear in logs, analytics, URLs or support tickets. This route is not yet implemented or approved.

**C. Recovery ceremony after loss of all routine authenticators — unresolved.** Design a privacy-preserving, accessible process with explicit steps, a risk-appropriate delay/cooldown, audit trail, session revocation and credential re-enrollment. Evaluate what evidence is available without defaulting to government identity documents, mandatory biometrics, a single email account or an arbitrary wallet. Make social-engineering risks and cases where recovery is impossible explicit. The ceremony must not automatically authorize a payout change, privileged-role grant or sensitive-memory disclosure.

**D. Optional email/contact channel — supplementary only.** Do not require email as the ordinary account's sole login or recovery gate. If a user voluntarily configures email or another notification/contact path, document its purpose and compromise limitations. Possession of that channel alone should not silently bypass stronger factors or grant privileged changes. AstroCrown should not become dependent on a paid email/identity API to provide core access.

The exact mix is a candidate decision to be tested. No method should be described as guaranteed recovery if every authenticator and every separately held recovery capability is permanently lost.

### 4.2 Wallet recovery is feature-scoped

- If a user links a wallet to a crypto-specific feature, multiple independently controlled wallets may help with that feature's continuity, subject to the feature's actual custody/signature rules.
- A second address derived from the same seed, same compromised device, or same recovery phrase is not an independent recovery factor.
- Losing all linked wallets must not automatically lock the user out of the ordinary AstroCrown account.
- A wallet must not silently recover or replace an ordinary account's authenticators unless the user has explicitly enrolled that wallet for that narrowly described purpose and the recovery threat model permits it.
- Recovery of account access, recovery of wallet ownership, recovery of encrypted data keys, and recovery/change of financial payout destinations are separate operations and require separate authorization.

### 4.3 Privileged account recovery

Owner/Security Administrator and publishing privileges need stricter controls than ordinary login. Before implementation, decide and test a deliberate bootstrap procedure, multi-authenticator/second-operator rules where practical, reauthentication for critical changes, delayed recovery when justified, independent notifications, session revocation and auditable role changes. No “first person to sign in” or “first wallet connected” may become administrator automatically. Routine login recovery must never immediately become a privilege-escalation route.

## 5. Administrator wallet policy and Imperial HSIAN recovery

PR #141 currently contains an isolated local EOA/SIWE wallet-signature prototype and an architecture plan that previously framed the application as wallet-first.

**Decision:** retain the code only as a development-only wallet-capability experiment for a feature that may genuinely require wallet ownership. Revise its documentation and UI to make the narrower purpose explicit. Do not use it as the ordinary AstroCrown account-login flow, do not integrate it with PR #140, and do not merge/deploy it merely because tests pass.

The experiment may still be useful to verify a standards-based, off-chain EOA signature flow without application-controlled blockchain RPC, external identity provider, email or wallet relay. Its limits remain: injected EIP-1193 EOA only; test-only local session; no account creation, ordinary-account auth, wallet linking/recovery, persistent accounts, roles, production hosting or publishing. SIWE library and dependency review is not production approval.

Keep PR #141 in draft until:
1. the architecture and local UX accurately represent optional wallet use;
2. new exact-head checks pass and the diff is reviewed;
3. ordinary-account requirements and recovery scenarios are written and tested separately;
4. AUTH-001 (authoritative public source/origin/publishing path) and other production gates are resolved before any public integration.

## 7. PR #140 and editor boundary

PR #140 is a separate development-only announcement-band editor prototype. Its eventual administrative sign-in should authenticate an ordinary AstroCrown account without requiring a crypto wallet. Server-side authorization must independently determine the user's roles. Wallet connection is shown only where an editor/publisher action truly needs a wallet, asset-ownership proof, or an explicitly explained blockchain transaction.

Do not infer that this PR changes or secures PR #140. Keep both drafts isolated until each requirement, trust boundary, permission model and deployment path is verified.

## 8. Mandatory acceptance criteria before selecting or promoting an implementation

| ID | Criterion | Evidence required |
|---|---|---|
| AUTH-001 | Public site/source and origin established | Reproduce the existing public build and identify authoritative repository/branch, build output, domain and deployment/publishing path. Current status: BLOCKED. |
| AUTH-002 | Ordinary login is separate from wallets | Create/sign in to an ordinary test account with no wallet installed or connected; verify no wallet prompt or wallet dependency appears. |
| AUTH-003 | No mandatory email/identity provider | Trace core account creation, sign-in and recovery requests; demonstrate that email, phone and hosted identity-provider APIs are not required. Optional user-selected notifications remain separate. |
| AUTH-004 | WebAuthn/passkey candidate qualified | Browser/device compatibility, RP origin binding, origin/challenge validation, credential registration/removal, phishing resistance and accessible non-biometric authenticator path tested. |
| AUTH-005 | Multiple recovery paths | Register two usable authenticators and verify one can recover access after the other is lost; explicitly test common-mode failure and synced-provider loss. |
| AUTH-006 | Recovery codes, if selected, fail safely | Single-use/expiry/rotation behavior, guessing limits, no secret logging, stolen-code scenario, and role/payout limits tested. |
| AUTH-007 | Wallet remains feature-scoped | Without wallet, ordinary sign-in and non-crypto features work; wallet-only feature explains the specific action and requests no unintended transaction. |
| AUTH-008 | No privilege-by-first-login | New/unconfigured account cannot gain Owner/Security Administrator; initial owner is provisioned through a reviewed procedure. |
| AUTH-009 | Backend role authorization | Direct API attempts cannot bypass each role boundary; revocation/suspension takes effect. |
| AUTH-010 | Session and web security | Session expiry/revocation, CSRF controls as applicable, secure cookie attributes, reauthentication and attempt limits tested on the intended origin. |
| AUTH-011 | Recovery is not privilege escalation | Account recovery cannot silently alter role grants, payout destination, encryption keys or sensitive-data access. |
| AUTH-012 | Privacy and portability | Minimize identifiers, explain credential synchronization, support exports/re-enrollment, and avoid cross-pseudonym wallet linking without explicit consent. |
| AUTH-013 | $0 eligibility | Verify actual cost, no-card requirements, rate/usage limits, retention and failure behavior of chosen host/library. |
| AUTH-014 | Promotion gate | Review the complete diff; run unit, negative, integration, browser/accessibility/security tests on the exact candidate commit; mark missing evidence BLOCKED. |

The listed tests are AstroCrown project requirements, not claims that every row is prescribed verbatim by an external standard.

## 9. Ordered next actions

1. Keep this decision authoritative and the wallet lab optional. The SIWE prototype does not substitute for ordinary account authentication.
2. Verify the real public website and publishing source. Resolve AUTH-001 before setting WebAuthn's relying-party ID/origin or choosing a backend, database, route or migration strategy.
3. Write ordinary-account requirements and a threat/recovery matrix. Cover non-wallet login, non-biometric access, device and synced-provider loss, two authenticators, recovery codes, total credential loss, account takeover, privacy-network access and privileged-account recovery.
4. Evaluate WebAuthn/passkeys and practical fallback candidates. Verify browser/device coverage, dependency maintenance, credential portability, accessibility, $0/no-card constraints and recovery behavior. Do not lock into a vendor or platform ecosystem without evidence.
5. Prototype ordinary account authentication separately on localhost. Use synthetic accounts and no production data/secrets; test recovery before relying on the new login.
6. Qualify durable account/role storage and service-outage recovery. Reuse existing project conventions and avoid unnecessary architecture; document export/restore and keep public approved content independent of auth availability.
7. Only then revisit PR #140 integration. Enforce roles server-side and require wallet access only for explicit wallet-specific operations.
8. Review exact diffs and checks before any promotion. No automatic merge or deployment.

## 10. Impact Analysis

**IF this decision is followed:** ordinary users will not be forced into crypto-wallet UX, and wallet loss/absence will not automatically block unrelated account access. Authenticator registration, wallet association, roles, recovery and publishing can be evaluated as separate trust boundaries. A user may still choose wallet authentication where it genuinely serves their feature.

**IF the prior wallet-first direction were retained:** unfamiliar wallet UX could make users distrust or abandon registration; lack of wallet support could block ordinary use; wallet compromise could spill into unrelated app access; and changing the model later could require account migration and recovery work.

## 11. Research references and status

- Social login/logo trust and onboarding research: [Sign-In Provider Research and Onboarding Plan](2026-10-21-Sign-In-Provider-Research-and-Onboarding-Plan.md).
- W3C WebAuthn Level 3 Recommendation, 2026-08-25: https://www.w3.org/TR/2026/REC-webauthn-3-20260825/
- FIDO Alliance, *Synced Passkey Deployment: Emerging Practices for Consumer Use Cases*: https://fidoalliance.org/wp-content/uploads/2024/05/Synced-Passkey-Deployment_-Emerging-Practices-for-Consumer-Use-Cases_2024-Final.pdf
- FIDO Alliance passkeys overview: https://fidoalliance.org/passkeys-2/
- OWASP Multifactor Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
- Account continuity baseline and proposed recovery architecture: [roadmap](../../account-continuity/ACCOUNT-CONTINUITY-AND-PRIVACY-PRESERVING-ACCESS-ROADMAP.md)
- Optional wallet protocol experiment only: [ERC-4361 / SIWE](https://eips.ethereum.org/EIPS/eip-4361), [EIP-191](https://eips.ethereum.org/EIPS/eip-191), [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193)

**Current implementation status:** direction recorded; no ordinary-account authenticator or recovery flow has been implemented or approved in this decision. Admin wallet policy is documented but not implemented; Imperial HSIAN recovery remains a human/governance process to specify and test. Wallet experiment is not production authentication. AUTH-001 remains BLOCKED.