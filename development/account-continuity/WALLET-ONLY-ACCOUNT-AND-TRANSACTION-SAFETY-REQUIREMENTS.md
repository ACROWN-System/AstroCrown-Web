# Wallet-Only Account Identity and Transaction Safety Requirements

**Decision date:** 2026-11-28  
**Status:** OWNER-ACCEPTED ARCHITECTURE / STAGING IMPLEMENTATION IN QUALIFICATION  
**Scope:** AstroCrown ordinary-user account identity, Genesis programme attachment, wallet consent, transaction authorization and future automation  
**Supersedes:** Passkey-first account authentication, passkey recovery keys, email/password account access, and the separate Genesis member sign-in model  
**Related requirements:** [User and Administrator Account Requirements](USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md), [Production-Parity Staging and Three-Pass Cleanup Requirements](PRODUCTION-PARITY-STAGING-AND-THREE-PASS-CLEANUP-REQUIREMENTS.md)

> **Current authority:** this is the governing ordinary-account identity and transaction-safety design from 28 November 2026. Older passkey-first and independent Genesis account documentation is historical reference only. No ordinary-user passkey login, passkey recovery key, email/password fallback or separate Genesis account/login is to remain in the active product.

## 1. Core decision: one account, one primary identity wallet

Each ordinary AstroCrown user has one account identified and controlled by one primary wallet address.

The primary wallet is simultaneously:
- the ordinary account's sign-in identity;
- the proof-of-control authority for account access;
- the recovery anchor;
- the wallet associated with the user's Genesis programme profile and entitlements.

There is no second Genesis account, Genesis login, Genesis recovery system or separate programme identity to manage. Genesis may retain separate programme tables and ledger records for financial/accounting purposes, but those records must be bound to the same AstroCrown account ID. Database separation is data/domain separation, not a second account or authentication authority.

An account ID is an internal stable identifier. It is not a separate authentication factor. A Genesis profile's `astro_account_id` binding must be unique: no Genesis profile can be bound to two AstroCrown accounts, and one AstroCrown account cannot accumulate multiple independent Genesis profiles.

## 2. Primary wallet selection and connection experience

The interface must not silently select an arbitrary injected wallet provider or the first address returned by a provider when the user has a choice.

1. Discover installed EVM wallet providers using EIP-6963 where supported.
2. Retain an EIP-1193 injected-provider fallback for older providers.
3. Present the detected wallet providers in a clear selector. The user selects which provider to use.
4. Request only the permission needed to expose the public account address. Do not request transaction, signing or token-approval permissions as part of wallet discovery.
5. If the selected provider exposes more than one account address, present an address selector and require the user to choose the address that will become the primary AstroCrown identity.
6. Re-check the selected address and chain immediately before signing. If the wallet changes while the challenge is open, abort and restart.
7. Do not infer the primary account from the default MetaMask account, provider brand name, extension order, stored UI preference or wallet balance.

The UI must make the normal account journey familiar and clear:
- Returning user: **Sign in with wallet**.
- New user prompt: **New to AstroCrown? Create an account**.
- Signup page: **Already have an account? Log in**.
- New account action: **Create account with wallet**.

The user must be able to change provider or address selection before signing. No connection or selection step may initiate a blockchain transaction.

## 3. Authentication ceremony: off-chain proof only

The current primary authentication implementation supports EVM externally owned accounts and EIP-191 `personal_sign`.

The server must:
- generate a fresh, short-lived, single-use challenge;
- bind the challenge to the exact website origin, selected address, chain identifier, nonce, expiry and request identifier;
- verify the signature server-side and recover the expected signer address;
- reject wrong-origin, stale, replayed, malformed, wrong-address and wrong-chain responses;
- issue the account session only after successful proof;
- create a new account only after both mandatory consent acknowledgements have passed server-side validation.

A wallet connection by itself is not authentication. The browser must not treat provider metadata or an address returned without signature proof as account ownership.

The signed message must clearly state that it is an off-chain account-authentication proof and does not authorize or submit a blockchain transaction, token approval, transfer, payment or spending permission. It must not require gas and must never be broadcast on-chain.

### Supported and unsupported boundaries

- Current ordinary primary identity sign-in: EVM externally owned account / EIP-191.
- A connected wallet contract account or EIP-1271 signature is not qualified by this staging implementation.
- TRON and Solana addresses may be supported as additional programme addresses using their own message-signature verification, but they do not become ordinary account sign-in identities unless a future architecture change is separately approved.
- Unsupported wallet families must fail clearly and must not fall back to passkeys, passwords, email or staff-assisted identity bypass.

## 4. Mandatory signup acknowledgements

Account creation requires two independent, visible, unchecked-by-default checkboxes. Both must be checked before the client can submit account creation, and the server must independently validate them.

