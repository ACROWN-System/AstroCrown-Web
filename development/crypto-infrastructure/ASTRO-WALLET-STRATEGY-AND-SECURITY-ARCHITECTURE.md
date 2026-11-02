# Astro-Wallet (AW) — Product Concept and Security Architecture Study

**Document ID:** ACW-AW-STRAT-001  
**Date:** 2026-11-02  
**Status:** CONCEPT / RESEARCH AND FEASIBILITY ONLY — NO WALLET IMPLEMENTATION AUTHORIZED  
**Related:** [Account and administrator requirements](../account-continuity/USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md); [Asset, payment and wallet-interaction architecture](ASSET-PAYMENTS-AND-WALLET-INTERACTIONS-ARCHITECTURE.md)

## 1. Purpose and opportunity

AstroCrown may have an opportunity to develop **Astro-Wallet (AW)**: a coherent, user-friendly wallet experience that aims for broad multi-chain asset compatibility and a safer key-protection and recovery model than relying on one manually backed-up seed phrase as the only recovery route.

This is a product opportunity and research direction, not a conclusion that existing wallets support only a few assets, nor a claim that Astro-Wallet can support every cryptocurrency. The asset universe is open-ended: chains use different account, UTXO, object, script, address, token and signing models; individual networks also contain large numbers of unrelated tokens and programmable assets. No wallet should automatically trust or enable every discovered token. Astro-Wallet should aim for broad, explicit compatibility through maintained chain and asset adapters, a qualified asset registry and independent capability states.

The current development scope remains AstroCrown sign-in, sign-up, User dashboard, Administrator dashboard and their access controls. Astro-Wallet is recorded as a future product workstream only. It must not delay the current account/dashboard progression or be confused with the external administrator authenticator, NOVA administrative operations smart account or AstroCrown treasury.

## 2. Non-negotiable user-access requirements

- No minimum wallet balance or deposit to create, initialize, connect, link or authenticate an Astro-Wallet.
- No minimum balance to use AstroCrown account sign-in, the User dashboard or a wallet-based proof-of-control challenge.
- No requirement to buy AstroCrown tokens, hold a gas token, stake funds or maintain a retained reserve merely to keep the wallet active.
- Wallet creation and authentication messages must not require an on-chain transaction or network fee.
- A particular blockchain transaction may still require the exact asset being spent and that chain's transaction fee. This is not a standing wallet-balance rule. A later optional fee-sponsorship feature must have an explicit sustainable budget and chain-specific qualification.
- The user must always see whether an operation is a message signature, a payment/transfer, an approval or a contract interaction. Never disguise a transaction as authentication.
- No recovery process may require the user to disclose a seed phrase, private key, passkey export, recovery share or other signing secret to AstroCrown staff or NOVA.

## 3. Product architecture — separate identity, wallet control and chain adapters

Astro-Wallet should be considered as a user-controlled wallet application or wallet service with one coherent interface and separate network-specific key/account adapters.

1. **AstroCrown account identity:** website account, login sessions, roles, permissions and dashboard access. This remains usable without Astro-Wallet.
2. **Wallet application and device layer:** browser/mobile interface, hardware-wallet integration and device security boundary. A wallet application is not itself a blockchain identity.
3. **Key and recovery subsystem:** key generation, secure storage, backup encryption, device enrollment, recovery policy, revocation and rotation. This is the highest-risk component and requires independent threat modelling.
4. **Chain-specific account/signing adapters:** EVM/secp256k1, Bitcoin script/address and transaction model, Solana/Ed25519, and later other chains such as Cardano, Cosmos, Sui, Algorand, Stellar, NEAR, Tezos, Polkadot and TON where justified. A user may have different chain-specific public addresses and signature mechanisms inside one Astro-Wallet.
5. **Asset registry and interaction layer:** exact asset identity, balance/indexer providers, token standards, transfers, payment requests, swaps, bridges, NFTs and other actions. Wallet connectivity alone must not enable every action.
6. **Security and policy boundary:** transaction simulation/previews, destination and program/contract verification, scoped permissions, signing intent, user confirmation, audit records and relevant NOVA controls.

Do not assume one public address, one key algorithm or one transaction format works for all chains. A single recovery root or wallet application may manage several chain-specific credentials, but the security and recovery relationship between those credentials must be visible and accurately modelled.

