# Block 8 — Direct Crypto-to-Fiat Supplier Invoice Settlement Qualification 04

**Assessment date:** 2026-11-14  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**PR:** #177, draft and unmerged  
**Scope:** services that accept cryptocurrency from a payer and make a fiat payment to the supplier's bank account on the payer's behalf. This block deliberately prioritizes invoice settlement, not virtual card issuance or merchant crypto acceptance.

## 1. Decision

No service found in this block qualifies as an autonomous AstroCrown core payment rail under the current no-KYC/no-bank/no-card and no-recurring-external-human-intervention contract.

However, this search found actual services that perform the specific flow under discussion: the user sends crypto, the intermediary converts it to fiat and pays an invoice or supplier. The mechanisms are real, but the available services introduce at least one disqualifier:

- Pay It Now Bill Pay: guest access without creating an account, but can request identity or proof-of-funds evidence, is restricted to New Zealand/Australia and approved payees, requires an email and invoice workflow, has no public payment API, and processes individual bills through a website flow.
- Mt Pelerin: accepts crypto and pays EUR/CHF invoices to beneficiaries without requiring the payer to have their own bank account, but it explicitly requires personal identity verification and a company must complete KYB.
- A2VANTA: explicitly accepts USDT/USDC and pays suppliers in fiat, but only companies/sole proprietors passing KYB may use the service. It requires business registration and beneficial-owner/director documentation, including a director passport. Payment signing/confirmation is manual.
- Nexus Pay: accepts USDT/USDC and pays suppliers by local bank transfer, but an operator sends the transfer by hand. The terms prohibit automation through unsupported means, card/threshold operations require identity verification, and invoice-use eligibility without identity checks at relevant thresholds is not proved.
- AlterPay: its public landing page claims USDT/crypto-to-check or bank-transfer bill settlement, but no sufficiently verifiable legal entity, compliance terms, API contract, issuer/banking arrangement, fee schedule or operational documentation was located. Keep as an unverified discovery lead only.

This is a more direct answer to the invoice-settlement question than card issuing, but none is presently approved.

## 2. Candidate assessment

### 2.1 Pay It Now — Bill Pay

**Status: CONDITIONAL NOT QUALIFIED; restricted manual/guest settlement lead, not a core system rail.**

Official sources:
- Bill Pay: https://bill.payitnow.io/
- Service terms: https://cdn.payitnow.io/legal/pdfs/terms-and-Conditions-Bill-Pay-Service.pdf
- Provider's legal/company disclosures: https://payitnow.io/tos-bill-pay
- Merchant/payment knowledge base: https://support.payitnow.io/kb/merchant-payments

What it does:
- Its terms explicitly say the service accepts an external Web3 wallet payment, converts cryptocurrency to fiat and pays the designated company on behalf of the user.
- External users can pay as a guest without creating an account. However, the payment form still requires an email address for contact and a refund wallet address.
- The portal takes a PDF invoice, extracts or accepts manual payment details, and uses a deposit address generated for the payment.
- The terms state that it generally sends payment to the designated company within 1–2 business days. The service's own terms say the user must separately confirm receipt/application with the bill provider.
- The Bill Pay portal currently presents invoice amounts in NZD. Its terms state the service is available only in New Zealand and Australia, and a user-added payee must be a registered NZ or Australian company (individuals and sole traders may be considered).
- Its terms explicitly permit a request for proof of funds. The public portal says the user may be contacted to verify bill details, identity or source of funds. Therefore the service cannot be certified as permanently no-KYC/no-proof-of-funds.
- The portal's invoice upload consent currently says the document is stored for administrative verification and its contents are sent to OpenAI for payment-detail extraction. This would need a separate data-protection assessment before any supplier invoice is uploaded.

Source-currency note: the linked Bill Pay PDF terms are stamped 23 May 2024. The currently served Bill Pay portal/FAQ still describes the NZ/Australia approved-payee flow and states that identity or source-of-funds verification may be requested, but the older PDF should be treated as a dated source rather than silently assumed to be the latest contract. A live provider confirmation of current terms would be required before any consideration.

Automation and operational limits:
- The documented public flow is a website wizard: enter contact email, upload invoice, identify payee, set amount and payment method, supply refund wallet address, confirm terms and generate a payment address.
- No public outgoing Bill Pay API, SDK, webhook contract, machine-readable invoice submission or programmatic settlement-reconciliation endpoint was found in this review.
- The website says guest access exists now and recurring bill management is future functionality; this is not evidence of a current scheduler/API.
- Each bill payment is processed individually. It is therefore a manual web payment workflow, not a NOVA-operated procurement rail.
- Pay It Now says the portal's status is the latest status available, but the terms expressly state it cannot view the user's account with the payee; the payer must verify that the supplier received/applied the payment.

