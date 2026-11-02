# User and Administrator Accounts — Requirements and Threat Model

**Document ID:** ACW-ACCOUNT-REQ-001  
**Date:** 2026-10-26  
**Status:** ACTIVE DESIGN / DEVELOPMENT-ONLY — NOT A PRODUCTION AUTHORIZATION  
**Parent work:** [PR #141 — account entry and optional-wallet lab](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)  
**Architecture source:** [Authentication Separation and Recovery Decision](../audit/Active/2026-10-21-Authentication-Separation-and-Recovery-Decision.md)  
**Long-term context:** [Account Continuity and Privacy-Preserving Access Roadmap](ACCOUNT-CONTINUITY-AND-PRIVACY-PRESERVING-ACCESS-ROADMAP.md)

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
7. Admin access is not self-service. There must be no public “Sign up as admin”, first-user privilege, client-side role toggle or promotion because an address connected first.
8. Administrator wallet policy: up to three registered wallets; a valid proof-of-control signature from any one enrolled wallet can satisfy the wallet step for an already-authorized administrator. This is **one-of-N alternative access**, not a 2-of-3 multisignature transaction. The server must also authenticate the ordinary account and confirm its existing admin role.
9. Losing all enrolled admin wallets requires a formal recovery request to the Imperial HSIAN authority (the owner and/or a specifically authorized NOVA-governed process). NOVA may collect evidence and execute only expressly authorized actions. It must not independently promote itself or an unverified claimant.
10. The browser preview is memory-only and disposable; the local SQLite server is loopback-only. Neither is production authentication. New accounts default to the server-owned `user` role and registration ignores role/admin flags. A local owner-operated CLI can provision an existing test account and up to three wallet addresses; a fresh SIWE signature from one registered wallet then provides a maximum ten-minute step-up on the already-authenticated account session. The backend rechecks role and wallet registration, binds the challenge to the account/session, rejects replay and cross-session use, and withholds the admin-status response until the step-up is active. The UI offers a separate read-only admin console and only fetches the current account's public registered-wallet options after the user explicitly requests administrator access. There is no public role/wallet provisioning endpoint, in-app wallet enrolment/removal, production admin operation, or all-wallet-loss recovery. Root/production website files remain unchanged.

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
- **Administrator:** server-side role grant plus verified enrolled-wallet step before entering admin functions; only receives defined administrative permissions.
- **Owner / recovery authority:** narrowly provisioned authority for bootstrap and exceptional admin recovery. Do not make the routine application role capable of silently promoting accounts.

Avoid introducing Editor, Publisher, Security Administrator or other subroles until an actual feature requires those distinctions. When an admin function does require differentiated access, use explicit least-privilege permissions rather than a single all-powerful client flag.

### Administrator wallet enrollment — provisional implementation default

The owner's established rule sets a maximum of three wallets and says any one enrolled wallet can provide admin access. The earlier decision record recommends registering at least two wallets before enabling full administrator access, but notes that the minimum has not been finally settled. For implementation planning, **propose requiring at least two independently controlled wallets before activation**, with a third encouraged. Do not treat this minimum as a final user-approved choice until confirmed in the governance decision before production. Wallets sharing the same seed, same lost device or same recovery channel may fail together.

Each wallet enrollment must require:
1. existing authentication and a server-confirmed admin role;
2. explicit user-initiated challenge/signature using a reviewed SIWE/EIP-4361 flow or another verified wallet protocol;
3. server-side validation of domain/origin, nonce, expiration, address, chain/message constraints and signature;
4. a record of enrollment/revocation that does not contain a private key or recovery phrase;
5. a notice and an audit event; and
6. a rule that no wallet signature can create or expand a role.

For admin access, require ordinary account authentication **and** a fresh valid signature from one of the account's enrolled wallets. Critical actions (role changes, new-wallet enrollment/replacement, changing recovery/ownership authority, publishing sensitive content or security settings) require reauthentication/step-up as defined in the final threat model. Revoke previous admin sessions after recovery or role changes.

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

- No public admin registration.
- An existing account is granted admin role only by the authorized provisioning process, with actor, target account, reason, evidence, timestamp and resulting permissions recorded.
- Bootstrap the initial owner/admin deliberately; no “first login wins” or “first wallet wins”.
- Production roles must come from trusted backend data, never frontend JavaScript, query parameters, local storage, form inputs or email address patterns.
- Tests must prove a normal user cannot create an admin role or access an admin endpoint by editing requests.

### 5.2 Admin access and dashboard

- Normal sign-in authenticates the underlying account first.
- The backend checks the existing role and requires a fresh signature from one of up to three wallets already enrolled for that administrator.
- The Administrator dashboard is a separate `#admin` workspace dedicated to administrative duties. It is not the regular user workspace with extra buttons and is not a replacement for the User dashboard. The User dashboard (`#account`) remains available to administrators for their own member activity and transactions under ordinary user rules. It contains the one role-gated **Open administrator dashboard** entry, and the Administrator dashboard provides **Return to user dashboard** navigation. All administrative read and write endpoints enforce authorization server-side.
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
- [x] Add owner-operated local CLI provisioning/revocation with explicit confirmation and audit reasons; no public role-provisioning API.
- [x] Store a maximum of three administrator wallet addresses per account; require an existing administrator role and ordinary account session plus a fresh signature from one enrolled wallet.
- [x] Bind short-lived challenges to the account and exact session; reject expired/reused challenges, cross-account/session use, unregistered wallets and invalid signers.
- [x] Add a maximum ten-minute administrator step-up and a separate administrator view; server endpoints independently enforce administrator authorization.
- [x] Require an active verified administrator step-up and a separate signature from the proposed wallet before enrolling an additional wallet; adding a wallet invalidates the previous step-up.
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
- The local server owns account roles and defaults registrations to `user`. An owner-operated local CLI provisions existing test accounts. The linked SIWE wallet lab supports up to three administrator wallets and a short-lived, session-bound administrator step-up; it does not provide production provisioning, production administrator governance or all-wallet-loss recovery.
- A local case-management/recovery-request prototype is also present; its local test behavior must not be confused with a staffed production support operation or the formal Imperial HSIAN recovery procedure.
- The separate `development/auth-prototype/` remains an isolated SIWE/EIP-4361 experiment and is not the authority for account roles.
- The current public-host homepage/root publication path remains a separate deployment gate; a prototype test does not prove public account service deployment.
- No production authentication, legal, security or recovery capability may be inferred from the prototype CI result.

## 11. Next action

Continue the common User dashboard as the member workspace for both ordinary and administrator accounts. Add member services and transactions only when their backend behavior, authorization, confirmations and user-facing controls are implemented and tested. Keep the Administrator dashboard separate and limited to explicit administrative capabilities. Complete the remaining security assurance, threat-model and production gates before any public activation. Keep PR #141 in draft until the current-head verification and review gates are satisfied.
