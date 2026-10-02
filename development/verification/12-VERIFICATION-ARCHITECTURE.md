# Verification Intelligence Repository Architecture

## Principle

The verification system is a knowledge and operational layer, not a second audit system.

## Knowledge separation

1. **Map** — what verification ecosystem exists.
2. **Registry** — who/pathway verifies what and how.
3. **Standards** — criteria/control frameworks.
4. **Assessments** — AstroCrown-specific evaluation against a pathway.
5. **Evidence** — source material, snapshots, extracts and provenance.
6. **Verification Paths** — how an external pathway can be pursued.
7. **Readiness** — whether AstroCrown can respond when an opportunity appears.
8. **Benchmarks** — external comparison systems and methodological references.
9. **Operations** — machine-readable status, schema, review and change tracking.
10. **Archive** — dated historical knowledge snapshots.

## Relationship with existing repository systems

- development/ remains the controlled development boundary.
- development/audit/ records concrete audit and verification events.
- development/Prompt-Guide.md records prompt methodology.
- development/verification/ records ecosystem intelligence and preparedness.

No layer should silently become another layer's source of truth.

## Proposed tree

development/verification/
- README.md
- 01-VERIFICATION-ECOSYSTEM-MAP.md
- 02-ENTITY-REGISTRY.md
- 03-STANDARDS-REGISTRY.md
- 04-NECESSITY-REGISTRY.md
- 05-FEASIBILITY-REGISTRY.md
- 06-OPPORTUNITY-READINESS.md
- 07-VISIBILITY-REGISTRY.md
- 08-CREDIBILITY-REGISTRY.md
- 09-ADOPTION-REGISTRY.md
- 10-NOVA-REPLICATION-REGISTRY.md
- 11-COMPETITOR-VERIFICATION-BENCHMARK.md
- 12-VERIFICATION-ARCHITECTURE.md
- 12-VERIFICATION-PATHS.md
- 13-VERIFICATION-TRACKING-SYSTEM.md
- 14-STRATEGIC-PRIORITIZATION.md
- 15-GAP-ANALYSIS.md
- 16-INVESTIGATION-BACKLOG.md
- operations/
- evidence/
- benchmarks/
- assessments/
- paths/
- archive/

## Creation rule

Subdirectories should contain actual artifacts or intentionally documented operational entry points. Empty conceptual folders should not be created merely for symmetry.
