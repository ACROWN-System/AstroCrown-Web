# Genesis Programme — Wallet-First Identity and Genesis Member Experience

**Owner decision date:** 18 November 2026  
**Status:** Authoritative product and implementation direction. The wallet-native identity schema and staging API are under implementation; payment acceptance remains disabled.  
**Supersedes:** Earlier user-facing descriptions of Genesis member registration, separate member login, pseudonym-based member accounts, email/passkey recovery, and contribution/supporter language.

## 1. Foundational rule: the wallet is the identity

Genesis does not create or register a conventional user account.

The primary wallet is simultaneously:
- the Genesis participant identity;
- the authentication and recovery anchor;
- the authority for that identity's own programme actions and attributable payment/purchase history;
- the root identity to which separately verified network addresses may be linked; and
- the wallet identity to which Genesis Member status and its badge attach after qualification.

The primary wallet does **not** own a personal purchase allowance. The ACROWN purchase allowance is one USDT-denominated pool shared by the entire Genesis Programme. Any eligible identity registered before the permanent cutoff may purchase from the entire remaining global pool; a single registered wallet may purchase all remaining programme capacity if it chooses and if inventory/ACS controls permit. Identity-specific payment and purchase events remain attributable and auditable, but they do not create an individual purchase cap.

There is no separate username/password account, email registration, legal-name profile, personal account recovery, passkey-based recovery or customer-support process that can move a Genesis identity, badge or wallet-linked history to a replacement wallet.

The application may issue a short-lived, server-side session after a fresh signed wallet challenge. That session is only an access mechanism for the already wallet-bound identity; it is not a separate account and cannot recover the wallet.

### 1.1 Primary wallet and chain-specific addresses

Ethereum, TRON and Solana addresses are distinct network-specific public addresses, even when derived or managed by the same multi-chain wallet application.

The first wallet address that proves control becomes the **primary wallet**. It is the sole Genesis login, account authority and recovery anchor. During initial profile setup, the owner may connect the same multi-chain wallet application on Ethereum, TRON and/or Solana and confirm the network addresses to include in one primary wallet profile. Each additional address must independently sign a fresh, domain-bound off-chain challenge before it is linked. The wallet application's brand, provider metadata or visual display of several addresses is not ownership evidence; the cryptographic proof is. An address is eligible to originate a qualifying payment only after it has been verified and registered for that same network. The payment's actual on-chain sender must match that pre-registered address, preserving the direct explorer link between the member's verified wallet profile and the payment. A linked address is not another identity and cannot log in, recover the account, rename the profile, manage entitlements or authorize Genesis actions. The primary wallet alone authorizes Genesis identity actions while those actions are open under the programme lifecycle. Profile and wallet-link mutations are frozen at the 24-hour pre-launch cutoff and do not reopen after launch. The Worker rejects state-changing requests unless the HTTP `Origin` exactly matches the configured official AstroCrown origin.

A linked Genesis address is a network-specific payment or delivery endpoint, not a recovery wallet. It cannot independently log in to, recover, rename or administer the primary Genesis identity. Genesis deliberately does not accept payments from unregistered one-time source addresses: the sender must first be independently verified and linked to the primary wallet profile. For the wider AstroCrown platform, optional auxiliary transaction wallets may be connected on demand without creating or registering another account. They never become alternate login/recovery identities, and each outgoing spend must be signed by the wallet that owns the source funds.  See [Primary Identity and Auxiliary Transaction Wallet Architecture](../account-continuity/PRIMARY-IDENTITY-AND-TRANSACTION-WALLET-ARCHITECTURE.md).

The first payment allowlist remains:
- Ethereum Mainnet — canonical USDT ERC-20;
- TRON Mainnet — canonical USDT TRC-20; and
- Solana Mainnet — canonical USDT SPL.

ACROWN delivery remains Solana-based. A delivery address distinct from the primary identity must prove control before delivery. The participant wallet only needs to receive the ACROWN SPL token; AstroCrown's separately authorized Solana signer submits the outgoing transfer. The participant wallet does not need to sign or send that delivery transaction. Wallet qualification is limited to one primary identity route, the ownership-proof route for each network address the participant intends to register for payment, and Solana token receipt. A wallet need not support all three payment rails, but it cannot originate a Genesis payment from a network address that it has not independently proved and registered. Wallet-vendor restore testing on every chain is not required.

### 1.2 Wallet backup and irreversible loss

The wallet provider's own recovery mechanism—such as its Secret Recovery Phrase or hardware-wallet recovery—is the only recovery path for the primary wallet.

AstroCrown and Genesis must never request, receive, store, transmit or ask a user to upload a seed phrase, private key, recovery phrase or hardware-wallet secret.

If the device is lost but the wallet is restorable from its own backup, the wallet holder restores it and proves control again. If the primary wallet and all of its recovery capability are irretrievably lost, access to that Genesis identity, its badge and its attributable activity history is lost. A linked address cannot take over the primary identity, and no private purchase allowance exists to transfer; the programme-wide pool remains shared among all other eligible pre-freeze identities. Genesis must not reassign the identity or badge to a newly created wallet based on a claim, email, display name, document or manual support request.

