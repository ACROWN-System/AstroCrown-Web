# Block 8 — Provider Candidate Discovery 03

**Review date:** 2026-11-14  
**Repository:** `ACROWN-System/AstroCrown-Web`  
**Related work:** PR #177 — Privacy & Transparency Centre  
**Evidence scope:** Discovery beyond the inherited NOVA candidate roster; official provider pricing, model pages, API documentation, terms, privacy notices and account prerequisites  
**Review mode:** Public-source desk review only. No account was created/accessed, no credential or API was tested, no payment method or identity document was submitted, no free credit was claimed, and no workload was started.

> This document is a discovery checkpoint. Candidate status is not provider approval, legal advice, account eligibility confirmation or production qualification. Public documentation that does not prove a condition is recorded as UNKNOWN.

## 1. Scope and qualification rules

This pass widened the search beyond the inherited list in NOVA. It distinguishes:

- a provider's own model API from an aggregator/gateway exposing somebody else's model;
- an ongoing daily/rolling allowance from a one-time signup bundle or temporary model promotion;
- a public $0 model price from an account entitlement that is actually usable without payment or identity verification;
- a model provider from the infrastructure operator hosting the endpoint;
- opt-in data sharing for rewards from privacy-preserving inference;
- a managed inference endpoint from direct access to GPU resources.

A provider is not qualifying merely because a public page says “free”. The exact no-card/no-KYC path, overage behaviour, permitted use, prompt/output processing, and commercial/end-user rights must all be checked for the exact model and route. Do not send personal, confidential, proprietary, sensitive or private NOVA/AstroCrown content to any route whose data terms remain UNKNOWN.

The current project rule continues to reject mandatory bank/payment-account linkage, government identity checks, and KYC. A simple non-government authentication method (for example, email or an ordinary OAuth login) is not automatically KYC, but account eligibility and provider conditions must still be checked.

## 2. Newly discovered routes

### 2.1 Novita AI — Apodex 1.1 Mini serverless endpoint

**Disposition: HIGH-INTEREST CONDITIONAL CANDIDATE; NOT YET QUALIFIED.**

Novita's current official pricing/model pages list `apodex/apodex-1.1-mini` at **$0 per million input tokens and $0 per million output tokens**. The model page currently lists:

- 256K context window and 256K maximum output;
- OpenAI-compatible and Anthropic-compatible serverless API access;
- function calling, structured output and reasoning support;
- account signup and creation of an API key as the prerequisite shown on the model page.

This is a route-specific free price for one model, not proof of an unlimited or permanent free plan. The current model page does not state a request/token quota, reset period, guaranteed promotional duration, regional eligibility or quota-exhaustion behaviour. A previous Novita blog post dated August 18, 2026 described the catalog as having no $0 LLM model; the current pricing page now lists Apodex at $0. Treat the newer live pricing page as the current observed offer, while retaining the discrepancy as evidence that free listings can change.

**Terms and data handling:** Novita's Terms of Service, updated August 5, 2026, require adult users (18+) and valid account information; signup may use a Google or GitHub account. They prohibit mass registration to obtain multiple free quotas and reserve the right to change or discontinue model listings/prices.

Terms §10 state that:
- the user retains rights in submitted inputs;
- Novita receives a non-exclusive licence to view, reproduce and use input/output as necessary to provide the service;
- by default, Novita does not use content to train its own models or improve its Services;
- its stated Zero Data Retention policy says it does not retain content beyond generation and delivery, except as necessary to provide the service or technical support or where required by law;
- automated safety screening may be applied.

The Privacy Policy expressly excludes customer content processed on behalf of customers from its scope; customer content is governed by the applicable customer agreements. The Terms §10 is therefore especially important. However, the public material reviewed does not clearly identify the exact upstream model-processing/subprocessor route, data region, account-level quota, or the model creator's downstream commercial licensing conditions. The model page names Apodex as the model provider while Novita operates the API endpoint.

The general Terms refer to payment processing for purchases/paid services, but the free model page does not explicitly guarantee that every account can use the endpoint without adding a payment method. No KYC or government-ID requirement was found in the public signup terms, but account-specific eligibility was not tested.

**Decision:** Prioritize for a small synthetic-data API-contract test only after no-card eligibility, the endpoint's actual rate limits, commercial downstream rights and upstream processing are confirmed. Do not rely on it for confidential data or public user traffic yet. Do not describe the route as an independent model family separate from Apodex.

Official sources:
- https://novita.ai/pricing
- https://novita.ai/models/model-detail/apodex-apodex-1.1-mini?from=pricing
- https://novita.ai/legal/terms-of-service (updated 2026-08-05; especially §§4, 6, 7 and 10)
- https://novita.ai/legal/privacy-policy (effective/updated 2026-05-13)
- https://blogs.novita.ai/free-llm-api-comparison-2026/ (2026-08-18; older catalogue snapshot, conflicts with current $0 model listing)

