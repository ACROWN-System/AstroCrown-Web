# Block 8 — Provider Candidate Discovery 04

**Review date:** 2026-11-14  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Related work:** PR #177 — Privacy & Transparency Centre  
**Evidence scope:** Official provider pricing, model catalogues, API documentation, legal terms, privacy notices and quota documentation  
**Review mode:** Public-source desk review only. No accounts were created or accessed, no credentials or APIs were tested, no cards/identity documents were submitted, no credits were claimed or topped up, and no workload was started.

> This document separates model providers, gateways, moderation services, evaluation services and routing/cost-control infrastructure. A $0 listing or anonymous endpoint does not automatically establish no-KYC eligibility, commercial rights, adequate privacy, production readiness or independent model capacity.

## 1. Qualification rules retained

For each exact service, plan, model and route, evidence must separately establish:

1. recurring or one-time allowance and its reset/expiry;
2. no-card, no-bank, no-government-ID and no-KYC eligibility;
3. allowed internal development, commercial development and third-party/user-facing product use;
4. prompt/output processing, retention, training, human review, metadata and upstream providers;
5. hard quota/spend limit and fail-closed behavior at exhaustion;
6. whether this is a direct inference provider, gateway, specialist service, evaluation tool, user-pays product or self-hosted infrastructure;
7. reliability, SLA/support, model licensing, regional availability and portability.

If public documents do not establish an account-level or contractual fact, its status remains UNKNOWN. No private, personal, confidential, sensitive or proprietary data should be sent to unqualified candidates.

## 2. High-interest new routes

### 2.1 Speka — recurring monthly gateway credit without a card

**Disposition: HIGH-INTEREST GATEWAY CANDIDATE for synthetic/public workloads; NOT A MODEL PROVIDER and NOT PRODUCTION-QUALIFIED.**

Speka's current landing and pricing pages state that its Free plan is $0/month and includes $1 of monthly model usage without a payment card. It lists 10 requests per minute, one API key and access to the open models in its catalog. The current landing page advertises a 27-model catalog, an OpenAI-compatible endpoint, streaming, JSON mode and tool calling. The $1 amount is a gateway usage allowance, not $1 of independent model capacity; it is spent against the upstream model route's rates.

Its June 2026 Terms and Privacy Policy say:
- Speka does not log prompt content or model outputs by default;
- Speka does not use API inputs to train or fine-tune models;
- it retains request metadata such as model, token counts, latency and timestamps;
- prompts are transmitted to its model-inference provider(s) only to generate responses;
- its subprocessors include Supabase, Stripe and the model inference provider(s);
- output ownership is subject to the applicable underlying model licence;
- paid usage beyond the included allowance is billed at the model's published per-token rates;
- uninterrupted availability is not contractually guaranteed absent a separate SLA.

The terms do not identify every upstream inference provider, each provider's retention/training policy, the region for each route, or a comprehensive route-specific commercial licence. Speka explicitly says regulated-industry users, including finance, remain responsible for their compliance. Do not assume that an output may be used in a commercial product merely because Speka itself permits API access; check the exact model licence and AUP.

The public signup and pricing pages say no card is required. They do not conclusively establish whether every route is available in all regions or whether a non-card verification challenge can arise. Public terms do not establish a government-ID/KYC requirement, but absence of such a statement is not a verified no-KYC result.

**Overage guard:** the pricing page says usage beyond the monthly included allowance is billed at per-token rates. Before any API integration, verify the exact free-plan spend controls and configure an enforced hard cap/zero paid overage. Do not rely on a dashboard alert as a hard spending block.

**Decision:** Add Speka to the short-list for a small synthetic/public-data API-contract test only after checking account-specific no-card access, model/provider pinning, model license, route-specific terms and enforced spend limits. Do not send confidential, personal, proprietary or operational content. Count Speka as one gateway, not as an independent model family or as 27 providers.

Official sources:
- https://speka.me/
- https://speka.me/pricing
- https://speka.me/legal/terms (last updated June 2026)
- https://speka.me/legal/privacy (last updated June 2026)
- https://speka.me/legal/acceptable-use

### 2.2 OVHcloud AI Endpoints — free Qwen3Guard moderation models

**Disposition: HIGH-INTEREST SPECIALIST CANDIDATE for low-rate moderation tests; BETA / NOT GENERAL-PURPOSE INFERENCE.**

The current OVHcloud catalog lists the following free beta models:
- Qwen3Guard-Gen-0.6B;
- Qwen3Guard-Gen-8B.

