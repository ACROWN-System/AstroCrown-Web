# User and Administrator Accounts — Requirements and Threat Model

**Document ID:** ACW-ACCOUNT-REQ-001  
**Date:** 2026-10-26  
**Status:** ACTIVE DESIGN / DEVELOPMENT-ONLY — NOT A PRODUCTION AUTHORIZATION  
**Parent work:** [PR #141 — account entry and optional-wallet lab](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)  
**Architecture source:** [Authentication Separation and Recovery Decision](../audit/Active/2026-10-21-Authentication-Separation-and-Recovery-Decision.md)  
**Long-term context:** [Account Continuity and Privacy-Preserving Access Roadmap](ACCOUNT-CONTINUITY-AND-PRIVACY-PRESERVING-ACCESS-ROADMAP.md)  
**Administrative wallet architecture:** [NOVA Administrative Smart-Account and Transaction-Enforcement Specification](NOVA-ADMINISTRATIVE-SMART-ACCOUNT-SECURITY-SPEC.md)

## 1. Purpose

Define one understandable account foundation for ordinary users and administrators without mixing account identity, authentication, authorization, wallet control, eligibility, recovery or financial authority. The development prototype is for interaction and requirements testing only. It must not be exposed as production authentication.

**Target principle (updated 2026-11-03):** every account uses WebAuthn public-key authentication as its primary sign-in method; a crypto wallet is optional and may be registered as an additional backup authenticator. AstroCrown stores public credential material only, not users' private authentication keys. Account recovery uses a user-held, offline, single-use recovery key. No email, password, SMS, paid identity provider or operator reset backdoor is required. Administrative authority remains separately granted and server-enforced.

## 2. Decisions already established

1. **Superseded direction:** email/password-first sign-in and email-based verification/reset are no longer the target. Adopt the passkey-first public-key model in [Passkey-First Account Authentication and Recovery Requirements](PASSKEY-FIRST-ACCOUNT-AUTHENTICATION-AND-RECOVERY-REQUIREMENTS.md). The existing local email/password code is legacy prototype behavior only and must not be exposed as production account access. No email/SMS/third-party identity provider is required for account creation, sign-in or recovery.
2. Account creation requires WebAuthn passkey registration and explicit acknowledgement of the Terms/Privacy versions shown to the user. Email address and phone number are not required or used as account identifiers or recovery factors. Referral ID remains optional and inert. Any future email-based communications/newsletter feature must be separately optional, consented and isolated from authentication/recovery.
3. The sign-in screen must include a separate **Security assurance** link below the form actions and above the small explanatory text. It must not be conflated with Terms or Privacy.
4. After sign-up or sign-in, show a success state with a close button and a clear **Open your account** action. Closing the success state must not sign the user out. The header control then becomes a compact circular account/avatar control without its “Account” text label. The development prototype offers six built-in avatar glyph choices, validates the selected identifier on the server and stores it in the local test database or memory-only browser demo. Image uploads and production profile synchronization remain out of scope.
5. There are exactly two authenticated workspaces, with distinct purposes: (a) the **User dashboard** (`#account` in the current prototype), the ordinary AstroCrown member workspace for every signed-in account, including administrators; and (b) the separate **Administrator dashboard** (`#admin`), an additional workspace for administrative duties. The User dashboard must provide the same user-facing features, personal activity and transaction capabilities to an administrator as to any other user, under the same eligibility, pricing, transaction-confirmation, risk and account rules. Administrator status must not remove, reduce or silently elevate ordinary member functionality. Personal user transactions belong to the User dashboard and operate on the signed-in account's own user context; the Administrator dashboard must not silently impersonate a user or turn an administrative action into a personal transaction. Administrative permissions are separately enforced by the backend. After sign-in/status refresh, an **Administrator access** section and the single **Open administrator dashboard** entry button appear in the User dashboard **if and only if** the server confirms that the signed-in account already has the administrator role. A regular `user` account must not see the button or a disabled placeholder. The same entry button is used regardless of wallet-step-up state; status text explains whether verification is needed. It opens an explicit confirmation dialog; cancelling must not request wallet access. Continuing must recheck the server-owned role and ordinary session before either reusing a valid step-up or requesting a registered wallet and displaying the one-time signature review. The Administrator dashboard provides **Return to user dashboard** navigation; that navigation does not itself end the short-lived admin step-up. A stale UI entry is never authority: revocation must be enforced by the backend and the entry disappears at the next authoritative status refresh.
6. Wallet access is optional for normal accounts and requested only when a specific feature needs proof of wallet control. A wallet address never grants an account role by itself.
7. Administrator appointment is not self-service. There is no public “Sign up as admin”, first-user privilege, client-side role toggle or promotion because an address connected first. A person first creates an ordinary `user` account. A separate, already-authorized administrator may grant the administrator role to that existing account only when that grantor has the explicit server-enforced `admin.roles.grant` permission. An administrator without that permission cannot appoint another administrator. A grantor cannot grant the role to themselves or expand their own authority through the operation. The grant and revocation permissions are distinct (`admin.roles.grant` and `admin.roles.revoke`) and must be delegated narrowly. The initial owner/administrator is established only through a deliberate owner/Imperial HSIAN bootstrap because no existing administrator is available to do it.
8. **External administrator identity and compensation wallet:** up to three external administrator wallet addresses may be registered as alternative authenticators under the existing provisional model; the final minimum/recovery arrangement remains subject to governance approval. A fresh proof from one enrolled wallet can satisfy the wallet step-up for an already-authorized administrator. This is **one-of-N authentication**, not a 2-of-3 multisignature transaction. The external wallet is also an optional registered destination for that administrator's salary, service payments and bonuses through a separate payout workflow. It is user-controlled, is not an AstroCrown organizational-funds wallet, does not hold or control NOVA operational assets, and never grants a role or permission by itself. NOVA/AstroCrown must never obtain its private key or seed phrase. Authentication-wallet registration and compensation-destination registration are distinct data purposes, even when the same address is used for both.
9. **NOVA administrative operations smart account:** each administrator receives a separately identifiable programmable smart account as a native NOVA component. NOVA's on-chain transaction-validation and enforcement mechanism is part of NOVA itself and must reject prohibited, unknown or unverifiable operations before execution. The account holds only the minimum operational assets required for assigned duties; it is not the administrator's external wallet, payout address or AstroCrown treasury. It must be subject to NOVA's off-chain policy checks and mandatory on-chain enforcement, with no administrator bypass. The treasury and predetermined protected recovery vault remain separate.
10. Loss of all external administrator authenticators requires a formal recovery request to the Imperial HSIAN authority (the owner and/or a specifically authorized NOVA-governed process). Recovery of the NOVA operations smart account is a distinct, pre-authorized smart-account recovery path. NOVA may collect evidence and execute only actions permitted by those previously established controls; it must not independently promote itself or an unverified claimant.
11. The browser preview is memory-only and disposable; the local SQLite server is loopback-only. Neither is production authentication. New accounts default to the server-owned `user` role and registration ignores role/admin flags. The current local prototype uses an owner-operated CLI as a test/bootstrap adapter; its `--actor` value is only an audit label, not authenticated proof of an administrator's identity or permission. That CLI is not the intended production appointment workflow. In the intended product flow, a current administrator with the explicit `admin.roles.grant` permission grants the role to an existing user account. The role grant is separate from wallet enrolment: the newly appointed administrator must prove control of their own wallet when enrolling it, then use a fresh wallet-family-specific, chain-bound message signature from one of up to three enrolled wallets (the current local prototype implements EIP-4361/SIWE for EVM accounts only) to obtain a maximum ten-minute step-up on the already-authenticated account session. The backend rechecks the account role, required permission and wallet registration, binds the challenge to the account/session, rejects replay and cross-session use, and withholds privileged access until step-up succeeds. The User dashboard shows the Administrator access entry only after the server confirms the role grant; the entry starts wallet enrolment/verification as needed and then opens the separate Administrator dashboard. The browser preview remains memory-only. There is no production role-management endpoint, no production admin governance or all-wallet-loss recovery. Root/production website files remain unchanged.

## 3. Account concepts and permission boundary

Keep the following separate in both data model and code:

- **Account:** stable, randomly generated internal ID and account lifecycle; never derived from a wallet address, passkey credential ID, email address or phone number.
- **Authenticator:** a registered WebAuthn passkey is the primary account authenticator; an independently controlled wallet signature may be registered as an optional backup. A user-held one-time offline recovery key is the last-resort recovery method.
- **Wallet link:** optional record of an address and proof-of-control for a defined feature; not an account ID and not an authorization by itself.
- **Role and permissions:** assigned by an authorized provisioning process and checked on the server for every privileged operation.
- **Session:** server-created and revocable; never trusted from a client-supplied role or local storage value.
- **Recovery request:** separate, auditable authority path with tighter checks than ordinary login.
- **Marketing consent:** separate from account access and required policy acknowledgement.

Minimum role model for the first real implementation:

- **User:** ordinary account and self-service account settings.
- **Administrator:** an existing user account with a server-side administrator role and only the explicitly granted administrative permissions. A fresh signature from an enrolled wallet is a separate step-up before entering privileged functions.
- **Owner / recovery authority:** narrowly provisioned authority for initial bootstrap and exceptional admin recovery. Do not make the routine application role capable of silently promoting accounts.

**Permission delegation rule:** `admin.roles.grant` and `admin.roles.revoke` are explicit, separately assigned permissions, not automatic consequences of being an administrator. The server verifies the exact permission, a valid wallet-verified administrator session and the target account; self-grant is rejected. A grantor may assign only permissions explicitly marked as delegable to that grantor. A newly granted permission is non-delegable by default, so appointment cannot silently propagate authority. Every operation records actor, target account, exact role/permission changes, reason and timestamp. The target must already have an ordinary account. The current loopback prototype now implements this local permissioned workflow; production identity, owner authority, deployment and recovery remain separate blockers.

Avoid introducing Editor, Publisher, Security Administrator or other subroles until an actual feature requires those distinctions. When an admin function does require differentiated access, use explicit least-privilege permissions rather than a single all-powerful client flag.

### External administrator authentication-wallet enrollment — provisional implementation default

The current prototype supports a maximum of three externally controlled administrator authentication wallets, and any one enrolled wallet may provide step-up for an already-authorized account. A prior decision record proposed requiring at least two independently controlled wallets before activation, but the minimum was not finally settled. Keep that minimum explicitly unresolved until the owner confirms it in a governance decision; do not silently convert the proposal into policy. Wallets sharing the same seed, device or recovery channel may fail together. These external wallets are authenticators and possible compensation destinations only. They are not NOVA operational accounts. See the dedicated NOVA smart-account specification for the separate on-chain operations and recovery model.

Each wallet enrollment must require:
1. existing authentication and a server-confirmed admin role;
2. explicit user-initiated challenge/signature using the approved adapter and message-proof protocol for that wallet family (EIP-4361/SIWE for EVM; an approved BIP-322 proof for Bitcoin; SIWS/off-chain message proof for Solana, if those adapters are later qualified);
3. server-side validation of domain/origin, nonce, expiration, address, chain/message constraints and signature;
4. a record of enrollment/revocation that does not contain a private key or recovery phrase;
5. a notice and an audit event; and
6. a rule that no wallet signature can create or expand a role.

For admin access, require ordinary account authentication **and** a fresh valid signature from one of the account's enrolled external authentication wallets. This signature proves control of the authenticator; it does not authorize arbitrary blockchain transactions or bypass NOVA's operations-account policy. Critical actions (role changes, new-wallet enrollment/replacement, changing recovery/ownership authority, publishing sensitive content or security settings) require reauthentication/step-up as defined in the final threat model. Revoke previous admin sessions after recovery or role changes. Administrative blockchain operations must be requested through the separate NOVA operations smart account and pass its mandatory pre-execution validation.

## 4. Ordinary-user journeys

### 4.1 Registration

- Required WebAuthn discoverable public-key credential registration with user verification. No email address, password or SMS number is required. The authenticator retains the private key; AstroCrown stores the public key and minimum credential metadata only.
- Explicit acknowledgement of the Terms and Privacy versions shown to the user.
- Referral ID optional and inert until its verification/anti-abuse policy is implemented.
- Newsletter opt-in separate, unchecked by default, version/timestamp recorded, with unsubscribe/suppression handling before any production email is sent.
- The account must be reported as authenticator-enrolled only after the server has successfully verified the WebAuthn registration ceremony and bound the credential to the newly created account.
- Never describe email/SMS as an account login or recovery mechanism. A future communications feature must not be represented as active unless its separate service is configured and qualified.

### 4.2 Sign-in and session

- Neutral authentication error messages; rate limit credential attempts and account creation.
- Verify WebAuthn assertions using a maintained, reviewed server-side relying-party library; do not implement CBOR/COSE, authenticator-data parsing or signature verification from scratch. Generate random, short-lived, single-use challenges bound to ceremony, account/session, RP ID and exact origin. See the passkey-first authentication plan.
- Create a fresh, cryptographically random server-side session on successful authentication; do not reuse a pre-authentication session.
- Use HTTPS, Secure/HttpOnly/SameSite cookies in production, CSRF protections appropriate to the architecture, server-side session validation, documented inactivity and absolute lifetimes, revocation and safe logout.
- Avoid logging passwords, cookies, tokens, reset links, wallet signatures used as bearer secrets or recovery material.
- Let users view and revoke sessions where the capability is implemented. A UI-only “session list” is not sufficient.
- Require a fresh WebAuthn proof before adding/revoking authenticators, replacing the recovery key, changing sensitive account settings or performing other high-impact changes. Wallet proofs must be purpose-bound and cannot substitute for WebAuthn unless a future decision explicitly allows it.

### 4.3 User dashboard — common member workspace

The **User dashboard** is the primary authenticated workspace for all ordinary users. An administrator account receives this same dashboard and the same member-facing functionality; administrator status adds a separately gated route to the Administrator dashboard but does not replace or restrict the User dashboard.

Its modular sections should include, as the corresponding products are implemented:

- **Overview:** member account state, relevant activity and clear notices about capabilities that are not available.
- **AstroCrown services:** the features and services offered to members. These must be the same for a regular user and an administrator acting in the capacity of an ordinary user.
- **Transactions & personal activity:** the user's own transaction workflows, confirmations, history and relevant records when the underlying services exist. Apply the same eligibility checks, fees, limits, confirmations and fraud/risk controls regardless of whether the account also has an administrator role. No transaction or asset function may be represented as operational before its backend and controls are implemented.
- **Profile:** minimal public/private account preferences and currently supported avatar choices.
- **Security & sessions:** current authentication state and only those recovery/reset/session-management operations that are backed by tested server behavior.
- **Connected wallets:** empty by default. Ask for wallet access only when a specific user-facing feature requires proof of wallet control; a connected wallet never confers administrator rights.
- **Preferences:** separate newsletter consent and other nonessential preferences.
- **Referral:** show an unverified value without reward/eligibility claims until real referral rules exist.
- **Privacy & data:** export, closure or deletion controls only when their complete behavior is implemented and tested.

A regular account and an administrator account must not receive different versions of the User dashboard merely because of role. Do not insert administrative controls into ordinary feature modules. The only administrator-specific control in the User dashboard is the clearly separated, role-gated entry to the Administrator dashboard. Do not show empty feature catalogs or clickable controls that do not work; keep planned transactions and services explicitly unavailable until implemented.

## 5. Administrator journeys

### 5.1 Provisioning

- No public administrator registration. Every person first creates and uses a regular User account.
- After that account exists, an already-authorized administrator who holds the explicit `admin.roles.grant` permission may appoint it. A normal administrator without that permission cannot do so. The grantor cannot appoint themselves, and the operation cannot expand the grantor's own permissions.
- The grant is a server-side role/permission change with a mandatory active admin step-up, an explicit reason, the exact target and permissions, and a durable audit event. Role revocation uses the separate `admin.roles.revoke` permission and also invalidates privileged sessions.
- Bootstrap the first owner/administrator deliberately through the owner/Imperial HSIAN authority because no administrator yet exists to perform the first grant. No “first login wins” or “first wallet wins”.
- Granting the role and enrolling a wallet are separate operations. The newly appointed administrator proves control of their own wallet during enrolment; another administrator must not treat a supplied address or wallet connection as proof of the target's control.
- Production roles and permissions must come from trusted backend data, never frontend JavaScript, query parameters, local storage, form inputs or email address patterns.
- Tests must prove that an ordinary user cannot self-promote, an administrator without `admin.roles.grant` cannot appoint anyone, a grantor cannot grant themselves or escalate their own permissions, and unauthorized requests cannot access administrator endpoints.
- **Current prototype boundary:** the owner-operated `provision_admin.py` command remains a local first-administrator bootstrap/test adapter; its operator label is not authentication. Routine local appointments and revocations now use separate server endpoints requiring `admin.roles.grant` or `admin.roles.revoke`, a wallet-verified administrator session, an existing target account, a reason and an audit record. A new administrator must enrol their own first wallet with a one-time signature and then provide a separate fresh signature for session step-up. These are local loopback prototype capabilities, not production governance or identity infrastructure.

### 5.2 Admin access and dashboard

- Normal WebAuthn passkey sign-in authenticates the underlying User account first. The user does not create a second administrator account or replace the User dashboard.
- Only after the server confirms that an authorized administrator has granted the existing account its administrator role does the **Administrator access** entry appear in that account's User dashboard. Ordinary users never see the entry or a disabled placeholder.
- The entry is primarily the administrator-wallet verification gate: the user is already signed in to the ordinary account, then proves control of an enrolled wallet. If no wallet is enrolled yet, the entry guides the newly appointed administrator through a separate self-enrolment/proof step. Wallet connection alone is insufficient; a fresh signature from one of up to three enrolled wallets is required for the short-lived administrator step-up.
- The entry must communicate the wallet-verification step (for example, **Verify wallet & open administrator dashboard**); once a valid step-up already exists, the action may simply read **Open administrator dashboard**. Cancelling the confirmation must not request a wallet. The server rechecks the account session and role before starting/reusing step-up.
- The wallet signature does not create the user account, grant the administrator role or authorize a blockchain transaction. It only proves control of an enrolled wallet and authorizes the short-lived administrator session.
- The Administrator dashboard is a separate `#admin` workspace dedicated to administrative duties. It is not the regular user workspace with extra buttons and is not a replacement for the User dashboard. The User dashboard (`#account`) remains available to administrators for their own member activity and transactions under ordinary user rules. The Administrator dashboard provides **Return to user dashboard** navigation. All administrative read and write endpoints enforce authorization server-side.
- Administrative functionality may include reviewed and explicitly authorized areas such as account/case administration, moderation, configuration, content/banner management and operational oversight, but each function must be implemented and permission-checked before it is exposed. The current prototype is not a general business-administration tool.
- Personal transactions stay in the User dashboard and remain bound to the signed-in account's own user context. Administrator status must not bypass ordinary transaction authorization, fees, limits, confirmations or eligibility, or authorize impersonating another member. Any future on-behalf-of-user administrative intervention requires a separate, narrowly scoped, explicit and audited workflow; it is not implied by the admin role.
- Admin actions that alter roles, wallet enrollment, publication, security settings or recovery authority must be individually authorized, logged and reauthenticated as appropriate.
- Treat admin browsers, preview pages, HTML query values and wallet connection events as untrusted; a connected wallet must not be confused with a verified signature or role.

### 5.3 Loss of all enrolled admin wallets

No email-only override, routine password reset, first-new-wallet login or unreviewed account recreation may restore admin access. Require a documented Imperial HSIAN recovery procedure with identity/authority evidence appropriate to the threat, independent review where practical, user notification and/or delay when justified, revocation of prior sessions and wallet records, controlled re-enrollment, and an audit record. Restoration of account access, admin privilege, publishing rights, financial/payout permissions and access to sensitive data are separate decisions. The exact evidence and review process remains a production blocker until tested and approved.

## 6. Security assurance page

The sign-in form's Security assurance link must open a separate page containing the current evidence and limitations for this exact prototype. It must clearly distinguish:
- controls implemented and tested in the local prototype;
- controls tested only in automated tests;
- controls not implemented;
- external review/certification status (currently none for this prototype); and
- production blockers.

It must not claim “secure”, “fully protected”, certified, production-ready, or complete. The page must distinguish: (a) retired email/password prototype code, retained only for explicitly opted-in historical regression tests, from the current default passkey-first implementation; (b) the implemented local WebAuthn/passkey and offline recovery-key flows from production authentication infrastructure and still-missing multi-authenticator/session-management capabilities; (c) the local EVM/SIWE administrator-wallet enrollment and step-up from any future Bitcoin, Solana or other wallet-family adapter; (d) local SQLite accounts/sessions and owner-operated bootstrap from production identity/governance infrastructure; and (e) automated tests from independent security review. The passkey/recovery API and Chrome virtual-authenticator paths are implemented and passed the five tracked workflows on exact branch commit `8509b64086a09ac3cfc7eea82977c27e8e6a2fd8`; this is prototype evidence only. Production HTTPS hosting, durable shared storage, multi-authenticator/session-management UI, formal all-authenticator-loss behavior, approved legal policies and independent security review remain outstanding. Keep the page separate from Terms of Use and Privacy Policy.

## 7. Threat model

| Threat / failure | Required protection / verification |
|---|---|
| User self-assigns admin role | Backend-owned roles; no public role mutation; direct API negative tests |
| Administrator without appointment permission grants an admin role | Exact `admin.roles.grant` permission enforced by the backend; active wallet step-up; negative API test |
| Grantor self-promotes or expands own authority | Self-grant forbidden; only explicitly delegable permissions may be assigned; audited negative tests |
| Admin role is granted but UI hides or prematurely exposes admin entry | Entry appears only after server-confirmed role assignment; user wallet proof remains a separate gate |
| Administrator role changes ordinary-user capabilities or transaction rules | User dashboard is role-neutral; admin receives the same member capabilities and ordinary transaction controls; negative tests verify admin-only scope does not leak into member transactions |
| Administrator acts as another member | No implicit impersonation; any future support/intervention path requires a separately authorized, scoped, visible and audited workflow |
| Passkey/device compromise or malicious origin script | WebAuthn RP/origin binding, user verification, secure origin, CSP/XSS controls, authenticator revocation, session protection and independent testing |
| Account/credential enumeration | Discoverable credentials, neutral failure behavior, rate limiting and server-side authorization without revealing account existence |
| Session fixation or theft | New random session after auth, server-side validation/revocation, HTTPS Secure cookie, lifetimes, no-store and logout invalidation |
| CSRF / cross-origin request | Exact origin/CSRF controls suited to deployment; tests for missing/invalid origin and cookie behavior |
| Recovery key theft or guessing | CSPRNG 128-bit project target, offline custody guidance, hashed verifier, strict throttling, single-use consumption, replacement and no email/SMS override |
| Wallet spoofing or replay | Signed short-lived nonce challenge, origin/domain binding, address/signature verification, expiry/replay rejection and server-side account/role check |
| First-wallet takeover | No role derived from wallet connection; admin role is provisioned independently; wallet enrollment requires existing privilege |
| All admin wallets lost | Explicit recovery ceremony; no email-only or first-wallet bypass; session/old-wallet revocation and auditable replacement |
| Support/NOVA overreach | Least privilege, human authority for exceptional promotion, actions logged; NOVA cannot self-authorize |
| Malicious user input / stored XSS | Output escaping, CSP review, upload policy if avatars are introduced, hostile fields used in regression tests |
| Privacy leakage | Minimal collection, private reports, no secret/token logging, no public wallet-to-account linking by default |
| Operational/provider outage | Ordinary browsing must remain available; auth failure is explicit; no false “signed in” state or silent insecure fallback |
| Honest user mistake | Explain failed/blocked states; provide accessible recovery path without publicly accusing the user or demanding unnecessary sensitive identity data |

## 8. Standards and evidence baseline

Use current versions for requirements traceability; record exact clauses when a test is designed:
- NIST SP 800-63B-4 (2025), Digital Identity Guidelines: Authentication and Authenticator Management.
- OWASP Application Security Verification Standard (ASVS) 5.0.0, especially authentication and session management.
- OWASP Passkey Security, Session Management and broader ASVS authentication/access-control guidance.
- W3C WebAuthn Level 3 Recommendation (2026-08-25) as the primary public-key account-authentication standard; local user verification must not be biometric-only.
- EIP-4361 / Sign-In with Ethereum for wallet proof-of-control only if the reviewed wallet lab is integrated.

These are engineering references, not proof of conformity, certification or security. Each requirement needs a test and evidence on the candidate commit.

References:
- NIST SP 800-63B-4: https://csrc.nist.gov/pubs/sp/800/63/B/4/final
- OWASP ASVS 5.0.0 session management: https://github.com/OWASP/ASVS/blob/master/5.0/en/0x16-V7-Session-Management.md
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- W3C WebAuthn Level 3: https://www.w3.org/TR/2026/REC-webauthn-3-20260825/
- EIP-4361: https://eips.ethereum.org/EIPS/eip-4361

## 9. Phased implementation plan

### Phase 1 — Local account journey and UI prototype
- [x] Implement and test the Log In / Sign Up fields and account-entry flow.
- [x] Add the separate Security assurance page/link.
- [x] Add the success state, signed-in circular account control and modular User dashboard foundation/navigation.
- [ ] Add user-facing service and personal transaction modules to the User dashboard as their backend, authorization, confirmation and activity-history requirements are implemented; ordinary and administrator accounts must use the same member workflows.
- [x] Keep optional wallet access separate from ordinary account registration and sign-in.
- [x] Keep the browser preview disposable and memory-only; keep the Python/SQLite server bound to loopback.
- [x] Keep production-only or unavailable features clearly distinguished from working local prototype controls. This does not make the browser preview a real account service.

### Phase 2 — Local user-lifecycle backend prototype
- [x] Implement the local SQLite account/session schema, server-side role model and registration default of `user`; registration input cannot grant administrator authority.
- [x] Historical legacy prototype: local email-verification and password-reset token flows, expiry/single-use enforcement, hashed token storage, neutral reset responses and session revocation were implemented. These flows are superseded; the default passkey-first server rejects the legacy routes, and legacy sessions are not accepted in passkey mode.
- [x] Historical legacy prototype: explicit SMTP provider selection and an atomic email quota guard were implemented with fake-sender tests. They are not required or authorized for account authentication or recovery; do not configure a provider for this purpose.
- [x] Historical email/password, email-token and SMTP tests are retained only as explicit opt-in regression tests. Default passkey mode does not load the email sender and does not expose legacy login, verification or password-reset routes. The replacement passkey API and virtual-authenticator browser tests cover passkey registration, discoverable sign-in, recovery-key consumption/rotation, passkey replacement and session revocation. Reassess removal of legacy-only tests separately; never enable legacy authentication in the default runtime.
- [ ] Complete broader adversarial review and coverage for deployment-specific CSRF, session fixation, XSS/CSP, recovery and operational failure cases.
- [ ] Qualify real provider delivery only when a controlled sender domain and credentials are available. No paid plan, card, trial, automatic upgrade or paid fallback is permitted; until then, keep real delivery disabled.

### Phase 3 — Local administrator and wallet-authentication lab
- [x] Reuse the shared local SIWE verifier instead of duplicating signature verification.
- [x] Keep owner-operated local CLI provisioning/revocation as an explicitly confirmed first-admin bootstrap/test adapter; it is not routine administrator appointment, and its actor label is not authentication.
- [x] Implement loopback administrator-to-administrator appointment with distinct `admin.roles.grant` permission, wallet step-up, no self-grant, no permission escalation, reason and audit record; an administrator without the exact permission is denied.
- [x] Separate role appointment from target-owned first-wallet enrolment; the target signs a one-time enrollment challenge, then signs a second fresh challenge for administrator session step-up.
- [x] Store a maximum of three administrator wallet addresses per account. A fresh signature from one enrolled wallet authorizes only the already-authenticated account's short-lived step-up; initial enrollment requires the separately assigned role plus the ordinary account session.
- [x] Bind short-lived challenges to the account and exact session; reject expired/reused challenges, cross-account/session use, unregistered wallets and invalid signers.
- [x] Add a maximum ten-minute administrator step-up and a separate administrator view; server endpoints independently enforce administrator authorization.
- [x] Require an active verified administrator step-up and a separate signature from the proposed wallet before enrolling an additional wallet; initial enrollment is separately gated by the existing role and ordinary account session. Adding a wallet invalidates the previous step-up.
- [ ] Resolve the minimum enrolled-wallet count before production activation (two independently controlled wallets remains a proposal, not a final decision).
- [ ] Specify and test Imperial HSIAN recovery after all administrator wallets are lost.
- [ ] Independently review the local provisioning trust boundary and administrator step-up threat model; production administrator authority remains blocked.

### Phase 4 — Production decision
- [ ] Resolve AUTH-001: authoritative website/origin, backend route, storage, hosting and deployment ownership.
- [ ] Choose a maintained production runtime/storage/secret approach using the least complex suitable option and verified cost/terms.
- [ ] Complete production HTTPS/cookie/CSRF/security headers, WebAuthn RP/origin verification, passkey lifecycle, recovery-key operations, data retention/deletion/export, audit logging and incident procedure. Email/SMS account verification and reset are not production requirements.
- [ ] Review legal Terms/Privacy, newsletter consent, user support and applicable jurisdiction requirements.
- [ ] Complete threat-model test suite, accessible/browser compatibility review and independent security review.
- [ ] Promote only through a separate verified pull request; never publish this prototype by copying it directly to the root homepage.

## 10. Current evidence and status

- Draft PR #141 contains the ordinary-account entry flow, the current User dashboard foundation (profile, security/session, wallet-information, preference and case-portal links), the separate Administrator dashboard, loopback SQLite server, disposable browser-memory preview, optional Referral ID, separately recorded newsletter preference, and Terms/Privacy development drafts.
- The User dashboard is the common member workspace for both ordinary and administrator accounts. The current account prototype does not yet implement AstroCrown financial transactions or the full catalog of user services; these must be added as member-facing modules without changing access merely because an account also has the admin role. Administrative operations remain separate.
- The current local server now defaults to passkey-first account registration/sign-in and disables the legacy email/password, email-verification and password-reset routes. The Mailjet adapter/email-token tables remain only as legacy test artifacts; default passkey mode does not load an email sender. WebAuthn passkey registration/discoverable sign-in and the offline recovery-key replacement ceremony are implemented in the local prototype. The optional ordinary-account wallet backup remains unimplemented; the existing EVM/SIWE path is only for administrator enrollment and step-up.
- The local server owns account roles and defaults registrations to `user`. The owner-operated local CLI remains a development-only first-admin bootstrap adapter. Routine in-product local appointment and revocation use distinct `admin.roles.grant` and `admin.roles.revoke` permissions, a fresh wallet-verified session, permission-specific delegation limits, target-account validation and audit records. The target enrols their own first wallet and then signs a separate step-up challenge. These local endpoints do not provide production provisioning, owner governance, production account infrastructure or all-wallet-loss recovery.
- A local case-management/recovery-request prototype is also present; its local test behavior must not be confused with a staffed production support operation or the formal Imperial HSIAN recovery procedure.
- The separate `development/auth-prototype/` remains an isolated SIWE/EIP-4361 experiment and is not the authority for account roles.
- The current public-host homepage/root publication path remains a separate deployment gate; a prototype test does not prove public account service deployment.
- Exact-head automated verification: all five tracked workflows passed on `8509b64086a09ac3cfc7eea82977c27e8e6a2fd8` on 2026-11-02 UTC / 2026-11-03 India time: [Local Account Continuity](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41530360712), [External Review Pipeline](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41530360765), [Local Wallet Authentication](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41530360796), [NOVA RSI Engine CI](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41530360753) and [NOVA RSI CodeQL](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41530360846). CodeQL reported no new alerts in code changed by the pull request. These results verify the specified prototype checks only; they are not independent review or release approval.
- No production authentication, legal, security or recovery capability may be inferred from the prototype CI result.

## 11. Next action

Keep the User dashboard common to ordinary users and administrators. The local prototype foundation now includes permission-checked appointment and revocation, the separate owner bootstrap path, target-owned first-wallet enrolment, fresh wallet step-up, permission-gated dashboard controls and negative authorization tests. The next work is adversarial/security review, production-specific identity/governance and recovery design, and manual acceptance. Add member services and transactions only when their backend behavior, authorization, confirmations and user-facing controls are implemented and tested. Complete the remaining security assurance, threat-model and production gates before any public activation. Keep PR #141 in draft until current-head verification and review gates are satisfied.


## 12. Administrator appointment and wallet-gated entry — 2026-11-02

An administrator is first an ordinary AstroCrown user. Account registration and ordinary sign-in always create/use the common User dashboard. A separate, already-authorized administrator may later grant the administrator role to that existing account only when the grantor has the explicit `admin.roles.grant` permission. Not every administrator receives that permission. The grantor cannot grant themselves or use the operation to expand their own authority. Revocation is separately permissioned. The initial owner/administrator is established through a deliberate owner/Imperial HSIAN bootstrap because there is no prior administrator available.

The role grant and wallet enrolment are independent. After the role is persisted, the server-reported administrator access entry becomes visible in the existing User dashboard. The new administrator then proves control of their own wallet through a distinct enrolment/signature process; the granting administrator's assertion or a connected address is not proof of the target's wallet control. A fresh signature from one of up to three enrolled wallets is the step-up that opens the separate Administrator dashboard. It does not sign the user into a second account, create the role, or authorize a blockchain transaction.

**Current implementation boundary (local prototype):** the loopback server now implements `/api/admin/roles/grant` and `/api/admin/roles/revoke` with separate permission checks, active wallet step-up, existing-target validation, self-grant denial, restricted permission delegation and audit records. The newly appointed account enrols its own first wallet through a separate server-issued challenge and signature; a second fresh signature is required for the administrator session. The User dashboard entry remains role-gated, and the Administrator dashboard shows appointment/revocation controls only when the backend returns the corresponding permission. The owner-operated CLI remains a local initial-owner/bootstrap/test adapter; its `--actor` value is an audit label, not authentication. These local prototype behaviors are not production governance, hosting, account identity or Imperial HSIAN recovery.


## 13. NOVA-native administrative operations smart account — 2026-11-02

### Owner-accepted architecture

The programmable administrative smart account and its transaction-validation mechanism are components of NOVA itself. The on-chain account and its validation/enforcement logic are part of NOVA's security boundary, coordinated with NOVA's off-chain policy, governance, monitoring, audit and incident-response services. They are not an external wallet-security product.

Keep three distinct asset/identity domains:

1. **External administrator identity/compensation wallet:** controlled by the administrator; used for wallet proof/step-up and may receive salary, service payments and bonuses through a separate payout process. It does not hold AstroCrown organizational operational funds, does not control the NOVA operations account, and is never a treasury key. NOVA never obtains its private key or seed phrase.
2. **NOVA administrative operations smart account:** a separately identifiable programmable account assigned to each administrator. It holds only the minimum organizational operational assets required for approved duties. It is enforced by NOVA before execution and cannot access the treasury without a separate explicitly governed authorization that is not included in routine administrator permissions.
3. **AstroCrown treasury and protected recovery vault:** organizational treasury custody remains separate. Recoverable operations-account assets go only to a predetermined, separately protected recovery destination through pre-authorized recovery logic.

### Mandatory transaction enforcement

Every administrative operation must be evaluated by NOVA's off-chain policy layer and independently validated by the NOVA smart account before execution. The on-chain validator must bind approval to the exact chain, account, destination, asset, amount, contract/function or operation payload, nonce, expiry and required permission. Unknown, malformed, stale, replayed, unapproved or unverifiable operations fail closed. No admin, external wallet, fallback module, delegated key or ordinary NOVA service credential may disable or bypass the mandatory guard.

NOVA monitoring must cover supported networks and relevant changes to balances, token approvals, contract interactions, signers, guardians, modules, fallback handlers, delegated/session keys, limits, upgrades and recovery configuration. NOVA must periodically reconcile expected policy/configuration against authoritative chain state. Coverage limitations must be declared; no chain or asset may be implied to be monitored or recoverable unless implemented and tested.

### One-violation policy and dashboard consequence

A deliberate prohibited operation submitted or approved by a currently authenticated and wallet-step-up-verified administrator is a qualifying violation even when the transaction guard blocks it before execution. It receives the same response as a confirmed compromise: reject the operation; suspend and unregister the NOVA operations smart account; remove the administrator's role and permissions; revoke privileged sessions and delegated authorizations; disable the external wallet's administrator-authenticator association; and initiate recovery of remaining supported operational assets to the predetermined protected vault. The ordinary User dashboard remains accessible, the Administrator access entry disappears based on authoritative server state, and the standard incident notice is displayed.

A qualifying attempt must be attributable to an authenticated administrator action or a valid authorization from that administrator's approved context. An unauthenticated third-party probe, forged request, benign interface error or ordinary transport failure is not by itself proof of administrator misconduct; it is still logged and assessed. This attribution boundary prevents an attacker from deliberately causing a false administrator revocation.

Revocation does not confiscate the external wallet or already-earned compensation. The external address may remain a payout destination if it is not itself suspected compromised. If the payout destination is suspected compromised, further payments to it are held pending separate verification. Compensation accounting and disputes remain separate from wallet-security sanctions.

The standard notice is:

> **Administrative privileges revoked**  
> Your NOVA administrative operations account attempted an operation that violates AstroCrown's Administrative Wallet Security Policy. The operation was blocked. Your administrative operations account has been disabled, your administrator privileges have been revoked, and the security incident has been recorded by NOVA.  
>
> Your ordinary AstroCrown account remains accessible, but you no longer have access to the Administrator dashboard.  
>
> Incident reference: [Generated incident ID]

### Recovery and governance safeguards

- Recovery may move only remaining supported assets that are still controlled by the operations account or recoverable under the relevant protocol. Already transferred or irreversibly consumed assets cannot be promised as recoverable.
- The recovery destination, guard, recovery authority and upgrade controls must be established before the account holds assets. NOVA cannot replace the destination with an arbitrary incident-time address.
- No routine administrator may remove the guard, change its own recovery destination, alter its authority threshold or grant themselves a bypass.
- A compromised off-chain NOVA component must not make on-chain validation permissive. Conversely, compromise of the enforcement root or upgrade authority is a system-level incident and must not be represented as automatically recoverable.
- Reinstatement requires formal security review and new authorization; reconnecting the external wallet does not restore privileges or silently reactivate the revoked operations account.

### Implementation boundary and release gate

The current PR #141 prototype implements local account roles, permissioned appointment/revocation, external-wallet proof-of-control and short-lived administrator step-up. It does not implement the NOVA operations smart account, on-chain validator/guard, operational asset management, chain monitoring, emergency freeze/recovery or the incident lifecycle described here. This section and the linked security specification record requirements only. They do not establish that any contract has been written, deployed, audited or tested. No real assets or production systems are affected.

Required later verification includes offline and test-chain model tests, adversarial tests for direct-call and module/upgrade/guard bypasses, replay and policy-drift tests, invariant/property testing, recovery and revocation tests, independent smart-contract review, chain/RPC failure procedures and operational incident drills. Real assets must not be deposited before these gates are completed.


## 14. Solana-first development target and Devnet test funding — 2026-11-02

### Provisional chain direction

Solana is the preferred provisional blockchain candidate for AstroCrown. Solana Devnet is the preferred first public integration network for the NOVA administrative operations prototype. This is a development priority, not a final Mainnet selection or a production deployment authorization. The final chain decision remains subject to technical/security qualification, ecosystem and asset support, operational reliability, cost, monitoring, recovery and independent review.

The implementation must use Solana-native primitives:
- Solana programs and instructions;
- explicit account data/state;
- Program Derived Addresses (PDAs) and program-controlled vaults where suitable;
- Cross-Program Invocations (CPIs) for authorized program-to-program asset operations; and
- Solana-native transaction/signature and token-account authority validation.

Do not assume an Ethereum ERC-4337/EVM smart account, EVM modules, fallback handlers or EVM transaction hooks. A PDA has no private key; only its deriving program can authorize it using the runtime's PDA-signing mechanism in a CPI. The NOVA program must own the mandatory path for assets in NOVA-controlled operations vaults.

### External-wallet limitation

The administrator's external wallet is a user-controlled authentication wallet and may also be a registered compensation destination. It is not the NOVA operations vault or treasury. Because the owner controls an ordinary external self-custody wallet, AstroCrown cannot technically prevent that person from making arbitrary personal transactions directly from that wallet. NOVA's enforceable no-personal-operations policy applies to NOVA-controlled operational assets and operations routed through the NOVA program. If the project ever requires restricting the external wallet's own spending, that would require a different custody/program-controlled wallet model and a separate explicit decision; it must not be implied by the current external-wallet design.

The external wallet's authentication association can be revoked when the administrator loses privileges, without confiscating the wallet or already-earned compensation. Compensation remains a separate payout workflow.

### Solana transaction atomicity

Solana transactions are atomic: if an instruction fails, all state changes in that transaction are reverted, although the transaction fee is still charged. Therefore, a NOVA instruction cannot both write a persistent revocation record and return an error in the same failed transaction. The one-violation incident process needs a separate durable path, such as off-chain NOVA recording before submission, an independent monitor that verifies a confirmed failed program instruction and submits a separate authorized response, or a successful violation-report/lock instruction followed by a separate constrained recovery instruction. This must be specifically tested against preflight-only requests, transactions that never land, RPC/monitor failure, replay and attribution ambiguity.

### $0-first test sequence

1. Offline deterministic policy and incident-state tests with synthetic accounts.
2. Local Solana validator or lightweight program-test harness with artificial/local balances.
3. Devnet integration using disposable test-only keypairs and free test SOL from the official faucet or CLI airdrop.
4. Controlled test mints for SPL Token/Token-2022 tests where required.
5. Separate Mainnet chain-selection and production authorization after independent security review.

The Solana CLI currently documents up to 5 SOL per Devnet airdrop request, subject to rate limits. The public web faucet currently displays two requests per eight hours; these are changing service limits, not guaranteed capacity. Devnet SOL has no monetary value and Devnet may reset its ledger. The public Devnet RPC is shared and rate-limited. Local/offline tests must be preferred so faucet allocation is reserved for tests that genuinely require the public network. Do not silently use a paid RPC/faucet or Mainnet when Devnet is rate-limited.

Keep all Devnet keypairs and signing secrets outside GitHub, CI logs, PR comments, screenshots and chat. Never reuse a Mainnet or compensation wallet for this testing. Verify the configured cluster and signer before any transaction or program deployment.

Official references:
- [Solana clusters and public RPC endpoints](https://solana.com/docs/references/clusters)
- [Solana Devnet SOL and faucet guide](https://solana.com/developers/cookbook/development/airdrops-and-faucets)
- [Solana CLI basics](https://solana.com/docs/intro/installation/solana-cli-basics)
- [Solana core concepts](https://solana.com/docs/core)
- [Solana Program Derived Addresses](https://solana.com/docs/core/pda)
- [Solana transaction atomicity](https://solana.com/docs/core/transactions)

The related canonical NOVA planning document is [Solana Devnet Qualification and Test-Asset Policy](https://github.com/ACROWN-System/NOVA/blob/docs/nova-admin-smart-account-security-2026-11-02/NOVA/SOLANA-DEVNET-QUALIFICATION-AND-TEST-ASSET-POLICY.md). The associated NOVA architecture remains a draft proposal under [NOVA PR #175](https://github.com/ACROWN-System/NOVA/pull/175).

### Implementation boundary

These decisions update the development target and test plan only. No Solana program, PDA vault, transaction guard, monitoring service, recovery path or Devnet wallet has yet been created or deployed by this update. The existing account prototype continues to implement only its local identity, role and external-wallet step-up flows.


## 15. Supplemental Solana Testnet and multi-asset compatibility — 2026-11-02

### Network roles

Use three non-production Solana environments with distinct responsibilities:

| Environment | Purpose in AstroCrown/NOVA qualification |
|---|---|
| Local validator / Localnet | Main repeatable development, deterministic regression, policy, adversarial and recovery testing |
| Devnet | Primary public application/program integration and wallet/transaction testing |
| Testnet | Supplemental network-release, validator, runtime/version, stability and targeted stress/compatibility testing |

Solana's official guidance directs application developers to Devnet; Testnet is primarily used by core contributors to stress-test releases, network upgrades, performance, stability and validator behavior. Testnet may run a newer software release branch than Devnet and Mainnet. Do not substitute Testnet for Devnet or assume that passing Testnet proves Mainnet compatibility. Its faucet exists, but availability, limits and eligibility must be checked when it is actually used.

### Asset compatibility must be tested by program and configuration

Do not rely on discovering or collecting arbitrary faucet tokens as the asset compatibility strategy. A native SOL airdrop does not provide arbitrary SPL tokens. Create controlled test mints and token accounts on each cluster where they are needed. A Devnet mint does not automatically exist on Testnet because each cluster has a separate ledger.

The test matrix should be driven by the asset standards AstroCrown intends to support. Candidate categories include:

- Native SOL.
- Classic SPL Token fungible assets.
- Token-2022 base mints.
- Token-2022 transfer-fee assets.
- Token-2022 transfer-hook assets, including required extra account and hook-program validation.
- Token-2022 permanent-delegate assets.
- Token-2022 default-account-state and pausable assets.
- Token-2022 metadata/metadata-pointer configurations.
- Confidential-transfer assets only after a separate privacy, monitoring and authorization design.
- NFT and other standards only when explicitly selected, such as Metaplex Token Metadata, programmable NFTs, compressed NFTs or Metaplex Core.

Token-2022 extensions may be incompatible with one another, and extension choices often have to be made at mint/account initialization. NOVA must not assume every combination is valid or that extensions can be added after mint creation. Each asset type needs an explicit support profile. Unknown token program IDs, mints, extensions, transfer hooks and asset standards must fail closed.

For every controlled fixture mint, record the cluster, mint address, owning token program, decimals, extension set, authorities, test purpose and program build. The token's ticker, displayed name, logo or metadata URI does not prove its identity. Asset checks must use the cluster, owning program and mint/asset address, plus its configuration and authorities.

### Suggested testing responsibilities

- Run all combinations that can be tested deterministically on the local validator first.
- On Devnet, test the primary public integration cases and controlled token fixtures.
- On Testnet, repeat selected critical asset and transaction flows to detect differences in the live cluster/runtime/release environment and conduct controlled stress tests where suitable.
- Never assume a test mint, faucet token, balance or account is shared between clusters.
- Record unsupported or untested configurations explicitly; do not advertise universal asset compatibility.

### Official references

- [Solana clusters and public RPC endpoints](https://solana.com/docs/references/clusters)
- [Solana tokens and token programs](https://solana.com/docs/tokens)
- [Solana Token Extensions](https://solana.com/docs/tokens/extensions)
- [Solana Devnet faucet and airdrop guide](https://solana.com/developers/cookbook/development/airdrops-and-faucets)

### Status boundary

This is an extension of the $0-first testing plan only. No Testnet wallet, test mint, faucet request, program deployment or transaction was created by this documentation change. No universal asset support is claimed.

## 16. Wallet-family-compatible sign-in proof and administrator step-up — 2026-11-02

### Scope and current UX boundary

The current account-development scope remains the ordinary sign-in/sign-up experience, User dashboard, role-gated Administrator dashboard entry and the wallet proof required for administrator step-up. This requirement prepares that account foundation for different wallet families; it does not expand the current coding scope into payments, swaps, bridges or general blockchain execution.

Ordinary AstroCrown account creation and normal User dashboard access continue to work without a crypto wallet. A wallet is requested only when the user deliberately enters a feature that requires proof of wallet control. The existing Administrator dashboard flow is one such feature: the server first confirms the account administrator role, then a registered wallet proves control for a short-lived step-up. A wallet connection, address, balance or signature never creates an AstroCrown account, assigns an administrator role or grants permissions.

Wallet-based primary sign-in for ordinary members is not authorized by this section. It may be considered later as an additional login method, but it must link to an existing account under a separately approved account-recovery and privacy design. Do not silently create duplicate accounts for the same person or treat one chain address as the universal account identity.

### Connection is not authentication

- **Connect/discover:** the user explicitly chooses a wallet; the connector reports the wallet capabilities, selected account(s), address format and network/chain context. This alone proves no identity or authority.
- **Prove control:** AstroCrown issues a single-purpose, short-lived challenge and the wallet signs the exact human-readable authentication message using a supported off-chain message protocol. The server verifies the signature and challenge before recording or using the wallet as an authenticator.
- **Authorize a blockchain transaction:** a separate transaction preview and explicit transaction-signing flow that is not part of account sign-in, wallet linking or administrator step-up.

A login, wallet-link or administrator-step-up challenge must not request a token transfer, contract call, PSBT spend or no-op transaction. It must not expose arbitrary transaction permissions. Do not ask for a seed phrase or private key.

### Wallet-family authentication adapters

Use one common challenge lifecycle with independent serializers, signing-capability detection and server-side verifiers for each supported wallet family. Do not pass a Bitcoin signature into an Ethereum/SIWE verifier or assume that a common wallet modal makes the underlying proof formats interchangeable.

| Wallet family | Account and signature model | Candidate proof-of-control protocol | Required treatment |
|---|---|---|---|
| EVM / Ethereum | Account/address model; an address can be used on multiple EVM chains, but the chain context still matters | Sign-In with Ethereum (EIP-4361 / SIWE); ERC-1271 validation for qualifying contract accounts | Verify domain/origin, exact address, EIP-155 chain ID, URI, nonce, issue/expiry times and exact message. Do not assume every smart-contract wallet uses an ordinary EOA signature. |
| Bitcoin | UTXO-based ownership and script/address types; not an EVM account or 0x address | BIP-322 generic signed-message proof, using only explicitly supported variants and script types | Verify the proof against the exact Bitcoin address/script and selected network. Wallet support varies; detect it before offering this method. Do not treat an ordinary payment transaction or PSBT spending authorization as a login proof. |
| Solana | Public-key/account model with Solana-native message features | Sign In With Solana (SIWS) and the Solana off-chain message signing format (OCMS); raw message signing only when explicitly reviewed | Prefer the message format that cannot be mistaken for a transaction where the wallet supports it. Verify exact signed bytes, signer public key, challenge and cluster/context. Do not make transaction signing the default authentication fallback. |
| Other families | Chain-specific account, key, script, object or signing models | A protocol-specific adapter only after research and qualification | Add only when an actual product need exists and the message format, wallet support, verifier, replay controls and recovery behavior have been reviewed. |

The table defines future adapter targets; it does not claim that Bitcoin or Solana login adapters are implemented.

### One wallet application can expose several wallet families

Do not confuse a wallet application/provider with the chain-specific account/address and proof protocol it exposes. A single multichain wallet application can connect to more than one ecosystem, so AstroCrown must not force a user to install a separate wallet application for every chain.

MetaMask is a current example for the EVM/Ethereum and Solana combination: MetaMask's official help guidance says it supports SOL and SPL assets alongside EVM assets and derives a Solana address per account from the existing Secret Recovery Phrase. Its developer documentation provides a MetaMask Connect multichain option that can request EVM and Solana access in one session. Therefore one MetaMask application/connection can provide both an Ethereum address and a distinct Solana address to AstroCrown; the user does not need separate MetaMask and Solana-wallet applications for this combination.

These remain distinct chain-specific address and proof records. The Ethereum address is verified with the approved EVM protocol; the Solana public key/address is verified with the approved Solana protocol. A successful EVM signature does not prove control of the Solana key, and vice versa. A shared wallet recovery phrase also means the two addresses may share one underlying security/recovery root; they must not be described as independent recovery factors.

The data model should therefore distinguish (a) wallet application/provider and connection session, (b) user-selected wallet account or recovery-root grouping where the provider exposes it, and (c) each chain-specific address/authentication credential. The same wallet application may populate multiple chain-specific credential records. Do not count installed applications as authenticators, do not merge the distinct addresses, and do not silently expand the existing provisional maximum of three enrolled administrator wallet-address credentials. Preserve the cap at the credential/address level unless a separate governance decision changes it.

MetaMask is an example and a candidate integration, not a selected or mandatory dependency. Review the exact current SDK/API, extension/mobile versions, supported platforms, RPC dependencies, provider terms, security behavior, privacy and $0 feasibility before adoption. Keep independent EVM and Solana adapters available so other multi-chain wallets and ecosystem-specific wallets can be supported too.

### Wallet portfolio support is not the same as website authentication support

The wallet market is fragmented: a wallet may be EVM-focused, Bitcoin-focused or multichain. Do not assume that every wallet supports both BTC and ETH, and do not require a user to replace a wallet that only supports one family. For example, Rabby describes its supported ecosystem as Ethereum and EVM chains; Trust Wallet and Exodus list both Bitcoin and Ethereum among their supported networks/assets. This demonstrates that combined BTC/ETH custody exists, but does not establish identical dApp connection or message-signing support across those products.

MetaMask itself added Bitcoin support on 2025-12-15 and currently documents BTC alongside EVM and Solana assets. Its Bitcoin support is presently limited to the Native SegWit derivation path by default; imported Bitcoin accounts must also be Native SegWit for compatibility at this time. However, the currently published MetaMask Connect developer interface documents dApp connection for EVM and Solana, including a multichain session for those ecosystems; it does not document a Bitcoin dApp namespace or BIP-322 authentication method. Therefore, MetaMask's ability to hold/send BTC must not be treated as proof that AstroCrown can use its Bitcoin account for website sign-in or wallet enrolment.

AstroCrown must qualify three independent capabilities for each wallet application/provider and platform: (1) asset custody/portfolio visibility, (2) transaction creation and signing for a chain, and (3) dApp connection plus off-chain authentication-message signing for that chain. A provider can support one or two without supporting all three. The website must detect the exact capabilities exposed by the selected extension/mobile version and enable only the corresponding actions.

Do not infer that most wallets support or do not support a combination from a few examples; maintain a dated compatibility matrix based on official provider documentation and hands-on tests. Never reject a wallet merely because it lacks an unrelated chain: a BTC-only wallet should remain eligible for a Bitcoin-specific proof when its supported message protocol has passed verification, and an EVM-only wallet should remain eligible for EVM proof.

Additional official references:
- [MetaMask: Bitcoin support and limitations](https://support.metamask.io/configure/networks/bitcoin/) — BTC account derivation and current Native SegWit limitation.
- [MetaMask Connect developer interface](https://docs.metamask.io/metamask-connect/) — published dApp interfaces for EVM and Solana.
- [Trust Wallet supported networks](https://trustwallet.com/) — BTC, ETH and SOL among its stated multi-chain coverage.
- [Exodus supported assets](https://www.exodus.com/support/en/articles/8598611-which-assets-does-exodus-support) — 50+ networks; current asset registry.
- [Rabby supported chains](https://www.rabby.io/en/chains.html) — EVM-oriented network coverage.

Official references:
- [MetaMask: Navigate Solana in MetaMask](https://support.metamask.io/configure/networks/navigating-solana/) — SOL/SPL support alongside EVM and Solana address derived from the existing SRP.
- [MetaMask Connect: Integration options](https://docs.metamask.io/metamask-connect/integration-options/) — multichain EVM and Solana connection in one session.
- [MetaMask Connect overview](https://docs.metamask.io/metamask-connect/) — extension/mobile connection and EVM/Solana support.

### Common challenge envelope and stored authenticator

Each adapter must consume a server-issued challenge with common security semantics, even where the signed message encoding differs. Bind the challenge to the exact website origin/domain and intended URI/audience; a cryptographically random, single-use nonce; issue time and short expiry; intended purpose (wallet_link, admin_step_up, or a separately approved login purpose); authenticated AstroCrown account ID and exact server session for linking and administrator step-up; exact wallet family, namespace, chain/network and selected address/account/script; exact protocol/version and expected message bytes; and a statement explaining that the action is authentication only and does not authorize a transaction.

Consume the nonce only once and reject expired, reused, cross-account, cross-session, wrong-origin, wrong-network, wrong-address, malformed or modified messages. Do not let the client select or alter the purpose or security-critical message fields after the challenge is issued.

Store only the public authenticator record and evidence needed for verification and lifecycle management. At minimum record family/namespace, network context, canonical account/address identifier, applicable script/address type or contract-account type, proof protocol/version, enrolment time, verification state, last-use/revocation state and audit reference. Never store private keys, seed phrases or reusable signing secrets. Do not automatically link addresses from every account exposed by the wallet; the user selects the account/address to enrol.

### Multiple wallet families and administrator policy

The provisional maximum of three administrator authentication wallets applies across all supported families combined, not three per chain. The unresolved minimum before administrator activation remains unresolved; do not silently decide it. The existing one-of-N rule means one enrolled authenticator can prove control for a fresh step-up. It is not a multisignature authorization for a blockchain transaction and does not override NOVA separate smart-account policy.

Mixed enrollment is intended to be representable, for example one EVM authenticator and one Bitcoin authenticator on the same AstroCrown administrator account, once each adapter has passed review. It does not make the EVM and Bitcoin accounts the same asset address or one common on-chain identity. The separate NOVA administrative operations smart account remains Solana-native under its current provisional development direction; an external wallet-family proof only authenticates the administrator to AstroCrown and does not itself sign or authorize NOVA program instructions.

### Compatibility and acceptance gates

Before an adapter may be used for wallet linking or administrator step-up, test message serialization and canonical byte equality; wrong website origin/domain, URI, network/chain or selected address; nonce entropy, expiry, single use, replay and cross-account/session rejection; signature tampering, malformed and truncated proofs; wallet account/network changes and disconnects between challenge and verification; supported EVM EOA and contract-account verification paths where claimed; Bitcoin address/script variants and BIP-322 proof variants actually supported by the selected wallets; Solana signer identity and off-chain-message version/capability negotiation where that adapter is implemented; unsupported wallet capability, unavailable RPC/verifier data and provider outage; and explicit user cancellation and fallback to ordinary account sign-in without granting privileged access.

A wallet that cannot produce a supported message proof must not be silently downgraded to a weak signature format or a transaction-signing request. The user may use another enrolled authenticator or the ordinary account access route, subject to role and recovery policy.

### Current implementation boundary

The current local account/wallet lab remains EVM-oriented and uses EIP-4361/SIWE for administrator-wallet proof. The account UX and role checks remain local prototype behavior. Bitcoin BIP-322 verification, Bitcoin wallet connector support, Solana SIWS/OCMS authentication adapters, mixed-family enrollment and production wallet linking are not implemented by this requirements update. No BTC or ETH wallet has been connected, no wallet address has been enrolled, and no transaction or production authentication capability has been activated.

### Technical references

- [EIP-4361 / Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)
- [ERC-1271 / Standard Signature Validation Method for Contracts](https://eips.ethereum.org/EIPS/eip-1271)
- [BIP-322 / Generic Signed Message Format](https://bitcoin.org/bip/322/)
- [Solana: Sign Messages and Authenticate Users](https://solana.com/docs/frontend/messages-and-auth)
- [Wallet and asset extensibility architecture](../crypto-infrastructure/ASSET-PAYMENTS-AND-WALLET-INTERACTIONS-ARCHITECTURE.md)
## 17. No minimum wallet balance for account access or authentication — 2026-11-02

AstroCrown must not require a user to hold, deposit, retain or periodically restore a minimum cryptocurrency balance merely to connect a wallet, link an address, prove wallet control, sign in through a separately approved wallet-authentication method, use the ordinary User dashboard, or complete an administrator wallet step-up. Empty/new wallets must be eligible for these actions when the selected wallet can produce the supported proof.

Authentication must use an off-chain signed message, not an on-chain transaction, token transfer, fee payment, proof-of-funds check, balance threshold or minimum-stake check. The server must not query or use wallet balance as a condition for authentication or administrator access. An address's balance is not proof of identity, ownership authority, trustworthiness or role eligibility.

Use the chain-specific proof protocol: EIP-4361/SIWE for qualified EVM wallets, BIP-322 for a Bitcoin wallet/script variant that has passed compatibility testing, and SIWS/off-chain message signing for qualified Solana wallets. Solana's official guide explicitly states that off-chain message signing requires no transaction, fee or network call. These are proofs of control of a signing key/account, not proofs that the wallet holds funds.

Do not silently fall back to a no-op transaction when message signing is unavailable. Stop and explain the unsupported wallet capability; the user can continue with the primary WebAuthn passkey or choose another compatible optional wallet authenticator. Never ask for funds to be deposited to enable authentication.

### Transaction fees are different from a minimum-balance rule

A user-initiated blockchain transaction may still require the exact asset being spent and a network fee at execution time. That is a property of the requested transaction and chain, not a standing balance requirement for the user's AstroCrown account or connected wallet. Do not impose an arbitrary retained balance, dormant-wallet threshold or minimum balance after a transaction. Show the exact amount and fee before asking the user to sign.

Where commercially and technically viable, later transaction services may sponsor network fees or abstract gas through a chain-specific mechanism. Sponsorship is not automatic or universal, and its cost must be budgeted and disclosed; it must never be represented as implemented before qualification. A Bitcoin transaction still needs suitable spendable UTXOs for the payment and its miner fee unless a separately designed third-party service funds that transaction.

These rules apply to ordinary users and administrators. The external administrator identity/compensation wallet does not need a balance to authenticate. The separate NOVA operations smart account, organizational treasury and any protocol-required operational funding are not user wallet minimum-balance requirements and remain governed separately.

### Acceptance tests

- [ ] Connect and link an empty EVM wallet and complete an EIP-4361 challenge without an on-chain transaction or balance lookup.
- [ ] Connect and link a Bitcoin address with no UTXOs and complete a supported BIP-322 message proof without spending funds or checking a minimum balance.
- [ ] Connect and link an empty Solana wallet and complete a supported SIWS/OCMS message proof without an RPC transaction or fee.
- [ ] Complete administrator wallet step-up from an empty enrolled wallet when its message proof is valid.
- [ ] Verify that zero, low, unknown or unavailable balance data never blocks sign-in, wallet linking or dashboard access.
- [ ] Verify that an unsupported message-signing capability is reported honestly and never triggers a transaction-signing fallback.
- [ ] Separate any exact transaction funding/fee insufficiency from authentication status and do not create a retained-balance policy.

Technical references:
- [Solana: Sign Messages & Authenticate Users](https://solana.com/docs/frontend/messages-and-auth) — explicitly distinguishes off-chain proof from transaction signing, RPC calls and fees.
- [EIP-4361 / Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361) — off-chain authentication message and nonce/session requirements.
- [BIP-322 / Generic Signed Message Format](https://bips.dev/322/) — Bitcoin message-proof specification; wallet/script compatibility still requires testing.
- [ERC-4337 Paymasters](https://eips.ethereum.org/EIPS/eip-4337) — one EVM-specific option for later gas sponsorship, not a universal chain solution.
## 18. Deferred Astro-Wallet and minimal future-integration boundary — 2026-11-02

### Current implementation scope

The active development priority is now the AstroCrown passkey-first account journey: WebAuthn sign-up/sign-in, stable account/session continuity, offline recovery-key lifecycle, optional user-selected wallet backup, the common User dashboard, server-confirmed administrator access visibility, permissioned appointment/revocation and the existing wallet-verified administrator step-up. Do not broaden this into a general wallet platform.

**Astro-Wallet (AW) is explicitly deferred.** No AW wallet application, key-management engine, wallet-connect SDK, multi-chain signer, asset portfolio, token registry, transaction builder, payment/swap/bridge integration, MPC/TSS, guardian recovery, passkey signing-key system or post-quantum cryptography is part of the current account implementation. Its separate strategy document is a future research record, not an active dependency, blocker or implementation specification for PR #141.

The current local administrator wallet verifier remains an EVM externally-owned-account (EOA) EIP-4361/SIWE lab. It is not a generic wallet adapter. Do not imply BTC, Solana, EVM contract-wallet or other wallet-family authentication support until each is separately specified, implemented and tested. Continue the existing scope without adding new wallet connectors merely for future-proofing.

### Preserve the account boundary so later integration is incremental

Future compatibility should be protected through a few stable boundaries, not by implementing Astro-Wallet early:

1. **AstroCrown account identity remains independent.** Stable account IDs, sessions, roles, permissions, recovery requests and dashboard access must never be derived from a blockchain address, mnemonic, wallet application or asset balance.
2. **Wallet authentication remains an optional additional authenticator.** A wallet proof is attached to an existing account and a specific purpose; it can be selected as a backup only after an explicit user enrollment. WebAuthn remains the primary account authenticator. A wallet must not become the account's primary database key.
3. **Keep chain-specific signing inside the verifier boundary.** EIP-4361/SIWE parsing and EVM address validation must remain localized to the existing wallet-auth module/service and its explicit API boundary. Do not spread `0x` address parsing, EVM chain assumptions or SIWE message fields into account identity, session, role, dashboard or permission logic.
4. **Keep the provider UI replaceable.** Account/dashboard code should depend on the server's challenge and verification result, not on a particular browser-extension global, wallet brand, provider object or wallet SDK. Provider-specific discovery and signing belong in the wallet interaction layer when another adapter is actually approved.
5. **Do not assume one wallet application equals one chain credential.** A future multichain provider may expose several chain-specific addresses and signing protocols. Keep the conceptual relationship as account → one or more optional wallet credentials; each credential is qualified by its own network namespace, exact network, native account/address identifier and proof protocol. The provider/application is descriptive connection metadata, not the credential identity.
6. **Keep migration narrow and explicit.** Before a production wallet-linking or multi-family implementation, design a versioned wallet-credential schema with chain namespace/network, canonical native identifier (and Bitcoin script/address type or other chain-native fields where needed), proof protocol/version, status and timestamps. Enforce uniqueness in the appropriate namespace/network/address scope, not by assuming every chain address shares one global string format. Preserve audit history and map existing EVM records during a reviewed migration.

### Current local schema limitation — intentionally not changed now

The disposable local SQLite prototype currently stores administrator wallets in an `admin_wallets` table with an EVM-style `address`, numeric `chain_id`, account association and active state. Its shared local verifier accepts Ethereum EOA-style `0x` addresses and SIWE; it has no Bitcoin, Solana or contract-wallet verifier. This is an explicitly narrow development implementation, not the future production multichain wallet-credential schema.

Do not refactor this working prototype into a general multichain wallet system as part of the current sign-in/dashboard task. Before production persistence or adding another wallet family, complete a dedicated schema/version migration and adapter review with tests for migration, identity collisions, account linking, revocation, challenge binding, replay, mixed-family credentials and recovery. The stable account/session/role model should remain intact during that future change.

### Scope and acceptance boundary

- [ ] WebAuthn passkey account access and User dashboard work without any crypto wallet, email address, password, SMS number or external identity provider.
- [ ] Current administrator role and permission checks remain server-owned and independent of wallet-provider branding.
- [ ] Existing EVM/SIWE local admin step-up remains isolated and explicitly labelled EVM-only.
- [ ] No minimum balance, deposit, proof-of-funds or transaction-signing requirement is added to wallet authentication.
- [ ] No Astro-Wallet code, SDK, key vault, recovery system or post-quantum dependency is introduced into PR #141.
- [ ] Future adapter/schema work can be added without changing account IDs, session semantics, role/permission ownership or dashboard access rules.
- [ ] Astro-Wallet remains a separate future project decision and cannot become a blocker to completion of the present account/dashboard foundation.


## 19. Passkey-first account authentication and offline recovery — owner-accepted 2026-11-03

The owner has approved replacing the email/password-first account direction with WebAuthn public-key authentication. The implementation target, protocol controls, optional wallet backup, user-held recovery key, $0-first provider boundary and acceptance tests are defined in [Passkey-First Account Authentication and Recovery Requirements](PASSKEY-FIRST-ACCOUNT-AUTHENTICATION-AND-RECOVERY-REQUIREMENTS.md).

Decision summary:

- WebAuthn passkey is the primary account authenticator for every user and administrator. AstroCrown stores public credential material only; the private key remains with the user's authenticator.
- A separately controlled crypto wallet may be registered as an optional backup authenticator. It is not required for account creation or ordinary use. Current wallet-family support remains limited to the existing EVM/SIWE local verifier until other adapters are separately qualified.
- Generate a 128-bit-or-stronger CSPRNG offline recovery key, show it once, store only a one-way verifier, throttle attempts, consume it once, then invalidate and replace it. The 128-bit value is AstroCrown's design target; NIST SP 800-63B-4 sets a 64-bit minimum for saved recovery codes.
- No email, password, SMS, paid identity provider, third-party authentication API or operator reset backdoor is part of account creation, login or recovery. The browser must still exchange WebAuthn challenges with AstroCrown's own backend; this is first-party application traffic, not an external identity-provider call.
- A synced passkey may involve the user's platform credential-sync provider. Device-bound passkeys or a user-owned FIDO2 security key are available alternatives where authenticator/browser support permits; a physical key may be a user expense and is not a project requirement.
- WebAuthn does not by itself encrypt account data from database/application operators. Any such privacy promise requires a separate client-side/end-to-end encryption design.
- Implementation update (2026-11-03): added the local WebAuthn relying-party adapter, pinned open-source dependency, discoverable registration/sign-in routes, public-credential storage, one-use challenge records and passkey-first UI. Added the offline recovery-key lifecycle: 256-bit CSPRNG secret, one-time display, salted one-way verifier, throttled verification, replacement passkey, old-key consumption, revocation of prior passkeys/sessions, rotated recovery key and security audit event. Added API tests and a Chrome virtual-authenticator recovery journey. Final CI verification for the current head remains in progress; do not claim a new green result until it completes. Existing email/password routes and Mailjet code are legacy-only and are disabled/not loaded by default. Do not configure email/SMS to support account sign-in or recovery.
- This does not authorize Astro-Wallet, custody, a key vault, multichain wallet refactoring, payments, MPC/TSS or post-quantum work. PR #141 remains draft, open, unmerged and undeployed.


## 20. Passkey and offline recovery local implementation record — 2026-11-03

### Implemented in the loopback prototype

- Added a separate passkey_auth.py relying-party boundary using the pinned Duo Labs WebAuthn Python package. The server requires discoverable credentials, user verification, a 32-byte challenge, exact localhost RP/origin checks and maintained-library verification. The application stores public credential material; it does not receive or store authenticator private keys.
- Added account_passkey_credentials and account_passkey_challenges tables. Registration challenge expiry/replay and authentication challenge expiry/replay are checked server-side; credential updates are serialized.
- Default account UI/server is passkey-first. New users do not enter email/password/phone. Normal sign-in uses navigator.credentials.get() with no allowCredentials/account identifier. The local default disables all legacy email/password, email verification and password-reset routes and does not load an SMTP sender. Historical password tests must opt in explicitly.
- Initial registration creates a one-time 256-bit random recovery key with prefix/version marker. The key is shown once alongside the account identifier. The database stores only a per-key 16-byte random salt and 32-byte SHA-256 verifier.
- Recovery is a restricted ceremony: the user submits account identifier plus unused recovery key, completes a new WebAuthn registration, and the server atomically consumes the old key, disables previous passkeys, revokes all sessions, inserts the replacement credential, creates the next recovery-key version and records an audit event. The replacement key is shown once.
- The UI blocks entry to the dashboard until the user acknowledges saving the one-time recovery material. The hosted HTML preview remains read-only and non-authenticating.
- The account-level wallet backup is not yet implemented. The current EVM/SIWE wallet flow remains a distinct administrator authenticator/step-up, not a substitute for ordinary account recovery.

### Verification boundary

Automated API tests exercise the server-side credential and recovery lifecycle; some tests deliberately mock the cryptographic verification verdict to isolate API/database state transitions. The headless Chrome test uses a virtual authenticator to exercise actual browser WebAuthn registration, discoverable sign-in and passkey replacement. A successful run is still limited to this CI browser environment. As of this record the latest CI jobs are running; record their final conclusions and commit SHA in the active audit before describing this exact head as passing.

No public service, production database, paid identity provider, email/SMS provider, live wallet, blockchain transaction, production RP ID or deployment was configured. PR #141 remains draft, open, unmerged and undeployed.
