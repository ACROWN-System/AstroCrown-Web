# Owner Policy Clarification — Account Identity and Supporter Programme

**Decision date:** 2026-11-15  
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

The multiplier is **25 ACROWN per 1 USDT of verified contribution** (25:1). Therefore:

- USDT 1 of verified contribution creates a personal right to purchase up to 25 ACROWN at the applicable approved ACS floor price.
- USDT 1,000,000 of aggregate verified contributions can create no more than 25,000,000 ACROWN of aggregate purchase allowance.
- The programme-wide maximum purchase allowance is **25,000,000 whole ACROWN**. Personal allowance is calculated from each member's verified contributions; the shared programme remainder is an independent limit.
- A purchase may use no more than the lesser of the member's unused personal allowance and the remaining programme-wide purchase capacity. Purchases consume both balances atomically. When the shared 25,000,000-ACROWN purchase capacity has been fully consumed, the programme cannot accept further purchases under this programme, even if an individual account retains unused personal allowance.
- Aggregate verified contributions must never exceed the USDT 1,000,000 ceiling. A partial final contribution must be capped to the exact remaining contribution capacity; overpayment or excess transfer must not create extra allowance.
- Amounts and calculations must use integer base units and explicit decimal/rational arithmetic, never floating point. Convert the whole-ACROWN ceiling to base units only after the ACROWN decimal precision is finalized and verified.

**Arithmetic wording clarification:** a separate sentence in the owner's initial clarification said USDT 1 = the right to buy ACROWN 1. That is a 1:1 rate and conflicts with the expressly retained 25× multiplier and 25,000,000-ACROWN ceiling. This record adopts the consistent 25:1 rule: USDT 1 verified contribution = right to buy 25 ACROWN. If the 1:1 sentence was intended literally, the economics must be changed explicitly before activation.

The contribution and later token purchase remain separate events. A contribution does not itself purchase, issue, transfer or deliver ACROWN, and does not automatically enter the ACS reserve. The later ACROWN purchase is a separate transaction priced at the approved floor. No purchase allowance is a token already owned or a promise of a guaranteed external market value.

## 3. Wallet-registration cutoff and public-deployment event

- The programme's wallet-registration period must close **exactly 24 hours before** the official public-deployment event.
- Let `T_public` be the official public-deployment timestamp. The immutable registration cutoff is `T_cutoff = T_public - 86,400 seconds`.
- The exact event timestamp must be published in ISO 8601 UTC, including the time and timezone. A calendar date without an exact time is insufficient to enforce a 24-hour cutoff.
- The event's public-facing name is not yet selected. "Genesis Day", "Launch Day", "Deployment Day" and "New Big-Bang Event" are naming candidates only; none is approved or to be hard-coded as the final event name.
- At the cutoff, the programme freezes the set of wallets that were successfully registered and ownership-verified before the deadline. No new wallet or new member may become eligible for this programme after the cutoff. A connected-but-unverified wallet is not registered.
- After the public-deployment event, **only wallets in the frozen, eligible registration set** may use programme purchase allowances to buy ACROWN at the programme's published ACS floor price.
- A post-cutoff wallet replacement or recovery must use a separately reviewed recovery rule. It must not become a way to add a new, previously unregistered wallet or bypass the frozen eligibility set.
- The cutoff applies to wallet registration. It does not, by itself, define a separate end time for contributions from wallets already registered. Such contributions remain subject to programme OPEN status, the USDT 1,000,000 aggregate ceiling, the 25:1 calculation and all activation/close controls. No unregistered wallet may make an eligible contribution.
- In ordinary language, "buy the remaining multipliers" means **use/redeem the unused personal ACROWN purchase allowance**. Users do not buy a multiplier as a separate product.

## 4. Programme close and sell-out

The previously adopted 180-day maximum programme window remains provisionally in force unless the owner explicitly replaces it. It begins only at deliberate, owner-approved programme activation, not at a code merge, preview deployment, Worker deployment or database creation.

Purchases close at the earlier of:
1. the approved programme window's close; or
2. exhaustion of the 25,000,000-ACROWN programme-wide purchase capacity.

A sell-out closes further programme purchases even if the 180-day window has time remaining. A remaining time window does not create additional ACROWN capacity. The programme must expose the authoritative remaining aggregate capacity and reconcile it against completed purchases.

## 5. Implementation and release boundaries

These are owner-approved product rules, not evidence that the current code or staging Worker implements them.

Before release, engineering must:
- introduce explicit key-only read-only and wallet-authenticated authorization tiers;
- ensure key-based login cannot inherit wallet rights;
- provide wallet-based registration and login for the account system, with proof-of-control and purpose-specific challenges;
- implement durable, feature-scoped wallet membership for the Supporter Programme;
- store the official public-deployment timestamp and derive the exact 24-hour cutoff server-side;
- freeze the eligible wallet set at cutoff and reject new programme registrations afterward;
- enforce the USDT 1,000,000 aggregate ceiling, 25:1 allowance calculation, 25,000,000-ACROWN shared purchase capacity, personal balances and atomic consumption;
- preserve the existing three-network allowlist, canonical token identities, independent transaction verification, finality checks, append-only accounting and fail-closed controls;
- publish the event name, exact UTC timestamp, cutoff, floor-price version, final terms and remaining programme capacity before relevant users rely on them.

No payment acceptance, contribution, purchase, entitlement credit or production deployment is enabled by this requirements update. The existing staging Worker remains subject to its deployed revision and its currently disabled payment boundary until a separately qualified and explicitly authorized deployment changes it.

## 6. Inputs that remain unapproved or unimplemented

- Official public-deployment event name.
- Exact public-deployment timestamp and derived registration cutoff.
- Final ACS floor-price calculation/version and rounding rules.
- Minimum first contribution/qualification threshold.
- Treasury receiving addresses and independent custody/security approval for Ethereum, Tron and Solana.
- RPC providers, independent evidence and finality qualification.
- Exact post-cutoff wallet recovery/replacement procedure.
- Applicable legal, terms, privacy, security, backup and operational approvals.
- Final confirmation whether the retained 180-day maximum remains the intended purchase-window close after the event.

