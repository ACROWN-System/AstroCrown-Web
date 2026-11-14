# Cloudflare Pages Public Preview — Deployment Qualification

**Date:** 14 November 2026
**Repository:** ACROWN-System/AstroCrown-Web
**Working branch:** deploy/cloudflare-pages-public-preview-2026-11-14
**Status:** Static deployment package implemented; CI and Cloudflare deployment pending

## Objective

Replace the htmlpreview.github.io-only viewing method for the current AstroCrown homepage with a genuine Cloudflare Pages HTTPS host, and publish the Supporter Programme as a first-party route on the same host. Preserve the user's $0/no-card/no-KYC constraints and the distinction between preview and operational product.

## Source provenance

- Homepage: development/index.html from current main, source blob a2d2865e1a11fc047039e1bfd8b66a73a54cc6d4.
- Supporter page and wallet display script: PR #176 branch feature/supporter-programme-page-2026-11-11.
- Privacy Centre: PR #177 branch feature/privacy-transparency-centre-2026-11-14.
- Homepage account UI assets: current main account-continuity prototype CSS, account UI JavaScript and administrator wallet UI.

## Findings and architecture

1. The user supplied an immutable 90378cfc... homepage snapshot. Current main has advanced, so the prepared deployment reads the latest homepage from main rather than publishing an old snapshot.
2. The Jekyll configuration excludes development/ and backup/. Publishing the full source directory would violate the repository's publication boundary.
3. The homepage depends on three separate account assets. These are copied individually to matching paths; the Python/SQLite prototype, tests, case-management pages, audit files and other development content are not copied.
4. The account UI is forced into hosted browser-preview mode. It reports no authenticated account, disables account creation and real passkey operations, and does not connect to a live backend.
5. The homepage development warning stays present. Its staging acknowledgement is explicitly configured as local-only in the static bundle.
6. The Supporter Programme remains a preview. Public wallet addresses may be displayed only following a visitor-initiated wallet connection; no signing, transfer, payment, registration or entitlement activation is implemented.
7. Supporter wording preserves the latest requirement: ACROWN delivery on Solana; future USDT payment acceptance must cover every supported USDT network an eligible wallet can use to pay. The actual chain/token allowlist is still a pre-launch requirement, not an implementation claim.
8. One Pages project hosts /, /supporters/ and /privacy-transparency.html. A separate supporter domain is unnecessary for the first preview.
9. The Git integration build uses only Node.js built-ins. It requires no Cloudflare API token, npm dependency install or Worker/D1 resource.

## Publication allowlist

The build script writes exactly these ten files: index.html, supporters/index.html, supporters/supporters.js, privacy-transparency.html, account-continuity/prototype/account-prototype.css, account-continuity/prototype/account-ui.js, account-continuity/prototype/admin-wallet-ui.js, robots.txt, _headers and _redirects.

Any additional published file must be deliberately added to the build script and its exact-output test. The site must not publish the complete development/ or backup/ tree.

## Impact analysis

### Benefits
- Real HTTPS hosting without waiting for the application backend or a custom domain.
- First-party Supporter Programme route on the same official host.
- No paid API, Worker, D1, R2 or npm runtime is needed for the static preview.
- Exact output list is built and testable from Git.

### Risks and controls
- Source disclosure: prevent with the exact allowlist and an automated equality check.
- False impression of a live account system: force read-only hosted-preview mode and hide Sign Up/recovery pathways.
- Accidental real-asset use: preserve the development warning and keep wallet/payment actions disabled.
- Search indexing: include noindex meta, robots.txt and X-Robots-Tag headers.
- Account/billing mismatch: check the actual Cloudflare Account 02 settings before project creation; public documentation cannot verify the user's dashboard state.
- Domain/DNS disruption: do not change DNS, nameservers or purchase a domain in this task.

## Verification

Scripts prepared:
- scripts/build-cloudflare-pages.mjs
- scripts/test-cloudflare-pages-build.mjs
- .github/workflows/cloudflare-pages-static-preview-tests.yml

The GitHub workflow builds the same dist directory and checks the ten-file allowlist, required routes, local references, noindex controls, read-only account configuration and absence of supporter wallet signing/transaction calls.

Cloudflare Pages project creation and first deployment are not accessible through the connected tools in this session. The existing Cloudflare staging workflow provisions an account-continuity Worker/D1 environment and is deliberately not used as a static Pages deployment mechanism.

## Explicit non-actions

No API key, private key, seed phrase, Cloudflare secret or account ID is committed. No card, bank, KYC, identity, paid service, custom domain, DNS, Worker, D1 or R2 resource is created. No supporter contribution, swap, bridge, token purchase, wallet signature or blockchain transaction is enabled.

## Remaining gates

- [ ] CI checks pass on this branch.
- [ ] PR reviewed and merged to main.
- [ ] Cloudflare Account 02 is checked for Free/no-card eligibility.
- [ ] Pages project is created through Git integration for ACROWN-System/AstroCrown-Web.
- [ ] Build command, root directory, output directory and Node version are configured as specified.
- [ ] First pages.dev deployment is verified at desktop and mobile widths.
- [ ] Custom domain and production promotion are assessed separately.
