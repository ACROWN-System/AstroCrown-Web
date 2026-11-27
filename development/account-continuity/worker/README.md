# AstroCrown account Worker

**Current state: development-only.** The wallet-primary Worker, D1 schema and static site bundle are qualified locally in GitHub Actions. No remote Cloudflare staging deployment or remote D1 migration has been performed. Ordinary account creation and sign-in are not yet live.

## Ordinary account: one wallet, one identity

An ordinary account is owned by exactly one primary wallet.

- Supported mainnet proofs: Ethereum (EIP-191), TRON (TIP-191) and Solana (Ed25519).
- Registration and sign-in use an origin-, network-, address- and purpose-bound one-time message challenge. The Worker consumes the challenge once and verifies the chain-native signature.
- The wallet signs a message only. It is not a transaction and must never request gas, token approval, a transfer, a deposit or payment.
- One primary wallet is sufficient. Extra wallets, auxiliary transaction-wallet management, email, password, SMS, passkeys and recovery keys are not required or provided for ordinary account login.
- To recover access, the member must regain control of the same wallet using its wallet provider's own recovery process. AstroCrown does not collect seed phrases or private keys and has no password reset, staff reset or alternate login route.
- No minimum balance, wallet funding, RPC balance lookup or transaction is needed to register or sign in.

The account ID is a stable internal identifier. The public member name is separate and automatically assigned as `Crown_` plus the ten hexadecimal characters of the public `AC-` account identifier. Members can check availability and apply a new name. The database's case-insensitive unique index is the final authority.

A wallet used for Genesis identity may also be used as an ordinary account's primary wallet when it is the member's own wallet and supports one of the approved signing methods. A second wallet is not required merely to create an account or choose a member name. Genesis payment addresses and treasury records remain separately governed; an address shown for receiving funds is not automatically an authentication credential.

## Minimal account API

- `POST /api/wallet-auth/challenge` — begin registration or sign-in.
- `POST /api/wallet-auth/verify` — verify the one-use wallet message and create the account/session or sign in.
- `GET /api/account/status` — return the current account state.
- `POST /api/account/logout` — revoke the current session.
- `POST /api/account/member-name/check` — check a name for the authenticated member.
- `POST /api/account/member-name/apply` — atomically claim and persist the name.

The Worker stores only the hash of the random session token. The browser receives an HttpOnly, SameSite=Strict cookie; Secure is added on HTTPS. Ordinary sessions expire after 30 minutes. Requests are same-origin, require the exact configured origin, and are rate-limited. The account Worker does not expose a public endpoint to appoint or grant administrator privileges.

Administrator privileges remain separate from ordinary account identity. A primary account wallet does not grant an administrator role. Administrator wallet enrollment and step-up are distinct privileged operations; first-administrator bootstrap is not yet available for public use.

## Database and service boundaries

- `DB` holds ordinary account identity, primary-wallet association, member names, sessions, rate-limit state and security audit events.
- `SUPPORTERS_DB` remains a separate Genesis Programme database for Genesis wallet identity, programme configuration, payment evidence and purchase accounting. It is not the ordinary account database.
- `/api/genesis/status` reports the Genesis programme state and per-network qualifying-payment readiness without exposing treasury destinations.
- The authenticated Genesis identity API retains one primary wallet as the sole sign-in/recovery anchor. Wallet brands are selected before a network is selected for the off-chain identity proof. Additional PAYMENT or DELIVERY addresses require their own signed address-link proof and do not become alternate login identities.
- `GET /api/genesis/payment-intents` returns the authenticated member's payment-intent history and current per-network activation reasons. `POST /api/genesis/payment-intents` creates an exact, time-limited manual USDT payment instruction only when all activation gates pass. `POST /api/genesis/payment-intents/cancel` cancels an unsubmitted intent and releases its global principal-capacity reservation.
- Payment instructions use asset-first labels: `USDT · Ethereum (ERC-20)`, `USDT · TRON (TRC-20)` and `USDT · Solana (SPL)`. The website does not submit a transfer or request a payment signature; the member sends the exact displayed amount through their own wallet. Network fees are paid separately from the USDT principal.
- The old `/api/supporters/*` registration/login routes remain retired. The `/supporters/` public page is now the wallet-first Genesis member experience; its logos are locally hosted and explicitly copied by the staging allowlist.

