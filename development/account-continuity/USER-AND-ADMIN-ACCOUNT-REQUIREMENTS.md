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

**Target principle:** ordinary users can create and use an account without owning or connecting a crypto wallet. Administrative authority is separately granted, checked by a trusted backend, and protected by a stronger wallet-verified step. Losing a wallet must not automatically destroy an ordinary user account; recovery of privileged authority is a separate high-risk process.

## 2. Decisions already established

1. Ordinary account entry uses a familiar **Log In / Sign Up** experience. Email and password are the initial UX. The **local development server** now implements email-verification and password-reset token issuance/consumption, single-use and expiry controls, token hashing, and session revocation after reset. An explicit Mailjet SMTP adapter and persistent quota guard are implemented, but no Mailjet account, sender domain, credentials or live delivery have been configured or qualified. The browser-only preview sends no email. None of this constitutes production email delivery.
2. Account creation requires email, password and explicit Terms/Privacy acknowledgement. Referral ID is optional. The crypto-news email preference is optional, separately consented and unchecked by default.
3. The sign-in screen must include a separate **Security assurance** link below the form actions and above the small explanatory text. It must not be conflated with Terms or Privacy.
4. After sign-up or sign-in, show a success state with a close button and a clear **Open your account** action. Closing the success state must not sign the user out. The header control then becomes a compact circular account/avatar control without its “Account” text label. The development prototype offers six built-in avatar glyph choices, validates the selected identifier on the server and stores it in the local test database or memory-only browser demo. Image uploads and production profile synchronization remain out of scope.
5. There are exactly two authenticated workspaces, with distinct purposes: (a) the **User dashboard** (`#account` in the current prototype), the ordinary AstroCrown member workspace for every signed-in account, including administrators; and (b) the separate **Administrator dashboard** (`#admin`), an additional workspace for administrative duties. The User dashboard must provide the same user-facing features, personal activity and transaction capabilities to an administrator as to any other user, under the same eligibility, pricing, transaction-confirmation, risk and account rules. Administrator status must not remove, reduce or silently elevate ordinary member functionality. Personal user transactions belong to the User dashboard and operate on the signed-in account's own user context; the Administrator dashboard must not silently impersonate a user or turn an administrative action into a personal transaction. Administrative permissions are separately enforced by the backend. After sign-in/status refresh, an **Administrator access** section and the single **Open administrator dashboard** entry button appear in the User dashboard **if and only if** the server confirms that the signed-in account already has the administrator role. A regular `user` account must not see the button or a disabled placeholder. The same entry button is used regardless of wallet-step-up state; status text explains whether verification is needed. It opens an explicit confirmation dialog; cancelling must not request wallet access. Continuing must recheck the server-owned role and ordinary session before either reusing a valid step-up or requesting a registered wallet and displaying the one-time signature review. The Administrator dashboard provides **Return to user dashboard** navigation; that navigation does not itself end the short-lived admin step-up. A stale UI entry is never authority: revocation must be enforced by the backend and the entry disappears at the next authoritative status refresh.
6. Wallet access is optional for normal accounts and requested only when a specific feature needs proof of wallet control. A wallet address never grants an account role by itself.
7. Administrator appointment is not self-service. There is no public “Sign up as admin”, first-user privilege, client-side role toggle or promotion because an address connected first. A person first creates an ordinary `user` account. A separate, already-authorized administrator may grant the administrator role to that existing account only when that grantor has the explicit server-enforced `admin.roles.grant` permission. An administrator without that permission cannot appoint another administrator. A grantor cannot grant the role to themselves or expand their own authority through the operation. The grant and revocation permissions are distinct (`admin.roles.grant` and `admin.roles.revoke`) and must be delegated narrowly. The initial owner/administrator is established only through a deliberate owner/Imperial HSIAN bootstrap because no existing administrator is available to do it.
8. **External administrator identity and compensation wallet:** up to three external administrator wallet addresses may be registered as alternative authenticators under the existing provisional model; the final minimum/recovery arrangement remains subject to governance approval. A fresh proof from one enrolled wallet can satisfy the wallet step-up for an already-authorized administrator. This is **one-of-N authentication**, not a 2-of-3 multisignature transaction. The external wallet is also an optional registered destination for that administrator's salary, service payments and bonuses through a separate payout workflow. It is user-controlled, is not an AstroCrown organizational-funds wallet, does not hold or control NOVA operational assets, and never grants a role or permission by itself. NOVA/AstroCrown must never obtain its private key or seed phrase. Authentication-wallet registration and compensation-destination registration are distinct data purposes, even when the same address is used for both.
9. **NOVA administrative operations smart account:** each administrator receives a separately identifiable programmable smart account as a native NOVA component. NOVA's on-chain transaction-validation and enforcement mechanism is part of NOVA itself and must reject prohibited, unknown or unverifiable operations before execution. The account holds only the minimum operational assets required for assigned duties; it is not the administrator's external wallet, payout address or AstroCrown treasury. It must be subject to NOVA's off-chain policy checks and mandatory on-chain enforcement, with no administrator bypass. The treasury and predetermined protected recovery vault remain separate.
10. Loss of all external administrator authenticators requires a formal recovery request to the Imperial HSIAN authority (the owner and/or a specifically authorized NOVA-governed process). Recovery of the NOVA operations smart account is a distinct, pre-authorized smart-account recovery path. NOVA may collect evidence and execute only actions permitted by those previously established controls; it must not independently promote itself or an unverified claimant.
11. The browser preview is memory-only and disposable; the local SQLite server is loopback-only. Neither is production authentication. New accounts default to the server-owned `user` role and registration ignores role/admin flags. The current local prototype uses an owner-operated CLI as a test/bootstrap adapter; its `--actor` value is only an audit label, not authenticated proof of an administrator's identity or permission. That CLI is not the intended production appointment workflow. In the intended product flow, a current administrator with the explicit `admin.roles.grant` permission grants the role to an existing user account. The role grant is separate from wallet enrolment: the newly appointed administrator must prove control of their own wallet when enrolling it, then use a fresh SIWE signature from one of up to three enrolled wallets to obtain a maximum ten-minute step-up on the already-authenticated account session. The backend rechecks the account role, required permission and wallet registration, binds the challenge to the account/session, rejects replay and cross-session use, and withholds privileged access until step-up succeeds. The User dashboard shows the Administrator access entry only after the server confirms the role grant; the entry starts wallet enrolment/verification as needed and then opens the separate Administrator dashboard. The browser preview remains memory-only. There is no production role-management endpoint, no production admin governance or all-wallet-loss recovery. Root/production website files remain unchanged.

