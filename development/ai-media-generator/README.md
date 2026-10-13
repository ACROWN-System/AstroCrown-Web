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

## Delivery tiers — useful image first, brand-grade system next

The generator has two deliberately separate delivery levels. **The more suitable long-term system must not become a prerequisite for the first useful image.**

### Tier 1 — minimum useful image path

Deliver one verifiable image-generation workflow that can produce a candidate for the AstroCrown homepage's foundational deep-space environment. Use the simplest endpoint and execution route that passes the current $0/no-payment-method constraint, intended-use rights, and actual access checks. Preserve the request, exact model/provider, parameters, returned file, provenance, observed latency and usage, quality review, and failure evidence.

An LLM may refine prompts, plan composition, assess an image, or help write deterministic validation. It only counts as the image generator when the chosen endpoint demonstrably returns generated image output. A working text-generation call or vision-input capability alone is not image generation. Do not wait for video, multiple providers, public queues, fine-tuning, or exhaustive model discovery before completing this tier.

### Tier 2 — commercially suitable, brand-grade image and video system

Build the longer-term AstroCrown-owned system behind one stable application/service interface, with replaceable task-specific adapters for image and video. Improve it through repeatable prompt/workflow presets, curated reference assets, compositional control, asset editing and optimization, quality review, job lifecycle handling, provenance, monitoring, and qualified fallback execution. Video shares the system boundary but keeps distinct models, execution limits, tests, and release gates.

Create a recognizable **AstroCrown visual signature** rather than depending on one provider's style. The existing homepage specification is the starting brand reference: deep near-black blues, restrained space atmosphere, the Primitive Earth–Moon environment, a gold-lit rocky planet, and the gold/orange/purple/blue spiral nebula. Reuse approved references, lighting and composition rules, and coherent layers across outputs. External products such as ElevenLabs Image & Video and Google's Nano Banana can be quality/capability reference points, not production dependencies or brand identity to imitate.

### Commercial-use and promotion boundary

Commercial suitability is a requirement from the start, but it must be evidenced separately for the application, exact model/weights, code and extensions, hosted endpoint, and each asset's actual creation route. Temporary development-only services may be used for experiments only within their terms. An output from a restricted or unresolved route must not be promoted to the commercial website merely because the API key will later be removed. If output rights or applicable restrictions remain unclear, label the asset BLOCKED for commercial promotion and use a cleared route or regenerate it.

### Delivery order

1. Prove one image can be generated and retrieved through a currently eligible route.
2. Produce and evaluate the homepage's foundational deep-space background first.
3. Add the reusable objects/layers and brand-consistent image workflow.
4. Qualify and integrate a separate video-generation path through the same service boundary.
5. Harden for wider commercial use and later user access based on measured capacity and explicit release gates.

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
