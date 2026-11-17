# Supporter Programme — Mainnet Payment and Entitlement Foundation

**Date:** 14 November 2026  
**Status:** Architecture/schema foundation plus a read-only, isolated staging status API — payment acceptance is NOT enabled.  
**Scope:** Supporter Programme real-USDT exception; not the rest of AstroCrown.  
**Owner policy:** [Owner Identity and Supporter Programme Rules](../account-continuity/OWNER-IDENTITY-AND-SUPPORTER-PROGRAMME-RULES-2026-11-15.md) is controlling for account tiers, multiplier, programme ceiling and wallet-registration cutoff.

## 1. Deployment split

The general AstroCrown website and platform functionality remain in Devnet/Testnet with valueless assets during development. The Supporter Programme is the deliberate exception: after separate activation gates pass, it is intended to accept real mainnet USD₮ from its first operational opening on Ethereum, Tron and Solana.

Publishing a static Pages preview, merging a PR, deploying a Worker or creating a D1 database does not open the programme. No 180-day maximum or other fixed time-based expiry applies. The programme opens only when the owner-approved payment service is deliberately activated and ready to accept real contributions.

Real supporter records and entitlements must be isolated from general AstroCrown testnet records. A test transaction, test account, browser-local value or client-supplied success state can never create or modify a real entitlement.

## 2. Initial mainnet USD₮ allowlist

Tether's official [Supported Protocols and Integration Guidelines](https://tether.to/en/supported-protocols/) list the following protocol families and token identifiers:

| Network | Protocol | Network identifier | Canonical USD₮ contract/mint |
|---|---|---|---|
| Ethereum | ERC-20 | EIP-155 chain ID 1 | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| Tron | TRC-20 | Tron Mainnet | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` |
| Solana | SPL Token | Solana Mainnet | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` |

These are token contracts/mints, **not** AstroCrown treasury addresses.

Requirements:
- Match the complete network identity and exact token contract/mint. Never trust ticker, token name, icon or a user-provided token identifier.
- Verify USD₮ decimals on-chain and against reviewed configuration before enabling a chain. Expected precision is six decimals; disagreement is a hard stop.
- Configure one **dedicated Supporter Programme receiving wallet address per enabled network**: one Ethereum address for ERC-20 USD₮, one Tron address for TRC-20 USD₮ and one Solana address for SPL USD₮. These are separate network-specific destinations, not interchangeable addresses.
- The receiving wallets must be separate from personal/admin wallets, the ACS reserve and the competition-prize allocation. The owner must securely generate/establish control, verify each address on its intended network and document custody, backups, spending authorization and reconciliation before activation.
- Keep seed phrases, private keys, recovery material and exported key files out of ChatGPT, GitHub, source code, CI, browser code, logs and ordinary Worker environment variables. Only verified public receiving addresses and non-secret configuration may be used by the application.
- Do not publish or activate any receiving address until all three network/token pairings and the custody controls are verified. Do not accept funds before then.
- Do not bridge, wrap, swap or silently convert contributions. A transfer on one chain is not a transfer on another.
- ACROWN delivery remains Solana-based. The member must separately prove control of the Solana delivery wallet.
- Only these three networks are in initial scope. An extra network needs an independent review and explicit approval.

## 3. Multiplier and programme-wide contribution/purchase ceilings

The owner has approved a **USDT 1,000,000 aggregate contribution ceiling** and a **25:1 multiplier**, meaning 25 ACROWN of purchase allowance for each 1 USDT of verified contribution. The multiplier controls purchase quantity only; it is not a token grant and is not credit toward the separate ACROWN purchase price.

