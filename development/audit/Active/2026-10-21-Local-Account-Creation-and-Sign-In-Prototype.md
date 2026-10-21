# Active Navigation Plan — Local Account Creation and Sign-In Prototype

**Date:** 2026-10-21  
**Status:** IMPLEMENTED ON DRAFT BRANCH; exact-head backend and browser checks required before user handoff; production use BLOCKED  
**Repository:** ACROWN-System/AstroCrown-Web  
**Branch:** docs/provider-independent-wallet-auth-plan-2026-10-20  
**Primary requirement source:** PR #132 — Account Continuity and Privacy-Preserving Access Roadmap  
**Authentication decision:** Authentication Separation and Recovery Decision  
**Provider research:** Sign-In Provider Research and Onboarding Plan

## 1. Goal

Make the development homepage's Account button open an accessible, working local account-creation and sign-in dialog so the owner can test the first-time and return-user experience before selecting production technology or providers. This is a functional local prototype, not production rollout. It deliberately avoids fabricated external-provider sign-in.

## 2. Requirements carried forward from PR #132

- Separate account, authenticator, recovery capability, person eligibility, wallet, roles, payout destination and legal eligibility; none is inferred from another.
- No mandatory biometric; no wallet required for ordinary account sign-in.
- Account creation and everyday sign-in should be familiar, require minimal data, and work without mandatory email.
- Recovery instructions should be shown before the user needs them; support one-time recovery material and an accessible recovery route.
- Account recovery must not automatically change privileges, payout destinations, wallet ownership or sensitive-data access.
- Do not block users merely because they use Tor/VPN or changed device; network or device identity is not account identity.
- Keep development prototypes separate from the public/root production site; follow the Development & Audit Convention and mark missing gates BLOCKED.

## 3. Implemented local behavior

- The header's Account button opens a modal with Sign in / Create account choices.
- The prototype uses username plus password/passphrase, no email, no wallet and no external social provider. Provider buttons are withheld until the actual integrations and policy/cost qualification are complete.
- Account creation generates eight one-time recovery codes. The user can copy/download them, confirm they saved them, or deliberately skip; skipped unconfirmed codes are deleted and recovery remains unconfigured.
- Sign-in creates an opaque local session. Sign-out revokes it. Password recovery consumes one enabled recovery code, changes the password hash and revokes all existing sessions.
- Recovery-code replacement requires the current password; the old set is invalidated before the new set is enabled.
- The local server binds only to 127.0.0.1, serves only the development homepage and explicitly permitted prototype assets, requires exact localhost Host/Origin on API writes, bounds JSON body size, avoids credential/recovery secrets in logs, and uses Python standard-library components only.
- The default database is in the user's profile, not the repository, and persists across server restarts.
- The UI says it is local-development-only, does not connect providers or a wallet, and grants no admin role.

## 4. Explicit exclusions

- Google, Apple, X, Facebook, LinkedIn, GitHub/OIDC and other hosted identity integrations.
- Passkey/WebAuthn implementation.
- Production admin access and mandatory admin wallet enrollment (up to three wallets; any one accepted) or Imperial HSIAN recovery.
- Cloud storage, email/phone, real user data, roles, financial assets, publishing or production deployment.
- A claim of full NIST or OWASP conformance/certification. Password hashing, cookies, rate limiting and localhost origin validation are prototype controls requiring separate production security review.
- Full compromise resistance, distributed rate limiting, recovery notifications, audit retention, and account export/deletion.

## 5. Acceptance matrix

| ID | Criterion | Verification | Expected state |
|---|---|---|---|
| ACC-PROT-001 | Account button opens access dialog | Headless browser click | PASS required |
| ACC-PROT-002 | Registration works without email or wallet | HTTP + browser registration | PASS required |
| ACC-PROT-003 | Password is hashed; no raw password persisted | Source review and tests | PASS required |
| ACC-PROT-004 | Successful/failed sign-in | HTTP and browser integration | PASS required |
| ACC-PROT-005 | Sign-out invalidates session | Session tests | PASS required |
| ACC-PROT-006 | Recovery setup is explained at creation | UI inspection / browser smoke | PASS required |
| ACC-PROT-007 | Codes are single-use; password reset invalidates sessions | Integration test | PASS required |
| ACC-PROT-008 | Host/Origin and JSON size are constrained | Negative HTTP tests | PASS required |
| ACC-PROT-009 | Local-only listener and data location are documented | Source review and launch instructions | PASS required |
| ACC-PROT-010 | Ordinary prototype grants no admin role and uses no wallet/provider | UI/static test | PASS required |
| ACC-PROT-011 | Homepage/demo disclosures preserved | Diff review; no root website changes | PASS required |
| ACC-PROT-012 | CI and existing wallet-lab tests pass on exact commit | Exact-head GitHub Actions results | PASS required |

## 6. Owner test procedure

1. Clone or update the branch using the Windows PowerShell instructions in the prototype README.
2. Run the local Python server and open only http://localhost:8766/.
3. Click Account, open the dialog, create a synthetic test account, save recovery codes, sign out and sign back in.
4. Test password reset with one unused recovery code and verify that the code cannot be reused.
5. Use a test-only password; do not enter production credentials, recovery material, wallet secrets or personal identity documents.

## 7. Impact analysis

**IF this prototype behaves as expected:** the owner can assess whether the familiar account-first flow, recovery-code onboarding and modal interaction are understandable before an identity provider or passkey library is chosen. It supplies reproducible account-creation/sign-in/recovery evidence without cloud services or real user data.

**IF it is not tested before implementation expands:** AstroCrown risks choosing external-provider and production-hosting dependencies before verifying the user journey, while recovery may become an afterthought.

## 8. Promotion gate and outstanding work

The user-facing test is local and development-only. The public site/source/domain remain unverified (AUTH-001 BLOCKED). Google/OIDC, passkeys, admin wallet enrollment, Imperial HSIAN all-wallet-loss recovery, production password policy, deployed session/cookie security, provider costs, privacy/legal review, account export/deletion and production database selection remain unimplemented. Do not merge/deploy or state the account subsystem is production-ready merely because local prototype tests pass.
