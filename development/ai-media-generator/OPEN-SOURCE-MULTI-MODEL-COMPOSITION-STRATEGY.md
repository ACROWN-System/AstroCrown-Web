# Open-Source, Multi-Model Image and Video Generation Strategy

**Date:** 2026-10-10  
**Status:** CANDIDATE ARCHITECTURE — recorded for review; not an implementation or model-selection approval  
**Owner subsystem:** `development/ai-media-generator/`  
**Related subsystems:** `development/gpu-infrastructure/`, `development/nova-ai-orchestration/`

## 1. Objective

Build an AstroCrown-owned image-and-video generation **service and workflow platform** by integrating and, where permitted and justified, adapting multiple existing generators, models, libraries, and processing tools. The platform should provide a coherent product and operational boundary while retaining the ability to replace any individual model, workflow engine, execution environment, or provider.

The goal is to obtain the strongest fit-for-purpose capability that the evidence supports under these hard constraints:

- $0 starting expenditure and no mandatory payment method.
- No silent paid route, subscription, metered fallback, or prepaid-credit assumption.
- Rights sufficient for the exact intended internal, commercial, redistribution, hosted-service, modification, and user-facing use.
- Verifiable end-to-end operation on actually available compute.
- Traceable quality, reliability, latency, capacity, license, privacy, and resource evidence.
- Minimal unnecessary mechanism and no avoidable provider lock-in.
- Reusable assets and capabilities for AstroCrown, NOVA, and appropriate Space Empire use.

This is not a proposal to train a new foundation model or to merge every available model into one large checkpoint. "Our own generator" means our own governed application/service, interfaces, workflows, policy, queue, provenance and user experience; it does **not** imply that AstroCrown owns the underlying models or automatically owns every generated output.

## Target architecture and execution order — unified image and video

The intended outcome is **one AstroCrown-owned image-and-video generator**, with common service/job interfaces, shared brand direction and provenance, and replaceable task-specific adapters. The image-first execution order is a delivery strategy, not a narrower product ambition: it obtains a real homepage asset early, while video viability is investigated in parallel and cannot block the image path.

### First executable slice: image

Use the least complex route that can prove a real image request and retrieval under the $0/no-payment-method constraint and with commercially suitable rights for the intended background asset. Keep the exact model/provider, terms, parameters, output, provenance, observable resource use, quality review, and errors. LLM text or vision capabilities can help with prompt creation, composition planning, image analysis and evaluation; they are not a substitute for an endpoint that actually returns generated images.

### Video remains in scope, with independent acceptance

Continue a bounded video feasibility track without requiring it to finish before the image workflow. It should use the same AstroCrown-owned service boundary and visual rules, but its own adapter, model/dependency rights, runtime/hardware, memory, temporal quality, latency, output length, and capacity gates. If no suitable free video execution path is available, record video as BLOCKED and continue image generation and reusable asset work rather than blocking the whole system. Re-test when a concrete changed condition or candidate makes a new attempt informative.

### Brand uniformity and commercial readiness

Build an owned AstroCrown visual grammar: curated references, composition and lighting conventions, palette, reusable background/object layers, repeatable generation/processing presets, and project-specific output review. Start from the deep-space and homepage layer requirements in `development/index-section/BACKGROUND.md`. The recognizable vendor styles discussed in conversation were examples explaining the objective of visual consistency; they are not desired provider selections or brands to imitate.

Commercial suitability is required for the final retained stack and every asset intended for commercial publication. Verify the software, exact weights, dependencies/extensions, hosted endpoint conditions, and asset-creation path separately. Temporary development routes may be used within their terms, but removing credentials later does not remove restrictions on outputs already produced. Keep unresolved assets BLOCKED for commercial promotion until cleared or regenerated through a qualified route.

### Execution order

Image proof → foundational homepage background → reusable brand layers and consistent workflows; pursue video feasibility in parallel → integrate a qualified video backend when its own gates pass → harden and expand the unified service for broader commercial usage.


## Layer-aware output and real transparency

