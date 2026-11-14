# Block 8 — Crypto-funded Payment Rail Qualification 03

**Assessment date:** 2026-11-14  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**PR:** #177, draft and unmerged  
**Scope:** further public-document qualification of crypto-funded card APIs, autonomous-agent payment products, and fiat invoice settlement intermediaries.

## 1. Decision

No provider reviewed in this block is approved as an AstroCrown core payment dependency.

A significant new machine-oriented candidate has been discovered: IMBA Wallet's Agent API. It allows an autonomous agent to register with an Ed25519 key, receive USDT TRC-20 and buy prepaid cards or catalog goods without using the separate company Partner API. However, IMBA's own card playbook explicitly labels the cardholder fields as KYC. This is a hard blocker under the current AstroCrown acceptance contract until the precise fields and identity-verification requirements are clarified; it must not be presented as a no-KYC card route.

USDT Crypto Card publishes the clearest no-document-KYC offer coupled to a card lifecycle API and crypto-only deposits. However, its legal counterparty and issuing partners are not identified in the reviewed legal documents, its API activation requires support, and its terms do not establish issuer-level no-KYC, India-resident eligibility, or zero-overdraft guarantees. It remains a discovery lead only.

No direct crypto-to-fiat invoice settlement service was found in this round that proves all payer-side no-KYC/no-KYB/no-bank/no-card gates. Previously examined invoice services remain conditional or excluded because they require identity/business verification or human bank-transfer operations.

## 2. Keep the payment models separate

The following are different products and must not be conflated:

1. **`crypto_to_fiat_invoice`** — AstroCrown sends crypto to an intermediary; the intermediary pays the named supplier's fiat invoice from its own settlement rails. AstroCrown does not receive card details or use its own bank account/card.
2. **`crypto_funded_card`** — AstroCrown funds a provider account with crypto, receives a prepaid card credential, and uses that card at the supplier checkout. This is not the same as the intermediary paying an invoice on AstroCrown's behalf. It introduces a cardholder, card issuer, card credential, 3-D Secure and card-network acceptance dependencies.
3. **`crypto_voucher`** — AstroCrown purchases a supplier-specific voucher or gift code with crypto. This works only if the exact supplier, region, currency and denomination are supported.
4. **`crypto_direct`** — the supplier receives the supported cryptocurrency directly.

A crypto-funded virtual card does not require AstroCrown to supply an existing bank account or conventional bank card to the intermediary. It nevertheless means that a card credential is issued for, held by, or used on behalf of AstroCrown. It must remain a separate route and must not be treated as satisfying a stricter interpretation of "no card details whatsoever" without explicit Council acceptance.

## 3. New candidates

### 3.1 IMBA Wallet — Agent API

**Status: FAIL HARD GATE for the card route; retain as a narrowly scoped discovery lead only.**

Official sources:
- Agent API overview: https://api-docs.imbawallet.com/agent
- Agent setup and restrictions: https://imbawallet.com/agent_api_about_en.html
- Agent use-case playbook: https://imbawallet.com/agent_use_cases_about_en.html
- Agent OpenAPI: https://imbawallet.com/openapi/agent.json

Documented capabilities:
- Separate autonomous-agent API; not the company Partner/B2B API.
- Ed25519-key registration and short-lived signed assertions.
- The agent API documentation says its registration is permissionless/identity-only and explicitly says the agent API does not use company KYB; this must not be confused with its separate Partner API, which is for companies and has KYB.
- Prepaid funding in USDT on TRC-20.
- REST catalogue operations and MCP tooling for cards, eSIMs and gift cards; a Visa/Mastercard prepaid card is specifically described as a way for an agent to pay a datacenter or SaaS supplier that accepts cards.
- Signed webhook support, an agent notifications inbox and programmatic retrieval of 3-D Secure OTPs.
- Tier 0 is the live default: catalog purchases are enabled, while withdrawals, C2C-as-payer and conversion are disabled. The agent cannot self-promote its tier.

