# Block 8 — Infrastructure Acceptance Contract and Candidate Reclassification

**Review date:** 2026-11-14  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Related work:** PR #177 — Privacy & Transparency Centre  
**Authority:** Explicit user direction in the 2026-11-14 continuation of Block 8  
**Applies to:** NOVA and AstroCrown development infrastructure, AI inference, model hosting, compute, storage, routing, monitoring, payment and future service-provider selection

> This contract corrects the qualification drift in Candidate Requalification 01/02 and Candidate Discovery 03/04. Those documents preserve useful public-source findings, but their labels such as "interesting", "high-interest" or "promising" must not be interpreted as acceptance against the complete operational objective. This contract controls all future qualification and reclassifies earlier candidates where necessary.

## 1. Actual infrastructure objective

The project is not looking for a collection of interesting free AI APIs, demos, trial credits, research showcases or disconnected tools.

The objective is to build and qualify the **complete AstroCrown/NOVA system in a live, operational environment with a total $0 development budget**, while designing the system so it can later transition to sustainable services payable with cryptocurrency, either directly or through a payment intermediary that converts crypto into the supplier's required fiat payment without transferring KYC, bank-account or card requirements to AstroCrown.

The resulting system must allow NOVA to operate according to its intended role as the operational coordination, governance, organization, preservation, retrieval, evaluation, automation and evolution system. External services must not turn NOVA into a manually operated assistant that needs a human to resolve provider-side tasks during ordinary operations.

Human governance and intervention belong in:
- AstroCrown's own website and Imperial Council;
- NOVA's own internal governance, approval, audit and control mechanisms.

External infrastructure should be machine-operable after an authorized initial setup. A provider must not create an ongoing external-human dependency for ordinary provisioning, usage, billing, payment, quota renewal, monitoring, failover, backup, recovery or routine operations.

## 2. Non-negotiable acceptance gates

A route is not accepted as a core development dependency unless it passes every applicable hard gate below for the exact account, plan, model, endpoint, region and intended workload.

### Gate 1 — $0 development, with no hidden financial prerequisite

The live service must be usable for actual development and operation at a total cost of $0.

Disqualifying conditions:
- a credit/debit card, bank account, bank transfer, conventional payment account or prepaid fiat balance is required to activate or continue the free route;
- a free allocation is available only after purchasing credits or making a minimum top-up;
- a free trial expires before the system can be developed and qualified, with no continuing $0 entitlement;
- the service silently moves to billable usage or automatic top-up after an allowance is exhausted;
- the "free" claim is only a limited demo, showcase, waitlist, research access or evaluation experience that cannot support the real development workload.

A recurring allowance is preferable. A one-time grant may support a bounded experiment but is never counted as sustained development capacity. A finite free quota can be used only if the real route remains operational within the allocation and exhaustion can be made to fail closed without a charge. The architecture must queue, degrade or fail over to another qualified route when quota is exhausted; it must never create debt or surprise expenditure.

### Gate 2 — No KYC, no identity or conventional financial-account dependency anywhere in the payer-side route

The route must not require:
- government-issued identity documents, government ID numbers, selfies/biometrics, proof of address, real-name authentication, identity-provider KYC or equivalent;
- credit cards or debit cards;
- bank account details, bank transfer, bank-linked wallets or conventional financial-account binding;
- Alipay or similar financial-account binding;
- a conventional payment processor account that requires financial identity verification to access the free service.

A normal service login, email verification or a non-KYC OAuth login is not automatically KYC. However, mandatory phone/SMS verification, manual identity review, organization verification or an ambiguous "verified user" gate remains UNKNOWN/BLOCKED until its exact requirement is established and accepted. Never infer no-KYC merely because the public pricing page does not mention verification.

This gate applies to the entire payer-side chain, not only the merchant or first crypto on-ramp. A crypto-to-fiat intermediary, payment facilitator, card issuer/program manager, acquiring processor, voucher marketplace or other agent must not require AstroCrown, its authorized operator or its beneficial owner to complete KYC/real-name identity verification, provide government documents, open or link a bank account, supply bank-account credentials, obtain a conventional card, or bind a conventional financial account. Moving those requirements from the infrastructure vendor to an intermediary does not remove the incompatibility; it merely relocates the same friction and dependency.