The shared workflow shall distinguish an opaque environment/background from independent foreground layers. Where the composition requires an element to move, fade, scale, or be reused independently, the output contract must allow genuine alpha transparency.

Do not assume every image model or endpoint supports native transparent output. Qualify the exact capability. If needed, use a separate licensed and compatible segmentation/matting/background-removal step; track the transformation and retain the original plus derived asset. Reject a simulated checkerboard/black/white background as proof of an alpha channel.

Verify real alpha, edge quality, translucent effects, absence of visible halos/matte fringes, and compositing on both the AstroCrown deep-space background and a contrasting test background. Ensure that alpha survives asset optimization and delivery. Use PNG as a baseline transparent working master for static assets, then test any WebP/AVIF distribution conversion. Transparent video may be added through a separately qualified codec/container/player path, but must not block static transparent layers, ordinary video research, or the first opaque homepage background.


## 2. Integration-first principle

Do not assume a single model or application is best for every media task. Evaluate a portfolio of compatible capabilities and make them available through one stable AstroCrown media-service boundary.

The platform may combine tools in several distinct ways:

1. **Model routing:** choose a qualified model suitable for the actual task and current constraints.
2. **Workflow composition:** pass an output through an appropriate next stage—for example generation, controlled editing, transparency/masking, upscaling, frame interpolation, encoding, or validation.
3. **Parallel alternatives:** generate independent candidates only when the additional quality or choice justifies the extra compute and latency.
4. **Specialized components:** use permitted encoders, VAEs, LoRAs, ControlNets, adapters, segmenters, upscalers, interpolation tools, and other components where compatibility and license evidence pass.
5. **Permitted modification:** patch/fork software, change workflows, configure inference, quantize, fine-tune, or train adapters only when the chosen license/terms and available compute permit the operation.
6. **Qualified substitution:** route around a failed/unavailable backend only to an already qualified compatible candidate.

These approaches are not interchangeable. Combining separate models in a workflow is not the same as merging their weights, and model-weight merging is not assumed to improve quality. Weight merging, distillation, training, and fine-tuning must each have a specific hypothesis, compatible technical method, permission review, measurable acceptance criteria, and available compute before they are attempted.

Do not run every model on every request by default. Orchestration should be task-aware and should account for quality needs, compute availability, queue age, measured latency, quota headroom, and failure state. More stages can reduce throughput or degrade quality as well as improve it.

## 3. Candidate technical architecture

Keep application ownership and external dependencies separate.

### 3.1 AstroCrown-owned service boundary

The media generator owns:

- stable internal request and result schemas;
- supported media tasks and workflow presets;
- the canonical generation-job lifecycle and artifact/result handling;
- media-specific routing among already-qualified compatible workflows;
- prompt/reference-input handling, output validation, provenance, and promotion evidence;
- bounded retry, cancellation, and duplicate-submission protection where supported;
- media-job status and operational observations.

The media service must enforce caller and feature authorization at its boundary using the authoritative application/access-policy decision. It must not create a second account-eligibility policy or a separate waiting-list registry. Public feature eligibility and waiting-list ownership remain a future application-scope decision; do not create another subsystem or database before that feature is actually scoped.

This layer should not require application code to know the specific GPU vendor, provider API, model checkpoint format, or workflow-engine details.

### 3.2 Replaceable adapters and workflow engine(s)

Keep adapters between the service and every external engine/API. A node-graph system may be a useful composition engine, but it is not automatically the product architecture or the required sole execution path.

For example, ComfyUI documents a graph/node-based engine and workflows spanning multiple image and video families. Its core repository is GPL-3.0 licensed, so its modification and distribution obligations must be assessed against the intended deployment and any custom nodes/plugins before adoption. The fact that it is open source and supports many models is not, by itself, an approval.

Sources:
- https://github.com/comfy-org/ComfyUI
- https://github.com/comfy-org/ComfyUI/blob/master/LICENSE
- https://docs.comfy.org/essentials/core-concepts/links

