# Image and Video Component Candidate Register

**Document revision:** 2026-10-15  
**Initial evaluation:** 2026-10-10  
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
| IMG-04 | Local FLUX.1 schnell weights through a compatible inference engine | Upstream model card/repository identify Apache-2.0 for FLUX.1 schnell and provide reference inference code. FLUX.1 dev/fill/edit variants are separately licensed and must not inherit schnell's status. | Kaggle now exposes two Tesla T4 GPUs and working CUDA, but no FLUX weights were downloaded or inference run. No-payment conditions, FLUX-specific runtime/dependency fit, memory/latency, and output quality remain untested; open weights do not make compute free. | **BLOCKED** — rights are promising for the exact base model, but runtime/dependency and hardware gates remain. |
| IMG-05 | Local ByteDance SDXL-Lightning 4-step UNet plus SDXL base through Diffusers — optional opaque base-plate/comparison candidate, not the transparency-first experiment | The official model card identifies the weights as `openrail++`, provides a documented FP16 Diffusers path using the SDXL base and a 4-step UNet checkpoint, and describes 1024px generation in a few steps. The base checkpoint and all dependencies require separate terms/provenance review; OpenRAIL restrictions mean this is not an unrestricted OSI-approved open-source license. | Kaggle diagnostics now confirm two Tesla T4 GPUs (15,360 MiB each) and working CUDA. The account page displayed 00:00 / 30 GPU-hours, and the user selected the GPU accelerator. SDXL-Lightning weights/output/runtime have not been tested, and full no-payment terms, session persistence, download size and actual resource use remain unverified. Kaggle quotas are not persistent serving. | **BLOCKED** — candidate for bounded technical feasibility only; commercial promotion requires full component-rights review. |
| IMG-06 | Local Tongyi-MAI Z-Image-Turbo (6B) through a compatible Diffusers/runtime stack — permissive-license alternative | The publisher's model card labels the repo Apache-2.0, describes a 6B model, 8 NFEs for Turbo, and says it fits within 16 GB VRAM consumer devices. Its quick-start uses `bfloat16`; NVIDIA's precision table does not list BF16 Tensor Core input support for the Tesla T4's compute capability 7.5, so compatibility must not be assumed. | Kaggle's two Tesla T4 GPUs are observed, but no Z-Image weights or generation ran. A T4-compatible precision/runtime adaptation, actual VRAM use, download, output, commercial-use obligations beyond the model repository, and full no-payment eligibility remain unverified. | **BLOCKED** — rights are promising for the stated model repository, but runtime/hardware fit and all dependency terms remain to be verified. |
| IMG-07 | Local LayerDiffuse transparent-asset generation through an appropriate maintained integration | The LayerDiffuse CLI code repository is Apache-2.0 and points to a separate Diffusers CLI integration; that is distinct from the model weights. The separate `lllyasviel/LayerDiffuse_Diffusers` weight repository is marked `openrail` and totals about 5.74 GB. The demo also uses the separately marked `openrail++` `SG161222/RealVisXL_V4.0` base checkpoint. That CLI marks itself Work In Progress, documents SDXL transparent text-to-image and image-to-image commands as finished, but leaves the SDXL layer system on its TODO list. Its requirements pin Diffusers 0.28.0, Transformers 4.41.1 and Accelerate 0.30.1, materially older than the already-working Kaggle environment (0.40.0, 5.16.1 and 1.14.0). The CLI README states an 8 GB Nvidia VRAM requirement. Its demo uses `SG161222/RealVisXL_V4.0` (also marked `openrail++`; its model card cautions it is still in training and may contain artifacts) and explicitly loads the VAE with `torch.bfloat16` despite `variant="fp16"`. NVIDIA lists Tesla T4 as compute capability 7.5 and does not list BF16 among supported Tensor Core input types for CC 7.5; native BF16 execution therefore cannot be assumed for this GPU. The exact operation on this notebook has not been tested. The integration, underlying SDXL/model weights, adapters, and runtime dependencies have their own status and must be checked separately. | Kaggle has now exposed two Tesla T4 GPUs and the notebook import/network preflight passed, but no LayerDiffuse weights were downloaded and no transparent image was generated. Runtime compatibility, actual alpha/edge quality, isolated-environment feasibility, and commercial-use suitability remain untested. In particular, do not run the upstream demo unchanged on T4 or downgrade the working notebook packages; the BF16 and dependency pins require a separate review. Do not downgrade the already-working notebook packages speculatively. | **BLOCKED** — strongest current local transparency experiment candidate for separate source assets only; its full SDXL layer-system feature is unfinished and the pinned dependency stack differs from the working notebook. No install/inference until an isolated runtime and dependency/licensing review. |
| IMG-08 | Hosted one-call transparent asset generation through Cloudflare's third-party OpenAI image route, candidate `openai/gpt-image-1.5` | Cloudflare's GPT Image 2 page says that model does not support transparent backgrounds and points readers to GPT Image 1.5 for transparent PNGs. GPT Image 1.5 is described as a third-party model; its current model page links dashboard pricing, and the published parameter list does not clearly expose a `background: transparent` field. | No request has been made. Free/no-card entitlement, the exact transparent-output API contract, payment route, returned alpha channel and commercial terms are unverified. Do not assume Workers AI's standard free Neuron allocation covers this third-party route. | **BLOCKED** — technical reference only until pricing/access and the documented output contract are explicitly verified; never activate paid billing for this qualification. |
| VID-01 | Wan 2.2 TI2V-5B — local text/image-to-video baseline | The official Wan2.2 repository states that the models in the repository are under Apache 2.0. Its documentation describes TI2V-5B at 720p/24fps and indicates at least 24 GB VRAM for this path. The 14B paths require substantially more memory (the repository documents 80 GB for relevant single-GPU examples). | Model download, exact component versions, available GPU, generation time, VRAM and output quality are untested. No qualifying free compute path is currently established. | **BLOCKED** — strong licensing candidate; compute feasibility remains a mandatory barrier. |
| VID-02 | Lightricks LTX-2.5 — text/image/video-to-video and synchronized audio/video | Official model card says commercial and production use at no cost for entities under $10M annual revenue under the LTX-2.x Community License. The same source says transfer of fine-tunes may require a paid license; over $10M annual revenue requires a paid commercial agreement. It requests agreement to share contact information and receive offers/updates to access gated weights. The documented selected model files total roughly 66 GiB for one recommended pipeline. | This is not the same as an unrestricted Apache-2.0 model. Its revenue threshold, fine-tune transfer terms, gated access/marketing consent, hardware needs, and free compute must be considered. | **BLOCKED** — potentially useful optional video candidate, not a foundation dependency until long-term license and access constraints are resolved. |
| VID-03 | Tencent HunyuanVideo-1.5 — alternative video model | The official Tencent Hunyuan Community License is royalty-free within its defined territory, which excludes the EU, UK and South Korea. It requires downstream service terms to carry specified restrictions, and calls for clear provider identity/non-affiliation disclosure when offering third-party services. It prohibits using outputs/results to improve other AI models (apart from Hunyuan derivatives). | Local/hardware and execution tests remain outstanding. Its downstream restrictions also complicate any proposed process that would use Hunyuan outputs to train or improve another model. | **BLOCKED / RESTRICTED** — only consider if the license and product obligations can be implemented and the intended use does not violate the cross-model restriction. |
| ENG-01 | ComfyUI — optional node/workflow composition engine | Official repository uses GPL-3.0 and documents graph-based workflows; official model integrations include multi-model image and video workflows. Each custom node, extension, model and checkpoint must be audited separately. | Engine is free software, but compute and model downloads are not free by implication. Must verify runtime compatibility, API isolation/authentication, extension supply chain, and obligations for the intended deployment/distribution. | **CANDIDATE, NOT APPROVED** — investigate as a reusable adapter/workflow engine; do not make it the sole product boundary by assumption. |

