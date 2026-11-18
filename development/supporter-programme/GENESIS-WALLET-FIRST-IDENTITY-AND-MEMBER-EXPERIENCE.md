# Genesis Programme — Wallet-First Identity and Genesis Member Experience

**Owner decision date:** 18 November 2026  
**Status:** Authoritative product and implementation direction. The wallet-native identity schema and staging API are under implementation; payment acceptance remains disabled.  
**Supersedes:** Earlier user-facing descriptions of Genesis member registration, separate member login, pseudonym-based member accounts, email/passkey recovery, and contribution/supporter language.

## 1. Foundational rule: the wallet is the identity

Genesis does not create or register a conventional user account.

The primary qualifying wallet is simultaneously:
- the Genesis participant identity;
- the authentication and recovery anchor;
- the owner of every Genesis purchase entitlement, allowance and associated acquisition record;
- the root identity to which separately verified network addresses may be linked; and
- the wallet to which Genesis Member status and its badge attach after qualification.

There is no separate username/password account, email registration, legal-name profile, personal account recovery, passkey-based recovery or customer-support process that can move an entitlement to a replacement wallet.

The application may issue a short-lived, server-side session after a fresh signed wallet challenge. That session is only an access mechanism for the already wallet-bound identity; it is not a separate account and cannot recover the wallet.

### 1.1 Primary wallet and chain-specific addresses

Ethereum, TRON and Solana addresses are distinct network-specific public addresses, even when derived or managed by the same multi-chain wallet application.

The first wallet address that proves control becomes the **primary wallet**. It is the sole Genesis login and recovery anchor. Additional chain addresses are required only when they are actually used: a payment source is attributed through its server-created payment intent and independently verified on-chain transfer; a separate Solana delivery address must prove control before ACROWN is sent to it. A payment-source address does not automatically become a login or recovery wallet. The primary wallet authorizes identity changes and further address links. The Worker rejects state-changing requests unless the HTTP `Origin` exactly matches the configured official AstroCrown origin.

A linked address is a payment or delivery address, not a recovery wallet. It cannot independently log in to, recover or transfer the primary wallet identity.

The first payment allowlist remains:
- Ethereum Mainnet — canonical USDT ERC-20;
- TRON Mainnet — canonical USDT TRC-20; and
- Solana Mainnet — canonical USDT SPL.

ACROWN delivery remains Solana-based. A delivery address distinct from the primary identity must prove control before delivery. The participant wallet only needs to receive the ACROWN SPL token; AstroCrown's separately authorized Solana signer submits the outgoing transfer. The participant wallet does not need to sign or send that delivery transaction. Wallet qualification is limited to the actual identity route, a selected USDT payment route and Solana token receipt; dApp signing on every payment chain and wallet-vendor restore testing on every chain are not required.

### 1.2 Wallet backup and irreversible loss

The wallet provider's own recovery mechanism—such as its Secret Recovery Phrase or hardware-wallet recovery—is the only recovery path for the primary wallet.

AstroCrown and Genesis must never request, receive, store, transmit or ask a user to upload a seed phrase, private key, recovery phrase or hardware-wallet secret.

If the device is lost but the wallet is restorable from its own backup, the wallet holder restores it and proves control again. If the primary wallet and all of its recovery capability are irretrievably lost, the Genesis identity, access, entitlement, badge and rights associated with that wallet are lost. Genesis must not reassign those rights to a newly created wallet based on a claim, email, display name, document or manual support request.

This consequence must be explained before the primary wallet is confirmed.

## 2. Unique public display name and avatar

A newly verified primary wallet receives a randomly generated public display name and a generated avatar identity.

The display name is a public label only. It is not the identity credential, an entitlement, a wallet recovery method or a proof of legal identity.

The wallet holder may customize the name after proving control of the primary wallet. Names must be globally unique:
- comparison is case-insensitive after Unicode compatibility normalization and whitespace normalization;
- the server enforces uniqueness in the database, not only in browser code;
- a name is reserved atomically when the signed change succeeds;
- names already claimed, reserved official terms, impersonation attempts and invalid characters are rejected;
- the availability indicator is green with an explicit “Available” message when the name can be claimed, and red with an explicit “Unavailable — already in use” message when it cannot.

A browser availability check is advisory; the final database uniqueness constraint is authoritative and handles simultaneous claims. A display-name change does not change wallet ownership, acquisition history, entitlement, badge status or public transaction history.

## 3. Genesis Member: special honorific status

Ordinary participation in the AstroCrown and Space Empire communities is not the special Genesis distinction.

