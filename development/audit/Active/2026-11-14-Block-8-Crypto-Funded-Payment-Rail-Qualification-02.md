# Block 8 — Crypto-Funded Payment Rail Qualification 02

**Review date:** 2026-11-14  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Related work:** PR #177; Whole-System Infrastructure Qualification 01; Infrastructure Acceptance Contract; Provider-Neutral Adapter and Crypto Settlement Contract  
**Scope:** Crypto-funded outgoing supplier payments, invoice settlement, payment cards and merchant vouchers  
**Review mode:** Official public documentation and terms. No account was opened, no provider was contacted, no credential/API key was obtained, no KYC/KYB or financial detail was submitted, no payment instrument was issued, and no funds were moved.

> This report evaluates payment routes that may accept cryptocurrency from AstroCrown and complete a supplier payment in fiat or merchant credit. It does not treat a crypto-payment gateway that only helps a merchant receive money as an outgoing supplier-payment intermediary.

## 1. Objective and controlling acceptance rule

The objective remains a complete, live, operational AstroCrown/NOVA system developed at a total $0 cost, without KYC, government identity verification, bank-account or conventional card details from AstroCrown or its payer-side operators, and with machine-operable routine operations.

The existing Infrastructure Acceptance Contract controls this review. Its no-KYC/no-bank/no-card rule applies end-to-end to the payer-side chain. A service does not qualify merely because it accepts USDT at the first step if it subsequently requires AstroCrown or its operator to complete identity verification, connect a bank account, obtain a conventional card, or maintain a fiat payment account.

The distinction is:

- **Payer-side requirement:** Any KYC/KYB, identity, bank or conventional-card condition imposed on AstroCrown, the authorized payer/operator, or a beneficial owner. These are hard-gate failures under the user's current rule.
- **Intermediary infrastructure:** The intermediary may use its own bank, card issuer, acquirer or regulated settlement partners internally. That alone is not an AstroCrown-side account requirement.
- **Supplier-side beneficiary:** For a fiat invoice, the supplier may provide the supplier's own bank beneficiary details. AstroCrown must not be required to open, own, control or link that receiving account.
- **End-to-end proof:** A route is not complete when the intermediary has merely received crypto. It must prove the supplier-side fiat payout/card capture/voucher redemption and the resulting supplier credit or invoice settlement.

No compliance or sanctions restriction should be bypassed. If an otherwise interesting intermediary must lawfully identify the payer, that route is unavailable for this project under the present requirements; we do not attempt to evade that condition.

## 2. Executive conclusion

**No candidate reviewed in this block is qualified for core autonomous AstroCrown payments.**

The candidate landscape divides into four groups:

1. **Strongest machine-operable crypto-funded card lead — IZIPAY.** It publishes a REST API for card issuance, crypto funding, transaction history, freeze/unfreeze, balance return, and webhook-based card/3-D Secure events. Its current terms state that ordinary card issuance/top-ups do not normally require ID documents within published limits. However, production automation is allowed only for approved B2B partners under a signed integration agreement; the underlying licensed issuers/processors are not identified in the public material reviewed; provider-side AML/source-of-funds requests and freezes remain possible; India eligibility is unverified; and a documented negative-card-balance condition conflicts with strict no-debt/fail-closed requirements. It remains **CONDITIONAL — NOT QUALIFIED**, but is the highest-value official evidence request.
2. **Crypto-funded business card API — Kripicard.** It advertises programmatic USDT funding, limits, freeze controls and webhooks, but only approved businesses receive the API, and production requires a compliance review. Banking partners can require additional KYC/source-of-funds material or freeze funds. It remains **CONDITIONAL — NOT QUALIFIED**; the business API's no-KYC/KYB eligibility is not proven.
3. **Manual crypto-funded card bridge — Mehbit.** It says ordinary signup/card issuance does not request ID documents and accepts USDT/USDC; it also publishes successful merchant-specific payment tests. But it relies on a consumer app/Telegram-style workflow, has no published machine API, allows rare issuer/competent-authority identity requests, and charges 5% to load a card plus deposit and transaction fees. It is **RESTRICTED — MANUAL NON-CORE**, not a NOVA autonomous payment rail.
4. **Crypto-to-fiat invoice providers — TrustLinq, Nexus Pay, Stablegate, XEROF.** These demonstrate the requested fiat invoice-settlement category, but their documented identity requirements and/or human/manual operation/company-account limitations fail the current core gates.

