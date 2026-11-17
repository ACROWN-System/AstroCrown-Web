# ACROWN Genesis Programme — Opening Decision Register

**Status:** OPEN — decisions and qualification still required  
**Scope:** Public programme page, contribution opening, future ACROWN purchases and related release gates  
**Public working name:** ACROWN Genesis Programme  
**Participant designation:** Genesis Programme Participant / Genesis Programme Participants  
**Implementation branch:** `docs/account-identity-tiers-supporter-genesis-rules-2026-11-15`  
**Safety boundary:** This register and the page refresh do not authorize payment acceptance, payment intent creation, contribution crediting, ACROWN purchases, treasury transfers, production deployment or Cloudflare resource changes.

## 1. Terminology and implementation boundary

The public-facing page and homepage link use **ACROWN Genesis Programme**. The participant designation is **Genesis Programme Participant**.

The existing `/supporters/` page route, `supporter`-prefixed DOM identifiers, API routes, server variables and database compatibility names are intentionally retained for now. They are implementation identifiers, not user-visible programme names, account roles or administrative permissions. Rename them only as part of a coordinated migration if and when that work provides a concrete benefit.

Genesis-related administrative or operational expressions may be used when their context makes the function clear. A programme or employment designation must not by itself grant an AstroCrown account role, administrator status, wallet authority or server-side permission. Those remain separately appointed and enforced.

## 2. Decisions already reflected in the page

The following owner-directed rules are treated as established requirements in the current programme design:

- A verified contribution of **USDT 1** creates a personal right to purchase up to **25 ACROWN** later (25:1). It does not issue or give away ACROWN, pay for the later purchase, or automatically enter ACS reserve `V`.
- Aggregate verified contribution ceiling: **USDT 1,000,000** across Ethereum, Tron and Solana.
- Shared programme-wide ACROWN purchase capacity: **25,000,000 whole ACROWN**.
- Entitlement is wallet-specific. Wallets linked to the same participant do not pool, transfer or share their allowance or purchase history.
- A delivery wallet is a destination only; it does not own or pool the purchase allowance.
- Contribution and subsequent ACROWN purchase are separate events and transactions. A completed purchase consumes allowance; resale does not restore it.
- Planned receiving/payment networks are Ethereum USD₮ ERC-20, Tron USD₮ TRC-20 and Solana USD₮ SPL. These require separately verified network-specific token identities and receiving addresses.
- The proposed ACS floor relationship is `F = V/C`. For an ACROWN purchase of `q` at `F`, the complete `q × F` consideration must reach `V`.
- When Paymaster is active, the user-facing route is one all-inclusive ACROWN-denominated fee including network execution/gas; it must not add a second network-fee charge. When Paymaster is inactive, the direct-wallet route uses native network gas.
- Public ACROWN purchase routes remain disabled before the approved official ACROWN launch. Programme allowance is a future purchase right, not an early-purchase privilege.
- Wallet-specific purchase allowances do not expire merely through non-use under the current intended rules. The programme-wide duration and closure policy still require reconciliation and final approval.
- Wallet loss does not entitle the holder to transfer the lost wallet's allowance, contribution history or eligibility to another wallet, or to obtain wallet/asset recovery, replacement or refund, subject to mandatory legal rights.
- The page remains a no-index development preview. It accepts no USDT, publishes no receiving address and does not enable transactions or purchases.

## 3. Decisions required before accepting real contributions

These are opening blockers; do not enable payment acceptance until each has an approved answer and implementation evidence.

### 3.1 Contribution qualification and programme terms

- [ ] Decide whether there is a minimum first contribution / qualification threshold. If yes, define the amount, currency, calculation, scope and rationale. The page currently states that this is pending.
- [ ] Finalise the participant eligibility rules, permitted jurisdictions and any restrictions required by applicable law. The no-KYC/no-bank-information product objective does not remove mandatory legal obligations.
- [ ] Finalise the contribution agreement and risk disclosures, including cancellation, voluntary refunds, mandatory legal remedies and treatment of confirmed, failed, duplicated, underpaid, overpaid, wrong-network or otherwise misdirected transfers.
- [ ] Decide what happens if the programme closes or the stated contribution ceiling is not reached, including the handling of any remaining treasury balance and unused purchase allowances.
- [ ] Reconcile the programme-duration rule. A current policy file in the related work includes a 180-day programme-wide inactivity termination right, while an earlier owner direction withdrew the 180-day maximum. Do not treat the 180-day rule as settled until the conflict is resolved and the governing policy, PR description, tests and public terms agree.
- [ ] Confirm the public wording for wallet loss and no-recovery/no-transfer/no-refund terms with the final programme terms.

