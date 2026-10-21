# Completed Navigation Record — Browser-Preview Account Flow

**Date completed:** 2026-10-21  
**Status:** COMPLETE — preview-mode implementation and CI verified  
**Repository:** ACROWN-System/AstroCrown-Web  
**Branch:** docs/provider-independent-wallet-auth-plan-2026-10-20  
**Verified application/test revision:** `97232117e935b69733263bb83e519b7c4b548b31`  
**Parent work:** PR #141 — Separate account authentication and add browser-preview demo; retain wallet lab

## Objective and outcome

The development homepage's **Account** button can now exercise account creation, sign-in and recovery in the hosted HTML Preview without a local Python process, Git checkout, or local runtime installation. A separate localhost Python/SQLite test mode remains in place for the backend-focused persistent journey.

## Root-cause findings

1. The user's earlier HTML Preview URL was pinned to commit `9784d4d3611f27ebad56a7245db58bacc1504ebf`, which predates the Account modal and was not updated when the branch changed.
2. The first Account JS used relative API paths such as `/api/account/status` against a Python service bound to the user's own loopback interface. A remote static preview cannot reach that service.
3. The homepage loaded prototype assets from absolute paths, which can resolve against the preview host rather than relative to `development/index.html`.
4. The preview host warns that some browser storage may be shared among previews. The safe demo implementation therefore keeps account records, login session, and recovery-code hashes in page memory only and does not persist them to browser storage or send them to an account API.
5. A prior local-test attempt exposed Windows path-length failures and an unavailable Python 3.12 runtime. These are no longer prerequisites for the browser interaction demo; the repository's original backup paths were not changed to work around those Windows errors.

## Implementation delivered

- The homepage's Account button opens the sign-in/create-account dialog directly.
- The homepage's CSS and JavaScript asset links are relative to the development page.
- On remote preview origins, the UI chooses a browser-only, temporary demo adapter. The adapter implements create account, sign in, sign out, one-time recovery-code setup, password reset, code re-use rejection, and recovery-code regeneration in page memory. It makes no account API calls and uses Web Crypto for demonstration password/recovery hashes.
- Reloading the page or opening a separate tab discards the account/session state. This is intentionally not production authentication and is only for fabricated test credentials.
- On the localhost origin, the existing Python standard-library + SQLite backend path remains available and retains its persistent local test database.
- The optional EOA/SIWE wallet lab remains separate; ordinary account access never requires connecting a crypto wallet.
- Documentation and CI guards were updated for the new browser path and relative asset resolution.

## Acceptance criteria

| ID | Criterion | Result |
|---|---|---|
| ACC-PREVIEW-001 | Account opens directly from one button click | PASS — headless Chrome smoke test |
| ACC-PREVIEW-002 | Browser-preview mode never sends account API requests | PASS — browser test replaces `window.fetch` with a rejecting function before testing all account actions |
| ACC-PREVIEW-003 | Preview account state exists only in page memory and disappears on reload | PASS — same username can be registered again after reload |
| ACC-PREVIEW-004 | Create, sign-in/out, recovery setup, password reset and single-use code rejection work in preview mode | PASS — headless Chrome smoke test |
| ACC-PREVIEW-005 | Preview notice warns that the demo is disposable and not production authentication | PASS — UI/static checks |
| ACC-PREVIEW-006 | Local Python/SQLite backend remains functional | PASS — all 10 loopback HTTP/account/recovery tests |
| ACC-PREVIEW-007 | Account stylesheet/script use relative paths | PASS — static path checks and browser smoke test |
| ACC-PREVIEW-008 | PR #141 stays draft and production homepage/settings remain unchanged | PASS — PR remains open/draft; application changes remain under `development/` |

## Exact-revision verification — 2026-10-21

All associated GitHub Actions runs for implementation/test revision `97232117e935b69733263bb83e519b7c4b548b31` completed successfully:

- [Local Account Continuity Prototype Tests #21 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39631638701): Python and JavaScript syntax; all 10 local server/recovery tests; static security/asset checks; headless Chrome journey through both backend and browser-only modes.
- [Local Wallet Authentication Prototype Tests #49 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39631638649): existing independent wallet/SIWE lab regression test.
- [NOVA RSI Engine CI #701 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39631638301).
- [External Review Pipeline CI #262 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39631638379).
- [NOVA RSI CodeQL Security Analysis #272 — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/39631638227).

The first expanded browser-test run exposed a test-harness issue rather than an account-flow assertion: Node's Undici HTTP parser asserted while the local-server polling loop left a response body unconsumed. The test helper now drains that health-check response before polling continues. The next exact-revision run passed the browser journey and all preceding checks.

## Impact Analysis

**IF implemented:** the project maintainer can assess the primary account interactions directly inside the hosted development preview without installing Python or cloning the repository. The browser demo does not transmit or persist entered values, and the local persistent backend remains available separately for more specific testing.

**IF not implemented:** the provided static preview would keep showing the older Account menu or fail its API requests because a remote preview cannot reach a local loopback server; the maintainer would have to configure an additional local environment before even testing the interaction design.

## Boundaries and remaining blockers

- The browser-preview flow is a disposable simulation; its client-side password hashing does not turn it into a genuine, secure account service. Never enter real credentials, valuable recovery codes, wallet secrets, or personal identity data.
- No production account backend, social-login integration, passkeys, admin wallet enrollment, Imperial HSIAN recovery tooling, cloud persistence, account export/deletion, or real privileges are implemented.
- AUTH-001 remains **BLOCKED** until the authoritative production hostname, publishing source, deployed artifact, and DNS/CDN route are verified.
- This is not a claim of full ASVS/NIST conformance, formal security audit, or production authentication readiness.
- PR #141 must remain open and in draft until its broader review/promotion requirements pass.

## Final status

**Browser-preview account interaction: COMPLETE for development-only testing.**  
**Production account authentication and deployment: BLOCKED / NOT IMPLEMENTED.**
