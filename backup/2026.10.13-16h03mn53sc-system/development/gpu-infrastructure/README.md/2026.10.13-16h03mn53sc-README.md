# GPU Infrastructure

This directory contains development-only infrastructure for obtaining, connecting to, operating, and verifying GPU compute services used by AstroCrown and other development workloads.

## Scope

The subsystem is independent of any single application or homepage section. It may support:

- free or zero-cost GPU services;
- provider connections and runtime environments;
- execution, availability, capacity, and failure observations;
- job execution and queueing mechanisms where applicable;
- provider fallback and substitution;
- operational configuration and reproducibility;
- resource, performance, and cost/free-tier observations;
- security and credential-handling controls;
- verification evidence for GPU-service operation.

## Boundary

This subsystem provides or brokers compute capability. It does not define the image/video generation application itself.

The AI image and video generation system belongs in:

`development/ai-media-generator/`

The homepage requirements and section-specific documentation remain in:

`development/index-section/`

and the shared homepage reference material remains in:

`development/index-reference/`

## Development Status

Status: **candidate / initial subsystem structure**

No provider, service, model, capacity assumption, or operational performance should be treated as approved until supported by project evidence and applicable verification.

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

Use the repository-wide development and audit convention in:

`development/DEVELOPMENT-AND-AUDIT-CONVENTION.md`

Do not claim a provider or connection works without reproducible evidence.

## Reuse

The infrastructure should remain reusable so that image generation, video generation, browser-based evaluation, simulations, and future development workloads can share compute services without coupling their application logic to a single provider.