### 4.1 Wallet-loss and recovery acknowledgement

The user must expressly confirm that:
- the primary wallet is the AstroCrown identity;
- AstroCrown never receives or stores the wallet's private key, seed phrase, mnemonic or recovery words;
- recovery requires restoring the same wallet and address through the wallet provider or a user-created offline backup;
- if the wallet and all restoration methods are permanently lost, AstroCrown cannot restore the account;
- staff and administrators cannot bypass proof of control or move the account to another address.

The checkbox text must state that the user has read and understood the warning and accepts the permanent-loss consequence. Its version and acceptance timestamp are stored with the account.

### 4.2 Terms of Use and Privacy Policy acceptance

A second, distinct checkbox must state that the user has read, understood and agrees to the current AstroCrown Terms of Use and Privacy Policy. Both policy links must open the correct current policy documents. The checkbox remains mandatory; an optional newsletter, marketing or unrelated consent must never be bundled into it.

The server must require:
- `termsAccepted === true`;
- the exact current `termsVersion`;
- `walletLossAcknowledged === true`;
- the exact current `walletLossNoticeVersion`.

The server records the policy versions and acceptance timestamps. Missing, false, stale or unrecognized consent must reject new-account creation. Client-side validation alone is insufficient.

The linked policies remain development drafts until separately reviewed and approved for production; their presence must not be described as legal approval.

## 5. Wallet loss and recovery

The primary wallet is the only ordinary account recovery anchor.

Recovery procedure:
1. The user restores the original wallet through the provider's own recovery process or their offline backup.
2. The user reconnects the same provider or another compatible provider that can expose the same original address.
3. The user signs a fresh origin-bound account challenge.
4. AstroCrown verifies the same address and restores access to the account.

If the original address cannot be restored, the account is permanently inaccessible. AstroCrown has no password reset, passkey recovery key, email/SMS reset, seed-phrase recovery, administrator override or account migration to a different wallet.

AstroCrown, support staff and NOVA must never request, receive, store or handle wallet seed phrases, private keys or recovery words. The user must never enter them into AstroCrown forms or send them to staff.

## 6. Genesis Programme attachment and optional additional addresses

Genesis is a programme attached to the ordinary AstroCrown account. It is not an account-creation flow.

- Genesis profile, unique public display name, avatar, member badge, verified payment history, programme allowance and entitlements are tied to the same AstroCrown account ID.
- The primary identity wallet is automatically associated with the Genesis profile as its primary Ethereum address when the user first accesses Genesis.
- The user signs in through the ordinary AstroCrown account before seeing or changing their Genesis profile.
- No standalone Genesis register, login, logout, password, session cookie, account recovery or identity challenge may exist.
- Additional Ethereum, TRON or Solana public addresses are optional. They may be linked to the same account for a specific payment or Solana delivery function only.
- Every additional address must independently prove control using a fresh, domain-bound off-chain message signature.
- A secondary address cannot sign in to AstroCrown, recover the account, rename the profile, change administrator permissions or independently claim Genesis membership.
- The same address cannot be linked twice or claimed by another AstroCrown account.
- Keep the programme database separate where needed for programme financial records and immutable public ledger evidence. Do not create a second identity authority or separate programme login.

## 7. Authentication never authorizes spending

This is a strict product and security boundary:

**Signing in is not permission to spend. Connecting a wallet is not permission to spend. Signing an account challenge is not permission to spend. Linking an additional address is not permission to spend.**

Wallet authentication must never:
- submit a blockchain transaction;
- transfer tokens or native assets;
- create a token allowance;
- approve a smart contract;
- pay gas or service fees;
- create an automated trading or payment mandate;
- grant an application or agent standing spending authority.

Payment functionality remains disabled in the current staging environment. No qualifying Genesis payments, ACROWN floor-price purchases, transfer execution or automatic token issuance may be enabled by account authentication.

## 8. Future payment confirmation requirements

When payment functionality is separately approved and enabled, each payment must be independently reviewed and confirmed inside the wallet.

The confirmation must clearly identify:
- asset name, token contract or mint address, and token decimals where relevant;
- exact amount and denomination;
- blockchain network;
- destination wallet, treasury or contract address;
- applicable network, gas, paymaster and service fees;
- the purpose of the payment and any linked programme entitlement or purchase;
- any contract method or token allowance being requested.

The transaction screen must not obscure the recipient or amount behind a generic “Continue” label. The default payment interaction should be a one-transaction confirmation in the wallet, not a standing authorization.

If a payment requires an ERC-20 or equivalent allowance, use the narrowest amount and contract scope the payment needs. Do not default to unlimited token approval. Show existing allowances and provide a way to revoke them where the chain/token supports revocation. A wallet's own confirmation screen remains the final user authorization; AstroCrown must not pretend a prior login signature substitutes for it.

