# Candidate Evaluation — Cloudflare Workers AI Text-to-Image Models

**Evaluation date:** 2026-10-10  
**Repository source commit:** `ee02ebbd3f517f8c3d417d2c6b4bbc9bce1fee5b`  
**Status:** ACTIVE — no candidate approved; mandatory checks remain BLOCKED  
**Scope:** Read-only review of documented Cloudflare-hosted text-to-image candidates for an internal AstroCrown media-generation proof of concept, with later public use considered separately.

## Requirement

Identify the least-complex candidate that can generate useful images for internal AstroCrown asset production while preserving the project constraints:

- $0 expenditure and no payment-method dependency.
- No automatic paid-plan, credit, or billing fallback.
- Commercial-use rights and applicable provider/model conditions understood.
- No unsupported privacy or capacity claims.
- One provider/model must remain replaceable within the shared media-generation boundary.

The requirement is not satisfied by an account existing, a model page being public, a published free quota, or a model license considered in isolation.

## Candidate set examined

1. Cloudflare Workers AI + `@cf/bytedance/stable-diffusion-xl-lightning`
2. Cloudflare Workers AI + `@cf/stabilityai/stable-diffusion-xl-base-1.0`
3. Cloudflare Workers AI + `@cf/black-forest-labs/flux-1-schnell`

This is a bounded first pass over three models explicitly found in Cloudflare's current image-model documentation. It is not an assertion that the wider image-generation ecosystem has been exhaustively evaluated.

## Mandatory criteria and results

| ID | Criterion | SDXL-Lightning | SDXL Base 1.0 | FLUX.1 schnell |
|---|---|---|---|---|
| C-001 | Current documented text-to-image endpoint exists | PASS | PASS | PASS |
| C-002 | Documented unit pricing is internally consistent with the central pricing source | BLOCKED | BLOCKED | PASS — metered by Neurons |
| C-003 | Actual account can use the candidate without a payment method or upgrade | BLOCKED | BLOCKED | BLOCKED |
| C-004 | Model-level license is identifiable and can be evaluated for internal commercial asset creation | PASS — OpenRAIL++ identified | PASS — CreativeML OpenRAIL++-M identified | PASS — Apache-2.0 identified by the model card |
| C-005 | Applicable hosted-endpoint/provider terms and restrictions are sufficiently resolved for the intended use | BLOCKED | BLOCKED | BLOCKED |
| C-006 | Live request and output retrieval succeed in the user's account | BLOCKED | BLOCKED | BLOCKED |
| C-007 | Image suitability, latency, failure behavior, and quota/resource use are measured | BLOCKED | BLOCKED | BLOCKED |

**Overall eligibility: BLOCKED for all three candidates.** The PASS results cover only the narrow criteria named in the table; they do not imply end-to-end readiness or general legal approval.

## Evidence and findings

### F-001 — The Workers AI Free plan has a documented hard quota boundary

Cloudflare's pricing page, last updated 2026-10-09, states that Workers AI includes 10,000 Neurons per day on Workers Free. Use above that allocation requires Workers Paid; on Workers Free, exceeding the documented limits causes further operations to fail rather than silently billing the Free plan for the overage.

The same page identifies a set of models that require a paid billing method; the three candidates evaluated here are not in that published list. However, this does **not** establish that the user's specific account can access a candidate without adding a payment method. Account-specific access remains BLOCKED until verified in the logged-in dashboard.

Source: https://developers.cloudflare.com/workers-ai/platform/pricing/

### F-002 — SDXL model-page prices do not reconcile with the central price table

Cloudflare's individual pages currently label both SDXL-Lightning and SDXL Base 1.0 as **Beta** and list unit pricing as **$0.00 per step**:

- SDXL-Lightning: https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-lightning/
- SDXL Base 1.0: https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-base-1.0/

The central pricing table has a section for image-model pricing, lists FLUX.1 schnell and other metered models, but does not list either SDXL candidate. The model-page display is therefore useful evidence but not enough to assert that the complete account, invocation, rate-limit, or billing path has no dependency on plan eligibility or payment details.

Source: https://developers.cloudflare.com/workers-ai/platform/pricing/

**Required resolution:** verify the model can actually be invoked under the existing account, without a payment-method prompt, paid-plan activation, prepaid credits, or billing-setting change. Record the exact screen/result and, when a test becomes authorized and possible, the usage-meter change.

### F-003 — SDXL-Lightning and SDXL Base use OpenRAIL++ family licenses with downstream conditions

The model-source pages identify the model licenses:

- SDXL-Lightning: https://huggingface.co/ByteDance/SDXL-Lightning
- SDXL Base 1.0: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0

