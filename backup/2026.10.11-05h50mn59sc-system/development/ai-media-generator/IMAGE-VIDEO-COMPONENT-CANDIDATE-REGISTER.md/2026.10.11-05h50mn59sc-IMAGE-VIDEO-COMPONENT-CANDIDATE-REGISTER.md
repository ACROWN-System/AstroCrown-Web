# Image and Video Component Candidate Register

**Evaluation date:** 2026-10-10  
**Status:** ACTIVE RESEARCH — no complete workflow or generation backend approved  
**Repository baseline:** `main` at merge commit `1d5742890c68210513485841f27bae3450cfcdff`  
**Owner:** `development/ai-media-generator/`  
**Related subsystems:** `development/gpu-infrastructure/`, `development/nova-ai-orchestration/`

## 1. Purpose and decision rule

This register records a bounded, source-backed first pass over image models, video models, hosted inference, and workflow composition software for the AstroCrown-owned multi-model media platform.

It is not an exhaustive ecosystem survey and does not select the "best" model based on popularity. It identifies realistic candidates and the mandatory evidence needed to qualify them.

Hard constraints:

- $0 expenditure and no mandatory payment method during the current proof-of-concept stage.
- No paid fallback, prepaid-credit route, or paid-plan activation without a separate explicit decision.
- Commercial and hosted-service permission for the exact intended use, with required restrictions and notices implemented.
- Actual execution on compute that is available under the cost constraints.
- Component and model versions must be traceable.
- Prefer modular integration and reversible workflow composition; do not merge model weights merely because multiple models are available.
- A documented component license is only one criterion; it does not prove hosted endpoint terms, output rights, hardware fit, or successful operation.

Use `PASS / FAIL / N/A / BLOCKED` per the repository development/audit convention. In this register, PASS only means that the narrow claim in the relevant column has documentary evidence. It does not mean the candidate is accepted as a whole.

## 2. Current first-pass candidate register

| ID | Candidate / intended role | Documentary evidence | Cost / execution result | Current eligibility |
|---|---|---|---|---|
| IMG-01 | Cloudflare Workers AI `@cf/bytedance/stable-diffusion-xl-lightning` — hosted text-to-image baseline | Cloudflare labels the model Beta, documents 1024px generation in a few steps, and shows $0.00 per step. Hugging Face identifies the weights as `openrail++`. | Published model page suggests no per-step price, but actual use, exact quota behavior, and no-payment-method access remain untested in the user's account. | **BLOCKED** — first account-level check candidate, not approved. |
| IMG-02 | Cloudflare Workers AI `@cf/stabilityai/stable-diffusion-xl-base-1.0` — alternative hosted text-to-image | Cloudflare labels it Beta and shows $0.00 per step; its model page links its upstream terms/license. | Same account/usage verification is required. The central pricing table does not list this Beta model, so record actual dashboard/model behavior instead of assuming the display establishes all billing conditions. | **BLOCKED** — alternative comparison candidate, not approved. |
| IMG-03 | Cloudflare Workers AI `@cf/black-forest-labs/flux-1-schnell` — hosted image candidate | Cloudflare central pricing documents 4.80 Neurons per 512×512 tile and 9.60 Neurons per step, with a general Free allocation of 10,000 Neurons/day. The upstream FLUX.1 schnell model card identifies Apache-2.0 and a 12B-parameter text-to-image model. | A published free allocation is not measured capacity or proof of this account's eligibility. Exceeding the Workers Free allocation stops further operations; paid-plan use is outside the current constraint. | **BLOCKED** — account test, usage-meter behavior, output quality, and hosted terms need evidence. |
| IMG-04 | Local FLUX.1 schnell weights through a compatible inference engine | Upstream model card/repository identify Apache-2.0 for FLUX.1 schnell and provide reference inference code. FLUX.1 dev/fill/edit variants are separately licensed and must not inherit schnell's status. | No free GPU has been verified for this user's actual environment. Model weights, text encoder, runtime dependencies, and memory/latency must be measured; open weights do not make compute free. | **BLOCKED** — rights are promising for the exact base model, but runtime/dependency and hardware gates remain. |
| VID-01 | Wan 2.2 TI2V-5B — local text/image-to-video baseline | The official Wan2.2 repository states that the models in the repository are under Apache 2.0. Its documentation describes TI2V-5B at 720p/24fps and indicates at least 24 GB VRAM for this path. The 14B paths require substantially more memory (the repository documents 80 GB for relevant single-GPU examples). | Model download, exact component versions, available GPU, generation time, VRAM and output quality are untested. No qualifying free compute path is currently established. | **BLOCKED** — strong licensing candidate; compute feasibility remains a mandatory barrier. |
| VID-02 | Lightricks LTX-2.5 — text/image/video-to-video and synchronized audio/video | Official model card says commercial and production use at no cost for entities under $10M annual revenue under the LTX-2.x Community License. The same source says transfer of fine-tunes may require a paid license; over $10M annual revenue requires a paid commercial agreement. It requests agreement to share contact information and receive offers/updates to access gated weights. The documented selected model files total roughly 66 GiB for one recommended pipeline. | This is not the same as an unrestricted Apache-2.0 model. Its revenue threshold, fine-tune transfer terms, gated access/marketing consent, hardware needs, and free compute must be considered. | **BLOCKED** — potentially useful optional video candidate, not a foundation dependency until long-term license and access constraints are resolved. |
| VID-03 | Tencent HunyuanVideo-1.5 — alternative video model | The official Tencent Hunyuan Community License is royalty-free within its defined territory, which excludes the EU, UK and South Korea. It requires downstream service terms to carry specified restrictions, and calls for clear provider identity/non-affiliation disclosure when offering third-party services. It prohibits using outputs/results to improve other AI models (apart from Hunyuan derivatives). | Local/hardware and execution tests remain outstanding. Its downstream restrictions also complicate any proposed process that would use Hunyuan outputs to train or improve another model. | **BLOCKED / RESTRICTED** — only consider if the license and product obligations can be implemented and the intended use does not violate the cross-model restriction. |
| ENG-01 | ComfyUI — optional node/workflow composition engine | Official repository uses GPL-3.0 and documents graph-based workflows; official model integrations include multi-model image and video workflows. Each custom node, extension, model and checkpoint must be audited separately. | Engine is free software, but compute and model downloads are not free by implication. Must verify runtime compatibility, API isolation/authentication, extension supply chain, and obligations for the intended deployment/distribution. | **CANDIDATE, NOT APPROVED** — investigate as a reusable adapter/workflow engine; do not make it the sole product boundary by assumption. |

