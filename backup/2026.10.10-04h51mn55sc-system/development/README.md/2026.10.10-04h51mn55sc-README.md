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
- `ai-sanctuary/` — Sanctuary research/protection architecture, AI welfare evidence mapping, and cross-repository integration with NOVA.
- `index-section/` — active homepage section requirements, discoveries, and implementation-specific documentation.
- `index-reference/` — shared homepage reference conventions.

Homepage-specific requirements and reusable system infrastructure remain separate. GPU, AI, memory/context optimization, and RSI subsystems must not be placed inside `index-section/` merely because they may support the homepage.

Terminology note: within this repository, **Public Relations** should be written in full or as `public-relations`. Use **GitHub pull request** for Git workflow; avoid using “PR” by itself for Public Relations.

Do not create additional subdirectories until there is an actual artifact that requires them.
