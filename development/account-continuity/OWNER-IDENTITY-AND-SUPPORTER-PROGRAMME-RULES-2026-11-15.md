# Owner Policy Clarification — Account Identity and Supporter Programme

**Initial decision date:** 2026-11-15  
**Owner clarification update:** 2026-11-16  
**Status:** OWNER-DIRECTED PRODUCT RULES / REQUIREMENTS UPDATE / IMPLEMENTATION NOT COMPLETE  
**Applies to:** AstroCrown account identity and the Supporter Programme  
**Precedence:** This record supersedes earlier project requirements wherever they describe all signed-in accounts as having equal write/transaction rights, wallets only as optional backup authenticators, or different Supporter Programme economics/registration rules.

## 1. Two account identification methods

AstroCrown supports two distinct ways to identify and authenticate an account. They are not interchangeable assurance levels.

### 1.1 Key-based account identification

- The first method is the existing WebAuthn/passkey public-key method. The authenticator keeps its private key; AstroCrown stores the credential ID, public key and minimum verification/lifecycle metadata.
- Registration and sign-in using this method create a **key-only / provisional / non-permanent** account state.
- A key-only authenticated session receives **read-only access** to features and data that are otherwise available to that account. It must not create, edit, publish, vote, initiate financial actions, purchase, contribute, modify entitlement state or perform privileged administration.
- If a wallet is also associated with the same account, a key-only session does not inherit wallet-level rights. A higher-rights action requires a wallet-authenticated session or a separately authorized fresh wallet-verification step-up.
- The word "key" in this rule means the WebAuthn/passkey account-authentication method. The offline one-time recovery key remains a separate recovery mechanism and is not an ordinary login method.

### 1.2 Wallet-based account identification

- The second method is account registration and sign-in by proving control of a cryptocurrency wallet through a fresh, domain-bound, purpose-bound, expiring, single-use off-chain signature challenge.
- Wallet-authenticated accounts may receive a larger set of rights than key-only accounts, but those rights must be granted by explicit feature policy and enforced server-side. Wallet control alone does not grant an administrator role or unrestricted authority.
- A wallet-based registration may be treated as permanent for a named feature, programme or membership only where that feature's published rules expressly say so. The Supporter Programme is one such intended use.
- "Permanent" describes the applicable membership/eligibility record, not a perpetual login session, a guarantee of token delivery, an irrevocable privilege, or immunity from suspension under published rules. Sessions remain expiring and revocable.
- Wallet ownership proves control of the address at the time of the challenge. It does not prove legal identity, unique personhood, beneficial ownership or eligibility for unrelated features.
- If key and wallet methods are both attached to one account, they may be linked only after the system proves control of the existing account and the wallet. Never merge accounts solely because a user types the same name or presents an address.

### 1.3 Authorization and security boundaries

- Identity method, account identity, role, feature eligibility, wallet ownership, recovery, session and authorization remain separate records and decisions.
- The server must bind each session to the authentication method and resulting assurance tier. UI state, a connected-wallet event, a wallet-provider name or a client-supplied role is never authority.
- Re-authenticating with a passkey/key must not silently upgrade a wallet-qualified account to wallet rights.
- A wallet signature for one purpose cannot be replayed for another purpose. Authentication signatures must not request a blockchain transaction, token approval, transfer, seed phrase or private key.
- No email, SMS, bank details, government ID, KYC provider, minimum wallet balance, deposit, stake or transaction fee is required merely to identify an account or prove wallet control.
- Administrative appointment and permissions remain separate server-governed decisions. A wallet identity is not self-appointment.

## 2. Supporter Programme target and purchase allowance

The owner-directed programme-wide contribution target/ceiling is **USDT 1,000,000** across the three approved mainnet networks.

The multiplier is **25 ACROWN of purchase allowance per 1 USDT of verified contribution** (25:1). It defines the maximum quantity the supporter may later buy; it is not a token grant, a 25-ACROWN purchase price, or credit toward the separate floor-price consideration. Therefore:

- USDT 1 of verified contribution creates a personal right to purchase up to 25 ACROWN at the applicable approved ACS floor price.
- USDT 1,000,000 of aggregate verified contributions can create no more than 25,000,000 ACROWN of aggregate purchase allowance.
- The programme-wide maximum purchase allowance is **25,000,000 whole ACROWN**. Personal allowance is calculated from each member's verified contributions; the shared programme remainder is an independent limit.
- A purchase may use no more than the lesser of the member's unused personal allowance and the remaining programme-wide purchase capacity. Purchases consume both balances atomically. When the shared 25,000,000-ACROWN purchase capacity has been fully consumed, the programme cannot accept further purchases under this programme, even if an individual account retains unused personal allowance.
- Aggregate verified contributions must never exceed the USDT 1,000,000 ceiling. A partial final contribution must be capped to the exact remaining contribution capacity; overpayment or excess transfer must not create extra allowance.
- Each additional verified contribution from a wallet already in the frozen eligible set adds a further 25:1 purchase allowance to that wallet's cumulative earned allowance, including after its earlier allowance has been partly or fully used. A completed purchase remains consumed; resale does not restore it. New contributions can create additional allowance only while the programme is OPEN, contribution capacity remains, and global ACROWN sale capacity remains available.
- Stop accepting new contributions when the programme closes or the 25,000,000-ACROWN sale capacity is exhausted; accepting funds after no purchase capacity remains would create an allowance the programme cannot honour.
- Amounts and calculations must use integer base units and explicit decimal/rational arithmetic, never floating point. Convert the whole-ACROWN ceiling to base units only after the ACROWN decimal precision is finalized and verified.

**Arithmetic wording clarification — owner-confirmed 2026-11-16:** the controlling multiplier is 25:1. USDT 1 of verified contribution creates the right to buy up to 25 ACROWN, not 1 ACROWN. The multiplier grants purchase quantity only; the supporter must separately pay the full ACS floor-price consideration for any ACROWN purchased, plus the applicable network gas and/or Paymaster fees.

The contribution and later token purchase remain separate events. A contribution does not itself purchase, issue, transfer or deliver ACROWN, and does not automatically enter the ACS reserve. The Supporter Programme contribution treasury remains separately accounted for; no automatic transfer of contributions into the ACS reserve is implied. The later ACROWN purchase is a separate transaction. No purchase allowance is a token already owned or a promise of a guaranteed external market value.

### 2.1 ACS floor-price and purchase-fee protection

The owner has specified the ACS floor relationship as:

`F = V / C`

where `V` is the reserve vault containing the reserve funds used to rebuy ACROWN at the floor price, `C` is circulating ACROWN, and `F` is the ACS floor price. This formula is the governing rule; operational definitions, valuation sources, decimal precision and rounding still require technical qualification.

For a purchase of `q` ACROWN at floor price `F`:

- The floor-price consideration is `q × F`.
- The amount credited to the ACS reserve `V` must be the full `q × F`, not a net amount after fees.
- When the Paymaster is active, the user is shown and charged **one all-inclusive Paymaster fee denominated in ACROWN**. That fee includes the underlying network execution/gas cost; the network fee must not also be displayed or charged as a second separate line item.
- When the Paymaster is not active, the wallet pays the applicable network gas through the direct wallet route. The direct-gas route and Paymaster route are alternatives; never add a separate network fee on top of an all-inclusive Paymaster fee.
- The floor-price consideration and the Paymaster fee remain distinct accounting components. The full floor-price consideration must reach ACS reserve `V`; the Paymaster fee must not be withheld from, or netted against, that reserve credit. The exact fee collection and accounting destination must be disclosed before wallet approval.
- Where the purchase increases circulating supply by `q` and the reserve receives the full `F × q`, the invariant is preserved, all else equal: `(V + Fq) / (C + q) = F`.
- Deducting any part of the floor-price consideration to pay network or Paymaster costs would make the reserve increment insufficient and dilute `V/C`; this is prohibited by the ACS floor rule.
- The ACS floor is monotonic: after every operation that changes reserve `V` or circulating supply `C`, the authoritative post-operation value must satisfy `F_after >= F_before`. An operation that would make `F` lower must be rejected or the affected financial route paused until the discrepancy is resolved. A floor-price sale that adds exactly `F × q` to `V` while adding `q` to `C` preserves the existing floor; it does not, by itself, raise it. The floor rises only when the resulting reserve-to-circulation ratio rises.
- The monotonicity check must use the same approved valuation denomination, measurement source and atomic settlement snapshot for both sides of the comparison. These inputs must be versioned and auditable; changing a valuation convention cannot be used to disguise an economic fall in `F`.
- On a Paymaster-enabled purchase, display the single ACROWN-denominated all-inclusive Paymaster fee, including network execution cost, and any maximum/quote validity before approval. Do not show the included network charge as an additional fee. If the Paymaster route cannot collect its fee without reducing the full reserve credit, that route must remain unavailable. On a direct-wallet route, disclose the native network gas requirement instead.
- The contribution itself remains separate from the ACROWN purchase and must not be presumed to enter `V`. Any later transfer between the supporter treasury and ACS reserve requires a separately approved, traceable accounting event.


