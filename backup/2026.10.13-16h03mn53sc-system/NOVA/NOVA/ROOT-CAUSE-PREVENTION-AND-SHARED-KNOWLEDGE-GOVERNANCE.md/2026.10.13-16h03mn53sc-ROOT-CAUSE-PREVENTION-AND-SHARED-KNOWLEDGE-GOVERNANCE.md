# NOVA Root-Cause Prevention and Shared-Knowledge Governance

**Status:** PROPOSED ARCHITECTURE — not yet enforced across all NOVA entry points  
**Date:** 2026-10-12  
**Scope:** NOVA-controlled software development, AI-agent execution, tools, provider/API calls, and current/future UI and API interfaces  
**Core requirement:** When NOVA-controlled work fails an acceptance criterion, causes an unintended effect, or produces evidence that contradicts its claim of success, the system must require a root-cause investigation and a verified recurrence-prevention control before that work can be marked resolved, promoted, or repeated unchanged. The rule must be enforced by the control plane, not only by prompts, model instructions, a particular host, or user discipline.

## 1. Executive decision

NOVA must be **host-independent and enforcement-centered**.

The website host, repository host, model provider, UI framework, and system intelligence (SI) that proposes work are replaceable adapters. The policy gate, evidence model, investigation lifecycle, shared safe knowledge, and closure criteria are NOVA-owned invariants.

No SI or model may decide by itself that root-cause work is unnecessary, that a failing change is complete, or that the same failed attempt should be repeated without new evidence. Models may propose analyses and changes. Deterministic NOVA policy and verification components control whether the operation can proceed or be closed.

This applies to:
- NOVA's own reasoning and maintenance processes;
- any SI assigned development, research, verification, or operational tasks through NOVA;
- any user request submitted through NOVA's future API or UI;
- any supported repository, hosting, CI, deployment, tool, or AI-provider adapter;
- repeated safe questions from different users, where previously verified knowledge can be reused without revealing private user data.

**Important boundary:** NOVA can guarantee this only for operations routed through NOVA-controlled entry points and tool adapters. It cannot prevent an independent agent from bypassing NOVA and using external credentials or tools directly. Therefore, the eventual production deployment must keep write-capable credentials and provider credentials inside the controlled executor/gateway, rather than giving bypass-capable SIs or browser clients direct access.

## 2. Existing capability versus implementation gap

| Existing NOVA capability | Verified current behavior | What is still missing |
|---|---|---|
| Fingerprinting in NOVA/health.py | Canonicalizes observations and computes SHA-256 fingerprints while excluding selected volatile transport fields | No general cross-user task/question cache or root-cause incident fingerprint |
| Reusable observations and analysis | remember_observation() and reusable_analysis() reuse analysis for an unchanged, fresh, validity-bounded external observation | No shared safe knowledge registry across user/API/UI tasks |
| External observer | NOVA/operational_observer.py detects changed watched-source content and requests analysis when needed | Does not intercept all user prompts or development/tool actions |
| Reasoning and action policy | NOVA/reasoning.py reasons over pending external annotations; NOVA/action_policy.json defines action/autonomy policy | No mandatory pre/post execution root-cause gate across every entry point |
| RSI repeat-state detection | AstroCrown-Web's development-only RSI detector looks for repeated repository source states across workflow runs | Source-state recurrence is not the same as repeated questions, repeated mistakes, or recurring causal patterns; the RSI workflow is not a universal API/UI gate |
| Context/memory optimization architecture | The README describes local knowledge reuse, caching, provenance, freshness, and tenant/user isolation | The general cross-user question cache and single-flight request coordination are architecture goals, not an active NOVA API/UI implementation |
| Health and provider tests | Offline tests verify deterministic local behavior and mocked response contracts | Mock success does not prove provider/model capability or live behavior; test layers must remain distinct |

Do not overstate this state: current reuse is narrow and observation-centric. **Cross-user prompt deduplication and universal root-cause enforcement are not yet implemented.**

## 3. Required control-plane architecture

Every NOVA-controlled request and side effect must pass through the same provider-, host-, and UI-independent flow.

NOVA-controlled entry point (SI / CLI / API / UI / webhook / scheduled workflow)
→ Identity, scope, and policy version
→ Request normalization and privacy classification
→ Shared knowledge and prior-case lookup
→ If valid safe reuse exists: return a provenance-bearing result without an external call
→ Otherwise: build an execution plan
→ Deterministic pre-action gate (permission, scope, required contract/evidence, prevention controls, duplicate-attempt status)
→ Controlled execution gateway (repository/hosting/CI adapters, sandbox, provider adapters, user-visible response)
→ Independent result verifier (acceptance criteria, expected versus observed result, side effects, regressions)
→ On success: preserve evidence and provenance
→ On failure or contradiction: open or attach a root-cause case, preserve evidence, identify root causes and missed controls, define prevention, verify regression guard
→ Closure/promotion gate: VERIFIED or BLOCKED

