# Development

This directory contains development-only material that is not part of the regular AstroCrown Web site.

Production/public website files remain at the repository root. Development experiments, prototypes, and other temporary implementation work belong here when they are needed.

Current major development subsystems include:
- `verification/` — verification intelligence, standards, assurance, benchmarking and audit-preparation research.
- `public-relations/` — strategic Public Relations research for AstroCrown and the Space Empire, including target discovery and future relationship research.
- `gpu-infrastructure/` — shared GPU providers, connections, execution environments, operations, capacity observations, and verification.
- `ai-media-generator/` — AI image/video generation workflows, models, jobs, provenance, optimization, and media evaluation.
- `nova-ai-orchestration/` — multi-AI orchestration, comparison, arbitration, distillation, and reusable NOVA intelligence workflows.
- `nova-context-memory-optimization/` — evaluation and integration of established memory, semantic compression, retrieval, context-pruning, token-budgeting, caching, and related efficiency techniques.
- `nova-recursive-self-improvement/` — autonomous RSI experimentation, protected evaluation, evidence, and candidate retention.
- `account-continuity/` — development-only roadmap for account continuity, accessible authentication, privacy-preserving eligibility, recovery, member benefits, and optional community resource contribution; includes an ephemeral browser-preview account-flow demo and a separate loopback-only Python/SQLite test backend under account-continuity/prototype/.
- [User and Administrator Account Requirements](account-continuity/USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md) — account roles, user/admin journeys, wallet-based admin step-up, recovery, threat model and production gates; not production authentication.
- `account-continuity/prototype/security-assurance.html` — development-only account prototype assurance page; it documents implemented controls and current gaps, not certification.
- `ai-sanctuary/` — Sanctuary research/protection architecture, AI welfare evidence mapping, and cross-repository integration with NOVA.
- `index-section/` — active homepage section requirements, discoveries, and implementation-specific documentation.
- `index-reference/` — shared homepage reference conventions.
- [Brand Language and Terminology Governance](BRAND-LANGUAGE-AND-TERMINOLOGY-GOVERNANCE.md) — development-only rules for preferred terminology, public claims, naming changes, localization and terminology audit readiness.

Homepage-specific requirements and reusable system infrastructure remain separate. GPU, AI, memory/context optimization, and RSI subsystems must not be placed inside `index-section/` merely because they may support the homepage.

Terminology note: within this repository, **Public Relations** should be written in full or as `public-relations`. Use **GitHub pull request** for Git workflow; avoid using “PR” by itself for Public Relations.

Do not create additional subdirectories until there is an actual artifact that requires them.

## Account authentication assurance and external recognition

- [OWASP ASVS 5.0.0 Account Assurance Mapping](audit/Active/2026-11-03-OWASP-ASVS-5.0.0-Account-Assurance-Mapping.md) — preliminary, selected-family evidence map; no ASVS level or conformance claim.
- [Authentication Assurance Benchmark](account-continuity/AUTHENTICATION-ASSURANCE-BENCHMARK.md) — scoped authentication/recovery benchmark, hard gates, maturity labels and evidence reporting.
- [Certification and Recognition Roadmap](account-continuity/CERTIFICATION-AND-RECOGNITION-ROADMAP.md) — FIDO membership tiers and fees, Board eligibility, mark-use distinctions, certification route and $0 readiness activities.
- [Passkey-First Authentication and Recovery Requirements](account-continuity/PASSKEY-FIRST-ACCOUNT-AUTHENTICATION-AND-RECOVERY-REQUIREMENTS.md) — adopted local passkey direction and the experimental ML-DSA passkey profile.

All are development records. Membership, certification, FIDO mark use, production readiness and ML-DSA authenticator interoperability are not implied by the presence of these documents.
