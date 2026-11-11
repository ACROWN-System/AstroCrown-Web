# Supporter Programme — Free Infrastructure and Provider Qualification

**Observation date:** 2026-11-12  
**Status:** RESEARCH BASELINE / NO PROVIDER ACCOUNT OR PRODUCTION PAYMENT ROUTE APPROVED  
**Scope:** USDT supporter contributions, on-chain verification, public fund ledger, off-chain evidence publication, page/API hosting, database, backups, monitoring and CI.  
**Programme planning ceiling:** USDT 250,000 aggregate supporter contributions (planning assumption, not a live funding cap). The separate maximum ACROWN purchase quantity is a programme-wide token allowance still awaiting approval.  
**Related implementation:** `preview/supporters.html` and PR #176.

> This is a dated research snapshot, not proof that a provider account is activated, cardless, commercially eligible, within quota, or suitable for production. Every provider must pass account-level and workload-level qualification before production use. Published free limits can change.

## 1. Executive decision

A $0 development and qualification stack is feasible using static hosting, a bounded serverless API, a small SQL database, public blockchain evidence, version-controlled public records, and external uptime monitoring.

A free-only public mainnet payment system is **not yet approved**. The main concern is not page hosting or database capacity; it is the reliability and service guarantees of shared free Solana RPC infrastructure. Solana's own documentation describes free RPC services as suitable for testing, demos and small private betas, and says they do not provide SLA-backed production capacity. A production contribution flow must not rely on one free shared endpoint.

The working architecture for qualification is:

- Cloudflare Pages Free for the public page and static evidence files.
- Cloudflare Workers Free for same-origin contribution APIs and deterministic transaction verification.
- Cloudflare D1 Free for the contribution register, entitlement state, append-only event ledger and reconciliation metadata.
- Public, network-specific block-explorer links for independent on-chain checking.
- A public GitHub repository / Pages archive for versioned monthly ledger snapshots and redacted off-chain evidence; do not treat Actions logs as the accounting record.
- UptimeRobot Free for external availability checks.
- At least two independently operated Solana RPC sources, tested under representative load. Chainstack Developer and Ankr are the first candidates to qualify; Alchemy and Helius are additional candidates. Shared free RPC remains a risk and fallback layer, not a guaranteed production SLA.

No AI inference provider is required to verify a contribution. Token-transfer validation, entitlement calculation, reconciliation and public ledger updates must be deterministic and auditable; LLM output must never authorize or validate a financial transaction.

### One public hostname and one site project

Use the **existing AstroCrown website hostname and existing site project**. Do not create a separate public hostname, separate Pages project, or separate public Worker URL just for the Supporter Programme.

The account-staging endpoint
`https://astrocrown-account-staging-staging.sylvainbradford3.workers.dev/`
is a technical staging endpoint. It must not be linked from public navigation, printed on the supporter page, or treated as the public Supporter Programme address.

Use one public origin and keep all features under it:

- Existing AstroCrown homepage: `/` (or the existing repository preview prefix while previewing).
- Supporter Programme and wallet dashboard: `/supporters/` — one page/route. Registration, member profile, entitlement display and purchase dashboard should be views within this same route, not separate public hostnames.
- Backend requests: same-origin `/api/supporters/*` paths, served through the existing site's Pages Functions/Worker routing. These are paths on the same hostname, not additional public domains.

Do not provision a second `pages.dev` project hostname or a separate `workers.dev` hostname for the supporter feature. If the existing site uses its Cloudflare Pages project hostname, retain that one hostname for the entire site. If a custom AstroCrown domain is later connected, use it as the single canonical public hostname and redirect or retire the temporary public preview address once migration is verified; do not advertise multiple parallel public addresses.

Cloudflare's published Free limits distinguish **projects, domains and routes**, not the number of URL paths:
- Pages Free: up to 100 Pages projects per account; up to 100 custom domains per Pages project.
- Workers Free: up to 100 Workers per account; routes and custom domains have separate per-zone limits.
- A Pages Functions route is selected by its file path. The same site can serve `/supporters/` and `/api/supporters/*` on the existing hostname without creating another public hostname.
- Configure the Pages `_routes.json` include/exclude rules so only the API paths that need server execution invoke Pages Functions. Exclude static page/assets paths so static delivery remains on the Pages static-asset path and does not unnecessarily consume the Workers request quota.

Official limit and routing references:
- Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Pages Functions routing and `_routes.json`: https://developers.cloudflare.com/pages/functions/routing/
- Pages route matching: https://developers.cloudflare.com/pages/configuration/serving-pages/

This is a routing and resource-conservation decision only. The exact existing production/preview hostname, Cloudflare Pages project, deployment binding and Pages Functions configuration must be inspected in the Cloudflare account before activation. No new public hostname or project is being provisioned by this document.

## 2. Network and USDT identity

AstroCrown's current working chain direction has been Solana, but the supporter programme's accepted network still needs an explicit owner decision before any live payment address is published.

If Solana is selected, Tether's official USD₮ mint is:

`Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

Sources:
- Tether supported protocols: https://tether.to/en/supported-protocols/
- Solana stablecoin/payment documentation: https://solana.com/docs/payments/how-payments-work
- Solana Explorer token record: https://explorer.solana.com/address/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB

This is the token mint identifier, **not** an AstroCrown receiving wallet. The implementation must validate the exact mint and the expected token program, not a user-supplied token name or ticker. Solana's payment guidance explicitly warns that tokens can share names while having different issuers and mint addresses.

Etherscan is an Ethereum explorer, not a Solana explorer. For a Solana implementation, use transaction-specific links to Solana Explorer (and optionally Solscan). If a different network is selected, use that network's official token identifier and explorer instead.

## 3. Hosting, API, database and evidence storage

### 3.1 Cloudflare Pages Free — preferred static page host

Published Free-plan limits observed on 2026-11-11:

- 500 builds per month.
- One build at a time.
- 20,000 files per site.
- 25 MiB maximum individual asset.
- Static asset requests are free and unlimited.
- Pages Function requests count against the Workers plan request allowance.

Source: https://developers.cloudflare.com/pages/platform/limits/  
Functions pricing: https://developers.cloudflare.com/pages/functions/pricing/

Fit:
- Suitable for the supporter page, public ledger UI, static JSON/CSV snapshots, and carefully redacted public receipts.
- Static traffic does not consume the Workers API request pool.
- A monthly or daily archive build is comfortably inside 500 builds/month, but frequent per-payment Git rebuilds should be avoided.
- `pages.dev` can be used for qualification without buying a custom domain. A final custom domain is a separate later cost.

Status: **PUBLISHED FREE PLAN VERIFIED / ACCOUNT DEPLOYMENT NOT VERIFIED**.

### 3.2 Cloudflare Workers Free — preferred same-origin API

Published Workers Free limits observed on 2026-10-29:

- 100,000 requests per day.
- 10 ms CPU time per HTTP request.
- 128 MB memory.
- 50 subrequests per request.
- Six simultaneous outgoing connections per request.
- Five Cron Triggers per account.
- 15-minute wall-time ceiling for Cron Trigger invocations.
- 20,000 static assets per Worker version and 25 MiB per asset where Workers Static Assets are used.

Source: https://developers.cloudflare.com/workers/platform/limits/

Fit:
- A deterministic API for creating a contribution intent, verifying on-chain transactions, recording the confirmed contribution, updating the remaining purchase entitlement, and serving public ledger data.
- Use a single bounded cron/polling job for the treasury address; avoid polling the chain from each visitor's browser.
- Public asset requests remain on Pages static delivery; only dynamic API calls consume the Worker allowance.
- The 10 ms CPU allowance means transaction parsing must be measured and bounded. Large historical scans, expensive cryptographic work and unbounded JSON parsing must not be performed in a normal HTTP request.
- When the free request/CPU boundary is reached, fail closed and stop accepting new contributions rather than acknowledging an unverified payment.

Status: **PUBLISHED FREE PLAN VERIFIED / REMOTE SUPPORTER API NOT IMPLEMENTED**.

### 3.3 Cloudflare D1 Free — preferred structured contribution ledger

Published Free-plan allowances:

- 5 million rows read per day.
- 100,000 rows written per day.
- 5 GB total D1 storage across the account.
- 10 databases per Free account.
- 500 MB maximum size per Free database.
- 50 D1 queries per Worker invocation on Free.
- Seven-day Time Travel point-in-time recovery on Free.

Sources:
- Pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Limits: https://developers.cloudflare.com/d1/platform/limits/
- Time Travel: https://developers.cloudflare.com/d1/reference/time-travel/
- Free-tier enforcement notice (effective 2026-09-01): https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/

Important behavior:
- Since 2026-09-01, daily read/write quota excess causes D1 queries to fail until the quota resets at midnight UTC. It does not silently expand the free quota.
- Monitor rows read/written, storage, and query latency.
- Use indexes and narrow queries; never perform an unbounded full-ledger scan on every public page load.
- A contribution should have a unique database id, unique transaction signature, exact token mint, amount/base units, source wallet, destination token account, slot, finality status, confirmation timestamp, and event history.
- Use append-only event records and database constraints/triggers to prevent silent rewriting of financial history. Corrections should be new compensating/audit events, not deletion of prior evidence.

Backup boundary:
- D1 Free Time Travel is only seven days. It is useful for operational rollback, not as the sole long-term accounting archive.
- Export immutable, dated JSON/CSV ledger snapshots and publish them in the public repository/Pages archive. Include file hashes and reconciliation totals.
- Keep actual on-chain transaction signatures as the external source of truth for on-chain movements.

Status: **PUBLISHED FREE PLAN VERIFIED / NO REMOTE SUPPORTER DATABASE OR LEDGER DEPLOYED**.

### 3.4 Cloudflare R2 Free — optional, not presently qualified under no-card rules

Published R2 Standard free tier:

- 10 GB-month storage.
- 1 million Class A operations per month.
- 10 million Class B operations per month.
- Internet egress is free.
- The free allowance applies to Standard storage, not Infrequent Access.

Source: https://developers.cloudflare.com/r2/pricing/

No-card qualification issue:
- R2 onboarding instructs users to complete a checkout flow to add an R2 subscription: https://developers.cloudflare.com/r2/get-started/
- Cloudflare's billing guidance says a primary payment method is required to purchase Cloudflare products/services: https://developers.cloudflare.com/billing/get-started/create-billing-profile/

Decision: **DO NOT MAKE R2 A REQUIRED DEPENDENCY** until the actual account flow is tested and proven to activate the free tier without adding a card or payment method. The current design can use D1 for ledger metadata and Cloudflare Pages/GitHub for public redacted evidence files.

### 3.5 Cloudflare Observability — operational logs only

Cloudflare's published schedule states that, beginning 2026-12-01, Free includes 0.5 GB/day log/trace ingestion and seven-day retention; new ingestion stops when the free daily allowance is reached. There is no additional paid overage on Free under that published model.

Source: https://developers.cloudflare.com/observability/pricing/

Decision:
- Sample routine logs and prioritize payment verification failures, quota exhaustion, duplicate signatures, treasury balance mismatches and ledger reconciliation errors.
- Do not treat short-retention runtime logs as the public accounting ledger or long-term proof.
- This pricing transition is future-dated as of this document's 2026-11-11 observation date.

## 4. Solana RPC providers — current candidate comparison

Solana's provider directory lists public and private RPC operators: https://solana.com/rpc. Its provider guide says free RPC is appropriate for development, real-world testing, demos and small private betas, but free shared endpoints are rate-limited, do not autoscale and provide no SLA. Public mainnet Solana Labs endpoints are also explicitly not intended for production applications.

### 4.1 Highest-priority candidates

| Provider / plan | Published free allowance | Qualification assessment |
|---|---|---|
| **Chainstack Developer** | 3 million Request Units/month; one node; WebSocket; no credit card; general Developer-plan ceiling 25 RPS, but Solana Mainnet Developer endpoint is **5 RPS**. | **Priority candidate.** Its 5 RPS mainnet limit is adequate for a bounded treasury poller and low initial contribution volume. Heavy methods including `getProgramAccounts`, `getSupply` and `getTokenAccountsByOwner` are excluded from Developer. Use only the standard methods actually needed and test each. Sources: https://chainstack.com/pricing/ and https://chainstack.com/solana-rpc-chainstack-2026/ |
| **Ankr Public Solana RPC** | Public endpoints; no account or API key required; Ankr documents 20 RPS for its public plan. Solana directory lists `https://rpc.ankr.com/solana`. | **Best no-signup fallback candidate.** Shared public capacity and no SLA; never make it the only verifier. Sources: https://www.ankr.com/web3-api/ and https://www.ankr.com/docs/advanced-api/ |
| **Ankr Freemium** | 200 million API credits/month; standard Node API across supported chains; approximately 1,800 requests/minute under Public rate limits; maximum Node API batch size 100. Freemium has no balance to manage and no overdraft/charges; quota/rate excess returns throttling. | **Priority candidate after account test.** Public docs support no-charge behavior; test account signup without a payment method. Published standard Solana RPC pricing lists 500 API credits per HTTP request, which would represent up to roughly 400,000 standard Solana request-equivalents per 200M-credit month, before other method/account constraints. Sources: https://www.ankr.com/docs/rpc-service/service-plans/ ; https://www.ankr.com/docs/rpc-service/charging-policy/ ; https://www.ankr.com/docs/rpc-service/pricing/ |
| **Alchemy Free** | 30 million Compute Units/month; 25 RPS; 500 CU/second; 5 apps and 5 webhooks. Solana standard JSON-RPC is supported. | **Priority candidate after account/no-card test.** Relevant Solana methods: `getSignaturesForAddress` = 40 CU, `getTransaction` = 40 CU, `getTransactionsForAddress` = 100 CU. Solana gRPC/Yellowstone is separately priced and must not be used for a $0 design. Remember both the 25 RPS and 500 CU/second limits. Sources: https://www.alchemy.com/pricing ; https://www.alchemy.com/docs/reference/compute-unit-costs ; https://www.alchemy.com/docs/chains/solana/solana-api-endpoints/get-transactions-for-address |
| **Helius Free** | $0/month; 1 million credits; 10 requests/second; 1 `sendTransaction`/second; standard LaserStream WebSocket. | **Candidate for testing/secondary verification.** Pricing labels Free as ideal for testing. No SLA or explicit no-card statement was found on the pricing page; verify account signup, terms, method credit costs and commercial-production eligibility before counting it as qualified. Source: https://www.helius.dev/pricing |
| **FluxRPC Free** | 10 GB bandwidth; 15 RPS; WebSocket access; free access explicitly states no credit card required. | **Development/qualification candidate.** Provider describes Free as for testing, local development and experimentation. Measure transaction-response bandwidth and test the relevant methods. Do not infer production SLA or guaranteed uptime. Sources: https://fluxrpc.com/pricing and https://fluxrpc.com/free |