Other candidates may include model-specific libraries, direct inference APIs, diffusion libraries, or small task-specific workers. Compare only candidates that satisfy the same task and mandatory requirements; do not commit to a single engine without the evidence.

### 3.3 Model and processing registry

Track candidates at exact version/checkpoint granularity and assign each one a permitted task scope, such as:

- text-to-image;
- image-to-image and controlled editing;
- reference-guided or composition-controlled generation;
- inpainting/outpainting, masking and transparency;
- image upscaling and restoration;
- text-to-video;
- image-to-video;
- video transformation or extension;
- frame interpolation, enhancement and encoding.

A single model may serve several tasks, but this must be evidenced per use rather than assumed. Video remains a distinct workload from image generation and requires its own runtime, memory, duration, quality, latency, storage/transfer and cost/capacity tests.

### 3.4 Shared GPU infrastructure

Compute-provider integration, credentials/configuration, runtime deployment, GPU memory/availability, concurrency, cold-start behaviour, outages, and capacity telemetry belong in `development/gpu-infrastructure/`.

Do not confuse "open weights" with "free compute". Self-hosted inference still requires accessible hardware, power, memory, storage and operational time. A free hosted endpoint may have request, quota, concurrency, model-availability, account-eligibility or payment-method conditions. Verify the route actually available to this account and do not rely on a published headline quota as proof of execution capacity.

### 3.5 NOVA integration

NOVA orchestration may understand user intent, ask for missing task details when required, select a qualified workflow, request generation, compare returned evidence, and communicate the job state. It calls the media service through a defined interface; it does not own a second media-job queue or directly depend on a specific GPU provider.

### 3.6 Responsibility ownership and minimal implementation

| Responsibility | Canonical owner / rule |
|---|---|
| Homepage visual requirements, layer roles, and alpha acceptance | [BACKGROUND.md](../index-section/BACKGROUND.md) |
| Exact model, endpoint, licensing, and workflow qualification evidence | [Candidate register](IMAGE-VIDEO-COMPONENT-CANDIDATE-REGISTER.md) plus dated test evidence |
| Media request/result contract, generation-job lifecycle, artifacts, provenance, and media-specific routing | This media-generator service |
| Provider credentials, runtime environments, provider health, and compute observations | [Shared GPU infrastructure](../gpu-infrastructure/README.md); NOVA evidence may be consumed through an explicit compatible contract |
| Cross-provider aggregate GPU-capacity accounting | [NOVA/gpu_capacity.py](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/gpu_capacity.py) where relevant; it is currently intended for non-commercial R&D and must not be presented as commercial capacity or live per-job availability |
| Request interpretation and orchestration | [NOVA AI orchestration](../nova-ai-orchestration/README.md); invoke the media service rather than duplicating its queue or provider transport |
| Public feature eligibility and waiting-list policy | Future application/access-policy boundary, to be decided when a public feature is scoped; no new subsystem or database is justified for the first internal proof |

Do not copy NOVA's aggregate capacity calculator or provider-health probes into this repository. Share a schema/report or an explicit API contract when compatible evidence is available; the current subsystem documentation alone does not prove that a reusable executable cross-repository API exists.

**Minimum first implementation:** one eligible image endpoint, one thin image adapter, request/response and file validation, retrieval of the actual image bytes, safe error classification, a small provenance manifest, deterministic positive/negative tests, and one bounded live integration test. Capture measured latency/resource/quota information only when the route exposes it; mark unavailable evidence as unknown/not exposed. Keep the first proof internal and synchronous unless the chosen endpoint requires asynchronous execution. Do not pre-build a public waiting list, persistent multi-user queue, general-purpose registry, multi-model router, or database unless a demonstrated requirement needs it. Add a second model or processing stage only after a baseline exists and a representative test shows why the extra mechanism is necessary.

## 4. License and permissions gate — each component, not just each model

