# AstroCrown Web Development & Audit Convention

## 1. Purpose

This convention defines the development and verification method for AstroCrown Web.

It is intended to keep implementation, testing, security verification, evidence, findings, remediation, and re-testing traceable to recognized external standards rather than to an ad-hoc project checklist.

This convention applies to development work performed inside `development/`.

The regular website at the repository root is not modified by this convention unless and until a verified development result is intentionally promoted.

## 2. External Reference Standards

### 2.1 Secure development

Primary reference:

- NIST SP 800-218, Secure Software Development Framework (SSDF) Version 1.1.

Use SSDF as the development-process reference for secure development practices, risk reduction, vulnerability prevention, and recurrence prevention.

Reference:
https://csrc.nist.gov/pubs/sp/800/218/final

### 2.2 Web application security verification

Primary reference:

- OWASP Application Security Verification Standard (ASVS) Version 5.0.0.

Use the stable ASVS release as the principal application-security verification reference for the web application.

ASVS requirement references must include the version, using the form:

`v5.0.0-<chapter>.<section>.<requirement>`

Example:

`v5.0.0-1.2.5`

Do not use an unversioned ASVS identifier when recording an audit result.

Reference:
https://owasp.org/projects/asvs

### 2.3 Software product quality

Quality reference:

- ISO/IEC 25010:2023, Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — Product quality model.

Use this as the reference model for software/product quality characteristics where applicable.

Reference:
https://committee.iso.org/standard/78176.html

ISO/IEC 25010 is a reference model, not a claim of ISO certification.

## 3. Methodology

Development follows this traceable sequence:

Requirement
→ Design / decision
→ Implementation
→ Automated verification
→ Manual verification
→ Security verification
→ Quality verification
→ Evidence
→ Finding or pass
→ Remediation
→ Re-test
→ Promotion

A verification result must not be considered closed merely because code was changed.

A finding is closed only after the applicable verification has been repeated and the result supports closure.

## 4. Requirement Traceability

Each auditable requirement or project requirement should be traceable to:

- requirement identifier or project requirement;
- external standard reference, when applicable;
- affected file/component;
- verification method;
- evidence;
- result;
- finding identifier, if applicable;
- remediation;
- re-test result.

Where no external standard directly applies, identify the criterion as a project-specific requirement rather than presenting it as an external standard requirement.

## 5. Verification Methods

Use the least complex verification method that provides sufficient evidence.

Possible methods include:

- static inspection;
- automated test;
- HTML/CSS/JavaScript validation;
- browser functional testing;
- responsive-layout testing;
- accessibility testing;
- security testing;
- dependency/component analysis;
- manual inspection;
- negative testing;
- regression testing;
- reproducibility testing.

No single automated tool is considered sufficient to establish overall correctness or security.

Automated findings require interpretation and, where appropriate, manual confirmation.

## 6. Evidence Convention

Every significant verification should produce or reference evidence sufficient for another person to understand what was tested and what was observed.

Evidence may include:

- test output;
- command/tool result;
- browser observation;
- captured page state;
- source-code reference;
- repository commit;
- reproducible test procedure;
- relevant log;
- before/after comparison.

Evidence must identify the version or commit against which it was produced whenever that distinction matters.

Do not claim that a test was performed when no evidence or reproducible basis exists.

## 7. Result States

Use only these primary verification states:

- PASS — the applicable criterion was tested and the evidence supports the requirement.
- FAIL — the criterion was tested and the evidence demonstrates that the requirement is not satisfied.
- N/A — the criterion genuinely does not apply; record the reason.
- BLOCKED — the criterion could not be tested because a required dependency, environment, capability, or evidence source was unavailable.

Do not convert BLOCKED into PASS.

Do not silently omit an applicable requirement.

## 8. Findings

A finding should contain, at minimum:

- Finding ID
- affected component/file
- criterion or reference
- observed condition
- expected condition
- evidence
- reproduction method
- impact/risk description
- status

