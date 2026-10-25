# Active Navigation Plan — User and Administrator Accounts

**Date:** 2026-10-26  
**Status:** ACTIVE — Phase 1 implementation on the existing development-only draft branch  
**Repository:** ACROWN-System/AstroCrown-Web  
**Branch:** `docs/provider-independent-wallet-auth-plan-2026-10-20`  
**Related draft:** [PR #141 — familiar email account entry and optional-wallet lab](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)  
**Requirements:** [User and Administrator Account Requirements](../../account-continuity/USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md)

## 1. Objective

Continue the user-account and administrator foundation using the smallest safe implementation increments. Preserve ordinary email/password access as separate from optional wallet functions, create a modular user account hub, and establish server-enforced administrator access requirements without pretending that a prototype is production authentication.

## 2. Source-of-truth decisions

- Ordinary users can sign up/log in without a crypto wallet or external identity provider.
- The current test prototype uses invented data only; email ownership verification, password reset, marketing delivery and production authentication are not implemented.
- The user account hub and administrator dashboard are separate. Admin role is a backend authority, never a client-side flag or consequence of a wallet simply connecting.
- Admin access requires an already authorized account and a fresh signature from any one of up to three registered wallets. The minimum number of enrolled wallets before activation remains provisional; the prior decision recommends at least two.
- Loss of all admin wallets uses the Imperial HSIAN recovery authority with audited human/governed approval. NOVA cannot silently promote itself or an unverified claimant.
- The account success popup, circular signed-in header control, standalone account hub route, and separate Security assurance link are Phase 1 UX requirements.
- Security assurance must describe exact prototype evidence and missing controls; it must not claim certification, production readiness or general security.

## 3. Current state

- PR #141 already contains a familiar Log In / Sign Up interface, optional Referral ID, independent crypto-news preference, required development Terms/Privacy acknowledgement, browser-memory preview, local loopback SQLite server, password hashing, session cookie handling and automated tests.
- A separate `development/auth-prototype/` lab demonstrates local EIP-4361/SIWE wallet proof-of-control, but it is not connected to account roles and does not authorize admin access.
- Phase 1 now has a separate prototype Security assurance page, success popup, modular user account hub and six built-in avatar choices. The local database has a server-owned role field; registration cannot assign `admin`.
- The admin development increment reuses the shared SIWE verifier, adds a local owner-operated provisioning/revocation CLI (no HTTP provisioning endpoint), stores up to three registered public wallet addresses, and requires a fresh server-issued SIWE signature from one enrolled wallet on an existing authenticated account session. The step-up lasts at most ten minutes, is bound to the account/session and is rechecked by the backend. The separately gated admin console can enroll an additional wallet only after an existing admin step-up and a distinct new-wallet signature; enrollment clears existing step-up state. The console has no wallet-removal UI, publishing or other business-admin actions.
- Python tests cover successful step-up, role assignment without step-up, replay, wrong signer, unregistered wallet, cross-session replay attempts, the three-wallet limit, global wallet uniqueness, revocation clearing privileged sessions, and audit events. The code/test revision `b1687845b00888ca4f5b3038138ba42f00c4f817` passed all five tracked automated workflows on 2026-10-26 local time; details are recorded in Section 6. Any later branch-head change still requires verification against that exact head.
- Still not production: email delivery/verification/reset, production identity/session infrastructure, user-session management UI, wallet-removal UI, admin publishing/role-change/business operations, all-wallet-loss Imperial HSIAN recovery, independent security review and production deployment.
- Root/production website files remain unchanged. The authoritative public deployment route remains a separate prerequisite before production integration.

## 4. Phase 1 work in this block

1. Add and index this account requirements/threat-model register.
2. Add a separate Security assurance page that accurately describes the local prototype and explicit production blockers.
3. Serve that page in the local loopback prototype and link it from sign-in/sign-up/recovery.
4. Add the post-authentication success state with close control and **Open your account** action; closing does not sign out.
5. Change the signed-in header control to a circular icon/avatar control with no visible “Account” label.
6. Add a modular account hub with six built-in avatar choices; validate avatar identifiers on the server and persist only the chosen built-in ID. Do not support image uploads or external image URLs.
7. Add the server-owned role baseline: new accounts default to `user`, client-supplied role flags are ignored, and a role assignment alone never authorizes administrator access.
8. Update and extend browser and HTTP tests, then run exact-head automated verification.
9. Keep PR #141 in draft; do not modify production/root homepage authentication or deploy to public routes.

## 5. Administrator implementation status and remaining work

The development-only increment is now implemented and regression-tested on the recorded code/test revision:

- New accounts are assigned the server-owned `user` role. Registration does not accept a role grant, and the local owner-operated CLI is the only implemented role/wallet provisioning path; there is no network provisioning endpoint.
- The standalone SIWE lab remains available under `development/auth-prototype/`. The account prototype reuses its pinned verifier core only for the separate privileged wallet step-up; normal sign-in still does not load a wallet or require a wallet signature.
- Admin access requires an already authenticated account with an already provisioned `admin` role and a fresh signature from one of up to three registered wallets. The challenge is bound to the account and ordinary session; replay, wrong-signature, cross-session and unregistered-wallet cases are rejected. The step-up lasts at most ten minutes and never authorizes a blockchain transaction.
- Adding an additional wallet requires a currently authorized admin session and a separate fresh signature from the proposed wallet. The operation is audited in the local SQLite database and clears all active admin step-ups for that account. The fourth wallet and a wallet already registered elsewhere are rejected.
- `/api/admin/status` returns a denial unless the server confirms that the admin role and fresh wallet step-up are both valid. The ordinary account session remains separate and can remain signed in when privileged step-up is ended.
- The admin console is a prototype, not a business-administration tool. It does not publish content, change roles, remove wallets or perform payments.

Still blocked or not implemented:
- The proposed requirement to enroll at least two independently controlled wallets before production admin activation is not yet a final governance decision and is not a production gate in this prototype.
- In-app session management, wallet removal/replacement, exceptional all-wallet-loss recovery through Imperial HSIAN, production owner/recovery authority, and high-impact admin business actions remain unimplemented.
- Local SQLite audit rows are useful test evidence but are not a tamper-resistant or immutable production audit service.
- Negative tests cover the main server-side role and wallet boundaries, but do not by themselves establish resistance to every production attack vector.
- Independent security review, production hosting/storage, verified email and reset delivery, legal/privacy approval, recovery operations and authoritative public publishing verification remain blocked.

Do not promote or deploy this prototype. Wallet signatures prove control of a registered address only; they do not create account identity or grant a role.

## 6. Exact-head verification and remaining manual checks

The code/test revision `b1687845b00888ca4f5b3038138ba42f00c4f817` completed all five tracked workflows successfully:

- [Local Account Continuity Prototype Tests #146 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40244036177): Python/HTTP account-contract tests, account-role/admin-step-up regression tests, static UX/security guards, and headless Chrome browser smoke test.
- [Local Wallet Authentication Prototype Tests #174 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40244036179): standalone loopback SIWE lab, dependency/validation tests and browser smoke test.
- [NOVA RSI Engine CI #872 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40244036212).
- [External Review Pipeline CI #429 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40244036206).
- [NOVA RSI CodeQL Security Analysis #439 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40244036181).

The account test run initially exposed two mismatches: GET authorization errors escaped the HTTP handler rather than returning JSON, and tests expected a successful admin-status response without step-up. The handler now serializes expected `ApiError` responses; the tests assert 403 for unverified admin access, verify that ordinary account access remains active, re-authenticate before the one-time enrollment-challenge replay check, and ensure a rejected replay does not destroy an unrelated valid step-up. The updated exact-head suite passes.

Manual/independent gates still open: review the complete current diff; visually inspect the updated development preview; confirm accessibility at high zoom and by keyboard/screen reader; review the detailed threat model and dependency supply-chain posture; and keep production/email/legal/recovery/publishing gates blocked. A green prototype CI run is not a security certification or production readiness claim.

## 7. Phase exit criteria

Phase 1 may be described as implemented on the development branch only after exact-head Python and browser tests pass and the complete diff is reviewed. The prototype still remains a prototype after those tests pass.

Production authentication stays BLOCKED until at least:
- authoritative website/source and origin (AUTH-001) is resolved;
- production hosting/storage/HTTPS/session controls are chosen and tested;
- verification/reset/recovery, privacy, consent, data lifecycle and incident processes are implemented;
- admin role provisioning, wallet authorization and all-wallet-loss recovery are independently reviewed; and
- a production security review and separate promotion decision are complete.

## 8. Impact analysis

**If completed:** the user can test a more complete account journey while the team records the correct trust boundaries; the next admin work will have clear requirements and negative tests, reducing the risk of building role elevation into UI-only or wallet-connection code.

**If not completed:** the current prototype remains a limited registration/login dialog with no account hub, no separate security assurance page and no administrator role design integrated into a tested implementation sequence.

## 9. Preservation

This work is confined to development files and the existing draft pull request. It must not update the root homepage, remove or overwrite backups, deploy an authentication service, use real credentials, or change the wallet-first direction of any unrelated system.

## 10. Role-aware administrator entry and confirmation dialog — 2026-10-26

### Decision and visible behavior

- The account hub renders the **Administrator access** section only when the latest server-owned account state reports `adminRoleAssigned === true`. A normal `user` account renders no administrator section, button or disabled placeholder.
- The server-assigned role, not the email pattern, browser storage, wallet connection or client state, determines visibility. The UI condition is a convenience only; the backend remains authoritative.
- Every server-reported admin account receives an administrator entry action, including an account with no enrolled wallet. The section explains whether a wallet step-up is required or whether a wallet is not yet provisioned.
- Clicking the entry opens a dedicated confirmation dialog. Nothing requests a wallet until the user chooses **Continue to administrator access**; **Cancel**, the close control, Escape or backdrop dismissal returns the user to the account hub without opening a wallet prompt.
- After Continue, the existing access routine re-fetches `/api/account/status`, checks authentication and the server-owned admin role, and then obtains that account's registered wallet list. If the server says the current session already has a valid step-up, the console route is still revalidated by the backend; otherwise a registered wallet and fresh signature are required.
- The separate wallet-signature review dialog continues to show the exact SIWE message before signature approval. The signature is proof of control only; it does not submit a transaction, create a role or replace account authentication.
- If an administrator role has been revoked while a page is open, a subsequent status refresh hides the entry. Any stale visible action remains unable to bypass server-side role, session, wallet-registration or step-up checks.

### Regression coverage added

- Browser coverage asserts that an ordinary account has no administrator card, and that direct navigation to the admin route does not open the console or prompt for a wallet.
- A browser-test-only response fixture simulates a server status response for an already assigned admin role to verify that the conditional entry appears, opens the confirmation dialog, and can be cancelled without requesting a wallet. The fixture is not account provisioning and does not grant server privileges.
- After removing that test fixture, the browser test refreshes the real local account status and checks that the administrator section disappears for the regular account.
- Existing Python/HTTP tests continue to cover registration role-escalation attempts, role-without-step-up denial, fresh-wallet challenge validation, account/session binding, challenge replay, wallet enrollment limits, audit events and revocation.
- Exact branch head `d407e3806701e7aba658ab8d23e4daea78f05a43` passed all five tracked workflows:
  - [Local Account Continuity Prototype Tests #155 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40246317983), including the headless-browser regression for role-based visibility, opening/cancelling the administrator confirmation dialog without a wallet prompt, and hiding the admin section after the authoritative status reverts to a regular user.
  - [Local Wallet Authentication Prototype Tests #183 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40246318006).
  - [NOVA RSI Engine CI #881 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40246318035).
  - [External Review Pipeline CI #438 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40246318082).
  - [NOVA RSI CodeQL Security Analysis #448 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40246318113).
- The browser test uses a temporary response fixture solely to test UI rendering for a server-reported admin role; it does not create a persistent admin role or prove successful real-wallet signing. Existing HTTP tests remain the evidence for server-side role and wallet authorization.

### Impact analysis

**If completed:** administrators can discover a clear, separate entry within their ordinary account, while regular users see no admin control. An explicit confirmation step prevents a click alone from launching a wallet request and keeps role discovery separate from proof of wallet control.

**If omitted:** an administrator entry can be difficult to discover, and wallet interaction may begin immediately after a button click instead of first explaining the action. Neither state may weaken server-side authorization.

### Preservation

Development-only change under PR #141. No public homepage deployment, production authentication, server-side admin provisioning endpoint, public role creation, transaction signing or production permission is added. Keep PR #141 draft and unmerged.
