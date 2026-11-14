# Block 8 — Agent-Oriented Crypto Asset Conversion and Gas-Aware Payment Routing 05

**Assessment date:** 2026-11-14  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**PR:** #177, draft and unmerged  
**Scope:** qualify agent-friendly swap/bridge infrastructure that allows AstroCrown to use crypto-assets already collected or held in treasury, convert them into the exact payment asset/network required by a supplier or intermediary, and then execute a separately authorized payment.

## 1. User decision recorded

AstroCrown does **not** have to pay every provider in USDT. The source asset held by treasury and the destination asset requested by a payment provider may differ.

NOVA may evaluate an eligible source asset, swap or bridge it into the exact token/network required, and then execute the provider payment. This widens the payment-provider search beyond providers that accept USDT directly.

USDT is not a mandatory source or settlement asset. Provider-specific payment token requirements remain exact: a provider demanding USDC on Base must receive the correct canonical USDC contract on Base, not USDT, a wrapped lookalike, or USDC on another network. The destination asset/network is dictated by the provider's verified payment instruction; the source may be another asset already held by AstroCrown.

The rule is **any eligible, safely spendable treasury asset**, not literally any token contract. Asset and route safety, availability, liquidity, lawful eligibility, gas and complete cost must all pass.

## 2. Architecture decision

Add an independent `asset_conversion_adapter` capability, separate from provider resource adapters and supplier-payment adapters.

The payment process therefore has four independent objects:

1. **Treasury holding:** the exact source asset, amount, source chain and treasury wallet.
2. **Conversion instruction:** the optional route that converts the source holding into the exact destination asset/network.
3. **Supplier-payment instruction:** the exact provider invoice, required token/network, recipient and payment mechanism.
4. **Settlement evidence:** conversion receipt and destination balance, supplier payment/payout evidence and final provider credit.

Do not entangle the conversion aggregator with treasury authority. An agent/MCP/REST tool may discover chains/tokens, request quotes, construct a route and report status. It does not receive a seed phrase, private key or autonomous permission to spend funds. The AstroCrown-controlled signer independently enforces the Council policy envelope.

Recommended route selection order:

1. Directly pay using an already-held asset if the exact provider accepts that asset on the same network and the route is otherwise qualified.
2. Otherwise use an eligible same-chain swap into the exact provider-required asset.
3. Use a cross-chain swap/bridge only where the provider's required chain cannot be reached safely/economically on the source chain.
4. Consider gas-sponsored/intent routes when the actual quote proves the sponsor, pair, amount, network and expiry; do not treat a marketing "gasless" statement as a universal rule.
5. If no safe route meets the all-in cost and minimum-output policy, do not pay. Queue, choose another already-qualified provider/route, or pause.

## 3. Agent-oriented swap/bridge candidates

### 3.1 LI.FI — strongest cross-chain agent integration lead

**Status: DISCOVERY LEAD — technical fit high; eligibility, commercial terms, security and full gas costs not yet qualified.**

Official sources:
- Agent integration: https://docs.li.fi/agents/overview
- API/SDK: https://li.fi/api-sdk
- API reference: https://docs.li.fi/api-reference
- Legal documents: https://li.fi/legal

Published capabilities:
- The agent documentation describes cross-chain swaps and transfers across 58 blockchains spanning EVM, Solana, Bitcoin and SUI; it says its routing aggregates 27 bridges and 31 exchanges.
- It provides REST API, SDK, MCP server and CLI choices for machine/agent integration.
- Quote endpoint returns a transaction request ready for wallet signing; status endpoint tracks transfer lifecycle.
- It exposes chain and token discovery endpoints, with canonical token addresses, symbols and decimals. It exposes the available bridges/exchanges and their supported chains.
- Status states include `NOT_FOUND`, `PENDING`, `DONE` and `FAILED`; a completed route may carry `COMPLETED`, `PARTIAL` or `REFUNDED` substatus. NOVA must not treat every `DONE` status as proof that the exact required output was received without inspecting the actual destination balance and token.
- Public documented rate limits: without an API key, 200 requests per two hours; with an API key, 200 requests per minute. A production NOVA poller must respect the actual assigned tier.
- The guide says insufficient balance includes both the input tokens and gas; its general example defaults to 0.5% slippage when no value is passed. The current quote's `toAmountMin`/minimum output and all fee fields must control execution, not a hardcoded assumed default.

