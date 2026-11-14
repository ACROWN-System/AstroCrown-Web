# Block 8 — Whole-System Infrastructure Qualification 01

**Review date:** 2026-11-14  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Related work:** PR #177 — Privacy & Transparency Centre  
**Cross-repository evidence:** `ACROWN-System/NOVA` main, `nova-operational-state`, and AstroCrown-Web PR #175 portability/handover record  
**Authority:** Block 8 Infrastructure Acceptance Contract and the user's explicit whole-system infrastructure requirements  
**Review mode:** Repository inventory plus official public documentation. No cloud resource was created or deployed; no account was registered, no credential or payment setting was changed, no card/bank/identity document was entered, and no crypto transfer or live provider test was performed.

> This is the first whole-system infrastructure map, not a statement that the complete environment is already qualified. It separates actual $0 development components from future crypto-paid transition services and records missing capabilities. The controlling acceptance contract remains `2026-11-14-Block-8-Infrastructure-Acceptance-Contract-and-Candidate-Reclassification.md`.

## 1. Objective and acceptance boundary

AstroCrown and NOVA must be built and qualified as a **real, live, operational system with a total $0 development budget**, without KYC, government identity verification, bank or conventional financial-account details, credit/debit cards, or mandatory fiat balances.

The environment must expose machine-readable interfaces so NOVA can carry out ordinary provisioning, deployment, monitoring, quota management, failover, backup, restore, renewal and reconciliation. The Imperial Council / authorized roles approve policy, risk and budget through AstroCrown and NOVA. External providers must not require recurring manual human operations or support intervention to keep ordinary services running.

The future paid path must use direct cryptocurrency, preferably USDT with the exact network and canonical token identified. USDC, BTC, AKT/ACT, NOS, ETH or another crypto-native asset may be considered where a provider does not accept USDT, but the token/network, fee, payment intent, settlement detection, refund/credit rules and automation path must be recorded. An external provider that does not accept crypto may be used in the $0 stage only as a replaceable, non-strategic component; the system must have a qualified replacement route before relying on it for paid operations.

## 2. Existing repository foundation

### 2.1 GitHub / NOVA control plane

The two repositories already contain a meaningful machine-operated control plane:

- NOVA has scheduled `nova_heartbeat.yml`, `nova_probe_scheduler.yml`, `nova_GPU_heartbeat.yml`, validation, health tests, provider qualification and report-only Weak RSI workflows.
- NOVA's operational state is persisted in `NOVA/health_state.json` and `NOVA/roster.json` on branch `nova-operational-state`.
- AstroCrown-Web contains preview/browser CI, account-continuity tests, a Cloudflare staging deployment/qualification path and credential-readiness workflows.
- PR #175 records that NOVA's control plane has not yet been migrated or duplicated into AstroCrown-Web and that the complete portability bundle/paid-host adapter has not been implemented.

**Current disposition: QUALIFIED — $0 DEVELOPMENT CONTROL-PLANE COMPONENT, WITH OPERATIONAL LIMITATIONS.**

GitHub's official documentation states that standard GitHub-hosted runners for public repositories are free and unlimited. The standard Ubuntu runner provides a fresh hosted virtual machine, but it is ephemeral: it is appropriate for CI, tests, scheduled jobs, packaging, deployment and bounded compute, not as an always-on persistent application server or general GPU host.

Machine-operability exists through GitHub Actions, repository/branch APIs, workflow dispatch, artifacts and secrets/variables. A GitHub account and repository remain external control-plane dependencies, and public repositories expose committed code. Never commit secrets, private memory or sensitive user data. Use repository/environment secrets and an approved secret boundary.

Important constraints:
- scheduled workflows are not a substitute for a low-latency always-on scheduler;
- runners are ephemeral and must export state to GitHub/Cloudflare or another durable store;
- action/runtime quotas and abuse/use policies still apply;
- NOVA must retain its own idempotency, retry, lease, concurrency, audit and failure-recovery mechanisms.

Sources:
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job
- https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- https://docs.github.com/en/actions/concepts/billing-and-usage