The intermediary may use its own banking, card-network or fiat settlement relationships internally. That is not, by itself, an AstroCrown-side financial-account requirement. For an invoice payout, the supplier's own receiving bank account and ordinary beneficiary details may be necessary because the supplier is the fiat recipient; AstroCrown must not be required to own, open, control or link that receiving account. Record payer-side requirements separately from supplier-side receiving requirements, and never describe the overall route as bank-free when a fiat bank transfer is part of it.

### Gate 3 — Real, live and operational development environment

The service must be an actual live endpoint, compute service, storage service, deployment service or operational platform suitable for integrating into and testing the real system.

Not sufficient on its own:
- mock responses, localhost-only prototypes or an offline-only test;
- playground-only access that cannot be automated;
- a demo or public showcase without a stable API/service contract;
- academic-only, personal-only, non-commercial or nonprofit-only grants when the intended AstroCrown/NOVA development use is outside those terms;
- hosted notebooks or shared Spaces that cannot execute the required machine workload or cannot operate as an actual service component;
- temporary trial credits mislabelled as a live, sustainable tier.

A development environment must be realistic enough to qualify the actual deployment architecture, APIs, account lifecycle, user services, integrations, security boundaries, workloads, observability, backups, recovery and migration. Using a sandbox or test network for a specific isolated test may still be valid; it cannot be represented as qualification of the live operational service.

### Gate 4 — Machine-operable lifecycle; no recurring external-human intervention

The provider must expose documented, automatable interfaces suitable for NOVA to operate within approved permissions. Depending on the service, required interfaces include:
- API/CLI/SDK/IaC for provisioning, configuration, deployment, updates, scaling, restart, deletion and recovery;
- machine-readable status, health, quotas, usage, billing/credit balances, reset times and failure causes;
- stable authentication and least-privilege credential scopes;
- event/webhook or pollable state for asynchronous jobs and payments;
- export, backup and restore mechanisms;
- programmatic key rotation/revocation and resource lifecycle;
- programmatically enforceable usage/spend limits and a fail-closed state.

Reject or block services that require a person to approve routine requests, respond to a provider's support ticket for ordinary operations, repeatedly complete CAPTCHAs, renew access manually, click through recurring consent forms, accept interactive billing popups, manually restart quota or manually reconcile each request. One-time initial account creation/configuration may be performed by an authorized maintainer only when it does not require KYC, bank/card details or ongoing human tasks. Ordinary operating decisions remain inside AstroCrown/NOVA governance.

### Gate 5 — Crypto-funded paid transition without relocating excluded friction

A strategic paid-stage service must have a documented route that starts with cryptocurrency controlled by AstroCrown and completes payment to the supplier without requiring AstroCrown or its authorized operator to obtain KYC approval, a bank account, a conventional payment card or a fiat payment account. Direct crypto acceptance is preferred, but it is not the only acceptable settlement architecture. The crypto-asset collected or held by AstroCrown does not have to match the asset demanded by the supplier/intermediary: NOVA may evaluate a qualified self-custody swap/bridge route from any eligible treasury asset into the exact destination asset/network, subject to asset allowlisting, gas reserve, minimum output, all-in fee ceiling and Council authorization. USDT is not mandatory; route quality, lawful eligibility, security and total execution cost determine the selected payment asset.

**Permitted route classes to investigate:**

1. **Direct crypto settlement:** AstroCrown pays the supplier's verified wallet/invoice in the exact asset/network accepted by that supplier. The source asset may be any eligible crypto asset held by AstroCrown; NOVA may convert it through a separately qualified swap/bridge route before payment. USDT may be convenient, but is not mandatory. Record canonical source and destination token contract/mint/native identifiers, network, recipient and settlement semantics.
2. **Crypto-to-fiat invoice settlement:** AstroCrown sends crypto to a qualified intermediary; the intermediary converts it and pays the supplier's fiat invoice using the intermediary's own settlement arrangements. The supplier may provide its own beneficiary bank details where required. AstroCrown must not open or link a bank account, provide card/bank details, or complete KYC with the intermediary.
3. **Crypto-funded payment card:** AstroCrown funds a payment provider in crypto and the provider makes a card payment to the supplier. The card must be issued/operated through the provider without requiring AstroCrown to obtain a conventional card account, provide card/bank details, or complete KYC. The route must support machine-readable funding, spending limits, transaction status, freeze/revoke and reconciliation. Issuer or regulator-triggered identity checks are a disqualifier if they apply to AstroCrown or its operators.
4. **Crypto-funded voucher or merchant credit:** AstroCrown purchases a supplier-compatible voucher/credit using crypto. This is acceptable only for the exact merchant/service and only where the voucher route can be purchased, redeemed, monitored and reconciled without KYC, bank/card details or recurring manual action. It is not a general invoice-payment substitute.