Important distinction:
- The receiving supplier's bank account details are required on the invoice. These are the supplier/beneficiary details, not AstroCrown's own bank information. This is an inherent part of a fiat invoice payout and does not by itself constitute payer-side bank onboarding.
- The actual user-side gates remain unresolved because the service may ask for identity or proof of funds, and it is only offered in New Zealand/Australia.

Qualification consequence:
- Do not use as a core AstroCrown payment dependency.
- It may be retained as a narrowly scoped, user-initiated manual possibility only for an exact supported NZ/AU payee, only if its live payment wizard confirms the exact network/token and no additional payer identity/source-of-funds request is triggered. This is not permission to use it.
- It cannot currently satisfy a global infrastructure supplier-payment requirement or NOVA's machine-operated lifecycle.

### 2.2 Mt Pelerin — Crypto bill payment

**Status: FAIL HARD GATE for no-KYC/no-KYB.**

Official sources:
- Bill payment: https://www.mtpelerin.com/pay-bills-with-crypto
- Company/identity flow: linked directly from the bill-payment guide to the KYC/KYB onboarding pages.
- Fees: https://www.mtpelerin.com/fees

What it does:
- It accepts crypto from the payer's wallet, converts it into fiat and sends a bank transfer to the invoice beneficiary.
- It says a payer does not need a bank account of their own. If the payer does not hold an IBAN with Mt Pelerin, the transfer is sent from Mt Pelerin's own account; a dedicated personal/company crypto IBAN is optional.
- Its invoice flow supports EUR and CHF invoices and supports batch payment of multiple bills. Its published conversion commission is 0–1.3%.
- It lists more than 30 crypto-assets across 16 chains. The exact supported token/network must still be read from its current asset selector; a generic multi-chain claim must not be interpreted as acceptance of every USDT deployment.

Hard disqualifiers:
- The public instructions explicitly say the payer must sign up and verify identity before paying a bill.
- A company must register through its KYB process and receive approval before it can pay company invoices.
- It is a regulated Swiss financial intermediary under AML supervision; the KYC/KYB obligations are part of the route, not a removable inconvenience.
- No public supplier-payment API was located; the public workflow is a web/payment widget with confirmation emails.

Qualification consequence:
- Reject as incompatible with AstroCrown's no-KYC/no-KYB hard gate, even though it provides an excellent functional example of crypto-to-fiat invoice payout without requiring AstroCrown to have its own bank account.

### 2.3 A2VANTA — USDT/USDC supplier payments

**Status: FAIL HARD GATE — explicit KYB and beneficial-owner/director identity.**

Official source:
- https://a2vanta.com/
- Invoice guide: https://dev.to/a2vanta/how-to-pay-a-supplier-invoice-with-usdt-or-usdc-36cl

What it does:
- Explicitly markets the exact desired flow: pay a supplier with USDT; the supplier receives fiat through payout partners.
- It advertises supplier settlement in 1–2 business days after approval and funding.
- The published service describes USDT wallets on TRON and USDC on Base, with TRON and Ethereum/Base wallet views. Invoice limits are advertised up to 100,000 USDT per order and 200,000 USDT per client per day, subject to wallet, corridor and document review.
- A quote displays exchange rate, service fee and expected supplier payout before funding.
- Organization roles and approval controls, audit trail, KYT checks, saved counterparties and KMS-backed custodial key storage are advertised.

Hard disqualifiers:
- The website explicitly says eligible customers are companies and sole proprietors that pass KYB, including business and beneficial-owner identification.
- Stage 1 documentation includes company registration, directors/shareholders extract, tax number, director's passport and a business description.
- Each payout also needs the supplier invoice or contract and recipient details.
- Service access starts in Telegram and is subject to document checks; it is not a no-KYC public API route.
- A manual signing step is documented for transfers; sensitive fiat actions require recent password/TOTP confirmation. Support for stuck transfers is available only during business hours.
- Fiat payouts require an admitted personal custodial TRON/USDT wallet and an enabled corridor; available corridors and wallet eligibility must be checked before quotes.
- The published interface is illustrative and uses synthetic data. Its screenshots are not evidence of an operational API or autonomous settlement integration.

Qualification consequence:
- Reject for the hard KYB/beneficial-owner/director identity gate. Do not provide the requested company or passport documentation. Do not connect the wallet or initiate a quote/payment.

