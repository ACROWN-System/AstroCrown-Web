# AI Media Generator

This directory contains the development-only AI media generation system for creating, evaluating, optimizing, and preserving image and video assets for AstroCrown and other future uses.

## Scope

The subsystem may contain:

- image-generation workflows;
- video-generation workflows;
- model and provider adapters;
- generation jobs and batch manifests;
- prompts and generation parameters;
- queue and workflow orchestration;
- output handling and derived media variants;
- media optimization and delivery experiments;
- provenance, checksums, timestamps, and reproducibility records;
- visual and technical quality evaluation;
- browser-oriented asset loading and rendering evaluation;
- evidence supporting asset selection and promotion.

## Compute Dependency

GPU compute is an external/shared development capability, not part of this subsystem's identity.

GPU connections, providers, operational environments, capacity observations, and related infrastructure belong in:

`development/gpu-infrastructure/`

The generator may use whichever verified compute provider or execution environment satisfies the applicable requirements. It must not be permanently coupled to a single GPU provider without evidence-based justification.

## Homepage Relationship

The first intended production use may be AstroCrown homepage visual assets, including reusable background systems documented by the homepage requirements.

That use does not make this subsystem part of the homepage architecture.

Homepage section requirements remain in:

`development/index-section/`

Shared homepage reference conventions remain in:

`development/index-reference/`

Generated media should be treated as separately produced artifacts that can later be evaluated and intentionally promoted into the website.

## Image and Video Component Candidate Register

[Image and Video Component Candidate Register](IMAGE-VIDEO-COMPONENT-CANDIDATE-REGISTER.md) records a source-backed first pass over Cloudflare-hosted image candidates, FLUX.1 schnell, Wan 2.2, LTX-2.5, HunyuanVideo-1.5, and ComfyUI. It separates software/model licensing, hosted API access, account eligibility, and actual compute feasibility. All complete workflows remain blocked until mandatory evidence is verified.

## Multi-Model Composition Strategy

[Open-Source, Multi-Model Image and Video Generation Strategy](OPEN-SOURCE-MULTI-MODEL-COMPOSITION-STRATEGY.md) records the candidate direction to integrate multiple suitably licensed generators and processing components behind one replaceable AstroCrown-owned service. It distinguishes model routing and workflow composition from model-weight merging, and requires rights, account eligibility, runtime, and evidence gates for each material dependency. It does not approve a model, engine, or provider.

## Rollout and Access Proposal

[Capacity-Aware AI Media Generation and Progressive Access Proposal](CAPACITY-AWARE-ROLLOUT-PROPOSAL.md) records a candidate direction for internal-first media generation, separate feature-access waiting lists and generation-job queues, and staged user access governed by measured capacity. It is a proposal, not an implementation or an approval of any model/provider.

## Target architecture and delivery order — one generator, image first

The target is **one AstroCrown-owned AI image-and-video generator** with a coherent visual identity and replaceable model/provider adapters. Image and video are two capabilities of that intended system—not two unrelated products, and not a promise that every capability is already operational.

### First executable milestone — image generation

Prove one real image-generation path that can produce a useful candidate for the homepage's foundational deep-space environment. Use the least complex route that demonstrably meets the current $0/no-payment-method constraint and has a commercially suitable basis for the intended asset. Preserve the exact provider/model, parameters, input, returned file, terms evidence, provenance, observed latency/usage, quality review, and failures.

An LLM can help with prompts, composition planning, reference analysis, evaluation, and deterministic checks. It only counts as the image generator when the selected endpoint is verified to return generated image output. Do not mistake ordinary text generation or vision input for image-generation capability. Do not hold up the first image for complete provider discovery or a working video backend.

### Video is part of the target, not a gate on image delivery

Develop and qualify video capability as a parallel workstream behind the same service boundary, using a separate video adapter and its own runtime, rights, memory, latency, quality, and capacity checks. If no suitable free video path is currently available, record that blocker, continue improving the image path and shared architecture, and revisit video viability when a materially different candidate or execution condition appears. Video uncertainty must not make the whole generator or homepage work appear blocked.

### Brand uniformity — owned by AstroCrown

Create recognizable AstroCrown visual quality through our own approved art direction, reference assets, composition/lighting rules, palette, and reusable environment components. The existing homepage requirements define the initial signature: deep near-black blue space, subdued atmosphere, the Primitive Earth–Moon environment, gold-lit rocky planet, and spiral nebula in gold/orange/purple/deep blue. Reuse that visual grammar across generated images and videos, then assess outputs against the same project-owned criteria. External products mentioned in conversation were illustrative examples of recognizable differences between generators; they are **not** selected providers, required integrations, or reference brands to imitate.

### Commercial-use and output-promotion boundary

Commercial suitability is required for all components retained in the eventual generator and for every asset intended for commercial publication. Evaluate the application's code, exact model/weights, extensions/dependencies, hosted endpoint and applicable terms separately. Temporary development-only services may be used only within their restrictions. Removing an API key later does not erase restrictions that may apply to prior outputs. If rights or terms are unknown, the resulting asset remains BLOCKED for commercial promotion until the issue is resolved or the asset is regenerated through a qualified route.

### Execution order

1. Prove one image can be generated and retrieved.
2. Produce and evaluate the homepage's foundational background.
3. Establish reusable brand-specific objects, layers, prompt/workflow presets, and output evaluation.
4. Continue video feasibility in parallel; integrate a video backend when its own gates pass, without holding the image path.
5. Harden the unified generator and expand toward broader commercial use using evidence from actual runs.


## Transparency and compositing support

Layered composition is a first-class workflow capability. For foreground objects and effects intended to be placed independently over the homepage environment, the system must support genuine alpha transparency—either natively from a qualified generator or through a separately qualified masking, segmentation, matting, or background-removal stage. A flat black/white/chessboard-looking background is not transparency.

Examples include independently composed planet/Moon assets, debris, asteroids, wispy gas, nebula details, rays, dust and other reusable foreground elements. The foundational deep-space base may stay opaque; alpha is required according to the asset's intended compositing role.

Validate the alpha channel and composite result after processing, optimization, storage and browser delivery. Review fine edges, translucent details, halos and unwanted matte fringes. Keep a working master suitable for alpha; PNG is the baseline format to evaluate for static transparent masters, with WebP/AVIF only when the actual pipeline preserves alpha. Treat transparent video as a separate optional capability with its own codec, playback and runtime verification—not a prerequisite for static layers or the first opaque background.


## Development Status

Status: **candidate / initial subsystem structure**

No model, provider, generation method, latency expectation, quality claim, or asset should be treated as approved until supported by project evidence and applicable verification.

## Reproducibility and Provenance

Generation records should preserve enough information to reproduce or audit an artifact where the provider and model permit reproducibility, including applicable:

- provider;
- model/version;
- prompt/input;
- generation parameters;
- source/reference inputs;
- execution timestamp;
- job identifier;
- output identifiers;
- checksums;
- transformations or optimization steps;
- verification results.

Where exact reproduction is not possible because a provider is nondeterministic or does not expose required information, preserve the available evidence and record the limitation rather than implying deterministic reproduction.

## Verification

Changes follow the repository development and audit convention in:

`development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`

Verification should distinguish technical correctness, visual suitability, performance, security, and reproducibility. External benchmark results supplement project requirements; they do not replace them.

## Reuse

The system is intended to support media creation beyond the current homepage, including future AstroCrown pages, reusable visual environments, development prototypes, documentation, and other NOVA or Space Empire media needs where appropriate.
