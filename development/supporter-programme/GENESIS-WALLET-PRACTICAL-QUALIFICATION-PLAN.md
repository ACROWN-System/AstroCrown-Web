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

The ordinary account and Genesis member screens present wallet brands and logos first, then show only the identity-proof networks detected for the selected provider. Wallet provider adapters cover EVM, TRON and Solana discovery. Synthetic Node tests cover documented provider namespaces, EVM message payload encoding, Solana message-signature normalization, brand-to-provider binding, duplicate-provider rejection, account continuity, mainnet identification where exposed, and rejection of signatures that do not match the connected address. Five branded wallet SVGs are locally hosted from a pinned MIT-licensed Web3 Icons revision; Bitget uses its current official brand-kit logomark.

| Function | Current automated coverage | What this proves |
|---|---|---|
| Primary identity | EVM and Solana provider adapters plus server-side challenge verification tests | Our code handles the documented provider shapes; synthetic signatures are accepted only for the matching address and challenge |
| TRON payment route | TRON provider discovery and account display adapters | Provider discovery only; wallet native transfer UX still requires live app confirmation |
| Payment detection | Deterministic Ethereum, TRON and Solana evidence parsers, independent-source reconciliation, live RPC monitor modules, cursor/backlog handling and chain-finality checks | Synthetic evidence tests qualify parsing; the live RPC path is implemented but has not been tested against owner-configured node instances |
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

Implemented in code and covered by local fixtures/schema tests:
- primary wallet identity, off-chain challenge/signature verification, sessions and unique display names;
- signed wallet-link challenges for additional same-profile PAYMENT and Solana DELIVERY addresses;
- wallet-brand-first account and Genesis selectors, local wallet logos, detected-network filtering and duplicate-provider fail-closed behaviour;
- versioned Genesis terms acceptance and a draft-only terms status page;
- exact six-decimal USDT payment-intent creation, per-profile open-intent limit, global principal-capacity reservation, expiry display and owner cancellation;
- Ethereum, TRON SolidityNode and Solana finalized RPC scanners with two-source evidence reconciliation, immutable receipt records, chain occurrence timestamps, finality and backlog-safe retry;
- receipt-to-intent matching, settlement-order final tier calculation, shared allowance accounting, append-only allowance events and Genesis Member badge activation;
- local D1 migration parity and end-to-end qualifying-payment trigger tests.

Not yet production-qualified or enabled:
- physical installed-wallet/browser/device testing for each release route;
- owner-configured live RPC node operation and independent source-operator review;
- remote Cloudflare staging D1 migration and end-to-end settlement against real mainnet observations;
- approved final Genesis payment terms, verified treasury custody and explicit network activation;
- ACS floor-price purchase, ACROWN inventory delivery, Solana token-transfer signing and actual token receipt.

No real funds, wallet transaction, payment activation, remote entitlement credit, remote migration or remote deployment is permitted by this qualification branch.


**Adopted rule:** the D1 payment table and trigger require a pre-registered PAYMENT address linked to the same primary identity and network. This is the permanent Genesis policy, not a temporary limitation. No one-time unlinked-source payment path will be built. If an app cannot sign a TRON address-link challenge, that address cannot be used for TRON Genesis payments, although the same app may still qualify for Ethereum or Solana if those addresses pass their own proof and payment checks.

## System-level payment verification (not repeated for every wallet)

Genesis accepts three payment rails, each with its own parser:

- Ethereum Mainnet USDT ERC-20: canonical contract, exact Transfer event, source and treasury, exact amount, successful receipt and safe/finalized canonical block.
- TRON Mainnet USDT TRC-20: canonical contract, exact Transfer event, source and treasury, exact amount, successful execution and SolidityNode solidified receipt.
- Solana Mainnet USDT SPL: canonical mint/program, finalized transaction, source/destination token-account owners, exact transfer instruction and debit/credit deltas.

The Worker includes live network-specific RPC monitor paths that call the deterministic parsers and two-source reconciliation, bind receipts to a server-created payment intent and use the unique network + transaction + transfer/event/instruction index to prevent duplicate credit. The monitor waits until all three chains are caught up to their finalized/solidified heads and then settles only receipts older than the minimum cross-network head-time watermark, ordered by on-chain occurrence time. A wallet UI, callback or submitted hash is never authoritative. Source-operator independence and live-node reliability remain manual release qualifications; distinct URLs/source IDs alone do not prove independent operation.

A qualifying payment adds capacity to the shared Genesis-programme-wide USDT purchase-allowance pool; it does not create a wallet-bound or personal allowance and does not itself buy or issue ACROWN. Any eligible pre-freeze registered wallet may later draw from the remaining shared pool for a separate ACS pure-floor purchase, followed by Solana delivery.

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