### 2.4 Nexus Pay — USDT/USDC invoice payment

**Status: CONDITIONAL NOT QUALIFIED; manual operator, identity threshold and automation restrictions.**

Official sources:
- Invoice-payment guide: https://nexuspayme.com/en/blog/pay-a-bank-invoice-from-usdt-balance/
- Terms: https://nexuspayme.com/en/terms/
- India-specific wallet/card information: https://nexuspayme.com/en/countries/india/

What it does:
- Accepts USDT or USDC from a balance held in the Nexus Pay wallet, then pays the invoice beneficiary by local bank transfer, IBAN or SWIFT.
- Its guide says the service lists 232 countries (102 with a local bank method), with 139 transfer currencies. Actual country/method availability is dynamic and must be checked in the app.
- The payer does not need a bank account of their own; only the supplier's recipient bank details are entered.
- A quote presents the expected fiat amount, rate, fee and crypto balance debit. Up to ten open invoices per person are described.
- A Nexus Pay operator makes the bank transfer by hand. Once confirmed, the payment cannot be cancelled because the operator may already have sent the transfer.

Hard limitations:
- The service is custodial; the stablecoin balance is held on the provider's books and the bank transfer is performed by a human operator, not a smart contract.
- Its terms say accounts are for adults acting on their own behalf, not on another person's instruction, and prohibit automating work by means not provided through the interface. No public invoice-payment API or settlement webhook was found in this review.
- The current terms state identity confirmation is legally required for card issuance and operations above set thresholds; some features remain unavailable until verification, and additional documents may be requested. The specific identity threshold applicable to invoice payouts is not published in the reviewed guide. Therefore no-KYC invoice use is not proved.
- Its terms allow operations to be held for suspicious-activity checks. This is an externally controlled operational gate.
- Card issuance requires KYC; therefore the card path is excluded even though the service separately provides a manual invoice payout route.

Qualification consequence:
- Not suitable as a NOVA-autonomous payment core because the bank transfer is manual and unsupported automation is prohibited.
- The invoice payment route is a real example of crypto-funded on-behalf supplier settlement, but the payer-side KYC threshold and the right to use it for an organization's own invoices without acting on another person's behalf must be clarified before any manual use could even be considered. No such clarification was requested.

### 2.5 AlterPay — unverified crypto bill payment claim

**Status: DISCOVERY LEAD ONLY; insufficient evidence.**

Public source:
- https://www.alterpay.io/team/wei-huang

The public page claims that users can pay bills/merchants with Web3 assets including USDT and that AlterPay sends a check or bank transfer to the payee. It mentions AWS bills, invoices/contractors and other consumer bills.

However:
- No identifiable legal operating entity, regulatory/financial-service registration, issuer/settlement partner or jurisdiction was disclosed on the reviewed page.
- No usable privacy policy, terms of service, AML/KYC policy, fee schedule, API documentation or machine settlement contract was located.
- The page includes generic template remnants (including image descriptions for "Company X") and provides no adequate evidence that the advertised payment service is live and available for commercial onboarding.
- The page's claim to wire bills to any US bank is not backed by published operating terms or evidence of no-KYC payer eligibility.

Qualification consequence:
- Do not upload an invoice, connect a wallet or send crypto. Keep in the discovery register only until a verifiable legal entity, live service, customer terms, payment workflow and exact verification policy can be established.

## 3. Direction-of-flow exclusions

Several nearby search results are not invoice-payment intermediaries and must not be counted as such:

- **Cassia** and **Coinvay** describe non-custodial merchant checkout: a merchant creates an invoice and its customer pays crypto directly into the merchant's own wallet. They do not perform crypto-to-fiat payout on behalf of a payer.
- **Oxialink** and **Cryptoway** are merchant crypto-payment gateways. The flow is a merchant receiving crypto; it is not the payer converting USDT to fiat to settle a separate supplier's bank invoice.
- **Finoreo Crypto Invoicing** is also the reverse direction: a merchant issues a fiat invoice, the customer pays crypto and the merchant receives fiat.
- **PIN merchant acceptance** is the reverse of Bill Pay. Businesses sign up, complete KYC/KYB and receive fiat settlement into their bank account; it does not make a payer-side invoice payout service automatically eligible.

Directionality is now a required field in the payment-provider research record: `payer_crypto_to_supplier_fiat` must be proved explicitly. "Accepts crypto", "crypto payment API" or "fiat settlement" alone is not sufficient.

## 4. Candidate comparison