Community is a future consumer of the authoritative ordinary-account member-name field. Community feeds, replies and member lists are not prerequisites for ordinary account registration, sign-in or profile management.

## AstroCrown-owned USDT treasury receipt monitor

The Worker now has a read-only chain-monitoring path for incoming USDT to the three canonical Genesis receiving wallets. It is an AstroCrown-owned backend component; it does not use a hosted payment processor or call a public explorer to decide whether a receipt exists.

**Operational data flow**

- Ethereum Mainnet: scan canonical ERC-20 USDT Transfer logs directed to the configured treasury, then verify the transaction receipt, canonical inclusion block and finalized head.
- TRON Mainnet: scan blocks and transaction receipts from the TRON SolidityNode (solidified) view; verify the canonical TRC-20 USDT Transfer event and six-decimal token metadata.
- Solana Mainnet Beta: discover the treasury owner's canonical USDT SPL token accounts, follow finalized signatures and verify parsed token instructions, source/destination token-account owners and exact token-balance deltas.
- Every candidate is checked against two configured RPC node sources on distinct HTTPS origins with distinct node/source identifiers. Both may be self-operated by AstroCrown on separate node instances; they must not be two aliases of the same backend. A mismatch, unavailable source, wrong chain, wrong token, wrong recipient, incomplete finality or malformed evidence stops that network's cursor from advancing.
- Sender attribution is a separate internal lookup against an already verified Genesis primary/payment wallet address. Receipts from unregistered senders are still recorded as `UNMATCHED`; they do not silently become member payments.
- The append-only `genesis_treasury_receipts` register is for operational treasury history and reconciliation. It is deliberately separate from `genesis_public_payments`, programme allowance events, membership badges and purchases. After all three chain scans are caught up, the monitor considers receipts in on-chain occurrence order behind the minimum finalized/solidified chain-time watermark. A receipt is settled only when its sender is already verified under a Genesis primary-wallet profile and it exactly matches one open intent for the same identity, address, network, canonical USDT token, treasury and amount, with the chain occurrence time inside that intent's validity window.
- `genesis-payment-operations.js` inserts a qualifying-payment record only after that exact receipt/intent match. The D1 triggers atomically update the shared qualifying principal and allowance balances, append the immutable allowance event, confirm the intent, activate Genesis Member and award its gold DNA badge. Plain incoming transfers without a matching intent remain receipts only.
- The global five-tranche allocation is finalized in receipt settlement order, not when an intent is created. The amount displayed when requesting an intent is explicitly an estimate; the final allowance and tier breakdown are stored separately in the settled payment/intent record.

**Public transparency data flow**

- `GET /api/genesis/treasury-receipts` returns verified receipt evidence for the public website.
- Each item identifies the single asset as USDT, then labels its network and standard (for example `USDT · TRON (TRC-20)`), amount, sender, receiving address, transaction hash, transfer/event index, inclusion reference and chain-specific finality.
- The response includes a direct Etherscan, TronScan or Solscan transaction link. The website's link is for community inspection only; the backend never queries the explorer.
- Plain receipt rows are visibly distinguished from qualifying-payment records that were settled against an exact intent. Only the latter show an entitlement/Genesis Member settlement reference.
- Internal identity IDs, wallet-record IDs and RPC endpoint credentials are not exposed through the public projection.

**Runtime guard and RPC configuration**