**Mandatory route-wide checks:**
- map every entity in the payer-side path: crypto wallet, intermediary, exchange/conversion partner, card issuer/program manager, acquiring/settlement processor and any subprocessor;
- identify which entity receives AstroCrown's crypto, which entity converts it, which entity pays the supplier, and which entity confirms final settlement;
- classify direction of flow explicitly: `payer_crypto_to_supplier_crypto`, `payer_crypto_to_supplier_fiat`, `payer_crypto_to_supplier_card`, `payer_crypto_to_supplier_voucher` or `customer_crypto_to_merchant`; a merchant crypto-acceptance gateway is the reverse direction and is not an invoice-payout intermediary;
- verify no KYC, government identity, real-name, bank-account, bank-credential, conventional card or fiat-account requirement is imposed on AstroCrown, its operators or beneficial owners at any step, including onboarding, top-up, limits increases, continued use, refunds or account recovery;
- verify the intermediary's own fiat/card rails are internal to its service and do not require AstroCrown to become the bank/card account holder or contractual cardholder;
- require API/CLI or other reliable machine interface for quote, invoice/order creation, crypto funding details, exact amount/fees/expiry, payment status, payout/card/voucher status, refunds/reversals, limits and reconciliation;
- ensure no routine CAPTCHA, human support approval, manual bank transfer, manual card loading, per-payment identity review or interactive 3-D Secure/OTP dependency is needed for normal autonomous operation;
- prohibit hidden exchange spreads, unbounded fees, automatic debt/overdraft, auto-top-up and fiat/card fallback;
- for conversion, calculate all-in costs including source/destination gas, approvals, pool/DEX fees, aggregator/solver/bridge/relayer fees, price impact, slippage and final supplier-payment fees; enforce an explicit gas reserve and maximum total conversion-cost policy;
- require independent validation of recipient, fiat currency, exchange rate, quote expiry, final amount, reference and supplier payment confirmation.

**Not sufficient / fail conditions:**
- an intermediary accepts crypto but requires AstroCrown or its operator to submit KYC, proof of address, real-name/beneficial-owner documents or mandatory identity verification;
- AstroCrown must provide, link or control a bank account, card, bank credentials, conventional payment account or fiat balance;
- a crypto deposit is accepted only after opening/funding a conventional exchange or bank account;
- a virtual card is marketed as crypto-funded but issuance or continued operation requires the user to pass identity checks or provide conventional payment details;
- a supposed invoice intermediary requires AstroCrown to complete supplier-side banking onboarding or manually execute the fiat transfer;
- a gift-card route is not accepted by the exact supplier, is not available in the required country/currency, or cannot be machine-purchased/reconciled;
- provider marketing says "no KYC" but terms reserve routine identity verification or account suspension for ordinary use and no workable compliant route is evidenced;
- a manual wallet transfer has no reliable payment reference, API reconciliation or automated confirmation;
- a merchant-facing crypto-acceptance gateway is presented as a payer-side crypto-to-fiat invoice-settlement solution, although it only accepts crypto from the supplier's customer;
- material AML/sanctions screening, fraud controls or legally required restrictions make the route unusable for the intended lawful operation. Do not attempt to evade legal controls; classify such a route as unavailable rather than bypassing them.

A provider may be used for $0 development without itself accepting crypto only as a non-strategic, replaceable component, if its use does not create lock-in and a fully qualified crypto-funded paid replacement route exists. It must not be elevated to a long-term strategic dependency merely because it is currently free.



### Gate 5A — Treasury asset conversion is permitted only under a bounded route

AstroCrown does not have to hold the same asset a supplier or payment intermediary requires. A source asset may be converted from the self-custody treasury into the exact recipient-required asset/network through a qualified DEX/aggregator, wrap/unwrap, bridge or intent route. This removes USDT as a mandatory settlement or treasury asset.