- USDT decimals are six. The aggregate contribution ceiling is therefore `1,000,000,000,000` USDT base units.
- A verified USDT 1 contribution creates the right for **that same verified source wallet** to purchase up to 25 ACROWN at the approved ACS floor price. The supporter must separately pay the full floor-price consideration for each ACROWN purchase and the applicable execution fee route. The contribution itself is not the ACROWN purchase and does not issue or deliver tokens.
- At the USDT 1,000,000 aggregate contribution ceiling, the maximum aggregate purchase allowance is 25,000,000 whole ACROWN.
- Each wallet's earned allowance is calculated only from verified contributions made by that exact wallet using 25:1. Its remaining allowance is that wallet's earned amount minus purchases made against that same wallet's allowance. Wallets linked to one member remain strictly separate; their allowances, purchases and balances must never be pooled, transferred or shared.
- The programme-wide remaining purchase capacity is 25,000,000 ACROWN minus all completed programme purchases. A member may buy no more than the lesser of personal remaining allowance and programme-wide remaining capacity.
- Both the personal allowance and programme-wide purchase capacity must be consumed atomically at settlement. Concurrent purchases cannot exceed either limit. When the programme-wide 25,000,000-ACROWN capacity is exhausted, further programme purchases are blocked even if personal allowances remain.
- Total confirmed contributions across Ethereum, Tron and Solana must never exceed USDT 1,000,000. A final partial contribution must be limited to the exact remaining contribution capacity; excess transfers cannot create extra allowance.
- Each further verified contribution from a wallet already in the frozen eligible set adds another 25:1 allowance to that same wallet's cumulative earned allowance, even if earlier allowance was partly or fully used. A completed ACROWN purchase remains consumed; resale does not restore it.
- Accept contributions only while the programme is OPEN, contribution capacity remains, and unused shared 25,000,000-ACROWN purchase capacity remains. Once the shared sale cap is exhausted or the programme closes, stop new contributions as well as purchases; do not accept funds for allowance that cannot be redeemed.
- Quantities are integer base-unit strings with rational arithmetic, never floating point. Convert 25,000,000 whole ACROWN to base units only after ACROWN decimals have been finalized and verified.

Owner confirmation on 2026-11-16 resolves the earlier wording ambiguity: USDT 1 of verified contribution creates purchase allowance for that same source wallet to buy up to 25 ACROWN, not 1 ACROWN. This multiplier is only a quantity allowance; it does not pay for the 25 ACROWN. The supporter must later pay the separate ACS floor consideration. If Paymaster is active, one ACROWN-denominated all-inclusive Paymaster fee includes network execution/gas; there is no second network-fee line. If Paymaster is inactive, the wallet pays native network gas through the direct-wallet route.

The supporter contribution treasury remains separate from the ACS reserve. The contribution does not automatically enter `V`; any later treasury-to-reserve transfer must be separately approved, traceable and reconciled.

### 3.1 ACS floor-price and fee accounting

The owner has specified the governing ACS formula:

`F = V / C`

where `V` is the reserve vault containing reserve funds used to rebuy ACROWN at the floor, `C` is circulating ACROWN, and `F` is the ACS floor price. The formula is owner-approved; reserve valuation, denomination, measurement source, settlement snapshot, decimal precision and rounding/atomicity still require technical qualification.

For a purchase of `q` ACROWN:

- Floor-price consideration is `q × F`.
- The full `q × F` must be credited to the ACS reserve `V`.
- When Paymaster is active, the user sees **one all-inclusive Paymaster fee denominated in ACROWN**, which already includes the underlying network execution/gas cost. Do not show or charge the included network cost as a second, separate network-fee line.
- When Paymaster is not active, the direct wallet route requires the applicable network gas in its native fee asset. The direct-gas route and Paymaster route are alternatives; never add native network gas again on top of an all-inclusive Paymaster fee.
- The Paymaster fee and the floor-price consideration are distinct accounting components. The full floor-price consideration must reach `V`; the Paymaster fee must not be deducted from or netted against that reserve credit. Show the applicable single fee route, amount/quote and fee asset before approval.
- If circulating supply increases by `q` and the full `F × q` is added to `V`, then, all else equal, `(V + Fq)/(C + q) = F`; the floor is preserved.
- If any part of the floor-price consideration is withheld to pay network or Paymaster costs before it reaches `V`, the reserve increment is insufficient and `V/C` is diluted. The ACS reserve must not subsidize or absorb gas/Paymaster costs.
- The ACS floor is monotonic: every operation affecting reserve `V` or circulating supply `C` must satisfy `F_after >= F_before`, using consistent, approved, auditable pre/post valuation and supply snapshots. If the inequality would fail, reject the operation or pause the affected route. A sale at exactly `F` with full `F × q` reserve credit preserves `F`; it does not itself raise it. The floor rises only when the resulting reserve-to-circulation ratio rises.
- Version the valuation denomination/source and `C` measurement method. A change of measurement convention must not be used to disguise an economic decline in `F`.
- On the Paymaster route, disclose one ACROWN-denominated all-inclusive Paymaster fee, including the network execution cost, plus quote validity/maximum before approval; do not duplicate the included network cost. On the direct-wallet route, disclose the network's native gas requirement. Any route that cannot preserve the full floor-price credit to `V` must fail closed.
- Do not use contributor funds as a silent fee source and do not presume contribution funds are part of `V`. Each treasury movement must be separately approved and publicly accounted for.