Why it matters:
- This is directly designed for agent integration, supports MCP/CLI as well as REST, and can orchestrate both same-chain exchange and cross-chain bridge routes.
- It may let NOVA transform assets collected on one network into the token/network needed by a payment intermediary without opening a centralized exchange account.

Unresolved hard gates:
- The public agent integration documentation does not prove that every source token and bridge route is supported, nor that a route is available for every pair/amount at execution time.
- Account/API key eligibility, KYC/KYB conditions (if any), commercial use, free-tier/paid API terms, rate limits for our intended volume, privacy/logging and any partner programme are not yet qualified.
- The API documentation is a routing/execution interface, not proof that every underlying DEX, bridge, solver, token or contract is safe for AstroCrown.
- The quoted `transactionRequest` must be independently inspected. The signer must not sign arbitrary returned calldata just because the route comes from an aggregator.
- Cross-chain source completion is not destination completion. A `PARTIAL`, `REFUNDED`, unexpected-token or delayed route must block the supplier payment until the exact required asset is reconciled.
- The docs' 0.5% default is slippage tolerance, not a complete cost estimate and not a safe universal policy. It must not be silently adopted for every swap.

Qualification consequence: prioritize LI.FI for a no-funds quote/status/conformance evaluation once the asset-conversion adapter is implemented. Do not create an account, configure a key or execute a transaction yet. Verify current terms and eligibility first.

### 3.2 Jupiter Swap API V2 — strongest Solana-specific lead

**Status: DISCOVERY LEAD — technically relevant to Solana treasury assets; production API eligibility and full route economics remain open.**

Official sources:
- Swap API V2 documentation: https://dev.jup.ag/docs/swap
- API reference: https://developers.jup.ag/docs/api-reference/swap
- AI/MCP documentation: https://dev.jup.ag/docs/ai

Published capabilities:
- Jupiter Swap API V2 offers a Meta-Aggregator flow (`/order` + `/execute`) and a Router flow (`/build` + `/submit`).
- Meta-Aggregator compares Metis on-chain routing, JupiterZ RFQ market makers, Dflow and OKX routes; Router path uses Metis on-chain routing only.
- Quote-only `/order` requests are documented without an API key or wallet. Keyless requests are limited to 0.5 requests per second; a production API key is recommended for higher limits.
- The Meta-Aggregator returns a ready-to-sign transaction and Jupiter handles transaction landing after the signed transaction is submitted to `/execute`.
- The API advertises automatic gasless handling on eligible trades or use of a separately provided payer. Sponsored gas must be confirmed in the exact route; it is not guaranteed for all input/output pairs.
- Meta-Aggregator has a Jupiter platform fee; the documentation says the fee varies by token pair from 0 basis points on some pegged/token pairs to 10 basis points on most pairs and each order returns `feeBps` and `feeMint`.
- The Router path has no Jupiter swap fee but requires the integrator's own landing/RPC handling or use of the separate submit pipeline.
- The API is specifically a Solana token-swap route. It does not by itself satisfy cross-chain bridging to another network.

Why it matters:
- Solana is the likely primary ACROWN network, and treasury may hold SOL or other Solana assets while a downstream provider may require USDC or another SPL token.
- Quote-only access gives a possible way to inspect routes without funding or connecting a wallet. The execution path still requires a secure signer.
- Gas sponsorship on eligible trades could reduce the need for SOL held purely for transaction fees, but it must be explicitly verified route-by-route.

Unresolved hard gates:
- A no-key quote is not proof that production API execution is free, unrestricted, commercial-use eligible or no-KYC.
- Production API-key conditions, rate limits, commercial use, logging and any integrator/partner fees need current terms review.
- Not all tokens or pairs necessarily have a route or sufficient liquidity.
- Sponsored gas can be conditional; a failed or unsupported route may still require SOL or another network's native fee asset.
- The aggregator's routing engines include external liquidity providers. The final route's contracts, asset identity and destination amount remain independently validated by NOVA.