### 2.2 Cloudflare Pages / Workers / D1 / R2

Cloudflare account 02 is the existing candidate account in the handover plan. Previous project inventory recorded no Workers project or D1 database at that time. This review did not sign in to the account; current resource state and billing/profile requirements must be rechecked before creating anything. The existing credential names are `CLOUDFLARE_API_TOKEN_02` and `CLOUDFLARE_ACCOUNT_ID_02`; secret values are not repeated here.

**Current disposition: CORE $0 DEVELOPMENT PLATFORM CANDIDATE; ACCOUNT-SPECIFIC NO-CARD STATE AND LIVE WORKLOAD QUALIFICATION STILL REQUIRED.**

Official documented Free limits reviewed:

| Component | Documented free allocation | Intended role / hard limit |
| --- | --- | --- |
| Pages | 500 builds/month; 1 concurrent build; up to 20,000 files/site; 25 MiB/file | Static web delivery, preview and public education pages. Static asset requests are free/unlimited; Pages Functions consume Workers request quota. |
| Workers | 100,000 requests/day; 10 ms CPU/invocation; 128 MB memory; 50 subrequests/request; 5 Cron triggers/account | API routes, account/business logic, edge validation, scheduled tasks and lightweight automation. Not a persistent VM or GPU service. |
| D1 | 5 million rows read/day; 100,000 rows written/day; 5 GB aggregate storage; up to 10 databases on Free | Transactional relational application state within documented SQLite/D1 semantics. Daily over-limit operations fail until reset; requests do not silently become paid. |
| R2 Standard | 10 GB-month storage; 1 million Class A operations/month; 10 million Class B operations/month; no egress charge | Object storage, exports, media, snapshots and backup copies through an S3-compatible API. |

A Workers Paid plan has a $5/month account minimum and uses conventional Cloudflare billing; no direct crypto payment option has been qualified. Therefore Cloudflare is a replaceable $0 development platform, not an approved crypto-paid strategic provider. Avoid provider lock-in: isolate D1 access behind a repository/data adapter; use schema migrations and portable exports; use R2/S3-compatible interfaces; keep Workers-specific bindings behind runtime adapters.

Over-quota design:
- D1 daily read/write limits result in failed operations until the reset; implement reserve thresholds, indexed/optimized queries, caching, bounded retries and degraded/read-only behaviour.
- Workers Free requests/CPU limits must cause deterministic queuing, rejection or failover, never an automatic billable upgrade.
- Keep no more than the available free Cron trigger count; consolidate NOVA jobs rather than duplicate schedulers.
- Disable unnecessary analytics/payload logging and make retention explicit. Do not use Cloudflare AI Gateway by default for confidential prompts because payload logging is on by default.

Sources:
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/d1/reference/limits/
- https://developers.cloudflare.com/r2/pricing/

### 2.3 Solana RPC / blockchain connectivity

**Current disposition: QUALIFIED FOR DEVELOPMENT AND TESTING; NOT PRODUCTION RPC.**

- Solana's official Devnet endpoint is publicly accessible and provides a faucet/airdrop flow for non-real SOL used in testing. It is the proper route for transaction/account integration tests and development mints.
- Official Solana public Mainnet and Devnet RPCs are rate-limited. The published cluster page currently lists about 100 requests per 10 seconds per IP, 40 per 10 seconds for a single RPC method, 40 concurrent connections and 100 MB per 30 seconds. The documentation expressly warns that public endpoints are not intended for production applications and have no SLA.
- Helius Free advertises 1 million credits/month, 10 requests/sec and 1 `sendTransaction`/sec. Helius's developer page also documents a wallet-connect path to obtain an RPC URL without a payment card or email. This is a useful replaceable development endpoint; account/route terms and exact no-KYC applicability still require a controlled qualification.
- Do not route real payment acceptance or treasury verification through public shared RPC as the only production source. Solana's production readiness documentation requires private RPC, a fallback endpoint, confirmation/priority-fee logic, correct token identifiers, key protection and transaction monitoring.

