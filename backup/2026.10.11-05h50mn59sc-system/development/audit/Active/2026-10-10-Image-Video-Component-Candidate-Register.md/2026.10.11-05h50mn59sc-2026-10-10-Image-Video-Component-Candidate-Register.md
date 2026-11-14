# Active Navigation Plan — Image/Video Component Candidate Register

**Date:** 2026-10-10  
**Status:** ACTIVE — source-backed first pass recorded; workflow eligibility remains BLOCKED  
**Objective:** Compare plausible image models, video models, and workflow engines under the project's $0/no-payment, commercial-permission, modularity and actual-compute constraints until the next mandatory check requires the user's Cloudflare account interaction.

## Mode and source of truth

**Mode:** Current-source research, candidate audit, and additive documentation.  
**Repository:** https://github.com/ACROWN-System/AstroCrown-Web  
**Base revision:** `1d5742890c68210513485841f27bae3450cfcdff`  
**Sources:** Existing multi-model composition strategy, capacity-aware rollout proposal, AI media/GPU/NOVA subsystem boundaries, repository audit convention and template, official Cloudflare and upstream software/model/license repositories.

The earlier investigation did not find the named `NAVIGATION-PROTOCOL.md` or `NAVIGATION-PLAN-TEMPLATE.md` in the active repository. Use the available `development/Prompt-Guide.md` and `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` and preserve that governance gap.

## Scope

- Add a source-backed first-pass inventory of image, video, hosted inference, and workflow engine candidates.
- Keep each component's software license, model-weight license, API terms, account access, hardware and cost separate.
- Define narrow result states and explicit next verification needs.
- Link the register from `development/ai-media-generator/README.md`.
- Submit via a pull request and leave it for review.
- Continue using only public documentation until the user supplies observed account status.

## Out of scope

- Signing into or operating the user's Cloudflare account on their behalf.
- Creating API tokens, accessing or editing secrets, invoking provider APIs, accepting legal terms, changing payment settings or activating a paid plan.
- Downloading model weights or installing GPU workflows.
- Approving any model/provider or claiming live operation.
- Runtime code, workflows, public UX or production changes.

## Navigation targets

- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/ai-media-generator/OPEN-SOURCE-MULTI-MODEL-COMPOSITION-STRATEGY.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/ai-media-generator/CAPACITY-AWARE-ROLLOUT-PROPOSAL.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/DEVELOPMENT-AND-AUDIT-CONVENTION.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/audit/templates/CANDIDATE-EVALUATION.md
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://github.com/Wan-Video/Wan2.2
- https://github.com/Lightricks/LTX-2
- https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5
- https://github.com/comfy-org/ComfyUI

## Impact analysis

**IF modified:** the project can compare promising image/video candidates without flattening their materially different licenses, pricing conditions, and hardware needs into a single “open-source” label. The next user interaction will ask only for account-level evidence that public docs cannot supply.

**IF not modified:** the development path may repeatedly research candidates without retaining a shared decision record, may mistake model access for free compute, and may build on incompatible or restricted dependencies.

## Verification and handoff

- Confirm the register preserves evidence URLs, component roles, narrow PASS/BLOCKED statuses, and unresolved account/compute questions.
- Confirm no paid route, API token, secret, external inference request, model download or runtime change was made.
- Confirm README links to the new register.
- Verify the changed-file list before opening a PR.
- Leave the PR unmerged for user review.
- Keep this plan Active until the documentation is reviewed and the account/compute gates are re-tested.
