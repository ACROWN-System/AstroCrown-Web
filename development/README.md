# AstroCrown Development Environment

This is the repository's development-only workspace. It contains requirements, prototypes, experiments, implementation sources, research and verification records. It is not the public website and is not a deployment target by itself.

## Operating rules

1. **Use one current source of truth.** Check the authority map below before editing a subsystem. Link to its governing record instead of copying the same requirement into several documents.
2. **Current direction outranks historical records.** A file marked historical, superseded, archived or exploratory is not an implementation instruction.
3. **Preserve evidence.** Keep test outputs, audit findings, decisions and their exact commit context. Do not rewrite a historical failure as a pass.
4. **Development is not deployment.** A local build or passing CI does not prove remote staging operation, physical-wallet compatibility, production readiness or certification.
5. **Keep the implementation simple.** Reuse existing mechanisms, avoid duplicate services and unnecessary dependencies, and do not maintain retired authentication stacks as active alternatives.
6. **Respect the $0-first boundary.** This workspace cleanup does not create remote services, deploy code, migrate remote data, enable payments, change billing or add paid dependencies.
7. **Keep backup immutable.** The dated development mirror under `backup/` is a read-only recovery record. Never edit, regenerate, rename or delete its contents.

## Current authority map

| Area | Canonical location | Role |
|---|---|---|
| Product direction and accepted/proposed decisions | `product-memory/` | Durable product strategy and decision register; links to detailed specifications |
| Homepage sections | `index-section/` | Homepage information architecture and section requirements |
| Shared visual and interaction conventions | `index-reference/` | Reusable design-system references |
| Page-entry notices and feature status | `page-entry/` | Mandatory notices, status labels, acknowledgement and feature-status registry |
| Ordinary account identity and authentication | `account-continuity/PRIMARY-IDENTITY-AND-TRANSACTION-WALLET-ARCHITECTURE.md` and `account-continuity/worker/README.md` | Current wallet-primary identity architecture and Worker implementation |
| Account roles, user/admin journeys and permissions | `account-continuity/USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md` | Current product and governance requirements |
| Public member name | `account-continuity/MEMBER-NAME-AND-USERNAME-REQUIREMENTS.md` | Default name, uniqueness, availability and profile changes |
| Genesis Programme | `supporter-programme/` | Separate Genesis identity, payment-evidence and entitlement architecture |
| Engineering and audit method | `DEVELOPMENT-AND-AUDIT-CONVENTION.md` | Requirement traceability, verification, evidence and remediation |
| External verification intelligence | `verification/` | Standards, recognition, benchmarks and evidence-backed external opportunities |
| Audit records | `audit/` | Plans, findings, evidence, remediation and re-tests |
| NOVA recursive self-improvement | `nova-recursive-self-improvement/` | RSI engine, protected evaluation, candidate and evidence controls |
| Media generation | `ai-media-generator/` | Provider-neutral image/video workflow experiments and provenance |
| Other research systems | `ai-sanctuary/`, `nova-ai-orchestration/`, `nova-context-memory-optimization/`, `gpu-infrastructure/`, `public-relations/` | Separate research subsystems; not homepage or account authorities |
| Retired prototype register | `RETIREMENTS.md` | Documents the superseded experiments and CI paths removed from the active workspace |

## Current account state

AstroCrown's ordinary account design is **wallet-primary**, not passkey-primary. One primary identity wallet is the sole ordinary-account sign-in and recovery anchor. The current Worker has local qualification for Ethereum Mainnet EIP-191, TRON Mainnet TIP-191 and Solana Mainnet Ed25519 proofs. The proof is an off-chain, purpose-bound message signature, not a transaction. No balance, payment, gas, token approval, seed phrase, private key, password, email, SMS, passkey or recovery key is needed for account sign-in.

This is still development-only. The account Worker and D1 migrations have not been remotely deployed or activated. Physical-wallet/provider/browser qualification and independent security review remain open release gates. The primary wallet does not grant administrator authority. Auxiliary transaction-wallet management is deferred.

The separate Genesis Programme database and payment controls remain isolated. The current development branch records Genesis as PRELAUNCH; qualifying payments, purchases and token delivery remain disabled. This cleanup does not change that state.

## Structure

- `account-continuity/` — current ordinary account architecture, Worker, member names, user/admin boundaries and static UI assets. Old passkey/SIWE material is explicitly identified as historical or removed from the active workspace.
- `supporter-programme/` — Genesis Programme and separate treasury/payment architecture.
- `page-entry/` — page-entry standard, notice implementation and feature-status registry.
- `index-section/`, `index-reference/`, `index.html` — homepage requirements, shared visual references and development preview.
- `product-memory/` — product strategy, capabilities, accepted/proposed decisions, research and roadmap.
- `audit/`, `verification/` — auditable engineering activity and external verification intelligence.
- `operations/` — deployment and operational procedures.
- `nova-recursive-self-improvement/`, `nova-ai-orchestration/`, `nova-context-memory-optimization/`, `ai-media-generator/`, `ai-sanctuary/`, `gpu-infrastructure/`, `public-relations/` — distinct research and system capabilities.
- `dependencies/` — dependency policy. Retired Python passkey/SIWE dependency stacks are not active application requirements.

## Promotion and release boundary

Keep prototypes and research here. Promotion to the regular website or remote Worker is a separate, reviewable change. Before any release, verify the exact commit, tests, security boundaries, deployment target, data migration, feature-status registry and owner authorization. A CI pass is not a deployment or production authorization.