## 4. Wallet-registration cutoff, public-deployment event and programme close

The wallet-registration period closes exactly 24 hours before the official public-deployment event.

- Let `T_public` be `00:00:00 UTC` (`00:00:00Z`) at the beginning of the selected public-deployment event date. The wallet-registration cutoff is `T_cutoff = T_public - 86,400 seconds`, exactly `00:00:00Z` on the preceding UTC calendar date.
- The event date remains undecided until security/readiness, development speed, adoption and funding-growth conditions justify fixing it. Once approved, publish the exact ISO 8601 UTC timestamp ending `T00:00:00Z`. Until then, do not invent or display an active cutoff.
- The event name is also undecided. Near the readiness decision, assess the related project conversations and current adoption/branding trends; prioritize familiar wording, adoption potential and cost efficiency. "Genesis Day", "Launch Day", "Deployment Day" and "New Big-Bang Event" remain candidates only.
- At cutoff, freeze the set of supporter wallets successfully registered and ownership-verified before the deadline. A merely connected or unverified wallet is not in the frozen set.
- After cutoff, no previously unregistered wallet may register, join the eligibility set, contribute, purchase or invoke member-level programme actions. Public read-only programme information may remain viewable. There is no replacement-wallet or wallet-recovery exception under the current programme.
- Only wallets in the frozen eligible set may use their own wallet-specific purchase allowances after the event.
- Before the official ACROWN launch timestamp `T_public`, no person may make an ordinary/public ACROWN purchase through an AstroCrown-operated or AstroCrown-authorized purchase route. All such public routes, including the Supporter Programme route, remain disabled for every user and wallet. A token/market contract deployed before launch must enforce the approved launch gate at protocol/contract level wherever required; a hidden UI control is insufficient. A contribution creates only a future wallet-specific purchase allowance and does not buy, issue or deliver ACROWN.
- Specifically authorized administrators may perform controlled technical qualification tests before launch. Test operations must be separately authorized, clearly identified, auditable and isolated from real supporter entitlement and public accounting; they are not ordinary/public purchases, do not create or consume a supporter's allowance and do not count as qualifying programme activity. Any mainnet or real-ACROWN test requires a separate owner-approved procedure, explicit test addresses and quantities, limits and reconciliation. This rule concerns AstroCrown-operated/authorized routes and does not claim control over independent third-party or private transfers outside AstroCrown contracts and services.
- Wallet loss means loss of access to that registered wallet and its wallet-specific supporter record. AstroCrown does not recover the wallet, private keys, assets or access; does not transfer eligibility, contributions or allowance to another wallet; and does not refund or compensate for the wallet or assets lost because of that loss, subject to mandatory legal rights.
- Intended UX: when a wallet is connected, match its verified address server-side and automatically show that exact wallet's own dashboard. If a member has several linked wallets, the user may switch which wallet's dashboard is displayed, but each one retains its own independent allowance and purchase history. Another wallet never inherits a lost wallet's record. No recovery assistance or wallet replacement is provided by this programme. A future recovery feature, if created, would be a separate owner-approved feature and is not promised here.
- The cutoff is a wallet-registration/member-interaction cutoff, not a contribution cutoff for frozen wallets. Already registered wallets may continue qualifying contributions while the programme is OPEN, within the USDT 1,000,000 ceiling and while shared sale capacity remains. Each contribution adds allowance only to the source wallet that sent it. No unregistered wallet may interact with member-level programme functions after cutoff.
- "Buy the remaining multipliers" means redeem the unused personal ACROWN purchase allowance by making the separate ACROWN purchase at the published ACS floor price.