## 3. Official sources

### Cloudflare image candidates and quota

- General Workers AI pricing and Free allocation: https://developers.cloudflare.com/workers-ai/platform/pricing/
- SDXL-Lightning model page: https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-lightning/
- SDXL Base 1.0 model page: https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-base-1.0/
- FLUX.1 schnell model page: https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/
- Workers AI data usage: https://developers.cloudflare.com/workers-ai/platform/data-usage/
- Workers AI REST access: https://developers.cloudflare.com/workers-ai/get-started/rest-api/
- SDXL-Lightning model card and license indicator: https://huggingface.co/ByteDance/SDXL-Lightning
- FLUX.1 official model card: https://huggingface.co/black-forest-labs/FLUX.1-schnell
- FLUX.1 official inference repository and model-license distinctions: https://github.com/black-forest-labs/flux

### Video candidates

- Wan2.2 official repository and license/hardware guidance: https://github.com/Wan-Video/Wan2.2
- Wan2.2 official Apache-2.0 license file: https://github.com/Wan-Video/Wan2.2/blob/main/LICENSE.txt
- LTX-2 official code/pipeline repository: https://github.com/Lightricks/LTX-2
- LTX-2.x license index: https://github.com/Lightricks/LTX-2/blob/main/LICENSE
- LTX-2.x Community License: https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x
- LTX-2.5 model card, hardware/file-size and access conditions: https://huggingface.co/Lightricks/LTX-2.5
- HunyuanVideo-1.5 license: https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5/blob/main/LICENSE
- HunyuanVideo-1.5 notice/dependency licenses: https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5/blob/main/NOTICE

### Workflow engine

- ComfyUI source repository: https://github.com/comfy-org/ComfyUI
- ComfyUI license: https://github.com/comfy-org/ComfyUI/blob/master/LICENSE
- ComfyUI core workflow concepts: https://docs.comfy.org/essentials/core-concepts/links

## 4. Important findings

### F-001 — A hosted API is the least-complex first route to test for images

Cloudflare already documents image endpoints and a daily free allocation. For the first test, the next meaningful evidence must come from the user's own logged-in Cloudflare account. No third-party credentials or paid fallback are needed to document the evaluation, but a real API test will require an appropriately scoped token and account identifier. Do not create or expose a token until the user verifies the dashboard state and explicitly authorizes the credential step.

### F-002 — The published SDXL $0.00 model-page label is not yet an end-to-end acceptance result