## Selected architecture — generate assets separately; compose internally (2026-10-15)

**Decision direction:** Generate source assets with a qualified local model or external image endpoint, then assemble and transform them in AstroCrown's own composition environment. The image-generation provider is not responsible for final homepage layout. This is the intended design direction for the image workflow; the transparent-generation backend and commercial qualification remain BLOCKED until tested.

### Separation of responsibilities

1. **Generation adapter:** make a provider-neutral request for one defined source asset (for example, a base space plate, planet, Earth/Moon, nebula, dust cloud, star/debris element, or token logo). If the requested asset must be independently composable, use an output mode that explicitly supports transparency where available. A prompt saying "transparent background" is not proof the endpoint produces alpha.
2. **Asset validation gate:** decode the actual returned file; verify dimensions, format, and true alpha where required. An RGBA mode alone is insufficient if every alpha value is 255. Test transparent pixels, object opacity, wispy edges and halos over both dark and light contrasting backgrounds. Record any required post-processing separately.
3. **Asset registry:** retain a stable asset ID, checksum, generation provider/model/version, prompt, seed and parameters when provided, timestamp, dimensions, file format, alpha-test result, provenance, and exact model/endpoint/dependency terms evidence. Do not infer output rights from a code or weights license alone.
4. **Internal compositor:** keep composition as structured data, not another AI-generation prompt. Store ordered asset IDs plus position, scale, rotation, opacity, crop, blend mode and visibility. Use browser-native CSS/SVG/Canvas for the live website as appropriate, and a local/internal image compositor for exported flattened files. A new composition or layout adjustment must not require another generation/inference request.
5. **Delivery and regression checks:** verify that alpha survives transforms, storage, optimization, export and browser delivery. Keep editable layered source data even when a flattened export is produced.

