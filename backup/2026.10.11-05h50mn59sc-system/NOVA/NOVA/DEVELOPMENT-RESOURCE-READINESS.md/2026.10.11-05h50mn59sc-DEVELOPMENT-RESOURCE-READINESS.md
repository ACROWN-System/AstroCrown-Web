# NOVA Development Resource Readiness

## Objective

Define the minimum external resources required for effective NOVA development, live smoke tests, provider failover tests, capacity tests, economic tests, and future GPU/media work while maintaining the $0 development objective.

## Current rule

Unit tests and deterministic architecture tests must run without provider credentials and must never consume external quota.

Live tests are separate. They require real credentials and must be deliberately limited so that development does not accidentally consume the available free allocation.

## Important quota rule

NOVA must not assume that a quota belongs to an individual API key. Providers may measure limits at organization, project, account, or other scopes. The capacity record must preserve the provider's actual scope.

## Minimum LLM resources

| Provider | Secret(s) | Minimum development role | Live measurements to capture | Current free-development evidence | State |
| --- | --- | --- | --- | --- | --- |
| Groq | GROQ_API_KEY_01 | Primary fast LLM smoke/failover provider | requests remaining, tokens remaining, reset intervals, usage, model | Free plan documents RPM/RPD/TPM/TPD and exposes remaining/reset headers | REQUIRED |
| Google Gemini | GEMINI_API_KEY_01 | Independent model-family benchmark and multimodal testing | project quota/limits, token usage, model, response latency; account/dashboard quota where API does not expose remaining | Free tier provides access to selected models and limits are visible in AI Studio; limits are project-level | REQUIRED |
| Cloudflare Workers AI | CLOUDFLARE_API_KEY_01 + CLOUDFLARE_ACCOUNT_ID | Independent inference path and free Neuron testing | Neurons used/remaining, reset, model availability, request errors | 10,000 Neurons/day on Free; many models remain free, including GLM-4.7 Flash | REQUIRED |
| Cerebras | CEREBRAS_API_KEY_01 | Optional fallback only if the no-payment-method rule changes | usage/rate-limit data exposed by account/API, token usage, latency | Official pricing says the one-time $5 promotional credit requires a valid payment method and expires after 30 days | BLOCKED FOR CURRENT $0 / NO-PAYMENT RULE |

## Deferred supplier history: Mistral Free API

**Current decision (2026-10-10): DEFERRED — excluded from active free-tier capacity and live health/failover checks by user decision.**

Mistral is no longer listed as a minimum free-development provider, is absent from the active `NOVA/roster.json` provider list, and its secret is no longer injected into the scheduled AI heartbeat/reasoning workflow or the opportunistic probe scheduler. The credential name is retained only in the deferred-provider record and the historical evidence below. No secret was deleted or rotated.

### Historical evidence preserved

