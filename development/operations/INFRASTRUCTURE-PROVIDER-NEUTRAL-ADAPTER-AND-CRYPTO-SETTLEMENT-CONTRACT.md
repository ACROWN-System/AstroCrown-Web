# Infrastructure Provider-Neutral Adapter and Crypto Settlement Contract

**Status:** Architecture specification — not implemented or activated  
**Review date:** 2026-11-14  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Related work:** PR #177, PR #175, and `development/audit/Active/2026-11-14-Block-8-Infrastructure-Acceptance-Contract-and-Candidate-Reclassification.md`  
**Purpose:** Keep the $0 development runtime portable and make the crypto-paid transition operable by NOVA under AstroCrown Council governance.

> This specification defines boundaries and conformance requirements. It does not create an account, deploy a service, change a workflow, hold a private key, submit a transaction, or authorize a paid resource.

## 1. Architecture principle

AstroCrown owns the product runtime. NOVA owns its operational coordination and governance-supporting control plane. External providers supply replaceable execution resources; they do not become the system's control plane or governance authority.

The architecture must support two operating stages without rewriting business logic:

1. **$0 operational development:** GitHub Actions, Cloudflare Pages/Workers/D1/R2 and eligible test networks provide the currently documented baseline, subject to account and end-to-end qualification.
2. **Crypto-paid transition:** one or more qualified crypto-funded providers supply persistent VPS/containers, GPU, RPC, storage or other capacity. The transition may replace a service adapter or runtime deployment profile; it must not require a redesign of the product, account system, NOVA governance or business logic.

No provider should be embedded directly in domain logic. Use provider-neutral contracts, versioned adapters, observable capabilities and controlled configuration.

## 2. Authority and responsibility boundaries

### 2.1 AstroCrown and the Imperial Council

AstroCrown's own website and internal system are the place for authorized human decisions:
- infrastructure policy and risk acceptance;
- provider allowlists and maximum permitted data classification;
- spending budgets, per-transaction limits and recurring ceilings;
- approval/revocation of payment policies and signer permissions;
- emergency halt, recovery and exceptional provider selection.

The Council must not become a manual operator for each routine server start, health check, scale action, retry, backup, invoice poll or quota transition. It approves the bounded policy envelope; NOVA executes operations within that envelope.

### 2.2 NOVA

NOVA is responsible for:
- discovering provider capability and contract state from machine interfaces;
- monitoring health, usage, quotas, expiry, balances, reset times and price changes;
- selecting only currently qualified providers;
- scheduling workloads and balancing load within authorized policy;
- retrying idempotently, failing over, queuing or pausing work;
- provisioning and retiring resources through approved adapters;
- creating payment intents only within approved budget envelopes;
- verifying invoices and chain settlement;
- reconciling provider credits, usage, costs and receipts;
- recording state, provenance, decisions and audit evidence;
- reporting exceptions to AstroCrown Council without requiring the external provider to intervene.

### 2.3 External providers

A provider may perform the contracted infrastructure work. It must not:
- make AstroCrown's governance or spending decisions;
- hold an unrestricted AstroCrown treasury signing key;
- require an external human to approve ordinary machine API operations;
- silently enable paid overage, card fallback or fiat billing;
- be treated as the canonical source for NOVA's entire state or policy.

### 2.4 One active controller and single-writer state

The current active NOVA GitHub control plane must remain authoritative until a complete portable controller is implemented, tested and deliberately switched over. Do not duplicate active heartbeat/scheduler workflows into AstroCrown-Web or a new host. A migration must use a single-writer handover or a verifiable fencing/lease mechanism, preserve the latest validated operational state and have a rollback path.

The existing handover plan in `development/operations/NOVA-CONTROL-PLANE-PORTABILITY-AND-HOST-MIGRATION.md` remains applicable. This specification adds provider-neutral interfaces; it does not supersede its source export, dependency-closure, state parity or safe cutover requirements.

## 3. Required provider adapter interfaces

Each adapter advertises its capabilities and limits in machine-readable form. A provider may implement only some capabilities; NOVA must not assume all services expose the same operations. Core required operations return normalized results and preserve provider-specific IDs and error details.

### 3.1 Common adapter envelope

Every adapter must declare:

- provider identifier, legal operator, underlying infrastructure provider(s), service and region;
- direction of payment flow, using a controlled value such as `payer_crypto_to_supplier_crypto`, `payer_crypto_to_supplier_fiat`, `payer_crypto_to_supplier_card`, `payer_crypto_to_supplier_voucher` or `customer_crypto_to_merchant` (reverse-direction merchant acceptance);
- adapter name/version and supported API/schema version;
- authentication mechanism and least-privilege permission scopes;
- capabilities supported and those explicitly unsupported;
- account/plan state and qualification status;
- $0 vs paid pricing mode; renewable vs one-time quota; currency and unit;
- quota scope (key, project, account, organization, provider or IP), limit, usage, reset and expiry;
- usage/billing observability and whether paid overage is technically impossible;
- data classification allowed, retention/training/logging settings and upstream subprocessors;
- SLA/support/maintenance window, portability and data export;
- links to current official terms/pricing/docs plus last verification timestamp;
- status and last known error, freshness and next probe time.

Never infer a missing capability, quota, payment route, privacy setting or eligibility condition. The machine-readable value must be UNKNOWN or UNSUPPORTED until evidence exists.

### 3.2 Compute / VPS / container adapter

Normalized operations:

- `capabilities()` — list regions, plans, images, CPU/RAM/disk/network/GPU and supported lifecycle actions;
- `quote(plan, region, duration, options)` — return total and recurring price, tax, deposit, network fees and resource constraints before purchase;
- `create(intent, idempotency_key)` — create a resource only when a valid internal authorization is attached;
- `get(resource_id)` / `list(filters)` — inspect provider and normalized state;
- `operate(resource_id, action)` — start, stop, reboot, resize, reinstall or snapshot only when documented/supported;
- `destroy(resource_id, idempotency_key)` — delete the resource and confirm termination;
- `usage(resource_id, window)` — return actual usage, billing and accrual;
- `events(cursor)` or `poll(resource_id)` — expose state changes without a dashboard;
- `export_metadata(resource_id)` and `recover(snapshot_id)` — preserve reconstruction/restore path where supported.

A core host adapter must prove its complete create → inspect → operate → monitor → stop/renew/resize → destroy lifecycle. A missing destroy, billing, usage or restore operation is an explicit limitation and may prevent selection as the core runtime.

### 3.3 Inference / model adapter

Normalized operations:

- `catalog()` — model, version, modality, context, structured-output/tools, licence and retirement date;
- `quote(model, request_shape)` — estimate/confirm cost, including input/output, cached, reasoning, tool or image tokens where applicable;
- `infer(request, idempotency_key)` — execute the model call with explicit data classification, timeout and output schema;
- `usage(request_id)` — return token, billing and upstream route details;
- `quota()` — report allowance, remaining amount, reset, limit scope and fail-closed status;
- `health(model)` — bounded response-contract and actual model/provider identity;
- `route_policy()` — disclose upstream inference provider, region, retention/training and routing behavior.

OpenAI-compatible protocol support is transport compatibility only. It does not prove equivalent model behavior, privacy, commercial rights, token accounting or tool-call semantics. Gateway adapters must expose the gateway and the real underlying model provider separately.

### 3.4 RPC / blockchain adapter

Normalized operations:

- `network_info()` — chain ID/genesis hash, cluster, network identity and endpoint owner;
- `health()` — latency, latest block/slot, confirmed/finalized state, lag, errors and rate limits;
- `read(method, params)` — bounded read-only JSON-RPC request;
- `simulate(transaction)` — validate supported transaction semantics and estimate fees;
- `submit(transaction, idempotency_key)` — submit only a pre-authorized serialized transaction;
- `confirm(signature, commitment)` — observe final settlement and failure/replacement state;
- `get_asset(identifier)` — verify exact canonical token/mint/contract and decimals;
- `fee_quote(transaction)` — report fee/priority fee before signing.

A provider label like “Solana RPC” is not sufficient. Verify exact network, endpoint ownership, request limits, data freshness, transaction submission reliability, privacy metadata, failover and no-overage controls. Public shared RPC is a development route, not an assumed production route.

### 3.5 Database / object-storage adapter

Database normalized operations:
- connect with least privilege;
- versioned migrations and schema state;
- transactions and concurrency semantics;
- backup/export with checksum and timestamp;
- restore to an isolated target and report parity;
- retention/deletion and encryption controls;
- capacity, row/storage limits and errors.

Object storage normalized operations:
- S3-compatible bucket/object operations where possible;
- multipart upload/download, checksums, encryption metadata, lifecycle/retention;
- immutable/versioned backup where available;
- paginated inventory and machine-readable usage;
- export/replication and restore verification.

The application must not rely on Cloudflare D1-specific SQLite behavior outside the repository/data adapter. Keep migrations portable and document any SQL feature that requires conversion. R2 is S3-compatible but object consistency, retention, lifecycle and authentication must still be tested against each replacement.

### 3.6 Scheduler / queue / state-store adapter

Required capabilities:
- durable job scheduling, recurring triggers and delayed retry;
- leases or single-writer fencing;
- unique job IDs and idempotency keys;
- cancellation, timeout and dead-letter state;
- visibility into queue depth, lag and retry count;
- durable operational state and atomic compare-and-swap or transactional update;
- snapshot/export/restore and schema migration.

GitHub Actions remains an acceptable current control plane for the present workload, but its ephemeral runners and scheduled-trigger characteristics must be explicit. A future VPS/queue scheduler should implement the same behavior without duplicating the active controller.

## 4. Internal crypto payment and settlement adapter

### 4.1 Payment is a separate capability

Do not entangle infrastructure provisioning with treasury signing. Compute/storage/API adapters create a provider quote or invoice. A separate payment adapter verifies the obligation and settles it through an internal authorized wallet mechanism.

The provider never receives an unrestricted signing key or seed phrase.

### 4.1.1 Payment route adapters and the no-friction boundary

The payment layer must not assume that every infrastructure supplier accepts crypto directly. It must support separate, replaceable route adapters for:

- crypto_direct — crypto is paid to the supplier's verified wallet/invoice;
- crypto_to_fiat_invoice — crypto is paid to an intermediary which converts it and settles the supplier's fiat invoice;
- crypto_funded_card — crypto funds a provider-issued payment instrument that pays the supplier;
- crypto_voucher — crypto purchases a voucher/merchant credit accepted by the exact supplier.

Asset conversion is a separate, composable capability, not a fifth supplier-payment route. The asset paid to the supplier or intermediary does not have to be the same asset collected or currently held in AstroCrown's treasury. A route may consume a qualified treasury asset and convert it into the exact asset/network required by the recipient, provided the complete swap/bridge path passes the same eligibility, safety, cost and authorization controls.

The payer-side chain must be mapped end to end, including the intermediary, exchange/conversion partner, card issuer/program manager, acquiring processor and relevant subprocessors. The presence of internal bank accounts or card-network relationships inside the intermediary does not automatically disqualify it. It is disqualified if AstroCrown, its authorized operators or beneficial owners must complete KYC/real-name verification, provide government identity documents, open/link/control a bank account, provide bank credentials, obtain a conventional card or bind a conventional fiat account at any stage (including signup, top-up, limits increase, continued use, refund or recovery). Moving these requirements from the supplier to an intermediary is still a failure of the original requirement.