### Composition rules

- A full-canvas base space plate may be opaque; it should be deep navy, low-contrast and free of baked-in cards, text, logos or prominent objects.
- Reusable foreground/atmosphere objects that overlap the base or one another should be separate assets with verified alpha. Planets, Earth, Moon, debris, nebula formations and token logos should not be embedded into one indivisible homepage raster when they must be moved independently.
- Website UI, text, cards and data visualizations remain independently rendered UI components rather than being generated as part of the background.
- One qualified external API call can create a source asset that is reused in many compositions. Use a single request to return several assets only when the exact endpoint documents independent outputs and returns each asset separately. An image-edit API that blends multiple input images into one output does not replace a non-destructive layer/composition system.
- Keep image generation, alpha post-processing, internal composition and final delivery as independently replaceable/testable components. A failure or rights limitation in one route must not require redesigning all compositions.

### AstroCrown-owned model strategy — fine-tune first, foundation training later

**Strategic direction:** Prefer a model that AstroCrown operates and versions itself, with external GPU services treated as replaceable compute hosts rather than as opaque third-party image-generation APIs. This allows the same qualified weights and inference pipeline to move to different GPU hosts without intentionally changing the model. GPU portability, exact reproducibility and commercial rights still need separate validation.

**Stage A — qualify and fine-tune a permitted base model (recommended first experiment):**

1. Select an exact base checkpoint only after reviewing the base model's license/terms, commercial-use rights, redistribution and hosted-service obligations, training-data constraints, architecture, runtime compatibility and realistic fit on the observed 15-GiB Tesla T4 GPUs.
2. Create a small, documented, rights-cleared training set for AstroCrown's visual identity: deep-navy/blue-violet space treatments, lighting/contrast rules, and desired asset aesthetics. Keep captions, source provenance, permissions and train/validation splits. Do not use third-party or generated outputs as training data unless the exact terms permit that use; respect model-specific restrictions on using outputs to train other models.
3. Use a parameter-efficient adaptation (for example, LoRA) before considering full-model fine-tuning. Begin with a small offline/configuration review, then one bounded training experiment only after memory and library compatibility are demonstrated. The current Kaggle session provides useful proof-of-concept compute, not guaranteed recurring capacity or persistent serving.
4. Version the base model ID/revision/checksum, adapter ID/checksum, tokenizer/text encoder, VAE, inference runtime/dependencies, precision, scheduler, resolution, safety filters and supported parameter range. Package the base+adapter+pipeline as a single named AstroCrown model release. A LoRA is an adapter and generally depends on its base; it is not a stand-alone independent foundation model.
5. Evaluate against a fixed prompt/reference set using repeated seeds, side-by-side visual review, prompt adherence, consistency across a batch, VRAM/latency measurements and task-specific alpha checks. Style fine-tuning alone does not create real transparent output: native alpha or a separately qualified transparency stage remains a distinct capability gate.
6. Preserve each approved output file immutably with a checksum. Re-running the same model can provide consistency but is not a substitute for storing approved results; do not promise bit-for-bit identical outputs across different hardware/software stacks.