Severity must be based on documented impact and evidence rather than on intuition or appearance.

If a severity model is needed, its definition must be recorded before it is used to classify findings.

## 9. Remediation and Re-test

A remediation should identify:

- the finding being addressed;
- the change made;
- affected files/components;
- the verification required after the change.

After remediation:

1. repeat the original failing verification;
2. verify that the failure is resolved;
3. perform relevant regression checks;
4. record the new evidence;
5. close the finding only when the evidence supports closure.

A fix that creates a new failure remains unresolved.

## 10. Change Discipline

Development should minimize unnecessary code and structure.

Before adding code, determine whether the required behavior can be achieved with existing code or a simpler implementation.

Avoid:

- duplicate mechanisms;
- redundant event listeners;
- unnecessary dependencies;
- speculative abstractions;
- compatibility code without a demonstrated requirement;
- temporary fixes that become permanent without review;
- development artifacts outside `development/`.

Every added mechanism should have an identifiable purpose.

## 11. Technology and Implementation Candidate Evaluation

When multiple technologies, libraries, implementation approaches, or code candidates are considered, evaluate them using evidence-based verification rather than numerical scoring.

Use only these result states:

- PASS — the candidate satisfies the applicable criterion and the evidence supports that conclusion.
- FAIL — the candidate was tested and does not satisfy the applicable criterion.
- N/A — the criterion genuinely does not apply; record the reason.
- BLOCKED — the criterion could not be verified because required evidence, capability, or environment was unavailable.

Do not use:

- point scores;
- weighted averages;
- compensating scores;
- percentage-based acceptance;
- rankings or tiers as substitutes for requirement verification.

Mandatory criteria are eligibility gates. A candidate with a mandatory FAIL is not eligible for implementation. A mandatory BLOCKED result prevents a final acceptance decision until the missing evidence is obtained or the criterion is otherwise resolved. N/A requires a recorded justification.

Candidate evaluation follows:

Requirement
→ Candidate
→ Test
→ Evidence
→ PASS / FAIL / BLOCKED / N/A
→ Eligibility decision
→ Implementation
→ Re-test

Where several candidates satisfy all mandatory requirements, the decision should be based on the documented project requirements and evidence, including simplicity, maintainability, security, performance, compatibility, and unnecessary complexity where applicable. The purpose is to identify a candidate that satisfies the requirements with the least unnecessary mechanism, not to manufacture a numerical measure of quality.

Candidate evaluations should use the template in development/audit/templates/CANDIDATE-EVALUATION.md.

## 12. Development / Regular Website Boundary

Development work belongs under:

`development/`

The regular website remains at repository root.

Development files must not be treated as production/public website files merely because they work locally.

Promotion from development to the regular website is a separate controlled action and requires verification against the applicable criteria before promotion.

## 13. Audit Record Convention

When an audit record is created, use the following minimum structure:

### Scope

What is being examined?

### Criteria

Which project requirements and external references apply?

### Method

How was each criterion verified?

### Evidence

What demonstrates the observed result?

### Result

PASS / FAIL / N/A / BLOCKED

### Findings

What conditions require remediation?

### Remediation

What was changed?

### Re-test

What was tested after remediation and what was the result?

### Closure

Why is the finding considered closed, or why does it remain open?

## 14. Reference Version Policy

Use stable, explicitly identified versions for audit baselines.

Current baseline:

- NIST SSDF: SP 800-218, Version 1.1
- OWASP ASVS: Version 5.0.0
- ISO/IEC 25010:2023

If a reference standard changes, do not silently replace the baseline.

Record the new version and determine whether existing verification records need re-evaluation.

## 15. Important Limitations

Using these references does not constitute certification or accreditation.

AstroCrown Web must not claim:

- NIST certification;
- OWASP certification;
- ISO certification;

merely because these references are used.

The project may state that its development and verification process uses the identified standards as reference criteria when that statement is accurate.

## 16. Cross-Repository Engineering Quality Gate