The SDXL pages are marked Beta and show $0.00 per step. That makes them candidates to check first; it does not prove this user's account can invoke them without upgrade/payment prompts, that quota is sufficient, or that the same conditions will remain available. Verify the exact model page and usage dashboard in the account. Record the actual displayed conditions rather than assuming.

### F-003 — FLUX.1 schnell's unit pricing and the account's daily free quota must be observed together

Cloudflare's main pricing table lists FLUX.1 schnell at 4.80 Neurons per 512×512 tile and 9.60 Neurons per step. The Free plan's 10,000-Neuron daily allocation resets at 00:00 UTC, and further operations fail after a Free limit is exceeded. The dashboard should therefore be checked for current usage and reset information before a test. Do not infer that the complete daily allowance can be dedicated to AstroCrown or estimate number of successful images without recording dimensions, steps, parameters and actual usage.

### F-004 — Video licensing can be technically compatible but operationally unsuitable

Wan2.2 is the clearest Apache-2.0 video license candidate in this first screen, but it still needs at least 24 GB VRAM on its documented 5B path. LTX-2.5's commercial permission is conditional on a community license/revenue threshold and has specific gated access terms; HunyuanVideo introduces downstream user terms, attribution/disclosure, territorial scope, and a restriction against improving other AI models with its outputs. These differences are material to a multi-model platform and must stay visible.

### F-005 — The workflow engine and each extension have separate licensing and security footprints

ComfyUI could simplify orchestration and make multi-model compositions easier, but its GPL-3.0 license, extensions' licenses, runtime security, and redistribution/deployment obligations need review. The engine does not grant permission to use its loaded model weights. Audit nodes and dependencies individually, pin versions, and keep the public application boundary behind AstroCrown-controlled job and authorization APIs.

### F-006 — The final constraint is a complete runnable path, not a list of downloadable models

No local hardware details or free GPU allocation have yet been verified for this runtime. There is no evidence yet that Wan2.2, LTX-2.5, or any other local video model can run persistently at $0 and without payment-method prerequisites. Cloudflare's documented image API does not establish free video compute. Avoid installing/downloads and avoid claiming an always-on GPU until a real, permissible runtime is identified.

## 5. Current decisions

- Keep the service model-agnostic and modular.
- Check SDXL-Lightning first in the existing Cloudflare account, then compare SDXL Base only if the account/usage screen supports it.
- Retain FLUX.1 schnell as a separate candidate for local or hosted execution; do not assume its hosted price is identical to its local use or Apache model license.
- Retain Wan2.2 TI2V-5B as a video candidate pending 24 GB VRAM or a verified free execution route.
- Keep LTX-2.5 as a restricted future candidate due to its community license, revenue terms, model-access conditions and substantial download.
- Keep HunyuanVideo-1.5 restricted pending downstream-term and intended-workflow review.
- Keep ComfyUI as an optional candidate workflow engine, not as the AstroCrown product boundary.
- Do not implement a workflow that contains unqualified dependencies.
- Do not spend money, activate billing, submit marketing consent, or create API credentials as part of this research record.

## 6. Impact analysis

**IF adopted:** candidate selection remains transparent, the first image test can be performed with minimal work, and video/engine licensing and compute risks are addressed before implementation. The platform can add capabilities without hiding material constraints in a single generic “open source” status.

**IF not adopted:** model selection may focus on output quality while overlooking license terms, cost, hardware, dependency compatibility, terms imposed on end users, or the impossibility of operating at the project's current stage.

## 7. Open gates and next action

The inventory is deliberately **not closed**. All complete workflows remain BLOCKED until their mandatory gates have evidence.

The next action that genuinely requires the user is account-level observation in Cloudflare:

1. Open the supplied Workers AI usage/dashboard URL while signed in.
2. Identify whether the page shows the account's current Workers plan, Neuron usage/reset, and available testing/run control.
3. If a model is selected or there is a model catalogue, verify whether `@cf/bytedance/stable-diffusion-xl-lightning` is accessible without prompting for payment, upgrade, or prepaid credit.
4. Do not create an API token, accept new terms, or change account/billing settings yet. Report the visible state; redact email addresses, account identifiers if desired, and all secrets.

After that observation, decide whether a no-payment test is feasible. If Cloudflare is eligible, request explicit authorization before creating a token or changing any GitHub secret. If not, keep the result BLOCKED and continue with non-billing alternatives.

## 8. Closure

This register is current as of 2026-10-10. Re-check upstream licenses, model cards, Cloudflare plan terms, model availability, and hardware compatibility immediately before implementation because these may change. A candidate moves out of BLOCKED only when the applicable missing evidence is supplied and the relevant verification is re-run.
