# Capacity-Aware AI Media Generation and Progressive Access Proposal

**Date:** 2026-10-10  
**Status:** PROPOSAL / CANDIDATE — recorded at the user's request; not an implementation approval  
**Owner subsystem:** `development/ai-media-generator/`  
**Related subsystem:** `development/gpu-infrastructure/`  
**Related integration:** `development/nova-ai-orchestration/`

## 1. Purpose

Establish a shared, AI-agnostic image and video generation capability that AstroCrown can use internally first and expose to users gradually as measured capability, reliability, and operating capacity permit.

The initial strategic reason is dual-use: generate AstroCrown's own backgrounds, reusable visual components, illustrations, token-brand concepts, promotional images, and later videos; then reuse the same capability through controlled user-facing features, including token-logo generation and NOVA-assisted media creation.

The platform should orchestrate and govern existing tools and models rather than train foundation models or hard-code the application to one provider. Model software, model weights, adapters, execution environments, and providers remain separately evaluated dependencies.

This proposal records a direction to evaluate. It does not select a production stack, approve any provider/model, implement a waitlist, or establish a launch commitment.

## 2. Core proposal

Build one shared media-generation service boundary with:
- a stable API/tool interface for AstroCrown features and NOVA orchestration;
- replaceable model and compute-provider adapters;
- explicit feature eligibility and capacity-aware admission;
- asynchronous generation jobs with lifecycle tracking;
- workflow and prompt presets for consistent brand production;
- output evaluation, provenance, and intentional asset promotion;
- observable usage, quota, latency, failure, quality, and cost data;
- privacy, content-safety, access-control, and abuse controls.

Application features should not need to know which GPU provider executes a job. GPU infrastructure supplies or brokers compute; the media subsystem owns media-generation workflows and jobs; NOVA orchestration may request generation via a defined interface.

## 3. Distinguish two queues

These are different controls and must not be represented as a single queue.

### 3.1 Feature-access waiting list

Controls who is eligible to use a capability. Interest and invitations may be tracked separately for image generation, token-logo creation, NOVA-assisted creation, and video generation. Joining a waiting list must not imply immediate access, a guaranteed place at a particular time, or a completion-time commitment.

Access policy should be transparent, auditable, privacy-minimizing, and fair. Where cohorts are used, their eligibility criteria and invitation rules must be recorded. Do not invent user positions or deadlines, create artificial scarcity, or require payment details merely to register interest in a free beta.

### 3.2 Generation-job queue

Controls when a request accepted from an eligible user can execute. It must record the request, assigned execution path, lifecycle state, and result or failure. It must support bounded retries, cancellation where technically possible, duplicate-submit protection where appropriate, and clear recovery for retryable failures.

Proposed lifecycle states (final names remain an implementation decision):

`QUEUED` → `GENERATING` → `QUALITY_CHECK` → `COMPLETED`

Failure/cancellation states should distinguish at least retryable provider/capacity failures, permanent failures, cancellation, and expiration. A job should not remain apparently active forever when the provider is unavailable. Users should be able to leave the page and later retrieve the job status/result where the product supports it.

Admission to the service must not be represented as guaranteed immediate execution. The user interface should communicate the actual state and avoid promising an ETA unless measured performance supports that commitment.

## 4. Progressive rollout — gates, not dates

The phases below describe an intended sequence. They are not a timetable and need not block parallel internal research.

### Phase 0 — Feasibility and internal proof

- Verify an end-to-end image-generation path with a currently eligible $0/no-payment-method execution route.
- Record exact provider/model/version, terms and commercial-use rights, request parameters, output, latency, failures, quota impact, and any limitations exposed by the service.
- Prove result retrieval, error handling, and provenance before building a public UI.
- If no candidate satisfies mandatory requirements, record BLOCKED instead of inventing a workaround or enabling paid billing.

### Phase 1 — Internal AstroCrown media production

Use the verified path for selected background concepts and reusable visual assets. Maintain approved visual references, lighting/composition conventions, prompt/workflow presets, output variants, and asset provenance. Evaluate generated artifacts before they are promoted into website assets.

### Phase 2 — Restricted image and token-logo beta

Invite a controlled cohort only after the capacity, security, privacy, licensing, quality, and support gates are satisfied. Begin with bounded image use and token-logo concepts. Keep exact token names, tickers, typography, and export details under deterministic validation rather than relying on generated text to be correct.

