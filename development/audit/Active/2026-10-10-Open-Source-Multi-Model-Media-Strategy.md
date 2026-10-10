# Active Navigation Plan — Open-Source Multi-Model Media Platform Strategy

**Date:** 2026-10-10  
**Status:** ACTIVE — architecture strategy proposed; no implementation or provider approval  
**Objective:** Record the user's direction to create an AstroCrown-owned image/video service by integrating multiple appropriately licensed generators and reusable components under strict cost, permission, and evidence constraints.

## Mode and source of truth

**Mode:** Architecture analysis and authorized additive documentation.  
**Repository:** https://github.com/ACROWN-System/AstroCrown-Web  
**Base revision inspected:** `ee02ebbd3f517f8c3d417d2c6b4bbc9bce1fee5b`  
**Sources:** Existing media-generation proposal, AI media generator/GPU/NOVA subsystem boundaries, development/audit convention, current official engine/model repositories and their license files.

The expected `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not found in the earlier active repository investigation. This plan uses the available `development/Prompt-Guide.md` and `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` and does not claim to have followed the missing documents.

## Scope

- Add a dedicated multi-model composition strategy under `development/ai-media-generator/`.
- Link it from that subsystem's README.
- Define a license/permission gate for the complete dependency chain.
- Preserve model, workflow engine, compute and implementation choices as candidates.
- Define the evidence required before model composition, weight merging, modification/fine-tuning, or public release.
- Submit documentation via a pull request and leave it for user review.

## Out of scope

- Model/provider selection or approval.
- API-token creation, GitHub-secret changes, account/billing changes, paid or metered requests.
- Installing large models or running live generation jobs.
- Weight merging, fine-tuning, training, or dataset acquisition.
- Runtime code, public website changes, and public access.

## Navigation targets

- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/ai-media-generator/README.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/ai-media-generator/CAPACITY-AWARE-ROLLOUT-PROPOSAL.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/gpu-infrastructure/README.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-ai-orchestration/README.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/audit/templates/CANDIDATE-EVALUATION.md
- https://github.com/comfy-org/ComfyUI
- https://github.com/comfy-org/ComfyUI/blob/master/LICENSE
- https://github.com/Wan-Video/Wan2.2

## Impact analysis

**IF modified:** the multi-model direction and hard constraints become a durable reference; later work can be composed from replaceable parts and evaluated against a consistent permissions register instead of assuming every open model/component is usable.

**IF not modified:** the direction risks remaining implicit, leading to single-provider coupling, premature weight-merging attempts, incompatible workflows, overlooked component licenses, or costs/capacity claims unsupported by an actual test.

## Verification and handoff

- Read back the strategy and README link.
- Verify the new document explicitly separates workflow composition, model routing and weight merging.
- Verify license obligations are required for every material dependency, not just the top-level model.
- Verify $0/no-payment and rights remain hard gates.
- Verify no model, engine, provider or runtime is presented as approved.
- Verify only the intended development documentation is changed.
- Leave the PR open for review; do not merge without user direction.