Gift-card APIs such as 0fiat, Cryptorefills and Bitrefill may become a narrowly scoped adapter for exact catalogue items, but they are not general invoice settlement, and their B2B/identity/partner requirements remain conditional or restrictive.

## 3. Candidate qualification matrix

| Candidate | Route type | Crypto input | Payer-side KYC/bank/card status | Machine operation | Current classification |
| --- | --- | --- | --- | --- | --- |
| IZIPAY Business API | Crypto-funded virtual card | USDT (TRC20 example), USDT/USDC and other supported routes | Public terms say no ID for ordinary use within limits; service-provider requests and B2B production approval still unresolved | REST API, card lifecycle, transactions, webhooks; 3DS challenge still needs workflow review | **CONDITIONAL — NOT QUALIFIED; highest-priority evidence request** |
| Kripicard Business API | Crypto-funded virtual card | USDT | Production compliance review required; upstream partner KYC/source-of-funds powers | REST/API, spend limits, freeze, webhooks; partner-only docs | **CONDITIONAL — NOT QUALIFIED** |
| Mehbit | Crypto-funded virtual card | USDT / USDC | No normal ID flow advertised; rare identity request possible; phone plus email/Telegram | Manual app/account; no public API found | **RESTRICTED — MANUAL NON-CORE** |
| TrustLinq | Crypto-to-fiat supplier invoice | USDT ERC20/TRC20, USDC and other stablecoins | Explicit identity verification before use | Public guide is account/app workflow; no public machine API found in reviewed materials | **FAIL — KYC HARD GATE** |
| Nexus Pay | Crypto-to-fiat supplier invoice | USDT / USDC | Personal account only; ID verification required for card and operations over thresholds; no company account | Human operator manually reviews invoice and makes bank transfer | **FAIL — COMPANY / AUTOMATION / VERIFICATION GATES** |
| Stablegate | Crypto-to-fiat bank payout | USDT on Ethereum example; routes depend on account | Customer KYC and corporate KYB explicitly part of integration; bank details registered as destination | Strong REST API, orders, fees, limits, polling and webhooks; third-party payout may wait on invoice/operations | **FAIL — KYC/KYB HARD GATE** |
| XEROF | Crypto-funded supplier fiat payout | USDT/USDC, including supplier payout routes | Company documents plus identity verification for each signatory; regulated Swiss AML intermediary | Online business workflow and auditable settlement; public API not confirmed | **FAIL — KYC/KYB HARD GATE** |
| 0fiat | Supplier-specific gift card / merchant credit | USDT / USDC and other listed assets | Consumer no-KYC claim does not establish B2B partner eligibility; compliance varies by market/product/provider | REST API for catalog, quote, order, delivery | **CONDITIONAL — VOUCHER-ONLY; partner/compliance unknown** |
| Cryptorefills | Gift card / top-up / eSIM | USDT/USDC, including Tron | Full name required for some Tron stablecoin orders; spending limits and KYC escalation; whitelabel/partner arrangements | REST API, order validation/creation, streaming or polling order status | **RESTRICTED / CONDITIONAL — VOUCHER-ONLY** |
| Bitrefill | Gift card / product voucher | Crypto, including listed stablecoin payment options | Guest/personal limits are not a corporate no-KYC API route; higher limits and corporate accounts require verification / due diligence | Consumer checkout and partner API; corporate program requires onboarding | **RESTRICTED — NOT A CORE COMPANY ROUTE** |
| Tekkō | Crypto-funded card API | USDT TRC20 / USDC ERC20 routes advertised | KYB and identity onboarding required for API/card issuance | Strong API but subject to KYB | **FAIL — KYB HARD GATE** |

The table classifies only the exact reviewed route, not every product that the company may offer. "Conditional" means no production integration or account activation is authorized.

## 4. Candidate detail

### 4.1 IZIPAY Business API — highest-priority evidence request

**Current classification: CONDITIONAL — NOT QUALIFIED.**