The catalog shows Apache 2.0 licensing, 32K context and moderation support. These are guard/moderation models, not general conversational reasoning models.

OVHcloud's official AI Endpoints documentation (last updated 10 November 2026) states:
- anonymous requests are limited to 2 requests/minute per IP and model;
- API-key requests are limited to 400 requests/minute per Public Cloud project and model;
- excess requests receive HTTP 429;
- most request bodies are limited to 2 MB;
- the service currently imposes no total usage limit apart from rate and payload-size limits;
- its infrastructure is hosted in Europe and it states that data is not stored or shared during or after model use.

The documentation expressly describes an anonymous rate-limit route. This is a useful potential no-account/no-card development path, but it is only two requests per minute and IP-scoped. The documentation also describes authenticated API-key use for higher limits. The exact free beta model's regional availability, operational continuity and applicability of all public-cloud conditions must be verified before use.

**AstroCrown relevance:** This could be useful as one moderation signal for the future AstroCrown-native community feed, group posts and discussions. It must not be the sole moderation authority, particularly for nuanced political, cultural, financial, legal or other consequential content. Human review, appeals, language testing, false-positive monitoring and transparent rules remain necessary.

**Decision:** Keep as a promising specialist moderation candidate for small synthetic or public-content tests. Do not treat it as a full AI provider, production safety guarantee or currently approved processor for real user submissions. Before any live user-data flow, review OVHcloud's applicable special conditions, region/processor terms, moderation model limitations and operational route.

Official sources:
- https://www.ovhcloud.com/en-in/public-cloud/ai-endpoints/catalog/
- https://docs.ovhcloud.com/en/guides/public-cloud/ai-machine-learning/ai-endpoints-capabilities
- https://docs.ovhcloud.com/en/guides/public-cloud/ai-machine-learning/ai-endpoints-getting-started

### 2.3 Braintrust Starter — recurring evaluation and model-credit allowance

**Disposition: HIGH-INTEREST EVALUATION TOOL; NOT INDEPENDENT MODEL CAPACITY.**

Braintrust's official Starter pricing page currently offers:
- $0 monthly platform fee;
- no payment card required;
- $10 of model credits each month;
- 1 GB of processed data per month;
- 10,000 scores per month;
- 14-day data retention;
- unlimited users, projects, datasets, playgrounds and experiments.

The model credit covers Braintrust AI features and built-in models used without supplying a separate API key. This can support small recurring evaluation, scoring and experiment work. It is not an unrestricted $10 inference wallet and is not a replacement for direct provider APIs.

The free tier's principal risk is trace content. Braintrust's own trace documentation explains that traces can preserve full prompts, retrieved context, tool arguments/results and model outputs. The Starter retention period is 14 days. Braintrust's pricing matrix shows no click-through DPA for Starter (Pro has a click-through DPA; Enterprise offers custom terms). The self-serve MSA says Braintrust does not use Customer Data to train or improve AI models, but the exact agreement's applicability to a particular Starter account and the trace-storage relationship must be checked before any data is sent.

**Decision:** Consider for NOVA's synthetic benchmark comparisons, evaluator calibration, test-case scoring and model-regression experiments. Use synthetic or deliberately public material, strip identifiers, and do not send user memory, confidential repository material, secrets, private prompts or production user traces. It is an evaluation/observability service, not independent model capacity or a confidential-data approval.

Official sources:
- https://www.braintrust.dev/pricing
- https://www.braintrust.dev/legal/msa
- https://www.braintrust.dev/articles/llm-trace-storage

## 3. Free routing and transition infrastructure

### 3.1 Cloudflare AI Gateway — free analytics, caching and rate limiting

**Disposition: HIGH-INTEREST ARCHITECTURE COMPONENT; NOT A MODEL PROVIDER OR FREE INFERENCE ALLOWANCE.**

Cloudflare's official pricing page (last updated 2 November 2026) says AI Gateway is available on all plans and its core features—dashboard analytics, caching and rate limiting—are free. The current limits page states:
- 10 gateways per account on the free plan;
- 25 MB cacheable request size;
- cache TTL up to one month;
- 200 requests per 60 seconds per gateway for Cloudflare-managed Unified Billing credentials (this limit does not apply to BYOK);
- new gateways created from 24 September 2026 use Workers Logs pricing and retention.

AI Gateway can proxy Cloudflare-hosted and supported third-party model providers through one API, so it can improve routing consistency, observability, response caching and cost control. It does not add independent inference capacity and external providers still charge for their own use.