**Stage B — own a full foundation model (long-term research only):**

Training a foundation model from scratch would provide more control over architecture and training data, but requires a much larger curated dataset, sustained compute, engineering and evaluation effort. The currently observed Kaggle T4 allocation is not evidence that training a competitive image foundation model from scratch is practical under the $0 constraint. Do not choose this path as a prerequisite for the first assets.

**License rule:** Fine-tuning, merging adapter weights, renaming a checkpoint or serving it from AstroCrown does not erase the base model's license. The combined model, training data, runtime and every dependency require their own rights/provenance review. Prefer a commercially compatible base with clear redistribution and modification terms, but select only after evaluating technical fit; an Apache-2.0 model label alone does not clear the entire pipeline.

**Paid GPU migration rule:** If/when paid compute is approved, deploy the same exact AstroCrown model release to that provider and pay for GPU execution—not a different provider-owned generation model—where the host and terms allow it. Pin the inference software, parameters and artifacts. Hardware/runtime changes can still affect numerical output, so use a validation suite and keep approved files fixed. Provider-specific hosted image APIs are optional separate adapters, not automatic replacements for our model.

### Reproducibility and provider failover policy

**Do not promise pixel-identical regeneration across providers.** The actual approved file is the source of truth for an existing asset. Prompts, seeds, or model names are not substitutes for preserving the generated binary.

- Keep approved image files immutable and content-addressed (SHA-256 or equivalent). Store the original generated file, actual output format/dimensions, alpha-validation report, and provenance record.
- Record provider, exact endpoint/model ID, model/version or revision when exposed, date, full request parameters, prompt/negative prompt, input/reference asset IDs and checksums, seed only when the exact endpoint supports one, and any returned structured prompt/workflow metadata. Mark fields unavailable when a hosted endpoint does not expose them; never fabricate a seed or model revision.
- Treat seeds as endpoint/model-specific controls. They can improve repeatability within a documented route, but they are not portable identifiers for the same output across different model families or providers. Even within one local pipeline, hardware, numerical precision, runtime/library versions and kernels may affect reproducibility.
- Do not perform automatic provider failover that silently regenerates an approved asset or overwrites its file. Failover can retry the same qualified endpoint under policy, but switching provider/model for asset creation creates a **new candidate version** that must be inspected and accepted separately.
- Maintain a canonical visual specification and a small reference pack for AstroCrown (palette, lighting, contrast, object treatment, negative space, transparency/edge expectations, and approved example assets). Pass reference images or structured conditioning only where the chosen route documents support and usage rights; these improve similarity but do not guarantee identical pixels.
- Compare provider outputs against acceptance criteria rather than requiring pixel equality across different models: intended object/shape, palette and brightness, composition-safe negative space, edge quality, real alpha, usable dimensions, and commercial/dependency rights.
- Prefer one qualified model/runtime per coherent asset batch when visual consistency matters. If a provider must change because of availability or cost, preserve existing assets and introduce the alternate provider through a versioned comparison/approval step.
- Internal composition should use the original approved assets and a versioned composition manifest. Layout changes must not invoke any generation provider. Reusing the same asset bytes and the same transformations is the way to retain exact consistency across provider changes.

### Visual/technical acceptance for the first asset

The first success is not a flattened homepage mockup. It is a useful, retrievable source asset whose required transparency is real and whose position/scale/rotation can be changed internally without calling the generator again. The initial demonstration should:
- inspect the output's actual alpha values and metadata;
- composite the same asset over at least a dark and a light background to expose fringes;
- use the same source asset in two materially different internal compositions;
- demonstrate that layout changes make zero inference calls;
- preserve a reproducible composition manifest and provenance record.

