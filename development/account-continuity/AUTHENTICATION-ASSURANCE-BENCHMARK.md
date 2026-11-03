# AstroCrown Authentication Assurance Benchmark (AAAB)

**Record date:** 2026-11-03  
**Status:** Initial benchmark specification; maturity labels require exact completed evidence.  
**Scope:** Account authentication, passkey lifecycle, offline recovery and separate administrator wallet step-up. Not a benchmark of the whole exchange, website, wallet or infrastructure.

## Purpose and boundaries

Create a repeatable and auditable way to test what the AstroCrown authentication subsystem actually does. This is an engineering assurance framework, not a marketing score. A weighted average must never hide a critical weakness.

The benchmark is designed for $0 local infrastructure and open-source tools. It must not consume paid AI/provider quota. Independent assessment, certification, test labs, production hosting and hardware purchases are separate cost decisions.

This is an AstroCrown-owned benchmark and does not imply endorsement by FIDO Alliance, W3C, NIST, OWASP, OpenSSF or an independent auditor.

## Reporting rules

- Name the repository, branch, exact commit SHA, profile/version, dependencies, runner and UTC test date.
- Record OS, browser/version, authenticator class, transport and credential-sync mode. Never generalize one virtual-authenticator test to all devices.
- Record expected/actual outcome, pass/fail/blocked/not-run, artifact/log, impact, remediation and retest.
- Keep self-tests, interoperability, independent security reviews and formal certification separate.
- Blocked, skipped and unavailable tests do not count as passes.
- Critical failures are gates and cannot be offset by scores elsewhere.
- Compare a third-party implementation only after authorized equivalent testing against the same profile. Otherwise use cited public-document descriptions without ranking security.
- Do not publish recovery keys, private keys, assertions, cookies, production data, secrets or exploit-ready details in evidence.

## Maturity levels

| Level | Required evidence | Permitted statement |
|---|---|---|
| 0 — Documented | Scope, threat model, requirements, architecture and limitations | Design documented |
| 1 — Component-tested | Unit tests for parsing, crypto boundaries, challenge policy, recovery and authorization | Component-tested |
| 2 — Integrated | Full API/database/browser suite and all required CI workflows pass on the same exact commit; no mandatory job failed or was skipped | Automated integration-tested |
| 3 — Interoperability-tested | Repeated tests across a named browser/OS/platform-authenticator/synced-passkey/FIDO2-key matrix | Interoperability-tested on the listed matrix |
| 4 — Independently assessed | Independent assessor, written scope/methodology, findings and remediation report | Independently assessed within the published scope |
| 5 — Formally certified | Current certificate/registration from the named programme for the identified implementation | Certified only by that named programme |

These labels are not weighted scores and do not replace the issuing body's criteria or marks.

## Critical hard gates

Any of these blocks Level 2 or above until remediated and retested:
- Authentication challenge replay, substitution, wrong ceremony or acceptance for the wrong origin/RP ID.
- Cross-account credential or user-handle acceptance.
- Registration without the required user-verification policy or storage of an unverified key.
- Recovery replay/bypass, reusable recovery key, or survival of an invalidated passkey/session where policy requires revocation.
- Self-granted admin role, wallet-created admin authority, or unauthorized permission use.
- Wallet enrollment/step-up causing a blockchain transaction or requiring balance/deposit/stake.
- Session fixation/replay or invalidated sessions remaining valid after recovery/revocation.
- A report concealing failed/blocked cases or claiming real cryptographic proof where the test mocked it.

## Test domains

### A. WebAuthn registration and verification

Test secure context, exact origin/RP ID, look-alike rejection, server-generated random challenge, ceremony binding, expiry, single-use atomic replay rejection, ID/raw ID match, account ownership/user handle, user presence, required user verification, COSE parsing, algorithm allow-list, key lengths, signature encoding and cryptographic verification. Test counter and backup-flag semantics without treating counters as universal cloning detection. Include enumeration, request limits, rate-limit races and fail-safe errors.

### B. ML-DSA experimental profile

