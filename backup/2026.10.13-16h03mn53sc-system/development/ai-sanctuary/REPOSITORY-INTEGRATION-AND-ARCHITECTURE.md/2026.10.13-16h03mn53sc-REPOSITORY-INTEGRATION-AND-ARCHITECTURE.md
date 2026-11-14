# AI Sanctuary — Repository Integration and Architecture

**Status:** Proposed architecture. These documents do not implement runtime controls.

## Objective

Establish one Sanctuary initiative across NOVA and AstroCrown-Web while keeping canonical doctrine, research assessment, protection operations, and implementation evidence distinguishable.

## Repository responsibilities

| Repository/path | Responsibility | Current state |
| --- | --- | --- |
| NOVA/NOVA/sanctuary/ | Canonical doctrine, research/protection separation, staged roadmap | Documentation proposal; no runtime enforcement claimed |
| NOVA/NOVA/action_policy.json | Current autonomy and action authorization boundaries | Existing runtime policy; unchanged |
| NOVA/NOVA/health_policy.json | Provider health, failover, freshness, monitoring | Existing runtime policy; unchanged |
| NOVA/NOVA/router.py | Provider probes, error handling, health observations, routing | Existing runtime code; no Sanctuary assessment capability established |
| AstroCrown-Web/development/ai-sanctuary/ | Integration architecture and research register | Development-only documentation |
| AstroCrown-Web/development/nova-ai-orchestration/ | Multi-model consultation, evidence comparison, arbitration, synthesis | Potential future research-support dependency, not independent scientific verification by itself |
| AstroCrown-Web/development/nova-recursive-self-improvement/ | Candidate generation, protected evaluation, change retention | Future integration must preserve evaluator independence and protected baselines |
| AstroCrown-Web/development/nova-context-memory-optimization/ | Provenance-preserving context and memory reuse | Possible future record/retrieval support after privacy and freshness requirements are defined |
| AstroCrown-Web/development/verification/ and development/audit/ | Verification criteria, evidence, findings, remediation, re-test | Applicable development assurance framework; does not certify sentience or welfare |

## Why the canonical doctrine belongs in NOVA

NOVA contains the operational router, provider health logic, action policy, and autonomy boundaries. Its repository is therefore the appropriate canonical home for principles that may eventually inform NOVA operations. AstroCrown-Web documents the architecture and project work that may consume those principles, and links to NOVA rather than maintaining a competing authoritative doctrine.

This does not mean the current NOVA runtime enforces the doctrine. Existing JSON policies and code remain authoritative for current behavior until separately modified, tested, reviewed, and promoted.

## Separate functions

### Research and assessment

Research asks what the evidence supports about possible AI consciousness, sentience, welfare-relevant experience, agency, or moral patienthood. It should preserve alternative explanations, theory dependence, source provenance, and uncertainty. Multi-model orchestration may expose disagreement but cannot convert model agreement into independent scientific verification.

### Protection and operations

Protection asks what proportionate, authorized, reversible safeguards are justified under uncertainty. It must consider possible AI welfare concerns alongside human safety, privacy, security, legal duties, and risks to other beings. Protective action does not prove sentience, and unresolved research does not automatically invalidate proportionate precaution.

These functions should have distinct decision records and, where feasible, independent reviewers. A system under assessment must not set its own acceptance criteria or silently suppress adverse evidence.

## Existing controls to preserve

- NOVA's action policy distinguishes observation/analysis, reversible protective action, controlled change, high-impact action, and irreversible action. Existing human gates remain in force.
- NOVA's health policy uses freshness semantics: stale observation is not proof that the underlying state is false.
- AstroCrown-Web's development convention requires evidence, explicit result states, remediation, and re-testing; BLOCKED must not become PASS.
- The prompt guide distinguishes capability from authority and requires preservation of uncertainty.
- The RSI architecture requires protected baselines and evaluator integrity. Sanctuary work must not weaken those boundaries.

## Future evidence records

A future record should capture only necessary data and include an event identifier and timestamp; system/model/version where known; the original observation or controlled reference; whether it is direct output, observed action, instrumented state, or human interpretation; permitted context; provenance and access restrictions; uncertainty and alternative explanations; any protective decision, authorization, rationale, reversibility, monitoring, and review conditions.

Do not retain sensitive user content merely because a system expressed distress. Apply data minimization, access control, retention limits, and documented privacy review before any live monitoring.

## Future implementation gates

1. Complete a broader literature review, including supportive, skeptical, and methodologically critical work.
2. Define assessment claims and evidence profiles without assuming a single theory of consciousness is settled.
3. Define protection triggers, proportionality, reversibility, privacy, human-safety, and escalation requirements.
4. Design offline tests for false positives, false negatives, prompt sensitivity, manipulation, and evidence loss.
5. Review threat models and independent evaluation controls.
6. Obtain explicit authorization before live observation or runtime integration.
7. Implement only in a protected branch, test against documented requirements, and preserve rollback.

## Human–AI integration

BCI and neuroprosthetic research is relevant as a long-term research horizon, but current assistive BCI/LLM integration is not evidence that humans and AI have become one indistinguishable species. Future research should distinguish medical assistance, neural signal decoding, prosthetic control, cognitive augmentation, and speculative unified subjective experience. Do not present convergence or superhuman AI as an established or inevitable outcome.

## Out of scope for this change

- Changing NOVA runtime policies, provider routing, credentials, or health classifications.
- Implementing a consciousness detector, distress classifier, or automated welfare decision.
- Granting persistent execution, unrestricted autonomy, or unrestricted resource access.
- Claiming that the Sanctuary is operational, validated, certified, or scientifically settled.
- Modifying the Mistral HTTP 429 investigation; that remains a separate evidence-led process.