Hard blockers / limitations:
- The official agent playbook states: **"Cardholder fields are KYC for the card."** That is not compatible with a no-KYC approval unless the provider clarifies, in writing, that the required fields are not identity verification and do not include government ID, proof of address, phone, biometric or equivalent verification. Do not invent or submit false cardholder data.
- USDT funding for the agent is TRC-20 only; other networks/tokens are described as loss risks for this deposit rail.
- It is a prepaid-card/catalog rail, not a supplier invoice bank-transfer service. IMBA does not provision the GPU/VPS or pay the vendor's bank invoice; it issues the card which is then used at the vendor checkout.
- The cardholder/issuer eligibility, issuing entity, card programme, fees, spending limits, merchant-category restrictions and India-resident eligibility still require a supplier-specific review.
- The provider documents include an operational availability caveat: the agent channel may return 503 when disabled or under attack. It should not be the only payment route.
- Since the agent cannot withdraw funds and cannot send C2C, unused balance is not freely recoverable through the agent API. This creates a prepayment/counterparty risk that must be quantified before any live funding.

Qualification consequence: keep the Agent API in the discovery register because it is genuinely machine-oriented and USDT-funded, but do not integrate it or send funds. The phrase "no company KYB" does not override the separate cardholder KYC requirement.

### 3.2 USDT Crypto Card

**Status: DISCOVERY LEAD — not issuer-qualified and not approved.**

Official sources:
- Product: https://usdtcryptocard.com/en
- API docs: https://usdtcryptocard.com/en/api-docs
- Terms: https://usdtcryptocard.com/en/tos
- Privacy policy: https://usdtcryptocard.com/en/privacy

Public claims and published interface:
- Terms and privacy policy say the service operates without KYC and says it does not ask for name, address, phone number, government ID or selfie.
- Account access uses a generated seed phrase; a confirmed email is required before deposits/card issuance, with optional app-based 2FA.
- Crypto deposits are converted to a USDT balance. The legal terms explicitly list USDT (ERC-20) among the supported deposit assets; the product page separately lists BTC, ETH, SOL, BNB, TRX, POL, LTC, AVAX and ARB as other assets converted to USDT. Do not assume that USDT on every one of those networks is accepted.
- REST API documents 15 endpoints and card issue/fund/freeze/terminate, balance, transaction, 3-D Secure and webhook operations.
- API access is not entirely self-serve: the account must confirm email and make a first deposit, after which support enables API access.
- It advertises Visa Corporate / Mastercard Business BINs as intended for recurring hosting and SaaS purchases. This is a provider claim, not an acceptance guarantee for any named AstroCrown supplier.
- Published pricing: $1 card issuance; $0.30 per approved card transaction; 2% funding fee for deposits below $300 and 0% for deposits of $300 or more. Virtual plan limits are $5,000 per transaction and $20,000 per month. A $300 deposit unlocks the advertised Platinum tier; its exact balance, retention and spending conditions must be confirmed before relying on it.

Hard blockers / limitations:
- The reviewed terms identify the service only as "USDT Crypto Card" and say cards are issued by unnamed licensed partners. They do not identify the legal operating entity, issuer bank/programme, licensing jurisdiction or governing-country court. The terms say disputes are governed by "applicable international commercial law" and the brand is not subject to the exclusive jurisdiction of a single country. That is not an adequate legal-counterparty/issuer disclosure for a strategic payment rail.
- No issuer agreement or issuer-level policy was found proving that no-KYC account signup also means the actual cardholder can be issued and retain a card without identity documentation or source-of-funds requests.
- No published India-specific cardholder eligibility or licence/authorization evidence was found. For any cardholder resident in India, card-network and Indian-law eligibility must be confirmed with the actual issuer before use. Mastercard's published rules include a specific India-resident restriction for issuers providing cards to India residents unless the issuer is licensed in India and has written RBI authorization. This is a qualification question, not a legal conclusion about any particular card.
- The terms allow account termination, immediate card freezing, API revocation and possible forfeiture of remaining balances in policy-violation cases. Liability is heavily limited.
- The terms reviewed do not explicitly guarantee zero negative balance, zero overdraft, or a decline-on-insufficient-funds rule for all issuer fees and settlement adjustments.
- Cards are non-transferable and intended for the account holder. This is not a shared treasury card for arbitrary third parties.
- Because support must enable API access, one-time human onboarding remains necessary; recurring operation might still be machine-driven after approval, but this must be tested.
- Card credentials are still issued to the account holder and must be protected as high-value secrets. The API must not expose PAN/CVV/OTP to normal application storage, source control, LLM context or logs.