**Critical privacy setting:** logging is enabled by default. Logs can contain the full prompt and response as well as model/provider identifiers, status, token use, cost, duration and user-agent details. Disabling payload storage alone still permits metadata logging. A privacy-sensitive configuration must deliberately turn off full log collection at the gateway and evaluate Logpush, Workers Logs, caching and any other persistence separately. Caching is disabled by default; if enabled, identical request/response content may be stored for the configured cache TTL.

**Decision:** Retain as a possible free orchestration layer for existing, separately qualified providers. Before any use, require authenticated gateway access, explicit logging configuration, no unneeded Logpush, cache disabled for personalized/private prompts, and clear separation between metadata and content. Do not describe it as free inference or as a privacy shield.

Official sources:
- https://developers.cloudflare.com/ai-gateway/reference/pricing/
- https://developers.cloudflare.com/ai-gateway/reference/limits/
- https://developers.cloudflare.com/ai-gateway/observability/logging/
- https://developers.cloudflare.com/ai-gateway/features/rate-limiting/
- https://developers.cloudflare.com/ai-gateway/features/caching/
- https://developers.cloudflare.com/ai-gateway/usage/rest-api/

### 3.2 AIHubMix — 10 free trial calls; recurring daily quota starts after a $1 top-up

**Disposition: NOT A QUALIFYING RECURRING $0 ROUTE; gateway trial only.**

AIHubMix's live free-model page (updated 13 November 2026) lists 76 free model variants with $0 input/output token prices. Its free access conditions are:
- account registration by email or supported OAuth, no payment card for the initial trial;
- 10 trial API calls total, shared across all free models, with no expiry;
- after a one-time top-up of at least $1, the account receives recurring daily shared quotas of 100 requests/day, 10 requests/minute and 1 million tokens/day;
- the daily quotas reset each day; requests over those caps receive HTTP 429.

The initial 10 calls are a trial, not recurring free capacity. The daily quota requires a paid top-up; it therefore fails the strict $0/no-payment requirement as a way to unlock ongoing capacity.

The AIHubMix ZDR terms say ZDR is enabled by default and AIHubMix itself does not store prompts or outputs under default settings, apart from limited security exceptions. However, the same terms explicitly warn that third-party model providers may retain content for safety, filtering or legal compliance under their own rules. The Privacy Policy records request metadata and identifies US-hosted Google Cloud infrastructure and possible cross-border processing. The general Terms say paid service transactions may involve payment processors, including Stripe and Alipay; the current public Payment Notice does not establish a crypto payment option. Do not infer crypto payment from third-party directory claims.

The Terms also state that free services may be changed or discontinued without advance notice, and that the account is for personal use and may not be transferred, rented or lent. The precise ability to use the platform as a shared service for an AstroCrown end-user application must be confirmed before integration.

**Decision:** The 10-call trial may be suitable for a later, strictly synthetic compatibility check if explicitly authorized, but it is not a recurring no-cost infrastructure solution. Do not top up merely to obtain the daily quota. Treat AIHubMix as an aggregator, not as 76 independent model providers. Do not send confidential prompts just because the gateway offers ZDR; upstream terms remain decisive.

Official sources:
- https://aihubmix.com/models/free
- https://aihubmix.com/legal/terms (last updated 2026-09-08)
- https://aihubmix.com/legal/privacy
- https://aihubmix.com/legal/payment (last updated 2026-09-08)
- https://aihubmix.com/legal/zdr (last updated 2026-09-08)

### 3.3 Nous Portal — crypto-native x402 path, but not free API capacity

**Disposition: INTERESTING FUTURE CRYPTO-PAYMENT ROUTE; NOT A $0 API ROUTE.**

The current Nous Portal pricing page states:
- Free plan: $0/month, access to free models only, standard rate limits, and $0 monthly credits;
- paid API keys always consume a credit balance and do not draw from included subscription usage;
- API-key use requires credits or a paid plan, even where a model is shown as free in the portal's Free plan;
- plans and normal credit top-ups use card payments through Stripe.

The current Nous Portal comparison/help pages also advertise an x402 beta route: individual API requests can be paid in Solana USDC without a Portal account, API key or prepaid credits. Pricing is per request; the request's max_tokens setting (or a default maximum if omitted) is used to calculate the charge, plus a small surcharge. A short response can therefore cost according to the requested maximum rather than only its actual output length.

**Data-use concern:** The current Terms grant Nous a broad licence to process Service Data for service improvement, model training and related purposes by default, and to make some data/derivatives available to third parties. Enabling Privacy Mode prevents Nous from storing inference payloads or using them for training, product improvement or support, subject to the Privacy Policy. This setting does not override the separate terms of third-party model providers.