There is **no fixed-duration expiry** for the programme or any wallet-specific earned purchase allowance. Contributions may continue from the frozen eligible wallets while the programme is OPEN, until the USDT 1,000,000 aggregate contribution ceiling or shared 25,000,000-ACROWN sale capacity is reached. Once the contribution ceiling is reached, contribution intake stops but existing wallet-specific allowances remain usable while programme purchases remain open. When the shared 25,000,000-ACROWN sale capacity is exhausted, both new contributions and programme purchases close. A programme pause or owner-declared closure must be a separate, explicit lifecycle decision; elapsed time alone does not expire an allowance.

Store the selected public-event timestamp as an immutable UTC-midnight value and derive the preceding-day UTC-midnight wallet-registration cutoff server-side. If the event date is unset, do not invent an active deadline. The event name remains a separate owner decision.

### 4.1 Two-stage public-event countdown

When the official event date is announced, the public page shows two sequential countdown phases using the exact owner-published `T_public`:

1. **Registration countdown:** from the event schedule announcement to `T_cutoff`, showing time remaining until new wallet registrations close.
2. **Final 24-hour launch countdown:** at `T_cutoff`, freeze the verified eligible-wallet set and replace the first timer with a countdown from cutoff to `T_public`. This second phase is exactly 24 hours and offers no new wallet registration or member-level onboarding.

Both phases show days, hours, minutes and seconds and identify UTC. Until an approved timestamp is set, show "Not announced" and no active countdown. Timer display is informational; server-side cutoff checks and the frozen eligibility snapshot are authoritative. A changed event schedule requires a versioned owner announcement; client-side clocks must not silently reopen registration.

### 4.2 Supporter dashboard display and purchase readiness

The dashboard must separate programme-wide figures from the connected wallet's figures, and each figure must have a distinct label, numeric value and visually distinguishable progress line. Color must not be the sole way to communicate meaning.

**Programme-wide 25,000,000-ACROWN capacity:** show purchase allowance earned/granted from verified contributions, ACROWN actually purchased/settled, and remaining sale capacity (`25,000,000 - completed purchases`).

**Connected wallet:** show only the allowance earned from that exact wallet's verified contributions at 25:1, ACROWN purchased against that wallet's allowance, and its unused wallet-specific balance. The dashboard may let a member switch between linked wallets, but it must not aggregate or pool their allowances. Clearly label allowance as a right to buy, not tokens owned. A separately linked Solana delivery wallet is only a destination; it does not own or inherit the source wallet's allowance.

There is no individual time-based expiry for an earned wallet-specific purchase allowance merely because that wallet has remained unused. Separately, the owner has approved a programme-wide inactivity termination right. The 180-day clock starts at the official ACROWN launch timestamp and is measured across the entire programme.

A qualifying activity is either (a) a successfully confirmed and verified USDT contribution from an eligible frozen wallet that is credited to that wallet's allowance, or (b) a successfully completed and settled ACROWN purchase at the approved ACS floor that consumes that wallet's allowance and global capacity. Any qualifying transaction by any eligible wallet resets the global inactivity clock. Pending, failed, reverted, cancelled or duplicate transactions; logins; wallet connections; page visits; read-only activity; administrative checks; and technical tests do not reset it.

