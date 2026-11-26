# AstroCrown Page-Entry Notices and Feature-Status Standard

**Recorded:** 26 November 2026  
**Status:** Owner-approved product and implementation standard  
**Scope:** Public AstroCrown website, staging pages, first-party services and future page routes.

## 1. Purpose

Every AstroCrown page must explain the current environment, operational status of its features, page-specific risks and material user responsibilities before the visitor proceeds. The notice system is part of the product's transparency and governance controls, not merely decorative UI.

The global public-test notice remains in place until AstroCrown has completed its operational-readiness and production-release gates. A page or Worker being reachable does not establish that the services it links to are operational.

## 2. Mandatory page-entry procedure

Each published page must have a page-specific notice, a required unchecked acknowledgement checkbox and a Continue control that remains disabled until the visitor selects the checkbox.

The notice includes:
- the global public-test explanation and default-to-public warning;
- the page's own feature-status list;
- network, wallet, financial and data risks relevant to that page;
- a clear statement of what the visitor can and cannot do;
- an acknowledgement that the visitor has read and understood the notice.

The X control must not silently bypass a mandatory notice. On secondary pages it returns the visitor to the homepage. Escape/cancel does not dismiss the notice. On the homepage, the acknowledgement remains the route to enter the site.

The system may remember acknowledgement for 12 hours for the same page and notice version. A material change to notice content, feature status, network, risk or page behavior requires a new version and fresh acknowledgement. Browser-side memory is a convenience only; it is not account authorization.

For protected Worker APIs, page-specific acknowledgements are verified by short-lived, signed, HttpOnly, SameSite cookies scoped to the relevant API path. Server checks remain authoritative. The page acknowledgement is not a login, account permission, transaction approval, legal waiver or consent to unrelated processing.

## 3. Canonical feature-status labels

Only the following labels are permitted:

| Label | Meaning |
|---|---|
| **LIVE · STAGING** | The specific feature has passed the stated staging qualification and is operational only in the named staging environment. It is not a claim of mainnet or production readiness. |
| **LIVE · MAINNET** | The named mainnet feature has passed its independent financial, security, operational and release gates and is explicitly enabled. |
| **DEVNET** | The feature operates only on its named development/test network. Its notice must identify the network, chain/network ID as appropriate, test asset and an exact verified official faucet link or address. Test tokens have no mainnet value. |
| **FOR DEVELOPMENT · READ ONLY** | A prototype, design, research or preview surface. It may display information but must not perform live transactions, payments or operational state changes. |

No other wording may silently substitute for these labels. Status is assigned per feature, not per page. A page-delivery badge such as LIVE · STAGING describes only that the page is being served; the notice must say so explicitly and must show every feature's separate status.

**Unlabelled means FOR DEVELOPMENT · READ ONLY.** An unknown, expired, missing, malformed or unverified status record must fail closed to that status. Never infer LIVE from a working link, successful wallet connection, API response, deployed Worker, database presence, CI pass or visual appearance alone.

## 4. DEVNET and faucet requirements

A DEVNET label cannot be issued without:
- exact network name and network identifier;
- official testnet faucet URL or address, verified against the network operator's current documentation;
- supported test-token identity and warning that it has no mainnet value;
- explicit statement of whether the feature is read-only, signs a message, or submits a test transaction;
- tests proving that the relevant client and server reject mainnet when a testnet is intended.

A faucet is a source of test tokens, never a payment destination. Do not invent, guess or reuse a faucet address across networks.

As of this standard's initial registry, no general site feature is marked DEVNET because an exact faucet and end-to-end feature qualification have not yet been established in the registry.

## 5. Public-test and wallet disclosures

The public-test warning must clearly state that public submissions may be visible to anyone on the internet; visitors must use invented, non-identifying details and never disclose personal/sensitive information, production credentials, seed phrases, private keys or wallet recovery secrets.

Wallet connection and off-chain message signing are distinct from blockchain transactions. An ownership signature must be explicitly described as an off-chain proof, not a token approval, transfer, payment, gas action or spending authorization.

AstroCrown's current approved general account direction is wallet-only primary identity. The primary wallet is the sole account login and recovery authority. Auxiliary transaction wallets cannot sign in or recover the primary identity. This direction is not represented as operational until the exact account API, wallet-family adapters, browser journeys, abuse controls, account/session lifecycle and adversarial tests pass.

Genesis qualifying payments, ACROWN purchases and delivery remain separately gated. A page being LIVE · STAGING does not activate those financial features.

## 6. Registry and implementation

The canonical initial register is `development/page-entry/feature-status.json`. Each page entry has:
- stable page ID and notice version;
- page title;
- page-delivery status and explanation;
- one or more feature records with stable IDs, status and detail;
- exact DEVNET network/faucet information where applicable.

Shared UI assets live in `development/page-entry/`. Both the restricted Worker staging build and the restricted static preview build copy only these explicitly allowlisted assets. Do not publish the full repository, `development/` or backups.

Current page IDs include homepage, Genesis, account, administrator, legal/policy, community, NOVA, Council and Trade Bots. New service pages must add an explicit registry record and build/test coverage before publication.

## 7. Change control and qualification

Before changing a feature to LIVE:
1. identify the exact user-visible capability and environment;
2. record implementation commit and independent evidence;
3. complete functional, security, privacy, accessibility and failure-path checks appropriate to the capability;
4. qualify exact production/staging network and provider configuration;
5. update the central status registry and page-specific explanation;
6. increment the page notice version whenever material notice/status/risk information changes;
7. add/adjust automated tests and obtain the required owner approval for activation.

A CI pass qualifies only what that exact workflow actually tests. A static build test does not qualify a Worker API; a local D1/virtual-wallet test does not prove remote Cloudflare deployment or real wallet compatibility. Payment activation, account release and production publication retain their separate owner-approval gates.

## 8. Initial status

The first central register identifies page delivery as LIVE · STAGING while marking current market data, generic wallet-only account sign-in, dashboards, Genesis identity/payment/purchase/member badge, community, NOVA, Council and Trade Bots as FOR DEVELOPMENT · READ ONLY. This is intentional: the existing website is hosted, but those features have not all passed their respective release gates.