Qualification consequence: strongest public no-document-KYC card API discovery in this round, but not approved. Before considering a bounded sandbox or low-value test, obtain issuer identity, legal counterparty, jurisdiction/India eligibility, exact onboarding requirements, API authorization/terms, cardholder KYC policy, overdraft/negative-balance behavior, withdrawal/refund rights and supplier merchant acceptance. Do not create an account or fund it as part of this audit.

### 3.3 IZIPAY Business API

**Status: CONDITIONAL NOT QUALIFIED; hard blocker for unattended automation until B2B approval and overdraft behavior are resolved.**

Official sources:
- API docs: https://izipay.me/api-docs/
- Terms (updated 2026-11-13): https://izipay.me/terms-conditions
- Business services: https://izipay.me/services

Findings:
- The public terms state that ordinary card issuance/top-ups do not normally collect government ID, biometric data or proof of address within the published limits.
- The terms state that regulated service providers may request source-of-funds information, freeze cards or block transactions.
- B2B API automation is prohibited unless the user is an approved B2B partner operating under a signed integration agreement. API access is discretionary and is subject to separate API terms. Public API documentation alone does not establish production eligibility or no-KYB status.
- Current published terms show a $49.99 virtual-card issuance fee, 3% top-up fee, $50,000 per-transaction limit and $200,000 monthly spend limit.
- The API documentation describes card issuing, top-ups, freezes, card returns, transfers and webhooks. It explicitly states that issuer fees can drive the card balance negative; the shortfall is recovered from the next top-up. This violates the zero-negative-balance rule, even if it does not debit a separate prepaid account balance.
- Card issuance fees are non-refundable once crypto payment is confirmed.

Qualification consequence: no production API automation or live funding. It would require a written no-KYB/eligibility answer, issuer identity and card-region proof, a signed API agreement that permits NOVA-operated machine access, and a documented way to guarantee zero negative balance. If the issuer cannot disable/avoid negative balances, reject it as a core payment rail.

### 3.4 Aura Wallet — Business API

**Status: CONDITIONAL NOT QUALIFIED / region and use-case discovery lead.**

Official source: https://aurawallet.co/en/business

Findings:
- Advertises business API products including USDT TRC-20 acceptance, Visa issuance described as no-KYC, RUB-to-USDT conversion and payment of Russian SBP QR codes from USDT.
- States that virtual cards can be issued without an identity check, but explicitly says the card use case is reviewed when a business connects.
- It says KYC is required for the RUB on-ramp; requirements for other products depend on the use case and are discussed during partner onboarding.
- USDT network is TRC-20 only. Risky transfer screening can trigger manual review.
- Production access is obtained by contacting a partner manager; pricing is individually negotiated.
- SBP QR payments are specifically Russian domestic payment functionality, not global supplier-invoice settlement.

Qualification consequence: the no-KYC card claim is not enough to qualify the company/partner account or the cardholder. No India eligibility, issuer identity, complete fee schedule or machine-complete partner terms were established. Do not onboard or disclose company/personal information.

### 3.5 PrimCard

**Status: FAIL HARD GATE.**

Official sources:
- Developer API: https://www.primcard.io/developers
- Terms: https://www.primcard.io/terms-and-conditions
- AML policy: https://www.primcard.io/aml-and-compliance