## 9. Future automated trading and payment tools

A trading bot, recurring payment tool, agent, or other automated service must never inherit spending authority from ordinary AstroCrown sign-in.

If such functionality is introduced, it requires a separate design, explicit opt-in and a separate wallet authorization. At minimum, that authorization must specify:
- the exact application/agent allowed to act;
- allowed assets/tokens and networks;
- allowed contract methods and destinations;
- a per-transaction maximum;
- a cumulative daily/weekly/total cap;
- an explicit expiry time;
- a simple immediate revocation control;
- notification and transaction/audit history;
- visible remaining allowance and automatic stop behavior at the limit.

No open-ended, unlimited or indefinite authorization is permitted by default. No automated spending permission is implemented or active in the staging release. Delegated authorization must be off by default and must never be included in the wallet account creation or sign-in message.

## 10. Ordinary account and administrator governance boundary

The primary wallet proves ordinary account ownership. It does not confer administrator authority.

Administrator role assignment, permission delegation, revocation and administrator wallet step-up remain governed by the separate server-owned governance model:
- roles are assigned by the authorized governance process, not by the client;
- ordinary sign-in cannot create or grant administrator roles;
- privileged actions require the required role/permission and fresh administrator wallet proof;
- administrator audit records are append-only and retained;
- no ordinary login flow may bypass administrator wallet-loss/recovery governance.

Preserving separate administrator proof is a privileged authorization control, not a second ordinary-user account login.

## 11. Data and privacy requirements

The ordinary account database may store:
- stable internal account identifier;
- primary public wallet address;
- EVM chain identifier and proof metadata;
- account session digests and timestamps;
- Terms/Privacy accepted version and timestamp;
- wallet-loss notice version and acknowledgement timestamp;
- profile fields needed for the service;
- governance roles, permissions and append-only audit records.

It must never store:
- wallet private keys;
- seed phrases, mnemonics or wallet recovery words;
- raw reusable signatures;
- raw session tokens;
- a passkey credential or passkey recovery key for ordinary account sign-in;
- password hashes for a retired email/password account path.

A public wallet address is pseudonymous, not anonymous; it may be associated with public blockchain activity. The UI and Privacy Policy must explain this fact.

Genesis programme records may reside in a dedicated programme database, but a unique `astro_account_id` binding connects each Genesis profile to exactly one AstroCrown account. The programme database is not a second account store.

## 12. Current staging qualification

Staging is a public, disposable test environment, not a production service. Use synthetic profile details and a disposable wallet with no valuable assets. Never connect a production wallet or send real funds for staging qualification.

Required automated checks:
1. EIP-191 challenge includes exact origin, address, chain, nonce, expiry and request ID.
2. Signature recovery rejects a different address, malformed signature and stale/replayed challenge.
3. New account creation rejects missing or stale Terms/Privacy consent.
4. New account creation rejects missing or stale wallet-loss acknowledgement.
5. Both accepted versions and timestamps are persisted.
6. Account status exposes only wallet-first authentication, not a passkey/recovery path.
7. The retired passkey and recovery endpoints are absent.
8. Genesis profile lookup requires the existing AstroCrown account session.
9. A Genesis profile is uniquely linked to one AstroCrown account ID.
10. Optional additional-address link proves control independently and never creates another login.
11. Payment acceptance and automatic issuance remain disabled.
12. A wrong-origin request is rejected.

Required real-browser qualification:
1. Choose a provider when multiple wallet providers are installed.
2. Choose a specific address when the selected provider returns more than one.
3. Verify that the browser does not silently select MetaMask or the first account.
4. Attempt signup with neither checkbox: it must be blocked.
5. Check only one consent: signup must remain blocked.
6. Check both consents: signup can proceed to the wallet's readable personal-message prompt.
7. Verify the wallet request is an off-chain message signature, not a transaction or token approval.
8. Complete account creation, repeat sign-in with the same wallet, sign out, and reject a different wallet.
9. Verify Genesis profile and entitlements resolve under the same account.
10. Optionally link another supported address and verify it cannot sign in or replace the primary wallet.

A successful deployment smoke test is not equivalent to completion of all real-browser qualification. Payment and automation features remain disabled until their own security review, UX acceptance tests and release approval are complete.

## 13. Superseded implementations

The following are retired and must not be restored as ordinary account fallback or recovery:
- WebAuthn passkey registration and passkey-only account sign-in;
- passkey-specific security management as ordinary account access;
- one-time passkey recovery keys and replacement-passkey recovery;
- email/password account creation, login, verification and reset;
- a separate Genesis wallet identity login/session;
- temporary local authentication server and HTTPS tunnel as an alternate account runtime.

Historical specifications and audit records may be retained for traceability, but must be labelled historical and must not appear in the live UI, worker routes, current onboarding, or current security assurance.
