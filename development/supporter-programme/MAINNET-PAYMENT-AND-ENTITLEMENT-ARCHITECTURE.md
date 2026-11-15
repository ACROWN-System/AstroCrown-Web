# Supporter Programme — Mainnet Payment and Entitlement Foundation

**Date:** 14 November 2026  
**Status:** Architecture/schema foundation plus a read-only, isolated staging status API — payment acceptance is NOT enabled.  
**Scope:** Supporter Programme real-USDT exception; not the rest of AstroCrown.  
**Owner policy:** [Owner Identity and Supporter Programme Rules](../account-continuity/OWNER-IDENTITY-AND-SUPPORTER-PROGRAMME-RULES-2026-11-15.md) is controlling for account tiers, multiplier, programme ceiling and wallet-registration cutoff.

## 1. Deployment split

The general AstroCrown website and platform functionality remain in Devnet/Testnet with valueless assets during development. The Supporter Programme is the deliberate exception: after separate activation gates pass, it is intended to accept real mainnet USD₮ from its first operational opening on Ethereum, Tron and Solana.

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

Requirements:
- Match the complete network identity and exact token contract/mint. Never trust ticker, token name, icon or a user-provided token identifier.
- Verify USD₮ decimals on-chain and against reviewed configuration before enabling a chain. Expected precision is six decimals; disagreement is a hard stop.
- Configure one separately approved supporter treasury address per enabled network. Never derive or guess a treasury from a token identifier.
- Do not bridge, wrap, swap or silently convert contributions. A transfer on one chain is not a transfer on another.
- ACROWN delivery remains Solana-based. The member must separately prove control of the Solana delivery wallet.
- Only these three networks are in initial scope. An extra network needs an independent review and explicit approval.

## 3. Multiplier and programme-wide contribution/purchase ceilings

The owner has approved a **USDT 1,000,000 aggregate contribution ceiling** and a **25:1 multiplier**, meaning 25 ACROWN of purchase allowance for each 1 USDT of verified contribution. The multiplier controls purchase quantity only; it is not a token grant and is not credit toward the separate ACROWN purchase price.

- USDT decimals are six. The aggregate contribution ceiling is therefore `1,000,000,000,000` USDT base units.
- A verified USDT 1 contribution creates the right to purchase up to 25 ACROWN at the approved ACS floor price. The supporter must separately pay the full floor-price consideration for each ACROWN purchase, plus network gas and/or Paymaster fees. The contribution itself is not the ACROWN purchase and does not issue or deliver tokens.
- At the USDT 1,000,000 aggregate contribution ceiling, the maximum aggregate purchase allowance is 25,000,000 whole ACROWN.
- Each member's earned allowance is calculated from that member's verified contributions using 25:1. The member's remaining allowance is earned allowance minus completed programme purchases.
- The programme-wide remaining purchase capacity is 25,000,000 ACROWN minus all completed programme purchases. A member may buy no more than the lesser of personal remaining allowance and programme-wide remaining capacity.
- Both the personal allowance and programme-wide purchase capacity must be consumed atomically at settlement. Concurrent purchases cannot exceed either limit. When the programme-wide 25,000,000-ACROWN capacity is exhausted, further programme purchases are blocked even if personal allowances remain.
- Total confirmed contributions across Ethereum, Tron and Solana must never exceed USDT 1,000,000. A final partial contribution must be limited to the exact remaining contribution capacity; excess transfers cannot create extra allowance.
- Each further verified contribution from a wallet already in the frozen eligible set adds another 25:1 allowance to that wallet's cumulative earned allowance, even if earlier allowance was partly or fully used. A completed ACROWN purchase remains consumed; resale does not restore it.
- Accept contributions only while the programme is OPEN, contribution capacity remains, and unused shared 25,000,000-ACROWN purchase capacity remains. Once the shared sale cap is exhausted or the programme closes, stop new contributions as well as purchases; do not accept funds for allowance that cannot be redeemed.
- Quantities are integer base-unit strings with rational arithmetic, never floating point. Convert 25,000,000 whole ACROWN to base units only after ACROWN decimals have been finalized and verified.