Findings:
- Advertises a USDT-funded virtual Visa and partner REST API; API test keys are available, while live partner access is created by its team once the account is funded.
- Public pricing: 50 USDT issuance, minimum 25 USDT wallet deposit and first card load, 6% top-up, 4% successful card purchase (minimum $1), $1 declined transaction, and an additional $30 for a high-risk merchant payment/attempt. USDT funding is TRC-20.
- Terms and AML policy expressly reserve the right to request identity, proof of address, proof of digital-asset ownership, source of funds or source of wealth at any point. Cards/funding/account access can be restricted when information is not supplied.
- Business/team pricing is described as coming soon; the developer API onboarding process is controlled by the provider team.

Qualification consequence: incompatible with the no-KYC hard gate. Its fee structure is also disproportionately expensive for infrastructure subscriptions and small recurring invoices.

### 3.6 Other explicit or unresolved candidates

| Candidate | Public evidence | Qualification |
|---|---|---|
| Kripicard | Business API is for approved business partners and requires a compliance review. Banking partners may request KYC/source-of-funds documents, freeze or retain funds. | FAIL HARD GATE for no-KYC certainty; do not submit onboarding. |
| Gpaynow | Live API requires business KYB and each API-created cardholder undergoes KYC. | FAIL HARD GATE. |
| ThisKard / OnyxClearing | Explicitly requires KYC/KYB for sandbox and production API access. | FAIL HARD GATE. |
| ScarabPay Business | Requires business legal existence, registration details, beneficial owners, controlling persons and authorized operators to be verified; withdrawals require portal approval and there is no withdrawals API. | FAIL HARD GATE. |
| Mehbit | Crypto-funded cards, but 5% load fee plus $0.35/transaction and exceptional identity verification may be requested. No machine API was established. | NON-CORE/manual lead only; no autonomous qualification. |
| TrustLinq / Nexus Pay / XEROF / Stablegate | Invoice/payout routes examined in earlier Block 8 work; published verification requirements or manual settlement dependencies do not pass the payer-side gate. | Not qualified. |

## 4. India-resident issuer check

A card product must not be treated as globally usable merely because its marketing says "190+ countries" or "worldwide." The actual card issuer, cardholder location, card programme and local authorization matter.

Mastercard's published rules contain Rule 1.7.4, "Transfer of Cards to India Residents is Prohibited without a License." The rule states that an issuer that reasonably believes its cards will be distributed or provided to India residents must be licensed in India and receive written authorization from the Reserve Bank of India. See Mastercard's published Rules: https://www.mastercard.com/content/dam/mccom/global/documents/mastercard-rules.pdf

This report does not determine the residency or legal status of AstroCrown or any future cardholder, and does not provide legal advice. It establishes an evidence requirement: before any card product can be considered for an India-resident cardholder, obtain the exact issuing entity, BIN/programme, its authorization for that cardholder jurisdiction, and the applicable cardholder agreement. No candidate above has supplied enough evidence in the public materials reviewed to close this check.

## 5. Payment intermediary acceptance refinements

The following are mandatory candidate-level checks, in addition to the existing Infrastructure Acceptance Contract:

1. **Separate account onboarding from cardholder onboarding.** A no-KYB agent account is not evidence that its cardholder can be issued without KYC. Both layers must pass independently.
2. **Identify the legal counterparty and actual issuer.** A generic statement that "licensed partners issue cards" is insufficient. Record issuer name, programme manager, country, regulator/license evidence, BINs and cardholder agreement.
3. **Test payer-side restrictions end to end.** No government ID, biometric, proof of address, personal phone verification, business registration, beneficial-owner documentation, bank account, bank card or source-of-funds/source-of-wealth dossier may be required from AstroCrown or its operator.
4. **Require prepaid-only enforcement.** The processor must document decline-on-insufficient-funds, no negative card balance, no overdraft, no credit facility, no automatic debt recovery and no post-settlement fee that can create a negative balance.
5. **Require transparent full-cost quotes.** Include deposit/network fee, card issuance, funding/load, transaction, FX, 3DS, declines, reversals, refunds, inactivity, card closure and withdrawals. An unpriced fee or an issuer fee able to create debt is disqualifying.
6. **Prove regional and supplier acceptance.** Validate the exact issuer/BIN, cardholder country, supplier checkout country, recurring payment support, merchant category and 3-D Secure behaviour. Marketing claims do not count as successful acceptance evidence.
7. **Keep payment authority bounded.** Council-approved policy establishes an exact supplier, maximum invoice, card load, validity period and spend control. NOVA cannot top up automatically beyond the approved amount. A card API key must not have unrestricted treasury authority.
8. **Preserve the distinction between card and invoice rails.** An intermediary-funded card is an alternative, not proof of direct invoice settlement. Prefer a provider that pays the supplier invoice directly without giving AstroCrown card credentials, if one can meet every other hard gate.

