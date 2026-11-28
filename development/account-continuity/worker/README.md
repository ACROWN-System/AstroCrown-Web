# AstroCrown account staging Worker

This Worker implements the wallet-first account model for the AstroCrown public staging environment. It is a staging qualification build, not the production commercial service.

## Identity model

- Each ordinary AstroCrown account has exactly one permanent, immutable primary EVM externally owned wallet identity. It is the sole account owner and sign-in authority; no owner-wallet replacement, ownership transfer, alternate recovery, or administrator override exists.
- Losing access to the designated owner wallet permanently loses access to the AstroCrown account. AstroCrown provides no account-recovery process or alternate route back into the account. If the user independently regains control of the exact same wallet through that wallet's own software or backups, they may sign in normally; AstroCrown does not restore or recover the account. The Worker stores only its public address, chain identifier, account linkage, timestamps and authentication metadata.
- Optional additional wallets are separate capability extensions. Their owner-authorized linking requires a fresh EIP-191 proof from both the permanent owner wallet and the additional wallet. The user also explicitly authorizes only the wallet-capabilities-only scope; no transaction, asset transfer, token approval, payment or spending authority is granted.
- The browser discovers wallet providers using EIP-6963, with an EIP-1193 fallback. The user chooses a provider and, when more than one address is available, chooses the address to use. The application does not silently choose the first provider or account.
- Account creation requires two independent server-verified acknowledgements: acceptance of the current Terms of Use and Privacy Policy, and acknowledgement of the owner-wallet-loss acknowledgement. Their versions and timestamps are stored with the account.
- Authentication uses a fresh, short-lived, single-use, origin-bound EIP-191 personal-sign challenge. A sign-in signature proves wallet control only. It does not authorize a blockchain transaction, token approval, transfer, payment or spending permission.
- AstroCrown never requests or stores a wallet private key, seed phrase, mnemonic or recovery words.

## Immutable owner-wallet lifecycle

There is no AstroCrown account-recovery, owner-wallet replacement or ownership-transfer process. If the designated owner wallet is lost, account access is permanently lost. Additional wallets cannot sign in, recover access, become owners or replace the owner wallet. Disconnecting the owner wallet is a session logout only: the server deletes the current session and clears its cookie while preserving the immutable owner-wallet record.

Additional linked EVM wallets can be unlinked at any time. Unlinking sets the wallet inactive and clears its AstroCrown permission authorization. The same wallet may be linked again later, but only after fresh owner-wallet and additional-wallet signatures over a new one-use challenge and fresh explicit wallet-capabilities authorization. Previous permissions do not reactivate. An unlink does not revoke external on-chain token approvals or smart-contract permissions; those require their own on-chain revocation transactions.

The wallet-only schema migration adds versioned wallet-loss acknowledgement fields, expires sessions for obsolete non-wallet accounts, deletes disposable passkey-only test accounts that are not tied to immutable governance audit records, and removes the obsolete passkey/recovery-key authentication tables and routes. Immutable governance audit references are retained rather than silently deleted.

## Genesis Programme relationship

Genesis is a programme profile and entitlement set attached to the signed-in AstroCrown account. It is not a second user account and does not have its own login, recovery key, session cookie or authentication route.

The Worker passes the already-authenticated AstroCrown account ID and its primary wallet to the Genesis API. A Genesis profile is resolved or created from that primary wallet; the profile is keyed to the AstroCrown account ID for new registrations. Additional Ethereum, TRON or Solana addresses may be linked to that same profile after an independent, fresh off-chain ownership proof. They are not alternate sign-in identities.

The programme database remains separate from the ordinary account database because it stores programme profile, allowance, payment-evidence and public-ledger records. This is data separation, not account separation. The legacy supporter login endpoints return HTTP 410 and no longer create a separate member session. Legacy financial-reference tables are retained as historical data structures; they are not an active account or sign-in system.

## Payment and automation safety

Payment intake, qualifying payment acceptance, floor-price purchases and automatic token issuance remain disabled. A normal account login or secondary-address signature never authorizes spending.

Before any future payment feature can be enabled, it must present the asset, exact amount, network, destination and fee information and require a separate wallet confirmation for that payment. No unlimited allowance or standing spending permission is enabled by sign-in.

Any future bot or automated payment integration must be separately and explicitly authorized with narrowly scoped assets, networks, destinations and actions; per-transaction and cumulative limits; a clear expiry; straightforward revocation; and an audit trail. No such authorization is implemented or active in this staging release.

## Main account API

- `POST /api/account/primary-wallet/options`: issue an origin-bound, one-use EIP-191 challenge.
- `POST /api/account/primary-wallet/verify`: verify the signature, establish a session, and, for new account creation, require both current consent acknowledgements.
- `GET /api/account/status`: return the authenticated account state, immutable owner-wallet identity and currently active linked wallets.
- `POST /api/account/wallet-links/options` and `/verify`: link or unlink an additional EVM wallet using a one-use challenge, owner signature, and (for linking) the additional-wallet signature plus fresh explicit capability authorization. Unlinking revokes AstroCrown permission; later relinking requires fresh proofs and authorization.
- `POST /api/account/logout`: revoke the current account session without changing or deleting the immutable owner-wallet association.
- `GET /api/genesis/me`: resolve the Genesis profile using the current AstroCrown account session. It does not authenticate a separate Genesis identity.
- `POST /api/genesis/wallet-link/challenge` and `/verify`: link an additional programme address using a separate off-chain ownership proof.
- `GET /api/supporters/status`: return the public read-only programme status. It never enables a payment or transfer.

The old passkey registration, login, recovery and security-management routes are not part of the wallet-only Worker. Requests to unknown routes fail closed.

## Database layout

- `acrown-account-staging` D1: ordinary AstroCrown accounts, primary-wallet challenges, sessions and governance data.
- `acrown-supporters-mainnet` D1: Genesis programme profile, linked public addresses, entitlements, programme controls, payment evidence and public-ledger data. It is not a second sign-in database.

Programme migration files live under `migrations/supporters/`. They retain immutable contribution, purchase, entitlement and public-ledger evidence while removing obsolete standalone member authentication challenges and sessions.

## Staging and qualification

The staging workflow is manual, restricted to `main`, and requires the explicit free/no-card confirmation and isolated-staging authorization. It applies the account and programme migrations, deploys only the staging Worker, installs the staging HMAC secret and runs remote HTTP smoke checks.

A successful deployment smoke check is not a full browser qualification. A real browser test must still verify:
1. Account creation only after both checkboxes are selected.
2. Wallet-provider and account selection.
3. Repeat sign-in with the same wallet.
4. Sign-out and rejection of a different wallet.
5. Genesis profile access within the same AstroCrown account.
6. Link an optional additional EVM browser wallet only after the immutable owner and additional wallet both sign a fresh capability-scoped challenge.
7. Unlink an additional wallet with owner authorization, confirm its capability permission is revoked, and relink it only after fresh proofs and explicit authorization.
8. Reject attempts to use an actively linked additional wallet as a second AstroCrown account owner.
9. Confirm owner-wallet logout ends the session while preserving the owner association.
10. No transaction or token approval is requested during sign-in, linking or unlinking.

Use synthetic account details and a disposable wallet with no valuable assets. Do not enable real payment features or production access from this staging environment.
