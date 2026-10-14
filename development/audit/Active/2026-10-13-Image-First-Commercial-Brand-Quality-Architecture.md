# Active Navigation Plan — Media Architecture Alignment and Minimal Image Proof

**Date:** 2026-10-13  
**Status:** ACTIVE — documentation alignment, duplication reduction, and first-slice definition  
**Objective:** Preserve the unified commercial image/video target while eliminating conflicting/duplicated specifications, assigning cross-system ownership, correcting credential/capacity assumptions, and defining the smallest evidence-backed image implementation.

## Mode and source of truth

**Mode:** Current-source verification, architecture clarification, and additive development documentation.  
**Repository:** https://github.com/ACROWN-System/AstroCrown-Web  
**Base revision:** `0aadaf9d804de1fb82e387052e2765fad3cf71a3`  
**Targets:** media generator README, multi-model strategy, capacity-aware rollout proposal, model/provider candidate register, homepage background requirement (globally unique R-036 assignment), and this active plan.  
**Method:** Follow `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, `development/Prompt-Guide.md`, and `development/audit/templates/CANDIDATE-EVALUATION.md`. This plan does not claim to use missing NAVIGATION protocol/template files.

## User-confirmed intent

1. Image generation for the AstroCrown homepage background is the first practical deliverable.
2. Do not let exhaustive provider discovery or a future video implementation block a useful image proof.
3. Build one AstroCrown-owned, replaceable service/workflow boundary that can expose image and video generation through the same system, using separate capability adapters and job workflows when necessary.
4. Target recognizable, coherent AstroCrown brand quality through an owned visual system, reusable references, controlled composition, and repeatable workflows—not by depending on one vendor's aesthetic or brand.
5. From the beginning, evaluate retained dependencies and asset-creation routes for the intended eventual commercial operation. A temporary development-only model/provider may be used for experiments only when its restrictions are respected; its outputs must not be promoted commercially unless the asset's commercial-use basis is established.
6. Maintain the hard $0/no-payment-method constraint for current execution. Never infer that an LLM API key includes image-generation access, or silently enable billing.
7. The target system includes both image and video from the beginning. Image is the first executable slice because it delivers the immediate homepage need; video feasibility proceeds in parallel but cannot block image results.
8. Support genuine alpha transparency for foreground objects/effects intended for independent composition. Native alpha is preferred where suitable; a qualified post-processing route is acceptable. The opaque deep-space base remains valid, and transparent video is separately gated.

## Work scope

- Keep one canonical architecture document and make the README and rollout proposal link to it rather than re-specify the same architecture.
- Assign media-job lifecycle, application access/waiting-list policy, NOVA orchestration, shared compute, provider-health and capacity-accounting responsibilities without creating duplicate queues, probes or capacity calculators.
- Explicitly mark the existing NOVA aggregate GPU-capacity report as R&D-scoped, separate from commercial eligibility and live execution availability.
- Align the candidate register's revision/evidence dates and correct the next-action text for the already-configured NOVA Cloudflare Workers AI credential context.
- Assign the new alpha-transparency requirement the globally unique identifier R-036; preserve R-019 for the existing Homepage Header System requirement and distinguish the new requirement from migrated source material.
- Define a minimum image proof that includes actual output retrieval, file validation, provenance, negative/contract tests, and one bounded live integration test; defer public queues, user-facing access policy, broad provider registries, and extra pipeline stages until justified.
- Retain the $0/no-payment-method constraint, component-level rights gates, image-first delivery, parallel but independent video qualification, and alpha-transparency requirements.
- Do not modify production website files, create/change credentials or secrets, alter billing, invoke live provider endpoints, or promote any candidate as qualified in this documentation-alignment change.

## Current official sources to check and record

- Cloudflare Workers AI model catalogue: https://developers.cloudflare.com/workers-ai/models/
- Cloudflare pricing/free allocation: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Cloudflare FLUX.1 schnell endpoint: https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/
- Google Gemini API image generation: https://ai.google.dev/gemini-api/docs/image-generation
- Google Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Groq supported models: https://console.groq.com/docs/models

## Acceptance criteria

- One canonical architecture document owns service-boundary and implementation design; the README and rollout proposal provide concise summaries/links instead of duplicated design text.
- A responsibility table establishes one owner for media jobs, application access/waiting-list policy, shared compute/provider observations, aggregate capacity evidence, and NOVA request orchestration.
- No duplicate GPU capacity calculator, provider-health probe, or independent NOVA/media job queue is proposed; any cross-repository reuse uses an explicit compatible schema/API and does not assume existing executable integration.
- The existing aggregate NOVA GPU report is described as R&D-scoped unless separately requalified; projected/qualified capacity is not confused with live available compute or actual completed-job usage.
- The candidate register distinguishes its revision date, initial evaluation date, and candidate-level evidence dates, and does not incorrectly suggest that Cloudflare credentials must be created from scratch.
- R-036 is globally unique against the archived R-001–R-035 baseline, and the migration note distinguishes the new requirement from preserved source material.
- The first image slice is specific and testable, while public queues, waiting lists, databases, broad registries, and unnecessary processing stages remain deferred until a real requirement justifies them.
- Image generation requires an actual retrieved/decoded image and intended-use rights; an HTTP success or text-only LLM response is not accepted as image generation.
- Video remains part of one target generator but has independent qualification gates; its absence cannot block the image path. Alpha transparency is required only for assets whose compositing role needs it.
- No production website/runtime, credentials, secrets, billing, or provider state is modified by this documentation-only change.
- Review the resulting diff and consistency checks; keep the PR open and unmerged for review.

## Impact Analysis

**IF modified:** the project can build the intended owned image/video generator, create a useful homepage image early, keep commercial rights explicit, and investigate video without letting its viability block the main development path.

**IF not modified:** provider research can continue indefinitely; an LLM key may be mistaken for an image generator; video may delay the first useful result; and assets may be generated through a route unsuitable for commercial publication.

## Navigation targets

- development/ai-media-generator/README.md
- development/ai-media-generator/CAPACITY-AWARE-ROLLOUT-PROPOSAL.md
- development/ai-media-generator/OPEN-SOURCE-MULTI-MODEL-COMPOSITION-STRATEGY.md
- development/ai-media-generator/IMAGE-VIDEO-COMPONENT-CANDIDATE-REGISTER.md
- development/index-section/BACKGROUND.md

## Completion

This plan stays Active until the documentation change is reviewed and merged. It does not mark any provider or model as qualified and does not close the live generation test.
