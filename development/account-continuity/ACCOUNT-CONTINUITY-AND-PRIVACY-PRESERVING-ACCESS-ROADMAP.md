# Account Continuity and Privacy-Preserving Access Roadmap

**Status:** DEVELOPMENT-ONLY ARCHITECTURE PROPOSAL — NOT IMPLEMENTED  
**Last updated:** 2026-10-16  
**Primary location:** AstroCrown-Web `development/account-continuity/`  
**Scope:** Future NOVA / AstroCrown account creation, sign-in, recovery, person-level eligibility, community benefits, and voluntary resource-contribution features.

> This document preserves architecture intent, decisions, candidates and unresolved questions. It is not a security certification, legal opinion, financial forecast, implementation specification for any single provider, or evidence that any feature is operational. Candidate technologies remain unapproved until evaluated against explicit requirements.

## 1. Executive direction

Build a **privacy-compatible account-continuity and community-participation system** that aims to let a person retain access after losing devices, credentials or other life-critical resources; offers convenient secure sign-in without mandatory biometrics; allows legitimate pseudonyms, multiple accounts and multiple devices; prevents duplicate claims for specific limited benefits without using IP addresses as identity; and supports optional, measurable community computing contributions.

The system must distinguish the following entities rather than treating them as interchangeable:

1. **Person / member eligibility** — whether an individual qualifies for a particular person-limited programme.
2. **Account / pseudonym / workspace** — a user-facing identity within one service or context. One person may legitimately have several.
3. **Authenticator** — a passkey, hardware key, recovery code or other method used to authenticate account control.
4. **Recovery capability** — a separately governed path to restore access or cryptographic keys.
5. **Resource node** — a phone, desktop, GPU or other equipment that can optionally contribute work.
6. **Benefit entitlement** — a programme-specific permission to make a claim during a defined period.
7. **Payout destination** — an account, wallet or provider destination that may have additional requirements.
8. **Legal eligibility** — whether a particular service or transaction may be offered in a particular situation.

No single identifier, biometric, IP address, device fingerprint, account, wallet address, or resource node should be assumed to represent all eight.

### Target principle

**One eligible person may have multiple legitimate accounts and devices; a restricted basic benefit may be limited to one claim per eligible person and programme period; useful additional work may earn additional compensation; and losing an account must not automatically mean losing the person's membership or digital life.**

## 2. Status labels used by this roadmap

- **BASELINE PRINCIPLE** — a product or safety rule established by the discussions documented here.
- **PROPOSED ARCHITECTURE** — a design direction recommended for later validation, not yet implemented.
- **CANDIDATE** — a technology, provider or method to research and test; not approved.
- **BLOCKED** — a decision that must not be made or a feature that must not be activated until specified evidence or interaction is available.
- **UNRESOLVED** — an open product, technical, operational, financial or legal question.
- **IMPLEMENTED / VERIFIED** — may be used only after the exact implementation and its relevant tests provide evidence. No capability in this document currently has this status.

## 3. Baseline principles

### 3.1 Access, dignity and portability

- Basic access must not depend on wealth, token holdings, willingness to invest, or willingness to contribute computing resources.
- Where lawful and technically feasible, provide open-source, portable tools that allow users to retain and restore their own data without permanent dependence on a single hosting provider.
- Treat account loss, a device change, a change of appearance, a changed network, or use of privacy technology as ordinary circumstances to handle, not as automatic evidence of abuse.
- Provide a comprehensible recovery route before a user needs it. Avoid recovery mechanisms that depend solely on a phone number, one email account, one physical address, or remembering secret personal facts.
- Preserve user choice and make the consequences of recovery, key replacement, data retention and sharing explicit.

### 3.2 Privacy and data minimization

- Request only the data needed for the specific task and legal obligation.
- Do not expose legal identity to routine application operators when a narrowly scoped eligibility proof can serve the requirement.
- Do not put personal identity documents, reusable claim identifiers, biometric templates, recovery shares, credentials or private memory on a public blockchain.
- Do not claim perfect anonymity. IP address, device, payment, timing, network and account metadata can still correlate actions.
- Do not collect biometrics centrally for routine sign-in. Optional local biometrics may unlock an authenticator on the user's own device.
- Keep identity verification, member benefit accounting, payout execution, personal memory, shared project memory, and credential/secret storage separate by default.
- Define purpose, access, retention, deletion and incident handling before collecting sensitive information.

### 3.3 Authentication, eligibility and recovery are different

- A passkey proves control of an authenticator under its protocol; it does not by itself prove unique personhood, entitlement to a financial benefit, legal residence, or ownership of every asset.
- A private eligibility credential may prove a limited fact but is not automatically an account authenticator.
- An IP address or device signal may help detect an abuse pattern but must not be treated as a person's identity.
- A completed compute job proves contribution only under the job's verification rules; it does not prove that the contributor is a unique person.
- A successful account recovery must not automatically authorize sensitive account changes, private-memory disclosure, or transfer of financial assets.

### 3.4 Fair, evidence-led enforcement

- Do not automatically exclude someone solely because they use Tor, a VPN, a proxy, a privacy browser, a shared network, multiple devices or multiple accounts.
- Do not reward account creation, referrals or device registration by themselves.
- Investigate the specific suspicious action or claim. Prefer proportionate controls and scoped limits over blanket account closure where feasible.
- Make consequential restrictions explainable and appealable, with a case identifier and human review path.
- Record why a decision occurred and whether later evidence overturned it. Use confirmed false positives to improve tests and enforcement policy.
- Do not allow fraud detection to silently become a cross-service tracking system.

