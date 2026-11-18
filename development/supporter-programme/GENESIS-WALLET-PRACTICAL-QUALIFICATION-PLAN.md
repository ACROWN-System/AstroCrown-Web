# Genesis Wallet Practical Qualification Plan

**Programme status:** PRELAUNCH — qualifying payments disabled.  
**Current qualification wave:** Bitget Wallet, TokenPocket, Coin98, OKX Wallet and Trust Wallet.  
**Purpose:** test only the wallet functions used by Genesis: primary identity, a participant-selected USDT payment route, and receipt of ACROWN as an SPL token on Solana.

## Scope and separation of responsibilities

Wallet qualification is not a three-chain API completeness contest.

- A wallet must identify and prove control of one primary address using a supported off-chain message-signing route. Ethereum or Solana is sufficient for primary identity. For every additional network address the participant intends to register for Genesis payments, the wallet must also support an accepted, separate ownership proof on that network. A TRON payment address therefore requires a TRON address-link proof.
- A wallet must let the holder initiate USDT payment on at least one Genesis payment rail through its native UI or a supported dApp route.
- Genesis independently detects and verifies the on-chain payment. The wallet is not responsible for notifying Genesis that it happened.
- The holder must provide and prove the Solana recipient address. The wallet only needs to receive the ACROWN SPL token; the AstroCrown-authorized signer submits the outgoing transfer.
- Every Genesis payment must originate from a payment address already verified and registered in the primary wallet profile for the same network. The source address remains a payment endpoint, not a login/recovery identity.
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

1. **Primary identity:** connect through a supported Ethereum or Solana route. Compare the displayed address to the wallet's own account screen and sign one fresh Genesis identity challenge. Confirm the backend verifier accepts it only for the same address and challenge.
2. **Registered payment addresses:** for each rail the wallet application is intended to support for Genesis, connect the address on that network and sign a fresh address-link challenge. Verify that the backend links it to the existing primary identity, not a new identity. Then confirm the wallet's native UI can construct the canonical USDT transfer to the official treasury. Do not broadcast a mainnet payment as part of ordinary qualification.
3. **Solana destination:** connect or enter the Solana recipient address and prove control with an off-chain Solana message signature. If this wallet cannot produce an acceptable signature for a separate destination address, record that route as unsupported rather than trusting a pasted address.
4. **Token receipt:** on an isolated Solana test environment, send a test SPL token to the recipient and verify the destination token-account owner and received amount. This tests receiving, not participant-side transaction signing.
5. Record exact wallet app/extension version, platform, OS/browser, provider identifier, primary identity network, selected payment rail and Solana receipt outcome.

No test asks for a seed phrase/private key. No test requires restore of all three network addresses, dApp signatures on payment rails the participant does not intend to use, wallet notification callbacks, or participant-side signing of the ACROWN delivery.

## Selected wallet matrix

| Wallet | Primary identity route | Payment route | Solana delivery route |
|---|---|---|---|
| Bitget Wallet | EVM or Solana message signature | Native USDT transfer on a selected supported rail | Verify signed recipient address and SPL receipt |
| TokenPocket | EVM or Solana message signature; qualify extension/mobile separately if both are released | Native USDT transfer on a selected supported rail | Verify signed recipient address and SPL receipt |
| Coin98 Super Wallet | Solana `sol_signMessage` can be used as primary proof; EVM proof is optional when Solana is selected | For every rail selected, separately prove the network address before payment; TRON cannot be used unless its address-link proof is supported | Verify actual signature return encoding/address binding and SPL receipt |
| OKX Wallet | EVM or Solana message signature | Use TRON only if the selected build can sign the TRON address-link challenge; native send alone is insufficient | Verify signed recipient address and SPL receipt |
| Trust Wallet | EVM or Solana provider route | Native USDT transfer on a selected supported rail | Verify provider, signed recipient address and SPL receipt |

MetaMask is outside this five-wallet test wave, not generally incompatible. It may be considered for Ethereum or Solana if those routes pass. A TRON payment address can be used only if the exact MetaMask build supports the required TRON address-link proof.

## Implementation boundary for registered payment addresses

Already implemented:
- primary wallet identity, off-chain challenge/signature verification, session and name management;
- optional signed wallet-link challenges for PAYMENT and Solana DELIVERY addresses;
- immutable payment/public-record schema, wallet-bound entitlement and badge gates;
- deterministic read-only Ethereum, TRON and Solana USDT evidence parsers;
- normalized two-operator evidence reconciliation tests;
- offline ACS floor-purchase arithmetic and tests.

