# Block 8 — NOVA Agent-Native Service Discovery and Autonomous Payment Workflow 06

**Assessment date:** 2026-11-14  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**PR:** #177, draft and unmerged

## 1. Correction to the previous approach

The previous blocks over-emphasized completing provider-specific due-diligence dossiers before NOVA could discover or evaluate a service. That is not the correct architecture for an autonomous operational agent.

**NOVA itself is the agent.** Discovering services, reading their machine interfaces, obtaining live payment offers, choosing a compatible crypto payment method, paying inside delegated authority, verifying fulfilment and reconciling the result are part of NOVA's job.

The correct distinction is:

- **Pre-establish AstroCrown's enduring policy:** no payer-side KYC/KYB or government identity, no bank account/credentials, no conventional card, no debt/overdraft/automatic fiat fallback, data boundaries, delegated spend authority, expiry/revocation and emergency stop.
- **Discover provider-specific facts at runtime:** capabilities, price, payment method, asset/network, recipient, amount, expiry, usage/recurrence, cancellation/refund, account requirements and fulfilment response.
- **Do not require a static list of every provider:** NOVA can discover new services and probe public/machine endpoints without completing a manual dossier first.
- **Do not request Council approval for every routine purchase:** a standing mandate can authorize service categories and spending ceilings. NOVA binds the exact live offer and transaction to that mandate before signing. It escalates only when the purchase exceeds the mandate or requires an exceptional governance decision.

Provider-specific evaluation is therefore a runtime agent capability—not a manual prerequisite to discovery.

## 2. Agent-payment protocols now demonstrate the required process

### 2.1 Machine Payments Protocol (MPP)

Official sources:
- Main site: https://mpp.dev/
- Services catalogue: https://mpp.dev/services
- Public JSON catalogue: https://mpp.dev/api/services
- Services MCP: https://mpp.dev/mcp/services
- Metered sessions: https://mpp.dev/blog/sessions-improved
- Subscriptions: https://mpp.dev/blog/subscriptions
- Protocol specification: linked from https://mpp.dev/

MPP describes an internet-native protocol in which an agent can pay a service through its HTTP interface. The current service directory exposes paid services in categories including AI, search, web/headless-browser, email, fax and agent-to-agent services. It supplies a public catalogue API and read-only MCP discovery tools that let an agent search services, inspect offers, retrieve usage recipes and see advisory API information.

The catalogue is for discovery only: its MCP server does not sign, pay, register a service or proxy paid calls. The live target endpoint's HTTP 402 challenge remains the authoritative offer at the moment of purchase.

MPP supports three important billing patterns:
- **Charge:** one payment for a specific request or resource.
- **Session:** authorize a capped funded session and meter usage incrementally; settlement can be scheduled by amount, usage or time, and a session can be resumed.
- **Subscription:** authorize a merchant-scoped recurring service for a fixed period, with defined renewal and usage constraints.

MPP is payment-method agnostic at the protocol level. AstroCrown should enable only crypto methods that meet its policy; it must not activate card or bank methods simply because MPP supports them.

### 2.2 x402

Official sources:
- https://x402.org/
- https://x402.org/x402-v2-launch/
- https://docs.0x.org/docs/introduction/develop-with-ai/autonomous-agent-payments
- https://x402.org/wp-content/uploads/sites/10/2026/06/x402-whitepaper.pdf

The normal x402 pattern is:

1. NOVA requests a protected API/resource.
2. The service responds with HTTP 402 and machine-readable payment requirements.
3. NOVA selects a compatible permitted crypto payment method.
4. The internal wallet signer authorizes the exact payment request.
5. NOVA retries the original request with the payment proof.
6. The service/facilitator verifies or settles the payment and returns the protected resource plus a receipt/payment reference.

A current 0x integration example charges $0.01 per API request in USDC on Base or Solana with no 0x API key required for that specific endpoint. This demonstrates the protocol pattern only; it is not a universal service price or a claim that every supplier accepts x402.

### 2.3 Adoption beyond a protocol demo