For fiat invoice settlement, the supplier may have to provide its own receiving bank details because it is the fiat beneficiary. Those are supplier-side payout details, not an AstroCrown bank account. Record this distinction explicitly. Never call such a flow entirely bank-free; the accurate description is **crypto-funded fiat settlement without AstroCrown needing its own bank account or card**, provided the intermediary does not impose payer-side KYC.

Every route must expose machine-readable quote/fees/expiry, funding instructions, status, limits, refund/reversal handling and reconciliation. A crypto-to-fiat route additionally needs payout reference and final supplier-payment confirmation. A card route needs machine-readable funding, authorization/capture/refund, spending limits and freeze/revoke. A voucher route needs exact merchant/region/denomination, expiry, redemption status and remaining value. Manual bank transfers, routine human approvals, recurring CAPTCHA/OTP/3-D Secure, hidden spreads, overdraft, auto-top-up and fiat/card fallback are not acceptable for a core autonomous route.

Every candidate record must declare its exact direction of flow. A merchant acceptance gateway where a customer pays crypto to a merchant is `customer_crypto_to_merchant`; it is not proof of `payer_crypto_to_supplier_fiat` and cannot be counted as a supplier bill-payment intermediary.

No route is qualified based only on marketing claims such as “crypto accepted” or “no KYC.” Verify the governing terms, onboarding and account conditions, every payer-side actor, API lifecycle, legal availability in the relevant jurisdiction, and a complete synthetic or otherwise separately authorized bounded reconciliation test. Do not attempt to evade legal identity or sanctions controls; classify a route as unavailable if it cannot lawfully serve the intended operation.

### 4.1.2 Treasury asset conversion and settlement-route selection

AstroCrown may collect and hold multiple crypto-assets across multiple chains. **USDT is not a mandatory source asset or universal payment asset.** It may remain a preferred settlement option where cost, acceptance and reliability make it the best route, but NOVA must be able to evaluate any collected asset that has been separately qualified and can be safely converted into the exact asset/network required by a supplier or payment intermediary.

Use this model:
- `source_asset`: the exact token/native asset already held by an AstroCrown-controlled treasury wallet, identified by chain/network and canonical mint/contract/native identifier;
- `destination_asset`: the exact token/native asset required by the supplier or intermediary, identified by its chain/network and canonical mint/contract/native identifier;
- `conversion_route`: the exact on-chain swap, wrap/unwrap, bridge, intent or combination of steps, including every protocol/router/bridge/solver;
- `payment_route`: the separate final supplier settlement type (`crypto_direct`, `crypto_to_fiat_invoice`, `crypto_funded_card` or `crypto_voucher`).

Preferred execution order:
1. Pay directly in an asset already accepted by the supplier where that route has the best safe all-in economics.
2. Otherwise, use a qualified same-chain swap into the supplier-required asset.
3. Use a cross-chain swap/bridge only when the required destination network cannot be reached safely and economically on the source chain.
4. Do not use a centralized exchange, custodial conversion account or fiat on/off-ramp if it adds KYC/KYB, bank details, conventional card details, financial-account binding or routine human intervention. A DEX/aggregator API is not automatically qualified either; check its route, terms, contracts, token support and any account/API requirements.

The eligible source set is not literally every token contract or asset. It is the subset of collected assets that passes an allowlist and risk policy: canonical identity verified, supported network, transferable balance controlled by the treasury, sufficient executable liquidity, acceptable price impact, no disqualifying transfer tax/rebase/blacklist/freeze behaviour, no known malicious or honeypot contract, and no unresolved sanctions/asset restrictions. NFTs, LP receipts, vault shares, bridged representations, wrapped assets and newly issued tokens require explicit classification; symbol similarity is never proof of asset identity.

Before any conversion, NOVA must obtain and validate a fresh quote and an executable route. The approval envelope must bound:
- exact source and destination chain/token identifiers and wallet;
- maximum source amount and exact target amount or minimum received;
- quote timestamp/expiry and route/solver/bridge/provider allowlist;
- price impact, slippage tolerance and minimum output;
- DEX/pool/aggregator/solver/bridge fees, including fees embedded in exchange rates where measurable;
- gas for every approval, swap, bridge, destination execution and final supplier payment;
- priority/tip/relayer fees, token-account creation/rent where relevant, and any destination-chain fee reserve;
- a single all-in maximum cost and maximum source-asset spend.

The all-in comparison must include source-chain gas, destination-chain gas, token approvals, DEX/pool fees, aggregator/solver fees, bridge fees, relayer/priority fees, price impact, slippage allowance, destination account creation/rent (where applicable), and any fee charged by the supplier/intermediary. Compare routes in a common accounting numeraire for internal costing, but execute only the exact crypto assets authorized in the transaction. Do not assume one advertised percentage is the total cost.

Native gas is a separate balance requirement. The treasury must hold the native gas token on each chain where an approval, swap, bridge, claim or final payment must execute, unless the exact route supports independently verified gas sponsorship/paymaster/relayer payment. A gasless/sponsored quote is conditional, not a universal promise. If gas is unavailable or the total cost exceeds the policy ceiling, do not sweep another asset, borrow, incur debt, auto-top-up or fall back to a card; queue, select another already-qualified route, batch only under an approved policy, or pause.

Prefer same-chain routes when they materially reduce bridge and execution risk. Cross-chain routes must be modelled as asynchronous multi-leg operations. Record source transaction, bridge/solver identifier, destination transaction, refund/recovery state and final destination amount. A source-chain confirmation is not proof that destination funds arrived. A partial fill, unexpected token, refunded leg, expired route, delayed bridge or destination amount below minimum must enter an explicit exception state and must not proceed to supplier payment.