### Official references added for the transparency route

- LayerDiffuse official project and integration links: https://github.com/lllyasviel/LayerDiffuse
- LayerDiffuse Diffusers CLI README / current feature state: https://github.com/lllyasviel/LayerDiffuse_DiffusersCLI
- LayerDiffuse Diffusers CLI pinned requirements: https://raw.githubusercontent.com/lllyasviel/LayerDiffuse_DiffusersCLI/main/requirements.txt
- LayerDiffuse SDXL weights repository and `openrail` label: https://huggingface.co/lllyasviel/LayerDiffuse_Diffusers
- Transparent SDXL demo implementation (includes the model repo and BF16 VAE selection): https://raw.githubusercontent.com/lllyasviel/LayerDiffuse_DiffusersCLI/main/demo_sdxl_t2i.py
- The demo's RealVisXL model card and `openrail++` label: https://huggingface.co/SG161222/RealVisXL_V4.0
- NVIDIA GPU compute-capability/precision table: https://docs.nvidia.com/cuda/cuda-programming-guide/05-appendices/compute-capabilities.html
- Cloudflare GPT Image 1.5 model page: https://developers.cloudflare.com/ai/models/openai/gpt-image-1.5/
- Cloudflare GPT Image 2 model page (explicitly points to GPT Image 1.5 for transparent PNGs): https://developers.cloudflare.com/ai/models/openai/gpt-image-2/
- Cloudflare Workers AI pricing / free allocation: https://developers.cloudflare.com/workers-ai/platform/pricing/

## Capability routing: qualify exact endpoints, not provider brands

**Checked:** 2026-10-13. This is a capability and execution screen—not approval of a provider or proof of a working workflow. The present hard constraint remains $0 expenditure and no mandatory payment method.

The intended result is AstroCrown's own coherent image/video generator. It may use the existing configured provider credentials where a particular model and endpoint genuinely support the needed task; do not select or privilege an outside generator because a recognizable third-party brand was mentioned as an illustration. The target is our own visual identity and workflow, not adoption of someone else's product or style.

| Capability path | Evidence / required gate | Current routing decision |
|---|---|---|
| Cloudflare Workers AI direct image generation | Official documentation lists text-to-image models and a Workers AI Free allocation of 10,000 Neurons/day. Account-specific no-payment eligibility, exact model/hosted terms, quota behavior, live request, returned image, quality and provenance still require evidence. | **OPTIONAL ROUTE TO VERIFY** for an opaque base plate or other supported image task. This is not yet an approved transparency route; never activate paid billing to make a test pass. |
| Configured LLM APIs used as image-generator candidates | Evaluate each exact model ID and endpoint against official supported input/output modalities. Text generation can assist with prompt building, composition planning, metadata, checks and comparisons; vision input can analyze a supplied reference image. Neither proves the model returns newly generated image data. | **CAPABILITY GATE REQUIRED**. Accept as an image backend only when native image output is documented and tested on the current eligible account/plan. |
| Configured LLM APIs used as orchestration support | The existing provider roster can supply prompt refinement, planning, text processing and output-review assistance where its exact models support those operations under the free-tier limits. | **SUPPORTING ROLE**. Route these tasks only to qualified models; do not confuse this with image creation. |
| Image-generation model reached through a hosted provider | The exact hosted service's account entitlement, current no-payment route, model-specific terms, quota, output delivery, data handling and commercial-use conditions may differ from the upstream model's code/weights license. | **BLOCKED UNTIL END-TO-END EVIDENCE**. A model license or account key by itself does not qualify the route. |
| Video generation | No complete video path is currently evidenced as runnable under the user's $0/no-payment-method constraint. | **PARALLEL FEASIBILITY TRACK**. Keep video as part of the target unified generator; its missing runtime must not block image generation or homepage assets. Test a candidate only when a bounded hypothesis and changed condition make the test informative. |