Before qualifying a workflow, audit every material dependency and version used in the workflow. These may include application/library code, a workflow engine, custom nodes/plugins, model weights/checkpoints, text encoders, tokenizers, VAEs, LoRAs/adapters/ControlNets, upscalers, training/fine-tuning scripts, datasets, reference assets, post-processors, and hosted API terms.

For each dependency, record evidence for the criteria that apply:

- exact name, upstream source, version/revision and file/checkpoint hash where practical;
- source-code license and model/weight license separately;
- whether the relevant text permits commercial use and the intended hosted/user-facing service;
- modification, fine-tuning, derivative, and redistribution rights;
- required attribution, notices, source offers, model cards, acceptable-use terms or downstream-user restrictions;
- dependency/license compatibility when components are combined or redistributed;
- limits related to revenue, user category, use case, territory, scale, or provider account;
- relevant patent, trademark, privacy, personality/likeness, dataset and output restrictions or unresolved risks;
- security, provenance, update and vulnerability status where applicable;
- the applicable version of third-party terms for a hosted inference provider.

A repository being public, a model being described as open source/open weight, an API being reachable, or an output being generated successfully is not enough to pass this gate. Do not treat a model license as automatically covering the hosting provider, all dependencies, training data, or output ownership.

If the applicable rights are unclear, contradictory, non-commercial only, or insufficient for the intended use, mark the candidate **BLOCKED** or **FAIL** and do not use it in that workflow. Preserve the evidence and alternative candidates instead of assuming permission.

The first internal proof should use non-sensitive prompts/reference content. Before public access, separately verify retention, deletion, privacy notices, user content rights, abuse safeguards, user-facing terms and relevant restrictions.

## 5. Candidate qualification and evidence

Use `development/audit/templates/CANDIDATE-EVALUATION.md` and the repository's `PASS / FAIL / N/A / BLOCKED` statuses. Do not use aggregate scores or popularity rankings to bypass mandatory requirements.

Per component or complete workflow, record at least:

- intended task and acceptance criteria;
- exact version and required supporting dependencies;
- license/terms evidence and permitted scope;
- supported runtime and actual hardware/provider requirements;
- memory/storage requirements and startup/download behaviour where measurable;
- reproducible request/workflow and result retrieval;
- test output, sample artifact(s), parameters and provenance;
- latency, failures, quality observations, resource/quota consumption and limitations;
- security, privacy and content-safety findings appropriate to the use;
- status, unresolved dependencies and next re-test.

A workflow is eligible for implementation only when all mandatory criteria PASS or a documented N/A applies. Any mandatory FAIL rejects that candidate for the intended use; any mandatory BLOCKED prevents acceptance.

## 6. Optimization strategy

Seek the best result through measured, reversible experiments rather than assuming the most complex pipeline is best.

Potential experiments—only when a baseline identifies a real need—include model quantization, offloading, batching, cache reuse, alternate samplers/schedulers, permitted adapters/LoRAs, controlled reference inputs, resolution strategies, staged upscaling, image conditioning, frame interpolation, and workflow simplification. Each experiment should identify the baseline, hypothesis, representative test set, expected benefit, costs/resource effects, and regression conditions.

Where it adds meaningful value, compare:
- one qualified model against a two-stage workflow;
- quality with and without an optional enhancement stage;
- a local/open-weight route against a no-payment hosted route;
- a specialized image or video model against a general model;
- one model call against parallel candidate generation.

Do not promote an improvement merely because it looks better on one example. Consider consistency across representative tasks, artifacts, model failures, total latency, compute consumption, queue impact, and rights. Do not trade away a mandatory constraint for a better-looking output.

## 7. Rollout under $0/no-payment constraints