This does **not** mean that every token is automatically eligible. Source assets must be individually identifiable and risk-qualified, transferable from a controlled wallet, supported by a fresh executable route and sufficient liquidity, and free of disqualifying token controls or contract risk. Canonical contract/mint/native identifiers are mandatory; token symbols are not identifiers.

The route must have a bounded source spend, minimum destination output, quote expiry, max slippage/price impact, approved router/bridge/solver contracts, max gas on each chain, a separately funded native-gas reserve (unless an exact sponsored route is verifiably available), and a maximum all-in cost. Include pool/DEX fees, aggregator/solver/bridge/relayer fees, token approvals, source and destination gas, priority/tip, account creation/rent, slippage and the supplier's final payment fee. If the conversion route is uneconomic, unavailable, unsafe or outside the approved cost ceiling, NOVA must not execute it; it may select another qualified path or pause.

Same-chain swaps are preferred where comparable. Cross-chain routes are separate asynchronous legs: source-chain confirmation is not destination-chain settlement. Wrong-token, partial, failed, refunded or delayed bridge outcomes must not trigger supplier payment. Exact token approvals and policy-limited signing are mandatory. Centralized exchanges or custodial services that introduce payer-side KYC/KYB, bank, conventional card or routine human dependencies remain disqualified.

### Gate 6 — Commercial and intended-use rights

Terms must permit the actual intended activity, including commercial development for AstroCrown, development of a customer-facing platform, and future commercial operation where the provider is being considered for that stage.

Reject academic-only, research-showcase-only, personal-only, hobby non-commercial, nonprofit-only or third-party-benefit-prohibited terms when the concrete activity falls outside the permitted scope. Do not reject providers just because commercial terms are not explicit in a marketing page: obtain the governing terms or written clarification and mark UNKNOWN until resolved. A model licence, API service licence, gateway contract and upstream model-provider licence are separate layers and all must permit the intended use.

### Gate 7 — Privacy and security suitable for the workload

Evaluate exact prompt/output use, training, retention, human review, logging, metadata, region, subprocessors, upstream routing, deletion, encryption, security incidents, data export and access control.

Unknown data handling blocks private memory, user submissions, secrets, credentials, identity information, wallet/payment data and confidential/proprietary material. A public/synthetic-data test may be considered only where legal use is permitted and the data exposure is explicitly accepted. A gateway's privacy claims do not override the upstream model provider's policies.

### Gate 8 — Portability and controlled failure

Do not let a provider become a single point of failure or lock NOVA/AstroCrown into proprietary state. Prefer standard API protocols, documented export, replaceable model identifiers, portable deployment artifacts, independent backups and tested recovery. Credentials remain in the approved secret-management boundary; no credentials are committed to repositories.

A provider must be capable of being:
- health-checked and benchmarked automatically;
- paused/quarantined on contract, security, quota or reliability failure;
- replaced by a qualified alternate without human intervention in the provider's console;
- restored or migrated through machine-readable procedures;
- paid only after an explicit internal Council/NOVA budget authorization.

## 3. Candidate status vocabulary

Use the following status vocabulary. Do not use "promising", "high-interest" or "worth prioritizing" as if those words mean acceptance.

- **QUALIFIED — $0 OPERATIONAL:** all hard gates needed for the present development workload have objective evidence; the exact service is live, no-card/no-KYC, $0, machine-operable and safe within stated workload limits.
- **QUALIFIED — CRYPTO-FUNDED PAID TRANSITION:** the exact paid route is funded from crypto without payer-side KYC/bank/card requirements and has machine-readable settlement. Record whether it is direct crypto, crypto-to-fiat invoice settlement, crypto-funded card or merchant voucher; it is not a $0 development resource.
- **CONDITIONAL — NOT QUALIFIED:** one or more hard gates remain UNKNOWN or incomplete. Do not integrate as a core dependency.
- **RESTRICTED / NON-CORE:** may be used only for a specifically permitted, replaceable and low-risk function; does not meet the complete system requirement.
- **FAIL — HARD GATE:** a confirmed contractual/account/financial condition contradicts a non-negotiable requirement.
- **EXPIRED / UNAVAILABLE:** route has ended or is no longer offered.
- **TOOLING ONLY:** useful for evaluation, routing, observability or moderation but not a source of general inference or compute.
- **DISCOVERY LEAD:** claim not corroborated by authoritative current documentation; do not count as capacity.