The identified OpenRAIL++ family license permits model use, including commercial use and remote access, subject to conditions and use-based restrictions. The license text requires the relevant restrictions to be included in an enforceable agreement and users to be notified when the model or its derivatives are distributed/hosted for third-party remote access. The exact deployed endpoint terms and required notices must be checked before a public AstroCrown generator is offered.

For a first *internal-only* asset-generation experiment, do not accept user uploads or sensitive inputs; preserve the source and license version used. Before any public feature, turn required license restrictions into explicit product and acceptable-use requirements and verify them.

License/source pages:
- https://huggingface.co/ByteDance/SDXL-Lightning/blob/main/LICENSE.md
- https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/blob/main/LICENSE.md

### F-004 — FLUX.1 schnell has a clear model-level license, but its hosted-use restrictions need clarification

The FLUX.1 schnell model card identifies Apache-2.0 and states that the model can be used commercially:
https://huggingface.co/black-forest-labs/FLUX.1-schnell

Cloudflare's model page links to Black Forest Labs' terms and license. Cloudflare also says its hosted models can remain subject to third-party model-provider terms:
https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/
https://developers.cloudflare.com/workers-ai/platform/data-usage/

Black Forest Labs publishes a usage policy and Developer Terms containing restrictions relevant to use of FLUX models and hosted applications, including provisions concerning competing products/services and downstream end-user terms:

- https://bfl.ai/legal/usage-policy
- https://bfl.ai/legal/developer-terms-of-service

The public materials examined do not conclusively resolve the exact applicability of each BFL provision to the Cloudflare-hosted open-weight endpoint for this project's future user-facing generator. Do not infer either that the restrictions definitely govern the Cloudflare endpoint or that the Apache-2.0 label makes all provider terms irrelevant. The question stays BLOCKED and must be resolved before selecting FLUX for public access.

### F-005 — Cloudflare's documented data-use policy is favorable, but only covers the Cloudflare layer

Cloudflare states that Workers AI Customer Content is not made available to other Cloudflare customers and is not used to train Workers AI models or improve Cloudflare or third-party services without explicit consent. It says Customer Content may be stored when the customer uses a storage product in conjunction with Workers AI.

Source: https://developers.cloudflare.com/workers-ai/platform/data-usage/

This supports the narrow Cloudflare-layer data-use finding. It does not remove the need to inspect the applicable model-provider conditions, define AstroCrown's own retention/deletion controls, or avoid sensitive user inputs in an initial experiment.

### F-006 — API mechanics are documented; actual operation has not been tested

Cloudflare documents a REST API that requires an account ID and Workers AI API token, and shows a model-specific request returning the generated image as base64. The FLUX page documents `@cf/black-forest-labs/flux-1-schnell`; the SDXL pages document their model IDs, parameters, and image output schemas.

Source:
https://developers.cloudflare.com/workers-ai/get-started/rest-api/
https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/
https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-lightning/
https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-base-1.0/

No token has been created, no secret has been added to GitHub, and no API call or image-generation test has been performed in this audit. Account-level operation, rate limits, measured image quality, latency, and actual quota consumption remain BLOCKED.

## Data and change boundaries

- Work performed: source review and documentation planning only.
- Repository runtime/source code: NOT MODIFIED.
- User's Cloudflare account, billing configuration, or payment methods: NOT MODIFIED.
- API tokens, environment secrets, GitHub secrets, and workflows: NOT CREATED OR MODIFIED.
- Public AstroCrown feature state: NOT MODIFIED.
- No model or provider is approved by this record.

## Decision

**Do not implement or promote any of these candidates yet.** Keep the three models as candidates. The next smallest meaningful verification is to inspect the logged-in Workers AI dashboard for available model/test access and confirm whether it asks for a payment method, a paid-plan change, or prepaid credits. Do not upgrade, buy credits, or create a token during that initial inspection.

If an account-level test is subsequently authorized and the account permits it under the hard $0/no-payment-method constraint, start with a non-sensitive internal asset prompt; capture the exact model ID, selected parameters, generated output, observed latency, errors, and actual usage evidence. Public-user access requires a separate terms, privacy, license-condition, safety, capacity, and admission-gate decision.

## Re-test and closure

This record is not closed. Revisit it after:
1. account-level no-payment-method eligibility is verified;
2. the cost/usage discrepancy for any selected candidate is reconciled;
3. the applicable model/provider terms for the chosen route are reviewed;
4. a live request and result retrieval are tested;
5. quality and performance measurements are captured.

Until those steps are supported by evidence, the eligibility result remains **BLOCKED**.