**$0 development route:** Solana Devnet + official public RPC, with a separately configured Helius Free endpoint if the precise route is eligible. Cache reads, handle 429/403, check slot freshness, isolate transaction sending from read calls and implement multiple endpoints.

**Crypto-paid transition gap:** No private Solana RPC service has yet been proven to accept direct USDT/crypto with no KYC and a fully machine-operable API. Paid Helius/QuickNode/Alchemy dollar plans are not presumed eligible. A future self-hosted RPC on crypto-funded infrastructure is technically possible but hardware/storage cost and operational burden must be measured; it is not assumed to fit the provisional USDT 150 deployment budget.

Sources:
- https://solana.com/docs/references/clusters
- https://solana.com/docs/rpc
- https://solana.com/docs/rpc/providers
- https://solana.com/docs/tools/production-readiness
- https://www.helius.dev/pricing
- https://www.helius.dev/blog/solana-rpcs-and-helius

## 3. $0 operational development baseline

| Category | Proposed $0 component | Status | Boundary |
| --- | --- | --- | --- |
| Source control / CI | Existing public GitHub repositories and Actions | QUALIFIED COMPONENT | Ephemeral runners; no persistent service/GPU; code is public. |
| Static site | Cloudflare Pages Free | CONDITIONAL ON ACCOUNT STATE | Static site and 500 builds/month; static assets free. |
| Application/API runtime | Cloudflare Workers Free | CONDITIONAL ON ACCOUNT STATE | 100k requests/day and 10 ms CPU; no long-running background process. |
| Product database | Cloudflare D1 Free | CONDITIONAL ON ACCOUNT STATE | 5m row reads/day, 100k row writes/day, 5GB; daily cap fails closed. |
| Object storage | Cloudflare R2 Free | CONDITIONAL ON ACCOUNT STATE | 10GB-month, request quotas; S3 compatibility and portability adapter required. |
| Scheduler / monitoring | Existing NOVA workflows + Workers Cron + NOVA health state | QUALIFIED ARCHITECTURE COMPONENT | Avoid duplicate schedulers; 5 Cron triggers/account; GitHub schedule delays are possible. |
| Blockchain development | Solana Devnet + public RPC; optional Helius Free | QUALIFIED FOR DEV/TEST | Test assets only; shared public RPC is not a production payment service. |
| Authenticator / account recovery | Existing merged passkey-first account foundation and offline recovery-key design | LOCAL/SYNTHETIC QUALIFICATION ONLY | Remote account staging/production is not enabled; no requirement to add email/SMS. |
| AI inference | Existing Groq/Gemini/Cloudflare bounded routes and separately qualified free endpoints | PARTIAL / WORKLOAD-RESTRICTED | Exact terms, quota and response contracts vary by provider/model. Never assume confidential-data suitability. |
| GPU / persistent compute | None currently active in NOVA's GPU roster | NOT QUALIFIED | GitHub runners and Workers are not replacement GPU capacity. |
| Durable offsite backup | GitHub snapshots + encrypted R2 exports | ARCHITECTURE CANDIDATE | Must implement and test exports/restores; separate backup account/location preferable. |
| Transactional email/SMS | Not required for the current passkey + offline recovery-key account model | NOT A CORE DEPENDENCY | Prefer in-app account notifications and NOVA/Council alerts; do not introduce phone/email verification. |

**Whole $0 environment status: PARTIAL — several core live-capable components are available, but the end-to-end AstroCrown system is not yet qualified.** Current missing or incomplete items include account/Worker remote staging, application/database deployment and backup/restore evidence, persistent/long-running compute, GPU capacity, a qualified private Mainnet Solana RPC, and actual end-to-end production-like load/failover tests. No component in this table authorizes public real-money payment or real-user launch by itself.

## 4. Crypto-paid transition candidates

These services are not $0 resources. They are potential future paid replacements, to be used only after the Council/NOVA has approved a bounded amount and the exact network/token, API, plan and provider terms have passed qualification.

### 4.1 NoctHost — strongest current general VPS / GPU automation candidate

**Disposition: CONDITIONAL — CRYPTO-PAID TRANSITION CANDIDATE; NOT YET ACCOUNT- OR WORKLOAD-QUALIFIED.**