Official documentation:
- https://izipay.me/api-docs/
- https://izipay.me/terms-conditions
- https://izipay.me/payment-gateway
- https://izipay.me/services

What the public API documents:
- REST/JSON API using Bearer authentication and optional HMAC request signing.
- Programmatic virtual-card issue and top-up, with crypto deposit instructions and on-chain credit confirmation.
- Card retrieval/listing, transaction history, freeze/unfreeze, return balance and card-to-card transfer.
- Account/pool balance management.
- Webhook/event delivery for card status, top-ups, transactions and 3-D Secure codes.
- Idempotency keys for some card issuance/transfer operations.
- A sandbox that simulates card issuance and payments without consuming real crypto or issuing a spendable card.
- A card-top-up example using USDT TRC20; the API accepts other listed token/network variants, subject to its actual per-route support.

Public commercial terms shown on 13 November 2026:
- Virtual card issuance: USD 49.99 one-time.
- Card top-up: 3% of top-up amount.
- Monthly maintenance: USD 0.
- Published per-transaction limit: USD 50,000.
- Published monthly spend limit: USD 200,000.
- Card issuance fees are non-refundable after blockchain payment confirmation; if no card is issued within 72 hours, the stated remedy is replacement or, at IZIPAY's discretion, account credit rather than a crypto refund.
- Card balance withdrawal to crypto wallet carries a 2% processing fee.

No-KYC wording and limitations:
- Current terms say the platform does not collect government identity documents, biometrics or proof of address for ordinary card issuance/top-ups within stated limits.
- The card is issued by licensed third-party providers, not IZIPAY itself.
- Those providers can pause/freeze cards, request additional source-of-funds information, block transactions and report suspicious activity.
- Remaining card balances may require AML verification before withdrawal after account termination.
- The public page refers to restricted jurisdictions and Section 3, but the currently retrieved page text does not establish whether India is supported. India must therefore remain UNKNOWN, not PASS.
- The business API is not open automation for every account. Terms prohibit bots/headless automation unless the operator is an approved B2B partner using the official API under a signed integration agreement. B2B API access is discretionary and subject to separate API terms.
- The public material reviewed does not identify the licensed issuing bank/program manager, full settlement chain, or exact jurisdiction coverage for the proposed AstroCrown card/account type.

Important financial safety concern:
- API documentation shows bank transaction/cross-border/FX/3DS/decline fees can be deducted from the card balance.
- It states that when the balance cannot cover a fee, the balance can go negative and the next top-up will cover the shortfall first.
- This conflicts with AstroCrown's strict no-debt/no-surprise-spend principle unless IZIPAY proves that negative balances can be disabled or strictly capped and that no other credit/overdraft exposure is possible. Do not top up or test live funds while this remains unresolved.

3-D Secure:
- The API can receive a one-time 3-D Secure code by webhook and expose it through a polling endpoint.
- Its documentation says to relay the code to the cardholder to complete the payment. This demonstrates code delivery, not a fully unattended way to satisfy every merchant's interactive challenge.
- A payment route that routinely needs a human to complete 3-D Secure is not an autonomous core route. Any integration must demonstrate lawful, secure, merchant-compatible handling without moving a human approval step outside AstroCrown.

Why it remains a lead:
- It is currently the clearest documented example of a crypto-funded card service with a broad machine interface, balances, transaction history, freeze controls and webhooks.
- It might support infrastructure merchants that accept Visa/Mastercard but do not accept crypto.

What must be evidenced before reconsideration:
1. Written confirmation that an AstroCrown company/business account can use the B2B card API without KYB, KYC, government ID, proof of address, bank/card details or a conventional fiat account.
2. Written confirmation of service availability to the intended operator/company jurisdiction, including India where applicable, and exact card BIN country/merchant-country restrictions.
3. Full legal identity and role of the issuing bank, program manager, custodian, conversion provider, processor and any other relevant financial intermediary.
4. Exact conditions and limits under which any source-of-funds or identity documents can be demanded; clarify whether ordinary API operation can proceed without an identity gate.
5. Signed B2B API terms and confirmation that recurring NOVA automation is permitted.
6. Negative-balance/fee behavior: prove that issuer fees cannot create a debt or debit a future deposit without a matching authorized payment.
7. Exact API coverage for funding, card creation, freeze, spend limits, 3DS, failed/declined/returned payments, refunds, reconciliation and account closure.
8. A no-funds sandbox test before any separately approved live test.
9. Written quote for all issuance, funding, FX, network, cross-border, 3DS, declined-payment, refund and withdrawal costs.