### 4.2 Additional candidates / restricted offers

| Provider / plan | Published free allowance | Qualification status |
|---|---|---|
| **OrbitFlare Free** | 10 RPS; 1 transaction/second; no credit counter within the RPS limit; $0 plan. | **Testing candidate only.** Free tier excluded from its SLA; page describes plan for learning/testing. No-card condition should be tested. Sources: https://orbitflare.com/pricing and https://orbitflare.com/sla |
| **GetBlock Free** | 50,000 CUs/day; 20 RPS; 2 access tokens/endpoints; registered-user plan. | **Conditional candidate.** Verify Solana Mainnet is included in the particular Free account's supported network list, which methods are enabled, and no-card eligibility. Source: https://docs.getblock.io/getting-started/plans-and-limits/cu-and-rate-limits |
| **QuickNode Free Trial** | 10 million credits; 15 RPS; no credit card required; **one-month trial**. | **Temporary qualification only.** Not a permanent free-tier dependency. Source: https://www.quicknode.com/pricing |
| **Solana Labs public Mainnet endpoint** | Public shared endpoint; documented limits include 100 requests/10 seconds per IP, 40 requests/10 seconds per individual RPC, 40 concurrent connections/IP, and 100 MB per 30 seconds. | **Development/sanity-check only.** Solana states public endpoints are not intended for production and may block high-traffic websites without prior notice. Sources: https://solana.com/docs/references/clusters and https://solana.com/docs/rpc |
| **Etherscan (only if Ethereum is selected)** | Free API: 1,000 records/call, 5 calls/second, 100,000 calls/day. | **Not applicable to Solana.** A public Etherscan transaction URL needs no API polling; use the network-specific explorer. Source: https://info.etherscan.com/api-return-errors/ |

