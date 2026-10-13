# Active Navigation Plan — Capacity-Aware AI Media Rollout

**Date:** 2026-10-10  
**Status:** ACTIVE — proposal documentation submitted for review; no runtime implementation  
**Objective:** Record a reusable, evidence-led proposal for a shared AI media generation capability with feature access and job admission governed by verified capacity.

## Mode and source of truth

**Mode:** Repository investigation and authorized documentation change.  
**Repository:** https://github.com/ACROWN-System/AstroCrown-Web  
**Source of truth:** Current `main` contents, the development/audit convention, the Prompt Guide, and the existing subsystem README files.

The required repository-level `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not found in the active repository investigation. This plan follows the available development/audit and Prompt Guide conventions and records that governance gap; it does not claim to have followed or reviewed missing documents.

## Objective and completion conditions

1. Record the user's proposed shared AI image/video generation direction in the subsystem that owns media generation.
2. Define phased rollout gates based on evidence of capability, reliability, privacy, licensing, and operating capacity—not calendar promises or unverified quota claims.
3. Distinguish feature-access waiting lists from accepted generation-job queues.
4. Define boundaries between media generation, shared GPU infrastructure, NOVA AI orchestration, and future AstroCrown token-generation UX.
5. Preserve the current candidate status of all model/provider choices and the $0/no-payment-method constraint.
6. Link the proposal from the subsystem README without changing implementation code or public website files.
7. Submit the additive documentation through a pull request; do not merge it without user review.
8. Verify the changed-file set, resulting content, and pull-request state.

## Navigation targets

- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/Prompt-Guide.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/DEVELOPMENT-AND-AUDIT-CONVENTION.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/ai-media-generator/README.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/gpu-infrastructure/README.md
- https://github.com/ACROWN-System/AstroCrown-Web/blob/main/development/nova-ai-orchestration/README.md

## Scope and preservation

**In scope**
- Add a development-only proposal under `development/ai-media-generator/`.
- Add a link in that subsystem's README.
- Record this navigation plan under `development/audit/Active/` while the documentation change awaits review.

**Out of scope**
- Production website changes or promotion of generated assets.
- Runtime implementation, workflow/code changes, or secret edits.
- Approval of a specific model, open-source license, GPU provider, inference API, queue technology, or commercial service.
- Changes to NOVA provider roster/health workflows, payment settings, pricing, or tokenomics.
- Promises of always-on GPUs, fixed waiting times, unlimited free generation, or a specific public launch date.
- Live generation tests and external provider calls.

## Dependencies and decision boundaries

- The media generator owns media workflows and generation-job lifecycle.
- `development/gpu-infrastructure/` owns compute-provider integration, capacity observations, and infrastructure health.
- `development/nova-ai-orchestration/` may consume generation through a defined tool/API boundary; it must not take over the media subsystem's ownership.
- A future token generator may consume the same service for logo concepts, but exact text, token metadata, and logo exports require separate deterministic handling and validation.
- Any model/software/weights/nodes/adapters require version-specific license, commercial-use, security, compatibility, and operational evaluation before selection.

## Impact Analysis

**IF modified:** the proposal will be discoverable at the AI media subsystem entry point and establish a consistent basis for a $0-first proof of concept, staged release, access waiting list, job queue, capacity gates, privacy, and auditability. It will not itself implement or imply those runtime features.

**IF not modified:** the rollout proposal remains only in conversational context, increasing the risk of fragmented decisions, duplicated mechanisms, premature provider selection, and user-facing commitments unsupported by capacity evidence.

## Verification and handoff

- Confirm the proposal is clearly marked as a proposal/candidate direction and does not claim implementation is complete.
- Confirm two distinct queues, phased release criteria, ethical and operational constraints, component boundaries, unresolved decisions, and next evidence-gathering step are recorded.
- Confirm only development documentation is changed.
- Confirm README link resolves to the new proposal.
- Confirm PR is open for user review and has not been merged by this workflow.
- Keep this plan Active until the documentation change is reviewed and merged; then move it to the repository's Completed plan area through the established process.
