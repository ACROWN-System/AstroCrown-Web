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

The machine-readable register is `genesis-wallet-compatibility.json`. No brand is approved merely because it appears in this table.

| Wallet application | Current disposition | What the official documentation demonstrates | Remaining qualification concern |
|---|---|---|---|
| Bitget Wallet | Candidate — promising three-network integration | EVM provider with personal-message signing; TRON provider with `tron_requestAccounts` and `signMessageV2`; Solana Wallet Standard provider with `connect` and `signMessage`. Official docs cover the Chrome extension and in-app DApp browser. | Test exact USDT send/receive flows, signature recovery and restore/address derivation on all three networks. Its WalletConnect mobile route documents Ethereum and Solana, not TRON, so assess its extension and in-app routes separately. |
| TokenPocket | Candidate — promising three-network integration | Official docs provide EVM EIP-1193/EIP-6963, TRON account access and `signMessageV2`; the developer index lists a Solana Provider API, and its mobile SDK documents Solana `connect` and `signMessage`. | Confirm the actual Solana provider method and message-signing flow on the current extension and mobile versions separately; do not assume the injected providers are identical. |
| Coin98 Super Wallet | Candidate — EVM and Solana APIs documented; TRON proof remains unresolved | Official docs show `window.coin98.provider` for EVM and `window.coin98.sol` with `sol_accounts` / `sol_requestAccounts`; Coin98 Connect documents `sol_signMessage`. | The public guide does not fully specify the off-chain signing return shape/address binding, and its EVM example demonstrates `eth_sign` rather than Genesis `personal_sign`. Verify both live. No qualifying TRON dApp/TIP-191 `signMessageV2` path is documented. New/Old restore derivation must also be tested. |
| MetaMask | Candidate — not qualified | Ethereum and Solana integrations are candidates. TRON asset management is documented. | Its reviewed TRON guide says direct TRON dApp connection is not currently available; a qualified way to prove and link the TRON address is still required. |
| Trust Wallet | Candidate — not qualified | Official developer documentation describes dApp integration across Ethereum, EVM networks, Solana and TRON. | Confirm the actual mobile/extension providers, message signatures, USDT send/receive and recovery flows on the exact versions being tested. |
| OKX Wallet | Candidate — not qualified | Official help documentation lists Ethereum, Solana and TRON among its supported networks. | Confirm the actual dApp provider APIs, chain-specific message signing, USDT send/receive and recovery behavior; network support alone is not sufficient. |

### Official documentation examined

- [Bitget Wallet EVM provider](https://web3.bitget.com/en/docs/connect/mainnet/evm), [TRON provider](https://web3.bitget.com/en/docs/connect/mainnet/tron), [Solana provider](https://web3.bitget.com/en/docs/connect/mainnet/solana), and [WalletConnect support](https://web3.bitget.com/en/docs/connect/adaptor/wallet-connect).
- [TokenPocket Ethereum provider](https://help.tokenpocket.pro/developer-en/extension-wallet/api-reference/ethereum-provider-api), [TRON provider](https://help.tokenpocket.pro/developer-en/extension-wallet/api-reference/tron-provider-api), [developer documentation index](https://help.tokenpocket.pro/developer-en/llms.txt), and [mobile JavaScript SDK](https://github.com/TP-Lab/tp-js-sdk), whose webview API documents `window.solana.connect()` and `signMessage()`.
- [Coin98 EVM dApp integration](https://docs.coin98.com/developer-guide/dapps-integration/evm-compatible-dapps-integration), [Solana dApp integration](https://docs.coin98.com/developer-guide/solana-dapps-integration), [Coin98 Connect integration (including sol_signMessage)](https://docs.coin98.com/developer-guide/coin98-connect-integration), [multichain extension restore guidance](https://docs.coin98.com/products/coin98-super-wallet/extension/getting-started/how-to-create-or-import-a-multichain-wallet), and [USDT transfer/gas guidance](https://docs.coin98.com/products/coin98-super-wallet/mobile/asset-management/faqs/why-cant-i-send-usdt-to-other-wallets).

These references establish that each wallet deserves evaluation; they do not establish that any release version has passed the Genesis qualification suite.

## Practical adapter work and test boundary

The Genesis preview now contains explicit provider adapters for the published direct namespaces where available:
- EVM: Bitget `window.bitkeep.ethereum`, TokenPocket `window.tokenpocket.ethereum`, Coin98 `window.coin98.provider`, OKX `window.okxwallet.ethereum`, plus EIP-6963/EIP-1193 discovery for MetaMask, Trust Wallet and other announced providers.
- TRON: Bitget `window.bitkeep.tronLink`, TokenPocket `window.tokenpocket.tron`, OKX `window.okxwallet.tronLink`, generic TIP-6963 and `window.tron` discovery. Genesis only permits identity proof through `tronWeb.trx.signMessageV2` (TIP-191). OKX's documented `trx.sign` flow is not silently substituted.
- Solana: Wallet Standard plus direct Bitget `window.bitkeep.solana`, OKX `window.okxwallet.solana`, Coin98 `window.coin98.sol` (`sol_requestAccounts` / `sol_signMessage`), and TokenPocket's mobile `window.solana` route when the TokenPocket webview is present.

The automated adapter tests use synthetic provider objects and signatures. They exercise detection, connect-call contracts, UTF-8 personal_sign encoding, Solana signature normalization, connected-address continuity, explicit mainnet identification and deliberate rejection of unsupported TRON signature methods. Where a Solana provider exposes its active address before signing or its public key with the signature, the adapter rejects an account change or signer mismatch. A Solana address can be displayed even when the wallet omits its cluster, but Genesis identity actions remain disabled until mainnet is confirmed. **These tests do not prove that an installed wallet build works.** The following require the exact physical app/extension and version to be present:
1. Connect and sign a fresh Genesis challenge for each supported primary-wallet and linked-address route.
2. Verify that the returned signature is accepted by the production-equivalent server verifier and remains tied to the address shown by the wallet. Where the provider exposes its active account or signing public key, confirm both match the connected address; an account change between connection and signing must fail.
3. Confirm mainnet/testnet switching and network identification. A missing or ambiguous chain identifier keeps identity actions disabled.
4. Restore each wallet from its own recovery method into a clean test profile and compare all three derived addresses.
5. Verify receiving addresses and token balances for the canonical USDT contracts/mint. Actual on-chain USDT send/receive tests are not part of browser mock tests and require a separately authorized test plan; no funds are moved by these changes.

No wallet is marked qualified merely because its adapter or automated mock test passes. Provider integration, live signature verification, USDT transfer behavior and wallet recovery remain separately recorded gates. Mainnet payment acceptance stays disabled.

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