**Genesis Member** is a separate, prestigious and honorific status earned by the qualifying wallet under the final published Genesis Programme rules. Once awarded, it is displayed prominently beside the wallet's public name and avatar throughout the AstroCrown ecosystem.

The official visual insignia is the gold DNA double-helix badge:
- master asset: `preview/assets/genesis-member-dna.svg`;
- transparent outer canvas, so it can overlay dark, light and themed interface backgrounds;
- the emblem's dark celestial centre is part of the badge artwork;
- use the same recognizable insignia in profiles, public Genesis payment records, posts, group discussions and other member surfaces.

The badge is only awarded after the wallet completes the qualification conditions and the relevant qualifying payment is independently verified and finalized. Connecting or verifying a wallet alone does not create Genesis Member status.

The badge belongs to the wallet identity. It is not transferable, does not follow a renamed public label to another wallet, and is not an activity or popularity reward. Posting frequency, group participation, reputation points or inactivity must not create or remove the Genesis distinction. Any suspension or revocation must be based on explicitly approved programme rules and recorded as an auditable status change.

## 4. Future Genesis Member privileges

Genesis Member status is intended to recognize a distinguished group and may become the eligibility key for future privileges, such as:
- priority access to selected future AstroCrown programmes;
- preferential pricing or discounts on eligible services;
- early access to selected products, features or initiatives; and
- invitations to selected events or activities.

These are planned possibilities, not present promises. Each privilege remains `PLANNED` until the owner approves its scope, eligibility, duration, exceptions, terms and delivery method and the rules are published. Do not advertise an unapproved discount, priority right, allocation or financial return as already available.

## 5. Public Genesis payment directory and explorer transparency

The public directory may show:
- the wallet's unique public display name and generated avatar;
- the gold Genesis Member badge after qualification;
- the verified payment amount and asset;
- the network;
- whether the record is a qualifying payment or a separate ACROWN floor-price purchase; and
- a deterministic link to the relevant public explorer.

Explorer destinations are fixed by network and generated only from validated chain identifiers and transaction hashes:
- Ethereum — Etherscan;
- TRON — TronScan; and
- Solana — Solscan.

The directory need not print the full address in the visible row. However, opening the explorer link exposes the source wallet address and the associated public on-chain transaction details/history. This is inherent to public blockchains. A pseudonymous display name does not anonymize the wallet or its on-chain activity.

Before a wallet initiates its first qualifying payment, the interface must clearly disclose that the explorer link makes the full wallet address and public transaction history discoverable. The page must not imply that omitting an address from the directory makes the activity private.

The explorer link is a human-readable public receipt, not the authority that grants a purchase entitlement. Genesis backend verification remains authoritative and must independently verify the correct mainnet, official USDT contract/mint, source wallet, receiving treasury, exact amount, transfer/event identity, payment intent, transaction success, finality and uniqueness. A user-submitted hash only starts reconciliation; it never immediately credits an entitlement.

Payment records are append-only. Any correction must be a separate correction/reconciliation event; the original verified record must not be silently edited or deleted.

## 6. Financial sequence and terminology

Genesis is an investment/acquisition programme, not a charitable, donation, voluntary-support or fundraising programme. Public-facing product language must not describe payment as a contribution or donation, or call participants supporters.

Use:
- **qualifying payment** or **acquisition payment** for the first payment that establishes the wallet's purchase entitlement;
- **ACROWN purchase entitlement** or **purchase allowance** for the wallet-bound right/maximum capacity to buy;
- **floor-price purchase** for the later, separate purchase of ACROWN at the qualified ACS pure floor;
- **acquisition record** and **verified on-chain payment** for the public audit trail;
- **Genesis Member** for the special honorific status.

The qualifying payment and later floor-price purchase are distinct transactions and must remain separate in the records, dashboard, directory and receipts. The first payment does not itself issue or deliver ACROWN. The subsequent purchase must use a contemporaneous, approved ACS pure-floor quote and separately verified payment; delivery is a later, separately reconciled event to the verified Solana delivery wallet.

No public copy may imply guaranteed profit, a guaranteed resale price, guaranteed liquidity or an inevitable market-price premium. A difference between an ACS floor purchase price and a market price is not a guaranteed return; market prices, available liquidity, spreads, execution costs and venue rules can change.

## 7. Public experience

