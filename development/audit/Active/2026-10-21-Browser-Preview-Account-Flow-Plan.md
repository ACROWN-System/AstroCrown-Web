# Active Navigation Plan — Browser-Preview Account Flow

**Date:** 2026-10-21  
**Status:** IN PROGRESS  
**Repository:** ACROWN-System/AstroCrown-Web  
**Branch:** docs/provider-independent-wallet-auth-plan-2026-10-20  
**Parent work:** PR #141 — Separate account authentication and add local account prototype; retain wallet lab

## Objective

Enable the development homepage's Account button to open a testable create-account/sign-in/recovery flow when the homepage is viewed through the supplied Git-Forge HTML Preview URL. Do not require the maintainer to install Python, clone the repository, or start a local server to exercise the UI.

## Root-cause findings

1. The supplied preview URL is pinned to an earlier immutable commit (9784d4d3611f27ebad56a7245db58bacc1504ebf) from before the Account dialog was wired, so editing the branch alone cannot change that exact rendered snapshot. A fresh preview URL must reference the updated source revision.
2. The current Account JS sends /api/account/... requests to a Python loopback server. A remote static preview cannot reach the maintainer's localhost server, so account actions fail when the server is absent.
3. The homepage references CSS/JS with leading / paths. Those paths are not source-directory-relative and can resolve incorrectly in a Git-Forge HTML preview. Use relative assets and verify them in CI.
4. The preview host warns that browser storage such as cookies/localStorage can be shared with other previews opened on that host. The browser-only test path must therefore not write credentials, account records, recovery-code hashes, or session state to cookies, localStorage, sessionStorage, IndexedDB, or a remote endpoint. Keep test records only in page memory and clear them on reload.
5. The earlier Windows install attempt also exposed long-path checkout failures and a missing Python 3.12 runtime. This change must remove both as prerequisites for the preview-only user journey, not modify repository backup paths as a workaround.

## Plan

- Change only development homepage/prototype and associated tests/documentation under development/ (plus the targeted existing CI workflow).
- Select a browser-only ephemeral adapter on non-loopback preview origins and an explicit test query mode for CI. In browser-preview mode, do not call fetch for account API routes; use Web Crypto and in-memory test records only.
- Keep local loopback mode on the existing Python/SQLite API unchanged.
- Change asset references to relative paths so the previewer can resolve them from development/index.html.
- Add regression coverage for registration, sign-in, sign-out, recovery code setup, password reset, single-use codes, and page-memory reset in preview mode, while retaining all local server and wallet-lab tests.
- Update the README/audit evidence, run targeted CI on the exact new PR head, and keep PR #141 in draft/unmerged state until review gates pass.
- Generate a new preview link tied to the changed commit after changes land.

## Acceptance criteria

- ACC-PREVIEW-001: Account opens directly from one homepage button click.
- ACC-PREVIEW-002: Preview mode never sends account API requests.
- ACC-PREVIEW-003: Browser-preview account state is only in JavaScript memory and is lost on page reload.
- ACC-PREVIEW-004: User can create a synthetic test account, sign out and sign in, enable one-time recovery codes, reset a password, and cannot reuse the same recovery code.
- ACC-PREVIEW-005: User-facing text clearly says this is a disposable demo, not production authentication; real/important credentials must not be used.
- ACC-PREVIEW-006: The local Python/SQLite mode remains supported and its existing tests pass.
- ACC-PREVIEW-007: All linked CSS/JS loads from the Git-Forge preview.
- ACC-PREVIEW-008: PR #141 remains draft, and the production homepage/settings remain unchanged.

## Impact Analysis

**IF implemented:** The owner can test the account interaction directly in a browser preview without solving Windows path-length or Python setup first. The temporary mode remains isolated from production authentication and does not persist or transmit form credentials.

**IF not implemented:** The Account button in the supplied remote HTML preview either remains the older menu-only snapshot or reaches API endpoints unavailable to that page, so it cannot verify the intended first-time and return-user journey without local environment setup.

## Security boundary

Browser preview is only an interaction test harness. It is not account authentication, does not persist accounts across reloads/tabs, does not support real account recovery, and must not be used with valuable credentials or recovery material. The loopback Python/SQLite prototype remains the separate local backend test. Production auth, provider approval, passkeys, admin wallet enrollment, Imperial HSIAN recovery and production deployment remain out of scope.
