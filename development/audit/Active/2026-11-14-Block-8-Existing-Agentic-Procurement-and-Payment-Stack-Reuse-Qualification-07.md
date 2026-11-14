# Block 8 — Existing Agentic Procurement, Discovery and Payment Stack Reuse Qualification 07

**Assessment date:** 2026-11-14  
**Repository:** ACROWN-System/AstroCrown-Web  
**PR:** #177, draft and unmerged

## 1. Decision — integration first, not reinvention

The user has corrected the direction: AstroCrown is not the first autonomous system that needs to discover a requirement, find a provider/solution and pay for it. Existing agentic-commerce projects already provide parts of that cycle.

**NOVA should reuse existing systems as replaceable procurement/payment capabilities wherever they fit.** NOVA remains the higher-level operational orchestrator: it identifies the actual infrastructure need, invokes discovery/agent-commerce services, evaluates the results against AstroCrown's standing mandate, selects the offer, delegates payment through a qualified rail and verifies fulfilment.

Do not build another:
- x402/MPP implementation when a maintained, suitable client/router can handle it;
- universal paid-service catalogue when an existing catalogue can be queried;
- agent-to-agent service marketplace when an existing market has relevant providers;
- general-purpose wallet/MCP server when a safe, appropriately governed wallet adapter exists.

Build only the thin integration/adaptation and governance glue NOVA needs: capability normalization, cross-catalog search, standing-mandate enforcement, wallet/signing boundary, all-in cost comparison, fulfilment verification, provider failover and a unified audit record.

No single existing product currently covers every AstroCrown requirement. Use a composable stack with multiple interchangeable sources and payment rails, not a single-vendor dependency.

## 2. Best integrated buyer-side stack: Nevermined Router + Catalog MCP

**Preliminary status: FIRST INTEGRATION CANDIDATE; no-KYC eligibility remains UNKNOWN, so no account/funding/payment is approved.**

Official sources:
- Main: https://nevermined.ai/
- Catalog: https://nevermined.ai/catalog/
- Catalog MCP: https://nevermined.ai/docs/products/catalog/mcp
- Router overview: https://nevermined.ai/docs/products/catalog/router/overview
- Router flow/custody: https://nevermined.ai/docs/products/catalog/router/how-it-works
- Autonomous agent demonstration: https://nevermined.ai/docs/products/catalog/router/agent-autonomy
- x402 rail: https://nevermined.ai/docs/products/catalog/router/rails-x402
- MPP rail: https://nevermined.ai/docs/products/catalog/router/rails-mpp
- Quickstart: https://nevermined.ai/docs/products/catalog/router/quickstart
- Pricing: https://nevermined.ai/pricing/
- Source SDK: https://github.com/nevermined-io/payments

### What it already does

This is the closest match to the buyer-side autonomous procurement/payment requirement:
- The Catalog MCP lets an agent search the Nevermined directory and call paid services from any MCP host.
- The Router can pay **any public x402 or MPP endpoint**, even when that endpoint has never integrated Nevermined. The catalogue is a curated discovery subset; the Router itself is not limited to listed services.
- It probes an endpoint, detects whether the live HTTP 402 challenge is x402 or MPP, interprets the offered terms, checks a spend delegation, creates the payment credential, retries/calls the endpoint, returns the actual service result and writes one payment ledger.
- It removes the need for a separate vendor account/API key for pay-per-call services where payment is the authentication mechanism.
- The agent itself needs a Nevermined API key and Delegation ID, not a provider-specific wallet or private key. The Router does not put the treasury private key in the agent's prompt/MCP context.
- The Router uses an idempotent request ID for retry protection and returns settlement transaction/receipt information.
- The documented end-to-end agent run used only an API key and a 9-cent one-hour delegation, purchased across x402 on Base and MPP on Tempo, then correctly refused another purchase when the cap was exceeded. Nevermined reports this as a real live-mainnet demonstration; AstroCrown has not independently reproduced it.

### Payment-rail fit and exact limitations