Other names in the Solana RPC directory (including Syndica, Blockdaemon, InstantNodes and other private/shared infrastructure vendors) should not be counted as free production capacity unless a current, official, recurring $0 plan and its cardless eligibility are independently established. The existence of a provider in the directory is not evidence of a free plan.

### 4.3 RPC recommendation for a $0 qualification environment

1. Implement one common RPC interface in the Worker.
2. Qualify Chainstack Developer first for authenticated, no-card Solana Mainnet reads.
3. Qualify Ankr's no-signup public endpoint as the independent fallback.
4. Qualify Alchemy or Ankr Freemium as another candidate after a real no-card account test.
5. Use Helius, FluxRPC, OrbitFlare and GetBlock as additional test candidates; do not count them as active until account, terms, methods, quotas and failover tests pass.
6. Cache signatures, store the last processed slot/signature cursor, batch where supported, and fetch full transaction details only for newly observed signatures.
7. If all qualified endpoints fail, exceed quota, disagree, or cannot establish transaction finality, pause new contributions. Never mark a payment successful from a single unverified UI callback or an unconfirmed transaction.

## 5. Indicative RPC workload calculation

This is a sizing example, not a forecast of supporter demand.

Assume one treasury address is scanned once per minute:

- 60 minutes × 24 hours × 30 days = **43,200 signature-list checks/month**.
- Fetch full transaction details only for new transactions. At 1,000 new contributions, that is approximately 1,000 additional transaction-detail calls.
- Example total: roughly **44,200 RPC calls/month**, before health checks, retries, pagination, fallback duplication and other application features.

Indicative allowance comparisons:
- Chainstack's 3M Request Units/month is materially above this simple polling example, assuming only standard one-unit methods are used; Solana Mainnet is still limited to 5 RPS.
- Alchemy's `getSignaturesForAddress` and `getTransaction` at 40 CU each would use about 1.77M CU for the above example, below its 30M monthly allowance. Actual method mix and CU throughput must be measured.
- Ankr's published 500-credit standard Solana HTTP method price would imply about 22.1M credits for 44,200 calls, below the 200M Freemium allowance. This is a planning conversion from its public method pricing, not an account usage test.
- Helius' exact credit consumption depends on the selected method; measure it using real method-specific usage data rather than assuming one RPC request equals one credit.

Do not poll from each browser. One backend poller should update the shared ledger; user page views should read the cached ledger/API response.

## 6. Uptime monitoring and CI

### 6.1 UptimeRobot Free

Published Free offer:
- 50 monitors.
- Five-minute monitoring interval.
- Basic status page (unique UptimeRobot URL).
- No credit card required.
- Commercial and business use explicitly allowed.
- Free plan does not provide login seats or notify-only seats.

Sources:
- https://uptimerobot.com/pricing/
- https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan
- https://uptimerobot.com/terms/

Use a small number of HTTP/keyword monitors for:
- supporter page availability;
- Worker `/health` endpoint;
- public ledger endpoint freshness / availability;
- optionally a separate public archive URL.

UptimeRobot is an availability monitor, not a payment verifier, RPC provider, accounting ledger or independent security auditor.

### 6.2 GitHub Actions (public repository)

GitHub documents standard GitHub-hosted runner usage as free and unlimited on public repositories. It is appropriate for HTML/JavaScript tests, dependency checks, schema tests, migration tests, ledger-export validation and PR CI.

However:
- Scheduled workflows run on the default branch only.
- The shortest supported schedule interval is every five minutes.
- Schedules can be delayed or dropped during high load.
- Public-repository scheduled workflows are automatically disabled after 60 days without repository activity.

Sources:
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows

Decision: **CI and audit automation only; not the live payment confirmation daemon.**