Every candidate record must show individual results for Gates 1–8. Overall status must be the most restrictive applicable result, not an average score. Missing evidence is UNKNOWN, never PASS.

## 4. Reclassification of the candidates recorded in Discovery 01–04

The prior documents remain part of the audit trail. This table supersedes their preliminary "high-interest/promising" descriptions when interpreted against the full objective.

| Route | Corrected status | Why it does not currently qualify as core infrastructure |
| --- | --- | --- |
| Z.ai / GLM Flash | CONDITIONAL / RESTRICTED | $0 listing exists, but no-card/no-KYC and crypto-paid upgrade are unverified; contractual restrictions may conflict with financial decision support and model development. |
| Kilo Gateway | RESTRICTED / NON-CORE | Anonymous public/synthetic requests may be possible, but upstream terms and durable no-cost entitlement are not controlled; no verified crypto transition or end-to-end machine-operated lifecycle. |
| Hugging Face Inference Providers | CONDITIONAL / NON-CORE | $0.10 monthly credit is documented, but it is tiny and upstream policies apply; card/KYC and crypto-paid transition remain unverified. |
| Hugging Face ZeroGPU | RESTRICTED / NON-CORE | Shared Gradio Space quota is not a general GPU/server runtime; not suitable for the complete operational stack or sensitive/private workloads. |
| Poolside hosted API | EXPIRED / UNAVAILABLE | Hosted inference ended 31 October 2026. Model weights are a future self-host option only if eligible compute is found. |
| Nosana | FAIL FOR CURRENT $0 PATH; CRYPTO PAID ROUTE CONDITIONAL | The current free-credit claim requires a verified payment method. Paid NOS/USDC path may be useful later, but no-KYC, exact settlement and machine lifecycle must be qualified; decentralized host confidentiality is not established. |
| SambaNova | FAIL — FINANCIAL PREREQUISITE | Current offer requires payment method and purchased credits. |
| Alibaba Model Studio | CONDITIONAL / NOT QUALIFIED | One-time new-user quota, account-information gate and card/KYC status unresolved; Free Quota Only must be verified; crypto paid route not established. |
| Sarvam AI | CONDITIONAL / NOT QUALIFIED | ₹100 one-time verified-user credit; verification/card conditions unknown, training opt-out and retention controls require account setup; crypto paid route not established. |
| Vercel AI Gateway | FAIL — PLAN/FINANCIAL/USE CONDITIONS | $5 gateway credit does not satisfy no-card and commercial-use constraints of the free platform route. |
| AI Horde | FAIL — CONTRACTUAL DOMAIN RESTRICTION | Terms prohibit cryptocurrency/blockchain-related use. |
| Typhoon | RESTRICTED / NON-CORE | Research showcase, no SLA; durable allowance, no-KYC, machine lifecycle and crypto transition not proven. |
| Scaleway | FAIL — CARD/KYC REQUIREMENT | Published rate-limit conditions require payment card and KYC. |
| Mixedbread | RESTRICTED / NON-CORE | One-time credit and free-tier content-use/retention concerns; not core model infrastructure and no verified crypto transition. |
| Voyage AI | RESTRICTED / NON-CORE | One-time specialist allowance; privacy opt-out may void credits; no verified no-card/no-KYC or crypto transition. |
| Contextual AI | CONDITIONAL / NOT QUALIFIED | Service-improvement and downstream-use terms require written clarification; account financial requirements and crypto transition unknown. |
| AI21 Labs | RESTRICTED / NON-CORE | Evaluation credit is time-limited/internal evaluation, not a production-capable recurring route; billing condition after trial. |
| Fireworks AI | CONDITIONAL / HOLD | Security incident investigation and account-specific no-card/crypto conditions unresolved. |
| Upstage | CONDITIONAL / NOT QUALIFIED | Free API entitlement, quota, no-card/no-KYC and retention controls not fully established; prior $10 offer unverified. |
| SiliconFlow | FAIL — INTENDED-USE TERMS | Current terms conflict with project/third-party service development. |
| Tencent Hunyuan / TokenHub | FAIL — KYC | Official route requires real-name verification. |
| NVIDIA NIM | RESTRICTED / NON-CORE R&D | Free Developer access is limited to R&D/prototyping; production serving requires paid Enterprise terms, and crypto/no-KYC paid transition is not established. |
| Novita-hosted Apodex | CONDITIONAL / NOT QUALIFIED | Current model price is $0, but account quota, no-card/no-KYC, upstream route, downstream rights and crypto-paid upgrade remain unverified. |
| GMI Cloud free endpoints | CONDITIONAL / NOT QUALIFIED | No-card is advertised, but numeric quota, no-KYC, prompt terms, commercial use and crypto-paid transition are not established. |
| OpenAI data-sharing incentive | RESTRICTED / NOT CORE | Requires positive API balance and explicit sharing of eligible prompts/outputs; it is not private $0 infrastructure or independent capacity. |
| SenseNova | FAIL — KYC | Identity verification required. |
| Tencent Cloud TokenHub | FAIL — KYC / FINANCIAL CONDITION | Real-name authentication required; some international route documentation also describes a balance freeze. |
| Volcano Engine Ark | FAIL — KYC | Real-name authentication is required; safe free-quota mode does not remove this. |
| Ant Ling | FAIL — FINANCIAL ACCOUNT | Alipay binding and payment/auto-debit relationship contradict no-financial-account rule. |
| DeepSeek direct API | DISCOVERY NOT QUALIFIED | No permanent $0 direct API entitlement established; paid route's crypto/no-KYC conditions not established. |
| Speka | CONDITIONAL / NON-CORE GATEWAY | $1 recurring allowance and no-card claim are interesting, but hard no-overage enforcement, upstream route controls, no-KYC and crypto transition not proven. |
| OVHcloud Qwen3Guard | RESTRICTED / NON-CORE SPECIALIST | Anonymous, low-rate moderation endpoint may be useful, but does not provide general inference; paid crypto transition and full production processor terms not qualified. |
| Braintrust Starter | TOOLING ONLY | Evaluation and scoring platform, not model capacity; traces contain content and full operational lifecycle/crypto transition not established. |
| Cloudflare AI Gateway | TOOLING ONLY | Routing/cost layer, not inference. Logging defaults require careful control; Cloudflare paid account/billing path is not established as crypto/no-KYC. |
| AIHubMix | RESTRICTED / NON-CORE TRIAL | Ten free trial calls only; recurring daily allowance requires a $1 top-up; upstream provider data handling remains. |
| Nous Portal x402 | CONDITIONAL — CRYPTO PAID TRANSITION ONLY | Solana USDC per-request route is machine-friendly and crypto-native, but not $0; data-use/privacy setting and upstream terms must be qualified; no USDT route was established. |
| OpenCode Console / Zen | RESTRICTED / TEMPORARY ROUTE | Model-specific free promotions and data policies change; not stable core capacity or proven crypto-paid transition. |
| ModelScope | DISCOVERY LEAD | High quota claim not independently corroborated by official API entitlement and terms. |
| InferX | DISCOVERY LEAD / NOT QUALIFIED | Exact route, upstream data use, no-card/no-KYC, reliable quota and crypto paid route not established. |
| AMD Developer Cloud | FAIL — CARD REQUIREMENT | Advertised credit requires card-linked cloud account. |

