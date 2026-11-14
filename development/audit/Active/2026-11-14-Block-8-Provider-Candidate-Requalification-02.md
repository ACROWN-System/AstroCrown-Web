# Block 8 — Provider Candidate Requalification 02

**Review date:** 2026-11-14  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Related work:** PR #177 — Privacy & Transparency Centre  
**Evidence scope:** Official public provider pricing, product documentation, terms and privacy/security notices  
**Review mode:** Desk review only. No account was created or accessed, no credential/API was tested, no card or identity document was submitted, no payment/credit was requested, and no workload was started.

> This is a route-specific research checkpoint, not provider activation, a privacy certification, legal advice, or production qualification. Missing or ambiguous evidence remains UNKNOWN.

## 1. Rules applied

A free headline is not sufficient. For every exact endpoint, product, plan and intended use, keep separate evidence for:

1. recurring or one-time monetary allowance;
2. card/payment-method requirement, identity/phone/KYC requirements, region and account eligibility;
3. contractual permission for internal R&D, commercial development, third-party benefit and production/end-user use;
4. input/output training, service improvement, human review, retention, deletion, logging and upstream processing;
5. route type: direct provider, gateway/aggregator, user-pays, specialist API, volunteer service or self-hostable model artifact;
6. quota scope, reset, overage behaviour, reliability, support and portability.

`CANDIDATE` means only that further qualification may be worthwhile. It is not an approval to transmit confidential, personal, proprietary, financial or operational data. A credit that requires identity verification, a card, paid overage or restricted use does not satisfy the project rule merely because its displayed price is $0.

## 2. Provider findings

### 2.1 Alibaba Cloud Model Studio — Singapore new-user free quota

**Disposition: CONDITIONAL CANDIDATE; no-card/no-KYC status UNKNOWN.**

The official page was updated 29 October 2026. The new-user free quota applies only to eligible models in the Singapore region with deployment scope set to International. Many listed models receive 1 million free tokens per model, with an eligibility-dependent set of model IDs. The quota is a one-time new-user offer valid for 90 days from the applicable activation/model-release/application-approval date; it is not a recurring monthly entitlement.

Account information must be completed before activation. Public documentation reviewed here does not establish whether this means government identity verification, whether phone verification is required, or whether a payment method is required. Do not assume no-KYC/no-card eligibility.

**Overage risk:** Free Quota Only (also called worry-free mode) is disabled by default. After a quota is exhausted or expires, continued calls can be billed pay-as-you-go. A safe future test must first establish and verify Free Quota Only is enabled and that exhaustion fails closed. No such setting was changed in this review.

**Decision:** Retain as a possible one-time R&D source, subject to regional/account eligibility, no-card/no-KYC confirmation, and a verified fail-closed configuration before the first request. Use only public/synthetic prompts until data terms for the precise model/API route are approved. Do not count this as recurring capacity.

Official sources:
- https://www.alibabacloud.com/help/en/model-studio/new-free-quota
- https://www.alibabacloud.com/help/en/model-studio/model-pricing
- https://www.alibabacloud.com/help/en/model-studio/new-free-quota-validity-adjustment

### 2.2 Sarvam AI — ₹100 verified-user credits

**Disposition: HIGH-INTEREST CONDITIONAL CANDIDATE; verification and no-card status UNKNOWN.**

The current Model API pricing page states that every verified user receives ₹100 of universal credits. These credits may be used across Sarvam APIs, do not expire, and are consumed from the account's shared balance. Once exhausted, calls fail with HTTP 402 unless the account is topped up or upgraded. This is a one-time signup allowance per verified user, not a recurring monthly quota. API limits are account-level; creating additional keys does not create more capacity.

Sarvam's Commercial Licensing page states that generated audio produced while credits are consumed—including the ₹100 signup credits—can receive production rights for use in shipped or sold products. That specific statement concerns audio generation (including relevant TTS/voice products); it does not grant ownership of Sarvam's models, voices, software or trademarks. Do not generalize this audio licence to unrelated output types without checking their governing terms.

