# Active Navigation Plan — Local-Only Wallet Authentication Prototype

**Date:** 2026-10-20  
**Status:** ACTIVE — local EOA/SIWE prototype implemented; offline and headless-browser workflow passes on the last verified code head; exact-head general CI and final review remain in progress; production integration remains BLOCKED  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Working branch:** `docs/provider-independent-wallet-auth-plan-2026-10-20`  
**Related architecture record:** [Provider-Independent Wallet Authentication Plan](2026-10-20-Provider-Independent-Wallet-Authentication-Plan.md)  
**Related draft editor:** [PR #140](https://github.com/ACROWN-System/AstroCrown-Web/pull/140)  
**Related draft architecture PR:** [PR #141](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)

## 1. Objective and scope

Prepare the smallest testable, isolated EOA Sign-In with Ethereum (SIWE/ERC-4361) prototype so the maintainer can later exercise it with a **test-purpose wallet**. Do not ask the maintainer to sign a message until the exact candidate and all offline checks are ready.

The prototype, when implemented, must be:
- loopback-only, bound to `127.0.0.1` and opened through one canonical local origin;
- clearly labeled development-only and not safe for network exposure or production use;
- limited to one-wallet EOA message authentication and a temporary local session;
- free of real funds, transactions, seeds, private-key entry, private-key handling, external identity providers, email, application-controlled blockchain RPC, wallet relays, remote persistence and production secrets;
- independent of PR #140's unmerged implementation files; no implicit dependency on an open draft PR;
- entirely under `development/`, without changing the root public homepage, `_config.yml`, deployment configuration or any existing backup/archive path.

This local experiment is not production sign-in, account creation, wallet linking/recovery, role administration or publishing. Contract-wallet / ERC-1271 support is excluded because reliable contract-signature validation can require chain-state access.

## 2. Gate separation

The source/deployment discovery recorded in AUTH-001 remains **BLOCKED**: the authoritative public hostname, publication source, deployed artifact and DNS/CDN path could not be verified by the available read-only tools. The conventional Pages URL could not be fetched by the web tool either. These are access/environment limitations, not evidence that the public site is down.

For this plan, the requested local test-wallet checkpoint is treated as a **non-production isolated experiment only**. It does not close AUTH-001, select production hosting, authorize integration with the public website, or authorize deployment. No production route may be enabled until AUTH-001 and the architecture plan's other mandatory gates are passed.

The expected `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were searched for in NOVA and in AstroCrown-Web's expected active development paths but were not found at those locations. Do not claim to have reviewed the unavailable documents. Until their authoritative locations are recovered, follow the available `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, this dated plan, the root-cause/evidence discipline and the target branch review gate.

## 3. Source-of-truth contract to implement

**Protocol candidate:** ERC-4361 / SIWE v1 for EOA sign-in, using EIP-191 message signatures.  
**Wallet interface:** EIP-1193 injected browser provider; no brand-specific wallet assumption.  
**Production origin:** deliberately not selected until AUTH-001 is resolved.  
**Local-only origin:** one canonical `http://localhost:<fixed-port>` address, server bound only to loopback; reject Host/Origin variants rather than trusting client-supplied domains.  
**API boundary:** same-origin local endpoints only. The server creates the exact SIWE challenge; the client returns that unmodified message and wallet signature.

Required challenge fields: exact configured local domain and URI, account address, positive integer chain ID from the wallet provider, SIWE version `1`, cryptographically random single-use nonce of at least 8 alphanumeric characters, issue time, and a short expiration (five minutes for this experiment). No arbitrary user-supplied domain, URI, role or redirect is accepted.

Verification must check, on the server: strict SIWE message validity; exact expected domain and URI; the known, unexpired, unused nonce; issue/expiration bounds; the expected wallet address; the expected chain ID from the issued challenge; EIP-191 signature validity; and exact association of the submitted message with the challenge issued to that local browser flow. Nonce consumption must occur atomically before establishing a session, including on failed or duplicate submissions. Messages, signatures, challenge tokens and credentials must not be logged.

On success, create an opaque random, short-lived, in-memory local session bound to the verified address. Use an `HttpOnly`, `SameSite=Strict` cookie and strict origin checks. Because the prototype uses HTTP on loopback, document that its cookie/runtime controls are for local testing only and do not imply production HTTPS/session security. Restarting the process may erase all challenges and sessions. No account role is inferred from the address; there is no owner/admin privilege in the prototype.

The client requests an account selection only after the maintainer clicks **Connect test wallet**, requests a SIWE signature only after the maintainer clicks **Sign in**, shows the full human-readable message before requesting a signature, and never requests a transaction. Cancel/rejection is a normal result. There must be visible notices: **test wallet only, no funds or transactions required, never enter or share a seed phrase/private key, do not use production credentials**.

## 4. Library candidate and eligibility

Candidate for the Python verifier: `siwe==4.4.0`, published under MIT OR Apache-2.0, with signature/grammar validation supplied by the library rather than hand-written ECDSA recovery. Current package metadata checked 2026-10-20: PyPI identifies version 4.4.0 (uploaded 2024-10-11), Python >=3.8, and documents expected validation of message structure, signer, domain, nonce and time fields. The maintainers explicitly state that this implementation has **not undergone a formal security audit**.

Result: **CANDIDATE for an isolated experiment only; not approved for production**. Pin the package and transitive dependencies for reproducibility, inspect its exact API/dependency/license metadata, and run the repository's own adversarial and specification-derived tests. Do not claim the library's use establishes conformance or security certification. If package/API behavior or dependency constraints do not pass, stop and document the specific reason rather than replacing it with custom cryptographic or loose message-parsing code.

Official references checked 2026-10-20:
- ERC-4361: https://eips.ethereum.org/EIPS/eip-4361
- EIP-191: https://eips.ethereum.org/EIPS/eip-191
- EIP-1193: https://eips.ethereum.org/EIPS/eip-1193
- SIWE Python project and package metadata: https://github.com/spruceid/siwe-py and https://pypi.org/project/siwe/

## 5. Minimum offline acceptance matrix

All rows begin **BLOCKED** until tests actually run against the exact candidate commit.

| ID | Acceptance criterion | Required evidence |
|---|---|---|
| LOCAL-001 | Public boundary unchanged | Diff confirms all new files are under `development/`; no `_config.yml`, root homepage, secrets or deployment setting changed |
| SIWE-001 | Valid EOA flow | Deterministic test-only account can issue a challenge, sign the exact SIWE message, verify it and receive only a temporary local session |
| SIWE-002 | Wrong signature/address rejected | Negative tests for wrong signer, malformed signature and changed message |
| SIWE-003 | Origin protected | Reject alternate domain, URI, Host and Origin; reject caller-selected redirect |
| SIWE-004 | Replay prevented | Reject reused nonce, reused signature/challenge, expired nonce and duplicate verification; consume challenge safely on failed submissions |
| SIWE-005 | Time and structure checked | Reject expired, not-yet-valid, missing/malformed required fields, wrong version, wrong chain ID and invalid issue/expiration bounds |
| SIWE-006 | Request constraints | Reject malformed/oversized JSON, missing fields, unsupported content types and unexpected methods without stack traces or sensitive output |
| SIWE-007 | Session boundary | No session before successful verification; correct session address; logout revokes session; expiry and process restart fail closed |
| SIWE-008 | Local-only binding | Server listens on loopback only; no external network bind or remote API calls; host/origin canonicalization tested |
| SIWE-009 | No transaction or secrets | Source and browser tests confirm no transaction method, seed/private-key input, email, IdP, app RPC or relay code |
| SIWE-010 | Browser wallet UX | User-initiated connection/signing only; exact message visible; rejection/cancel handled; no automatic signing |
| SIWE-011 | Dependency and reproducibility | Exact package version and transitive lock/checksums recorded; relevant license metadata checked; clean CI install succeeds |
| SIWE-012 | Error and log hygiene | Errors are bounded and clear; signatures/nonces/session tokens never appear in server logs or CI output |
| SIWE-013 | Full regression gate | Exact-candidate CI passes for Python tests, client JS syntax, security/static checks and a loopback-only HTTP smoke test |

A successful synthetic-account test is offline/test evidence only. It does **not** prove compatibility with the maintainer's installed wallet. The user wallet step will be requested only after this matrix has no implementation-related FAIL and the exact candidate is ready; any remaining environment/production gate must be disclosed.

## 6. Implementation sequence

1. Inspect the selected SIWE package source/API and its dependency/license metadata, then freeze the minimal contract and package pins.
2. Implement the isolated verifier, challenge store, loopback server, client signing UI and deterministic dummy-key test fixtures inside `development/auth-prototype/`; test fixtures must never be usable as real user credentials.
3. Write offline unit, negative, HTTP boundary and client-side validation tests before any user-wallet interaction.
4. Add a narrowly scoped CI workflow whose triggers cover all prototype files and workflow/config files, with no secrets and least permissions.
5. Run the exact branch/head checks; fetch and inspect the complete diff, logs and current CI status. Fix root causes, not assertions alone.
6. Only after offline evidence passes, provide the maintainer the precise local launch steps and ask for one test-wallet run. Wallet testing must use a wallet/account intended only for testing and must not require any transaction or funds.
7. Record wallet-test observations as integration evidence without collecting seed phrases, private keys or unnecessary signatures. Treat any live-wallet failure as a new root-cause investigation, not a reason to weaken origin, nonce or signature checks.

## 7. Preservation and Impact Analysis

No file in `backup/`, `Backup/`, or any case variant may be created, changed, moved or deleted. Existing archives/backups are immutable. Never merge automatically or promote this experiment merely because its CI passes.

**IF the isolated local experiment is created:** it can provide real EIP-191/SIWE verification evidence against an ordinary EOA wallet without putting a sign-in endpoint on the public internet. Keeping hosting/source discovery as a separate blocker avoids conflating a local cryptographic proof with deployment readiness.

**IF it is not created:** the next design decisions remain dependent on descriptions and offline assumptions; EOA wallet interoperability, the actual browser signature flow and concrete negative-test behavior will remain untested.

## 8. Stop conditions

Pause before the user step if:
- the verifier library's contract is unclear or its candidate cannot be installed reproducibly;
- a test failure suggests nonce replay, origin confusion, invalid signature acceptance, remote binding, secret leakage or other security weakness;
- any code path needs app-controlled chain RPC, wallet relay, remote identity, a transaction or a production secret;
- the prototype can bind beyond loopback, or tests cannot prove it remains local;
- exact-head CI fails or a test is being weakened merely to fit the implementation.

The first requested human action should be the test-wallet interaction only after those local/offline prerequisites pass. AUTH-001 remains an independent blocker for future public/editor integration and deployment.

## 9. Result and handoff

Current result: **PLAN RECORDED; NO AUTHENTICATION CODE YET**. Candidate library status is CANDIDATE; publishing-source verification is BLOCKED; wallet interaction has not been requested or performed. No user wallet, private key, seed phrase, production endpoint or secret has been accessed.

On completion, update this record with changed paths, commit, exact test evidence, findings, remediation/re-test results, and the remaining production blockers.