### 3.2 Programme treasury and permitted use of funds

- [ ] Define permitted Genesis Programme treasury uses and priorities: production/hosting, development, R&D, operations, administration, reserve/contingency or other approved categories.
- [ ] Decide whether there is a funding goal separate from the USDT 1,000,000 contribution ceiling, whether any minimum aggregate amount is required, and what happens if a target is not achieved.
- [ ] Define who may authorise outgoing transfers, spending limits, approval separation, emergency procedures and reconciliation.
- [ ] Confirm that contributions remain separately accounted for from ACS reserve `V`, personal wallets, administrator wallets and the separately designated competition-prize allocation. Any transfer to ACS or another treasury must be a separately authorised, traceable accounting event.
- [ ] Approve the public ledger fields, publication cadence, evidence requirements and privacy treatment for participant pseudonyms, addresses, transaction references, outflows and off-chain expenditure.

The former page's **USDT 150 production-transition target** has been removed. It must not be reintroduced as a Genesis Programme threshold unless it is separately re-approved and supported by an actual funding plan and provider quotes. The owner's separate personal deployment-budget envelope is not automatically a programme contribution target.

### 3.3 Receiving wallets, token identities and verification

- [x] Owner supplied one dedicated public receiving address for Ethereum ERC-20 USD₮, one for Tron TRC-20 USD₮ and one for Solana SPL USD₮ on 2026-11-17. All three passed address-format checks using the existing offline utility's network-specific rules. The addresses are not reproduced in this repository and have not been staged or configured in D1. Never provide private keys or recovery phrases.
- [x] Add an offline address-staging utility and Worker status-format checks in the current PR branch. This validates address syntax only, does not establish custody/control or live token state, and keeps every network disabled. See [Treasury Address Onboarding](TREASURY-ADDRESS-ONBOARDING.md).
- [x] Add a local-only Ethereum Mainnet `personal_sign` proof utility that checks the Genesis public address and chain ID, generates a one-use five-minute challenge and verifies the recovered signer locally. The tool is implemented but has not yet been run; no proof evidence has been created.
- [ ] Independently prove control/custody of all three supplied treasury addresses and preserve the approved evidence.
- [ ] Verify each live mainnet token contract/mint, program identity and six-decimal precision against independent sources before enabling any network.
- [ ] Verify the canonical USD₮ contract/mint identity on each network and the exact network configuration displayed to participants.
- [ ] Qualify treasury custody, key creation, offline backup/recovery, access separation, signing environment, spending limits, incident response and independent checks before addresses are published.
- [ ] Select and qualify RPC providers and independent verification sources; define confirmation/finality thresholds, reorganisation handling, duplicate detection, idempotency, reconciliation and fail-closed behaviour.
- [ ] Define the treatment of network fees, failed transactions, wrong-token deposits and transfers to incorrect addresses. Do not promise recovery where it cannot be technically assured.

## 4. Decisions and qualification required before ACROWN purchases

These are later-stage blockers. Their absence must not be hidden by a functioning contribution page.

### 4.1 ACS state and floor implementation

- [ ] Establish the initial reserve `V₀), eligible circulating quantity `C₀`, initial floor and the initial allocation of the fixed total ACROWN supply between eligible circulating supply, platform inventory, locked balances and other explicitly classified balances.
- [ ] Confirm the deployed token contract's actual total supply, decimals, base-unit representation and mint/burn controls. The intended fixed supply is 4 quadrillion ACROWN; the contract must demonstrate the intended invariant.
- [ ] Finalise the authoritative reserve valuation denomination/source, eligible stablecoin definition, reserve accessibility assumptions, measurement snapshot, precision, rounding, overflow protection and atomic settlement rules for `F = V/C`.
- [ ] Specify the complete redemption and inventory-recycling state transitions, including inventory depletion, zero-circulating-supply and zero-reserve edge cases, settlement failures and recovery/restart behaviour.
- [ ] Qualify monotonic-floor enforcement so every operation affecting `V` or `C` preserves `F_after ≥ F_before` under consistent and auditable measurement inputs.

### 4.2 Roof, corridor and market resilience

- [ ] Preserve the roof `R` and official corridor as permanent ACS structural components. Determine the corridor margin above `F` through research and optimisation; no percentage is final or optimal yet.
- [ ] Define the crash-classification research separately from the floor calculation. Magnitude, velocity, duration and liquidity conditions may inform stress testing, but must not alter the reserve-derived floor formula.
- [ ] Optimise the crash threshold and healthy speculative-trading corridor together against liquidity, execution costs, reserve coverage, buyer demand, inventory depletion, redemption pressure, external-market dislocation and sustainability.
- [ ] Complete reproducible simulations, sensitivity analysis, scenario validation and independent review before making ACS resilience or performance claims.
- [ ] Define the platform's inventory-sale price/proceeds policy above `F`. The illustrative example of `F = USDT 1.00`, sale price `USDT 1.28`, `USDT 1.15` credited to `V` and `USDT 0.13` allocated to operations/R&D/administration is not a final allocation rule. Decide the actual floor component, surplus-sharing formula and parameters before implementation.
- [ ] Preserve the Market Resilience Bonus Fund concept for future research: a possible separate pool for a compensation bonus associated with prolonged crypto-market crashes. It is not part of reserve `V`, does not change `F), and is not a current participant benefit or promise.

