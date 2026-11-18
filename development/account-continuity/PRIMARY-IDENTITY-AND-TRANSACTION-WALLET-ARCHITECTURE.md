# Primary Identity and Auxiliary Transaction Wallet Architecture

**Owner direction recorded:** 18 November 2026  
**Status:** Architecture decision for future AstroCrown account, exchange and swap development.  
**Relationship to Genesis:** Compatible with the wallet-first Genesis identity. This document extends the model beyond Genesis payment wallets; it does not activate payments or authorize custody.

## 1. Decision

Each AstroCrown account has exactly one **primary identity wallet**. It is the only wallet that can authenticate/sign in to the account, authorize account-level changes, and act as the account's identity and recovery anchor.

An account may use up to two additional **auxiliary transaction wallets** in the initial user experience. These are not separately registered accounts, members or identities. They do not create another login, username, entitlement owner, Genesis identity, governance identity or recovery path.

Auxiliary wallets connect when needed to send or receive an asset. They may be connected temporarily for one transaction; an optional remembered public-wallet shortcut may be added later. Connecting an auxiliary wallet must not require a second account-creation or registration flow.

The data model should not hard-code the two-wallet limit. The first release may expose two auxiliary connection slots, while the underlying wallet-connection model remains capable of a configurable number of connections.

## 2. Authority boundaries

| Action | Primary identity wallet | Auxiliary transaction wallet |
|---|---|---|
| Sign in to AstroCrown | Yes | No |
| Recover or replace the account identity | Only through the primary wallet's own wallet recovery | No |
| Change account-level settings | Authorizes through the primary account session | No |
| Add/remove a remembered auxiliary-wallet shortcut | Authorizes the account-level change | May prove control when a saved ownership link is requested |
| Send an asset from that wallet | Only if it is also the selected source wallet and signs that transaction | Must connect and sign its own transaction |
| Receive an asset | May be selected as a destination | May be selected as a destination |
| Own the AstroCrown account or Genesis entitlement | Yes | No |
| Sign in independently or become an alternate recovery key | No other wallet is granted this role | Never |

**Critical security rule:** signing in with the primary wallet does not give AstroCrown, the primary wallet, or the account session the cryptographic ability to spend from an auxiliary wallet. The auxiliary wallet itself must approve and sign each outgoing transaction. AstroCrown must never ask for or store an auxiliary wallet's seed phrase, private key, extended private key or signing secret.

The primary wallet authorizes the account's use of the application. The selected transaction wallet authorizes movement of its own assets. These are separate permissions.

## 3. Connected does not mean registered

Use three distinct concepts in code and product language:

1. **Primary identity wallet** — durable account identity and login authority.
2. **Connected transaction wallet** — an optional provider/address currently connected for a selected transaction. It can be disconnected without affecting the account.
3. **Transaction endpoint** — the source or destination address recorded against one particular payment, swap, deposit or withdrawal intent.

A transaction endpoint does not automatically become a reusable linked wallet. A completed transfer records its real on-chain source and destination addresses as transaction evidence. It does not create another account or grant future login/recovery rights.

An optional future "Remember this wallet" feature may store public metadata and verified addresses under the primary account. It remains an auxiliary connection, not a second registered identity. Do not store xpubs, output descriptors, seed phrases, private keys or wallet backups in the account database.

## 4. Send and receive behaviour

### Sending from an auxiliary wallet

1. The user signs in with the primary identity wallet.
2. The user selects an asset and source network, then connects the auxiliary wallet that actually holds the asset.
3. The chain adapter reads the selected address and verifies the network. The UI displays the exact source, asset, amount, destination, estimated network fee, swap/bridge fees where relevant, and expiry/slippage limits.
4. The backend creates a single-use transaction intent bound to the primary account, selected source address, chain, canonical asset identifier, amount, destination, route and expiry.
5. The auxiliary wallet independently presents and signs the transaction. Its provider must not receive an unsigned or ambiguous payload that can change destination, amount, token or spending authority without a fresh user confirmation.
6. The wallet's broadcast response or transaction hash only starts tracking. Independent chain verification decides whether the transaction succeeded, finalized and matches the intent.
7. The resulting transaction record belongs to the primary account's activity history, while the actual source address remains the auxiliary transaction endpoint.

