# AstroCrown Public Member Name Requirements

**Decision date:** 26 November 2026  
**Status:** Owner-approved development requirement  
**Scope:** Ordinary AstroCrown account creation, profile identity and member-name availability.

## 1. Product rule

Every ordinary AstroCrown account receives a default public member name during successful registration. The member may keep it or choose another unique name from the User dashboard. The public member name is separate from the immutable account identifier, primary identity wallet address and private authentication/session data.

## 2. Default name

Generate the default name from the already-unique public account identifier:

`Crown_` + the ten hexadecimal characters after `AC-`.

Example: account identifier `AC-7A91C2E4D0` receives `Crown_7A91C2E4D0`.

This name is created in the same registration transaction as the account, primary-wallet identity and session. Existing account records are backfilled deterministically from their unique account identifiers during the member-name migration. It is not a shared placeholder and does not rely on a random display-only browser value.

## 3. Custom-name rules

- Length: 3–20 characters.
- First character must be an English letter.
- Remaining characters may be English letters, numbers or underscores.
- Spaces, hyphens, periods, control characters and punctuation are not accepted.
- Normalize Unicode compatibility forms (NFKC), trim outer whitespace, then compare the canonical ASCII name case-insensitively.
- A name such as `Bradford` and `bradford` is one identity and cannot be assigned to two accounts.
- Reserve the platform identities `admin`, `administrator`, `astrocrown`, `genesis`, `moderator`, `nova`, `official`, `support` and `system`.
- The server validates every proposed name. Browser validation is only immediate guidance.

## 4. Availability and Apply interaction

The profile editor checks availability through the authenticated AstroCrown API after the member enters a syntactically valid name. The client uses a short debounce and discards stale responses from earlier edits.

- **Checking:** neutral status; Apply remains disabled and faded.
- **Available:** green status saying that the username is available; Apply becomes full-colour and enabled.
- **Already taken:** red status saying that the username is already taken; Apply remains faded and disabled.
- **Invalid:** red validation status; Apply remains faded and disabled.
- **Server/network error:** explain that availability could not be verified; Apply remains faded and disabled.
- **Current name:** identify it as the member's existing name; no redundant Apply action is enabled.

Only an authenticated member may check or apply a profile name. Availability checks are rate-limited and do not reserve the name.

## 5. Atomic claim and persistence

The Apply endpoint validates the name again and writes it to the authenticated account. A database unique index on the normalized name is authoritative. If two accounts check the same available name concurrently, only one Apply operation may succeed; the other receives a conflict response and must choose another name.

A successful change is included in the account status response and recorded in the account security audit. The name does not change the account identifier, wallet identity, account role, Genesis qualification or recovery authority.

## 6. Public display and integration boundary

The User dashboard uses the public member name as its primary visible identity. The first-party Community service is a future consumer of this account field, not a prerequisite for the account or profile feature. When Community is developed and integrated with the wallet-primary account model, posts, replies, membership lists and member directories must read this same authoritative field rather than create a parallel identity or use an internal account handle. Genesis recognition is a separate qualification and badge; a member name alone never grants Genesis status.

The account/member-name feature can be qualified and activated independently of Community. It remains development-only until its database migration, authenticated API and physical-wallet/browser qualification, exact remote staging deployment and post-deployment verification pass. Community display is a later integration and is not a release gate for the User dashboard member name.