### 6.3 Proposed initial paid-production transition reserve

The owner has previously set a maximum planning envelope of **USDT 150** for the initial paid deployment (hosting, domain and minimal network costs). The Supporter Programme page now uses this as a **provisional aggregate activation threshold**, not as a verified provider quote and not as evidence that production is ready.

The intended gate is:
- Keep the $0 qualification environment as the development and evidence source until the migration has been rehearsed.
- Before accepting contributions, obtain actual order-level quotes for the chosen host, domain, first three months of hosting, essential backup/restore arrangement, and any mandatory paid network, conversion, gas or migration cost.
- Include a contingency. Do not count promotional pricing that expires before the prepaid term without recording both the promotional and renewal price.
- Require the provider to pass legal-entity/terms review, actual account signup and payment-network tests, no-card/no-KYC conditions where required, workload tests, backup restore tests and the relevant security checks.
- If the full initial cost plus contingency fits within USDT 150, that amount may serve as the minimum aggregate migration reserve. If not, revise the threshold **before** opening the programme.
- Do not spend migration funds before the cleared reserve and all activation gates are met. Keep it separately accounted for inside the supporter treasury; it is not ACS reserve and not competition-prize funding.
- Publish how the reserve is treated if the threshold is never reached before accepting any contribution, preserving non-waivable rights under applicable law.

Published candidate-price examples observed on 2026-11-11 show why the first transition may be modest, but neither candidate is approved:
- VPSDEN's 4 GB / 2 vCPU SHADE plan was listed at **€21.39 prepaid for three months**. The provider's published crypto methods include USDT on TRC-20 and ERC-20, not Solana SPL. Provider identity, backup options, terms, actual account eligibility and measured uptime still need due diligence. Sources: https://vpsden.com/pricing/ and https://vpsden.com/payment-methods/
- Cloudzy's 4 GB / 2 vCPU plan displayed a promotional **US$14.48/month** price and a **US$28.95/month** list price at observation time. Three months at the promotional rate would be US$43.44 before any domain, backup, conversion/network fees or contingency. Account-country/payment-processor rules and the complete no-KYC condition were not established. Source: https://cloudzy.com/pricing/ and https://cloudzy.com/payment-methods/ (confirm the exact checkout network and terms; do not infer SPL-USDT acceptance from the word "USDT").
- These examples are market snapshots, not contractual quotes. They do not prove either provider is suitable for AstroCrown production. In particular, a provider accepting TRC-20/ERC-20 USDT is not automatically compatible with a supporter treasury receiving Solana SPL USDT. Prefer the same network end-to-end; otherwise quantify and disclose every conversion, bridge and withdrawal cost before activation.

A reserve threshold can materially reduce the narrow risk of beginning migration without enough funds for known initial invoices. It does **not** make overall risk near zero: provider failure, compromised credentials, data loss, security incidents, legal requirements, renewal pricing and ongoing cashflow remain. Maintain a documented renewal plan and recoverable backup independently of the activation threshold.

The USDT 150 amount is provisional until checkout/order-level verification is complete. It must not be displayed as a guaranteed all-in cost or used to open contributions before the terms and complete spending plan are published.

## 7. Transaction and accounting controls the providers must support

The actual financial rules belong in the application and must not depend on an RPC provider's proprietary interpretation.

### Wallet registration, member pseudonym and public GitHub backup

The wallet is the member's account and the authority for the associated supporter entitlement.

- When a supporter connects a wallet they control, the application generates a random member pseudonym by default.
- The supporter may customize that pseudonym. The pseudonym is a display name, not the authority for the entitlement.
- The registered public wallet address is the authoritative identifier. The wallet controls the multiplier entitlement and signs the contribution and later ACROWN purchase transactions.
- This programme design does not require a legal name or identity document. Do not describe wallet control as legal-identity verification.
- Never request, receive, store, log or export a seed phrase, private key, wallet JSON keypair or recovery phrase. The supporter must retain full control of their wallet.
- A single wallet should map to one member record. The pseudonym may be changed without changing the wallet-bound entitlement.

GitHub backup boundary:
- The current `ACROWN-System/AstroCrown-Web` repository is **public**. The programme may publish the wallet address, member pseudonym, verified contribution transaction references, multiplier eligibility, completed purchase records and the shared remaining programme allowance because these are deliberately public programme records.
- Do not publish seed phrases, private keys, signing material, authentication secrets, API tokens, or unrelated personal information.
- Export dated, append-only public snapshots with cryptographic checksums and reconciliation totals. Protect the archive from routine force-push/deletion and verify that snapshots can be restored. GitHub is a public audit/backup layer, not the sole live system of record.
- Tell supporters before registration that the wallet address, chosen pseudonym and associated programme transactions will be publicly linked. The wallet's on-chain history is independently visible by nature.

This wallet, pseudonym and backup design is a requirement proposal only. No supporter wallet registry or backup job is currently implemented or deployed.

### Global ACROWN purchase allowance and wallet entitlement

The supporter contribution ceiling and the ACROWN purchase allowance are two separate programme limits:

- **USDT 250,000** is the provisional aggregate ceiling for supporter contributions. It does not define the maximum number of ACROWN tokens that may be purchased.
- The programme must publish one separate, fixed maximum ACROWN purchase quantity before opening. Its final number is not established in this research snapshot and must not be invented from the contribution ceiling.
- The first qualifying contribution to a registered wallet must meet the programme's minimum activation threshold. That first qualification activates the wallet's approved multiplier entitlement. The threshold and final multiplier terms are still pending approval.
- There is no separate per-wallet ACROWN quantity ceiling derived from `contribution × multiplier`. The maximum a qualified wallet may purchase is the entire remaining global programme allowance.
- One eligible supporter may therefore purchase all remaining programme-authorized ACROWN, in one or more transactions, if the amount remains available when each transaction is finalized.
- Subsequent purchases do not have a separate programme minimum contribution threshold; each purchase is limited by the current remaining global allowance and the transaction's exact authorized amount.
- Every finalized purchase consumes the same shared allowance. The remaining quantity is total programme allowance minus all finalized programme purchases.
- Multiple wallet addresses must never multiply or recreate the global allowance. Because the programme does not collect legal identity documents, it must not claim to enforce one natural person/one wallet. The anti-dilution control is the single cumulative programme cap, not identity-based wallet counting.
- The live purchase path must enforce the shared cap atomically. Prefer an on-chain programme/contract-level cap where the architecture supports it; the backend must also use an atomic reservation/settlement process to prevent simultaneous transactions from overselling the remaining quantity. A page-only or client-side limit is insufficient.

The exact multiplier's priority/eligibility effect must be written plainly in final terms. It must not be presented as a personal token quantity formula unless that is explicitly re-approved.

### Exact payment amount and excess-transfer warning

The connected-wallet dashboard should construct the authorized transaction and display the exact amount, token, network and destination before the supporter signs. The payment path should reject an amount above the current authorization before transferring tokens wherever the selected on-chain mechanism permits it; this is a transaction rejection, not a promise that AstroCrown will refund or return anything.

Public communications must state all of the following:
- Do not send more than the exact amount displayed by the dashboard.
- An excess amount does not create extra ACROWN entitlement.
- AstroCrown does not promise an automated return, refund or compensation for excess funds.
- A direct transfer or other payment made outside the guarded dashboard flow may be permanently unrecoverable.
- Even a rejected or failed blockchain transaction may consume network/gas fees; such fees are not promised to be returned.
- Supporters must never assume AstroCrown can recover or return an excess transfer.

Do not implement an assumed automatic-refund workflow as a safety guarantee. The stronger control is to construct and validate the exact transaction before wallet approval, while clearly warning that funds sent outside the authorized flow may be lost permanently.

For each contribution:
- Verify the expected network/cluster.
- Verify the exact official USDT mint and expected token program.
- Verify the transfer instruction/transaction succeeded.
- Verify the registered entitlement wallet controls/signs the authorized payment; verify the token-account owner, destination treasury token account, amount in integer base units and token decimals.
- Require the intended commitment/finality before crediting a contribution.
- Store the transaction signature with a unique constraint to prevent double-credit.
- Bind the transaction to the registered wallet and a specific contribution/purchase intent; do not match solely on amount and timestamp.
- Record slot, time, amount, sender, treasury destination, network, mint, confirmation/finality status and explorer URL.
- Activate the wallet's multiplier entitlement only after the first qualifying contribution is deterministically verified and finalized. Update the shared ACROWN remaining allowance only after each purchase is deterministically verified and finalized.

For each outgoing use of supporter funds:
- Record the source wallet, destination, amount, date, purpose/category and transaction signature where on-chain.
- Publish transaction-specific explorer links.
- Track all transfers to intermediate wallets and onward destinations.
- For off-chain payments, publish a redacted invoice/receipt or reconciled evidence record, the amount, payment date, payee category, purpose and a hash/reference. Protect personal, bank and commercially sensitive data where necessary, but do not omit the expenditure.
- Reconcile opening balance + inflows − outflows − network fees = closing balance. Publish unexplained differences and correct them with new audit entries, not silent edits.

A public explorer proves on-chain transaction details; it does not prove the commercial purpose of an off-chain payment. The ledger and supporting evidence are both required.

## 8. Solana transaction fee and no-SOL supporter experience

A Solana transaction always has a fee paid in SOL. Solana documents a designated fee payer, allowing AstroCrown to sponsor the network fee so a supporter can authorize a USDT transfer without separately holding SOL.

Sources:
- https://solana.com/docs/payments/how-payments-work
- https://solana.com/docs/payments/send-payments/payment-processing/fee-abstraction

This is technically possible, but it is **not free**: the sponsor wallet must hold SOL and pay the network fees. Both the supporter and sponsor sign the transaction. The sponsorship wallet, rate limits, abuse controls, fee budget and failure behavior must be designed before offering a "no SOL required" experience. Otherwise the page must disclose that supporters need SOL for the transaction fee.

This network fee is distinct from Cloudflare, RPC or storage provider allowances.

## 9. Current AstroCrown repository readiness

The current repository includes a Cloudflare Worker/D1 passkey-first account qualification path, but its own README states that remote staging is not deployed. It describes local qualification with synthetic data and does not provide a production payment service.