Qualification consequence: prioritize quote-only conformance for Solana source-to-provider-token pairs after the schema is implemented. Keep the signer and all mainnet execution disabled.

### 3.3 0x x402 / MPP — agent-native pay-per-request and API access

**Status: CONDITIONAL DISCOVERY LEAD — useful for machine-payable API services; not a general supplier invoice payment rail.**

Official source:
- https://docs.0x.org/docs/introduction/develop-with-ai/autonomous-agent-payments

Published capabilities:
- 0x documents both x402 and MPP so an agent can pay for a request using an HTTP-native payment challenge instead of an API key or subscription account.
- Current 0x Swap API examples charge $0.01 per request in USDC.
- x402 uses USDC on Base or Solana. MPP uses USDC.e on Tempo Mainnet.
- The documented flow is: agent requests the endpoint; server returns HTTP 402 and machine-readable payment requirements; agent signs the required USDC payment; it retries with the payment header; the server verifies on-chain payment and returns a response with a transaction hash.
- The 0x CLI supports `--pay x402-evm` or `--pay mpp` and documents a `--max-payment` cap.
- It is genuinely agent-oriented, with an agent skill and CLI, and no 0x API key is required for the x402/MPP payment path.

Limitations:
- x402/MPP is a per-request API payment protocol, not a generic mechanism for paying any VPS/GPU/hosting invoice.
- A target service must explicitly implement/accept the protocol.
- The current documented 0x route requires USDC on Base/Solana or USDC.e on Tempo; it does not accept every source token directly. AstroCrown would need to obtain the exact payment asset through an independently approved swap if it does not already hold it.
- The x402 transfer itself still needs a valid exact wallet/network payment, and an EVM route may have gas or use a protocol-specific authorization; verify the exact scheme and sponsor behavior.
- A $0.01 request price is a route-specific service price, not the total cost of conversion or the user's future infrastructure purchase.
- Terms, rate/volume policies, supported endpoints, refunds/error behavior and no-KYC commercial eligibility are not fully established for AstroCrown.

Qualification consequence: treat x402/MPP as a protocol for agent-to-service micropayments where a supplier actually supports it. It may be preferable to card/invoice intermediation for API services that adopt x402, but it is not a universal payment substitute.

### 3.4 Uniswap Trading API — EVM swap/bridge route builder

**Status: DISCOVERY LEAD — useful EVM technical route; API-key and policy gates remain unresolved.**

Official sources:
- Quote API: https://developers.uniswap.org/docs/api-reference/aggregator_quote
- Integration: https://developers.uniswap.org/docs/trading/swapping-api/start-building/integration-guide
- FAQ: https://developers.uniswap.org/docs/trading/swapping-api/faqs

Published capabilities:
- The quote API can quote a same-chain swap, cross-chain bridge, wrap or unwrap and returns a proposed route and estimated gas; it simulates the proposed route.
- The documented flow returns transaction data for the integrator's wallet to sign and broadcast. Uniswap's API does not itself sign with AstroCrown's wallet.
- Routes include ordinary AMM, UniswapX gasless orders, bridge and wrap/unwrap types. With `BEST_PRICE`, the API attempts to compare a gasless order and ordinary swap including transaction costs, where supported.
- The FAQ says gasless routing is conditional. When gas is 20% or more of trade value on supported chains, a gasless route may not be returned and the API may return an ordinary swap or fail.
- API access requires an API key; the documented default limit is 6 requests/second. The API terms and access policy require a separate review.
- Quote simulation is useful but does not guarantee execution: gas, price and slippage can change between quote and broadcast. The FAQ recommends refreshing quotes older than 30 seconds before broadcasting and using a deadline.

Why it matters:
- An alternate source of EVM swap/bridge routes, simulation and gas estimates.
- The integrator remains in control of wallet signing and transaction submission.

Unresolved hard gates:
- Developer API key/account eligibility, KYC/KYB, commercial use, rate/fee terms and privacy need separate verification.
- Token availability and actual liquidity are route-specific; the API does not provide a universal list of every tradable token.
- Gasless execution is not guaranteed and does not remove destination-chain gas requirements from all paths.

Qualification consequence: maintain as an EVM route-builder candidate. Do not assume that API availability or gasless routing qualifies the provider under the full acceptance contract.

