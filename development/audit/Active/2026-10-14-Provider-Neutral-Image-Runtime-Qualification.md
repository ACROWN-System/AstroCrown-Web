# Active Audit Plan — Provider-Neutral Image Runtime Qualification

**Date:** 2026-10-14  
**Status:** ACTIVE — Kaggle GPU runtime preflight passed; transparent-asset generation, commercial rights, and no-cost/no-payment eligibility remain gated  
**Objective:** Qualify a provider-neutral route to generate individual reusable image assets with genuine transparency where required, then compose and transform them inside AstroCrown without repeated inference calls. Preserve the $0/no-payment-method constraint and keep commercial rights and complete route evidence explicit.

## Scope and source of truth

**Repository:** `ACROWN-System/AstroCrown-Web`  
**Base revision:** `583da2598bfd4f72bb306277c021264b4473301e`  
**Related subsystem:** `development/ai-media-generator/` and `development/gpu-infrastructure/`  
**Cross-repository dependency:** `ACROWN-System/NOVA` for secret-safe orchestration and existing Cloudflare qualification workflow.

Use the current default-branch candidate register, multi-model composition strategy, homepage background requirements, development/audit convention, and fact-observation governance as project sources of truth. Use current official model cards, model/code licenses, provider terms/pricing, GPU service terms and maintained runtime documentation for external facts. Keep dated findings, source URLs, exact versions, limitations and PASS / FAIL / N/A / BLOCKED states.