Until all questions are answered with documentary evidence, status stays CONDITIONAL — NOT QUALIFIED.

### 4.2 Kripicard — partner API, compliance review unresolved

**Current classification: CONDITIONAL — NOT QUALIFIED.**

Official documentation:
- https://home.kripicard.com/kripicard-api-documentation
- https://home.kripicard.com/terms-and-conditions

Published API capabilities:
- REST API for virtual Visa card issue/management.
- Programmatic USDT funding.
- Per-card spend limits, freeze/unfreeze and webhook events for authorizations, top-ups and declines.
- Sandbox for approved partners.
- Full technical API reference is supplied to approved partners rather than published as a complete public schema.

Blocking conditions:
- API access is limited to approved businesses, fintechs, platforms and agencies after partner onboarding.
- Production keys are provided after a compliance review.
- Terms state card issuance, settlement and custody depend on independent regulated banking partners.
- These partners may freeze/hold/block balances, reverse transactions or request additional KYC/source-of-funds material before funds are released.
- Merchant acceptance is not guaranteed; unauthorized-charge disputes use a manual support route.
- The public terms do not identify each relevant issuer/program manager or conclusively establish AstroCrown's jurisdictional eligibility, no-KYB business onboarding or unrestricted company-card use.

Evidence required:
1. Written no-KYC/no-KYB eligibility for the exact business API and production account, not merely the consumer/basic card tier.
2. Exact issuing bank/program manager and regulated partner list.
3. Jurisdiction matrix including India and the actual corporate/operator country.
4. Exact USDT networks/contracts, minimums, top-up fees, card fees, FX and withdrawal conditions.
5. Full API documentation, sandbox terms, spend-limit enforcement, refunds and transaction reconciliation.
6. Whether a partner compliance review itself requires company registration documents, UBO/signatory identity, or source-of-funds documents.

Do not infer that a consumer no-KYC claim extends to the approved-business API. The production review is itself an unresolved gate.

### 4.3 Mehbit — real merchant coverage but manual, costly and not autonomous

**Current classification: RESTRICTED — MANUAL NON-CORE.**

Official documentation:
- https://mehbit.com/en/terms
- https://mehbit.com/en/faq
- https://mehbit.com/en/services/cloud-hosting

Published terms say:
- USDT and USDC deposits are accepted.
- Ordinary account/card setup does not request ID documents.
- In rare cases (fraud/security review or request from issuer/competent authority), identity confirmation may be requested and the service may be paused.
- Cards are issued under Mehbit's company account with the card issuer; the cardholder name printed on the card is the user's own.
- The FAQ says cards can be used for personal or company use and asks for email/Telegram plus a phone number.

Published fee structure:
- USDT/USDC wallet deposit: 2 USDT per deposit.
- Card load: 5% of loaded amount.
- Card transaction: USD 0.35.
- One-time card issuance fee: varies by card.
- Exact current pricing should be read from the app before a payment; fees may change.

Merchant coverage:
- Mehbit publishes successful card-payment tests for selected hosting and developer services, including examples such as ClouDNS, Onidel, Doprax, HostBrr, AVANETCO, GreenCloud, Alchemy and Cerebrium.
- These are Mehbit's own merchant-test claims, not independent tests performed by AstroCrown.
- Each merchant page must be checked for merchant acceptance, renewal, billing address, 3-D Secure and refund terms. For example, some providers automatically renew a service or use the saved card for threshold billing.

Why it is not core:
- No public REST/SDK/MCP financial operations API was found in the material reviewed.
- The workflow relies on its user-facing app/account and manual card handling.
- No documented machine-enforced per-card policy/transaction spending limits or programmatic settlement ledger were found.
- 3-D Secure and billing-address behavior may require cardholder interaction.
- The 5% load fee is material, in addition to per-deposit and per-transaction fees.
- The exceptional identity-verification clause means its no-ID position is not unconditional.

