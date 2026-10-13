# Active Navigation Plan — Image-First, Commercially Suitable, Brand-Grade Media Generator

**Date:** 2026-10-13  
**Status:** ACTIVE — requirements clarification and additive architecture documentation  
**Objective:** Separate the smallest useful, image-first generation path from the more suitable long-term commercial image/video system without letting provider research delay the first usable AstroCrown homepage visual assets.

## Mode and source of truth

**Mode:** Current-source verification, architecture clarification, and additive development documentation.  
**Repository:** https://github.com/ACROWN-System/AstroCrown-Web  
**Base revision:** `0aadaf9d804de1fb82e387052e2765fad3cf71a3`  
**Targets:** media generator README, multi-model strategy, capacity-aware rollout proposal, and model/provider candidate register.  
**Method:** Follow `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, `development/Prompt-Guide.md`, and `development/audit/templates/CANDIDATE-EVALUATION.md`. This plan does not claim to use missing NAVIGATION protocol/template files.

## User-confirmed intent

1. Image generation for the AstroCrown homepage background is the first practical deliverable.
2. Do not let exhaustive provider discovery or a future video implementation block a useful image proof.
3. Build one AstroCrown-owned, replaceable service/workflow boundary that can expose image and video generation through the same system, using separate capability adapters and job workflows when necessary.
4. Target recognizable, coherent AstroCrown brand quality through an owned visual system, reusable references, controlled composition, and repeatable workflows—not by depending on one vendor's aesthetic or brand.
5. From the beginning, evaluate retained dependencies and asset-creation routes for the intended eventual commercial operation. A temporary development-only model/provider may be used for experiments only when its restrictions are respected; its outputs must not be promoted commercially unless the asset's commercial-use basis is established.
6. Maintain the hard $0/no-payment-method constraint for current execution. Never infer that an LLM API key includes image-generation access, or silently enable billing.
7. Keep the more suitable long-term tier (consistent image/video generation, reusable brand components, stronger controls, scale and replacement options) distinct from the minimum useful image path.

## Work scope

- Add an explicit two-level delivery strategy to the existing AI media subsystem documents.
- Record current capability evidence that distinguishes prompt/refinement/vision LLM use from actual image generation.
- Reconcile official provider/API availability with the current $0/no-card constraint. Where model pricing, access, licensing, or execution is unverified, keep the result BLOCKED.
- Define end-to-end image generation as the first success criterion, followed by a separately qualified video proof.
- Preserve evidence, candidate IDs, intended-use constraints, and asset provenance requirements.
- Do not modify production website files, create or change credentials/secrets, alter billing, invoke paid endpoints, or represent any candidate as approved absent evidence.

## Current official sources to check and record

- Cloudflare Workers AI model catalogue: https://developers.cloudflare.com/workers-ai/models/
- Cloudflare pricing/free allocation: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Cloudflare FLUX.1 schnell endpoint: https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/
- Google Gemini API image generation: https://ai.google.dev/gemini-api/docs/image-generation
- Google Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Groq supported models: https://console.groq.com/docs/models
- ElevenLabs image/video overview and API access conditions: https://elevenlabs.io/docs/overview/capabilities/image-video and https://elevenlabs.io/docs/eleven-api/guides/cookbooks/image-and-video

## Acceptance criteria

- Documents state plainly that minimum delivery is an image-first proof using one verified route, while the full commercial brand-grade generator is a broader target.
- The image proof is not described as production-ready unless its endpoint contract, entitlement, no-payment-method access, image output, result retrieval, intended-use rights, provenance, and actual quality have been tested.
- LLM capability is split into (a) prompt/planning/analysis support and (b) native model image output; only (b) creates the image.
- Image/video remain behind a replaceable AstroCrown-owned interface. Video has its own acceptance gates and is not falsely implied by an image PASS.
- A coherent AstroCrown visual identity is defined as an owned art direction and asset/workflow system; vendor examples are references, not dependencies or a requirement to imitate their brand.
- Exact provider/model terms and commercial-use rights remain component-specific; a removed key does not clear restrictions on prior outputs.
- CI/runtime behavior, credentials, billing, and production site remain unchanged by this documentation-only change.
- Run diff/content review and whatever proportionate checks are available, open a PR, and leave the PR unmerged for review.

## Impact Analysis

**IF modified:** the project can prioritize a concrete image result while preserving the larger commercially suitable image/video objective and preventing capability or license assumptions from leaking into implementation.

**IF not modified:** provider research can continue indefinitely; an LLM key may be mistaken for an image generator; video may delay the first useful result; and assets may be generated through a route unsuitable for commercial publication.

## Navigation targets

- `development/ai-media-generator/README.md`
- `development/ai-media-generator/CAPACITY-AWARE-ROLLOUT-PROPOSAL.md`
- `development/ai-media-generator/OPEN-SOURCE-MULTI-MODEL-COMPOSITION-STRATEGY.md`
- `development/ai-media-generator/IMAGE-VIDEO-COMPONENT-CANDIDATE-REGISTER.md`

## Completion

This plan stays Active until the documentation change is reviewed and merged. It does not mark any provider or model as qualified and does not close the live generation test.
