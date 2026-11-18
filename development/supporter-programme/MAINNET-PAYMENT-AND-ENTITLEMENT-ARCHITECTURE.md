# Genesis Programme — Mainnet Payment and Entitlement Foundation

**Date:** 14 November 2026  
**Status:** Architecture/schema foundation plus a read-only, isolated staging status API — payment acceptance is NOT enabled.  
**Scope:** Genesis Programme real-USDT contribution and entitlement system; not the rest of AstroCrown.

**Official product name:** Genesis Programme. Existing `supporter_*` database objects, `/api/supporters/*` endpoints, `SUPPORTERS_DB` binding, migration filenames and the current `/supporters/` preview path are legacy technical identifiers retained for compatibility and migration-history integrity. They are not the programme's official name. New user-facing text and new architectural descriptions must use **Genesis Programme** and **Genesis participants**.


> **Authoritative owner amendment — 18 November 2026:** The identity/entitlement design below is superseded by [GENESIS-WALLET-FIRST-IDENTITY-AND-MEMBER-EXPERIENCE.md](./GENESIS-WALLET-FIRST-IDENTITY-AND-MEMBER-EXPERIENCE.md). The primary wallet—not a user/member account—is the Genesis identity, sole login authority and recovery anchor. It does not own a personal purchase allowance; all eligible pre-freeze registered identities access the same programme-wide USDT purchase pool. No conventional Genesis registration or separate account recovery exists. The new `/api/genesis/*` API is the product-facing identity path; former registration/login endpoints under `/api/supporters/*` are retired with HTTP 410 (the status alias is kept only for migration compatibility). Public terminology is qualifying payment / acquisition payment, ACROWN purchase entitlement, floor-price purchase and Genesis Member; charitable/contribution/supporter language is not appropriate for the public product. The gold DNA badge follows verified Genesis qualification, and explorer links reveal the full source address and on-chain history. Future privileges are planned only until individually approved. Historical schema and endpoint identifiers below remain compatibility details, not product terminology. The later owner clarification on 18 November 2026 establishes one primary Genesis wallet profile: the primary address is the sole login and authority; additional Ethereum, TRON and/or Solana addresses may be added from the same wallet application, but each must independently sign an address-link proof before use. Genesis qualifying payments must originate from a pre-registered address belonging to that profile on the same network; no one-time unlinked-source exception is permitted. This preserves the direct explorer relationship between the verified address and the payment. A wallet need not support every payment rail, but every rail it uses must pass its own address-link proof and payment checks. Genesis independently verifies the payment and does not rely on wallet notifications. A separate Solana delivery address must be proved before token delivery. The participant wallet receives ACROWN; the separately authorized AstroCrown signer sends it.


## 1. Deployment split

The general AstroCrown website and platform functionality remain in Devnet/Testnet with valueless assets during development. The Genesis Programme is the deliberate exception: after separate activation gates pass, it is intended to accept real mainnet USD₮ from its first operational opening on Ethereum, Tron and Solana.

Publishing a static Pages preview, merging a PR, deploying a Worker or creating a D1 database does not open Genesis. The programme must enter a complete activity freeze exactly 24 hours before the scheduled official ACROWN launch. That freeze includes new primary-wallet registration, qualifying payments, allowance credits, purchase quotes, floor-price purchases and other Genesis state changes. After ACROWN launches and the qualified ACS floor-purchase facility is operational, only identities registered before the freeze may resume the permitted qualifying-payment and purchase activities. New Genesis primary-wallet registration never reopens. The global 180-day purchase-exercise clock starts only when both ACROWN is officially launched and the qualified ACS floor-purchase facility is available.

Real supporter records and entitlements must be isolated from general AstroCrown testnet records. A test transaction, test account, browser-local value or client-supplied success state can never create or modify a real entitlement.

## 2. Initial mainnet USD₮ allowlist

Tether's official [Supported Protocols and Integration Guidelines](https://tether.to/en/supported-protocols/) list the following protocol families and token identifiers:

| Network | Protocol | Network identifier | Canonical USD₮ contract/mint |
|---|---|---|---|
| Ethereum | ERC-20 | EIP-155 chain ID 1 | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| Tron | TRC-20 | Tron Mainnet | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` |
| Solana | SPL Token | Solana Mainnet | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` |

These are token contracts/mints, **not** AstroCrown treasury addresses.

### Owner-supplied Genesis USD₮ receiving addresses

The owner has supplied the following public, network-specific Genesis treasury addresses:

| Network | Genesis receiving address | Configuration status |
|---|---|---|
| Ethereum Mainnet | `0xbbb77071149a5F113Df15E78c58518917afa950A` | Recorded; ownership proof pending |
| TRON Mainnet | `TAKHQcuJ3RLsZZxCorWc3rav6M28dS6VTR` | Recorded; ownership proof pending |
| Solana Mainnet | `AWyq9E7Wsdjv9VyoTs84XGiubQGZM7fETnZ8ddfArwkG` | Recorded; ownership proof pending |

These values are public receiving addresses, not private keys. The shared mainnet configuration and a new D1 migration record them. All three network rows remain disabled; recording an address does not prove custody, verify live token decimals, create a payment route, or enable payment acceptance. Ethereum comparisons are case-insensitive after checksum validation; TRON and Solana addresses are exact network-specific values.

Requirements:
- Match the complete network identity and exact token contract/mint. Never trust ticker, token name, icon or a user-provided token identifier.
- Verify USD₮ decimals on-chain and against reviewed configuration before enabling a chain. Expected precision is six decimals; disagreement is a hard stop.
- Configure one separately approved supporter treasury address per enabled network. Never derive or guess a treasury from a token identifier.
- Do not bridge, wrap, swap or silently convert contributions. A transfer on one chain is not a transfer on another.
- ACROWN delivery remains Solana-based. The member must separately prove control of the Solana delivery wallet.
- Only these three networks are in initial scope. An extra network needs an independent review and explicit approval.

## 3. Declining global tiers and USDT-denominated purchase allowance

The proposed programme schedule uses a decreasing multiplier applied to successive global tranches of finalized Genesis qualifying-payment principal. Each finalized qualifying payment increases one **shared, programme-wide USDT purchase-allowance pool**. It does not create or reserve a personal allowance for the wallet that made the payment. The pool is USDT-denominated capacity, not an ACROWN token quantity.

| Cumulative qualifying-payment tranche | Multiplier | Allowance per USDT 10 within that tranche | Allowance for a full USDT 10,000 tranche |
|---|---:|---:|---:|
| USDT 0–10,000 | 30× | USDT 300 | USDT 300,000 |
| USDT 10,000–20,000 | 25× | USDT 250 | USDT 250,000 |
| USDT 20,000–30,000 | 20× | USDT 200 | USDT 200,000 |
| USDT 30,000–40,000 | 15× | USDT 150 | USDT 150,000 |
| USDT 40,000–50,000 | 10× | USDT 100 | USDT 100,000 |
| **Total** | **20× weighted average** | — | **USDT 1,000,000** |

The schedule is a proposed owner-directed ruleset; payment activation remains blocked until its exact version, boundary semantics, minimum payment, rounding, expiry, reservation, inventory/ACS compatibility and legal disclosures are approved and published.

Rules:
- The tiers are **global**. The programme-wide counter advances only by exact, finalized, eligible Genesis qualifying-payment principal received at the designated Genesis treasury. It is not restarted for each wallet or payment.
- A qualifying payment that crosses a tranche boundary is split across the remaining portions of the successive tranches. For example, if USDT 3,000 remains in the 30× tranche, a USDT 10,000 qualifying payment earns USDT 90,000 allowance for its first USDT 3,000 and USDT 175,000 for its next USDT 7,000, totalling USDT 265,000.
- A USDT 10 payment wholly within the first tranche creates up to USDT 300 of later purchase allowance; the same payment wholly within the second creates up to USDT 250.
- The full USDT 50,000 qualifying-payment target produces no more than USDT 1,000,000 aggregate purchase allowance under this schedule. The allowance cap is measured in USDT purchase value, not ACROWN base units.
- The first qualifying payment funds the Genesis Programme's planned launch of the complete AstroCrown website frontend and backend. It is not itself an ACROWN purchase and is not automatically added to ACS reserve value V.
- The resulting allowance is one shared programme-wide right to make later, separate ACROWN purchases at the contemporaneous approved ACS pure floor. Any eligible primary-wallet identity registered before the permanent registration cutoff may access the remaining shared pool; its purchases are not limited to the amount of qualifying payment made by that same wallet. A single eligible registered wallet may purchase up to the entire remaining programme-wide allowance if it chooses and if qualified ACROWN inventory and all other controls permit. Every completed purchase reduces the same global balance. This is not a free token grant, fixed token quantity, guaranteed return, guaranteed resale value or assurance that inventory/market liquidity will exist.