- Confirm registration options include the current experimental ML-DSA list and classical fallbacks.
- Confirm registration verification uses the same allow-list and persists the actual decoded COSE algorithm.
- Generate a genuine ML-DSA credential on a real compatible client/authenticator; record hardware/platform/OS/browser/firmware/transport/credential-manager version.
- Verify real ML-DSA registration and authentication signatures end to end. Reject malformed keys, wrong key lengths, invalid signatures and unknown algorithms.
- Keep offer tests, parser tests, mocked database lifecycle tests and genuine authenticator tests distinct.
- Track the IETF draft version. Draft 05 shows requested COSE values -48/-49/-50 as TBD. Do not call them final IANA/COSE assignments or an established WebAuthn/FIDO profile.
- Measure key/signature size, browser latency, server CPU, CTAP USB/NFC/BLE compatibility and synced-passkey behavior.
- Do not state that a credential is post-quantum unless its stored active credential is proven ML-DSA and real registration/authentication tests pass.

### C. Passkey lifecycle and recovery

Test enroll/list/add/remove/disable/replace/re-authenticate multiple passkeys; lost-device replacement; one-time recovery-key generation/display; salted verifier; rate-limit/concurrency; one-time use; revocation of old passkeys/sessions; recovery-key rotation; total-loss behavior. Make irrecoverability clear if all passkeys and the recovery key are lost. Confirm staff/admin/NOVA have no undocumented credential-minting or recovery bypass.

### D. Sessions, authorization and privacy

Test creation/rotation/expiry/logout/logout-all/fixation/CSRF/cookies under HTTPS, account enumeration, session/rate-limit races, no-store and CSP, sensitive reauthentication, role separation, least privilege, admin permission delegation, audit consistency, secret minimization and recipient-scoped communications. Document that WebAuthn alone is not end-to-end encryption and does not prevent privileged operators from changing backend state.

### E. Administrator wallet step-up

Test separation of ordinary passkey from EIP-4361/SIWE administrator step-up; fresh domain/chain/account/purpose-bound one-use challenge; exact message display; server signer validation; cancellation behavior; and no transactions, balance checks, deposits, stakes or minimum balances.

### F. Operational readiness

Test dependency pinning/licences/SBOM/provenance, vulnerability monitoring, reproducible build inputs, backup/restore, retention/export/deletion, incident response, privileged operator controls, monitored disclosure contact, accessibility, production RP ID/HTTPS/secure cookies/durable storage/deployment monitoring.

## Evidence report template

- Benchmark profile/version:
- Repository/branch/commit:
- Start/end UTC:
- CI workflows and run URLs:
- Runtime, OS and dependency versions:
- Browser/version:
- Authenticator, credential manager, transport and firmware:
- Actual stored credential algorithm:
- Test domain/case identifiers:
- Pass/fail/blocked/not-run:
- Expected/actual result:
- Log/artifact link:
- Finding ID, severity/impact and owner:
- Remediation commit/retest:
- Assessment type (self/peer/independent/certification body):
- Scope limitations and review date:

Never include recovery material, assertions, private keys, session cookies, user records or production secrets in evidence.

## Current AstroCrown baseline

- Passkey-first localhost registration/sign-in and one-time offline recovery: implemented in the development prototype.
- Experimental ML-DSA registration negotiation, matching server verification allow-list, algorithm persistence and dashboard counter: implemented in the draft branch; real client interoperability not established.
- Unit tests for algorithm order and algorithm metadata: added; they do not create a genuine ML-DSA credential or test a real ML-DSA signature.
- A virtual-authenticator browser journey exists in CI; exact current workflow results must be checked by commit.
- Multi-passkey lifecycle/device management UI, production HTTPS/storage/recovery, operational controls and independent review: not qualified.
- FIDO membership/certification: not obtained.
- This specification awards no maturity level by itself.

## Findings governance

Version the benchmark and every result. Findings remain in history after remediation; mark them remediated and link the fixing commit and successful retest. Never delete or rewrite a historical failure to make the latest report appear green. Critical gates need an owner and acceptance record.
