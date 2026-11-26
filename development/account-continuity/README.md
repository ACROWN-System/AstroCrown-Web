# Account Continuity and Identity

This directory is the authoritative development area for AstroCrown's ordinary account model. The current direction is **one wallet-primary identity per account**. Historical passkey-first, standalone SIWE-login and email-delivery experiments are not alternate supported login paths.

## Current source of truth

1. `PRIMARY-IDENTITY-AND-TRANSACTION-WALLET-ARCHITECTURE.md` — primary identity wallet, auxiliary transaction-wallet boundaries and transaction authorization separation.
2. `USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md` — account lifecycle, User dashboard, separately authorized Administrator dashboard, role governance, privacy and permission boundaries.
3. `MEMBER-NAME-AND-USERNAME-REQUIREMENTS.md` — unique default public member name, validation, availability and atomic claim.
4. `worker/README.md` — exact current Worker routes, schemas, local qualification and deployment gates.
5. `PRODUCTION-PARITY-STAGING-AND-THREE-PASS-CLEANUP-REQUIREMENTS.md` — staging/production parity, controlled release and cleanup requirements.

Do not create a second authentication authority or copy these requirements into a parallel account system.

## Ordinary account identity

- Exactly one primary identity wallet is associated with an ordinary account.
- Current cryptographic proof adapters: Ethereum Mainnet EIP-191, TRON Mainnet TIP-191 and Solana Mainnet Ed25519.
- Bitcoin/BIP-322 is not enabled.
- Registration and sign-in use a one-time, origin/address/network/purpose-bound challenge. The server consumes the challenge once and verifies the chain-native off-chain message signature.
- A sign-in proof is not a transaction. It must not request gas, a transfer, token approval, deposit, payment, balance or spending authority.
- The primary wallet is the sole account login and recovery anchor. Recovery means regaining control of that same wallet through its own wallet-provider recovery process.
- No ordinary account email, password, SMS, passkey, offline recovery-key or auxiliary-wallet login path is offered.
- No seed phrase or private key is requested or stored.
- A successful new account receives an immutable account ID and a unique default public name of `Crown_` plus the ten hexadecimal characters after `AC-`. Custom names are server-validated and case-insensitively unique.

## Authority separation

- The primary identity wallet proves account identity; it does not automatically grant administrator status.
- Administrator roles remain server-owned. Administrator wallet enrollment and step-up are distinct privileged controls.
- A transaction wallet must independently authorize its own outgoing transaction. An account session cannot spend assets from another wallet.
- Genesis member identity, Genesis payment evidence, treasury records and entitlement accounting remain in the separate Supporter Programme database. A receiving address is not automatically an account-login credential.
- Community is a future consumer of the authoritative member-name field; it must not create a parallel member identity.

## Implementation and release status

The active implementation is `worker/` with the static account UI assets in `prototype/`. The current build allowlist consumes `account-prototype.css`, `account-ui.js`, `admin-wallet-ui.js`, `terms-of-use.html`, `privacy-policy.html` and `wallet-identity-assurance.html`. The prototype UI assets are not a separate live authentication server.

The exact PR branch has local Worker/D1 and synthetic-key CI evidence. That does not establish:
- physical wallet and provider interoperability across browsers/devices;
- remote staging deployment or remote D1 migration;
- independent security review or production security certification;
- operational administrator bootstrap;
- wallet rotation/replacement or auxiliary transaction-wallet management.

The ordinary account service remains development-only and not live. Do not deploy, activate, migrate remote data or change feature statuses merely because local checks pass.

## Separate experiments and history

- `prototype/case_management.py` and its tests are an isolated case-management research prototype. They are not integrated with the current Worker or current account authorization.
- The old passkey-first requirements, passkey assurance benchmark and FIDO certification research are retained as historical context only. Their current-status limitations are stated in those records. Do not implement them as active account requirements.
- The old standalone wallet-auth lab, local passkey server, email-delivery prototype, temporary HTTPS tunnel and their obsolete tests/dependencies have been removed from the active development workspace. The dated backup retains the earlier snapshot unchanged.