Not yet implemented:
- server-created payment-intent endpoint and its persistent lifecycle;
- live RPC clients and the qualified two-operator provider registry;
- entitlement-credit writer and the full append-only payment-to-entitlement workflow;


**Adopted rule:** the D1 payment table and trigger require a pre-registered PAYMENT address linked to the same primary identity and network. This is the permanent Genesis policy, not a temporary limitation. No one-time unlinked-source payment path will be built. If an app cannot sign a TRON address-link challenge, that address cannot be used for TRON Genesis payments, although the same app may still qualify for Ethereum or Solana if those addresses pass their own proof and payment checks.

## System-level payment verification (not repeated for every wallet)

Genesis accepts three payment rails, each with its own parser:

- Ethereum Mainnet USDT ERC-20: canonical contract, exact Transfer event, source and treasury, exact amount, successful receipt and safe/finalized canonical block.
- TRON Mainnet USDT TRC-20: canonical contract, exact Transfer event, source and treasury, exact amount, successful execution and SolidityNode solidified receipt.
- Solana Mainnet USDT SPL: canonical mint/program, finalized transaction, source/destination token-account owners, exact transfer instruction and debit/credit deltas.

The existing deterministic parsers and two-operator reconciliation function are read-only. A future live service must obtain the evidence through at least two separately operated and qualified RPC providers, bind it to a server-created payment intent, and prevent duplicate credit using network + transaction ID + transfer/event/instruction index. A wallet's UI, callback or submitted hash is never authoritative.

A qualifying payment creates only the wallet-bound ACROWN purchase entitlement. It does not itself buy or issue ACROWN. The subsequent ACS pure-floor purchase and Solana delivery remain separate stages.

## Current automated evidence

Latest validation of the narrowed wallet-use-case policy:

- **Account Staging Worker Qualification — PASS**, run [44233002267](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44233002267). The Worker invariant suite passed 100/100 tests; canonical and mirrored schema tests passed 19/19; restricted asset build, published Genesis page/script checks, browser-code and Worker-bundle checks, local D1 application, local Worker/API/homepage smoke, deployment/preflight parsing and remote fail-closed checks all passed.
- **Cloudflare Pages Static Preview Build — PASS**, run [44233002246](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44233002246). Publication allowlist, browser-facing safety, JavaScript syntax, deterministic entitlement and D1 schema checks passed.
- **Homepage Browser Smoke — PASS**, run [44233002269](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44233002269). Its wallet-specific synthetic-provider suite passed 24/24 checks. EVM public-address connection was exercised for MetaMask, Trust Wallet, Bitget Wallet, TokenPocket, Coin98 and OKX Wallet. TRON public-account connection was exercised for Bitget, TokenPocket, OKX, Trust Wallet and TronLink. Solana public-account connection was exercised for all six candidate providers. The test deliberately made no signature, transaction, approval or transfer calls and blocked external HTTP(S) access. This is mock-provider browser evidence only.
- **External Review Pipeline CI — PASS**, run [44233002380](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44233002380).
- **Python CodeQL — PASS**, run [44233002261](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44233002261).
- **NOVA RSI Engine CI — FAILED before tests**, run [44233002319](https://github.com/ACROWN-System/AstroCrown-Web/actions/runs/44233002319). The runner's pinned Docker image digest did not match the expected immutable digest; Python compile/RSI tests did not execute. This is a separate NOVA runner-image issue, not a Genesis wallet or payment test failure.

Installed wallet applications and exact production versions have not been used in this automated environment. Therefore:
- Live primary-wallet signatures on the installed five wallet applications: NOT_TESTED.
- Actual native USDT transfer UX in each wallet application: NOT_TESTED.
- Solana SPL test-token receipt using each installed application as the recipient: NOT_TESTED.
- Live RPC, payment-intent service, entitlement credit, ACS floor quote/purchase and ACROWN delivery: NOT_IMPLEMENTED / DISABLED.
- Production wallet allowlist: empty.

The 24/24 browser checks must not be described as five (or six) live-wallet approvals. They prove that the preview's provider-discovery and public-account connection code handles synthetic provider interfaces without requesting signatures or moving funds.

No real wallet seed, private key, mainnet transfer, token approval, payment, entitlement credit, token transfer or remote migration was used or performed by these tests.
