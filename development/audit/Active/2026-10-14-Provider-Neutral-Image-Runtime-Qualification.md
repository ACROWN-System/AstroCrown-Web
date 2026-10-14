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

No live run is authorized by this research alone. The next necessary user interaction will be limited to checking the account page for actual GPU allocation/quota and confirming that use remains free without a required payment method. Until then, account eligibility and execution are BLOCKED; no model weights are downloaded, no billing is changed, and no secrets are accessed.

## Observed Kaggle preflight and architecture update — 2026-10-15

### Observed account/runtime facts

- The user reports that after refreshing Kaggle, the Accelerator GPU option became selectable; they selected it and accepted the displayed continuation prompt for GPU usage.
- The user's Kaggle account page displayed **Kaggle GPU 00:00 / 30 hrs**. This is an account UI observation, not proof of guaranteed availability or durable production capacity. The exact pop-up wording and complete free/no-payment terms have not been independently verified in this record.
- `nvidia-smi` reported NVIDIA driver 580.178.04, CUDA 13.0, and **two Tesla T4 GPUs**, each with 15,360 MiB displayed total memory and 0 MiB used at the check.
- PyTorch reports version `2.11.0+cu128`, `torch.cuda.is_available() == True`, two devices named Tesla T4, and 14.56 GiB reported total memory for GPU 0. The GPU memories remain separate; do not assume 30 GiB unified memory.
- Hugging Face connectivity test returned HTTP 200.
- Installed packages: Diffusers 0.40.0, Transformers 5.16.1, Accelerate 1.14.0, huggingface-hub 1.29.0, safetensors 0.8.0. Required imports passed.
- No model weights were downloaded and no model inference/image-generation cell was run. The planned flattened SDXL-Lightning background test was stopped before execution when the user clarified the required asset architecture. No GPU inference usage is established from this test record.

### Architecture decision direction

Generate source assets separately, then use an internal AstroCrown compositor for all arrangements. A full-canvas background plate may be opaque. Reusable planets, Earth, Moon, nebulae, dust, debris, stars, logos and other overlapping elements require true alpha when they must be independently positioned. Website UI and cards must not be baked into a generated background.

A provider call is for creating the source asset—not for every composition. Reuse an asset through a structured manifest describing asset IDs, z-order, position, scale, rotation, opacity, cropping, blending and visibility. A flattened image may be exported for a static use case, but it is not the only retained source of truth. A batch endpoint is useful only if it returns separate independently usable assets; an endpoint that blends multiple inputs into one image is not a substitute for internal composition.

### Transparency candidates and current limits

- **LayerDiffuse / its separate Diffusers CLI integration:** plausible local route for generating transparent foreground assets. The official Diffusers CLI documents SDXL transparent text-to-image and image-to-image commands as finished, while the complete SDXL layer system is still TODO—appropriate for our design because the internal compositor, not the diffusion package, will arrange independent assets. The CLI is explicitly Work In Progress and its requirements pin Diffusers 0.28.0, Transformers 4.41.1 and Accelerate 0.30.1, whereas the working Kaggle environment has 0.40.0, 5.16.1 and 1.14.0. The README claims an 8 GB Nvidia VRAM requirement. No installation or inference has occurred; keep the current kernel untouched and consider an isolated runtime only after reviewing all dependencies and licenses.
  - https://github.com/lllyasviel/LayerDiffuse
  - https://github.com/lllyasviel/LayerDiffuse_DiffusersCLI
  - Current README/feature state: https://raw.githubusercontent.com/lllyasviel/LayerDiffuse_DiffusersCLI/main/README.md
  - Pinned requirements: https://raw.githubusercontent.com/lllyasviel/LayerDiffuse_DiffusersCLI/main/requirements.txt
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