### 3.5 Financial honesty and sustainability

- Do not promise stable income, guaranteed yield, principal protection, global payout availability or a guaranteed profit from crypto strategies.
- Do not represent new token issuance as income generation.
- Separate a basic benefit budget, member-contribution compensation, operational expenses, treasury capital, and essential recovery reserves.
- Do not use essential recovery or user-custody reserves for speculative investment.
- The initial benefit should not require a member deposit, a token purchase, or recruiting other users.
- Distribute monetary benefits only from legally and operationally approved sources with transparent rules. A “bonus,” “credit” or “reward” label does not by itself determine legal treatment.

## 4. Scope and non-goals

### In scope

- Future account creation and pseudonym/workspace organization.
- Passkeys and alternative authenticators.
- Device and authenticator registration, removal and revocation.
- Account and key recovery, including catastrophic-loss scenarios.
- Privacy-preserving eligibility checks and person-limited benefit claims.
- Multi-account and multi-device fairness.
- Tor/VPN-compatible access and low-friction security.
- Optional resource contribution, validated computation and associated compensation.
- A governed basic member benefit and a separately controlled route to possible monetary benefits.
- Privacy boundaries between shared knowledge, personal memory, sensitive memory and credentials.
- Jurisdiction- and feature-specific eligibility decisions.
- Appeals, evidence retention, incident handling and regression prevention.

### Explicitly out of scope for this document

- Implementing a registration, login, passkey, biometric, wallet, KYC, payment, claim, compute-worker or treasury system.
- Choosing or deploying a production identity provider, legal entity, payment provider, crypto strategy, blockchain contract, biometric vendor or credential library.
- Soliciting deposits, distributing tokens or promising user income.
- Implementing a custom cryptographic algorithm, a bespoke proof system, a custom biometric matcher or a new identity standard.
- Circumventing sanctions, licensing, lawful restrictions, payment-provider controls or legal reporting requirements.
- Guaranteeing account recovery if all recovery mechanisms are destroyed and no authorized recovery path exists.

### Existing project touchpoints to reuse or re-evaluate before implementation