## 3. Wallet-registration cutoff and public-deployment event

- The programme's wallet-registration period must close **exactly 24 hours before** the official public-deployment event.
- Let `T_public` be `00:00:00 UTC` (`00:00:00Z`) at the beginning of the officially selected public-deployment event date. The immutable registration cutoff is `T_cutoff = T_public - 86,400 seconds`, which is exactly `00:00:00Z` on the preceding UTC calendar date.
- The event date is not yet selected. Once approved, publish its exact timestamp in ISO 8601 UTC, ending in `T00:00:00Z`. Until the date is approved, the system must not invent or display an active cutoff.
- The event's public-facing name is also undecided. The name is to be selected nearer to readiness by reviewing the related project conversations and contemporaneous adoption/branding trends, prioritizing familiarity, adoption potential and cost efficiency. "Genesis Day", "Launch Day", "Deployment Day" and "New Big-Bang Event" remain unapproved candidates, not hard-coded decisions.
- At the cutoff, the programme freezes the set of wallets successfully registered and ownership-verified before the deadline. A connected-but-unverified wallet is not registered.
- After cutoff, no previously unregistered wallet may register, link itself into the eligible set, contribute, purchase or invoke member-level Supporter Programme actions. Public read-only programme information may remain viewable. There is no wallet replacement or recovery exception under the current programme.
- After the public-deployment event, only wallets in the frozen set may use their own wallet-specific purchase allowances to buy ACROWN at the published ACS floor price.
- Wallet loss is treated as loss of access to that wallet registration and its wallet-specific programme record. AstroCrown does not recover the wallet, keys, assets or access; does not transfer its eligibility, contribution history or purchase allowance to another wallet; and does not refund or compensate for the wallet or assets lost because of that loss, subject to any mandatory legal rights.
- Intended user experience: when a wallet is connected, the service automatically matches its verified address against the supporter registry and opens the dashboard for that exact wallet. If it is a recognized eligible wallet, the dashboard shows only that wallet's own supporter record. A different wallet linked to the same member never inherits or pools the lost wallet's allowance. No wallet-loss support, recovery assistance or replacement is provided by this programme. A future, separately created wallet-recovery feature would require its own owner approval and published specification; it is not a current entitlement or promise.
- The cutoff applies to wallet registration, not to contributions from wallets already in the frozen set. Those wallets may continue qualifying contributions while the programme is OPEN, within the USDT 1,000,000 aggregate ceiling and while the shared 25,000,000-ACROWN sale capacity remains. Each wallet's verified contributions accrue only to that same wallet's cumulative allowance at 25:1, including after earlier allowance has been used; completed purchases remain consumed and are not restored by resale. A member may link multiple verified wallets before cutoff, but each wallet keeps a strictly separate allowance, purchase history and remaining balance. No pooling, transferring or sharing of allowances between wallets is permitted. No fresh, unregistered wallet may interact with member-level programme functions after cutoff.
- In ordinary language, "buy the remaining multipliers" means **use/redeem the unused personal ACROWN purchase allowance**. Users do not buy a multiplier as a separate product.