### 2.2 GMI Cloud — free production-hosted inference endpoints

**Disposition: HIGH-INTEREST CANDIDATE FOR SYNTHETIC BENCHMARKS; DATA TERMS NOT QUALIFIED.**

GMI Cloud's own developer blog (June 4, 2026) advertises two free OpenAI-compatible inference endpoints:
- DeepSeek R1 Distill Llama 70B;
- Llama 3.3 70B Instruct Turbo.

The blog says access requires account creation but no credit card, and claims the endpoints use the same production H100/H200 infrastructure as paid customers. It describes this as free model/latency benchmarking and says the same API endpoint/format can transition to paid serverless inference.

The public blog does not specify:
- a numeric requests-per-minute/day or token allowance;
- whether the endpoint is permanent or can be withdrawn;
- a contractual SLA or support guarantee;
- an explicit over-quota fail-closed guarantee;
- no-KYC/no-government-ID eligibility (only no-card access is expressly claimed);
- the exact data retention, human review, training and deletion rules for free inference prompts and outputs.

GMI's Privacy Policy (last updated 26 February 2025) describes account information (name, email, organization/contact details), technical/API usage logs (including IP address, timestamps and usage metrics), and payment information for paid services. It says not to provide sensitive personal identifiers such as government ID numbers. However, the privacy page does not give a clear prompt/output retention or model-training rule for inference content. A separate Services Agreement defines Customer Data and contains data-loss and competitive-use provisions, but the public evidence does not establish whether that agreement applies to the free model endpoints or what click-through/free-endpoint terms govern a new account. Its applicability must be established before using the service for any competitive product/model analysis.

**Decision:** Keep GMI Cloud as a candidate for public/synthetic model-quality and infrastructure-latency benchmarks only, after the free-endpoint terms, quota, prompt handling and no-KYC account conditions are confirmed. Do not use internal source code, private research, proprietary strategy, secrets, personal data or user submissions. It is a managed inference endpoint, not direct GPU allocation and not an independent model family; distinguish the hosting route from the underlying DeepSeek/Llama model.

Official sources:
- https://www.gmicloud.ai/en/blog/where-to-get-free-h100-gpu-credits-for-ai-testing-and-model-benchmarking (2026-06-04; provider's own free-endpoint statement)
- https://www.gmicloud.ai/en/legal/privacy (last updated 2025-02-26)
- https://www.gmicloud.ai/en/legal/services-agreement
- https://www.gmicloud.ai/en/legal/terms-and-conditions

### 2.3 OpenAI API — complimentary daily tokens for selected data-sharing organizations

**Disposition: CONDITIONAL DATA-SHARING INCENTIVE; NOT A GENERAL $0 API TIER.**

OpenAI's official Help Center documents a programme under which **some organizations** may receive complimentary daily tokens for eligible model traffic if they opt in to share API inputs and outputs with OpenAI. The current Help Center page states:

- eligibility is account/organization-specific and visible only in the Data Sharing settings page;
- opting in means the selected project's inputs and outputs are shared with OpenAI to identify usage patterns, measure model quality and inform model evaluation/training;
- the API organization owner controls the setting and can opt out again;
- an eligible account must have a positive API account balance;
- the complimentary allowance is applied only to eligible models and traffic actually shared;
- tool use, fine-tuning, training and evaluation runs are not included in this token incentive;
- token counters reset daily at 00:00 UTC;
- a request that would exceed the daily limit is billed in full rather than partially free.

The Help Center lists model groups with a 1M/10M daily allocation for eligible usage tiers, reduced to 250K/2.5M for usage tiers 1–2. Actual eligibility and model list must be read from the organization's current settings; the help article says users who do not see the eligibility text are not enrolled. The programme is subject to 30 days' notice before termination.

OpenAI's API data-control documentation states that API inputs/outputs are not used to train or improve models by default. That default does **not** apply to projects deliberately opted into this incentive: their selected traffic is shared.

**Decision:** Do not treat this as available free infrastructure until the actual NOVA/AstroCrown organization displays the eligibility offer and a compliant positive balance exists. Do not opt in using proprietary, confidential, personal or private user data. A separate isolated project with explicitly approved public/synthetic traffic could be evaluated if the programme is account-eligible and all project owners understand that data-sharing is the consideration. No account setting was checked or changed. This route is first-party OpenAI API usage and must not be counted as an independent provider.

Official sources:
- https://help.openai.com/en/articles/10306912-sharing-feedback-evals-and-api-data-with-openai
- https://developers.openai.com/api/docs/guides/your-data

## 3. Additional discoveries that fail the current eligibility boundary