For each payment intent, the backend must reserve the applicable global tranche portions and bind the exact tier breakdown and rules version. If a payment intent expires or is cancelled, its temporary reservation is released. Once the exact payment is finalized and reconciled, the tier allocation is recorded immutably and cannot be repriced because later participants advance the global counter.

Store all payment and USDT allowance values as canonical integer base-unit strings. The conceptual allowance formula is:

`earned_purchase_allowance_usdt_base = Σ(tranche_principal_usdt_base × tranche_multiplier)`

At the later purchase stage, an eligible registered wallet may request any USDT amount up to the remaining shared programme-wide allowance; there is no personal per-wallet allowance ceiling. The approved contemporaneous pure-floor quote determines the corresponding ACROWN quantity using exact rational/integer arithmetic and the approved ACROWN decimal scale. Global reservations prevent concurrent requests from overspending the pool. Only a separately verified, finalized purchase with verified ACROWN delivery consumes the corresponding global allowance; unused global allowance is not converted into tokens or treated as an owned asset. Reselling purchased tokens does not replenish the shared pool.

**Schema migration required:** the old `genesis_wallet_entitlements.earned_acrown_base_units` / `consumed_acrown_base_units` table is a retired per-wallet ACROWN-denominated model and must not be read or credited. Migration `0005_genesis_global_allowance_and_launch_freeze.sql` introduces one global USDT-denominated allowance state, an append-only programme-wide event ledger, and permanent launch/registration-freeze timestamps. Qualifying-payment credits, reservations, releases and purchases update the same shared pool atomically. The actor wallet remains recorded on each event for audit attribution only; it does not own a private sub-balance.

## 4. Permanent registration freeze and global 180-day purchase-exercise window

The 24-hour registration freeze and the 180-day post-launch purchase window are separate lifecycle controls.

**Pre-launch freeze and permanent registration closure**
- Record the scheduled official ACROWN launch timestamp and set `registration_freeze_at = scheduled_acrown_launch_at - 86,400 seconds`.
- At that exact cutoff—24 hours before the scheduled ACROWN launch—all Genesis programme activity is frozen. This includes new primary-wallet identity registration, new qualifying-payment intents and acceptance, qualifying-payment credit, entitlement/pool changes, new purchase quotes, floor-price purchase intents, purchase settlement and profile/link mutations. Read-only records and authentication/logout needed to let existing wallets access their records may remain available.
- The closure is permanent. When the freeze begins, set `registration_closed_at` and never clear it. Do not resume, reopen or accept new Genesis primary-wallet identities after ACROWN launches.
- The 24-hour freeze remains in force through the ACROWN launch transition. Reopen only the approved qualifying-payment and ACS floor-purchase activities for identities that were already registered before `registration_closed_at`, and only after ACROWN is officially launched and the renewed ACS pure-floor purchase facility is operational. Do not reopen profile creation, new primary-wallet registration, wallet linking or profile mutation.
- Every qualifying payment and floor-price purchase after reopening must be initiated by an identity registered before the freeze and from a matching-network address already verified and linked to that identity before the freeze.

**Global 180-day exercise period**
- `acrown_purchase_window_started_at` is set only when both conditions are true: (1) ACROWN has been officially launched on its approved network; and (2) the renewed, approved ACS pure-floor purchase facility is live and eligible pre-freeze registered Genesis wallets can actually obtain a valid floor quote and complete the separate purchase flow. The start is the later of those two verified events.
- A token deployment or launch announcement without an operational, qualified floor-purchase facility is insufficient to start the clock.
- `acrown_purchase_window_closes_at = acrown_purchase_window_started_at + 180 days` (15,552,000 seconds). This is one global programme window, not a separate 180-day period for each wallet or each purchase.
- During this period, only the pre-freeze registered identities may resume eligible qualifying payments (to add new capacity to the shared programme pool under approved tranche rules) and floor-price purchases (to consume the pool). New identity registration remains permanently closed.
- Any eligible pre-freeze registered wallet may buy up to the entire remaining Genesis programme-wide allowance. There is no personal allowance that a wallet must first exhaust or that expires separately. Purchases by one wallet reduce the same global remaining balance available to all other eligible wallets.
- If one wallet purchases and receives ACROWN for the entire remaining programme-wide allowance, the shared pool is `EXHAUSTED` and the programme purchase offer closes early for everyone. A fully consumed global pool is not a per-wallet `FULLY_EXERCISED` status.
- If the shared pool is not exhausted by the global close, only the unused programme-wide remainder expires under the published rules. Completed purchases remain final.
- Merely opening a dashboard, creating a quote, reserving allowance, submitting an unfinalized payment or starting a delivery does not count as a completed purchase. A purchase that is finalized but awaits ACROWN delivery remains in an auditable pending/reconciliation state; its reservation must not be silently expired or treated as delivered.
- Pausing the service does not silently reset the global clock. Any extension or pause treatment for a material service outage requires a separately approved, versioned and publicly disclosed decision.
- The actual launch, freeze, ACS-open and close events are recorded immutably and disclosed in the public programme status and every existing member dashboard.