**Data-use default:** Sarvam's privacy policy says the default is to use content such as inputs, uploads, prompts and generated outputs for model training/fine-tuning/improvement unless the user opts out. The API FAQ documents an organization-level model-training toggle under Settings → Organisation → General; only an Owner can change it. The FAQ also documents workspace-wide retention controls, with per-product overrides for Sarvam API/Voice Agents; changes are not retroactive. Opt-out is prospective, so it does not undo prior submissions. The current Terms say access to some offerings may be restricted when consent is declined/withdrawn.

This is materially better than an unchangeable policy only if the exact account's training setting can be disabled and the chosen API retention configured before any data is submitted. No account was checked and no setting was changed.

The ₹100 entitlement requires a "verified user". Public pricing does not establish whether verification is email/phone, government identity/KYC, or whether a payment card is required. These remain UNKNOWN under the strict no-KYC/no-card rule.

**Decision:** Prioritize written/console verification of the required user-verification method and card requirement. If it qualifies, test only with synthetic/public data after an owner disables training and configures the shortest acceptable API retention. It is a promising low-cost development candidate, not yet an approved confidential-data route or production inference dependency.

Official sources:
- https://docs.sarvam.ai/api/getting-started/pricing
- https://docs.sarvam.ai/api/getting-started/commercial-licensing
- https://www.sarvam.ai/privacy-policy
- https://www.sarvam.ai/terms-of-service
- https://docs.sarvam.ai/api/platform/faq

### 2.3 Vercel AI Gateway — $5 monthly credit, but free-platform terms conflict with AstroCrown use

**Disposition: INELIGIBLE UNDER CURRENT NO-CARD / COMMERCIAL-USE RULE; retain only as a possible paid migration comparison.**

Vercel's AI Gateway pricing documentation states that every Vercel team account receives $5 of AI Gateway credits per month beginning with the first request. The monthly credit stops when the user purchases AI Gateway credits and transitions to the paid tier. Auto top-up is disabled by default but can be enabled, after which the payment method is charged automatically when the balance falls below the configured threshold. A current Vercel article says the $5 free credit requires a valid payment method on file; no no-card exception was established.

The legal and account-plan boundary is decisive:
- Vercel's Hobby plan is restricted to personal/non-commercial use.
- The Terms permit Vercel to use content submitted under Hobby or trial Pro to train its AI/ML models and share it with third parties for their model improvement, subject to the settings/upgrade provisions.
- Paid Pro has different defaults, but is not a $0 plan.
- Vercel's terms also restrict use that makes its services available to or benefits third parties, subject to the terms' permitted uses.

A $5 inference credit does not override the wider plan contract, no-card requirement, or data-use provisions. Whether an eligible free AI Gateway team account can be held independently of a paid Vercel platform subscription is not enough to overcome the documented no-card and Hobby-use conditions.

**Decision:** Do not select the free Vercel route for AstroCrown/NOVA workloads. It is not a qualifying no-card, commercial-use $0 route. Keep it only as an architectural/paid-plan comparison if the project later evaluates paid gateways. Do not rely on it for confidential data under Hobby/trial terms.

Official sources:
- https://vercel.com/docs/ai-gateway/pricing
- https://vercel.com/legal/terms (last updated 19 October 2026)
- https://vercel.com/pricing
- https://vercel.com/i/best-ai-gateways

### 2.4 AI Horde — anonymous volunteer capacity, explicit blockchain restriction

**Disposition: INELIGIBLE FOR ASTROCROWN / NOVA BLOCKCHAIN-RELATED WORKLOADS.**

AI Horde is a community-operated volunteer inference network. Anonymous API access is available, but anonymous requests have lower priority and service availability is queue/volunteer dependent; there is no production SLA. Its privacy policy describes collection of IP/request data and distribution of prompts to volunteer workers. Do not submit private or confidential data.

The decisive issue is the official Terms of Service: they prohibit using the service in connection with cryptocurrency, NFTs and blockchain technologies. This directly conflicts with AstroCrown's subject matter and intended work. A free or anonymous endpoint does not make that contractual restriction disappear.