- A five-minute Cron trigger is configured only for the `staging` environment. The scheduled handler is a no-op unless `ENVIRONMENT=staging` and `GENESIS_RECEIPT_MONITOR_ENABLED=true`.
- `GENESIS_RECEIPT_MONITOR_ENABLED` is intentionally absent from `wrangler.jsonc`; receipt observation is disabled by default. Turning on the monitor alone never opens payment acceptance.
- Qualifying-payment creation and settlement have an independent, closed-by-default activation gate. In staging it requires `ENVIRONMENT=staging`, the receipt-monitor flag, `GENESIS_QUALIFYING_PAYMENTS_ENABLED=true`, exact rules-version approval, approved versioned terms, a positive minimum qualifying USDT amount, network-specific treasury-control verification, two configured HTTPS RPC sources with distinct origins/source IDs, and an enabled/verified canonical D1 network configuration with exact token/decimals/treasury values. The permanent pre-launch freeze/launch lifecycle must also remain open.
- Production payment acceptance additionally requires `GENESIS_PRODUCTION_PAYMENTS_APPROVED=true`, `GENESIS_PRODUCTION_RECEIPT_MONITOR_APPROVED=true` and `GENESIS_PRODUCTION_RECEIPT_MONITOR_CRON_VERIFIED=true`. The production monitor itself refuses to run unless the receipt-monitor and Cron approvals are present. No production Worker/D1 environment or Cron has been provisioned in this branch; these flags remain absent.
- Different RPC URL origins and source IDs are configuration checks, not proof that two sources are independently operated. That evidence must be reviewed manually before enabling a network.
- The payment service currently creates a manual exact-amount transfer instruction only; it does not request wallet transaction signatures or automatically transfer funds. The static Pages preview remains no-payment.
- Configure each RPC URL as a Worker secret and each source identifier as a non-secret Worker variable. All URLs must use HTTPS, have different origins and identify distinct node instances/data sources. AstroCrown may operate both itself; separate third-party payment processors are not involved:
  - Ethereum: `GENESIS_ETHEREUM_RPC_A_URL`, `GENESIS_ETHEREUM_RPC_A_SOURCE_ID`, `GENESIS_ETHEREUM_RPC_B_URL`, `GENESIS_ETHEREUM_RPC_B_SOURCE_ID`.
  - TRON SolidityNode base URLs: `GENESIS_TRON_RPC_A_URL`, `GENESIS_TRON_RPC_A_SOURCE_ID`, `GENESIS_TRON_RPC_B_URL`, `GENESIS_TRON_RPC_B_SOURCE_ID`. Optional API keys are configured as Worker secrets `GENESIS_TRON_RPC_A_API_KEY` and `GENESIS_TRON_RPC_B_API_KEY`; they are sent only as the `TRON-PRO-API-KEY` request header and are never stored or logged.
  - Solana: `GENESIS_SOLANA_RPC_A_URL`, `GENESIS_SOLANA_RPC_A_SOURCE_ID`, `GENESIS_SOLANA_RPC_B_URL`, `GENESIS_SOLANA_RPC_B_SOURCE_ID`.
- Provider URLs and API keys must never be committed to the repository, returned by the API, or written to logs. When AstroCrown operates both nodes, keep their node instances, storage and synchronization paths separate rather than reverse-proxying one node through two URLs. Do not use two endpoints operated by the same provider and label them as independent.
- Cursor initialization records the chain head/signature observed when the monitor is first enabled; it does not automatically publish old wallet history as newly observed receipts. Newly discovered Solana treasury token accounts are scanned from their first observed signatures. This initialization needs no test payment and no first customer payment: it establishes the current chain positions, after which the monitor waits for and records the first incoming receipt. Initialize and verify the monitor before activating any real payment instructions.
- Ethereum scans at most 500 finalized blocks per cycle. TRON scans at most 150 solidified blocks per cycle and obtains each block's complete receipt page through the native `walletsolidity/gettransactioninfobyblocknum` method; every receipt is cross-checked against the complete block transaction list from both SolidityNodes. Solana scans at most one 1,000-signature page per treasury token account per cycle. Backlogs resume from persisted cursors; failed blocks/pages are retried without advancing past the failure.
- Each receipt stores chain occurrence time separately from the monitor's observed/verified time. Ethereum and TRON use their agreed canonical block timestamp; Solana uses the transaction's finalized `blockTime`. If independent nodes disagree on inclusion time, the receipt is rejected.
- The settlement queue is deferred while any network has a backlog or RPC failure. Once all three scans are caught up, the exclusive settlement cutoff is the minimum timestamp of the three independently agreed finalized/solidified heads; only receipts before that watermark are processed, ordered by chain occurrence time. This prevents a later-discovered older receipt from being overtaken by a newer receipt on another network.
- Payment-intent expiry is evaluated against the on-chain occurrence timestamp, not when a monitor happens to discover the transaction. To avoid losing a timely transfer during an RPC outage, the Worker does not automatically release an open reservation solely because wall-clock expiry passed. The UI marks it expired and instructs the member not to send; the member may explicitly cancel to release it after confirming no transfer was made. A previously included receipt within the intent window can still be reconciled during backlog recovery.