### Phase 3 — Evidence-based image-access expansion

Expand invitations only when observed available capacity and failure/backlog behavior support the next cohort. Pause or limit new admission when capacity or provider reliability falls below the predeclared gate. Re-open when evidence demonstrates recovery. A free allowance or configured API key is not proof of currently available capacity.

### Phase 4 — NOVA-assisted creation

Connect NOVA through a defined tool/API boundary so a user can express intent, refine a prompt, request supported variations, and follow job status. NOVA should communicate model limitations and uncertainty; it must not imply that a request completed merely because it was accepted.

### Phase 5 — Video pilot and expansion

Evaluate video separately from image generation. Model memory, render duration, temporal quality, storage, transfer, queue occupancy, and workload cost can be materially different. Start with a limited experiment and keep public video access disabled until video-specific gates pass.

Phases may overlap for research and internal experimentation, but public availability must follow the relevant gate for each feature.

## 5. Capacity-aware admission and operations

NOVA or a related policy component may recommend or perform admission changes using observable evidence. The policy must be documented and auditable; it must not infer capacity from provider popularity, model reputation, a configured credential, or a published free-tier headline alone.

Relevant signals include:
- current quota or usage headroom, reset behavior, and rate limits when exposed;
- actual provider availability, recent request success/failure, and model compatibility;
- available execution capacity and the memory/runtime requirements of the requested workflow;
- queue depth, age of the oldest accepted job, and observed queue-wait distribution;
- completion success, retry rate, failure class, cancellation, and timeout observations;
- output quality against the task's acceptance criteria;
- measured resource use and cost per completed output where cost data exists;
- abuse signals and user-facing service commitments.

Provider headers or usage data that are not exposed must be recorded as NOT EXPOSED rather than guessed. Estimated resource requirements must be distinguished from observed measurements. Do not use numerical scores, weighted averages, or rankings as substitutes for mandatory requirement verification.

Operational responses may include slowing or pausing invitations, limiting accepted workload, reducing concurrency, routing to another *already qualified* compatible backend, or reporting that a feature is temporarily unavailable. Routing must not send jobs to an unverified model/provider merely because it appears configured. A paid path must not be silently enabled.

Before a beta, define explicit acceptance and stop thresholds from baseline measurements and user expectations. Avoid inventing numeric limits before obtaining representative evidence. Preserve a safety margin rather than allocating all observed free quota or capacity to users.

## 6. Brand consistency and asset provenance

The internal media pipeline should help maintain a cohesive AstroCrown visual identity through approved references, repeatable composition rules, reusable environment components, parameterized prompt/workflow templates, and review before promotion.

For each generated or transformed artifact, preserve applicable metadata:
- provider and model/version;
- workflow/version and prompt or source input, subject to privacy restrictions;
- generation parameters and reference-asset identifiers;
- job identifier and execution timestamp;
- output identifiers and checksums where practical;
- processing/optimization steps;
- applicable license/terms evidence;
- technical, visual, and content review results;
- reproduction limitations.

Do not claim that a seed guarantees identical output when the provider/model is nondeterministic or the environment differs. Don't log secrets. Avoid indiscriminate retention of user prompts and uploads; define access controls, retention, deletion, and backup behavior before accepting user content.

Generated token-logo concepts must not be presented as proof of trademark availability, legal uniqueness, or guaranteed ownership. Preserve an explicit user review step and separately validate exact text and export contents.

## 7. License, safety, privacy, and economic safeguards

- Evaluate licenses and commercial-use terms for each exact software release, model version/weights, adapter, workflow node, dataset/reference input, and provider endpoint. "Open source" or "open weights" alone is not blanket permission for every use.
- Check provider terms, retention practices, content restrictions, and whether prompts/uploads may be used for training or disclosed to third parties.
- Establish authentication, per-user/feature limits, job authorization, output access controls, abuse prevention, and secret-handling requirements.
- Make material limitations visible. Never imply that generation is unlimited, always available, instantaneous, private, or commercially cleared unless the evidence and terms support the claim.
- Preserve the initial $0/no-payment-method constraint. Do not enable a paid API, paid GPU, prepayment, or billing fallback without a separate explicit decision.
- Measure operational sustainability before expansion; free service can be paused, quota can be exhausted, and public availability is not necessarily reserved capacity.
- Do not treat a submitted request, waitlist position, or successful prototype as evidence of production readiness.