Owner confirmation on 2026-11-16 resolves the earlier wording ambiguity: USDT 1 of verified contribution creates purchase allowance for up to 25 ACROWN, not 1 ACROWN. This multiplier is only a quantity allowance; it does not pay for the 25 ACROWN. The supporter must later pay the separate ACS floor consideration plus gas/Paymaster fees.

The supporter contribution treasury remains separate from the ACS reserve. The contribution does not automatically enter `V`; any later treasury-to-reserve transfer must be separately approved, traceable and reconciled.

### 3.1 ACS floor-price and fee accounting

The owner has specified the governing ACS formula:

`F = V / C`

where `V` is the reserve vault containing reserve funds used to rebuy ACROWN at the floor, `C` is circulating ACROWN, and `F` is the ACS floor price. The formula is owner-approved; reserve valuation, denomination, measurement source, settlement snapshot, decimal precision and rounding/atomicity still require technical qualification.

For a purchase of `q` ACROWN:

- Floor-price consideration is `q × F`.
- The full `q × F` must be credited to the ACS reserve `V`.
- The supporter pays `q × F` **plus** separately itemized network gas and/or Paymaster fees. Fees are additional, not a deduction from the consideration credited to `V`.
- If circulating supply increases by `q` and the full `F × q` is added to `V`, then, all else equal, `(V + Fq)/(C + q) = F`; the floor is preserved.
- If fees are withheld from the consideration before it reaches `V`, the reserve increment is insufficient and `V/C` is diluted. The ACS reserve must not subsidize or absorb gas/Paymaster costs.
- The ACS floor is monotonic: every operation affecting reserve `V` or circulating supply `C` must satisfy `F_after >= F_before`, using consistent, approved, auditable pre/post valuation and supply snapshots. If the inequality would fail, reject the operation or pause the affected route. A sale at exactly `F` with full `F × q` reserve credit preserves `F`; it does not itself raise it. The floor rises only when the resulting reserve-to-circulation ratio rises.
- Version the valuation denomination/source and `C` measurement method. A change of measurement convention must not be used to disguise an economic decline in `F`.
- The exact fee, fee currency, recipient and any maximum fee must be itemized and disclosed before wallet approval. If a payment route cannot collect the fee separately while crediting the full floor consideration, that route must fail closed.
- Do not use contributor funds as a silent fee source and do not presume contribution funds are part of `V`. Each treasury movement must be separately approved and publicly accounted for.

## 4. Wallet-registration cutoff, public-deployment event and programme close

The wallet-registration period closes exactly 24 hours before the official public-deployment event.

- Let `T_public` be `00:00:00 UTC` (`00:00:00Z`) at the beginning of the selected public-deployment event date. The wallet-registration cutoff is `T_cutoff = T_public - 86,400 seconds`, exactly `00:00:00Z` on the preceding UTC calendar date.
- The event date remains undecided until security/readiness, development speed, adoption and funding-growth conditions justify fixing it. Once approved, publish the exact ISO 8601 UTC timestamp ending `T00:00:00Z`. Until then, do not invent or display an active cutoff.
- The event name is also undecided. Near the readiness decision, assess the related project conversations and current adoption/branding trends; prioritize familiar wording, adoption potential and cost efficiency. "Genesis Day", "Launch Day", "Deployment Day" and "New Big-Bang Event" remain candidates only.
- At cutoff, freeze the set of supporter wallets successfully registered and ownership-verified before the deadline. A merely connected or unverified wallet is not in the frozen set.
- After cutoff, no previously unregistered wallet may register, join the eligibility set, contribute, purchase or invoke member-level programme actions. Public read-only programme information may remain viewable. The exception is a verified successor wallet replacing an already eligible wallet through the controlled recovery process; this preserves, rather than adds, one eligibility record.
- Only frozen wallets or verified successor wallets attached to the same frozen records may use programme purchase allowances after the event.
- A replacement is a migration of the old wallet's existing entitlement lineage: prove control of the replacement address, deactivate the old wallet for programme actions, carry contribution/purchase history and balances forward exactly once, preserve append-only evidence, and prohibit duplicate or increased allowance/capacity.
- Intended UX: when a wallet is connected, match its verified address server-side and automatically show the dashboard for that exact recognized wallet. For loss/replacement, provide one guided recovery path, but require separately approved strong recovery proof. The fallback method when the former wallet cannot sign is not yet decided.
- The cutoff is a wallet-registration/member-interaction cutoff, not a contribution cutoff for frozen wallets. Already registered wallets may continue qualifying contributions while the programme is OPEN, within the USDT 1,000,000 ceiling and programme-close rules. No unregistered wallet may interact with member-level programme functions after cutoff.
- "Buy the remaining multipliers" means redeem the unused personal ACROWN purchase allowance by making the separate ACROWN purchase at the published ACS floor price.