The intended sequence is:
1. Connect a qualified primary wallet on a supported mainnet.
2. Sign a clearly labelled, domain-bound off-chain ownership challenge. It must not ask for a transaction, token approval, transfer or payment.
3. The server establishes or accesses the wallet-native Genesis identity and assigns a unique random display name and avatar.
4. The wallet holder may customize the public display name after a green availability check and a fresh primary-wallet signature.
5. The backend attributes a qualifying payment to the active identity using its payment intent and independently verified chain transaction; a separate Solana delivery address is proved before it is used.
6. After all programme terms and network checks are approved, the wallet may initiate its qualifying payment.
7. The backend verifies the transfer and records the entitlement against the primary wallet.
8. The Genesis Member badge is awarded once the published qualification and finality requirements pass.
9. The public directory shows the public name, amount, network and explorer link with the explicit wallet-address disclosure.
10. A later, separate floor-price purchase consumes the wallet's entitlement; the subsequent Solana delivery is independently verified and receipted.

There is no conventional registration step, separate login identity, or independent recovery account in this sequence. Reconnecting the primary wallet proves the same identity.

The staging environment must provide a randomly generated secret of at least 32 characters as `GENESIS_RATE_LIMIT_HMAC_KEY` or `RATE_LIMIT_HMAC_KEY`; the local-only development fallback is never suitable for staging or production.

## 8. Technical implementation and compatibility boundary

The wallet-native schema and staging API are introduced by:
- `development/account-continuity/worker/migrations/supporters/0004_genesis_wallet_native_identity.sql`;
- canonical mirror `development/supporter-programme/migrations/0004_genesis_wallet_native_identity.sql`;
- `development/account-continuity/worker/src/genesis.js`; and
- `preview/supporters/supporters.js`.

The new `/api/genesis/*` identity endpoints implement primary-wallet challenges, verification, access sessions, separately verified address linking, signed display-name changes, name availability and the read-only public directory. The former user-facing `/api/supporters/*` registration/login endpoints are retired with HTTP 410; the legacy status alias is retained only for migration compatibility.

Historical database names such as `supporter_*`, the `SUPPORTERS_DB` binding, old migration paths and the existing `/supporters/` preview route are legacy technical identifiers. Their names do not authorize using “supporter” or charitable language in the product.

The public directory reads finalized, immutable records only. No public endpoint accepts or creates a payment, issues entitlement, changes badge status, authorizes a transfer, or performs token delivery in this staging build.

## 9. Wallet application qualification

The current five-wallet qualification wave is Bitget Wallet, TokenPocket, Coin98, OKX Wallet and Trust Wallet. Their acceptance is based on three practical functions: establish a verified primary wallet identity through one supported signing route; enable a holder-selected USDT transfer on at least one supported payment rail; and provide a verified Solana address capable of receiving ACROWN SPL tokens. The five-wallet scope, use-case gates and practical test plan are maintained in [GENESIS-WALLET-COMPATIBILITY.md](./GENESIS-WALLET-COMPATIBILITY.md), [GENESIS-WALLET-PRACTICAL-QUALIFICATION-PLAN.md](./GENESIS-WALLET-PRACTICAL-QUALIFICATION-PLAN.md) and [genesis-wallet-compatibility.json](./genesis-wallet-compatibility.json).

Genesis—not the wallet application—detects and verifies completed payments. The participant wallet does not need to notify the website of a payment, expose a dApp provider on all three payment networks, or sign a TRON challenge merely because a TRON transfer is used. The TRON transaction is attributed through the payment intent and independently verified chain evidence. Likewise, a recipient wallet does not need to sign or submit the ACROWN delivery transaction; it must provide a verified Solana recipient address and receive the SPL token.

Provider adapters and synthetic tests are not approval. Exact installed app/extension builds still require a live primary-wallet signature check, confirmation of the selected native USDT payment route, and a Solana test-token receipt. Wallet-vendor recovery testing on all three chains is outside the Genesis qualification gate. MetaMask remains outside this first five-wallet wave; its earlier TRON dApp limitation is not regarded as a general disqualification under the narrowed payment-attribution model. Payment acceptance remains disabled.

## 10. Current hard stop

This implementation direction does not open Genesis payments. The development preview is display-only; all three mainnet network rows remain disabled. No live payment intent, entitlement credit, floor quote service, treasury transfer, ACROWN purchase, mint or delivery is activated by the schema, preview or API work described here.

Before activation, the relevant independent treasury-control, token-precision, RPC/finality, programme-terms, ACS model/version, inventory, payment reconciliation, purchase and delivery qualification gates must pass. Deployment, database migration, payment activation and PR merge remain separate owner decisions.