### Routing and project-priority rules

1. Keep one AstroCrown-owned service/job interface for both image and video; implement modality-specific adapters and acceptance gates behind it.
2. The first concrete deliverable is a real, retrievable image candidate for the documented homepage background—not a provider survey, an HTTP 2xx, or an LLM-written prompt.
3. Pursue video viability in parallel when useful, but any video blocker applies only to the video path.
4. Record each asset's actual provider/model, generation route, terms evidence, relevant parameters and available provenance. The future removal of a credential does not clear restrictions on previous outputs.
5. Commercial use remains a gate for every retained production dependency and asset intended for publication. Unknown or conflicting rights mean BLOCKED for commercial promotion.


### Layer and alpha capability gate

Transparent output must be tested as a distinct output capability, not assumed from ordinary image generation. Generation and composition are separate: a model/provider creates an input asset, while the internal compositor owns placement and transforms. A provider's ability to accept multiple images and return a blended result is not evidence of independent layer output. For each candidate workflow, record:

- whether the exact model/endpoint natively returns an alpha channel or requires a post-processing stage;
- whether the actual returned and optimized file contains the expected alpha data;
- edge quality and preservation of wispy or partly transparent elements;
- whether the image composites cleanly over the AstroCrown background and a contrasting background;
- alpha preservation through required crop/resize/optimization/storage/browser delivery;
- component-specific commercial rights and asset provenance for every stage.

A qualified post-processing route may satisfy the layer requirement when native alpha is unavailable, but it must itself be licensed, technically tested and provenance-tracked. Do not classify a flat background or a visual checkerboard as a transparent output. Static transparent images and alpha video are separate capabilities: lack of an alpha-video route does not block the image workflow.

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

### Provider-neutral GPU execution candidates — checked 2026-10-14

- ByteDance SDXL-Lightning official model card and FP16 Diffusers example: https://huggingface.co/ByteDance/SDXL-Lightning
- SDXL-Lightning license file: https://huggingface.co/ByteDance/SDXL-Lightning/blob/main/LICENSE.md
- Stability AI SDXL base model card and terms: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
- Tongyi-MAI Z-Image-Turbo official model card: https://huggingface.co/Tongyi-MAI/Z-Image-Turbo
- Z-Image official project repository: https://github.com/Tongyi-MAI/Z-Image
- Kaggle GPU notebook usage guidance: https://www.kaggle.com/docs/efficient-gpu-usage
- Kaggle notebook GPU availability and session resources: https://www.kaggle.com/docs/notebooks
- Google Colab FAQ and free-tier resource/policy restrictions: https://research.google.com/colaboratory/faq.html
- Hugging Face ZeroGPU quota and operating model: https://huggingface.co/docs/hub/main/en/spaces-zerogpu

**Evidence interpretation:**

- SDXL-Lightning provides a documented FP16 Diffusers path, making it a plausible first bounded runtime test. Its `openrail++` license and SDXL base/dependency terms are not equivalent to unrestricted Apache-2.0 licensing; technical success cannot clear commercial rights.
- Z-Image-Turbo is a permissive-license alternative, not a proven runtime. The official card's 16 GB statement is a model-family/hardware claim, not evidence that a specific Kaggle GPU, precision, library build, or current notebook image will execute it successfully; the published quick-start uses `bfloat16`.
- Kaggle's published free GPU allocation is quota-limited and subject to demand; it can support a bounded interactive feasibility test, but it is not a durable production endpoint. The account's actual accelerator options, remaining quota, terms, and whether any payment-method registration is required must be verified in the account before a run.
- Google Colab is not a candidate for hosting AstroCrown's generator on its free managed runtime: its official FAQ prohibits non-interactive web-service/media-serving use and warns that content-generation web-UI use commonly causes termination. It may be considered only for a policy-compliant interactive experiment, not as persistent or guaranteed capacity.
- Hugging Face ZeroGPU documents 5 GPU-minutes/day for a free account. That is too small to treat as a material sustained-capacity foundation, although a small bounded demonstration may be useful if its other terms and model constraints fit.
- None of these published allocations counts toward the 86,400 GPU-minute monthly target until actual accessible, permitted GPU execution is measured. Do not multiply quotas by creating accounts or otherwise circumventing provider limits.

