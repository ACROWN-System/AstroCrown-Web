# Block 8 — Imperial Council Vote and Preauthorized Recurring Payment Mandates 08

**Date:** 2026-11-14  
**Repository:** ACROWN-System/AstroCrown-Web  
**PR:** #177, draft and unmerged  
**Scope:** ensure Council governance authorizes both initial and recurring payments once, while NOVA autonomously executes later renewals inside the approved mandate.

## 1. Decision

The Imperial Council must authorize payment commitments through AstroCrown's own voting/governance surface. For a recurring service, the initial payment and the recurring renewal authority are presented in the same proposal and approved by one valid Council vote.

**A passing vote creates a reusable, versioned standing payment mandate. NOVA uses that same mandate for all compliant subsequent payments and renewals. It does not ask the Council to vote again for every invoice, API call, session charge or billing period.**

The Council is the authority. NOVA is the autonomous executor. External payment routers, wallets, service catalogues, marketplaces and providers do not create or expand the mandate.

The distinction is:
- one-time approval authorizes one payment only;
- one-time approval of an initial charge plus recurrence authorizes the initial payment and subsequent renewals under the stated conditions;
- a category-level standing budget can authorize NOVA to discover providers and purchase within that category without a new vote for every routine supplier, provided provider substitution and recurring commitments are explicitly within the voted scope.

## 2. Existing standards demonstrate reusable recurrence authorization

### AP2 Payment Mandate

Google's Agent Payments Protocol defines a Payment Mandate and constraints for reusing authorization, including agent recurrence frequency, maximum occurrences, allowed payees, amount range and a total budget. Its design confirms that a recurring agent authorization need not be a separate user confirmation for every transaction.

Sources:
- https://ap2-protocol.org/ap2/payment_mandate/
- https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/payment_mandate.md
- https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/agent_authorization.md

### Nevermined Delegations

Nevermined describes a scoped delegation with a lifetime spend cap, expiry, optional transaction count, optional API-key scope and revocation. The Router checks each charge against the delegation before payment.

Source:
- https://nevermined.ai/blog/three-ways-to-give-an-ai-agent-a-spending-limit

These are external implementation patterns, not AstroCrown's governing authority. AstroCrown's own Council vote and mandate remain authoritative. An external Router's delegation is an additional lower ceiling and cannot replace the Council approval.

## 3. Required Council vote

NOVA prepares the proposal from its actual service discovery and live offer. The Council sees:
- purpose and operational need;
- provider/service/plan and permitted category or provider-substitution scope;
- initial charge and setup/deposit fees;
- one-time versus recurring/session/subscription authorization;
- recurrence frequency and next eligible renewal;
- maximum amount per cycle/call/session;
- cumulative/monthly/period budget and maximum occurrences or term;
- price/fee tolerance and maximum all-in cost;
- payment method policy (crypto only), asset conversion/gas ceiling and no-KYC/no-bank/no-card requirements;
- service/data/region boundaries and provider cancellation/refund conditions;
- NOVA's alternatives, cost comparison and risk assessment;
- effective period, review date and revocation path.

If the Council wants automatic renewal, the proposal must explicitly say that the initial payment **and** the recurring payments are both authorized. A one-time invoice approval cannot be interpreted as recurring permission.

The Council's existing voting rules determine voter eligibility, quorum, voting weight, passage threshold and tie-breaking. This specification does not invent new Council voting rules.

## 4. One vote authorizes the recurring stream

The mandate can cover:
- monthly/annual subscriptions;
- recurring hosting/domain/database/service invoices;
- MPP sessions or metered resource usage within a capped balance and duration;
- repeated x402 pay-per-request calls under a per-call cap and rolling spend budget;
- repeated provider-native crypto payments for the same approved service or category.

NOVA records every transaction and exposes it to the Council. Visibility, reporting and audit are not a new voting event.

For each renewal NOVA:
1. confirms the mandate remains active and unrevoked;
2. checks that the service remains required;
3. retrieves the current offer/402 challenge/invoice;
4. confirms provider/service and renewal cadence remain in scope;
5. checks per-cycle, cumulative, session and remaining-budget limits;
6. validates any new asset/network/recipient against the approved crypto route policy;
7. calculates all-in payment and conversion costs;
8. signs and pays only if every condition passes;
9. verifies the payment receipt and service availability/credit;
10. updates the durable mandate ledger exactly once.

## 5. Stop and return to Council only for exceptions

A new Council vote or amendment is required if:
- the purchase exceeds a per-cycle or cumulative budget;
- renewal frequency or term changes beyond the mandate;
- service, provider, data processing or region changes materially outside the permitted substitution policy;
- price/fees exceed approved tolerance or max all-in amount;
- payment requires KYC/KYB, government identity, bank/card, debt, credit or recurring human action;
- the recipient or crypto route cannot be authenticated;
- service purpose/need ends or provider security/reliability becomes unacceptable;
- the mandate expires, reaches its occurrence limit, or is revoked.

Routine price variation, gas, or exact payment address changes that remain within the approved policy do not trigger a Council vote; they are checked dynamically before payment. An unexplained recipient change or terms shift blocks the payment.

## 6. Revocation and safety

The Council can suspend or revoke a mandate through the AstroCrown governance interface. Revocation invalidates the mandate version at the signing boundary, stops scheduled payments/sessions, disables or reduces external Router delegations where possible, and triggers cancellation of provider auto-renew where supported.

Already-settled transfers cannot be reversed by revocation. In-flight transactions and refunds are reconciled to the original mandate; no silent renewal may proceed merely because a supplier cancellation call is delayed.

## 7. Repository changes

Added:
- \`development/operations/COUNCIL-VOTED-STANDING-PAYMENT-MANDATE-SPECIFICATION.md\`

Updated:
- \`development/operations/INFRASTRUCTURE-PROVIDER-NEUTRAL-ADAPTER-AND-CRYPTO-SETTLEMENT-CONTRACT.md\` — one Council vote for initial payment plus recurrence, mandate lifecycle and signer enforcement.
- \`development/audit/Active/2026-11-14-Block-8-Infrastructure-Acceptance-Contract-and-Candidate-Reclassification.md\` — Gate 5C makes Council-voted recurring authorization a hard governance condition.

The canonical mandate specification defines:
- specific-provider and category-level standing mandates;
- one-time versus recurring authorization;
- mandatory proposal and vote details;
- recurrence/budget/price/term constraints;
- autonomous renewal conditions;
- exception and re-vote triggers;
- mandate lifecycle, revocation and cancellation;
- Council dashboard requirements.

## 8. Implementation status — important limitation

A search of the current AstroCrown-Web branch tree found the existing account/admin-role governance files but did **not** find an implemented Imperial Council voting UI, Council proposal store or standing-payment-mandate execution service.

Therefore this work establishes the required architecture and specification; it does not claim that Council voting or automatic recurring payment execution is already implemented. The next development task must connect the future Council voting interface to a durable mandate issuer and signer enforcement. The user-facing website should display the vote and active mandates; the control plane should execute them.

No Council vote was actually held. No provider account, payment wallet, credential, key, payment or subscription was created. No funds, swaps, bridges or gas were used; no external service was purchased or deployed; no live NOVA workflow or provider roster was changed.

**Block conclusion:** One valid Imperial Council vote can preauthorize the initial payment and the explicitly authorized recurring schedule. NOVA then renews autonomously as long as the active mandate's scope, recurrence, budget, crypto-only route and service conditions remain satisfied. Only an exception or material amendment returns to the Council—not every recurring payment.
