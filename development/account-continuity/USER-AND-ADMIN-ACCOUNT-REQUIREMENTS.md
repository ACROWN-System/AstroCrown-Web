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

1. Ordinary account entry uses a familiar **Log In / Sign Up** experience. Email and password are the initial UX. Email verification and secure reset delivery are not currently implemented.
2. Account creation requires email, password and explicit Terms/Privacy acknowledgement. Referral ID is optional. The crypto-news email preference is optional, separately consented and unchecked by default.
3. The sign-in screen must include a separate **Security assurance** link below the form actions and above the small explanatory text. It must not be conflated with Terms or Privacy.
4. After sign-up or sign-in, show a success state with a close button and a clear **Open your account** action. Closing the success state must not sign the user out. The header control then becomes a compact circular account/avatar control without its “Account” text label.
5. A normal user account hub/dashboard should be modular and independent of the homepage, with features added only when implemented. The normal user dashboard and administrator dashboard are separate.
6. Wallet access is optional for normal accounts and requested only when a specific feature needs proof of wallet control. A wallet address never grants an account role by itself.
7. Admin access is not self-service. There must be no public “Sign up as admin”, first-user privilege, client-side role toggle or promotion because an address connected first.
8. Administrator wallet policy: up to three registered wallets; a valid proof-of-control signature from any one enrolled wallet can satisfy the wallet step for an already-authorized administrator. This is **one-of-N alternative access**, not a 2-of-3 multisignature transaction. The server must also authenticate the ordinary account and confirm its existing admin role.
9. Losing all enrolled admin wallets requires a formal recovery request to the Imperial HSIAN authority (the owner and/or a specifically authorized NOVA-governed process). NOVA may collect evidence and execute only expressly authorized actions. It must not independently promote itself or an unverified claimant.
10. The current browser preview is memory-only and disposable; the local SQLite server is loopback-only. Neither is production authentication. Root/production website files remain unchanged by this prototype work.

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

### 4.3 Account hub/dashboard

The initial modular sections may include:

- **Overview:** account state and clear notices about unimplemented capabilities.
- **Profile:** minimal public/private account preferences; avatar customization is later work.
- **Security & sessions:** current authentication status, available recovery/reset capabilities and session-management functions only when backed by tested server operations.
- **Connected wallets:** empty by default, with context explaining that wallets are optional; never ask for a wallet in the ordinary sign-in flow.
- **Preferences:** separate newsletter consent and any future nonessential preferences.
- **Referral:** show an unverified value without reward/eligibility claims until real referral rules exist.
- **Privacy & data:** export/closure/deletion options only when their complete behavior is implemented and tested.

Do not show empty feature catalogs or clickable controls that do not work. The page should remain modular without inventing future products.

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
- The admin dashboard is a separate route/area and is not simply a user dashboard with more menu items. All read and write endpoints enforce authorization server-side.
- Start with the minimum needed admin function. The announcement/banner editor remains a separate development feature with its own permission model and release gates.
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

It must not claim “secure”, “fully protected”, certified, production-ready, or complete. At minimum, disclose that email verification/reset, production hosting/TLS, real role management, admin wallet integration, admin recovery and independent security audit are not implemented. Keep the page separate from Terms of Use and Privacy Policy.

## 7. Threat model

| Threat / failure | Required protection / verification |
|---|---|
| User self-assigns admin role | Backend-owned roles; no public role mutation; direct API negative tests |
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

### Phase 1 — Finish the development user journey
- [ ] Keep the existing Log In / Sign Up fields and tests.
- [ ] Add sign-in and sign-up security-assurance links.
- [ ] Add the success state and persistent signed-in header/avatar state.
- [ ] Create the modular user account hub and navigation back to the homepage.
- [ ] Clearly label email verification, password reset, avatar upload, wallet link and account closure as not implemented where appropriate.
- [ ] Keep browser preview memory-only and the local server loopback-only.

### Phase 2 — User lifecycle backend prototype
- [ ] Review the account DB/session schema and negative tests.
- [ ] Add a tested server-side account role model that defaults to ordinary user and cannot be set by registration input.
- [ ] Implement or explicitly block secure email verification/reset, session inventory/revocation and authenticator lifecycle. No fake mail delivery.
- [ ] Test access control, session fixation, CSRF/origin, rate limiting, user enumeration, XSS, invalid input, revoke/logout and recovery.
- [ ] Do not introduce a production email provider until $0/no-card conditions, data handling, deliverability and exit options are verified.

### Phase 3 — Admin-wallet and privileged recovery lab
- [ ] Integrate with the isolated SIWE lab only after reviewing its exact head, library and signatures.
- [ ] Model wallet enrollment/revocation separately from role assignment; max three wallets; one enrolled signature plus normal account authentication for admin entry.
- [ ] Resolve the minimum wallet count (provisionally propose two before activation).
- [ ] Create role provisioning/bootstrap and negative authorization tests; no public admin signup.
- [ ] Specify and test Imperial HSIAN recovery after all admin wallets are lost.
- [ ] Keep production admin authority blocked until independent review and exact-head tests pass.

### Phase 4 — Production decision
- [ ] Resolve AUTH-001: authoritative website/origin, backend route, storage, hosting and deployment ownership.
- [ ] Choose a maintained production runtime/storage/secret approach using the least complex suitable option and verified cost/terms.
- [ ] Complete production HTTPS/cookie/CSRF/security headers, email verification/reset, recovery, data retention/deletion/export, audit logging, notifications and incident procedure.
- [ ] Review legal Terms/Privacy, newsletter consent, user support and applicable jurisdiction requirements.
- [ ] Complete threat-model test suite, accessible/browser compatibility review and independent security review.
- [ ] Promote only through a separate verified pull request; never publish this prototype by copying it directly to the root homepage.

## 10. Current evidence and status

- Current draft PR #141 provides the familiar ordinary-account UI, a loopback SQLite test server, browser-memory preview mode, optional Referral ID, newsletter consent test field and Terms/Privacy draft links.
- Current prototype explicitly has no real email verification, password-reset delivery, newsletter sending, account role management, admin wallets, admin recovery or production hosting.
- Separate `development/auth-prototype/` is an isolated, local SIWE/EIP-4361 experiment. It is not linked to accounts or roles and does not authorize admin access.
- The current public-host homepage/root publication path remains a separate deployment gate; a prototype test does not prove public account service deployment.
- No production authentication, legal, security or recovery capability may be inferred from the prototype CI result.

## 11. Next action

Complete Phase 1 on the existing draft branch, with the Security assurance page clearly disclosing prototype limits. Then implement and test role-authority boundaries before any admin sign-in flow is integrated. Keep the PR in draft until the current-head verification and review gates are satisfied.