Exactly 24 hours before the scheduled official ACROWN launch, all Genesis activities enter a freeze, including new primary-wallet registration, qualifying payments, allowance-pool credits, purchase quotes, floor-price purchases, new wallet links and profile changes. The registration cutoff is permanent: Genesis does not resume or accept new primary-wallet registrations after the freeze or after ACROWN launches. During the freeze, read-only access and authentication/logout for existing identities may remain available.

After ACROWN is officially launched and the approved ACS pure-floor purchase facility is operational, only identities registered before the freeze may resume the approved qualifying-payment/new-right and floor-price-purchase activities. They all access the same programme-wide USDT allowance pool; no identity has a personal allowance. One eligible wallet may purchase the entire remaining pool, which closes the offer for everyone once the pool is fully consumed and ACROWN delivery is verified. If the shared pool is not exhausted, only the remaining global amount is subject to expiry at the end of the single 180-day post-launch window. That window starts only when both the official ACROWN launch and live qualified ACS floor-purchase availability have occurred. The dashboard must show the global pool earned, reserved, consumed and remaining, the identity's own payment/purchase history for audit, the registration-closure status and the global close date.

This consequence and the post-launch purchase-window rules must be explained before the primary wallet is confirmed.

## 2. Unique public display name and avatar

A newly verified primary wallet receives a randomly generated public display name and a generated avatar identity.

The display name is a public label only. It is not the identity credential, ownership of the programme-wide allowance pool, a wallet recovery method or a proof of legal identity.

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

## Participant-paid network fees and pre-payment disclosure

Before the registered wallet owner confirms either a Genesis qualifying payment or a later ACROWN floor-price purchase, the dashboard must show the exact USDT principal, canonical token, selected network, registered source address and exact receiving destination. The blockchain network fee must be shown as a separate amount/estimate in the network's required native fee asset or resources. The registered wallet owner bears that fee separately and must maintain sufficient fee balance/resources; the fee is never deducted from, added to, or netted against the USDT principal. The wallet's own fee confirmation is authoritative because estimates can change. The owner can cancel before signing.

The backend credits only the exact USDT principal received at the payment intent's destination. A transfer reduced by an exchange withdrawal fee, provider charge or other deduction must not receive a partial entitlement or be silently topped up. The interface must not present a combined figure that hides the distinction between USDT principal and network fee.

The two destinations must be unmistakably distinguished:
- a Genesis qualifying payment is received by the Genesis Programme treasury and is intended to fund the complete AstroCrown website frontend/backend launch; it is not automatically ACS reserve value V;
- a later ACROWN floor-price purchase sends its full exact USDT principal directly to the separately verified ACS reserve destination counted in V. The participant's network fee is paid separately by the registered wallet owner and does not reduce V or the floor F = V/C.

No payment action may become available until the disclosure has been displayed before the wallet-signing step and exact-principal behavior has passed qualification on the selected rail.

## 6. Financial sequence and terminology

Genesis is an investment/acquisition programme, not a charitable, donation, voluntary-support or fundraising programme. Public-facing product language must not describe payment as a contribution or donation, or call participants supporters.

Use:
- **qualifying payment** or **acquisition payment** for a payment that adds capacity to the shared Genesis-programme-wide purchase allowance pool;
- **Genesis programme-wide purchase allowance** for the shared USDT-denominated pool of purchase capacity available to any eligible pre-freeze registered identity;
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

Genesis—not the wallet application—detects and verifies completed payments. The participant wallet does not need to notify the website of a payment. A network address used for payment must, however, have been separately linked to the primary wallet profile by an accepted ownership proof on that network. Therefore, a TRON payment address requires a verified TRON address-link proof; a TRON native-send capability alone is not sufficient to register that address. The actual payment is then independently checked on-chain and its sender must match the registered address. A recipient wallet does not need to sign or submit the ACROWN delivery transaction; it must provide a verified Solana recipient address and receive the SPL token.

Provider adapters and synthetic tests are not approval. Exact installed app/extension builds still require a live primary-wallet signature check, confirmation of the selected native USDT payment route, and a Solana test-token receipt. Wallet-vendor recovery testing on all three chains is outside the Genesis qualification gate. MetaMask remains outside this first five-wallet wave; its earlier TRON dApp limitation is not regarded as a general disqualification under the narrowed payment-attribution model. Payment acceptance remains disabled.

## 10. Current hard stop

This implementation direction does not open Genesis payments. The development preview is display-only; all three mainnet network rows remain disabled. No live payment intent, entitlement credit, floor quote service, treasury transfer, ACROWN purchase, mint or delivery is activated by the schema, preview or API work described here.

Before activation, the relevant independent treasury-control, token-precision, RPC/finality, programme-terms, ACS model/version, inventory, payment reconciliation, purchase and delivery qualification gates must pass. Deployment, database migration, payment activation and PR merge remain separate owner decisions.
