# Free Provider Pool — Evidence Matrix

**Observation date:** 2026-10-12  
**Status:** Research baseline; candidates are not automatically production-approved  
**Owner constraint:** $0 usage, no debit/credit card or alternate payment-method registration, no auto-paid fallback  
**Related plan:** [Free Provider Pool Qualification](2026-10-12-Free-Provider-Pool-Qualification.md)

## 1. Existing credential qualification evidence

Evidence from the NOVA Provider Qualification workflow, not an account dashboard. The probe used one fixed, non-sensitive request and did not print response text or credentials.

| Credential / endpoint | Live result | Usage/rate evidence | Lifecycle decision |
|---|---|---|---|
| Groq — `openai/gpt-oss-20b` | PASS on second probe (HTTP 200; expected marker present) | Response showed 85 input / 21 output / 106 total tokens. Rate headers: 999 requests remaining from a reported 1,000 request limit; 7,851 tokens remaining from an 8,000-token-minute limit at observation time. | Keep eligible for bounded free-tier workloads, subject to privacy/workload policy and quota monitoring. |
| Gemini — `gemini-3.1-flash-lite` | PASS (HTTP 200; expected marker present) | 15 input / 7 output / 22 total tokens reported. No remaining-quota headers captured. | Keep eligible for non-sensitive tasks; free-tier content-use policy must be considered before sending proprietary context. |
| Mistral — `mistral-small-latest` | HTTP 429 on two qualification runs | Second run exposed `x-ratelimit-remaining-req-minute: 0`. This supports a request-per-minute limit boundary at observation time; it does not prove daily/monthly credit exhaustion or establish why the provider returned 429. | Remains DEFERRED. Do not automatically activate or repeatedly retry. Requalify only after a deliberate cooldown and with account/limit evidence. |
| GitHub personal access token | HTTP 403 on `GET /user` | API rate headers reported 4,998 requests remaining. Cause of 403 is not yet classified. | Repository-management credential only; diagnose endpoint/token-policy scope separately. Not AI inference capacity. |
| Cloudflare Workers AI | Skipped: key and account ID not both configured in the workflow | No live request made. | BLOCKED pending configuration; test the actual authentication type and account/model eligibility after setup. |

The qualification workflow does not inspect billing settings. Live API success cannot, by itself, prove an account has no payment method attached or that its current plan is exclusively free.

## 2. Highest-priority no-card candidates

| Provider | Evidence-backed offer | Workload fit | Status and required gate |
|---|---|---|---|
| OpenRouter | Official Free plan lists 25+ free models, four providers, and 50 requests/day; the Free plan lists no payment options. | Model diversity for public/non-sensitive chat and coding assistance. Gateway aggregation means model routes are not independent compute capacity. | **PRIORITY CANDIDATE** — create/verify a free-plan API key, use only explicitly free model IDs, and verify denied/over-limit calls cannot spill into paid routing. |
| Requesty | Official $0 plan advertises free models, 200 requests/day, and no credit card required. | General chat/code through a gateway with routing, caching and usage tracking. | **PRIORITY CANDIDATE** — verify Free plan account access and that the plan's free-only model constraints prevent a paid fallback. |
| Kilo AI Gateway | Official docs allow anonymous requests to free models at up to 200 requests/hour/IP; no key/registration is required for anonymous free-model access. Some free models require data collection to be allowed. | Opportunistic public/non-sensitive chat/code tasks; quick fallback without creating another credential. | **PRIORITY CANDIDATE WITH PRIVACY RESTRICTION** — allow only approved free routes and never send private source, secrets, personal data, or confidential tasks through routes that require data collection. |
| AI Horde OpenAI-compatible API | Official service allows anonymous use with public API key `0000000000`, at lowest priority; volunteer workers provide text and image generation. | Best-effort open-source text/image generation, especially non-urgent experiments. | **PRIORITY CANDIDATE FOR NON-SENSITIVE / ASYNC TASKS** — verify selected model licenses, privacy terms, queue behavior, and permitted public use; no SLA or guaranteed capacity. |
| Cloudflare Workers AI | Official Workers AI pricing lists 10,000 Neurons/day on the Workers Free plan; limits reset daily and operations above free allocation fail. Some models require a paid billing method. | General inference and certain multimodal tasks that fit a genuinely free-eligible model. | **EXISTING ACCOUNT CANDIDATE** — configure the correct Workers AI API token and account ID; select a model explicitly available on the Free plan. Do not use a model that requires paid billing. |
| Z.AI / GLM | Official pricing currently lists `GLM-4.7-Flash`, `GLM-4.5-Flash`, and `GLM-4.6V-Flash` at $0 per million tokens; other models/tools have paid prices. | Text, coding and vision tasks within the explicitly free models. | **PRIORITY CANDIDATE — PAYMENT TERMS UNKNOWN** — verify no-card signup, current quotas, any restrictions on competing services, data handling, and hard free-only behavior before creating/activating a key. |

