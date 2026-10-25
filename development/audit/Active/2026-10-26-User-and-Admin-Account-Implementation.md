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
- Phase 1 now has a separate prototype Security assurance page, success popup, modular user account hub and six built-in avatar choices. Avatar changes use an allowlisted ID; arbitrary markup/URLs and uploads are rejected/not supported. The local account database has a server-owned role field defaulting to `user`, registration cannot set it, and admin remains unauthorized even if a role is separately assigned in the test database. There is still no production email delivery, account verification/reset, admin provisioning/role-change API, admin wallet registry, wallet-verified admin session, admin-recovery flow, production backend or production account service.
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

## 5. Admin phase remains separate

Do not implement a public admin registration route, fake admin toggle, client-controlled roles or an unreviewed privileged account bootstrap in Phase 1.

Next admin increment must document and test:
- server-owned role grants and default-deny role authorization;
- controlled initial Owner/Admin provisioning;
- normal account authentication plus a fresh signature from one enrolled wallet;
- maximum three wallets; independent custody, enrollment and revocation;
- the proposed minimum enrolled-wallet gate before production activation;
- step-up checks for high-impact admin actions;
- session revocation and immutable audit trail for role/wallet changes;
- Imperial HSIAN recovery after loss of all admin wallets; and
- direct API negative tests that a normal user cannot gain admin through registration, query parameters, local storage, connected-wallet events or email patterns.

Do not integrate the existing SIWE lab into the ordinary account server until its current exact head, dependency and challenge-validation behavior have been reviewed and the account-role boundary tests are prepared.

## 6. Verification plan

- Run existing Python account server tests.
- Run headless browser smoke tests for both the local-cookie path and memory-only hosted-preview path.
- Test success popup X/close behavior, persistence of the signed-in state after closing, CTA navigation to the account hub, return-to-home, signed-in header and built-in avatar state, avatar allowlist/authentication/persistence, sign-out and signed-out header state.
- Test that the Security assurance link opens the separate page and that all statements accurately identify the prototype-only status.
- Retest malformed/oversized request, incorrect or missing Origin/Host, throttling, failed password, invalid/expired/revoked session and logout invalidation.
- Confirm no test or implementation accidentally uses production credentials, sends email, calls external identity APIs, enables admin status, adds external provider dependencies or changes root files.
- Treat missing dependencies or unavailable browser tooling as BLOCKED; do not equate unavailable validation with PASS.

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