1. **Discovery and permissions audit:** identify plausible software/model/workflow candidates, exact licenses/terms and hardware requirements. Do not install the entire ecosystem or download multiple large checkpoints before the shortlist is justified.
2. **One end-to-end image proof:** select only a candidate that can pass mandatory rights and cost/account gates; request and retrieve one non-sensitive internal image with provenance and measured results.
3. **Multi-model experiment:** add a second qualified candidate or workflow stage only after a working baseline exists and there is a testable reason to add it. Record whether the combination improves a defined outcome.
4. **Internal AstroCrown production:** apply qualified image workflows to approved background and reusable-brand-asset tasks, with review before promotion.
5. **Video feasibility:** evaluate an exact video-capable model and its component licenses separately; measure actual clip duration, resolution, generation time, memory, failure modes, storage and available compute.
6. **Controlled public feature:** build only after the corresponding image or video gates pass, including access control, privacy, abuse protection, job queue reliability, honest status information and measured capacity limits.

Parallel research may happen where useful, but public rollout remains gated by task-specific evidence. If no candidate passes the hard requirements, record BLOCKED and continue research; do not silently switch to paid compute or relax the licensing constraints.

## 8. Ownership and asset rights

Distinguish:

- ownership and license of AstroCrown's application/workflow code;
- rights to run, modify, fine-tune, redistribute or offer access to each upstream component;
- license/terms of the complete deployed combination;
- user-provided inputs and reference media;
- legal rights and restrictions for generated outputs;
- users' responsibility and AstroCrown's responsibilities for publicly generated content.

Do not promise exclusive ownership, copyright protection, trademark availability, or unrestricted commercial use for every output based only on the model license. For token-logo concepts, preserve human review and validate exact text, dimensions and export content deterministically.

## 9. Boundaries and non-goals

This strategy does not approve ComfyUI or any other workflow engine; any model/checkpoint, GPU provider or API; weight merging, fine-tuning, dataset collection or training; a fixed public launch date; a fixed free quota; public access; or a paid route.

Do not:
- train a foundation model from scratch as the first step;
- merge weights without a compatible method, rights review, baseline and evidence;
- download or run models whose license does not meet the intended use;
- accept terms or enable payment on the user's behalf;
- expose secrets or sensitive reference files in logs or public artifacts;
- advertise unlimited, instant, fully private or commercially unrestricted generation without evidence.

## 10. Immediate next step

Continue the read-only candidate audit. First build a small, source-backed compatibility/permissions register for likely image and video components and the workflow engines that could compose them. Prioritize candidates against mandatory criteria—license and intended use, $0/no-payment execution, actual compute feasibility, output suitability, and replaceable integration. Preserve blocked candidates and rejected alternatives with the reason.

Do not begin a broad multi-model installation. After the account-level no-payment constraint and rights checks are verified, establish one working image baseline, then prove the value of a second model or stage before adding it to the active path.

## 11. Impact analysis

**IF adopted:** the platform can combine specialized capabilities without locking AstroCrown to one generator, while retaining auditable rights, reproducibility, replaceable adapters, resource-aware workflows, and a phased path from internal assets to user-facing image and video features.

**IF not adopted:** separate generators may accumulate without a coherent interface, model and component permissions may be overlooked, merging may be attempted without technical evidence, and feature commitments may exceed verified licensing or compute capacity.

## 12. Decision status

**Recorded direction:** investigate and, where evidence permits, integrate multiple licensed image/video generators and reusable components behind one AstroCrown-owned service; modify or combine components only where technically and legally permitted; choose workflows by task and measured evidence; preserve the $0/no-payment constraint.

**Not yet decided:** exact workflow engine, image/video models, component portfolio, hardware/execution route, workflow-composition policy, and any weight merge/fine-tuning plan. Those choices remain candidates until evaluated and tested.


## 13. Priority clarification — homepage backgrounds versus token logos (2026-10-15)

The product has at least two materially different image-generation tasks and they must not be treated as one acceptance profile.

### Homepage background — no longer blocks the homepage

The user has an existing background candidate for the current AstroCrown website. Use that candidate and continue the website path rather than delaying the homepage for another model experiment. The Cloudflare Workers AI `@cf/bytedance/stable-diffusion-xl-lightning` route passed request/container/artifact handling in controlled manual tests but failed visual acceptance across three recent prompt iterations: vivid nebula distractions persisted in two square samples, and a 512×288 sample returned pale panel-like geometry and vivid blue features. Preserve those artifacts as diagnostic evidence and do not repeat near-identical prompt requests. This is rejection of the tested route for that task, not a claim that every image model is unsuitable.