## 4. Important findings

### F-001 — A hosted API may be the least-complex route for an opaque base plate, but not automatically for transparent reusable elements

Cloudflare documents image endpoints and a daily free allocation for Workers AI. A hosted call remains an optional route for suitable tasks; the user's selected architecture requires a transparency-specific output contract for independently composable foreground assets. For any hosted test, the next meaningful evidence must come from the user's own logged-in Cloudflare account. No third-party credentials or paid fallback are needed to document the evaluation, but a real API test will require an appropriately scoped token and account identifier. Do not create or expose a token until the user verifies the dashboard state and explicitly authorizes the credential step.

### F-002 — The published SDXL $0.00 model-page label is not yet an end-to-end acceptance result

The SDXL pages are marked Beta and show $0.00 per step. That makes them candidates to check first; it does not prove this user's account can invoke them without upgrade/payment prompts, that quota is sufficient, or that the same conditions will remain available. Verify the exact model page and usage dashboard in the account. Record the actual displayed conditions rather than assuming.

### F-003 — FLUX.1 schnell's unit pricing and the account's daily free quota must be observed together

Cloudflare's main pricing table lists FLUX.1 schnell at 4.80 Neurons per 512×512 tile and 9.60 Neurons per step. The Free plan's 10,000-Neuron daily allocation resets at 00:00 UTC, and further operations fail after a Free limit is exceeded. The dashboard should therefore be checked for current usage and reset information before a test. Do not infer that the complete daily allowance can be dedicated to AstroCrown or estimate number of successful images without recording dimensions, steps, parameters and actual usage.

### F-004 — Video licensing can be technically compatible but operationally unsuitable

Wan2.2 is the clearest Apache-2.0 video license candidate in this first screen, but it still needs at least 24 GB VRAM on its documented 5B path. LTX-2.5's commercial permission is conditional on a community license/revenue threshold and has specific gated access terms; HunyuanVideo introduces downstream user terms, attribution/disclosure, territorial scope, and a restriction against improving other AI models with its outputs. These differences are material to a multi-model platform and must stay visible.

### F-005 — The workflow engine and each extension have separate licensing and security footprints

ComfyUI could simplify orchestration and make multi-model compositions easier, but its GPL-3.0 license, extensions' licenses, runtime security, and redistribution/deployment obligations need review. The engine does not grant permission to use its loaded model weights. Audit nodes and dependencies individually, pin versions, and keep the public application boundary behind AstroCrown-controlled job and authorization APIs.

### F-006 — The final constraint is a complete runnable path, not a list of downloadable models

**Historical baseline (initial review):** local hardware details and a GPU allocation were not yet verified. The account-specific diagnostic on 2026-10-15 now establishes that Kaggle exposed two Tesla T4 GPUs and CUDA was available in that notebook. It does not establish sustained allocation, the complete no-payment terms, or usable video capacity. There is still no evidence that Wan2.2, LTX-2.5, or any local video model can run persistently at $0 without mandatory payment registration. Cloudflare's documented image API does not establish free video compute. Avoid model downloads and avoid claiming an always-on GPU until a complete, permissible runtime is identified.


### F-007 — A plausible open-weight image candidate and free test environment now exist, but the pair is unqualified

The official ByteDance SDXL-Lightning model card documents a 4-step FP16 Diffusers route, while its license is `openrail++` and its SDXL base model/dependencies need separate review. The official Tongyi-MAI Z-Image-Turbo card labels its model repository Apache-2.0 and describes a 6B model that fits 16 GB VRAM, but its quick-start uses `bfloat16`; the observed Tesla T4 is compute capability 7.5 and does not list BF16 as a Tensor Core input type. This is a compatibility concern, not proof all BF16 tensor operations fail, so no run should assume compatibility. Kaggle's account page displayed 30 GPU-hours with zero used and a refresh allowed two T4 GPUs to be selected, but this is not durable production capacity or proof of all no-payment terms. These facts support only a bounded feasibility hypothesis, not a verified runnable or commercially cleared route.