Relevant file:
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/account-continuity/worker/README.md

The current Supporter Programme page PR #176 is a no-index preview. It deliberately has no transfer address or enabled USDT send action. No contribution API, RPC credentials, treasury wallet, on-chain receipt indexer, public ledger backend or off-chain evidence store has been qualified by this page implementation.

Before opening contributions, the following remain mandatory:
- Explicit network choice and verified USDT mint/token program.
- Dedicated supporter treasury and custody/authorization policy.
- Live Worker/D1 deployment and production-parity qualification.
- At least two independent RPC endpoints tested for the required methods, reset/quota behavior and failover.
- Wallet-bound member pseudonym, public GitHub snapshot export, account-to-contribution association and replay/double-credit prevention.
- An approved global ACROWN purchase quantity, first-contribution activation threshold, and atomic shared-cap enforcement across all wallets.
- Exact-amount dashboard transaction construction and rejection of out-of-authorization amounts, plus explicit no-guaranteed-return warnings for excess/manual transfers.
- Append-only public ledger, downloadable versioned snapshots and independent reconciliation.
- Public documentation/evidence publication for all off-chain expenditure.
- Monitoring, quota thresholds, automatic pause/fail-closed behavior and incident recovery tests.
- Security, privacy, legal and jurisdictional review of the contribution and no-voluntary-refund terms.

### Multi-ecosystem wallet connection

The supporter dashboard now presents two independent discovery paths under the same member profile:

- **Ethereum and EVM-compatible networks:** EIP-6963 multi-provider discovery, with EIP-1193 `eth_requestAccounts` and `eth_chainId` for display-only account connection and network identification. A legacy `window.ethereum` provider fallback is used only if no EIP-6963 providers are discovered.
- **Solana:** Solana Wallet Standard registration and `standard:connect`, filtered to Solana account/chain entries.

This permits a multichain wallet such as MetaMask to be discovered in both wallet lists when its browser integration exposes both interfaces. Other EVM wallets can appear in the EVM list; other Solana wallets can appear in the Solana list. The page does not assume that the same provider name proves that two address families belong to the same wallet/account.

Official integration references:
- MetaMask Connect overview (desktop extension, mobile app, EVM and Solana support): https://docs.metamask.io/metamask-connect/
- MetaMask integration options (unified multichain API versus separate EVM/Solana standards): https://github.com/MetaMask/metamask-docs/blob/main/metamask-connect/integration-options.md
- EIP-6963 multi-injected provider discovery: https://eips.ethereum.org/EIPS/eip-6963
- EIP-1193 provider API: https://eips.ethereum.org/EIPS/eip-1193
- Solana Wallet Standard registration: https://github.com/wallet-standard/wallet-standard/blob/master/packages/core/wallet/src/register.ts

The current implementation uses the browser-injected standards directly and adds no MetaMask SDK, WalletConnect or other runtime package. It requests EVM account exposure and current chain ID, and Solana `standard:connect`; it does not request message signatures, EVM signatures, Solana signatures, transaction submission or payments. It is intended for compatible browser-extension providers. MetaMask mobile/QR deep-link transport is not included; adding that would require a separate SDK integration and a further cost/permissions review.

Each connected address is displayed under its own ecosystem. The addresses are not yet proven to be controlled by one common multichain account, and they are not linked into a persisted supporter member record. Before a real entitlement can rely on cross-chain identity, the backend must verify control of each address using chain-appropriate, purpose-bound challenges and record the linkage explicitly. A provider name, matching account label or wallet icon is not proof of common control.

The browser smoke test now injects a synthetic wallet provider that exposes both EIP-6963/EIP-1193 and Solana Wallet Standard. It verifies that the same wallet name can be discovered in both lists, that EVM and Solana addresses/networks display independently, and that neither connection asks for signatures, sends transactions or calls a backend endpoint.

### Supporter page front-end implementation status

The feature branch now contains a supporter dashboard preview at:

- `preview/supporters/index.html`
- `preview/supporters/supporters.js`

The existing homepage links to the clean route `/preview/supporters/` in the current repository preview. The intended eventual production route is `/supporters/` under the single existing AstroCrown public hostname. No separate Pages project or public Worker hostname is required for this page.

The browser interface includes:
- Separate EVM and Solana wallet discovery/connection options, allowing a multichain wallet provider to appear in both lists when it implements both standards.
- Random member pseudonym generation and supporter customization.
- Solana wallet discovery/connection using the Wallet Standard browser event protocol, with no additional front-end dependency.
- Display of the wallet-reported public address and reported Solana chain(s).
- A wallet entitlement dashboard that explains the first-contribution activation threshold, multiplier state, shared global ACROWN allowance and remaining allowance.
- A shared programme cap: an eligible wallet may purchase up to all remaining programme allowance; the page does not calculate a per-wallet token cap from contribution × multiplier.
- A disabled ACROWN purchase control, explicit excess-transfer warning and a no-funds/no-signature preview notice.

The wallet connection is **display-only at this stage**. It does not prove wallet ownership through a backend challenge, register the wallet, save the pseudonym, activate a multiplier entitlement, create a persistent member record, query live balances, or submit a transaction. No message signing, transaction signing, transfer or payment API is called by this front-end script. The displayed allowance and entitlement values remain non-live placeholders until the deterministic backend and the approved programme constants exist.

