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

## Architecture and source of truth

This README is an entry point, not a second specification. The target is one AstroCrown-owned generator for image and video, with image generation as the first executable milestone and a separate qualification gate for video.

Use these documents as the canonical sources:

- [Architecture, service boundary, component reuse, and minimum implementation](OPEN-SOURCE-MULTI-MODEL-COMPOSITION-STRATEGY.md).
- [Exact model/provider candidates, account eligibility, rights, and evidence](IMAGE-VIDEO-COMPONENT-CANDIDATE-REGISTER.md).
- [Feature-access waiting lists, generation queues, and capacity-aware rollout](CAPACITY-AWARE-ROLLOUT-PROPOSAL.md).
- [Homepage environment, compositing roles, and R-036 alpha acceptance](../index-section/BACKGROUND.md).
- [Shared compute responsibility](../gpu-infrastructure/README.md).
- [NOVA orchestration responsibility](../nova-ai-orchestration/README.md).
- [Fact Observation, Independent Derivation and Evidence Governance](../audit/FACT-OBSERVATION-AND-EVIDENCE-GOVERNANCE.md) for accurate research classifications, provenance, rights review, confidentiality-aware evidence, and preservation.

Do not duplicate provider-health probes, the aggregate GPU-capacity calculator, or NOVA's orchestration/job decisions inside this subsystem. Reuse existing evidence through an explicit, compatible interface when one exists; do not assume a shared executable API already exists. NOVA's current aggregate GPU-capacity report is scoped to non-commercial R&D and is not proof of commercial-production eligibility or live capacity.

## First image adapter (development-only)

`cloudflare_image.py` is the first isolated image-provider adapter. It has no third-party Python dependencies and fixes the provider/model endpoint in code. It accepts only bounded, validated PNG or JPEG image containers, records Cloudflare's declared Content-Type separately from the detected byte format, corrects the saved extension to match the actual format, refuses to overwrite outputs, and writes a provenance sidecar. PNG validation checks chunk CRCs and bounded decompression; JPEG validation checks signatures, marker segments, frame dimensions and scan-header structure but does not fully decode JPEG entropy data, so manual artifact-viewability verification remains required. The prompt-helper LLM is optional and is not part of the image request path.

Run deterministic tests without credentials or network access:

```bash
python -m py_compile development/ai-media-generator/cloudflare_image.py
python -m unittest discover -s development/ai-media-generator/tests -p "test_*.py" -v
```

The live Cloudflare qualification workflow is owned and dispatched from [NOVA](https://github.com/ACROWN-System/NOVA/actions/workflows/astrocrown-cloudflare-image-qualification.yml), not from this repository. It is **manual only**, restricted to NOVA `main`, and requires explicit confirmation that the current no-payment configuration remains in place. It consumes NOVA's existing `CLOUDFLARE_API_KEY_01` and `CLOUDFLARE_ACCOUNT_ID` secrets, checks out this repository's adapter at a reviewed immutable commit SHA, and uploads one detected-format image plus its provenance as a short-lived artifact. Do not add or duplicate secrets in AstroCrown-Web, or put secret values in source files, prompts, issues, or logs. Use only non-sensitive prompts. Do not dispatch the live workflow until account access and the no-payment configuration have been confirmed.

**Status: implementation candidate, not provider-qualified.** Offline tests cannot prove Cloudflare entitlement, correct live output, current quota/usage, commercial rights, visual quality, or true alpha transparency. A valid opaque PNG is not proof of transparent output. Do not promote generated artifacts to the public website before the separate use-rights and quality gates pass.

## Development Status

Status: **candidate / initial subsystem structure**

No model, provider, generation method, latency expectation, quality claim, or asset should be treated as approved until supported by project evidence and applicable verification.

## Reproducibility and Provenance

Use the provenance and artifact-evidence requirements in [the canonical composition strategy](OPEN-SOURCE-MULTI-MODEL-COMPOSITION-STRATEGY.md). Preserve sufficient information to audit each generated or transformed asset, and record unavailable metadata or reproducibility limits explicitly. Do not claim deterministic reproduction when the provider or model does not support it.

## Verification

Changes follow the repository development and audit convention in:

`development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`

Verification should distinguish technical correctness, visual suitability, performance, security, and reproducibility. External benchmark results supplement project requirements; they do not replace them.

## Reuse

The system is intended to support media creation beyond the current homepage, including future AstroCrown pages, reusable visual environments, development prototypes, documentation, and other NOVA or Space Empire media needs where appropriate.