### 3.5 1inch Swap API — secondary multi-chain lead

**Status: DISCOVERY LEAD — further documentary qualification required.**

Official source:
- https://business.1inch.com/portal/documentation/apis/swap/introduction/

The published developer documentation describes classic swaps, intent-based swaps and cross-chain swaps, with a multi-chain coverage table that includes EVM networks and Solana. It is a possible alternate aggregator/solver route if LI.FI or another single provider has inadequate liquidity or fails over.

However, this review has not established the complete account/API eligibility, free access, no-KYC/no-KYB terms, production fees, commercial rights, per-route gas sponsorship, privacy, supported token pairs or all-in settlement behavior. It is not yet qualified or selected.

## 4. Complete gas and conversion cost model

The swap fee is not the total cost. NOVA must calculate and log the following, route-by-route:

| Cost component | What to count |
|---|---|
| Source-chain gas | Every approval, permit/permit alternative, swap, wrap, bridge initiation or transaction |
| Destination-chain gas | Destination swap, claim, unwrap, settlement or account/token-account operations |
| Native-gas reserve | Native asset needed on each chain unless the exact route demonstrably sponsors it |
| DEX/pool fee | LP/protocol fee embedded in the route |
| Aggregator/platform fee | Explicit platform/integrator fee, referral or routing charge |
| Bridge/solver fee | Bridge toll, solver spread, relayer or intent execution fee |
| Price impact | Difference between reference market value and the executable route |
| Slippage | Maximum tolerated deterioration; use quoted minimum output and explicit bounds |
| Priority / landing / tip | Priority fees, tips or managed-landing fees where applicable |
| Token approvals | Approval transaction gas and any approval-related fee; exact allowance policy |
| Destination account setup | Token account creation, rent/deposit or account-initialization requirement; distinguish recoverable rent from irrecoverable fee but still reserve required capital |
| Payment-provider fee | Deposit, withdrawal, card, invoice, voucher, conversion or provider service fee |
| Failure/recovery exposure | Gas spent on reverted transactions, non-refundable bridge/solver charge, delayed/refunded route, or recovery fees |

Use an all-in route estimate:

`TotalRouteCost = SourceGas + DestinationGas + ApprovalCosts + PoolFees + AggregatorFees + BridgeFees + RelayerFees + PriceImpact + SlippageAllowance + AccountSetupCost + PaymentProviderFees + RecoveryReserve`

This is an accounting model, not a promise that every field is a separate on-chain debit. Where a provider embeds spread or fee into the quoted output, reconcile it against a reference price so the same fee is not double-counted.

**The actual executable quote and net destination output control the decision.** Do not add a fixed generic gas percentage to the invoice and assume it is sufficient.

For each route, calculate:
- source asset amount and wallet balance;
- expected output and minimum output in the destination asset;
- quote expiry and block/slot validity assumptions;
- source-chain and destination-chain native gas requirements;
- exact route/contract allowlist;
- absolute and percentage price impact;
- all fees and estimated failure/recovery cost;
- all-in cost expressed in a common internal accounting numeraire;
- final amount available for the supplier payment after conversion.

Reject or queue if any gas or fee field is unknown where it can materially affect the maximum spend, if the quote is stale, if route safety cannot be verified, if minimum output is insufficient, or if total cost exceeds the Council ceiling. Low-value payments may be uneconomic because gas and approvals can dominate the amount; NOVA can batch or defer only within an expressly approved policy, not silently combine unrelated treasury funds.

## 5. Gas and native-token policy

Native gas is separate from the payment asset. Holding a token that can be swapped does not automatically mean the wallet can pay the gas needed to swap it.

The treasury must either:
- hold an approved native gas reserve on every chain required for the route; or
- use a documented, quote-specific sponsored-gas/paymaster/relayer mechanism whose sponsor, limits, eligible pairs and remaining fees have been independently verified.

Do not assume:
- gas on the source chain is the only gas cost;
- bridge destination execution is always sponsored;
- gasless means free;
- the provider will recover failed gas;
- a sponsored route is available for every token or amount;
- a token transfer can pay the native network fee without a documented mechanism.

