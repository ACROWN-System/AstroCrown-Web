# Genesis Wallet Practical Qualification Plan

**Programme status:** PRELAUNCH — qualifying payments disabled.  
**Current qualification wave:** Bitget Wallet, TokenPocket, Coin98, OKX Wallet and Trust Wallet.  
**Purpose:** test only the wallet functions used by Genesis: primary identity, a participant-selected USDT payment route, and receipt of ACROWN as an SPL token on Solana.

## Scope and separation of responsibilities

Wallet qualification is not a three-chain API completeness contest.

- A wallet must identify and prove control of one primary address using one supported off-chain message-signing route. Ethereum or Solana is sufficient; TRON signing is optional.
- A wallet must let the holder initiate USDT payment on at least one Genesis payment rail through its native UI or a supported dApp route.
- Genesis independently detects and verifies the on-chain payment. The wallet is not responsible for notifying Genesis that it happened.
- The holder must provide and prove the Solana recipient address. The wallet only needs to receive the ACROWN SPL token; the AstroCrown-authorized signer submits the outgoing transfer.
- A separate payment source address is recorded from the verified transfer and bound to the payment intent. It does not become a login/recovery wallet merely because it sent USDT.
- Wallet vendor recovery/restore testing on every network is not a Genesis qualification gate. Wallet recovery remains the holder's responsibility.

## Implemented automated tests

The preview has provider adapters for EVM, TRON and Solana discovery. Synthetic Node tests cover documented provider namespaces, EVM message payload encoding, Solana message-signature normalization, account continuity, mainnet identification where exposed, and deliberate rejection of signatures that do not match the connected address.

| Function | Current automated coverage | What this proves |
|---|---|---|
| Primary identity | EVM and Solana provider adapters plus server-side challenge verification tests | Our code handles the documented provider shapes; synthetic signatures are accepted only for the matching address and challenge |
| TRON payment route | TRON provider discovery and account display adapters | Provider discovery only; wallet native transfer UX still requires live app confirmation |
| Payment detection | Separate deterministic Ethereum, TRON and Solana evidence parsers and RPC evidence reconciliation tests | Exact synthetic chain evidence can be accepted/rejected; this is not a live RPC client |
| Solana delivery | Solana address/provider discovery and signature-verification foundations | A recipient can be identified and ownership-proven in tests; SPL ACROWN delivery remains unimplemented |

Automated tests use synthetic providers, keys and chain responses. They do not execute installed vendor wallet binaries or move funds.

## Exact practical tests per wallet

For each selected wallet app and the precise platform intended for release:

1. **Identity:** connect through its supported EVM or Solana route. Compare the displayed address to the wallet's own account screen. Sign one fresh Genesis off-chain challenge. Confirm the backend verifier accepts it only for the same address and challenge.
2. **Payment:** confirm that the wallet's native UI can construct a USDT transfer on at least one supported rail. Confirm the selected network, canonical token and recipient display. Do not broadcast a mainnet payment as part of ordinary qualification.
3. **Solana destination:** connect or enter the Solana recipient address and prove control with an off-chain Solana message signature. If this wallet cannot produce an acceptable signature for a separate destination address, record that route as unsupported rather than trusting a pasted address.
4. **Token receipt:** on an isolated Solana test environment, send a test SPL token to the recipient and verify the destination token-account owner and received amount. This tests receiving, not participant-side transaction signing.
5. Record exact wallet app/extension version, platform, OS/browser, provider identifier, primary identity network, selected payment rail and Solana receipt outcome.

No test asks for a seed phrase/private key. No test requires restore of all three network addresses, dApp signatures on every rail, wallet notification callbacks, or participant-side signing of the ACROWN delivery.

## Selected wallet matrix

| Wallet | Primary identity route | Payment route | Solana delivery route |
|---|---|---|---|
| Bitget Wallet | EVM or Solana message signature | Native USDT transfer on a selected supported rail | Verify signed recipient address and SPL receipt |
| TokenPocket | EVM or Solana message signature; qualify extension/mobile separately if both are released | Native USDT transfer on a selected supported rail | Verify signed recipient address and SPL receipt |
| Coin98 Super Wallet | Solana `sol_signMessage` can be used as primary proof; EVM proof is optional when Solana is selected | TRON dApp signing is not required; native USDT send plus chain verification is sufficient | Verify actual signature return encoding/address binding and SPL receipt |
| OKX Wallet | EVM or Solana message signature | TRON `trx.sign` is not required for payment attribution; native USDT send plus chain verification is sufficient | Verify signed recipient address and SPL receipt |
| Trust Wallet | EVM or Solana provider route | Native USDT transfer on a selected supported rail | Verify provider, signed recipient address and SPL receipt |

MetaMask is outside this five-wallet test wave. Its earlier TRON dApp integration limitation is not treated as a general incompatibility under this narrower policy; it can be reconsidered as a later candidate without requiring a TRON message-signing API.

## System-level payment verification (not repeated for every wallet)

Genesis accepts three payment rails, each with its own parser:

- Ethereum Mainnet USDT ERC-20: canonical contract, exact Transfer event, source and treasury, exact amount, successful receipt and safe/finalized canonical block.
- TRON Mainnet USDT TRC-20: canonical contract, exact Transfer event, source and treasury, exact amount, successful execution and SolidityNode solidified receipt.
- Solana Mainnet USDT SPL: canonical mint/program, finalized transaction, source/destination token-account owners, exact transfer instruction and debit/credit deltas.

The existing deterministic parsers and two-operator reconciliation function are read-only. A future live service must obtain the evidence through at least two separately operated and qualified RPC providers, bind it to a server-created payment intent, and prevent duplicate credit using network + transaction ID + transfer/event/instruction index. A wallet's UI, callback or submitted hash is never authoritative.

A qualifying payment creates only the wallet-bound ACROWN purchase entitlement. It does not itself buy or issue ACROWN. The subsequent ACS pure-floor purchase and Solana delivery remain separate stages.

## Current automated evidence

- Synthetic provider/adaptor tests passed in the latest Account Staging Worker qualification before the current scope reduction.
- The previous Chromium smoke injected synthetic providers for six evaluated brands. It demonstrated browser discovery/connect behavior and no signing, transaction, approval or transfer calls. It is not a live-wallet qualification and must not be relabelled as one.
- Ethereum, TRON and Solana synthetic payment-evidence parser and two-operator comparison tests passed. These functions do not connect to RPC, write D1 or apply entitlement credit.
- Live signatures on installed wallet builds: NOT_TESTED.
- Native USDT transfer UX on installed wallet builds: NOT_TESTED.
- Solana SPL receipt test for the ACROWN destination flow: NOT_TESTED.
- Mainnet payment intent, live RPC reconciliation, entitlement credit and ACROWN delivery: NOT_IMPLEMENTED / DISABLED.
- Production wallet allowlist remains empty.

No real wallet seed, private key, mainnet transfer, token approval, payment, entitlement credit, token transfer or remote migration was performed by the automated qualification work.