Potential limited use:
- It may be a manual, human-controlled payment bridge for one specifically approved supplier where no crypto-funded direct alternative exists, but only if the Council explicitly accepts the cost, account/card terms, merchant conditions and residual verification risk.
- This report does not authorize such use. It is not suitable for NOVA to manage as an autonomous core payment rail.

### 4.4 TrustLinq — invoice-to-fiat category proved, hard KYC incompatibility

**Current classification: FAIL — KYC HARD GATE.**

Official guide:
- https://trustlinq.com/pay-invoices-with-crypto/

The provider explicitly documents the flow AstroCrown is investigating:
- User registers an account and completes identity verification.
- User transfers stablecoins from a self-custody wallet.
- User enters supplier invoice and beneficiary bank details.
- TrustLinq converts the stablecoin and sends a fiat transfer to the supplier.
- Its page lists USDT ERC20/TRC20 and USDC among supported assets, and describes 80+ fiat currencies across 190+ countries.
- The recipient receives an ordinary fiat bank transfer and does not need crypto.

The identity step is explicit and is disqualifying under the current payer-side requirement. The reviewed public material did not establish a machine-operated invoice API; the documented process is an account/app workflow.

India appears in the provider's published destination coverage for payout, but that does not mean an India-based payer can open an account without KYC. Recipient coverage cannot be treated as payer eligibility.

The route demonstrates that crypto-funded supplier invoice settlement is commercially available; it does not meet AstroCrown's no-KYC requirement.

### 4.5 Nexus Pay — exact supplier invoice function, but personal/manual route

**Current classification: FAIL — COMPANY, HUMAN-OPERATION AND VERIFICATION GATES.**

Official pages:
- https://nexuspayme.com/en/invoices/
- https://nexuspayme.com/en/business/
- https://nexuspayme.com/en/faq/
- https://nexuspayme.com/en/terms/

Published invoice flow:
- Upload supplier invoice as PDF, JPG or PNG.
- Enter/check payee, bank account, amount, currency and reference.
- Pay from a USDT/USDC balance.
- An operator manually reviews the invoice and sends the supplier a fiat bank transfer.
- The app returns a payment reference or bank receipt.
- Published invoice fee is currently 0.5%; limits shown are $10–$10,000 per invoice, up to $20,000/24 hours per person, and ten open invoices (the provider says these can change).

The business page explicitly says there is **no company account**: the balance and card belong to the individual signing in with Telegram, and the account is used on the individual's own behalf. The terms say users must act on their own behalf and not on another person's instruction. It also says identity confirmation is legally required for card issuance and transactions above thresholds, with additional documentation possible.

The actual payment operation is performed manually by an operator and has no fixed settlement timeframe. There is no public invoice payout API documented in the reviewed pages.

This is not compatible with AstroCrown company treasury or autonomous NOVA payments. It is not a workaround for the no-KYC/company constraints.

### 4.6 Stablegate — strong API mechanics but mandatory verification model

**Current classification: FAIL — KYC/KYB HARD GATE.**

Official documentation:
- https://docs.stablegate.com/docs/guide/integration-guides/offramp
- https://docs.stablegate.com/docs/guide/customers
- https://docs.stablegate.com/docs/verification/common
- https://docs.stablegate.com/docs/guide/orders
- https://docs.stablegate.com/docs/guide/external-accounts

The published REST API supports:
- customer registration as individual or corporate;
- KYC/KYB verification state;
- registered bank/crypto external accounts;
- route, fee and limit checks;
- order creation, idempotency, polling and webhooks;
- USDT-to-fiat off-ramp orders and a terminal transfer status.

But its official developer flow requires that each customer be created, verified, and moved to an active state with permission to trade. Corporate accounts have a company field and use the KYB process. The off-ramp guide registers the customer's payout bank account; for a supplier/third-party beneficiary it may require an invoice/contract document and manual operations handling above configured thresholds.

It is technically machine-friendly but fails the no-KYC/no-KYB gate. The third-party supplier payout does not remove the identity requirement.

