# Cloudflare Pages — AstroCrown Public Preview Deployment

**Status:** Deployment package prepared; Cloudflare project setup and first public deployment are still pending
**Date:** 14 November 2026
**Repository:** ACROWN-System/AstroCrown-Web
**Production branch:** main
**Suggested Pages project name:** astrocrown-public-preview (availability must be checked in Cloudflare)
**Routes:** /, /supporters/, /privacy-transparency.html

## 1. Decision

Use one Cloudflare Pages project for the AstroCrown website preview and the Supporter Programme preview. The supporter programme is a first-party route at /supporters/ on the same host; it is not a separate identity, treasury or website.

Build the website from an explicit publication allowlist. Do not set the Pages output directory to development/ and do not publish the full repository. The source repository contains internal audit records, prototypes, backup copies and other development material that must not be exposed as public site files.

## 2. Cloudflare Pages Git configuration

Create the project through Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git.

| Setting | Required value |
| --- | --- |
| Git repository | ACROWN-System/AstroCrown-Web |
| Production branch | main |
| Root directory | / (repository root) |
| Framework preset | None |
| Build command | node scripts/build-cloudflare-pages.mjs |
| Build output directory | dist |
| Node.js version | 22 |

Use Git integration, not Direct Upload. Cloudflare documents that a Pages project created with Git integration cannot subsequently switch to Direct Upload. The build uses Node.js built-ins and does not need npm install or a Cloudflare API token.

After Git integration is connected, pushes to main should build and deploy the static preview automatically. Pull-request preview deployments can be used for review.

## 3. Published routes and files

The build script produces exactly ten files:

- index.html — AstroCrown's current development homepage, visibly labelled as a visual review build with illustrative market data and no live services.
- supporters/index.html and supporters/supporters.js — the Supporter Programme preview at /supporters/.
- privacy-transparency.html — the public education guide.
- Three account-preview assets required by the homepage: account-prototype.css, account-ui.js and admin-wallet-ui.js.
- robots.txt, _headers and _redirects.

The homepage source is taken from current main, not frozen to the older htmlpreview Git commit. The build inserts links to the Supporter Programme and Privacy & Transparency Centre.

## 4. Functional and safety boundary

This initial Pages project is static content only:

- No Worker, Pages Function, D1, KV, R2, backend, API or production account service is deployed.
- The hosted account interface is forced into an unauthenticated, read-only browser demo. Account creation, passkey registration/sign-in, recovery and administrator authentication are not available on the static host.
- The homepage's Worker-staging acknowledgement is disabled in this static bundle. Do not trigger the separate Cloudflare Worker/D1 staging workflow for this Pages deployment.
- The Supporter Programme wallet interfaces discover and display public Ethereum/EVM, Tron and Solana addresses after an explicit user action. The TronLink path uses the TIP-6963 provider interface. They do not sign messages, authorize transactions, transfer tokens, register wallets or activate entitlements.
- Contributions and ACROWN purchases remain disabled. No USDT receiving address, QR code or payment instruction is published. The page states that funds must not be sent.
- The current supporter architecture specifies the initial real-mainnet USD₮ allowlist: Ethereum ERC-20, Tron TRC-20 and Solana SPL, using Tether's canonical token contract/mint identifiers. ACROWN delivery remains on Solana. This is a network/token identity decision, not payment activation: the three receiving treasury addresses remain unset and all contributions/purchases remain disabled in this static preview. The detailed rules, multiplier allowance model, 180-day activation window and backend gates are recorded in development/supporter-programme/MAINNET-PAYMENT-AND-ENTITLEMENT-ARCHITECTURE.md.
- No KYC, identity-document, bank, card, email/SMS authentication or fiat-payment flow is introduced.

Both website routes and the privacy guide are marked noindex. The robots file and Cloudflare Pages response headers also discourage indexing. Keep this boundary until the actual production system, privacy data flows, account lifecycle, payment system, support process, accessibility and security requirements are qualified.

## 5. Free-tier and no-card verification

Cloudflare's public Pages documentation describes availability on the Free plan, including 500 builds per month, one concurrent Free build, up to 20,000 files per site and free/unlimited static asset requests. This ten-file static site is well inside those published technical limits at the date of this review.

Those published limits do not prove the status of the specific Cloudflare account. Before creating the project, inspect the intended Cloudflare account 02 and verify:

1. The project will remain on Pages/Free.
2. No card, bank account, paid subscription or billing upgrade is required or attached for this operation.
3. No paid add-on, paid Workers usage model or paid product is enabled.
4. The correct public GitHub repository and main branch are selected.
5. The first hostname is the assigned pages.dev hostname. No custom domain or DNS change is included here.

No API token or account ID should be committed to Git for this static Git-integrated Pages build. The current tools do not expose the user's Cloudflare dashboard/account state; therefore account 02's no-card status and the first deployment are not yet verified.

## 6. Domain and hosting plan

Use the Cloudflare-assigned pages.dev hostname first. The planned routes are:

- / — AstroCrown public preview.
- /supporters/ — Supporter Programme preview.
- /privacy-transparency.html — Privacy & Transparency Centre.

A custom domain can be considered later, once the domain is owned and its DNS/Cloudflare zone is checked. No domain purchase, nameserver change or DNS migration is performed by this PR.

## 7. Verification

The GitHub Actions workflow cloudflare-pages-static-preview-tests.yml runs the same Node build command intended for Cloudflare Pages and checks:

- The output directory contains exactly the ten approved files.
- No backup, test, prototype, audit or unrelated development source is published.
- The homepage, supporter page and privacy guide are present.
- Relative page, script and stylesheet references resolve.
- The account UI is forced into read-only hosted-preview mode.
- The supporter page clearly states contributions are not open and the JavaScript contains no signing/transaction/payment method.
- Noindex/robots and response-header controls are present.

CI proves the build and publication allowlist, not Cloudflare account configuration or successful public hosting. After connecting Git integration, test the actual pages.dev URL at desktop and mobile widths and verify the three routes.

## 8. Impact analysis

**Benefit:** AstroCrown and its Supporter Programme gain real HTTPS-hosted preview routes without waiting for the full backend or buying a domain. Both routes share one official host and the published files remain auditable.

**Risks:** visitors may mistake a preview for a functioning financial service, and a monorepo build could accidentally publish internal files. The visible preview banners, no-funds warnings, noindex controls, account read-only mode and exact publication allowlist mitigate these risks.

## 9. Completion status

- [x] Current homepage source identified from main.
- [x] Supporter Programme source identified and wallet copy aligned to the Solana delivery / multi-network USDT requirement.
- [x] Privacy & Transparency guide source identified.
- [x] Static publication allowlist and Node build prepared.
- [x] Dependency-free publication-boundary test prepared.
- [x] GitHub Actions workflow prepared.
- [ ] GitHub Actions build and tests pass on this branch.
- [ ] PR reviewed and merged to main.
- [ ] Cloudflare account 02 Free/no-card state verified.
- [ ] Pages Git integration connected to the intended repository.
- [ ] First Pages deployment completed and all public routes tested.
- [ ] Custom domain considered separately.

**No payment, account, wallet-signing, production backend, Worker/D1 deployment, domain purchase or DNS change is authorized by this static preview package.**

## Official Cloudflare references

- Pages Git integration: https://developers.cloudflare.com/pages/configuration/git-integration/
- Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Static HTML Pages guide: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- Pages custom domains: https://developers.cloudflare.com/pages/configuration/custom-domains/
- Pages Functions pricing/limits: https://developers.cloudflare.com/pages/functions/pricing/
