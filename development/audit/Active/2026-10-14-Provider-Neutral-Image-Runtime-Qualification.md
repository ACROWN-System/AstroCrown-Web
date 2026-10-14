# Active Audit Plan — Provider-Neutral Image Runtime Qualification

**Date:** 2026-10-14  
**Status:** ACTIVE — research and feasibility qualification  
**Objective:** Identify the least-complex, genuinely $0/no-payment-method route to a working image-generation baseline that can support AstroCrown's homepage background and later reusable token-logo/layer assets, while keeping the generator provider-neutral and evidence-backed.

## Scope and source of truth

**Repository:** `ACROWN-System/AstroCrown-Web`  
**Base revision:** `583da2598bfd4f72bb306277c021264b4473301e`  
**Related subsystem:** `development/ai-media-generator/` and `development/gpu-infrastructure/`  
**Cross-repository dependency:** `ACROWN-System/NOVA` for secret-safe orchestration and existing Cloudflare qualification workflow.

Use the current default-branch candidate register, multi-model composition strategy, homepage background requirements, development/audit convention, and fact-observation governance as project sources of truth. Use current official model cards, model/code licenses, provider terms/pricing, GPU service terms and maintained runtime documentation for external facts. Keep dated findings, source URLs, exact versions, limitations and PASS / FAIL / N/A / BLOCKED states.

The requested `NAVIGATION-PROTOCOL.md` and `NAVIGATION-PLAN-TEMPLATE.md` were not found in either active repository during prior inspection. This plan follows the existing `development/DEVELOPMENT-AND-AUDIT-CONVENTION.md` and active-plan pattern; it does not claim to follow absent files.

## User constraints and preservation

- $0 expenditure; no mandatory payment method; no paid fallback, credits, subscription or billing activation.
- One combined monthly GPU target of 86,400 minutes across all qualifying providers, not a single-provider target. Treat this as a target, not achieved or guaranteed capacity.
- Provider-neutral interfaces; Cloudflare remains an optional hosted adapter and must not become the foundational assumption for GPU execution.
- First qualify image generation; investigate video separately in parallel without blocking image work.
- First intended visual target: a restrained deep-navy space background with sparse stars and a subdued blue-violet nebula. Cards must avoid excessive brightness/saturation. User file/image sharing is temporarily capped, so do not request additional uploads during the restriction window.
- Real transparent layers are required for compositing where appropriate; JPEG cannot supply alpha. Validate real alpha through output and delivery, not visual appearance alone.
- Do not expose or duplicate secrets, trigger live inference, modify account billing, accept new terms, download large model weights, or dispatch a live workflow unless the relevant existing authorization and prerequisites are confirmed.
- Preserve existing evidence, source files, and backups. No production website or provider roster changes under this research plan.

## Questions to resolve

1. Which exact image model/runtime combinations have documented rights compatible with intended AstroCrown commercial use?
2. Which execution environments can be accessed without a payment method and offer an explicitly free-only/fail-closed path?
3. What GPU memory, software/runtime, model downloads, startup time, generation latency, session duration, persistence, concurrency, queue and quota constraints are documented or actually measured?
4. Which route offers a real, retrievable and decodable image with useful quality for the specified background, and what evidence remains required?
5. Can a second stage provide true alpha/layer output with compatible rights, or must transparent assets remain BLOCKED?
6. How can qualifying provider capacity be accumulated across independent providers without counting idle, inaccessible, metered, non-GPU or unverified minutes toward the 86,400-minute target?

## Method

1. Inspect existing implementation, tests, candidate records, recent incident evidence, and provider adapters before proposing a new component.
2. Research a bounded shortlist of exact candidates from authoritative sources; do not perform a broad install or collect candidates by popularity.
3. For every candidate, separately assess model/license rights, runtime/dependency licenses, service/account eligibility, no-payment behavior, hardware fit, modality/output capability, privacy, and operational limits.
4. Classify documentary claims separately from observed account behavior and live execution. Do not treat open weights, an HTTP success, a free listing, or an offline test as proof of a complete runnable route.
5. Use a small deterministic local/offline test first. Run live requests only after the existing authorized workflow's prerequisites are confirmed; use one bounded, non-sensitive request per decision and preserve sanitized evidence.
6. Record failure causes and uncertainty; repeat only when a changed condition makes the test informative.
7. Recommend one baseline route or explicitly leave it BLOCKED. Add more models or workflow stages only when a baseline exists and a testable requirement justifies the added complexity.

## Acceptance criteria

- Candidate records identify exact model/runtime/version, official source and access date, relevant license/terms, intended-use restrictions, no-card/payment status, hardware/memory requirements, modality and output contract, dependency obligations, known failure modes, and evidence gaps.
- No candidate is called commercially qualified or operational until all mandatory gates pass for the intended use.
- Image output is retrievable and independently decoded/inspected; dimensions, file format, provenance and checksum are recorded.
- Visual acceptance includes low-distraction deep-space composition, readability, output repeatability and a separate test for true alpha where required.
- GPU-capacity accounting distinguishes measured usable GPU time from provider listings, queue time, cold start, idle time, or assumed availability.
- Existing Cloudflare behavior is preserved as optional evidence; no automatic paid route, secret change, billing change, or unapproved live dispatch occurs.
- Findings and any future implementation have traceable evidence, tests, limitations and a reviewable pull request.

## Impact Analysis

**IF modified:** the project can choose an image runtime using evidence about legal suitability, actual access, compute feasibility and visual output rather than assumptions; later capacity can be aggregated across qualified providers.

**IF not modified:** model availability may be confused with executable capacity, commercial terms may be overlooked, and development may continue to depend on a hosted endpoint that does not meet the intended self-hosted/provider-neutral objective.

## Initial status

- Existing Cloudflare image adapter: implementation candidate; at least one previous hosted image was returned, but sustained $0/no-card eligibility, commercial clearance, output quality and real alpha are not yet established.
- Local open-weight image runtime: BLOCKED pending verified free GPU execution and exact dependency/runtime review.
- Video runtime: BLOCKED as an independent track; it must not delay the first image baseline.
- 86,400 GPU-minutes/month: target only; no assumption of achieved capacity.
- Next action: conduct source-backed, bounded research and update the candidate register and this plan before proposing implementation.