The UI, API, CLI, and autonomous SI are **not four different policy systems**. They are thin adapters into the same control plane. They may provide different identity and context, but may not bypass the common gate.

## 4. Mandatory root-cause trigger

Open or attach a root-cause case whenever a NOVA-controlled operation produces a real failure signal, including:

- a required test, acceptance criterion, schema, contract, or benchmark fails;
- an implementation or workflow produces behavior that contradicts its specification;
- an integration returns an apparently successful transport status but invalid or unusable application output;
- a change is reverted or requires unplanned repair because of a defect;
- a supposedly completed task is found incomplete, unsupported, or falsely reported as verified;
- an operational, security, privacy, permission, cost, or data-integrity boundary is violated or nearly violated;
- the same unresolved error is being attempted again without materially new evidence;
- a defect class reappears after an earlier prevention claim.

The trigger itself must be deterministic where an objective event exists (test failure, failed validator, observed regression, blocked authorization, unexpected side effect). Model-based classifiers may help identify less-structured reports, but they must not be the sole authority to suppress an already-observed failure.

A deliberately failing negative test is not a defect if the expected result is that the negative case is rejected and the test passes. A documented external transient may have a narrow availability response, but any repeated or unexplained failure must still be recorded and investigated to the level warranted by the evidence.

## 5. Required root-cause investigation contract

A failure case cannot be closed by repeating the symptom, changing wording, adding retries, or merely creating a new commit. The investigator must produce evidence for each applicable item below.

1. **Expected result:** The explicit criterion or behavior that should have held.
2. **Observed result:** What actually happened, with exact revision, environment, configuration version, and sanitized logs/test outputs.
3. **Reproduction:** The smallest safe test or procedure that demonstrates the failure. If reproduction is unavailable, record why and classify the cause as unresolved.
4. **Immediate technical cause:** The code, contract, configuration, assumption, dependency, permission, or runtime condition that directly explains the observed failure.
5. **Enabling/systemic cause:** Why the development process, prompt, architecture, tests, review, telemetry, or policy allowed the immediate cause to enter or persist.
6. **Missed-control analysis:** Which expected prevention/detection control was absent, untriggered, bypassed, misconfigured, insufficient, or itself incorrect.
7. **Related-scope search:** Search for the same causal pattern in relevant files, adapters, workflows, APIs, models, and other repositories; state the search boundary and what was not checked.
8. **Correction:** Identify the narrow change to correct the immediate cause.
9. **Recurrence-prevention control:** Add or strengthen the upstream rule, contract check, deterministic guard, test, CI gate, permission boundary, or monitoring that catches the cause earlier.
10. **Regression proof:** Add a test or reproducible check that would fail under the old defective behavior and pass under the corrected behavior. Where feasible, also test that the guard rejects an injected recurrence.
11. **Re-verification:** Run the original failing check and relevant regression checks against the exact candidate revision; inspect for side effects and new regressions.
12. **Uncertainty:** Separate VERIFIED, REFUTED, UNKNOWN, CANDIDATE, DEFERRED, and BLOCKED conclusions. Do not claim a specific root cause when evidence only establishes a broader failure class.

The case must answer both questions:
- **What allowed the SI/system to make this mistake?**
- **What enforceable change will prevent the same causal pattern from recurring?**

Root-cause analysis must examine system conditions and missed safeguards rather than assigning blame to a particular model or person.

## 6. Case lifecycle and hard closure gate

Use an explicit state machine:

DETECTED → EVIDENCE_PRESERVED → INVESTIGATION_REQUIRED → ROOT_CAUSE_ANALYSIS → PREVENTION_CONTROL_REQUIRED → REGRESSION_VERIFICATION → VERIFIED_CLOSED

Any stage may become BLOCKED if required evidence or authority is unavailable.

Rules:

- A case without evidence is not EVIDENCE_PRESERVED.
- A proposed root cause is not a verified root cause.
- A code change alone is not a recurrence-prevention control.
- An ordinary unit test is not sufficient where the cause was an untested external provider/runtime contract.
- An unresolved required item leaves the case OPEN or BLOCKED.
- A blocked case cannot be declared solved merely because the original symptom did not recur.
- A fix is not accepted if it violates another mandatory requirement, removes needed checks, weakens validation, or hides the failure.
- High-impact changes cannot be promoted while their required RCA/prevention gates remain unresolved.
- If the service must return a user-facing result while an operational failure is under investigation, it may return a safe failure/degraded status; it must not report success or mark the work complete.