**Decision:** Do not integrate AI Horde into AstroCrown or NOVA for project work. No request or account was made.

Official sources:
- https://aihorde.net/terms/
- https://aihorde.net/privacy/
- https://aihorde.net/ (service and API entry point)

### 2.5 Typhoon / SCB 10X — free research showcase

**Disposition: CONDITIONAL R&D CANDIDATE; NOT PRODUCTION-QUALIFIED.**

SCB 10X's official FAQ says the Typhoon API is free to use and is a research showcase accessed by signing up for an API key. SCB 10X says it collects API usage data to improve the model and API and says it will not share that data with third parties. The API is currently beta, provided as-is, without formal support or service warranty. SCB 10X claims no rights in generated outputs; users remain responsible for the outputs and their use.

The public FAQ does not establish no-card/no-KYC signup requirements, quotas, rate limits, service continuity or a data-retention period. "Usage data" is not defined sufficiently to conclude that prompts/outputs are never retained or used for improvement.

**Decision:** Keep as a possible Thai-language/specialist research comparison using public or synthetic data only. Confirm account eligibility and exact data handling before any call. Do not use for private memory, confidential research, personal data or production dependencies.

Official source:
- https://docs.opentyphoon.ai/en/faq/

### 2.6 Scaleway Generative APIs — published free quota with card/KYC condition

**Disposition: INELIGIBLE UNDER CURRENT NO-CARD / NO-KYC RULE.**

Scaleway's published Generative APIs documentation advertises limited free allowances for eligible services/models, including up to 1 million tokens and 60 minutes of speech transcription under stated conditions. Usage after the allowance is billable. The same official documentation says a credit card and KYC must be completed to benefit from official rate limits.

The existence of a free allowance does not qualify the route where the documented account/rate-limit requirements conflict with the project's current no-card/no-KYC rule.

**Decision:** Do not register, add a card or submit KYC for this candidate. Reconsider only if Scaleway documents a usable, compliant no-card/no-KYC route with safe quota-exhaustion behaviour.

Official sources:
- https://www.scaleway.com/en/pricing/model-as-a-service/
- https://www.scaleway.com/en/docs/generative-apis/

### 2.7 Mixedbread — $5 starter credit, free-tier data-use concern

**Disposition: CONDITIONAL SPECIALIST TEST ONLY; NOT APPROVED FOR CONFIDENTIAL KNOWLEDGE.**

Mixedbread's Starter offer advertises $5 of initial credits and no card requirement, with limited users/stores and request quotas. It is a retrieval/embedding/reranking-oriented service, not a general replacement for chat inference.

The Free Tier terms give Mixedbread broad rights to use free-tier Usage Data, including queries/input, for service/model training, analytics and improvement. The reviewed terms/documentation state that free-tier data may be retained indefinitely and do not establish a deletion guarantee comparable to paid plans. Paid tiers have different data-use commitments.

**Decision:** This may be useful only for intentionally public material or synthetic test corpora, after confirming that the current Starter plan and terms remain in force. Never upload NOVA internal memory, proprietary repositories, private user data, credentials, unpublished research or confidential AstroCrown material. Do not assume that paid-tier safeguards apply to the free tier.

Official sources:
- https://www.mixedbread.com/pricing
- https://www.mixedbread.com/terms
- https://www.mixedbread.com/privacy

### 2.8 Voyage AI — large specialist free token allowance, but opt-out may void it

**Disposition: CONDITIONAL EMBEDDING/RERANKING CANDIDATE; data-use trade-off unresolved.**

Voyage's current pricing page gives each account an initial free allowance of 200 million tokens for selected embedding models and selected rerankers; some finance, law, multilingual and code models have 50 million token allowances. This is a specialist embedding/reranking resource, not a general chat model, and the free amount is an initial allowance rather than a documented recurring monthly credit.