Google Colab's free managed runtime is unsuitable as the generator's persistent web-serving foundation under its stated restrictions. Hugging Face ZeroGPU's documented 5-minute/day free quota is not material sustained capacity. These alternatives must not be counted as interchangeable capacity or treated as guaranteed allocations.

## 5. Current decisions

- Keep the service model-agnostic and modular.
- Treat approved image files as immutable source artifacts. Provider/model changes must not silently replace or regenerate an approved image; alternate-provider output is a separate version requiring acceptance.
- Generate reusable source assets separately from the final composition; use AstroCrown's internal composition system for placement, transformations, reusable layouts and exports. Do not spend inference calls on ordinary composition changes.
- Treat LayerDiffuse as the leading local transparency experiment and Cloudflare's documented GPT Image 1.5 route as a hosted technical reference only; both remain BLOCKED pending exact alpha tests, rights/dependencies, and $0/no-payment eligibility.
- Investigate the LayerDiffuse Diffusers CLI as the first local transparency-specific experiment for a single reusable asset, only after its older pinned dependencies can be isolated safely and the runtime/cost/legal gates pass. Do not run the earlier flattened SDXL-Lightning background test as the first experiment. Retain SDXL-Lightning and Z-Image-Turbo as separate alternatives with their own output, runtime and rights gates.
- Keep Cloudflare SDXL-Lightning / SDXL Base as optional candidates for an opaque base plate or another supported non-alpha task; do not use them as substitutes for a verified transparent-asset route.
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

### Existing credential context

Cloudflare Workers AI credentials were already configured in NOVA for a separately qualified LLM inference/health path (CLOUDFLARE_API_KEY_01 and CLOUDFLARE_ACCOUNT_ID). That history does **not** prove that an image-generation model is enabled for the account, supports the required output, has sufficient quota, is available without a payment method, or has terms suitable for the intended asset.

Do not restart credential setup from zero or create another token by default. First inspect the existing token's account and permissions, the current account plan/usage/reset information, and access to the exact candidate image endpoint. Do not expose credential values or copy secrets between repositories. Change or add a repository secret only if an identified repository-specific execution path requires it and the missing scope/secret is confirmed; do not enable paid billing or accept new terms as part of this audit.

### Next controlled qualification

1. Verify current $0/no-payment-method eligibility and exact terms for the selected execution environment and model; for the local track, inspect the actual Kaggle accelerator/quota and confirm no payment method is required before running anything.
2. Confirm the actual GPU architecture, VRAM, supported precision, disk capacity and session limit before downloading model weights.
3. Test the documented SDXL-Lightning FP16/runtime combination in a bounded notebook session only if the preflight passes; record GPU name, VRAM, software versions, peak memory, startup/download time, generation latency, output validity and quota consumption.
4. Keep Z-Image-Turbo as a separate Apache-2.0 model candidate, but do not assume its BF16 quick-start runs on the allocated GPU; test only if a compatible precision/runtime is documented.
5. Keep the Cloudflare hosted route as a separate optional comparison; do not confuse hosted inference with local model execution.
6. Confirm that the selected route returns generated image data and that the returned file can be retrieved and decoded.
7. Run one bounded request only after eligibility, permissions, and the intended-use gate are satisfied. Record the exact model/version, parameters, output checksum, evidence date, latency/resource/quota observations where exposed, and failures.
8. Keep the route BLOCKED for commercial promotion until every mandatory component and output-rights condition passes. Preserve a failed attempt as evidence; repeat a request only when it answers a new decision-relevant question.

No live request, credential modification, billing change, or provider promotion is authorized by this documentation alone.

## 8. Closure

This document revision is dated 2026-10-15. Candidate entries retain their own source/test evidence dates where available. Re-check upstream licenses, model cards, provider terms, model availability, account eligibility and hardware compatibility immediately before implementation. A candidate moves out of BLOCKED only when the missing evidence is supplied and the relevant verification is re-run.