### 4.3 Paymaster and fee accounting

- [ ] Finalise the ACROWN-denominated Paymaster quote formula, price/conversion source, buffer, minimum/maximum, validity period, collection address and settlement/accounting route.
- [ ] Define how collected ACROWN fees cover actual native gas expenditure from gas float `G`, how fee surplus is converted/settled into the approved reserve denomination where applicable, and how reserve/operations shares are calculated.
- [ ] Keep Paymaster fee allocation separate from the sale-surplus allocation. Do not reuse a parameter such as `α` or introduce a sale parameter such as `β` without explicit definitions and equations.
- [ ] Qualify the direct native-gas route and all failure/fallback conditions. Never charge a second network-gas line on top of an all-inclusive Paymaster fee, and never reduce the full `q × F` reserve credit.

## 5. Participant experience and public presentation

- [ ] Decide whether the programme will have tiers (including any Tier 1/Tier 2/Tier 3 structure), and define their actual eligibility thresholds, benefits, naming and visual treatment before displaying tier achievements.
- [ ] Select the official public-deployment event name and UTC date before announcing a countdown. Once approved, the registration cutoff is exactly 24 hours before the event at 00:00:00 UTC on the preceding UTC calendar day.
- [ ] Implement the two-stage countdown and server-authoritative freeze of the eligible wallet set. A missing event timestamp must remain “Not announced”; the page must not invent or estimate a deadline.
- [ ] Complete the Genesis Programme activity feed's verified event source and public-data schema. The intended event classes are wallet registration, verified contribution, purchase allowance credited, ACROWN purchase completed and delivery confirmed.
- [ ] Preserve the agreed terminology: “Live Programme Activity” only for a genuinely current feed; “Replay Verified Programme Activity” for historical playback, retaining original timestamps. Implement the infinite vertical ticker, typewriter entry and slide/fade transition only over verified records, with reduced-motion support. No fabricated example entries.
- [ ] Decide the Solana delivery-wallet ownership proof method. The alternatives discussed include an off-chain signed ownership challenge and a small SOL transfer; no transfer test should be introduced until the method, cost, evidence value and edge cases are explicitly selected.
- [ ] Finalise the public privacy explanation for pseudonyms, participant wallet addresses, linked wallets, public audit records, third-party block explorers and any activity-feed disclosure.

## 6. Release and activation gates

- [ ] Finish wallet-scoped entitlement enforcement and prove that several wallets linked to one participant cannot pool or transfer allowances.
- [ ] Prove the global 25,000,000-ACROWN capacity and personal allowance are consumed atomically under concurrent purchases.
- [ ] Complete cross-network test coverage for wallet signatures, canonical token recognition, confirmations, reorgs, duplicate submissions, underpayments, overpayments and settlement.
- [ ] Complete independent security review of contracts, Worker/API, D1 schema and migrations, treasury workflow, secrets handling, monitoring and incident response.
- [ ] Complete legal, privacy, terms, accounting and operational reviews.
- [ ] Verify the actual production build and deployed code against the qualified source revision. A preview, merge, Worker deployment or database creation does not itself open the programme.
- [ ] Require a separate explicit owner authorization before enabling any real payment acceptance, contribution crediting, treasury transfer, public ACROWN purchase or production release.

## 7. Public-claim discipline

The public page may describe the purpose, owner-directed rules and current design. It must not describe an unqualified parameter as optimal, present exploratory simulations as proof, promise external market prices or liquidity, or imply that an earned purchase allowance is ACROWN already owned.

The fixed floor relationship, intended fixed supply, existence of the roof/corridor and wallet-specific programme rules must still be described with their correct scope. Dynamic inputs, provisional parameters and system performance must be clearly distinguished. No ACS parameter or performance result is final merely because it appears in a preview or a specification draft.