For Solana, include transaction fees, priority fees where applicable and token-account creation/rent needs for the destination token account. For EVM networks, include gas for approval/permit where needed, swap and bridge legs. For cross-chain routes, keep separate cost budgets and receipts for each chain.

If the treasury has no gas token on the required chain, NOVA must not silently use a different unapproved treasury balance or route through a KYC centralized exchange. It should seek a qualified gas-sponsored alternative, use another already-approved treasury/network route, or pause.

## 6. Asset eligibility and conversion safety

The term "any collected crypto asset" must be implemented as an eligible-asset inventory, not an unbounded allow-all rule.

Required token record:
- chain/network identifier;
- native asset identifier or exact canonical contract/mint;
- token name/symbol/decimals as descriptive fields only;
- source of receipt and ownership/custody status;
- transfer restrictions, freeze/blacklist authority, mint/burn and upgrade controls where relevant;
- transfer-tax, rebasing, fee-on-transfer or non-standard behavior;
- verified issuer/bridge relationship for wrapped representations;
- liquidity sources, route availability and executable depth;
- known exploit/honeypot/compromise flags;
- sanctions/restrictions and legal use eligibility;
- current qualification timestamp, evidence and allowed spend classes.

Do not auto-swap:
- tokens based only on symbol or metadata;
- unknown/unverified mints or contracts;
- malicious, honeypot or compromised tokens;
- assets with transfer restrictions the execution route cannot handle;
- assets with insufficient liquidity or excessive price impact;
- LP tokens, vault shares, NFTs, receipt tokens or bridged/wrapped assets until their exact semantics and redemption risks are separately qualified.

The agent must not choose a new token, router, bridge, spender or destination outside the allowlist. Route changes require the same signer/policy validation as the original quote.

## 7. Updated payment lifecycle

The provider/payment state machine now includes an optional asset-conversion phase between invoice validation and provider funding:

1. `INVOICE_VALIDATED` — exact supplier obligation, required destination asset/network, invoice and recipient are validated.
2. `CONVERSION_QUOTE_REQUESTED` — request exact-input source-to-destination route.
3. `CONVERSION_QUOTE_VALIDATED` — check canonical tokens, chain IDs, quote expiry, all-in costs, gas, min output, slippage, liquidity and approved routing contracts.
4. `CONVERSION_PREPARED` — prepare exact swap/wrap/bridge/approval transactions.
5. `CONVERSION_AUTHORIZED` — isolated signer validates target contracts, spender, allowance, instructions/calldata, amounts and policy.
6. `CONVERSION_SUBMITTED` — submit and record the source-chain transaction and any bridge/solver reference.
7. `CONVERSION_SOURCE_CONFIRMED` — confirm source-chain execution.
8. `CONVERSION_DESTINATION_CONFIRMED` — independently confirm the exact destination asset/network and minimum balance in the treasury wallet; if no conversion is needed, use `CONVERSION_NOT_REQUIRED`.
9. Only after step 8 may the final supplier/intermediary `FUNDING_PREPARED` state begin.

Terminal states include `NO_CONVERSION_ROUTE`, `TOKEN_NOT_QUALIFIED`, `INSUFFICIENT_NATIVE_GAS`, `GAS_COST_EXCEEDED`, `CONVERSION_SLIPPAGE_EXCEEDED`, `CONVERSION_MIN_OUTPUT_NOT_MET`, `CONVERSION_PARTIAL`, `BRIDGE_PENDING`, `BRIDGE_FAILED`, `BRIDGE_REFUNDED`, `WRONG_SOURCE_ASSET`, `WRONG_DESTINATION_ASSET` and `DUPLICATE_CONVERSION`.

A source-chain confirmation does not prove the destination asset arrived. A bridge route's `DONE` label does not override actual token/network/balance verification. No provider payment may occur on a partial, refunded, unexpected-token, expired or under-minimum route.

## 8. Security and governance controls