- **2026-10-08:** The selected Mistral Studio workspace displayed the Free plan together with “Upgrade to use your API keys,” and the observation record at that time recorded zero API keys. This is a historical dashboard observation, not a statement of current account state.
- **2026-10-09:** The user reported that a Playground request succeeded, while the dashboard showed one request and $0.00 usage. The NOVA heartbeat then received HTTP 429, error type `rate_limited`, code `1300`, for `mistral-small-latest`. Relevant runs: [37889314591](https://github.com/ACROWN-System/NOVA/actions/runs/37889314591) and [37926549165](https://github.com/ACROWN-System/NOVA/actions/runs/37926549165).
- The chatbot in Mistral support attributed Free-mode errors to best-effort capacity prioritization and absence of reserved capacity. This is the provider chatbot's stated explanation; it has not been independently established as the cause of the specific request rejection by a human technical specialist.
- The earlier heartbeat predates the merge of the Mistral-specific diagnostic-header fix in PR [#57](https://github.com/ACROWN-System/NOVA/pull/57). Its empty `diagnostic_headers` therefore did not establish that no Mistral-specific headers were returned.

### Decision and requalification boundary

The decision is a reversible supplier-risk measure based on repeated failures, the reported negligible usage, the provider's Free-mode explanation, and the accumulated operational cost of continuing to debug it. It is **not** a finding that the individual error cause is proven, that Mistral acted deceptively, or that Mistral's paid API is unsuitable.

Do not include Mistral Free API in available free capacity, scheduled health checks, or automated failover while this decision is in force. Preserve historical observations and offline diagnostic regression tests. Reconsider only after an explicit user decision to requalify it and evidence demonstrates adequate availability, response quality, reliability, terms, and economic suitability.

Historical diagnostic record: [Mistral 429 diagnostics and investigation loop](research/2026.10.09-IMPLEMENTED-mistral-429-diagnostics-investigation-loop.md).

## GPU credential injection boundary

The GPU heartbeat workflow exports the two candidate secret environment-variable names `NOSANA_GPU_API_KEY_01` and `HF_ZEROGPU_TOKEN_01`. The GPU roster currently has no active providers, so the heartbeat remains UNCONFIGURED until a provider-specific adapter and an approved active provider entry exist. Mapping a secret into a workflow must never be mistaken for activating or testing a provider.

## Additional LLM access candidates

These do not replace the direct-provider rows above and must not become active runtime dependencies until an adapter and tests exist.

| Candidate | Secret slot | Current evidence | Use boundary |
| --- | --- | --- | --- |
| OpenRouter | `OPENROUTER_API_KEY_01` | Official free plan: 25+ free models, four free providers and 50 requests/day; support documents 20 RPM. https://openrouter.ai/pricing/ ; https://openrouter.zendesk.com/hc/en-us/articles/39501163636379-OpenRouter-Rate-Limits-What-You-Need-to-Know | Aggregator, not independent upstream capacity; free models change |
| Hugging Face Inference Providers | `HF_INFERENCE_API_KEY_01` | Free-account allowance $0.10/month, subject to change. https://huggingface.co/docs/inference-providers/pricing | Aggregator; do not purchase credits or enable paid usage |
| Cohere trial | `COHERE_TRIAL_API_KEY_01` | Free trial, 1,000 calls/month; not permitted for production/commercial use. https://docs.cohere.com/v2/docs/rate-limits | Development only; not a public-service fallback |
| SambaNova Cloud | `SAMBANOVA_API_KEY_01` | Current plan page says payment method plus purchased credits are required for first requests. https://cloud.sambanova.ai/plans | Ineligible under current rule |
| NVIDIA NIM / API Catalog | `NVIDIA_NIM_API_KEY_01` | No verified no-card/no-cost sustained API offer confirmed in this pass | UNKNOWN / BLOCKED |

## GPU resources

| Provider | Credential/resource | Development role | Measurements required | State |
| --- | --- | --- | --- | --- |
| Nosana | NOSANA_GPU_API_KEY_01 | First real GPU workload path; image/video/model experiments | available credits, reserved credits, settled credits, available credits, spending history, workload runtime, GPU class | REQUIRED for GPU/media development |
| Hugging Face ZeroGPU | HF_ZEROGPU_TOKEN_01 when authentication is needed | Shared GPU validation and provider-independent experiments | GPU-seconds remaining, reset time, queue/priority, over-quota credit usage if applicable | SECONDARY |

Nosana's current API exposes credit balance, spending history and transactions. API-key scopes include `credits:read`, `jobs:read`, and workload-writing scopes; least privilege should be used. Free-credit eligibility can also be checked through the API. See: https://learn.nosana.com/api/credits.html and https://learn.nosana.com/api/scopes.html

Hugging Face currently documents free ZeroGPU access and a programmatic `get_zero_gpu_quota()` path returning base quota, remaining GPU-seconds and reset time. Free accounts have a 5-minute daily quota under the current documentation. See: https://huggingface.co/docs/huggingface_hub/main/guides/manage-spaces and https://huggingface.co/docs/hub/en/spaces-zerogpu

## Implemented before secrets

The following architecture and deterministic mechanisms are ready without live provider/GPU credentials:

- observation freshness and stale-evidence handling
- separation of total-resource balances from call/window allowances
- expiry/reset opportunity detection
- renewal metadata and economic guards
- comparable net-value calculation including explicit negative effects
- deterministic multi-resource task allocation using a Pareto frontier
- optional task context for capacity-aware provider ordering
- secret-safe credential readiness inspection
- offline unit-test coverage

No live provider or GPU call is required for these mechanisms.

## What is required before live development can start

### A. Architecture-only development

No external key is required for:

- Python compilation
- unit tests
- provider routing tests using mocks
- quota parser tests
- economic accounting tests
- pricing tests
- crypto payment-intent validation
- autonomy-boundary tests
- deterministic observer/fingerprint tests

### B. Minimum live LLM development

Obtain and configure at least:

- GROQ_API_KEY_01
- GEMINI_API_KEY_01
- CLOUDFLARE_API_KEY_01
- CLOUDFLARE_ACCOUNT_ID

CEREBRAS_API_KEY_01 is not a priority while the project requires $0 use without adding a payment method; the current official offer is a one-time $5 credit that requires a valid payment method and expires after 30 days. See https://www.cerebras.ai/pricing.

### C. Live development test categories

Each configured provider must pass, where technically applicable:

1. Authentication test.
2. Minimal deterministic response-contract test.
3. Actual-model identification test.
4. Usage accounting test.
5. Remaining-quota/reset measurement test.
6. Error and rate-limit handling test.
7. Latency baseline test.
8. Provider failover test.
9. Quality benchmark test.
10. Quota-exhaustion or simulated-quota test.

Tests 1-7 should use the smallest practical requests. Tests 8-10 should normally use mocks/simulations first so free quota is reserved for genuine live verification.

## Live quota protection

NOVA should maintain a dedicated `development_test_budget` per provider.

The budget should define:

- maximum live smoke requests per day
- maximum test tokens per day
- maximum test GPU-seconds per day
- minimum remaining quota reserve
- maximum percentage of free allocation that tests may consume
- reset time
- whether the resource is renewable, one-time, promotional, or purchased

Until measured consumption proves otherwise, live automated testing should use a conservative fraction of the provider's free allocation rather than the entire allowance.

## Development resource states

Every resource should be one of:

- REQUIRED_NOT_CONFIGURED
- CONFIGURED_NOT_VERIFIED
- VERIFIED_AVAILABLE
- DEPLETING
- EXHAUSTED
- EXPIRED
- PAYMENT_REQUIRED
- BLOCKED
- UNKNOWN

## Provider scope

Capacity must store whether the measurement is scoped to:

- credential/key
- project
- organization
- account
- subscription
- workspace
- provider-wide

Never label a project-level limit as a key-level limit.

## Free-to-paid transition during development

Free resources are consumed first only when their measured economic and quality value justifies doing so. Their use does not reduce the public price.

When a free resource approaches its minimum reserve, NOVA should prepare the next development resource or paid fallback before exhaustion.

## Before production

Development readiness is not production readiness. Before public deployment, NOVA must additionally verify:

- authoritative billing/credit access
- provider invoices or spend measurements where applicable
- payment destination verification
- crypto settlement adapter where required
- public-price continuity headroom
- provider replacement capacity
- disaster/failover behavior
- data/privacy terms for each selected provider
- commercial-use rights for the selected models and generated assets

## Evidence principle

Provider pricing, quotas and model catalogs change. The values recorded in this file are planning evidence, not permanent constants. NOVA must retain source URL, observation time, scope and verification state for live provider measurements.
