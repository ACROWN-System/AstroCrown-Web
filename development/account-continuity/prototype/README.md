# AstroCrown account interface prototype

**Status: wallet-only account UI; authentication is performed only by the Cloudflare Worker staging environment.**

This folder contains the browser interface and static legal/assurance pages for the AstroCrown account experience. It is not a separate authentication server.

## Current account model

- One AstroCrown account is identified by one primary EVM wallet address.
- The user chooses the wallet provider and, if multiple addresses are returned, the exact address to use.
- Sign-in and account creation use an origin-bound EIP-191 personal-message signature. That signature proves wallet control only. It does not authorize a transaction, token approval, transfer, payment or spending permission.
- Account creation requires two distinct checkboxes: acknowledgement of the wallet-loss/recovery warning, and acceptance of the Terms of Use and Privacy Policy. The Worker independently checks and records both acknowledgements with their versions and timestamps.
- The primary wallet is the recovery anchor. The user must restore the same wallet and address through their wallet provider or offline backup. AstroCrown cannot reset or replace a lost wallet.
- Genesis profile, membership status, badge and programme entitlements belong to the same AstroCrown account. There is no separate Genesis login or account.
- Additional supported network addresses may be linked to that same account for specific programme functions. They do not become alternate sign-in identities.

## Runtime boundary

Only the explicitly marked Cloudflare Worker staging origin may perform account authentication. The site builder adds the `astro-account-runtime=worker-staging` marker to the staging homepage. Without that marker, including local file and localhost previews, the account interface is read-only and wallet actions are disabled.

The former local Python account server, passkey verifier, recovery-key system, email/password verification/reset service and temporary HTTPS tunnel have been removed. There is no parallel local authentication backend to maintain.

## Payment and automation safety

Payment acceptance, qualifying Genesis payments, purchases and automatic token issuance remain disabled in staging. Wallet sign-in and secondary-address linking never authorize spending.

Before future payment functionality is enabled, each payment must separately display the asset, exact amount, network, destination and fees and require confirmation in the wallet. No unlimited token allowance or standing spending permission may be granted through login.

A future automated trading or payment tool must require separate explicit authorization, narrowly limited assets/networks/destinations/actions, per-transaction and cumulative limits, a short expiry, straightforward revocation and an audit trail. No automated spending authorization is active.

## Files

- `account-ui.js`: wallet-first login, signup, consent, provider/address choice and account dashboard.
- `account-prototype.css`: account popup, dashboard and visible consent checkbox styling.
- `admin-wallet-ui.js`: separate, server-enforced administrator wallet controls. Ordinary account login does not grant administrator authority.
- `terms-of-use.html` and `privacy-policy.html`: linked development policy drafts.
- `security-assurance.html`: current wallet identity, recovery and transaction-safety explanation.

The separate feedback/case portal and private communications UI are not enabled in this staging release and are not linked from the account dashboard.

## Qualification

The deployed Worker is the only account runtime. The staging release must pass automated tests and remote smoke checks before browser testing. A real browser test must still verify:

1. The wallet provider list and provider selection.
2. The address selector when a wallet returns multiple addresses.
3. Account creation is blocked until both consent checkboxes are checked.
4. The wallet displays a personal-message signature request, not a transaction or token approval.
5. Repeat sign-in with the same wallet, sign-out and rejection of a different wallet.
6. Genesis profile access under the same AstroCrown account.
7. Optional additional-address linking without a second account or login.

Use synthetic details and a disposable wallet holding no valuable assets. The public staging environment is temporary; records may be reset. The linked Terms of Use and Privacy Policy remain development drafts and require approval before production onboarding.