## 4. Seed phrases: identify the actual weakness

Seed phrases are not inherently broken merely because they contain 12 words. Under BIP-39, the standard mnemonic lengths are 12, 15, 18, 21 or 24 words—not 14. Twelve words encode 128 bits of initial entropy plus a checksum; 24 words encode 256 bits of initial entropy plus a checksum. More words increase the size of the underlying random entropy, but do not prevent theft or disclosure of the phrase.

The practical weakness is often that one human-readable phrase becomes a single, high-value root secret. Anyone who copies or obtains it may derive many wallet keys. Common exposure paths include phishing, fake support, screenshots/cloud notes, clipboard/history, malware, compromised devices, unsafe backups, physical theft, coercion and accidental disclosure. Increasing the number of words does not solve those paths.

Astro-Wallet should not simply replace a 12-word phrase with a longer phrase and call that a security innovation. It should evaluate designs that reduce single-point compromise and offer clear recovery choices without taking signing control away from the user.

Reference: [BIP-39 — Mnemonic code for generating deterministic keys](https://bips.dev/39/).

## 5. Candidate key protection and recovery mechanisms

No single method is automatically superior for every user. Assess combinations and state the trade-offs explicitly.

| Candidate | Potential benefit | Risks and limitations to address |
|---|---|---|
| Device-bound secure hardware / secure enclave | Keys can be protected from ordinary application memory and may be non-exportable | Device loss, device compromise, vendor/platform dependence, backup and migration constraints; security claims differ by hardware and OS |
| Passkeys / WebAuthn | Familiar user authentication, phishing-resistant origin binding and device-backed authenticators where supported | Passkeys are account authenticators, not automatically blockchain signing keys or a recovery scheme. Standard passkey algorithms are not a blanket post-quantum guarantee. Device/account recovery still matters. |
| Multiple independently enrolled devices | Avoid dependence on one device and permit continuity when one is lost | Devices must be independently secured; synchronized platform credentials may share one account or recovery root |
| Threshold cryptography / MPC | Can divide signing authority so one server/device/share alone cannot authorize a signature | Coordination and availability dependencies, implementation complexity, protocol/curve limits, vendor trust, backup and upgrade risks. Threshold ECDSA/Schnorr still uses a classical signature scheme and is not quantum-resistant merely because the key is split. |
| Shamir secret sharing or other threshold recovery shares | No single share is enough to reconstruct a protected recovery secret under a properly designed threshold scheme | Share generation, storage, distribution, threshold choice, loss, collusion and recovery ceremony are critical. Shares are not a substitute for audited key lifecycle and can recreate a seed-phrase-like single point if collected together. |
| Guardian/social recovery with delay and threshold | A user may recover after losing a device without one central operator controlling the wallet | Guardian collusion, unavailability, coerced recovery, account takeover, privacy and appeal processes; guardians must not silently gain spending power |
| Hardware key plus offline recovery method | Strong day-to-day signing with an independent recovery path | Must test hardware loss, firmware compromise, supply-chain, compatibility and safe recovery; do not make the recovery artifact an unprotected universal master secret |

Potential direction for study: a user-controlled, multi-device/threshold recovery architecture, optionally combining device-bound authenticators and independently stored recovery factors. The design should not permit AstroCrown's server or a single employee to reconstruct or unilaterally use user private keys. Do not select an implementation until a threat model, usability research, cryptographic review and recovery testing have been completed.

## 6. Quantum readiness — separate wallet security from blockchain signature security

### 6.1 What quantum computers threaten

A sufficiently capable fault-tolerant quantum computer running Shor's algorithm could threaten widely used elliptic-curve public-key signature systems, including the classes underlying many EVM, Bitcoin and Solana signing schemes. This is not the same as saying that current quantum computers can already steal ordinary wallets. The practical arrival date of a machine capable of breaking deployed cryptographic keys remains uncertain. NIST describes the threat as potentially years or decades away but advises organizations to begin migration planning now.

Quantum search also changes the margin for symmetric and hash-based security, but it does not mean a mnemonic is simply 'cracked' because it has 12 words. BIP-39 uses a defined amount of random entropy; the greater immediate operational risk is often disclosure of the phrase or compromise of its storage and use.

### 6.2 Established post-quantum standards

NIST finalized three principal post-quantum standards in August 2024:

- **FIPS 203 / ML-KEM:** a key-encapsulation mechanism used to establish a shared secret. It is not a digital-signature algorithm.
- **FIPS 204 / ML-DSA:** a post-quantum digital-signature standard.
- **FIPS 205 / SLH-DSA:** a stateless hash-based post-quantum digital-signature standard.

These standards provide real starting points for a crypto-agile design. Their use still requires correct implementation, parameter selection, side-channel protection, key management, interoperability testing and independent review. They must not be described as making the entire Astro-Wallet or a public blockchain quantum-proof.

References: [NIST Post-Quantum Cryptography project](https://csrc.nist.gov/projects/post-quantum-cryptography), [FIPS 204 / ML-DSA](https://csrc.nist.gov/pubs/fips/204/final), [FIPS 205 / SLH-DSA](https://csrc.nist.gov/pubs/fips/205/final), [FIPS 203 / ML-KEM](https://csrc.nist.gov/pubs/fips/203/final).

### 6.3 What Astro-Wallet can and cannot make quantum-resistant

Astro-Wallet could use post-quantum or hybrid cryptography for its own off-chain identity, encrypted backup/key encapsulation, recovery authorization and internal device-to-device protocols, subject to expert design and supported libraries. It could also be designed with cryptographic agility so that algorithms can be upgraded as standards and chain protocols evolve.

However, an ordinary wallet cannot unilaterally replace the signature algorithm used by a public blockchain. An Ethereum transaction must satisfy Ethereum's current account/protocol rules; a Bitcoin spend must satisfy Bitcoin consensus script rules; and a Solana transaction must satisfy Solana's accepted signature/program rules. If those networks continue to require classical signatures for a particular account type, the wallet's use of ML-DSA for its own backup or login does not make that on-chain account quantum-resistant.

Therefore, Astro-Wallet must report separate security states: (a) wallet application and device security, (b) backup/recovery cryptography, (c) AstroCrown off-chain account authentication, and (d) each blockchain's actual transaction signature and consensus support. Never display one blanket 'quantum safe' badge.

### 6.4 Bitcoin's emerging proposals do not yet provide a complete deployed answer

Bitcoin BIP-360 / Pay-to-Merkle-Root (P2MR) is currently labelled a draft specification. It proposes a script-tree output intended to mitigate long-exposure public-key quantum attacks and create a path for future post-quantum signature integration. Its own text explicitly says it does not introduce post-quantum signature schemes and does not by itself protect against short-exposure attacks. It is not a deployed, universally supported Bitcoin quantum-safe wallet standard and must not be treated as one.

Reference: [BIP-360 — Pay-to-Merkle-Root](https://bips.dev/360/). Confirm its status and any Bitcoin consensus adoption again at implementation time.

## 7. Crypto-agility and migration requirements

- Keep algorithms, key formats, derivation paths, signature codecs and account policies versioned rather than hard-coded into the product identity.
- Support algorithm and key-version migration without exposing seed phrases or private keys to the AstroCrown backend.
- Separate backup-encryption keys from blockchain signing keys and off-chain login keys.
- Design encrypted backups so the server stores ciphertext only and cannot decrypt or sign on the user's behalf; independently review device recovery and loss-of-all-devices cases.
- Consider hybrid classical/post-quantum proofs for Astro-Wallet's own off-chain authentication only where the verifier, key lifecycle, downgrade protection and interoperability are specified. Do not imply that a hybrid off-chain proof changes public-chain transaction consensus.
- Establish a chain-by-chain migration assessment for exposed public keys, reused addresses, legacy accounts, smart accounts, contract upgrades and asset transfer paths.
- Keep algorithm deprecation, rotation, compromise recovery and emergency migration as separate tested workflows.
- Prefer established, maintained, independently reviewed cryptographic implementations. Do not invent a new cipher, signature scheme, seed derivation, threshold protocol or bespoke cryptographic construction.

## 8. Multi-chain and broad asset compatibility

Astro-Wallet should present one coherent portfolio and interaction experience while preserving network-native account and asset identity. It should be possible to add chains and assets through adapters rather than rewriting the wallet core.

Candidate network families include Bitcoin/UTXO, Ethereum and other EVM networks, Solana, Cardano, Cosmos/IBC, Sui, Algorand, Stellar, NEAR, Tezos, Polkadot and TON. This is a research candidate list, not an implementation promise. Each requires its own address/account model, key algorithm, transaction builder, fee model, signer interface, balance/indexer source and security policy.

Asset discovery must not equal asset trust. The wallet must identify tokens by network and exact contract/mint/denom/policy/object ID; label unknown or unverified assets; and independently control whether an asset can be displayed, received, sent, swapped, bridged, staked or used in another protocol. No wallet should automatically enable every token found in a public indexer.

External wallets should remain usable. Astro-Wallet must not be mandatory for AstroCrown sign-in or ordinary website access. Users should be able to connect a supported external wallet even if they never create an Astro-Wallet.

## 9. Account, custody and governance questions that remain open

Before product implementation, explicitly decide:

- Whether Astro-Wallet begins as a non-custodial wallet, a wallet connector/portfolio layer for existing wallets, a smart-account interface, or a staged combination. These are different products with different legal, security and operational responsibilities.
- Which party controls each key component and whether the user can export, migrate or recover without AstroCrown.
- Whether any MPC, recovery or infrastructure provider is involved, what the provider can see/do, and whether the wallet remains usable if AstroCrown or that provider disappears.
- Which recovery choices are understandable for ordinary users and how to protect users from guardian collusion, coercion, device theft and account lockout.
- How to handle inheritance/death, accessibility, minors/guardians where applicable, jurisdictional requirements, lost devices, compromised devices and emergency revocation.
- Whether open-source clients and reproducible builds will be required, and how independent audits, bug bounties, release signing and supply-chain controls will operate.
- How to fund long-term RPC, indexing, monitoring, support and security maintenance without charging users or requiring token balances just to keep the wallet.

No custody, key-sharing, recovery threshold, seed replacement or launch decision is approved by this concept document.

## 10. Staged research and release gates

1. **Requirements and threat model:** define assets, users, attackers, key lifecycle, device compromise, recovery, coercion, quantum migration and custody boundaries.
2. **Comparative architecture study:** evaluate local secure hardware, passkeys, independent devices, MPC/threshold, Shamir recovery and guardian models. Record evidence and operational cost, including $0 constraints.
3. **Cryptographic feasibility prototype:** use only established libraries and isolated synthetic keys; compare backup encryption, key rotation, recovery and any post-quantum/hybrid identity proof. No real assets or production keys.
4. **Chain adapters and interoperability:** demonstrate test-chain compatibility and exact per-chain signing, payment, recovery and migration boundaries. Use disposable test keys and local/test networks.
5. **Adversarial and independent review:** key extraction, memory/log leakage, malicious updates, compromised devices, backup theft, share collusion, guardian attacks, downgrade, replay, side channels, supply-chain, recovery denial and cryptographic implementation review.
6. **Limited beta and production decision:** only after audits, legal review, incident/recovery exercises, operational funding and explicit owner approval. Do not hold user assets before those gates pass.

## 11. Current implementation boundary

Astro-Wallet is a future product concept. No wallet application, key vault, seed phrase replacement, passkey signing scheme, MPC/TSS service, guardian recovery, post-quantum cryptography, asset portfolio or blockchain transaction capability has been implemented or deployed by this document. The current AstroCrown account work remains focused on sign-in/sign-up and dashboards. The existing wallet-authentication prototype remains EVM/SIWE-oriented. No user wallet balance, seed phrase, private key or recovery share has been requested or collected.

## 12. Primary references

- [BIP-39 — Mnemonic code for generating deterministic keys](https://bips.dev/39/)
- [NIST Post-Quantum Cryptography project and migration guidance](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [NIST FIPS 203 — ML-KEM](https://csrc.nist.gov/pubs/fips/203/final)
- [NIST FIPS 204 — ML-DSA](https://csrc.nist.gov/pubs/fips/204/final)
- [NIST FIPS 205 — SLH-DSA](https://csrc.nist.gov/pubs/fips/205/final)
- [Bitcoin BIP-360 — Pay-to-Merkle-Root draft](https://bips.dev/360/)
- [Solana: Sign Messages & Authenticate Users](https://solana.com/docs/frontend/messages-and-auth)
- [BIP-322 — Generic Signed Message Format](https://bips.dev/322/)
- [EIP-4361 — Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)
- [ERC-4337 — Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)