The Terms of Service were updated 29 October 2026. Unless the customer opts out, Voyage receives a broad licence to use Customer Content to train, improve and further develop its services. Opt-out applies prospectively only. Critically, the Terms say that free credits or free-use tokens may be automatically voided at Voyage's discretion after opting out. Therefore the project cannot assume it can both keep the free allowance and disable content use.

The Terms require individual users to be at least 18 and may require account registration. Whether API access begins without a card is not established by the reviewed public documents; the pricing docs state subsequent usage is billed and the FAQ describes payment arrangements, so no-card eligibility must be confirmed before signup/use.

**Decision:** Potentially valuable for a public-corpus embedding/reranking experiment if data-use terms are accepted for that public corpus and the no-card rule is verified. Do not send confidential, personal, private, proprietary or NOVA memory content. Do not use the opt-out as a presumed safeguard while relying on free credits; its impact on the free allowance must be resolved first.

Official sources:
- https://docs.voyageai.com/docs/pricing
- https://www.voyageai.com/tos (last updated 29 October 2026)

### 2.9 Contextual AI — $25 credit, broad service-improvement licence and unresolved downstream use

**Disposition: NOT QUALIFIED; written commercial/data-use clarification required.**

Contextual AI's current pricing page advertises $25 in free on-demand credits and one workspace. Its security page claims a SOC 2 Type II audit, but this is not a substitute for inspecting the Trust Center report, the exact on-demand service scope, the DPA, data retention settings and contractual processor obligations.

The Terms of Use (last updated 26 August 2025) state that Customer Data—datasets, inputs and outputs—may be processed to provide and improve the Services during and after the term. They also restrict commercial exploitation of the Services and use for the benefit of third parties, while elsewhere describing Customer Applications that can be made available to third parties. The exact scope of permitted downstream product use therefore needs written clarification for an AstroCrown-facing feature; the free credits do not themselves establish that right.

Contextual's privacy notice expressly says it does not cover customer data submitted to the Platform Services; that is governed by the customer agreement. The public pages reviewed do not establish that the $25 on-demand credit has no card requirement or establish an exact retention/deletion period and training opt-out for customer prompts/outputs.

**Decision:** Do not send confidential or personal information and do not integrate into an AstroCrown feature until Contextual provides written answers on (1) downstream commercial/end-user product rights for the on-demand plan, (2) any restriction against third-party benefit, (3) use of inputs/outputs for service improvement/model training, (4) retention/deletion, (5) applicable DPA and security-report scope, and (6) no-card/no-KYC eligibility. SOC 2 claims alone do not close these gates.

Official sources:
- https://contextual.ai/pricing
- https://contextual.ai/legal/terms-of-use
- https://contextual.ai/legal/privacy-policy
- https://contextual.ai/security

### 2.10 AI21 Labs — $10 / three-month trial, internal evaluation only

**Disposition: CONDITIONAL INTERNAL R&D CANDIDATE; NOT A PRODUCTION ROUTE.**

AI21's current official pricing documentation says new accounts receive $10 credit for three months across platform APIs, SDK and Playground. Once the trial credit is exhausted or expires, valid billing information must be provided to continue. The official docs do not conclusively state that the initial trial is no-card, so this remains UNKNOWN.

AI21's terms restrict trial/evaluation products to internal evaluation and provide them as-is; AI21 may end evaluation access. They are not a public end-user production entitlement. AI21's privacy terms distinguish model training from operational processing; inputs/outputs may be processed to deliver, operate, maintain, troubleshoot and improve services. The data policy does not establish a precise universal prompt-retention period in the reviewed material. Some data categories and high-risk decision uses have additional restrictions, and vulnerability probing/red-teaming of AI21 services requires written permission.

**Decision:** Consider only a bounded internal development evaluation with synthetic/public content after no-card eligibility is confirmed. Never place it behind an AstroCrown public feature or depend on it for user traffic under the trial terms. Do not probe/red-team the provider without written authorization.

Official sources:
- https://docs.ai21.com/docs/usage-cost
- https://www.ai21.com/terms-of-service
- https://www.ai21.com/privacy-policy