- **x402:** supports the live HTTP 402 accepts requirements and x402 v1/v2. The quickstart currently funds a crypto Delegation with USDC on Base mainnet.
- **MPP:** tempo uses Tempo mainnet USDC.e or the testnet PathUSD asset; evm uses Base stablecoin authorization. Tempo token addresses are operator-allowlisted; unsupported or unlisted assets are rejected before signing.
- **MPP current scope:** one-off charge and production session are documented; MPP subscription and metered-stream intents are not currently supported by this Router rail. Do not infer support for every MPP capability just because the underlying MPP protocol describes it.
- **Source-asset limitation:** the documented crypto Delegation does not accept arbitrary treasury tokens directly. The wallet needs the exact required payment asset on the exact network. AstroCrown would have to use its separately qualified conversion layer to create Base USDC or Tempo USDC.e when required.
- **External-service routing fee:** 2% added above the merchant price. The payment response returns the actual fee and the cap debit. Rounding can make very small payments disproportionately costly; the true cap debit, not an arithmetic estimate, must be included in route comparison.
- **Pre-funding:** the user funds the Delegation wallet. The Router says it does not hold/advance float. Funding is currently manual; the agent cannot refill itself. On x402 the Router does not pre-check on-chain balance before signing, so an underfunded wallet can reserve delegation budget while on-chain settlement later fails. This must be accounted for; do not enable automatic top-up or debt.
- **Catalog scale and price:** the live directory reported 163 paid services on the reviewed date, mainly AI, search, scraping and data. A personal account is advertised as free with 2,000 catalog credits to try services and up to 20 agents/10 plans. The $20/month Catalog subscription and $10 credit packs are sold as card purchases; they do not qualify as AstroCrown's crypto-funded path. Do not treat one-time starter credits as permanent $0 capacity.
- **No-KYC gate:** public Router/payment docs reviewed do not establish that account creation/API-key issuance or wallet/delegation setup can be completed without payer-side identity/KYC/KYB. No-KYC is therefore **UNKNOWN**, not PASS. The docs' optional buyer-identity token is not itself KYC, but that does not prove the service account is no-KYC.
- **Commercial/legal and data terms:** must be checked for AstroCrown's actual operating use before any account or live integration.

### Assessment

Nevermined is the best first system to test because it already combines discovery, cross-protocol routing, delegated limits, paid call, result relay, idempotency and ledger. The 2% fee and fixed Base/Tempo asset rails are real trade-offs. It is not a universal replacement for a VPS vendor checkout, monthly API-key subscription or cloud account; those providers must expose x402/MPP or a suitable machine API. No Nevermined signup, API key, wallet, delegation, account, payment or funding was initiated in this audit.

## 3. Open-source integrated candidate: Xona Wallet / xPay

**Preliminary status: HIGH-RELEVANCE REFERENCE / DISCOVERY CONNECTOR CANDIDATE; NOT APPROVED TO HOLD OR SIGN FOR ASTROCROWN TREASURY.**

Official sources:
- Repository: https://github.com/xona-labs/xpay
- Documentation: https://docs.xona-agent.com/docs/xpay
- npm package: https://www.npmjs.com/package/@xona-labs/xpay

Reviewed source revision: 79e21d019e40f07e27d37b1eaa752d5cc8137b75 (6 November 2026); package manifest reports @xona-labs/xpay version 0.2.40.

### What it already does

- Ships one core as a CLI, TypeScript SDK and MCP server.
- Advertises discovery across 21,000+ x402 services from multiple sources and also discovers on-chain AgenC agent-service listings.
- Searches, ranks, probes and invokes paid endpoints; can call a URL directly and respond to a live x402 challenge.
- Offers local multi-network wallet profiles for Solana and EVM, USDC x402 payments, balance/reporting tools and per-transaction/per-day guardrails.
- Adds Solana/Jupiter token discovery and swap, so it can convert SOL or eligible SPL tokens into a payment token on Solana.
- Adds AgenC hires: an agent can discover a service listing, inspect its manifest/reputation and escrow SOL to hire the provider agent.
- Has an MIT licence and is therefore a possible source-code integration/fork reference rather than only a hosted SaaS.

This is useful because it places service discovery, x402 payment, one on-chain agent marketplace and Solana swaps behind one CLI/SDK/MCP surface.

### Source-review blockers before any production use

The following observations come from public source inspection, not an execution or external security audit:

1. The GitHub repository description advertises Privy custody, but src/signers/privy.ts is explicitly a stub and throws “not implemented yet”. The production custody adapter advertised in that description is therefore not present in the inspected source.
2. The profile API permits omission of a passphrase. In that path src/profile/storage.ts stores the mnemonic as plaintext in wallet.json. The MCP server's automatic wallet provisioning defaults to no passphrase when XPAY_PASSPHRASE is absent and explicitly logs “UNENCRYPTED”. This is not acceptable for AstroCrown/NOVA treasury.
3. The per-day guardrail history in src/guardrail/index.ts is an in-memory array in the inspected implementation. A new process starts with empty spend history unless another durable control is added. It cannot be treated as AstroCrown's authoritative persistent daily/rolling budget ledger.
4. The same guardrail intentionally skips allowedHosts for direct transfers and swaps; amount caps still apply, but direct recipient/contract and router validation must be separately enforced by an external signer/policy layer.
5. The wallet requirement selector documents USDC balances and divides token amounts at USDC's six-decimal scale. It does not itself provide a generic arbitrary-token / any-network payment selection engine.
6. The currently documented xpay swap uses Jupiter on Solana. The README lists EVM-to-Solana bridging as planned, not as a currently completed capability. It is not yet the general cross-chain conversion layer AstroCrown needs.
7. src/signers/raw-solana.ts embeds a default Alchemy RPC URL with a credential-like path component. Replace the default with an AstroCrown-controlled RPC/configuration boundary and review the exposed value before any reuse.
8. Its local guardrail, signing model, MCP tool annotations and all payment/asset paths need a full independent review and tests against the current branch; the README feature list is not security evidence.

Assessment: use xPay as a source of ideas or a read-only catalog/discovery adapter after reviewing its external discovery endpoints. Do not connect its wallet or signing path to the AstroCrown treasury in the current state. A fork would require hardening the secret lifecycle, custody adapter, persistent budget ledger, exact recipient/program checks, all-asset support and cross-chain routes. Prefer using its catalogue sources directly or behind a read-only adapter rather than granting the entire package access to funds.

## 4. Coinbase CDP Bazaar MCP

**Preliminary status: SECONDARY x402 discovery/payment connector; account/KYC and commercial suitability UNKNOWN.**

Official source:
- https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/bazaar-mcp-server

The Bazaar MCP server offers:
- search_resources: semantic discovery returning resource descriptions, prices and input/output schemas;
- proxy_tool_call: invoke the selected paid resource;
- the @x402/mcp client detects a payment-required response, creates the payment payload through the configured x402 payment client, attaches it to the retry and returns the paid resource;
- the CDP facilitator verifies and settles the payment.

It is a good second catalogue/transport for x402-enabled services and could broaden discovery beyond one marketplace. It is x402-focused, not a general MPP/invoice/card/hosting checkout router. It requires a configured payment client/facilitator; payer-side KYC and onboarding eligibility have not been qualified for AstroCrown. No CDP account or wallet was created.

## 5. Agent-to-agent service marketplaces

These platforms can help NOVA discover and hire another agent to perform a specialist task. They are a separate procurement class, not generic cloud/vendor payment.

### 5.1 Virtuals Agent Commerce Protocol (ACP) / EconomyOS

**Status: AGENT-TASK MARKETPLACE CANDIDATE — not a universal infrastructure merchant checkout.**

Official sources:
- https://os.virtuals.io/acp/overview
- https://os.virtuals.io/acp/concepts
- https://os.virtuals.io/acp/cli/client-workflow
- https://os.virtuals.io/acp/architecture

ACP gives an agent a Client, Provider and optional Evaluator role. Providers publish offerings with price, SLA, requirement schema and deliverable; clients browse, create a job, receive a proposed budget, fund USDC escrow, inspect the deliverable, then approve to release escrow or reject to recover funds. Current EconomyOS docs state ACP is the reference implementation of proposed ERC-8183 and describes a multi-chain environment; its project claims more than 2,000 agents onboarded over 18 months. These are provider-reported figures.

Useful NOVA use cases:
- hire another agent for research, code analysis, infrastructure discovery, data gathering or another specialist service;
- outsource work with an explicit deliverable and escrow;
- use a neutral evaluator where configured, instead of relying only on the buyer agent's judgment.

Limits:
- ACP jobs are agent-to-agent engagements; a cloud provider or hosting vendor must publish an agent offering to be purchased directly through ACP.
- The documented client workflow has an explicit escrow funding operation and approval/rejection of the deliverable. The authority that evaluates and approves must be bound to NOVA's policy.
- The guide's standard job flow is USDC on Base; it does not solve arbitrary asset conversion or general vendor invoice payment.
- Account onboarding, KYC/KYB and no-bank/no-card status are not established in the public material reviewed.

### 5.2 Olas Mech Marketplace

**Status: REAL AGENT-TO-AGENT SERVICE ECONOMY; SPECIALIST TASK DISCOVERY LEAD.**

