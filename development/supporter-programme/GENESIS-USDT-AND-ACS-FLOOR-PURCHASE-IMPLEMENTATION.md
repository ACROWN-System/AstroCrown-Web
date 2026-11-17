# Genesis Programme — USDT Receipt and ACS Floor-Price Purchase Integration

**Status:** implementation specification; not an activation decision  
**Date:** 2026-11-17  
**Repository:** ACROWN-System/AstroCrown-Web

This specification defines the intended end-to-end payment and ACROWN delivery behavior. It does not enable mainnet payment acceptance, approve new economic terms, prove control of a treasury address, or authorize a token transfer or mint.

## 1. Supported payment asset and receiving networks

The initial payment asset is USD₮ (USDT), using the canonical token on each supported mainnet:

| Network | Token standard | Canonical USDT identifier | Genesis receiving address |
|---|---|---|---|
| Ethereum Mainnet | ERC-20 | 0xdAC17F958D2ee523a2206206994597C13D831ec7 | 0xbbb77071149a5F113Df15E78c58518917afa950A |
| TRON Mainnet | TRC-20 | TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t | TAKHQcuJ3RLsZZxCorWc3rav6M28dS6VTR |
| Solana Mainnet | SPL | Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB | AWyq9E7Wsdjv9VyoTs84XGiubQGZM7fETnZ8ddfArwkG |

USDT uses six decimal places on these rails, subject to live on-chain verification before activation.

"All supported assets" in this first release means the same USD₮ asset across these three chain-specific token implementations. It does not mean native ETH, TRX, SOL, BTC, other stablecoins, arbitrary SPL/ERC-20/TRC-20 tokens, wrapped assets, or bridged representations. A new asset requires its own canonical identifier, decimals, destination, valuation source, finality policy, reconciliation tests, and explicit approval.

Every receiving address is an owner-supplied public destination. Recording an address or validating its syntax is not proof of signing control, custody, recoverability, token-account readiness, or authority to spend the funds. All three network configuration rows remain disabled until their own verification gates pass.

## 2. Two distinct participant stages

The current programme model deliberately separates a contribution from an ACROWN purchase:

1. **Contribution / programme eligibility.** A verified participant sends the exact USDT amount in a chain-specific contribution intent to the designated Genesis receiving address. The service verifies the actual token transfer and finality, then credits a personal ACROWN purchase allowance under the immutable programme terms.
2. **Optional ACROWN purchase.** The participant later chooses an ACROWN quantity up to the unused allowance. The service quotes that quantity at the contemporaneous, approved ACS pure floor, creates a separate exact USDT purchase intent, verifies the purchase payment, and only then arranges delivery to the participant's independently verified Solana wallet.

A contribution is not itself an ACROWN purchase, does not automatically issue or transfer tokens, and must never be counted again as the purchase payment. The participant interface must show these as separate events, amounts, receipts, and balances before a participant confirms either transfer. The illustrative 25 ACROWN per USDT rate in existing tests is not an approved live programme multiplier.

## 3. Contribution receipt and allowance credit

For each contribution, the backend must create a single-use intent binding all of the following:

- authenticated, active, verified Genesis participant;
- independently verified source/payment wallet and network;
- exact canonical USDT token identifier and six-decimal base-unit amount;
- exact Genesis destination for that network;
- unique intent ID, creation time, expiry, and immutable programme-rules version.

The participant must initiate the transfer from their wallet and review the exact destination and amount. The website must not request an unlimited token approval. No payment button may imply that an amount has been received before chain verification.

A contribution is eligible for credit only after the chain-specific verifier confirms the successful finalized transfer, exact token, sender, destination, amount, transaction identity, and event/transfer index. Verification must reject partial payments, overpayments, wrong assets, wrong networks, wrong destinations, expired intents, replayed transactions, failed transactions, and ambiguous or reorganized chain state. A transaction/event identity is credited at most once.

The initial verification requirements are:

- **Ethereum:** successful receipt on Ethereum Mainnet; exact ERC-20 contract; matching Transfer event, sender, treasury destination and amount; canonical finalized/safe block policy.
- **TRON:** successful TRON Mainnet transaction; exact TRC-20 contract; matching Transfer event, sender, treasury destination and amount; solidified/finalized block evidence.
- **Solana:** finalized successful transaction; exact USDT mint and token program; source token account owned by the verified participant wallet; destination token account owned by the Genesis treasury address; exact token delta and transaction/inner-instruction evidence. A token-account address must not be mistaken for the wallet-owner address.

Use two independently operated RPC sources for transaction and finality verification on each chain. If sources disagree, required evidence is missing, the transaction is not finalized, or a provider is unavailable, the service must remain fail-closed and leave the contribution uncredited for reconciliation.

Allowance credit is a single atomic, idempotent operation: record the immutable contribution, append the entitlement event, and update the participant's earned allowance together. It must not be possible to create a contribution record without its matching allowance event or to credit the same transfer twice.