### 3.1 SenseNova Token Plan — free public beta, identity verification required

**Disposition: INELIGIBLE UNDER CURRENT NO-KYC RULE.**

SenseNova's official Token Plan page advertises a ¥0/month public beta for selected models (SenseNova 6.8 Flash Lite and SenseNova U1 Fast), showing 60,000 credits per five-hour window and up to 20 API keys. SenseTime's FAQ separately describes the limit as 1,500 calls per model every five hours. These are distinct units and must not be conflated: do not translate credits into calls/tokens without the model's official usage rules.

The official SenseNova 6.8 API integration guide instructs users to complete registration and identity verification before creating an API key on the platform. That is incompatible with the current no-KYC requirement. Public documentation reviewed here does not resolve the account's exact data-retention/training settings or non-mainland availability.

**Decision:** Do not register or submit identity verification. Retain only as a recorded excluded free-beta route unless SenseTime documents a separate no-KYC access path.

Official sources:
- https://www.sensenova.ai/token-plan
- https://sensetime.com/en/faq
- https://github.com/OpenSenseNova/SenseNova6.8/blob/main/API.md (official SenseNova integration guide; identity-verification prerequisite)

### 3.2 Tencent Cloud TokenHub — substantial one-time model quotas, real-name verification required

**Disposition: INELIGIBLE UNDER CURRENT NO-KYC RULE.**

The new Tencent TokenHub documentation describes a one-time free quota for new root accounts, with 1 million tokens for each eligible language model and a promotional window through December 31, 2026. The model-selection, validity and quota rules vary across product/documentation versions, so the exact package expiry and model scope would need to be checked in the console even for eligible users.

The official TokenHub quick-start guide states that users must register with Tencent Cloud and complete real-name authentication before first API use. That is a direct KYC conflict, regardless of the free package size. Tencent's international TokenHub documentation also describes a USD 1 balance freeze in some claim/activation paths; this is not assumed to apply identically to the newer domestic TokenHub route, but reinforces the need for route-specific financial checks.

**Decision:** Do not register or submit real-name verification. Do not count any Tencent TokenHub free model package as available AstroCrown capacity.

Official sources:
- https://cloud.tencent.com/document/product/1823/130053 (new-user free package)
- https://cloud.tencent.com/document/product/1823/130058 (quick start; real-name verification)
- https://cloud.tencent.com/document/product/1823/130078 (API use and regional endpoints)
- https://intl.cloud.tencent.com/zh/document/product/1300/80423 (separate international TokenHub product documentation; USD 1 freeze rule)

### 3.3 Volcano Engine Ark — free model quotas and safe-experience fail-closed mode, but real-name gate

**Disposition: INELIGIBLE UNDER CURRENT NO-KYC RULE.**

Volcano Engine's Ark documentation offers per-model free inference quotas for new users and a “Safe Experience Mode” which restricts usage to the platform's free token allowance and automatically pauses the endpoint when that allowance is exhausted. The documented safe mode is useful as a quota-exhaustion design pattern: while enabled, excess requests fail instead of switching automatically to paid use. It is a new-user setting and cannot simply be turned back on after it has been disabled. Separate plugins/knowledge-base features may still incur costs and are not covered by the token allowance.

However, Volcano Engine's account/service prerequisites say real-name authentication is required to purchase and use most cloud services, and its official Ark onboarding/activation documentation requires account authentication. The free no-overage mode does not remove that identity requirement.

The Ark service agreement says, unless separately authorized, customer prompts/outputs are not used to train, retrain or improve foundation models. It permits automated content screening for legal/compliance purposes. Its Collaboration Reward Program is different: participation is explicitly authorized data sharing, requires real-name personal/business verification and can return free resource packages based on collected inference traffic. Do not confuse that incentive with private inference.

**Decision:** Do not complete real-name authentication or activate the service under the current rule. Retain Safe Experience Mode as an architectural example for NOVA's own quota guards, not a qualifying provider.

Official sources:
- https://docs.volcengine.com/docs/ark/free-inference-quota?lang=en
- https://docs.volcengine.com/docs/ark/free-tokens-only-mode?lang=zh
- https://docs.volcengine.com/docs/account-related/basic-introduction?lang=zh
- https://docs.volcengine.com/docs/ark/doubao-model-service-agreement?lang=zh
- https://docs.volcengine.com/docs/ark/collaboration-reward-program?lang=en

### 3.4 Ant Ling (Ant Group) — 500,000 daily tokens, mandatory Alipay account binding

**Disposition: INELIGIBLE UNDER CURRENT NO-FINANCIAL-ACCOUNT RULE.**

