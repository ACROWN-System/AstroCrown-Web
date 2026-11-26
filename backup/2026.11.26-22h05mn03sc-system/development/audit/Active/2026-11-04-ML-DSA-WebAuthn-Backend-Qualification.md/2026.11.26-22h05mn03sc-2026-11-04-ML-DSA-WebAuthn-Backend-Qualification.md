# Active Navigation Plan — ML-DSA WebAuthn Backend Qualification

**Date:** 2026-11-04  
**Status:** **BACKEND ML-DSA SIGNATURE VERIFICATION QUALIFIED IN AUTOMATED TESTS; REAL BROWSER/AUTHENTICATOR INTEROPERABILITY BLOCKED / NOT TESTED**  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Working branch:** `docs/provider-independent-wallet-auth-plan-2026-10-20`  
**Related PR:** [#141 — Passkey-first account foundation; optional wallet backup (draft)](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)

## 1. Objective and decision

Qualify AstroCrown's experimental ML-DSA WebAuthn verifier beyond algorithm advertisement and COSE metadata parsing. The test must produce genuine ML-DSA keypairs and signatures, then exercise the actual server-side passkey authentication verifier.

**Decision:** retain ML-DSA-65 as the first advertised post-quantum candidate, with ML-DSA-44 and ML-DSA-87 also supported by the experimental backend, followed by classical compatibility algorithms. Keep the profile explicitly experimental. Do not claim that an account or the product is post-quantum protected merely because the server advertises ML-DSA or can verify a synthetic assertion.

Classical passkeys remain necessary for account accessibility until genuine browser, platform authenticator or security-key support is independently demonstrated. When an actual credential is stored, the dashboard's algorithm count must continue to report the algorithm decoded from that credential—not the algorithm list the server offered.

## 2. Standards and interoperability status

### NIST algorithm

ML-DSA is the Module-Lattice-Based Digital Signature Algorithm standardized in NIST FIPS 204. The three standardized parameter sets are ML-DSA-44, ML-DSA-65 and ML-DSA-87.

### WebAuthn profile remains a draft

At this review date, the most recent located WebAuthn profile is **draft-vitap-ml-dsa-webauthn-05**, published 15 September 2026 and expiring 19 March 2027. The IETF Datatracker labels it an **individual Internet-Draft**, states that it is not endorsed by the IETF and has no formal standing in the IETF standards process, and identifies no RFC stream or defined intended RFC status.

The draft requests COSE algorithm assignments but still labels all three values **TBD**:
- ML-DSA-44: requested `-48`
- ML-DSA-65: requested `-49`
- ML-DSA-87: requested `-50`

Therefore these numeric identifiers are draft placeholders in this prototype, not final IANA COSE registrations and not proof of an established WebAuthn/FIDO profile. Re-check the active draft and COSE registry before every future interoperability or certification milestone.

References:
- NIST FIPS 204: https://csrc.nist.gov/pubs/fips/204/final
- Current ML-DSA WebAuthn Internet-Draft: https://datatracker.ietf.org/doc/draft-vitap-ml-dsa-webauthn/
- Draft version 05: https://datatracker.ietf.org/doc/html/draft-vitap-ml-dsa-webauthn-05
- COSE registry: https://www.iana.org/assignments/cose/cose.xhtml

## 3. Implementation and dependency evidence

- `development/account-continuity/prototype/passkey_auth.py` advertises ML-DSA-65, ML-DSA-44 and ML-DSA-87 ahead of EdDSA, ES256 and RS256 fallbacks.
- After registration verification, the application decodes the COSE public key and records the actual COSE algorithm in the credential record.
- The user dashboard counts credentials actually stored with an ML-DSA algorithm; algorithm negotiation alone does not increment the count.
- The prototype pins `webauthn==3.0.1` and `cryptography==50.0.2`. Duo Labs' v3.0.0 release added ML-DSA-44/65/87 public-key signature verification for registration and authentication responses. Its v3.0.1 release contains a separate validation fix for malformed attestation formats.
- The upstream implementation converts decoded ML-DSA COSE keys to the cryptography ML-DSA public-key classes and invokes their signature verification method. Cryptography documents ML-DSA key generation, signing and verification APIs.

This is server-verifier support. It does not establish support by the user's browser, platform passkey manager, CTAP implementation, roaming security key, hardware-backed key store or synced-passkey provider.

## 4. New genuine-signature regression test

Added:
- `development/account-continuity/prototype/tests/test_ml_dsa_verification.py`
- The account-continuity workflow's Python syntax step now includes this test explicitly.

The test uses the installed pinned cryptography implementation to generate ephemeral private keys and public keys for all three ML-DSA variants. It:
1. Encodes the generated public key in the experimental ML-DSA COSE structure.
2. Asserts the relying-party service decodes the actual algorithm identifier.
3. Constructs a synthetic WebAuthn authentication assertion with a valid RP ID hash, user-presence and user-verification flags, a fresh challenge and increasing signature counter.
4. Signs the WebAuthn signature base with the generated ML-DSA private key.
5. Calls AstroCrown's actual `PasskeyAuthService.verify_authentication()`, which delegates to the pinned WebAuthn implementation.
6. Confirms successful verification, then confirms rejection of a wrong challenge and a bit-modified signature.

| Variant | Public key bytes | Signature bytes | Automated cryptographic assertion test |
|---|---:|---:|---|
| ML-DSA-44 | 1,312 | 2,420 | PASS |
| ML-DSA-65 | 1,952 | 3,309 | PASS |
| ML-DSA-87 | 2,592 | 4,627 | PASS |

These are generated test credentials and synthetic WebAuthn assertions. They are not produced by a physical authenticator or a browser's `navigator.credentials.create()` / `navigator.credentials.get()` flow. They do not prove device interoperability, attestation, key isolation or hardware protection.

## 5. Exact-head automated evidence

**Code/test head:** `88fe3205b54254ca3b249de2bada7bd3f23086b2`.

All five tracked workflows completed successfully on this exact code/test head:
- [Local Account Continuity Prototype Tests — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41701848926) — the complete account suite ran 74 tests, including `test_all_supported_ml_dsa_variants_verify_real_signatures`; syntax, static security-boundary checks and headless Chrome journey passed.
- [Local Wallet Authentication Prototype Tests — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41701848960).
- [NOVA RSI Engine CI — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41701848873).
- [NOVA RSI CodeQL Security Analysis — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41701848846).
- [External Review Pipeline CI — PASS](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/41701848858).

The account job and its test log were inspected. All five workflows and all five primary jobs completed with success. No failed or cancelled step was reported.

An additional independent OpenSSL command-line test in the working environment generated temporary ML-DSA keys, signed and verified a test message for all three parameter sets, and observed signature sizes matching the table above. This was a separate local primitive check, not a browser or application test.

## 6. $0 and operational impact

- No paid cryptographic API, external identity provider, hosted signing service, paid authenticator, GPU or commercial SDK was introduced.
- The application-side test uses the already-pinned open-source Python dependencies and ephemeral local CPU operations.
- No user passkey, production credential, hardware authenticator, real wallet, transaction, secret, recovery key, balance or asset was accessed.
- No production code, public homepage, deployment, DNS/domain, GitHub secret, provider credential, or historical backup was modified.
- No FIDO membership, certification, interoperability lab service or certification mark was purchased or claimed.

## 7. Remaining blockers and stop conditions

1. **Real WebAuthn client/authenticator path:** BLOCKED / NOT TESTED. No compatible real browser + authenticator or physical security-key flow has been qualified.
2. **COSE assignments:** EXPERIMENTAL. The requested values remain TBD in the located individual Internet-Draft. Do not treat them as official registry values.
3. **CTAP and transport:** NOT TESTED. USB, NFC, BLE, platform authenticators, passkey sync, roaming keys, key storage and large-signature transport require interoperability tests.
4. **Attestation/FIDO certification:** NOT TESTED / NOT CLAIMED. No attestation trust profile or FIDO certification is established by the generated-key test.
5. **Production account service:** BLOCKED independently by the existing production hosting, HTTPS, storage, recovery, operations, privacy, security-review and release gates.
6. **Quantum-resistance claims:** PROHIBITED for an account unless its active stored credential is proven to be ML-DSA and the complete real-client registration and authentication journey is verified. Classical fallback credentials remain classical.

## 8. Next qualification sequence

1. Track draft revisions and the official COSE registry; do not harden provisional identifiers into a public interoperability contract.
2. Identify a browser, platform authenticator or test security key that explicitly implements the current profile. Do not assume WebCrypto ML-DSA support implies WebAuthn/CTAP support.
3. Run a dedicated test-only registration and subsequent authentication ceremony using `navigator.credentials.create()` and `navigator.credentials.get()`; inspect the stored COSE algorithm and verify both signatures on the server.
4. Test fallback behavior, mixed credentials, passkey addition/removal, recovery, session revocation and anti-downgrade behavior. Never silently describe a classical fallback as post-quantum.
5. Measure payload size, client/server latency, failure behavior and authenticator transport limits.
6. Update the certification-readiness roadmap only after the actual programme profile and test eligibility are checked. Do not use FIDO marks or imply certification.

## 9. Preservation and promotion gate

This qualification is evidence for a **local experimental backend capability only**. Keep PR #141 open and draft. Do not merge, deploy, promote to production, remove classical compatibility or publish quantum-resistance/certification claims on the strength of these results alone.

Historical records and `backup/` remain immutable. On the next pass, append outcomes and exact evidence rather than rewriting this record to conceal a failed or blocked test.