Stripe's announcement on 18 March 2026 describes MPP as an open standard for agents to pay API, MCP and HTTP services. It cites Browserbase headless-browser sessions and other live service patterns. This indicates that agent-native micropayment and usage-based billing are becoming operating infrastructure, not just a theoretical design.

### 2.4 AP2 and delegated agent authority

Official sources:
- https://github.com/google-agentic-commerce/AP2
- https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/agent_authorization.md
- https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol

AP2 describes signed mandates and action authorization to prove what a user delegated to an agent. AstroCrown can adopt this mandate/receipt principle internally. AP2 also supports conventional payment methods, so its existence does not justify introducing a bank/card route into AstroCrown.

## 3. The correct NOVA process

The workflow is service-first and challenge-driven, not invoice-first:

1. **Operational need:** NOVA receives a requirement such as obtaining compute, storage, RPC, inference, monitoring or a one-off API action.
2. **Discover:** query machine-readable service catalogues, MCP discovery, APIs/OpenAPI, provider capability endpoints, official docs and agent registries.
3. **Compare capability:** rank candidate offers by required capability, performance, region, privacy, permitted use, reliability, price and portability.
4. **Probe:** call the actual provider endpoint or request a no-funds quote. It may return a quote, invoice, checkout, HTTP 402/x402 challenge, MPP challenge, session offer, subscription offer or provider-native crypto order.
5. **Interpret:** parse the exact service, amount, accepted payment methods, asset/network/recipient, expiry, metering/recurrence, cancellation/refund, account conditions and fulfilment requirements.
6. **Check the standing mandate:** dynamically compare the current offer to the no-KYC/no-bank/no-card/no-debt policy, category authorization, spend ceiling and other relevant boundaries. Reject incompatible offers and continue discovery. Escalate only when it exceeds delegated authority.
7. **Select payment:** use a compatible asset already in treasury or request a qualified swap/bridge quote into the exact destination token/network. Include all gas and fees.
8. **Authorize and pay:** the isolated signer independently validates the exact mandate and payment request; NOVA submits the required protocol credential/header/session/subscription.
9. **Receive:** provider returns a paid API response, resource, entitlement or service-credit evidence and receipt.
10. **Verify:** reconcile the payment reference and confirm that the requested service/resource/access was actually delivered.
11. **Monitor:** record total costs and mandate usage; track session metering, subscriptions, renewal, cancellation, unused balances and refunds.
12. **Continue autonomously:** perform routine purchases within the standing mandate without asking a human to approve every individual request.

For providers that do not support x402/MPP, NOVA should try their documented provider-native API/CLI/crypto checkout or a compatible intermediary. If normal use requires identity checks, bank/card information, repeated human approval or manual settlement, that offer is skipped rather than bypassed.

## 4. Standing mandate: authorize NOVA, not every provider in advance

An Imperial Council policy can authorize NOVA to acquire qualified services within delegated categories, rather than naming every supplier in advance.

For example, the mandate can permit NOVA to procure compute, storage, monitoring and inference from providers that satisfy the standing rules, subject to:
- per-request and aggregate spend ceilings;
- recurring/subscription limits and renewal conditions;
- permitted crypto methods and treasury-asset conversion;
- maximum gas, slippage, price impact and all-in conversion cost;
- data classification and region boundaries;
- no KYC/KYB, no bank, no conventional card, no debt or fiat fallback;
- mandate expiry, revocation and escalation conditions.

The provider, precise offer, recipient, asset, amount and payment reference are dynamically discovered and bound to the mandate immediately before signing. A mandate does not grant an unrestricted wallet to the agent.

**No per-payment Council approval is required when the payment fits the valid standing mandate.** The Council handles policy and exceptions; NOVA performs routine operations.

## 5. Checks that belong at runtime

| Question | When NOVA resolves it |
|---|---|
| What does the service provide? | Discovery/capability request |
| What does it cost now? | Live quote/payment challenge |
| Which token/network is accepted? | Payment challenge |
| Does treasury hold it? | Wallet balance lookup |
| Does conversion make sense? | Swap/bridge route quote |
| What are gas and complete fees? | Quote/transaction simulation |
| Does the route ask for forbidden onboarding? | Terms and actual service/payment flow |
| Does it fit the mandate? | Immediately before signing |
| Was payment accepted? | Protocol receipt/chain confirmation |
| Was the requested service delivered? | API response/resource state/provider credit |
| Can it renew autonomously? | Session/subscription conditions and active mandate |