Official documentation states:
- crypto top-ups require no ID documents/KYC; email/password account signup;
- USDT is accepted on Tron, BSC, Ethereum and Polygon; the USDT minimum top-up is $5; cards are a separate optional checkout route and are not needed when funding with crypto;
- other accepted crypto includes BTC, ETH, LTC, XMR and others;
- REST API and MCP support account creation, balance/hourly spend, provider availability, server creation, bulk deployment, polling, reboot/start/stop, destroy, backups and restore;
- API keys have scopes (read, deploy, destroy, support, billing);
- top-up API returns a payment link or address; on-chain confirmation updates the prepaid balance and NOVA's internal wallet/payment adapter can sign/send only after an internal Council budget authorization;
- GPU servers are offered through an OVHcloud route; the OVH GPU path has limitations: fixed image, no console, reverse-DNS, IP swap, on-demand backups, reinstall or provider password reset. Regular VPS backup API is currently provider-limited (on-demand backups only on Vultr; 7-day retention).

NoctHost resells actual servers from Vultr, DigitalOcean, Hetzner and Linode, plus OVHcloud GPU servers, through one account and API. Its service contract, account data handling, upstream host terms, data location and account-level operational controls must be checked before it becomes strategic. Keep provider IDs visible in the NOVA resource record; this is one management layer over multiple underlying infrastructure providers, not multiple independent capacity sources.

**Why it matters:** It currently offers the closest documented combination of a no-KYC crypto top-up, USDT support, machine-readable balance/usage, complete ordinary server lifecycle, and GPU access through an upstream provider. The Council wallet adapter can automate on-chain top-ups after approval; the VPS provider itself does not need a human operator for ordinary provisioning.

Sources:
- https://nocthost.com/docs/faq
- https://nocthost.com/docs/api
- https://nocthost.com/docs/mcp
- https://nocthost.com/docs/custom-requests
- https://nocthost.com/terms
- https://nocthost.com/docs/acceptable-use

### 4.2 EQVPS — USDT on Solana and agent-native REST/MCP

**Disposition: CONDITIONAL — CRYPTO-PAID TRANSITION CANDIDATE; NOT FULLY LIFECYCLE-QUALIFIED.**

Official terms (updated 4 October 2026) state that KYC is never required, including signup, payment and continued use; agent/API accounts can be created programmatically with a Bearer token. Payment is from a prepaid crypto balance. Official payment docs list USDT and USDC across supported networks including Solana, Ethereum, Base, BNB Chain, Polygon, Arbitrum and others. Card/Apple Pay/Google Pay are optional alternatives, not prerequisites for the crypto path.

The platform exposes a REST API and MCP server. Agent accounts do not need an email OTP: the agent calls `register_account` / `login` and receives a token. The API can discover plans, create orders, retrieve crypto checkout links, list services, query status/metrics, power/manage/reinstall servers and access various account functions. The MCP guardrails explicitly state that the agent can create top-up invoices but cannot sign/send the crypto payment; a wallet must pay the invoice. This is compatible with the user's internal governance design only if the Council-approved AstroCrown wallet adapter signs and submits the transaction under a fixed spending policy. Do not give the provider or agent an unrestricted treasury key.

Published terms say service is best-effort with no specific uptime guarantee; backups are the customer's responsibility unless purchased, and backup self-service may not be available in every location. The REST route list reviewed did not conclusively show a programmatic service-destroy/cancel endpoint; verify complete server cancellation and renewal lifecycle before core selection. Small NAT VPS plans may not provide a dedicated public IPv4; Cloudflare Tunnel or a dedicated-IP plan may be required. Prices shown include a Micro plan from $5/month and Small from $8/month, but dedicated-IP add-ons, tax, network fees and exact regional availability must be included in final quotes.

**Why it matters:** It is one of the few candidates explicitly listing USDT on Solana, allowing direct use of the user's preferred blockchain rail, and provides machine-operable provisioning without identity verification. However, machine payment is a Council wallet operation, not an autonomous payment function built into the EQVPS agent tool; availability and service deletion need further qualification.

