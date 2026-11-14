# Block 8 — Provider Candidate Requalification 01

**Review date:** 2026-11-14  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Related work:** PR #177 — Privacy & Transparency Centre  
**Evidence repositories:** `ACROWN-System/NOVA` (`main` provider rosters and `nova-operational-state` live health state)  
**Review mode:** Official public-source review only. No provider account was accessed, no API call was made, no credential was tested, and no workload or payment was started.

> This addendum records route-specific research findings. It does not activate a provider, qualify a provider for sensitive or production workloads, or change NOVA's active roster.

## 1. Qualification rule

Do not treat a public "$0" price as proof of eligibility under the project rules. For each exact provider, plan, model, endpoint and use case, keep these as separate questions:

1. Is the listed model or service currently available at no monetary charge?
2. Does the free route require a payment method, paid credits, phone verification, KYC or another eligibility condition?
3. Is the specific development or product use permitted by the applicable terms?
4. What happens to prompts, outputs, personal data, usage metadata and logs?
5. Is the service direct infrastructure, an aggregator, user-pays capacity, a shared demo service, or a marketplace of third-party hosts?
6. Is the service sufficiently reliable, observable and portable for the intended workload?

Statuses below are deliberately conservative. `CANDIDATE / NOT QUALIFIED` means the route merits a bounded future examination, not that it is approved. `INELIGIBLE UNDER CURRENT RULE` means public evidence conflicts with the current no-payment-method rule. `EXPIRED` means a previously advertised route has passed its stated end date. `UNKNOWN` is not treated as PASS.

## 2. Findings

### 2.1 Z.ai / GLM API — free models, serious use-case restrictions

**Status: CANDIDATE / NOT QUALIFIED; restricted use.**

The official Z.ai developer pricing page currently lists these model variants at zero token price:

- GLM-4.7-Flash
- GLM-4.5-Flash
- GLM-4.6V-Flash

The same page lists other GLM models as paid. It does not publish a fixed quota for the free Flash models; the NOVA roster must not infer a request/token allowance from the $0 price. Rate-limit and account eligibility need verification in the actual developer console. No public evidence reviewed in this pass establishes that account creation and API-key use are guaranteed to work without a payment method or additional verification.

The legal distinction is material:

- Z.ai's Additional Terms for API Services allow business/developer users to integrate the API into applications and downstream systems.
- For API Services, Z.ai says it will not use End User Content to develop or improve its services unless the customer explicitly agrees.
- The accompanying API DPA says prompt/input and generated content are processed in real time and are not saved on Z.ai's servers. Other Customer Data may be temporarily stored and deleted after termination, subject to legal requirements; the DPA says the service is generally provided from Singapore.
- These API terms and DPA must be confirmed as applicable to the exact free API account and route. Do not treat the consumer Z.ai privacy policy as the API data-processing agreement.

**Important contractual restrictions:** Z.ai's Terms prohibit use for decision-making activities and prohibit services requiring professional qualification or review, expressly including investment and financial management. The Terms also restrict using Z.ai models, prompts or outputs for development/training/iteration of external models and for developing or enhancing algorithms or models that compete with Z.ai, except for an authorized integration in a specific business scenario. These clauses create a material fit problem for AstroCrown market/financial decision-support features and potentially for parts of NOVA's AI/model-development work.

**Decision:** Do not use Z.ai for user-facing AstroCrown investment/financial-management decisions, market recommendations, or model-development/competitive-model work unless Z.ai provides written confirmation that the precise use is permitted. A narrowly scoped generic coding or synthetic-data development test may be considered only after account eligibility, quota, applicable terms and the external-model clause are resolved. Do not send personal, confidential, proprietary or production data during qualification.

Sources:
- https://docs.z.ai/guides/overview/pricing
- https://chat.z.ai/legal-agreement/terms-of-service (last updated 2026-04-14)
- https://chat.z.ai/legal-agreement/privacy-policy (API DPA is appended to this page)

### 2.2 Kilo AI Gateway — useful anonymous access, upstream-dependent privacy

**Status: CANDIDATE for public/synthetic tests only; NOT QUALIFIED for confidential workloads.**

