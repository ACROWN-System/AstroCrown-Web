# Genesis Wallet Practical Qualification Plan

**Programme status:** PRELAUNCH — qualifying payments disabled.
**Wallet acceptance:** all six wallet applications remain candidates; production allowlist empty.
**Purpose:** execute repeatable provider, signature, network, asset and recovery tests without assuming that documentation or a browser-injected object proves qualification.

## Scope

Candidate applications: MetaMask, Trust Wallet, OKX Wallet, Bitget Wallet, TokenPocket and Coin98 Super Wallet.

Each app/platform combination is a separate test target: Chrome extension and mobile in-app DApp browser must not be treated as equivalent. Record exact application version, extension version, operating system, browser version, provider namespace/identifier and test date.

## Implemented automated tests

The preview imports wallet-provider-adapters.mjs. It supports the published direct provider namespaces where documented and retains standard discovery for the other candidates. EVM proof text is encoded as UTF-8, 0x-prefixed bytes before EIP-1193 personal_sign; the server verifies the recovered address against the exact original challenge text.

| Network | Adapter coverage | Safety boundary |
|---|---|---|
| Ethereum | EIP-6963/EIP-1193; direct Bitget, TokenPocket, Coin98 and OKX namespaces | Connect + personal_sign challenge only; no transaction methods |
| TRON | TIP-6963/TronLink; direct Bitget, TokenPocket and OKX account provider namespaces | Genesis accepts signMessageV2 / TIP-191 only; OKX trx.sign is not treated as equivalent |
| Solana | Wallet Standard; direct Bitget, OKX, Coin98 and TokenPocket app-webview adapters | Off-chain Ed25519 message signing only; no transaction signing or sending |

Automated Node tests use synthetic provider objects and local 64-byte signatures to exercise provider discovery, account normalization, message signing calls, signature normalization, known mainnet identification and deliberate rejection. These tests verify our adapter logic; they do not execute a real vendor wallet binary or prove that a production wallet build behaves identically.

## Live wallet test procedure

1. Use a separate test browser profile and a wallet created specifically for qualification. Never submit a seed phrase or private key to AstroCrown.
2. Open the Genesis development/staging page. Connect the candidate provider and compare the displayed public address with the wallet's own account screen.
3. Confirm the network identifier. Mainnet identity actions remain disabled when the provider cannot explicitly identify the current cluster/chain.
4. Use the wallet-identity control to sign one fresh Genesis challenge. Read the full wallet prompt; it must be plain off-chain text and must not request a transaction, token approval, transfer, message to an arbitrary destination, or payment.
5. Verify server-side that the signature recovers the displayed address and matches the challenge's domain, nonce, purpose, expiry and network. Repeat for a secondary address and ensure it links only to the already authenticated primary wallet.
6. Change accounts and networks. Confirm that changed or disconnected accounts immediately invalidate the locally displayed account state and that a testnet address cannot pass a mainnet gate.
7. Restore the wallet using the wallet vendor's own recovery procedure in a clean test profile. Compare Ethereum, TRON and Solana addresses with the pre-restore addresses. Record the wallet's selected derivation standard where relevant (including Coin98 New/Old standard).
8. Record asset receipt capability by verifying the displayed canonical token and address. Any actual on-chain USDT transfer, even a small one, requires a separate explicit authorization and a separately prepared, low-value test plan; none is initiated by the Genesis qualification code.

## Wallet-specific unresolved checks

| Wallet | Implemented provider route | Required live evidence before qualification |
|---|---|---|
| MetaMask | EIP-6963/EIP-1193; Solana Wallet Standard when exposed | Ethereum and Solana signatures; a separately approved TRON address-attribution route; restore all three addresses |
| Trust Wallet | EIP-6963/EIP-1193, TIP-6963, Solana Wallet Standard when announced | Verify exact injected provider per extension/mobile build; all three message proofs; restore and USDT support |
| OKX Wallet | Direct EVM/Solana; TRON connect namespace | Verify EVM/Solana signatures; TRON requires a server-compatible TIP-191 signMessageV2 result—the documented extension trx.sign result is not accepted by the current verifier |
| Bitget Wallet | window.bitkeep.ethereum, window.bitkeep.tronLink, window.bitkeep.solana | Verify all provider prompts/signature outputs on extension and in-app routes; verify network identification and three-chain restore |
| TokenPocket | window.tokenpocket.ethereum, window.tokenpocket.tron, mobile window.solana | Confirm the exact Solana extension/mobile provider; EVM/TRON/Solana signatures; three-chain restore |
| Coin98 | window.coin98.provider, window.coin98.sol | Confirm EVM personal_sign compatibility; verify sol_signMessage return encoding/address binding; resolve TRON dApp/TIP-191 proof path; verify New/Old restore derivation |

## Result recording

Every result must be explicitly one of: NOT_TESTED, PROVIDER_DETECTED, ACCOUNT_CONNECTED, MESSAGE_SIGNATURE_VERIFIED, NETWORK_SWITCHING_VERIFIED, RESTORE_ADDRESS_MATCHED, USDT_RECEIVE_VERIFIED, USDT_SEND_VERIFIED or QUALIFIED.

A stage cannot be inferred from a previous stage. In particular, PROVIDER_DETECTED, ACCOUNT_CONNECTED or a passing mock test never means QUALIFIED.

## Current result

- Automated adapter contract tests: PASS in Account Staging Worker Qualification run 44212351208, including the EVM personal_sign UTF-8 payload-encoding test added in this revision.
- Synthetic local wallet-signature E2E: PASS in Worker qualification run 44212031251. Tests cover Ethereum primary identity, TRON TIP-191 linked address, Solana Ed25519 linked address, replay prevention, cross-origin protection, case-insensitive name uniqueness, logout/reconnect and no payments.
- Browser mock-wallet safety smoke: PASS in Chromium run 44212351188. It verifies the mocked wallet interaction and that no payment/transaction action is triggered; it does not execute installed vendor wallet apps.
- Pages publication allowlist, browser-facing safety, JavaScript syntax, entitlement rules and D1 schema checks: PASS in run 44212351355.
- Local isolated Worker API smoke, local D1 application, build, preflight parser and remote fail-closed checks: PASS in run 44212351208.
- External Review Pipeline: PASS in run 44212351452; Python CodeQL: PASS in run 44212351395.
- Live installed-wallet signatures: NOT_TESTED for all six candidates.
- Three-network USDT send/receive with each wallet: NOT_TESTED.
- Wallet restore/address derivation on all three networks: NOT_TESTED.
- Production acceptance: disabled; qualifiedWalletIds=[].
- NOVA RSI Engine CI run 44212351346 failed at the pinned immutable Python sandbox image digest verification before compile/unit tests; RSI tests were skipped. This is a separate runner-image issue, not a Genesis wallet adapter failure.
- All six remain CANDIDATE_NOT_QUALIFIED; passing automated adapter tests must not be promoted to wallet qualification.

No real assets, seed phrases, private keys, wallet transactions, token approvals, payment intents or funds are used by the automated tests or this development change.