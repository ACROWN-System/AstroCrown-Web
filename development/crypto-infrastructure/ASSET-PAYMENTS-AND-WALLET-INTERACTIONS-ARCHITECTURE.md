# Asset, Payment and Wallet-Interaction Architecture

**Document ID:** ACW-CRYPTO-ARCH-001  
**Date:** 2026-11-02  
**Status:** DRAFT ARCHITECTURE / DEVELOPMENT-ONLY — NOT A PRODUCTION OR ASSET-ACCEPTANCE AUTHORIZATION  
**Scope:** AstroCrown website wallet connectivity, asset discovery, payments, swaps and future on-chain interactions  
**Related work:** [Account foundation PR #141](https://github.com/ACROWN-System/AstroCrown-Web/pull/141); [NOVA administrative smart-account architecture PR #175](https://github.com/ACROWN-System/NOVA/pull/175)

## 1. Purpose and accepted direction

AstroCrown must be architected to support a broad and extensible range of blockchain networks, wallet types, asset standards and on-chain interactions. The product must not be structurally limited to one wallet, one chain, one token program or one exchange/aggregator.

**Solana-first development is not a Solana-only product decision.** Solana remains the preferred provisional first public integration environment for the current NOVA administrative smart-account work. The customer-facing AstroCrown asset and payment layer must be designed so additional chain families and their different transaction models can be introduced through isolated adapters, without redesigning the account system or rewriting the common user experience.

This is an extensibility requirement, not a claim that every chain, token, wallet, swap route or DeFi protocol is already supported or will be accepted automatically. Support must be declared by exact network, asset identity, capability and qualification status.

The existing ordinary account remains independent from crypto-wallet access. Users must be able to register, sign in and use non-wallet-dependent website features without connecting a wallet. An address or wallet connection never grants an account role, administrator privilege or permission.

## 2. Architectural separation

Keep the following layers distinct:

1. **Website account and authorization layer** — ordinary AstroCrown identity, sessions, roles, consent, service eligibility and server-side permissions. This remains authoritative for website access.
2. **Wallet connection and signing layer** — chain-specific wallet connectors and adapters. It discovers available wallets, requests user consent, exposes supported accounts and asks the wallet to sign an exact message or transaction. Private keys and seed phrases remain with the user or their hardware wallet.
3. **Network and asset registry** — canonical identity of a network and an asset on that network, including its program/contract, token identifier, decimals, authorities, extensions and verified metadata.
4. **Interaction adapters** — separately replaceable implementations for payments, swaps, bridging, NFTs, staking, lending, governance, account abstraction and other capabilities. A wallet connector is not itself a payment processor or a liquidity provider.
5. **Payment, accounting and settlement layer** — invoices, amounts due, exchange-rate snapshots, fee disclosure, confirmations, transaction history, refunds and any optional conversion to an approved settlement asset.
6. **NOVA policy, monitoring and operational-security layer** — governs only the operations, accounts and networks for which the necessary NOVA enforcement and monitoring components have actually been implemented and qualified. It must not imply control over a user's independent wallet or an unintegrated chain.

These layers must communicate through documented interfaces and typed records. Chain-specific behavior must remain inside the corresponding adapter; common business logic must not assume that every chain uses EVM accounts, ERC standards, account-based balances or the same signing model.

## 3. Asset coverage model

The registry and adapter interfaces should be able to represent, at minimum, the following categories:

| Asset family | Candidate examples | Important distinction |
|---|---|---|
| Native network assets | SOL, ETH, BTC, ADA, SUI, ALGO, XLM, ATOM and native assets on other supported networks | Each network has its own fee, address, transaction and finality model |
| Fungible tokens | SPL Token, Token-2022, ERC-20, Cosmos IBC/ICS-20 assets, Cardano native multi-assets, Algorand Standard Assets, Stellar assets and equivalent standards | Same ticker or display name does not establish the same asset |
| Stablecoins | Native and issued stablecoins on supported chains | Issuer, contract/mint, freeze/blacklist powers, redemption and bridge provenance matter |
| Wrapped and bridged assets | Wrapped native assets and cross-chain representations | Treat each chain representation as a distinct asset with its own bridge/custody risk |
| Non-fungible assets | ERC-721, ERC-1155, Metaplex Token Metadata, Metaplex Core and chain-specific NFT standards | Collection, token ID, owning program/contract and transfer rules must be verified |
| Multi-asset and semi-fungible assets | ERC-1155, Cardano native multi-assets, Sui objects and chain-specific equivalents | Do not flatten different object/account models into an inaccurate generic ERC-style token model |
| DeFi and receipt assets | LP tokens, vault shares, staking derivatives, lending receipts and tokenized positions | These represent protocol-specific claims or positions; they are not ordinary payment tokens by default |
| Other programmable or domain-specific assets | Compressed NFTs, inscriptions and future chain-specific asset models | Require a dedicated parser, ownership model, transaction path and risk review before support |

This is a target representation scope, not an instruction to enable every category on day one. A category may be visible, read-only, payment-enabled, swap-enabled or fully disabled independently.

### 3.1 Canonical asset identity

Never identify an asset solely by ticker, name, logo, metadata URL, token-list entry or user-supplied symbol. An asset record must at least bind:

- network namespace and exact chain/network identifier;
- network environment (Mainnet, Testnet, Devnet or Localnet);
- chain-specific asset namespace and exact contract, mint, policy ID, denom, object ID or equivalent identifier;
- token/program/contract standard and version;
- token ID where the asset is individually addressable;
- decimals and exact integer base-unit representation where applicable;
- relevant mint, freeze, pause, blacklist, delegate, upgrade, transfer-fee, hook or issuer authorities;
- wrapped/bridged provenance, where relevant;
- metadata provenance and verification status; and
- the revision/date of the asset's review and support decision.

Use chain-agnostic identifier conventions such as [CAIP-2](https://standards.chainagnostic.org/CAIPs/caip-2) for blockchain identifiers, [CAIP-10](https://standards.chainagnostic.org/CAIPs/caip-10) for account identifiers and [CAIP-19](https://standards.chainagnostic.org/CAIPs/caip-19) for asset types/IDs where the relevant chain namespace has a suitable definition. Retain chain-specific fields rather than assuming these identifiers replace all native validation.

The same ticker on two networks, a native asset and its wrapped version, or two tokens with similar names must remain separate records unless an explicit verified relationship is established. A bridge representation is not automatically equivalent to the original asset.

### 3.2 Asset capability states

The registry must record capabilities separately for each asset and network. Proposed states are:

- **DISCOVERABLE** — may be displayed as unverified information; no transaction is enabled.
- **READ_ONLY** — balances/ownership or metadata may be read using a qualified source.
- **PAYMENT_ENABLED** — may be received for the specifically defined payment use case.
- **TRANSFER_ENABLED** — may be sent through an explicitly supported and reviewed path.
- **SWAP_ENABLED** — may be used as an input/output only when a live route and liquidity quote are available and pass policy.
- **BRIDGE_ENABLED** — may be transferred cross-chain only through a separately qualified route.
- **SPECIAL_ACTION_ENABLED** — a specific separately reviewed capability such as staking, NFT purchase, governance or a lending action is enabled.
- **REVIEW_REQUIRED / RESTRICTED / BLOCKED / DEPRECATED** — transaction capability is withheld pending review, policy resolution or retirement.

The states are not a simple ladder. For example, an asset may be payment-enabled but not swap-enabled, or read-only but not eligible for payment. Unknown programs, contracts, mints, extensions, hooks, token formats and transaction instructions must fail closed for actions that have not been explicitly qualified.

## 4. Wallet and network extensibility

Use a common connector interface with chain-specific adapters. Do not force every wallet into a single signing or address model.

Candidate wallet interface families include:

- EVM provider interfaces such as EIP-1193, with chain switching and contract-call validation;
- Solana wallet interfaces such as Wallet Standard, with native transaction/message signing;
- Bitcoin wallet and PSBT flows, including UTXO-aware transaction construction and review;
- Cardano CIP-30 wallet interfaces and their chain-specific extensions;
- Cosmos wallet/signing interfaces and IBC-aware account/denom handling; and
- additional adapters for networks such as Sui, Algorand, Stellar, NEAR, Tezos, Polkadot and TON when a concrete product requirement justifies them.

A multichain SDK such as Reown AppKit may be evaluated as a connector/UI candidate, but it must not become a mandatory architectural dependency until supported chains, wallet coverage, current terms, license, maintenance, security, API limits, privacy, reliability and $0-development feasibility have been verified. A common modal does not eliminate chain-specific adapters or protocol-specific transaction validation.

### 4.1 Wallet-based sign-in proof is chain-specific

Wallet connection is not the same as authentication. A connector may expose accounts and network context, but only a verified proof-of-control can establish that the user controls a selected wallet. A signed authentication message is not a transaction and must never grant permission to move assets.

The account layer should own a common challenge lifecycle (origin, audience, purpose, account/session binding, random single-use nonce, issue time and expiry). Each wallet-family adapter must then create and verify its own canonical message format. For the current account scope, the first explicit families to plan for are:

| Family | Authentication proof | Why it needs its own adapter |
|---|---|---|
| EVM / Ethereum | EIP-4361 (Sign-In with Ethereum); ERC-1271 verification where applicable to contract accounts | SIWE binds an Ethereum-style address and EIP-155 chain ID and has specific EVM message semantics. Contract wallets may require contract-based signature validation rather than ordinary EOA recovery. |
| Bitcoin | BIP-322 generic signed-message proof, restricted to qualified wallet/script variants | Bitcoin uses UTXOs and script/address types, not EVM account addresses. Wallet support for message signing and BIP-322 variants must be detected; never use a payment or spending PSBT as a login substitute. |
| Solana | Sign In With Solana (SIWS) and Solana off-chain message signing (OCMS) | Solana has its own message envelope, signer/public-key rules and wallet feature negotiation. Prefer a proof format that cannot be mistaken for a transaction. |

This is an architecture target, not implemented support. The account prototype currently uses EIP-4361/SIWE for its EVM wallet lab. Bitcoin and Solana authentication adapters remain future work and must not be implied by a generic multi-wallet button.

For each family, detect wallet capabilities before prompting the user. If an adapter cannot obtain a supported proof, stop that wallet-authentication attempt with a clear explanation. Do not silently downgrade to an unreviewed signature format or ask the user to sign a token-transfer, PSBT-spend, no-op or other blockchain transaction merely to authenticate.

The common data model must preserve wallet family, CAIP namespace/network where defined, exact chain/network, canonical account/address, Bitcoin script/address type where applicable, signature standard/version, verification and revocation state. One AstroCrown account may enroll different families without merging their identities. An address on one chain does not become the same address on another chain just because the strings resemble each other.

Administrator step-up remains separate from ordinary account sign-in: verify the ordinary AstroCrown session and server-owned admin role first, then require a fresh proof from an enrolled wallet. The provisional maximum of three enrolled wallets is across all families combined; the minimum remains unresolved. One-of-N means alternative authenticators, not an on-chain multisig. An external Bitcoin or Ethereum proof may authenticate the administrator to the website, but it does not change NOVA current Solana-native operations-account or transaction-enforcement model.

Requirements:

- Users choose which wallet/network to connect; connection is optional and scoped to the feature that needs it.
- Support multiple wallets and multiple chain accounts where the product requires them. Bind each account to its chain identifier; do not merge different addresses into one identity by string comparison.
- A chain/network switch must be explicit and confirmed. Reject a transaction prepared for a different network than the wallet currently exposes.
- Message signing for account proof must be distinguished from transaction signing. A login signature must never be treated as consent to transfer assets.
- Never request seed phrases or private keys. Never place them in AstroCrown, NOVA, server logs, analytics, CI, support workflows or chat.
- Wallet disconnection and account/network change events must invalidate stale transaction previews and re-check server-side authorization.
- Hardware wallets and wallet-mediated confirmation should remain compatible where supported by the selected adapter.
- A connected wallet is not automatically a verified account owner, approved recipient, trusted token issuer or eligible payment instrument.

## 5. Website capabilities to support through independent adapters

The website should be designed to add these capability modules without assuming all are available on every chain:

### 5.1 Payments and receipts

- Request a payment in a specific network and exact asset, with a clear invoice/reference, amount, expiry and receiving destination.
- Display the asset's network, exact contract/mint/denom or native-asset identity, decimals, estimated network fee and any platform fee before confirmation.
- Detect a payment only from the authoritative chain data or a qualified payment service, and record pending, confirmed, failed, expired, underpaid, overpaid and disputed states separately.
- Apply chain-specific confirmation/finality thresholds and handle reorganizations, dropped transactions, delayed indexing and provider outages.
- Preserve the original asset and amount received in the accounting record even where a separate conversion/settlement step follows.
- Define refund handling explicitly. A normal blockchain transfer is generally not reversible; a refund is a new, separately authorized transfer and depends on available funds and the correct recipient.
- Do not send a newly detected or unsupported token into treasury-controlled addresses merely because it arrived at a monitored address.

### 5.2 Swaps and trading

- Obtain a fresh executable quote from a chain-specific DEX or aggregator adapter.
- Show input/output assets, exact amounts, minimum expected output, price impact, route, slippage limit, network fee, provider fee and quote expiry.
- Require user review and wallet approval of the exact transaction; reject stale quotes and changed transaction payloads.
- Validate the destination program/router, token approvals, spend limit and route before signing. Avoid unlimited or persistent approvals by default; provide clear allowance information and revocation guidance where the chain supports it.
- Verify liquidity and executable route at the time of the request. An asset's presence in a token list does not prove sufficient liquidity.
- Keep swap aggregators replaceable. Jupiter is a candidate for Solana; Uniswap's API is one candidate for supported EVM networks. Neither is a universal multi-chain swap engine, and their current supported chains/tokens, limits, terms and pricing must be checked before integration.

### 5.3 Cross-chain transfers and bridges

Treat bridging as a separate, higher-risk capability, not as an ordinary swap. A bridge workflow must disclose the source and destination networks, exact asset representations, bridge/protocol, route, fees, expected timing, finality assumptions, liquidity/limits, failure/recovery conditions and any wrapped or custodial claims. Never infer that a source-chain payment has completed on the destination chain until destination-side settlement is independently verified.

### 5.4 Other future modules

Design interfaces for, but do not enable by implication:

- NFT discovery, ownership, minting, purchase, sale and transfer;
- staking, delegation, unstaking and rewards;
- liquidity provision and withdrawal;
- lending, borrowing and collateral management;
- governance proposals and voting;
- vaults, tokenized receipts and other programmable assets;
- account abstraction, sponsored fees and scoped session permissions;
- recurring payments and subscriptions with explicit limits, duration and revocation;
- fiat on-ramp/off-ramp providers; and
- signed messages, attestations and proof-of-ownership interactions.

Each capability requires its own eligibility, transaction preview, risk assessment, permission model, accounting and tested failure handling. Do not bundle high-risk capabilities into a generic “Connect wallet” permission.

## 6. Initial network and asset coverage strategy

Use an adapter roadmap rather than a single all-or-nothing chain list.

| Stage | Networks / asset families | Intended scope |
|---|---|---|
| 0 — Foundation | Chain-agnostic records, CAIP identifiers, wallet/chain adapter contract, asset registry, capability states and transaction-review model | Offline tests and interface design; no live assets |
| 1 — First integration | Solana Localnet and Devnet; native SOL, classic SPL Token and explicitly selected Token-2022 profiles | Basic wallet connect, read balances, controlled test transfers and payment proof; swap only after a separate adapter review |
| 2 — Broad fungible payment coverage | Selected EVM networks based on users, liquidity and operating economics; native gas assets and a reviewed allowlist of ERC-20/stablecoin contracts | Wallet connection, read balances, payment intake and selected DEX swaps after independent chain/contract tests |
| 3 — UTXO and distinct account models | Bitcoin, and then selected Cardano/Cosmos/Sui/Algorand/Stellar/other ecosystems as justified | Dedicated wallet/signing/asset adapters; no EVM assumptions |
| 4 — Advanced interactions | Qualified bridge routes, NFT standards, staking, lending, LP/vault actions, account abstraction and on/off-ramp services | Separate feature proposals, cost review, security assessment and release gates |

The exact networks in each stage must be selected using actual user demand, asset availability, wallet coverage, liquidity, RPC/indexing reliability, legal obligations, maintenance burden, security and cost. The existing faucet inventory is a source for test-funding research, not a reason by itself to add a production network.

## 7. NOVA security and authority boundary

- NOVA must enforce policies for assets and operations within NOVA-controlled accounts or explicitly integrated transaction paths. It cannot prevent users from making independent transactions directly from their personal wallets outside AstroCrown.
- The current NOVA smart-account work remains Solana-native and provisional. Its guard does not automatically protect EVM, Bitcoin, Cosmos or any other network.
- For every additional network where NOVA is expected to control or protect operational assets, define and test a chain-native enforcement adapter, operation parser, signer/authority model, monitoring source, incident path and recovery model before using that network for those assets.
- Website user-payment validation and NOVA administrator-operational-asset policy are separate controls. Do not apply administrator-only restrictions to ordinary member payments, or imply that the member's wallet is under NOVA custody.
- Asset monitoring or recovery must never be advertised for an asset/network unless the exact path is implemented and verified. Unknown or unsupported operations fail closed within the controlled integration; external chain activity remains outside that guarantee.
- Keep administrator identity/compensation wallets, per-administrator NOVA operations accounts and AstroCrown treasury/recovery vaults separate as already defined by the account and NOVA security specifications.

## 8. Economic and provider constraints

The initial development approach remains $0-first:

- Prefer offline/local tests, free public test networks and controlled test mints.
- Do not introduce a paid wallet SDK, RPC/indexer, aggregator, bridge, on-ramp, relayer, analytics or monitoring subscription during the initial study.
- Do not consume production or limited provider quotas for routine chain tests when local fixtures can provide the same evidence.
- Record rate limits, free-tier reset windows, authentication requirements, privacy implications, API-key requirements, commercial terms and fallback behavior for every external service.
- Treat “free” as a verified current service condition, not a permanent guarantee. Do not silently switch to a paid tier, trial, card requirement or paid fallback.
- Before commercial activation, each paid external dependency must have an approved budget and a sustainable revenue/fee model that covers provider costs, AstroCrown's own use, operational overhead and margin. User-facing fees and third-party fees must be disclosed before signature.

## 9. Minimum security and correctness gates

Before enabling any asset capability on a network:

- Verify chain ID/genesis/network environment and reject wrong-network signing.
- Resolve asset identity from the exact contract, mint, denom, policy ID or equivalent; never trust ticker or logo.
- Validate token program/contract behavior and relevant authorities, extensions, hooks, fees, pauses, blacklists and upgradeability.
- Use exact integer/base units and safe decimal handling; no floating-point arithmetic for monetary amounts.
- Check destination, amount, fee payer, spender/router, approvals, instruction list, calldata and transaction expiry before presenting the signature request.
- Simulate where supported, but do not confuse simulation with guaranteed execution or finality.
- Bind quotes and user confirmations to the exact network, assets, amount, route, destination and expiry; reject payload drift.
- Verify confirmation/finality and duplicate processing with chain-specific reorg/replay handling.
- Test provider outage, rate limiting, stale data, malformed metadata, malicious hooks, failed swaps, insufficient liquidity, partial bridge failures and refund constraints.
- Keep chain-specific secrets and signing authority out of the website backend unless a separately approved custody model explicitly requires otherwise.
- Publish only the asset and interaction capabilities that have passed the documented gates.

## 10. Acceptance criteria and current status

- [ ] A chain-agnostic network/account/asset model is specified and tested.
- [ ] Wallet connectors are isolated from account roles and asset-policy decisions.
- [ ] Every asset is identified by network plus native identifier and relevant program/contract configuration.
- [ ] Capability states are separate for reading, payment, transfer, swap, bridge and special actions.
- [ ] Unknown assets, programs, extensions, hooks, contracts and instructions are denied for unqualified actions.
- [ ] Solana Localnet/Devnet support profiles are tested separately for classic SPL and selected Token-2022 configurations.
- [ ] A separate EVM profile is tested before any EVM payment or swap is advertised.
- [ ] At least one distinct UTXO or non-EVM account model is tested before claiming broad multichain compatibility.
- [ ] Payment confirmation, duplicate detection, under/overpayment and refund paths are tested per chain.
- [ ] Swap quote, slippage, route, approval and transaction-preview safeguards are tested per provider/chain.
- [ ] Cross-chain bridge routes have independent risk and recovery qualification.
- [ ] NOVA's enforcement coverage is stated accurately for each chain and asset class.
- [ ] Current service terms, free-tier constraints, API costs and commercial-use rights are reviewed before provider selection.

**Current implementation status:** this document records a proposed architecture only. The existing local account prototype does not yet implement customer payment intake, multi-chain asset registry, production wallet connectivity, swap execution, bridging, NFT/DeFi interactions, treasury settlement or refunds. Solana remains a provisional first integration target, not a claim of deployed support. No wallet, test mint, transaction, paid provider or production asset operation was created or authorized by this document.

## 11. Primary technical references

- [CAIP-2 — Blockchain ID Specification](https://standards.chainagnostic.org/CAIPs/caip-2)
- [CAIP-10 — Account ID Specification](https://standards.chainagnostic.org/CAIPs/caip-10)
- [CAIP-19 — Asset Type and Asset ID Specification](https://standards.chainagnostic.org/CAIPs/caip-19)
- [Ethereum development and token standards](https://ethereum.org/developers/docs/standards/)
- [Solana Token Extensions](https://solana.com/docs/tokens/extensions)
- [Solana token programs and payment concepts](https://solana.com/docs/tokens)
- [Jupiter Swap API](https://dev.jup.ag/docs/swap)
- [Uniswap API supported chains and tokens](https://developers.uniswap.org/docs/trading/swapping-api/supported-chains)
- [Bitcoin BIP-174 — Partially Signed Bitcoin Transactions](https://bips.dev/174/)
- [Cardano CIP-30 — dApp-Wallet Web Bridge](https://cips.cardano.org/cip/CIP-30)
- [Reown AppKit overview and supported-chain information](https://reown.com/faq)

External documentation is a technical reference, not an endorsement or provider selection. Verify current versions, support, terms and costs at the time of implementation.