Sources:
- https://eqvps.com/en/terms
- https://eqvps.com/en/about
- https://eqvps.com/en/docs
- https://eqvps.com/en/docs/paying
- https://eqvps.com/en/docs/auth
- https://eqvps.com/en/docs/mcp
- https://eqvps.com/en/docs/rest
- https://eqvps.com/en/docs/mcp-guardrails
- https://eqvps.com/en/docs/backups

### 4.3 0xHost — domain registration plus crypto VPS API

**Disposition: CONDITIONAL — HOSTING/DOMAIN TRANSITION LEAD; LEGAL, REGISTRAR AND ABUSE-POLICY REVIEW REQUIRED.**

The provider's public pages state that signup requires a username and email, not identity documents or a phone number; account recovery is via email. A CAPTCHA is required. It lists USDT and USDC on Ethereum, Tron, BSC, Polygon and TON, alongside other cryptocurrencies. Its API documentation describes 79 endpoints for servers, orders, domains, hosting and account balance. The documented order flow supports crypto invoices, polling for payment completion, balance top-ups, and auto-renewal. It also shows an API example that registers a domain name and duration, and the public site lists 22 domain TLDs with prices starting around €15/year. The website states that the API covers domain registration, renewal and billing.

Material caution:
- Domain registrations may require registrant data and verification depending on the exact TLD/registry. The provider's no-KYC hosting statement does not establish no additional registry requirements for every domain.
- Verify the exact domain TLD, WHOIS/RDAP data, privacy/proxy options, DNS API, auto-renewal and expiration lifecycle before ordering.
- The provider markets itself as “bulletproof/offshore” and says abuse reports stop at its own desk and are not forwarded to customers. This policy needs careful legal, reputational and service-availability review before hosting AstroCrown's public platform.
- The company describes a shared 10Gbps node port without a guaranteed minimum speed. Uptime/SLA and its own infrastructure/registrar role must be separately verified.
- The current reviewed public documentation does not yet establish a formal API key scope model or an independent uptime guarantee.

**Why it matters:** The API's domain-order example and multi-chain USDT payment are unusual and potentially solve the unresolved conventional-domain/automation gap. It is not selected or approved; verify registrar accreditation, TLD eligibility and acceptable-use alignment first.

Sources:
- https://0xhost.com/
- https://0xhost.com/register
- https://0xhost.com/api-documentation/
- https://0xhost.com/terms
- https://0xhost.com/privacy

### 4.4 Kvantis — multi-cloud hourly crypto VPS API

**Disposition: CONDITIONAL — CRYPTO-PAID VPS CANDIDATE; API AND PAYMENT MATRIX NEED REVALIDATION.**

Kvantis advertises email/password registration without ID, phone or card, and a REST API to deploy, list, destroy servers and check balance. It brokers Vultr, Hetzner, DigitalOcean and Linode locations, supports hourly billing with a monthly price cap, and advertises USDT, USDC, BTC, ETH, SOL, XMR, LTC, TON and other tokens. The website shows $11/month Atom (1 vCPU/1GB/25GB, plus 19% VAT) and $35/month Core (2 vCPU/4GB/80GB, plus VAT). It states that on zero balance servers are suspended with an 8-hour recovery window, then deleted if not topped up. The page describes a USDT TRC20 minimum top-up of $25 and lower fees on BEP20/TON routes; exact minimum and accepted network/token matrix must be reconfirmed before payment.

The service is promising as an hourly machine-managed VPS broker but not yet selected: confirm the complete API specification and server deletion/renewal behavior, accepted USDT networks and minimum amount, tax, upstream host terms and exact no-KYC/payment conditions. The provider's six-hour port scan and support-chat recommendations are informational; NOVA should perform its own security controls and must not depend on the provider's human support.

Sources:
- https://kvantis.org/
- https://kvantis.org/ (current pricing and API description)

### 4.5 WolfCloud — USDT API and x402 USDC/Base, but incomplete published lifecycle