Token approvals must be exact-amount or permit-scoped where supported, never unlimited by default. The signer independently checks target contracts, chain IDs, selectors/instructions, token addresses, spender, allowance amount, recipient, amount, minimum output, deadline, fees and policy nonce. Revoke residual allowances when safe and supported. Never blindly sign arbitrary calldata returned by an aggregator or agent tool.

No wallet, private key or treasury seed phrase is supplied to a swap/bridge provider, MCP server or LLM. Agent/MCP support is an interface convenience only; it does not grant signing or spending authority. The NOVA process may request quotes and prepare a route; the AstroCrown-controlled signer enforces the Council envelope independently.

### 4.1.3 Agent-native dynamic service discovery and payment

**Provider-specific payment criteria do not have to be manually researched and frozen before NOVA can discover or evaluate a service.** Dynamic discovery, quote negotiation, payment-method selection and service procurement are part of NOVA's job as an autonomous operational agent. The fixed requirements are AstroCrown's standing policy and treasury safety boundaries; the specific provider offer, payment method, chain, token, amount, fees, expiry, fulfilment and receipt are discovered at runtime.

The normal agent flow is:

1. **Receive an operational need.** NOVA decomposes a requirement such as compute, storage, RPC, inference, domain, monitoring or a one-off API action into capability, quantity, region, duration, service level and data-handling needs.
2. **Discover candidates dynamically.** Search machine-readable service catalogues, MCP discovery servers, APIs, OpenAPI documents, provider capability endpoints, A2A/agent registries and official provider documentation. For example, the MPP service directory exposes a public JSON catalogue and read-only MCP discovery surface. Discovery is advisory: the live service endpoint remains authoritative for its current offer.
3. **Request the live offer.** Contact the candidate's documented endpoint or provisioning API. The offer may be a quote, invoice, checkout object, HTTP `402 Payment Required` challenge, MPP challenge, x402 payment requirement, session offer or subscription offer. Do not assume every provider uses the same protocol.
4. **Interpret the payment challenge.** Read the current exact resource/plan, price, currency, accepted payment methods, token/network/recipient, amount, expiry, recurring or metered terms, usage limit, cancellation/refund behavior and service-fulfilment conditions. For MPP and x402, a runtime `402` challenge is the authoritative current payment request; catalogue metadata is discovery information, not a replacement for the challenge.
5. **Check route compatibility at runtime.** Determine whether a permitted crypto payment method is supported directly. If the treasury does not hold the exact required asset/network, request a qualified conversion quote. If there is no compatible crypto path, mark that offer unavailable under the standing policy and continue searching. Do not fall back to card, bank, fiat account or KYC.
6. **Apply the standing NOVA delegation.** If the exact offer, supplier, service category, asset/chain, total spend, recurrence, data class and route fit the active mandate and limits, NOVA may proceed without asking the Council for that individual routine payment. If it exceeds the mandate, pause and request an internal AstroCrown authorization. A provider-side human approval is not substituted for the Council.
7. **Authorize and pay using a protocol adapter.** The protocol client formats the required payment credential/header/session/subscription request. The signing boundary independently checks the mandate and exact transaction. The agent/LLM never receives the treasury private key or unrestricted signing authority.
8. **Retry the service request with payment proof.** Examples: x402 returns a `402` challenge; the agent signs the supported payment authorization, retries with the payment header and receives the paid response/receipt. MPP returns a challenge; the client answers with a method-specific credential and receives a receipt. One-time charge, metered session and subscription are separate intent types with different budget/renewal rules.
9. **Verify fulfilment.** Validate the payment receipt/transaction reference and confirm the requested API result, service entitlement, resource creation, invoice credit or subscription activation. Payment acceptance alone is not proof that the service was delivered.
10. **Record and monitor.** NOVA records source/destination assets, quote/challenge, authorization, payment receipt, chain transaction, total costs, fulfilment evidence and recurring obligations. It monitors usage and renewals, closes sessions, cancels unused services when authorized, and refuses renewal when the mandate or balance is no longer valid.

#### Supported agent payment patterns

- **HTTP 402 / x402 exact payment:** request a paid API/resource; receive a machine-readable payment requirement; sign the supported crypto payment; retry with proof; receive a receipt and resource response.
- **MPP charge:** one payment for a defined request or resource.
- **MPP session:** authorize a capped funded session and meter usage, potentially settling in the background; enforce the session's maximum deposit and close/reconcile it.
- **MPP subscription:** authorize a merchant-scoped recurring plan with a fixed amount and billing period; renew only within the active recurring mandate and cancel/stop when revoked or over limit.
- **Provider-native crypto checkout/API:** use the provider's documented wallet/invoice/order API when it is not using x402/MPP.
- **Fiat invoice/card/voucher intermediary:** use only if the provider offers a machine-readable route compatible with the existing no-KYC/no-bank/no-card policy and the final supplier settlement can be verified.

The MPP public services catalogue and its MCP surface can help NOVA discover and rank participating services, but the catalogue MCP is read-only and does not itself pay, sign, register services or execute API calls. The live endpoint's payment challenge must be re-read immediately before a transaction.

#### Dynamic qualification states (not a manual pre-registration prerequisite)

- `DISCOVERED` — public service metadata found; no payment permission.
- `OFFER_PROBED` — public endpoint or no-funds request returned an offer/challenge; no payment permission.
- `RUNTIME_POLICY_CHECKED` — NOVA resolved the offer against standing constraints; remaining unknowns are either immaterial or block the offer.
- `MANDATE_AUTHORIZED` — the specific purchase fits a valid internal delegated mandate or obtains a new internal approval.
- `PAYMENT_EXECUTED` — authorized protocol payment completed.
- `FULFILMENT_VERIFIED` — service/resource/credit was actually delivered and reconciled.
- `REJECTED_BY_POLICY` / `NEEDS_INTERNAL_APPROVAL` / `PROVIDER_NOT_AGENT_COMPATIBLE` — offer is outside policy, requires a forbidden payer-side step, or lacks a machine-operable path.