### 2.11 Fireworks AI — $1 starter credit, ZDR claims, active security investigation

**Disposition: HOLD / CONDITIONAL CANDIDATE; do not use sensitive or proprietary data.**

Fireworks has advertised a $1 starter credit. The current public evidence reviewed does not settle whether every new account can claim it without a payment method or whether any signup/region restrictions apply; this remains UNKNOWN. The credit is a one-time starter amount, not recurring capacity.

Fireworks' privacy/security materials state that inference for open models is zero-data-retention by default, subject to exceptions for stateful conversation modes and data-based training/fine-tuning workflows. This is promising for the exact stateless route, but it must not be generalized to every feature.

**Material current security caveat:** Fireworks' 9 November 2026 update on its October 2026 security incident says a third-party compromise at a cloud provider on 23 October led to additional customer-data impact. A limited set of accounts had impact to account/billing information and secrets; a subset of incomplete model weights and datasets were accessed. Fireworks says it has not detected impact to Inference, Training SDK or Nexus, which it identifies as ZDR by default, and says its investigation remains ongoing. It disabled self-serve dataset uploads/downloads for Batch Inference and dataset-based training during the investigation. The initial bulletin and later update differ in scope; rely on the newer update.

**Decision:** Keep on hold for AstroCrown/NOVA confidential or proprietary work while the incident investigation is active. A future synthetic/public-data test may be considered only after verifying that the exact endpoint is within the stated unaffected inference path, no-card starter eligibility, and current security status. Do not upload datasets, incomplete model weights, source secrets or private data.

Official sources:
- https://fireworks.ai/security/bulletins/october-2026-security-incident-update (last updated 9 November 2026)
- https://fireworks.ai/security/bulletins/october-2026-security-incident (last updated 10 October 2026)
- https://fireworks.ai/pricing
- https://fireworks.ai/privacy-policy

### 2.12 Upstage — Free Tier API uses request/response data for R&D; old $10 claim unverified

**Disposition: NOT QUALIFIED; public/synthetic-only possibility pending account conditions.**

Upstage's privacy policy, updated 2 November 2026, distinguishes the Free Tier API from Console/Studio. It says the Free Tier API processes API request and response data for service provision, service-quality improvement and research/development, with retention until the end of service provision or a separately notified period. The policy says Console/Studio services collect required card number, expiry, CVC, name, email and billing address for payment services. This establishes a card requirement for those Console/Studio services; it does not conclusively establish the card requirements for the distinct Free Tier API route.

The older NOVA roster reference to a $10 signup credit is not substantiated by the current official pricing material reviewed in this pass. Do not describe it as a current verified offer. The API's current Free Tier model availability, no-card/no-KYC eligibility, quota and exact retention/deletion controls remain UNKNOWN.

**Decision:** Do not use for confidential, personal or proprietary prompts. Reconsider only after Upstage confirms that the exact Free Tier API endpoint can be used without a card or KYC and provides the applicable data/retention terms. Remove the unverified "$10 signup credit" from any claim of current entitlement.

Official sources:
- https://www.upstage.ai/privacy-policy/updated-nov-02-2026
- https://www.upstage.ai/pricing

### 2.13 SiliconFlow — $1 starter credit, but terms conflict with third-party project use

**Disposition: INELIGIBLE FOR ASTROCROWN / NOVA SERVICE DEVELOPMENT UNDER REVIEWED TERMS.**

SiliconFlow's public pricing page advertises a $1 starter credit. However, its Terms of Service (last updated 9 September 2026) restrict use of the service to personal use and prohibit commercial purposes or use for the benefit of anyone else. They also prohibit benchmarking/performance testing. These restrictions conflict with building, testing or operating an AI capability for AstroCrown's users or for a third-party-benefiting project, even if the account begins with free credit.

The no-card status and data-retention controls were not independently verified; they do not change the decisive intended-use conflict.