Ant Ling's official developer FAQ advertises 500,000 free tokens per day (input and output combined), distributed before 02:00 daily and not carried forward. Its open API QPS limit is 2. The API quick-start/FAQ instructs users to bind an Alipay account before creating an API token. The pricing page says API consumption is paid from Alipay and, if an auto-debit agreement is signed, use can switch to pay-as-you-go after the free quota is exhausted; otherwise requests stop until the next daily free allowance or a recharge/binding action.

The recurring daily quota is potentially useful in isolation, but the mandatory Alipay account linkage and payment/debit relationship are incompatible with the project's no-bank/no-financial-account rule. No data-retention or prompt-training policy was established in this pass.

**Decision:** Do not bind Alipay, register payment credentials or activate the service. Exclude under the current rule despite its recurring free quota.

Official sources:
- https://developer.ant-ling.com/en/docs/faq/
- https://developer.ant-ling.com/en/docs/models/price/
- https://developer.ant-ling.com/en/docs/getting-started/quickstart/

### 3.5 DeepSeek direct API — no recurring free API entitlement verified

**Disposition: NOT A FREE-TIER CANDIDATE ON CURRENT OFFICIAL EVIDENCE.**

The current official DeepSeek API pricing page lists paid per-token prices for DeepSeek Flash and Pro models and says charges are deducted from topped-up or granted account balance. No official permanent free tier or 5-million-token free API grant was found in this pass. Third-party directory/offer claims about a 5M token grant are therefore not accepted as evidence without a current official DeepSeek promotion applicable to this account.

**Decision:** Do not count DeepSeek's own API as free infrastructure unless an official current promotion is produced. DeepSeek models may still be accessed through independently qualified third-party hosts, but those are separate routes with separate privacy/terms review.

Official source:
- https://api-docs.deepseek.com/quick_start/pricing/

## 4. Summary and priority

| Route | Current disposition | Reason / next gate |
| --- | --- | --- |
| Novita-hosted Apodex 1.1 Mini | HIGH-INTEREST CONDITIONAL | Live $0 input/output listing and strong default ZDR terms; verify no-card access, quotas, model rights and upstream route |
| GMI Cloud free inference | CONDITIONAL FOR SYNTHETIC BENCHMARKS | Official no-card claim and OpenAI-compatible H100/H200 path; exact free endpoint contract, quota and prompt-data terms remain UNKNOWN |
| OpenAI complimentary data-sharing tokens | CONDITIONAL / ACCOUNT-SPECIFIC | Daily allowance only for eligible orgs that share prompts/outputs and maintain a positive balance; synthetic/public traffic only |
| SenseNova Token Plan | INELIGIBLE | API guide requires identity verification |
| Tencent TokenHub | INELIGIBLE | Official quick-start requires real-name authentication |
| Volcano Engine Ark | INELIGIBLE | Account/cloud service real-name authentication prerequisite; safe quota mode does not remove it |
| Ant Ling | INELIGIBLE | Mandatory Alipay linkage and payment/auto-debit relationship |
| DeepSeek direct API | NOT A FREE CANDIDATE | No official permanent free API offer or current 5M grant verified |

Priority for a later account-permissioned qualification pass:
1. Novita-hosted Apodex: confirm no-card route, account eligibility, exact model/service limits and downstream rights; then perform a very small synthetic structured-output check.
2. GMI Cloud: obtain the free endpoint's governing terms, quota/overage and prompt-handling commitment; if adequate, perform only a bounded synthetic benchmark.
3. OpenAI data-sharing incentive: check whether the actual organization is eligible without changing settings; no opt-in is authorized by this research note.
4. Continue discovery beyond this search rather than treating the newly found candidates as an exhaustive global market.

## 5. Effect on NOVA and AstroCrown

- No candidate was activated, probed or added to NOVA's active LLM roster.
- No provider secret, API key, account session, payment method, identity document or KYC flow was accessed or changed.
- No payment, credit claim, free-plan activation or workload occurred.
- No PR #177 Privacy & Transparency Centre HTML was changed. None of the discovered routes is currently an approved or integrated AstroCrown processor, so adding them as active providers on the user-facing page would be misleading.
- Novita and GMI Cloud are distinct hosted routes to named model families; their endpoints must not be counted as extra underlying model families.
- OpenAI's data-sharing token incentive is not ordinary free inference and must remain separate from privacy-qualified providers.
- Strong RSI remains suspended; Weak RSI remains report-only/human-in-loop.

## 6. Evidence limitations

This is a dated public-source review as of 2026-11-14. Public documents do not establish actual account-specific eligibility, whether a card or phone challenge appears in a signup flow, current per-account rate limits, the exact upstream processing route, or reliability under AstroCrown workloads. Those require account evidence or written provider answers, followed by a bounded synthetic test only when the user authorizes it. UNKNOWN does not mean eligible.
