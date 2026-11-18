# Genesis Wallet Compatibility — Use-Case Qualification

**Programme status:** PRELAUNCH; qualifying payments remain disabled.  
**Current qualification wave:** Bitget Wallet, TokenPocket, Coin98, OKX Wallet and Trust Wallet.  
**Outside this five-wallet wave:** MetaMask. Its previously identified TRON dApp limitation is recorded, not treated as proof that the wallet is generally incapable of receiving or sending assets.

## The actual Genesis wallet job

A wallet is compatible when it can support the specific user journey—not when it exposes every API on every supported chain.

1. **Identify the holder.** Connect one primary wallet address and prove control with a domain-bound off-chain message signature on one supported identity route. Ethereum or Solana is sufficient. TRON message signing is optional; it is not a universal wallet requirement.
2. **Make a qualifying payment.** The participant sends USDT using one of the available payment rails: Ethereum ERC-20, TRON TRC-20 or Solana SPL. A wallet does not have to expose a dApp provider or message-signing method on all three chains. The exact payment route used must be supported by that wallet's own interface.
3. **Verify the payment.** Genesis—not the wallet application—detects and validates the completed on-chain transfer. A wallet popup, balance display, explorer link or provider event is not payment evidence. A submitted transaction hash may start reconciliation; it cannot credit an entitlement.
4. **Receive ACROWN on Solana.** The participant supplies a verified Solana recipient address that can receive the ACROWN SPL token. AstroCrown's separately authorized Solana signer sends the token. The participant's wallet does not need to sign or submit the outgoing ACROWN transaction.

## What is required from each wallet

| Capability | Required? | Qualification meaning |
|---|---|---|
| Connect and identify one primary address | Yes | The selected identity route must provide a stable public address |
| Sign one off-chain identity challenge | Yes | Server verifies the signature, address, domain, purpose, nonce and expiry |
| Send USDT on at least one offered payment rail | Yes | The wallet's native UI or supported dApp flow can initiate the chosen transfer |
| Have special dApp signing APIs on Ethereum, TRON and Solana | No | Payment attribution is chain-side; TRON dApp signing is not required just to verify a TRON transfer |
| Notify Genesis when payment is complete | No | Chain observation and independent RPC verification determine completion |
| Receive the ACROWN SPL token on Solana | Yes | Provide a valid recipient address and confirm token receipt/display |
| Sign a transaction to receive ACROWN | No | The participant is the recipient; AstroCrown's authorized signer submits delivery |
| Restore every network address during wallet qualification | No | Wallet backup and recovery remain the holder's responsibility, not a programme feature |
| Test every platform for every wallet brand | No | Qualify the exact app or extension route that is actually offered and used |

The programme as a whole still supports all three USDT payment rails. That is a system-level requirement, not a rule that every wallet must implement all three dApp APIs. Each enabled payment rail must pass its own server-side verification tests independently.

## Payment attribution and wallet identity

The primary wallet remains the Genesis identity and recovery anchor.

A qualifying payment is associated with that identity through its server-created payment intent and independently verified transaction evidence. The evidence records the actual sending address, canonical USDT asset, receiving treasury, exact amount, transaction or transfer index, success and finality. The source address is retained in the payment record; it does not automatically become a login or recovery wallet.

Where a distinct Solana delivery address is used, it must prove control before ACROWN is sent to it. A Solana off-chain message signature is preferred. If a wallet cannot produce a compatible proof, do not silently trust a pasted address; a separately reviewed equivalent proof method is required.

## Canonical payment rails

| Network | Asset | Canonical identifier | Precision |
|---|---|---|---:|
| Ethereum Mainnet | USDT ERC-20 | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | 6 |
| TRON Mainnet | USDT TRC-20 | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` | 6 |
| Solana Mainnet Beta | USDT SPL | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` | 6 |

These system-level checks remain mandatory for each activated rail:

- canonical network and token contract/mint and on-chain decimals;
- exact source address, Genesis treasury and base-unit amount;
- successful chain execution and chain-appropriate finality;
- unique transaction plus transfer/event/instruction index;
- independent evidence from at least two independently operated RPC operators;
- duplicate protection and fail-closed behavior when providers disagree or evidence is incomplete.

Those checks are implemented as read-only deterministic parsers and reconciliation functions. They are not yet a live RPC client, payment-intent API or entitlement-credit service.

## Five-wallet qualification wave