| Provider | Actual crypto-to-fiat invoice payout? | Payer identity/business gate | Automation | Result |
|---|---|---|---|---|
| Pay It Now Bill Pay | Yes | Identity/source-of-funds may be requested; guest is not a no-KYC guarantee | Public manual web flow; no API found | Conditional, region-restricted |
| Mt Pelerin | Yes | Personal KYC; company KYB | Public widget; no API found | Fail hard gate |
| A2VANTA | Yes | Explicit KYB + director passport/beneficial-owner documents | Telegram/workflow; manual signing | Fail hard gate |
| Nexus Pay | Yes | ID required for cards and threshold operations; invoice threshold unclear | Human bank-transfer operator; unsupported automation prohibited | Conditional, not core |
| AlterPay | Claimed | Unknown | Unknown | Unverified lead |

## 5. Architecture and acceptance-contract consequences

1. Keep direct invoice settlement as its own adapter type. Do not disguise invoice settlement as card issuing.
2. Add `direction_of_flow` to provider qualification records with allowed values such as `payer_crypto_to_supplier_fiat`, `merchant_crypto_acceptance`, `payer_crypto_to_card` and `voucher_redemption`.
3. Add separate documented checks for payer account verification, company KYB, beneficial-owner verification, cardholder KYC, source-of-funds, proof-of-funds and per-transaction screening. An absence of a signup form is not a pass.
4. Distinguish the intermediary's own internal bank arrangements and the supplier's receiving account from AstroCrown's own bank account. It is acceptable for the supplier invoice to contain its recipient bank coordinates; AstroCrown must not be required to open, own, link or provide a payer-side conventional bank account.
5. Where a fiat transfer is done by a human, classify it as a manual/non-core option. It cannot be the NOVA routine payment adapter.
6. Require machine-verifiable evidence of supplier settlement and final invoice credit. An intermediary status such as "funds received", "processed" or "transfer sent" is insufficient unless the beneficiary-side payment can be reconciled.
7. Do not send invoice PDFs or confidential supplier account/contract data to third-party AI extraction services without an explicitly approved processor and data-handling policy.
8. Preserve zero-debt/no-overdraft controls as a separate requirement for card routes. Invoice payout providers must instead have explicit quote expiry, exact amount, beneficiary validation, refund/reversal rules and idempotency controls.

## 6. Updated conclusion

The user's proposed approach is genuine and commercially used: services exist that take cryptocurrency and pay a supplier in fiat. This block found multiple examples, not just marketing descriptions. However, the closest functional services introduce KYB/KYC, discretionary identity/proof-of-funds checks, region restrictions, human processing or lack of APIs.

**No direct crypto-to-fiat invoice provider has passed the AstroCrown acceptance contract.** Continue prioritizing this route in research because it avoids handing AstroCrown conventional card credentials and may be a better design than virtual prepaid cards when a fully compatible provider can be found. Do not weaken the hard gates to accommodate the current candidates.

## 7. Next work order

1. Search for outgoing stablecoin-to-fiat supplier payout products with a documented machine API, exact payer-side onboarding policy and recipient-bank settlement proof. Exclude merchant acceptance gateways from the result set.
2. Investigate whether Pay It Now can provide a supported NZ/AU payee without requiring payer identity/source-of-funds documents, while treating its current manual portal, region limits and invoice-data processing as blockers. Do not submit a real invoice or any personal information.
3. Look for providers with a crypto-funded "pay anyone"/bill-pay API that operates from a self-custody wallet and sends fiat to named beneficiaries, but only include them if the exact account holder can operate without KYC/KYB and no recurring human transfer action is required.
4. Once a route meets documentary gates, build a no-funds adapter conformance test. No real payment is authorized by this report.

## 8. Evidence and action boundary

This is public-documentation research, not provider legal advice, a payment certification, account test or promise of service availability.

- No provider account was created or accessed.
- No representative was contacted.
- No wallet, API key, seed phrase, card or credential was obtained.
- No identity, phone, bank, card, beneficial-owner, proof-of-address, source-of-funds or proof-of-funds material was submitted.
- No invoice or supplier details were uploaded.
- No quote, card issuance, wallet top-up, crypto transfer, fiat transfer or payment was initiated.
- No provider was connected to NOVA or added to an active provider roster.
- No infrastructure was purchased or deployed.
- No production workflow, repository secret or live system was changed.

The prior repository search did not locate the canonical `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md`; this report therefore does not claim formal NAV compliance. Formal NAV should be applied before external provider contact or onboarding.

**Block conclusion:** a real crypto-to-fiat invoice-settlement market exists, but the services publicly documented in this review fail hard gates or remain conditional. No candidate is approved for AstroCrown.