**Decision:** Do not use SiliconFlow for AstroCrown/NOVA service development, user workloads or benchmarking unless the provider grants written permission under an applicable agreement. The $1 promotional credit is not usable capacity for this project under the reviewed Terms.

Official sources:
- https://www.siliconflow.com/pricing
- https://siliconflow.com/terms
- https://siliconflow.com/privacy

### 2.14 Tencent Hunyuan — one-time free quota but real-name verification required

**Disposition: INELIGIBLE UNDER CURRENT NO-KYC RULE.**

Tencent's official Hunyuan API documentation describes a one-time free quota for eligible new accounts/models (including a 1-million-token allowance for certain model families), but API activation requires enterprise or personal real-name verification. This is an explicit identity-verification barrier, not merely an unverified concern. The old Hunyuan platform is also transitioning toward TokenHub; model availability and quota conditions must be rechecked against the new platform rather than assumed from the old API page.

**Decision:** Do not activate or provide real-name verification. Keep excluded under the current no-KYC rule, notwithstanding the free quota.

Official sources:
- https://cloud.tencent.com/document/product/1729/97731
- https://cloud.tencent.com/document/product/1729/111007

### 2.15 NVIDIA NIM — promising free development entitlement, no free production entitlement

**Disposition: HIGH-INTEREST R&D CANDIDATE; NOT PRODUCTION-QUALIFIED.**

NVIDIA's official NIM FAQ says developers can join the free NVIDIA Developer Program and access NVIDIA-hosted NIM API endpoints for prototyping. It also allows downloading and self-hosting NIM microservices for research, application development and experimentation on up to 16 GPUs. The free Developer Program access is expressly limited to prototyping, research, development and testing.

NVIDIA defines production to include business transactions and any non-testing activity serving real end users. Production requires an NVIDIA AI Enterprise licence; the published FAQ lists pricing starting at $4,500 per GPU/year or approximately $1 per GPU/hour in the cloud. A separate free 90-day AI Enterprise evaluation is described as a production-oriented trial, not a permanent free tier.

The reviewed public FAQ does not conclusively establish whether phone verification, payment method or other identity checks are required for all Developer Program API Catalog accounts. Account eligibility, hosted endpoint quotas, actual no-card behaviour and the data terms for the exact endpoint are UNKNOWN.

**Decision:** Prioritize only for a controlled internal R&D review if signup eligibility is compatible with the no-card/no-KYC rule. Use synthetic/public prompts. Do not build a public end-user dependency on the free Developer entitlement or mistake a 90-day evaluation for recurring $0 production rights.

Official sources:
- https://docs.api.nvidia.com/nim/docs/product
- https://build.nvidia.com/

## 3. Disposition summary

| Candidate | Result | Suitable role, if further gates pass |
| --- | --- | --- |
| Alibaba Model Studio (Singapore) | CONDITIONAL; account/payment/KYC UNKNOWN | One-time, model-specific R&D quota; enable Free Quota Only before any request |
| Sarvam AI | HIGH-INTEREST CONDITIONAL; verification/card UNKNOWN | Small API/audio experiments after disabling training and setting retention |
| Vercel AI Gateway | INELIGIBLE under current no-card/Hobby commercial-use rules | Paid migration comparison only |
| AI Horde | INELIGIBLE for blockchain/crypto-related AstroCrown work | None for this project domain |
| Typhoon | CONDITIONAL R&D | Public/synthetic Thai-language or model comparison |
| Scaleway | INELIGIBLE under card + KYC requirement | Reconsider only if official no-card/no-KYC route appears |
| Mixedbread | CONDITIONAL, public/synthetic only | Small retrieval/reranking experiments; never private knowledge |
| Voyage AI | CONDITIONAL specialist route; opt-out may void free tokens | Public-corpus embeddings/reranking only |
| Contextual AI | NOT QUALIFIED; written use/data clarification required | Reassess after contractual answers |
| AI21 Labs | CONDITIONAL internal evaluation only | Synthetic/public development; no production |
| Fireworks AI | HOLD during active security investigation | Reassess after incident closure; no sensitive datasets |
| Upstage | NOT QUALIFIED; Free API no-card scope UNKNOWN | Potential public/synthetic API test after account and terms verification |
| SiliconFlow | INELIGIBLE under intended-use restrictions | None for AstroCrown/NOVA service development |
| Tencent Hunyuan | INELIGIBLE under explicit real-name verification | None under current no-KYC rule |
| NVIDIA NIM | HIGH-INTEREST R&D candidate; no production entitlement | Internal prototype/research only, after signup eligibility check |