This allows NOVA to discover, probe and classify new providers continuously without first creating a manually curated dossier for each one. A non-compatible offer is skipped; a compatible offer may proceed under the existing delegation. Identity, banking, conventional-card, prohibited-use and treasury safety boundaries are never bypassed.

#### Provider compatibility fallback

Not every VPS host, domain registrar, GPU marketplace or merchant has implemented x402 or MPP. NOVA should try progressively:
1. native x402/MPP payment challenge;
2. provider-native wallet/crypto checkout or machine-readable invoice API;
3. a qualified crypto-funded invoice/card/voucher intermediary;
4. documented API-driven checkout that remains fully within policy.

A browser-only flow is not automatically agent-compatible. If normal operation requires human-only CAPTCHA, identity review, interactive OTP/3-D Secure, manual bank transfer, support intervention or a forbidden financial instrument, the provider is not usable for autonomous routine operations. NOVA should continue to another candidate instead of attempting to evade that requirement.

#### Standing mandate, not repeated per-payment consent

AstroCrown should authorize NOVA through a standing, revocable mandate on its own trusted governance surface. The mandate can define allowed operational categories, policy version, aggregate and per-purchase ceilings, time period, renewal behavior, allowed asset/network risk class, maximum gas/conversion cost, data classification, permitted service regions, and conditions requiring Council escalation. The exact provider offer is bound to the mandate at runtime.

Once the purchase is inside that mandate, NOVA must not ask the Council to approve every API call, routine renewal or small infrastructure expense. It records the reason and evidence. It escalates only when a purchase is outside the authorized envelope or the policy requires it. A signed mandate/receipt model such as AP2 is a useful interoperability reference for proving delegated agent authority, but AstroCrown's own mandate remains the governing authorization unless an external service requires a compatible credential.

### 4.2 Council policy authorization envelope

Before a payment intent is created, the operation must carry a signed/immutable internal authorization record containing:

- policy version and approving Council decision/reference;
- permitted supplier scope and service categories: this may be a named provider or a delegated category such as hosting, storage, inference, RPC or monitoring; NOVA may discover new providers at runtime if their live offer passes the mandate and hard rules, so a complete static provider list is not a prerequisite;
- exact source chain/token identifier and treasury wallet, plus exact destination/payment chain/token identifier (canonical mint/contract/native asset, not just a symbol such as “USDT”);
- optional swap/bridge route allowlist and contract/solver addresses, maximum source amount, minimum destination amount, maximum price impact/slippage, quote expiry, maximum gas/priority/relayer cost, maximum all-in conversion cost and required native gas reserve;
- allowed crypto recipient address or verified provider invoice address, plus the final supplier/fiat beneficiary where the route is indirect;
- allowed fiat currency, maximum conversion spread/fees, quote expiry and supplier invoice reference where applicable;
- max amount per transaction and total budget window;
- permitted service/plan classes, regions and duration ranges; exact provider, plan and region may be resolved from the live offer when it falls within the delegated scope;
- expiration time and nonce/idempotency key;
- whether the authorization covers one payment or recurring automatic renewal;
- required settlement confirmations and overage ceiling (must be zero unless specifically authorized);
- revocation state and current governance authority.

A mandate such as “NOVA may procure qualified hosting up to the authorized category and spend ceiling” can be sufficient for autonomous routine purchases when it also states recurrence, service/data scope, permitted payment methods, risk/gas limits and escalation rules. It need not enumerate every provider in advance. However, it is never a blank cheque: the live offer and exact payment destination/asset/amount are bound to the mandate and checked immediately before signing. The total paid transition budget currently recorded elsewhere is a planning ceiling of USDT 150; it is not an approved payment or proof that all launch requirements fit within the amount.

### 4.3 Payment state machine

Every payment intent must declare one exact route type:

- `CRYPTO_DIRECT` — direct supplier crypto settlement;
- `CRYPTO_TO_FIAT_INVOICE` — intermediary converts crypto and pays the supplier's fiat invoice;
- `CRYPTO_FUNDED_CARD` — intermediary uses crypto funding to pay the supplier by card;
- `CRYPTO_VOUCHER` — intermediary issues supplier-compatible merchant credit/voucher funded by crypto.

Required agent-native lifecycle (invoice fields are optional for API/HTTP payment challenges):