### 3.1 Two-stage public-event countdown

Once the public-deployment event is officially announced with its exact UTC-midnight timestamp, the Supporter Programme page presents two sequential countdown phases:

1. **Registration countdown:** from the official schedule announcement until `T_cutoff`, showing the time remaining before new wallet registration closes. Wallet registration stays open only while the server confirms the cutoff has not passed.
2. **Final 24-hour launch countdown:** at `T_cutoff`, freeze the verified-wallet eligibility set and automatically replace the first countdown with the countdown from the cutoff to `T_public`. This second phase is exactly 24 hours. No new wallet-registration or member-level onboarding action is available during this phase.

Both phases show days, hours, minutes and seconds, identify UTC explicitly, and use the same owner-published `T_public`. The countdown is informational; the server timestamp and frozen eligibility record are authoritative. A missing or unapproved event timestamp must show "Not announced" and no active timer. A schedule change requires a new explicit owner announcement and auditable schedule version; the client must never silently recalculate or reopen registration.

### 3.2 Supporter dashboard and wallet-specific progress

The supporter dashboard must distinguish programme-wide capacity from the connected wallet's personal entitlement. It must use separate, clearly labeled visual tracks (with text/numeric values as well as color so the meaning is not color-dependent):

- **Programme-wide:** purchase allowance earned/granted from verified contributions; ACROWN actually purchased/settled; and the remaining sale capacity from the 25,000,000-ACROWN ceiling.
- **Connected wallet:** total ACROWN purchase allowance earned only from that wallet's verified contributions; ACROWN actually purchased against that wallet's allowance at the floor price; and that wallet's unused purchase allowance. A delivery wallet is only a destination; it does not own, receive or pool the purchase allowance.
- The dashboard must show the connected wallet identity and clearly separate an earned right to buy from ACROWN already bought. A contribution never makes the allowance appear as tokens owned.
- The OFF/ON control is a server-derived purchase-readiness indicator, not a client-side permission switch. OFF uses a matte treatment when the wallet is not eligible, the programme is closed/not activated, the wallet has no unused allowance, the global capacity is exhausted, or the purchase route/fee handling is not ready. ON uses the specified sparkly treatment only when all server-side eligibility, allowance, programme-open, remaining-capacity and purchase-route checks pass. The user interface cannot force OFF to ON.

## 4. Programme duration, contribution close and sell-out

The former 180-day maximum has been withdrawn. **There is no fixed 180-day or other time-based expiry** for the Supporter Programme or its wallet-specific purchase allowances. Activation begins only when the owner-approved service is deliberately opened and ready; a code merge, preview deployment, Worker deployment or database creation does not open it.

- Contributions may be accepted from frozen eligible wallets while the programme is OPEN, until the USDT 1,000,000 aggregate contribution ceiling is reached or the shared 25,000,000-ACROWN sale capacity is exhausted, whichever occurs first.
- Once the USDT contribution ceiling is reached, stop accepting contributions; existing wallet-specific purchase allowances remain usable while the programme stays open and shared sale capacity remains.
- Once the shared 25,000,000-ACROWN sale capacity is exhausted, close both new contributions and further programme purchases. Do not accept contributions that would create an allowance that cannot be purchased.
- There is no automatic expiry of an earned wallet allowance based on elapsed days. A programme pause or owner-declared closure must be an explicit, separately published lifecycle decision; do not invent a replacement time limit.
- The programme must expose and reconcile the authoritative global remaining capacity and each wallet's own allowance. The global cap is shared; personal allowances are never pooled.


## 4.1 Secondary-market resale and protocol economics

A supporter may resell ACROWN that the wallet has actually purchased through available exchanges or swaps. A completed resale does not restore or replenish the wallet-specific purchase allowance already consumed. A further verified contribution from that same eligible wallet may create more allowance only while contributions remain open, the aggregate USDT ceiling has not been reached and shared sale capacity remains.

