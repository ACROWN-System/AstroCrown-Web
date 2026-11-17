# Genesis Programme — Wallet Compatibility and Qualification Gate

**Status:** Fail-closed candidate register; no wallet application is approved for production payments yet.  
**Owner direction:** Accept only a curated set of wallet applications demonstrated to manage the required USDT assets across Ethereum, TRON and Solana. A familiar wallet brand or a provider name reported by a browser is not sufficient evidence.

## Required asset scope

The initial payment assets remain:
- Ethereum Mainnet — USDT ERC-20;
- TRON Mainnet — USDT TRC-20;
- Solana Mainnet — USDT SPL.

The same wallet application should provide reliable access to all three assets. Their public addresses are different across chains. Every address must be independently attributed to the primary Genesis wallet by a cryptographic ownership proof or a separately qualified transaction-proof method.

## Candidate register

The machine-readable register is `genesis-wallet-compatibility.json`.

| Wallet application | Current disposition | Qualification note |
|---|---|---|
| MetaMask | Candidate — not qualified | Ethereum and Solana integration are candidates. Its reviewed TRON documentation confirms TRON asset management but says direct TRON dApp connection is not currently available. The primary-wallet linkage/proof path for a MetaMask TRON address remains unresolved. |
| Trust Wallet | Candidate — not qualified | Candidate for the unified three-network flow. The exact browser-extension and mobile provider behavior, signatures, transfers and restoration must pass local end-to-end tests. |
| OKX Wallet | Candidate — not qualified | Candidate for the unified three-network flow. The exact browser-extension and mobile provider behavior, signatures, transfers and restoration must pass local end-to-end tests. |

These are candidates for testing, not an approved payment allowlist. No candidate is marked qualified and the production allowlist is empty.

## Qualification requirements

A wallet application can be approved only after all of the following pass for the exact app version, platform and provider integration being released:

1. It receives and sends the exact canonical USDT asset on each of Ethereum, TRON and Solana.
2. The Genesis website can establish and verify control of the primary wallet without requesting a transaction, token approval, seed phrase or private key.
3. Every additional chain address can be independently proven and linked to that same primary identity. Merely submitting a transaction hash or showing a wallet balance is not proof that a secondary address belongs to the primary wallet.
4. If a network lacks dApp connection, any manual-payment alternative must have an independently qualified and auditable source-attribution method. A public explorer link alone is insufficient.
5. The same wallet can be restored using its official recovery process, and the restored account derives the same addresses on all three target networks.
6. Chain/network selection, mainnet switching and transaction-fee requirements are displayed clearly and correctly.
7. Tests record wallet application name, platform, exact version, provider identifiers, network, asset contract/mint, proof method and results.

Wallet provider metadata, icons, names and reverse-DNS identifiers are useful for selecting the intended provider in the interface, but they are not trusted as proof of ownership. Ownership is established only by verified cryptographic signatures or a separately approved on-chain proof method. All signatures are checked server-side against the requested chain, address, domain, nonce, purpose and expiry.

## Runtime and release boundary

The current staging page discovers EVM, TRON and Solana wallet providers for isolated, display-only ownership-proof testing. It does not constitute approval of every detected provider. The candidate register explicitly keeps production acceptance disabled until the full qualification suite passes.

The payment backend must fail closed if the requested wallet application/version and network route are not present in the approved release register. Never infer qualification from a token balance, wallet brand, an explorer screenshot or a user-provided URL.

No mainnet payment, entitlement credit, ACROWN purchase, token transfer, mint or delivery is enabled by this register or its tests.