1. `SERVICE_NEED_DEFINED` — NOVA converts the operational request into capability, quantity, region, duration, data class and service objective.
2. `SERVICE_DISCOVERED` — catalogue/MCP/API/OpenAPI/official documentation finds candidates; this does not authorize payment.
3. `OFFER_REQUESTED` — NOVA requests the live offer, quote, checkout or service endpoint.
4. `PAYMENT_CHALLENGE_RECEIVED` — provider returns a machine-readable HTTP 402/x402/MPP challenge, quote, invoice or provider-native payment request.
5. `OFFER_VALIDATED` — exact resource, merchant, service, price/usage, accepted payment methods, token/network/recipient, expiry, fees, recurring/metered terms, data handling and fulfillment semantics are resolved. Invoice/fiat fields are populated only where applicable.
6. `MANDATE_CHECKED` — active standing AstroCrown mandate and hard no-KYC/no-bank/no-card/no-debt rules are checked against this specific purchase. The purchase proceeds without new human approval only when it fits that mandate; otherwise it enters `NEEDS_INTERNAL_APPROVAL`.
7. `PAYMENT_METHOD_SELECTED` — select a permitted crypto method supported by the live challenge; if needed, start the separate conversion phase below.
8. Optional asset-conversion phase, only when the held treasury asset differs from the recipient-required asset:
   - `CONVERSION_QUOTE_REQUESTED` — obtain an exact-input quote and route for the exact source asset, destination asset, source/destination networks and treasury wallet.
   - `CONVERSION_QUOTE_VALIDATED` — independently validate canonical assets, supported route/contracts, output minimum, expiry, price impact, complete fee breakdown, gas on every leg, native gas reserve and the all-in mandate ceiling.
   - `CONVERSION_PREPARED` — construct only the exact swap/wrap/bridge steps and exact token approvals required by the validated route.
   - `CONVERSION_AUTHORIZED` — isolated signer checks every spender/router/bridge/solver, token, amount, deadline, minimum output and mandate before signing.
   - `CONVERSION_SUBMITTED` — record each source-chain transaction and route/bridge identifier; query status before retrying.
   - `CONVERSION_SOURCE_CONFIRMED` — source-chain execution is independently confirmed; for cross-chain operations this is not destination settlement.
   - `CONVERSION_DESTINATION_CONFIRMED` — independently verify the exact destination token/network and minimum received amount in the treasury wallet before supplier payment. If no conversion is needed, record `CONVERSION_NOT_REQUIRED`.
9. `FUNDING_PREPARED` — prepare the exact supplier/intermediary payment using the validated destination asset, amount and network; replay protection and remaining mandate cap are checked.
10. `FUNDING_AUTHORIZED` — isolated signer authorizes only the exact protocol payment credential/transaction.
11. `FUNDING_SUBMITTED` — record the chain signature/hash, protocol credential reference or provider payment ID.
12. `CRYPTO_FUNDING_CONFIRMED` — independently confirm the exact asset/network/destination/amount or verify an equivalent signed payment-protocol receipt.
13. `PROTOCOL_PAYMENT_ACCEPTED` — x402/MPP/provider confirms the payment credential and returns a receipt or verifiable payment result.
14. `SERVICE_FULFILMENT_PENDING` — await the protected API response, resource provisioning, service entitlement, subscription activation or invoice settlement.
15. `FULFILMENT_VERIFIED` — verify the requested API result, usable resource/entitlement or credited service and bind it to the payment receipt.
16. Conditional downstream settlement for intermediary routes only:
    - `SUPPLIER_SETTLEMENT_PENDING` — invoice intermediary/card/voucher downstream settlement begins;
    - `SUPPLIER_PAYMENT_CONFIRMED` — final supplier payment, card capture or voucher redemption is independently evidenced;
    - `PROVIDER_CREDIT_PENDING` / `CREDITED` — supplier account confirms the matching credit, plan or service term. These states are not required as separate hops for a direct x402/MPP service that has already returned the paid resource and receipt.
17. `RECONCILED` — source asset, conversion, gas/fees, destination asset, payment receipt, provider response/fulfilment, any downstream settlement and mandate usage match; append the immutable audit record.

The same system supports one-off charges, metered sessions and subscriptions. Session and subscription renewals must remain within the mandate's merchant/service scope, period, usage and cumulative spend ceiling. The mandate can be revoked; unused session funds and any protocol-specific refunds must be reconciled.

Invoice PDFs, supplier contracts, beneficiary bank details and payment references must be treated as confidential payment data. Do not send their contents to an external AI/LLM extraction or processing service unless the exact processor, purpose, retention, training, region, subprocessors and deletion path have been qualified and explicitly approved for that data class.

A route must not report `SUPPLIER_PAYMENT_CONFIRMED`, `CREDITED` or `RECONCILED` merely because the intermediary received crypto. If the intermediary cannot expose a reliable downstream payout/capture/redemption state or a supplier acknowledgement, that route is not qualified for autonomous core payments.

Terminal/exception states include `REJECTED`, `EXPIRED`, `FAILED_BEFORE_SUBMISSION`, `FAILED_ON_CHAIN`, `NO_CONVERSION_ROUTE`, `CONVERSION_SLIPPAGE_EXCEEDED`, `CONVERSION_MIN_OUTPUT_NOT_MET`, `CONVERSION_PARTIAL`, `BRIDGE_PENDING`, `BRIDGE_FAILED`, `BRIDGE_REFUNDED`, `WRONG_SOURCE_ASSET`, `WRONG_DESTINATION_ASSET`, `INSUFFICIENT_NATIVE_GAS`, `GAS_COST_EXCEEDED`, `TOKEN_NOT_QUALIFIED`, `DUPLICATE_CONVERSION`, `UNDERPAID`, `OVERPAID`, `WRONG_ASSET`, `WRONG_NETWORK`, `WRONG_DESTINATION`, `DUPLICATE`, `INTERMEDIARY_PAYOUT_FAILED`, `SUPPLIER_PAYMENT_UNCONFIRMED`, `CARD_DECLINED`, `CARD_REVERSED`, `VOUCHER_UNREDEEMABLE`, `PROVIDER_CREDIT_MISMATCH`, `REFUND_PENDING`, `REFUNDED` and `MANUAL_REVIEW_REQUIRED`.

After crypto funding is submitted, do not blindly retry because an HTTP request timed out. Query chain status, intermediary route status and supplier invoice state first. Every transition must be idempotent and append an audit event. Refunds and reversals must retain the linkage to the original payment intent and must never silently create reusable untracked credit.

### 4.4 Signing and wallet isolation

