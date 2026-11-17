# Genesis Programme — Mainnet Payment and Entitlement Foundation

**Date:** 14 November 2026  
**Status:** Architecture/schema foundation plus a read-only, isolated staging status API — payment acceptance is NOT enabled.  
**Scope:** Genesis Programme real-USDT contribution and entitlement system; not the rest of AstroCrown.

**Official product name:** Genesis Programme. Existing `supporter_*` database objects, `/api/supporters/*` endpoints, `SUPPORTERS_DB` binding, migration filenames and the current `/supporters/` preview path are legacy technical identifiers retained for compatibility and migration-history integrity. They are not the programme's official name. New user-facing text and new architectural descriptions must use **Genesis Programme** and **Genesis participants**.

## 1. Deployment split

The general AstroCrown website and platform functionality remain in Devnet/Testnet with valueless assets during development. The Genesis Programme is the deliberate exception: after separate activation gates pass, it is intended to accept real mainnet USD₮ from its first operational opening on Ethereum, Tron and Solana.

Publishing a static Pages preview, merging a PR, deploying a Worker or creating a D1 database does not open the programme and does not start its 180-day clock. The clock begins only when the owner-approved payment service is deliberately activated and ready to accept real contributions.

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

## 3. Multiplier and personal purchase allowance

The owner's illustration establishes the intended direction: the verified contribution determines a personal ACROWN purchase allowance using an approved multiplier/rate.

**Illustration only:** 1,000 USD₮ verified contribution × 25 ACROWN per USD₮ = **25,000 ACROWN purchase allowance**.

The 25:1 rate is not silently treated as a final term. Before payments open, the owner must approve and publish:
- exact multiplier/rate and units;
- fractional-amount and base-unit rounding rules;
- ACS floor-price calculation, version and purchase-time snapshot;
- first-contribution qualification threshold;
- programme-wide ACROWN cap, or an explicit decision not to impose one;
- whether later contributions add to the same member's unused personal allowance;
- purchase and settlement sequence.

Store all token and payment quantities as integer base-unit strings, never floating-point numbers. The general formula is:

`allowance_base = floor(verified_USDT_base × rate_numerator × 10^ACROWN_decimals / (10^USDT_decimals × rate_denominator))`

The available amount at purchase time is the smaller of the unused personal allowance and any remaining approved programme-wide ACROWN cap. A global cap is a separate limit; it does not replace the personal multiplier calculation. Purchases must consume both balances atomically. Reselling purchased tokens does not replenish consumed allowance.

A contribution activates purchase eligibility; it does not itself issue, transfer or purchase ACROWN. A later ACROWN acquisition is a separate, separately recorded transaction at the approved ACS floor. An allowance must never be represented as tokens already owned or delivered.

## 4. One global 180-day window

- `activated_at` is set once when the owner deliberately opens the real contribution service after all activation gates pass.
- `closes_at = activated_at + 180 days` (15,552,000 seconds).
- Static preview deployment, Git commit, PR merge, Worker deployment or database creation does not start the period.
- The authoritative database stores both timestamps; the public page and ledger disclose them.
- No contribution/purchase is eligible before activation. Purchases must settle before the global close.
- Pausing service does not reset or extend the window. Reopening or extending requires a separate approved and publicly recorded decision.
- The activation timestamp is immutable.

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

## 7. Data and accounting model

The D1 migration creates:
- one mainnet programme activation record with immutable 180-day timestamps;
- members and unique usernames;
- independently verified chain wallets and short-lived challenges;
- network-specific contribution intents;
- finalized contributions unique by network + transaction hash + transfer/event index;
- personal entitlement balances and append-only entitlement events;
- separately recorded ACROWN purchases;
- append-only public accounting events.

A contribution record preserves network, token identity, source wallet, treasury, amount/base units, transaction reference, event/instruction index, block/slot, finality evidence, provider agreement digest, timestamp and rules/multiplier version. Every entitlement calculation must be reproducible from stored inputs.

Never rewrite financial history. Corrections are compensating events. Database uniqueness prevents duplicate credit; atomic reservation/settlement prevents concurrent purchases from exceeding the personal allowance or global cap.

Public snapshots are dated, append-only, hashed and reconciled. GitHub may store intentionally public audit exports, but is not the live source of truth and must never hold secrets. On-chain explorer evidence must be paired with redacted receipts/invoices for off-chain spending.

## 8. Cloudflare architecture boundary

Use one Pages project and one public hostname for the homepage and the Genesis Programme preview (currently served at the legacy `/supporters/` path). Backend endpoints currently retain the same-origin `/api/supporters/*` legacy route namespace for compatibility. Do not expose a `workers.dev` staging URL as the public Genesis Programme address.

Pages Functions can use the repository's `functions/` directory and D1 bindings. Once Functions are present, a build-output `_routes.json` must route only API paths and exclude static assets. Cloudflare documents that otherwise all requests may invoke Functions and consume quota, including static asset requests.

Current published Workers Free limits include 100,000 requests/day, 10 ms CPU/request, 128 MB memory, 50 subrequests/request and six simultaneous outgoing connections. D1 Free publishes 5 million rows read/day, 100,000 rows written/day and 5 GB total storage; daily quota exhaustion causes D1 queries to fail. These are technical quotas, not an SLA or proof of financial-service suitability.

The already merged static Pages package remains a no-payment, no-backend preview and must keep its explicit publication allowlist. The staging Worker now has a separate `SUPPORTERS_DB` binding (a legacy technical identifier), independent from the account/test D1, and a read-only `GET /api/supporters/status` endpoint. It reports the mainnet programme as `PRELAUNCH`, validates the canonical Ethereum/Tron/Solana USD₮ token identifiers and six-decimal precision, and exposes only whether a treasury has been configured (never the treasury address itself). This status endpoint is publicly readable because it returns no account or member data. It cannot create members, wallet challenges, payment intents, transfers, contributions or entitlements; mainnet payment acceptance is hard-coded disabled in this release. The Genesis Programme page displays this live status. The dedicated D1 remains separate from all test-account identity and session data.

This foundation does not add payment endpoints or alter that boundary.

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
- final multiplier/rate and first-contribution threshold;
- final floor-price/rounding/version rules;
- global ACROWN cap or explicit no-cap decision;
- whether later contributions add to unused personal allowance;
- final terms and applicable jurisdictional conditions;
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