### 4.7 XEROF — robust institutional supplier payout, explicit signatory KYC

**Current classification: FAIL — KYC/KYB HARD GATE.**

Official pages:
- https://xerof.com/
- https://xerof.com/on-off-ramp
- https://xerof.com/

XEROF advertises USDT/USDC conversion and direct payment of supplier invoices in fiat across a supplier-payout network. Its public overview describes a segregated crypto wallet, explicit quote/fee records and tracking of fiat payout and on-chain settlement legs. Its company onboarding requires:
- corporate documents;
- signatory and owner information;
- each authorized signatory to complete passport or national ID verification;
- compliance-team review and activation.

Its published fee tier for up to USD 250,000 monthly volume is 1.00%, with other tiers based on volume; structured or recurring flows are quoted separately.

This is a useful market example of an institutional crypto-funded invoice service, but it explicitly requires the identity process the user excludes. The public website describes fiat settling into an account in the client's own name for general off-ramp; supplier payouts are advertised separately, but that does not remove company onboarding or signatory KYC.

### 4.8 0fiat — supplier-specific voucher API, not general fiat settlement

**Current classification: CONDITIONAL — VOUCHER-ONLY; NOT QUALIFIED.**

Official pages:
- https://0fiat.com/
- https://0fiat.com/api
- https://0fiat.com/docs

The public offer describes USDT/USDC payments at supported merchants and an API for gift-card catalog, quotes, orders and delivery status. Its consumer checkout claims no KYC, but the B2B/partner API has a separate onboarding process and compliance requirements can vary by market, product and gift-card provider.

Before this becomes useful to AstroCrown, the exact supplier must be present in the catalogue with a valid product/denomination usable for the specific infrastructure account. No general Cloudflare, AWS, Hetzner, DigitalOcean or other target-hosting invoice settlement route was established in this block.

Do not treat the consumer checkout KYC statement as proof that B2B API onboarding is KYC-free.

### 4.9 Cryptorefills — catalog API with name and limit controls

**Current classification: RESTRICTED / CONDITIONAL — VOUCHER-ONLY.**

Official API:
- https://www.cryptorefills.com/en/api-docs/developers

The REST API covers gift cards, mobile top-ups and eSIMs, with order validation/creation and order tracking. Its current API compliance note states:
- Tron stablecoin orders (USDT/USDC) require the customer's full name on file in relevant cases;
- daily/monthly spending limits apply;
- verified users receive higher limits;
- KYC error handling depends on the integration;
- identity and limits features use a whitelabel account.

This is not an arbitrary supplier-invoice rail. It may be useful for a very narrow catalogue item only if that exact supplier/product is supported and its integration can lawfully avoid the prohibited identity process. The evidence does not justify a core AstroCrown route.

### 4.10 Bitrefill — consumer voucher limits do not qualify company API

**Current classification: RESTRICTED — NOT A CORE COMPANY ROUTE.**

Official pages:
- https://www.bitrefill.com/
- https://www.bitrefill.com/api/
- https://www.bitrefill.com/terms/

The provider documents voucher/gift-card purchases and API access. Consumer guest limits are not the same as a company treasury API. Higher limits and corporate accounts require identity/corporate due-diligence steps; corporate verification includes company and beneficial-owner information. The business partner API has a separate application path.

Do not create multiple or alternate accounts to evade the provider's limits or verification rules. That is expressly incompatible with the project principle of lawful operation and auditability.

### 4.11 Tekkō — technically good API, but mandatory KYB

**Current classification: FAIL — KYB HARD GATE.**

Official pages recorded in the preceding Block 8 review:
- https://tekko.com/
- https://docs.tekko.com/
- https://docs.tekko.com/platform-api/

The reviewed service offers programmable crypto-funded card issuance and USDT/USDC funding with API controls, but its business API and virtual-card routes require KYB, and cardholder onboarding includes identity collection. The technical quality does not override the explicit no-KYC/KYB requirement. It remains excluded.

## 5. Do not confuse outgoing payment intermediaries with incoming crypto gateways

A large portion of the search results for "crypto payment API", "crypto-to-fiat API" and "invoice API" are designed for a merchant to **accept payments from its customers** and receive crypto or fiat settlement.