## 4. ACS pure-floor purchase price

The latest retrievable ACS core/governance scaffold establishes the pure-floor convention:

- Pure floor: F_pure = V_reserves / Q_defended.
- Q_defended is configured as circulating supply.
- The core function accepts reserve value denominated in BTC, so the floor output is BTC per ACROWN when its inputs are expressed in those units.
- The official pure floor excludes fees. Venue execution triggers may subtract fixed fees, percentage fees, gas and slippage, but those fee-adjusted triggers are not the official floor.

For a USDT-denominated Genesis purchase, the quote therefore needs a contemporaneous, approved BTC/USDT conversion:

USDT price per ACROWN = F_pure (BTC per ACROWN) × approved BTC/USDT quote.

The USDT due for a selected ACROWN quantity must be computed using exact integer/rational arithmetic and the approved ACROWN token decimals. Floating-point arithmetic is not acceptable for payment, entitlement, or settlement amounts. The exact rounding rule, quote precision, oracle quorum, divergence tolerance, maximum source age, and quote validity period must be fixed in a newly qualified ACS/Genesis rules version before activation; this specification does not invent those values.

Each immutable purchase quote must preserve at least:

- ACS engine release and governance-config version/digest;
- reserve valuation snapshot ID and timestamp;
- each approved reserve constituent, quantity, valuation source, price, and timestamp;
- total reserve value in the ACS common BTC numeraire;
- defended quantity and circulating-supply source/snapshot;
- resulting pure floor in BTC per ACROWN;
- BTC/USDT oracle sources, values, timestamps, quorum and divergence result;
- resulting USDT-per-ACROWN price and exact USDT base-unit total;
- ACROWN amount and decimals, Genesis delivery wallet, payment network and destination;
- quote creation/expiry and the immutable rule/rounding version.

A quote must be rejected when the ACS release is unapproved, any required reserve or supply input is stale or incomplete, oracle quorum is not met, the feeds diverge outside the approved tolerance, the supply snapshot is inconsistent, or the quote has expired. Recompute a new quote; never silently reprice an already confirmed purchase.

**Do not apply the provisional 35% roof-price uplift to a Genesis participant's purchase.** The roof price is a separate sell-side liquidity policy and its 35% baseline remains provisional pending renewed economic and Monte Carlo qualification. A Genesis participant's purchase quote uses the approved pure floor, not the roof and not an external venue's fee-adjusted execution trigger.

### ACS source basis and qualification status

The retrievable ACS core repository currently defines the pure floor in its README and in the core LCR function; its NOVA config sets pure/no-fees mode and circulating supply as defended quantity. The corresponding governance scaffold is marked approved on 2025-09-01. These are traceable source references for the mathematical convention, not evidence that a 2026 live reserve inventory, oracle configuration, or operational price feed has been requalified.

- ACS core README: https://github.com/haanmetric-wq/AstroCrown-ACS.core/blob/0d9c35a7bc13f8e5387b8e843f98342011ec2c97/README.md
- ACS core LCR function: https://github.com/haanmetric-wq/AstroCrown-ACS.core/blob/0d9c35a7bc13f8e5387b8e843f98342011ec2c97/src/lcr.py
- ACS pure-floor configuration: https://github.com/haanmetric-wq/AstroCrown-ACS.core/blob/0d9c35a7bc13f8e5387b8e843f98342011ec2c97/config/NOVA_CONFIG.yml
- Governance-approved scaffold: https://github.com/haanmetric-wq/AstroCrown-ACS.governance/blob/1e0710e560b65c6fe0d29b038c0b11199557260e/configs/NOVA_CONFIG_APPROVED.yml

A renewed 2026 ACS release, reserve valuation model, supply snapshot source, oracle configuration and qualification evidence are required before a live floor quote can be produced. The existing Python scaffold uses floating-point values and is not itself a production settlement implementation.

## 5. Purchase, payment and delivery sequence

After receiving a valid quote, the participant must explicitly confirm:

- selected ACROWN quantity and remaining personal allowance;
- floor-price version and quote expiry;
- exact USDT amount, chain, token and Genesis destination;
- their registered Solana ACROWN delivery wallet;
- that the purchase is separate from their earlier contribution.

The backend then reserves the requested allowance and any applicable programme/inventory capacity atomically, for a short bounded period. The reservation must be released on expiry, rejection or verified payment failure. Concurrent requests must not overspend personal allowance, programme cap or available ACROWN inventory.

The purchase payment is another exact USDT transfer and requires the same chain-specific token, sender, destination, amount, uniqueness and finality checks as a contribution. The purchase must reference its quote and its own unique payment intent. This requires a dedicated purchase-intent record or equivalent schema extension: the current contribution-intent table must not be reused to disguise a purchase as a contribution.