## 8. Subsystem boundaries

| Responsibility | Canonical development location |
|---|---|
| Image/video workflows, prompt presets, media job lifecycle, output handling, provenance, visual/technical quality | `development/ai-media-generator/` |
| Compute vendors, credentials/configuration boundaries, runtime environments, health/capacity observations, provider fallbacks | `development/gpu-infrastructure/` |
| Model/provider orchestration, comparative intelligence, user-intent interpretation, and tool invocation by NOVA | `development/nova-ai-orchestration/` |
| Homepage-specific section requirements | `development/index-section/` |
| Shared homepage visual conventions | `development/index-reference/` |
| Future token-generator user interface and deterministic token metadata | Its appropriate subsystem, to be determined when that work is scoped |

This proposal does not move homepage requirements into the media subsystem, make GPU infrastructure application-specific, or redefine the NOVA orchestration subsystem as a chatbot.

## 9. Verification gates for any public beta

Use the repository's `PASS / FAIL / N/A / BLOCKED` result states. Do not award acceptance based on aggregate scores.

A gate may be considered satisfied only when applicable evidence exists for:
1. **Rights and terms:** approved intended use for exact components, model and provider version.
2. **End-to-end function:** reproducible request, result retrieval, errors, and output handling.
3. **Security and privacy:** authorization, secret protection, output isolation, retention/deletion, and applicable abuse controls.
4. **Operational behavior:** queue lifecycle, bounded retry, duplicate submissions, cancellation/expiration behavior, outage handling, and observable provider failures.
5. **Capacity and experience:** measured workload, realistic queue/latency expectations, quota behavior, sufficient margin, and explicit admission/stop thresholds.
6. **Quality:** fit-for-purpose output and human review for brand-critical assets or logo concepts.
7. **User communication:** honest access status, no unsupported ETA/availability promise, understandable failure messages, and a support/escalation path.
8. **Governance:** provenance and decision records sufficient to reproduce the test and explain why access was expanded or paused.

Video requires a separate evaluation and cannot inherit a PASS from image generation.

## 10. Immediate next step

After this proposal has been reviewed, perform a bounded, read-only candidate audit followed by an end-to-end image proof of concept only for a candidate whose current eligibility matches $0/no-payment-method constraints. Use `development/audit/templates/CANDIDATE-EVALUATION.md` for comparing candidates and record mandatory criteria as PASS, FAIL, N/A, or BLOCKED. Prefer the least complex candidate that satisfies requirements; do not rank candidates using scores.

The first proof should answer whether one acceptable image can be requested and retrieved, what quality and latency were observed, what quota/resource usage was measurable, what the exact license permits, and what failed. It does not need to build the waiting list, token generator, full chat experience, or video pipeline yet.

## 11. Unresolved decisions

- Qualified first image model and execution provider under the current $0/no-payment-method constraint.
- Whether the first execution path is hosted inference or self-hosted/open-weight inference.
- Queue/storage/notification technology and the retention period.
- Authentication and feature eligibility model for the initial beta.
- Baseline-derived invitation, queue, latency, quota-reserve, and stop thresholds.
- Exact boundaries and request schema between NOVA orchestration and media generation.
- Video candidate, hardware feasibility, and separate public beta criteria.
- How user-consented input/reference files and output artifacts will be stored, shared, and deleted.

These are intentionally unresolved. No runtime code, credentials, provider configuration, payment configuration, user-facing promise, or production feature is changed by this proposal.

## 12. Impact analysis

**IF adopted:** AstroCrown can begin with internal media needs, gather operational evidence, and progressively offer useful user features without tying public promises to unverified free capacity. Reusable workflows and traceable approved assets can improve brand consistency, while explicit feature and job queues reduce confusion between eligibility and execution.

**IF not adopted:** internal and user-facing generation may evolve as disconnected systems; model/provider choices may be made without common evidence; free-tier limitations and queue behavior may surprise users; and launch promises may exceed proven capacity.

## 13. Decision status

**Recorded proposal:** use one shared, replaceable media-generation capability; serve internal AstroCrown asset production first; distinguish access waiting lists from generation-job queues; and expand user access feature by feature as evidenced capacity, quality, safety, licensing, and sustainability allow.

**Not approved by this document:** any particular model, provider, software stack, public release date, fixed capacity, queue threshold, pricing decision, or implementation. Changes remain subject to the existing development/audit convention and review.
