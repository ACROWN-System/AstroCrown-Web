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
- supported tasks and workflow presets;
- user/feature eligibility and generation-job lifecycle;
- task-specific routing policy;
- prompt and reference-input handling;
- retry, cancellation, duplicate-submission protection, and result retrieval where supported;
- output validation and promotion into approved asset collections;
- provenance, artifact identifiers and checksums;
- model/workflow qualification status;
- user-facing error/status information and operational observations.

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

NOVA orchestration may understand user intent, ask for missing task details when required, select a qualified workflow, request generation, compare returned evidence, and communicate the job state. It should call the media service through a defined interface instead of owning media queues or depending directly on a particular GPU provider.

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