The existing GitHub Actions Homepage Browser Smoke workflow now exercises the supporter page using a synthetic Wallet Standard provider and verifies pseudonym generation/customization, wallet discovery/connection, explicit unregistered status, no signing/transaction/backend calls, disabled purchase control, the excess-payment warning and responsive layout. This is local browser qualification only; it does not connect a real wallet or qualify a production payment service.

**Remaining implementation before a genuine registration/purchase flow:** persistent supporter records and pseudonyms, server-verified wallet proof/challenge, first-contribution intent and threshold enforcement, authoritative global purchase allowance with atomic reservation/settlement, on-chain USDT transaction verification, public ledger and archival exports, and the production domain/backend binding. Until those are implemented and independently tested, wallet display must not be represented as registration or entitlement activation.

## 10. Qualification gates and evidence to record

Do not label a provider `PRODUCTION_ELIGIBLE` based only on a public pricing page. Record these independent gates:

1. `OFFICIAL_FREE_OFFER_VERIFIED`
2. `NO_PAYMENT_METHOD_REQUIRED` — tested in the actual account signup/activation flow.
3. `COMMERCIAL_USE_ALLOWED` — terms support AstroCrown's actual use case.
4. `MAINNET_AND_METHODS_AVAILABLE` — the exact network and each required RPC method work on the Free plan.
5. `LIVE_PROBE_PASS`
6. `QUOTA_AND_RESET_OBSERVED`
7. `NO_PAID_FALLBACK` — over-limit/error state fails closed and cannot auto-charge.
8. `PRIVACY_AND_DATA_POLICY_APPROVED`
9. `FAILOVER_AND_RECONCILIATION_TESTED`
10. `TASK_QUALIFIED` — the provider meets the actual receipt-verification workload.
11. `PRODUCTION_ELIGIBLE` — all mandatory gates pass; limits, reset timing and known service risks are documented.

Record the account plan, terms version/date, observed response headers, method-level consumption, actual quota resets, failure status, no-card screenshots/evidence (without exposing credentials), and the exact test commit. Unknown or untested means BLOCKED, not PASS.

## 11. Official source register

- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Cloudflare Pages Functions pricing: https://developers.cloudflare.com/pages/functions/pricing/
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- Cloudflare D1 Time Travel: https://developers.cloudflare.com/d1/reference/time-travel/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2 setup: https://developers.cloudflare.com/r2/get-started/
- Cloudflare billing profile: https://developers.cloudflare.com/billing/get-started/create-billing-profile/
- Cloudflare Observability: https://developers.cloudflare.com/observability/pricing/
- Solana RPC directory: https://solana.com/rpc
- Solana RPC provider guide: https://solana.com/docs/rpc/providers
- Solana cluster rate limits: https://solana.com/docs/references/clusters
- Solana payment details: https://solana.com/docs/payments/how-payments-work
- Solana fee abstraction: https://solana.com/docs/payments/send-payments/payment-processing/fee-abstraction
- Tether supported protocols: https://tether.to/en/supported-protocols/
- Ankr service plans: https://www.ankr.com/docs/rpc-service/service-plans/
- Ankr charging policy: https://www.ankr.com/docs/rpc-service/charging-policy/
- Ankr Solana API pricing: https://www.ankr.com/docs/rpc-service/pricing/
- Chainstack pricing: https://chainstack.com/pricing/
- Chainstack Solana RPC limits: https://chainstack.com/solana-rpc-chainstack-2026/
- Alchemy pricing: https://www.alchemy.com/pricing
- Alchemy CU costs: https://www.alchemy.com/docs/reference/compute-unit-costs
- Helius pricing: https://www.helius.dev/pricing
- FluxRPC free tier: https://fluxrpc.com/free
- OrbitFlare pricing/SLA: https://orbitflare.com/pricing and https://orbitflare.com/sla
- GetBlock plan limits: https://docs.getblock.io/getting-started/plans-and-limits/cu-and-rate-limits
- QuickNode pricing: https://www.quicknode.com/pricing
- Etherscan API limits: https://info.etherscan.com/api-return-errors/
- UptimeRobot Free plan: https://uptimerobot.com/pricing/ and https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan
- GitHub Actions public runner billing: https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job
- GitHub Actions schedule behavior: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows

## 12. Final research conclusion

The current free offers are sufficient to build and stress-test the supporter page, its deterministic payment-verification logic, its public ledger and its monitoring. They may also support a deliberately bounded, low-volume private beta once every gate passes.

They do **not** yet prove that AstroCrown can safely accept the full public USDT 250,000 target on permanently free infrastructure with adequate availability. In particular, free/shared RPC plans carry no production SLA, several provider accounts still need no-card and commercial-term tests, R2 is not qualified under the no-card constraint, and the live Cloudflare Worker/D1 backend is not yet deployed.

Therefore: keep the contribution button disabled until provider qualification, treasury controls, on-chain verification, ledger publication, backups and fail-closed behavior are implemented and evidenced.