- [Development & Audit Convention](../DEVELOPMENT-AND-AUDIT-CONVENTION.md) already defines evidence-led requirements, contract gates, result states, re-testing and promotion discipline. Use it rather than inventing a parallel process.
- [Development Security Baseline](../SECURITY-BASELINE.md) currently contains security areas marked UNVERIFIED. Do not infer that account, recovery or privacy requirements have passed because a general security workflow is green.
- [NOVA quality_gate.py](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/quality_gate.py) contains deterministic provider-contract and root-cause case/closure primitives, including failure-case recording. Reassess and reuse appropriate generic governance primitives instead of creating a second failure-case framework. Prior inspection did not establish universal end-to-end failure-to-investigation-to-verified-closure enforcement, so do not claim that it is already universal.
- [NOVA health.py](https://github.com/ACROWN-System/NOVA/blob/main/NOVA/health.py) contains fingerprinted observations and narrow reusable-analysis behavior. That is operational observation reuse, not a complete per-user identity, account or private-memory system.
- [NOVA context/memory optimization](../nova-context-memory-optimization/README.md) describes candidate architecture and provenance-preserving context packing. Its initial packer is a development candidate, not a production identity vault or general account-recovery implementation.
- Re-inspect the exact active branches and tests before each feature. This document is not proof that a feature is absent or present at a later commit; it is a roadmap, not a substitute for implementation discovery.

## 5. Proposed logical architecture

These are logical boundaries; they do not require one microservice per box. Prefer the least complex implementation that maintains the necessary security boundaries.

### A. Public access and client layer

Purpose: documentation, account entry points, recovery instructions, accessibility and client-side cryptographic operations where supported.

Rules:
- Offer ordinary HTTPS access and evaluate an official Tor onion endpoint only after an operational-security review.
- Minimize third-party analytics, remote scripts, fingerprinting and unnecessary cross-site requests.
- Do not expose development-only specifications, debug endpoints, recovery material, secrets or admin functions through the public website.
- Provide accessible non-biometric flows and support devices with limited capabilities.

### B. Account and pseudonym registry

Purpose: manage user-facing accounts, workspaces and their relationships to registered authenticators without turning the registry into a public identity directory.

Proposed rules:
- Allow several accounts or pseudonyms where policy permits.
- Make ownership/administrative relationships explicit without exposing them to unrelated users.
- Store the smallest necessary internal references. Internal stable references must not automatically become public identifiers or cross-service tracking IDs.
- Support account merge, account recovery, account closure and pseudonym rotation through separate audited processes.
- Do not infer personhood from an account count, wallet count, IP address or device count.

### C. Authenticator service

Purpose: register, use, revoke and recover authentication factors.

Primary candidate: WebAuthn/passkeys using maintained platform/browser capabilities and libraries.

Required behavior:
- Permit multiple registered authenticators where supported.
- Offer clear setup guidance and test the user's fallback before encouraging removal of their last known-good method.
- Notify the user about authenticator enrollment, revocation, recovery and sensitive security changes through available channels, while recognizing that email/SMS may themselves be compromised.
- Apply step-up verification to high-impact actions, not to every harmless navigation action.
- Avoid secret questions based on public or memorable personal facts.
- No mandatory biometric gate. A platform may use a local biometric or device PIN to unlock a passkey, but the relying service should not require facial recognition as the only route.

### D. Recovery coordinator

Purpose: restore access after a lost device, lost account, compromised authenticator, forgotten credentials, displacement, incapacity or other catastrophic event.

Possible components:
- Offline recovery codes generated with sufficient entropy and shown only once.
- A second independently held authenticator or hardware security key.
- A user-configured recovery contact or guardian arrangement with defined permissions.
- Threshold key recovery using an established scheme if its exact compatibility and threat model are verified.
- An assisted process for exceptional cases, with delay, user notifications, review and appeal where appropriate.
- Re-issuance and revocation of authenticators after recovery.
- Separate authorization for access restoration, account ownership changes, private data decryption, and transfer of financial assets.

A 3-of-5 recovery-share scheme is an **illustrative candidate, not a decision**. The actual threshold, share holders, locations, recovery procedure, key reconstruction environment and collusion risks must be chosen through threat modeling and usability testing. Recovery shares stored together or controlled by one organization do not provide meaningful independence.

**Hard limit:** if every user-held authenticator, offline backup, guardian and other recovery channel is permanently lost, secure recovery may be impossible. If a third party can bypass all those requirements, that third party adds a takeover risk. The notice must explain the selected trade-off.

### E. Eligibility credential issuer and verifier

Purpose: when a specific feature requires person-level eligibility, check the applicable fact and issue or validate a narrowly scoped credential.

Candidate direction:
- Evaluate established verifiable-credential schemes and privacy-preserving proof methods.
- Minimize what the verifier learns. It may need to learn “eligible for programme X during period Y,” not a name, document number, address, full date of birth or unrelated attributes.
- Document who sees the original identity documents, what data is retained, for how long, and under which legal/operational authority.
- Where no identity provider or method works for a user, define a fair alternative or clearly describe which feature remains unavailable; do not convert one provider's failure into a universal account ban.

A credential's proof format and issuer trust model must be evaluated separately. “Verifiable credential” does not automatically mean anonymous, unlinkable, unique-person-verified or safe.

### F. Programme-specific duplicate-claim control

Purpose: enforce entitlement limits for a particular benefit without globally linking every user action.

Proposed model:
- Give each programme a versioned rule set: eligibility, period, claim limit, expiration, appeal and payout status.
- Where supported by the chosen proof scheme, use a programme- and period-scoped nullifier or equivalent one-time claim marker. A repeated claim for the same entitlement can be rejected without using the user's IP as the unique-person key.
- Do not reuse a universal nullifier across unrelated programmes.
- Do not publish the nullifier with identity information or in a way that enables cross-programme correlation.
- Avoid permanent denial caused by a temporary verifier outage, expired provider contract or legitimate credential re-issuance. Define idempotency and retry behavior.
- Preserve a privacy-respecting dispute mechanism for mistaken duplicate detection.

A nullifier prevents repeated claims only within the assumptions of the underlying credential system and issuer-enrollment process. It cannot alone prove that the credential issuer enrolled one unique human exactly once.

### G. Private memory and data vaults

Proposed classification:
1. **Knowledge commons:** broadly shareable, verified general information, governance principles, public procedures and reusable research.
2. **Shared operational memory:** project status, decisions and incidents accessible according to explicit roles; exclude credentials and private personal data.
3. **Personal memory vault:** user preferences, history and personal context, isolated per user by default.
4. **Sensitive personal vault:** separately enabled and more restrictively protected information such as medical, legal or highly confidential records.
5. **Credential/secret store:** API keys, passwords, private keys, recovery shares and service credentials; not ordinary conversational memory.

Controls:
- Authorize before retrieval, not only after an AI generates an answer.
- Apply least privilege to read, write, export, share, delete and administer.
- Test against prompt injection and attempts to infer restricted information through repeated or combined queries.
- Provide explicit notices before persistently storing sensitive information. Explain which service receives it, the encryption boundary, retention and recovery trade-offs.
- Make “use for this task only / do not persist” and “do not process” available where feasible.
- Do not claim that encrypting data at rest prevents exposure while plaintext is sent to a model or service.
- Preserve provenance, freshness, authorization, deletion and supersession metadata.

### H. Resource-contribution network

Purpose: let members optionally contribute useful CPU, GPU, storage or bounded bandwidth capacity in exchange for compensation when their work has verifiable economic value.

Principles:
- Contribution is opt-in and is not a prerequisite for a basic member benefit.
- No reward for account creation or node registration alone.
- Multiple legitimate devices may contribute. Each node's work is evaluated independently, but one person does not thereby get extra person-limited basic benefits.
- Run only reviewed, constrained workloads with user-visible permissions, hard resource caps and a clear stop/uninstall route.
- Do not permit arbitrary third-party traffic relay, residential-proxy exit services or unrestricted use of members' home IP addresses in the initial design.
- Validate completed work and prevent fabricated results, replay, duplicate credit, task farming and manipulated telemetry.
- Display expected resource use, device heat/battery impact where relevant, upload/download use, reward calculation and failure handling.
- Measure net value after verification costs, customer acquisition, payment fees, failed tasks, network egress, electricity-related limits and operations.
- Do not assert that aggregate compute capacity equals useful/available/paid capacity. Report advertised, connected, eligible, scheduled, completed and customer-paid capacity separately.

### I. Member-benefit and payout ledger

Keep distinct:
- free basic service credits or bounded non-monetary access;
- compensation for accepted resource-contribution work;
- any community surplus allocation;
- treasury principal and investment exposure;
- essential continuity and recovery reserves;
- actual monetary payouts and their compliance obligations.

Initial direction:
- Start with an explicitly capped and funded free benefit, where the design is lawful and operational.
- The benefit must not require a deposit, token purchase, referral, biometric enrollment or compute contribution.
- Treat service credits as a product choice, not as an automatic legal exemption.
- Any monetary benefit should be variable unless an independently sustainable, legally approved and adequately funded guarantee is specifically demonstrated.
- Allocate only actual realized distributable surplus after operating costs, taxes, liabilities and required reserves.
- Do not promise stable high income based on historical anecdotes or simulated returns.
- Do not fund existing user obligations with new users' deposits or unbacked token issuance.
- Keep the treasury and payout signing authority separate from identity and recovery administration.

### J. Jurisdiction and service policy engine

A global design does not mean every feature is lawfully available everywhere.

Maintain a versioned matrix by **feature, operator, recipient/party, jurisdiction, asset/payment rail, and relevant activity**, instead of one generic country allowlist for the entire product.

For each feature record:
- what it does in substance;
- which legal entity offers it;
- required licensing/registration or licensed-partner assumptions;
- relevant identity, sanctions, tax, consumer-protection and records obligations;
- restrictions and the authoritative source/date reviewed;
- who is responsible for decision and re-assessment;
- the fallback for unavailable or BLOCKED features.

Do not use privacy tools to evade applicable restrictions. Do not deny unrelated, lawful, non-financial access merely because one monetary feature is unavailable. A geolocation signal alone may be inaccurate; the decision must use the evidence and checks appropriate to the requirement.

## 6. Suggested user journeys to preserve for later design

### 6.1 Initial account creation (not implemented)

1. Explain the difference between a pseudonymous account and optional eligibility verification.
2. Let the user create an account with a supported authenticator using the smallest necessary data.
3. Encourage, but do not pretend to complete, a backup/recovery setup.
4. Let the user add an alternative authenticator before a later device loss.
5. Explain when eligibility verification will be required for a specific feature.
6. Do not require facial recognition merely to open an account.
7. Provide a clear data-use, retention and deletion notice.

### 6.2 Everyday sign-in

1. Authenticate using a passkey or another supported registered authenticator.
2. Do not repeatedly ask for identity proofing when the task only needs account authentication.
3. Use stronger reauthentication for security-sensitive changes.
4. Keep Tor/VPN access possible; use rate limits and abuse controls tied to specific actions rather than treating the network path as identity.

### 6.3 Lost device/account recovery

1. Start from a publicly reachable, accessible recovery route.
2. Explain what recovery can restore and what it cannot.
3. Offer configured recovery codes, another authenticator or the designated recovery arrangement.
4. Use additional review/delay/notifications for exceptional recovery.
5. Restore access, revoke lost authenticators and register replacements.
6. For high-impact assets and sensitive vaults, apply their separate recovery policies.
7. Log a minimal, access-controlled audit record without needlessly collecting new identity data.
8. Offer an appeal when a claim is rejected.

### 6.4 Person-limited benefit claim

1. Show eligibility and benefit rules before the user claims.
2. Verify only the required claim predicate.
3. Use a programme-scoped anti-duplicate mechanism when the selected credential architecture supports it.
4. Make the claim idempotent so retries cannot trigger duplicate payouts.
5. Separate eligibility data from payout data where feasible.
6. Return a clear receipt/reference without disclosing the underlying identity proof to public ledgers.

### 6.5 Multiple accounts and mobile/resource farming

1. Permit legitimate pseudonyms/workspaces and multiple devices under published rules.
2. Do not pay for additional account creation.
3. Register resource nodes separately from member identity.
4. Schedule only approved work within user-selected limits.
5. Verify results and measure accepted work once.
6. Compensate based on published contribution rules and actual available budget.
7. Keep the basic member entitlement separately limited to one eligible claim per period if that is the approved programme rule.

## 7. Threat model and minimum controls

| Threat or failure | Minimum design response |
|---|---|
| User loses every usual device | Preconfigured independent recovery routes; tested recovery procedure; clearly stated irrecoverability boundary. |
| Attacker steals one authenticator | Revocation, notifications, sensitive-action reauthentication and separate asset-recovery controls. |
| Malicious guardian/custodian | Independent share holders, threshold enforcement, no single-participant override, audit and recovery testing. |
| False biometric rejection | Biometrics are optional; non-biometric alternatives remain accessible. |
| Duplicate benefit claim | Programme-specific eligibility and claim nullifier/equivalent; idempotency and appeal. |
| Multiple legitimate accounts are misclassified | Account count/IP/device count is not sufficient evidence; scoped investigation and reversible decisions. |
| Account farmers seek extra benefits | No reward for registration alone; person-limited entitlement is separate from node contribution. |
| Tor or VPN user is blocked | No blanket privacy-network ban; abuse signals must relate to action-specific evidence. |
| Identity issuer is compromised | Issuer governance, limited credential lifetime where appropriate, revocation/status design, incident response and re-issuance. |
| Correlation across pseudonyms | Avoid global identifiers; scope proofs/nullifiers; reduce logs and shared metadata; test correlation. |
| Administrator abuses access | Least privilege, separation of duties, audited sensitive operations, bounded support powers and independent review. |
| Memory prompt injection/data exfiltration | Authorization before retrieval; data labels; output restrictions; query aggregation tests; separate secrets from memory. |
| Compute node returns fake work | Independent result validation, duplicate/replay detection, bounded task authority and anomaly review. |
| Workload steals user data/resources | Sandboxing/isolation, resource limits, signed reviewed workloads, no default filesystem or local-network access. |
| Treasury strategy loses money | Capped capital, separate reserves, independent monitoring, stop rules, loss reporting and no guaranteed-return promises. |
| Legal status differs by feature/country | Versioned feature-jurisdiction matrix and human/legal review; do not treat all features as one global financial service. |
| Service, network or identity provider fails | Graceful failure; no false PASS; offline recovery/export where possible; provider exit and migration plan. |
| Database or key compromise | Client-side encryption where suitable, key separation, rotation/revocation, minimal logs and tested incident procedures. |

## 8. Non-negotiable security invariants

These must become testable requirements before implementation:

1. No single biometric method is the only way to create or recover an account.
2. A failed biometric comparison is not sufficient evidence of fraud or grounds for permanent exclusion.
3. Tor/VPN/proxy usage, shared IPs, device changes or multiple accounts alone do not establish abuse.
4. Person-limited benefit claims are separate from account count and node count.
5. A new account does not automatically reset a person's claim entitlement or erase a properly adjudicated restriction; it also does not automatically prove evasion.
6. Resource contribution does not grant additional person-limited basic benefits.
7. Account recovery does not silently authorize asset transfer, sensitive-memory disclosure or privileged administrative access.
8. Secrets, private keys and recovery shares are never logged or stored as ordinary conversational memory.
9. Access control is enforced before protected data is retrieved or shared.
10. The system never claims perfect anonymity, perfect recovery, risk-free yield or universal legal availability.
11. A blocked verification remains BLOCKED; it is not silently treated as PASS.
12. Essential recovery reserves are isolated from speculative capital.
13. No live monetary distribution is enabled before its funding, legal, security, ledger and operational gates pass.
14. All significant security decisions have an evidence record, version context and appeal/correction path appropriate to the risk.

## 9. Technology and reference candidates

No item below is an automatic approval to add a dependency. At feature design time, verify current status, implementation maturity, supported platforms, accessibility, security advisories, dependencies, licensing, commercial-use terms, privacy properties and actual operational cost.

| Area | Candidate or reference | Current role in this roadmap |
|---|---|---|
| Digital identity / lifecycle | [NIST SP 800-63-4 Digital Identity Guidelines](https://csrc.nist.gov/pubs/sp/800/63/4/final) | Reference for identity proofing, authentication, enrollment, authenticator lifecycle and recovery requirements; tailor rather than claim government-system compliance. |
| Web authentication | [W3C WebAuthn Level 3 Recommendation, 2026-08-25](https://www.w3.org/TR/2026/REC-webauthn-3-20260825/) | Primary standards candidate for public-key web authentication/passkeys. Test the supported browser/device matrix and recovery experience. |
| Verifiable credentials | [W3C Verifiable Credentials Data Model 2.0 Recommendation, 2025-05-15](https://www.w3.org/TR/2025/REC-vc-data-model-2.0-20250515/) | Credential data model baseline; selective disclosure and unlinkability require compatible proof formats and careful issuer/verifier design. Treat W3C VC 2.1 Working Draft as draft research, not a finalized dependency. |
| Secret sharing | [SLIP-0039](https://github.com/trezor/python-shamir-mnemonic/blob/master/README.md) and maintained compatible implementations | Candidate for human-manageable threshold recovery; compare with other maintained approaches and do not assume mnemonic shares solve identity, guardian governance or key-custody design. |
| Post-quantum cryptography | [NIST FIPS 203, 204 and 205](https://csrc.nist.gov/News/2024/postquantum-cryptography-fips-approved) | Plan crypto-agility; select standardized primitives according to use and ecosystem support, never invent custom cryptography. PQC does not solve identity fraud or lost keys. |
| Web application verification | [OWASP ASVS 5.0.0](https://owasp.org/projects/asvs) | Versioned application-security requirements and test planning. This reference is not a certification. |
| API abuse and authorization | [OWASP API Security Top 10 2023](https://api-security.owasp.org/editions/2023/en/0x11-t10/) | Threat reference for broken authentication/authorization, resource consumption, sensitive business-flow abuse, SSRF and related API risks. |
| Secure development | [NIST SP 800-218 SSDF v1.1](https://csrc.nist.gov/pubs/sp/800/218/final) | Existing AstroCrown development-process reference for change discipline and recurrence prevention. |
| Privacy-preserving web access | [Tor onion service guidance](https://community.torproject.org/onion-services/advanced/) | Candidate reference if an official onion service is evaluated; not a claim that Tor alone guarantees anonymity or safe operations. |
| Global financial risk | [FATF resources](https://www.fatf-gafi.org/) and current local primary sources | Research entry point for risk-based treatment of financial services; each actual activity/jurisdiction requires its own current legal assessment. |

Candidate evaluation must follow the existing AstroCrown development convention: **requirement → candidate → test → evidence → PASS / FAIL / BLOCKED / N/A → eligibility decision → implementation → re-test**. Do not use scores or rankings instead of mandatory gates.

## 10. Phased delivery roadmap and exit gates

### Phase 0 — Preserve the foundation (this document)

**Output:** this design and decision record.

Exit:
- scope and key distinctions are documented;
- options and uncertainty are labelled;
- no runtime implementation or production change is presented as complete;
- open decisions have explicit owners/evidence requirements for future work.

### Phase 1 — Requirements and threat-model baseline

Create a traceable requirements register for account creation, authenticator lifecycle, recovery, eligibility, duplicate claims, privacy, Tor/VPN access, accessibility, resource contribution, benefits and legal policy.

Deliver:
- actors and trust boundaries;
- data-flow diagrams;
- threat model and abuse cases;
- retention/deletion matrix;
- service/jurisdiction capability matrix;
- misuse cases and acceptance tests;
- source and dependency register.

Exit:
- no critical workflow depends solely on a single untested identity/authentication channel;
- data collection, legal purposes and retention have a documented rationale;
- recovery and false-positive cases are testable;
- legal questions are identified as blockers, not silently assumed solved.

### Phase 2 — Authentication and continuity prototype (no monetary benefits)

Prototype account lifecycle and passkey support with alternative authenticators and offline recovery material. Use test accounts and synthetic data.

Tests:
- register two authenticators;
- sign in with each;
- revoke one authenticator without losing all access;
- lose a device and recover using the documented path;
- use browser/device combinations with and without biometric capability;
- ensure a biometric failure routes to an alternative;
- test repeated, expired, malformed and replayed recovery attempts;
- ensure recovery cannot directly transfer funds or access a separate sensitive vault.

Exit:
- all required flows pass on the explicitly supported platform matrix;
- security/recovery limitations are displayed accurately;
- logs contain no credentials or recovery secrets;
- no production secrets or real identity documents are used for ordinary CI.

### Phase 3 — Eligibility and anti-duplicate prototype (no payout)

Compare established credential and privacy-proof candidates. Use test participants/synthetic credentials where possible.

Tests:
- one person/credential gets at most the allowed claim for a programme period under stated issuer assumptions;
- multiple legitimate accounts can sign in without a new person claim;
- additional devices do not create additional person entitlements;
- a repeated claim is rejected idempotently;
- separate programmes cannot correlate claim identifiers by design;
- a Tor/VPN/IP change does not reset or multiply person eligibility;
- verifier/issuer outage does not corrupt claim state;
- credential revocation/re-issuance and false-positive appeal are handled.

Exit:
- proof scheme and issuer trust assumptions are documented;
- linkability, issuer visibility and metadata risks are tested;
- no claim is made that a credential prevents every possible Sybil attack;
- failed/blocked cases are recorded.

### Phase 4 — Resource-node sandbox prototype

Begin with a local/simulated or tightly limited opt-in compute workload. Do not launch unrestricted residential proxying.

Tests:
- user-visible opt-in and immediate stop;
- hard resource caps are enforced;
- workload cannot access unrelated files, credentials or local network by default;
- task inputs and outputs are validated;
- duplicate/replayed/fabricated work is detected;
- resource usage and compensation are reproducible;
- node enrollment does not award value by itself;
- false positives and honest shared-device/household scenarios are tested.

Exit:
- an independent reviewer can reproduce task accounting;
- security boundary and resource limits have evidence;
- net economics include real execution/verification costs;
- user consent, privacy, uninstall and incident flows are clear.

### Phase 5 — Capped free member-benefit pilot

The pilot must have explicit eligibility, maximum commitment, funding source, duration, operating owner and incident/appeal process.

Prefer a useful non-monetary/basic service benefit initially when suitable and lawful. It must not require deposits, token purchase, referrals, biometrics or resource contribution.

Exit:
- budget and maximum liability are funded/approved;
- duplicate-claim and idempotency tests pass;
- service failure cannot create unbounded liabilities;
- privacy/data-retention and user notices are reviewed;
- applicable product/legal review is complete.

### Phase 6 — Variable monetary benefit (separate approval gate)

Only after real revenue/economic testing and legal/security review.

Required evidence:
- actual net performance after all costs;
- drawdown, liquidity, counterparty and operational risks;
- treasury ownership and segregation;
- legally approved activity and distribution structure;
- reserve policy and loss scenario;
- exact payout and error-correction behavior;
- tax, reporting, sanctions and recipient/provider requirements;
- no reliance on promised future user deposits or token issuance.

Exit:
- the specific activity and jurisdictions are approved for launch;
- users receive clear risk disclosures;
- distribution is based on realized distributable funds and published rules;
- the system can pause distributions without corrupting entitlement or recovery records.

### Phase 7 — Broader regional and ecosystem rollout

Expand only by feature capability and evidenced controls. Add providers, payment rails, additional resource workloads, optional storage and a possible Tor onion endpoint separately. Do not equate a globally available website with universally available financial features.

Exit per feature/region:
- authoritative legal/operational review is current;
- payment/resource partner eligibility is documented;
- support and incident responsibility are clear;
- end-to-end monitoring, recovery, appeal and rollback have been tested.

## 11. Acceptance-test register to create before implementation

Use unique, durable test IDs in the feature-specific plan. Initial expected cases:

- **ACC-001:** account creation can complete without mandatory facial recognition.
- **ACC-002:** a user can register a second authenticator and verify it before relying on it.
- **ACC-003:** losing one authenticator does not lock the user out if another configured recovery path remains.
- **ACC-004:** recovery cannot silently change the user's payout destination or disclose sensitive memory.
- **ACC-005:** expired, malformed, replayed or revoked recovery material is rejected safely.
- **ACC-006:** multiple legitimate accounts can exist without each automatically receiving a separate person-limited benefit.
- **ACC-007:** one eligible member cannot successfully claim the same limited benefit more times than the programme rule allows.
- **ACC-008:** Tor/VPN use or IP changes alone do not cause permanent denial or multiply entitlement.
- **ACC-009:** a shared household IP or device does not automatically merge different legitimate users.
- **ACC-010:** biometric false rejection always offers an applicable alternative and is never the sole evidence for a fraud penalty.
- **ACC-011:** no legal identity, biometric sample, recovery share or secret appears in application logs or public ledger data.
- **ACC-012:** claim processing is idempotent under network retries and service timeouts.
- **ACC-013:** a credential issuer/verifier outage is represented as BLOCKED/temporarily unavailable rather than a false identity failure.
- **ACC-014:** contribution reward requires accepted work, not account or device creation.
- **ACC-015:** contributed compute tasks cannot read unrelated files or credentials under the tested sandbox.
- **ACC-016:** failed/fraudulent compute results do not earn accepted-work credit.
- **ACC-017:** member benefit accounting reconciles to a fixed, approved budget and stops safely at the cap.
- **ACC-018:** no monetary distribution starts without an approved funding, legal and operational gate.
- **ACC-019:** a user can export/restore their own data with documented portability limits.
- **ACC-020:** a privacy-preserving proof cannot be trivially correlated across independent programmes under the declared threat model.
- **ACC-021:** a support operator cannot unilaterally bypass recovery, identity, treasury or sensitive-data controls.
- **ACC-022:** the appeal process can correct a mistaken duplicate/abuse determination without exposing data to unrelated operators.
- **ACC-023:** changing a requirement or implementation cannot silently weaken a passing security test.
- **ACC-024:** the exact candidate commit is tested and reviewed before any promotion/activation.

These are proposed project criteria, not claims that the standards cited above prescribe these exact IDs.

## 12. Governance, evidence and incident handling

- Use the existing AstroCrown Development & Audit Convention and target-repository controls. Do not create a parallel audit framework without a demonstrated need.
- Every non-trivial feature plan must state source of truth, base commit, scope, preservation constraints, security/privacy risks, acceptance criteria and impact analysis.
- Record design decisions with ID, date, status, alternatives, rationale, evidence, affected features, reversal conditions and follow-up owner where known.
- Keep requirements traceable to component, test, evidence, result and finding.
- Distinguish static/source, unit, contract, integration, manual/security and promotion evidence.
- Do not mark a finding closed solely because code changed. Re-run its original test and relevant regressions.
- Review false-positive account restrictions and recovery failures for root causes and recurrence-prevention changes.
- Apply data retention and deletion rules to logs, support cases, credentials, claims, identity proof records, memory and payment records separately.
- Have an incident playbook for stolen authenticators, compromised recovery guardian, issuer compromise, data breach, fraudulent payouts, malicious resource workload and treasury loss.
- Do not expose production credentials to untrusted pull-request code or print secret values.
- Treat AI-generated code and external API assumptions as candidates until the exact source diff and behavior pass independent verification.

## 13. Unresolved decisions and blockers

The following must remain open until researched and decided with evidence:

1. **Membership definition:** what exactly counts as one person for which feature, and what alternative is available to people who cannot pass the selected verifier?
2. **Eligibility issuers:** what independent providers, credentials or alternative approaches are available, affordable, accessible and usable in target regions?
3. **Proof/credential construction:** which maintained scheme gives the required privacy, revocation, uniqueness and non-correlation under a realistic threat model?
4. **Nullifier design:** how programme/period scoping works, how claim state survives upgrades and how privacy is retained during disputes.
5. **Recovery model:** recovery thresholds, guardians/custodians, key reconstruction, social engineering defenses, succession/incapacity handling and what happens if all recovery factors are lost.
6. **Encryption and key custody:** what can be client-side encrypted, what services receive plaintext, how account recovery affects decryption and how key rotations work.
7. **Data residency and retention:** which operators and vendors process which data, where it resides, and what legal retention/deletion obligations apply.
8. **Tor/onion operation:** whether to offer an onion endpoint, what service should be accessible over it, how to protect the origin, mitigate abuse/DoS and publish the authentic address.
9. **Legal model:** which entity offers each feature, which jurisdiction/activity combinations are approved, and which legal advisers/partners are responsible.
10. **Initial benefit:** credit vs non-transferable reward vs monetary benefit; budget source, cap, qualifying period, claim schedule, expiration and liability.
11. **Treasury strategy:** specific strategy candidates, permitted capital, custody, acceptable loss, independent verification and stop rules. No candidate is approved by this document.
12. **Resource-network economics:** workloads and customers, eligible nodes, verification costs, compensation formula, minimum device capability and sustainable net margin.
13. **Payout rails:** currencies/tokens, wallet custody assumptions, fees, provider coverage, reversals, tax and reporting, sanctions screening and failed-payment behavior.
14. **Governance/appeal:** who may review a denial, which evidence they can see, separation of duties, expected response process and how erroneous decisions are corrected.
15. **Security assurance:** external review scope, required controls and release gates, including applicable ASVS 5.0.0 requirements.
16. **Standards evolution:** when to refresh this source register and how to migrate protocols without locking users out or exposing secrets.

A missing answer is not consent to make an assumption. Record the exact requirement as BLOCKED or CANDIDATE in later plans.

## 14. Decisions recorded so far

| Decision / principle | Status | Consequence |
|---|---|---|
| No mandatory biometric-only account access/recovery | BASELINE PRINCIPLE | Keep an accessible non-biometric route. |
| Use passkeys/public-key authentication as a primary candidate | CANDIDATE | Evaluate platform support and authenticator/recovery lifecycle before selection. |
| Biometrics, when used, should be a local convenience to unlock an authenticator | PROPOSED ARCHITECTURE | Do not build a centralized biometric database for ordinary sign-in. |
| Tor/VPN/proxy/privacy-browser use alone is not abuse evidence | BASELINE PRINCIPLE | No blanket privacy-network exclusion. |
| Multiple accounts/devices may be legitimate | BASELINE PRINCIPLE | Do not equate count of accounts/devices/IPs with personhood. |
| One-person-one-benefit belongs to a programme-specific entitlement layer | PROPOSED ARCHITECTURE | Keep claim eligibility separate from account and contribution identities. |
| Resource work is voluntary and separately compensated | BASELINE PRINCIPLE | Basic benefit never requires compute contribution. |
| Reward completed, verified useful work, not registration | BASELINE PRINCIPLE | Prevent trivial account/node farming rewards. |
| Avoid unrestricted residential proxying in initial contribution design | PROPOSED ARCHITECTURE | Start with bounded, approved compute workloads. |
| Free basic access should not require deposits, token purchase or referrals | BASELINE PRINCIPLE | Fund the initial benefit explicitly, with limits. |
| Monetary distributions depend on realized net funds and separate review | BASELINE PRINCIPLE | No guaranteed yield or unbacked reward promises. |
| Legal availability is feature- and jurisdiction-specific | BASELINE PRINCIPLE | No universal promise that every payout can be offered everywhere. |
| Keep personal memory, sensitive memory, shared knowledge and secrets separated | PROPOSED ARCHITECTURE | Retrieval authorization and key boundaries precede implementation. |
| A threshold recovery scheme may be appropriate | CANDIDATE | Evaluate established schemes; 3-of-5 is only an example. |
| Post-quantum readiness should be planned | PROPOSED ARCHITECTURE | Maintain crypto-agility; select standardized primitives by use case. |
| Global anonymization and guaranteed recovery are impossible to promise absolutely | BASELINE PRINCIPLE | Publish threat boundaries and failure modes honestly. |

## 15. Impact analysis

**IF this roadmap is used:** future account, authentication, recovery, eligibility, benefit and compute work will share explicit principles, separated trust boundaries and measurable acceptance gates. It should reduce repeated design effort, discourage premature dependencies, and prevent the same identifier or mechanism from being overloaded to solve unrelated problems.

**IF it is ignored:** future features may implement duplicate mechanisms, make biometrics or invasive identification mandatory, misclassify legitimate accounts or Tor users, leak identity through shared identifiers, couple recovery to financial privileges, or promise economic benefits without a funded/approved source.

## 16. Source register and reference status

Sources checked for this initial roadmap on 2026-10-16. Re-verify exact standards, versions, provider terms and local laws when a concrete implementation is planned.

1. **NIST SP 800-63-4 — Digital Identity Guidelines** (published July 2025; NIST implementation resource hub note dated 2026-10-06): https://csrc.nist.gov/pubs/sp/800/63/4/final
2. **W3C Web Authentication Level 3 Recommendation** (2026-08-25): https://www.w3.org/TR/2026/REC-webauthn-3-20260825/
3. **W3C Verifiable Credentials Data Model 2.0 Recommendation** (2025-05-15): https://www.w3.org/TR/2025/REC-vc-data-model-2.0-20250515/
4. **W3C Verifiable Credentials Data Model 2.1** (Working Draft, 2026-09-30; not a final recommendation): https://www.w3.org/TR/vc-data-model/all/
5. **NIST post-quantum cryptography standards FIPS 203, 204 and 205** (approved 2024-08-13): https://csrc.nist.gov/News/2024/postquantum-cryptography-fips-approved
6. **OWASP Application Security Verification Standard; stable version 5.0.0**: https://owasp.org/projects/asvs
7. **OWASP API Security Top 10 2023**: https://api-security.owasp.org/editions/2023/en/0x11-t10/
8. **NIST SP 800-218 SSDF Version 1.1**: https://csrc.nist.gov/pubs/sp/800/218/final
9. **Tor Project — onion service advanced configuration and operational security**: https://community.torproject.org/onion-services/advanced/
10. **SLIP-0039 / Trezor Shamir mnemonic implementation reference**: https://github.com/trezor/python-shamir-mnemonic/blob/master/README.md
11. **FATF official resources** — starting point for current risk-based financial-inclusion and virtual-asset research; identify the exact relevant guidance and jurisdiction before relying on it: https://www.fatf-gafi.org/

The source list is a research index, not an exhaustive legal analysis, a guarantee of interoperability, or endorsement of a single vendor. The current AstroCrown Development & Audit Convention remains the governing project verification method, including versioned references and the PASS / FAIL / BLOCKED / N/A result states.

## 17. Next concrete deliverable

Create a **Requirements and Threat Model Register** before coding account creation. It should reference this roadmap and include for each requirement: ID, actor, scenario, required behavior, data accessed, trust boundary, legal/operational dependency, test, evidence, result and unresolved issues. Use it to select a minimal authentication/recovery prototype first; defer person-verification vendor selection and monetary benefits until their separate requirements are known.

Only after that register is reviewed should implementation work start. Each implementation should have its own dated plan, branch, exact source-of-truth contract, test plan, evidence, impact analysis, review and explicit promotion decision.


## 18. Follow-up prototype record — 2026-10-21

The development homepage's Account button now has a separate local-only account-creation/sign-in test prototype under development/account-continuity/prototype/. It is intended to test the ordinary-user first-run/sign-in/recovery interaction before selection of production identity providers or passkey technology. It uses a local SQLite database, username/password prototype credentials and one-time recovery codes. It makes no provider or wallet calls and grants no admin role.

This does not change the overall status above: the account-continuity subsystem remains a development proposal, and the new local prototype is not production account authentication. It does not implement person eligibility, benefit claims, passkeys, provider SSO, account recovery outside its test-code flow, admin wallet registration, Imperial HSIAN restoration, or cloud persistence. See the active test plan at development/audit/Active/2026-10-21-Local-Account-Creation-and-Sign-In-Prototype.md and local instructions at development/account-continuity/prototype/README.md.

Before promotion, continue to verify accessibility, password and session controls, loss-of-device/recovery usability, external-provider qualification, privacy/retention, $0/no-card eligibility, account export/deletion, and the actual public publishing domain/source. Production integration remains blocked.