Kilo documents unauthenticated access to free models. Anonymous requests are identified by IP address and capped at 200 requests per hour per IP. Authenticated free-model requests are also IP-rate-limited. Free model availability changes, and some free models require data collection to be enabled.

Kilo explicitly warns that Auto Free may route requests to upstream providers that log prompts/outputs and use them to improve services. Its documentation specifically identifies NVIDIA free endpoints as trial-only and says not to submit personal or confidential data there. Kilo's provider directory makes the upstream dependency visible: the current directory labels 21 of 124 providers as training on prompts and 59 of 124 as retaining prompts. Those counts are directory-level metadata, not a privacy guarantee for a particular request. The exact selected model and provider must be checked each time.

Kilo Gateway also tracks request metadata such as model, provider, token counts and cost. Kilo's privacy policy states that prompts are sent to the selected AI provider via the routing layer and that data already sent to downstream providers is governed by those providers' retention rules. The exact Gateway endpoint's content-retention and deletion terms remain insufficiently established for AstroCrown's confidential workloads.

**Decision:** Keep Kilo as a possible low-friction gateway for public information, synthetic test data and non-sensitive development. Use an explicit model/provider choice rather than an opaque automatic route. Do not send credentials, secrets, source code not approved for disclosure, private user data, account records, wallet data or proprietary NOVA/AstroCrown memory. Do not count Kilo as an independent model provider or as guaranteed recurring capacity.

Sources:
- https://kilo.ai/docs/gateway/authentication
- https://kilo.ai/docs/gateway/usage-and-billing
- https://kilo.ai/docs/getting-started/using-kilo-for-free
- https://kilo.ai/docs/gateway/models-and-providers
- https://kilo.ai/providers
- https://kilo.ai/privacy (last updated 2026-05-29)

### 2.3 Hugging Face Inference Providers — small recurring included credit

**Status: CANDIDATE for tiny controlled experiments; NOT QUALIFIED as central capacity.**

The current official pricing documentation states that Free users receive $0.10 of Inference Providers credit per month, subject to change. Additional usage requires purchasing credits; this is not a free unlimited or no-overage API. The previous NOVA roster note that the included amount was conflicting/no credit is superseded by the current official pricing page, which now explicitly lists $0.10 per Free user.

Hugging Face's security page states that, when routing inference requests, it does not store request bodies or responses; debugging logs may be kept for up to 30 days but do not contain user data or tokens. Requests are encrypted in transit. Crucially, the actual inference is performed by an external Inference Provider, and Hugging Face directs users to that provider's own security/data policy. Upstream retention, training and jurisdiction therefore remain route-specific.

The free-credit documentation does not, by itself, prove account-specific no-card eligibility or establish whether any particular model provider is suitable for the intended data. Do not purchase credits or allow paid usage as part of this $0 work.

**Decision:** Correct the earlier "conflicting credit" note: $0.10/month is now the documented Free-account allowance. Consider only for minimal synthetic/public-data smoke tests after confirming no payment method is needed and selecting an upstream provider with acceptable terms. Do not count it as independent infrastructure or meaningful production capacity.

Sources:
- https://huggingface.co/docs/inference-providers/pricing
- https://huggingface.co/docs/inference-providers/security

### 2.4 Hugging Face ZeroGPU — small shared Space allocation, not a general GPU API

**Status: SECONDARY CANDIDATE for owned demo/smoke tests only; NOT QUALIFIED as NOVA's general GPU capacity.**

Hugging Face currently documents a 5-minute daily GPU quota for Free accounts and 2 minutes for unauthenticated users. The quota resets 24 hours after first use. ZeroGPU is shared, queue-based and currently compatible exclusively with the Gradio SDK.

A Free personal account in good standing (verified email and account age over 30 days) may host up to two ZeroGPU Spaces. This does not create a private general-purpose VM or a persistent GPU worker. Public Spaces expose their source code and running app to everyone; Protected Spaces are a paid-plan feature. The free path is therefore unsuitable for confidential/proprietary backend code or secrets.