A primary-wallet signature must not be substituted for the source wallet's transaction signature.

### Receiving into an auxiliary wallet

The user may connect a wallet to obtain the receiving address, or enter a public destination address. No transaction signature is needed merely to receive an asset. The UI must show and require confirmation of the exact network and address before funds are sent.

For an account-owned, reusable withdrawal or Genesis delivery address, request a suitable ownership proof where the chain/wallet supports it. A one-time destination used to pay another person need not be misrepresented as an account-owned wallet. Wrong-chain or malformed addresses must be rejected.

### Payment attribution

For general AstroCrown transaction flows, a one-time payment may bind the connected source address to a server-created intent and verify the actual sender from chain evidence. **Genesis is an explicit stricter exception:** a payment source must first be independently verified and registered in the member's primary wallet profile. No unlinked one-time payment source is accepted for Genesis. A chain transaction's cryptographic authorization proves that the sender authorized that transfer; a wallet callback, screenshot, explorer URL or client-supplied success flag is not.

For general non-Genesis transaction flows, a native TRON transfer may be attributed from chain evidence without a separate address-link proof if the transaction intent securely binds its source. Genesis does not use that exception: a TRON address must pass the TRON address-link challenge before it can originate a qualifying payment.

## 5. Chain and asset extensibility

Do not build a single universal wallet that assumes every chain uses the same address, signature or transaction format. Implement a wallet-provider adapter layer and a separate chain/asset adapter layer.

### Wallet-provider adapter

A provider adapter is responsible for:
- discover/connect/disconnect;
- expose supported chain accounts and addresses;
- report the actual network/chain identity;
- request the chain's supported off-chain message proof when needed;
- construct/request signatures for chain-native transactions;
- expose provider capabilities and version/platform metadata.

### Chain adapter

A chain adapter is responsible for:
- address parsing and canonicalization;
- chain/network identification;
- canonical asset identification and precision;
- transaction and fee construction/decoding;
- signature and transaction validation;
- broadcast/lookup and finality semantics;
- deterministic transaction evidence and reconciliation.

### Asset registry

An asset must be identified by its chain and canonical contract/mint/native-asset identifier, never by ticker or icon alone. For example, native BTC, wrapped BTC on an EVM chain, and a bridged Bitcoin representation are different assets and must never be conflated.

Initial chain families to support incrementally:
- EVM accounts and ERC-20 assets;
- Solana accounts and SPL assets;
- TRON accounts and TRC-20 assets;
- Bitcoin native UTXO assets.

Bitcoin is not an EVM token network. For Bitcoin, use Bitcoin-aware message/transaction standards where supported: BIP-322 provides a generic signed-message format, and PSBT (BIP-174) provides a standard partially signed transaction format for wallet signing. Wallet support varies by application and address/script type, so the exact route must be tested; never assume that a generic EVM `personal_sign` call works for BTC.

Solana's current guidance distinguishes standardized off-chain messages (`solana:signOffchainMessage`) and raw `solana:signMessage`, and recommends the standardized format where supported. The chain adapter should negotiate the strongest mutually supported safe capability rather than assuming one method exists in every wallet.

## 6. Exchange and swap use

The same architecture supports a non-custodial exchange/swap flow:

- the primary wallet authenticates the person and owns the AstroCrown account/session;
- the user selects an auxiliary source wallet for the asset they wish to exchange;
- a route/quote service proposes the exact source and destination chain/assets, recipient, amount, rate, fees, expiry and slippage limits;
- the source wallet signs the source-chain transaction;
- the recipient wallet/address is selected independently and may be one of the user's other connected wallets;
- chain adapters independently reconcile source execution and destination settlement;
- the account records the trade, but never obtains the auxiliary wallet's private keys.

For a cross-chain route, source-chain confirmation does not prove destination-chain settlement. The route remains pending until the destination asset is independently observed and reconciled. If a route fails after source funds move, the system must follow the route provider's explicit refund/recovery state rather than crediting an assumed destination amount.