## 4. Priority for the next qualification pass

The most useful follow-up order is:

1. **Sarvam AI** — confirm whether its verified-user signup can be completed without government KYC or a payment method; determine exact API data-retention options and confirm that the training opt-out applies to the model API account before any synthetic test.
2. **NVIDIA NIM** — verify actual Developer Program signup requirements, no-card/no-KYC eligibility, API Catalog quota and precise endpoint data terms.
3. **Alibaba Model Studio** — establish the minimal Singapore account-information requirement, no-card/no-KYC status, and safe Free Quota Only configuration; do not issue a call until fail-closed operation is verified.
4. **Typhoon** — check no-card/no-KYC signup, exact route limits and whether usage-data improvement includes prompts/outputs.
5. **Voyage AI / Mixedbread** — decide whether any public-corpus test is worthwhile given the free-tier content rights and retention trade-offs.
6. **Fireworks AI** — wait for a completed incident investigation or further official update before reconsidering even low-sensitivity workloads.

This is a work-priority order, not a claim that any route has passed qualification.

## 5. Corrective notes for the existing candidate catalog

- Vercel's $5/month Gateway credit must not be represented as a qualifying no-card commercial free plan. The current terms and current no-card evidence fail the AstroCrown use case.
- Sarvam's ₹100 credit is real, does not expire and is not evaluation-only for audio production rights, but it requires a verified user and its data-use default requires an owner-level opt-out and explicit retention configuration before any qualifying test.
- AI Horde must be removed from AstroCrown crypto/blockchain work because its terms expressly prohibit that use.
- SiliconFlow's $1 promotional credit must not be treated as available project capacity because its intended-use terms conflict with service development for third parties.
- Scaleway's free allocation is not qualifying under the currently documented card/KYC requirements.
- Upstage's old "$10 signup credit" was not verified from current official material and must remain UNKNOWN or be removed from active offers.
- Voyage's large free token allowance is not automatically privacy-safe: opt-out may void free credits.
- Fireworks' 9 November 2026 incident update supersedes the earlier October 10 scope statement; keep the investigation caveat visible.
- Account information, verified-user status, phone verification and real-name KYC are distinct requirements. Never label a route no-KYC unless the actual verification flow has been checked.

## 6. Effect on AstroCrown, NOVA and PR #177

- No provider was added to an active provider roster or workflow.
- No credentials, account sessions, billing settings, payment methods, identity documents or KYC processes were accessed or changed.
- No live API request, model benchmark, GPU job, credit claim or payment was performed.
- No change was made to the AstroCrown Privacy & Transparency Centre HTML. None of the reviewed candidates is yet an approved or integrated AstroCrown service, so adding them as active third-party processors would be misleading.
- Gateways and specialist APIs remain distinguished from independent full-model inference providers.
- Strong RSI remains suspended. Weak RSI remains report-only/human-in-loop.
- The Privacy & Transparency Centre remains a noindex education preview, not a formal Privacy Policy, production privacy promise or certification.

## 7. Limitations and next gates

This is a dated public-documentation review as of 14 November 2026. Public pages cannot establish account-specific signup eligibility, no-KYC/no-card behaviour, region-specific access, contractual exceptions, live rate limits, actual quota balances or operational reliability. Those require provider account evidence or written answers and, only after eligibility passes, bounded synthetic tests.

The next pass should continue discovery beyond this inherited candidate list rather than treating it as exhaustive. Any new candidate must be checked against the same constraints before it is added to the roster. Provider inclusion is never approval to send sensitive information.