This monitor provides **receipt evidence**, not identity proof about a real-world person and not a complete forensic provenance trail for previously transferred funds. The on-chain sender address is the immediate token-transfer source. Genesis payment acceptance, customer entitlements and public programme claims remain separate policy decisions.

## Local qualification

The GitHub-hosted `.github/workflows/account-staging-worker-qualification.yml` workflow:

1. installs the pinned Worker dependencies;
2. runs Worker invariant and wallet-proof tests;
3. builds the allowlisted site assets;
4. applies both schemas to disposable local D1 databases;
5. starts a local Worker and runs wallet-primary registration/sign-in, wrong-origin, wrong-signer, replay, uniqueness, session and member-name API checks;
6. checks the public-staging notice, wallet-first Genesis page, draft terms status, local logo assets and Genesis PRELAUNCH/payment-gate status; and
7. applies the payment-intent/settlement D1 migration and tests shared principal reservations, concurrent per-profile intents, exact receipt matching, actual finality preservation, shared allowance credit, immutable audit event and Genesis Member badge award; and
8. verifies that remote deployment configuration remains non-deployable until explicitly prepared.

The EIP-191, TIP-191 and Ed25519 cryptographic verification paths have automated tests using synthetic keys. They do not prove compatibility with every physical wallet, extension, mobile app, browser or device. Manual physical-wallet/provider testing on the exact remote staging origin and an independent security review remain release gates.

## Guarded Cloudflare staging

The remote workflow is `.github/workflows/cloudflare-staging-deployment.yml`. It is manual, main-only and has two independent confirmation inputs: the owner must confirm Workers Free/D1 Free with no card or paid service, and explicitly authorize the isolated staging deployment. It reuses the existing repository-level `CLOUDFLARE_API_TOKEN_02` secret and `CLOUDFLARE_ACCOUNT_ID_02` variable, plus the protected `cloudflare-staging` environment HMAC secret.

Before a deployment, run the GET-only `.github/workflows/cloudflare-account02-readonly-preflight.yml` on `main`. It verifies the existing account-scoped token's Worker/D1 access and inventories the named Worker, subdomain and databases. It does not inspect billing/payment methods or mutate Cloudflare. The owner must personally confirm Free/no-card conditions in Cloudflare.

The staging script then runs the local tests, allowlisted build and Wrangler dry-run before any remote provisioning. It deploys only the `staging` Worker, applies the isolated account and Genesis D1 migrations, installs the staging HMAC key and performs initial public-page, acknowledgement, wallet-only status and wrong-origin smoke checks. It never deploys production, enables Genesis payments, changes billing or automatically deletes resources after a failed deployment.

PR #180, which integrated the display-only Genesis Programme page and corrected the Account 02 settings, was merged on 15 November 2026. No further merge of that PR is needed.

**Do not run the remote deployment yet.** The exact current PR head must first be reviewed and merged, its required checks must pass, the preflight must be completed on `main`, and the owner must separately confirm the no-card Free-tier conditions and authorize staging. Initial deployment smoke checks alone are not full remote wallet qualification or production approval.