**Current conclusion:** No newly discovered provider from Candidate Requalification 01/02 or Candidate Discovery 03/04 has yet been demonstrated to pass all hard gates as a core $0 operational and crypto-transition-capable dependency. That is an honest evidence result, not a reason to relax the requirements. Some services may be suitable as restricted, replaceable tooling, but must not be counted as the foundation of the complete live system.

## 5. Architecture consequences

### 5.1 Build for a multi-provider operating environment

NOVA must be able to route tasks by capability, quality, cost, privacy class, quota, latency and reliability. A provider must not be assumed to be interchangeable merely because it exposes an OpenAI-compatible API. Maintain separate model-family, hosting-route and gateway identities.

### 5.2 No external human operator as routine control plane

Provider-side human support, manual invoice approval, recurring web-console maintenance, manual quota renewal, interactive CAPTCHA or manual per-job approval must not be part of normal operations. Use NOVA's own state machine, health checks, quotas, policy gates and failover. Escalate decisions to the Imperial Council/authorized human roles through AstroCrown's own website and internal system.

### 5.3 Crypto-funded payment must be machine-readable across both settlement legs

For future paid providers, the payment adapter should be independent of inference/compute adapters. It must support direct crypto settlement and, where qualified, crypto-funded intermediary settlement. NOVA should receive a Council-approved budget/limit, create a payment intent, validate the route and exact supplier obligation, obtain authorized wallet execution, observe crypto settlement, observe the downstream supplier payment/card capture/voucher redemption, reconcile the final service credit and record an immutable audit event. No provider or intermediary receives an unrestricted wallet key. No payment occurs merely because a free quota is exhausted.

