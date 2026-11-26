# NOVA AI Orchestration

This directory contains the development-only orchestration layer for coordinating multiple AI participants, comparing their outputs, evaluating agreement and contradiction, distilling supported information, and producing higher-quality NOVA intelligence for diverse operational purposes.

## Scope

The subsystem may contain:

- AI provider and model selection;
- multi-model and multi-provider consultation;
- parallel or staged AI requests;
- comparative response analysis;
- agreement and contradiction detection;
- evidence and claim evaluation;
- arbitration and challenge stages;
- distillation and synthesis;
- uncertainty and confidence handling;
- model/provider provenance;
- task-specific orchestration policies;
- governance and decision-support workflows;
- research and reasoning workflows;
- automation and operational workflows;
- NOVA AI Assistant interfaces built on the orchestration layer.

## Architectural Role

This is an intelligence orchestration capability, not a chatbot-specific subsystem.

The **NOVA AI Assistant** is one possible consumer of this orchestration layer. The same underlying capability may support governance, research, decision support, reasoning, automation, analysis, evaluation, and other NOVA functions.

The stable architectural concept is therefore **NOVA AI Orchestration**, not "AI assistant."

## AI Participants

The orchestration layer may work with:

- external AI APIs;
- open-source models;
- NOVA-integrated models;
- GPU-hosted models;
- other verified AI participants.

A participant's inclusion must remain evidence-based. Model availability, licensing, commercial-use permissions, provider terms, capability, reliability, latency, cost, privacy, security, and other applicable constraints must be evaluated before relying on it for a particular purpose.

## Distillation

The distillator is a core mechanism within the orchestration layer.

It should not merely concatenate or select the first successful response. Depending on the task, an orchestration run may:

1. select appropriate independent AI participants;
2. provide the relevant task and context;
3. collect multiple responses;
4. compare claims, reasoning, and evidence;
5. identify agreement and contradiction;
6. identify unsupported or insufficiently supported claims;
7. invoke additional challenge or arbitration when justified;
8. synthesize a final result from the strongest supported information;
9. preserve relevant provenance and uncertainty;
10. return the result to the requesting NOVA function.

Not every task must invoke every available model. Orchestration should be able to balance intelligence quality, latency, provider availability, privacy, and resource consumption according to the applicable task requirements.

## Relationship to Other Development Subsystems

Shared compute infrastructure belongs in:

`development/gpu-infrastructure/`

AI image and video generation belongs in:

`development/ai-media-generator/`

Homepage-specific requirements remain in:

`development/index-section/`

Shared homepage reference conventions remain in:

`development/index-reference/`

This subsystem may consume services or models made available by the GPU infrastructure, but it should not be coupled to a particular GPU provider.

## Credentials and Security

Provider credentials must not be stored in repository source files.

Where GitHub Actions is used, credentials may be supplied through GitHub Actions secrets and exposed to a workflow only through the minimum environment variables and permissions required for the operation.

Secret names, provider configuration, and non-sensitive operational metadata may be documented in the repository when needed. Secret values must remain outside tracked files.

Credentials and provider access must be evaluated for:

- required scope and permissions;
- commercial-use eligibility;
- provider terms and acceptable-use restrictions;
- data handling and privacy implications;
- leakage risk;
- rotation and revocation procedures;
- logging and observability risks.

## Provenance and Evidence

An orchestration result should preserve enough metadata to understand how it was produced where the underlying providers permit it, including applicable:

- provider and model identifiers;
- model/version;
- orchestration mode;
- participating models;
- prompts or task inputs;
- relevant system/context inputs;
- timestamps;
- response identifiers;
- evidence or source references;
- arbitration or challenge stages;
- final distillation result;
- limitations and uncertainty.

The system must not imply consensus, verification, certainty, or source support that the collected evidence does not establish.

## Governance and Decision Support

Use of multiple AI systems may strengthen governance and decision-support processes by exposing independent perspectives, disagreements, missing evidence, and alternative interpretations before a result is synthesized.

AI output remains an input to the applicable NOVA governance or decision process. Orchestration must not silently convert an AI-generated conclusion into an authoritative governance decision.

## Development Status

Status: **candidate / initial subsystem structure**

The architecture and terminology are established as a development direction. Specific models, providers, orchestration policies, distillation algorithms, thresholds, and workflows remain subject to evidence-based evaluation and verification.

## Verification

Changes follow:

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

Use the repository-wide convention in:

`development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`

External benchmark results supplement project requirements; they do not replace them.

## Reuse

The orchestration layer is intended to be reusable across AstroCrown and other NOVA-controlled or NOVA-integrated functions without making a particular user interface, model provider, or use case the architectural definition of the subsystem.