## 3. Account concepts and permission boundary

Keep the following separate in both data model and code:

- **Account:** stable internal ID and account lifecycle; never inferred from a wallet address or email alone.
- **Authenticator:** email/password now in the prototype; later, individually registered WebAuthn/passkeys or other validated authenticators.
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
2. explicit user-initiated challenge/signature using a reviewed SIWE/EIP-4361 flow or another verified wallet protocol;
3. server-side validation of domain/origin, nonce, expiration, address, chain/message constraints and signature;
4. a record of enrollment/revocation that does not contain a private key or recovery phrase;
5. a notice and an audit event; and
6. a rule that no wallet signature can create or expand a role.

For admin access, require ordinary account authentication **and** a fresh valid signature from one of the account's enrolled external authentication wallets. This signature proves control of the authenticator; it does not authorize arbitrary blockchain transactions or bypass NOVA's operations-account policy. Critical actions (role changes, new-wallet enrollment/replacement, changing recovery/ownership authority, publishing sensitive content or security settings) require reauthentication/step-up as defined in the final threat model. Revoke previous admin sessions after recovery or role changes. Administrative blockchain operations must be requested through the separate NOVA operations smart account and pass its mandatory pre-execution validation.

## 4. Ordinary-user journeys

### 4.1 Registration

- Required email and passphrase; support long passphrases/password managers/paste. Keep the current 15-character minimum for a single-factor password route pending full implementation review.
- Explicit acknowledgement of the Terms and Privacy versions shown to the user.
- Referral ID optional and inert until its verification/anti-abuse policy is implemented.
- Newsletter opt-in separate, unchecked by default, version/timestamp recorded, with unsubscribe/suppression handling before any production email is sent.
- Production account must not be reported as email-verified until a real verification proof has been validated by the backend.
- Never imply that an email, password-reset message or newsletter message has been sent unless a qualified mail-delivery flow actually confirmed the action.

### 4.2 Sign-in and session

- Neutral authentication error messages; rate limit credential attempts and account creation.
- Use a reviewed, slow password hashing method and a unique salt. The local prototype uses Python PBKDF2-HMAC-SHA256 with 600,000 iterations as a development implementation; production algorithm choice and workload tuning remain to be qualified.
- Create a fresh, cryptographically random server-side session on successful authentication; do not reuse a pre-authentication session.
- Use HTTPS, Secure/HttpOnly/SameSite cookies in production, CSRF protections appropriate to the architecture, server-side session validation, documented inactivity and absolute lifetimes, revocation and safe logout.
- Avoid logging passwords, cookies, tokens, reset links, wallet signatures used as bearer secrets or recovery material.
- Let users view and revoke sessions where the capability is implemented. A UI-only “session list” is not sufficient.
- Require reauthentication before changes to authenticators, recovery destinations, email, or other sensitive account attributes.

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

- Normal email/password sign-in authenticates the underlying User account first. The user does not create a second administrator account or replace the User dashboard.
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