For crypto-to-fiat routes, record the crypto asset/network and receiving address, conversion quote/spread, fiat currency, beneficiary, payout rail, transfer reference, payout status, returned-payment behaviour and supplier confirmation. For card routes, record issuer/program, card identifier (never full card secrets), authorization/capture/refund status, limits and merchant descriptor. For voucher routes, record merchant, SKU/denomination, expiry, region restrictions, redemption state and remaining value.

Do not impose USDT as the mandatory source or settlement asset. Select among eligible treasury assets and provider-required destination assets by comparing the safest executable route and its complete all-in cost. Any direct or swapped payment route must record exact canonical source and destination token/native identifiers, chain, quote, min output, fee/gas calculation, refund/error behaviour, approvals and no-KYC conditions. A provider that accepts USDC, USDT or another token is eligible for assessment only after the exact required asset/network is proved. A crypto-to-fiat provider is not qualified merely because it accepts crypto: the payer-side no-KYC/no-bank/no-card and end-to-end machine settlement gates still apply.

### 5.4 Free-tier exhaustion and service continuity

Every free service must be constrained so that:
- no automatic paid overage or card fallback is possible;
- the provider's own limit is measured where accessible;
- NOVA keeps a conservative remaining-capacity reserve;
- requests can be queued, cached, reduced or routed to another qualified provider;
- noncritical tasks can be paused deterministically;
- critical platform functions remain available without a single AI vendor;
- provider outages do not require the user to contact provider support.

### 5.5 Machine-first procurement and governance

Provider discovery, qualification, route changes, quota threshold, payments and credential rotation should be documented as machine-readable contracts and NOVA workflows. The Imperial Council approves policies, provider tiers, risk and budget envelopes; NOVA executes authorized operations and reports evidence. External providers are execution resources, not governance authorities.

## 6. Next work order

Candidate Discovery 05 must not resume generic provider browsing. It must target routes capable of satisfying the hard gates, especially:

1. live API/compute/storage/hosting without KYC, card, bank or fiat funding;
2. documented recurring $0 entitlement and fail-closed usage;
3. direct crypto or qualified crypto-funded conversion into the exact provider-required payment asset/network, with route-level gas, slippage, liquidity and total-cost ceilings;
4. API/CLI/IaC, machine-readable quota/usage/payment, and autonomous lifecycle;
5. terms permitting the actual AstroCrown/NOVA commercial-development and future product use.

Search for providers in infrastructure categories as well as AI APIs: compute and GPU marketplaces, serverless/container hosting, managed databases/object storage, RPC/indexing, monitoring, domains/DNS, inference, model hosting and payment rails. Payment-rail discovery must include direct crypto acceptance, crypto-to-fiat invoice settlement, crypto-funded cards and merchant-compatible crypto vouchers. Free services need not all accept crypto themselves, but any non-crypto free component must be replaceable and must not become a strategic lock-in; a paid transition provider must have a qualified crypto-funded route that passes the entire payer-side hard gate.

For each category, maintain two distinct lists:
- `$0 OPERATIONAL DEVELOPMENT` — usable now without financial/KYC prerequisites;
- `CRYPTO-PAID TRANSITION` — real operational paid service with direct machine-compatible crypto payment and no KYC/bank/card.

Do not claim the complete system is qualified until the required service categories are covered and the system has passed end-to-end live operational tests in the actual $0 configuration.

## 7. Completion boundary

This document corrects the provider-selection contract and the interpretation of previous discovery work. It does not activate any provider, create accounts, alter secrets, add card/bank/payment information, perform KYC, initiate crypto transfers, deploy or change NOVA workflows, or claim production readiness. The prior discovery reports remain as historical research evidence and are explicitly superseded by the stricter acceptance contract above.