The previously approved global 180-day maximum window remains provisionally in force. It begins only when the owner-approved programme service is deliberately activated, not when a code is merged, preview is deployed, Worker is deployed or D1 is created. New contributions and ACROWN purchases close at the earlier of the 180-day window closing or exhaustion of the shared 25,000,000-ACROWN sale capacity. A sell-out closes the programme to both purchases and new contributions early; an unused time window does not add capacity and cannot justify accepting funds for unredeemable allowance.

Store the selected public-event date as an immutable UTC-midnight timestamp and derive the preceding-day UTC-midnight cutoff server-side. If the date is unset, do not invent a deadline or describe registration cutoff as active. The event name remains a separate owner decision. The 180-day maximum remains provisional and must be confirmed before activation.

### 4.1 Supporter dashboard display and purchase readiness

The dashboard must separate programme-wide figures from the connected wallet's figures, and each figure must have a distinct label, numeric value and visually distinguishable progress line. Color must not be the sole way to communicate meaning.

**Programme-wide 25,000,000-ACROWN capacity:** show purchase allowance earned/granted from verified contributions, ACROWN actually purchased/settled, and remaining sale capacity (`25,000,000 - completed purchases`).

**Connected wallet:** show total allowance earned through that wallet's verified contributions at 25:1, ACROWN actually purchased by that wallet at the floor, and its remaining personal purchase allowance. Clearly label allowance as a right to buy, not tokens owned.

The OFF/ON button is a server-derived readiness state, not a user-editable permission toggle. OFF is matte when the wallet is not eligible, the programme is not open, the personal allowance is exhausted, global capacity is exhausted or the purchase route/fee collection is not ready. ON uses the specified sparkly presentation only when all server-side eligibility, window, personal/global balance and fee-safe payment checks pass. The client cannot turn OFF into ON.

## 5. Member and wallet identity

A member has a unique pseudonym/username and one or more independently verified wallet addresses. Supporter Programme membership is the explicit wallet-based, feature-specific identity case: the wallet ownership proof creates the programme membership record, and membership is durable under the published programme rules. Key-only AstroCrown access alone does not register a supporter or create supporter eligibility. The wallet set eligible for programme purchases is frozen at the 24-hour-before-public-deployment cutoff.

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

### 5.1 Secondary-market use and liquidity risk

The owner is considering a model in which supporters who have purchased ACROWN at the ACS floor may resell through external exchanges or swaps, potentially using realized proceeds for further qualifying participation. A completed resale does not restore the purchase allowance already consumed; a new verified contribution from an already eligible wallet may create additional allowance only while contributions remain open and within the global ceiling.

This is a conditional market hypothesis, not a promise of profit or a guaranteed liquidity mechanism. It requires an executable external market price above total acquisition cost, sufficient market depth, continuing demand and fees/slippage that do not eliminate the margin. Resales may distribute ACROWN and increase trade activity, but may also create sell pressure. Trading volume is not the same as liquidity depth. The external market may trade below the ACS floor, and `F` does not guarantee an exchange/swap execution price. The programme must not promise profit, appreciation, listing, liquidity or adoption outcomes and must disclose these risks before contribution or purchase.