It must not claim “secure”, “fully protected”, certified, production-ready, or complete. The page must distinguish: (a) local prototype email-verification/reset token flows from an externally configured and inbox-tested delivery service; (b) local SQLite accounts/sessions and owner-operated role provisioning from production identity infrastructure; (c) the local SIWE administrator-wallet step-up from production administrator governance and recovery; and (d) automated tests from independent security review. Production HTTPS hosting, durable shared storage, qualified email delivery and operations, formal all-admin-wallet-loss recovery, approved legal policies and independent security review remain outstanding. Keep the page separate from Terms of Use and Privacy Policy.

## 7. Threat model

| Threat / failure | Required protection / verification |
|---|---|
| User self-assigns admin role | Backend-owned roles; no public role mutation; direct API negative tests |
| Administrator without appointment permission grants an admin role | Exact `admin.roles.grant` permission enforced by the backend; active wallet step-up; negative API test |
| Grantor self-promotes or expands own authority | Self-grant forbidden; only explicitly delegable permissions may be assigned; audited negative tests |
| Admin role is granted but UI hides or prematurely exposes admin entry | Entry appears only after server-confirmed role assignment; user wallet proof remains a separate gate |
| Administrator role changes ordinary-user capabilities or transaction rules | User dashboard is role-neutral; admin receives the same member capabilities and ordinary transaction controls; negative tests verify admin-only scope does not leak into member transactions |
| Administrator acts as another member | No implicit impersonation; any future support/intervention path requires a separately authorized, scoped, visible and audited workflow |
| Attacker steals password | Password hash, rate limit, safe session handling, optional future second authenticator, no password logs |
| Account enumeration | Neutral sign-in/reset responses and measured timing/rate controls where applicable |
| Session fixation or theft | New random session after auth, server-side validation/revocation, HTTPS Secure cookie, lifetimes, no-store and logout invalidation |
| CSRF / cross-origin request | Exact origin/CSRF controls suited to deployment; tests for missing/invalid origin and cookie behavior |
| Email/reset channel compromised | Reset is time-bound/single-use, session revocation, notifications and extra controls for sensitive changes; email alone never grants admin |
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
- OWASP Authentication, Password Storage, Session Management and Forgot Password Cheat Sheets.
- W3C WebAuthn Level 3 Recommendation (2026-08-25) as a candidate for later passkey work; do not force biometric-only UX.
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
- [x] Implement local email-verification and password-reset token flows, expiry/single-use enforcement, hashed token storage, neutral reset responses and session revocation after password reset.
- [x] Implement explicit provider selection and a persistent, atomic account-email quota guard; tests use a fake sender and do not contact an external provider.
- [x] Add tests for registration/login/logout, password changes, session revocation, email token handling, rate limits, administrator role boundaries and administrator wallet step-up.
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
- [ ] Complete production HTTPS/cookie/CSRF/security headers, email verification/reset, recovery, data retention/deletion/export, audit logging, notifications and incident procedure.
- [ ] Review legal Terms/Privacy, newsletter consent, user support and applicable jurisdiction requirements.
- [ ] Complete threat-model test suite, accessible/browser compatibility review and independent security review.
- [ ] Promote only through a separate verified pull request; never publish this prototype by copying it directly to the root homepage.

## 10. Current evidence and status

- Draft PR #141 contains the ordinary-account entry flow, the current User dashboard foundation (profile, security/session, wallet-information, preference and case-portal links), the separate Administrator dashboard, loopback SQLite server, disposable browser-memory preview, optional Referral ID, separately recorded newsletter preference, and Terms/Privacy development drafts.
- The User dashboard is the common member workspace for both ordinary and administrator accounts. The current account prototype does not yet implement AstroCrown financial transactions or the full catalog of user services; these must be added as member-facing modules without changing access merely because an account also has the admin role. Administrative operations remain separate.
- The local server implements email-verification and password-reset token flows; the Mailjet SMTP adapter and separate daily/long-window quota guard are implemented and covered with fake-sender tests. No Mailjet account, API credentials, verified sender domain, DNS records or real inbox delivery have been configured or qualified. Newsletter delivery is not implemented.
- The local server owns account roles and defaults registrations to `user`. The owner-operated local CLI remains a development-only first-admin bootstrap adapter. Routine in-product local appointment and revocation use distinct `admin.roles.grant` and `admin.roles.revoke` permissions, a fresh wallet-verified session, permission-specific delegation limits, target-account validation and audit records. The target enrols their own first wallet and then signs a separate step-up challenge. These local endpoints do not provide production provisioning, owner governance, production account infrastructure or all-wallet-loss recovery.
- A local case-management/recovery-request prototype is also present; its local test behavior must not be confused with a staffed production support operation or the formal Imperial HSIAN recovery procedure.
- The separate `development/auth-prototype/` remains an isolated SIWE/EIP-4361 experiment and is not the authority for account roles.
- The current public-host homepage/root publication path remains a separate deployment gate; a prototype test does not prove public account service deployment.
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