The intended AstroCrown approach is **protocol economics rather than discretionary policing of token use**. The native ACS floor/roof boundaries and Paymaster rules are intended to make circular or self-directed trading economically unattractive to the trader and, where the published fee design directs the resulting value to community benefit, potentially value-accretive to the community. The same deterministic, transparent rules apply to all transactions; AstroCrown does not create a special user blacklist, punitive restriction or discretionary investigation solely to police a holder's trading intent.

That is a design objective to be demonstrated mathematically before activation, not an unproven guarantee. The final ACS/roof/Paymaster mechanics must establish the execution price bounds, all-in cost of a round trip, ACROWN fee handling and destination of collected value. Do not assume that every self-trade must be profitable for the community until the fee and settlement paths have been modeled and tested. No incentive should pay a trader merely for gross transaction count or apparent volume without a separately justified mechanism.

The native ACS rules cannot control the independent policies, liquidity, prices or trading behaviour of third-party exchanges. They do not promise that an external market price will remain above the ACS floor, nor that external trading volume represents genuine demand. Users may trade their own assets; the protocol's published economics, not discretionary policing, determine the consequences of those actions.

## 5. Implementation and release boundaries

These are owner-approved product rules, not evidence that the current code or staging Worker implements them.

Before release, engineering must:
- introduce explicit key-only read-only and wallet-authenticated authorization tiers;
- ensure key-based login cannot inherit wallet rights;
- provide wallet-based registration and login for the account system, with proof-of-control and purpose-specific challenges;
- implement durable, feature-scoped wallet membership for the Supporter Programme;
- store the approved public-deployment date at `00:00:00Z` and derive the preceding-day `00:00:00Z` registration cutoff server-side;
- freeze the eligible wallet set at cutoff, reject new member-level wallet interactions after cutoff, and implement verified replacement as a migration that preserves the existing entitlement lineage without adding eligibility;
- build the supporter dashboard's global and wallet-specific entitlement/purchase progress and server-derived matte OFF / sparkly ON readiness state;
- enforce `F = V/C` and ensure every ACROWN purchase credits the full floor-price consideration to `V`, with network/Paymaster fees charged on top and never deducted from reserve proceeds;
- enforce the USDT 1,000,000 aggregate ceiling, 25:1 allowance calculation, 25,000,000-ACROWN shared purchase capacity, personal balances and atomic consumption;
- preserve the existing three-network allowlist, canonical token identities, independent transaction verification, finality checks, append-only accounting and fail-closed controls;
- publish the event name, exact UTC timestamp, cutoff, floor-price version, final terms and remaining programme capacity before relevant users rely on them.

No payment acceptance, contribution, purchase, entitlement credit or production deployment is enabled by this requirements update. The existing staging Worker remains subject to its deployed revision and its currently disabled payment boundary until a separately qualified and explicitly authorized deployment changes it.

## 6. Inputs that remain unapproved or unimplemented

- Official public-deployment event name and event date (not yet selected); once selected, the event is at `00:00:00Z` and the cutoff is the preceding day's `00:00:00Z`.
- Final ACS floor implementation/version details: authoritative `V` and `C` measurement, reserve valuation denomination/source, settlement snapshot, ACROWN precision and rounding/atomicity rules. The owner-specified formula is `F = V/C`.
- Paymaster fee quotation and collection rules: when active, one all-inclusive Paymaster fee in ACROWN must include underlying network execution/gas cost, with no separate duplicate network-gas charge; direct-wallet gas applies only when Paymaster is not active.
- Minimum first contribution/qualification threshold.
- Treasury receiving addresses and independent custody/security approval for Ethereum, Tron and Solana.
- RPC providers, independent evidence and finality qualification.
- Wallet-loss terms: no recovery, re-registration transfer, replacement wallet, refund or asset compensation under this programme; a future wallet-recovery feature would require a separate owner-approved specification.
- Minimum first contribution/qualification threshold and evidence-based rationale.
- Wallet-specific entitlement schema and enforcement across multiple linked wallets.
- Two-stage event/cutoff countdown implementation and server-authoritative eligibility freeze.
- Applicable legal, terms, privacy, security, backup and operational approvals.