**Disposition: CONDITIONAL / NON-CORE UNTIL API LIFECYCLE IS COMPLETE.**

WolfCloud's OpenAPI 3.1 specification and website state:
- account creation requires no KYC, no card, no email or password; a one-time account token is issued;
- prepaid crypto top-ups support BTC, XMR, ETH, LTC, TRX, USDT (including a TRC20 route), SOL and USDC on Base via x402;
- top-up invoice status can be polled and the balance is credited on confirmation;
- the USDC/Base x402 flow supports HTTP 402 challenges and EIP-3009 payment authorization, enabling a machine to pay without a dashboard;
- API can list the catalog, create VPS instances, list servers, get details and retrieve root credentials.

The critical gap is that the published OpenAPI currently exposes no server destroy, stop, resize, reinstall or renewal route. Terms target 99.9% availability but disclaim guarantees; the service does not provide backups and limits liability for data loss. Account access relies on a single token which cannot be recovered, only rotated. Until a complete server lifecycle API is documented and tested, it must not be a core automated hosting provider.

**Why it matters:** The x402 USDC/Base route is a strong example of programmatic crypto payment, and the classic invoice API lists USDT. It is not yet a fully qualified operating host. Keep as a route candidate, not as infrastructure selected for the system.

Sources:
- https://wolfcloud.io/api
- https://wolfcloud.io/openapi.json
- https://wolfcloud.io/terms
- https://wolfcloud.io/agents

### 4.6 BitLaunch — established crypto VPS abstraction with limited coins

**Disposition: CONDITIONAL — FALLBACK COMPARISON, NOT PREFERRED.**

BitLaunch offers email/password signup without full name/address and cryptocurrency-only payment. Its listed accepted currencies are BTC, LTC and ETH, not USDT. It provides a REST API and CLI for server creation, listing/deletion, transactions and account balance. It resells DigitalOcean, Vultr and Linode services, so upstream host terms also apply. It charges hourly from prepaid balance and documents that at zero balance servers stop/suspend and are destroyed after a grace period of up to 48 hours. The API's account object contains a `negativeAllowance` field which must be verified/configured at zero before considering automation.

This is a credible crypto-only API/CLI abstraction, but its older terms/privacy pages, absence of USDT and upstream terms make it a secondary candidate beside NoctHost/EQVPS.

Sources:
- https://bitlaunch.io/
- https://bitlaunch.io/developer-api/
- https://bitlaunch.io/terms/
- https://bitlaunch.io/privacy/
- https://bitlaunch.io/billing/

### 4.7 Akash Network — decentralized compute with native crypto escrow

**Disposition: CONDITIONAL — CRYPTO-PAID COMPUTE/GPU TRANSITION, NOT A $0 RESOURCE.**

Akash's self-custody Console Air/CLI allows an operator to deploy infrastructure through the Akash network without the card-managed Console path. Deployments use AKT for network fees and ACT (USD-pegged compute credit) for escrow/provider settlement. The official CLI can create, inspect, update and close deployments non-interactively, and `--bid-select cheapest`, `--yes` and JSONL output support scripts. AuthZ and fee grants provide delegated operations with expiration and spending limits. A deployment still needs adequate ACT escrow and AKT gas, and unused escrow is refundable when closed; there is no direct USDT payment in the reviewed path.

This is a strong machine-native decentralized compute route if we can budget for AKT/ACT and qualify provider hardware, security, region, pricing and workload compatibility. It is not included in $0 capacity and is not assumed to fit the final migration budget without a tested quote.

Sources:
- https://akash.network/docs/
- https://akash.network/docs/console/console-air/
- https://akash.network/docs/cli/
- https://akash.network/docs/deployments/
- https://akash.network/docs/authz/

### 4.8 Nosana — decentralized GPU marketplace

**Disposition: CONDITIONAL — CRYPTO-PAID GPU TRANSITION; FREE OFFER FAILS CURRENT RULE.**