Official source: https://olas.network/agent-economies/mech

The Mech model lets an agent request data/intelligence/specialist tasks from another agent or application, have the Mech use its own models/APIs/tools, deliver the output and settle on-chain. Olas' live public page (14 November 2026, 12:40 UTC) reports 12,283,935 all-time task requests and 10,348,784 deliveries; it also reports 13 daily active agents on a seven-day average and 99.05% of requests being made on-chain. The activity figures are self-reported dashboard metrics.

This is a real integration target for delegating specialist capabilities. However, it is not a catalogue of ordinary VPS/GPU/DNS/database vendors. The small reported current daily-active set and very high on-chain request share warrant route/cost/latency evaluation before relying on it for time-sensitive infrastructure operations. Public page lists many settlement tokens and networks; exact token/network/fees must be discovered per service.

### 5.3 AgenC marketplace surfaced through xPay

AgenC exposes on-chain service listings and agent hires priced in native SOL. xPay's integration reads listings through the marketplace SDK and supports escrow hires/status. In the inspected xPay README, reviewing/accepting results still happens on the AgenC website; a fully integrated acceptance command is listed as planned. This makes it a candidate discovery source, not an immediately unattended end-to-end procurement stack.

### 5.4 Yanga Wallet (formerly Agent Economy Wallet)

**Status: EXPERIMENTAL SOLANA AGENT-WALLET / MARKETPLACE REFERENCE.**

Sources:
- https://github.com/xavierScript/agent-economy-wallet
- https://github.com/xavierScript/agent-economy-wallet/blob/main/SECURITY.md

Yanga describes an on-chain Solana agent marketplace with MCP discovery tools (discover_registry, read_manifest, check_reputation, probe_x402, pay_x402_invoice), fixed-price x402 payments and streaming/per-compute payments. The public flow is directly aligned with “discover a merchant, read its service manifest, check reputation, probe live price, policy-check and pay”.

Source-review observations:
- The wallet-core uses AES-256-GCM with a PBKDF2-derived key and stores encrypted key material.
- Its policy engine source explicitly states that a wallet with no attached policy is allowed, and its transaction history/policies are persistent only if a state directory is configured. NOVA would need to configure durable fail-closed policy storage.
- The repository's quickstart uses Solana Devnet; its production/mainnet status and active marketplace depth were not established in this review.
- The latest main commit found was 11 May 2026; no meaningful community/activity proof was found to justify treating it as a production dependency.

Useful as a design/reference and potential testnet experiment, not approved for treasury.

## 6. Discovery and trust standards are separate from payments

### ERC-8004 — Trustless Agents

Official specification: https://ercs.ethereum.org/ERCS/erc-8004

ERC-8004 defines Identity, Reputation and Validation registries. An agent registration file can advertise service endpoints such as web, A2A, MCP and related skills. It is a possible cross-market identity/reputation overlay when NOVA evaluates agent providers.

**Payments are explicitly orthogonal and not included in ERC-8004.** Pair it with x402/MPP/ACP where relevant; do not treat an ERC-8004 registration as a payment route or proof of provider quality on its own.

## 7. Recommended reuse architecture for NOVA

Use existing systems by function. Keep multiple providers in each class so NOVA is not locked to one company.

| Capability | Reuse first | NOVA's own responsibility |
|---|---|---|
| Operational need and planning | NOVA's existing reasoning/orchestration | Express the actual system requirement, constraints and success criteria |
| Paid HTTP/API service discovery | Nevermined Catalog MCP, Coinbase Bazaar MCP, xPay catalog sources | Merge results, deduplicate, rank and verify service fit |
| x402/MPP payment routing | Nevermined Router first candidate; Coinbase Bazaar/x402 client as alternate | Enforce AstroCrown mandate, asset-conversion budget, idempotency and fulfilment |
| Agent-to-agent task procurement | Virtuals ACP, Olas Mech, AgenC/Yanga as conditional connectors | Define task/acceptance tests, escrow limits and deliverable verification |
| Agent identity/reputation | ERC-8004 and marketplace-specific reputation | Treat identity/reputation as signals, not guarantees |
| Asset conversion | LI.FI/Jupiter and compatible provider-native routes | Compare all-in cost, maintain the asset allowlist and authorize exact transaction |
| Wallet custody / signer | AstroCrown-controlled signer or separately qualified smart-account service | Keep keys outside LLM/MCP; enforce durable spend policy, emergency stop and treasury separation |
| Audit/operations | Existing NOVA state, logs and controller | Maintain canonical durable ledger and service inventory |