If no qualifying activity occurs anywhere in the programme for 180 consecutive days after launch, AstroCrown reserves the right, but is not required, to terminate the programme. Termination is not automatic: it requires a separate owner-authorized decision, an effective timestamp and a published notice. When termination takes effect, all unused wallet-specific allowances cease to be usable, with no refund or compensation except where mandatory applicable law requires otherwise. This is a programme-wide termination, not an individual allowance expiry: while the programme remains open, a wallet's unused allowance does not expire just because that wallet itself has been inactive.

Publishing a static Pages preview, merging a PR, deploying a Worker or creating a D1 database does not open the programme.

## 5. Member and wallet identity

A member has a unique pseudonym/username and may link one or more independently verified wallet addresses. Member identity is a display/account grouping only. **Supporter Programme allowance and purchase history are wallet-specific, not member-specific.** Each verified wallet independently earns allowance from its own confirmed contributions; the same member's other wallets cannot pool, inherit or spend that allowance. Key-only AstroCrown access alone does not register a supporter or create supporter eligibility. The verified wallet set is frozen at the cutoff 24 hours before public deployment.

- Generate a random name by default; permit customization subject to uniqueness and safe-character rules.
- A username is a display identity, not proof of wallet ownership.
- Each Ethereum, Tron or Solana address must independently prove control through a short-lived, single-use, domain-bound signed challenge.
- Wallet provider name, icon or account label does not prove different chain addresses share an owner.
- Separately verify the Solana wallet that will receive ACROWN.
- Never request, receive, store, log or export a seed phrase, private key, JSON keypair or recovery phrase.
- A wallet address may map to only one active member per network. The current programme does not support wallet reassignment, replacement or recovery after loss.
- Before registration, disclose that wallet addresses, pseudonym and programme transactions may be publicly linked.

### Implemented staging member and wallet API

