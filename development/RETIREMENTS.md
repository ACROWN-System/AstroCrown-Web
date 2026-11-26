# Development Workspace Retirements

**Recorded:** 26 November 2026  
**Purpose:** Explain why retired prototype stacks and their automation were removed from the active development workspace. This is a provenance register, not an implementation guide.

## Governing decision

The current ordinary AstroCrown account model is wallet-primary. One primary identity wallet is the sole normal-account sign-in and recovery anchor. The current Worker implements the approved direction using Ethereum Mainnet EIP-191, TRON Mainnet TIP-191 and Solana Mainnet Ed25519 off-chain proofs.

The older local passkey-first account server, standalone SIWE wallet-login lab and associated email-delivery experiments are not supported alternatives. Retaining them as active, tested prototypes created multiple conflicting authentication authorities and made it unclear which system governed the actual product.

The controlling requirements are:

- `account-continuity/PRIMARY-IDENTITY-AND-TRANSACTION-WALLET-ARCHITECTURE.md`
- `account-continuity/USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md`
- `account-continuity/MEMBER-NAME-AND-USERNAME-REQUIREMENTS.md`
- `account-continuity/worker/README.md`

## Removed from the active workspace

### 1. Standalone SIWE wallet-login lab

Removed the obsolete `auth-prototype/` directory, including its independent UI, Python server, SIWE verifier, requirements, and tests. Wallet proof now belongs to the single ordinary-account Worker implementation; a second standalone login system is not maintained.

### 2. Retired local passkey account server

Removed the obsolete `account-continuity/prototype/` files for the old local WebAuthn/passkey server, passkey verifier, offline recovery-key flow, ML-DSA experimental WebAuthn work, temporary HTTPS tunnel, local administrator provisioning, email-action/delivery path, and their old browser/server tests.

The current account UI assets remain in that directory because the Worker staging-site build explicitly consumes them. The independent case-management prototype and its tests remain isolated and are not represented as account recovery or a live support service.

### 3. Obsolete dependency inventory and automation

Removed the Python WebAuthn/SIWE platform locks, their dependency SBOM snapshots, lock-generation and audit scripts, and the CI workflow that maintained those retired application dependency sets. The dependency folder remains with a lightweight admission policy. Future dependencies must be justified against the actual active subsystem and its runtime.

### 4. Obsolete CI workflows

- `.github/workflows/wallet-auth-prototype-tests.yml` — removed because it qualified the standalone SIWE login lab rather than the current account Worker.
- `.github/workflows/python-ci-lock-refresh.yml` — removed because its hash locks, vulnerability audits and SBOM generation covered the retired Python passkey/SIWE stacks.
- `.github/workflows/account-continuity-prototype-tests.yml` — retained at the same path but narrowed to the still-retained, isolated standard-library case-management prototype. It no longer asserts passkey or recovery-key requirements.

## Retained historical material

The passkey-first requirements record remains as historical provenance and is explicitly superseded. The authentication assurance benchmark and FIDO recognition research remain for reference but now carry explicit notices that they are passkey-specific and do not qualify the wallet-primary implementation. The broad account-continuity roadmap remains historical proposal/context; its authority note now points to the current wallet-primary architecture.

Historical records must not be used as active implementation requirements where they conflict with the current owner-approved architecture.

## Immutable backup

The earlier dated mirror is preserved under:

`backup/2026.11.26-22h05mn03sc-system/development/`

That backup contains the 331-file snapshot from the backup operation. The optimized workspace is built from the later PR #198 branch, which contains subsequent wallet-primary and page-entry work. The backup tree is copied intact into the optimized branch; its contents are not edited, renamed, regenerated or deleted.

## Safety and release boundary

These retirements do not deploy or activate the ordinary account service, change remote D1 data, enable Genesis payments, provision infrastructure, alter billing, or authorize real-asset transactions. The wallet-primary account remains development-only until its separate release gates are completed.
