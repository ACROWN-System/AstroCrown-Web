# Account UI and Local Interface Assets

**Status: development-only UI assets. This directory is not an account authentication server.**

The current ordinary account design is wallet-primary. The current server-side implementation and API authority live in `../worker/`; this directory supplies the approved static account and administrator UI assets to the Worker staging-site build.

## Build-consumed assets

- `account-prototype.css` — shared account interface styling.
- `account-ui.js` — ordinary account registration/sign-in presentation, wallet-primary API interaction, profile/member-name UI and User dashboard.
- `admin-wallet-ui.js` — separate administrator wallet enrollment/step-up presentation; it does not grant or create an administrator role.
- `terms-of-use.html` and `privacy-policy.html` — development policy drafts included in the allowlisted site build.
- `wallet-identity-assurance.html` — plain-language explanation of the primary-wallet identity model and its current read-only status.

The exact allowlist and build transformations are defined in `../worker/scripts/build-staging-site.mjs`. A file is not public or operational merely because it exists in this directory.

## Isolated case-management research

`cases.html`, `cases-ui.js`, `cases.css`, `case_management.py` and `tests/test_case_management.py` are a separate case-management prototype. They are not part of the current Worker build allowlist, do not provide account recovery and are not a live appeals or support service. Their Python core is tested independently without external packages.

## Explicitly not provided here

- No local passkey-first account server.
- No WebAuthn/passkey login or offline recovery-key path.
- No standalone SIWE account-login server.
- No email verification, email delivery or password reset.
- No public account service or remote deployment.
- No support-staff account override or alternate recovery authority.

The retired experiments and their supporting dependencies/tests have been removed from the active workspace. The preserved dated backup remains the recovery reference for the prior snapshot.

## Release safety

The ordinary account service remains **FOR DEVELOPMENT · READ ONLY** until the current Worker, exact remote staging deployment, physical-wallet/browser matrix, security review and all owner-approved release gates are complete. Do not treat a browser preview or local synthetic-key test as operational wallet authentication.