- The operational agent may prepare, validate and request signatures; only the authorized signer can sign.
- The signer must independently validate chain/network, token contract/mint, recipient, exact amount, fee ceiling, instruction set/program and policy envelope.
- For swaps/bridges, validate every target contract/router/solver, spender and allowance, exact-input amount, minimum output, destination chain/token/recipient, deadline, fee/tip and calldata/instruction selector. Never sign unrestricted approvals or arbitrary agent-generated calldata.
- Never expose seed phrases/private keys to a provider, LLM prompt, GitHub artifact, workflow log or ordinary inference route.
- Use least-privilege, purpose-specific accounts/wallets. Hosting/payment wallet funds must be separated from treasury, user custody and operational admin wallets.
- Prefer policy-limited programmable signing and multisignature/threshold controls where supported. A human approval is not needed for each routine transaction once a correctly scoped, time-bound budget envelope has been authorized; an emergency halt or policy exception goes back to Council.
- Revoke keys/allowances and stop new payments on chain mismatch, provider compromise, unusual price/quota change, unapproved recipient, unexplained usage, or failed reconciliation.

This describes the required architecture; it is not a claim that such a signer or treasury adapter has been implemented.

## 5. Machine-operable governance without provider-side humans

Human governance is internal. External human action is not a normal dependency.

### 5.1 Allowed internal human actions

- approve/revoke provider policies and data classifications;
- approve a budget envelope or strategic migration;
- review exceptional legal/security incidents;
- resolve a deliberate ambiguity that cannot be resolved from machine evidence;
- approve a major version, protocol or risk change.

### 5.2 NOVA autonomous actions within authority

- ordinary scheduled health, usage and capacity observation;
- automatic failover between already-qualified providers;
- queue/retry/backoff and graceful degradation;
- start/stop/scale within pre-authorized capacity bounds;
- routine backup and restore verification;
- invoice creation, transaction preparation and bounded signing/payment under an approved envelope;
- automatic renewal only where the provider invoice, recipient, network/token, amount and period remain within pre-approved policy;
- automatic quarantine/deconfiguration for failed health/security/terms gates;
- audit and reporting.

### 5.3 External provider actions that are unacceptable for core dependencies

- manual support ticket to renew a quota, restore access or approve a routine deployment;
- manual billing-portal click to release a machine task;
- recurring human CAPTCHA or interactive session;
- a payment route that requires AstroCrown or its authorized payer-side operators to provide KYC, bank-account details, bank credentials, a conventional payment card or a fiat payment account. An intermediary may use its own bank/card settlement rails internally only if that does not shift any of those requirements onto AstroCrown;
- manually confirming each machine's status or invoice;
- no API to destroy a service that continues to accrue cost;
- unexplained negative balance, auto-top-up or billable fallback.

One-time creation of a provider account and initial API key may be performed by an authorized maintainer only where it does not require KYC, government identity, bank or card. After that, ordinary operation must be machine-managed and monitored.

## 6. Provider conformance test suite

A provider adapter is not qualified by a successful login or “hello world”. Its contract test must include:

### Eligibility and legal-use tests
- no identity/KYC/government document flow across the whole payer-side chain, including payment intermediary, conversion partner and card issuer;
- no AstroCrown-side card, bank, bank-credential or conventional financial-account requirement; document supplier-side beneficiary bank details separately where fiat settlement needs them;
- exact $0 plan entitlement, duration and region;
- terms permit AstroCrown/NOVA development and future product use where relevant;
- exact model/asset/service licence and upstream processor map.

### Machine lifecycle tests
- create and retrieve resource;
- idempotent duplicate create;
- state transition/health check;
- stop/start/reboot/resize as supported;
- scheduled job/queue operation;
- cancel/terminate/destroy;
- machine-readable failures and recovery;
- credential scope and rotation/revocation;
- backup/export/restore and checksum parity.

### Asset conversion tests
- [ ] Source/destination canonical token identifiers are validated; symbols alone cannot authorize a swap.
- [ ] Unsupported, unverified, restricted, frozen, malicious, low-liquidity or non-transferable tokens are rejected.
- [ ] Quote expiry, exact source amount, minimum output, slippage, price impact and complete fee breakdown are enforced.
- [ ] Source and destination gas are separately estimated and remain within policy; sponsored gas is accepted only when the quote proves the exact sponsor/route.
- [ ] Same-chain swap and cross-chain bridge state are independently reconciled; source confirmation never masquerades as destination completion.
- [ ] Partial fill, refund, wrong destination token, bridge delay, insufficient output and failed route pause the supplier payment.
- [ ] Token approvals are limited to the exact required spend and arbitrary router calldata is rejected.
- [ ] All-in route cost is compared to the direct-payment alternative and exceeds no Council ceiling.

### Financial safety tests
- no automatic card/fiat fallback that charges AstroCrown or bypasses its crypto-funded policy;
- no payer-side KYC, bank-account, bank-credential or conventional-card requirement anywhere in an intermediary route;
- free quota exhaustion fails closed;
- paid usage is impossible unless an authorization envelope exists;
- provider quote and invoice match exact authorized terms;
- network/token/recipient validation;
- transaction simulation/signing limits;
- payment retry after timeout cannot duplicate;
- provider invoice and on-chain settlement reconcile;
- unexpected price, invoice, balance or recipient change stops the payment.

### Portability tests
- deploy the same OCI/container artifact to the new provider;
- restore a database export and compare schema/data invariants;
- restore object storage from checksum-verified export;
- reconfigure DNS/TLS/WebAuthn origins deliberately;
- move scheduler/leases without duplicate live execution;
- perform controlled failover and rollback;
- prove that provider removal does not delete canonical application state.

A route that does not support a lifecycle operation must state it; NOVA must not simulate success or conceal the missing capability.

## 7. Current adapter implementation sequence

No live wallet, provider account, production credential or mainnet payment is authorized by this specification alone. The implementation starts with agent-native discovery and deterministic simulation.