- Council authorization includes source asset/network, destination asset/network, max source spend, minimum output, quote expiry, route/contract allowlist, maximum price impact/slippage, gas reserve and all-in max cost.
- NOVA may compare routes and prepare transactions; it cannot expand approved assets, chains, spend limits, recipients or contracts.
- Signer inspects chain ID, token, allowance spender, amount, router/bridge/solver, function selector/instruction, minimum output, destination and deadline. It rejects arbitrary agent-returned calldata.
- Use exact-amount approvals or one-use permits; never allow unlimited approval by default. Revoke residual approvals when safe and possible.
- No seed phrase/private key is passed to a DEX aggregator, bridge, MCP endpoint, LLM or GitHub workflow/log.
- Use separate payment/operational wallets and a limited gas reserve; do not mix user custody, admin wallet and treasury.
- No KYC, centralized exchange account, linked bank/card, debt, automatic top-up or manual provider operator may be introduced by the conversion route.
- Retries must first query source transaction, route status, destination transaction and balances. No duplicate swap after timeout.

## 9. Preliminary candidate assessment

| Candidate | Agent friendliness | Relevant capability | Preliminary status |
|---|---|---|---|
| LI.FI | REST, SDK, MCP, CLI, agent docs | Multi-chain swap/bridge and route status | Highest-priority discovery lead |
| Jupiter V2 | REST, MCP/AI docs, quote and execute | Solana swaps, multiple routing engines, eligible sponsored gas | High-priority Solana lead |
| 0x x402 / MPP | Agent skill, CLI, HTTP 402 machine payment | Pay for supported API calls in USDC on Base/Solana or USDC.e on Tempo | Conditional protocol lead; not general supplier invoice payout |
| Uniswap Trading API | REST/OpenAPI, quote simulation | EVM swap, bridge, wrap/unwrap, some gasless routes | EVM route-builder lead; API key required |
| 1inch Swap API | REST/business API | Classic, intent and cross-chain swaps | Secondary discovery lead |

None is approved by this report. No candidate has passed payer-side no-KYC/no-KYB, commercial rights, production limits, terms, privacy, security, complete all-in fees and end-to-end transaction conformance. The public docs show technical interfaces, not our eligibility or permission to transact.

## 10. Next work order

1. Implement language-neutral source/destination asset, conversion quote, route, gas budget and settlement receipt schemas with deterministic offline mocks.
2. Build a quote-only adapter conformance harness for LI.FI and Jupiter first; Uniswap/1inch only after their API terms/account requirements are documented.
3. Test supported token discovery using canonical chain/address/mint rather than symbol matching.
4. Test same-chain source-to-provider-token routes first, then cross-chain swap/bridge with separate source/destination tracking and refund/partial cases.
5. Record fees from actual quote fields and simulated gas; do not perform mainnet signing or use real funds.
6. Qualify API key/no-key access, account requirements, commercial terms, KYC/KYB, rate limits, privacy and routing partners before any provider is enabled in NOVA.
7. Only after a separate explicit authorization, use a bounded testnet or no-funds simulation. A mainnet asset swap or provider payment is not authorized by this report.

## 11. Evidence and action boundary

Official documentation reviewed:
- LI.FI Agent Integration and API/SDK pages.
- Jupiter Swap API V2 documentation and AI/MCP integration pages.
- 0x x402/MPP autonomous agent payment documentation.
- Uniswap Trading API quote, integration and FAQ documentation.
- 1inch Swap API introduction.

This is public-documentation and architecture research, not a provider account test, legal opinion, code implementation or production qualification.

- No provider account was created or accessed.
- No API key, credential, private key, seed phrase or session token was obtained.
- No token approval, swap, bridge, on-chain transaction, quote execution or payment was initiated.
- No source or destination asset was transferred, exchanged or moved.
- No gas was spent and no wallet balance was accessed.
- No live provider roster, secret, NOVA workflow or deployed AstroCrown system was changed.
- No provider was declared qualified or approved.
- Canonical NAV protocol/template documents remain to be located and formally applied before external provider onboarding or transaction activity; this checkpoint does not claim formal NAV compliance.

**Block conclusion:** AstroCrown can be designed to spend assets it has actually collected, rather than forcing all collections into USDT first. A qualified swap/bridge layer can produce the exact asset required by each agent-friendly payment provider. LI.FI and Jupiter are the most relevant first candidates for quote-only evaluation. The conversion path is only useful when the full transaction—including native gas, approvals, liquidity, price impact, slippage, bridge and supplier fees—meets the authorized all-in cost and safety limits.