AstroCrown must not reward or facilitate wash trading, self-trading, circular wallet transfers presented as independent demand, spoofing, fabricated volume, coordinated price manipulation or misleading market-price displays. Transfer activity alone is not proof of genuine demand or durable liquidity. Any later programme to incentivize liquidity provision must be separately designed, explicitly funded, independently accounted for and risk-disclosed; it must not silently use supporter contributions or ACS reserve funds.

## 6. Payment intent and finality

The server creates an exact payment intent before a wallet signs a transfer. Each intent binds the member, independently verified source wallet, network, canonical token, exact treasury destination, exact base-unit amount, single-use intent ID, expiry and rules version. The client must construct only that authorized transfer.

**Ethereum:** verify the transaction and successful receipt; exact USD₮ contract; expected sender/treasury Transfer event and amount; canonical block evidence; approved finality. Ethereum JSON-RPC exposes receipts and block tags including `safe` and `finalized`.

**Tron:** verify transaction body and successful smart-contract receipt; exact TRC-20 contract, sender, treasury, Transfer event and amount; confirm solidified state via SolidityNode. Tron distinguishes broadcast acceptance, transaction body, execution receipt and solidified receipt. A broadcast response is not final confirmation.

**Solana:** verify transaction signature at `finalized` commitment; successful metadata; exact USD₮ mint/program; source token account owner, treasury destination token account/owner, exact amount and instruction/balance evidence. A token-account address is not interchangeable with its treasury owner address.

At least two independently operated RPC sources are required per enabled chain. Normalize and compare evidence from both. If providers disagree, are unavailable, exceed quotas, or cannot establish finality, keep the intent pending/blocked and fail closed. Never credit from a single unverified UI callback, explorer screenshot, wallet status or LLM output.

## 7. Data and accounting model

The D1 migration creates:
- one mainnet programme activation record with immutable 180-day timestamps;
- the approved USDT 1,000,000 aggregate contribution ceiling and the 25:1 multiplier/rules version;
- the 25,000,000-ACROWN shared purchase-capacity ceiling and current remaining capacity;
- the selected public-deployment event date at `00:00:00Z` and derived registration cutoff at `00:00:00Z` on the previous UTC date;
- an immutable record of frozen eligible wallets and append-only wallet-replacement/successor events preserving one entitlement lineage;
- members and unique usernames;
- independently verified chain wallets and short-lived challenges;
- network-specific contribution intents;
- finalized contributions unique by network + transaction hash + transfer/event index;
- personal entitlement balances and append-only entitlement events;
- separately recorded ACROWN purchases;
- append-only public accounting events, including gross ACS floor consideration credited to `V` and separately itemized network/Paymaster fees.

A contribution record preserves network, token identity, source wallet, treasury, amount/base units, transaction reference, event/instruction index, block/slot, finality evidence, provider agreement digest, timestamp and rules/multiplier version. Every entitlement calculation must be reproducible from stored inputs.

Never rewrite financial history. Corrections are compensating events. Database uniqueness prevents duplicate credit; atomic reservation/settlement prevents concurrent purchases from exceeding the personal allowance or global cap.

Public snapshots are dated, append-only, hashed and reconciled. GitHub may store intentionally public audit exports, but is not the live source of truth and must never hold secrets. On-chain explorer evidence must be paired with redacted receipts/invoices for off-chain spending.

## 8. Cloudflare architecture boundary

Use one Pages project and one public hostname for the homepage and `/supporters/`. Backend endpoints, once implemented, use same-origin `/api/supporters/*` paths. Do not expose a `workers.dev` staging URL as the public supporter address.

Pages Functions can use the repository's `functions/` directory and D1 bindings. Once Functions are present, a build-output `_routes.json` must route only API paths and exclude static assets. Cloudflare documents that otherwise all requests may invoke Functions and consume quota, including static asset requests.