**Decision:** Retain the adapter-specific candidate status already in NOVA's GPU roster. Consider only a small AstroCrown-owned public demo or synthetic smoke test after account and workload eligibility is established. Never count the nominal five-minute daily quota as reserved, automated or production GPU capacity. Do not use community-owned Spaces as an unapproved place to send private prompts.

Sources:
- https://huggingface.co/docs/hub/en/spaces-zerogpu
- https://huggingface.co/docs/hub/en/spaces-overview

### 2.5 Poolside / Laguna — hosted service ended; open weights remain a future self-host candidate

**Hosted free route status: EXPIRED. Model artifact status: FUTURE SELF-HOST CANDIDATE.**

Poolside's own Platform and Chat pages state that inference/chat shut down on 31 October 2026. OpenRouter's Poolside catalogue also marked the free Laguna S 2.1 and Laguna XS 2.1 endpoints "Going away October 31, 2026". That date has passed as of this review. Do not carry Poolside's previous direct API or OpenRouter free listing forward as active free capacity merely because old catalogue pages remain indexed.

The weights remain available on Hugging Face under OpenMDW-1.1. The published model card describes the license as allowing commercial and non-commercial use and modification. Laguna S 2.1 is a 118B-total / 8B-active MoE model; the BF16 weights require roughly 236 GB, while quantized variants reduce the hardware requirement but still need a substantial GPU/memory allocation. This is a model artifact, not hosted inference capacity. Poolside also cautioned that prompts/outputs sent to its free hosted endpoints could be used to train and improve its models.

**Decision:** Remove the direct Poolside API and expired free OpenRouter endpoint from active candidate planning. Retain Laguna weights as a future self-host option only when a qualifying GPU provider and workload budget exist. Any future hosting through another aggregator must be independently requalified; do not assume that the old Poolside data terms or free endpoint survive the service shutdown.

Sources:
- https://platform.poolside.ai/ (shutdown notice)
- https://chat.poolside.ai/ (shutdown notice)
- https://openrouter.ai/poolside/
- https://huggingface.co/poolside/Laguna-S-2.1
- https://huggingface.co/poolside/Laguna-S-2.1-base/blob/main/LICENSE.md

### 2.6 Nosana — free-credit claim is payment-method conditional; host trust boundary matters

**Status: CANDIDATE for future crypto-paid compute; INELIGIBLE under the current no-payment-method $0 path unless eligibility changes.**

Nosana's March 2026 announcement advertised $50 of free GPU credits. The later June 2026 product update says users can verify a payment method to claim free credits. Therefore the March headline must not be interpreted as proof of unconditional no-card access. The official Credits API exposes balance and eligibility/request endpoints, but no request or allocation was made during this review.

Nosana documents purchases using NOS or USDC as well as its Credits balance. This is evidence of crypto payment options, not proof of direct USDT payment or no-KYC eligibility. The current Terms (last updated 2026-08-03) do not establish that no identity or payment verification will ever be requested; no account-specific check was performed.

There is an equally important data-security boundary. Nosana is a decentralized GPU marketplace: independent hosts operate the machines on which jobs execute. Nosana says it does not control those machines or take custody of job data, and disclaims a guarantee that jobs/data will be protected against loss or unauthorized access. Do not place confidential prompts, secrets, private keys, personal data or proprietary code on an untrusted host without an independently qualified confidentiality boundary and controls.

**Decision:** Keep Nosana inactive. Do not request credits or create a job under the current $0/no-payment-method gate. It may be reconsidered as a crypto-funded GPU marketplace only after payment-method/no-KYC eligibility, direct accepted asset/network, host isolation/confidentiality, workload compatibility, pricing and actual capacity are verified. Use public/synthetic data only for any eventual untrusted-host test.

Sources:
- https://nosana.com/blog/the-new-nosana-experience-is-now-live/ (2026-03-13)
- https://nosana.com/blog/nosana-monthly-june-2026/ (2026-07-01)
- https://learn.nosana.com/api/credits.html
- https://www.nosana.com/terms-and-conditions/ (last updated 2026-08-03)

### 2.7 SambaNova Cloud — payment method required

**Status: INELIGIBLE UNDER CURRENT $0 / NO-PAYMENT-METHOD RULE.**