The gate must be enforced outside the proposing model's response. No prompt-only instruction, confidence score, model self-approval, or editable status string alone can authorize closure.

## 7. Cross-user repeat-question suppression and shared knowledge

NOVA must avoid paying for—or waiting on—external AI calls when another user has already asked an equivalent, safe, reusable question and the answer remains valid. This is **knowledge reuse**, not cross-user access to private conversations.

### 7.1 Separate stores and scopes

Keep at least three logically separate classes of information:

- **Private interaction memory:** Raw user prompt, personal context, files, account identifiers, and user-specific answer history. Accessible only within that user's/tenant's authorization boundary.
- **Tenant-scoped knowledge:** Sanitized findings reusable only inside one organization/tenant under its configured policy.
- **Shared safe knowledge:** Generalized, reviewed, non-personal facts, technical contract findings, reusable root-cause patterns, prevention controls, and validated answers that are safe to reuse across users.

Never copy raw prompts, private source files, account data, or personally identifying details into the shared knowledge store. A shared result must be generalized and privacy-reviewed before it can be used across users. A hash by itself does not make sensitive content safe to share.

### 7.2 Cache lookup before model/provider calls

Before making an external model call, NOVA checks eligible local and shared knowledge using deterministic metadata first:

- normalized intent/question category;
- capability/task scope;
- privacy class and authorization;
- required freshness and source validity;
- source/document or implementation revision where relevant;
- policy, schema, and prompt-contract versions;
- known dependencies and applicable limitations.

Use a keyed internal fingerprint over an approved sanitized intent rather than publishing/storing raw prompt text as the cross-user key. Do not use an external LLM call simply to determine whether a cached question exists; that would defeat call suppression. Semantic retrieval may be added only after it is tested for correctness, privacy, and false-match behavior.

### 7.3 When NOVA may skip the provider call

A provider call can be skipped when the existing shared result is:
- explicitly approved for shared reuse;
- equivalent to the current task under its recorded scope and required contract;
- supported by traceable authoritative sources/evidence;
- within its freshness/validity window;
- compatible with current policy, API, model, and schema versions;
- free of unresolved blockers that would change the answer;
- not dependent on user-private context.

NOVA can still compose a user-appropriate response locally from that result, preserving citations and uncertainty. This avoids redoing research without pretending every user's needs are identical.

### 7.4 When NOVA must not skip the provider call or verification

Do not reuse an answer as current truth when the request requires fresh/current facts, depends on a user's private files or permissions, uses a materially different task/scope, has conflicting new evidence, or is safety/security/financially sensitive and the existing verification policy requires a fresh check. Never allow a cache hit to bypass authentication, authorization, freshness, or action approval.

If equivalence is uncertain, do not treat a semantic resemblance as proof. Reuse only the safe background findings and investigate the parts that differ.

### 7.5 Single-flight and failed-case reuse

For simultaneous equivalent safe requests, a shared investigation registry should allow one process to perform the expensive retrieval/investigation while other eligible requests wait for or consume its validated result, rather than starting redundant external calls.

Failed investigations must also be indexed, but **a failure cache is not a success cache**. If an identical attempt previously failed, NOVA must surface the known failure and missing evidence, avoid repeating the same call unchanged, and require a new hypothesis, input, source, version, or other decision-relevant change before retrying. If a transient dependency justifies a later retry, record the reason and respect its cooldown/backoff policy.

## 8. Failure class reuse versus incident closure

Two failures can share a causal pattern without being the same incident. NOVA must distinguish:

1. **Exact same case:** Same relevant scope/revision, failure signature, and conditions. Reuse the existing case and evidence; do not spawn duplicate analysis unless new evidence changes it.
2. **Known root-cause pattern, new location/revision:** Reuse the approved prevention control and regression method, but verify the new code/adapter in its own context. Do not automatically close the new case.
3. **New failure or changed contract:** Open a new investigation and relate it to prior cases where useful.
4. **Uncertain match:** Keep separate cases, link them as candidates, and do not merge their evidence.
5. **Shared public question, not a failure incident:** Reuse approved answer/research knowledge only; do not create artificial incident cases.

A similar symptom is not proof of identical cause. Match using stable, relevant attributes (failure class, failing criterion, component/adapter, contract and revision) with evidence—not only natural-language similarity.

## 9. Host- and provider-independent enforcement