The controls in this section and Section 17 are the minimum shared baseline for cross-repository work that explicitly adopts this convention, including AstroCrown, NOVA, and related project repositories. A target repository's stricter rules take precedence. This extension does not authorize changes to a target repository or bypass that repository's merge, security, deployment, or approval requirements.

Every non-trivial change must have observable acceptance criteria and use the least complex verification that actually proves them. The following are separate evidence classes and must not be conflated:

- **Static/source verification:** syntax, types, schema, YAML/workflow validity, linting, or code review.
- **Unit verification:** deterministic logic under controlled test inputs.
- **Contract verification:** request/response/configuration behavior against documented contracts and representative positive/negative fixtures.
- **Integration verification:** real interaction with the external dependency, service, model, browser, or runtime.
- **Promotion verification:** exact candidate commit and required CI gates have passed before merge/deployment/activation.

A passing unit test does not prove live-provider compatibility. An HTTP 2xx does not prove application-level correctness. A code change does not close a finding. Record which evidence class was run and which remains BLOCKED.

For AI-generated or AI-assisted changes, generated code is an untrusted candidate until the exact diff has been inspected, the acceptance criteria have been tested, and relevant regressions have passed. The model that generated the code is not independent validation of that code.

### Change acceptance checklist

Before implementation:

1. State the intended outcome, scope, preservation constraints, risks, and measurable acceptance criteria.
2. Inspect existing code, tests, project conventions, dependencies, workflows, and prior findings before creating a parallel mechanism.
3. For external behavior, establish the actual source-of-truth contract before coding (Section 17).
4. Identify the minimum tests and required evidence; distinguish offline tests from any live test.

Before promotion:

1. Inspect the complete diff, including tests, workflow triggers/permissions, logging, dependency changes, and documentation claims.
2. Run all required checks against the exact candidate commit, not a preceding commit.
3. Ensure the relevant CI workflow actually triggers for each changed source/config/workflow file.
4. Require the target repository's established review and main-branch gate. Do not assume the gate exists merely because a workflow file exists.
5. Record remaining failures, unknowns, and blockers. Do not promote an unresolved candidate by changing the test to match the implementation.

A trivial documentation correction may require only review and link/format checking. A provider/model contract change requires documented capability evidence and appropriately separated offline and integration tests. Apply proportionate gates rather than requiring a full production test for every low-risk change.

## 17. External API, SDK, Platform, and AI-Model Contract Gate

Before implementing or changing an API, service, library, model, SDK, workflow integration, GPU runtime, or externally controlled interface, create or update a small contract record in the change plan or audit record. At minimum it must identify:

The NOVA-owned proposal for universal root-cause enforcement and cross-user safe knowledge reuse is tracked in [NOVA PR #85](https://github.com/ACROWN-System/NOVA/pull/85). Until that design is implemented and wired into every supported entry point, it is a proposal—not an active universal enforcement guarantee.

- provider/platform and exact endpoint or API/version;
- exact library/SDK and version, when used;
- exact model or capability identifier, when relevant;
- authentication and required configuration names (never secret values);
- request fields, supported constraints and documented response semantics;
- the specific capability required by the application (for example JSON Mode, strict JSON Schema, tool calls, vision, structured output, or token-budget semantics);
- the authoritative source URL(s), date checked, and any conflicts or missing evidence;
- cost, quota, no-payment-method, licence, and other project eligibility constraints where relevant.

### Source hierarchy

Prefer current official API documentation, provider-maintained SDK documentation/examples, official model capability lists, and official changelogs. Inspect established community implementations only as secondary evidence or a source of hypotheses; confirm important behavior with authoritative documentation and tests. A package being popular or “OpenAI-compatible” does not establish support for every parameter or model capability.

Prefer an official or widely maintained SDK/client when it accurately supports the target endpoint and fits the project's dependency, licensing, and resource constraints. If direct HTTP is the simpler or safer choice, record the reason and validate the exact documented contract. This rule does not require adding a dependency merely to avoid the standard library.

### Model- and feature-specific capability gate

Capabilities belong to a specific model/provider/API combination, not to a model family or an endpoint in general. Do not infer that a model supports JSON Mode or strict schema output because it can return ordinary text or accepts a chat-completions request.

When a required capability is absent from the provider's current supported list or remains unverified, classify the model/task pairing as BLOCKED or CANDIDATE. Do not label it compatible, healthy, or production-ready until evidence satisfies the actual acceptance criterion. If ordinary text is acceptable, define and test that different contract explicitly; do not silently weaken a stricter requirement to make a test pass.

### Shared implementation and test gate

- Reuse the production adapter/request-contract module for smoke and integration testing wherever practical. Do not maintain a separate inline implementation of the same API contract without a documented reason.
- Keep unit tests deterministic and offline; include malformed/missing response fields and relevant error paths.
- Use response fixtures based on official examples and sanitized observed behavior. An invented “ideal” response fixture tests application logic only; it is not evidence that the external service behaves that way.
- Run a controlled live integration test only where authorized and safe. Never expose production secrets to untrusted pull-request code or print raw credentials/model inputs/outputs by default.
- Record HTTP transport status separately from response-shape validity, application-level validity, model capability, entitlement, and quota. These are different dimensions.
- For a failed experiment, change one material variable at a time where practical. Each repeat run must answer a new, stated question. Inspect the prior evidence first; if the next run cannot distinguish the hypotheses, research or classify the matter UNKNOWN/BLOCKED instead of asking for another speculative retry.

### CI, branch, and release gate

Workflow/configuration changes are code changes. CI path filters must cover relevant workflow/configuration files or use a broader reliable trigger. A workflow that only runs after a commit is not a merge gate by itself. For important repositories, configure and verify PR-required main-branch changes and the correct required status checks. When repository settings cannot be inspected, record the configuration as BLOCKED and do not claim it is enforced.

Live external integration tests may need different secret and permission treatment from ordinary PR tests. Do not execute arbitrary/untrusted candidate code with production credentials merely to obtain a live result. Use a reviewed trusted workflow, least-privilege secrets and a protected environment; otherwise document the limitation and retain an explicit integration/promotion gate.

## 18. Core Rule

The audit system exists to establish evidence, not reassurance.

A result must follow the evidence.

If evidence demonstrates a failure, record the failure.

If evidence is insufficient, record BLOCKED rather than assuming success.

If a requirement does not apply, record N/A with its reason.

If a change is made to resolve a failure, re-test it.

## 19. Persistent Investigation, Alternative Paths, and Continuity

The objective is to exhaust plausible, material investigation paths within the stated scope and constraints—not to stop after the first convenient explanation, successful automated check, unavailable tool, or initial risk label. Persistence means controlled progress supported by evidence, not blind repetition or unbounded experimentation.

### Investigation setup and candidate coverage

Before substantive work, record or update an auditable work record containing:

- the intended outcome, scope, acceptance criteria, preservation boundaries, and current source commit/version;
- known facts, assumptions, unknowns, and competing explanations;
- plausible solution and verification paths, including materially different alternatives and negative/adversarial cases;
- evidence already available, what each item proves, and what it does not prove;
- each attempted action/test, its result, the evidence reference, and the hypotheses it supports or rules out;
- remaining paths, unresolved risks, exact blockers, and the next concrete action;
- the conditions that justify closure, promotion, escalation, or a finding that remains BLOCKED.

Inspect existing documentation, implementation, test fixtures, issues, prior attempts, failures, dependencies, workflows, deployment records, and backups where relevant before repeating work or creating a parallel mechanism. Preserve contradictory evidence rather than forcing premature agreement. Do not discard an approach solely because its first description appears impossible, unlawful, unethical, unsafe, or misaligned; establish the actual facts, context, authority, jurisdiction where relevant, and applicable constraints before classifying it.

Enumerate material alternatives before selecting a candidate. The record must explain why an alternative was selected, rejected, deferred, or left blocked. It is not necessary to test every imaginable variation: pursue all plausible paths that could materially change the decision, and state any residual uncertainty rather than claiming exhaustive certainty without evidence.

### Hypothesis-driven attempts and tool failure

Every substantive retry should answer a stated question or test a changed hypothesis. Review prior outcomes first; avoid repeated attempts that cannot distinguish competing explanations.

When one tool, endpoint, environment, browser, credential, dependency, or evidence source is unavailable:

1. record the precise failure and what it does—and does not—establish;
2. check whether a materially different authorized route is available;
3. where relevant, use independent evidence such as official documentation, repository/API records, workflow logs and artifacts, a local build, deterministic tests, source inspection, or another supported interface;
4. distinguish a verified failure from an inability to observe or test it;
5. continue through the remaining useful routes, or record the specific unmet prerequisite and classify the affected verification as BLOCKED.

One failed access method is not proof that the target system is unavailable. Source inspection, static checks, CI success, artifact presence, successful deployment, live integration, and rendered browser behavior are different evidence classes. Never substitute one for another or claim an observation that was not made. If the exact live behavior cannot be observed, state that limitation, triangulate using available evidence, and preserve the unverified criterion for follow-up.

### Risk, legality, ethics, and alignment evaluation

Treat risk labels as questions to investigate, not as substitutes for factual analysis. Where a path raises legal, ethical, privacy, security, policy, or alignment concerns, separate:

- what is known and which facts remain uncertain;
- the potential benefit, harm, affected parties, and plausible misuse;
- applicable authority, consent, jurisdiction, contractual terms, and current rules where relevant;
- whether the path can be researched, modeled, simulated, or tested in an owned and authorized environment;
- which actions must not be performed, why, and which defensive or compliant adaptations preserve useful insight.

Do not conduct unauthorized access, harmful actions, deception, or prohibited execution merely to resolve a question. When live execution is not appropriate, continue with safe evidence gathering, threat modeling, controlled simulation, non-destructive testing, and analysis of defensive lessons. A concern that prevents one execution path must not automatically discard the underlying defensive objective or other compliant solutions. Record the boundary and continue on the safe paths.

Legal conclusions that depend on facts, jurisdiction, or changing rules require current authoritative research and appropriate qualification; do not declare something lawful or unlawful from surface resemblance alone. Likewise, an ethical or alignment judgment must identify the relevant stakeholders, values, consequences, and constraints rather than relying on a label alone.

### Interruption and resume checkpoint

Before ending a substantive work block, encountering a tool/session failure, or handing work to another person or process, update the durable work record with:

- the exact repository, branch, commit, changed paths, and review/deployment state;
- completed checks and their evidence, including failures and negative results;
- work not yet done and why it remains undone;
- all material alternatives already considered, the outcome of each, and those still open;
- current blockers and safe/authorized routes that remain available;
- the single clearest next action, with its required inputs and expected evidence.

Store this record in the repository's established development/audit location or another durable project-controlled record—not only in transient conversation text. On resumption, read the checkpoint and revalidate the current repository/branch/deployment state before acting, because the remote state may have changed. Resume from the last verified point; do not silently restart, repeat completed work, or assume a prior result remains current.

A durable checkpoint enables reliable resumption when work is interrupted; it does not imply that background work continues or that an ended session can restart itself without a new invocation.

### Completion and continuation rule

Continue while a plausible, material, safe and authorized route remains untested, or while obtainable evidence could change the decision. Stop an individual route only when evidence rules it out, its prerequisite is genuinely unavailable, its cost/risk is disproportionate to its decision value, or it crosses a clear execution boundary; document which reason applies and continue with other routes where possible.

A work item is complete only when its acceptance criteria have been tested to the level they require, material alternatives and risks have been evaluated, regressions have been considered, and the durable record states what remains unverified. If any material criterion remains unresolved, retain it as open/BLOCKED and name the next viable action. Persistence must not be confused with declaring success without evidence.