| Wallet | Identity route to test | Payment use | Solana delivery |
|---|---|---|---|
| Bitget Wallet | EVM or Solana message signature | Use its native USDT send interface on a selected supported rail | Verify recipient address and SPL receipt |
| TokenPocket | EVM or Solana message signature; test selected extension/mobile route | Use its native USDT send interface on a selected supported rail | Verify recipient address and SPL receipt |
| Coin98 Super Wallet | Solana `sol_signMessage` is a documented primary route; EVM `personal_sign` is optional | A missing TRON dApp signature route does not block a native USDT transfer whose on-chain evidence is verified | Confirm signature encoding/address binding and SPL receipt |
| OKX Wallet | EVM or Solana message signature | Its native TRON transfer can be attributed from the chain; `trx.sign` is not treated as a Genesis identity signature | Verify recipient address and SPL receipt |
| Trust Wallet | EVM or Solana provider route on the selected platform | Use its native USDT send interface on a selected supported rail | Verify provider, recipient address and SPL receipt |

A provider adapter or mocked test only demonstrates that our code handles a documented interface shape. It does not qualify an installed wallet binary. The current Chromium smoke exercised synthetic providers across the six previously evaluated brands; that run must not be described as five live-wallet approvals.

## Tests that are deliberately not required

The following earlier requirements were broader than the actual use case and are removed from the wallet acceptance gate:

- a wallet must dApp-connect and sign a challenge independently on Ethereum, TRON and Solana;
- each wallet must send and receive USDT on all three chains;
- each wallet must complete recovery/restore and address-derivation tests for all three chains;
- a wallet must notify the website after a payment;
- the participant wallet must sign or send the ACROWN Solana delivery transaction.

A wallet-specific TRON dApp signature gap is therefore not, by itself, a reason to reject that wallet for Genesis. If the holder establishes primary identity on Ethereum or Solana, a TRON payment can still be verified by the chain evidence. The wallet must still be able to initiate the TRON USDT transfer in its own interface if TRON is the selected payment route.

## Remaining practical qualification

For each of the five wallet applications, on the exact platform/build intended for release:

1. Connect the wallet and verify the displayed primary address.
2. Sign one off-chain Genesis challenge using the selected Ethereum or Solana identity route; verify it with the same server verifier used by Genesis.
3. Open the wallet's native USDT transfer screen and confirm that it can construct a payment on at least one Genesis rail, with the correct network and canonical asset selected. Do not send mainnet funds during this step.
4. Connect or submit the intended Solana delivery address and prove its control.
5. On an isolated Solana test environment, receive a test SPL token using the same token-account/recipient pattern intended for ACROWN. Verify the resulting destination owner and token balance.
6. Record app/extension version, OS/browser, provider identifier, identity network, payment rail tested and delivery result.

Actual mainnet USDT transfers are not required to establish provider compatibility and must not be initiated as an incidental test. Payment verifier qualification remains a separate system-level exercise using fixtures, independently sourced mainnet reads and an expressly approved end-to-end plan.

## Status vocabulary

- `NOT_TESTED`
- `PROVIDER_DETECTED`
- `ACCOUNT_CONNECTED`
- `PRIMARY_SIGNATURE_VERIFIED`
- `PAYMENT_RAIL_UI_CONFIRMED`
- `SOLANA_RECIPIENT_VERIFIED`
- `SPL_RECEIPT_TESTED`
- `QUALIFIED_FOR_GENESIS_USE_CASE`

No wallet is production-approved until the required live tests pass for its exact release route. The current production allowlist remains empty. All qualifying payment routes remain disabled; no payment intent, entitlement credit, ACS purchase, ACROWN transfer or remote deployment is enabled by this qualification register.

## Official documentation pointers

- Bitget Wallet EVM, TRON, Solana and WalletConnect provider documentation: https://web3.bitget.com/en/docs/connect/mainnet/evm ; https://web3.bitget.com/en/docs/connect/mainnet/tron ; https://web3.bitget.com/en/docs/connect/mainnet/solana ; https://web3.bitget.com/en/docs/connect/adaptor/wallet-connect
- TokenPocket EVM and TRON provider documentation: https://help.tokenpocket.pro/developer-en/extension-wallet/api-reference/ethereum-provider-api ; https://help.tokenpocket.pro/developer-en/extension-wallet/api-reference/tron-provider-api ; developer index: https://help.tokenpocket.pro/developer-en/llms.txt
- Coin98 EVM, Solana and Coin98 Connect documentation: https://docs.coin98.com/developer-guide/dapps-integration/evm-compatible-dapps-integration ; https://docs.coin98.com/developer-guide/solana-dapps-integration ; https://docs.coin98.com/developer-guide/coin98-connect-integration
- OKX Wallet developer documentation: https://www.okx.com/web3/build/docs
- Trust Wallet developer documentation: https://developer.trustwallet.com/