Examples include NOWPayments, Kaskade, Oxialink, Coinvay, CryptoInvoice.dev, Cassia, FlowPay, Yolfi and PayRam. Those may be relevant later for AstroCrown's own supporter/customer payment acceptance, but do not automatically help AstroCrown pay a hosting supplier that only accepts fiat/card.

Classify each route by direction:
- `OUTGOING_SUPPLIER_PAYMENT` — AstroCrown starts with crypto; the provider pays a supplier.
- `INCOMING_CUSTOMER_PAYMENT` — an AstroCrown customer pays; AstroCrown receives crypto or fiat.
- `CARD_ISSUING_AND_SPEND` — AstroCrown funds a card with crypto and spends at a merchant.
- `MERCHANT_VOUCHER` — AstroCrown buys a voucher accepted by a specific supplier.

These are separate adapters and must not be mixed in the same qualification result.

## 6. Cost and risk observations

The published fee structures illustrate why a payment intermediary must be compared on total landed cost rather than headline top-up percentage:

| Candidate | Publicly displayed cost | Important additional risk |
| --- | --- | --- |
| IZIPAY | $49.99 virtual card issue; 3% top-up | Issuer fees, cross-border/FX/3DS/declined transaction charges; non-refundable issue fee; card may go negative due fees; 2% withdrawal |
| Mehbit | 5% card load; $0.35 per transaction; 2 USDT per wallet deposit; card issue fee | Manual operation; identity exception; cardholder/merchant 3DS and billing address; card fees are not refunded in ordinary cases |
| Nexus Pay invoice | 0.5% invoice fee at current published terms | Manual invoice review/transfer; individual-only account; limits and fees can change |
| XEROF | 1.00% published under $250k monthly volume | Formal corporate/signatory KYC; banking/regulated intermediary |
| TrustLinq | No fee schedule relied upon in this report | Identity verification hard failure |
| Stablegate | Quote/route-specific API fees | KYC/KYB hard failure and supplier third-party payout documentation rules |
| Cryptorefills / 0fiat / Bitrefill | Product, network, merchant and integration specific | Product is a voucher, not general invoice settlement; partner and identity rules vary |

These are public, dated prices/conditions, not negotiated AstroCrown offers. A route's true cost must also include deposit network fees, FX spread, card issuance, transaction/cross-border fees, 3-D Secure fees, declined authorization fees, refund/reversal costs and minimum funding amounts.

## 7. What remains unresolved

No candidate passed all of the following:
- exact business/company eligibility without KYB or signatory identity;
- no AstroCrown bank/card/fiat account;
- accepted USDT network/token and exact funding mechanics;
- lawful service availability for the intended jurisdiction;
- machine-operated provisioning/payment lifecycle under written terms;
- reliable limits and prevention of negative balances/automatic debt;
- downstream supplier-side settlement and invoice acknowledgement;
- clear refund, reversal and closure behavior;
- full fees and counterparty/issuer identity.

The highest-value unanswered questions are concentrated on IZIPAY:
1. Can its B2B API be activated for a business without KYB, KYC, beneficial-owner verification or bank/card details?
2. Does the exact card programme lawfully serve the operator/company jurisdiction and required merchant countries?
3. Can the issuer's identity/source-of-funds requests be constrained to legally required triggers and can the service refuse all ordinary identity collection?
4. Can the account/card be set to prevent any negative balance or fee debt?
5. Is recurring machine-operated use covered by a signed API agreement?
6. Can one or more card instances be restricted to a supplier allowlist, spend ceilings, single-purpose balances and automatic freeze on unexpected activity?
7. Can 3-D Secure be completed in a permitted unattended system flow, or does it require an external human?
8. What happens to funds if a card is frozen, a merchant refunds a payment, or an issuer closes the programme?

Kripicard's central question is simpler: does business API production onboarding require KYB or KYC? Its published "approved partner" and "compliance review" wording means this cannot be assumed to pass.

No company has been contacted and no identity material or source-of-funds evidence has been requested from the user. Do not initiate these steps without a separate, explicit user decision; public information is insufficient for a green light.

## 8. Architecture decisions for AstroCrown/NOVA