Current published Workers Free limits include 100,000 requests/day, 10 ms CPU/request, 128 MB memory, 50 subrequests/request and six simultaneous outgoing connections. D1 Free publishes 5 million rows read/day, 100,000 rows written/day and 5 GB total storage; daily quota exhaustion causes D1 queries to fail. These are technical quotas, not an SLA or proof of financial-service suitability.

The already merged static Pages package remains a no-payment, no-backend preview and must keep its explicit publication allowlist. The staging Worker now has a separate `SUPPORTERS_DB` binding, independent from the account/test D1, and a read-only `GET /api/supporters/status` endpoint. It reports the mainnet programme as `PRELAUNCH`, validates the canonical Ethereum/Tron/Solana USD₮ token identifiers and six-decimal precision, and exposes only whether a treasury has been configured (never the treasury address itself). This status endpoint is publicly readable because it returns no account or member data. It cannot create members, wallet challenges, payment intents, transfers, contributions or entitlements; mainnet payment acceptance is hard-coded disabled in this release. The Supporter Programme page displays this live status. The dedicated D1 remains separate from all test-account identity and session data.

This foundation does not add payment endpoints or alter that boundary.

## 9. Activation gates

All gates below must pass before real payment acceptance:

1. The owner-approved multiplier is 25:1, the aggregate verified-contribution ceiling is USDT 1,000,000, and the maximum programme-wide purchase allowance is 25,000,000 whole ACROWN. The owner-specified ACS floor formula is `F = V/C`; the operational reserve valuation, circulating-supply measurement, ACROWN decimals, rounding rules, minimum first-contribution threshold, fee denominations and purchase settlement sequence still require qualification/approval.
2. Owner supplies and independently verifies the three public receiving treasury addresses. No private key is needed in source code or chat.
3. Treasury custody/signing, recovery, spending approvals, incident response and segregation from ACS reserve/prize funds are documented.
4. Canonical token contracts/mints and decimals are independently checked against mainnet state.
5. EVM, Tron and Solana wallet-control challenge verification is implemented and tested; username persistence and Solana delivery-wallet linking are operational. The UTC-midnight event date and preceding-day cutoff are enforced; the frozen eligible-wallet set is enforced; replacement-wallet migration preserves the original eligibility/entitlement lineage; and the dashboard presents server-derived global and wallet-specific rights, purchases and remaining capacity.
6. Exact payment intent construction, expiry, and amount enforcement are implemented and tested.
7. Chain-specific transfer parsers, finality, independent RPC agreement, failover, replay/duplicate prevention and controlled testnet fixture tests pass.
8. D1 migration, immutable activation, uniqueness, atomic accounting, backup and restore are qualified.
9. Public ledger, redacted expense evidence, reconciliation, quota monitoring, rate limits, abuse controls and automatic fail-closed pause are operational.
10. Privacy notices, final terms, support/contact route, applicable legal/jurisdictional review and independent security review are complete.
11. Cloudflare account Free/no-card state and actual Pages/Functions/D1 bindings are verified. Each RPC provider passes real no-card, commercial-use and provider-independence qualification. No paid automatic fallback.
12. Public page, treasury addresses, API origin, first activation timestamp, exact `F = V/C` purchase arithmetic and separately charged network/Paymaster fee path are reviewed before the first real payment is possible.

Until all gates are evidenced, `SUPPORTER_MAINNET_ENABLED` remains false, no treasury address appears publicly, and any payment route fails closed.

## 10. Owner-only inputs still required

These values cannot safely be invented:
- the three treasury receiving addresses;
- first-contribution threshold and evidence-based rationale;
- reserve/circulating-supply operational data sources, settlement snapshot, rounding/version rules and final ACROWN decimal precision;
- network gas/Paymaster fee currencies, quoting and capped-authorization rules, and exact collection path;
- official public-deployment event name and date (event begins at `00:00:00Z`; cutoff is previous UTC day `00:00:00Z`);
- exact post-cutoff recovery proof method when the former wallet cannot sign (while retaining automatic recognition and a simple guided replacement experience);
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