## 5. Member and wallet identity

A member has a unique pseudonym/username and one or more independently verified wallet addresses.

- Generate a random name by default; permit customization subject to uniqueness and safe-character rules.
- A username is a display identity, not proof of wallet ownership.
- Each Ethereum, Tron or Solana address must independently prove control through a short-lived, single-use, domain-bound signed challenge.
- Wallet provider name, icon or account label does not prove different chain addresses share an owner.
- Separately verify the Solana wallet that will receive ACROWN.
- Never request, receive, store, log or export a seed phrase, private key, JSON keypair or recovery phrase.
- A wallet address may map to only one active member per network unless an explicit recovery/reassignment process is reviewed.
- Before registration, disclose that wallet addresses, pseudonym and programme transactions may be publicly linked.

### Implemented staging member and wallet API

The isolated staging Worker now implements supporter identity without opening payment acceptance:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/supporters/registration/challenge` | POST | Reserve a pseudonym and issue a short-lived wallet ownership challenge |
| `/api/supporters/registration/verify` | POST | Verify the first payment wallet signature and atomically create the Genesis Programme member session |
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

This Genesis Programme staging identity feature does not create a treasury, accept USDT, create payment intents, broadcast transactions or credit entitlements. Real payment and entitlement paths remain unavailable until the owner supplies public receiving addresses, treasury ownership and configuration are independently verified, dual RPC evidence and finality checks are in place, and the programme terms/security gates are approved.

## 6. Payment intent and finality

The server creates an exact payment intent before a wallet signs a transfer. Each intent binds the member, independently verified source wallet, network, canonical token, exact treasury destination, exact base-unit amount, single-use intent ID, expiry and rules version. The client must construct only that authorized transfer.

**Ethereum:** verify the transaction and successful receipt; exact USD₮ contract; expected sender/treasury Transfer event and amount; canonical block evidence; approved finality. Ethereum JSON-RPC exposes receipts and block tags including `safe` and `finalized`.

**Tron:** verify transaction body and successful smart-contract receipt; exact TRC-20 contract, sender, treasury, Transfer event and amount; confirm solidified state via SolidityNode. Tron distinguishes broadcast acceptance, transaction body, execution receipt and solidified receipt. A broadcast response is not final confirmation.

**Solana:** verify transaction signature at `finalized` commitment; successful metadata; exact USD₮ mint/program; source token account owner, treasury destination token account/owner, exact amount and instruction/balance evidence. A token-account address is not interchangeable with its treasury owner address.

At least two independently operated RPC sources are required per enabled chain. Normalize and compare evidence from both. If providers disagree, are unavailable, exceed quotas, or cannot establish finality, keep the intent pending/blocked and fail closed. Never credit from a single unverified UI callback, explorer screenshot, wallet status or LLM output.

### Participant-paid network fees and exact principal

The registered wallet owner bears the blockchain network fee for each participant-originated Genesis qualifying payment and each later ACROWN floor-price purchase. The participant's fee is paid separately from the USDT principal, using the native fee asset or network resources required by the selected chain (for example, ETH, TRX or SOL where applicable). The programme must not sponsor, paymaster, net, withhold or deduct this participant network fee from the USDT payment.

Before the wallet signs, the dashboard must display the exact USDT principal, token, network, source, destination and intent expiry separately from a live network-fee estimate. The wallet's own confirmation prompt is the final fee confirmation; estimates may change. The registered wallet owner must maintain sufficient fee balance/resources and may cancel before signing. Never imply that the fee estimate is fixed or part of the USDT amount.

The finalized on-chain transfer must deliver the exact USDT principal in the payment intent. Reject or leave uncredited any partial/netted amount, wrong destination, wrong asset or transfer whose provider/withdrawal fee reduces the principal. Do not add a platform fee or chain fee to the USDT principal. A transfer from a route that cannot deliver the exact specified amount must not be offered.

For a later ACROWN floor-price purchase, the full exact USDT principal must be sent directly to the separately verified ACS reserve destination whose value is included in V. It must not be routed through the Genesis website-launch treasury or netted against an operating-fee account. Count the full received purchase principal in reserve value V under the approved valuation method. With F = V/C, participant network fees must not reduce V or be included as a deduction from the floor-price principal. Any platform-side operating or treasury-management costs must have a separately approved funding source and accounting treatment outside this purchase principal.

The initial Genesis qualifying payment is a different transaction: its exact USDT principal is sent to the Genesis Programme treasury for the planned complete website frontend/backend launch, not to ACS reserve V. Its participant-side network fee is still paid separately by the registered wallet owner.

## 7. Data and accounting model

The D1 migration creates:
- a Genesis lifecycle control record with the scheduled ACROWN launch, permanent 24-hour registration cutoff, official launch, ACS floor-purchase opening and immutable 180-day close;
- one shared USDT-denominated programme allowance state and append-only global allowance event ledger;
- members and unique usernames, with no new primary identities permitted after the permanent cutoff;
- independently verified chain wallets and short-lived challenges for identities registered before the cutoff;
- network-specific qualifying-payment intents;
- finalized qualifying payments unique by network + transaction hash + transfer/event index;
- separately recorded ACROWN floor-price purchases, reservations and delivery events;
- append-only public accounting events. The historical per-wallet ACROWN entitlement table remains unused compatibility history.

A contribution record preserves network, token identity, source wallet, treasury, amount/base units, transaction reference, event/instruction index, block/slot, finality evidence, provider agreement digest, timestamp and rules/multiplier version. Every entitlement calculation must be reproducible from stored inputs.

Never rewrite financial history. Corrections are compensating events. Database uniqueness prevents duplicate credit; atomic global-pool reservation/settlement prevents concurrent purchases—regardless of which registered wallet initiates them—from exceeding the programme-wide available allowance or approved cap.

Public snapshots are dated, append-only, hashed and reconciled. GitHub may store intentionally public audit exports, but is not the live source of truth and must never hold secrets. On-chain explorer evidence must be paired with redacted receipts/invoices for off-chain spending.

## 8. Cloudflare architecture boundary

Use one Pages project and one public hostname for the homepage and the Genesis Programme preview (currently served at the legacy `/supporters/` path). Backend endpoints currently retain the same-origin `/api/supporters/*` legacy route namespace for compatibility. Do not expose a `workers.dev` staging URL as the public Genesis Programme address.

Pages Functions can use the repository's `functions/` directory and D1 bindings. Once Functions are present, a build-output `_routes.json` must route only API paths and exclude static assets. Cloudflare documents that otherwise all requests may invoke Functions and consume quota, including static asset requests.

Current published Workers Free limits include 100,000 requests/day, 10 ms CPU/request, 128 MB memory, 50 subrequests/request and six simultaneous outgoing connections. D1 Free publishes 5 million rows read/day, 100,000 rows written/day and 5 GB total storage; daily quota exhaustion causes D1 queries to fail. These are technical quotas, not an SLA or proof of financial-service suitability.

The already merged static Pages package remains a no-payment, no-backend preview and must keep its explicit publication allowlist. The staging Worker now has a separate `SUPPORTERS_DB` binding (a legacy technical identifier), independent from the account/test D1, and a read-only `GET /api/supporters/status` endpoint. It reports the mainnet programme as `PRELAUNCH`, validates the canonical Ethereum/Tron/Solana USD₮ token identifiers and six-decimal precision, and exposes only whether a treasury has been configured (never the treasury address itself). This status endpoint is publicly readable because it returns no account or member data. It cannot create members, wallet challenges, payment intents, transfers, contributions or entitlements; mainnet payment acceptance is hard-coded disabled in this release. The Genesis Programme page displays this live status. The dedicated D1 remains separate from all test-account identity and session data.

A new local module, `development/account-continuity/worker/src/genesis-payment-evidence.js`, now provides deterministic read-only parsers for synthetic Ethereum, TRON and Solana USDT receipt evidence and a two-source normalized evidence comparison. It is not imported into the Worker HTTP API, does not connect to RPC providers, does not write D1, and cannot credit an entitlement. It is documented in [GENESIS-PAYMENT-EVIDENCE-VERIFICATION.md](./GENESIS-PAYMENT-EVIDENCE-VERIFICATION.md). The eventual production RPC adapter must prove provider/operator independence from a reviewed registry; participant-supplied labels are never trusted.

This foundation does not add payment endpoints or alter the fail-closed boundary.

## 9. Activation gates

All gates below must pass before real payment acceptance:

1. Owner approves multiplier/rate, threshold, floor-price calculation/version, purchase sequence, purchase window terms and programme-wide cap decision.
2. The three owner-supplied public receiving addresses are fixed in the reviewed configuration. Independently prove control of each address and verify the matching mainnet destination before enabling any network. No private key is needed in source code or chat.
3. Treasury custody/signing, recovery, spending approvals, incident response and segregation from ACS reserve/prize funds are documented.
4. Canonical token contracts/mints and decimals are independently checked against mainnet state.
5. EVM, Tron and Solana wallet-control challenge verification is implemented and tested; username persistence and Solana delivery-wallet linking are operational.
6. Exact payment intent construction, expiry, and amount enforcement are implemented and tested.
7. Chain-specific transfer parsers, finality, independent RPC agreement, failover, replay/duplicate prevention and controlled testnet fixture tests pass.
8. D1 migration, immutable activation, uniqueness, atomic accounting, backup and restore are qualified.
9. Public ledger, redacted expense evidence, reconciliation, quota monitoring, rate limits, abuse controls and automatic fail-closed pause are operational.
10. Privacy notices, final terms, support/contact route, applicable legal/jurisdictional review and independent security review are complete.
11. Cloudflare account Free/no-card state and actual Pages/Functions/D1 bindings are verified. Each RPC provider passes real no-card, commercial-use and provider-independence qualification. No paid automatic fallback.
12. Public page, treasury addresses, API origin and first activation timestamp are reviewed before the first real payment is possible.

Until all gates are evidenced, `SUPPORTER_MAINNET_ENABLED` remains false, no treasury address appears publicly, and any payment route fails closed.

## 10. Owner-only inputs still required

These values cannot safely be invented:
- independent wallet-control proof and custody verification for the three already-supplied treasury receiving addresses;
- final publication of the five global tiers (30× / 25× / 20× / 15× / 10× over successive USDT 10,000 tranches), tranche-reservation and boundary-crossing rules, minimum qualifying payment, USDT-denominated allowance migration and aggregate USDT 1,000,000 allowance cap;
- final floor-price/rounding/version rules, independent ACS reserve V destination/custody proof and confirmation that the full floor-purchase USDT principal is credited to V;
- global ACROWN cap or explicit no-cap decision;
- separate confirmation of whether later qualifying payments are permitted after the initial USDT 50,000 tiered target is reached;
- participant-paid network-fee disclosure and exact-principal enforcement for every enabled rail, final terms and applicable jurisdictional conditions;
- Cloudflare account 02 access/state and explicit authorization for Pages/Functions/D1 creation and deployment.

The schema, static disclosures and deterministic arithmetic tests can be prepared without these inputs. Payment activation cannot.

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

## ACS floor-price purchase and multi-network USDT implementation

The initial Genesis payment rails are USDT on Ethereum ERC-20, TRON TRC-20 and Solana SPL. This is one asset across three canonical mainnet token implementations; it does not implicitly support native coins or arbitrary tokens.

The participant lifecycle has two separate payments: a finalized Genesis qualifying payment adds USDT-denominated capacity to the shared programme-wide purchase allowance; a later, separately confirmed USDT floor-price purchase by any eligible pre-freeze registered wallet consumes that shared capacity at the approved contemporaneous ACS pure floor and delivers ACROWN only to the independently verified Solana delivery wallet. The contribution itself never automatically issues ACROWN.

The ACS core convention located for this integration is F_pure = V_reserves / Q_defended, with circulating supply as the defended quantity and fees excluded from the official floor. The ACS core currently expresses reserve value in BTC, so the Genesis USDT quote requires an approved BTC/USDT price snapshot. Genesis must not apply the provisional 35% roof uplift to participant purchases or substitute fee-adjusted external execution triggers for the official floor. The ACS source basis, quote snapshot requirements, chain verification, purchase settlement, ACROWN delivery and all activation gates are specified in [GENESIS-USDT-AND-ACS-FLOOR-PURCHASE-IMPLEMENTATION.md](GENESIS-USDT-AND-ACS-FLOOR-PURCHASE-IMPLEMENTATION.md).

This is a design specification only. All three payment networks remain disabled, contribution acceptance remains false, and no live floor quote or ACROWN delivery is enabled. A renewed qualified ACS release, verified treasury control on all chains, live RPC/token checks, approved programme terms and verified ACROWN mint/inventory/signing authority are still required.