## 3. Specialist or conditional candidates

| Provider | Official offer or limitation | Decision |
|---|---|---|
| Scaleway Generative APIs | Documentation lists a 1,000,000-token free tier and 60 minutes of transcription; over-quota usage can be billed, and current beta/plan language needs reconciliation with account behavior. | **CANDIDATE / CARDLESS STATUS UNKNOWN** — only qualify after account activation can be completed without a payment method and usage safely stops at the free boundary. |
| Voyage AI | Official pricing lists the first 200 million tokens free for several embedding models and a multimodal embedding allowance; subsequent usage is charged. | **SPECIALIST CANDIDATE / CARDLESS STATUS UNKNOWN** — embeddings/reranking only; no general chat capacity. Verify over-quota behavior and payment setup. |
| Hugging Face Inference Providers | Current official pricing page lists $0.10 monthly for Free users, subject to change; additional usage requires purchased credits. | **SMALL EXPERIMENTAL CANDIDATE / ACCOUNT STATUS UNKNOWN** — confirm the current account offer; maintain a hard zero-spend ceiling and do not purchase credits. |
| NVIDIA API Catalog / NIM | Individual model pages advertise free API endpoints in “Prototype” mode. Production continuity, limits, signup/payment requirements and data-use terms are not established by the prototype badge alone. | **DEVELOPMENT-ONLY CANDIDATE / CARDLESS STATUS UNKNOWN** — qualify terms and account path first; do not count as guaranteed public-production capacity. |
| Poolside | Documentation lookup currently encounters an access-code/login wall; public evidence retrieved here does not establish current free limits, cardless access, or production rights. | **BLOCKED / UNKNOWN** — do not count until official accessible documentation/account evidence exists. |
| Alibaba Cloud Model Studio | New-user free quota is available only for eligible international models in Singapore and expires after 90 days. Official docs warn that post-quota usage may be billed unless “Free Quota Only” is enabled. | **BLOCKED** — exclude until no-card eligibility and a tested free-only stop condition are demonstrated. |
| NVIDIA/Hugging Face/other GPU sharing | A hosted inference endpoint, embedding API or free queue is not equivalent to a dedicated GPU allocation. | Count only for the modality and task actually measured; do not use these entries to claim sustained GPU capacity. |

## 4. Explicit exclusions / deferred providers

- **SambaNova Cloud:** official Free plan says to add a payment method and purchase credits; fails the no-payment-method requirement.
- **GitHub Models:** inference API, model catalog, and playground were retired on 2026-07-30. Keep the GitHub token for its valid repository-management purpose only.
- **Cerebras Developer promotional credits:** deferred under the current rule because the offer requires a valid payment method; do not reactivate without new evidence and explicit policy review.
- **Mistral:** two live 429 qualification observations and zero remaining request-per-minute headroom in the second observed response; remains DEFERRED. The exact underlying reason beyond the reported request limit is unresolved.
- **OpenCode Zen:** do not count temporary promotions or endpoints requiring purchased credits/payment setup as sustainable free capacity.

## 5. Mandatory qualification and routing rules

