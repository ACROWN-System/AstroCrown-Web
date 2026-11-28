# AstroCrown account staging Worker

This Worker implements the wallet-first account model for the AstroCrown public staging environment. It is a staging qualification build, not the production commercial service.

## Identity model

- Each ordinary AstroCrown account has one primary EVM externally owned wallet identity.
- The primary wallet is the sign-in identity and recovery anchor. The Worker stores only its public address, chain identifier, account linkage, timestamps and authentication metadata.
- The browser discovers wallet providers using EIP-6963, with an EIP-1193 fallback. The user chooses a provider and, when more than one address is available, chooses the address to use. The application does not silently choose the first provider or account.
- Account creation requires two independent server-verified acknowledgements: acceptance of the current Terms of Use and Privacy Policy, and acknowledgement of the wallet-loss/recovery notice. Their versions and timestamps are stored with the account.
- Authentication uses a fresh, short-lived, single-use, origin-bound EIP-191 personal-sign challenge. A sign-in signature proves wallet control only. It does not authorize a blockchain transaction, token approval, transfer, payment or spending permission.
- AstroCrown never requests or stores a wallet private key, seed phrase, mnemonic or recovery words.

## Recovery and account lifecycle

Account access is recovered only by restoring the same primary wallet and address through the user's wallet provider or offline backup. If the wallet and all restoration paths are permanently lost, the account is unrecoverable by AstroCrown. Staff and administrators cannot bypass wallet proof or migrate an account to another address.

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
- `GET /api/account/status`: return the authenticated account state and public primary-wallet identity.
- `POST /api/account/logout`: revoke the current account session.
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
6. Optional additional-address linking without creating another account.
7. No transaction or token approval requested during sign-in or address linking.

Use synthetic account details and a disposable wallet with no valuable assets. Do not enable real payment features or production access from this staging environment.