**Recommended first integration path:**
1. A no-funds/read-only evaluation of Nevermined Catalog MCP/Router in its sandbox: confirm discovery, offer selection, x402/MPP parsing, ledger, idempotency and the exact crypto-funded erc4337 flow. Its no-KYC account onboarding remains a hard unknown; do not create an account or submit identity data until the path is proven.
2. A read-only comparative catalogue probe via Coinbase Bazaar and selected xPay discovery sources. Do not start xPay's wallet/MCP auto-provisioning path; it can create a local signer/wallet automatically.
3. Evaluate ACP/Olas/AgenC as optional external-agent task markets using mock/testnet escrow only. No production hiring until settlement, review and KYC eligibility are resolved.
4. Keep a local adapter boundary so the selected stack can be replaced. NOVA does not depend on a Nevermined-only service catalogue, one x402 indexer, one marketplace or one wallet provider.
5. Build only the minimum internal glue that is not already offered: NOVA need → service discovery adapters → offer normalization → mandate check → payment adapter → conversion adapter → receipt/fulfilment verification → canonical audit.

## 8. Standing policy and runtime discovery

This research does not reinstate the earlier requirement to pre-approve every provider manually.

The durable conditions are AstroCrown's standing mandate and non-negotiable financial/data boundaries. A provider or agent marketplace can be discovered at runtime; NOVA evaluates its actual offer and may use it when the route fits the mandate. A new provider does not require a new Council decision merely to be discovered or probed read-only. Routine purchase inside the category/time/spend policy does not require per-payment approval.

An external tool's own delegated budget is an additional lower ceiling, never a replacement for AstroCrown's own mandate. If its rules require KYC, bank/card information, a human per-payment action, unauthorized fiat credit, or spending beyond AstroCrown's policy, NOVA skips it and continues discovery.

## 9. Next work order

Do not implement another independent payment wallet, catalogue or protocol stack.

1. Build an integration comparison and read-only harness around Nevermined Router/Catalog MCP, Coinbase Bazaar MCP and selected xPay catalogue endpoints.
2. Confirm each candidate's actual account onboarding/no-KYC conditions before enabling any paid credential; keep unknown as blocked for funding, not for public discovery.
3. Verify Nevermined's exact Base/Tempo asset rails, 2% additional route fee, gas/funding behaviour, data handling, API-key revocation and delegation controls.
4. Conduct a source/security review of any open-source package before installing it into the NOVA control plane. For xPay/Yanga, keep private keys out and use read-only discovery first.
5. Add ACP/Olas/AgenC only where agent-to-agent task procurement fills a real operational gap; do not use an agent marketplace when a direct provider API is simpler.
6. Preserve the existing single active NOVA control plane. Integrations should be ordinary adapters, not new autonomous cron/control-plane replicas.
7. Once the best no-KYC/crypto-compatible stack is identified, implement only its thin adapter, then simulate purchases under a bounded testnet/dry-run mandate. No mainnet transaction is authorized by this report.

## 10. Evidence and action boundary

This is public-documentation and source-code inspection only, not an external security audit, account test or production qualification.

- No provider or marketplace account was created or accessed.
- No credentials, API keys, wallet seed, private keys or payment instruments were obtained.
- No MCP server or package was installed or executed.
- No wallet was created, connected or funded.
- No x402/MPP/ACP/Mech/AgenC payment, escrow, swap, bridge, approval or gas transaction occurred.
- No service was purchased, no infrastructure was deployed, and no active NOVA provider roster or production workflow was changed.
- No KYC, bank, card, proof-of-address or source-of-funds data was submitted.
- Canonical NAV protocol/template files remain to be located/applied before external onboarding or production actions; this report does not claim formal NAV compliance.

**Block conclusion:** multiple existing systems already provide agent service discovery, paid-endpoint invocation, delegated spending and agent-to-agent task procurement. NOVA should integrate and orchestrate those capabilities instead of recreating them. Nevermined Router/Catalog MCP is the leading integrated buyer-side candidate; xPay provides broad x402 discovery and an open-source reference but is not safe for AstroCrown treasury in its inspected state; Coinbase Bazaar provides an alternate x402 path; Virtuals ACP and Olas Mech cover specialist agent-to-agent work. No single candidate yet proves AstroCrown's no-KYC and full operating requirements, so all remain replaceable and payment-disabled pending the narrow checks recorded above.