A candidate can move through these independent states: `DISCOVERED` → `OFFICIAL_FREE_OFFER_VERIFIED` → `NO_PAYMENT_METHOD_VERIFIED` → `CREDENTIAL_CONFIGURED` → `LIVE_PROBE_PASS` → `QUOTA_AND_RESET_OBSERVED` → `DATA_AND_LICENSE_APPROVED` → `TASK_QUALIFIED` → `PRODUCTION_ELIGIBLE`.

A failed or unknown gate blocks the next state. The roster must not treat API response success as proof of free-tier eligibility, privacy suitability, commercial rights, sufficient quota, or sustained availability.

### Task tiers

1. **Deterministic/local tasks:** tests, formatting, linting, static analysis, diff validation, calculations and code-generation checks that can run without an LLM. Keep these local to GitHub Actions/free execution where feasible.
2. **Low-risk public/non-sensitive tasks:** may use approved no-card free routes. Gateway routes must be explicitly pinned to free-model IDs; no automatic paid fallback.
3. **Repository-context and development tasks:** send only the minimum necessary context to providers with an approved data-use policy. Gemini's free tier lists content as used to improve Google products; keep proprietary or sensitive context out unless a separate privacy decision authorizes it.
4. **Confidential, security-sensitive, identity-sensitive or high-impact tasks:** keep deterministic/local or use a provider with an explicitly approved data and retention policy; do not send secrets or credentials to any model.
5. **Image/video and GPU tasks:** use independent modality queues and license checks. Public AI Horde access is best-effort; free inference endpoints do not prove dedicated GPU capacity or always-on service.

### Cost, capacity and fairness controls

- Use allowlisted endpoints and model IDs; block paid models and open-ended fallbacks.
- Do not retry HTTP 401, 402 or 429 automatically. Record reset/remaining headers and use cooldown/circuit-breaker logic.
- Track per-provider input/output token use, daily/minute windows, reset timestamps, latency, errors, and observed quota.
- Route by task compatibility, privacy class, latency/capacity, remaining free quota and task priority, not only by provider rank.
- Use queues, bounded concurrency, caching, duplicate-job suppression, per-user quotas, request size/output caps, abuse controls and graceful backpressure for public access.
- Degrade nonessential features first when the free pool is exhausted; never let one shared free key promise unlimited public capacity.
- Do not assert the GPU capacity target is satisfied until real sustainable compute is measured. The project's reference target is 86,400 GPU-minutes/month; shared free queues and finite included quotas are not equivalent to that capacity.

## 6. Source register (official documentation)

- Groq rate limits: https://console.groq.com/docs/rate-limits
- Groq GPT-OSS 20B model and request parameters: https://console.groq.com/docs/model/openai/gpt-oss-20b and https://console.groq.com/docs/api-reference
- Gemini billing: https://ai.google.dev/gemini-api/docs/billing/
- Gemini pricing/data-use: https://ai.google.dev/gemini-api/docs/pricing
- Cloudflare Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- OpenRouter pricing: https://openrouter.ai/pricing/
- Requesty pricing: https://www.requesty.ai/pricing
- Kilo anonymous/free-model access: https://kilo.ai/docs/gateway/authentication and https://kilo.ai/docs/gateway/usage-and-billing
- Z.AI pricing: https://docs.z.ai/guides/overview/pricing
- AI Horde anonymous API: https://oai.aihorde.net/ and https://www.aihorde.net/
- Scaleway Generative APIs FAQ: https://www.scaleway.com/en/docs/generative-apis/faq/
- Voyage AI pricing: https://docs.voyageai.com/docs/pricing
- Hugging Face Inference Providers pricing: https://huggingface.co/docs/inference-providers/en/pricing
- Alibaba Cloud Model Studio new-user quota: https://www.alibabacloud.com/help/en/model-studio/new-free-quota
- SambaNova plans: https://cloud.sambanova.ai/plans
- GitHub Models retirement: https://github.blog/changelog/2026-07-30-github-models-is-now-retired/
- NVIDIA NIM sample free prototype endpoint: https://build.nvidia.com/meta/llama-3.2-90b-vision-instruct/deploy