Unknown details do not prevent NOVA from harmless discovery or no-funds probing. They block payment only when materially relevant and unresolved.

## 6. Important limitations

- x402/MPP work best for HTTP/API/MCP services that explicitly implement them; they do not automatically make every VPS host, GPU marketplace, registrar or cloud provider agent-payable.
- A 402 challenge describes a payment request; it does not prove the provider's legal terms, data rights, jurisdictional eligibility or future identity policy.
- A catalogue is an index, not a settlement guarantor. The live endpoint's challenge is authoritative for the current request.
- A provider may still require an account or initial configuration. If that introduces payer-side KYC/bank/card or routine human dependency, it is incompatible.
- A payment receipt does not prove service fulfilment. NOVA must verify both.
- Agent protocols may support multiple payment methods, but AstroCrown must choose only compatible crypto methods and must never silently select a card or bank method.

## 7. Repository changes

Updated:
- `development/operations/INFRASTRUCTURE-PROVIDER-NEUTRAL-ADAPTER-AND-CRYPTO-SETTLEMENT-CONTRACT.md` — dynamic service discovery, runtime payment challenges, x402/MPP charge/session/subscription handling, standing mandate, dynamic provider scope and agent-native lifecycle.
- `development/audit/Active/2026-11-14-Block-8-Infrastructure-Acceptance-Contract-and-Candidate-Reclassification.md` — new Gate 5B clarifying that policy is fixed while provider-specific facts are learned at runtime; static provider registration is not a prerequisite.

Next implementation sequence:
1. Define `ServiceDiscovery`, `ServiceOffer`, `PaymentChallenge`, `StandingMandate`, `PaymentCredential`, `PaymentReceipt` and `FulfilmentEvidence` schemas.
2. Implement read-only MPP catalogue/API/MCP discovery and x402/MPP challenge parsers.
3. Add generic provider API/OpenAPI discovery for providers not yet supporting a common agent-payment protocol.
4. Build offline mandate decisions and payment simulations, including offers requiring forbidden KYC/fiat/card methods.
5. Test one-off charges, sessions, subscriptions, expired/replayed challenges, wrong assets/networks/recipients, receipt mismatch and service non-fulfilment.
6. Integrate the asset-conversion simulation for source/destination tokens and all-in gas/fee limits.
7. Use public catalogues and permitted read-only/no-funds probes.
8. Only later consider an isolated testnet signer; no mainnet payment is part of this implementation phase.

## 8. Evidence and action boundary

Public documentation reviewed:
- MPP: https://mpp.dev/ and https://mpp.dev/services
- MPP sessions: https://mpp.dev/blog/sessions-improved
- MPP subscriptions: https://mpp.dev/blog/subscriptions
- x402: https://x402.org/ and https://docs.0x.org/docs/introduction/develop-with-ai/autonomous-agent-payments
- Stripe MPP announcement (18 March 2026): https://stripe.com/blog/machine-payments-protocol
- AP2 agent authorization: https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/agent_authorization.md

This is protocol research and architecture correction, not provider account onboarding or transaction testing.

- No wallet or provider account was created/accessed.
- No API key, private key, seed phrase or signing credential was obtained.
- No payment challenge was paid, no swap/bridge/approval was executed, and no gas was spent.
- No KYC, bank or card details were submitted.
- No production service was purchased and no deployment occurred.
- No live NOVA provider roster or workflow was changed.

**Block conclusion:** NOVA must act as the autonomous agent. It should discover providers dynamically, learn their current payment process from machine-readable interfaces, use x402/MPP or provider-native crypto checkout where available, convert assets when necessary, pay under a standing delegated mandate, and verify service delivery. The provider-specific payment process is learned at runtime; AstroCrown's enduring governance and treasury constraints are pre-established.
