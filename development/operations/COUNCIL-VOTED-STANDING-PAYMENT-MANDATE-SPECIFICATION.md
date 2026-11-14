# Council-Voted Standing Payment Mandate Specification

**Status:** Architecture specification; implementation not yet completed  
**Date:** 2026-11-14  
**Owner:** AstroCrown / Imperial Council  
**Executor:** NOVA under delegated authority  
**Related:** \`INFRASTRUCTURE-PROVIDER-NEUTRAL-ADAPTER-AND-CRYPTO-SETTLEMENT-CONTRACT.md\`

## 1. Purpose and governing decision

AstroCrown's Imperial Council must be able to vote once to authorize a payment commitment, including a recurring service/subscription, and have NOVA execute the initial payment and later renewals automatically within the approved terms.

**The Council votes on the authorization mandate once; it does not vote again for every invoice, API call, billing period or routine renewal.**

The vote must be an actual AstroCrown governance decision, recorded by the AstroCrown website and bound to a durable standing payment mandate. An external payment provider, agent marketplace, router, wallet or MCP server cannot create or broaden that authority.

NOVA is responsible for discovering providers, retrieving current offers/payment challenges, checking renewals and carrying out payments within the mandate. The Council defines the durable authority and handles exceptions, amendments, revocation and policy decisions.

This specification does not invent or change Council quorum, voting weight, eligibility, passage threshold, tie-breaking or appeal rules. Those must be inherited from the separately governing Imperial Council rules. A mandate is valid only when the Council voting system reports an approved decision under the then-current governance rules.

## 2. Two types of authorization

The Council surface must support both patterns:

### 2.1 Specific payment / commitment vote

NOVA presents a concrete purchase proposal, including the discovered provider/service, offer, initial charge, billing model and renewal terms.

The Council may approve:
- a one-time payment only; or
- the initial payment **plus automatic recurring renewals** under the specified limits.

For a recurring plan, the initial purchase and its renewal authority should be approved in the same vote. NOVA must not interpret approval of the initial invoice alone as permission to renew.

### 2.2 Standing category procurement mandate

The Council may instead authorize NOVA to procure a category of services (for example, compute, storage, RPC, monitoring, inference or domain/DNS) from providers it discovers dynamically.

The vote sets a category budget, per-purchase limits, recurring limits, allowed payment methods, service/data/region constraints and mandate duration. NOVA may select or replace a provider within this authority without a new vote for each routine purchase.

A category mandate is not a blank cheque. Each actual offer, provider, payment destination, amount and renewal remains checked against its scope and budget immediately before signing. An ongoing commitment must either be directly included in the category mandate or be specifically approved by a Council vote.

## 3. What the Council sees and votes on

NOVA prepares a proposal from the actual live offer. The Council voting surface should display, in a human-readable summary and a machine-readable detail view:

1. **Purpose and need:** what AstroCrown needs, why it is required, expected result and which system/workload will use it.
2. **Provider and service:** discovered supplier/agent, service/plan, region, capability and service/fulfilment criteria. If the mandate is category-based, show the provider-selection scope rather than pretending the provider is already known.
3. **Initial payment:** amount, payment timing, any setup/deposit/activation cost and a maximum all-in amount including gas/conversion/provider fees.
4. **Recurring authority:** whether automatic renewal is enabled; interval/frequency; maximum per billing cycle; any usage/session rate; maximum number of cycles if applicable; cumulative/lifetime or rolling-period ceiling; start and end/review date.
5. **Price changes:** maximum acceptable variation or hard per-cycle maximum. State how NOVA responds to increased prices, fees, tax, currency changes or revised terms.
6. **Payment route:** allowed crypto rails, source-asset policy, provider-required asset/network if currently known, conversion/gas ceiling, no-KYC/no-bank/no-conventional-card restrictions and refund/cancellation behaviour.
7. **Operational authority:** permitted automatic actions (provision, operate, scale within limits, renew, pause, cancel, destroy) and any actions excluded.
8. **Data/security:** data classification, external-processing permissions, region restrictions, retention/deletion requirements and security obligations.
9. **Term and control:** mandate start/expiry or until-revoked status, review point, revocation path and escalation conditions.
10. **NOVA recommendation:** why this offer is suitable, alternatives considered, cost comparison, dependencies, risks and confidence/unknowns.

The Council may approve, reject, return for revision or suspend a proposal according to its existing voting/governance rules. "Return for revision" is not approval and cannot authorize a payment.

## 4. One vote authorizes recurrence

A passed vote creates one versioned standing payment mandate. That mandate is reused by NOVA for the initial payment and every permitted renewal.

Examples:
- Monthly service: one Council vote authorizes the initial charge and automatic monthly renewal up to the approved per-month amount and total mandate budget.
- Annual domain/service renewal: one vote authorizes the initial purchase and annual renewal up to the limit and term.
- Metered API or MPP session: one vote authorizes a recurring/session spend ceiling and usage/frequency limits; NOVA can pay each metered charge without a new vote while inside the mandate.
- Pay-per-request x402 service: one vote may authorize a named service or category under a rolling budget and maximum per-call cost; each call consumes the same preapproved authority rather than requiring a new Council vote.
- Usage-based infrastructure: one vote authorizes usage pricing within the ceiling, defined measurement period, maximum rate and cumulative cap.

The recurrence must be explicit in the approved proposal and mandate. It cannot be inferred from a checkbox on a supplier checkout, an external router's default, a saved payment method or a prior one-time payment.

## 5. Mandatory mandate contents

Each approved mandate must be a durable, versioned, tamper-evident record with, at minimum:

### 5.1 Decision provenance
- unique \`mandate_id\` and monotonically increasing \`mandate_version\`;
- proposal identifier and Council decision/vote identifier;
- approved outcome, decision timestamp and applicable governance-rule version;
- references to the vote result and the immutable proposal snapshot shown to voters;
- mandate issuer and NOVA executor identity;
- cryptographic integrity/authenticity proof or equivalent trusted internal signature.

### 5.2 Service and supplier scope
- specific provider/service/plan, or an explicitly permitted provider-discovery category;
- permitted regions, resource types, service purposes and data classes;
- excluded providers, regions, service classes, merchant categories or processing purposes where applicable;
- permitted substitution rules: whether NOVA may replace an unavailable provider with another one in the same approved category and under the same limits.

### 5.3 Payment authority
- permitted payment route/protocol classes (crypto direct, supported x402/MPP crypto rail, provider-native crypto API/invoice, or a separately approved crypto-funded intermediary route);
- explicit prohibition on payer-side KYC/KYB, government identity, bank-account binding, conventional card details, debt, overdraft, credit and fiat fallback;
- eligible treasury source assets: any asset that passes the active AstroCrown asset-eligibility policy, not a mandatory USDT requirement;
- permission to convert an eligible source asset into the exact asset/network required by the provider;
- maximum source spend, maximum per-payment/per-call amount and maximum all-in cost including conversion, gas and provider fees;
- destination asset/network restrictions, where fixed by the voted proposal, or a delegated destination-asset policy where provider requirements may be discovered dynamically;
- payment destination/merchant authentication requirements and permitted route/provider identity proof;
- no unrestricted signing authority to any provider, marketplace, payment router, MCP server or LLM.

### 5.4 Recurrence and budget
- \`authorization_type\`: \`ONE_TIME\`, \`RECURRING_FIXED\`, \`RECURRING_METERED\`, \`SESSION\` or \`SUBSCRIPTION\`;
- recurrence interval/frequency and next eligible execution time;
- \`auto_renew\` boolean;
- maximum amount per cycle/payment/session and maximum usage rate;
- total approved budget and, where relevant, monthly/weekly/daily sublimits;
- maximum number of occurrences or cycles, if the Council chooses one;
- start time and expiry/maximum term; alternatively a valid until-revoked mandate with mandatory review date if the Council's policy permits it;
- allowed price-change tolerance, currency/asset conversion tolerance and fee ceilings;
- handling of taxes, deposits, setup/activation and variable consumption;
- any grace period, retry limit and duplicate-charge/idempotency behaviour.

### 5.5 Lifecycle and audit
- status: \`DRAFT\`, \`SUBMITTED_FOR_VOTE\`, \`APPROVED\`, \`ACTIVE\`, \`SUSPENDED\`, \`REVOKED\`, \`EXPIRED\`, \`REJECTED\` or \`COMPLETED\`;
- revocation/suspension actor, reason, timestamp and decision reference;
- next renewal date, remaining cycle count and reserved/settled budget;
- provider subscription/plan identifiers and cancellation endpoint/reference;
- all payment, conversion, receipt, fulfilment and cancellation events linked to the mandate.

## 6. Automatic renewal conditions

NOVA may execute a renewal without another Council vote only when all of these remain true:

1. The mandate is \`ACTIVE\`, has not expired or been revoked, and its Council decision remains valid.
2. The service is still required by an active AstroCrown objective and has not been superseded, abandoned or marked for shutdown.
3. The provider/merchant and service/plan remain within the approved scope; a provider substitution is permitted only if the mandate allows category-level substitution.
4. The renewal date, frequency, usage rate and number of occurrences are within the voted recurrence conditions.
5. The full renewal amount, taxes, conversion cost, gas and all other fees fit within both the per-cycle and remaining cumulative budget.
6. Price increases, currency changes, billing model changes and plan changes remain inside the explicit tolerance and hard ceilings.
7. The payment method remains crypto-only and does not introduce KYC/KYB, bank/card binding, credit/debt, human per-payment action or prohibited financial rails.
8. Any changed token/network/recipient is validated against the live provider identity and allowed destination-asset/conversion policy. A live per-request address can change only when the provider challenge and authenticated merchant origin prove it belongs to the same approved service/payee; an unexplained recipient change is rejected.
9. Required balances and gas reserves are available without borrowing, hidden overage, automatic top-up or spending outside the mandate.
10. No unresolved payment, duplicate, chargeback/reversal, provider compromise, security alert, fulfilment failure or reconciliation exception requires suspension.

A renewal inside these conditions is **pre-approved**. NOVA executes and records it; it does not submit another Council vote.

## 7. When NOVA must stop and return to the Council

NOVA must not auto-renew or make the next payment if any of the following occurs:

- mandate is expired, suspended, revoked, exhausted or outside its approved occurrence count;
- the next payment exceeds the per-cycle, period, aggregate, gas or conversion ceiling;
- provider changes the service, plan, billing frequency, contract duration, data processing, region, renewal conditions or payment terms materially;
- price/fee/tax/FX changes exceed the voted tolerance or make the all-in amount exceed the cap;
- provider or payee identity changes outside the mandate's substitution rules;
- new KYC/KYB, government ID, bank account, conventional card, human approval, debt/credit or other prohibited requirement appears;
- route safety, payment recipient, token identity, conversion output or settlement cannot be verified;
- provider service is no longer needed, repeatedly fails, is compromised, or cannot be cancelled/fulfilled as approved;
- policy, legal eligibility or relevant Council governance rule changes.

The state becomes \`NEEDS_COUNCIL_DECISION\` (or \`SUSPENDED\` where urgent), and NOVA must not spend while waiting. A new or amended mandate requires a new valid Council decision under the current governance rules.

Routine variation that remains within the voted caps and conditions does not require a vote. Do not escalate harmless technical changes or every individual amount merely because the exact challenge is generated at runtime.

## 8. Execution, scheduling and reconciliation

1. NOVA prepares the proposal and submits it to the Council interface.
2. The Council voting system records a valid passing vote.
3. A trusted internal mandate issuer converts that approved vote and proposal snapshot into an active mandate.
4. The mandate is stored durably in AstroCrown's governance/operations state and its identifier/version is exposed to the payment signer.
5. NOVA schedules the initial and recurring actions. The scheduler is not itself authorization; every payment execution rechecks the mandate against current state.
6. Before each renewal, NOVA checks the ten conditions in Section 6 and reserves the full maximum charge plus allowed fees against the remaining budget.
7. NOVA obtains the current live payment challenge/offer, selects the allowed payment protocol, optionally performs bounded crypto conversion, and signs through the isolated signer.
8. NOVA verifies provider acceptance and actual service fulfilment, then reconciles the transaction to the mandate and updates cumulative spend/occurrence counters exactly once.
9. The Council dashboard displays the mandate, vote provenance, initial purchase, renewal schedule, individual payments, cumulative spend, remaining budget, service health and exceptions. Routine renewals are visible/audited but are not individual ballots.
10. NOVA sends the configured event summaries/exception alerts. The notification itself does not request a vote unless an exception requires one.

Budget reservation and settlement accounting must be atomic/idempotent. A timeout cannot cause the same renewal to be charged twice. If payment has been submitted but receipt is delayed, query chain/provider state before retrying.

## 9. Revocation, suspension and cancellation

A valid Council revocation/suspension must:
- immediately mark the mandate version inactive in the authoritative AstroCrown state;
- cause the signer to reject all new signatures referencing it;
- stop scheduled renewal and metered/session spending;
- revoke or shrink any external Router/delegation/agent permissions where supported;
- call the provider cancellation/auto-renew-disable API where supported and retain its response/reference;
- stop new service tasks or procurement that depend on the mandate, subject to safe shutdown/data-export policy;
- reconcile any in-flight transaction, already-paid period, refundable balance and provider-side cancellation state.

Revocation cannot reverse a blockchain transaction already irreversibly settled or erase a supplier's already-received payment. Such events remain visible and linked to the original mandate. NOVA must not silently continue an already-scheduled renewal merely because an external provider's cancellation endpoint is delayed; the local signing boundary must still reject it.

Emergency suspension may be applied by an already authorized governance/security role according to existing AstroCrown rules. It is not a new vote to spend; it is a protective stop.

## 10. Minimum Council interface requirements

The AstroCrown website must provide an internal Council view for:
- proposals awaiting a vote, with the full initial/recurring payment summary;
- vote outcome/provenance and the exact approved mandate version;
- active recurring commitments and next renewal dates;
- amount per cycle, cumulative spend, reserved amount and remaining authorized budget;
- provider, service, purpose, payment route and asset/network history;
- automatic renewal on/off state and mandate expiry/review date;
- suspension, revocation and amendment actions under the existing Council role/decision rules;
- alerts for rejected renewals, price changes, provider changes, failed cancellation and reconciliation exceptions.

The payment provider must never receive the authority to appoint Council members, change Council decisions, alter mandate limits or approve its own expansion.

The Council interface and vote record remain AstroCrown-owned. Do not outsource governance to Nevermined, x402/MPP facilitators, payment processors, external marketplaces or a provider dashboard.

## 11. External protocol/implementation references

Use existing protocols to reduce duplicate implementation, but keep AstroCrown's own Council decision authoritative:

- **Google AP2 Payment Mandate:** its current Payment Mandate constraints include agent recurrence frequency, maximum occurrences, allowed payees, amount range and a total budget. This is a useful model for machine-readable, reusable authorization; its payment-method-neutral design does not override AstroCrown's crypto-only policy. https://ap2-protocol.org/ap2/payment_mandate/
- **AP2 Agent Authorization:** separates mandate delegation from later action authorization. AstroCrown can adapt the pattern so the Council approves a standing mandate once and NOVA presents the relevant authority at each execution. https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/agent_authorization.md
- **Nevermined Delegations:** its documented model uses a total spending cap, expiry, optional transaction count and revocation. That provides a useful external-router sub-cap, but does not replace the Council mandate or solve recurring provider billing by itself. https://nevermined.ai/blog/three-ways-to-give-an-ai-agent-a-spending-limit

The external tool's delegation must always be narrower than or equal to the Council mandate. If the external stack cannot support the approved recurring model, NOVA may use another compatible payment adapter; it must not silently reduce governance to a one-time external credit balance.

## 12. Implementation status and boundary

This file is a specification, not proof that the Council vote UI, mandate issuer, recurring scheduler or payment signer integration has been implemented.

The related infrastructure architecture and governance acceptance contract must link to this specification. Future implementation should proceed in this order:
1. Council proposal snapshot and vote-result reference integration;
2. canonical mandate schema, signing/integrity, versioning and durable state;
3. signer-side mandate verification, cap reservation and idempotency;
4. one-time and recurring schedule/session simulators;
5. auto-renew/cancellation/revocation lifecycle and exception path;
6. Council dashboard view of active mandates and payment audit;
7. integration to selected existing x402/MPP routers/payment adapters, initially simulation/read-only and without mainnet funds.

No provider account, external credential, wallet key, payment instrument or live recurring payment is authorized by this specification.

**Governing rule:** one approved Council vote creates the standing authority for the approved purchase and its explicitly permitted recurring payments. NOVA performs each compliant payment and renewal autonomously. A new vote is required only for a new commitment or a material change/out-of-scope exception—not for every recurrence.