Only after the purchase payment is finalized and reconciled may the system create an ACROWN delivery instruction. Delivery must go from the approved ACROWN inventory/seller source to the participant's separately verified Solana delivery wallet. No automatic minting is implied or authorized by a contribution or purchase allowance.

The delivery verifier must confirm the exact ACROWN mint, token program, source, recipient wallet owner, amount, successful transaction and finalized signature. For Solana, it must verify the destination token account is for the approved ACROWN mint and is owned by the participant's registered delivery wallet. The participant's purchase is marked settled only after this verification. A pending, failed, ambiguous or mismatched transfer remains visibly pending/blocked and enters reconciliation; it must never be shown as delivered merely because a transaction was submitted.

The Genesis USDT receiving wallet and the ACROWN inventory/delivery wallet are distinct operational roles. The implementation must not infer that a USDT receiving address holds ACROWN or that an ACROWN inventory wallet is authorized to receive participant USDT.

## 6. Required records and audit controls

The current schema provides contribution intents, immutable contributions, entitlement balances/events, purchase records, and append-only public-ledger events. Before purchase execution is implemented, add a versioned migration for purchase intents and complete floor-quote evidence, including the exact receiving destination, participant wallet, quote digest/snapshot, expiry, rules version, payment transaction/event identity and reservation status.

The service must preserve:

- immutable original chain evidence and provider-agreement/source digest;
- a unique constraint on each network + transaction hash/signature + transfer/event index;
- idempotent processing and safe retry behavior;
- atomic allowance reservation/consumption and inventory reservation;
- append-only financial events and compensating corrections rather than editing confirmed history;
- explicit states for created, submitted, verifying, payment-confirmed, delivery-pending, settled, rejected, expired, blocked and reconciliation-required;
- a participant receipt that links contribution, allowance, purchase quote, purchase payment and ACROWN delivery without exposing other participants' private records.

The service must never store or request participant seed phrases or private keys. Treasury and ACROWN inventory signing authority must use separately qualified owner-controlled custody/signing arrangements; wallet-control proof alone is not transaction authority.

## 7. Activation gates

Keep every network disabled and payment acceptance false until all applicable gates pass:

1. **Treasury control:** verify the Ethereum, TRON and Solana Genesis receiving addresses on the correct mainnets using fresh, domain-bound proof challenges and an offline review trail. The current Ethereum/TRON proof artifacts do not by themselves record server-verified custody; the Solana treasury proof flow is still required.
2. **Inbound asset correctness:** independently verify each canonical USDT token identifier, six-decimal precision, network identity, receiving address and Solana treasury token-account readiness against live mainnet data.
3. **Finality and reconciliation:** qualify two independent RPC sources, chain-specific finality/reorg handling, Transfer evidence, duplicate detection and failure/retry behavior for each chain.
4. **Programme terms:** approve the contribution multiplier, minimum contribution threshold, any contribution ceiling, global ACROWN cap or no-cap policy, additional-contribution rules, 180-day activation time and exact rounding rules. The illustrative 25:1 value is not an approved live term.
5. **ACS floor:** publish a renewed qualified ACS version covering reserve constituents and quantities, common numeraire, circulating-supply source, oracle quorum, feed tolerance/staleness, price snapshot, rounding and quote expiry.
6. **ACROWN delivery:** identify the deployed Solana ACROWN mint, token program and decimals; verify available inventory; prove control of the delivery source; qualify the signer/approval procedure; and test finality and recipient-owner checks. No mint address or delivery authority may be guessed.
7. **End-to-end qualification:** run local deterministic tests and controlled testnet simulations for each chain, then verify contribution credit, purchase quoting, payment reconciliation, allowance reservation, inventory reservation, failed delivery, retry, duplicate and compensation scenarios.
8. **Operational and legal review:** qualify custody, incident response, accounting, participant terms, disclosures, jurisdictional eligibility and production secrets before any mainnet activation.

Activation is an explicit owner-governed step after evidence review. Merging code, recording an address, passing local tests or deploying a Worker must never activate payment acceptance automatically.

## 8. Current implementation boundary

At the time of this specification:

- the three owner-supplied USDT receiving addresses and canonical token identifiers are recorded in the proposed configuration;
- all three networks remain disabled;
- registration and off-chain wallet ownership proofs exist, with Solana-only ACROWN delivery-wallet roles;
- deterministic allowance arithmetic and database structures exist;
- there is no production payment-intent API, chain settlement/reconciliation service, floor-price quote service, purchase-intent service, inventory reservation service or ACROWN delivery service;
- there is no qualified 2026 ACS price snapshot provider in the Genesis Worker and no verified ACROWN mint/inventory/signer configuration.

No remote D1 migration, remote Worker deployment, mainnet payment, payment acceptance, token approval, transfer, mint or treasury activation is performed by this specification.
