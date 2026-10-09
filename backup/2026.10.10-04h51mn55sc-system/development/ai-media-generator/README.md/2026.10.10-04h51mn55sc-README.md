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

## Rollout and Access Proposal

[Capacity-Aware AI Media Generation and Progressive Access Proposal](CAPACITY-AWARE-ROLLOUT-PROPOSAL.md) records a candidate direction for internal-first media generation, separate feature-access waiting lists and generation-job queues, and staged user access governed by measured capacity. It is a proposal, not an implementation or an approval of any model/provider.

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