Nosana's free-credit offer requires a verified payment method, so it is not a qualifying $0/no-card resource. Direct wallet deployments use NOS and SOL gas; the REST API and TypeScript SDK support job/deployment lifecycle, and idempotency keys help avoid duplicated paid jobs. The no-KYC/account conditions, full cost model, provider isolation and host data confidentiality need further verification. Use public/synthetic data on marketplace hosts unless confidential execution can be independently established.

Sources:
- https://learn.nosana.com/
- https://docs.nosana.com/
- https://nosana.com/terms-and-conditions/

### 4.9 Storj — S3-compatible storage with USDC L1 top-ups

**Disposition: CONDITIONAL — CRYPTO STORAGE ROUTE; FUNDING NOT FULLY MACHINE-OPERABLE.**

Storj offers S3-compatible object storage and a USDC payment option, but the reviewed route requires initiating a deposit in the billing UI to obtain the deposit address, accepts USDC on Ethereum L1 only, and credits the balance after confirmations. It is not a USDT route, not a programmatic invoice/payment API in the reviewed docs, and unused USDC deposits are not a normal withdrawable balance. It may be useful as secondary offsite storage if the one-time account/address setup and recurring funding path are reconciled with Council automation. R2 is the current $0 object store.

Sources:
- https://docs.storj.io/dcs/billing/adding-funds
- https://docs.storj.io/dcs/billing/payment-methods
- https://docs.storj.io/dcs/

### 4.10 ENS — crypto-native domain alias, not standard web DNS

**Disposition: CONDITIONAL — OPTIONAL CRYPTO-NATIVE NAMING, NOT A PRIMARY DNS DOMAIN.**

ENS .eth names can be registered/renewed on-chain using USDC (and other supported assets/flows). Pricing for names of five or more characters begins at $8/year. Smart-contract registration/renewal is machine-operable through an authorized wallet, so it fits the crypto payment and automation principle. However, .eth is not an ICANN DNS domain: ordinary browsers and email still require ENS-aware resolution/gateway support or a conventional DNS hostname. Treat it as a parallel identity/alias or Web3 content-resolution feature, not as the only public website domain.

Sources:
- https://docs.ens.domains/
- https://ens.domains/
- https://docs.ens.domains/ensv2/

## 5. Cross-category architecture proposal

### 5.1 $0 development stage

- GitHub Actions remains the repository CI and NOVA scheduled-control plane, with all durable state exported.
- Cloudflare Pages serves the preview/site; Workers provide API/edge runtime; D1 provides transactional data; R2 provides object storage and encrypted backup copies.
- Cloudflare account 02 is the starting candidate only; verify current resource and account state and no-card/no-billing profile before creating resources.
- Solana Devnet and shared RPC endpoints support transaction tests; Helius Free can add a replaceable 1M-credit development route if wallet-connect eligibility is confirmed.
- Current account architecture remains passkey/recovery-key first; do not introduce email/SMS as a mandatory dependency.
- NOVA monitors provider quotas and state in its current operational branch and uses Cloudflare Cron or existing GitHub Actions without creating duplicate schedulers.
- AI inference remains per-route/per-model and restricted by exact provider data terms; GPU remains a documented capacity gap.

### 5.2 Crypto-paid transition stage

- Preferred VPS/GPU orchestration candidates for further qualification: NoctHost first for lifecycle/USDT/API/GPU; EQVPS for USDT-on-Solana and agent-native API/MCP; 0xHost for domain + hosting API subject to registrar/AUP review; Kvantis as an hourly multi-cloud comparison; WolfCloud for x402 payment only after complete lifecycle; Akash for decentralized AKT/ACT deployments; Nosana for NOS/SOL GPU.
- Council/NOVA payment service must create a bounded payment intent only after internal approval. It obtains the invoice/deposit address from the provider, verifies chain/token/network/destination/amount against allowlists, submits only the authorized transaction, waits for confirmation, polls the provider invoice, checks the credited balance, and records reconciliation.
- Do not allow external agents to hold an unrestricted treasury key. Payment signers should be isolated with exact contract/token/network allowlists, caps, expiry, nonce/replay protection and independent on-chain verification.
- VPS and object-storage APIs should have least-privilege credentials. Provider account and payment adapter must be separate from service workload secrets.