**Decision:** Keep as a future crypto-funded inference-route candidate, particularly for testing a Solana-USDC per-request payment adapter without a prepaid account. It is not free inference and does not accept USDT through the x402 route described in the current documentation. Before any use, verify the x402 settlement contract, token/mint, surcharge, maximum-token billing, refund/error behaviour, provider data terms and privacy-mode setting. Do not assume the x402 beta is an approved production payment method.

Official sources:
- https://portal.nousresearch.com/
- https://portal.nousresearch.com/compare
- https://portal.nousresearch.com/compare/openrouter
- https://portal.nousresearch.com/terms

## 4. Temporary and uncertain gateway leads

### 4.1 OpenCode Console / Zen free model routes

**Disposition: CONDITIONAL DEVELOPMENT-ONLY ROUTE; LIMITED-TIME MODEL AVAILABILITY.**

OpenCode's current model catalogue lists several models as free for a limited time. The provider-specific data-handling table is not uniform:
- selected GLM Flash, DeepSeek Flash and MiniMax Flash routes are stated to have zero retention and no model training;
- some other free routes explicitly collect data to improve or train the model;
- some NVIDIA free endpoints are trial-only and explicitly prohibit personal or confidential data;
- Beam retains data for 30 days for safety;
- LongCat 2.5 Free is capped at 100 requests/day, states zero retention/no training, and is hosted in China.

The catalog shows that models and deprecation dates change quickly. A free route is not a stable contractual entitlement, and the endpoint is a gateway to the listed model providers, not new model capacity. No universal no-card/no-KYC signup condition, commercial API guarantee or cross-model data policy was established in this pass.

**Decision:** Keep as an optional coding/development experiment only after selecting a precise model/provider route and reviewing its listed privacy exception. Never treat the gateway's general privacy description as applying to every free model. Do not use for confidential or personal material or production dependency.

Official sources:
- https://opencode.ai/docs/console/models/
- https://opencode.ai/docs/console/go/
- https://opencode.ai/en/zen

### 4.2 ModelScope free inference post

**Disposition: UNVERIFIED DISCOVERY LEAD — DO NOT COUNT AS CAPACITY.**

A ModelScope community post by MSEO dated 20 October 2026 advertises up to 2,000 cumulative free API calls per day and access to 60,000+ models, including Qwen, DeepSeek, GLM and MiniMax. This is not yet corroborated by a canonical ModelScope API-pricing/terms document identifying the precise API routes, per-model quotas, account/payment requirements, data retention, upstream processors or commercial-use conditions. The post also mentions ModelScope Notebook resources that require linking an Alibaba Cloud account; that notebook route must not be conflated with the separate Inference API.

**Decision:** Keep as a discovery lead only. Do not add 2,000 calls/day to NOVA capacity estimates or initiate an account-linkage flow until official product documentation and exact route terms are independently established.

Discovery source:
- https://modelscope.cn/posts/1409 (community resource post, 2026-10-20)

### 4.3 InferX

**Disposition: UNKNOWN / NOT QUALIFIED.**

InferX's current public pricing page uses service-specific data-handling language for free endpoints rather than establishing a blanket zero-data-retention guarantee. Its Terms describe public endpoints as best-effort with no SLA and allow the exact provider/service to determine data handling; the Privacy Policy likewise directs users to service and upstream-provider configurations. The material reviewed does not establish a reliable numeric free quota, no-card/no-KYC entitlement, model-specific data controls, or the exact third-party processor for a chosen model.

**Decision:** Do not repeat old directory claims that InferX guarantees ZDR. Reconsider only after the exact model endpoint, upstream, price, quota and processing terms are visible and independently verified.

Official sources:
- https://inferx.ai/pricing
- https://inferx.ai/terms
- https://inferx.ai/privacy

## 5. GPU lead correction — AMD Developer Cloud

**Disposition: INELIGIBLE / DOCUMENTATION CONFLICT UNDER CURRENT NO-CARD RULE.**

AMD's current Developer Cloud page advertises an initial $100 complimentary cloud credit for selected independent developers/open-source contributors, subject to application and AMD discretion. Its detailed credit instructions state that a valid credit card is required at third-party cloud account creation and is required to access complimentary GPU hours; they also warn that an instance continues consuming credits while powered off and is destroyed, together with its data, when credits are exhausted/expire without an active payment method.

The public AMD pages have differing figures and expiry periods (the current programme page says $100/30 days, while another detailed page describes an earlier 25-hour/10-day process). The card requirement is the decisive blocker for this project; no application or account setup was attempted.