The current SambaNova Cloud plan page explicitly says that its "Free" plan requires adding a payment method and purchasing credits to run the first requests. That is not a qualifying free/no-card route. Community credit opportunities are separate and not an entitlement that can be assumed.

**Decision:** Keep deferred. Reconsider only if a current official offer provides API use with no payment method and a verified continuing $0 allowance.

Source:
- https://cloud.sambanova.ai/plans

## 3. Updated candidate disposition

| Candidate | Current disposition | Appropriate next step |
| --- | --- | --- |
| Z.ai / GLM Flash | CANDIDATE / NOT QUALIFIED; legal use restrictions | Resolve finance/model-development clauses, account/no-card status and quota before a synthetic coding-only test |
| Kilo Gateway | Conditional gateway for public/synthetic data | Pin model and upstream provider; verify that exact provider's current terms |
| Hugging Face Inference Providers | $0.10/month micro-credit candidate | Confirm no-card behaviour and choose an acceptable upstream |
| Hugging Face ZeroGPU | Secondary owned-Space smoke-test path | Confirm account age/verified email; use only public, non-sensitive Gradio demo |
| Poolside direct API / old free gateway endpoints | EXPIRED (31 October 2026) | No further direct/free-route qualification; retain model weights for future self-host review |
| Nosana | Payment-method conditional; crypto-paid future candidate | No credit request or job until no-KYC/payment and host-trust gates pass |
| SambaNova Cloud | INELIGIBLE under current no-card rule | Keep deferred |

The following roster entries were **not** requalified by this addendum and must remain UNKNOWN/CANDIDATE rather than being treated as approved: Alibaba Cloud Model Studio, Sarvam AI, Vercel AI Gateway, AI Horde, Typhoon, SiliconFlow, Fireworks AI, AI21 Labs, Scaleway, Upstage, Voyage AI, Contextual AI, Mixedbread, Tencent Hunyuan, NVIDIA NIM and the remaining secondary-directory leads. Existing Cohere trial restrictions remain as recorded in NOVA. No status is changed for these unreviewed candidates.

## 4. Effect on the Privacy & Transparency Centre and NOVA

- This review changes no running provider, workflow, secret, quota, endpoint, payment path, wallet or account.
- No candidate is promoted into NOVA's active provider roster or GPU roster by this document.
- No live API request, GPU deployment, credit request, account registration or provider-side test was run.
- The user-facing Privacy & Transparency Centre does not need a new provider claim yet: none of these routes is approved or integrated into the current AstroCrown preview. Add disclosures only when a specific provider/model/route is selected for an actual feature.
- Kilo, OpenRouter, Hugging Face Inference Providers and other gateways must remain identified as gateways/aggregators, not independent model infrastructure.
- The public Centre remains an educational preview, not the formal Privacy Policy or a guarantee of confidentiality.

## 5. Next qualification gates

1. Continue with the remaining direct-provider and gateway entries, prioritizing official no-card/free entitlement and commercial/use eligibility evidence over directory rankings.
2. For any route worth testing, first resolve whether its exact terms permit the intended AstroCrown/NOVA workload; do not use personal, confidential or proprietary material for exploratory tests.
3. Verify account-level payment method, region, phone/KYC requirements only through the provider's official signup/console after the user authorizes account access. Do not infer no-KYC from silence in public documentation.
4. Establish actual request/token limits, reset scope, rate headers, response-contract behaviour and provider identity with the smallest synthetic test only after eligibility passes.
5. Preserve the distinction between a one-time promotional grant, a monthly allowance, per-user credits, an anonymous rate-limited gateway, shared GPU minutes and recurring dedicated capacity.
6. Keep Strong RSI suspended and Weak RSI report-only/human-in-loop. No result in this addendum authorizes an RSI mode change.

## 6. Source-review limitation

This is a dated public-documentation review as of 2026-11-14. Dynamic prices, free model listings, upstream routes, policy text and account eligibility can change. Public documentation does not substitute for the provider's actual account dashboard, negotiated terms, direct written authorization or a controlled live qualification test. Missing evidence is recorded as UNKNOWN, not silently converted into approval.
