# Active Navigation Plan — User and Administrator Accounts

**Date:** 2026-10-26  
**Status:** ACTIVE — Phase 1 implementation on the existing development-only draft branch  
**Repository:** ACROWN-System/AstroCrown-Web  
**Branch:** `docs/provider-independent-wallet-auth-plan-2026-10-20`  
**Related draft:** [PR #141 — passkey-first account foundation and optional-wallet backup](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)  
**Requirements:** [User and Administrator Account Requirements](../../account-continuity/USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md)

## 1. Objective

Continue the user-account and administrator foundation using the smallest safe implementation increments. Adopt WebAuthn passkeys as primary account authentication, a user-held offline one-time recovery key, and optional wallet backup while preserving stable account/session/role boundaries. Do not treat the legacy email/password prototype as the adopted direction or pretend that a prototype is production authentication.

## 2. Source-of-truth decisions

- Every account uses a WebAuthn passkey as its primary authenticator and can be created without a crypto wallet, email address, password, SMS number or paid/external identity provider.
- The current local prototype still contains the previous email/password and email-token implementation; it is legacy development behavior. The new WebAuthn registration/sign-in and offline recovery-key flow are not yet implemented. No production authentication or live user account is qualified.
- A user-selected wallet may be enrolled as an optional additional account authenticator/backup, with a fresh purpose-bound off-chain signature. Wallet connection never creates an account or grants an administrator role. The user account hub and administrator dashboard remain separate; admin role is a backend authority, never a client-side flag.
- Administrator access requires a valid passkey-authenticated account session, an already authorized role and the existing fresh wallet step-up from an enrolled administrator wallet. The provisional wallet count and minimum remain governed by the existing requirements.
- Loss of all admin wallets uses the Imperial HSIAN recovery authority with audited human/governed approval. NOVA cannot silently promote itself or an unverified claimant.
- The account success popup, circular signed-in header control, standalone account hub route, and separate Security assurance link are Phase 1 UX requirements.
- Security assurance must describe exact prototype evidence and missing controls; it must not claim certification, production readiness or general security.

## 3. Current state

- PR #141 currently contains the legacy email/password Log In / Sign Up interface, optional Referral ID, independent crypto-news preference, development Terms/Privacy acknowledgement, browser-memory preview, local loopback SQLite server, password hashing, session handling and automated tests. These are existing prototype facts, not the approved authentication target.
- A separate `development/auth-prototype/` lab demonstrates local EIP-4361/SIWE wallet proof-of-control, but it is not connected to account roles and does not authorize admin access.
- Phase 1 now has a separate prototype Security assurance page, success popup, modular user account hub and six built-in avatar choices. The local database has a server-owned role field; registration cannot assign `admin`.
- The admin development increment reuses the shared SIWE verifier, adds a local owner-operated provisioning/revocation CLI (no HTTP provisioning endpoint), stores up to three registered public wallet addresses, and requires a fresh server-issued SIWE signature from one enrolled wallet on an existing authenticated account session. The step-up lasts at most ten minutes, is bound to the account/session and is rechecked by the backend. The separately gated admin console can enroll an additional wallet only after an existing admin step-up and a distinct new-wallet signature; enrollment clears existing step-up state. The console has no wallet-removal UI, publishing or other business-admin actions.
- Python tests cover successful step-up, role assignment without step-up, replay, wrong signer, unregistered wallet, cross-session replay attempts, the three-wallet limit, global wallet uniqueness, revocation clearing privileged sessions, and audit events. The code/test revision `b1687845b00888ca4f5b3038138ba42f00c4f817` passed all five tracked automated workflows on 2026-10-26 local time; details are recorded in Section 6. Any later branch-head change still requires verification against that exact head.
- Still not production: WebAuthn registration/authentication, recovery-key ceremony, production identity/session infrastructure, user-session management UI, authenticator/wallet removal UI, admin publishing/role-change/business operations, all-authenticator-loss recovery, independent security review and production deployment. Email/SMS verification/reset is not a required account-authentication service.
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
- Independent security review, production hosting/storage, WebAuthn and offline recovery implementation, legal/privacy approval, recovery operations and authoritative public publishing verification remain blocked. A mail provider is not an account-authentication prerequisite.

Do not promote or deploy this prototype. Wallet signatures prove control of a registered address only; they do not create account identity or grant a role.

## 6. Exact-head verification and remaining manual checks

The code/test revision `b1687845b00888ca4f5b3038138ba42f00c4f817` completed all five tracked workflows successfully:

- [Local Account Continuity Prototype Tests #146 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40244036177): Python/HTTP account-contract tests, account-role/admin-step-up regression tests, static UX/security guards, and headless Chrome browser smoke test.
- [Local Wallet Authentication Prototype Tests #174 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40244036179): standalone loopback SIWE lab, dependency/validation tests and browser smoke test.
- [NOVA RSI Engine CI #872 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40244036212).
- [External Review Pipeline CI #429 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40244036206).
- [NOVA RSI CodeQL Security Analysis #439 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40244036181).

The account test run initially exposed two mismatches: GET authorization errors escaped the HTTP handler rather than returning JSON, and tests expected a successful admin-status response without step-up. The handler now serializes expected `ApiError` responses; the tests assert 403 for unverified admin access, verify that ordinary account access remains active, re-authenticate before the one-time enrollment-challenge replay check, and ensure a rejected replay does not destroy an unrelated valid step-up. The updated exact-head suite passes.

Manual/independent gates still open: review the complete current diff; visually inspect the updated development preview; confirm accessibility at high zoom and by keyboard/screen reader; review the WebAuthn threat model and dependency supply-chain posture; and keep production/hosting/legal/recovery/publishing gates blocked. A green prototype CI run is not a security certification or production readiness claim.

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

## 11. Separate dashboard navigation and stable administrator entry — 2026-10-26

### Decision and implemented behavior

- Preserve two separate views: the ordinary account hub at `#account` and the privileged administrator dashboard at `#admin`. The admin view is not a group of extra controls mixed into the normal dashboard.
- Use one consistent entry button, **Open administrator dashboard**, inside the **Administrator access** section. It is present only when the latest server status confirms the account's existing administrator role. Normal users continue to see no administrator entry.
- Keep status information separate from the action label. The account hub explains whether the step-up wallet is verified, verification is required, or no administrator wallet is provisioned. The stable button label does not grant authority or imply that verification has already passed.
- The entry first opens the confirmation dialog. Cancel, Escape, close and backdrop dismissal do not prompt for a wallet. Continue rechecks the server-owned role/session and either reuses a still-valid admin step-up or starts the existing registered-wallet proof flow.
- The separate administrator dashboard is titled **Administrator dashboard** and has a **Return to your account** link. Returning does not itself end the short-lived admin step-up; **End administrator access** remains the explicit operation to clear it. Backend route and endpoint checks remain authoritative.
- No production/homepage behavior, backend authorization rules, privileged operation scope, public provisioning, secrets, wallet registry or deployment configuration was changed.

### Regression coverage and implementation evidence

- Browser smoke tests verify the stable button label, role-gated visibility, the no-wallet confirmation/cancel behavior, navigation into the separate dashboard when the test fixture reports an already-valid server step-up, return to the regular account hub, and hiding the admin entry when the simulated role is removed.
- The browser fixture replaces response payloads only within the test run. It does not provision an administrator, mutate the real role database, or simulate a wallet signature. Existing HTTP tests remain the evidence for actual role/step-up authorization boundaries.
- Implementation and test commit [`7bc59c65905fd961e591186a0158688b20bb0111`](https://github.com/ACROWN-System/AstroCrown-Web/commit/7bc59c65905fd961e591186a0158688b20bb0111) passed all five tracked workflows:
  - [Local Account Continuity Prototype Tests #157 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40274842957).
  - [Local Wallet Authentication Prototype Tests #185 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40274842817).
  - [NOVA RSI Engine CI #883 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40274842898).
  - [External Review Pipeline CI #440 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40274842909).
  - [NOVA RSI CodeQL Security Analysis #450 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40274842910).
- These results verify the development prototype and tests only. They do not establish production readiness, full security certification or successful real-wallet manual acceptance.

### Impact analysis

**If retained:** the role-qualified administrator has one obvious, stable entry point from the ordinary account hub, a clearly separate administrator workspace and a simple path back, while the server remains the source of authorization.

**If omitted:** the same route separation would remain possible, but labels would vary with session state and browser regression would not cover the full UI navigation loop.

### Preservation

Keep PR #141 draft and unmerged. The hosted browser preview remains an ordinary-user, memory-only demo; the admin route must be exercised through the local prototype and tested server responses. Production account infrastructure, the banner editor, role management, wallet-loss recovery and publishing remain separate blocked work.

## 12. Registering an existing account as administrator — 2026-10-26

### Decision and operational flow

- Do not add a separate public administrator sign-up form. Standard account creation remains open to normal users and always creates a server-owned `user` role, even if a client submits `admin`, `role`, wallet-authentication or permission fields.
- Administrator registration applies to an existing account. In this local prototype, the owner runs `development/account-continuity/prototype/provision_admin.py grant`, targeting the same account email and SQLite database used by the loopback server. The tool assigns `role = 'admin'`, enrolls one explicitly supplied public wallet and chain ID, invalidates any old administrator step-up state, and records the actor label, reason, target and timestamp in the local audit table.
- The account email locates the existing account; there is no additional administrator username/identity table. The UI recognizes the administrator from authoritative `/api/account/status` data (`adminRoleAssigned === true`), then shows the existing **Open administrator dashboard** entry after a status refresh or re-login.
- Role assignment is not sufficient for privileged access. The administrator must continue through the confirmation flow, where the backend rechecks the account/role and then requires a still-valid step-up or a fresh signature from a registered wallet. A role-assigned account without a verified step-up remains denied by `/api/admin/status`.
- The README now gives the local PowerShell sequence, explains pinned verifier dependency installation, warns to use the *same database path* as the server, distinguishes public wallet address from private secrets, shows registration and revocation commands, and explains the role-refresh and subsequent wallet-verification stages.
- The CLI's `--actor` is an audit label only, not proof of the operator's actual identity. The trust boundary is local operating-system/database access, appropriate only for this isolated prototype. A production implementation still needs a reviewed owner/bootstrap authentication and authorization mechanism, trusted role administration, protected/tamper-resistant audit records, notifications and formal recovery. No public provisioning endpoint is added.

### Regression coverage and exact-head evidence

- Added an integration test that creates an ordinary account over the loopback HTTP API, runs the actual provisioning script as a subprocess from outside the repository root against the same test SQLite database, and verifies the resulting signed-in account is reported as role `admin` with one active wallet and an audit record.
- The test explicitly verifies that role assignment does **not** authenticate the wallet, create an authorized admin step-up or make `admin` true. Existing negative tests continue to reject client-side role escalation and the nonexistent public provisioning route.
- Implementation/test commit [`c0691d9e053c982ee783bc343f0764210030d5d0`](https://github.com/ACROWN-System/AstroCrown-Web/commit/c0691d9e053c982ee783bc343f0764210030d5d0) passed account continuity tests [#160](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40278110654), wallet authentication tests [#188](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40278110401), NOVA RSI Engine CI [#886](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40278110403) and External Review Pipeline CI [#443](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40278110398). Its CodeQL run was superseded by the next documentation commit, so it is not counted as an exact-head CodeQL pass.
- Latest implementation-plus-instructions branch head [`8c0f10e60482d03a4e7a851ac68a4a35271ff36e`](https://github.com/ACROWN-System/AstroCrown-Web/commit/8c0f10e60482d03a4e7a851ac68a4a35271ff36e) passed all five workflows:
  - [Local Account Continuity Prototype Tests #161 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40278157749).
  - [Local Wallet Authentication Prototype Tests #189 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40278157598).
  - [NOVA RSI Engine CI #887 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40278157675).
  - [External Review Pipeline CI #444 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40278157714).
  - [NOVA RSI CodeQL Security Analysis #454 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/40278157591).

These checks validate the local development account flow and owner CLI integration only. They do not prove the named operator's real-world identity, production role governance, verified email ownership or production readiness.

### Impact analysis

**If completed:** an existing normal account can be promoted through an auditable, owner-operated local procedure, the server reports that role, and the same account hub reveals its administrator entry only after status refresh. A wallet signature remains a separate gate for actual admin access.

**If omitted:** the role-gated UI could be implemented correctly, but the owner would lack a clearly documented, tested procedure for making a real local account eligible to see that UI.

### Preservation

Development-only under PR #141. Keep draft and unmerged. Do not create a public admin-registration endpoint, do not infer authority from account labels or connected wallets, and do not use a memory-only browser preview as evidence that server-side role provisioning works. Production authority/bootstrap, WebAuthn, offline recovery-key lifecycle and all-authenticator-loss recovery remain blocked for separate review.


## 13. Shared User dashboard and separate Administrator dashboard — 2026-11-02

### Owner clarification and accepted direction

An administrator remains an ordinary AstroCrown member for all user-facing purposes. Administrator status is an additional authority capability; it must not replace, restrict or silently elevate the account's ordinary member capabilities.

There are exactly two authenticated dashboards/workspaces:

1. **User dashboard** (`#account` in the current prototype): the common member workspace available to every authenticated user, including administrators. It is the location for AstroCrown user-facing services, personal activity and the member's own transaction workflows as those services are implemented. Account profile, security, preferences and account-level controls remain part of this common workspace.
2. **Administrator dashboard** (`#admin`): a separate workspace for explicitly authorized administrative duties. It is available only after ordinary account authentication, a server-assigned administrator role and the required wallet step-up. It is not a substitute for the User dashboard and must not be used for an administrator's personal member transactions.

The sign-in/sign-up dialog is an account-entry mechanism, not a third dashboard. Preserve `#account` as the User dashboard route so the current account flow is not needlessly broken; update its visible name and purpose instead of introducing a third authenticated workspace.

### Permission and transaction boundaries

- A regular user and an administrator acting as a member must receive the same User dashboard features, eligibility rules, prices/fees, limits, transaction confirmations, risk controls and personal activity records.
- Personal transactions are initiated in the User dashboard and remain bound to the signed-in account's own user context. An administrator role does not grant a personal transaction bypass or authority to act as another member.
- The Administrator dashboard is reserved for administrative operations. Every administrative endpoint/action must independently enforce the server-owned role and required step-up; visibility of a UI control is not authority.
- No implicit impersonation or on-behalf-of-member action is allowed. A future support intervention would need its own narrowly scoped, visible, explicitly authorized and audited workflow.
- Moving between dashboards does not sign the account out. **Return to user dashboard** returns to the common member workspace; it does not itself revoke the short-lived administrator step-up.
- Do not add transaction buttons, balances, transaction history or service controls as decorative placeholders. The current account prototype has no real AstroCrown transaction subsystem or complete service catalog. Add those modules only with their actual backend operations, authorization, confirmations, records and tests.

### Development changes

- The `#account` page is now labelled **User dashboard** and its introduction explicitly identifies it as shared by regular users and administrators.
- A non-interactive **AstroCrown services** information card clarifies that future member services and transactions belong in this shared workspace, and that those transaction workflows are not implemented in this account prototype.
- The `#admin` page's navigation label is **Return to user dashboard**. Its notice explicitly distinguishes administrative duties from personal member activity/transactions.
- The ordinary User dashboard retains the role-gated **Open administrator dashboard** entry; regular accounts still do not see it.
- The browser test now asserts the User dashboard is available after registration, that its shared member-services area remains present after entering and returning from the Administrator dashboard, and that the two workspaces have distinct purposes. Existing server tests continue to cover role, session and wallet authorization.
- This is a local development and requirements clarification. No transaction service, payment, asset operation, production administrator function, public endpoint, or paid dependency is added.

### Acceptance criteria for later feature development

- [ ] Every user-facing service is surfaced in the User dashboard for ordinary and administrator accounts, unless a feature's independently approved eligibility rule says otherwise.
- [ ] Member transaction authorization does not treat the administrator role as a substitute for normal user-level confirmation or authorization.
- [ ] Administrative screens and endpoints remain separate and require explicit administrator authorization.
- [ ] A regression account with the administrator role can navigate to both dashboards and retain the same member-service access as a regular user.
- [ ] A regular user cannot discover or access the Administrator dashboard by direct route or endpoint manipulation.
- [ ] An administrator cannot silently perform a transaction as another member or bypass normal transaction limits and controls.

### Impact and preservation

**If retained:** administrators can participate in AstroCrown as ordinary members while performing administrative duties in a distinct, more strongly authorized workspace. The same account identity supports both capabilities without conflating their permissions.

**If omitted:** an administrator could be treated as an administrative operator only, losing access to ordinary member services, or user and admin features could become mixed in a way that weakens authorization and transaction boundaries.

All changes remain under `development/` in draft PR #141. No production homepage, live transaction system, account database, domain/DNS, backups, real wallet or external provider is changed.

## 14. Permissioned administrator appointment and wallet-gated entry — 2026-11-02

### Confirmed account lifecycle

- Every person first creates and signs in to an ordinary AstroCrown account and uses the shared User dashboard.
- Administrator status is an additional server-owned role granted only after the account exists. The intended grantor is another already-authorized administrator who holds the explicit `admin.roles.grant` permission; an administrator without that permission cannot appoint another administrator.
- The grantor cannot grant the role to themselves or use the operation to expand their own permissions. Revocation is separately permissioned with `admin.roles.revoke`. The initial owner/administrator is bootstrapped by the owner/Imperial HSIAN authority because no administrator yet exists to perform the first appointment.
- After the backend confirms the role grant, the Administrator access entry becomes visible in that same User dashboard. Ordinary users never see it.
- Selecting the entry starts the wallet step-up/enrolment path. The newly appointed administrator proves control of their own wallet; a granting administrator cannot establish that proof merely by entering an address. A fresh signature from one of up to three enrolled wallets then authorizes the short-lived administrator session and opens the separate Administrator dashboard.
- Wallet proof is not account creation, role assignment, a separate administrator account login, or a blockchain transaction. User account authentication remains the first step; wallet verification is the additional administrative-access step.

### Local prototype implementation and remaining boundary

The in-product workflow is now implemented in the loopback development prototype. The owner-operated `provision_admin.py` CLI remains an initial local bootstrap/test adapter; it is not routine appointment and its `--actor` value is an audit label, not authenticated identity.

- The server stores `admin.roles.grant` and `admin.roles.revoke` as distinct permissions. Appointment requires an existing authenticated administrator, active wallet step-up, the exact grant permission, an existing target `user` account and a reason. Self-grant and assignment of permissions not explicitly marked delegable to the grantor are rejected. Newly assigned permissions are non-delegable by default.
- Grant and revocation write audit records with actor, target, exact permission changes, reason and timestamp.
- Revocation requires its own permission; it disables the target's enrolled administrator wallets, deletes administrative permissions, changes the role back to `user` and clears privileged step-up sessions while preserving ordinary account sessions.
- The target account enrols its own first wallet through a one-time server-issued signature challenge after role assignment. That signature is not reused for access; a second fresh signature is required for the short-lived administrator step-up.
- The shared User dashboard displays the Administrator access entry only from server-confirmed role status. The separate Administrator dashboard exposes appointment/revocation controls only when the backend returns the corresponding permission.
- API regression coverage now exercises successful appointment, denied self-grant, denied appointment by an administrator without the grant permission, denied non-delegable permission transfer, target-owned first-wallet enrolment, cross-session/replay rejection, separate wallet step-up, permissioned revocation and preservation of ordinary account access. Browser smoke coverage checks the permission-gated controls.
- Current CI and security-analysis runs are being verified against the latest PR head; this audit update does not claim those runs have passed.

Production account identity, authenticated owner bootstrap, deployment, shared production storage, security/operational review and formal Imperial HSIAN all-wallet-loss recovery remain outstanding.

### Acceptance criteria — local loopback prototype

- [x] Regular registration always creates a `user`; no public admin registration exists.
- [x] Only another authenticated administrator with `admin.roles.grant` can grant the role to an existing account; an administrator without that permission is denied.
- [x] Self-grant and permission escalation are denied; grantor, target, permission changes, reason and timestamp are audited.
- [x] Role grant and wallet enrolment are separate; the target proves control of their own wallet.
- [x] The User dashboard entry appears only after server-confirmed role assignment.
- [x] First-wallet enrolment and a separate fresh wallet step-up are required before opening the Administrator dashboard.
- [x] Revocation requires its own permission, clears privileged access and preserves ordinary account access.

### Impact and preservation

This keeps ordinary account continuity independent from appointment to administrative authority and prevents a wallet from becoming an alternative route to obtain the role. Keep all work under `development/`, retain PR #141 as draft/unmerged/undeployed, and do not infer production readiness from local prototype behavior.

## 15. Verification record — 2026-11-02

The permissioned administrator appointment implementation and its test updates were verified on code/test head `66c3d9fa4c2b5ecf8843bdf6798468c4a4a883ad`.

| Workflow / evidence | Run ID | Result |
|---|---:|---|
| Local Account Continuity Prototype Tests | 41376648534 | PASS — 60 tests completed |
| Account entry-point and security-boundary checks | 41376648534 | PASS |
| Headless Chrome account-flow smoke test | 41376648534 | PASS — includes permission-gated administrator grant/revoke controls |
| Local Wallet Authentication Prototype Tests | 41376648528 | PASS |
| NOVA RSI Engine CI | 41376648543 | PASS |
| NOVA RSI CodeQL Security Analysis | 41376648588 | PASS |
| External Review Pipeline CI | 41376648561 | PASS |

The account workflow also completed Python and browser-JavaScript syntax validation. The first-wallet enrollment regression covers the target's own signature, cross-session rejection, replay rejection and the separate fresh administrator step-up. The appointment regression covers self-grant denial, a wallet-verified administrator without `admin.roles.grant`, non-delegable permission transfer, separate `admin.roles.revoke`, audit records and preservation of ordinary account access.

This record is tied to the stated code/test head. Any later changes to application or test code require a new verification record; documentation-only changes do not retroactively alter the result above. PR #141 remains draft, open, unmerged and undeployed. No production homepage behavior was changed. Production identity/governance, owner bootstrap authentication, hosting/deployment, independent security review and Imperial HSIAN all-wallet-loss recovery remain outstanding.


## 16. NOVA-native administrative operations smart account — owner-accepted architecture — 2026-11-02

### Decision

The owner confirmed that the programmable administrative smart account and its pre-execution transaction-validation mechanism are part of NOVA itself. The on-chain enforcement account/guard and the off-chain NOVA policy, monitoring, governance, audit and incident-response components form one NOVA-integrated security system. This is not a proposal to outsource administrative transaction security to an external wallet provider.

The architecture separates three functions:

1. **Administrator external identity/compensation wallet:** remains under the administrator's own control. It is used to prove wallet control for administrative authentication/step-up and may receive salary, service payments and bonuses through a separate payout process. It is not an AstroCrown organizational-funds wallet, does not own/control the NOVA operations account, and must never be used to hold NOVA operational funds. NOVA/AstroCrown must never obtain its private key or seed phrase.
2. **NOVA administrative operations smart account:** a separate, individually identifiable programmable account assigned to each administrator. It is a NOVA component, holds only minimum operational assets, and must enforce approved operations before execution through mandatory on-chain validation as well as NOVA's off-chain policy checks. It cannot directly control the treasury or expose an administrator bypass.
3. **AstroCrown treasury and protected recovery vault:** separate organizational custody. Recoverable operational assets are sent only to a predetermined protected recovery vault under pre-established constrained recovery authorization.

### One-violation policy

A deliberate prohibited operation submitted or approved by a currently authenticated, wallet-step-up-verified administrator is a qualifying violation even when the NOVA validator blocks the operation before execution. The same response applies as for a confirmed compromise:

- reject the prohibited operation before execution;
- suspend and unregister the NOVA operations smart account;
- revoke the administrator role and associated permissions;
- invalidate administrator sessions and outstanding delegated authorizations;
- remove the external wallet's association as an administrator authenticator, without taking control of that wallet;
- recover remaining supported operational assets through the account's pre-authorized constrained recovery path to the predetermined protected vault;
- keep the ordinary User dashboard available, remove the Administrator access entry based on authoritative backend state, and show the standard incident notice; and
- require formal security review and new authorization before reinstatement.

Attribution is limited to an authenticated administrator action or valid authorization from that administrator's approved administrative context. A third-party unauthenticated probe, forged request, ordinary transport failure or benign UI/network error is not by itself proof that the administrator attempted a prohibited transaction; such events must still be logged and investigated. This prevents a malicious outsider from trivially triggering an administrator's revocation.

Revocation does not confiscate the administrator's external wallet or earned compensation. That external address may remain a payout destination unless it is independently suspected compromised, in which case further payments are held pending separate verification. No claim is made that assets already transferred away or irreversibly consumed can always be recovered.

### Repository changes made under this decision

- Added [NOVA Administrative Smart-Account and Transaction-Enforcement Specification](../../account-continuity/NOVA-ADMINISTRATIVE-SMART-ACCOUNT-SECURITY-SPEC.md), Document ID NOVA-ACW-SEC-ADMIN-001.
- Updated [User and Administrator Account Requirements](../../account-continuity/USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md) to distinguish the external identity/compensation wallet, NOVA operations smart account and treasury/recovery vault.
- The new specification defines pre-execution off-chain and on-chain validation, fail-closed behavior, monitoring and reconciliation, one-violation response, dashboard notice, recovery limitations, governance controls, tests and release gates.

### Implementation status and preservation

This is an accepted architecture and requirements record only. It does **not** mean the NOVA smart-account contract, validator/guard, on-chain transaction engine, chain monitoring, operational asset-management path, emergency recovery or automated incident lifecycle has been implemented. PR #141's current loopback prototype continues to provide ordinary account/session handling, permissioned role appointment/revocation and external-wallet proof-of-control only.

Before real funds are deposited, later work must include offline model tests, test-chain/fork qualification, adversarial direct-call/module/upgrade/guard-bypass testing, replay and policy-drift testing, invariant/property tests, asset recovery/revocation tests, independent smart-contract review, chain/RPC failure drills and operational incident-response review.

No production homepage, production account backend, real wallet, treasury, organizational asset, domain, external provider or deployed contract was changed. PR #141 remains draft, open, unmerged and undeployed. This documentation-only update does not change the earlier application-code verification record for commit `66c3d9fa4c2b5ecf8843bdf6798468c4a4a883ad`.


## 17. Solana-first Devnet qualification direction — 2026-11-02

### Owner proposal and accepted development direction

The owner proposed using Solana as the likely AstroCrown blockchain and using Solana Devnet plus its free faucet/test SOL for zero-cost public-network testing. Recorded as the **preferred provisional chain candidate and first public integration target**, not a final Mainnet decision.

The development sequence is offline deterministic policy tests → local Solana validator/program harness → public Devnet integration with disposable test-only wallets and faucet SOL → separate Mainnet chain-selection and deployment authorization after technical qualification and independent security review.

### Solana-specific design corrections

- The NOVA administrative smart account must use Solana-native programs, instructions, explicit state accounts, PDAs and CPIs rather than presume Ethereum ERC-4337/EVM modules or transaction hooks.
- Per-administrator NOVA operations authorities/vaults may use program-derived addresses where appropriate. A PDA has no private key; the deriving program authorizes it through the runtime's PDA-signing mechanism in a CPI.
- The external administrator self-custody wallet is only an authentication/step-up wallet and may be a separately registered compensation destination. It does not hold organizational operational assets or control the NOVA operations vault.
- A technical limitation is now explicit: AstroCrown cannot prevent the owner of an ordinary external self-custody wallet from making personal transactions directly from that wallet. NOVA's enforceable no-personal-operations policy applies to NOVA-controlled operational assets and instructions routed through its program. A different custody/program-control design would be required to restrict the external wallet itself.
- Solana transactions are atomic: when any instruction fails, all state changes in that transaction are rolled back, although fees remain charged. The one-violation policy therefore needs a separately committed incident/revocation/recovery path; an instruction cannot write a revocation record and then return an error expecting the record to persist.
- A failed transaction alone must not be treated as proof of misconduct. The system must verify that a prohibited operation is attributable to an authenticated and wallet-step-up-verified administrator, and must handle off-chain preflight, dropped transactions, monitor downtime and ambiguous attribution.

### Documentation updates

- Expanded the NOVA administrative smart-account requirements in the linked AstroCrown specification with the Solana-native PDA/CPI model, external-wallet limitation, transaction atomicity and Devnet testing approach.
- Added section 14 to the User and Administrator Account Requirements.
- Added section 17 to this active audit record.
- NOVA PR #175 is being extended with a separate Solana Devnet qualification/test-asset policy and README index entry.

### Free-test-asset and safety rules

- Use local/offline deterministic tests first, preserving faucet allocations for tests that require a shared public cluster.
- Use Devnet-only disposable keypairs; never reuse Mainnet, personal compensation or production wallets.
- Verify the current cluster, RPC and signer before every write/deployment command.
- Official Solana documentation currently describes up to 5 SOL per CLI airdrop request; the public faucet currently displays two web requests per eight hours. These limits are subject to change and RPC/faucet rate limits.
- Devnet SOL is not real currency, cannot pay Mainnet fees and may disappear after ledger resets. It must not be represented as revenue, reserves, compensation or treasury assets.
- No paid RPC, paid faucet, relayer, Mainnet funding, real wallet, or external provider quota is authorized for this initial qualification.

### Current implementation boundary

Documentation and development planning only. No Solana program, PDA, Devnet wallet/keypair, faucet request, on-chain transaction, contract deployment, monitoring process or recovery execution was performed by this change. The existing local account implementation and its prior test evidence remain unchanged. PR #141 remains draft, open, unmerged and undeployed. The NOVA architecture PR remains a separate draft and requires its own review.


## 18. Supplemental Solana Testnet and multi-asset compatibility — 2026-11-02

### Owner suggestion and accepted development refinement

The owner identified that Solana Testnet may also be useful and that AstroCrown/NOVA must qualify compatibility with different asset types, not just faucet SOL. Accepted as a supplemental testing stage and a controlled multi-asset compatibility matrix.

### Correct distinction between Solana clusters

- Local validator/Localnet remains the primary environment for repeatable, deterministic and adversarial regression tests.
- Devnet remains the primary public application/program integration environment.
- Testnet is added for selected network-release, runtime/version, validator, stability and controlled stress/compatibility tests. Official Solana documentation describes Testnet primarily as a place for release and validator stress testing, whereas application developers are directed to Devnet.
- Testnet is not a replacement for Devnet and a Testnet pass does not prove Mainnet equivalence. Testnet faucet availability, limits and eligibility must be checked live.

### Asset compatibility approach

- Asset compatibility is tested by token program, mint configuration and asset standard, not by collecting arbitrary faucet tokens.
- Use controlled test mints/account fixtures separately on Localnet, Devnet and Testnet; a mint on one cluster is not automatically present on another.
- Candidate asset matrix includes native SOL, classic SPL Token, Token-2022 base mints, transfer-fee, transfer-hook, permanent-delegate, default-account-state/pausable, metadata and (after separate design) confidential-transfer configurations. NFT/asset standards are tested only when AstroCrown explicitly adopts them (potential examples: Metaplex Token Metadata, programmable NFTs, compressed NFTs and Metaplex Core).
- Record cluster, mint address, token program, decimals, extensions, authorities, purpose and build for each fixture. Do not identify assets by name, ticker, logo or URI alone.
- Token-2022 extension combinations can be incompatible and require creation-time planning. Unknown token programs, mints, extensions, hooks and asset standards fail closed.
- Local tests remain default; Devnet tests primary public app integration; Testnet repeats selected critical paths and network/runtime compatibility checks. Do not make every test dependent on public faucet supply.

### Repository changes

- Added Testnet and multi-asset compatibility requirements to the canonical NOVA administrative smart-account specification in AstroCrown-Web.
- Added section 15 to the User and Administrator Account Requirements.
- Added this audit section 18.
- Updated the related NOVA Test-Asset Policy and NOVA administrative architecture under draft PR #175.

### Verification and safety boundary

Documentation-only. No Testnet wallet, faucet request, test mint, transaction or contract deployment was created/executed by this change. No real asset, paid provider, Mainnet key or production system was touched. Universal asset compatibility is not claimed. PR #141 remains draft, open, unmerged and undeployed; its current account prototype continues to provide only local identity, role and external-wallet step-up behavior.

## 19. Defer Astro-Wallet while preserving a minimal account integration seam — 2026-11-02

### Owner direction recorded

- Keep present work focused on sign-up/sign-in, ordinary account/session continuity, the common User dashboard, server-confirmed Administrator access visibility, permissioned role appointment/revocation and the existing wallet-verified administrator step-up.
- Defer Astro-Wallet as a separate future product/research workstream. Its concept and security study do not authorize an implementation, SDK, key vault, multichain asset portfolio, key recovery, MPC/TSS or post-quantum feature in the account prototype.
- Do not add Astro-Wallet compatibility code now. The existing local wallet lab remains deliberately EVM EOA/SIWE-only; Bitcoin, Solana, EVM contract-wallet and other authenticator adapters remain future work.
- Preserve only minimal architecture seams: stable AstroCrown account IDs/sessions/roles are independent of blockchain addresses; wallet proof is an optional authenticator linked to an existing account and a defined purpose; EVM-specific parsing remains localized behind the wallet verifier/API boundary; account/dashboard code must not depend on a wallet brand or browser-provider global.
- Before future multi-family wallet support or production wallet persistence, review a versioned wallet-credential model with chain namespace/network, native canonical account identifier, proof protocol/version, lifecycle state and scoped uniqueness. A future multichain wallet application can expose multiple different chain credentials; one provider name must not collapse them into one address/identity.

### Current local implementation fact and limit

The current local SQLite `admin_wallets` table stores an EVM-style address and numeric chain ID. The local `wallet_auth_core.py` verifies Ethereum EOA-style addresses and EIP-4361/SIWE challenges only. These fields and implementation remain appropriate to the current loopback lab only; they are not a production/general multichain schema. No refactor is authorized now. A future production schema migration must preserve the existing account/session/role boundaries and audit history.

### Verification boundary

Documentation-only. No application code, tests, local wallet schema, provider dependency, wallet connector, key management, AW compatibility, payment, chain operation or dashboard behavior was changed by this decision. The current account and administrator dashboard scope remains active; Astro-Wallet research remains deferred in its separate architecture study. No PR was merged or deployed.


## 20. Adopt passkey-first account authentication and offline recovery — 2026-11-03

### Owner decision

The owner accepted replacing email/password-first authentication with a public-key model based on WebAuthn:

- WebAuthn passkey is the mandatory primary authenticator for new AstroCrown accounts. The private key remains with the user's authenticator; AstroCrown registers and verifies public credential material.
- A cryptocurrency wallet is optional. A user may separately enroll a wallet signature as a backup authenticator/recovery option. It does not grant roles and cannot replace the WebAuthn primary flow by implication.
- Generate a 128-bit-or-stronger CSPRNG offline recovery key. Display it once, store only a one-way verifier, rate-limit attempts, consume it once, then invalidate and replace it. The 128-bit target is a project-selected margin; NIST SP 800-63B-4 requires at least 64 bits for saved recovery codes.
- No email, password, SMS, paid identity provider or third-party authentication API is required for account registration, sign-in or recovery. The WebAuthn client still exchanges challenges with AstroCrown's own backend; this is first-party application traffic.
- Synced passkeys may depend on the user's platform sync provider. Device-bound credentials or a user-owned FIDO2 hardware key are alternatives where supported. A physical security key may have a user purchase cost; it is not a project-mandated expense.
- No staff/operator password reset, account impersonation or recovery-key override is permitted. Loss of all authenticators and the recovery key may result in permanent account loss.
- This authentication decision does not itself encrypt stored account data from application/database operators. Client-side/end-to-end encryption is a separate security design.

### Standards alignment and implementation conditions

- W3C WebAuthn Level 3 is a Recommendation published 2026-08-25.
- OWASP's Passkey Security Cheat Sheet requires maintained relying-party libraries and server-side ceremony verification, exact RP ID/origin controls, credential lifecycle protection and careful recovery.
- NIST SP 800-63B-4 (July 2025) provides current authenticator lifecycle and saved recovery-code guidance, including multiple authenticators, offline storage, hashed code storage, throttling and invalidation after use.
- These are engineering references, not certification or automatic conformance. Every requirement must be tied to implementation, tests and evidence.

### $0-first and migration boundary

- Use a maintained open-source WebAuthn relying-party library after license, maintenance, advisory, dependency and runtime review. Do not hand-roll CBOR/COSE parsing or cryptographic verification.
- Local development and tests must work without an external identity service or outbound provider calls. The browser's WebAuthn ceremony is local to its authenticator; the signed result is returned to the AstroCrown backend for verification.
- A public production deployment still requires HTTPS, durable backend storage, backups and operations. Free-tier availability and long-term $0 operation must be verified, not assumed.
- The current email/password local prototype, Mailjet adapter and email-token tests are legacy artifacts until the replacement implementation and acceptance tests are complete. Do not configure Mailjet/SMS to enable account authentication or recovery.
- Preserve the stable account IDs, roles, permissions, User dashboard, Administrator dashboard and separately scoped administrator wallet step-up. Keep the existing local EVM/SIWE verifier isolated; do not refactor the disposable wallet schema or implement Astro-Wallet as part of this change.

### Repository changes and status

- Added `development/account-continuity/PASSKEY-FIRST-ACCOUNT-AUTHENTICATION-AND-RECOVERY-REQUIREMENTS.md`.
- Updated `USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md` with the superseding decision and links.
- This audit update records design only. No passkey code, recovery-key code, database migration, new provider, production configuration, deployment or real-user account was created.
- PR #141 remains draft, open, unmerged and undeployed. The legacy prototype remains the current test implementation until a separately verified replacement is delivered.