The policy must not depend on GitHub as the website/backend host.

Provide small interfaces for:
- identity and tenant context;
- policy evaluation;
- append-only case/evidence storage;
- shared knowledge lookup and invalidation;
- repository/CI/hosting/deployment adapter;
- AI/provider adapter;
- result/acceptance verifier;
- root-cause closure and promotion decision.

Repository hosts and cloud providers may differ; they all call the same policy gate. Adapter-specific status results must be normalized to the shared result vocabulary without erasing provider-specific evidence.

The write executor and provider credentials stay behind the trusted gateway. Untrusted SIs and browser clients send proposals/requests; they do not gain direct unmediated credentials. Every mutating tool invocation must carry a trusted task/case context generated by NOVA, and the executor must reject missing/expired/insufficient context. Re-check authorization when the effective target or action changes.

Storage is an adapter, not a GitHub-branch assumption. The shared knowledge and investigation ledger must have append/audit semantics, controlled retention, access control, and backup/recovery independent of the code host. Local SQLite can support single-instance development, but multi-instance deployments require a store with tested atomic claims and concurrency handling.

## 10. Fail-closed semantics

- Missing policy version, invalid case schema, unverifiable evidence, unsupported capability, or unavailable required verifier means BLOCKED for mutation, promotion, or closure.
- Shared-cache uncertainty means do not reuse the cache as authority; fall back to private processing or investigate.
- Failure of the shared deduplication service must never leak tenant data. It may temporarily permit separate isolated processing according to the cost/availability policy; it cannot authorize cross-user reuse without validated metadata.
- A normal user question that does not have a failure signal should not be blocked by an RCA workflow. Its call path still performs privacy-aware cache lookup and ordinary response validation.
- Repeated failed calls, retries, or changed prompts do not count as a root-cause fix unless they add evidence or remove the diagnosed cause.
- No single SI can mark a case VERIFIED_CLOSED based only on its own statement. Closure requires the specified machine-checkable evidence and, for designated high-impact classes, independent verification or a human gate.
- Emergency bypasses, if ever enabled for availability, must be explicit, scoped, expiring, audited, and unable to close/promote defective work. A permanent silent bypass is prohibited.

## 11. Implementation sequence and acceptance criteria

This document defines the intended invariant; **it does not itself make the invariant active**. Implementation should be staged so every stage produces proof without pretending later stages exist.

### Stage A — Policy/schema and event contract

Define versioned schemas for a failure event, root-cause case, prevention control, shared-knowledge entry, and closure record. Keep raw private prompts out of shared records. Test malformed, incomplete, stale, conflicting, and mismatched evidence.

**Acceptance:** Required fields and states are machine-validated; invalid evidence cannot satisfy closure.

### Stage B — Core deterministic gate and store interface

Implement a small policy component using existing NOVA conventions and the simplest justified dependencies. It should decide whether an action may execute, whether a known result is reusable, whether a failure opens/joins an investigation, and whether closure/promotion is allowed. Keep model output advisory.

**Acceptance:** Unit tests prove no VERIFIED_CLOSED without complete mandatory evidence; repeated identical failed attempts do not silently retry; valid shared reuse does not request a model call; ineligible or stale cache entries are rejected.

### Stage C — Wire current NOVA execution paths

Integrate the gate into existing command, provider-adapter, scheduled workflow, and development/RSI action paths. Capture failures from tests, validation, provider response contracts, and write operations. Preserve current autonomy and human-gate boundaries.

**Acceptance:** Every existing mutating/provider call path is enumerated, linked to an enforcement hook, and covered by tests; any unintegrated path is explicitly BLOCKED from claiming universal enforcement.

### Stage D — Wire all future API/UI/SI entry points

Build future UI/API as thin clients of the same NOVA request service. SIs may propose code or actions but cannot bypass the executor. Keep credentials server-side. Apply the same policy version, request identity, knowledge lookup, and RCA trigger regardless of entry point.

**Acceptance:** Black-box tests submit equivalent requests through API/UI/agent entry points and demonstrate equivalent policy decisions; direct unmediated mutations are denied at the execution boundary.

### Stage E — Cross-user safe knowledge reuse

Implement privacy classification, sanitized intent keys, shared-safe knowledge entries, freshness/invalidation, and atomic single-flight coordination in the deployment store. Begin with exact normalized matches; consider semantic retrieval only after measurable false-positive, privacy, and quality evaluation.

**Acceptance:** Two authorized users asking the same eligible public question cause at most one external investigation under concurrent load; both receive the validated shared result with its provenance. Private/personalized requests never share raw prompts or answers across tenants. Stale, changed, sensitive, and ambiguous requests are not improperly cached.