1. Keep the four payment adapters already specified: `crypto_direct`, `crypto_to_fiat_invoice`, `crypto_funded_card`, and `crypto_voucher`.
2. Keep invoice-to-fiat and card spending distinct. An invoice payout must have a recipient, invoice, fiat amount/currency and a supplier-side payout reference; a card must have issuer/program, card ID, merchant descriptor, authorization/capture/refund events and spend-limit evidence.
3. The route-wide no-KYC/no-bank/no-card policy remains a payer-side hard gate. Intermediaries cannot transfer it to an operator or company officer.
4. A card route must default to zero overdraft/negative balance, no automatic card top-up, no debt, no fiat fallback and no automatic spending outside an allowlist. Any provider incapable of enforcing that cannot be a core payment adapter.
5. Card credentials must remain inside a dedicated secret/issuer boundary. Do not store full PAN/CVV/OTP in NOVA memory, normal application database, GitHub, LLM context or operational logs. Use tokenized card references where possible.
6. A 3-D Secure code webhook is not a permission for NOVA to bypass customer or issuer controls. The merchant/issuer flow must be legally and contractually permitted and securely supported; if ordinary operation requires a human to click/enter a challenge, classify it as manual/non-core.
7. An intermediary must not hold an unrestricted treasury signing key. NOVA creates a bounded intent; an AstroCrown-controlled signer funds the exact invoice/card wallet under an approved budget policy.
8. The payment state machine must observe both crypto funding and supplier payment, then reconcile card/invoice credit; no credit or paid status may be inferred only from the intermediary's deposit receipt.
9. Payment adapter interfaces and mocks may be developed at $0, but no live provider integration or money transfer is authorized by this report.

## 9. Next qualification work order

1. Prioritize documentary qualification of IZIPAY's B2B API: exact no-KYB status, company/region eligibility, issuer/program identity, negative-balance controls, 3-D Secure automation, and complete written B2B API permissions/fees.
2. Apply the same narrow yes/no no-KYC/KYB question to Kripicard's business API before any partner onboarding. Do not submit personal or company identity documents.
3. Map target infrastructure suppliers to the current IZIPAY/Mehbit publicly tested merchant list only as research. A published successful card test by the intermediary is not a guarantee for AstroCrown's account, card BIN, region or merchant.
4. Check whether any supplier-compatible 0fiat/Cryptorefills/Bitrefill voucher exists, while preserving the exact product, country, denomination, expiration and partner compliance conditions.
5. Continue the search specifically for a company-capable card programme or outgoing invoice settlement route that proves all payer-side no-KYC/no-bank/no-card gates and provides API settlement evidence. Exclude generic incoming crypto gateways from this search.
6. Once a candidate has written evidence, build only its no-funds sandbox conformance tests. Real card issuance, account onboarding or payment must be handled as a separate explicitly approved step, not assumed by this work order.

## 10. Evidence boundary and completion status

This is a public-document qualification report, not provider legal advice, an account test, issuer approval or production readiness determination.

- No provider account was created or accessed.
- No API key, credentials, secret or session was obtained.
- No KYC/KYB, identity, phone, bank, card, proof-of-address or source-of-funds data was submitted.
- No provider representative was contacted.
- No card or payment instrument was issued.
- No wallet/payment/treasury adapter was connected.
- No crypto or fiat payment was made.
- No infrastructure resource was purchased or deployed.
- No NOVA live workflow, active provider roster or production system was changed.

The repository tree search did not locate the canonical `NAVIGATION-PROTOCOL.md` or `NAVIGATION-PLAN-TEMPLATE.md` in either the AstroCrown-Web or NOVA repository tree at the expected navigation filenames. Accordingly, this record must not claim full formal NAV compliance. It is retained as a dated audit checkpoint, with that procedural limitation visible.

**Block conclusion:** crypto-funded intermediaries are a real supplier-payment option, but the exact requirement is not met merely by accepting stablecoins. The strongest machine API candidate found in this review is IZIPAY, yet its production B2B approval, downstream issuer requirements, jurisdiction, fee-debt control and 3-D Secure behavior remain unresolved. No payment route is presently approved as an autonomous AstroCrown core dependency.