The isolated staging Worker now implements supporter identity without opening payment acceptance:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/supporters/registration/challenge` | POST | Reserve a pseudonym and issue a short-lived wallet ownership challenge |
| `/api/supporters/registration/verify` | POST | Verify the first payment wallet signature and atomically create the supporter session |
| `/api/supporters/login/challenge` | POST | Issue a fresh challenge for an already verified wallet |
| `/api/supporters/login/verify` | POST | Verify wallet control and create a new session |
| `/api/supporters/wallet-challenge` | POST | Issue a challenge for a linked payment or Solana delivery wallet |
| `/api/supporters/wallet-verify` | POST | Verify the challenge and store the additional public wallet address |
| `/api/supporters/me` | GET | Return the current verified member profile and verified wallet list |
| `/api/supporters/logout` | POST | Revoke the current supporter session |

Each challenge is bound to the exact site domain, address, network, purpose, nonce and expiry; its message and nonce are stored as digests and the challenge is single-use. The backend verifies signatures rather than trusting the wallet provider's name, icon or claimed address. A registration is pending until a wallet proof has succeeded. Database triggers require a verified wallet before the member can become verified and require a verified active member before a session can be created.

Wallet-signature formats:

- **Ethereum:** EIP-191 `personal_sign`, verified by recovering the signer from the exact message. See [viem's EIP-191 message-signing documentation](https://viem.sh/docs/actions/wallet/signMessage).
- **Tron:** TronLink `tronWeb.trx.signMessageV2` (TIP-191), verified with the TRON message prefix and Base58Check address. TronLink's current [message-signing specification](https://docs.tronlink.org/dapp/message-signing/) describes its UTF-8 text and TIP-191 prefix.
- **Solana:** Wallet Standard `solana:signMessage`, verified as an Ed25519 signature over the exact UTF-8 challenge bytes. The current [Solana message-signing guidance](https://solana.com/docs/frontend/messages-and-auth) recommends its standardized off-chain envelope when supported; this first implementation uses the widely supported raw `signMessage` fallback and does not request a transaction.

Sessions use an HttpOnly, Secure-on-HTTPS, SameSite=Strict cookie. The database stores only a one-way digest of the random session token. Registration, login and linking endpoints are rate-limited; the public identity store is isolated from ordinary account/test D1 data.

This staging identity feature does not create a treasury, accept USDT, create payment intents, broadcast transactions or credit entitlements. Real payment and entitlement paths remain unavailable until the owner supplies public receiving addresses, treasury ownership and configuration are independently verified, dual RPC evidence and finality checks are in place, and the programme terms/security gates are approved.

### 5.1 Secondary-market resale and protocol economics

A supporter may resell ACROWN purchased by a specific wallet through available external exchanges or swaps. A resale does not restore or replenish the allowance consumed by that wallet. A further verified contribution from that same eligible wallet may earn further 25:1 allowance only while contribution intake remains open and shared sale capacity remains.

The intended AstroCrown approach is **protocol economics rather than discretionary policing of token use**. Native ACS floor/roof boundaries and the Paymaster fee design are intended to make circular or self-directed trading economically unattractive to the trader and, where the published fee design routes value to a community-benefiting destination, potentially value-accretive to the community. The same deterministic, transparent protocol rules apply to all users; the programme does not create special blacklists, punitive rules or investigations solely to police holder trading intent.

This is a design objective to be demonstrated mathematically before activation, not a guarantee already proved. The final ACS/roof/Paymaster mechanics must define executable price bounds, round-trip cost, ACROWN fee collection and the destination of collected value. Do not claim that every self-trade is prohibited or necessarily profitable to the community until the precise fee and settlement paths have been modeled and tested.

The native protocol cannot control independent third-party venue rules, liquidity, prices or trading behaviour. No external market price is guaranteed to remain above ACS floor `F`; trading volume on an external venue is not, by itself, evidence of genuine demand or reliable liquidity. Token holders remain free to use their assets; deterministic protocol economics, not discretionary policing, determine native-protocol consequences.

## 6. Payment intent and finality

The server creates an exact payment intent before a wallet signs a transfer. Each intent binds the member, independently verified source wallet, network, canonical token, exact treasury destination, exact base-unit amount, single-use intent ID, expiry and rules version. The client must construct only that authorized transfer.

**Ethereum:** verify the transaction and successful receipt; exact USD₮ contract; expected sender/treasury Transfer event and amount; canonical block evidence; approved finality. Ethereum JSON-RPC exposes receipts and block tags including `safe` and `finalized`.

**Tron:** verify transaction body and successful smart-contract receipt; exact TRC-20 contract, sender, treasury, Transfer event and amount; confirm solidified state via SolidityNode. Tron distinguishes broadcast acceptance, transaction body, execution receipt and solidified receipt. A broadcast response is not final confirmation.

**Solana:** verify transaction signature at `finalized` commitment; successful metadata; exact USD₮ mint/program; source token account owner, treasury destination token account/owner, exact amount and instruction/balance evidence. A token-account address is not interchangeable with its treasury owner address.

At least two independently operated RPC sources are required per enabled chain. Normalize and compare evidence from both. If providers disagree, are unavailable, exceed quotas, or cannot establish finality, keep the intent pending/blocked and fail closed. Never credit from a single unverified UI callback, explorer screenshot, wallet status or LLM output.

## 7. Data and accounting model

The D1 migration creates:
- one mainnet programme activation record with immutable activation and lifecycle status, with no fixed-duration expiry;
- the approved USDT 1,000,000 aggregate contribution ceiling and the 25:1 multiplier/rules version;
- the 25,000,000-ACROWN shared purchase-capacity ceiling and current remaining capacity;
- the selected public-deployment event date at `00:00:00Z` and derived registration cutoff at `00:00:00Z` on the previous UTC date;
- an immutable record of the frozen eligible-wallet set and the cutoff timestamp;
- wallet-specific entitlement balances keyed by `wallet_id`, not `member_id`, and append-only wallet-scoped entitlement events;
- purchases bound to the wallet whose allowance is being consumed, separately from the wallet used as the ACROWN delivery destination;
- members and unique usernames;
- independently verified chain wallets and short-lived challenges;
- network-specific contribution intents;
- finalized contributions unique by network + transaction hash + transfer/event index;
- wallet-specific entitlement balances and append-only wallet-scoped entitlement events;
- separately recorded ACROWN purchases;
- append-only public accounting events, including gross ACS floor consideration credited to `V` and the applicable single fee route: either the all-inclusive ACROWN Paymaster fee (network execution included) or direct native-network gas, never a duplicated pair.

A contribution record preserves network, token identity, source wallet, treasury, amount/base units, transaction reference, event/instruction index, block/slot, finality evidence, provider agreement digest, timestamp and rules/multiplier version. Every entitlement calculation must be reproducible from stored inputs.

Never rewrite financial history. Corrections are compensating events. Database uniqueness prevents duplicate credit; atomic reservation/settlement prevents concurrent purchases from exceeding the personal allowance or global cap.

Public snapshots are dated, append-only, hashed and reconciled. GitHub may store intentionally public audit exports, but is not the live source of truth and must never hold secrets. On-chain explorer evidence must be paired with redacted receipts/invoices for off-chain spending.

## 8. Cloudflare architecture boundary

Use one Pages project and one public hostname for the homepage and `/supporters/`. Backend endpoints, once implemented, use same-origin `/api/supporters/*` paths. Do not expose a `workers.dev` staging URL as the public supporter address.

Pages Functions can use the repository's `functions/` directory and D1 bindings. Once Functions are present, a build-output `_routes.json` must route only API paths and exclude static assets. Cloudflare documents that otherwise all requests may invoke Functions and consume quota, including static asset requests.

Current published Workers Free limits include 100,000 requests/day, 10 ms CPU/request, 128 MB memory, 50 subrequests/request and six simultaneous outgoing connections. D1 Free publishes 5 million rows read/day, 100,000 rows written/day and 5 GB total storage; daily quota exhaustion causes D1 queries to fail. These are technical quotas, not an SLA or proof of financial-service suitability.

The already merged static Pages package remains a no-payment, no-backend preview and must keep its explicit publication allowlist. The staging Worker now has a separate `SUPPORTERS_DB` binding, independent from the account/test D1, and a read-only `GET /api/supporters/status` endpoint. It reports the mainnet programme as `PRELAUNCH`, validates the canonical Ethereum/Tron/Solana USD₮ token identifiers and six-decimal precision, and exposes only whether a treasury has been configured (never the treasury address itself). This status endpoint is publicly readable because it returns no account or member data. It cannot create members, wallet challenges, payment intents, transfers, contributions or entitlements; mainnet payment acceptance is hard-coded disabled in this release. The Supporter Programme page displays this live status. The dedicated D1 remains separate from all test-account identity and session data.

This foundation does not add payment endpoints or alter that boundary.

### 8.1 Treasury-address staging integration

The Worker branch adds a read-only format check for the three configured receiving addresses. It validates Ethereum EIP-55-compatible address syntax, Tron mainnet Base58Check syntax, and Solana canonical 32-byte Base58 public-key syntax. The public status response reports configuration/format booleans only; it never returns the receiving address and never enables payment acceptance.

The offline `development/account-continuity/worker/scripts/prepare-genesis-treasuries.mjs` utility accepts the three public addresses and emits SQL for the dedicated `acrown-supporters-mainnet` D1 database. The generated SQL stages the public addresses, explicitly keeps every network disabled, and clears earlier decimal/configuration verification markers so that changing an address cannot inherit stale verification. It performs no RPC call and cannot prove wallet control or live token state.

Detailed operator instructions and current limitations are recorded in [Treasury Address Onboarding](TREASURY-ADDRESS-ONBOARDING.md). The owner supplied the three public address inputs separately on 2026-11-17; they are intentionally not reproduced in this document or repository. Their address formats pass the current checks, but they have not been staged or configured, and custody/control plus live token-state verification remain outstanding. The payment-intent service, chain monitors, finality/quorum verification and entitlement crediting remain unimplemented.

## 9. Activation gates

All gates below must pass before real payment acceptance:

1. The owner-approved multiplier is 25:1, the aggregate verified-contribution ceiling is USDT 1,000,000, and the maximum programme-wide purchase allowance is 25,000,000 whole ACROWN. The owner-specified ACS floor formula is `F = V/C`; reserve valuation, circulating-supply measurement, ACROWN decimals, rounding rules, minimum first-contribution threshold, the Paymaster's all-inclusive ACROWN fee and direct-gas fallback still require qualification/approval. There is no 180-day maximum.
2. Owner supplies and independently verifies the three public receiving treasury addresses. No private key is needed in source code or chat.
3. Treasury custody/signing, recovery, spending approvals, incident response and segregation from ACS reserve/prize funds are documented.
4. Canonical token contracts/mints and decimals are independently checked against mainnet state.
5. EVM, Tron and Solana wallet-control challenge verification is implemented and tested; username persistence and Solana delivery-wallet linking are operational. The UTC-midnight event date and preceding-day cutoff are enforced; the frozen eligible-wallet set is enforced; wallet loss cannot trigger replacement or allowance reassignment; every allowance and purchase is keyed to the exact source wallet; and the dashboard presents server-derived global and per-wallet rights, purchases and remaining capacity. The page implements the two-stage registration/launch countdown.
6. Exact payment intent construction, expiry, and amount enforcement are implemented and tested.
7. Chain-specific transfer parsers, finality, independent RPC agreement, failover, replay/duplicate prevention and controlled testnet fixture tests pass.
8. D1 migration, immutable activation, uniqueness, atomic accounting, backup and restore are qualified.
9. Public ledger, redacted expense evidence, reconciliation, quota monitoring, rate limits, abuse controls and automatic fail-closed pause are operational.
10. Privacy notices, final terms, support/contact route, applicable legal/jurisdictional review and independent security review are complete.
11. Cloudflare account Free/no-card state and actual Pages/Functions/D1 bindings are verified. Each RPC provider passes real no-card, commercial-use and provider-independence qualification. No paid automatic fallback.
12. Public page, treasury addresses, API origin, event countdown configuration, first activation timestamp, exact `F = V/C` purchase arithmetic and one correctly presented fee route (all-inclusive ACROWN Paymaster fee, or direct native gas) are reviewed before the first real payment is possible.

Until all gates are evidenced, `SUPPORTER_MAINNET_ENABLED` remains false, no treasury address appears publicly, and any payment route fails closed.

## 10. Owner-only inputs still required

These values cannot safely be invented:
- the three treasury receiving addresses;
- first-contribution threshold and evidence-based rationale;
- reserve/circulating-supply operational data sources, settlement snapshot, rounding/version rules and final ACROWN decimal precision;
- all-inclusive ACROWN Paymaster fee quotation, maximum and accounting destination; direct native-network gas terms when Paymaster is inactive;
- official public-deployment event name and date (event begins at `00:00:00Z`; cutoff is previous UTC day `00:00:00Z`);
- final owner approval of wallet-loss disclosure and the no-recovery/no-replacement/no-refund policy; any future recovery system would be a separate feature;
- final terms and applicable jurisdictional conditions;
- Cloudflare account 02 access/state and explicit authorization for Pages/Functions/D1 creation and deployment.

The schema, static disclosures, server-authoritative two-stage countdown and deterministic wallet-specific entitlement tests can be prepared without these inputs. Payment activation cannot.

## Official technical sources

- Tether protocol list and token identifiers: https://tether.to/en/supported-protocols/
- Ethereum JSON-RPC receipts/finality tags: https://ethereum.org/developers/docs/apis/json-rpc/
- Tron confirmation semantics: https://developers.tron.network/docs/confirmation-semantics
- Tron solidified transaction information: https://developers.tron.network/reference/gettransactioninfobyid-1
- Solana transaction RPC: https://solana.com/docs/rpc/http/gettransaction
- Cloudflare Pages Functions routing: https://developers.cloudflare.com/pages/functions/routing/
- Cloudflare Pages Functions bindings: https://developers.cloudflare.com/pages/functions/bindings/
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare D1 pricing/limits: https://developers.cloudflare.com/d1/platform/pricing/