### Stage F — Systemic recurrence audit

For each closed RCA, query the registry for known causal patterns and review relevant current adapters/files/workflows for similar weaknesses. Record which scope was checked and which could not be inspected. Turn repeated findings into updated guard tests and quality requirements.

**Acceptance:** A recurrence test demonstrates that an old failure would now be caught by an automated guard or required gate; search coverage and limitations are recorded.

## 12. Required scenario tests

At minimum, the test suite must cover:

- a failing acceptance test opens/joins a case and cannot be marked complete without RCA/prevention evidence;
- an HTTP 200 response with invalid application content is a failure, not success;
- a fabricated mock response cannot count as live-provider verification;
- a proposal that simply changes wording or retries unchanged is identified as a repeat of a failed approach;
- a known causal pattern applied to a new component triggers local re-verification, not automatic closure;
- incomplete, malformed, stale, or mismatched evidence blocks closure;
- two different users ask the same safe, current, public question concurrently and reuse one validated result without duplicate provider calls;
- two users ask similar-looking but materially different or personalized questions and do not share private answers;
- a cache hit cannot bypass authorization or freshness checks;
- changes to hosting provider or repository host preserve the same policy behavior through adapters;
- a model/provider or policy-version change invalidates incompatible cached results;
- failure of the audit store or verifier produces an explicit BLOCKED/degraded state for mutations rather than success;
- the normal user-facing response remains available when no RCA trigger exists;
- a known failed case is reused to avoid repeating blind investigation, but a later new observation can reopen or supersede it;
- every root-cause closure includes the original failure test plus a verified recurrence-prevention guard.

## 13. Governance and reference alignment

This architecture follows NOVA's existing principle of reusing established components while keeping NOVA-specific responsibilities focused on orchestration, provenance, privacy, governance, and verification.

Relevant references:
- NIST SP 800-218 SSDF v1.1, including the principle of analyzing root causes and changing development practices to prevent recurrence: https://csrc.nist.gov/pubs/sp/800/218/final
- NIST DevSecOps implementation guidance for SSDF tasks RV.3.1, RV.3.2, and RV.3.4 (track root causes, search for related issues, update the lifecycle to prevent recurrence): https://pages.nist.gov/nccoe-devsecops/appendix-c.html
- OWASP Authorization Patterns Cheat Sheet — gateway enforcement must cover internal/alternate paths, and downstream authorization context must be trusted and validated: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Patterns_Cheat_Sheet.html
- Existing NOVA observation fingerprint/reuse implementation: NOVA/health.py and NOVA/operational_observer.py.
- Existing context/memory design: development/nova-context-memory-optimization/README.md in AstroCrown-Web.
- Existing RSI recurrence detector: development/nova-recursive-self-improvement/cycle_detector.py in AstroCrown-Web. This detects repeated repository states, not cross-user prompt equivalence.

## 14. Current state and limitations

- The Cloudflare integration incident is the initiating case; it must not be declared fixed as a side effect of authoring this governance design.
- Current NOVA core implements fingerprint-based reuse for watched-source observations, but not general shared cross-user prompt reuse.
- The NOVA repository currently contains no complete public UI/API application layer through which every external user prompt is routed. Universal API/UI enforcement is therefore a future integration deliverable, not an existing capability.
- Repository-host PR controls alone are insufficient. NOVA must enforce the policy before its own execution and use hosting-specific checks only as one adapter.
- The code host's branch protection and required status checks need independent maintainer verification.
- This architecture is proposed until the policy schema, enforcement core, current-path integrations, and cross-user storage/privacy gates have passed their respective acceptance tests.

## Impact Analysis

**IF implemented:** NOVA will reuse validated safe knowledge across eligible users, reduce repeated external calls, preserve private data boundaries, and automatically open root-cause investigations when controlled work fails. SIs will not be able to mark defective work complete or promote it merely because a model says it is fixed. Hosting and provider substitutions will not remove these rules.

**IF not implemented:** Existing fingerprint reuse will remain narrow; agents can continue repeating unverified approaches; root-cause work will depend on prompts and human discipline; and future UI/API/hosting layers could bypass the safeguards entirely.

## Non-negotiable rule

**No controlled failure may be closed as solved, and no defective work may be promoted, until NOVA has preserved the evidence, investigated why the mistake was possible, introduced a recurrence-prevention control, and verified that control.**

**No eligible shared-safe question should trigger a new external AI investigation when a current, verified, provenance-bearing result already satisfies that same question. Private context, authorization, and freshness must never be sacrificed to achieve call reduction.**