**Decision:** Do not apply or create the third-party cloud account under the present no-card rule. Reconsider only if AMD and its cloud partner provide a current written route that does not require a card or financial-account linkage and specifies safe shutdown/data recovery behaviour.

Official sources:
- https://www.amd.com/en/developer/resources/cloud-access/amd-developer-cloud.html
- https://www.amd.com/en/developer/resources/cloud-access.html
- https://developer.amd.com/resources/

## 6. Candidate disposition summary

| Route | Disposition | Best-fit role if future gates pass |
| --- | --- | --- |
| Speka | HIGH-INTEREST, conditional | $1/month no-card gateway allowance for open-model synthetic/public tests |
| OVHcloud Qwen3Guard 0.6B/8B | HIGH-INTEREST, beta | Specialist moderation signal, low-rate anonymous testing |
| Braintrust Starter | HIGH-INTEREST, conditional | Synthetic benchmark evaluation, scoring and traces |
| Cloudflare AI Gateway | HIGH-INTEREST architecture component | Free routing, analytics, caching and rate limiting for separately qualified providers |
| AIHubMix | Trial only; not recurring $0 | Ten-call synthetic integration check; $1 top-up needed for recurring daily quotas |
| Nous Portal x402 | Future crypto-pay route; not free | Solana-USDC per-request payment, subject to route/privacy/billing validation |
| OpenCode Console free routes | Temporary development candidate | Model-specific coding tests with route-level privacy review |
| ModelScope | UNVERIFIED lead | Further official API/terms research required |
| InferX | UNKNOWN / NOT QUALIFIED | Further route-specific investigation required |
| AMD Developer Cloud | INELIGIBLE under no-card rule | No action unless card requirement is removed in writing |

## 7. Effect on NOVA and AstroCrown

- No provider was added to NOVA's active provider roster, gateway configuration, scheduled workflow or GPU roster.
- No API credentials, accounts, payment settings, cards, bank accounts, identity documents or KYC flows were accessed or changed.
- No API request, model benchmark, moderation test, GPU job, credit claim, top-up or payment was performed.
- No AI provider was approved for private memory, confidential source code, personal data, user submissions, payments, treasury or production workloads.
- Speka, AIHubMix, OpenCode Console and Nous Portal are gateways or platform services; do not count each model exposed by them as an independent provider.
- OVHcloud Qwen3Guard is a specialist moderation route and must not be described as general model capacity.
- Braintrust is an evaluation/observability system; it is not a substitute for provider infrastructure.
- Cloudflare AI Gateway is a routing/cost-control layer; logging, caching, metadata and upstream processing must be separately governed.
- The Privacy & Transparency Centre HTML remains unchanged. None of these routes is currently an approved integrated AstroCrown processor, so adding them as live provider disclosures would be misleading.
- Strong RSI remains suspended. Weak RSI remains report-only/human-in-loop.

## 8. Recommended next qualification order

1. Speka: confirm the no-card account flow, exact free-model catalogue, upstream model/provider identity, commercial licence for the selected model, enforceable zero-overage spend cap, and account-specific limits.
2. OVHcloud Qwen3Guard: confirm anonymous endpoint behaviour for the two exact beta models, region, acceptable content handling, and moderation quality/false-positive limitations on a synthetic test set.
3. Braintrust: determine whether the Starter terms apply the no-training undertaking; configure trace redaction and keep all tests synthetic/public; measure whether the $10 monthly credit can produce meaningful evaluator output without any paid overage.
4. Cloudflare AI Gateway: design the secure configuration offline first; require full logging disabled, Logpush absent, authentication on, personalized-response caching disabled and an explicit provider cost guard.
5. Nous Portal: evaluate x402 transaction semantics and Solana USDC settlement separately from free inference. Confirm request maximum billing, default max_tokens, surcharge and refund/failure behaviour before considering any payment adapter.
6. Continue official research on ModelScope and other new direct providers; do not accept directory claims as capacity.

## 9. Source and verification limitations

This is a public-source review dated 14 November 2026. Pricing pages, free model lists, rate limits, account signup requirements and upstream routes can change. Public pages do not establish account-specific no-card/no-KYC eligibility, the precise service agreement shown at registration, actual live capacity, regional entitlement or endpoint behaviour. Those must remain UNKNOWN until the exact route is authorized for a bounded synthetic test or the provider supplies written confirmation.

No outcome in this document qualifies any provider for production or confidential data. A candidate must pass its own provider, model, endpoint, plan, account, data-handling, legal-use and reliability gates before being added to an active NOVA route.