1. **Language-neutral contracts:** define JSON/OpenAPI schemas for ServiceDiscovery, ServiceOffer, PaymentChallenge, StandingMandate, PaymentCredential, PaymentReceipt, FulfilmentEvidence, Compute, Inference, RPC, ObjectStore, Database, Scheduler, SecretStore and AssetConversion.
2. **Agent service discovery:** implement read-only clients for the MPP service catalogue/API and MPP Services MCP; add generic provider API/OpenAPI/official-document discovery. Discovery is dynamic and must not require a pre-curated provider list.
3. **Payment protocol clients:** implement parsers/adapters for HTTP 402/x402 and MPP challenges, including charge, session and subscription intents. Parse live challenge requirements, payment methods, asset/network, amount, expiry, usage and receipt. No wallet signing or funds are involved at this stage.
4. **Provider-native fallback discovery:** add read-only service capability/quote retrieval for providers that do not expose MPP/x402 but have a documented API/CLI or machine-readable checkout. Do not create billable resources.
5. **Deterministic offline conformance harness:** test catalogue discovery, malformed/expired/replayed challenges, offers requiring prohibited KYC/fiat/card methods, standing mandate evaluation, amount/period limits, payment credentials, receipts, fulfillment and error/recovery paths.
6. **Asset conversion simulation:** test canonical token/chain discovery, route quotes, minimum output, slippage, source/destination gas, complete route costs, exact approvals, bridge delay/refund/partial outcomes and transaction rejection using mocks only.
7. **Current $0 adapters:** wrap existing GitHub Actions, Cloudflare Pages/Workers/D1/R2 and Solana Devnet/public RPC without changing the active NOVA controller.
8. **Read-only infrastructure/payment probes:** after confirming public documentation permits them, request quotes, service offers and payment challenges from candidate providers. Keep signing, account creation and billable resource creation disabled.
9. **Council/NOVA signer simulation:** simulate an internally delegated standing mandate and isolated signer with deterministic local fixtures/testnet. Exercise per-transaction and cumulative ceilings; never use mainnet funds during development qualification.
10. **Bounded provider lifecycle test:** only after a separate explicit decision and exact cost/terms approval, perform a small non-production resource create/inspect/destroy test. Verify no leftover resource or billing accrual.
11. **Shadow-mode controller:** replay discovery, quote, challenge, decision and fulfilment events without making changes; prove parity with the existing NOVA control plane.
12. **Single-writer cutover:** only after all gates pass and a Council decision, move the active controller. The old NOVA workflow must be stopped/fenced first.
13. **Paid transition:** only after complete $0 qualification, separately approved and within the user's authorized deployment budget. No purchase is authorized here.

The separate `asset_conversion_adapter` quotes and prepares same-chain swaps, wrapping/unwrapping and cross-chain swap/bridge plans. It cannot sign or submit independently. Conversion destination balance and chain evidence must reconcile before the payment protocol adapter proceeds.

## 8. Current known gaps and decisions

| Capability | Current state | Required next evidence |
| --- | --- | --- |
| $0 CI/control-plane | Existing GitHub Actions/NOVA workflows | Verify current runner limits, persistence, scheduling delay and branch-state recovery |
| $0 app edge/runtime | Cloudflare Pages/Workers candidate | Verify actual account #02 free/no-card state and remote staging only after explicit deployment authorization |
| $0 database | D1 candidate, not currently established as remotely qualified | Deploy isolated staging only through separately authorized guarded workflow; test quota fail-closed and export |
| $0 object storage | R2 candidate | Verify account no-card/free state; implement encryption, backup/export/restore and S3 adapter |
| persistent CPU compute | No qualified $0 VPS currently known | Continue only targeted searches for true recurring $0/no-KYC/no-card machine runtime |
| GPU | No active provider in NOVA roster | Continue search; distinguish trial/shared notebook from persistent job-capable GPU |
| private production Solana RPC | Not qualified | Find no-KYC crypto-pay RPC or qualify a self-hosted node economics/operations path |
| paid VPS + crypto | NoctHost candidate; EQVPS candidate | No-card/no-KYC route, terms, API key scopes, full lifecycle, backups, usage, price and restore tests |
| provider crypto payment | EQVPS advertises this route | Exact token/mint/network, invoice semantics and automated Council-wallet payment test |
| domain + DNS | 0xHost API candidate; ENS is non-DNS alias | Registrar accreditation/TLD registrant rules, no-KYC conditions, DNS API, renewal and expiration tests |
| GPU paid crypto path | NoctHost/OVH GPU, Akash, Nosana candidates | Exact hardware/pricing, no-KYC, host isolation, crypto settlement and automated job lifecycle |
| payment signer | Not implemented | Policy-limited wallet architecture, testnet conformance, key recovery and audit evidence |
| agent-native discovery/payment protocols | Not implemented | MPP catalogue/MCP discovery, x402/MPP challenge parsing, standing mandate, crypto-only method selection, receipt and fulfilment verification |
| crypto-funded fiat/card intermediary | No route qualified | Map payer-side KYC/bank/card requirements, fees/spreads, legal availability, machine settlement and final supplier-payment confirmation |
| provider failover | NOVA health/routing exists but whole product failover not qualified | End-to-end provider-outage simulations, state fencing and recovery evidence |

## 9. Non-goals and safety boundaries

- No direct code/runtime change, workflow activation, provider account creation, credential change, infrastructure deployment or paid service purchase is made by writing this specification.
- No card, bank, KYC, identity, payment or crypto operation is authorized.
- Do not move the NOVA heartbeat or duplicate its schedules while the current controller is active.
- Keep Strong RSI suspended and Weak RSI report-only/human-in-loop.
- No public Mainnet payment, treasury transaction or real-user production launch is authorized.
- Do not claim production readiness from local tests, documentation, marketing statements or a successful resource-create call alone.