### Token-logo generation — remains a required downstream feature

The AI Token Generator still requires a qualified route to create token logos. Its requirements differ from a background plate:

- Square output, with source resolution sufficient for normal token/avatar displays; the final target resolution must be chosen from the product UI requirements rather than inferred from the failed background test.
- True alpha transparency when the logo must be independently displayed/composited over multiple backgrounds. A visual checkerboard or an opaque image does not qualify.
- Strong silhouette, clear visual hierarchy, recognizable shapes and legibility after reduction to 32px/64px/128px; avoid relying on small text in the mark unless explicitly required.
- The saved asset and provenance must be stable. Regeneration/provider switching creates a new candidate; it must never silently replace an accepted logo.
- Evaluate content/right restrictions, data handling, output format, cost, no-card eligibility and API terms for the exact model/service. Transparent-output support in an API schema is not proof the returned bytes contain a valid alpha channel or that outputs are cleared for the intended commercial use.

### $0-stage decision and paid-later option

Do not develop a custom foundation model or continue the unsuccessful background prompt loop as a prerequisite. Keep the model/provider boundary replaceable, and qualify one narrowly scoped token-logo path when a verified no-cost route exists or a small budget is explicitly authorized.

**OpenRouter Unified Image API** is a researched candidate for the later paid path, not an approved provider or current free route. OpenRouter documents a single Images API for a changing catalogue of 30+ image models; its `openai/gpt-image-1` listing advertises 1:1 output, reference-image input and transparent-background support. OpenRouter's image-generation guide currently says no image-generation model is included in its `:free` tier, and low-cost image routes start around one cent per image. Its FAQ states it accepts cryptocurrency payments in USDC. Therefore it does not meet the current requirement for actual free image inference, but may be evaluated later after explicitly budgeting a small bounded logo-quality test. Verify current per-model pricing, exact endpoint parameter support, service/model terms, data policy, and actual output alpha before implementation. Do not silently activate paid billing or trigger requests during this research.

Official references (checked 2026-10-15):
- OpenRouter Unified Image API: https://openrouter.ai/blog/announcements/image-api/
- OpenRouter GPT Image 1 model page (transparent background, square aspect ratio, references and current model pricing): https://openrouter.ai/openai/gpt-image-1
- OpenRouter image-model cost/free-tier guide: https://openrouter.ai/blog/tutorials/image-generation-models/
- OpenRouter payment FAQ: https://openrouter.ai/faq

**Interim fallback:** an internally generated, constrained SVG/logo template can give users a deterministic vector mark at $0 while a qualified image API is unavailable. This is a separate product mode, not a substitute claim for AI image generation. If an LLM helps produce a design specification, use a restricted schema and trusted renderer/sanitizer instead of executing model-authored arbitrary SVG or script. Label and evaluate the fallback honestly.

### Revised execution priority

1. Finish the homepage using the existing background candidate.
2. Keep video and broad generator expansion out of the homepage critical path.
3. Preserve token-logo generation as a required AI Token Generator capability; research free API eligibility and design its acceptance suite without making live requests or adding billing.
4. If no legitimate $0 image API can pass transparency, quality, rights and access gates, provide a clearly identified SVG-based fallback or defer the AI-generated-logo subfeature until an explicitly approved budget exists.
5. Implement an external-provider adapter only after a bounded candidate wins the logo-specific evaluation.

**Impact Analysis**

- **IF adopted:** the homepage proceeds independently, and the token-logo requirement remains visible instead of being lost inside the broader generator deferral. Free inference is not assumed; future use of a crypto-funded API remains a separately gated option.
- **IF not adopted:** the project could either continue wasting time on a background model that has failed acceptance or incorrectly drop an image-generation capability required by the AI Token Generator.

No live generation request, credential mutation, billing change, or model selection approval is made by this priority adjustment.
