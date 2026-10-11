# Active Navigation Plan — Cloudflare Image Model Candidate Evaluation

**Date:** 2026-10-10  
**Status:** ACTIVE — evidence recorded for review; candidate eligibility remains BLOCKED  
**Objective:** Evaluate currently documented Cloudflare-hosted text-to-image candidates against AstroCrown's $0/no-payment-method, rights, privacy, and working-endpoint requirements before implementation.

## Mode and source of truth

**Mode:** Current-source research, candidate evaluation, and additive audit documentation.  
**Repository:** https://github.com/ACROWN-System/AstroCrown-Web  
**Base revision inspected:** `ee02ebbd3f517f8c3d417d2c6b4bbc9bce1fee5b`  
**Source of truth:** Current repository development/audit convention, candidate-evaluation template, media rollout proposal, and official provider/model documentation and license texts.

The expected `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not present in the previous active repository investigation. This plan follows the available `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`, `development/Prompt-Guide.md`, and `development/audit/templates/CANDIDATE-EVALUATION.md`; it does not claim to follow the missing documents.

## Scope and completion conditions

1. Inspect the media generator proposal, subsystem boundary documentation, audit convention, and candidate-evaluation template.
2. Verify current documented pricing, free quota behavior, API access prerequisites, data-use terms, model IDs, model licenses, and relevant restrictions for multiple image-model candidates.
3. Record each result as PASS, FAIL, N/A, or BLOCKED without substituting popularity or an unverified headline price for eligibility evidence.
4. Distinguish model-level license from hosted provider/API terms; preserve ambiguities as BLOCKED.
5. Keep a record of the actual account-level access, no-payment-method, live-operation, quality, and latency checks still required.
6. Make additive documentation changes under `development/audit/Active/` only; submit them through a pull request.
7. Do not create API tokens, edit GitHub secrets/workflows, modify billing, invoke paid services, or change runtime/public website code.
8. Verify PR files and content; leave the PR for review instead of merging it without the user's direction.

## Navigation targets

- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/ai-media-generator/CAPACITY-AWARE-ROLLOUT-PROPOSAL.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/ai-media-generator/README.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/gpu-infrastructure/README.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/DEVELOPMENT-AND-AUDIT-CONVENTION.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/audit/templates/CANDIDATE-EVALUATION.md
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/platform/data-usage/
- https://developers.cloudflare.com/workers-ai/get-started/rest-api/
- https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-lightning/
- https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-base-1.0/
- https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/
- https://huggingface.co/ByteDance/SDXL-Lightning
- https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
- https://huggingface.co/black-forest-labs/FLUX.1-schnell
- https://bfl.ai/legal/usage-policy
- https://bfl.ai/legal/developer-terms-of-service

## Impact Analysis

**IF modified:** the project keeps the free-tier, billing, licensing, privacy, and model-compatibility evidence together. This reduces the risk of choosing a model based on a label or a single model card and avoids accidental paid configuration. The record will explicitly prevent the candidate from being treated as approved until mandatory gates pass.

**IF not modified:** discussions can drift toward implementation based on a published free quota or model-level license while ignoring account-specific access, pricing discrepancies, model-provider conditions, and untested operation.

## Verification and handoff

- Confirm only the intended audit records were added.
- Confirm findings distinguish documented facts, interpretations, and missing evidence.
- Confirm all three models remain candidates and none is presented as approved.
- Confirm no repository runtime, provider account, payment setting, API token, secret, or workflow was modified.
- Keep this plan Active until the documentation change is reviewed and merged. The actual candidate audit remains open until the recorded re-test conditions are satisfied.