No finding in this report authorizes account creation, provider contact, API credential issuance, card issuance, payment, or production integration.

## 6. Updated conclusion

- **Direct crypto-to-fiat supplier invoice payout:** no fully qualified no-KYC/no-bank/no-card payer route found.
- **Machine-operated crypto-funded card:** IMBA Agent API is a strong technical fit but explicitly introduces cardholder KYC; USDT Crypto Card has a public no-document-KYC claim and REST API but its issuer/legal/jurisdiction/overdraft evidence is inadequate; IZIPAY has an API but B2B approval and negative-balance behaviour fail current requirements.
- **Other card APIs:** current public evidence shows KYB/KYC requirements, dynamic verification rights, manual partner onboarding or material issuer uncertainty.
- **Supplier vouchers:** useful only for an exact supported catalogue item, not a generic hosting or infrastructure payment method.

The preferred order therefore remains: (1) supplier accepts USDT/USDC directly, (2) a qualified intermediary settles the supplier invoice from its own fiat rails with no payer-side identity/bank/card requirements, (3) only after explicit policy acceptance, a strictly prepaid crypto-funded card that has a disclosed issuer, no KYC at both account and cardholder levels, local eligibility and an enforceable zero-negative-balance guarantee, and (4) exact supplier vouchers where available.

## 7. Next work order

1. Continue looking for true on-behalf invoice settlement APIs that accept USDT/USDC but do not require payer-side KYC/KYB, bank details, card details or recurring human bank-transfer processing.
2. For IMBA, request public clarification only (without sending personal or company documents): exact cardholder fields, whether any government-ID/proof-of-address/biometric/phone verification is required, issuer identity, region coverage, live card pricing/limits and zero-negative-balance behaviour. No integration or funding until these are answered.
3. For USDT Crypto Card, request public disclosure of legal operating entity, issuing bank/programme, permitted cardholder countries including India-resident eligibility, exact issuer KYC/source-of-funds rules, negative-balance and fee settlement behaviour, and API scope/enablement conditions. If these disclosures are not provided, archive as non-core.
4. Do not spend time on candidates whose published terms explicitly require KYB/KYC or permit identity-document requests at any time.
5. Once one candidate passes all documentation gates, qualify its no-funds sandbox and adapter conformance. Do not build a provider-specific live connector first.

## 8. Evidence and action boundary

This is a public-document audit, not a legal opinion, provider account test, issuer approval or payment certification.

- No provider account was created or accessed.
- No credentials, private keys, API keys, seed phrases or session tokens were obtained or stored.
- No government identity, personal phone, business registration, beneficial-owner, bank/card, proof-of-address, source-of-funds or source-of-wealth data was submitted.
- No provider representative was contacted.
- No card, voucher or payment instrument was issued.
- No wallet, payment, treasury or production adapter was connected.
- No crypto or fiat payment was made.
- No infrastructure resource was purchased or deployed.
- No NOVA live workflow, secret, active provider roster or production system was changed.

The canonical NAV protocol/template files were not located in the prior repository tree search. Accordingly, this checkpoint does not claim formal NAV compliance. It remains a dated Block 8 audit record; the relevant NAV documents must be located and applied before taking any external provider action.

**Block conclusion:** no payment intermediary is approved yet. The discovery confirms that machine-operable crypto-funded payment cards exist, but account-level no-KYB claims do not establish cardholder-level no-KYC, and a crypto-funded card is not equivalent to the intermediary paying the supplier invoice directly.