This is a non-custodial transaction-wallet model. If AstroCrown later chooses to hold customer assets or sign transactions from platform-controlled keys, that is a materially different custodial architecture requiring its own security, treasury segregation, operational and legal review.

## 7. Minimal implementation path

1. **Preserve the primary identity system.** Keep the current primary-wallet sign-in and account session; do not create alternate login wallets.
2. **Generalize connected-wallet state.** Add a client-side collection of transaction-wallet connections containing provider ID, platform, chain, address, capabilities and connection/session status. Start with a maximum of two auxiliary connections in the UI; keep the data model configurable.
3. **Do not make auxiliary wallets accounts.** Do not add auxiliary connection rows to the primary identity table or award account/Genesis status to them. Store actual source/destination addresses against transaction intents and immutable transaction records. Add an optional public-metadata-only saved-wallet table only if a remembered-wallet UX is approved.
4. **Define capability contracts.** Add feature flags such as `connect`, `getAddresses`, `signMessage`, `signTransaction`, `sendTransaction`, `signPsbt`, `receiveAddress`, `networkIdentity`. A wallet can qualify for the capabilities it supports; it is not rejected for lacking unrelated APIs.
5. **Reuse existing chain evidence.** Connect the existing Ethereum/TRON/Solana evidence parsers and two-operator reconciliation foundation to server-created intents. Do not create another payment verifier for each wallet brand.
6. **Implement one source-transaction workflow.** The selected auxiliary wallet signs the exact intent-bound transaction; the server derives the actual sender and checks it against the intent, then verifies exact asset/amount/destination/finality/uniqueness.
7. **Add Bitcoin as a separate chain adapter.** Begin with BTC address/network validation, receive-address confirmation, BIP-322 proof where available, PSBT transaction construction/signing, and independent Bitcoin confirmation/reorg handling. Qualify actual wallet providers individually.
8. **Extend to new chains/assets by adapter.** Add a chain only after canonical asset IDs, RPC/indexer evidence, finality, wallet transaction signing and recovery/failure behavior have tests.

## 8. Security and privacy rules

- The primary wallet is the only account login/recovery authority.
- Auxiliary wallets never become alternate accounts or silently inherit account privileges.
- Each outgoing spend is approved by the wallet that owns the source funds.
- A logged-in account session alone cannot initiate a spend from a disconnected auxiliary wallet.
- Always display the exact chain, asset, amount, source, destination, fees, route and expiry before wallet approval.
- Reject network mismatch, wrong token contract/mint, unexpected approvals, changed recipients, insufficient fee funding, stale quotes and expired intents.
- Use unique intent IDs and idempotency keys; a transaction hash plus event/output index is unique per chain.
- Distinguish source confirmation from destination settlement for swaps/bridges.
- Do not collect seed phrases, private keys, extended private keys, recovery files or wallet descriptors.
- Store only the minimum public wallet/transaction metadata needed for an explicit feature, and explain public-chain visibility.

## 9. Relationship to current Genesis implementation

The current Genesis implementation already provides a primary wallet identity, signed optional wallet-link challenges, a Solana delivery-wallet role, sessions, wallet-bound entitlement, public acquisition records and a read-only Ethereum/TRON/Solana payment evidence foundation.

The general platform design should reuse the primary identity/session and chain-adapter foundations, but must not confuse Genesis's reusable linked-address records with the future lightweight transaction-wallet connection model.

Specific outstanding Genesis work remains:
- payment-intent endpoint and immutable intent lifecycle;
- one-time payment-source binding for general transaction flows, with Genesis explicitly requiring pre-registration of each payment address in the primary wallet profile;
- live independently operated RPC adapter/registry and payment writer;
- atomic wallet-bound entitlement events and payment directory writes;
- ACS floor quote/purchase workflow and separately reconciled Solana ACROWN delivery.

No payment acceptance, account wallet limit, Bitcoin adapter, exchange route, swap route, custody service or additional wallet persistence is activated by this architecture decision.

## References

- Bitcoin BIP-322 Generic Signed Message Format: https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki
- Bitcoin BIP-174 Partially Signed Bitcoin Transaction Format: https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki
- Solana message signing and authentication: https://solana.com/docs/frontend/messages-and-auth