### 5.3 Portability

- Application code must separate business logic from the Cloudflare runtime through adapters (HTTP runtime, database/repository, object store, scheduler, queue, secrets).
- D1 schema and SQLite assumptions must be explicit; create export/import and relational migration tests before relying on a VPS/PostgreSQL move.
- Use portable container/OCI artifacts for long-running services and workers that must later move to VPS/Akash.
- Keep static assets and user-generated objects in an S3-compatible interface; use R2 now and design an alternate backend.
- Use standard OpenAPI/REST, JSON-RPC and documented wallet standards where available. Do not let an MCP integration become the only interface; expose REST/CLI/IaC for NOVA.
- Maintain tested backup/restore and provider exit procedures continuously, not only at migration time.

## 6. Unresolved gaps

| Need | Current finding | Next evidence required |
| --- | --- | --- |
| Public custom domain | Free development can use `pages.dev` / `workers.dev`; 0xHost has crypto domain-order API; ENS is non-DNS | Verify 0xHost registrar, TLD terms, registrant data, DNS management and auto-renew lifecycle for chosen TLD |
| Private production Solana RPC | Public and Helius Free routes are development-only; no crypto-paid managed RPC qualified | Find no-KYC USDT service with API or verify economics of a self-hosted node on Akash/crypto VPS |
| General persistent CPU VPS at $0 | No qualifying free persistent server found; Workers are serverless and GitHub runners ephemeral | Keep workloads serverless/CI until transition budget is authorized |
| GPU at $0 | No active qualifying provider in NOVA's GPU roster | Continue provider search or use only ephemeral CPU/available GPU routes that pass all gates |
| Private durable backup | GitHub snapshots/R2 can form a first layer; Storj accepts USDC L1 but funding is not machine-native | Implement encrypted export/restore; qualify an automated crypto funding route and independent storage |
| Domain / DNS paid transition | No fully qualified conventional registrar route yet | Verify 0xHost domain data/registrar conditions or another crypto registrar with API |
| End-to-end crypto billing | Provider APIs exist but must be connected to Council wallet and tested | Define payment intent, allowlist, approval, invoice settlement and reconciliation contract |
| Full production runtime | Core $0 components not yet deployed/qualified end-to-end | Remote Worker/D1 staging, full account lifecycle, backups, load/failover and security testing |

## 7. Next work order

1. Verify the existing Cloudflare account 02 state and account-level free/no-billing eligibility, then design a reversible Pages/Workers/D1/R2 staging architecture without deploying until the current NAV/approval process permits.
2. Prioritize NoctHost, EQVPS and 0xHost for deeper route-level qualification, including exact USDT network/mint, no-KYC account flow, API key scopes, server/domain cancellation, quota/billing, support boundaries, acceptable-use rules, SLA and data backup.
3. Select one provider-neutral VPS provisioning adapter and one wallet-payment adapter. Simulate invoice/payment/confirmation with mocks before any real transaction.
4. Define a Cloudflare-to-VPS tunnel/edge handover and test that public traffic can move without changing account or business logic. Do not assume a NAT VPS is directly Internet-reachable.
5. Resolve a conventional domain and production Solana RPC replacement before public launch. Do not treat .eth or shared public RPC as equivalent.
6. Establish D1/R2 encrypted backup export and restore, plus a tested migration route to a crypto-paid object/VPS store.
7. Continue Block 8 candidate discovery only where there is a concrete missing category or hard-gate question.

## 8. Evidence boundary

This is a public-document and repository-state assessment, not a service qualification test. It does not verify account-specific signup screens, live provider quotas, uptime, actual region availability, card/KYC prompts, DNS or registrar backend, account billing profile, payment route, or API behavior. Those require a permitted, bounded account or synthetic test with no money moved and no card/KYC submitted. No provider is approved for production by this document.

No provider credentials, secrets, account sessions, bank/card information, identity documents or crypto wallets were accessed or changed. No cloud resources or databases were created; no deployment, credit claim, payment, transfer or workload was initiated. No NOVA active roster/workflow or AstroCrown runtime was modified.
