# NOVA Administrative Smart-Account and Transaction-Enforcement Specification

**Document ID:** NOVA-ACW-SEC-ADMIN-001  
**Date:** 2026-11-02  
**Status:** OWNER-ACCEPTED ARCHITECTURE REQUIREMENTS / DEVELOPMENT-ONLY — NOT A PRODUCTION AUTHORIZATION  
**Parent work:** [PR #141 — account entry and optional-wallet lab](https://github.com/ACROWN-System/AstroCrown-Web/pull/141)  
**Related requirements:** [User and Administrator Accounts — Requirements and Threat Model](USER-AND-ADMIN-ACCOUNT-REQUIREMENTS.md)

## 1. Purpose and governing decision

NOVA's administrative transaction enforcement is a native part of NOVA. The programmable administrative smart account, its on-chain validation rules, its off-chain policy coordination, its monitoring and its incident-response integration are all components of the NOVA system. They are not an external wallet-security product or a third-party authorization service.

The governing objective is to prevent prohibited administrative transactions before execution, not merely detect them afterwards. NOVA must enforce the approved policy both in its off-chain transaction path and in the smart account's on-chain validation path. If the policy cannot be evaluated safely, the transaction must fail closed.

This specification separates three functions that must never be conflated:

1. the administrator's external identity and compensation wallet;
2. the NOVA administrative operations smart account; and
3. the AstroCrown treasury and protected recovery vault.

An administrator's role or identity wallet must never provide unrestricted authority over AstroCrown treasury assets.

## 2. Three distinct wallet functions

### 2.1 External administrator identity and compensation wallet

This is a wallet owned and controlled by the administrator, outside NOVA's custody.

Its permitted purposes are:
- proving control of a registered administrator authenticator during administrative sign-in or step-up;
- signing a domain-, chain-, account- and session-bound challenge or an equivalent reviewed authentication proof; and
- receiving salary, service payments, bonuses or other compensation owed to that administrator through a separate payout workflow.

It is not an AstroCrown treasury wallet and must not hold or directly control AstroCrown organizational funds. NOVA and AstroCrown must never request, collect, store or derive its private key or seed phrase.

The current prototype supports up to three administrator wallet addresses. That existing maximum may continue as a provisional authentication configuration; the final minimum number and recovery arrangement remain governance decisions. Multiple registered addresses are alternative authenticators, not a multisignature arrangement and not proof of independent custody if they share the same seed, device or recovery channel.

The compensation destination is recorded as a distinct account purpose even when its address is the same as an authentication wallet. Payment processing is separate from login and administrative authorization. Changing a compensation destination requires heightened verification, notification and an auditable change record. If the destination itself is suspected to be compromised, payments to it are held until the destination is re-verified or replaced through the approved process.

When administrator privileges are revoked, the external wallet is removed or disabled as an **administrator authenticator**. It is not confiscated, remotely controlled or automatically disconnected from unrelated ordinary-user features. The person's independently earned compensation is not confiscated. A payout may be paused only where the payout destination is itself suspected to be compromised or a separate lawful payment hold applies.

### 2.2 NOVA administrative operations smart account

Each administrator receives a dedicated, programmable administrative operations smart account as a component of NOVA. A per-administrator account is the default design because it provides containment, traceability and a smaller incident blast radius than one shared operational account.

This account:
- is created and registered through NOVA's governed administrator lifecycle;
- is subject to NOVA's mandatory transaction validation and execution policy;
- holds only the minimum organizational operational assets necessary for its assigned duties;
- can execute only explicitly permitted administrative operations;
- cannot make personal payments or serve as an administrator's compensation destination;
- cannot directly control or drain the AstroCrown treasury;
- has no user-accessible bypass, fallback owner or alternate module that can evade NOVA's policy guard; and
- can be suspended, restricted, unregistered and placed into its pre-authorized recovery path after a qualifying security incident.

The administrator's external wallet must not become an unrestricted owner key for this smart account. Any relationship between an external-wallet signature and an administrative operation must be narrowly scoped and checked by the account's mandatory validation logic. The precise signer and account-abstraction implementation is a later technical selection; it must not weaken the policy requirements in this specification.

The smart account and validation mechanism are NOVA components by design and governance. Its on-chain enforcement code is part of NOVA's security boundary, not an optional adapter that an administrator can disable.

### 2.3 AstroCrown treasury and protected recovery vault

The treasury is a separate organizational asset domain. The administrative operations smart account must not have unrestricted treasury ownership, withdrawal authority or upgrade authority.

A protected recovery vault is a separate, predetermined destination for recoverable operational assets when an administrative smart account is suspended or retired. Its authorization rules must be established before the account holds assets. NOVA must not be able to substitute an arbitrary recovery destination during an incident.

Treasury governance, recovery-vault authority and smart-account upgrade authority must be separated from routine administrator permissions. A normal administrator must not be able to change the policy guard, recovery destination, guardian threshold or contract authority that constrains their own operations account.

## 3. NOVA-integrated enforcement architecture

NOVA consists of coordinated components:

### 3.1 Off-chain NOVA policy and governance layer

This layer:
- authenticates the ordinary AstroCrown account and confirms the server-owned administrator role;
- checks the exact administrative permissions assigned to the administrator;
- verifies a fresh, valid external-wallet step-up where required;
- constructs a canonical representation of the proposed operation;
- evaluates destinations, contracts, networks, assets, amounts, function selectors, limits, timing, delegation and the administrator's assigned scope;
- issues or coordinates only a policy-compliant operation request;
- monitors account state and supported networks;
- reconciles submitted, rejected, executed and externally observed operations;
- manages incident classification, audit evidence and privilege revocation; and
- keeps off-chain policy state synchronized with the on-chain enforcement configuration.

This layer may prepare and relay approved operations, but it must not possess an unrestricted private key or unrestricted recovery power over organizational assets.

### 3.2 On-chain NOVA validation and enforcement layer

The administrative smart account must apply mandatory validation before any operation can execute. The validation logic must enforce the policy even if the off-chain NOVA services are unavailable, compromised or bypassed.

At minimum, validation must bind approval to the exact operation, including the applicable chain, account, destination, asset, amount, contract/function, calldata or equivalent operation payload, nonce, validity period and permission scope.

The contract must reject:
- unapproved destinations or contracts;
- disallowed networks, assets, operations or function selectors;
- amounts or frequencies outside configured limits;
- stale, expired, replayed or incorrectly bound authorizations;
- operations lacking the required permission and authorization evidence;
- policy versions or authorization states that cannot be validated; and
- attempts to disable, replace or bypass the mandatory guard through an unapproved route.

The validation path must fail closed. Missing policy data, an unavailable policy dependency, an unknown operation, a malformed request or an ambiguous authorization must not result in permissive execution.

### 3.3 NOVA monitoring and reconciliation

NOVA must monitor supported chains and the registered smart-account state. Monitoring must include more than native-asset transfers. It must cover, where relevant to the implemented chain and account:
- token transfers and balances;
- token approvals, allowances and permit authorizations;
- contract interactions and function calls;
- owner, signer, guardian and recovery configuration changes;
- module, validator, hook and fallback changes;
- session keys, delegated authorities and spending limits;
- account upgrades, policy-version changes and recovery actions; and
- attempted, rejected, pending, replaced and executed operations where evidence is available.

NOVA must periodically reconcile its expected configuration and asset state against authoritative chain state. Monitoring cadence, chain coverage, confirmation depth, RPC/provider independence and alert thresholds must be specified for each supported network. No unsupported chain or asset may be represented as covered.

## 4. Administrative transaction lifecycle

1. The administrator signs in to their ordinary AstroCrown account.
2. The backend confirms the administrator role and the exact permission needed for the requested task.
3. The administrator completes a fresh external-wallet step-up when required. This proves control of the authentication wallet; it does not grant additional role permissions or direct access to the treasury.
4. The requested operation is converted into a canonical operation description.
5. NOVA's off-chain policy layer evaluates the operation against the administrator's current authorization, policy version, approved targets and operational limits.
6. The NOVA smart account independently validates the exact operation on-chain before execution.
7. Only an operation accepted by both policy layers may execute. A mismatch, rejection or inability to validate prevents execution.
8. NOVA records the policy version, actor, requested operation, decision, authorization evidence reference, chain/transaction reference where one exists, and final outcome. Logs must not store seed phrases, private keys, passwords, reusable authentication tokens or other bearer secrets.

Administrative operations must not be represented as transactions from the administrator's external compensation wallet. The operation is performed by the NOVA administrative smart account under NOVA's restrictions.

## 5. One-violation incident response

### 5.1 Qualifying violation

The owner-accepted policy is one violation: when a currently authenticated and wallet-step-up-verified administrator deliberately submits or approves an operation that the published administrative policy prohibits, the system rejects it before execution and applies the same administrative security response as a confirmed compromise.

A qualifying attempt must be attributable to an authenticated administrator action or a valid authorization originating from that administrator's approved administrative context. An unrelated unauthenticated probe, third-party forged request, ordinary network failure, malformed transport request or benign user-interface error is not, by itself, proof that the administrator attempted the prohibited operation. Those events must still be recorded and assessed under the security-monitoring policy.

The policy must be visible to administrators before they receive access. The system must identify prohibited operations clearly. The pre-execution warning or rejection does not replace the incident response for a qualifying deliberate attempt.

### 5.2 Mandatory response

For a qualifying violation, whether the prohibited operation was rejected before reaching the chain or rejected by on-chain validation:

1. **Reject:** do not execute the prohibited operation. No asset transfer or state change from that operation may occur.
2. **Contain:** immediately suspend the administrator's operations smart account and prevent new operational requests or sessions from using it.
3. **Revoke:** remove the administrator role and all associated administrative permissions, revoke active administrator sessions and delegated authorities, and invalidate outstanding operation authorizations.
4. **Unregister:** mark the affected NOVA operations smart account as revoked and permanently retain its address and incident status in the audit registry. It must not be silently re-enrolled.
5. **Protect assets:** activate the account's pre-authorized emergency freeze/recovery mechanism and transfer remaining recoverable operational assets to its predetermined protected recovery vault. The recovery route must be constrained by on-chain rules and independently secured authorization; it must not depend on giving NOVA an unrestricted private key.
6. **Remove privileged wallet association:** remove the external wallet from the administrator-authenticator registry for that role. Do not seize the external wallet, take its private key or treat it as the NOVA operations account.
7. **Notify:** create a durable incident record and show the standard suspension message in the ordinary User dashboard at the next visit. The User dashboard and ordinary account must remain available unless a separate account-security incident justifies a separate restriction.
8. **Review:** require a formal security review and new authorization before any administrative reinstatement. Reconnecting the same external wallet must not automatically restore the role or recreate the operations account.

The same response and dashboard message apply whether the policy guard blocked the attempt before any blockchain transaction was executed or the incident involved an independently confirmed compromise. An on-chain transaction hash may not exist for an operation rejected before submission; the incident record must not invent one.

### 5.3 Asset-recovery limits

The system must distinguish blocking an operation from reversing an already executed transaction. The smart account should prevent a prohibited operation from executing. If a vulnerability, compromised upgrade path or unsupported external contract nevertheless permits assets to leave, recovery is limited to assets still controlled by the account or recoverable through the relevant protocol. NOVA cannot guarantee retrieval of assets already transferred to an unrelated address, irreversibly consumed or locked in a contract without a recovery mechanism.

The phrase “recover all assets” therefore means all remaining supported assets that the NOVA account and its pre-authorized recovery path can actually recover. Unsupported asset types and chain-specific limitations must be documented before operational funds are deposited.

### 5.4 Dashboard notice

The affected administrator retains access to their ordinary User dashboard. The Administrator access entry is absent because the backend no longer reports an active administrator role. The same notice is displayed for a qualifying prohibited attempt and a confirmed compromise:

> **Administrative privileges revoked**  
> Your NOVA administrative operations account attempted an operation that violates AstroCrown's Administrative Wallet Security Policy. The operation was blocked. Your administrative operations account has been disabled, your administrator privileges have been revoked, and the security incident has been recorded by NOVA.  
>  
> Your ordinary AstroCrown account remains accessible, but you no longer have access to the Administrator dashboard.  
>  
> Incident reference: [Generated incident ID]

The notice must be populated from authoritative server-side incident state, not a client-side flag. It must remain available in the user's security/incident history according to the approved retention policy.

## 6. Administrator compensation and payout separation

Administrator salary, service fees, bonuses and other compensation are obligations payable to the administrator. They are not operational funds and are not held in the NOVA administrative operations smart account.

Compensation is paid through a separate, auditable payout workflow to the registered external compensation address. A payout must not be treated as an administrative operation or as proof of administrator authorization. The administrator's role does not grant them permission to edit payout records, approve their own compensation or alter treasury payment controls unless a separate, explicitly approved permission and segregation-of-duties rule allows it.

Revoking administrator privileges does not automatically confiscate compensation already earned. Pending payment treatment, disputed amounts and any lawful hold require separate finance/governance rules. If the compensation address itself is believed compromised, hold further payments to that destination until the recipient completes a separately verified address-change process.

## 7. Governance, upgrades and fail-safe rules

- Smart-account validation, guard, recovery and module configuration are security-critical NOVA components.
- No routine administrator can disable the guard, remove its validation requirement, replace its code, change the recovery destination or grant themselves a bypass.
- Code or policy upgrades require a separately governed authorization process, independent review, recorded rationale, tested deployment and an explicit rollback or emergency-pause plan where technically feasible.
- Upgrade and recovery authority must not be held by a single operational administrator or by a single unrestricted NOVA service credential.
- Emergency pause must be possible without creating an unrestricted asset-transfer authority.
- A compromised off-chain NOVA service must not be able to make the on-chain account permissive.
- A compromised on-chain module or upgrade authority is a system-level incident; NOVA must not claim that its own monitoring can always recover from compromise of the enforcement root.
- All policy changes, account creation, suspension, recovery, role revocation and reinstatement must be auditable and attributable.
- Reinstatement requires a new operations smart account or a separately reviewed reauthorization process; a revoked account must not be silently reactivated.

## 8. Minimum acceptance criteria for implementation

### Architecture and authorization
- [ ] The external administrator wallet is identity/step-up and compensation-only; it is not an AstroCrown treasury or operations-funds wallet.
- [ ] Each administrator receives a separately identifiable NOVA operations smart account.
- [ ] The operations account holds only a documented operational allowance and cannot directly control the treasury.
- [ ] The account's mandatory NOVA validation cannot be bypassed through an alternate owner, module, fallback, upgrade or direct execution route.
- [ ] Ordinary role permissions and external-wallet authentication remain separate from on-chain transaction authority.

### Pre-execution enforcement
- [ ] Off-chain NOVA policy validation and on-chain NOVA smart-account validation independently evaluate the exact operation.
- [ ] Unauthorized, unknown, stale, replayed, malformed or unverifiable operations fail closed.
- [ ] A deliberate policy-violating operation from a currently authenticated and stepped-up administrator is blocked and triggers the one-violation response.
- [ ] Unauthenticated third-party probes and benign transport failures do not automatically attribute misconduct to an administrator.
- [ ] Policy decisions and operation outcomes are auditable without retaining private credentials.

### Incident and asset protection
- [ ] A qualifying violation revokes the role, permissions, privileged sessions and outstanding delegated authorities.
- [ ] The operations account is suspended, marked revoked and cannot be silently re-enrolled.
- [ ] Supported remaining operational assets are recoverable only to the preconfigured protected vault through constrained recovery logic.
- [ ] Recovery failure, unsupported assets and assets already transferred away are explicitly represented; the system never promises impossible recovery.
- [ ] The ordinary User dashboard remains accessible and shows the authoritative standard incident notice.
- [ ] The external wallet's administrator-authenticator association is removed without taking control of the external wallet or confiscating earned compensation.

### Verification and release gates
- [ ] Unit, integration, adversarial and property/invariant tests cover validation, guard bypass attempts, policy drift, replay, recovery, revocation and false-attribution cases.
- [ ] A local/offline model and test-chain/fork qualification are completed before any real assets are deposited.
- [ ] Independent smart-contract and system security review is completed before production use.
- [ ] Deployment, upgrade, monitoring, RPC/provider failure and incident-response procedures are documented and tested.
- [ ] Treasury, compensation and recovery-vault authorization are reviewed separately from administrator role governance.

## 9. Current implementation boundary

PR #141 currently contains a loopback account prototype with server-owned roles, permissioned administrator appointment/revocation, target-owned wallet enrollment and wallet-signature step-up. It does **not** implement the NOVA administrative operations smart account, an on-chain validation guard, operational asset custody, continuous on-chain monitoring, an emergency recovery vault or real transaction blocking/recovery.

This specification records the accepted architecture and requirements only. It does not claim that smart-account contracts have been written, deployed, audited or tested. No real wallet, organizational funds, treasury or external provider is changed by this documentation update.

The account prototype must continue to keep its existing role, session and wallet-authentication boundaries. The programmable operations account is a later NOVA subsystem and must be implemented behind a separate review and test gate. PR #141 remains a draft and must not be merged or deployed solely because these requirements have been recorded.