The requested `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not found in either active repository during prior inspection. This plan follows the existing `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` and active-plan pattern; it does not claim to follow absent files.

## User constraints and preservation

- $0 expenditure; no mandatory payment method; no paid fallback, credits, subscription or billing activation.
- One combined monthly GPU target of 86,400 minutes across all qualifying providers, not a single-provider target. Treat this as a target, not achieved or guaranteed capacity.
- Provider-neutral interfaces; Cloudflare remains an optional hosted adapter and must not become the foundational assumption for GPU execution.
- First qualify image generation; investigate video separately in parallel without blocking image work.
- First intended visual target: a restrained deep-navy space background with sparse stars and a subdued blue-violet nebula. Cards must avoid excessive brightness/saturation. User file/image sharing is temporarily capped, so do not request additional uploads during the restriction window.
- Real transparent layers are required for compositing where appropriate; JPEG cannot supply alpha. Validate real alpha through output and delivery, not visual appearance alone.
- User-selected architecture (2026-10-15): the generation provider creates source assets only; AstroCrown's internal compositor owns placement, scale, rotation, opacity, layering and alternate compositions. Routine composition changes must not trigger new inference calls. A full-canvas base plate may be opaque; reusable overlapping elements need verified alpha.
- Do not expose or duplicate secrets, trigger live inference, modify account billing, accept new terms, download large model weights, or dispatch a live workflow unless the relevant existing authorization and prerequisites are confirmed.
- Preserve existing evidence, source files, and backups. No production website or provider roster changes under this research plan.

## Questions to resolve

1. Which exact image model/runtime combinations have documented rights compatible with intended AstroCrown commercial use?
2. Which execution environments can be accessed without a payment method and offer an explicitly free-only/fail-closed path?
3. What GPU memory, software/runtime, model downloads, startup time, generation latency, session duration, persistence, concurrency, queue and quota constraints are documented or actually measured?
4. Which route offers a real, retrievable and decodable image with useful quality for the specified background, and what evidence remains required?
5. Which exact route can create independently reusable assets with true alpha and compatible rights, and can internal composition reuse them without new inference calls?
6. How can qualifying provider capacity be accumulated across independent providers without counting idle, inaccessible, metered, non-GPU or unverified minutes toward the 86,400-minute target?

## Method

1. Inspect existing implementation, tests, candidate records, recent incident evidence, and provider adapters before proposing a new component.
2. Research a bounded shortlist of exact candidates from authoritative sources; do not perform a broad install or collect candidates by popularity.
3. For every candidate, separately assess model/license rights, runtime/dependency licenses, service/account eligibility, no-payment behavior, hardware fit, modality/output capability, privacy, and operational limits.
4. Classify documentary claims separately from observed account behavior and live execution. Do not treat open weights, an HTTP success, a free listing, or an offline test as proof of a complete runnable route.
5. Use a small deterministic local/offline test first. Run live requests only after the existing authorized workflow's prerequisites are confirmed; use one bounded, non-sensitive request per decision and preserve sanitized evidence.
6. Record failure causes and uncertainty; repeat only when a changed condition makes the test informative.
7. Recommend one baseline route or explicitly leave it BLOCKED. Add more models or workflow stages only when a baseline exists and a testable requirement justifies the added complexity.

## Acceptance criteria

- Candidate records identify exact model/runtime/version, official source and access date, relevant license/terms, intended-use restrictions, no-card/payment status, hardware/memory requirements, modality and output contract, dependency obligations, known failure modes, and evidence gaps.
- No candidate is called commercially qualified or operational until all mandatory gates pass for the intended use.
- Image output is retrievable and independently decoded/inspected; dimensions, file format, provenance and checksum are recorded.
- Visual acceptance includes a low-distraction deep-space base plate, independently reusable elements, readable UI negative space, output repeatability and a separate test for true alpha where required.
- Demonstrate the same source asset in at least two materially different internal compositions; verify position/scale/rotation changes do not call a generator.
- Keep source assets plus a structured composition manifest; flattened exports are derived outputs, not the sole stored artifact.
- GPU-capacity accounting distinguishes measured usable GPU time from provider listings, queue time, cold start, idle time, or assumed availability.
- Existing Cloudflare behavior is preserved as optional evidence; no automatic paid route, secret change, billing change, or unapproved live dispatch occurs.
- Findings and any future implementation have traceable evidence, tests, limitations and a reviewable pull request.

## Impact Analysis

**IF modified:** the project can choose an image runtime using evidence about legal suitability, actual access, compute feasibility and visual output rather than assumptions; later capacity can be aggregated across qualified providers.

**IF not modified:** model availability may be confused with executable capacity, commercial terms may be overlooked, and development may continue to depend on a hosted endpoint that does not meet the intended self-hosted/provider-neutral objective.

## Research checkpoint — 2026-10-14

### Documented candidate facts

- **SDXL-Lightning:** the publisher's model card identifies the model as `openrail++`, describes 1024px generation in a few steps, and provides a documented Diffusers route using FP16 for a 4-step UNet plus the SDXL base. This makes it a practical technical-feasibility candidate, but not an unrestricted open-source license conclusion; the model, SDXL base, dependencies and intended use need separate rights review.
  - Sources: https://huggingface.co/ByteDance/SDXL-Lightning and https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
- **Z-Image-Turbo:** the publisher's model card identifies the repository as Apache-2.0, describes a 6B-parameter model, 8 NFEs for Turbo, and states that it fits 16 GB consumer GPUs. The documented quick-start uses `bfloat16`; compatibility with the GPU actually allocated by a free notebook service is unknown.
  - Source: https://huggingface.co/Tongyi-MAI/Z-Image-Turbo
- **Kaggle Notebooks:** official docs describe free GPU notebook access and a quota generally up to 30 GPU-hours/week, sometimes higher depending on demand/resources. This may support a bounded interactive batch-generation test, not a persistent public service. The user's actual accelerator availability, remaining quota, payment-method requirements and session constraints are unknown.
  - Sources: https://www.kaggle.com/docs/efficient-gpu-usage and https://www.kaggle.com/docs/notebooks
- **Google Colab:** its official FAQ states that free resources are not guaranteed and explicitly restricts non-interactive web-service/media-serving use; it notes content-generation web-UI use on free managed runtimes commonly leads to termination. Do not treat it as the persistent generator backend. It may be considered only for policy-compliant interactive experiments.
  - Source: https://research.google.com/colaboratory/faq.html
- **Hugging Face ZeroGPU:** official documentation lists a free-account daily GPU quota of 5 minutes. This is not a material foundation for sustained capacity.
  - Source: https://huggingface.co/docs/hub/main/en/spaces-zerogpu

### Capacity interpretation

A published 30 GPU-hours/week allocation corresponds to roughly 7,800 GPU-minutes per average month for one account if fully available and used. This is less than one tenth of the 86,400 GPU-minute monthly project target, and the allocation is variable rather than guaranteed. Do not multiply quotas by creating accounts or circumventing provider limits. Only actual, permitted, usable GPU execution counts toward the target.

### Decision

At the time of the initial 2026-10-14 plan, the account-level GPU allocation was unknown, so live model execution remained blocked. That checkpoint is superseded by the observed notebook diagnostics recorded below: two Tesla T4s and working CUDA are now established. However, this does not establish the provider's complete $0/no-payment terms, long-term availability, or suitability as production capacity. No model weights have been downloaded, no image generation has run, no billing was changed, and no secrets were accessed.

## Observed Kaggle preflight and architecture update — 2026-10-15

### Observed account/runtime facts

- The user reports that after refreshing Kaggle, the Accelerator GPU option became selectable; they selected it and accepted the displayed continuation prompt for GPU usage.
- The user's Kaggle account page displayed **Kaggle GPU 00:00 / 30 hrs**. This is an account UI observation, not proof of guaranteed availability or durable production capacity. The exact pop-up wording and complete free/no-payment terms have not been independently verified in this record.
- `nvidia-smi` reported NVIDIA driver 580.178.04, CUDA 13.0, and **two Tesla T4 GPUs**, each with 15,360 MiB displayed total memory and 0 MiB used at the check.
- PyTorch reports version `2.11.0+cu128`, `torch.cuda.is_available() == True`, two devices named Tesla T4, and 14.56 GiB reported total memory for GPU 0. The GPU memories remain separate; do not assume 30 GiB unified memory.
- Hugging Face connectivity test returned HTTP 200.
- Installed packages: Diffusers 0.40.0, Transformers 5.16.1, Accelerate 1.14.0, huggingface-hub 1.29.0, safetensors 0.8.0. Required imports passed.
- No model weights were downloaded and no model inference/image-generation cell was run. The planned flattened SDXL-Lightning background test was stopped before execution when the user clarified the required asset architecture. No GPU inference usage is established from this test record.

### Graceful traffic growth and transition requirements — 2026-10-15

The user's stated product objective is to avoid the common "success disaster": traffic increases, capacity cannot keep up, and users experience crashes or a noticeable drop in capability. The target is a smooth, low-disruption transition, while recognizing that the $0 budget cannot guarantee unlimited demand or an always-available GPU.

#### User-facing continuity
- Keep core AstroCrown browsing, stored assets, saved compositions and delivery of already-generated files available independently from the live GPU/model backend.
- Separate the website's short request path from generation work via a provider-neutral asynchronous job API with a stable job ID and persisted job/result state.
- Provide explicit accepted/queued/running/succeeded/retrying/paused-for-capacity/failed states. Do not pretend work is complete and do not promise precise ETAs until latency data supports them.
- Use a bounded queue, concurrency cap and admission controls based on actual measurements and published tier terms. A queue buffers bursts but does not create compute. When the cap is reached, clearly pause/reject new jobs or restrict admission rather than building an unbounded backlog.
- Persist approved outputs and composition manifests; reloading or repositioning a saved image should require no new inference call.

#### Provider and worker behavior
- Use idempotency keys and safe persisted state so client retries, restarts or duplicate queue delivery do not cause duplicate generation, billing, or file overwrite. Queues with at-least-once delivery need explicit deduplication where repeated work would be harmful.
- Add circuit breakers and bounded exponential backoff with jitter. Retry transient throttling/service-unavailable errors where allowed; classify invalid request, missing model, permission and billing failures as actionable/terminal rather than retrying them indefinitely. Failed work must remain visible and recoverable.
- Fail over only to an already qualified route that provides the same capability and quality floor under authorized terms. Do not silently replace transparent output with opaque output or move a paid request to an unqualified cheaper model.
- Treat migration of the same pinned model to another qualified GPU host separately from changing the image-generation model. Use a bounded canary and gradually widen traffic only as quality, error, memory and latency evidence remains acceptable. Avoid duplicate "shadow" inference when credits are scarce unless it is separately authorized and budgeted.
- Keep a rollback path and preserve the prior qualified route/artifact library until the replacement has passed the defined evidence window. Under $0 constraints, do not assume a warm standby, unlimited quota or no cold starts.

#### Proactive signals and test plan
Observe generation success and errors, p50/p95 latency, queue depth/oldest age, provider 429/5xx patterns, retries, cold-start time, usable remaining quota, memory failures, and how much capacity the minimum migration suite requires. Set numeric alert thresholds only after a baseline is observed. Begin transition work before projected usable capacity falls below test budget plus a recovery reserve.

Before paid rollout, exercise offline/mock cases for provider outage, quota exhaustion, slow or lost GPU session, full queue, duplicate delivery, worker restart, idempotent storage, unavailable fallback and rollback. Mock tests validate orchestration but do not establish image quality. Keep the predeclared live task-specific quality suite mandatory. If free resources cannot finish it, mark the target **BLOCKED / INSUFFICIENT TEST BUDGET**, preserve the current qualified route if possible, clearly manage new-request admission and defer migration rather than claiming success.

Reference practices:
- Google SRE, handling overload and load shedding: https://sre.google/resources/book-update/handling-overload/
- Google SRE, cascading failures: https://sre.google/sre-book/addressing-cascading-failures/
- AWS Well-Architected graceful degradation: https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_mitigate_interaction_failure_graceful_degradation.html
- Cloudflare Queues model: https://developers.cloudflare.com/queues/reference/how-queues-works/
- Cloudflare Queues delivery guarantees: https://developers.cloudflare.com/queues/reference/delivery-guarantees/

### Zero-budget migration readiness requirement — 2026-10-15

The sustainable-techonomic study may produce paying users before free provider quotas can fund a full migration comparison. Therefore the project must not wait for quota exhaustion to begin readiness work, and must not claim migration readiness based on mock tests, API credentials, provider marketing, or an incomplete image-quality comparison.

**Offline preparation (no inference credits):**
- Pin and checksum the base model, adapter, encoders/VAE/tokenizer, scheduler, supported parameters, runtime/container and dependency lockfile.
- Use offline tests for configuration/package integrity, adapter contracts, quota/queue/circuit-breaker logic, stored-file integrity, alpha validation using fixtures, and internal composition manifests.
- Reuse saved approved assets for composition-regression tests; layout variations should consume zero generation calls.
- Prepare the candidate deployment and exercise control-flow behavior with mocked provider responses. Keep mocked tests explicitly separate from actual GPU/hardware and image-quality evidence.

**Predeclare the minimum live migration suite:**
- Include at least one test for every critical capability the tier actually promises (for example opaque space plate, true-alpha asset, and token-logo asset if offered) and a baseline/candidate comparison for each critical task. Add performance/repeatability cases when those claims form part of the service promise.
- Do not shrink the required suite merely because credits are low. If the available no-cost quota cannot finish it, classify the target as **BLOCKED / INSUFFICIENT TEST BUDGET**.
- Under the present $0 constraint, do not enter billing information, activate a paid plan or consume paid/prepaid credits to get a passing result. If no eligible free path can complete the suite, keep the existing qualified path (if any), constrain admission transparently, defer the migration, or request explicit authorization for a bounded test budget.

**Traffic and migration triggers:**
- Monitor remaining free quota / usable GPU time, actual usage burn, generation latency/error rates, backlog, provider limit changes, and the lead time needed to qualify another target.
- Begin migration review before projected quota runway drops below the required migration-test budget plus a recovery reserve; never wait for complete exhaustion or a production incident.
- When capacity gets scarce, keep model and quality settings unchanged. Queue, stagger, rate-limit under published limits, or temporarily stop accepting new generation jobs rather than silently switch to a weaker unqualified model.
- Serve stored approved assets and compositions without re-generation. A provider migration must never invalidate or silently replace previous outputs.
- Do not count published allocations or idle GPU hours as sustained production capacity. Record test credits separately from user-serving compute.

**Paid-tier gate:** If users are paying before a sustained production route exists, disclose the bounded/experimental nature of generation before purchase and avoid promising unqualified throughput or uptime. Before a provider/compute migration is considered live-ready, the target must pass the predeclared capability-specific quality suite and meet the tier's stated capacity requirements. If there is insufficient free test budget, migration remains blocked—never represent it as verified.

### Paid-user quality continuity requirement — 2026-10-15

The user's concern is a commercial acceptance requirement: someone who pays during the sustainable tokenomics study should not receive a silently downgraded image-generation experience when AstroCrown moves to commercial deployment.

Do not promise each new stochastic image will be identical or superior to every previous image. Instead, AstroCrown must define and enforce a versioned quality floor across all advertised paid use cases. Diffusers' official guidance notes that setting a seed helps control randomness but does not guarantee exact output equivalence across software/hardware platforms: https://huggingface.co/docs/diffusers/using-diffusers/reusing_seeds

Before a paid launch or a materially different model migration:

- Establish a baseline for the actual study model/output route and its supported paid capabilities. A study/beta label must be visible before purchase; it is not justification for silent degradation after payment.
- Build a fixed, versioned, rights-cleared evaluation corpus that covers each advertised modality/asset type, including transparent alpha assets if that capability is sold.
- Compare the qualified current release against each candidate release. Enforce technical hard gates and per-task quality floors; do not use a single aggregate score that hides a regression in transparency, logos or another supported task. Combine automated/technical checks with a blinded human quality review.
- For a GPU-provider migration, first try the same pinned base weights, AstroCrown adapter, text encoders/VAE, tokenizer, scheduler, parameters and inference runtime on the new host. Treat a switch to a different hosted image model as a new model release, not a routine host change.
- Reject, postpone or scope down any candidate that fails a critical task's quality floor or rights/technical gate. Keep the previously qualified deployment ready for rollback during a defined retention window.
- Preserve the exact delivered asset bytes and checksums plus model-release provenance. A rollout must not rewrite or regenerate an already approved/delivered asset.
- Notify users before a material behavior change. If equivalent validated quality cannot be maintained, preserve existing entitlements where feasible or define an explicit remedy process; review customer-facing terms with legal counsel.
- Keep an internal release report with baseline/candidate identifiers and hashes, test corpus revision, outcomes per task, critical failures, human-review findings, latency/resource/cost measurements, and go/no-go decision.

**Go/no-go criterion:** A new paid deployment is not approved simply because it has more resources, higher availability, lower prices or a newer model. It must be validated as meeting or exceeding the existing minimum quality floor for each critical paid capability. Until that evidence exists, the move remains blocked for the affected tier/use case.

### AstroCrown-owned model direction — 2026-10-15

The desired long-term route is to maintain an AstroCrown-owned/versioned image model and inference pipeline, while replacing only the GPU execution host when capacity or price changes. This reduces dependence on provider-specific hosted image models, whose output behavior and parameters differ.

The practical first step is a licensing- and hardware-qualified **base checkpoint + style adapter (such as LoRA)**, not training a foundation model from scratch. The adapter can help standardize our defined visual identity, but it remains tied to and constrained by its base model. A separately qualified alpha-capable stage is still required for truly transparent source assets; fine-tuning for style alone does not add transparency support.

Before training, inspect the exact base model and all relevant terms, curate a rights-cleared dataset with source/caption provenance, then test a bounded training configuration on the observed T4 environment. Do not use model outputs to train another model unless the exact output/service license allows it. Do not downgrade or replace the working notebook packages speculatively. Training success, visual quality, alpha, commercial suitability, reusable artifacts, and inference reproducibility are distinct acceptance gates.

When paid GPU compute is approved, the preferred migration is the **same pinned AstroCrown model checkpoint, adapter and runtime on a different GPU host**, not switching silently to that host's native image-generation API. Pin weights/versions/parameters and test for changes across hardware/software; exact bitwise reproducibility across environments is not guaranteed. Preserve approved image files immutably, regardless of provider or model changes.

Foundation-model-from-scratch work remains long-term and out of scope for the initial homepage asset proof, because a small Kaggle T4 allocation is not evidence of sufficient sustained training capacity.

Official references:
- Diffusers training overview (maintained training recipes, including text-to-image, LoRA and DreamBooth): https://huggingface.co/docs/diffusers/training/overview
- Diffusers LoRA guide (reduced trainable parameters and smaller adapters): https://huggingface.co/docs/diffusers/training/lora
- Model-card guidance on datasets, intended uses, limitations and evaluations: https://huggingface.co/docs/hub/model-cards
- FLUX.1 schnell model card (example of an Apache-2.0-labeled candidate, not yet selected for our T4/alpha requirements): https://github.com/black-forest-labs/flux/blob/main/model_cards/FLUX.1-schnell.md

### Cross-provider reproducibility decision — 2026-10-15

A new request sent to a different model/provider is **not expected to reproduce identical pixels**, even when the natural-language prompt is the same. Seed support, model version pinning, reference-image inputs, and deterministic execution can improve reproducibility within particular pipelines, but are endpoint-specific and do not establish cross-provider equivalence. Public Diffusers guidance explicitly cautions that exact reproducibility across releases/platforms is not guaranteed. Some individual hosted endpoints expose structured prompts plus seeds for their own recreation workflow; that is a route-specific feature, not a portable seed contract.

**Required architecture behavior:**

- The exact approved asset file is authoritative. Persist it, store a checksum, and reuse its bytes; never regenerate it merely because provider availability or routing changes.
- Keep generation provenance alongside the file: provider/endpoint and model ID/version if available, prompt and negative prompt, reference asset checksums, parameters, endpoint-supported seed/structured workflow metadata, output properties, and rights evidence. Explicitly mark metadata the endpoint does not expose.
- A fallback that changes model/provider may produce only a new candidate asset version. It must not replace the approved asset automatically. Run the visual/alpha/licensing gates and approve the new candidate explicitly.
- Keep visual rules and approved examples as a canonical style reference. Use image references, conditioning, or provider-specific structured prompts where available and legally permitted, but describe their effect as improving similarity—not guaranteeing identical output.
- Prioritize one qualified route for each coherent batch when consistency matters. Keep provider-neutral adapters so route changes are possible, but keep each adapter's parameter capabilities and reproducibility limits explicit.
- The internal compositor uses persisted assets plus a versioned composition manifest. Repositioning, resizing, rotating, layering, hiding/showing, or exporting the same unchanged assets must not call the image generator.

**Sources:**
- Diffusers reproducibility guidance: https://huggingface.co/docs/diffusers/main/using-diffusers/reusing_seeds
- Example of route-specific recreation with a seed and structured prompt (Bria FIBO on Cloudflare): https://developers.cloudflare.com/ai/models/bria/fibo-generate-1.5/



Generate source assets separately, then use an internal AstroCrown compositor for all arrangements. A full-canvas background plate may be opaque. Reusable planets, Earth, Moon, nebulae, dust, debris, stars, logos and other overlapping elements require true alpha when they must be independently positioned. Website UI and cards must not be baked into a generated background.

A provider call is for creating the source asset—not for every composition. Reuse an asset through a structured manifest describing asset IDs, z-order, position, scale, rotation, opacity, cropping, blending and visibility. A flattened image may be exported for a static use case, but it is not the only retained source of truth. A batch endpoint is useful only if it returns separate independently usable assets; an endpoint that blends multiple inputs into one image is not a substitute for internal composition.

### Transparency candidates and current limits

- **LayerDiffuse / its separate Diffusers CLI integration:** plausible local route for generating transparent foreground assets. The official Diffusers CLI documents SDXL transparent text-to-image and image-to-image commands as finished, while the complete SDXL layer system is still TODO—appropriate for our design because the internal compositor, not the diffusion package, will arrange independent assets. The CLI is explicitly Work In Progress and its requirements pin Diffusers 0.28.0, Transformers 4.41.1 and Accelerate 0.30.1, whereas the working Kaggle environment has 0.40.0, 5.16.1 and 1.14.0. Crucially, the CLI code repository's Apache-2.0 license does not apply automatically to its weights: `lllyasviel/LayerDiffuse_Diffusers` is marked `openrail` (about 5.74 GB), and the demo's `SG161222/RealVisXL_V4.0` base is marked `openrail++`. The README claims an 8 GB Nvidia VRAM requirement, but the transparent text-to-image example uses `SG161222/RealVisXL_V4.0` (also marked `openrail++` and described by its model card as still in training) and selects `torch.bfloat16` for the VAE despite requesting an FP16 model variant. NVIDIA's precision table lists Tesla T4 as compute capability 7.5 without BF16 among supported Tensor Core inputs for that capability. This is a concrete hardware/runtime compatibility blocker; exact behavior is untested, so do not run the upstream demo unchanged. No installation or inference has occurred; keep the current kernel untouched and consider an isolated runtime only after reviewing all dependencies and licenses.
  - https://github.com/lllyasviel/LayerDiffuse
  - https://github.com/lllyasviel/LayerDiffuse_DiffusersCLI
  - LayerDiffuse model weights repository / `openrail` label: https://huggingface.co/lllyasviel/LayerDiffuse_Diffusers
  - Current README/feature state: https://raw.githubusercontent.com/lllyasviel/LayerDiffuse_DiffusersCLI/main/README.md
  - Pinned requirements: https://raw.githubusercontent.com/lllyasviel/LayerDiffuse_DiffusersCLI/main/requirements.txt
  - Transparent SDXL demo and dtype choices: https://raw.githubusercontent.com/lllyasviel/LayerDiffuse_DiffusersCLI/main/demo_sdxl_t2i.py
  - Base model card/license label: https://huggingface.co/SG161222/RealVisXL_V4.0
  - NVIDIA compute capability and tensor-precision table: https://docs.nvidia.com/cuda/cuda-programming-guide/05-appendices/compute-capabilities.html
- **Cloudflare's third-party OpenAI image route:** Cloudflare's GPT Image 2 page says that route does not support transparent backgrounds and points to GPT Image 1.5 for transparent PNGs. GPT Image 1.5's model page is third-party, points to dashboard pricing, and its published parameter list does not clearly expose a transparency parameter. No request has been made; do not treat this as a $0/no-card route or enable paid billing.
  - https://developers.cloudflare.com/ai/models/openai/gpt-image-1.5/
  - https://developers.cloudflare.com/ai/models/openai/gpt-image-2/
  - https://developers.cloudflare.com/workers-ai/platform/pricing/
- Both routes remain **BLOCKED** until the exact endpoint/runtime contract, true alpha, component/dependency terms, commercial suitability and permitted cost/access route are evidenced.

### Updated next action

Inspect the official LayerDiffuse Diffusers CLI integration and its requirements/licensing without installing it. Compare the requirements to the already-working Kaggle notebook environment; do not modify installed packages speculatively. Design the smallest one-asset alpha test only after this source/runtime review. Acceptance requires actual file alpha inspection, edge-fringe testing over dark and light backgrounds, and proof the same asset can be recomposed internally without a second generation request.

No production code, assets, model weights, secrets, billing settings, or existing backup contents were changed by this research update.

## Current status

- Provider-neutral image generation interface: still a target; not yet implemented/qualified by this work.
- Kaggle local GPU: **accelerator and CUDA observed working for diagnostics**; actual model inference, duration, quota cost and long-term availability remain unmeasured.
- Transparent source-asset generation: **BLOCKED** pending exact route and true-alpha evidence.
- Internal composition architecture: **user-selected direction**; independent from the generation backend.
- Commercial use: **BLOCKED** until the exact asset/model, dependency, and service terms pass review.
- Video runtime: **BLOCKED as an independent track** and must not delay the first alpha-capable image asset.
- 86,400 GPU-minutes/month: cumulative target across qualifying providers, not achieved capacity.
